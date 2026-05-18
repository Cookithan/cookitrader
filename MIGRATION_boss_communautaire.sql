-- ════════════════════════════════════════════════════
-- community_boss — Le Gâteau Géant (boss communautaire)
-- ────────────────────────────────────────────────────
-- À exécuter UNE SEULE FOIS dans le SQL editor Supabase (idempotent).
--
-- Concept : tous les 100 000 🍪 cumulés par la communauté
-- (somme des users.total_earned, cf. getCommunityCookieTotal),
-- un boss apparaît avec une grosse barre de PV PARTAGÉE. Les
-- joueurs « enfournent » (tap gratuit avec cooldown + boost payant
-- en 🍪) pour faire tomber les PV. Vaincu avant la fin du chrono
-- (~24 h) → chaque contributeur s'auto-crédite la récompense
-- (badge_fournee + 🍪 plafonné) via applyPatchOnce côté client.
--
-- Sécurité : aucune écriture client directe sur ces tables. Tout
-- passe par 2 fonctions SECURITY DEFINER (create_boss_event,
-- attack_boss) qui imposent PV/durée/cooldown/cap côté serveur.
-- La clé anon publique ne peut donc ni créer un boss à 1 PV ni
-- spammer les dégâts. Récompense purement cosmétique + 🍪
-- plafonné → risque résiduel assumé (pas d'auth par user).
--
-- ⚠️ Les constantes ci-dessous DOIVENT rester synchro avec
--    src/data/communityEvents.js (BOSS_* / ATTACK_* / REWARD_*).
-- ════════════════════════════════════════════════════

-- 1. Table des événements boss — 1 ligne par palier (PK = milestone).
--    L'INSERT ON CONFLICT DO NOTHING (via create_boss_event) garantit
--    qu'un seul client crée l'event d'un palier donné (pattern
--    weekly_winners). status ∈ {'active','defeated','failed'}.
CREATE TABLE IF NOT EXISTS public.community_boss_events (
  milestone     BIGINT PRIMARY KEY,                 -- ex 300000
  boss_max_hp   BIGINT  NOT NULL,
  boss_hp       BIGINT  NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'active',
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),   -- création (annonce)
  starts_at     TIMESTAMPTZ,                          -- début combat (annonce + 1h)
  ends_at       TIMESTAMPTZ NOT NULL,
  resolved_at   TIMESTAMPTZ
);

-- 2. Contributeurs — dégâts cumulés par user_code sur un palier.
--    Sert au cap anti-triche (MAX_DMG_PER_USER), au cooldown
--    (last_attack_at) et à savoir qui a droit à la récompense.
CREATE TABLE IF NOT EXISTS public.community_boss_contributors (
  milestone      BIGINT NOT NULL REFERENCES public.community_boss_events(milestone) ON DELETE CASCADE,
  user_code      TEXT   NOT NULL,
  damage         BIGINT NOT NULL DEFAULT 0,
  last_attack_at TIMESTAMPTZ,
  last_kind      TEXT NOT NULL DEFAULT 'tap',   -- 'tap' | 'boost' | 'super' (feed d'activité)
  PRIMARY KEY (milestone, user_code)
);
ALTER TABLE public.community_boss_contributors
  ADD COLUMN IF NOT EXISTS last_kind TEXT NOT NULL DEFAULT 'tap';

-- 2b. Journal d'attaques — 1 ligne PAR coup (vrai historique pour
--     le feed "activité récente", contrairement à contributors qui
--     n'a qu'une ligne par joueur).
CREATE TABLE IF NOT EXISTS public.community_boss_attacks (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  milestone   BIGINT NOT NULL REFERENCES public.community_boss_events(milestone) ON DELETE CASCADE,
  user_code   TEXT   NOT NULL,
  kind        TEXT   NOT NULL DEFAULT 'tap',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_boss_attacks_recent
  ON public.community_boss_attacks(milestone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_boss_events_status
  ON public.community_boss_events(status);

-- 3. RLS : lecture publique (barre de PV + nb contributeurs visibles
--    par tous), AUCUNE écriture client directe. Les mutations passent
--    exclusivement par les fonctions SECURITY DEFINER ci-dessous.
ALTER TABLE public.community_boss_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_boss_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_boss_attacks      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS boss_events_read_all ON public.community_boss_events;
CREATE POLICY boss_events_read_all ON public.community_boss_events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS boss_contrib_read_all ON public.community_boss_contributors;
CREATE POLICY boss_contrib_read_all ON public.community_boss_contributors
  FOR SELECT USING (true);

DROP POLICY IF EXISTS boss_attacks_read_all ON public.community_boss_attacks;
CREATE POLICY boss_attacks_read_all ON public.community_boss_attacks
  FOR SELECT USING (true);

-- 4. create_boss_event — création atomique d'un palier.
--    PV et durée calculés ICI (jamais fournis par le client).
--    ON CONFLICT DO NOTHING → idempotent, 1 seul gagnant. Renvoie
--    toujours la ligne courante (créée ou déjà existante).
CREATE OR REPLACE FUNCTION public.create_boss_event(p_milestone BIGINT)
RETURNS public.community_boss_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hp       BIGINT := 100000;                -- BOSS_BASE_HP (cf. communityEvents.js)
  v_announce INTERVAL := INTERVAL '1 hour';    -- ANNOUNCE_LEAD_MS
  v_duration INTERVAL := INTERVAL '72 hours';  -- EVENT_DURATION (3 jours)
  v_row      public.community_boss_events;
BEGIN
  IF p_milestone IS NULL OR p_milestone < 100000 OR (p_milestone % 100000) <> 0 THEN
    RAISE EXCEPTION 'milestone invalide: %', p_milestone;
  END IF;

  INSERT INTO public.community_boss_events (milestone, boss_max_hp, boss_hp, status, starts_at, ends_at)
  VALUES (p_milestone, v_hp, v_hp, 'active', now() + v_announce, now() + v_announce + v_duration)
  ON CONFLICT (milestone) DO NOTHING;

  SELECT * INTO v_row FROM public.community_boss_events WHERE milestone = p_milestone;
  RETURN v_row;
END;
$$;

-- 5. attack_boss — applique des dégâts de façon atomique.
--    Garde-fous serveur : event actif & non expiré, cooldown par
--    user, dégâts clampés, cap cumulé par user. Si les PV tombent
--    à 0 → status='defeated'. Si expiré → status='failed'.
--    Renvoie l'état courant (JSON) pour MAJ instantanée du client.
CREATE OR REPLACE FUNCTION public.attack_boss(
  p_milestone BIGINT,
  p_user_code TEXT,
  p_dmg       INT,
  p_kind      TEXT DEFAULT 'tap'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Anti-triche par-joueur retiré (demande Régis). Seul le cooldown
  -- 2s est conservé : c'est une MÉCANIQUE de jeu (le "Rechargement"),
  -- pas un cap. Récompense cosmétique → risque assumé.
  c_cooldown           INTERVAL := INTERVAL '2 seconds';
  v_ev      public.community_boss_events;
  v_prev    BIGINT := 0;
  v_last    TIMESTAMPTZ;
  v_applied INT := 0;
  v_newhp   BIGINT;
BEGIN
  IF p_user_code IS NULL OR p_user_code !~ '^[A-Z0-9]{3}-[A-Z0-9]{3}$' THEN
    RAISE EXCEPTION 'user_code invalide';
  END IF;

  -- Verrou ligne event : sérialise les attaques concurrentes
  SELECT * INTO v_ev FROM public.community_boss_events
    WHERE milestone = p_milestone FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'boss introuvable: %', p_milestone;
  END IF;

  -- Phase d'annonce : pas encore attaquable (avant starts_at)
  IF v_ev.starts_at IS NOT NULL AND now() < v_ev.starts_at THEN
    RETURN json_build_object(
      'milestone', v_ev.milestone, 'boss_hp', v_ev.boss_hp,
      'boss_max_hp', v_ev.boss_max_hp, 'status', v_ev.status,
      'my_damage', COALESCE((SELECT damage FROM public.community_boss_contributors
                             WHERE milestone = p_milestone AND user_code = p_user_code), 0),
      'applied', 0
    );
  END IF;

  -- Expiré → bascule failed (best-effort) et sort
  IF v_ev.status = 'active' AND now() > v_ev.ends_at THEN
    UPDATE public.community_boss_events
      SET status = 'failed', resolved_at = now()
      WHERE milestone = p_milestone;
    v_ev.status := 'failed';
  END IF;

  IF v_ev.status <> 'active' THEN
    RETURN json_build_object(
      'milestone', v_ev.milestone, 'boss_hp', v_ev.boss_hp,
      'boss_max_hp', v_ev.boss_max_hp, 'status', v_ev.status,
      'my_damage', COALESCE((SELECT damage FROM public.community_boss_contributors
                             WHERE milestone = p_milestone AND user_code = p_user_code), 0),
      'applied', 0
    );
  END IF;

  -- État contributeur (cooldown + cap)
  SELECT damage, last_attack_at INTO v_prev, v_last
    FROM public.community_boss_contributors
    WHERE milestone = p_milestone AND user_code = p_user_code;
  v_prev := COALESCE(v_prev, 0);

  IF v_last IS NOT NULL AND now() - v_last < c_cooldown THEN
    v_applied := 0;                       -- cooldown : tap ignoré, pas d'erreur
  ELSE
    v_applied := GREATEST(COALESCE(p_dmg, 0), 0);  -- aucun plafond
  END IF;

  IF v_applied > 0 THEN
    v_newhp := GREATEST(v_ev.boss_hp - v_applied, 0);
    UPDATE public.community_boss_events
      SET boss_hp = v_newhp,
          status  = CASE WHEN v_newhp = 0 THEN 'defeated' ELSE 'active' END,
          resolved_at = CASE WHEN v_newhp = 0 THEN now() ELSE resolved_at END
      WHERE milestone = p_milestone;

    INSERT INTO public.community_boss_contributors (milestone, user_code, damage, last_attack_at, last_kind)
    VALUES (p_milestone, p_user_code, v_applied, now(), COALESCE(p_kind, 'tap'))
    ON CONFLICT (milestone, user_code)
    DO UPDATE SET damage = public.community_boss_contributors.damage + EXCLUDED.damage,
                  last_attack_at = now(),
                  last_kind = EXCLUDED.last_kind;

    -- Journal : 1 ligne par coup (feed d'activité multi-entrées)
    INSERT INTO public.community_boss_attacks (milestone, user_code, kind)
    VALUES (p_milestone, p_user_code, COALESCE(p_kind, 'tap'));

    v_ev.boss_hp := v_newhp;
    IF v_newhp = 0 THEN v_ev.status := 'defeated'; END IF;
    v_prev := v_prev + v_applied;
  END IF;

  RETURN json_build_object(
    'milestone', v_ev.milestone, 'boss_hp', v_ev.boss_hp,
    'boss_max_hp', v_ev.boss_max_hp, 'status', v_ev.status,
    'my_damage', v_prev, 'applied', v_applied
  );
END;
$$;

-- 6. Réservé service_role/anon : exécuter les fonctions
GRANT EXECUTE ON FUNCTION public.create_boss_event(BIGINT)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attack_boss(BIGINT, TEXT, INT)   TO anon, authenticated;

-- 7. Realtime sur la table events → barre de PV live (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'community_boss_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_boss_events;
  END IF;
END $$;

-- Vérif rapide
SELECT * FROM public.community_boss_events ORDER BY milestone DESC LIMIT 5;

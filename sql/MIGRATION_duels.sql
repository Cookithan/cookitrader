-- ════════════════════════════════════════════════════
-- duels — Duels 1v1 asynchrones (défis ouverts)
-- ────────────────────────────────────────────────────
-- À exécuter UNE SEULE FOIS dans le SQL editor Supabase (idempotent).
--
-- Concept : un joueur pose un DÉFI OUVERT sur un mini-jeu (il joue en
-- premier, son score est figé), avec une mise en 🍪 (± ☕ « prestige »).
-- N'importe quel autre VRAI joueur peut relever le défi : il joue à son
-- tour, et le meilleur score rafle le pot. Async → pas besoin d'être en
-- ligne en même temps (crucial vu la petite population).
--
-- MODÈLE DE CONFIANCE (identique au boss) : la monnaie reste
-- client-authoritative (localStorage + sync users). Ces tables ne
-- FONT QUE coordonner l'état du duel. Le SERVEUR tranche uniquement
-- QUI GAGNE (create/accept/submit en SECURITY DEFINER) ; le versement
-- du pot au gagnant se fait côté client via l'inbox + applyPatchOnce
-- (clé = duel.id), donc jamais double-crédité. Le perdant a déjà
-- débité sa mise localement à l'acceptation → « escrow » best-effort.
-- Mises plafonnées + anti-collusion (Phase 4) → risque résiduel assumé,
-- comme la récompense boss.
--
-- ⚠️ Les constantes (TTL, fenêtre de jeu, plafonds de mise) DOIVENT
--    rester synchro avec src/lib/duels.js (DUEL_CONFIG).
-- ════════════════════════════════════════════════════

-- 1. Table des duels — 1 ligne par défi.
--    status ∈ {'open','pending','resolved','expired','cancelled'}
--      open      : défi posté, score du challenger figé, en attente d'un preneur
--      pending   : un adversaire a accepté (mise engagée), il doit poser son score
--      resolved  : les deux scores sont là → winner_code tranché (NULL = égalité)
--      expired   : personne n'a relevé avant expires_at (ou preneur AWOL) → remboursement
--      cancelled : le challenger a annulé tant que c'était encore 'open'
--    higher_wins : sens de comparaison (fourni par le client depuis
--      DUELABLE_GAMES ; certains jeux = « moins = mieux »). Le serveur
--      reste générique, il ne connaît pas les règles de chaque jeu.
CREATE TABLE IF NOT EXISTS public.duels (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_key          TEXT    NOT NULL,
  higher_wins       BOOLEAN NOT NULL DEFAULT true,
  stake_cookies     INT     NOT NULL DEFAULT 0,
  stake_cafes       INT     NOT NULL DEFAULT 0,
  -- challenger (créateur — joue en premier)
  challenger_code   TEXT    NOT NULL,
  challenger_name   TEXT,
  challenger_score  INT     NOT NULL,
  -- opponent (NULL tant que 'open' → défi ouvert)
  opponent_code     TEXT,
  opponent_name     TEXT,
  opponent_score    INT,
  status            TEXT    NOT NULL DEFAULT 'open',
  winner_code       TEXT,                              -- NULL = pas encore tranché OU égalité
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at       TIMESTAMPTZ,                       -- quand un preneur a engagé sa mise
  expires_at        TIMESTAMPTZ NOT NULL,
  resolved_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_duels_open        ON public.duels(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_duels_challenger  ON public.duels(challenger_code);
CREATE INDEX IF NOT EXISTS idx_duels_opponent    ON public.duels(opponent_code);
CREATE INDEX IF NOT EXISTS idx_duels_winner      ON public.duels(winner_code) WHERE winner_code IS NOT NULL;

-- 2. RLS : lecture publique (le tableau des défis ouverts + l'historique
--    sont visibles par tous). AUCUNE écriture client directe → tout
--    passe par les fonctions SECURITY DEFINER (create/accept/submit/
--    cancel/expire) qui imposent les règles côté serveur.
ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS duels_read_all ON public.duels;
CREATE POLICY duels_read_all ON public.duels
  FOR SELECT USING (true);

-- 3. Colonnes stats duel sur users (affichage ligue / série).
--    Source de vérité du classement duel = agrégation de la table duels
--    (résistante à la triche) ; ces colonnes ne servent qu'à l'affichage
--    rapide côté profil et sont synchronisées via upsertProfile.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS duel_wins        INT NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS duel_losses      INT NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS duel_streak      INT NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS duel_best_streak INT NOT NULL DEFAULT 0;

-- ────────────────────────────────────────────────────
-- Helper interne : valide un user_code (format B4R-1ST).
-- ────────────────────────────────────────────────────
-- (inline dans chaque fonction pour rester self-contained comme le boss)

-- 4. create_duel — pose un défi ouvert. Le challenger a DÉJÀ joué :
--    son score est figé ici. Mise validée & plafonnée côté serveur.
CREATE OR REPLACE FUNCTION public.create_duel(
  p_game_key         TEXT,
  p_higher_wins      BOOLEAN,
  p_stake_cookies    INT,
  p_stake_cafes      INT,
  p_challenger_code  TEXT,
  p_challenger_name  TEXT,
  p_challenger_score INT,
  p_ttl_hours        INT DEFAULT 48
)
RETURNS public.duels
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_max_cookies CONSTANT INT := 5000;   -- DUEL_CONFIG.MAX_STAKE_COOKIES
  c_max_cafes   CONSTANT INT := 5;      -- DUEL_CONFIG.MAX_STAKE_CAFES
  c_max_ttl     CONSTANT INT := 168;    -- 7 jours max
  v_row public.duels;
BEGIN
  IF p_challenger_code IS NULL OR p_challenger_code !~ '^[A-Z0-9]{3}-[A-Z0-9]{3}$' THEN
    RAISE EXCEPTION 'challenger_code invalide';
  END IF;
  IF p_game_key IS NULL OR length(p_game_key) = 0 OR length(p_game_key) > 32 THEN
    RAISE EXCEPTION 'game_key invalide';
  END IF;
  IF p_challenger_score IS NULL OR p_challenger_score < 0 OR p_challenger_score > 1000000000 THEN
    RAISE EXCEPTION 'score invalide';
  END IF;
  IF COALESCE(p_stake_cookies,0) < 0 OR COALESCE(p_stake_cookies,0) > c_max_cookies
     OR COALESCE(p_stake_cafes,0) < 0 OR COALESCE(p_stake_cafes,0) > c_max_cafes THEN
    RAISE EXCEPTION 'mise hors plafond';
  END IF;

  INSERT INTO public.duels (
    game_key, higher_wins, stake_cookies, stake_cafes,
    challenger_code, challenger_name, challenger_score,
    status, expires_at
  ) VALUES (
    p_game_key, COALESCE(p_higher_wins, true),
    COALESCE(p_stake_cookies,0), COALESCE(p_stake_cafes,0),
    p_challenger_code, p_challenger_name, p_challenger_score,
    'open', now() + (LEAST(GREATEST(COALESCE(p_ttl_hours,48),1), c_max_ttl) * INTERVAL '1 hour')
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- 5. accept_duel — un preneur engage sa mise sur un défi ouvert.
--    Passe 'open' → 'pending'. Le client débite sa mise localement
--    APRÈS un retour OK (comme sendGift). Garde-fous : défi encore
--    ouvert & non expiré, pas son propre défi.
CREATE OR REPLACE FUNCTION public.accept_duel(
  p_id            UUID,
  p_opponent_code TEXT,
  p_opponent_name TEXT
)
RETURNS public.duels
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.duels;
BEGIN
  IF p_opponent_code IS NULL OR p_opponent_code !~ '^[A-Z0-9]{3}-[A-Z0-9]{3}$' THEN
    RAISE EXCEPTION 'opponent_code invalide';
  END IF;

  SELECT * INTO v_row FROM public.duels WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'duel introuvable'; END IF;

  -- Expiré tant que jamais relevé → bascule expired et refuse
  IF v_row.status = 'open' AND now() > v_row.expires_at THEN
    UPDATE public.duels SET status='expired', resolved_at=now() WHERE id = p_id;
    RAISE EXCEPTION 'défi expiré';
  END IF;
  IF v_row.status <> 'open' THEN
    RAISE EXCEPTION 'défi déjà pris ou clos';
  END IF;
  IF v_row.challenger_code = p_opponent_code THEN
    RAISE EXCEPTION 'pas ton propre défi';
  END IF;

  UPDATE public.duels
     SET opponent_code = p_opponent_code,
         opponent_name = p_opponent_name,
         status        = 'pending',
         accepted_at   = now()
   WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- 6. submit_duel_score — le preneur pose son score → résolution atomique.
--    Le serveur tranche le gagnant selon higher_wins. Égalité →
--    winner_code NULL (remboursement des deux côtés, géré client).
CREATE OR REPLACE FUNCTION public.submit_duel_score(
  p_id             UUID,
  p_opponent_code  TEXT,
  p_opponent_score INT
)
RETURNS public.duels
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.duels;
  v_win TEXT;
BEGIN
  IF p_opponent_score IS NULL OR p_opponent_score < 0 OR p_opponent_score > 1000000000 THEN
    RAISE EXCEPTION 'score invalide';
  END IF;

  SELECT * INTO v_row FROM public.duels WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'duel introuvable'; END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'duel non en cours';
  END IF;
  IF v_row.opponent_code IS DISTINCT FROM p_opponent_code THEN
    RAISE EXCEPTION 'pas le preneur de ce duel';
  END IF;

  -- Détermine le gagnant (générique via higher_wins)
  IF p_opponent_score = v_row.challenger_score THEN
    v_win := NULL;                                   -- égalité
  ELSIF v_row.higher_wins THEN
    v_win := CASE WHEN p_opponent_score > v_row.challenger_score
                  THEN v_row.opponent_code ELSE v_row.challenger_code END;
  ELSE
    v_win := CASE WHEN p_opponent_score < v_row.challenger_score
                  THEN v_row.opponent_code ELSE v_row.challenger_code END;
  END IF;

  UPDATE public.duels
     SET opponent_score = p_opponent_score,
         winner_code    = v_win,
         status         = 'resolved',
         resolved_at    = now()
   WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- 7. cancel_duel — le challenger retire son défi tant qu'il est 'open'.
--    (Il se rembourse sa mise localement après un retour OK.)
CREATE OR REPLACE FUNCTION public.cancel_duel(
  p_id              UUID,
  p_challenger_code TEXT
)
RETURNS public.duels
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.duels;
BEGIN
  SELECT * INTO v_row FROM public.duels WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'duel introuvable'; END IF;
  IF v_row.challenger_code IS DISTINCT FROM p_challenger_code THEN
    RAISE EXCEPTION 'pas ton défi';
  END IF;
  IF v_row.status <> 'open' THEN
    RAISE EXCEPTION 'déjà pris ou clos';
  END IF;

  UPDATE public.duels SET status='cancelled', resolved_at=now()
   WHERE id = p_id RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- 8. expire_duels — ménage best-effort (appelable par n'importe quel
--    client à l'ouverture de l'onglet Duels, comme la logique inline
--    du boss). Deux cas :
--      · 'open' dépassé expires_at        → 'expired' (challenger remboursé)
--      · 'pending' AWOL (preneur parti)   → 'resolved' gagné par le
--        challenger (forfait), après accepted_at + fenêtre de jeu.
--    Renvoie le nombre de duels expirés/forfait traités.
CREATE OR REPLACE FUNCTION public.expire_duels(p_play_window_min INT DEFAULT 30)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open INT := 0;
  v_forf INT := 0;
BEGIN
  WITH x AS (
    UPDATE public.duels
       SET status='expired', resolved_at=now()
     WHERE status='open' AND now() > expires_at
     RETURNING 1
  ) SELECT count(*) INTO v_open FROM x;

  WITH y AS (
    UPDATE public.duels
       SET status='resolved', winner_code=challenger_code, resolved_at=now()
     WHERE status='pending'
       AND accepted_at IS NOT NULL
       AND now() > accepted_at + (LEAST(GREATEST(COALESCE(p_play_window_min,30),1),1440) * INTERVAL '1 minute')
     RETURNING 1
  ) SELECT count(*) INTO v_forf FROM y;

  RETURN v_open + v_forf;
END;
$$;

-- 9. Grants : exécuter les fonctions (clé anon publique)
GRANT EXECUTE ON FUNCTION public.create_duel(TEXT, BOOLEAN, INT, INT, TEXT, TEXT, INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_duel(UUID, TEXT, TEXT)                              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_duel_score(UUID, TEXT, INT)                         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_duel(UUID, TEXT)                                    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_duels(INT)                                          TO anon, authenticated;

-- 10. Realtime sur la table duels → tableau des défis ouverts live +
--     notification instantanée de résolution (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'duels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duels;
  END IF;
END $$;

-- Vérif rapide
SELECT id, game_key, status, stake_cookies, challenger_name, winner_code, created_at
  FROM public.duels ORDER BY created_at DESC LIMIT 5;

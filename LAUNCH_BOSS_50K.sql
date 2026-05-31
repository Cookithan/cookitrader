-- ════════════════════════════════════════════════════
-- LANCEMENT MANUEL D'UN BOSS — Le Gâteau Mangeur de Cookies
-- ────────────────────────────────────────────────────
-- À coller dans l'éditeur SQL Supabase (projet CookiTrader), UNE FOIS.
--
--   · PV            : 50 000
--   · Démarrage     : annonce maintenant, combat attaquable dans 1 h
--   · Durée combat  : 72 h après le début
--   · Récompense    : skin exclusif « Cookie Mangeur » → TOP 3 des coups
--                     uniquement (géré côté client, cf. App.jsx)
--
-- milestone = 1400000 → s'affiche « Fournée #2 », clé unique (PK) distincte
-- du boss d'origine à 700000. ON CONFLICT DO NOTHING = sûr à ré-exécuter.
-- Le client adopte automatiquement le boss au milestone le plus haut
-- (getActiveBossEvent), donc il apparaît pour tous les joueurs niv ≥ 3.
-- ════════════════════════════════════════════════════

INSERT INTO public.community_boss_events
  (milestone, boss_max_hp, boss_hp, status, started_at, starts_at, ends_at)
VALUES
  (1400000, 50000, 50000, 'active',
   now(),
   now() + INTERVAL '1 hour',
   now() + INTERVAL '1 hour' + INTERVAL '72 hours')
ON CONFLICT (milestone) DO NOTHING;

-- Vérif : la 1re ligne doit être le nouveau boss (milestone 1400000, 50000 PV).
SELECT milestone, boss_hp, boss_max_hp, status, starts_at, ends_at
FROM public.community_boss_events
ORDER BY milestone DESC
LIMIT 3;

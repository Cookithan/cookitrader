-- ════════════════════════════════════════════════════
-- total_play_time — temps cumulé dans l'app (en secondes)
-- ────────────────────────────────────────────────────
-- À exécuter UNE SEULE FOIS dans le SQL editor Supabase (idempotent).
-- Ajoute une colonne `total_play_time bigint default 0` à la table
-- `public.users`. Le client incrémente toutes les 1 s tant que l'onglet
-- est visible (Page Visibility API), puis sync via upsertProfile toutes
-- les 5 s.
--
-- Lecture côté client : `pullProfile` retourne `totalPlayTime` mappé
-- depuis cette colonne. UserProfileModal affiche via `formatPlayTime()`.
-- ════════════════════════════════════════════════════

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS total_play_time bigint NOT NULL DEFAULT 0;

-- Vérif : doit retourner la colonne + le default 0
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'total_play_time';

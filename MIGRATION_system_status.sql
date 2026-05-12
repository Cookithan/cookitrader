-- ════════════════════════════════════════════════════
-- system_status — état global "live" pour la maintenance & force-update
-- ────────────────────────────────────────────────────
-- À exécuter UNE SEULE FOIS dans le SQL editor Supabase (idempotent).
-- Active la possibilité de basculer l'app en maintenance ou de forcer
-- un reload sans avoir à pousser un deploy.
--
-- Toggles SQL (depuis le dashboard Supabase, plus tard) :
--   -- Activer la maintenance pour tout le monde (sauf bypass userCodes)
--   UPDATE public.system_status
--   SET maintenance_mode = true,
--       maintenance_title = 'Maintenance en cours',
--       maintenance_subtitle = 'On répare quelques bugs, reviens dans 10 min !',
--       updated_at = now()
--   WHERE id = 1;
--
--   -- Désactiver la maintenance
--   UPDATE public.system_status
--   SET maintenance_mode = false, updated_at = now()
--   WHERE id = 1;
--
--   -- Forcer les clients ouverts à voir un popup "Mise à jour dispo" + reload
--   UPDATE public.system_status
--   SET force_version = '1.15.1', updated_at = now()
--   WHERE id = 1;
-- ════════════════════════════════════════════════════

-- 1. Table singleton (id forcé à 1 via CHECK)
CREATE TABLE IF NOT EXISTS public.system_status (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  maintenance_title TEXT,
  maintenance_subtitle TEXT,
  force_version TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Insert le row initial (no-op si déjà là)
INSERT INTO public.system_status (id, maintenance_mode)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS : lecture publique pour tous, écriture impossible côté client
--    (les UPDATE se font via SQL editor avec service_role)
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_status_read_all ON public.system_status;
CREATE POLICY system_status_read_all ON public.system_status
  FOR SELECT
  USING (true);

-- 4. Activer Supabase Realtime sur la table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'system_status'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_status;
  END IF;
END $$;

-- Vérif : doit retourner 1 ligne (maintenance_mode = false par défaut)
SELECT * FROM public.system_status;

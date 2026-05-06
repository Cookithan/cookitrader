import { createClient } from '@supabase/supabase-js';

/* ════════════════════════════════════════════════════
   supabase.js — client Supabase partagé (BRIEF_SUPABASE phase 1)
   ────────────────────────────────────────────────────
   Lit l'URL et la clé "publishable" depuis les variables d'env Vite
   (préfixe VITE_ requis pour qu'elles soient bundlées côté client).

   Si l'une des 2 variables manque (ex. lancement local sans .env.local
   ou prod sans config Vercel), le client est null et l'app continue
   en mode dégradé via isSupabaseEnabled().

   ⚠️ La clé `anon` / `publishable` est PUBLIQUE — pas un secret.
   La sécurité passe par les Row Level Security (RLS) activées en
   phase 2 du brief.

   Exports :
   - supabase           : SupabaseClient | null
   - isSupabaseEnabled  : () => boolean
═══════════════════════════════════════════════════════ */

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if(!supabaseUrl || !supabaseAnonKey){
  // eslint-disable-next-line no-console
  console.warn('[Supabase] env vars missing — online features disabled.');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseEnabled = () => supabase !== null;

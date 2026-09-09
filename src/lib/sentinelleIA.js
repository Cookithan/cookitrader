import { supabase, isSupabaseEnabled } from './supabase';

/* ════════════════════════════════════════════════════
   sentinelleIA.js — le pont vers le cerveau
   ────────────────────────────────────────────────────
   Un seul appel : parler(phrase, message | mode:'briefing'). Il part vers
   la fonction serveur `sentinelle`, qui détient la clé Anthropic, vérifie
   la phrase, rassemble la base, fait tourner le modèle et ses outils, et
   renvoie ce qu'elle a dit et ce qu'elle a fait.

   L'app n'a JAMAIS la clé. Elle n'a que la phrase de Régis, en mémoire,
   le temps de l'écran — comme la console.

   Toujours safe en mode dégradé : sans Supabase, une réponse neutre.
═══════════════════════════════════════════════════════ */

export async function parlerSentinelle({ phrase, message = '', mode = 'message' }) {
  if (!isSupabaseEnabled()) return { ok: false, message: 'Hors ligne.' };
  try {
    const { data, error } = await supabase.functions.invoke('sentinelle', {
      body: { phrase, message, mode },
    });
    if (error) {
      /* La fonction répond avec un corps même en erreur : on le lit. */
      let corps = null;
      try { corps = await error.context?.json?.(); } catch { /* pas de corps */ }
      return { ok: false, message: corps?.message || error.message || 'La Sentinelle ne répond pas.' };
    }
    return data || { ok: false, message: 'Réponse vide.' };
  } catch (e) {
    return { ok: false, message: e?.message || 'La Sentinelle ne répond pas.' };
  }
}

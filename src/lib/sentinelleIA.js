import { supabase, isSupabaseEnabled } from './supabase';

/* ════════════════════════════════════════════════════
   sentinelleIA.js — le pont vers le cerveau
   ────────────────────────────────────────────────────
   Tout part vers la fonction serveur `sentinelle`, qui détient la clé
   Anthropic, vérifie la phrase, rassemble la base et fait tourner le
   modèle. L'app n'a JAMAIS la clé — seulement la phrase de Régis, en
   mémoire le temps de l'écran.

   Cinq gestes, un seul appel derrière :
     pileSentinelle(phrase, { forcer })      → la pile de dossiers
     deciderDossier(phrase, id, decision)    → 'classer' | 'agir'
     demanderDossier(phrase, id, question)   → une question dans un dossier
     parlerSentinelle({ phrase, message })   → la ligne du bas
     (mode 'briefing' conservé pour l'ancien chat)

   Toujours safe en mode dégradé : sans Supabase, une réponse neutre.
═══════════════════════════════════════════════════════ */

async function appeler(body) {
  if (!isSupabaseEnabled()) return { ok: false, message: 'Hors ligne.' };
  try {
    const { data, error } = await supabase.functions.invoke('sentinelle', { body });
    if (error) {
      let corps = null;
      try { corps = await error.context?.json?.(); } catch { /* pas de corps */ }
      return { ok: false, message: corps?.message || error.message || 'La Sentinelle ne répond pas.' };
    }
    return data || { ok: false, message: 'Réponse vide.' };
  } catch (e) {
    return { ok: false, message: e?.message || 'La Sentinelle ne répond pas.' };
  }
}

export function pileSentinelle(phrase, { forcer = false } = {}) {
  return appeler({ phrase, mode: 'dossiers', forcer });
}

/* L'écran entier : les bandes, la pile allumée là où elle se passe, la
   frise. Ne dépense un jeton que si la pile date de plus de 10 min. */
export function tableauSentinelle(phrase, { forcer = false } = {}) {
  return appeler({ phrase, mode: 'tableau', forcer });
}

export function deciderDossier(phrase, id, decision) {
  return appeler({ phrase, mode: 'decider', id, decision });
}

export function demanderDossier(phrase, id, question) {
  return appeler({ phrase, mode: 'demander', id, question });
}

export function parlerSentinelle({ phrase, message = '', mode = 'message' }) {
  return appeler({ phrase, message, mode });
}

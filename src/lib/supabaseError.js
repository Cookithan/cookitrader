/* ════════════════════════════════════════════════════
   supabaseError — event-bus minimaliste pour les erreurs réseau
   ────────────────────────────────────────────────────
   Les fonctions de supabaseSync.js appellent notifySupabaseError(msg)
   en cas d'erreur réseau / RLS. Un composant central (NetworkErrorToast)
   s'abonne via onSupabaseError() pour afficher un toast discret en bas.

   Utilise un EventTarget natif → pas de dépendance, pas de contexte
   React à percoler.
═══════════════════════════════════════════════════════ */

const target = (typeof window !== 'undefined') ? new EventTarget() : null;

export function notifySupabaseError(msg = 'Connexion limitée — données locales affichées'){
  if(!target) return;
  target.dispatchEvent(new CustomEvent('supabase:error', { detail: msg }));
}

export function onSupabaseError(handler){
  if(!target) return ()=>{};
  target.addEventListener('supabase:error', handler);
  return ()=>target.removeEventListener('supabase:error', handler);
}

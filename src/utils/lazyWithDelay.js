import { lazy } from 'react';

/* ════════════════════════════════════════════════════
   lazyWithDelay — React.lazy + délai minimum d'affichage du fallback
   ────────────────────────────────────────────────────
   Sans min-delay, sur réseau rapide ou chunk déjà mis en cache, le
   Suspense fallback s'affiche et disparaît en <50ms = juste un flash
   désagréable. Avec min-delay, on garantit que le loader (la tasse
   qui se remplit) soit visible au moins X ms avant que le contenu
   apparaisse.

   À utiliser uniquement pour les chunks où le loader DOIT être vu
   (tabs, mini-jeux). Pour les modales (fallback={null}), garder
   React.lazy direct pour ne pas ajouter de latence inutile.

   Usage :
     const FooLazy = lazyWithDelay(
       () => import('./Foo.jsx'),
       300,                  // minDelayMs (défaut 300)
       'FooNamedExport'      // optionnel si named export
     );

   Trade-off : ajoute X ms à chaque ouverture, même si le chunk est
   déjà chargé en cache. 300ms = compromis : assez court pour rester
   snappy, assez long pour apprécier l'animation du loader.
═══════════════════════════════════════════════════════ */
export function lazyWithDelay(importFn, minDelayMs = 300, namedExport = null){
  return lazy(() => Promise.all([
    importFn(),
    new Promise(resolve => setTimeout(resolve, minDelayMs)),
  ]).then(([mod]) => (
    namedExport ? { default: mod[namedExport] } : mod
  )));
}

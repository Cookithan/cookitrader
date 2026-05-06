import { useEffect, useRef } from "react";

/* ════════════════════════════════════════════════════
   useBackToClose — intercepte le bouton retour pour fermer un overlay
   ────────────────────────────────────────────────────
   Sur Android (et certains gestes de retour iOS PWA), le bouton retour
   système déclenche un `popstate`. On exploite ça : quand un overlay
   est ouvert, on pousse un état synthétique dans l'history. À l'appui
   sur retour, le navigateur dépile cet état et émet `popstate` → on
   ferme l'overlay au lieu de quitter l'app.

   Si l'utilisateur ferme l'overlay normalement (bouton X, etc.), on
   appelle nous-même history.back() pour rééquilibrer l'historique
   (sinon il aurait un appui de retour "vide" qui ne ferait rien).

   Usage : useBackToClose(showFoo, () => setShowFoo(false));

   ⚠️ Si plusieurs overlays peuvent se superposer simultanément, chaque
   appel push son propre état → pile cohérente. Évite quand même les
   ouvertures simultanées non-essentielles.
═══════════════════════════════════════════════════════ */

export function useBackToClose(open, onClose){
  const handlerRef = useRef(onClose);
  useEffect(()=>{ handlerRef.current = onClose; }, [onClose]);

  useEffect(()=>{
    if(!open) return;

    let pushed = false;
    try{
      window.history.pushState({ pwaOverlay: Date.now() }, '');
      pushed = true;
    }catch{ /* environnements exotiques sans history API */ }

    const onPop = () => { handlerRef.current?.(); };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);
      /* Fermeture volontaire (bouton X, click ailleurs, etc.) : on
         dépile l'entrée qu'on avait poussée. Si la fermeture vient
         déjà d'un popstate, le state courant n'a plus pwaOverlay et
         on ne fait rien. */
      if(pushed && window.history.state && window.history.state.pwaOverlay){
        try{ window.history.back(); }catch{}
      }
    };
  }, [open]);
}

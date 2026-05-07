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

   ⚠️ Bug sous-overlays — quand un overlay B est ouvert PAR-DESSUS un
   overlay A, fermer B via X déclenche history.back(), qui émet popstate
   reçu par TOUS les listeners — y compris celui de A (qui se fermerait
   indûment). Solution : flag `suppressNextPop` partagé au niveau module
   pour ignorer le popstate synthétique qu'on déclenche nous-même.

   Usage : useBackToClose(showFoo, () => setShowFoo(false));
═══════════════════════════════════════════════════════ */

/* Flag partagé entre instances : true pendant un history.back()
   déclenché par notre propre cleanup. Le listener popstate l'observe
   et ignore l'événement, puis on remet à false au tick suivant. */
let suppressNextPop = false;

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

    const onPop = () => {
      if(suppressNextPop) return;
      handlerRef.current?.();
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);
      /* Fermeture volontaire (bouton X, click ailleurs, etc.) : on
         dépile l'entrée qu'on avait poussée. Si la fermeture vient
         déjà d'un popstate, le state courant n'a plus pwaOverlay et
         on ne fait rien. Le flag suppressNextPop empêche les autres
         instances actives de réagir à notre propre history.back(). */
      if(pushed && window.history.state && window.history.state.pwaOverlay){
        suppressNextPop = true;
        try{ window.history.back(); }catch{}
        /* Reset asynchrone : popstate est émis sur le tick suivant. */
        setTimeout(()=>{ suppressNextPop = false; }, 0);
      }
    };
  }, [open]);
}

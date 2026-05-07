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

   ⚠️ Bug sous-overlays (BRIEF_DEMANDES_AMIS) — quand un overlay B est
   ouvert PAR-DESSUS un overlay A, fermer B via X déclenchait history.back()
   qui émet popstate reçu par TOUS les listeners — y compris celui de A
   (qui se fermait indûment). Solution : compteur partagé `pendingSuppress`
   incrémenté juste avant notre back() et consommé par le listener qui
   reçoit le pop synthétique. Synchrone, donc pas de race avec le timing
   du dispatch popstate.

   Usage : useBackToClose(showFoo, () => setShowFoo(false));
═══════════════════════════════════════════════════════ */

/* Compteur de pops à ignorer (synthétiques, déclenchés par notre back).
   Le 1er listener qui reçoit le popstate après un suppress décrémente
   et early-return. Pas de timing fragile vs setTimeout. */
let pendingSuppress = 0;

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
      if(pendingSuppress > 0){ pendingSuppress--; return; }
      handlerRef.current?.();
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);
      /* Fermeture volontaire (X, click ailleurs…) : on dépile l'entrée
         qu'on avait poussée. Le compteur empêche les autres instances
         actives (overlay parent par ex.) de réagir à notre back(). */
      if(pushed && window.history.state && window.history.state.pwaOverlay){
        pendingSuppress++;
        try{ window.history.back(); }catch{ pendingSuppress--; }
      }
    };
  }, [open]);
}

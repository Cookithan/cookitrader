import { useEffect, useState } from "react";

/* ════════════════════════════════════════════════════
   useInstallPrompt — hook pour l'installation PWA
   ────────────────────────────────────────────────────
   Centralise la logique d'installation pour pouvoir l'exposer dans
   les paramètres (au lieu d'une bannière intrusive).

   - Écoute `beforeinstallprompt` dès le 1er render (Chrome Android,
     Edge, Chrome desktop). Garde l'event pour pouvoir le déclencher
     plus tard via install().
   - Détecte le mode standalone (app déjà installée) via la media query
     `display-mode: standalone` ou `navigator.standalone` (iOS Safari).
   - Détecte iOS pour pouvoir afficher l'instruction manuelle (Partager
     → Sur l'écran d'accueil) car iOS Safari n'expose PAS
     `beforeinstallprompt`.

   Retourne :
   - canInstall   : true si on peut déclencher install() (Android/Desktop)
   - isIos        : true sur iOS Safari (instruction manuelle requise)
   - isStandalone : true si l'app est déjà installée
   - install()    : ouvre le dialog natif d'installation
═══════════════════════════════════════════════════════ */

export function useInstallPrompt(){
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone,   setIsStandalone]   = useState(()=>{
    if(typeof window === 'undefined') return false;
    /* iOS Safari : navigator.standalone ; Android et autres : matchMedia */
    return window.navigator.standalone === true
        || window.matchMedia?.('(display-mode: standalone)')?.matches === true;
  });

  /* Détection iOS — regex sur user-agent (peu robuste mais suffisant
     pour ce cas d'usage : afficher une instruction manuelle Safari).
     iPadOS 13+ se présente comme Mac, on inclut donc l'écran tactile. */
  const isIos = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  useEffect(()=>{
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled',         onInstalled);
    return ()=>{
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled',         onInstalled);
    };
  }, []);

  const install = async () => {
    if(!deferredPrompt) return false;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice?.outcome === 'accepted';
  };

  return {
    canInstall: !!deferredPrompt && !isStandalone,
    isIos,
    isStandalone,
    install,
  };
}

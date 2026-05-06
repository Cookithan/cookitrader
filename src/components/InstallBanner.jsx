import { useEffect, useRef, useState } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage.js";

/* ════════════════════════════════════════════════════
   InstallBanner — invitation à installer la PWA
   ────────────────────────────────────────────────────
   Apparaît UNIQUEMENT :
   - Sur navigateurs qui supportent `beforeinstallprompt` (Chrome Android,
     Edge, Chrome desktop). iOS Safari n'expose PAS cet event → la
     bannière ne s'y affiche jamais (l'installation iOS se fait via le
     bouton Partager → "Sur l'écran d'accueil", c'est un comportement
     natif).
   - Si l'utilisateur ne l'a pas déjà refusée (clé LS legacy
     `cookiminer:installDismissed`).
   - 30 secondes après le 1er event `beforeinstallprompt` (pour ne pas
     spammer dès le 1er chargement).

   Au clic "Installer" : on appelle deferredPrompt.prompt() qui ouvre
   le dialog natif du navigateur.
═══════════════════════════════════════════════════════ */

export function InstallBanner(){
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useLocalStorage('installDismissed', false);
  const timerRef = useRef(null);

  useEffect(()=>{
    if(dismissed) return;
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      /* On attend 30s avant de proposer (anti-pop-up agressif).
         Si l'utilisateur a déjà refusé entre-temps, on ne montre pas. */
      timerRef.current = setTimeout(()=>{
        setShow(true);
      }, 30_000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return ()=>{
      window.removeEventListener('beforeinstallprompt', handler);
      if(timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismissed]);

  const install = async () => {
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShow(false);
  };

  const dismiss = () => {
    setShow(false);
    setDismissed(true);
  };

  if(!show || dismissed) return null;

  return (
    <div
      className="su"
      style={{
        position:'fixed',
        bottom:90, left:'50%', transform:'translateX(-50%)',
        maxWidth:410, width:'calc(100% - 20px)',
        background:'linear-gradient(135deg,#D4A017,#C17F3C)',
        borderRadius:18, padding:'14px 16px',
        boxShadow:'0 8px 24px rgba(74,44,23,.3)',
        color:'#fff',
        zIndex:200,
        display:'flex', alignItems:'center', gap:12,
      }}
    >
      <span style={{ fontSize:28 }}>🍪</span>
      <div style={{ flex:1, fontSize:13, lineHeight:1.3 }}>
        <div style={{ fontWeight:800 }}>Installe CookiTrading</div>
        <div style={{ opacity:.85, fontSize:12 }}>Sur ton écran d'accueil, en 1 clic</div>
      </div>
      <button
        onClick={install}
        style={{
          background:'#fff', color:'#C17F3C',
          border:'none', borderRadius:12,
          padding:'8px 14px',
          fontWeight:800, fontSize:13,
          cursor:'pointer',
        }}
      >
        Installer
      </button>
      <button
        onClick={dismiss}
        aria-label="Plus tard"
        style={{
          background:'transparent', color:'#fff',
          border:'none', fontSize:18,
          opacity:.7, cursor:'pointer', padding:4,
        }}
      >
        ✕
      </button>
    </div>
  );
}

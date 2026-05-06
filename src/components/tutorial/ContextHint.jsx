import { useEffect } from "react";

/* ════════════════════════════════════════════════════
   ContextHint — bulle contextuelle (TUTORIEL — étape 8)
   ────────────────────────────────────────────────────
   Bulle simple en bas d'écran, sans spotlight. Apparaît la 1re fois
   que l'utilisateur ouvre certains jeux/onglets, puis disparaît
   définitivement (state seenHints persisté en localStorage par App.jsx).

   Auto-close après 6 secondes (ou clic sur ✕).

   CONTEXT_HINTS : map des indices contextuels disponibles. App.jsx
   appelle showHint(id) au moment d'ouvrir l'élément correspondant.

   Props :
   - hint    : { text } | null
   - onClose : ferme la bulle
═══════════════════════════════════════════════════════ */

export const CONTEXT_HINTS = {
  'first-quiz':       { text:'💡 Réponds bien pour gagner des cookies — un quiz toutes les 5h !' },
  'first-spin':       { text:'🎰 La roue te fait gagner... ou perdre des cookies. Bonne chance !' },
  'first-click':      { text:'⚡ Tape le cookie le plus vite possible en 5 secondes !' },
  'first-stop-cafe':  { text:'☕ Maintiens le bouton, vise la zone dorée — sans déborder !' },
  'first-marche':     { text:'📈 Investis tes cookies en $CKM. Le prix monte ET descend !' },
  'first-boutique':   { text:'🛍️ Achète badges, titres, thèmes et skins pour personnaliser !' },
};

export function ContextHint({ hint, onClose }){
  useEffect(()=>{
    if(!hint) return;
    const t = setTimeout(onClose, 6000);
    return ()=>clearTimeout(t);
  }, [hint, onClose]);

  if(!hint) return null;

  return (
    <div
      className="bi"
      style={{
        position:'fixed',
        bottom:110, left:'50%', transform:'translateX(-50%)',
        background:'linear-gradient(140deg,#4A2C17,#7D4E1F)',
        color:'#fff',
        borderRadius:16, padding:'12px 16px',
        maxWidth:320, width:'calc(100% - 40px)',
        boxShadow:'0 8px 24px rgba(0,0,0,.3)',
        border:'1.5px solid rgba(212,160,23,.3)',
        zIndex:150,
        display:'flex', alignItems:'center', gap:12,
      }}
    >
      <div style={{ flex:1, fontSize:13, fontWeight:600, lineHeight:1.4 }}>
        {hint.text}
      </div>
      <button
        onClick={onClose}
        aria-label="Fermer"
        style={{
          background:'rgba(255,255,255,.15)', border:'none',
          borderRadius:8, padding:'4px 8px',
          color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer',
        }}
      >
        ✕
      </button>
    </div>
  );
}

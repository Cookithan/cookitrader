import { useEffect, useRef } from "react";

/* ════════════════════════════════════════════════════
   ContextHint — bulle contextuelle (TUTORIEL — étape 8)
   ────────────────────────────────────────────────────
   Bulle simple en bas d'écran, sans spotlight. Apparaît la 1re fois
   que l'utilisateur ouvre certains jeux/onglets, puis disparaît
   définitivement (state seenHints persisté en localStorage par App.jsx).

   Auto-close après 6 secondes (ou clic sur ✕).

   ⚠️ onClose est ré-créé à chaque render de App.jsx, donc on l'isole
   dans un ref pour ne pas relancer le timeout à chaque re-render
   (un re-render fréquent — tick events / market — empêcherait sinon
   le timer 6s de s'écouler).

   ⚠️ Cadrage : la classe `.bi` écrase le transform:translateX pendant
   l'animation. On encapsule dans un wrapper qui détient le translate,
   et on applique l'anim sur l'enfant.

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
  const onCloseRef = useRef(onClose);
  useEffect(()=>{ onCloseRef.current = onClose; }, [onClose]);

  /* Auto-close 6s — ne dépend QUE de hint pour éviter les resets
     intempestifs liés aux re-renders parents. */
  useEffect(()=>{
    if(!hint) return;
    const t = setTimeout(()=>onCloseRef.current?.(), 6000);
    return ()=>clearTimeout(t);
  }, [hint]);

  if(!hint) return null;

  return (
    <div
      style={{
        position:'fixed',
        bottom:110, left:'50%', transform:'translateX(-50%)',
        maxWidth:320, width:'calc(100% - 40px)',
        zIndex:150,
      }}
    >
      <div
        className="bi"
        style={{
          background:'linear-gradient(140deg,#4A2C17,#7D4E1F)',
          color:'#fff',
          borderRadius:16, padding:'12px 16px',
          boxShadow:'0 8px 24px rgba(0,0,0,.3)',
          border:'1.5px solid rgba(212,160,23,.3)',
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
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { onSupabaseError } from "../lib/supabaseError.js";

/* ════════════════════════════════════════════════════
   NetworkErrorToast — toast discret en bas d'écran
   ────────────────────────────────────────────────────
   S'affiche quand notifySupabaseError() est appelé depuis les helpers
   Supabase (réseau down, RLS qui rejette, etc.). Auto-close 4s, et
   réarmé si une nouvelle erreur arrive entre-temps.

   Sans état dans App.jsx — le composant s'abonne directement à
   l'event-bus de supabaseError.js. Position fixe juste au-dessus de
   la nav du bas.
═══════════════════════════════════════════════════════ */

export function NetworkErrorToast(){
  const [msg, setMsg] = useState(null);
  const timerRef = useRef(null);

  useEffect(()=>{
    return onSupabaseError((e)=>{
      setMsg(e.detail);
      if(timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(()=>setMsg(null), 4000);
    });
  }, []);

  if(!msg) return null;

  return (
    <div
      style={{
        position:'fixed',
        bottom:100, left:'50%', transform:'translateX(-50%)',
        maxWidth:340, width:'calc(100% - 32px)',
        zIndex:170,
      }}
    >
      <div
        className="su"
        style={{
          background:'rgba(74,44,23,.94)',
          color:'#F0E6D3',
          padding:'10px 16px',
          borderRadius:14,
          fontSize:12, fontWeight:600,
          textAlign:'center',
          border:'1px solid rgba(212,160,23,.35)',
          boxShadow:'0 6px 20px rgba(0,0,0,.4)',
          backdropFilter:'blur(6px)',
        }}
      >
        ⚠️ {msg}
      </div>
    </div>
  );
}

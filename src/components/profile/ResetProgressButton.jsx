import { useState } from "react";
import { AlertTriangle } from "lucide-react";

/* ════════════════════════════════════════════════════
   ResetProgressButton — bouton "Réinitialiser ma progression"
   ────────────────────────────────────────────────────
   Double validation : un premier clic transforme le bouton dashed
   discret en carte espresso "Tout effacer ?" avec deux actions
   (Annuler / Tout effacer). Utilisé dans SettingsOverlay (zone
   sensible) et dans ProfileOverlay (PHASE 5).

   Props :
   - onReset : callback appelé après confirmation
   - C       : palette active
═══════════════════════════════════════════════════════ */
export function ResetProgressButton({ onReset, C }){
  const [confirming, setConfirming] = useState(false);

  if(!confirming){
    return (
      <button
        onClick={()=>setConfirming(true)}
        style={{ width:'100%', padding:11, borderRadius:12, background:'transparent', border:`1px dashed ${C.border}`, color:C.muted, fontWeight:500, fontSize:12, letterSpacing:.2, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}
      >
        <AlertTriangle size={12} /> Réinitialiser ma progression
      </button>
    );
  }

  return (
    <div style={{ borderRadius:14, padding:14, background:'linear-gradient(135deg,#3D2010,#2A1508)', border:'1px solid #4A2C17' }}>
      <div style={{ fontSize:13, fontWeight:700, color:'#F0E0C0', marginBottom:6 }}>Tout effacer ?</div>
      <div style={{ fontSize:11, color:'rgba(240,224,192,.7)', lineHeight:1.5, marginBottom:14 }}>
        Cookies, niveau, série, record, récompenses débloquées et thème seront définitivement perdus. Cette action est irréversible.
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={()=>setConfirming(false)} style={{ flex:1, padding:10, borderRadius:11, background:'rgba(240,224,192,.1)', color:'#F0E0C0', fontWeight:700, fontSize:12, border:'1px solid rgba(240,224,192,.2)' }}>
          Annuler
        </button>
        <button onClick={onReset} style={{ flex:1, padding:10, borderRadius:11, background:'#1A0E08', color:'#A88060', fontWeight:700, fontSize:12, border:'1px solid #3D2010' }}>
          Tout effacer
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   SkipConfirmModal — confirmation pour passer le tutoriel
   ────────────────────────────────────────────────────
   Petite modale qui demande confirmation avant de fermer le tuto
   guidé. Affichée uniquement quand l'utilisateur clique "Passer
   le tutoriel" depuis la 1re bulle.

   Props :
   - onCancel  : annule, on reste sur l'étape courante
   - onConfirm : ferme le tuto et marque comme complété (App.jsx)
   - C         : palette
═══════════════════════════════════════════════════════ */
export function SkipConfirmModal({ onCancel, onConfirm, C }){
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:220, backdropFilter:'blur(6px)', padding:16 }}>
      <div className="bi" style={{
        background:C.card, borderRadius:22, padding:'24px 22px',
        maxWidth:320, width:'100%',
        boxShadow:'0 24px 60px rgba(0,0,0,.5)',
        border:`1.5px solid ${C.border}`,
        textAlign:'center',
      }}>
        <div style={{ fontSize:36, marginBottom:8 }}>⚠️</div>
        <div style={{ fontSize:16, fontWeight:900, color:C.text, marginBottom:8 }}>
          Passer le tutoriel ?
        </div>
        <div style={{ fontSize:12, color:C.muted, lineHeight:1.5, marginBottom:18 }}>
          Tu peux le manquer si tu débutes — mais tu peux toujours explorer librement.
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button
            onClick={onCancel}
            style={{
              flex:1, padding:'12px 0', borderRadius:14,
              background:'transparent', color:C.text,
              border:`1.5px solid ${C.border}`,
              fontSize:13, fontWeight:700, cursor:'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex:1.3, padding:'12px 0', borderRadius:14,
              background:'#4A2C17', color:'#F0E0C0',
              border:'1.5px solid #5A3520',
              fontSize:13, fontWeight:800, cursor:'pointer',
            }}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

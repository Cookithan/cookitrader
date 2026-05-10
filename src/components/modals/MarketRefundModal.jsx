import { GOLD, ESPRESSO } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   MarketRefundModal — excuses + compensation marché
   ────────────────────────────────────────────────────
   Pop une seule fois (flag LS marketRefund2026_05_10) chez les
   ex-investisseurs du marché qui ont perdu leur stock dans le
   reset. Explique l'incident pump-and-dump, présente le crédit
   appliqué, et invite à reprendre le trading dans la nouvelle
   config protégée.

   Props :
   - amount  : nombre de cookies remboursés
   - onClose : ferme la modale
   - C       : palette
═══════════════════════════════════════════════════════ */

export function MarketRefundModal({ amount, onClose, C }){
  return (
    <div
      onClick={onClose}
      role="dialog"
      style={{
        position:'fixed', inset:0, zIndex:96,
        background:'rgba(15,8,4,.85)', backdropFilter:'blur(6px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:18,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bi"
        style={{
          width:'100%', maxWidth:380,
          background:C.card, borderRadius:24,
          border:`1.5px solid ${C.border}`,
          boxShadow:'0 24px 60px rgba(0,0,0,.55)',
          overflow:'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          background:ESPRESSO, color:'#F0C050',
          padding:'22px 22px 18px', textAlign:'center',
        }}>
          <div className="float-anim" style={{ fontSize:48, lineHeight:1, marginBottom:6 }}>🤝</div>
          <div style={{
            fontSize:11, fontWeight:900, letterSpacing:3,
            textTransform:'uppercase', opacity:.85, marginBottom:4,
          }}>
            Toutes nos excuses
          </div>
          <div style={{ fontSize:18, fontWeight:900, color:'#fff', letterSpacing:.3 }}>
            Compensation marché 📈
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'18px 22px 4px' }}>
          <p style={{ fontSize:13, color:C.text, lineHeight:1.6, margin:0, marginBottom:14 }}>
            Désolé pour la gêne occasionnée 🙏 Un joueur a exploité le marché
            avec un <strong>pump-and-dump</strong> qui a fait chuter brutalement
            le prix de l'action ($CKM) de <strong>123 → 80 🍪</strong>, te faisant perdre
            ton investissement.
          </p>

          {/* Refund highlighted */}
          <div style={{
            background:'linear-gradient(135deg, #F5DC8A, #D4A017)',
            borderRadius:14, padding:'14px 16px',
            marginBottom:14, textAlign:'center',
            border:'2px solid #D4A017',
            boxShadow:'0 4px 14px rgba(212,160,23,.3)',
          }}>
            <div style={{ fontSize:10, fontWeight:900, color:'#3D2010', letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>
              Tu récupères
            </div>
            <div style={{ fontSize:32, fontWeight:900, color:'#3D2010', lineHeight:1 }}>
              +{(amount || 0).toLocaleString('fr-FR')} 🍪
            </div>
            <div style={{ fontSize:11, fontWeight:600, color:'#5D3A1F', marginTop:4, fontStyle:'italic' }}>
              (l'intégralité de ton ancien investissement)
            </div>
          </div>

          <div style={{
            background:C.card2, borderRadius:12, padding:'10px 14px',
            border:`1px solid ${C.border}`, marginBottom:14,
          }}>
            <div style={{ fontSize:10, fontWeight:800, color:C.muted, letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>
              Ce qui a changé pour la suite
            </div>
            <ul style={{ fontSize:12, color:C.text, lineHeight:1.6, paddingLeft:18, margin:0 }}>
              <li><strong>Cap 20 actions</strong> par transaction (vs illimité avant)</li>
              <li><strong>Cooldown 60 s</strong> entre achats / ventes</li>
              <li><strong>Bonus de hold</strong> : +10/30/100 % selon durée</li>
              <li><strong>Circuit breaker</strong> auto si variation &gt; 15 %</li>
              <li><strong>Marché élargi</strong> à 10 000 actions</li>
            </ul>
          </div>

          <div style={{
            fontSize:11, color:C.muted, textAlign:'center',
            fontStyle:'italic', marginBottom:18, lineHeight:1.5,
          }}>
            Le pump-and-dump est désormais quasi impossible. Bon trading ! ☕
          </div>
        </div>

        {/* Bouton */}
        <div style={{ padding:'0 22px 20px' }}>
          <button
            onClick={onClose}
            className="glow-anim"
            style={{
              width:'100%', padding:'13px 0', borderRadius:14,
              background:GOLD, color:'#fff',
              fontSize:14, fontWeight:900, letterSpacing:.5,
              border:'none', cursor:'pointer',
              boxShadow:'0 6px 18px rgba(212,160,23,.45)',
            }}
          >
            🍪 Merci, j'ai compris
          </button>
        </div>
      </div>
    </div>
  );
}

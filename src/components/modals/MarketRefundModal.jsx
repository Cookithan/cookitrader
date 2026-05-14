import { GOLD, ESPRESSO } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";

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
  const { t, lang } = useTranslation();
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
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
            {t('refund.apologies')}
          </div>
          <div style={{ fontSize:18, fontWeight:900, color:'#fff', letterSpacing:.3 }}>
            {t('refund.compensation_title')}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'18px 22px 4px' }}>
          <p style={{ fontSize:13, color:C.text, lineHeight:1.6, margin:0, marginBottom:14 }}>
            {t('refund.explanation')}
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
              {t('refund.you_get_back')}
            </div>
            <div style={{ fontSize:32, fontWeight:900, color:'#3D2010', lineHeight:1 }}>
              +{(amount || 0).toLocaleString(locale)} 🍪
            </div>
            <div style={{ fontSize:11, fontWeight:600, color:'#5D3A1F', marginTop:4, fontStyle:'italic' }}>
              {t('refund.full_investment')}
            </div>
          </div>

          <div style={{
            background:C.card2, borderRadius:12, padding:'10px 14px',
            border:`1px solid ${C.border}`, marginBottom:14,
          }}>
            <div style={{ fontSize:10, fontWeight:800, color:C.muted, letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>
              {t('refund.what_changed')}
            </div>
            <ul style={{ fontSize:12, color:C.text, lineHeight:1.6, paddingLeft:18, margin:0 }}>
              <li>{t('refund.change_cap_20')}</li>
              <li>{t('refund.change_cooldown')}</li>
              <li>{t('refund.change_hold_bonus')}</li>
              <li>{t('refund.change_circuit_breaker')}</li>
              <li>{t('refund.change_market_size')}</li>
            </ul>
          </div>

          <div style={{
            fontSize:11, color:C.muted, textAlign:'center',
            fontStyle:'italic', marginBottom:14, lineHeight:1.5,
          }}>
            {t('refund.pump_dump_safe')}
          </div>

          <div style={{
            fontSize:11, color:C.text, textAlign:'center',
            background:'rgba(212,160,23,.12)',
            border:'1px dashed rgba(212,160,23,.4)',
            borderRadius:10, padding:'8px 12px', marginBottom:18,
            lineHeight:1.5,
          }}>
            ℹ️ {t('refund.see_about_details')}
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
            🍪 {t('refund.thanks_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}

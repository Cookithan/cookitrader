import { Coffee } from "lucide-react";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   CafesResetNoticeModal — annonce de la refonte économie café
   ────────────────────────────────────────────────────
   Pop quand la migration mai-2026 (cafesResetMay10) reset les cafés
   à 0 chez l'utilisateur. Explique la nouvelle économie : café devenu
   rare, sources réduites, nouveaux items à dépenser, paiement dispo
   pour les pressés. Affiché 1 fois.

   Props :
   - onClose : ferme la modale (pas de flag à gérer ici, la migration
               LS fait déjà l'idempotence côté reset des cafés)
   - C       : palette
═══════════════════════════════════════════════════════ */

export function CafesResetNoticeModal({ onClose, C }){
  const { t } = useTranslation();
  return (
    <div
      onClick={onClose}
      role="dialog"
      style={{
        position:'fixed', inset:0, zIndex:94,
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
          <div className="float-anim" style={{ fontSize:48, lineHeight:1, marginBottom:6 }}>☕</div>
          <div style={{
            fontSize:11, fontWeight:900, letterSpacing:3,
            textTransform:'uppercase', opacity:.85, marginBottom:4,
          }}>
            {t('cafes_reset.header')}
          </div>
          <div style={{ fontSize:18, fontWeight:900, color:'#fff', letterSpacing:.3 }}>
            {t('cafes_reset.title')}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'18px 22px 4px' }}>
          <p style={{ fontSize:13, color:C.text, lineHeight:1.6, margin:0, marginBottom:14 }}>
            {t('cafes_reset.intro')}
          </p>

          <div style={{
            background:C.card2, borderRadius:14, padding:'12px 14px',
            border:`1px solid ${C.border}`, marginBottom:14,
          }}>
            <div style={{ fontSize:10, fontWeight:800, color:C.muted, letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>
              {t('cafes_reset.what_changes')}
            </div>
            <ul style={{ fontSize:12, color:C.text, lineHeight:1.7, paddingLeft:18, margin:0 }}>
              <li>{t('cafes_reset.change_1')}</li>
              <li>{t('cafes_reset.change_2')}</li>
              <li>{t('cafes_reset.change_3')}</li>
            </ul>
          </div>

          <div style={{
            background:'rgba(212,160,23,.12)', borderRadius:12, padding:'10px 14px',
            border:'1px solid rgba(212,160,23,.4)', marginBottom:18,
            fontSize:11.5, color:C.text, lineHeight:1.5, textAlign:'center',
          }}>
            🎯 {t('cafes_reset.you_keep_rest')}
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
            ☕ {t('common.understood_short')}
          </button>
        </div>
      </div>
    </div>
  );
}

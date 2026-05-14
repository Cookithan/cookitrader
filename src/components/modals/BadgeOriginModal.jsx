import { GOLD, ESPRESSO } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   BadgeOriginModal — détails "comment on a débloqué ce badge"
   ────────────────────────────────────────────────────
   Ouverte au tap sur un badge dans ProfileOverlay (carrés "Mes badges").
   Source de l'info : utils/badgeOrigin.js → getBadgeOrigin(id).

   Props :
   - badge   : objet badge tel quel (REWARDS Badge OU SECRET_BADGES) —
               on lit `name`, `emoji|icon`, `desc|description`, et
               `color|bgGradient` (présents seulement sur secrets).
   - origin  : { source:'shop'|'event'|'secret', label, hint }
   - onClose : fermeture
   - C       : palette
═══════════════════════════════════════════════════════ */

export function BadgeOriginModal({ badge, origin, onClose, C }){
  const { t, localizedField } = useTranslation();
  const SOURCE_META = {
    shop:   { ribbonKey: 'badge_origin.ribbon_shop',   emoji: '🛍️' },
    event:  { ribbonKey: 'badge_origin.ribbon_event',  emoji: '🎯' },
    secret: { ribbonKey: 'badge_origin.ribbon_secret', emoji: '🔒' },
  };
  if(!badge || !origin) return null;
  const meta = SOURCE_META[origin.source] || SOURCE_META.shop;
  const icon = badge.icon || badge.emoji || '🏅';
  const desc = badge.description || badge.desc || '';
  /* Secrets ont leur propre dégradé ; sinon on prend ESPRESSO + accent or */
  const headerBg = badge.bgGradient
    || `linear-gradient(140deg, ${ESPRESSO} 0%, #2C1810 100%)`;
  const accent = badge.color || GOLD;

  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, background:'rgba(15,8,4,.78)',
        display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:97, backdropFilter:'blur(6px)', padding:16,
      }}
    >
      <div
        className="bi"
        onClick={e => e.stopPropagation()}
        style={{
          background:C.card, borderRadius:22, maxWidth:340, width:'100%',
          boxShadow:'0 24px 60px rgba(0,0,0,.45)',
          border:`1.5px solid ${C.border}`,
          overflow:'hidden',
        }}
      >
        {/* Bandeau ruban (couleur selon source) */}
        <div style={{
          background:headerBg, color:'#fff',
          padding:'24px 22px 20px',
          textAlign:'center', position:'relative',
        }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:6,
            fontSize:9, fontWeight:900, letterSpacing:2.5,
            background:'rgba(0,0,0,.28)', color:'#F0C050',
            padding:'4px 10px', borderRadius:10,
            border:`1px solid ${accent}66`,
            marginBottom:14,
          }}>
            <span>{meta.emoji}</span>
            <span>{t(meta.ribbonKey)}</span>
          </div>
          <div style={{ fontSize:54, lineHeight:1, marginBottom:8 }}>{icon}</div>
          <div style={{ fontSize:17, fontWeight:900, lineHeight:1.25 }}>
            {localizedField(badge, 'name', 'REWARDS')}
          </div>
          {desc && (
            <div style={{ fontSize:11.5, opacity:.85, marginTop:6, fontStyle:'italic', lineHeight:1.4 }}>
              {localizedField(badge, badge.description ? 'description' : 'desc', 'REWARDS') || desc}
            </div>
          )}
        </div>

        {/* Bloc explicatif */}
        <div style={{ padding:'18px 22px 16px' }}>
          <div style={{
            fontSize:9, fontWeight:800, color:C.muted,
            textTransform:'uppercase', letterSpacing:2, marginBottom:6,
          }}>
            {t('badge_origin.how_unlocked')}
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4, lineHeight:1.35 }}>
            {origin.label}
          </div>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>
            {origin.hint}
          </div>
        </div>

        <div style={{ padding:'4px 22px 22px' }}>
          <button
            onClick={onClose}
            style={{
              width:'100%', padding:'13px 0', borderRadius:14,
              background:GOLD, color:'#fff',
              border:'none', fontSize:13, fontWeight:800,
              boxShadow:'0 6px 18px rgba(212,160,23,.35)',
              cursor:'pointer', letterSpacing:.3,
            }}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

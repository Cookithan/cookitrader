/* ════════════════════════════════════════════════════
   SecretBadgeUnlockModal — modale festive (BRIEF_BADGES_SECRETS)
   ────────────────────────────────────────────────────
   S'ouvre quand un badge secret est débloqué (Noctambule, Investisseur,
   Amical). Animation badgePop (rotation + scale rebondi) sur la carte
   et badgeIcon (pulsation infinite) sur l'emoji XL.

   Le fond est volontairement très sombre (rgba .8) pour faire ressortir
   le gradient du badge. Pas de rouge ni de vert — la palette suit la
   couleur du badge (moka / or / caramel).

   Props :
     badge   — objet SECRET_BADGES.* ({ name, icon, description,
               color, bgGradient }) | null si fermée
     bonus   — number, cookies versés (affiché en bandeau)
     onClose — () : ferme la modale
═══════════════════════════════════════════════════════ */

import { useTranslation } from "../../i18n/index.js";

export function SecretBadgeUnlockModal({ badge, bonus = 100, onClose }){
  const { t } = useTranslation();
  if(!badge) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position:'fixed', inset:0, zIndex:250,
        background:'rgba(15,8,4,.85)',
        backdropFilter:'blur(6px)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:20,
        animation:'inboxOverlayIn .25s ease-out both',
      }}
    >
      <div
        className="badge-pop"
        style={{
          background: badge.bgGradient,
          borderRadius:24,
          padding:'30px 24px 24px',
          maxWidth:340, width:'100%',
          textAlign:'center',
          color:'#fff',
          boxShadow:`0 20px 60px rgba(0,0,0,.6), 0 0 32px ${badge.color}55`,
          border:`3px solid ${badge.color}`,
        }}
      >
        <div style={{
          fontSize:11,
          color:'rgba(255,255,255,.75)',
          textTransform:'uppercase',
          letterSpacing:4, fontWeight:800,
          marginBottom:6,
        }}>
          ✨ {t('secret_badge.discovered')}
        </div>

        <div
          className="badge-icon-bounce"
          style={{
            fontSize:80, lineHeight:1, margin:'10px 0 4px',
            filter:'drop-shadow(0 4px 12px rgba(0,0,0,.4))',
          }}
        >
          {badge.icon}
        </div>

        <div style={{ fontSize:22, fontWeight:900, letterSpacing:.3 }}>
          {badge.name}
        </div>

        <div style={{
          fontSize:13,
          color:'rgba(255,255,255,.85)',
          marginTop:8, lineHeight:1.45,
          fontStyle:'italic',
        }}>
          {badge.description}
        </div>

        <div style={{
          background:'rgba(255,255,255,.18)',
          borderRadius:12, padding:'10px 14px',
          marginTop:20,
          fontSize:13, fontWeight:800,
        }}>
          🎁 {t('secret_badge.bonus_n', { n: bonus })}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop:18,
            padding:'13px 32px',
            background:'rgba(255,255,255,.2)',
            border:'1.5px solid rgba(255,255,255,.4)',
            color:'#fff', borderRadius:14,
            fontWeight:800, fontSize:14, letterSpacing:.3,
            cursor:'pointer',
          }}
        >
          {t('secret_badge.awesome')}
        </button>
      </div>
    </div>
  );
}

import { Sparkles, PartyPopper } from 'lucide-react';
import { useTranslation } from '../../i18n/index.js';

/* ════════════════════════════════════════════════════
   CommunityMilestoneModal — popup festif palier communautaire
   ────────────────────────────────────────────────────
   Affichée quand la communauté atteint un palier de cookies cumulés
   (ex: 500 000). Récompense déjà créditée AVANT que la modale
   s'affiche (le useEffect dans App.jsx fait addCoins + setCafes puis
   set le state pour montrer la modale).

   Props :
     - threshold     : nombre (ex: 500000) — affiché dans le titre
     - cookieReward  : nombre de 🍪 offerts
     - cafeReward    : nombre de ☕ offerts
     - onClose       : ferme la modale
     - C             : palette du thème actif

   Palette café-only (CLAUDE.md) : or + cream + espresso. Pas de
   vert/rouge même pour un événement festif.
═══════════════════════════════════════════════════════ */

export function CommunityMilestoneModal({ threshold, cookieReward, cafeReward, onClose, C }) {
  const { t, lang } = useTranslation();
  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,8,4,.82)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1300, padding: 20,
        animation: 'inboxOverlayIn .3s ease-out both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bi"
        style={{
          width: '100%', maxWidth: 380,
          background: 'linear-gradient(160deg, #3D2010 0%, #5C3317 50%, #7D4E1F 100%)',
          borderRadius: 26,
          padding: '32px 24px 24px',
          boxShadow: '0 24px 60px rgba(0,0,0,.55), 0 0 80px rgba(212,160,23,.25)',
          border: '2.5px solid #D4A017',
          textAlign: 'center',
          color: '#F0E6D3',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Confettis décoratifs en fond — sparkles répartis */}
        {[
          { top: 8, left: 12, size: 14, delay: 0 },
          { top: 18, right: 16, size: 12, delay: 0.3 },
          { top: 60, left: 20, size: 10, delay: 0.6 },
          { bottom: 28, right: 24, size: 12, delay: 0.9 },
          { bottom: 48, left: 18, size: 14, delay: 1.2 },
        ].map((s, i) => (
          <div
            key={i}
            aria-hidden
            style={{
              position: 'absolute',
              top: s.top, left: s.left, right: s.right, bottom: s.bottom,
              color: 'rgba(212,160,23,.55)',
              animation: `livePulse 2.4s ease-in-out ${s.delay}s infinite`,
              pointerEvents: 'none',
            }}
          >
            <Sparkles size={s.size} />
          </div>
        ))}

        {/* Icône centrale "popper" sur halo doré */}
        <div style={{
          width: 84, height: 84, borderRadius: 24,
          background: 'linear-gradient(135deg, #FFE066, #D4A017)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 10px 28px rgba(212,160,23,.6), 0 0 40px rgba(255,224,102,.4)',
          animation: 'pop .6s ease-out',
          position: 'relative',
          zIndex: 1,
        }}>
          <PartyPopper size={42} color="#fff" />
        </div>

        {/* Label */}
        <div style={{
          fontSize: 10, fontWeight: 900, color: 'rgba(255,224,102,.85)',
          textTransform: 'uppercase', letterSpacing: 3, marginBottom: 6,
          position: 'relative', zIndex: 1,
        }}>
          {t('modal.community_milestone')}
        </div>

        {/* Titre principal */}
        <div style={{
          fontSize: 22, fontWeight: 900, color: '#FFE066',
          marginBottom: 10, lineHeight: 1.2,
          textShadow: '0 2px 12px rgba(212,160,23,.5)',
          position: 'relative', zIndex: 1,
        }}>
          {t('modal.bravo')}
        </div>

        <div style={{
          fontSize: 14, color: '#F0E6D3', lineHeight: 1.5,
          marginBottom: 18, padding: '0 4px',
          position: 'relative', zIndex: 1,
        }}>
          {t('modal.community_mined', { n: threshold.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US') })}
        </div>

        {/* Carte cadeau */}
        <div style={{
          background: 'rgba(0,0,0,.28)',
          border: '1.5px solid rgba(212,160,23,.5)',
          borderRadius: 16,
          padding: '14px 16px',
          marginBottom: 18,
          position: 'relative', zIndex: 1,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 800,
            color: 'rgba(255,224,102,.85)',
            textTransform: 'uppercase', letterSpacing: 2,
            marginBottom: 8,
          }}>
            🎁 {t('modal.gift_offered')}
          </div>
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 18,
            alignItems: 'center',
          }}>
            {cookieReward > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#FFE066' }}>
                  +{cookieReward}
                </div>
                <div style={{ fontSize: 16 }}>🍪</div>
              </div>
            )}
            {cookieReward > 0 && cafeReward > 0 && (
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', fontWeight: 700 }}>+</div>
            )}
            {cafeReward > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#FFE066' }}>
                  +{cafeReward}
                </div>
                <div style={{ fontSize: 16 }}>☕</div>
              </div>
            )}
          </div>
        </div>

        {/* Bouton merci */}
        <button
          onClick={onClose}
          className="glow-anim"
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #FFE066, #D4A017)',
            color: '#3D2010',
            fontSize: 14, fontWeight: 900, letterSpacing: 0.5,
            border: 'none',
            boxShadow: '0 6px 20px rgba(212,160,23,.5)',
            cursor: 'pointer',
            touchAction: 'manipulation',
            position: 'relative', zIndex: 1,
          }}
        >
          {t('modal.thanks_community')}
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/index.js';

/* ════════════════════════════════════════════════════
   BoxOpenAnimation — animation cinéma d'ouverture de boîte
   ────────────────────────────────────────────────────
   4 phases enchaînées via setTimeout :
     0. intro    : la boîte apparaît au centre (zoom + glow)        ~600 ms
     1. shake    : la boîte tremble de + en + fort                  ~1000 ms
     2. burst    : flash blanc + explosion de particules            ~500 ms
     3. reveal   : le cadeau s'affiche en gros (scale + glow)       — perma
                   bouton "Récolter" qui crédite + ferme

   Props :
     - boxName     : nom de la boîte (ex: 'Boîte Mystère')
     - boxEmoji    : emoji de la boîte (ex: '📦')
     - reward      : { cafes?: number, cookies?: number, ... }
     - onCollect   : callback appelé quand l'user clique "Récolter"
                     (crédite le reward dans App.jsx + ferme la modale)
═══════════════════════════════════════════════════════ */

const PHASE_INTRO_MS  = 600;
const PHASE_SHAKE_MS  = 1000;
const PHASE_BURST_MS  = 500;

export function BoxOpenAnimation({ boxName, boxEmoji, reward, onCollect }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState(0); /* 0:intro 1:shake 2:burst 3:reveal */

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), PHASE_INTRO_MS);
    const t2 = setTimeout(() => setPhase(2), PHASE_INTRO_MS + PHASE_SHAKE_MS);
    const t3 = setTimeout(() => setPhase(3), PHASE_INTRO_MS + PHASE_SHAKE_MS + PHASE_BURST_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  /* Particules dorées rayonnant depuis le centre au moment du burst (phase 2).
     Position aléatoire mais déterministe (basée sur index) pour éviter
     re-mount différent entre 2 renders. */
  const particles = phase >= 2 ? Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * 2 * Math.PI;
    const dist  = 100 + (i % 3) * 30;
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      delay: (i % 4) * 50,
    };
  }) : [];

  /* App.jsx crédite les DEUX monnaies indépendamment (`if(reward.cafes)`
     puis `if(reward.cookies)`). Le libellé était un si/sinon : une boîte
     donnant ☕ ET 🍪 n'aurait annoncé que le café. Aucune boîte n'est dans
     ce cas aujourd'hui (box_starter ne donne que 3 ☕), mais l'écart entre
     ce qui est versé et ce qui est annoncé n'a pas à attendre d'être
     visible pour être faux. */
  const rewardParts = [];
  if(reward.cafes)   rewardParts.push(`+${reward.cafes} ☕`);
  if(reward.cookies) rewardParts.push(`+${reward.cookies} 🍪`);
  const rewardLabel = rewardParts.length ? rewardParts.join('  ') : t('box.surprise_label');

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0,
        background: phase === 2
          ? 'rgba(15,8,4,.95)'  /* fond plus sombre pour faire ressortir le flash */
          : 'rgba(15,8,4,.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1400, padding: 20,
        animation: 'inboxOverlayIn .3s ease-out both',
        overflow: 'hidden',
      }}
    >
      {/* Flash blanc au moment du burst */}
      {phase === 2 && (
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            animation: `boxFlash ${PHASE_BURST_MS}ms ease-out both`,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      <div style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 24,
        zIndex: 2,
      }}>
        {/* Boîte centrale — visible phases 0-2 */}
        {phase < 3 && (
          <div
            style={{
              fontSize: 120,
              animation: phase === 0
                ? `boxIntro ${PHASE_INTRO_MS}ms cubic-bezier(.36,.07,.19,.97) both`
                : phase === 1
                  ? `boxShake ${PHASE_SHAKE_MS}ms ease-in-out`
                  : phase === 2
                    ? `boxBurst ${PHASE_BURST_MS}ms ease-out both`
                    : 'none',
              filter: phase === 1
                ? 'drop-shadow(0 0 20px rgba(212,160,23,.6))'
                : 'drop-shadow(0 8px 20px rgba(212,160,23,.4))',
              lineHeight: 1,
            }}
          >
            {boxEmoji}
          </div>
        )}

        {/* Particules dorées en burst */}
        {phase === 2 && particles.map((p, i) => (
          <div
            key={i}
            aria-hidden
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              fontSize: 18,
              color: '#FFE066',
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              animation: `boxParticle 700ms ease-out ${p.delay}ms both`,
              pointerEvents: 'none',
            }}
          >
            ✨
          </div>
        ))}

        {/* Reveal du cadeau (phase 3) */}
        {phase === 3 && (
          <>
            <div style={{
              fontSize: 10, fontWeight: 900, color: 'rgba(255,224,102,.85)',
              textTransform: 'uppercase', letterSpacing: 3, marginBottom: 4,
              animation: 'boxIntro 400ms ease-out',
            }}>
              {boxName}
            </div>

            <div style={{
              fontSize: 84,
              animation: 'boxRewardReveal 700ms cubic-bezier(.36,.07,.19,.97) both',
              filter: 'drop-shadow(0 0 30px #FFE066)',
              lineHeight: 1,
            }}>
              {reward.cafes ? '☕' : '🍪'}
            </div>

            <div style={{
              fontSize: 36, fontWeight: 900, color: '#FFE066',
              textShadow: '0 4px 20px rgba(212,160,23,.6)',
              animation: 'boxRewardReveal 700ms cubic-bezier(.36,.07,.19,.97) 100ms both',
            }}>
              {rewardLabel}
            </div>

            <button
              onClick={onCollect}
              className="glow-anim"
              style={{
                marginTop: 14,
                padding: '14px 32px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #FFE066, #D4A017)',
                color: '#3D2010',
                fontSize: 15, fontWeight: 900, letterSpacing: 0.5,
                border: 'none',
                boxShadow: '0 8px 24px rgba(212,160,23,.5)',
                cursor: 'pointer',
                touchAction: 'manipulation',
                animation: 'boxRewardReveal 700ms cubic-bezier(.36,.07,.19,.97) 250ms both',
              }}
            >
              {t('box.open_collect')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

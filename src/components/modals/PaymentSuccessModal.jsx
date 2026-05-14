import { useEffect, useState } from "react";
import { Coffee } from "lucide-react";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   PaymentSuccessModal — popup festif post-achat Stripe
   ────────────────────────────────────────────────────
   Apparaît quand le re-pull différé après ?cf_purchase=success détecte
   que server.cafes > local.cafes — on connaît alors le delta exact (les
   cafés effectivement crédités par le webhook Stripe).

   Visuel : carte or rayonnante, confettis 🍪✨, compteur animé qui monte
   de 0 à `cafesReceived` sur 1.5s. Bouton "Continuer".

   Props :
   - cafesReceived : nombre de cafés crédités (delta entre local et server)
   - onClose       : ferme la modale
   - C             : palette
═══════════════════════════════════════════════════════ */

export function PaymentSuccessModal({ cafesReceived, onClose, C }){
  const { t } = useTranslation();
  const [counter, setCounter] = useState(0);

  /* Compteur animé 0 → cafesReceived sur 1500ms (ease-out). */
  useEffect(() => {
    if(!cafesReceived) return;
    const startTs = performance.now();
    const duration = 1500;
    let raf;
    const tick = (now) => {
      const progress = Math.min(1, (now - startTs) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounter(Math.round(eased * cafesReceived));
      if(progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cafesReceived]);

  if(!cafesReceived) return null;

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
        onClick={(e)=>e.stopPropagation()}
        className="bi"
        style={{
          width:'100%', maxWidth:340,
          background:'linear-gradient(140deg,#F5DC8A 0%,#D4A017 50%,#A87510 100%)',
          borderRadius:24, padding:'30px 22px 22px',
          textAlign:'center', position:'relative', overflow:'hidden',
          boxShadow:'0 24px 64px rgba(0,0,0,.55), 0 0 32px rgba(212,160,23,.4)',
          border:'2px solid #FFE066',
        }}
      >
        {/* Confettis (réutilise les keyframes existantes) */}
        <div aria-hidden style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          {Array.from({ length:18 }).map((_,i)=>{
            const angle = (i / 18) * Math.PI * 2;
            const dist  = 110 + (i % 4) * 28;
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist;
            return (
              <span
                key={i}
                className="confetti-piece"
                style={{
                  top:'50%', left:'50%',
                  ['--tx']: `${tx}px`,
                  ['--ty']: `${ty}px`,
                  animationDelay: `${i * 0.04}s`,
                }}
              >{i % 3 === 0 ? '🍪' : i % 3 === 1 ? '✨' : '☕'}</span>
            );
          })}
        </div>

        <div style={{ position:'relative' }}>
          {/* Tasse animée */}
          <div className="float-anim" style={{ fontSize:64, lineHeight:1, marginBottom:8 }}>☕</div>

          {/* Bandeau succès */}
          <div style={{
            display:'inline-block',
            fontSize:10, fontWeight:900, color:'#3D2010',
            letterSpacing:3, textTransform:'uppercase',
            background:'rgba(255,255,255,.45)',
            padding:'4px 12px', borderRadius:10,
            marginBottom:10,
          }}>
            {t('payment.received_label')}
          </div>

          {/* Compteur animé */}
          <div style={{ fontSize:13, color:'#5D3A1F', marginBottom:4, fontWeight:700 }}>
            {t('payment.you_received')}
          </div>
          <div style={{
            fontSize:48, fontWeight:900, color:'#3D2010',
            lineHeight:1, letterSpacing:'-1px',
            display:'flex', alignItems:'center', justifyContent:'center', gap:10,
            marginBottom:6,
          }}>
            <span>+{counter}</span>
            <span style={{ fontSize:38 }}>☕</span>
          </div>
          <div style={{ fontSize:12, color:'#5D3A1F', fontStyle:'italic', marginBottom:22, opacity:.85 }}>
            {t('payment.thanks_support')}
          </div>

          {/* Bouton */}
          <button
            onClick={onClose}
            style={{
              width:'100%', padding:'14px 0', borderRadius:14,
              background:'#3D2010', color:'#F5DC8A',
              fontSize:14, fontWeight:900, letterSpacing:.5,
              border:'none',
              boxShadow:'0 6px 18px rgba(0,0,0,.3)',
              cursor:'pointer',
            }}
          >
            {t('common.continue')}
          </button>
        </div>
      </div>
    </div>
  );
}

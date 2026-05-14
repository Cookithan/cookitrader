import { useEffect, useState } from "react";
import { GOLD } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   WeeklyChampModal — récompense top 3 du classement hebdo
   ────────────────────────────────────────────────────
   Pop quand l'user a fini dans le top 3 du classement de la semaine
   précédente (clôturée le vendredi 18 h UTC). Distribue cafés ☕ +
   badge exclusif Champion S<XX>.

   Props :
   - rank      : 1 | 2 | 3
   - cafes     : nombre de cafés gagnés (5 / 3 / 1 par défaut)
   - weekNum   : numéro de la semaine (pour le titre du badge)
   - onClose   : ferme la modale
   - C         : palette
═══════════════════════════════════════════════════════ */

export function WeeklyChampModal({ rank, cafes, weekNum, onClose, C }){
  const { t } = useTranslation();
  const RANK_COLORS = {
    1: { from:'#FFE066', to:'#D4A017', border:'#FFE066', emoji:'🥇', label: t('weekly.champion') },
    2: { from:'#E8DFCD', to:'#B8A58A', border:'#D4C4A4', emoji:'🥈', label: t('weekly.vice_champion') },
    3: { from:'#E8B57A', to:'#A87858', border:'#C99607', emoji:'🥉', label: t('weekly.third_place') },
  };
  const [counter, setCounter] = useState(0);
  const palette = RANK_COLORS[rank] || RANK_COLORS[3];

  /* Compteur animé 0 → cafes (~1.2s ease-out). */
  useEffect(() => {
    if(!cafes) return;
    const startTs = performance.now();
    const duration = 1200;
    let raf;
    const tick = (now) => {
      const progress = Math.min(1, (now - startTs) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounter(Math.round(eased * cafes));
      if(progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cafes]);

  return (
    <div
      onClick={onClose}
      role="dialog"
      style={{
        position:'fixed', inset:0, zIndex:97,
        background:'rgba(15,8,4,.85)', backdropFilter:'blur(6px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:18,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bi"
        style={{
          width:'100%', maxWidth:380,
          background:`linear-gradient(140deg, ${palette.from} 0%, ${palette.to} 100%)`,
          borderRadius:24, padding:'28px 22px 22px',
          textAlign:'center', position:'relative', overflow:'hidden',
          boxShadow:`0 24px 64px rgba(0,0,0,.55), 0 0 36px ${palette.border}66`,
          border:`2px solid ${palette.border}`,
        }}
      >
        {/* Confettis 360° */}
        <div aria-hidden style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          {Array.from({ length:24 }).map((_,i)=>{
            const angle = (i / 24) * Math.PI * 2;
            const dist  = 130 + (i % 4) * 30;
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
                  animationDelay: `${i * 0.03}s`,
                }}
              >{i % 4 === 0 ? '☕' : i % 4 === 1 ? '✨' : i % 4 === 2 ? '🏆' : '🍪'}</span>
            );
          })}
        </div>

        <div style={{ position:'relative' }}>
          <div className="float-anim" style={{ fontSize:64, lineHeight:1, marginBottom:6 }}>{palette.emoji}</div>
          <div style={{
            display:'inline-block',
            fontSize:10, fontWeight:900, color:'#3D2010',
            letterSpacing:3, textTransform:'uppercase',
            background:'rgba(255,255,255,.5)',
            padding:'4px 12px', borderRadius:10,
            marginBottom:10,
          }}>
            {t('weekly.week_top', { n: weekNum, rank })}
          </div>

          <div style={{ fontSize:13, color:'#5D3A1F', marginBottom:4, fontWeight:700 }}>
            {t('weekly.of_the_week', { label: palette.label })}
          </div>
          <div style={{ fontSize:42, fontWeight:900, color:'#3D2010', lineHeight:1, marginBottom:6 }}>
            +{counter} ☕
          </div>
          <div style={{ fontSize:11.5, color:'#5D3A1F', fontStyle:'italic', marginBottom:12, opacity:.85 }}>
            + {t('weekly.champion_badge', { n: weekNum })}
          </div>

          <div style={{
            background:'rgba(255,255,255,.4)',
            border:'1px dashed rgba(61,32,16,.35)',
            borderRadius:12,
            padding:'10px 12px',
            fontSize:11, color:'#3D2010',
            marginBottom:18,
            lineHeight:1.5,
          }}>
            {t('weekly.counter_reset')}
          </div>

          <button
            onClick={onClose}
            style={{
              width:'100%', padding:'14px 0', borderRadius:14,
              background:'#3D2010', color:'#FFE066',
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

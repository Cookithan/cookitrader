import { ShoppingBag } from "lucide-react";
import { LEVEL_NAMES, REWARDS } from "../../data/constants.js";
import { GOLD } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   LevelUpModal — popup plein écran à chaque montée de niveau
   Bonus réellement versés par addCoins (App.jsx ~1532) :
   - Niveaux 1-5 : bonus cookies = 10 × niveau
   - Paliers 6/10/15/20/25 : +1 ☕ (milestones, plus rares)
   - Autres niveaux ≥ 6 : bonus cookies = 50 + 10 × niveau
   - Compte les nouveaux items boutique débloqués (REWARDS où levelRequired === level)
   - z-index 100 — passe devant l'AchievementModal (z-index 90) si les deux se déclenchent
════════════════════════════════════════════════════ */

export function LevelUpModal({ level, onCollect }) {
  const { t, localizedLevelName } = useTranslation();
  const levelLabel = localizedLevelName(level) || LEVEL_NAMES[level];
  const isEndGame = level >= 6;
  const bonus = 10 * level;
  const newItems = REWARDS.filter(r => r.levelRequired === level).length;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.78)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(6px)' }}>
      <div className="bi" style={{ background:'linear-gradient(140deg,#4A2C17,#7D4E1F)', borderRadius:32, padding:'36px 28px', textAlign:'center', maxWidth:300, width:'90%', boxShadow:'0 24px 64px rgba(0,0,0,.5),0 0 60px rgba(212,160,23,.3)', border:'2px solid rgba(212,160,23,.4)', position:'relative', overflow:'hidden' }}>
        {/* Sparkles */}
        {[
          { top:'12%',  left:'10%', delay:0    },
          { top:'18%',  left:'85%', delay:.3   },
          { top:'68%',  left:'8%',  delay:.6   },
          { top:'78%',  left:'88%', delay:.9   },
          { top:'42%',  left:'92%', delay:1.2  },
          { top:'52%',  left:'5%',  delay:.45  },
        ].map((p,i)=>(
          <span key={i} className="sparkle-anim" style={{ position:'absolute', top:p.top, left:p.left, fontSize:18, animationDelay:`${p.delay}s`, pointerEvents:'none' }}>✨</span>
        ))}
        <div className="wiggle-anim" style={{ fontSize:54, marginBottom:10, display:'inline-block' }}>🎉</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.65)', textTransform:'uppercase', letterSpacing:3, marginBottom:6 }}>{t('modal.level_up_banner')}</div>
        <div style={{ fontSize:32, fontWeight:900, color:'#fff', marginBottom:3 }}>{t('modal.level_n', { n: level })}</div>
        <div style={{ fontSize:20, fontWeight:700, color:'#D4A017', marginBottom:20 }}>{levelLabel}</div>
        <div style={{ background:'rgba(212,160,23,.15)', borderRadius:16, padding:'12px 20px', marginBottom:14, border:'1px solid rgba(212,160,23,.3)' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', marginBottom:4 }}>{t('modal.bonus_offered')}</div>
          <div className="coin-pop" style={{ fontSize:26, fontWeight:800, color:'#D4A017' }}>
            {isEndGame ? '+1 ☕' : `+${bonus} 🍪`}
          </div>
        </div>
        {newItems > 0 && (
          <div className="su" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:18, padding:'10px 14px', borderRadius:14, background:'rgba(255,255,255,.08)', border:'1px dashed rgba(212,160,23,.4)' }}>
            <ShoppingBag size={15} color="#D4A017" />
            <span style={{ fontSize:12, color:'#fff', fontWeight:700 }}>
              {t(newItems > 1 ? 'modal.new_items_plural' : 'modal.new_items_singular', { n: newItems })}
            </span>
          </div>
        )}
        <button onClick={onCollect} className="glow-anim" style={{ width:'100%', padding:14, borderRadius:16, fontSize:15, fontWeight:800, background:GOLD, color:'#fff', cursor:'pointer', letterSpacing:.3 }}>
          {isEndGame ? t('modal.collect_coffee') : t('modal.collect_cookies')}
        </button>
      </div>
    </div>
  );
}

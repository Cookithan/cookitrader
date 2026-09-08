import { ShoppingBag } from "lucide-react";
import { LEVEL_NAMES, REWARDS } from "../../data/constants.js";
import { GOLD, levelTier } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   LevelUpModal — popup plein écran à chaque montée de niveau
   ────────────────────────────────────────────────────
   z-index 100 : passe devant l'AchievementModal (90) si les deux
   se déclenchent en même temps.

   ⚠️ LE BONUS AFFICHÉ DOIT REFLÉTER addCoins() (App.jsx, ~1798).
   Règle réelle :
     · paliers 6 / 10 / 15 / 20 / 25 → +1 ☕
     · autres niveaux ≥ 6            → 50 + 10 × niveau cookies
     · niveaux 1-5                   → 10 × niveau cookies

   BUG CORRIGÉ EN v1.30 : la modale testait `level >= 6` et annonçait
   « +1 ☕ » à TOUS les niveaux à partir de 6, bouton « Récolter le café »
   compris — alors qu'aux niveaux 7, 8, 9, 11… le joueur touche des
   cookies. Elle promettait une monnaie qu'elle ne donnait pas.

   v1.30 — allégée : la médaille de palier (teinte de la tranche de 5
   niveaux, cf. levelTier) remplace le gros « NIVEAU 13 » en texte et
   raccroche la modale aux bannières de LevelsModal ; le bonus et les
   nouveautés de boutique tiennent dans un seul encart au lieu de deux.
════════════════════════════════════════════════════ */

/* Paliers qui versent du café — miroir d'App.jsx. */
const CAFE_MILESTONES = [6, 10, 15, 20, 25];

export function LevelUpModal({ level, onCollect }) {
  const { t, localizedLevelName } = useTranslation();
  const levelLabel = localizedLevelName(level) || LEVEL_NAMES[level];
  const tier       = levelTier(level);

  const isCafeMilestone = CAFE_MILESTONES.includes(level);
  const coinBonus       = level >= 6 ? 50 + 10 * level : 10 * level;

  /* Nouveautés de boutique : mêmes exclusions que la BoutiqueTab —
     le premium, les éditions limitées et l'ex-boutique $CKM ne font pas
     partie de la progression par palier. Sans ce filtre, la modale
     annonçait des items que le joueur ne trouvait pas au rayon. */
  const newItems = REWARDS.filter(r =>
    r.levelRequired === level
    && r.currency !== 'cafe'
    && !r.limited && !r.inPremium && !r.inActionsShop
  ).length;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.78)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(6px)' }}>
      <div className="bi" style={{ background:'linear-gradient(140deg,#4A2C17,#7D4E1F)', borderRadius:32, padding:'32px 26px 26px', textAlign:'center', maxWidth:300, width:'90%', boxShadow:'0 24px 64px rgba(0,0,0,.5),0 0 60px rgba(212,160,23,.3)', border:'2px solid rgba(212,160,23,.4)', position:'relative', overflow:'hidden' }}>

        {/* 4 étincelles au lieu de 6 : la fête sans le sapin de Noël. */}
        {[
          { top:'13%', left:'9%',  delay:0   },
          { top:'17%', left:'86%', delay:.35 },
          { top:'74%', left:'7%',  delay:.7  },
          { top:'79%', left:'88%', delay:1.05 },
        ].map((p,i)=>(
          <span key={i} className="sparkle-anim" style={{ position:'absolute', top:p.top, left:p.left, fontSize:18, animationDelay:`${p.delay}s`, pointerEvents:'none' }}>✨</span>
        ))}

        <div style={{ fontSize:10, color:'rgba(255,255,255,.65)', textTransform:'uppercase', letterSpacing:3, marginBottom:14 }}>
          {t('modal.level_up_banner')}
        </div>

        {/* Médaille du palier — remplace le « NIVEAU 13 » en 32 px et
            relie la modale aux bannières de la liste des niveaux. */}
        <div className="wiggle-anim" style={{
          width:76, height:76, borderRadius:'50%', margin:'0 auto 14px',
          background:`linear-gradient(140deg, ${tier.base}, ${tier.edge})`,
          border:'3px solid rgba(255,255,255,.45)',
          boxShadow:'0 6px 20px rgba(0,0,0,.35), inset 0 2px 0 rgba(255,255,255,.5)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:32, fontWeight:900, color:'#fff',
          textShadow:'0 2px 5px rgba(0,0,0,.4)',
        }}>{level}</div>

        <div style={{ fontSize:21, fontWeight:800, color:'#D4A017', marginBottom:20, lineHeight:1.2 }}>
          {levelLabel}
        </div>

        {/* Un seul encart : le bonus, et la boutique en sous-ligne quand
            il y a quelque chose de neuf. C'étaient deux blocs empilés. */}
        <div style={{ background:'rgba(212,160,23,.15)', borderRadius:16, padding:'13px 18px', marginBottom:18, border:'1px solid rgba(212,160,23,.3)' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', marginBottom:4 }}>{t('modal.bonus_offered')}</div>
          <div className="coin-pop" style={{ fontSize:26, fontWeight:800, color:'#D4A017' }}>
            {isCafeMilestone ? '+1 ☕' : `+${coinBonus} 🍪`}
          </div>
          {newItems > 0 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:10, paddingTop:9, borderTop:'1px dashed rgba(212,160,23,.35)' }}>
              <ShoppingBag size={13} color="#D4A017" />
              <span style={{ fontSize:11.5, color:'rgba(255,255,255,.9)', fontWeight:700 }}>
                {t(newItems > 1 ? 'modal.new_items_plural' : 'modal.new_items_singular', { n: newItems })}
              </span>
            </div>
          )}
        </div>

        <button onClick={onCollect} className="glow-anim tap-pop" style={{ width:'100%', padding:14, borderRadius:16, fontSize:15, fontWeight:800, background:GOLD, color:'#fff', cursor:'pointer', letterSpacing:.3 }}>
          {isCafeMilestone ? t('modal.collect_coffee') : t('modal.collect_cookies')}
        </button>
      </div>
    </div>
  );
}

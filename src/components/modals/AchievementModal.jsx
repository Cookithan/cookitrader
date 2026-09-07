import { GOLD, ESPRESSO } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   AchievementModal — popup succès débloqué
   ────────────────────────────────────────────────────
   z-index 90 (sous LevelUpModal, à 100). Le bonus est crédité par
   App.jsx (~3694), pas ici : la modale ne fait que l'annoncer.

   ⚠️ ELLE DOIT ANNONCER TOUT CE QUI EST VERSÉ.
   BUG CORRIGÉ EN v1.30 : elle n'affichait que `bonus` en 🍪 et passait
   `cafesBonus` sous silence, alors qu'App.jsx le crédite bel et bien
   (6 succès en donnent : En Feu +1, Gros Lot +1, Légende +1, Éternel +2,
   Cookie Originel +3, Légende Vivante +12). Le cas le plus criant était
   l'apex « Légende Vivante » : le plus gros versement de café du jeu,
   célébré sans qu'un seul ☕ soit mentionné.

   v1.30 — l'emoji du succès passe dans un MÉDAILLON rond, écho de la
   médaille de palier de LevelUpModal : les deux popups de célébration
   se ressemblent enfin.
═══════════════════════════════════════════════════════ */

export function AchievementModal({ achievement, onCollect }) {
  const { t, localizedField } = useTranslation();
  const cafes = achievement.cafesBonus || 0;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.78)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:90, backdropFilter:'blur(6px)' }}>
      <div className="bi" style={{ background:ESPRESSO, borderRadius:28, padding:'30px 24px 24px', textAlign:'center', maxWidth:300, width:'90%', boxShadow:'0 24px 60px rgba(0,0,0,.5),0 0 50px rgba(212,160,23,.25)', border:'2px solid rgba(212,160,23,.35)' }}>

        <div style={{ fontSize:10, color:'#D4A017', textTransform:'uppercase', letterSpacing:3, marginBottom:14, fontWeight:800 }}>
          {t('modal.achievement_unlocked')}
        </div>

        {/* Médaillon — même forme que la médaille de palier de
            LevelUpModal, pour que les deux célébrations se répondent. */}
        <div className="wiggle-anim" style={{
          width:82, height:82, borderRadius:'50%', margin:'0 auto 14px',
          background:'linear-gradient(140deg, rgba(255,232,154,.28), rgba(212,160,23,.18))',
          border:'3px solid rgba(212,160,23,.55)',
          boxShadow:'0 6px 20px rgba(0,0,0,.32), inset 0 2px 0 rgba(255,255,255,.25)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:42, lineHeight:1,
        }}>
          {achievement.emoji}
        </div>

        <div style={{ fontSize:21, fontWeight:900, color:'#fff', marginBottom:6, lineHeight:1.2 }}>
          {localizedField(achievement, 'name', 'ACHIEVEMENTS')}
        </div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', lineHeight:1.5, marginBottom:18, padding:'0 6px' }}>
          {localizedField(achievement, 'desc', 'ACHIEVEMENTS')}
        </div>

        <div style={{ background:'rgba(212,160,23,.15)', borderRadius:14, padding:'11px 18px', marginBottom:18, border:'1px solid rgba(212,160,23,.3)' }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', marginBottom:3 }}>{t('modal.bonus_offered')}</div>
          {/* Les deux monnaies côte à côte quand le succès en donne deux.
              Le ☕ est la récompense rare du jeu : le taire était le pire
              endroit où être discret. */}
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
            <span style={{ fontSize:22, fontWeight:800, color:'#D4A017' }}>+{achievement.bonus} 🍪</span>
            {cafes > 0 && (
              <span className="coin-pop" style={{ fontSize:22, fontWeight:800, color:'#F0C050' }}>+{cafes} ☕</span>
            )}
          </div>
        </div>

        <button onClick={onCollect} className="glow-anim tap-pop" style={{ width:'100%', padding:13, borderRadius:16, fontSize:15, fontWeight:800, background:GOLD, color:'#fff', cursor:'pointer', letterSpacing:.3 }}>
          {t('modal.claim')}
        </button>
      </div>
    </div>
  );
}

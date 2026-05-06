import { GOLD, ESPRESSO } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   AchievementModal — popup succès débloqué
   - z-index 90 (sous LevelUpModal qui est à 100)
   - Le bonus est appliqué dans onCollect (pas ici)
═══════════════════════════════════════════════════════ */

export function AchievementModal({ achievement, onCollect }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.78)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:90, backdropFilter:'blur(6px)' }}>
      <div className="bi" style={{ background:ESPRESSO, borderRadius:28, padding:'30px 24px', textAlign:'center', maxWidth:300, width:'90%', boxShadow:'0 24px 60px rgba(0,0,0,.5),0 0 50px rgba(212,160,23,.25)', border:'2px solid rgba(212,160,23,.35)' }}>
        <div className="wiggle-anim" style={{ fontSize:60, marginBottom:8, display:'inline-block' }}>{achievement.emoji}</div>
        <div style={{ fontSize:10, color:'#D4A017', textTransform:'uppercase', letterSpacing:3, marginBottom:6, fontWeight:800 }}>🏆 Succès débloqué !</div>
        <div style={{ fontSize:22, fontWeight:900, color:'#fff', marginBottom:6 }}>{achievement.name}</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', lineHeight:1.5, marginBottom:18, padding:'0 6px' }}>{achievement.desc}</div>
        <div style={{ background:'rgba(212,160,23,.15)', borderRadius:14, padding:'10px 18px', marginBottom:20, border:'1px solid rgba(212,160,23,.3)' }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', marginBottom:2 }}>Bonus offert</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#D4A017' }}>+{achievement.bonus} 🍪</div>
        </div>
        <button onClick={onCollect} className="glow-anim" style={{ width:'100%', padding:13, borderRadius:16, fontSize:15, fontWeight:800, background:GOLD, color:'#fff', cursor:'pointer', letterSpacing:.3 }}>
          Récupérer !
        </button>
      </div>
    </div>
  );
}

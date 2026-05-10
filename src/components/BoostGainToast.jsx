import { GOLD } from "../data/themes.js";

/* ════════════════════════════════════════════════════
   BoostGainToast — popup festif "gain boosté"
   ────────────────────────────────────────────────────
   Pop éphémère qui s'affiche quand un mini-jeu donne un gain
   amplifié par boost ×2 (1 h) et/ou next_game_doubler. Ne pop
   PAS pour le multiplicateur prestige (always-on, ce serait
   du spam à chaque addCoins).

   Pilotage côté App.jsx :
   - addCoins calcule le delta apporté UNIQUEMENT par boost+doubler
     (hors prestige) et appelle pushBoostGain(bonus, sources).
   - pushBoostGain merge si un pop est déjà visible (cumul du bonus,
     reset du timer 1.8 s) — évite que des gains rapprochés se
     remplacent.

   Props :
   - bonus   : nombre de cookies en plus apportés par les boosters
   - boost   : true si boost ×2 actif a contribué
   - doubler : true si doubler one-shot a contribué
═══════════════════════════════════════════════════════ */
export function BoostGainToast({ bonus, boost, doubler }){
  if(bonus <= 0) return null;
  const icon = boost && doubler ? '⚡🎯'
             : boost            ? '⚡'
             : doubler          ? '🎯'
             : '✨';
  const label = boost && doubler ? 'Boost ×2 + Doubler'
              : boost            ? 'Boost ×2 actif'
              : doubler          ? 'Gain doublé'
              : 'Bonus';
  return (
    <div
      className="boost-pop"
      style={{
        position:'fixed', bottom:120, left:'50%',
        transform:'translateX(-50%)',
        zIndex:140, pointerEvents:'none',
        background:'linear-gradient(135deg,#3D2010,#5C3317)',
        border:`1.5px solid ${GOLD}`,
        borderRadius:18,
        padding:'10px 18px',
        color:'#FFE89A',
        fontSize:14,
        fontWeight:900,
        letterSpacing:.3,
        boxShadow:'0 8px 28px rgba(74,44,23,.55), 0 0 24px rgba(212,160,23,.35)',
        display:'flex', alignItems:'center', gap:12,
        whiteSpace:'nowrap',
      }}
    >
      <div style={{ fontSize:22, lineHeight:1 }}>{icon}</div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', lineHeight:1.15 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,232,154,.7)', letterSpacing:.6, textTransform:'uppercase' }}>
          {label}
        </div>
        <div style={{ fontSize:16, fontWeight:900, color:'#F0C050' }}>
          +{bonus} 🍪 bonus
        </div>
      </div>
    </div>
  );
}

import { ChevronLeft, Check, Lock } from "lucide-react";
import { LEVEL_NAMES, xpRequired } from "../../data/constants.js";
import { GOLD, ESPRESSO } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   LevelsModal — popup "Voir les niveaux"
   - Ouverte au clic sur la carte niveau (Accueil) ou depuis le profil
   - Révèle les 16 paliers : passés en gold, courant pulsé avec barre XP,
     futurs verrouillés "? ? ?". Niv 16 = Ascendant Caféiné, palier
     endgame qui propose le prestige une fois 20000 XP atteints.
   - Lock click sur l'overlay pour fermer (sauf clic à l'intérieur)
════════════════════════════════════════════════════ */

export function LevelsModal({ currentLevel, xp, xpReq, onClose, C }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.78)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:80, backdropFilter:'blur(6px)', padding:18 }}>
      <div onClick={e=>e.stopPropagation()} className="bi" style={{ background:C.card, borderRadius:24, padding:'22px 18px 18px', width:'100%', maxWidth:380, maxHeight:'85vh', overflowY:'auto', border:`1px solid ${C.border}`, boxShadow:'0 24px 64px rgba(0,0,0,.45)' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>PROGRESSION</div>
            <div style={{ fontSize:18, fontWeight:800, color:C.text, marginTop:2 }}>Les 25 niveaux</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ width:32, height:32, borderRadius:11, background:C.card2, color:C.text, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ChevronLeft size={18} style={{ transform:'rotate(180deg)' }} />
          </button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25].map(n => {
            const passed   = n < currentLevel;
            const isCurrent = n === currentLevel;
            const locked   = n > currentLevel;
            /* XP exacte à gagner DANS le niveau n-1 pour passer au n.
               Pour n=1, on affiche 0 (palier de départ). */
            const req      = n === 1 ? 0 : xpRequired(n - 1);

            return (
              <div key={n} className={isCurrent ? 'pulse-ring' : ''} style={{
                display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:16,
                background: passed ? 'rgba(212,160,23,.08)' : isCurrent ? ESPRESSO : C.card2,
                border: `2px solid ${isCurrent ? '#D4A017' : passed ? 'rgba(212,160,23,.3)' : C.border}`,
                opacity: locked ? .65 : 1,
                transition:'all .25s'
              }}>
                <div style={{
                  width:42, height:42, borderRadius:13, flexShrink:0,
                  background: passed ? GOLD : isCurrent ? 'rgba(212,160,23,.25)' : C.card,
                  border: passed ? 'none' : `2px solid ${isCurrent ? '#D4A017' : C.border}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:800, fontSize:16,
                  color: passed ? '#fff' : isCurrent ? '#D4A017' : C.muted,
                }}>
                  {locked ? <Lock size={16} /> : n}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', color: isCurrent ? 'rgba(255,255,255,.6)' : C.muted, marginBottom:2 }}>
                    Niveau {n}
                  </div>
                  <div style={{ fontSize:15, fontWeight:800, color: isCurrent ? '#fff' : passed ? C.text : locked ? C.muted : C.text, letterSpacing: locked ? 4 : 0 }}>
                    {locked ? '? ? ?' : LEVEL_NAMES[n]}
                  </div>
                  {isCurrent && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,.6)', marginBottom:3 }}>
                        <span>XP</span><span>{xp}/{xpReq}</span>
                      </div>
                      <div style={{ height:5, borderRadius:3, background:'rgba(255,255,255,.18)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:3, width:`${Math.min((xp/xpReq)*100,100)}%`, background:'#D4A017', transition:'width .6s' }} />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ flexShrink:0, textAlign:'right' }}>
                  {passed && <span style={{ fontSize:11, fontWeight:700, color:'#D4A017', display:'flex', alignItems:'center', gap:3 }}><Check size={11} color="#D4A017" /> Atteint</span>}
                  {isCurrent && <span style={{ fontSize:11, fontWeight:700, color:'#D4A017', background:'rgba(212,160,23,.2)', padding:'3px 8px', borderRadius:8 }}>En cours</span>}
                  {locked && <span style={{ fontSize:10, color:C.muted, fontWeight:600 }}>{req} XP</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop:14, padding:'10px 12px', borderRadius:12, background:C.card2, fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center' }}>
          Atteins chaque niveau pour révéler son nom et débloquer un bonus de cookies.
        </div>
      </div>
    </div>
  );
}

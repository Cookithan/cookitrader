import { GOLD } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   EventRewardModal — récompense d'événement réussi (PHASE 6E)
   ────────────────────────────────────────────────────
   S'ouvre quand le challenge d'un event a été validé via
   checkEventChallenge dans App.jsx.

   Affiche : confettis dorés, titre "🏆 ÉVÉNEMENT RÉUSSI !",
   nom du thème débloqué, bouton "Voir mon thème" qui ferme la modale
   (et idéalement renvoie sur les paramètres pour appliquer le thème).

   Props :
   - reward  : { type:'theme', id, name }
   - onClose : ferme la modale
   - onView  : optionnel, appelé en plus de onClose au clic sur "Voir"
   - C       : palette
═══════════════════════════════════════════════════════ */

export function EventRewardModal({ reward, onClose, onView, C }){
  if(!reward) return null;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:96, backdropFilter:'blur(6px)', padding:16 }}>
      <div className="bi" style={{
        background:'linear-gradient(140deg,#F5DC8A 0%,#D4A017 100%)',
        borderRadius:24, padding:'28px 22px',
        maxWidth:340, width:'100%',
        boxShadow:'0 24px 60px rgba(0,0,0,.55), 0 0 0 1.5px rgba(140,90,40,.4)',
        textAlign:'center', position:'relative', overflow:'hidden',
      }}>
        {/* Confettis */}
        <div aria-hidden style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          {Array.from({ length:14 }).map((_,i)=>{
            const angle = (i / 14) * Math.PI * 2;
            const dist  = 100 + (i % 3) * 30;
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
              >{i % 2 === 0 ? '🍪' : '✨'}</span>
            );
          })}
        </div>

        <div style={{ position:'relative' }}>
          <div style={{ fontSize:50, marginBottom:6 }}>🏆</div>
          <div style={{
            fontSize:11, fontWeight:900, color:'#5D3A1F',
            letterSpacing:3, textTransform:'uppercase', marginBottom:10,
          }}>
            Événement réussi !
          </div>
          <div style={{ fontSize:13, color:'#5D3A1F', marginBottom:6, fontWeight:600 }}>
            Tu as débloqué :
          </div>
          <div style={{ fontSize:20, fontWeight:900, color:'#3D2010', marginBottom:8, lineHeight:1.25 }}>
            {reward.name}
          </div>
          <div style={{
            display:'inline-block', padding:'4px 10px', borderRadius:10,
            background:'rgba(60,30,10,.18)', color:'#3D2010',
            fontSize:10, fontWeight:800, letterSpacing:1.5, textTransform:'uppercase',
            marginBottom:20,
          }}>
            Édition limitée
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button
              onClick={onClose}
              style={{
                flex:1, padding:'13px 0', borderRadius:14,
                background:'rgba(60,30,10,.18)', color:'#3D2010',
                fontSize:13, fontWeight:700,
                border:'1.5px solid rgba(60,30,10,.25)',
                cursor:'pointer',
              }}
            >
              Fermer
            </button>
            {onView && (
              <button
                onClick={()=>{ onView(); onClose(); }}
                style={{
                  flex:1.4, padding:'13px 0', borderRadius:14,
                  background:'#3D2010', color:'#F5DC8A',
                  fontSize:13, fontWeight:900, letterSpacing:.3,
                  border:'none',
                  boxShadow:'0 4px 12px rgba(0,0,0,.25)',
                  cursor:'pointer',
                }}
              >
                Voir mon thème
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

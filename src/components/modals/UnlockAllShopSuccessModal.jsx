import { useEffect, useState } from "react";
import { GOLD } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   UnlockAllShopSuccessModal — festivité post-Coup de Grâce
   ────────────────────────────────────────────────────
   S'ouvre après confirmUnlockAllShop. Cascade d'emojis (échantillon
   des items débloqués), compteur animé 0→count, confettis 🍪☕✨.

   Le wow factor : 200 ☕ c'est gros, l'achat doit se sentir.

   Props :
   - count   : nombre d'items débloqués
   - emojis  : échantillon (≤18) des emojis des items pour la cascade
   - onClose : ferme la modale
   - C       : palette
═══════════════════════════════════════════════════════ */

export function UnlockAllShopSuccessModal({ count = 0, emojis = [], onClose, C }){
  const [counter, setCounter] = useState(0);

  /* Compteur animé 0 → count sur 1.4s (ease-out cube). */
  useEffect(() => {
    if(!count) return;
    const startTs = performance.now();
    const duration = 1400;
    let raf;
    const tick = (now) => {
      const progress = Math.min(1, (now - startTs) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounter(Math.round(eased * count));
      if(progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count]);

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
        onClick={(e)=>e.stopPropagation()}
        className="bi"
        style={{
          width:'100%', maxWidth:380,
          background:'linear-gradient(140deg,#F5DC8A 0%,#D4A017 50%,#A87510 100%)',
          borderRadius:24, padding:'28px 22px 22px',
          textAlign:'center', position:'relative', overflow:'hidden',
          boxShadow:'0 24px 64px rgba(0,0,0,.55), 0 0 36px rgba(212,160,23,.5)',
          border:`2px solid ${GOLD}`,
        }}
      >
        {/* Confettis 360° (réutilise les keyframes existantes) */}
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
              >{i % 4 === 0 ? '🍪' : i % 4 === 1 ? '✨' : i % 4 === 2 ? '☕' : '👑'}</span>
            );
          })}
        </div>

        <div style={{ position:'relative' }}>
          {/* Couronne géante */}
          <div className="float-anim" style={{ fontSize:64, lineHeight:1, marginBottom:6 }}>👑</div>

          {/* Bandeau */}
          <div style={{
            display:'inline-block',
            fontSize:10, fontWeight:900, color:'#3D2010',
            letterSpacing:3, textTransform:'uppercase',
            background:'rgba(255,255,255,.5)',
            padding:'4px 12px', borderRadius:10,
            marginBottom:10,
          }}>
            Coup de Grâce !
          </div>

          {/* Compteur animé */}
          <div style={{ fontSize:13, color:'#5D3A1F', marginBottom:4, fontWeight:700 }}>
            Tu as débloqué
          </div>
          <div style={{
            fontSize:54, fontWeight:900, color:'#3D2010',
            lineHeight:1, letterSpacing:'-1px',
            display:'flex', alignItems:'baseline', justifyContent:'center', gap:8,
            marginBottom:6,
          }}>
            <span>{counter}</span>
            <span style={{ fontSize:18, color:'#5D3A1F' }}>items</span>
          </div>
          <div style={{ fontSize:12, color:'#5D3A1F', fontStyle:'italic', marginBottom:18, opacity:.85 }}>
            Tous activables depuis ton profil 💛
          </div>

          {/* Cascade des emojis débloqués */}
          {emojis.length > 0 && (
            <div style={{
              display:'flex', flexWrap:'wrap', justifyContent:'center', gap:6,
              padding:'10px 8px',
              background:'rgba(255,255,255,.35)',
              borderRadius:14, marginBottom:18,
              border:'1px dashed rgba(61,32,16,.3)',
            }}>
              {emojis.map((emoji, i) => (
                <span
                  key={i}
                  className="item-pop"
                  style={{
                    fontSize:22, lineHeight:1,
                    animationDelay: `${0.3 + i * 0.07}s`,
                    display:'inline-block',
                  }}
                >
                  {emoji}
                </span>
              ))}
              {count > emojis.length && (
                <span
                  className="item-pop"
                  style={{
                    fontSize:13, fontWeight:900, color:'#3D2010',
                    alignSelf:'center', padding:'2px 6px',
                    animationDelay: `${0.3 + emojis.length * 0.07}s`,
                  }}
                >
                  +{count - emojis.length}
                </span>
              )}
            </div>
          )}

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
            Magnifique !
          </button>
        </div>
      </div>
    </div>
  );
}

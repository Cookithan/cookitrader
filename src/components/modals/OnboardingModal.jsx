import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { ONBOARDING_AVATARS, getVisibleOnboardingAvatars } from "../../data/avatars.js";
import { GOLD } from "../../data/themes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";

/* ════════════════════════════════════════════════════
   OnboardingModal — premier lancement
   - 3 étapes : Pseudo → Avatar → Tips
   - z-index 200, fond noir blur
   - onComplete(name, avatarIndex) est appelé à la fin
   - Le code dev "cookithan" (dans CookiMiner > setShowOnboarding) accorde un bonus
═══════════════════════════════════════════════════════ */

export function OnboardingModal({ onComplete, C }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [openTip, setOpenTip] = useState(null);

  const goldBtn = (disabled) => ({
    width:'100%', padding:'15px 22px', borderRadius:18, fontSize:15, fontWeight:800,
    background:disabled?C.card2:GOLD, color:disabled?C.muted:'#fff',
    border:`2px solid ${disabled?C.border:'transparent'}`,
    boxShadow:disabled?'none':'0 6px 20px rgba(212,160,23,.4)',
    cursor:disabled?'not-allowed':'pointer', letterSpacing:.3,
    transition:'all .25s'
  });

  const trimmed = name.trim();

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, backdropFilter:'blur(8px)', padding:18 }}>
      <div className="bi" style={{ width:'100%', maxWidth:380, background:C.card, borderRadius:28, padding:'28px 22px', boxShadow:'0 24px 64px rgba(0,0,0,.55)', border:`1px solid ${C.border}` }}>

        {/* Progress dots */}
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:22 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: i===step?22:8, height:8, borderRadius:4, background: i<=step?GOLD:C.card2, transition:'all .3s' }} />
          ))}
        </div>

        {step === 0 && (
          <div className="su" style={{ textAlign:'center' }}>
            <div className="float-anim" style={{ fontSize:64, marginBottom:14, display:'inline-block' }}>☕</div>
            <div style={{ fontSize:22, fontWeight:900, color:C.text, marginBottom:6 }}>Bienvenue dans CookiMiner !</div>
            <div style={{ fontSize:13, color:C.muted, marginBottom:22, lineHeight:1.5 }}>L'app qui récompense ta passion pour le café et les cookies</div>
            <div style={{ textAlign:'left', marginBottom:18 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5 }}>Choisis ton pseudo</label>
              <input
                value={name}
                onChange={e=>setName(e.target.value)}
                placeholder="Ton pseudo..."
                maxLength={20}
                autoFocus
                style={{
                  width:'100%', marginTop:8, padding:'14px 16px', borderRadius:14,
                  border:`2px solid ${C.border}`, background:C.card2, color:C.text,
                  fontSize:15, fontWeight:600, outline:'none',
                  fontFamily:'inherit'
                }}
                onKeyDown={e=>{ if(e.key==='Enter' && trimmed) setStep(1); }}
              />
            </div>
            <button onClick={()=>setStep(1)} disabled={!trimmed} style={goldBtn(!trimmed)}>
              Suivant →
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="su" style={{ textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:900, color:C.text, marginBottom:6 }}>Choisis ton avatar</div>
            <div style={{ fontSize:12, color:C.muted, marginBottom:18 }}>Tu pourras le changer plus tard</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:22, justifyItems:'center' }}>
              {getVisibleOnboardingAvatars().map((av) => {
                const i = av.id;
                const selected = avatar === i;
                return (
                  <button
                    key={i}
                    onClick={()=>setAvatar(i)}
                    className={selected?'pulse-ring':''}
                    style={{
                      padding:0,
                      borderRadius:'50%',
                      border:`3px solid ${selected?'#D4A017':'transparent'}`,
                      cursor:'pointer',
                      boxShadow:selected?'0 4px 16px rgba(212,160,23,.45)':'0 2px 6px rgba(0,0,0,.15)',
                      transition:'all .2s',
                      background:'transparent',
                      lineHeight:0,
                      display:'inline-flex',
                    }}
                    aria-label={`Avatar ${av.name}`}
                  >
                    <AvatarFigure value={i} size={62} />
                  </button>
                );
              })}
            </div>
            <button
              onClick={()=>setStep(2)}
              disabled={avatar===null}
              style={goldBtn(avatar===null)}
            >
              Suivant →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="su" style={{ textAlign:'center' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:18 }}>
              <AvatarFigure value={avatar} size={48} />
              <div style={{ fontSize:22, fontWeight:900, color:C.text }}>Bien joué, {trimmed} !</div>
            </div>
            <div style={{ fontSize:11, color:C.muted, marginBottom:10, fontStyle:'italic' }}>Tape une carte pour en savoir plus 👇</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:22, textAlign:'left' }}>
              {[
                { id:'play',   ico:'🎮', t:'Joue chaque jour',     d:'Check-in, Quiz, Roue, Défi de clics',                tip:'Le check-in se renouvelle chaque jour — la série de 7 jours débloque un jackpot. Le quiz revient toutes les 5h, et chaque difficulté a sa récompense.' },
                { id:'earn',   ico:'🍪', t:'Gagne des cookies',     d:'Et monte de niveau pour débloquer la boutique',      tip:'Chaque cookie gagné te donne aussi de l\'XP. À chaque palier, tu changes de titre (Barista → Légende) et tu débloques de nouveaux items dans la boutique.' },
                { id:'invest', ico:'📈', t:'Investis sur le marché', d:'Fais fructifier tes cookies en $CKM',                tip:'Le marché s\'ouvre au niveau 3. Le cours $CKM bouge en temps réel — achète bas, revends haut. Attention, il peut chuter aussi vite qu\'il monte.' },
              ].map(c=>{
                const open = openTip === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={()=>setOpenTip(open?null:c.id)}
                    style={{
                      width:'100%', display:'block', padding:'12px 14px', borderRadius:14,
                      background:C.card2, border:`1px solid ${open?'#D4A017':C.border}`,
                      textAlign:'left', cursor:'pointer',
                      transition:'border-color .2s'
                    }}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ fontSize:28, flexShrink:0 }}>{c.ico}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:2 }}>{c.t}</div>
                        <div style={{ fontSize:11, color:C.muted, lineHeight:1.4 }}>{c.d}</div>
                      </div>
                      <ChevronLeft size={16} color={C.muted} style={{ transform:`rotate(${open?90:-90}deg)`, transition:'transform .25s', flexShrink:0 }} />
                    </div>
                    {open && (
                      <div className="su" style={{ marginTop:10, paddingTop:10, borderTop:`1px dashed ${C.border}`, fontSize:12, color:C.text, lineHeight:1.5 }}>
                        💡 {c.tip}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <button onClick={()=>onComplete(trimmed, avatar)} className="glow-anim" style={goldBtn(false)}>
              C'est parti ! 🍪
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

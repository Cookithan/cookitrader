import { useEffect, useRef, useState } from "react";
import { COOKIE_SKINS, GOLD } from "../../data/themes.js";
import { PremiumCookie } from "../cookies/PremiumCookie.jsx";
import { SkinnedCookie } from "../cookies/SkinnedCookie.jsx";
import { ClickTracker } from "../../lib/antiCheat.js";
import { playSound } from "../../lib/audio.js";

/* ════════════════════════════════════════════════════
   ClickGame — défi de clics 5s
   - COST = 5 cookies pour démarrer
   - Reward = floor(clicks / 2) cookies
   - Phases : idle → countdown (3,2,1,GO) → playing (5s) → done
   - Combos visuels : 5 taps rapides = x2, 12 = x3, 20 = x4 (pas d'effet sur reward)
   - Si clicks > bestScore : confettis + onUpdateRecord
   - Si activeSkin est défini et présent dans COOKIE_SKINS : on utilise SkinnedCookie
     sinon on retombe sur PremiumCookie (par défaut)

   Anti auto-clicker (BRIEF_ANTICHEAT) — tout est délégué au ClickTracker
   instancié au début de chaque partie :
   - Cap dur 12 CPS (fenêtre glissante 1 s)
   - Score max 150 clics par partie
   - Détection de pattern bot (variance des intervalles < 5 ms sur 10 clics)
   Les clics rejetés ne sont pas comptés ni animés. Si un cheat est
   détecté, un warning visuel "moka" est affiché 1.5 s. Le score final
   versé à onEarn / onUpdateRecord vient toujours de getValidScore(),
   jamais du compteur visuel — fiabilité 100 %.
═══════════════════════════════════════════════════════ */

export const CLICK_DURATION = 5;
export const CLICK_COST = 5;

export function ClickGame({ coins, bestScore, onEarn, onSpend, onUpdateRecord, onEventChallenge, activeSkin, C }) {
  const hasCustomSkin = !!(activeSkin && COOKIE_SKINS[activeSkin] && activeSkin !== '');
  const skin = COOKIE_SKINS[activeSkin] || COOKIE_SKINS[''];

  const [phase,         setPhase]         = useState('idle');     // idle | countdown | playing | done
  const [clicks,        setClicks]        = useState(0);
  const [timeLeft,      setTimeLeft]      = useState(CLICK_DURATION);
  const [countdownVal,  setCountdownVal]  = useState(null);       // 3, 2, 1, 'GO', null
  const [particles,     setParticles]     = useState([]);
  const [rings,         setRings]         = useState([]);
  const [combo,         setCombo]         = useState(null);       // { text, key }
  const [pressed,       setPressed]       = useState(false);
  const [showConfetti,  setShowConfetti]  = useState(false);
  const [recordHit,     setRecordHit]     = useState(false);
  const [warningMessage,setWarningMessage]= useState(null);

  const lastTapRef     = useRef(0);
  const comboCountRef  = useRef(0);
  const timerRef       = useRef(null);
  const countdownRef   = useRef(null);
  const clickRef       = useRef(0);
  const trackerRef     = useRef(null);
  const warningTRef    = useRef(null);

  /* Cleanup */
  useEffect(()=>()=>{
    if(timerRef.current) clearInterval(timerRef.current);
    if(countdownRef.current) clearInterval(countdownRef.current);
    if(warningTRef.current) clearTimeout(warningTRef.current);
  },[]);

  /* Combo reset visuel */
  useEffect(()=>{
    if(!combo) return;
    const t = setTimeout(()=>setCombo(null), 1500);
    return () => clearTimeout(t);
  },[combo]);

  /* Record pulse reset */
  useEffect(()=>{
    if(!recordHit) return;
    const t = setTimeout(()=>setRecordHit(false), 1500);
    return () => clearTimeout(t);
  },[recordHit]);

  const endGame = () => {
    setPhase('done');
    /* Score fiable : on ignore le compteur visuel (clickRef) et on
       prend la valeur validée par le ClickTracker (max 150, capée
       même en cas d'exploit qui aurait contourné registerClick). */
    const finalClicks = trackerRef.current ? trackerRef.current.getValidScore() : clickRef.current;
    const earned = Math.floor(finalClicks / 2);
    if(earned > 0) onEarn(earned);
    if(finalClicks > bestScore){
      onUpdateRecord(finalClicks);
      setRecordHit(true);
      setShowConfetti(true);
      playSound('success');
      setTimeout(()=>setShowConfetti(false), 1500);
    } else if(earned > 0){
      playSound('success');
    }
    if(trackerRef.current?.cheatDetected){
      // eslint-disable-next-line no-console
      console.warn('[anticheat] Cheat detected:', trackerRef.current.cheatReason);
    }
    /* Event 'click_sprint' : 60 clics ou plus en une partie */
    onEventChallenge?.('click_sprint', finalClicks);
  };

  const startGame = () => {
    if(coins < CLICK_COST) return;
    playSound('modal');
    onSpend(CLICK_COST);
    setPhase('countdown');
    setClicks(0); clickRef.current = 0;
    setTimeLeft(CLICK_DURATION);
    comboCountRef.current = 0;
    lastTapRef.current = 0;
    /* Nouveau tracker à chaque partie — pas de fuite d'état entre runs */
    trackerRef.current = new ClickTracker();
    setWarningMessage(null);
    if(warningTRef.current){ clearTimeout(warningTRef.current); warningTRef.current = null; }

    let n = 3;
    setCountdownVal(n);
    countdownRef.current = setInterval(()=>{
      n--;
      if(n > 0){
        setCountdownVal(n);
      } else if(n === 0){
        setCountdownVal('GO');
      } else {
        clearInterval(countdownRef.current);
        setCountdownVal(null);
        setPhase('playing');
        timerRef.current = setInterval(()=>{
          setTimeLeft(t=>{
            if(t <= 1){
              clearInterval(timerRef.current);
              endGame();
              return 0;
            }
            return t - 1;
          });
        }, 1000);
      }
    }, 800);
  };

  const replay = () => {
    playSound('modal');
    setPhase('idle');
    setClicks(0); clickRef.current = 0;
    setTimeLeft(CLICK_DURATION);
    setCombo(null); setRings([]); setParticles([]);
    setRecordHit(false);
  };

  const handleTap = (e) => {
    if(phase !== 'playing') return;
    if(e && e.preventDefault) e.preventDefault();
    if(!trackerRef.current) return;

    /* Délégation au ClickTracker : 12 CPS max + cap 150 + détection
       pattern bot. Si le clic est rejeté on n'incrémente rien et on
       affiche un warning si c'est de la triche. */
    const result = trackerRef.current.registerClick();
    if(!result.accepted){
      if(result.isCheat){
        setWarningMessage(result.reason);
        if(warningTRef.current) clearTimeout(warningTRef.current);
        warningTRef.current = setTimeout(()=>{
          setWarningMessage(null);
          warningTRef.current = null;
        }, 1500);
      }
      return;
    }

    const now = Date.now();
    /* Son pop à chaque clic validé. Le throttle anti-cheat (12 CPS max)
       limite déjà naturellement la fréquence à un niveau acoustiquement
       supportable — pas de throttle audio supplémentaire. */
    playSound('tap');
    clickRef.current += 1;
    setClicks(c => c + 1);
    setPressed(true);
    setTimeout(()=>setPressed(false), 80);

    /* Particle */
    const id = now + Math.random();
    const tx = (Math.random() - 0.5) * 80;
    setParticles(p => [...p, { id, tx }]);
    setTimeout(()=>setParticles(p => p.filter(x => x.id !== id)), 800);

    /* Ring */
    setRings(r => [...r, id]);
    setTimeout(()=>setRings(r => r.filter(x => x !== id)), 550);

    /* Combo */
    if(now - lastTapRef.current < 250){
      comboCountRef.current++;
      if(comboCountRef.current === 5)  setCombo({ text:'x2 🔥', key: now });
      if(comboCountRef.current === 12) setCombo({ text:'x3 ⚡', key: now });
      if(comboCountRef.current === 20) setCombo({ text:'x4 💥', key: now });
    } else {
      comboCountRef.current = 1;
    }
    lastTapRef.current = now;
  };

  const urgentTime = phase === 'playing' && timeLeft <= 3;
  const timeColor  = urgentTime ? '#6B3D20' : C.text;

  /* Bouton central */
  const canPlay = coins >= CLICK_COST;
  const btnLabel =
    phase === 'idle'      ? `Commencer (${CLICK_COST} 🍪)`
  : phase === 'countdown' ? '...'
  : phase === 'playing'   ? '🍪 Tape !'
  :                         `Rejouer (${CLICK_COST} 🍪)`;

  /* Bannière de fin — clicks reflète déjà uniquement les clics validés
     par le tracker (max 150 par construction). */
  const earnedFinal = Math.floor(clicks / 2);
  const cps = (clicks / CLICK_DURATION).toFixed(1);
  const banner = phase === 'done'
    ? (recordHit
        ? { bg:'linear-gradient(135deg,#F5DC8A,#D4A017)', col:'#5D3A1F', border:'#D4A017', title:'🏆 Nouveau record !' }
        : clicks === 0
          ? { bg:'linear-gradient(135deg,#5A3520,#3D2010)', col:'#F0E0C0', border:'#3D2010', title:'0 clic… réessaie ?' }
          : { bg:'linear-gradient(135deg,#FBEFD4,#F0C050)', col:'#5D3A1F', border:'#D4A017', title:`${clicks} clics !` }
      )
    : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, paddingTop:6, position:'relative' }}>

      {/* Avertissement anti-cheat (BRIEF_ANTICHEAT) — moka, pas rouge */}
      {warningMessage && (
        <div style={{
          position:'absolute', top:-4, left:'50%',
          transform:'translateX(-50%)',
          background:'linear-gradient(135deg,#7D4E1F,#5C3317)',
          color:'#fff',
          padding:'8px 16px', borderRadius:12,
          fontSize:12, fontWeight:800,
          boxShadow:'0 4px 12px rgba(125,78,31,0.4)',
          zIndex:100, pointerEvents:'none',
          animation:'cheatWarning .3s ease-out',
          whiteSpace:'nowrap',
        }}>
          ⚠️ {warningMessage}
        </div>
      )}

      {/* 3 cartes stats */}
      <div style={{ display:'flex', gap:8, width:'100%', maxWidth:360 }}>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${phase==='playing'?'#D4A017':C.border}`, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,.04)', transition:'border-color .25s' }}>
          <div style={{ fontSize:11 }}>🍪</div>
          <div style={{ fontSize:22, fontWeight:900, color: phase==='playing'?'#D4A017':C.text, letterSpacing:'-.5px', lineHeight:1.1 }}>{clicks}</div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Clics</div>
        </div>
        <div
          style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${urgentTime?'#6B3D20':C.border}`, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,.04)', transition:'border-color .25s', animation: urgentTime ? 'shake .25s ease-in-out infinite' : 'none' }}
        >
          <div style={{ fontSize:11 }}>⏱️</div>
          <div style={{ fontSize:22, fontWeight:900, color: timeColor, letterSpacing:'-.5px', lineHeight:1.1 }}>{timeLeft}<span style={{ fontSize:13, color:C.muted, fontWeight:700 }}>s</span></div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Temps</div>
        </div>
        <div
          style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${recordHit?'#D4A017':C.border}`, textAlign:'center', boxShadow: recordHit?'0 0 16px rgba(212,160,23,.5)':'0 2px 8px rgba(0,0,0,.04)', transition:'all .25s', animation: recordHit ? 'recordPulse 1s ease-in-out infinite' : 'none' }}
        >
          <div style={{ fontSize:11 }}>🏆</div>
          <div style={{ fontSize:22, fontWeight:900, color: recordHit?'#D4A017':C.text, letterSpacing:'-.5px', lineHeight:1.1 }}>{Math.max(bestScore, recordHit?clicks:0)}</div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Record</div>
        </div>
      </div>

      {/* Barre de temps */}
      <div style={{ width:'100%', maxWidth:360, height:6, borderRadius:3, background:C.card2, overflow:'hidden', border:`1px solid ${C.border}` }}>
        <div style={{
          height:'100%', borderRadius:3,
          width: `${(timeLeft / CLICK_DURATION) * 100}%`,
          background: urgentTime
            ? 'linear-gradient(90deg, #4A2C17, #6B3D20)'
            : 'linear-gradient(90deg, #C17F3C, #D4A017)',
          transition: 'width 1s linear, background .3s'
        }} />
      </div>

      {/* Zone cookie 280×280 */}
      <div
        style={{
          position:'relative', width:'min(72vw,280px)', height:'min(72vw,280px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          userSelect:'none', WebkitUserSelect:'none'
        }}
      >
        {/* Halo radial doré */}
        <div style={{
          position:'absolute', inset:-10, borderRadius:'50%',
          background: phase === 'playing'
            ? 'radial-gradient(circle, rgba(212,160,23,.55), transparent 65%)'
            : phase === 'done' || phase === 'countdown'
              ? 'radial-gradient(circle, rgba(212,160,23,.18), transparent 65%)'
              : 'radial-gradient(circle, rgba(212,160,23,.25), transparent 65%)',
          transition:'background .35s ease',
          pointerEvents:'none', zIndex:0
        }} />

        {/* Anneaux dorés au tap */}
        {rings.map(id => (
          <div
            key={id}
            style={{
              position:'absolute', inset:'15%', borderRadius:'50%',
              border:'3px solid rgba(212,160,23,.85)',
              animation:'ringExpand .55s ease-out forwards',
              pointerEvents:'none', zIndex:3
            }}
          />
        ))}

        {/* Cookie cliquable */}
        <div
          onPointerDown={handleTap}
          className={(phase==='idle' || phase==='done') ? 'cookie-anim-idle' : ''}
          style={{
            width:'88%', height:'88%', position:'relative', zIndex:2,
            cursor: phase==='playing' ? 'pointer' : 'default',
            touchAction:'manipulation',
            transform: pressed ? 'scale(.88) rotate(-3deg)' : 'scale(1)',
            transition: pressed ? 'transform .05s ease' : 'transform .15s cubic-bezier(.36,.07,.19,.97)',
            filter: phase === 'done' ? 'grayscale(.4) brightness(.85)' : 'none',
            willChange:'transform',
            animation: (phase==='idle' || phase==='done') ? 'idle 3s ease-in-out infinite' : 'none'
          }}
        >
          {hasCustomSkin
            ? <SkinnedCookie skin={skin} />
            : <PremiumCookie />}
        </div>

        {/* Particules +1 🍪 */}
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position:'absolute', top:'50%', left:'50%',
              fontSize:18, fontWeight:900, color:'#D4A017',
              pointerEvents:'none', zIndex:5,
              animation:'floatUpClick .8s ease-out forwards',
              textShadow:'0 1px 3px rgba(0,0,0,.25)',
              ['--tx']: `${p.tx}px`
            }}
          >+1 🍪</div>
        ))}

        {/* Overlay countdown */}
        {phase === 'countdown' && countdownVal !== null && (
          <div
            key={String(countdownVal)}
            style={{
              position:'absolute', inset:0, display:'flex',
              alignItems:'center', justifyContent:'center',
              fontSize: countdownVal === 'GO' ? 64 : 96,
              fontWeight:900,
              color: countdownVal === 'GO' ? '#C8960C' : '#D4A017',
              letterSpacing:'-2px', zIndex:6, pointerEvents:'none',
              animation:'countdown .8s ease-out forwards',
              textShadow:'0 4px 18px rgba(212,160,23,.5)'
            }}
          >
            {countdownVal === 'GO' ? 'GO !' : countdownVal}
          </div>
        )}

        {/* Badge combo en haut à droite */}
        {combo && (
          <div
            key={combo.key}
            style={{
              position:'absolute', top:8, right:8,
              padding:'6px 12px', borderRadius:14,
              background:'linear-gradient(135deg,#FFE89A,#D4A017)',
              color:'#5D3A1F', fontWeight:900, fontSize:14,
              boxShadow:'0 4px 14px rgba(212,160,23,.55)',
              zIndex:6, letterSpacing:.5,
              animation:'popIn .45s cubic-bezier(.36,.07,.19,.97) both'
            }}
          >{combo.text}</div>
        )}

        {/* Confettis si record */}
        {showConfetti && (
          <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:7 }}>
            {Array.from({ length:14 }).map((_,i)=>{
              const angle = (i / 14) * Math.PI * 2;
              const dist  = 120 + Math.random()*60;
              const tx = Math.cos(angle) * dist;
              const ty = Math.sin(angle) * dist;
              return (
                <span
                  key={i}
                  style={{
                    position:'absolute', top:'50%', left:'50%',
                    fontSize:20,
                    animation:'confetti 1.4s ease-out forwards',
                    animationDelay:`${i * 0.02}s`,
                    ['--tx']: `${tx}px`,
                    ['--ty']: `${ty}px`
                  }}
                >{i % 2 === 0 ? '🍪' : '✨'}</span>
              );
            })}
          </div>
        )}
      </div>

      {/* Texte d'instruction */}
      <div style={{ minHeight:18, fontSize:13, fontWeight:600, color: phase==='playing' ? '#D4A017' : C.muted, fontStyle: phase==='playing'?'normal':'italic', textAlign:'center' }}>
        {phase === 'idle'      && 'Prêt à tapoter le cookie ?'}
        {phase === 'countdown' && 'Prépare-toi…'}
        {phase === 'playing'   && 'Tape ! Tape ! Tape !'}
        {phase === 'done'      && 'Bien joué !'}
      </div>

      {/* Bannière résultat */}
      {banner && (
        <div style={{
          padding:'14px 22px', borderRadius:18,
          background: banner.bg, color: banner.col,
          border:`2px solid ${banner.border}`,
          boxShadow:'0 6px 20px rgba(74,44,23,.25)',
          textAlign:'center', minWidth:280,
          animation:'popIn .5s cubic-bezier(.36,.07,.19,.97) both'
        }}>
          <div style={{ fontSize:18, fontWeight:900, marginBottom:10, letterSpacing:.3 }}>{banner.title}</div>
          <div style={{ display:'flex', gap:14, justifyContent:'center' }}>
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>{clicks}</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Clics</div>
            </div>
            <div style={{ width:1, background:'rgba(0,0,0,.15)' }} />
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>{cps}</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Clics/s</div>
            </div>
            <div style={{ width:1, background:'rgba(0,0,0,.15)' }} />
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>+{earnedFinal}</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Cookies</div>
            </div>
          </div>
        </div>
      )}

      {/* Bouton central */}
      <button
        onClick={phase === 'done' ? replay : phase === 'idle' ? startGame : undefined}
        disabled={phase === 'countdown' || phase === 'playing' || (!canPlay && phase !== 'done')}
        className={(phase === 'idle' || phase === 'done') && canPlay ? 'glow-anim' : ''}
        style={{
          width:200, padding:'15px 0', borderRadius:22, fontSize:15, fontWeight:900, letterSpacing:.4,
          background: (phase === 'idle' || phase === 'done') && canPlay ? GOLD : C.card,
          color: (phase === 'idle' || phase === 'done') && canPlay ? '#fff' : C.muted,
          border:`2px solid ${((phase === 'idle' || phase === 'done') && canPlay) ? 'transparent' : C.border}`,
          boxShadow: (phase === 'idle' || phase === 'done') && canPlay ? '0 6px 20px rgba(212,160,23,.4)' : 'none',
          cursor: (phase === 'idle' || phase === 'done') && canPlay ? 'pointer' : 'not-allowed',
          touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
          transition:'transform .12s, background .25s'
        }}
      >
        {btnLabel}
      </button>

      {/* Tip card */}
      <div style={{ width:'100%', maxWidth:360, padding:'10px 14px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center' }}>
        💡 <strong style={{ color:'#D4A017' }}>1 🍪 = 2 clics</strong> · Plus tu tapes vite, plus tu déclenches des combos
      </div>
    </div>
  );
}

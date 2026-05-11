import { useEffect, useRef, useState } from "react";
import { COOKIE_SKINS, GOLD } from "../../data/themes.js";
import { PremiumCookie } from "../cookies/PremiumCookie.jsx";
import { SkinnedCookie } from "../cookies/SkinnedCookie.jsx";
import { ClickTracker } from "../../lib/antiCheat.js";
import { playSound } from "../../lib/audio.js";

/* ════════════════════════════════════════════════════
   ClickGame — défi de clics (nerf 11/05/2026)
   ────────────────────────────────────────────────────
   - COST = 5 🍪 par partie · cap 100 essais/jour (recharge 2 ☕)
   - RÈGLE : 1 clic = 1 🍪 (rewardPerClick = 1 partout)
   - 3 MODES sélectionnables avant chaque partie :
     · Normal       — 5 s · cap 50 🍪
     · Rapide       — 3 s · cap 25 🍪 (session courte)
     · Frénétique   — 8 s · cap 50 🍪 (cookie qui bouge)
   - PAS DE COMBOS — retirés le 11/05/2026 (le jeu était trop
     rentable avec ×4 : ~7000 🍪/jour vs ~2500 pour les autres).
   - AUTO-END : dès que le cap du mode est atteint, le jeu se
     termine immédiatement (récompense pleine, plus de risque
     d'over-grind).

   Anti auto-clicker (BRIEF_ANTICHEAT) — tout est délégué au ClickTracker
   instancié au début de chaque partie :
   - Cap dur 15 CPS (fenêtre glissante 1 s)
   - Score max 150 clics par partie
   - Détection de pattern bot (variance des intervalles < 5 ms sur 10 clics)
   Les clics rejetés ne sont pas comptés ni animés.
═══════════════════════════════════════════════════════ */

export const CLICK_COST = 5;
/* Conservé pour rétro-compat des imports existants (le mode actif
   définit la vraie durée à l'exécution). */
export const CLICK_DURATION = 5;

const MODES = {
  normal:     { label:'Normal',     emoji:'☕', desc:'5 s · 1 clic = 1 🍪 · cap 50 🍪',            duration:5, rewardPerClick:1, rewardCap:50, moves:false },
  rapide:     { label:'Rapide',     emoji:'⚡', desc:'3 s · 1 clic = 1 🍪 · cap 25 🍪 (court intense)', duration:3, rewardPerClick:1, rewardCap:25, moves:false },
  frenetique: { label:'Frénétique', emoji:'🌀', desc:'8 s · 1 clic = 1 🍪 · cap 50 🍪 · cookie bouge', duration:8, rewardPerClick:1, rewardCap:50, moves:true },
};

export function ClickGame({ coins, bestScore, onEarn, onSpend, onUpdateRecord, onEventChallenge, activeSkin, C }) {
  const hasCustomSkin = !!(activeSkin && COOKIE_SKINS[activeSkin] && activeSkin !== '');
  const skin = COOKIE_SKINS[activeSkin] || COOKIE_SKINS[''];

  const [mode,          setMode]          = useState('normal');
  const modeCfg = MODES[mode] || MODES.normal;

  const [phase,         setPhase]         = useState('idle');     // idle | countdown | playing | done
  const [clicks,        setClicks]        = useState(0);
  const [rewardScore,   setRewardScore]   = useState(0);          // float, capé à modeCfg.rewardCap (combo réel)
  const [timeLeft,      setTimeLeft]      = useState(modeCfg.duration);
  const [countdownVal,  setCountdownVal]  = useState(null);
  const [particles,     setParticles]     = useState([]);
  const [rings,         setRings]         = useState([]);
  const [combo,         setCombo]         = useState(null);       // { text, key }
  const [comboMul,      setComboMul]      = useState(1);          // multiplicateur effectif sur le reward
  const [pressed,       setPressed]       = useState(false);
  const [showConfetti,  setShowConfetti]  = useState(false);
  const [recordHit,     setRecordHit]     = useState(false);
  const [warningMessage,setWarningMessage]= useState(null);
  /* Position relative du cookie principal (en %). Fixe au centre sauf
     mode frénétique où il se déplace toutes les 2 s. */
  const [cookiePos,     setCookiePos]     = useState({ x:50, y:50 });

  const lastTapRef     = useRef(0);
  const comboCountRef  = useRef(0);
  const comboMulRef    = useRef(1);
  const timerRef       = useRef(null);
  const countdownRef   = useRef(null);
  const clickRef       = useRef(0);
  const rewardRef      = useRef(0);
  const trackerRef     = useRef(null);
  const warningTRef    = useRef(null);
  const cookieMoveRef  = useRef(null);
  const modeRef        = useRef('normal');
  const phaseRef       = useRef('idle');
  useEffect(()=>{ modeRef.current = mode; }, [mode]);
  useEffect(()=>{ phaseRef.current = phase; }, [phase]);

  /* Cleanup global au unmount */
  useEffect(()=>()=>{
    if(timerRef.current) clearInterval(timerRef.current);
    if(countdownRef.current) clearInterval(countdownRef.current);
    if(warningTRef.current) clearTimeout(warningTRef.current);
    if(cookieMoveRef.current) clearInterval(cookieMoveRef.current);
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
    /* Stop tous les timers liés au playing */
    if(cookieMoveRef.current){ clearInterval(cookieMoveRef.current); cookieMoveRef.current = null; }

    /* Score fiable : `clicks` validés via tracker (max 150). */
    const finalClicks = trackerRef.current ? trackerRef.current.getValidScore() : clickRef.current;
    /* Reward final = rewardRef accumulé via les clics + bonus spéciaux,
       capé au cap du mode actif. */
    const earned = Math.max(0, Math.min(Math.floor(rewardRef.current), MODES[modeRef.current].rewardCap));
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
    setRewardScore(0); rewardRef.current = 0;
    setTimeLeft(modeCfg.duration);
    comboCountRef.current = 0;
    comboMulRef.current = 1;
    setComboMul(1);
    lastTapRef.current = 0;
    setCookiePos({ x:50, y:50 });
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
        /* Timer principal (1s tick, durée selon mode) */
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
        /* Mode frénétique : déplace le cookie toutes les 2s */
        if(MODES[modeRef.current].moves){
          cookieMoveRef.current = setInterval(() => {
            if(phaseRef.current !== 'playing') return;
            setCookiePos({
              x: 30 + Math.random() * 40,
              y: 30 + Math.random() * 40,
            });
          }, 2000);
        }
      }
    }, 800);
  };

  const replay = () => {
    playSound('modal');
    setPhase('idle');
    setClicks(0); clickRef.current = 0;
    setRewardScore(0); rewardRef.current = 0;
    setTimeLeft(modeCfg.duration);
    setCombo(null); setComboMul(1); comboMulRef.current = 1;
    setRings([]); setParticles([]);
    setRecordHit(false);
    setCookiePos({ x:50, y:50 });
  };

  const handleTap = (e) => {
    if(phase !== 'playing') return;
    if(e && e.preventDefault) e.preventDefault();
    if(!trackerRef.current) return;

    /* Délégation au ClickTracker : 15 CPS max + cap 150 + détection
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
    playSound('tap');
    clickRef.current += 1;
    setClicks(c => c + 1);
    setPressed(true);
    setTimeout(()=>setPressed(false), 80);

    /* Pas de combo : reward fixe = rewardPerClick (1 par clic).
       Capé au rewardCap du mode. */
    const delta = modeCfg.rewardPerClick;
    rewardRef.current = Math.min(rewardRef.current + delta, modeCfg.rewardCap);
    setRewardScore(rewardRef.current);

    /* Particle */
    const id = now + Math.random();
    const tx = (Math.random() - 0.5) * 80;
    const popLabel = `+${modeCfg.rewardPerClick % 1 === 0 ? modeCfg.rewardPerClick : modeCfg.rewardPerClick.toFixed(1)} 🍪`;
    setParticles(p => [...p, { id, tx, label: popLabel, mul: 1 }]);
    setTimeout(()=>setParticles(p => p.filter(x => x.id !== id)), 800);

    /* Ring (doré normal) */
    setRings(r => [...r, { id, hot: false }]);
    setTimeout(()=>setRings(r => r.filter(x => x.id !== id)), 550);

    /* Auto-end : dès que le cap est atteint, fin immédiate du jeu. */
    if(rewardRef.current >= modeCfg.rewardCap){
      if(timerRef.current){ clearInterval(timerRef.current); timerRef.current = null; }
      endGame();
    }
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

  /* Bannière de fin */
  const earnedFinal = Math.max(0, Math.min(Math.floor(rewardRef.current), modeCfg.rewardCap));
  const cps = (clicks / modeCfg.duration).toFixed(1);
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

      {/* Sélecteur de mode + compteur quota — visible uniquement en idle */}
      {phase === 'idle' && (
        <div style={{ width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{
            fontSize:10, fontWeight:700, color:C.muted,
            textTransform:'uppercase', letterSpacing:1.5,
            textAlign:'left',
          }}>
            Mode
          </div>
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6,
            padding:4, borderRadius:12,
            background:C.card, border:`1px solid ${C.border}`,
          }}>
            {Object.entries(MODES).map(([key, cfg]) => {
              const active = mode === key;
              return (
                <button
                  key={key}
                  onClick={() => { setMode(key); setTimeLeft(cfg.duration); playSound('toggle'); }}
                  style={{
                    padding:'8px 4px', borderRadius:9, border:'none',
                    background: active ? GOLD : 'transparent',
                    color: active ? '#fff' : C.muted,
                    fontSize:11, fontWeight:800, letterSpacing:.3,
                    cursor:'pointer', transition:'background .15s, color .15s',
                    touchAction:'manipulation', userSelect:'none',
                  }}
                >
                  {cfg.emoji} {cfg.label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize:10.5, color:C.muted, textAlign:'center', fontStyle:'italic', lineHeight:1.4 }}>
            {modeCfg.desc}
          </div>
        </div>
      )}

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

      {/* 3 cartes stats — Clics + Reward gagnés / Temps / Record */}
      <div style={{ display:'flex', gap:8, width:'100%', maxWidth:360 }}>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${phase==='playing'?'#D4A017':C.border}`, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,.04)', transition:'border-color .25s' }}>
          <div style={{ fontSize:11 }}>🍪</div>
          <div style={{ fontSize:22, fontWeight:900, color: phase==='playing'?'#D4A017':C.text, letterSpacing:'-.5px', lineHeight:1.1 }}>{Math.floor(rewardScore)}</div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Gagnés · {clicks} clic{clicks>1?'s':''}</div>
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
          width: `${(timeLeft / modeCfg.duration) * 100}%`,
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

        {/* Anneaux au tap (couleur = doré normal, ambre intense si combo actif) */}
        {rings.map(r => (
          <div
            key={r.id}
            style={{
              position:'absolute', inset:'15%', borderRadius:'50%',
              border: r.hot ? '3px solid rgba(255,224,102,1)' : '3px solid rgba(212,160,23,.85)',
              animation:'ringExpand .55s ease-out forwards',
              pointerEvents:'none', zIndex:3
            }}
          />
        ))}

        {/* Cookie cliquable — position dynamique en mode frénétique */}
        <div
          onPointerDown={handleTap}
          className={(phase==='idle' || phase==='done') ? 'cookie-anim-idle' : ''}
          style={{
            position: phase === 'playing' && modeCfg.moves ? 'absolute' : 'relative',
            top:  phase === 'playing' && modeCfg.moves ? `${cookiePos.y}%` : undefined,
            left: phase === 'playing' && modeCfg.moves ? `${cookiePos.x}%` : undefined,
            transform: phase === 'playing' && modeCfg.moves
              ? `translate(-50%, -50%) ${pressed ? 'scale(.88) rotate(-3deg)' : 'scale(1)'}`
              : (pressed ? 'scale(.88) rotate(-3deg)' : 'scale(1)'),
            width: modeCfg.moves ? '55%' : '88%',
            height: modeCfg.moves ? '55%' : '88%',
            zIndex:2,
            cursor: phase==='playing' ? 'pointer' : 'default',
            touchAction:'manipulation',
            transition: pressed
              ? 'transform .05s ease, top .4s ease, left .4s ease'
              : 'transform .15s cubic-bezier(.36,.07,.19,.97), top .4s ease, left .4s ease',
            filter: phase === 'done' ? 'grayscale(.4) brightness(.85)' : 'none',
            willChange:'transform, top, left',
            animation: (phase==='idle' || phase==='done') ? 'idle 3s ease-in-out infinite' : 'none'
          }}
        >
          {hasCustomSkin
            ? <SkinnedCookie skin={skin} />
            : <PremiumCookie />}
        </div>

        {/* Particules reward (montant variable selon mode + combo) */}
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position:'absolute', top:'50%', left:'50%',
              fontSize: (p.mul && p.mul > 1 ? 20 : 16),
              fontWeight:900,
              color: (p.mul && p.mul > 1 ? '#FFD24D' : '#D4A017'),
              pointerEvents:'none', zIndex:5,
              animation:'floatUpClick .8s ease-out forwards',
              textShadow:'0 1px 3px rgba(0,0,0,.3)',
              ['--tx']: `${p.tx}px`
            }}
          >{p.label || '+1 🍪'}</div>
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
        💡 Tape vite pour atteindre le <strong style={{ color:'#D4A017' }}>cap {modeCfg.rewardCap} 🍪</strong> — partie termine au cap
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import {
  SLOT_SYMBOLS,
  SLOT_CONFIG,
  spinSlotMachine,
  evaluateResult,
  getWinningReels,
} from "../../lib/slotMachine.js";
import { playSound } from "../../lib/audio.js";

/* ════════════════════════════════════════════════════
   SlotGame — "Machine à Sous" (BRIEF refonte 09/05/2026)
   ────────────────────────────────────────────────────
   Vraie machine à sous casino style, palette café-only :
     · cadre marron foncé + 2 boules dorées sur les coins
     · 3 rouleaux dorés qui défilent (60 ms cycle) puis s'arrêtent
       en cascade (800 / 1300 / 1800 ms) avec animation rebond
     · 2 same → toast +25 🍪 + halo doré sur les rouleaux gagnants
     · 3 same (pas jackpot) → flash machine + confettis + toast
     · 3 × 7️⃣ (jackpot) → explosion 1.5 s + modal "INCROYABLE +750 🍪"

   Économie :
     COST = 20 🍪 · Niveau 10+ · Cooldown 1 s · Limite 50 parties/jour
     Espérance ≈ 0 (équilibrée).

   Probabilités exactes via tirage par table dans slotMachine.js.

   Intégré dans GameOverlay (qui fournit le header back/title/coins).
═══════════════════════════════════════════════════════ */

const STORAGE_KEY = 'cookiminer:slotMachineGamesToday';

export function SlotGame({ coins, onEarn, onSpend, onEventChallenge, level = 1, C }){
  /* État des 3 rouleaux */
  const [reelStates, setReelStates] = useState([
    { spinning:false, stopping:false, symbol:'?', isWinner:false, isJackpot:false },
    { spinning:false, stopping:false, symbol:'?', isWinner:false, isJackpot:false },
    { spinning:false, stopping:false, symbol:'?', isWinner:false, isJackpot:false },
  ]);

  const [isSpinning,       setIsSpinning]       = useState(false);
  const [machineEffect,    setMachineEffect]    = useState(null);  // null | 'win-flash' | 'jackpot-flash'
  const [toasts,           setToasts]           = useState([]);
  const [showJackpotModal, setShowJackpotModal] = useState(false);
  const [jackpotAmount,    setJackpotAmount]    = useState(0);
  const [machineConfetti,  setMachineConfetti]  = useState([]);
  const [gamesToday,       setGamesToday]       = useState(0);
  const [lastSpinAt,       setLastSpinAt]       = useState(0);

  const cycleIntervalRef = useRef(null);
  const timeoutsRef      = useRef([]);

  /* Load compteur quotidien depuis LS */
  useEffect(() => {
    try{
      const today = new Date().toDateString();
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        const data = JSON.parse(raw);
        if(data?.date === today) setGamesToday(Number(data.count) || 0);
      }
    }catch{}
  }, []);

  /* Persist compteur à chaque changement */
  useEffect(() => {
    try{
      const today = new Date().toDateString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: gamesToday }));
    }catch{}
  }, [gamesToday]);

  /* Cleanup intervals/timeouts au démontage */
  useEffect(() => () => {
    if(cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
    timeoutsRef.current.forEach(clearTimeout);
  }, []);

  /* Helper : peut-on lancer ? */
  const canSpin = !isSpinning
    && level >= SLOT_CONFIG.REQUIRED_LEVEL
    && coins >= SLOT_CONFIG.COST
    && gamesToday < SLOT_CONFIG.MAX_PER_DAY
    && (Date.now() - lastSpinAt) >= SLOT_CONFIG.COOLDOWN_MS;

  /* Toast helper */
  const showToast = useCallback((message, type = '') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    const t = setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== id));
    }, 2100);
    timeoutsRef.current.push(t);
  }, []);

  /* Confetti burst depuis le centre de la machine */
  const spawnConfetti = useCallback((count) => {
    const colors = ['#D4A017', '#C17F3C', '#FFD75A', '#A57021'];
    const items = [];
    for(let i = 0; i < count; i++){
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 120;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const rot = Math.random() * 720 - 360;
      items.push({
        id: i + '-' + Date.now(),
        color: colors[i % 4],
        transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
        delay: Math.random() * 0.2,
      });
    }
    setMachineConfetti(items);
    const t = setTimeout(() => setMachineConfetti([]), 1700);
    timeoutsRef.current.push(t);
  }, []);

  /* Évaluation après que les 3 rouleaux se sont arrêtés */
  const evaluateAndReward = useCallback((result, evaluation) => {
    const winners = getWinningReels(result);

    if(evaluation.type === 'jackpot'){
      playSound('success');
      setReelStates(prev => prev.map((r, i) => ({ ...r, isJackpot: winners[i] })));
      setMachineEffect('jackpot-flash');
      spawnConfetti(40);

      const tModal = setTimeout(() => {
        setJackpotAmount(evaluation.gain);
        setShowJackpotModal(true);
        onEarn?.(evaluation.gain);
        onEventChallenge?.('slot_three', 1);
      }, SLOT_CONFIG.JACKPOT_EXPLOSION_MS);
      timeoutsRef.current.push(tModal);

      const tEnd = setTimeout(() => {
        setIsSpinning(false);
        setMachineEffect(null);
      }, SLOT_CONFIG.JACKPOT_EXPLOSION_MS + 800);
      timeoutsRef.current.push(tEnd);

    } else if(evaluation.type === 'triple'){
      playSound('success');
      setReelStates(prev => prev.map((r, i) => ({ ...r, isWinner: winners[i] })));
      setMachineEffect('win-flash');
      spawnConfetti(20);
      showToast(`🎉 +${evaluation.gain} 🍪 ${evaluation.symbolName} !`, 'big-win');
      onEarn?.(evaluation.gain);
      onEventChallenge?.('slot_three', 1);

      const t = setTimeout(() => {
        setIsSpinning(false);
        setMachineEffect(null);
      }, 800);
      timeoutsRef.current.push(t);

    } else if(evaluation.type === 'pair'){
      playSound('toggle');
      setReelStates(prev => prev.map((r, i) => ({ ...r, isWinner: winners[i] })));
      showToast(`+${evaluation.gain} 🍪`);
      onEarn?.(evaluation.gain);

      const t = setTimeout(() => setIsSpinning(false), 800);
      timeoutsRef.current.push(t);

    } else {
      /* Aucun gain — son d'erreur léger pour signaler la défaite */
      playSound('error');
      const t = setTimeout(() => setIsSpinning(false), 400);
      timeoutsRef.current.push(t);
    }
  }, [onEarn, onEventChallenge, spawnConfetti, showToast]);

  /* Spin handler */
  const handleSpin = useCallback(() => {
    if(!canSpin) return;
    /* Son de lancer (clic levier) — utilise 'modal' qui a un thump grave */
    playSound('modal');
    setIsSpinning(true);
    setLastSpinAt(Date.now());
    onSpend?.(SLOT_CONFIG.COST);
    setGamesToday(g => g + 1);
    setMachineEffect(null);
    setReelStates(prev => prev.map(r => ({
      ...r, spinning:true, stopping:false, isWinner:false, isJackpot:false,
    })));

    /* Tirage final */
    const result     = spinSlotMachine();
    const evaluation = evaluateResult(result);

    /* Cycle des symboles aléatoires pendant le spin */
    cycleIntervalRef.current = setInterval(() => {
      setReelStates(prev => prev.map(r => {
        if(!r.spinning) return r;
        return { ...r, symbol: SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)] };
      }));
    }, 60);

    /* Stop staggéré : 800 / 1300 / 1800 ms — chaque arrêt joue un 'tap'
       sec pour donner l'effet "click clack click" du rouleau qui se cale. */
    const stop1 = setTimeout(() => {
      playSound('tap');
      setReelStates(prev => {
        const next = [...prev];
        next[0] = { ...next[0], spinning:false, stopping:true, symbol: result[0] };
        return next;
      });
    }, SLOT_CONFIG.REEL_FIRST_STOP_MS);

    const stop2 = setTimeout(() => {
      playSound('tap');
      setReelStates(prev => {
        const next = [...prev];
        next[1] = { ...next[1], spinning:false, stopping:true, symbol: result[1] };
        return next;
      });
    }, SLOT_CONFIG.REEL_FIRST_STOP_MS + SLOT_CONFIG.REEL_STOP_DELAY_MS);

    const stop3 = setTimeout(() => {
      playSound('tap');
      setReelStates(prev => {
        const next = [...prev];
        next[2] = { ...next[2], spinning:false, stopping:true, symbol: result[2] };
        return next;
      });
      if(cycleIntervalRef.current){
        clearInterval(cycleIntervalRef.current);
        cycleIntervalRef.current = null;
      }
      const tEval = setTimeout(() => evaluateAndReward(result, evaluation), 600);
      timeoutsRef.current.push(tEval);
    }, SLOT_CONFIG.REEL_FIRST_STOP_MS + SLOT_CONFIG.REEL_STOP_DELAY_MS * 2);

    timeoutsRef.current.push(stop1, stop2, stop3);
  }, [canSpin, onSpend, evaluateAndReward]);

  /* Label du bouton */
  let buttonLabel;
  if(level < SLOT_CONFIG.REQUIRED_LEVEL) buttonLabel = `🔒 Niveau ${SLOT_CONFIG.REQUIRED_LEVEL} requis`;
  else if(gamesToday >= SLOT_CONFIG.MAX_PER_DAY) buttonLabel = '🔒 Limite atteinte';
  else if(coins < SLOT_CONFIG.COST) buttonLabel = '🔒 Pas assez de cookies';
  else if(isSpinning) buttonLabel = '...';
  else buttonLabel = `▶ Lancer (${SLOT_CONFIG.COST} 🍪)`;

  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      gap:14, paddingTop:6, position:'relative',
    }}>
      {/* Subtitle */}
      <div style={{
        textAlign:'center', color:'#C17F3C',
        fontSize:11, fontWeight:800, letterSpacing:3,
        textTransform:'uppercase',
      }}>🎰 Tente ta chance</div>

      {/* Toasts */}
      <div style={{
        position:'absolute', top:42, left:0, right:0,
        display:'flex', flexDirection:'column', alignItems:'center', gap:8,
        zIndex:60, pointerEvents:'none',
      }}>
        {toasts.map(t => (
          <SlotToast key={t.id} message={t.message} type={t.type} />
        ))}
      </div>

      {/* Machine wrapper avec confettis */}
      <div style={{ width:'100%', maxWidth:320, position:'relative' }}>
        <SlotMachineCabinet reelStates={reelStates} machineEffect={machineEffect} />
        {machineConfetti.map(c => (
          <div
            key={c.id}
            style={{
              position:'absolute', left:'50%', top:'50%',
              width:8, height:8, background:c.color, borderRadius:2,
              pointerEvents:'none',
              animation:'slotMachineConfetti 1.6s ease-out forwards',
              animationDelay: c.delay + 's',
              '--confetti-end': c.transform,
            }}
          />
        ))}
      </div>

      {/* Bouton lancer */}
      <button
        onClick={handleSpin}
        disabled={!canSpin}
        style={{
          background: canSpin
            ? 'linear-gradient(180deg, #E8B81B 0%, #D4A017 50%, #B58A0E 100%)'
            : 'linear-gradient(180deg, #C9B788 0%, #A89968 100%)',
          color: canSpin ? '#2C1810' : 'rgba(44, 24, 16, 0.5)',
          border:'none', borderRadius:100,
          padding:'14px 38px',
          fontSize:15, fontWeight:900,
          cursor: canSpin ? 'pointer' : 'not-allowed',
          boxShadow: canSpin
            ? '0 4px 0 #8C6800, 0 8px 16px rgba(212, 160, 23, 0.4)'
            : '0 4px 0 #6E6240',
          textTransform:'uppercase',
          letterSpacing:.5,
          transition:'all .1s',
          touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
        }}
      >
        {buttonLabel}
      </button>

      {/* Tableau des gains + probabilités */}
      <PayoutTable C={C} />

      {/* Compteur quotidien */}
      <div style={{
        textAlign:'center', marginTop:4,
        fontSize:11, color:'#A0784E', fontStyle:'italic',
      }}>
        {gamesToday} / {SLOT_CONFIG.MAX_PER_DAY} parties aujourd'hui
      </div>

      {/* Modal jackpot */}
      {showJackpotModal && (
        <JackpotModal
          amount={jackpotAmount}
          onClose={() => setShowJackpotModal(false)}
        />
      )}
    </div>
  );
}

/* ─── Sous-composants ─────────────────────────── */

function SlotMachineCabinet({ reelStates, machineEffect }){
  const boxShadow =
    machineEffect === 'jackpot-flash'
      ? '0 0 60px rgba(212, 160, 23, 1), 0 0 100px rgba(212, 160, 23, 0.7), inset 0 0 30px rgba(255, 215, 90, 0.5)'
      : machineEffect === 'win-flash'
        ? '0 0 30px rgba(212, 160, 23, 0.6), inset 0 0 20px rgba(255, 215, 90, 0.3)'
        : '0 12px 30px rgba(76, 44, 23, 0.35), inset 0 -3px 0 rgba(0,0,0,0.3), inset 0 2px 0 rgba(212, 160, 23, 0.15)';
  return (
    <div style={{
      background:'linear-gradient(180deg, #5C3317 0%, #4A2C17 100%)',
      borderRadius:22,
      padding:'18px 14px',
      boxShadow,
      transform: machineEffect === 'jackpot-flash' ? 'scale(1.05)' : 'scale(1)',
      transition:'all .3s ease-out',
      position:'relative',
      border:'2px solid #3D2010',
    }}>
      {/* Boules dorées sur les coins */}
      <div style={{
        position:'absolute', top:-6, left:20,
        width:14, height:14, borderRadius:'50%',
        background:'radial-gradient(circle at 30% 30%, #FFD75A 0%, #D4A017 60%, #A07B0E 100%)',
        boxShadow:'0 2px 4px rgba(0,0,0,0.3)',
      }} />
      <div style={{
        position:'absolute', top:-6, right:20,
        width:14, height:14, borderRadius:'50%',
        background:'radial-gradient(circle at 30% 30%, #FFD75A 0%, #D4A017 60%, #A07B0E 100%)',
        boxShadow:'0 2px 4px rgba(0,0,0,0.3)',
      }} />

      {/* 3 rouleaux */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
        {reelStates.map((r, i) => <SlotReel key={i} state={r} />)}
      </div>
    </div>
  );
}

function SlotReel({ state }){
  const reelStyle = {
    background:'linear-gradient(180deg, #FFD24D 0%, #E8B81B 50%, #C99607 100%)',
    borderRadius:12,
    aspectRatio:'1',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:38,
    boxShadow: state.isJackpot
      ? 'inset 0 -3px 0 rgba(0,0,0,0.18), inset 0 2px 0 rgba(255, 235, 150, 0.5), 0 0 50px rgba(255, 215, 90, 1), 0 0 80px rgba(212, 160, 23, 0.8)'
      : state.isWinner
        ? 'inset 0 -3px 0 rgba(0,0,0,0.18), inset 0 2px 0 rgba(255, 235, 150, 0.5), 0 0 24px rgba(212, 160, 23, 0.9), 0 0 40px rgba(212, 160, 23, 0.5), 0 4px 8px rgba(0,0,0,0.15)'
        : 'inset 0 -3px 0 rgba(0,0,0,0.18), inset 0 2px 0 rgba(255, 235, 150, 0.5), 0 4px 8px rgba(0,0,0,0.15)',
    position:'relative',
    overflow:'hidden',
    border:'1.5px solid #A07B0E',
    animation: state.isJackpot
      ? 'slotReelJackpot 0.3s ease-in-out infinite alternate'
      : state.isWinner
        ? 'slotReelWinner 0.5s ease-out infinite alternate'
        : 'none',
  };
  const symbolStyle = {
    animation: state.spinning
      ? 'slotReelSpin 0.06s linear infinite'
      : state.stopping
        ? 'slotReelStop 0.5s cubic-bezier(0.25, 0.1, 0.25, 1.5)'
        : 'none',
  };
  return (
    <div style={reelStyle}>
      <div style={symbolStyle}>{state.symbol}</div>
    </div>
  );
}

function SlotToast({ message, type }){
  const isBigWin = type === 'big-win';
  return (
    <div style={{
      background: isBigWin
        ? 'linear-gradient(135deg, #C17F3C, #A57021)'
        : 'linear-gradient(135deg, #D4A017, #C17F3C)',
      color:'white',
      padding: isBigWin ? '10px 20px' : '8px 16px',
      borderRadius:100,
      fontSize: isBigWin ? 14 : 13,
      fontWeight:800,
      boxShadow: isBigWin
        ? '0 6px 16px rgba(193, 127, 60, 0.5)'
        : '0 4px 12px rgba(212, 160, 23, 0.4)',
      whiteSpace:'nowrap',
      animation:'slotToastSlide 2s ease-out forwards',
    }}>{message}</div>
  );
}

function PayoutTable({ C }){
  const ROWS = [
    { count:'3×', symbol:'7️⃣', name:'Jackpot',   prob:'0,05 %', gain:'+750 🍪', isJackpot:true },
    { count:'3×', symbol:'💎', name:'Diamant',   prob:'0,2 %',  gain:'+250 🍪' },
    { count:'3×', symbol:'☕', name:'Café',      prob:'0,3 %',  gain:'+150 🍪' },
    { count:'3×', symbol:'🥐', name:'Croissant', prob:'1,6 %',  gain:'+80 🍪' },
    { count:'3×', symbol:'🍪', name:'Cookie',    prob:'6,4 %',  gain:'+50 🍪' },
  ];
  const rowStyle = {
    display:'grid', gridTemplateColumns:'60px 1fr 60px 70px',
    alignItems:'center', padding:'6px 0',
    fontSize:12, borderBottom:`1px dashed ${C?.border || '#E8DDD0'}`,
  };
  return (
    <div style={{
      background: C?.card || 'white', borderRadius:16, padding:14,
      border:`1.5px solid ${C?.border || '#E8DDD0'}`,
      boxShadow:'0 2px 8px rgba(76, 44, 23, 0.06)',
      width:'100%', maxWidth:320,
    }}>
      <div style={{
        fontSize:11, fontWeight:800, color: C?.muted || '#8B6A5A',
        textTransform:'uppercase', letterSpacing:2,
        textAlign:'center', marginBottom:12,
      }}>💰 Combinaisons & gains</div>

      {ROWS.map((row, i) => (
        <div key={i} style={{
          ...rowStyle,
          background: row.isJackpot
            ? 'linear-gradient(90deg, rgba(212, 160, 23, 0.15), rgba(193, 127, 60, 0.05))'
            : 'transparent',
          borderRadius: row.isJackpot ? 8 : 0,
          padding: row.isJackpot ? '6px 8px' : '6px 0',
          margin: row.isJackpot ? '-2px -4px' : 0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:1 }}>
            <span style={{ fontSize:11, color: C?.muted || '#8B6A5A', fontWeight:700 }}>{row.count}</span>
            <span style={{ fontSize:16 }}>{row.symbol}</span>
          </div>
          <div style={{ fontSize:12, color: C?.text || '#2C1810', fontWeight:700 }}>{row.name}</div>
          <div style={{ fontSize:11, color: C?.muted || '#8B6A5A', textAlign:'right' }}>{row.prob}</div>
          <div style={{
            fontSize:13,
            color: row.isJackpot ? '#C17F3C' : '#D4A017',
            fontWeight: row.isJackpot ? 900 : 800,
            textAlign:'right',
          }}>{row.gain}</div>
        </div>
      ))}

      <div style={{ height:1, background: C?.border || '#E8DDD0', margin:'6px 0' }} />

      <div style={{ ...rowStyle, borderBottom:`1px dashed ${C?.border || '#E8DDD0'}` }}>
        <div></div>
        <div style={{ fontSize:12, color: C?.text || '#2C1810', fontWeight:700 }}>2 identiques</div>
        <div style={{ fontSize:11, color: C?.muted || '#8B6A5A', textAlign:'right' }}>54 %</div>
        <div style={{ fontSize:13, color:'#D4A017', fontWeight:800, textAlign:'right' }}>+25 🍪</div>
      </div>

      <div style={{ ...rowStyle, borderBottom:'none' }}>
        <div></div>
        <div style={{ fontSize:12, color: C?.text || '#2C1810', fontWeight:700 }}>Aucun match</div>
        <div style={{ fontSize:11, color: C?.muted || '#8B6A5A', textAlign:'right' }}>37 %</div>
        <div style={{ fontSize:13, color: C?.muted || '#8B6A5A', fontWeight:800, textAlign:'right' }}>0</div>
      </div>
    </div>
  );
}

function JackpotModal({ amount, onClose }){
  return (
    <div style={{
      position:'fixed', inset:0,
      background:'rgba(45, 22, 8, 0.85)',
      backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:1000, padding:20,
      animation:'slotJackpotFadeIn 0.4s ease-out',
    }}>
      <div style={{
        background:'linear-gradient(140deg, #D4A017 0%, #C17F3C 100%)',
        borderRadius:24, padding:'32px 28px',
        maxWidth:320, width:'100%',
        textAlign:'center', color:'white',
        boxShadow:'0 20px 60px rgba(212, 160, 23, 0.6)',
        border:'3px solid #FFD75A',
        animation:'slotJackpotPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        position:'relative',
      }}>
        <div style={{
          fontSize:64, marginBottom:8,
          animation:'slotJackpotBounce 0.5s ease-in-out infinite alternate',
        }}>🎰</div>
        <div style={{
          fontSize:11, fontWeight:800, letterSpacing:4,
          textTransform:'uppercase', color:'rgba(255, 255, 255, 0.85)',
        }}>✨ Jackpot ✨</div>
        <div style={{
          fontSize:32, fontWeight:900, margin:'6px 0 4px',
          textShadow:'0 2px 8px rgba(0,0,0,0.3)',
        }}>INCROYABLE !</div>
        <div style={{
          background:'rgba(0,0,0,0.2)',
          borderRadius:14, padding:'10px 20px',
          fontSize:24, fontWeight:900,
          margin:'14px 0', display:'inline-block',
        }}>+{amount} 🍪</div>
        <button
          onClick={onClose}
          style={{
            background:'white', color:'#D4A017',
            border:'none', borderRadius:14,
            padding:'12px 32px',
            fontSize:14, fontWeight:900,
            cursor:'pointer', width:'100%', marginTop:8,
            textTransform:'uppercase', letterSpacing:1,
          }}
        >Encaisser</button>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { COOKIE_SKINS, GOLD } from "../../data/themes.js";
import { PremiumCookie } from "../cookies/PremiumCookie.jsx";
import { SkinnedCookie } from "../cookies/SkinnedCookie.jsx";
import { ClickTracker } from "../../lib/antiCheat.js";
import { playSound } from "../../lib/audio.js";

/* ════════════════════════════════════════════════════
   ClickGame — défi de clics (refonte 12/05/2026)
   ────────────────────────────────────────────────────
   - COST = 5 🍪 par partie · cap 100 essais/jour (recharge 2 ☕)
   - RÈGLE : 2 clics = 1 🍪 (rewardPerClick = 0.5)
   - PAS DE CAP COOKIES sur la partie — l'auto-cheat est borné via
     l'anticheat (15 CPS × durée mode).
   - 3 MODES sélectionnables avant chaque partie :
     · Normal       — 5 s · 2 clics = 1 🍪
     · Rapide       — 3 s · 2 clics = 1 🍪 (court intense)
     · Frénétique   — 8 s · 2 clics = 1 🍪 · cookie qui bouge

   Anti auto-clicker — délégué au ClickTracker refondu (12/05/2026) :
   - isTrusted check (filtre les events synthétiques JS)
   - Cap glissant 15 CPS
   - Variance de coordonnées (auto-clic stationnaire)
   - Pattern bot (intervalle régulier serré)
   - Visibility check (page en arrière-plan)
   - Score max 300 clics/partie
   Les clics rejetés ne sont pas comptés ni animés.

   Sync timer ↔ barre : tick toutes les 100 ms (timeLeft float),
   barre sans transition CSS → barre et compteur restent toujours
   alignés visuellement.
═══════════════════════════════════════════════════════ */

export const CLICK_COST = 5;
/* Conservé pour rétro-compat des imports existants (le mode actif
   définit la vraie durée à l'exécution). */
export const CLICK_DURATION = 5;

/* 🥚 EASTER EGG : 0.2% par tap (passé les checks anti-cheat) → bonus
   +50 🍪 instant + flash doré sur le cookie + particule géante. Mythique
   à trouver sans le savoir. */
const GOLDEN_TAP_CHANCE = 0.002;
const GOLDEN_TAP_REWARD = 50;

const MODES = {
  normal:     { label:'Normal',     emoji:'☕', desc:'5 s · 2 clics = 1 🍪',                                       duration:5, rewardPerClick:0.5, moves:false, moveIntervalMs:0,    cookieSize:'88%', moveRange:[50,50] },
  rapide:     { label:'Rapide',     emoji:'⚡', desc:'3 s · 2 clics = 1 🍪 (court intense)',                       duration:3, rewardPerClick:0.5, moves:false, moveIntervalMs:0,    cookieSize:'88%', moveRange:[50,50] },
  frenetique: { label:'Frénétique', emoji:'🌀', desc:'8 s · 1 clic = 1 🍪 · cookie petit + bouge vite (×2 reward)', duration:8, rewardPerClick:1.0, moves:true,  moveIntervalMs:700,  cookieSize:'35%', moveRange:[15,85] },
};

export function ClickGame({ coins, bestScore, onEarn, onSpend, onUpdateRecord, onEventChallenge, activeSkin, C }) {
  const hasCustomSkin = !!(activeSkin && COOKIE_SKINS[activeSkin] && activeSkin !== '');
  const skin = COOKIE_SKINS[activeSkin] || COOKIE_SKINS[''];

  const [mode,          setMode]          = useState('normal');
  const modeCfg = MODES[mode] || MODES.normal;

  /* Popup prévention anti-triche — pop ONE-SHOT au 1er accès du jeu
     après la MAJ du 12/05/2026. Sert de signal dissuasif : informer
     les joueurs que les autoclickers sont détectés. Flag LS pour
     ne pas re-pop ensuite. */
  const [showAntiCheatNotice, setShowAntiCheatNotice] = useState(() => {
    try{ return localStorage.getItem('cookiminer:antiCheatNoticeV1') !== '1'; }catch{ return false; }
  });
  const dismissAntiCheatNotice = () => {
    setShowAntiCheatNotice(false);
    try{ localStorage.setItem('cookiminer:antiCheatNoticeV1', '1'); }catch{}
  };

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
  /* 🥚 Flash doré du cookie quand l'easter egg "Cookie Doré" se déclenche.
     Bool 700ms — visuel : saturation + glow doré + scale léger. */
  const [goldenFlash,   setGoldenFlash]   = useState(false);

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

    /* Score fiable : `clicks` validés via tracker (max 300). */
    const finalClicks = trackerRef.current ? trackerRef.current.getValidScore() : clickRef.current;
    /* Reward final = floor(rewardRef accumulé). Plus de cap par mode —
       l'anticheat borne naturellement (15 CPS max × durée). */
    const earned = Math.max(0, Math.floor(rewardRef.current));
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
        /* Timer principal — tick 100 ms avec timeLeft float pour que la
           barre de progression et le compteur de secondes restent
           parfaitement synchronisés visuellement. */
        timerRef.current = setInterval(()=>{
          setTimeLeft(t=>{
            const next = +(t - 0.1).toFixed(2);
            if(next <= 0){
              clearInterval(timerRef.current);
              endGame();
              return 0;
            }
            return next;
          });
        }, 100);
        /* Mode frénétique : déplace le cookie selon moveIntervalMs.
           range = [min, max] en % du conteneur (centre du cookie). */
        const cfg = MODES[modeRef.current];
        if(cfg.moves && cfg.moveIntervalMs > 0){
          const [rMin, rMax] = cfg.moveRange || [30, 70];
          const span = rMax - rMin;
          cookieMoveRef.current = setInterval(() => {
            if(phaseRef.current !== 'playing') return;
            setCookiePos({
              x: rMin + Math.random() * span,
              y: rMin + Math.random() * span,
            });
          }, cfg.moveIntervalMs);
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

    /* Délégation au ClickTracker refondu (12/05/2026) — on passe
       l'event pour activer les vérifs isTrusted + coords. Si rejeté
       et de la triche, on affiche un warning éphémère. */
    const result = trackerRef.current.registerClick(e);
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
    const newClickCount = clickRef.current + 1;
    clickRef.current = newClickCount;
    setClicks(newClickCount);
    setPressed(true);
    setTimeout(()=>setPressed(false), 80);

    /* 🥚 EASTER EGG Cookie Doré — 0.2% par tap. Bonus +50 🍪 instant,
       flash doré sur le cookie + particule géante + son jackpot. Si
       déclenché, on bypass l'incrément normal pour que la particule
       géante ne soit pas écrasée par une petite "+1 🍪". */
    if(Math.random() < GOLDEN_TAP_CHANCE){
      rewardRef.current = rewardRef.current + GOLDEN_TAP_REWARD;
      setRewardScore(rewardRef.current);
      const id = now + Math.random();
      const tx = (Math.random() - 0.5) * 40;
      setParticles(p => [...p, {
        id, tx,
        label: `🌟 +${GOLDEN_TAP_REWARD} 🍪 BONUS`,
        mul: 3,  /* déclenche le rendu "gros + doré saturé" — voir map plus bas */
      }]);
      setTimeout(()=>setParticles(p => p.filter(x => x.id !== id)), 1200);
      playSound('jackpot');
      setGoldenFlash(true);
      setTimeout(() => setGoldenFlash(false), 700);
      /* Ring chaud (doré clair) pour souligner */
      const rid = now + Math.random();
      setRings(r => [...r, { id: rid, hot: true }]);
      setTimeout(()=>setRings(r => r.filter(x => x.id !== rid)), 550);
      return;
    }

    /* Accumule rewardPerClick (0.5 ou 1.0 selon mode). On affiche
       une particule uniquement quand le floor() augmente — adaptatif
       au reward par clic : 2-clics-pour-1🍪 (normal/rapide) → 1 particule
       tous les 2 clics ; 1-clic-pour-1🍪 (frénétique) → 1 particule
       chaque clic. */
    const delta = modeCfg.rewardPerClick;
    const prevFloor = Math.floor(rewardRef.current);
    rewardRef.current = rewardRef.current + delta;
    setRewardScore(rewardRef.current);
    const newFloor = Math.floor(rewardRef.current);
    const gained = newFloor - prevFloor;
    if(gained > 0){
      const id = now + Math.random();
      const tx = (Math.random() - 0.5) * 80;
      setParticles(p => [...p, { id, tx, label: `+${gained} 🍪`, mul: 1 }]);
      setTimeout(()=>setParticles(p => p.filter(x => x.id !== id)), 800);
    }

    /* Ring (doré normal) à chaque clic — feedback visuel constant. */
    const rid = now + Math.random();
    setRings(r => [...r, { id: rid, hot: false }]);
    setTimeout(()=>setRings(r => r.filter(x => x.id !== rid)), 550);
  };


  const urgentTime = phase === 'playing' && timeLeft <= 3;
  const timeColor  = urgentTime ? '#6B3D20' : C.text;
  /* Display arrondi vers le HAUT — au tick 5.0 on voit "5", à 4.9 on voit
     toujours "5", on tombe à "4" exactement quand timeLeft passe sous 4.0.
     → barre et compteur affichent la même seconde. */
  const timeDisplay = phase === 'playing' ? Math.ceil(timeLeft) : Math.round(timeLeft);

  /* Bouton central */
  const canPlay = coins >= CLICK_COST;
  const btnLabel =
    phase === 'idle'      ? `Commencer (${CLICK_COST} 🍪)`
  : phase === 'countdown' ? '...'
  : phase === 'playing'   ? '🍪 Tape !'
  :                         `Rejouer (${CLICK_COST} 🍪)`;

  /* Bannière de fin */
  const earnedFinal = Math.max(0, Math.floor(rewardRef.current));
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

      {/* POPUP PRÉVENTION ANTI-TRICHE (one-shot, LS flag) */}
      {showAntiCheatNotice && (
        <div
          role="alertdialog"
          onClick={dismissAntiCheatNotice}
          style={{
            position:'fixed', inset:0, zIndex:9000,
            background:'rgba(15,8,4,.78)',
            backdropFilter:'blur(8px)',
            WebkitBackdropFilter:'blur(8px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            padding:'24px',
            animation:'inboxOverlayIn .25s ease-out both',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width:'100%', maxWidth:340,
              background:'linear-gradient(180deg,#2A1408 0%,#1A0A04 100%)',
              borderRadius:20,
              padding:'22px 20px 18px',
              textAlign:'center',
              boxShadow:'0 16px 40px rgba(0,0,0,.5)',
              border:'1px solid rgba(212,160,23,.35)',
              animation:'bounceIn .5s cubic-bezier(.36,.07,.19,.97) both',
              color:'#F0E6D3',
            }}
          >
            <div style={{ fontSize:38, lineHeight:1, marginBottom:8 }}>🛡️</div>
            <div style={{
              fontSize:11, letterSpacing:3, textTransform:'uppercase',
              fontWeight:800, color:'#D4A017', marginBottom:6,
            }}>
              Anti-triche actif
            </div>
            <div style={{
              fontSize:17, fontWeight:900, color:'#FFE8A8',
              marginBottom:12, lineHeight:1.25,
            }}>
              Pas d'autoclicker ici 🚫
            </div>
            <div style={{
              fontSize:13, color:'#A88B70', lineHeight:1.55, marginBottom:18,
            }}>
              Les logiciels d'auto-clic et les scripts sont <strong style={{ color:'#FFE8A8' }}>détectés et bloqués</strong>.
              Tape normalement avec ton doigt ou ta souris — c'est jouable jusqu'à <strong style={{ color:'#FFE8A8' }}>~20 clics/sec</strong> à la main.
            </div>
            <button
              onClick={dismissAntiCheatNotice}
              style={{
                width:'100%', padding:'12px 20px',
                background:GOLD, color:'#fff',
                border:'none', borderRadius:12,
                fontSize:14, fontWeight:800, letterSpacing:.3,
                cursor:'pointer',
                boxShadow:'0 4px 14px rgba(212,160,23,.4)',
                touchAction:'manipulation',
              }}
            >
              OK, j'ai compris
            </button>
          </div>
        </div>
      )}

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
          <div style={{ fontSize:22, fontWeight:900, color: timeColor, letterSpacing:'-.5px', lineHeight:1.1 }}>{timeDisplay}<span style={{ fontSize:13, color:C.muted, fontWeight:700 }}>s</span></div>
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

      {/* Barre de temps — sync absolu avec le compteur de secondes.
          Tick state toutes les 100 ms (timeLeft float) → la largeur
          rerender en continu sans CSS transition (qui causait avant
          un décalage visuel entre la barre et le chiffre). */}
      <div style={{ width:'100%', maxWidth:360, height:6, borderRadius:3, background:C.card2, overflow:'hidden', border:`1px solid ${C.border}` }}>
        <div style={{
          height:'100%', borderRadius:3,
          width: `${Math.max(0, Math.min(100, (timeLeft / modeCfg.duration) * 100))}%`,
          background: urgentTime
            ? 'linear-gradient(90deg, #4A2C17, #6B3D20)'
            : 'linear-gradient(90deg, #C17F3C, #D4A017)',
          transition: 'background .3s',
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
            width: modeCfg.cookieSize || (modeCfg.moves ? '55%' : '88%'),
            height: modeCfg.cookieSize || (modeCfg.moves ? '55%' : '88%'),
            zIndex:2,
            cursor: phase==='playing' ? 'pointer' : 'default',
            touchAction:'manipulation',
            transition: pressed
              ? 'transform .05s ease, top .4s ease, left .4s ease'
              : 'transform .15s cubic-bezier(.36,.07,.19,.97), top .4s ease, left .4s ease',
            filter: phase === 'done'
              ? 'grayscale(.4) brightness(.85)'
              : goldenFlash
                ? 'saturate(2.2) brightness(1.35) drop-shadow(0 0 28px #FFE066) drop-shadow(0 0 14px #FFD700)'
                : 'none',
            willChange:'transform, top, left, filter',
            animation: (phase==='idle' || phase==='done') ? 'idle 3s ease-in-out infinite' : 'none'
          }}
        >
          {hasCustomSkin
            ? <SkinnedCookie skin={skin} />
            : <PremiumCookie />}
        </div>

        {/* Particules reward (montant variable selon mode + combo).
            mul=3 → easter egg "Cookie Doré" : taille géante + halo doré. */}
        {particles.map(p => {
          const isGolden = p.mul === 3;
          return (
            <div
              key={p.id}
              style={{
                position:'absolute', top:'50%', left:'50%',
                fontSize: isGolden ? 24 : (p.mul && p.mul > 1 ? 20 : 16),
                fontWeight:900,
                color: isGolden ? '#FFE066' : (p.mul && p.mul > 1 ? '#FFD24D' : '#D4A017'),
                pointerEvents:'none', zIndex:5,
                animation: isGolden
                  ? 'floatUpClick 1.2s ease-out forwards'
                  : 'floatUpClick .8s ease-out forwards',
                textShadow: isGolden
                  ? '0 0 14px rgba(255,215,0,.85), 0 2px 4px rgba(0,0,0,.5)'
                  : '0 1px 3px rgba(0,0,0,.3)',
                whiteSpace: isGolden ? 'nowrap' : 'normal',
                ['--tx']: `${p.tx}px`,
              }}
            >{p.label || '+1 🍪'}</div>
          );
        })}

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

      {/* Tip card — texte adapté au reward du mode actif */}
      <div style={{ width:'100%', maxWidth:360, padding:'10px 14px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center' }}>
        💡 Tape vite : <strong style={{ color:'#D4A017' }}>{modeCfg.rewardPerClick >= 1 ? '1 clic = 1 🍪' : '2 clics = 1 🍪'}</strong> — pas de cap, tape jusqu'à la fin
      </div>
    </div>
  );
}

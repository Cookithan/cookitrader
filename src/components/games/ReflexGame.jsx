import { useEffect, useRef, useState } from "react";
import { GOLD } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   ReflexGame — Réflexes café (PHASE 6D)
   ────────────────────────────────────────────────────
   Un cookie apparaît à un endroit aléatoire (zone 3/4 supérieurs de
   l'aire de jeu). Le joueur doit le tapper avant qu'il disparaisse.

   - COST     = 5 cookies
   - DURATION = 30 secondes
   - TTL du cookie : 1500ms au début → 500ms à la fin (linéaire)
   - Phases : idle → countdown (3-2-1-GO) → playing (30s) → done
   - Loupé (timeout sans tap) → score -= 1 (jamais négatif), shake bref
     de la zone, puis nouveau cookie 200ms après
   - Tapé → score += 1, explosion de 5-7 mini-cookies, nouveau cookie
     150ms après

   Récompenses :
     25+ tapés → +50 cookies
     15–24     → +25
     5–14      → +10
     0–4       → 0

   On utilise scoreRef en parallèle de setScore : les setTimeout/
   setInterval lisent toujours la dernière valeur sans dépendre des
   closures (sinon on peut décrémenter par rapport à un score périmé).

   Props : coins, onEarn, onSpend, C
═══════════════════════════════════════════════════════ */

export const REFLEX_COST = 5;
export const REFLEX_DURATION = 15;          // secondes
const TTL_START_MS = 1500;
const TTL_END_MS   = 500;
const RESPAWN_HIT_MS  = 150;
const RESPAWN_MISS_MS = 220;

/* Paliers calibrés pour une partie de 15s */
function rewardFor(score){
  if(score >= 15) return 50;
  if(score >= 10) return 25;
  if(score >= 5)  return 10;
  return 0;
}

export function ReflexGame({ coins, onEarn, onSpend, C }){
  const [phase,         setPhase]         = useState('idle');     // idle | countdown | playing | done
  const [score,         setScore]         = useState(0);
  const [timeLeft,      setTimeLeft]      = useState(REFLEX_DURATION);
  const [countdownVal,  setCountdownVal]  = useState(null);
  const [cookie,        setCookie]        = useState(null);        // { id, x, y, ttl } | null
  const [particles,     setParticles]     = useState([]);          // explosions sur tap
  const [shaking,       setShaking]       = useState(false);       // miss feedback
  const [combo,         setCombo]         = useState(0);            // étape 4 : incrémenté sur tap, reset sur miss
  const [comboBadge,    setComboBadge]    = useState(null);         // { text, key } — étape 4

  const scoreRef     = useRef(0);
  const timeRef      = useRef(null);
  const countRef     = useRef(null);
  const cookieTORef  = useRef(null);                                // setTimeout du cookie courant
  const respawnRef   = useRef(null);
  const startTimeRef = useRef(0);
  const phaseRef     = useRef('idle');
  const particlesRef = useRef(null);                                // rempli à l'étape 5 (particules au tap)

  /* phaseRef : on en a besoin dans les callbacks asynchrones, sinon
     on peut spawn un cookie après endGame(). */
  useEffect(()=>{ phaseRef.current = phase; }, [phase]);

  /* Cleanup intégral */
  useEffect(()=>()=>{
    if(timeRef.current)     clearInterval(timeRef.current);
    if(countRef.current)    clearInterval(countRef.current);
    if(cookieTORef.current) clearTimeout(cookieTORef.current);
    if(respawnRef.current)  clearTimeout(respawnRef.current);
  }, []);

  /* Calcule un cookie aléatoire : position dans la zone 3/4 supérieurs,
     TTL interpolé linéairement entre TTL_START et TTL_END. */
  const newCookie = () => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const ratio   = Math.min(1, elapsed / REFLEX_DURATION);
    const ttl     = TTL_START_MS - ratio * (TTL_START_MS - TTL_END_MS);
    return {
      id: Date.now() + Math.random(),
      x:  8 + Math.random() * 72,    // % : marges 8% gauche / droite
      y:  6 + Math.random() * 64,    // % : zone supérieure (max 70%)
      ttl,
    };
  };

  const spawn = () => {
    if(phaseRef.current !== 'playing') return;
    const c = newCookie();
    setCookie(c);
    cookieTORef.current = setTimeout(()=>{
      /* Miss : décrémente le score (min 0), shake bref */
      const dropped = Math.max(0, scoreRef.current - 1);
      scoreRef.current = dropped;
      setScore(dropped);
      setShaking(true);
      setTimeout(()=>setShaking(false), 240);
      setCookie(null);
      respawnRef.current = setTimeout(spawn, RESPAWN_MISS_MS);
    }, c.ttl);
  };

  const endGame = () => {
    phaseRef.current = 'done';
    if(cookieTORef.current) clearTimeout(cookieTORef.current);
    if(respawnRef.current)  clearTimeout(respawnRef.current);
    setCookie(null);
    setPhase('done');
    const earned = rewardFor(scoreRef.current);
    if(earned > 0) onEarn(earned);
  };

  const startGame = () => {
    if(coins < REFLEX_COST) return;
    onSpend(REFLEX_COST);
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(REFLEX_DURATION);
    setParticles([]);
    setShaking(false);
    setPhase('countdown');
    phaseRef.current = 'countdown';

    let n = 3;
    setCountdownVal(n);
    countRef.current = setInterval(()=>{
      n--;
      if(n > 0) setCountdownVal(n);
      else if(n === 0) setCountdownVal('GO');
      else {
        clearInterval(countRef.current);
        setCountdownVal(null);
        setPhase('playing');
        phaseRef.current = 'playing';
        startTimeRef.current = Date.now();
        spawn();
        timeRef.current = setInterval(()=>{
          setTimeLeft(t => {
            if(t <= 1){
              clearInterval(timeRef.current);
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
    setPhase('idle');
    phaseRef.current = 'idle';
    setScore(0); scoreRef.current = 0;
    setTimeLeft(REFLEX_DURATION);
    setCookie(null);
    setParticles([]);
  };

  const handleTap = (e) => {
    if(phase !== 'playing' || !cookie) return;
    if(e && e.preventDefault) e.preventDefault();
    if(cookieTORef.current) clearTimeout(cookieTORef.current);

    const newScore = scoreRef.current + 1;
    scoreRef.current = newScore;
    setScore(newScore);

    /* Explosion : 5-7 mini-cookies depuis la position du cookie */
    const baseId = Date.now();
    const count  = 5 + Math.floor(Math.random() * 3);
    const pieces = Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - .5) * .5;
      const dist  = 50 + Math.random() * 40;
      return {
        id: baseId + i,
        x:  cookie.x,
        y:  cookie.y,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
      };
    });
    setParticles(p => [...p, ...pieces]);
    setTimeout(()=>{
      setParticles(p => p.filter(x => !pieces.some(pp => pp.id === x.id)));
    }, 900);

    setCookie(null);
    respawnRef.current = setTimeout(spawn, RESPAWN_HIT_MS);
  };

  const canPlay = coins >= REFLEX_COST;
  const urgentTime = phase === 'playing' && timeLeft <= 5;

  const btnLabel =
      phase === 'idle'      ? `Commencer (${REFLEX_COST} 🍪)`
    : phase === 'countdown' ? '...'
    : phase === 'playing'   ? '🍪'
    :                         `Rejouer (${REFLEX_COST} 🍪)`;

  /* Bannière de fin */
  const earnedFinal = rewardFor(score);
  const banner = phase === 'done'
    ? (score >= 15
        ? { bg:'linear-gradient(135deg,#F5DC8A,#D4A017)', col:'#5D3A1F', border:'#D4A017', title:`🏆 ${score} cookies !` }
        : score >= 10
          ? { bg:'linear-gradient(135deg,#FBEFD4,#F0C050)', col:'#5D3A1F', border:'#D4A017', title:`Bien joué ! ${score} cookies` }
          : score >= 5
            ? { bg:'linear-gradient(135deg,#FBEFD4,#E5CDA8)', col:'#5D3A1F', border:'#C8A878', title:`${score} cookies` }
            : { bg:'linear-gradient(135deg,#5A3520,#3D2010)', col:'#F0E0C0', border:'#3D2010', title:`${score} cookies — pas de récompense` })
    : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, paddingTop:6, position:'relative' }}>

      {/* 2 cartes stats */}
      <div style={{ display:'flex', gap:8, width:'100%', maxWidth:360 }}>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${phase==='playing'?'#D4A017':C.border}`, textAlign:'center' }}>
          <div style={{ fontSize:11 }}>🍪</div>
          <div style={{ fontSize:22, fontWeight:900, color: phase==='playing'?'#D4A017':C.text, lineHeight:1.1 }}>{score}</div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Tapés</div>
        </div>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${urgentTime?'#6B3D20':C.border}`, textAlign:'center', animation: urgentTime ? 'shake .25s ease-in-out infinite' : 'none' }}>
          <div style={{ fontSize:11 }}>⏱️</div>
          <div style={{ fontSize:22, fontWeight:900, color: urgentTime ? '#6B3D20' : C.text, lineHeight:1.1 }}>{timeLeft}<span style={{ fontSize:13, color:C.muted, fontWeight:700 }}>s</span></div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Temps</div>
        </div>
      </div>

      {/* Barre de temps */}
      <div style={{ width:'100%', maxWidth:360, height:6, borderRadius:3, background:C.card2, overflow:'hidden', border:`1px solid ${C.border}` }}>
        <div style={{
          height:'100%', borderRadius:3,
          width: `${(timeLeft / REFLEX_DURATION) * 100}%`,
          background: urgentTime
            ? 'linear-gradient(90deg,#4A2C17,#6B3D20)'
            : 'linear-gradient(90deg,#C17F3C,#D4A017)',
          transition:'width 1s linear, background .3s',
        }} />
      </div>

      {/* Aire de jeu — table en bois POV (refonte visuelle) */}
      <div
        className="reflex-arena"
        style={{
          maxWidth:360,
          touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
          animation: shaking ? 'shake .25s ease-in-out' : undefined,
        }}
      >
        {/* Fond table en bois + grain + planches */}
        <div className="rx-arena-bg" />

        {/* Nœuds de bois décoratifs */}
        <div className="rx-knot rx-k1" />
        <div className="rx-knot rx-k2" />
        <div className="rx-knot rx-k3" />

        {/* Halo lumineux au centre */}
        <div className="rx-light-spot" />

        {/* Compteur combo (haut gauche) — affiché en permanence pendant la partie */}
        {(phase === 'playing' || phase === 'countdown') && (
          <div className="rx-combo-counter">
            🔥 Combo : <span className="num">{combo}</span>
          </div>
        )}

        {/* Badge combo (haut droite, pop éphémère) */}
        {comboBadge && (
          <div className="rx-combo-badge" key={comboBadge.key}>
            {comboBadge.text}
          </div>
        )}

        {/* Overlay countdown */}
        {phase === 'countdown' && countdownVal !== null && (
          <div
            key={String(countdownVal)}
            style={{
              position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: countdownVal === 'GO' ? 64 : 96,
              fontWeight:900,
              color: countdownVal === 'GO' ? '#C8960C' : '#D4A017',
              letterSpacing:'-2px', zIndex:8, pointerEvents:'none',
              animation:'countdown .8s ease-out forwards',
              textShadow:'0 4px 18px rgba(212,160,23,.5)',
            }}
          >
            {countdownVal === 'GO' ? 'GO !' : countdownVal}
          </div>
        )}

        {/* Cookie cible — étape 1+2 : placeholder emoji ; étape 3 : SVG premium */}
        {phase === 'playing' && cookie && (
          <div
            key={cookie.id}
            className="rx-cookie"
            onPointerDown={handleTap}
            style={{ left:`${cookie.x}%`, top:`${cookie.y}%` }}
          >
            <span style={{ fontSize:46, lineHeight:'70px', display:'block', textAlign:'center' }}>🍪</span>
          </div>
        )}

        {/* Indication idle */}
        {phase === 'idle' && (
          <div style={{
            position:'absolute', inset:0, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', gap:8, color:'rgba(255,235,200,.85)',
            fontSize:13, fontWeight:700, letterSpacing:.4, pointerEvents:'none',
            zIndex:3, textShadow:'0 2px 6px rgba(0,0,0,.4)',
          }}>
            <span style={{ fontSize:38 }}>👀</span>
            <span>Sois prêt à tapoter !</span>
          </div>
        )}

        {/* Couche particules (vide pour l'instant — étape 5) */}
        <div ref={particlesRef} className="rx-particles-layer" />
      </div>

      {/* Texte d'instruction */}
      <div style={{ minHeight:18, fontSize:13, fontWeight:600, color: phase==='playing' ? '#D4A017' : C.muted, fontStyle: phase==='playing'?'normal':'italic', textAlign:'center' }}>
        {phase === 'idle'      && 'Tape les cookies avant qu\'ils disparaissent'}
        {phase === 'countdown' && 'Prépare-toi…'}
        {phase === 'playing'   && (shaking ? 'Loupé !' : 'Tape ! Tape !')}
        {phase === 'done'      && (score >= 5 ? 'Bien joué !' : 'Tu peux mieux faire')}
      </div>

      {/* Bannière résultat */}
      {banner && (
        <div style={{
          padding:'14px 22px', borderRadius:18,
          background: banner.bg, color: banner.col,
          border:`2px solid ${banner.border}`,
          boxShadow:'0 6px 20px rgba(74,44,23,.25)',
          textAlign:'center', minWidth:280,
          animation:'popIn .5s cubic-bezier(.36,.07,.19,.97) both',
        }}>
          <div style={{ fontSize:18, fontWeight:900, marginBottom:10, letterSpacing:.3 }}>{banner.title}</div>
          <div style={{ display:'flex', gap:14, justifyContent:'center' }}>
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>{score}</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Tapés</div>
            </div>
            <div style={{ width:1, background:'rgba(0,0,0,.15)' }} />
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>{(score / REFLEX_DURATION).toFixed(1)}</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Cookies/s</div>
            </div>
            <div style={{ width:1, background:'rgba(0,0,0,.15)' }} />
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>+{earnedFinal}</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Cookies</div>
            </div>
          </div>
        </div>
      )}

      {/* Bouton principal */}
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
        }}
      >
        {btnLabel}
      </button>

      {/* Tip card */}
      <div style={{ width:'100%', maxWidth:360, padding:'10px 14px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center' }}>
        💡 <strong style={{ color:'#D4A017' }}>15+ tapés = +50 🍪</strong> · 10-14 = +25 · 5-9 = +10 · ça s'accélère !
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { GOLD } from "../../data/themes.js";
import { playSound } from "../../lib/audio.js";

/* ════════════════════════════════════════════════════
   PourGame — "Stop le café" : maintiens le bouton, relâche au bon moment
   - FILL_RATE = 38 %/s
   - Zones :  90-99% → +6 🍪    (zone dorée)
              100-105% → +15 🍪 (parfait)
              >105%   → −5 🍪  (débordement, série remise à 0)
              <90%   → 0 🍪    (trop tôt, série remise à 0)
   - Boucle requestAnimationFrame avec dt réel pour un tick stable
═══════════════════════════════════════════════════════ */

const FILL_RATE = 38;     // % par seconde
const GOLD_MIN  = 90;
const PERFECT   = 100;
const OVERFLOW  = 105;

export function PourGame({ onEarn, onSpend, onEventChallenge, C }) {
  const [fillPct,     setFillPct]     = useState(0);
  const [holding,     setHolding]     = useState(false);
  const [gameOver,    setGameOver]    = useState(false);
  const [parfaits,    setParfaits]    = useState(0);
  const [totalPlayed, setTotalPlayed] = useState(0);
  const [result,      setResult]      = useState(null);   // { type:'win'|'perfect'|'lose', title, sub }
  const [feedback,    setFeedback]    = useState(null);   // { text, color, key }

  const holdingRef  = useRef(false);
  const gameOverRef = useRef(false);
  const rafRef      = useRef(null);
  const lastTimeRef = useRef(null);

  useEffect(()=>{ holdingRef.current  = holding;  }, [holding]);
  useEffect(()=>{ gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(()=>()=>{ if(rafRef.current) cancelAnimationFrame(rafRef.current); },[]);

  const showFeedback = (text, color) => {
    setFeedback({ text, color, key: Date.now() });
    setTimeout(()=>setFeedback(null), 900);
  };

  const reset = () => {
    setFillPct(0);
    setGameOver(false);
    setResult(null);
    lastTimeRef.current = null;
  };

  const resolveGame = (pct) => {
    if(gameOverRef.current) return;
    setGameOver(true); gameOverRef.current = true;
    setHolding(false); holdingRef.current = false;
    if(rafRef.current) cancelAnimationFrame(rafRef.current);

    setTotalPlayed(t => t + 1);

    if(pct > OVERFLOW){
      setParfaits(0);
      onSpend && onSpend(5);
      setResult({ type:'lose', title:'💧 Ça déborde !', sub:'-5 🍪 perdus' });
      showFeedback('-5 🍪', '#6B3D20');
      playSound('error');
    } else if(pct >= PERFECT){
      setParfaits(p => p + 1);
      onEarn(15);
      setResult({ type:'perfect', title:'⭐ Parfait absolu !', sub:'+15 🍪 gagnés' });
      showFeedback('+15 🍪', '#C8960C');
      playSound('success');
      /* Event 'pour_perfect' : succès si parfait absolu (zone PERFECT) */
      onEventChallenge?.('pour_perfect', 1);
    } else if(pct >= GOLD_MIN){
      setParfaits(p => p + 1);
      onEarn(6);
      setResult({ type:'win', title:'✦ Zone dorée !', sub:'+6 🍪 gagnés' });
      showFeedback('+6 🍪', '#D4A017');
      playSound('success');
    } else {
      setParfaits(0);
      setResult({ type:'lose', title:'Trop tôt...', sub:'Vise entre 90% et 100%' });
      playSound('error');
    }

    setTimeout(reset, 2200);
  };

  const tick = (ts) => {
    if(!lastTimeRef.current) lastTimeRef.current = ts;
    const dt = (ts - lastTimeRef.current) / 1000;
    lastTimeRef.current = ts;

    setFillPct(prev => {
      const next = Math.min(prev + FILL_RATE * dt, 108);
      if(next >= OVERFLOW){
        resolveGame(next);
        return next;
      }
      return next;
    });

    if(holdingRef.current && !gameOverRef.current){
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const startHold = () => {
    if(gameOverRef.current || holdingRef.current) return;
    setHolding(true); holdingRef.current = true;
    lastTimeRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopHold = () => {
    if(!holdingRef.current || gameOverRef.current) return;
    setHolding(false); holdingRef.current = false;
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    setFillPct(currentPct => {
      resolveGame(currentPct);
      return currentPct;
    });
  };

  /* zone & label (priorité débordement) */
  const getZone = (pct) => {
    if(pct > OVERFLOW) return 'overflow';
    if(pct >= PERFECT) return 'perfect';
    if(pct >= GOLD_MIN) return 'gold';
    return 'idle';
  };
  const getLabel = (pct) => {
    if(pct > OVERFLOW) return '💧 Ça déborde !';
    if(pct >= PERFECT)  return '★ Parfait ! Lâche maintenant !';
    if(pct >= GOLD_MIN) return '✦ Zone dorée — encore un peu...';
    return 'Maintiens pour verser le café';
  };
  const zone  = getZone(fillPct);
  const label = getLabel(fillPct);

  const zoneRingColor =
    zone === 'overflow' ? '#3D2010'
  : zone === 'perfect'  ? '#D4A017'
  : zone === 'gold'     ? '#C17F3C'
  :                       'transparent';
  const pctColor =
    zone === 'overflow' ? '#6B3D20'
  : zone === 'perfect'  ? '#C8960C'
  : zone === 'gold'     ? '#D4A017'
  :                       C.text;

  /* SVG : remplissage du café */
  const VB = 180;
  const maxH = 95;
  const h = (Math.min(fillPct, 105) / 105) * maxH;
  const y = 155 - h;

  /* Couleurs banner résultat */
  const bannerBg =
    result?.type === 'perfect' ? 'linear-gradient(135deg, #F5DC8A, #D4A017)'
  : result?.type === 'win'     ? 'linear-gradient(135deg, #FBEFD4, #F0C050)'
  : result?.type === 'lose'    ? 'linear-gradient(135deg, #5D3A1F, #2D1810)'
  :                              'transparent';
  const bannerCol =
    result?.type === 'lose' ? '#F0E0C0' : '#5D3A1F';
  const bannerBorder =
    result?.type === 'perfect' ? '#D4A017'
  : result?.type === 'win'     ? '#D4A017'
  : result?.type === 'lose'    ? '#3D2010'
  :                              'transparent';

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:18, paddingTop:6, position:'relative' }}>
      {/* Stats — 2 cartes côte à côte */}
      <div style={{ display:'flex', gap:10, width:'100%', maxWidth:340 }}>
        <div style={{ flex:1, padding:'12px 14px', borderRadius:14, background:C.card, border:`1.5px solid ${C.border}`, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ fontSize:24, fontWeight:900, color: pctColor, letterSpacing:'-.5px', transition:'color .25s' }}>
            {Math.round(fillPct)}<span style={{ fontSize:14, color:C.muted, fontWeight:700 }}>%</span>
          </div>
          <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginTop:2 }}>Niveau</div>
        </div>
        <div style={{ flex:1, padding:'12px 14px', borderRadius:14, background:C.card, border:`1.5px solid ${C.border}`, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:24, fontWeight:900, color: parfaits>0 ? '#D4A017' : C.text, letterSpacing:'-.5px' }}>
            {parfaits>0 && <span style={{ fontSize:18 }}>⭐</span>}{parfaits}
          </div>
          <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginTop:2 }}>Parfaits d'affilée</div>
        </div>
      </div>

      {/* Tasse SVG centrée 180×180 */}
      <div
        className={zone === 'perfect' ? 'perfect-pulse' : ''}
        style={{
          position:'relative', width:180, height:180,
          display:'flex', alignItems:'center', justifyContent:'center'
        }}
      >
        {/* Glow radial derrière la tasse */}
        <div style={{
          position:'absolute', inset:-20, borderRadius:'50%',
          background: zone === 'perfect'
            ? 'radial-gradient(circle, rgba(245,220,138,.55), transparent 70%)'
            : zone === 'gold'
              ? 'radial-gradient(circle, rgba(212,160,23,.35), transparent 70%)'
              : 'transparent',
          transition:'background .3s ease',
          pointerEvents:'none', zIndex:0,
          animation: zone==='perfect' ? 'glowRing 1.2s ease-in-out infinite' : 'none'
        }} />

        {/* Anneau coloré autour de la tasse */}
        <div style={{
          position:'absolute', inset:0, borderRadius:'50%',
          border: zone==='idle' ? `2px solid transparent` : `3px solid ${zoneRingColor}`,
          transition:'border-color .2s, border-width .2s',
          pointerEvents:'none', zIndex:1,
          boxShadow: zone === 'perfect' ? '0 0 24px rgba(212,160,23,.6) inset' : 'none'
        }} />

        {/* Sparkles "perfect" */}
        {zone === 'perfect' && (
          <>
            {[
              { top:-6,  left:'12%', d:0   },
              { top:8,   left:'88%', d:.2 },
              { top:80,  left:-6,    d:.4 },
              { top:120, left:'90%', d:.55 },
            ].map((p,i)=>(
              <span key={i} className="sparkle-anim" style={{ position:'absolute', top:p.top, left:p.left, fontSize:16, animationDelay:`${p.d}s`, pointerEvents:'none', zIndex:5, filter:'drop-shadow(0 0 6px rgba(212,160,23,.7))' }}>✨</span>
            ))}
          </>
        )}

        <svg viewBox={`0 0 ${VB} ${VB}`} width="180" height="180" style={{ overflow:'visible', position:'relative', zIndex:2 }}>
          <defs>
            <clipPath id="cup-clip">
              {/* Forme intérieure de la tasse */}
              <path d="M 56,60 L 56,150 Q 56,158 64,158 L 122,158 Q 130,158 130,150 L 130,60 Z" />
            </clipPath>
            <linearGradient id="coffee-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#7A4220" />
              <stop offset="50%" stopColor="#5C3317" />
              <stop offset="100%" stopColor="#2D1810" />
            </linearGradient>
            <linearGradient id="cup-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"  stopColor="#D8C8A8" />
              <stop offset="40%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#C8B898" />
            </linearGradient>
          </defs>

          {/* Soucoupe */}
          <ellipse cx="90" cy="170" rx="68" ry="6" fill="#A0784E" opacity=".4" />
          <ellipse cx="90" cy="167" rx="64" ry="5" fill="#F0E4D0" stroke="#3D2010" strokeWidth="1.4" />
          <ellipse cx="90" cy="166" rx="40" ry="2" fill="none" stroke="#C17F3C" strokeWidth=".8" opacity=".5" />

          {/* Anse droite — couches extérieure puis intérieure */}
          <path d="M 130,75 Q 158,80 158,108 Q 158,138 130,143"
                stroke="#F0E4D0" strokeWidth="14" fill="none" strokeLinecap="round" />
          <path d="M 130,75 Q 158,80 158,108 Q 158,138 130,143"
                stroke="#3D2010" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".7" />
          <path d="M 132,86 Q 148,90 148,108 Q 148,130 132,134"
                stroke="#F0E4D0" strokeWidth="5" fill="none" strokeLinecap="round" />

          {/* Corps de la tasse */}
          <path d="M 50,55 L 50,150 Q 50,162 62,162 L 124,162 Q 136,162 136,150 L 136,55 Z"
                fill="url(#cup-grad)" stroke="#3D2010" strokeWidth="2" />

          {/* Reflet blanc gauche */}
          <path d="M 56,68 Q 56,120 56,140"
                stroke="rgba(255,255,255,0.6)" strokeWidth="3" fill="none" strokeLinecap="round" />

          {/* Café (clipé, monte selon fillPct) */}
          <g clipPath="url(#cup-clip)">
            <rect
              id="coffee-fill"
              x="50" y={y} width="86" height={h + 5}
              fill="url(#coffee-grad)"
              style={{ transition: holding ? 'none' : 'y .25s ease, height .25s ease' }}
            />
            {/* Mousse au-dessus */}
            {fillPct > 1 && (
              <ellipse
                id="foam"
                cx="93" cy={y + 2} rx="38" ry="3.5"
                fill="#C8A878"
                opacity={Math.min(fillPct/30, 0.85)}
              />
            )}
            {/* Bulles */}
            {holding && fillPct > 5 && (
              <>
                <circle cx="78" cy={y + 12} r="1.4" fill="rgba(240,224,192,.6)">
                  <animate attributeName="cy" values={`${y+15};${y+4}`} dur="1.1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;.8;0" dur="1.1s" repeatCount="indefinite" />
                </circle>
                <circle cx="104" cy={y + 14} r="1.2" fill="rgba(240,224,192,.5)">
                  <animate attributeName="cy" values={`${y+16};${y+5}`} dur=".9s" begin=".25s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;.7;0" dur=".9s" begin=".25s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </g>

          {/* Vapeur — 3 traînées qui s'arrêtent quand on lâche */}
          {holding && (
            <g style={{ transformOrigin:'93px 50px' }}>
              <ellipse cx="80" cy="48" rx="3.5" ry="8" fill="rgba(240,224,192,.55)" style={{ filter:'blur(2px)', animation:'steam1 1.6s ease-in-out infinite' }} />
              <ellipse cx="93" cy="44" rx="4" ry="9" fill="rgba(240,224,192,.55)" style={{ filter:'blur(2px)', animation:'steam2 1.8s ease-in-out infinite', animationDelay:'.3s' }} />
              <ellipse cx="106" cy="48" rx="3.5" ry="8" fill="rgba(240,224,192,.55)" style={{ filter:'blur(2px)', animation:'steam3 1.5s ease-in-out infinite', animationDelay:'.6s' }} />
            </g>
          )}

          {/* Bord supérieur (rim) */}
          <ellipse cx="93" cy="55" rx="43" ry="5" fill="#3D2010" opacity=".55" />
          <ellipse cx="93" cy="54" rx="42" ry="3.8" fill="url(#cup-grad)" stroke="#3D2010" strokeWidth="1.2" />
        </svg>

        {/* Feedback float */}
        {feedback && (
          <div key={feedback.key} style={{
            position:'absolute', bottom:8, left:'50%',
            fontSize:18, fontWeight:900, color:feedback.color,
            pointerEvents:'none', zIndex:6,
            animation:'floatUpFb .9s ease-out forwards',
            textShadow:'0 1px 3px rgba(0,0,0,.2)'
          }}>{feedback.text}</div>
        )}
      </div>

      {/* % de remplissage en gros */}
      <div style={{ textAlign:'center', marginTop:-4 }}>
        <div style={{
          fontSize:52, fontWeight:900, color: pctColor,
          letterSpacing:'-2px', lineHeight:1, transition:'color .25s'
        }}>
          {Math.round(fillPct)}<span style={{ fontSize:24, color:C.muted, fontWeight:700, marginLeft:2 }}>%</span>
        </div>
        <div style={{
          fontSize:13, fontWeight:600, color: pctColor,
          marginTop:4, minHeight:18, transition:'color .25s'
        }}>
          {label}
        </div>
      </div>

      {/* Bannière de résultat */}
      {result && (
        <div style={{
          padding:'12px 22px', borderRadius:16,
          background: bannerBg, color: bannerCol,
          border:`2px solid ${bannerBorder}`,
          boxShadow:'0 6px 18px rgba(74,44,23,.25)',
          textAlign:'center',
          animation:'popIn .5s cubic-bezier(.36,.07,.19,.97) both',
          minWidth:240
        }}>
          <div style={{ fontSize:17, fontWeight:900, letterSpacing:.3 }}>{result.title}</div>
          <div style={{ fontSize:12, fontWeight:600, marginTop:2, opacity:.85 }}>{result.sub}</div>
        </div>
      )}

      {/* Bouton ☕ Maintenir */}
      <button
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        disabled={gameOver}
        className={holding ? 'pulse-hold' : ''}
        style={{
          width:200, height:64, borderRadius:28, fontSize:16, fontWeight:900, letterSpacing:.4,
          background: gameOver ? C.card : GOLD,
          color: gameOver ? C.muted : '#fff',
          border:`2px solid ${gameOver?C.border:'transparent'}`,
          boxShadow: holding ? '0 0 0 8px rgba(212,160,23,.25), 0 6px 20px rgba(212,160,23,.5)' : gameOver ? 'none' : '0 6px 20px rgba(212,160,23,.4)',
          cursor: gameOver ? 'not-allowed' : 'pointer',
          touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
          transform: holding ? 'scale(.96)' : 'scale(1)',
          transition:'transform .12s, background .25s, box-shadow .25s',
          animation: holding ? 'pulseHold 1.2s ease-in-out infinite' : 'none'
        }}
      >
        {holding ? '🫖 Tu verses...' : gameOver ? '...' : '☕ Maintenir'}
      </button>

      {/* 3 cartes tips en bas */}
      <div style={{ display:'flex', gap:8, width:'100%', maxWidth:340, marginTop:4 }}>
        <div style={{ flex:1, padding:'10px 6px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, textAlign:'center' }}>
          <div style={{ fontSize:14 }}>✦</div>
          <div style={{ fontSize:10, fontWeight:800, color:'#C17F3C', marginTop:2 }}>90-99%</div>
          <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>+6 🍪</div>
        </div>
        <div style={{ flex:1, padding:'10px 6px', borderRadius:12, background:C.card, border:`1px solid #D4A017`, textAlign:'center', boxShadow:'0 0 12px rgba(212,160,23,.2)' }}>
          <div style={{ fontSize:14 }}>⭐</div>
          <div style={{ fontSize:10, fontWeight:800, color:'#D4A017', marginTop:2 }}>100-105%</div>
          <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>+15 🍪</div>
        </div>
        <div style={{ flex:1, padding:'10px 6px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, textAlign:'center' }}>
          <div style={{ fontSize:14 }}>💧</div>
          <div style={{ fontSize:10, fontWeight:800, color:'#6B3D20', marginTop:2 }}>{`>105%`}</div>
          <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>−5 🍪</div>
        </div>
      </div>
    </div>
  );
}

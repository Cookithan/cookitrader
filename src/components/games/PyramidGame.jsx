import { useEffect, useRef, useState, useCallback } from "react";
import { GOLD } from "../../data/themes.js";
import { playSound } from "../../lib/audio.js";

/* ════════════════════════════════════════════════════
   PyramidGame — "Pile de Tasses" (niveau 8+)
   ────────────────────────────────────────────────────
   Empile des tasses de café. Une tasse oscille horizontalement
   en haut ; au tap, elle tombe sur la pile. La largeur de la
   prochaine tasse = overlap avec le sommet (mécanique stack-tower).

   Économie :
   - COÛT = 10 🍪 par partie
   - +5 🍪 par étage posé (1er étage = base, ne compte pas)
   - Cap MAX_REWARD = 100 🍪 (donc 20 étages max au-dessus de la base)

   Rendu :
   - Tasse = corps trapézoïdal arrondi crème + anse à droite + café en
     surface + soucoupe (uniquement sur la base)
   - viewBox 100x140 ; scroll auto quand pile > MAX_VISIBLE étages
   - Fond : ambiance café avec gradient nuit + grains de café flottants
═══════════════════════════════════════════════════════ */

const W = 100;
const H = 140;
const CUP_H = 11;
const MAX_VISIBLE = 11;
const BASE_WIDTH = 50;
const SPEED_MIN = 35;
const SPEED_MAX = 90;
const COST = 10;
const REWARD_PER_FLOOR = 5;
const MAX_REWARD = 100;

export function PyramidGame({ coins, onEarn, onSpend, onEventChallenge, C }){
  const [phase,     setPhase]     = useState('idle');   /* idle | playing | over */
  const [stack,     setStack]     = useState([]);
  const [moverX,    setMoverX]    = useState(0);
  const [moverW,    setMoverW]    = useState(BASE_WIDTH);
  const [feedback,  setFeedback]  = useState(null);
  const [recentDrop,setRecentDrop]= useState(null);

  const phaseRef    = useRef('idle');
  const stackRef    = useRef([]);
  const moverXRef   = useRef(0);
  const moverWRef   = useRef(BASE_WIDTH);
  const dirRef      = useRef(1);
  const rafRef      = useRef(null);
  const lastTRef    = useRef(null);

  useEffect(()=>{ phaseRef.current  = phase;  }, [phase]);
  useEffect(()=>{ stackRef.current  = stack;  }, [stack]);
  useEffect(()=>{ moverXRef.current = moverX; }, [moverX]);
  useEffect(()=>{ moverWRef.current = moverW; }, [moverW]);
  useEffect(()=>()=>{ if(rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  /* Score = nb de tasses au-dessus de la base. La base ne compte pas. */
  const score   = Math.max(0, stack.length - 1);
  const earned  = Math.min(MAX_REWARD, score * REWARD_PER_FLOOR);
  const canPlay = coins >= COST;

  const currentSpeed = () => {
    const t = Math.min(1, score / 20);
    return SPEED_MIN + (SPEED_MAX - SPEED_MIN) * t;
  };

  const tick = useCallback((time) => {
    if(phaseRef.current !== 'playing'){ rafRef.current = null; return; }
    if(lastTRef.current === null) lastTRef.current = time;
    const dt = (time - lastTRef.current) / 1000;
    lastTRef.current = time;

    const speed = currentSpeed();
    let nx = moverXRef.current + dirRef.current * speed * dt;
    const w = moverWRef.current;
    if(nx + w >= W){ nx = W - w; dirRef.current = -1; }
    else if(nx <= 0){ nx = 0; dirRef.current = 1; }
    moverXRef.current = nx;
    setMoverX(nx);

    rafRef.current = requestAnimationFrame(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    if(!canPlay) return;
    onSpend?.(COST);
    phaseRef.current = 'playing';
    setPhase('playing');
    const base = { x: (W - BASE_WIDTH) / 2, width: BASE_WIDTH };
    setStack([base]);
    stackRef.current = [base];
    setMoverW(BASE_WIDTH);
    moverWRef.current = BASE_WIDTH;
    setMoverX(0);
    moverXRef.current = 0;
    dirRef.current = 1;
    lastTRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  };

  const replay = () => {
    setStack([]);
    setPhase('idle');
    setFeedback(null);
    setRecentDrop(null);
  };

  const drop = () => {
    if(phaseRef.current !== 'playing') return;
    const top = stackRef.current[stackRef.current.length - 1];
    const mx = moverXRef.current;
    const mw = moverWRef.current;
    const overlapStart = Math.max(mx, top.x);
    const overlapEnd   = Math.min(mx + mw, top.x + top.width);
    const overlap = overlapEnd - overlapStart;

    if(overlap <= 1){
      playSound('error');
      setPhase('over');
      phaseRef.current = 'over';
      if(rafRef.current){ cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      setRecentDrop({ x: mx, width: mw, miss: true, key: Date.now() });
      return;
    }

    const newCookie = { x: overlapStart, width: overlap };
    const newStack = [...stackRef.current, newCookie];
    stackRef.current = newStack;
    setStack(newStack);
    setMoverW(overlap);
    moverWRef.current = overlap;
    setRecentDrop({ x: overlapStart, width: overlap, miss: false, key: Date.now() });

    const newX = dirRef.current > 0 ? 0 : W - overlap;
    setMoverX(newX);
    moverXRef.current = newX;

    playSound('tap');
    setFeedback({ text:`+${REWARD_PER_FLOOR} 🍪`, key: Date.now() });
    setTimeout(()=>setFeedback(null), 600);

    /* Cap atteint → fin de partie automatique */
    const newScore = newStack.length - 1;
    if(newScore * REWARD_PER_FLOOR >= MAX_REWARD){
      setTimeout(() => {
        setPhase('over');
        phaseRef.current = 'over';
        if(rafRef.current){ cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      }, 800);
    }
  };

  /* Verse les cookies à la fin + check de l'event modéré */
  useEffect(() => {
    if(phase === 'over'){
      if(earned > 0) onEarn?.(earned);
      /* Event 'pyramid_floors' : succès si 15 étages ou plus */
      onEventChallenge?.('pyramid_floors', score);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const totalCups = stack.length;
  const offsetY = totalCups > MAX_VISIBLE
    ? (totalCups - MAX_VISIBLE) * CUP_H
    : 0;

  const handleTap = (e) => {
    if(e && e.preventDefault) e.preventDefault();
    if(phase === 'idle'){ start(); return; }
    if(phase === 'over') return;
    drop();
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, paddingTop:6, paddingBottom:8 }}>
      {/* 2 cartes stats */}
      <div style={{ display:'flex', gap:8, width:'100%', maxWidth:360 }}>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${phase==='playing'?'#D4A017':C.border}`, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,.04)', transition:'border-color .25s' }}>
          <div style={{ fontSize:11 }}>☕</div>
          <div style={{ fontSize:22, fontWeight:900, color:phase==='playing'?'#D4A017':C.text, letterSpacing:'-.5px', lineHeight:1.1 }}>{score}</div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Tasses</div>
        </div>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${earned>=MAX_REWARD?'#D4A017':C.border}`, textAlign:'center', boxShadow:earned>=MAX_REWARD?'0 0 14px rgba(212,160,23,.4)':'0 2px 8px rgba(0,0,0,.04)', transition:'all .25s' }}>
          <div style={{ fontSize:11 }}>🍪</div>
          <div style={{ fontSize:22, fontWeight:900, color:earned>=MAX_REWARD?'#D4A017':C.text, letterSpacing:'-.5px', lineHeight:1.1 }}>{earned}</div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Gagné{earned>=MAX_REWARD?' (max)':''}</div>
        </div>
      </div>

      {/* Aire de jeu */}
      <div
        onPointerDown={handleTap}
        style={{
          position:'relative',
          width:'100%', maxWidth:340, aspectRatio:`${W}/${H}`,
          borderRadius:18, overflow:'hidden',
          background:'linear-gradient(180deg,#0F0804 0%,#1E100A 35%,#3D2010 75%,#5A3520 100%)',
          border:`2px solid ${C.border}`,
          boxShadow:'0 6px 20px rgba(74,44,23,.35)',
          cursor: phase === 'over' ? 'default' : 'pointer',
          touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
          <defs>
            <linearGradient id="pyr_cup" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FAF0E0" />
              <stop offset="100%" stopColor="#D8C5A8" />
            </linearGradient>
            <linearGradient id="pyr_cup_active" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFE89A" />
              <stop offset="100%" stopColor="#D4A017" />
            </linearGradient>
            <radialGradient id="pyr_glow" cx="50%" cy="0%" r="60%">
              <stop offset="0%" stopColor="#FFE89A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FFE89A" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Lumière douce du haut */}
          <rect x="0" y="0" width={W} height={H * 0.4} fill="url(#pyr_glow)" />

          {/* Étoiles décoratives */}
          <circle cx="14" cy="14" r="0.7" fill="#FFE89A" opacity=".5" />
          <circle cx="86" cy="10" r="0.8" fill="#FFE89A" opacity=".5" />
          <circle cx="50" cy="6"  r="0.6" fill="#FFE89A" opacity=".4" />
          <circle cx="22" cy="32" r="0.5" fill="#FFE89A" opacity=".3" />
          <circle cx="78" cy="28" r="0.6" fill="#FFE89A" opacity=".3" />

          {/* Grains de café flottants en fond */}
          <g opacity=".18">
            <ellipse cx="10" cy="80" rx="2" ry="3.5" fill="#3D1C02" transform="rotate(-15 10 80)" />
            <ellipse cx="90" cy="100" rx="2" ry="3.5" fill="#3D1C02" transform="rotate(20 90 100)" />
            <ellipse cx="6" cy="120" rx="2" ry="3.5" fill="#3D1C02" transform="rotate(-25 6 120)" />
          </g>

          <g transform={`translate(0, ${offsetY})`}>
            {/* Pile de tasses */}
            {stack.map((c, i) => {
              const yBottom = H - 4 - i * CUP_H;
              const isBase = i === 0;
              const handleSide = i % 2 === 0 ? 'right' : 'left';
              return (
                <Cup
                  key={i}
                  x={c.x} y={yBottom - CUP_H} width={c.width} height={CUP_H}
                  showSaucer={isBase}
                  handleSide={handleSide}
                />
              );
            })}

            {/* Flash sur le dernier ajout */}
            {recentDrop && phase === 'playing' && (
              <rect
                key={recentDrop.key}
                x={recentDrop.x}
                y={H - 4 - (stack.length - 1) * CUP_H - CUP_H}
                width={recentDrop.width} height={CUP_H} rx="1.6"
                fill="none" stroke="#FFE89A" strokeWidth="1.4" opacity="1"
              >
                <animate attributeName="opacity" from="1" to="0" dur="0.55s" fill="freeze" />
              </rect>
            )}
          </g>

          {/* Tasse mobile en haut */}
          {phase === 'playing' && (
            <Cup
              x={moverX} y={8} width={moverW} height={CUP_H}
              active={true}
              handleSide={dirRef.current > 0 ? 'right' : 'left'}
              showSteam={true}
            />
          )}

          {/* Tasse en chute (game over) */}
          {phase === 'over' && recentDrop?.miss && (
            <g>
              <rect
                x={recentDrop.x} y="8" width={recentDrop.width} height={CUP_H} rx="1.6"
                fill="url(#pyr_cup_active)" stroke="#8B6914" strokeWidth="0.7"
                transform={`rotate(15 ${recentDrop.x + recentDrop.width/2} ${8 + CUP_H/2})`}
              >
                <animateTransform attributeName="transform" type="translate" from="0 0" to="0 140" dur="0.7s" fill="freeze" additive="sum" />
              </rect>
            </g>
          )}
        </svg>

        {/* Feedback +N 🍪 */}
        {feedback && (
          <div
            key={feedback.key}
            style={{
              position:'absolute', top:'30%', left:'50%',
              transform:'translateX(-50%)',
              fontSize:18, fontWeight:900, color:'#FFE89A',
              pointerEvents:'none',
              animation:'floatUpClick .8s ease-out forwards',
              textShadow:'0 2px 6px rgba(0,0,0,.55)',
              ['--tx']: '0px',
            }}
          >
            {feedback.text}
          </div>
        )}

        {/* Overlay idle */}
        {phase === 'idle' && (
          <div style={{
            position:'absolute', inset:0, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', gap:10,
            background:'rgba(15,8,4,.55)', backdropFilter:'blur(2px)',
            color:'#FFE89A', textAlign:'center', padding:20,
          }}>
            <div style={{ fontSize:42, marginBottom:4 }}>☕</div>
            <div style={{ fontSize:18, fontWeight:900, letterSpacing:.4 }}>Pile de Tasses</div>
            <div style={{ fontSize:12, opacity:.85, lineHeight:1.5, maxWidth:240 }}>
              Empile les tasses pile sur la précédente.<br/>
              Si tu rates, tout s'écroule.<br/>
              <strong style={{ color:'#FFE89A' }}>+5 🍪 par tasse, max 100 🍪</strong>
            </div>
            <div style={{
              fontSize:10, fontWeight:800, letterSpacing:1,
              color: canPlay ? '#FFE89A' : '#A86040',
              marginTop:6, padding:'5px 12px', borderRadius:10,
              background: canPlay ? 'rgba(212,160,23,.2)' : 'rgba(74,44,23,.4)',
              border: `1px solid ${canPlay ? 'rgba(212,160,23,.4)' : 'rgba(168,96,64,.5)'}`,
            }}>
              {canPlay ? `TAP POUR JOUER (${COST} 🍪)` : `Pas assez (min. ${COST} 🍪)`}
            </div>
          </div>
        )}
      </div>

      {/* Bannière de fin */}
      {phase === 'over' && (
        <div style={{
          padding:'14px 22px', borderRadius:18,
          background: earned >= MAX_REWARD
            ? 'linear-gradient(135deg,#F5DC8A,#D4A017)'
            : score === 0
              ? 'linear-gradient(135deg,#5A3520,#3D2010)'
              : 'linear-gradient(135deg,#FBEFD4,#F0C050)',
          color: earned >= MAX_REWARD ? '#5D3A1F' : score === 0 ? '#F0E0C0' : '#5D3A1F',
          border: `2px solid ${earned >= MAX_REWARD ? '#D4A017' : score === 0 ? '#3D2010' : '#D4A017'}`,
          boxShadow:'0 6px 20px rgba(74,44,23,.25)',
          textAlign:'center', minWidth:280,
          animation:'popIn .5s cubic-bezier(.36,.07,.19,.97) both',
        }}>
          <div style={{ fontSize:18, fontWeight:900, marginBottom:8, letterSpacing:.3 }}>
            {earned >= MAX_REWARD ? '🏆 Pile maximale !'
             : score === 0       ? '💥 Aïe, raté'
             :                     `☕ ${score} tasses`}
          </div>
          <div style={{ display:'flex', gap:14, justifyContent:'center' }}>
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>{score}</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Tasses</div>
            </div>
            <div style={{ width:1, background:'rgba(0,0,0,.15)' }} />
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>+{earned}</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Cookies</div>
            </div>
          </div>
        </div>
      )}

      {/* Bouton central */}
      {phase !== 'playing' && (
        <button
          onClick={phase === 'over' ? replay : start}
          disabled={!canPlay && phase !== 'over'}
          className={canPlay || phase === 'over' ? 'glow-anim' : ''}
          style={{
            width:200, padding:'15px 0', borderRadius:22, fontSize:15, fontWeight:900, letterSpacing:.4,
            background: (canPlay || phase === 'over') ? GOLD : C.card,
            color: (canPlay || phase === 'over') ? '#fff' : C.muted,
            border: `2px solid ${(canPlay || phase === 'over') ? 'transparent' : C.border}`,
            boxShadow: (canPlay || phase === 'over') ? '0 6px 20px rgba(212,160,23,.4)' : 'none',
            cursor: (canPlay || phase === 'over') ? 'pointer' : 'not-allowed',
            touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
          }}
        >
          {phase === 'over' ? `Rejouer (${COST} 🍪)` : `Commencer (${COST} 🍪)`}
        </button>
      )}

      {/* Tip card */}
      <div style={{ width:'100%', maxWidth:340, padding:'10px 14px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center' }}>
        💡 Plus la pile monte, plus la tasse va vite. <strong style={{ color:'#D4A017' }}>Reste précis.</strong>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────
   Cup — silhouette de tasse à café (corps + anse + café en surface)
   - position (x, y) en coordonnées du viewBox SVG
   - width / height en unités viewBox
   - active : tasse en mouvement (gradient doré au lieu de crème)
   - handleSide : 'left' | 'right' (pour varier visuellement le long de la pile)
   - showSaucer : si true, dessine la soucoupe (uniquement la base)
   - showSteam : si true, dessine 2 traits de vapeur (tasse mobile)
   - Si la tasse est très étroite (width < 8), on n'affiche pas l'anse
──────────────────────────────────────────────────── */
function Cup({ x, y, width, height, active = false, handleSide = 'right', showSaucer = false, showSteam = false }){
  const fill = active ? 'url(#pyr_cup_active)' : 'url(#pyr_cup)';
  const stroke = active ? '#8B6914' : '#5A3520';
  const showHandle = width >= 8;
  const handleR = Math.min(height * 0.35, 3);

  /* Forme de tasse : trapèze légèrement plus large en haut, coins arrondis */
  const innerInset = Math.min(1.5, width * 0.06);
  const cupBody = `
    M ${x + innerInset} ${y + 1}
    L ${x + width - innerInset} ${y + 1}
    L ${x + width - innerInset * 1.5} ${y + height - 1}
    Q ${x + width - innerInset * 1.5} ${y + height} ${x + width - innerInset * 2.5} ${y + height}
    L ${x + innerInset * 2.5} ${y + height}
    Q ${x + innerInset * 1.5} ${y + height} ${x + innerInset * 1.5} ${y + height - 1}
    Z
  `;

  return (
    <g>
      {/* Vapeur (uniquement tasse mobile) */}
      {showSteam && (
        <>
          <path d={`M ${x + width * 0.35} ${y - 1} q 1 -2 0 -4`} stroke="#F5E8C8" strokeWidth="0.7" fill="none" opacity=".8" />
          <path d={`M ${x + width * 0.65} ${y - 1} q 1 -2 0 -4`} stroke="#F5E8C8" strokeWidth="0.7" fill="none" opacity=".7" />
        </>
      )}

      {/* Anse */}
      {showHandle && (
        handleSide === 'right' ? (
          <path
            d={`M ${x + width - innerInset} ${y + height * 0.3}
                Q ${x + width + handleR + 0.5} ${y + height * 0.3}
                  ${x + width + handleR + 0.5} ${y + height * 0.55}
                Q ${x + width + handleR + 0.5} ${y + height * 0.8}
                  ${x + width - innerInset} ${y + height * 0.8}`}
            fill="none" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"
          />
        ) : (
          <path
            d={`M ${x + innerInset} ${y + height * 0.3}
                Q ${x - handleR - 0.5} ${y + height * 0.3}
                  ${x - handleR - 0.5} ${y + height * 0.55}
                Q ${x - handleR - 0.5} ${y + height * 0.8}
                  ${x + innerInset} ${y + height * 0.8}`}
            fill="none" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"
          />
        )
      )}

      {/* Corps */}
      <path d={cupBody} fill={fill} stroke={stroke} strokeWidth="0.8" strokeLinejoin="round" />

      {/* Café en surface (ellipse marron foncé en haut de la tasse) */}
      {width >= 6 && (
        <ellipse
          cx={x + width / 2} cy={y + 2}
          rx={Math.max(1, width / 2 - innerInset - 0.4)}
          ry="1"
          fill="#3D2010"
        />
      )}

      {/* Highlight crème (côté gauche) */}
      {width >= 8 && (
        <line
          x1={x + innerInset + 0.6} y1={y + 2.5}
          x2={x + innerInset + 1.2} y2={y + height - 2}
          stroke="#FFFAF0" strokeWidth="0.5" opacity=".6" strokeLinecap="round"
        />
      )}

      {/* Soucoupe (uniquement base) */}
      {showSaucer && (
        <ellipse
          cx={x + width / 2} cy={y + height + 1.5}
          rx={width / 2 + 4} ry="2"
          fill="url(#pyr_cup)" stroke={stroke} strokeWidth="0.6"
        />
      )}
    </g>
  );
}

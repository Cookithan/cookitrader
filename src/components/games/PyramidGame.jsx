import { useEffect, useRef, useState, useCallback } from "react";
import { GOLD } from "../../data/themes.js";
import { playSound } from "../../lib/audio.js";

/* ════════════════════════════════════════════════════
   PyramidGame — "Pyramide Cookie" (niveau 7+)
   ────────────────────────────────────────────────────
   Empile des cookies les uns sur les autres. Un cookie oscille
   horizontalement en haut ; au tap, il tombe sur la pile. Si la
   surface de chevauchement avec le sommet est nulle → game over.
   Sinon, la nouvelle largeur = overlap (donc la pile rétrécit).

   - 0 🍪 de coût (gratuit, niveau-réservé)
   - +10 🍪 par étage posé, max MAX_REWARD = 200 (20 étages utiles)
   - Vitesse augmente à chaque étage (clamp à 80 % de la largeur de
     l'aire / sec)
   - Aire de jeu : viewBox SVG 100×140 (W × H), haut → cookie mobile,
     bas → pile, scroll automatique quand >12 cookies posés (les
     premiers descendent hors champ).
═══════════════════════════════════════════════════════ */

const W = 100;          /* largeur viewBox */
const H = 140;          /* hauteur viewBox */
const COOKIE_H = 9;     /* hauteur d'un cookie */
const MAX_VISIBLE = 12; /* après ça on scroll vers le haut */
const BASE_WIDTH = 50;
const SPEED_MIN = 35;   /* unités/s à l'étage 1 */
const SPEED_MAX = 90;   /* plafond à haut score */
const REWARD_PER_FLOOR = 10;
const MAX_REWARD = 200;

export function PyramidGame({ onEarn, C }){
  const [phase,     setPhase]     = useState('idle');   /* idle | playing | over */
  const [stack,     setStack]     = useState([]);        /* {x,width} bottom-up */
  const [moverX,    setMoverX]    = useState(0);
  const [moverW,    setMoverW]    = useState(BASE_WIDTH);
  const [feedback,  setFeedback]  = useState(null);      /* { text, key } */
  const [recentDrop,setRecentDrop]= useState(null);      /* feedback animation */

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

  const score   = stack.length;
  const earned  = Math.min(MAX_REWARD, score * REWARD_PER_FLOOR);

  /* Vitesse : interp linéaire entre SPEED_MIN à score 0 et SPEED_MAX
     à score 20 (où on est de toute façon au max reward). */
  const currentSpeed = () => {
    const t = Math.min(1, score / 20);
    return SPEED_MIN + (SPEED_MAX - SPEED_MIN) * t;
  };

  /* Boucle RAF : déplace le cookie mobile */
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
    /* On met phaseRef à 'playing' AVANT le 1er raf (sinon le useEffect
       qui sync phaseRef tournerait après et le 1er tick verrait
       encore 'idle' → arrêt immédiat). */
    phaseRef.current = 'playing';
    setPhase('playing');
    /* base de la pyramide : 1 cookie centré, largeur BASE_WIDTH */
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

  /* Au tap : tente de poser le cookie. Si pas d'overlap avec le
     sommet → game over. Sinon nouvelle largeur = overlap. */
  const drop = () => {
    if(phaseRef.current !== 'playing') return;
    const top = stackRef.current[stackRef.current.length - 1];
    const mx = moverXRef.current;
    const mw = moverWRef.current;
    const overlapStart = Math.max(mx, top.x);
    const overlapEnd   = Math.min(mx + mw, top.x + top.width);
    const overlap = overlapEnd - overlapStart;

    if(overlap <= 1){
      /* miss complet : game over */
      playSound('error');
      setPhase('over');
      phaseRef.current = 'over';
      if(rafRef.current){ cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      setRecentDrop({ x: mx, width: mw, miss: true, key: Date.now() });
      return;
    }

    /* succès : on ajoute le cookie posé à la pile, on rétrécit le
       prochain cookie mobile à l'overlap (mécanique stack-tower). */
    const newCookie = { x: overlapStart, width: overlap };
    const newStack = [...stackRef.current, newCookie];
    stackRef.current = newStack;
    setStack(newStack);
    setMoverW(overlap);
    moverWRef.current = overlap;
    setRecentDrop({ x: overlapStart, width: overlap, miss: false, key: Date.now() });

    /* Repositionne le cookie mobile pour qu'il ne dépasse pas tout de
       suite (collé au bord opposé pour donner un peu de temps). */
    const newX = dirRef.current > 0 ? 0 : W - overlap;
    setMoverX(newX);
    moverXRef.current = newX;

    playSound('tap');
    setFeedback({ text:`+${REWARD_PER_FLOOR} 🍪`, key: Date.now() });
    setTimeout(()=>setFeedback(null), 600);
  };

  /* Au game over : verse les cookies gagnés */
  useEffect(() => {
    if(phase === 'over' && earned > 0){
      onEarn?.(earned);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* Décalage vertical de rendu : si on dépasse MAX_VISIBLE, on pousse
     les cookies vers le bas pour que le sommet reste visible. */
  const totalCookies = stack.length;
  const offsetY = totalCookies > MAX_VISIBLE
    ? (totalCookies - MAX_VISIBLE) * COOKIE_H
    : 0;

  /* Aire active : zone tactile pour le drop. Hauteur = celle du
     viewBox SVG, qui est H. */
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
          <div style={{ fontSize:11 }}>🏗️</div>
          <div style={{ fontSize:22, fontWeight:900, color:phase==='playing'?'#D4A017':C.text, letterSpacing:'-.5px', lineHeight:1.1 }}>{score}</div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Étages</div>
        </div>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${earned>=MAX_REWARD?'#D4A017':C.border}`, textAlign:'center', boxShadow:earned>=MAX_REWARD?'0 0 14px rgba(212,160,23,.4)':'0 2px 8px rgba(0,0,0,.04)', transition:'all .25s' }}>
          <div style={{ fontSize:11 }}>🍪</div>
          <div style={{ fontSize:22, fontWeight:900, color:earned>=MAX_REWARD?'#D4A017':C.text, letterSpacing:'-.5px', lineHeight:1.1 }}>{earned}</div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Gagné{earned>=MAX_REWARD?' (max)':''}</div>
        </div>
      </div>

      {/* Aire de jeu : SVG plein écran tappable */}
      <div
        onPointerDown={handleTap}
        style={{
          position:'relative',
          width:'100%', maxWidth:340, aspectRatio:`${W}/${H}`,
          borderRadius:18, overflow:'hidden',
          background:'linear-gradient(180deg,#1A0F08 0%,#3D2010 50%,#7D4E1F 100%)',
          border:`2px solid ${C.border}`,
          boxShadow:'0 6px 20px rgba(74,44,23,.3)',
          cursor: phase === 'over' ? 'default' : 'pointer',
          touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
          <defs>
            <linearGradient id="pyr_cookie_grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E8B57A" />
              <stop offset="55%" stopColor="#B86A28" />
              <stop offset="100%" stopColor="#6B3812" />
            </linearGradient>
            <linearGradient id="pyr_mover_grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFE89A" />
              <stop offset="100%" stopColor="#D4A017" />
            </linearGradient>
          </defs>

          {/* Étoiles décoratives en fond */}
          <circle cx="20" cy="20" r="0.8" fill="#FFE89A" opacity=".5" />
          <circle cx="80" cy="14" r="0.6" fill="#FFE89A" opacity=".4" />
          <circle cx="50" cy="8"  r="0.6" fill="#FFE89A" opacity=".4" />
          <circle cx="14" cy="55" r="0.6" fill="#FFE89A" opacity=".3" />
          <circle cx="86" cy="60" r="0.7" fill="#FFE89A" opacity=".3" />

          <g transform={`translate(0, ${offsetY})`}>
            {/* Pile de cookies posés (du bas vers le haut) */}
            {stack.map((c, i) => {
              const yBottom = H - 4 - i * COOKIE_H;  /* base du cookie i */
              return (
                <g key={i} transform={`translate(${c.x}, ${yBottom - COOKIE_H})`}>
                  <rect x="0" y="0" width={c.width} height={COOKIE_H} rx="2" fill="url(#pyr_cookie_grad)" stroke="#3D1F0A" strokeWidth="0.6" />
                  {/* mini pépites */}
                  {c.width > 8 && (
                    <>
                      <circle cx={c.width * 0.3} cy={COOKIE_H/2} r="0.9" fill="#3D1C02" />
                      <circle cx={c.width * 0.7} cy={COOKIE_H/2} r="0.9" fill="#3D1C02" />
                    </>
                  )}
                </g>
              );
            })}

            {/* Animation flash sur le dernier cookie posé / miss */}
            {recentDrop && phase === 'playing' && (
              <rect
                key={recentDrop.key}
                x={recentDrop.x} y={H - 4 - (stack.length - 1) * COOKIE_H - COOKIE_H}
                width={recentDrop.width} height={COOKIE_H} rx="2"
                fill="none" stroke="#FFE89A" strokeWidth="1.2" opacity=".9"
              >
                <animate attributeName="opacity" from="1" to="0" dur="0.5s" fill="freeze" />
              </rect>
            )}
          </g>

          {/* Cookie mobile en haut (uniquement en phase playing) */}
          {phase === 'playing' && (
            <g transform={`translate(${moverX}, 8)`}>
              <rect x="0" y="0" width={moverW} height={COOKIE_H} rx="2" fill="url(#pyr_mover_grad)" stroke="#8B6914" strokeWidth="0.7" />
              {moverW > 8 && (
                <>
                  <circle cx={moverW * 0.3} cy={COOKIE_H/2} r="0.9" fill="#3D1C02" />
                  <circle cx={moverW * 0.7} cy={COOKIE_H/2} r="0.9" fill="#3D1C02" />
                </>
              )}
            </g>
          )}

          {/* Cookie en chute libre (game over) */}
          {phase === 'over' && recentDrop?.miss && (
            <g>
              <rect
                x={recentDrop.x} y="8" width={recentDrop.width} height={COOKIE_H} rx="2"
                fill="url(#pyr_mover_grad)" stroke="#8B6914" strokeWidth="0.7"
                transform={`rotate(15 ${recentDrop.x + recentDrop.width/2} ${8 + COOKIE_H/2})`}
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
              fontSize:18, fontWeight:900, color:'#D4A017',
              pointerEvents:'none',
              animation:'floatUpClick .8s ease-out forwards',
              textShadow:'0 2px 6px rgba(0,0,0,.45)',
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
            background:'rgba(15,8,4,.5)', backdropFilter:'blur(2px)',
            color:'#FFE89A', textAlign:'center', padding:20,
          }}>
            <div style={{ fontSize:42, marginBottom:4 }}>🏗️</div>
            <div style={{ fontSize:18, fontWeight:900, letterSpacing:.4 }}>Pyramide Cookie</div>
            <div style={{ fontSize:12, opacity:.85, lineHeight:1.5, maxWidth:240 }}>
              Tape pour poser un cookie pile sur le précédent.<br/>
              Si tu rates, la tour s'effondre.<br/>
              <strong style={{ color:'#FFE89A' }}>+10 🍪 par étage, max 200 🍪</strong>
            </div>
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:1, color:'#FFE89A', marginTop:6, padding:'5px 12px', borderRadius:10, background:'rgba(212,160,23,.2)', border:'1px solid rgba(212,160,23,.4)' }}>
              TAP POUR COMMENCER
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
            {earned >= MAX_REWARD ? '🏆 Pyramide max !'
             : score === 0       ? '💥 Aïe, raté'
             :                     `🏗️ ${score} étages`}
          </div>
          <div style={{ display:'flex', gap:14, justifyContent:'center' }}>
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>{score}</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Étages</div>
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
          className="glow-anim"
          style={{
            width:200, padding:'15px 0', borderRadius:22, fontSize:15, fontWeight:900, letterSpacing:.4,
            background: GOLD, color:'#fff',
            border:'2px solid transparent',
            boxShadow:'0 6px 20px rgba(212,160,23,.4)',
            cursor:'pointer',
            touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
          }}
        >
          {phase === 'over' ? 'Rejouer' : 'Commencer'}
        </button>
      )}

      {/* Tip card */}
      <div style={{ width:'100%', maxWidth:340, padding:'10px 14px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center' }}>
        💡 Plus la pile monte, plus le cookie va vite. <strong style={{ color:'#D4A017' }}>Reste précis.</strong>
      </div>
    </div>
  );
}

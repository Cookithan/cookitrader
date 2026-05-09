import { useState, useEffect, useRef, useCallback } from "react";
import { GOLD } from "../../data/themes.js";
import { playSound } from "../../lib/audio.js";
import { SingleCup } from "./SingleCup.jsx";

/* ════════════════════════════════════════════════════
   PyramidGame — "Pile de Tasses" (BRIEF refonte 09/05/2026)
   ────────────────────────────────────────────────────
   Mini-jeu Stack-like : empile des tasses qui glissent horizontalement,
   tap pour les poser. Si pas alignée, la tasse rétrécit. Si trop petite
   (< 25 % de la largeur initiale) → game over.

   Économie :
   - COÛT = 10 🍪 par partie · niveau requis 10
   - +2 🍪 par tasse posée · cap 100 🍪
   - Bonus combo +10 🍪 si > 30 tasses

   Le composant est intégré dans GameOverlay qui fournit le header
   (titre + back + cookies pill) — d'où pas de fullscreen ici.
═══════════════════════════════════════════════════════ */

const GAME_AREA_WIDTH    = 320;
const INITIAL_CUP_WIDTH  = 160;        // 130 → 160 (tasses encore + grosses)
const MIN_CUP_WIDTH      = 38;         // 30 → 38 (cohérent avec ratio ~25%)
const INITIAL_SPEED      = 120;        // px/seconde
const REWARD_PER_CUP     = 2;
const REWARD_CAP         = 100;
const COMBO_THRESHOLD    = 30;
const COMBO_BONUS_AMOUNT = 10;         // 50 → 10 (bonus combo)
const COST_TO_PLAY       = 10;

/* La tasse SVG totale fait width × 1.3 (anse à droite). Le centre visuel
   de la tasse est donc à -15 % de la largeur depuis le centre du div.
   Cet offset doit être compensé pour empiler les tasses bien alignées. */
const HANDLE_OFFSET_RATIO = 0.15;

/* Hauteurs pile / tasse en CSS px (dépend du SVG SingleCup) */
const SAUCER_HEIGHT  = 14;
const STACK_BOTTOM   = 26;
const CUP_HEIGHT_RATIO = 0.42;         // hauteur tasse / largeur tasse (42/100)
const STACK_OVERLAP  = 0;              // 4 → 0 (pas de traversée)

/* Hauteur cumulée de la pile en CSS px (chaque tasse a sa hauteur
   selon sa largeur via le ratio fixe 42:100). +60 d'espace pour
   que la tasse mobile + sa vapeur soient bien au-dessus. */
function getMovingCupBottomPosition(stackedCups){
  let h = 0;
  for(const c of stackedCups) h += c.width * CUP_HEIGHT_RATIO - STACK_OVERLAP;
  return STACK_BOTTOM + SAUCER_HEIGHT + h + 60;
}

export function PyramidGame({ coins, onEarn, onSpend, onEventChallenge, C }){
  const [phase,           setPhase]           = useState('intro');     // intro | playing | gameover
  const [stackedCups,     setStackedCups]     = useState([]);
  const [movingCup,       setMovingCup]       = useState(null);
  const [score,           setScore]           = useState(0);
  const [reward,          setReward]          = useState(0);
  const [comboBonus,      setComboBonus]      = useState(false);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [showPerfectGlow, setShowPerfectGlow] = useState(false);
  /* Particules grains de café qui jaillissent au tap d'une tasse posée
     (5 grains éphémères avec angle/distance aléatoires). Cleanup auto
     après 700 ms. */
  const [tapParticles,    setTapParticles]    = useState([]);

  const rafRef     = useRef(null);
  const lastTRef   = useRef(0);
  const phaseRef   = useRef('intro');
  const movingRef  = useRef(null);
  const stackedRef = useRef([]);
  const scoreRef   = useRef(0);

  useEffect(()=>{ phaseRef.current  = phase;       }, [phase]);
  useEffect(()=>{ movingRef.current = movingCup;   }, [movingCup]);
  useEffect(()=>{ stackedRef.current = stackedCups;}, [stackedCups]);
  useEffect(()=>{ scoreRef.current  = score;       }, [score]);

  /* Cleanup au unmount — annule l'animation si en cours */
  useEffect(() => () => {
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  /* ── Animation gauche-droite avec rebond ────────── */
  useEffect(() => {
    if(phase !== 'playing') return;

    const animate = (currentTime) => {
      if(phaseRef.current !== 'playing'){ rafRef.current = null; return; }
      if(!lastTRef.current) lastTRef.current = currentTime;
      const delta = (currentTime - lastTRef.current) / 1000;
      lastTRef.current = currentTime;

      setMovingCup(prev => {
        if(!prev) return prev;
        /* Vitesse exponentielle douce — accélère après 10-15 tasses */
        const speed = INITIAL_SPEED * (1 + Math.pow(scoreRef.current / 15, 1.3) * 0.4);
        const maxX  = GAME_AREA_WIDTH / 2 - prev.width / 2 - 8;
        const minX  = -maxX;
        let nx = prev.x + prev.direction * speed * delta;
        let ndir = prev.direction;
        if(nx > maxX){ nx = maxX; ndir = -1; }
        else if(nx < minX){ nx = minX; ndir = 1; }
        return { ...prev, x: nx, direction: ndir };
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if(rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTRef.current = 0;
    };
  }, [phase]);

  /* ── Démarrer une partie ───────────────────────── */
  const handleStart = () => {
    if(coins < COST_TO_PLAY) return;
    playSound('modal');
    onSpend(COST_TO_PLAY);

    /* Base de départ : une tasse posée au centre comme repère visuel.
       Elle ne compte PAS dans le score (qui représente les tasses
       posées par le joueur). */
    const baseCup = { x: 0, width: INITIAL_CUP_WIDTH };
    setStackedCups([baseCup]);
    stackedRef.current = [baseCup];
    setScore(0); scoreRef.current = 0;
    setReward(0);
    setComboBonus(false);
    setMovingCup({
      x: -GAME_AREA_WIDTH / 2 + INITIAL_CUP_WIDTH / 2 + 8,
      width: INITIAL_CUP_WIDTH,
      direction: 1,
    });
    setPhase('playing');
    phaseRef.current = 'playing';
    lastTRef.current = 0;
  };

  /* ── Tap : poser la tasse ──────────────────────── */
  const handleTap = useCallback(() => {
    if(phaseRef.current !== 'playing') return;
    const moving = movingRef.current;
    if(!moving) return;

    const lastCup = stackedRef.current.length > 0
      ? stackedRef.current[stackedRef.current.length - 1]
      : { x: 0, width: INITIAL_CUP_WIDTH };

    const movingLeft  = moving.x  - moving.width  / 2;
    const movingRight = moving.x  + moving.width  / 2;
    const lastLeft    = lastCup.x - lastCup.width / 2;
    const lastRight   = lastCup.x + lastCup.width / 2;

    const overlapLeft  = Math.max(movingLeft,  lastLeft);
    const overlapRight = Math.min(movingRight, lastRight);
    const overlapWidth = overlapRight - overlapLeft;

    /* Aucun chevauchement OU tasse devenue trop petite → game over */
    if(overlapWidth <= 0 || overlapWidth < MIN_CUP_WIDTH){
      handleGameOver();
      return;
    }

    const newX = (overlapLeft + overlapRight) / 2;
    const isPerfect = Math.abs(moving.x - lastCup.x) < 3;

    const newCup = { x: newX, width: overlapWidth };
    const newStack = [...stackedRef.current, newCup];
    stackedRef.current = newStack;
    setStackedCups(newStack);

    const newScore = scoreRef.current + 1;
    scoreRef.current = newScore;
    setScore(newScore);

    const newReward = Math.min(reward + REWARD_PER_CUP, REWARD_CAP);
    setReward(newReward);

    if(isPerfect){
      setShowPerfectGlow(true);
      setTimeout(() => setShowPerfectGlow(false), 800);
    }
    setShowRewardPopup(true);
    setTimeout(() => setShowRewardPopup(false), 1000);

    /* Spawn de 5 grains de café éphémères au point de pose. Angle
       réparti en cercle, distance et rotation aléatoires pour un effet
       feu d'artifice naturel. Auto-cleanup après 700ms via setTimeout. */
    const burstId = Date.now();
    const burst = Array.from({ length: 5 }, (_, i) => {
      const angle = (i / 5) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist  = 45 + Math.random() * 35;
      return {
        id: `${burstId}-${i}`,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 10,  // biais vers le haut
        rot: (Math.random() - 0.5) * 540,
      };
    });
    setTapParticles(prev => [...prev, ...burst]);
    setTimeout(() => {
      setTapParticles(prev => prev.filter(p => !p.id.startsWith(`${burstId}-`)));
    }, 700);

    if(newScore === COMBO_THRESHOLD){
      setComboBonus(true);
    }

    /* Prépare la tasse suivante : largeur = overlap, position aléatoire d'un côté */
    const sideToStart = Math.random() > 0.5 ? -1 : 1;
    const startX = sideToStart * (GAME_AREA_WIDTH / 2 - overlapWidth / 2 - 8);
    const next = {
      x: startX,
      width: overlapWidth,
      direction: sideToStart === -1 ? 1 : -1,
    };
    movingRef.current = next;
    setMovingCup(next);

    playSound(isPerfect ? 'success' : 'tap');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reward]);

  /* ── Game over ─────────────────────────────────── */
  const handleGameOver = useCallback(() => {
    if(rafRef.current){ cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setMovingCup(null);
    setPhase('gameover');
    phaseRef.current = 'gameover';
    playSound('error');
  }, []);

  /* Crédit cookies au mount du gameover (UNE SEULE FOIS) */
  useEffect(() => {
    if(phase !== 'gameover') return;
    const total = reward + (comboBonus ? COMBO_BONUS_AMOUNT : 0);
    if(total > 0) onEarn?.(total);
    /* Event modéré : 'pyramid_floors' (succès si >= 15) */
    onEventChallenge?.('pyramid_floors', score);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ════════ INTRO ════════ */
  if(phase === 'intro'){
    const canPlay = coins >= COST_TO_PLAY;
    return (
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        gap:14, paddingTop:6, minHeight:'70vh', justifyContent:'center',
      }}>
        <div style={{
          width:'100%', maxWidth:340,
          background:'linear-gradient(180deg, #3D2010 0%, #4A2C17 100%)',
          borderRadius:20, border:'1.5px solid rgba(212, 160, 23, 0.15)',
          padding:24,
          display:'flex', flexDirection:'column', alignItems:'center', gap:18,
          textAlign:'center',
        }}>
          {/* Illustration : une tasse au centre */}
          <SingleCup width={120} showCoffeeInside={true} withSteam={true} />

          <h2 style={{
            fontSize:22, fontWeight:900, color:'#D4A017',
            margin:0, lineHeight:1.2,
          }}>Pile de Tasses</h2>

          <p style={{
            color:'rgba(245, 239, 230, 0.85)', fontSize:13,
            margin:0, lineHeight:1.5, maxWidth:280,
          }}>
            Empile les tasses pile sur la précédente.
            <br/>
            Si tu rates, ta tasse rétrécit.
          </p>

          <div style={{
            background:'rgba(212, 160, 23, 0.15)',
            border:'1px solid rgba(212, 160, 23, 0.4)',
            borderRadius:12, padding:'8px 14px',
            fontSize:11, color:'#D4A017', fontWeight:700, letterSpacing:.2,
          }}>
            +{REWARD_PER_CUP} 🍪 par tasse · max {REWARD_CAP} 🍪 · combo +{COMBO_BONUS_AMOUNT} 🍪 si {'>'}{COMBO_THRESHOLD} tasses
          </div>

          <button
            onClick={handleStart}
            disabled={!canPlay}
            className={canPlay ? 'glow-anim' : ''}
            style={{
              background: canPlay ? GOLD : 'rgba(212, 160, 23, 0.3)',
              color: canPlay ? '#fff' : 'rgba(245, 239, 230, 0.5)',
              border:'none', borderRadius:14,
              padding:'14px 32px',
              fontSize:15, fontWeight:800, letterSpacing:.3,
              cursor: canPlay ? 'pointer' : 'not-allowed',
              boxShadow: canPlay ? '0 6px 20px rgba(212,160,23,.4)' : 'none',
              touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
            }}
          >
            {canPlay ? `Commencer (${COST_TO_PLAY} 🍪)` : `Pas assez (${COST_TO_PLAY} 🍪)`}
          </button>
        </div>
      </div>
    );
  }

  /* ════════ GAME OVER ════════ */
  if(phase === 'gameover'){
    const totalReward = reward + (comboBonus ? COMBO_BONUS_AMOUNT : 0);
    return (
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        gap:14, paddingTop:6, minHeight:'70vh', justifyContent:'center',
      }}>
        <div className="bi" style={{
          width:'100%', maxWidth:340,
          background:'linear-gradient(180deg, #3D2010 0%, #4A2C17 100%)',
          borderRadius:20, border:'1.5px solid rgba(212, 160, 23, 0.15)',
          padding:24,
          display:'flex', flexDirection:'column', alignItems:'center', gap:14,
          textAlign:'center',
        }}>
          <div style={{ fontSize:48, lineHeight:1 }}>🥞</div>
          <h2 style={{ fontSize:22, fontWeight:900, color:'#D4A017', margin:0 }}>
            Partie terminée !
          </h2>

          <div style={{
            background:'rgba(245, 239, 230, 0.06)',
            border:'1.5px solid rgba(212, 160, 23, 0.18)',
            borderRadius:14, padding:18,
            width:'100%', maxWidth:260,
          }}>
            <div style={{
              fontSize:11, color:'rgba(245, 239, 230, 0.6)',
              textTransform:'uppercase', letterSpacing:1.5, marginBottom:8,
            }}>
              Ton score
            </div>
            <div style={{ fontSize:40, fontWeight:900, color:'#D4A017', lineHeight:1 }}>
              {score}
            </div>
            <div style={{ fontSize:11, color:'rgba(245, 239, 230, 0.6)', marginTop:4 }}>
              tasses posées
            </div>
          </div>

          <div style={{
            background:GOLD, borderRadius:12,
            padding:'10px 20px', fontSize:16, fontWeight:800, color:'#fff',
            boxShadow:'0 4px 14px rgba(212,160,23,.4)',
          }}>
            +{totalReward} 🍪
          </div>

          {comboBonus && (
            <div style={{
              background:'rgba(212, 160, 23, 0.2)',
              border:'1px solid #D4A017', borderRadius:10,
              padding:'6px 12px',
              fontSize:12, color:'#D4A017', fontWeight:800,
            }}>
              🔥 Bonus combo +{COMBO_BONUS_AMOUNT} 🍪
            </div>
          )}

          <div style={{ display:'flex', gap:8, width:'100%', maxWidth:260, marginTop:6 }}>
            <button
              onClick={() => { playSound('toggle'); setPhase('intro'); }}
              style={{
                flex:1, padding:'12px',
                background:'rgba(245, 239, 230, 0.1)',
                border:'1.5px solid rgba(245, 239, 230, 0.2)',
                color:'#F5EFE6', borderRadius:12,
                fontSize:13, fontWeight:700, cursor:'pointer',
              }}
            >
              Quitter
            </button>
            <button
              onClick={handleStart}
              disabled={coins < COST_TO_PLAY}
              style={{
                flex:1, padding:'12px',
                background: coins >= COST_TO_PLAY ? GOLD : 'rgba(212, 160, 23, 0.3)',
                color:'#fff', border:'none', borderRadius:12,
                fontSize:13, fontWeight:800,
                cursor: coins >= COST_TO_PLAY ? 'pointer' : 'not-allowed',
                boxShadow: coins >= COST_TO_PLAY ? '0 4px 14px rgba(212,160,23,.4)' : 'none',
              }}
            >
              Rejouer ({COST_TO_PLAY} 🍪)
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════ PLAYING ════════ */
  const movingBottom = movingCup ? getMovingCupBottomPosition(stackedCups) : 0;

  /* Scale dynamique de la game area : quand la pile (+ tasse mobile +
     vapeur) approche du haut du game area, on dézoome progressivement
     pour que le sommet reste visible. transform-origin: bottom center
     pour garder la base de la pile fixe. */
  const movingTopHeight = movingCup
    ? movingCup.width * CUP_HEIGHT_RATIO + 50 * (movingCup.width / 100) + 20
    : 0;
  const totalContentHeight = movingBottom + movingTopHeight;
  const SAFE_VISIBLE_HEIGHT = 460;   // game area 520 - tap zone (~60)
  const stackScale = totalContentHeight > SAFE_VISIBLE_HEIGHT
    ? SAFE_VISIBLE_HEIGHT / totalContentHeight
    : 1;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, paddingTop:6 }}>
      {/* 2 cartes stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, width:'100%', maxWidth:340 }}>
        <StatCard value={score}  label="Tasses posées" />
        <StatCard value={reward} label="🍪 Gagnés" highlight={reward >= REWARD_CAP} />
      </div>

      {/* Game area */}
      <div
        onPointerDown={(e) => { e.preventDefault(); handleTap(); }}
        style={{
          position:'relative',
          width:'100%', maxWidth:GAME_AREA_WIDTH,
          height:520,
          background:'linear-gradient(180deg, #2A1408 0%, #3D2010 50%, #4A2C17 100%)',
          borderRadius:20,
          border:'1.5px solid rgba(212, 160, 23, 0.2)',
          overflow:'hidden',
          cursor:'pointer',
          touchAction:'manipulation',
          userSelect:'none', WebkitUserSelect:'none',
          boxShadow:'inset 0 0 60px rgba(0,0,0,.4)',
        }}
      >
        {/* Lumière d'ambiance — halo radial doré centré, donne un côté
            "spot lumineux d'un café feutré". */}
        <div style={{
          position:'absolute', inset:0,
          background:'radial-gradient(ellipse at 50% 35%, rgba(212,160,23,.18) 0%, transparent 60%)',
          pointerEvents:'none', zIndex:0,
        }}/>

        {/* Grains de café flottants en arrière-plan (6 grains, animation
            float décalée). Pure déco, pointer-events:none pour pas
            bouffer les taps. */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
          {[
            { top:'10%',  left:'8%',  size:18, rot:-25, delay:0    },
            { top:'70%',  left:'88%', size:16, rot:18,  delay:1.2  },
            { top:'42%',  left:'4%',  size:14, rot:35,  delay:.6   },
            { top:'85%',  left:'14%', size:15, rot:-18, delay:2.1  },
            { top:'18%',  left:'85%', size:17, rot:8,   delay:1.6  },
            { top:'58%',  left:'72%', size:13, rot:-30, delay:.3   },
          ].map((g, i) => (
            <CoffeeBean
              key={i}
              size={g.size}
              style={{
                position:'absolute', top:g.top, left:g.left,
                transform:`rotate(${g.rot}deg)`,
                opacity:.16,
                animation:`pyramidBeanFloat 6s ease-in-out ${g.delay}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Indicateur niveau */}
        <div style={{
          position:'absolute', top:14, left:14,
          background:'rgba(212, 160, 23, 0.18)',
          border:'1px solid rgba(212, 160, 23, 0.4)',
          color:'#D4A017', borderRadius:10,
          padding:'5px 10px', fontSize:11, fontWeight:800, zIndex:5,
        }}>
          Niveau {score}
        </div>

        {/* Wrapper qui dézoome quand la pile devient trop haute */}
        <div style={{
          position:'absolute', inset:0,
          transform: `scale(${stackScale})`,
          transformOrigin: 'bottom center',
          transition: 'transform .35s ease-out',
          pointerEvents:'none',
        }}>
          {/* Halo doré sur tasse parfaitement centrée */}
          {showPerfectGlow && (
            <div style={{
              position:'absolute',
              bottom: movingBottom - 5,
              left:'50%',
              width:180, height:30, borderRadius:'50%',
              background:'radial-gradient(ellipse, rgba(212,160,23,0.5) 0%, transparent 70%)',
              pointerEvents:'none',
              animation:'cupGameGlowPulse .8s ease-in-out',
              zIndex:1,
            }}/>
          )}

          {/* Tasse en mouvement */}
          {movingCup && (
            <div style={{
              position:'absolute',
              bottom: movingBottom,
              left:`calc(50% + ${movingCup.x}px - ${movingCup.width / 2}px)`,
              transition:'none',
              zIndex:4,
              pointerEvents:'none',
            }}>
              <SingleCup width={movingCup.width} showCoffeeInside={true} withSteam={true} />
            </div>
          )}

          {/* Pile de tasses + soucoupe */}
          <div style={{
            position:'absolute', bottom:STACK_BOTTOM,
            left:'50%', transform:'translateX(-50%)',
            display:'flex', flexDirection:'column-reverse', alignItems:'center',
            zIndex:2,
          }}>
            <Saucer />
            {stackedCups.map((cup, i) => (
              <div key={i} style={{
                /* +HANDLE_OFFSET_RATIO × width pour compenser l'anse à droite :
                   le centre du div SingleCup est décalé de 15 % vers la droite
                   par rapport au centre de la TASSE elle-même. */
                transform:`translateX(${cup.x + cup.width * HANDLE_OFFSET_RATIO}px)`,
                marginTop: STACK_OVERLAP === 0 ? 0 : -STACK_OVERLAP,
              }}>
                <SingleCup width={cup.width} showCoffeeInside={i === stackedCups.length - 1} withSteam={false} />
              </div>
            ))}
          </div>
        </div>

        {/* Particules grains au tap — jaillissent depuis le centre de
            la pile, biais vers le haut, rotation aléatoire. Pure déco. */}
        {tapParticles.length > 0 && (
          <div style={{
            position:'absolute',
            bottom: movingBottom * stackScale,
            left:'50%',
            pointerEvents:'none', zIndex:7,
            width:0, height:0,
          }}>
            {tapParticles.map(p => (
              <div
                key={p.id}
                style={{
                  position:'absolute', top:0, left:0,
                  width:8, height:6,
                  marginLeft:-4, marginTop:-3,
                  background:'#3D2010',
                  borderRadius:'50% / 60%',
                  border:'1px solid #5C3317',
                  '--ptx': `${p.tx}px`,
                  '--pty': `${p.ty}px`,
                  '--prot': `${p.rot}deg`,
                  animation:'pyramidBeanFly .7s ease-out forwards',
                }}
              />
            ))}
          </div>
        )}

        {/* Pop-up +{REWARD_PER_CUP} 🍪 */}
        {showRewardPopup && (
          <div style={{
            position:'absolute',
            top:'50%', left:'50%',
            transform:'translate(-50%, -50%)',
            background: GOLD, color:'#fff',
            padding:'6px 14px', borderRadius:100,
            fontWeight:800, fontSize:14, letterSpacing:.3,
            animation:'cupGameRewardFloat 1s ease-out',
            zIndex:6, pointerEvents:'none',
            boxShadow:'0 4px 12px rgba(212,160,23,.35)',
          }}>+{REWARD_PER_CUP} 🍪</div>
        )}

        {/* Tap zone */}
        <div style={{
          position:'absolute', bottom:12,
          left:'50%', transform:'translateX(-50%)',
          background:'rgba(212, 160, 23, 0.18)',
          border:'2px dashed #D4A017',
          borderRadius:14, padding:'10px 22px',
          color:'#D4A017', fontSize:12, fontWeight:800,
          textTransform:'uppercase', letterSpacing:2,
          animation:'cupGameTapPulse 1.4s ease-in-out infinite',
          pointerEvents:'none', zIndex:5,
          whiteSpace:'nowrap',
        }}>TAP pour poser</div>
      </div>

      {/* Tip */}
      <div style={{
        width:'100%', maxWidth:340,
        padding:'10px 14px', borderRadius:12,
        background:C.card, border:`1px solid ${C.border}`,
        fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center',
      }}>
        💡 Plus la pile monte, plus la tasse va vite. <strong style={{ color:'#D4A017' }}>Reste précis.</strong>
      </div>
    </div>
  );
}

function StatCard({ value, label, highlight = false }){
  return (
    <div style={{
      background:'rgba(245, 239, 230, 0.06)',
      border:`1.5px solid ${highlight ? '#D4A017' : 'rgba(212, 160, 23, 0.18)'}`,
      borderRadius:14, padding:'10px 12px', textAlign:'center',
      boxShadow: highlight ? '0 0 14px rgba(212,160,23,.4)' : 'none',
      transition:'all .25s',
    }}>
      <div style={{
        fontSize:22, fontWeight:900, color:'#D4A017', lineHeight:1,
      }}>{value}</div>
      <div style={{
        fontSize:10, color:'rgba(245, 239, 230, 0.65)',
        textTransform:'uppercase', letterSpacing:1.5,
        marginTop:6, fontWeight:700,
      }}>{label}</div>
    </div>
  );
}

function Saucer(){
  return (
    <div style={{ position:'relative', width:160, height:14, marginTop:0 }}>
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse at center, #5C3317 0%, #2C1810 100%)',
        borderRadius:'50%',
        border:'1px solid rgba(245, 239, 230, 0.15)',
        boxShadow:'inset 0 -2px 4px rgba(0,0,0,0.5)',
      }}/>
    </div>
  );
}

/* CoffeeBean — petit grain de café SVG décoratif. Forme ovoïde brun
   foncé avec rainure centrale, utilisé en arrière-plan flottant et
   en particule éphémère au tap. */
function CoffeeBean({ size = 16, style = {} }){
  return (
    <svg
      width={size} height={size * 1.3}
      viewBox="0 0 16 21"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      {/* Corps du grain */}
      <ellipse cx="8" cy="10.5" rx="6.5" ry="9.5" fill="#3D2010" stroke="#5C3317" strokeWidth=".8"/>
      {/* Rainure centrale */}
      <path d="M 8 2 Q 6 10.5 8 19" stroke="#1A0A04" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      {/* Highlight subtil */}
      <ellipse cx="6" cy="6" rx="1.5" ry="2.5" fill="rgba(255,200,140,.15)"/>
    </svg>
  );
}

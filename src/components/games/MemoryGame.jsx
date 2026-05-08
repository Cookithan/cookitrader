import { useEffect, useRef, useState } from "react";
import { GOLD } from "../../data/themes.js";
import { playSound } from "../../lib/audio.js";

/* ════════════════════════════════════════════════════
   MemoryGame — jeu de paires (PHASE 6B)
   ────────────────────────────────────────────────────
   Grille 4×3 (12 cartes = 6 paires) face cachée. Tap pour retourner.
   - COST = 10 cookies pour démarrer
   - Phases : idle → playing → done
   - 6 paires d'icônes : ☕ 🍪 🥐 🍫 🫖 🥛
   - Récompenses (selon nombre de coups) :
       12 (parfait) → +50 + record
       13-16        → +30
       17-20        → +15
       21+          → +5
   - Animations : flip 3D (rotateY 180), match → cardMatch (pulse doré
     + fadeOut), mismatch → shake puis re-flip.

   Compteur de "coups" = nombre de PAIRES tentées (chaque tap de 2e
   carte incrémente, qu'il y ait match ou non).

   Props : coins, onEarn, onSpend, C
═══════════════════════════════════════════════════════ */

export const MEMORY_COST = 10;
const ICONS = ['☕','🍪','🥐','🍫','🫖','🥛'];

function shuffledDeck(){
  const deck = [...ICONS, ...ICONS].map((icon, i) => ({ id:i, icon }));
  for(let i = deck.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i+1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function rewardFor(moves){
  if(moves <= 12) return 50;
  if(moves <= 16) return 30;
  if(moves <= 20) return 15;
  return 5;
}

export function MemoryGame({ coins, onEarn, onSpend, C }){
  const [phase,    setPhase]    = useState('idle');     // idle | playing | done
  const [deck,     setDeck]     = useState(()=>shuffledDeck());
  const [flipped,  setFlipped]  = useState([]);          // ids actuellement face visible (max 2)
  const [matched,  setMatched]  = useState([]);          // ids déjà appariés
  const [shaking,  setShaking]  = useState([]);          // ids en cours de mismatch (anim shake)
  const [moves,    setMoves]    = useState(0);
  const lockRef = useRef(false);                          // bloque les taps pendant l'attente

  /* Quand la dernière paire est trouvée → fin */
  useEffect(()=>{
    if(phase !== 'playing') return;
    if(matched.length === deck.length){
      const earned = rewardFor(moves);
      onEarn(earned);
      playSound('success');
      setTimeout(()=>setPhase('done'), 600);
    }
  }, [matched, deck.length, phase, moves, onEarn]);

  const startGame = () => {
    if(coins < MEMORY_COST) return;
    playSound('modal');
    onSpend(MEMORY_COST);
    setDeck(shuffledDeck());
    setFlipped([]); setMatched([]); setShaking([]);
    setMoves(0);
    lockRef.current = false;
    setPhase('playing');
  };

  const replay = () => setPhase('idle');

  const handleTap = (card) => {
    if(phase !== 'playing') return;
    if(lockRef.current) return;
    if(flipped.includes(card.id)) return;
    if(matched.includes(card.id)) return;

    /* Son flip à chaque carte retournée (utilise 'tap' — feutré) */
    playSound('tap');
    const next = [...flipped, card.id];
    setFlipped(next);

    if(next.length < 2) return;

    /* 2e carte retournée → on incrémente les coups, puis on évalue */
    setMoves(m => m + 1);
    lockRef.current = true;

    const [a, b] = next.map(id => deck.find(c => c.id === id));
    if(a.icon === b.icon){
      /* Match : son toggle (cliquetis doux), pulse doré, marquage matched */
      playSound('toggle');
      setTimeout(()=>{
        setMatched(prev => [...prev, a.id, b.id]);
        setFlipped([]);
        lockRef.current = false;
      }, 700);
    } else {
      /* Mismatch : son d'erreur, shake bref puis re-flip */
      playSound('error');
      setShaking(next);
      setTimeout(()=>{
        setFlipped([]);
        setShaking([]);
        lockRef.current = false;
      }, 700);
    }
  };

  const giveUp = () => {
    setPhase('done');
  };

  const earnedFinal = phase === 'done' && matched.length === deck.length ? rewardFor(moves) : 0;
  const isPerfect   = phase === 'done' && moves === 12 && matched.length === deck.length;
  const completed   = phase === 'done' && matched.length === deck.length;
  const canPlay     = coins >= MEMORY_COST;

  const btnLabel =
      phase === 'idle'    ? `Commencer (${MEMORY_COST} 🍪)`
    : phase === 'playing' ? '…'
    :                       `Rejouer (${MEMORY_COST} 🍪)`;

  /* Bannière de fin */
  const banner = phase === 'done'
    ? (completed
        ? (isPerfect
            ? { bg:'linear-gradient(135deg,#F5DC8A,#D4A017)', col:'#5D3A1F', border:'#D4A017', title:'🏆 Partie parfaite !' }
            : { bg:'linear-gradient(135deg,#FBEFD4,#F0C050)', col:'#5D3A1F', border:'#D4A017', title:`Bien joué ! ${moves} coups` })
        : { bg:'linear-gradient(135deg,#5A3520,#3D2010)', col:'#F0E0C0', border:'#3D2010', title:'Partie abandonnée' }
      )
    : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, paddingTop:6 }}>

      {/* 2 cartes stats */}
      <div style={{ display:'flex', gap:8, width:'100%', maxWidth:360 }}>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${phase==='playing'?'#D4A017':C.border}`, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ fontSize:11 }}>🎯</div>
          <div style={{ fontSize:22, fontWeight:900, color: phase==='playing'?'#D4A017':C.text, lineHeight:1.1 }}>{moves}</div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Coups</div>
        </div>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${C.border}`, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ fontSize:11 }}>✨</div>
          <div style={{ fontSize:22, fontWeight:900, color:C.text, lineHeight:1.1 }}>{matched.length/2}<span style={{ fontSize:13, color:C.muted, fontWeight:700 }}>/6</span></div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Paires</div>
        </div>
      </div>

      {/* Grille 4×3 */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8,
        width:'100%', maxWidth:360,
        padding:14, borderRadius:18,
        background:C.card, border:`1px solid ${C.border}`,
      }}>
        {deck.map(card => {
          const isFlipped = flipped.includes(card.id);
          const isMatched = matched.includes(card.id);
          const isShaking = shaking.includes(card.id);
          const visible   = isFlipped || isMatched;
          /* anim cardMatch déclenchée juste après le marquage matched */
          const matchAnim = isMatched ? 'cardMatch .8s ease-out forwards' : 'none';
          const shakeAnim = isShaking ? 'shake .25s ease-in-out 2' : 'none';
          const animation = isMatched ? matchAnim : shakeAnim;

          return (
            <button
              key={card.id}
              onClick={()=>handleTap(card)}
              disabled={visible || phase !== 'playing'}
              style={{
                aspectRatio:'1 / 1.15',
                borderRadius:12,
                perspective:600,
                background:'transparent',
                padding:0,
                cursor: phase==='playing' && !visible ? 'pointer' : 'default',
                animation,
              }}
            >
              <div style={{
                position:'relative', width:'100%', height:'100%',
                transformStyle:'preserve-3d',
                transform: visible ? 'rotateY(180deg)' : 'rotateY(0)',
                transition:'transform .45s cubic-bezier(.36,.07,.19,.97)',
              }}>
                {/* Face cachée (dos) */}
                <div style={{
                  position:'absolute', inset:0,
                  borderRadius:12,
                  background:'linear-gradient(135deg,#7D4E1F,#4A2C17)',
                  border:'1.5px solid #3D2010',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:22, color:'rgba(212,160,23,.55)',
                  backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
                  boxShadow:'0 4px 12px rgba(0,0,0,.18), inset 0 0 0 4px rgba(212,160,23,.18)',
                }}>
                  ☕
                </div>
                {/* Face visible */}
                <div style={{
                  position:'absolute', inset:0,
                  borderRadius:12,
                  background: isMatched
                    ? 'linear-gradient(135deg,#FBEFD4,#F0C050)'
                    : 'linear-gradient(135deg,#FBF3E2,#F0DFB6)',
                  border: `1.5px solid ${isMatched ? '#D4A017' : '#C8A878'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:30,
                  backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
                  transform:'rotateY(180deg)',
                  boxShadow: isMatched ? '0 4px 16px rgba(212,160,23,.4)' : '0 2px 6px rgba(0,0,0,.08)',
                }}>
                  {card.icon}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Texte d'instruction */}
      <div style={{ minHeight:18, fontSize:13, fontWeight:600, color: phase==='playing' ? '#D4A017' : C.muted, fontStyle: phase==='playing'?'normal':'italic', textAlign:'center' }}>
        {phase === 'idle'    && 'Trouve les 6 paires en un minimum de coups'}
        {phase === 'playing' && 'Mémorise et associe !'}
        {phase === 'done'    && (completed ? 'Bien joué !' : 'Tu peux mieux faire')}
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
              <div style={{ fontSize:18, fontWeight:900 }}>{moves}</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Coups</div>
            </div>
            <div style={{ width:1, background:'rgba(0,0,0,.15)' }} />
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>{matched.length/2}/6</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Paires</div>
            </div>
            <div style={{ width:1, background:'rgba(0,0,0,.15)' }} />
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>+{earnedFinal}</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Cookies</div>
            </div>
          </div>
        </div>
      )}

      {/* Bouton principal (commencer / rejouer) */}
      {phase !== 'playing' && (
        <button
          onClick={phase === 'done' ? replay : startGame}
          disabled={!canPlay && phase !== 'done'}
          className={canPlay ? 'glow-anim' : ''}
          style={{
            width:200, padding:'15px 0', borderRadius:22, fontSize:15, fontWeight:900, letterSpacing:.4,
            background: canPlay ? GOLD : C.card,
            color: canPlay ? '#fff' : C.muted,
            border:`2px solid ${canPlay ? 'transparent' : C.border}`,
            boxShadow: canPlay ? '0 6px 20px rgba(212,160,23,.4)' : 'none',
            cursor: canPlay ? 'pointer' : 'not-allowed',
            touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
          }}
        >
          {btnLabel}
        </button>
      )}

      {/* Bouton abandonner pendant la partie */}
      {phase === 'playing' && (
        <button
          onClick={giveUp}
          style={{
            width:200, padding:'12px 0', borderRadius:18, fontSize:13, fontWeight:700,
            background:'transparent', color:C.muted,
            border:`1.5px dashed ${C.border}`,
            cursor:'pointer',
          }}
        >
          Abandonner
        </button>
      )}

      {/* Tip card */}
      <div style={{ width:'100%', maxWidth:360, padding:'10px 14px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center' }}>
        💡 <strong style={{ color:'#D4A017' }}>12 coups = +50 🍪</strong> · 13–16 = +30 · 17–20 = +15 · 21+ = +5
      </div>
    </div>
  );
}

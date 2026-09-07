import { useEffect, useRef, useState } from "react";
import { GOLD } from "../../data/themes.js";
import { playSound } from "../../lib/audio.js";
import { useTranslation } from "../../i18n/index.js";
import { getActiveTheme } from "../../data/gameThemes.js";
import { GameThemeSwitcher } from "./GameThemeSwitcher.jsx";

/* ════════════════════════════════════════════════════
   MemoryGame — jeu de paires (PHASE 6B)
   ────────────────────────────────────────────────────
   Grille 4×3 (12 cartes = 6 paires) face cachée. Tap pour retourner.
   - COST = 10 cookies pour démarrer
   - Phases : idle → playing → done
   - 6 paires d'icônes : ☕ 🍪 🥐 🍫 🫖 🥛
   - Récompenses (selon nombre de coups) :
       6 (parfait)  → +50   (chaque paire trouvée du 1er coup)
       7-16         → +30
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
  /* +50 réservé au jeu parfait : 6 coups pile (chaque paire trouvée du
     1er coup, soit 12 cartes retournées sans aucune répétition). 6 est
     le minimum absolu — impossible de faire moins avec 6 paires. */
  if(moves <= 6)  return 50;
  if(moves <= 16) return 30;
  if(moves <= 20) return 15;
  return 5;
}

/* Bonus +10 🍪 quand on complète toutes les paires (6/6). */
const FULL_CLEAR_BONUS = 10;

/* Durée du "peek" initial (toutes les cartes face visible avant de
   commencer). 500 ms — assez bref pour rester un challenge, mais
   permet de balayer les positions une fois. */
const PEEK_DURATION_MS = 500;

export function MemoryGame({ coins, onEarn, onSpend, gameThemes, setGameThemes, unlocked = [], duelMode = false, onDuelScore, onDuelProgress, autoPlay = false, C }){
  const { t } = useTranslation();
  /* Thème actif — dos de carte personnalisé selon le skin. */
  const memoryTheme = getActiveTheme('memory', gameThemes || {});
  const mtd         = memoryTheme?.data || {};
  const [phase,    setPhase]    = useState('idle');     // idle | playing | done
  const [deck,     setDeck]     = useState(()=>shuffledDeck());
  const [flipped,  setFlipped]  = useState([]);          // ids actuellement face visible (max 2)
  const [matched,  setMatched]  = useState([]);          // ids déjà appariés
  const [shaking,  setShaking]  = useState([]);          // ids en cours de mismatch (anim shake)
  const [moves,    setMoves]    = useState(0);
  const [peek,     setPeek]     = useState(false);       // toutes les cartes face visible pendant PEEK_DURATION_MS
  const lockRef = useRef(false);                          // bloque les taps pendant l'attente
  const peekTRef = useRef(null);

  /* Cleanup du timer peek au unmount (sinon un changement de jeu en
     plein peek pouvait fire le timer après démontage). */
  useEffect(() => () => {
    if(peekTRef.current){ clearTimeout(peekTRef.current); peekTRef.current = null; }
  }, []);

  /* Fin de partie — la dernière paire vient d'être trouvée.

     ⚠️ EXPLOIT CORRIGÉ (v1.30) : ce bloc versait la récompense à CHAQUE
     exécution de l'effet, et rien ne garantissait qu'il ne tourne qu'une
     fois. onDuelScore et onDuelProgress sont de simples fonctions
     déclarées dans App.jsx (pas de useCallback) : elles changent
     d'identité à chaque rendu. Dès la dernière paire, la boucle
     s'auto-alimentait —
        effet → onEarn() → setCoins → App re-rend → nouvelle identité de
        callback → dépendances changées → effet → onEarn() → …
     — pendant les 600 ms qui précèdent le passage en 'done'. Résultat :
     des milliers de cookies par partie, et l'impossibilité de perdre.

     Le garde-fou ne repose PAS sur l'identité des callbacks (fragile) ni
     sur la course des 600 ms : un ref armé une seule fois par partie,
     désarmé dans startGame(). Les 3 autres jeux qui versent des cookies
     (Clic, Stop le café, Roue) le font depuis un gestionnaire
     d'événement, jamais depuis un effet : eux ne sont pas concernés. */
  const paidRef = useRef(false);
  useEffect(()=>{
    if(phase !== 'playing') return;
    if(matched.length !== deck.length) return;
    if(paidRef.current) return;
    paidRef.current = true;
    if(duelMode){
      onDuelScore?.(moves);   // duel : score = nb de coups (MOINS = mieux), zéro éco
    } else {
      const earned = rewardFor(moves) + FULL_CLEAR_BONUS;   // 6/6 → +10 🍪
      onEarn(earned);
    }
    playSound('success');
    setTimeout(()=>setPhase('done'), 600);
  }, [matched, deck.length, phase, moves, onEarn, duelMode, onDuelScore]);

  /* Duel : lance la partie automatiquement (zéro écran d'intro).
     setTimeout+cleanup = pattern StrictMode-safe : le double-montage dev
     annule le 1er timer, seul le dernier survit → UN seul lancement
     (sinon le peek initial ne se refermait jamais). */
  useEffect(() => {
    if(!duelMode) return;
    const t = setTimeout(() => startGame(), 0);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* Duel : remonte le nb de coups en direct (moins = mieux). */
  useEffect(() => { if(duelMode) onDuelProgress?.(moves); }, [moves, duelMode, onDuelProgress]);
  /* Duel auto-play : mémoire imparfaite. Retourne une carte, puis son
     jumeau s'il le « connaît » (70 %), sinon une autre au hasard. */
  useEffect(() => {
    if(!autoPlay || phase !== 'playing' || peek || lockRef.current) return;
    const unmatched = deck.filter(c => !matched.includes(c.id) && !flipped.includes(c.id));
    let target = null;
    if(flipped.length === 0){
      target = unmatched[Math.floor(Math.random() * unmatched.length)];
    } else if(flipped.length === 1){
      const first = deck.find(c => c.id === flipped[0]);
      const twin  = first && deck.find(c => c.icon === first.icon && c.id !== first.id && !matched.includes(c.id));
      const others = unmatched.filter(c => c.id !== flipped[0]);
      target = (twin && Math.random() < 0.7) ? twin : (others[Math.floor(Math.random() * Math.max(1, others.length))] || twin);
    }
    if(!target) return;
    const t = setTimeout(() => handleTap(target), 450 + Math.random() * 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, phase, peek, flipped, matched, deck]);
  const startGame = () => {
    if(!duelMode && coins < MEMORY_COST) return;
    playSound('modal');
    if(!duelMode) onSpend(MEMORY_COST);
    setDeck(shuffledDeck());
    setFlipped([]); setMatched([]); setShaking([]);
    setMoves(0);
    paidRef.current = false;   /* réarme le versement pour cette partie */
    lockRef.current = true; /* bloqué pendant le peek */
    setPhase('playing');
    setPeek(true);
    if(peekTRef.current) clearTimeout(peekTRef.current);
    peekTRef.current = setTimeout(() => {
      setPeek(false);
      lockRef.current = false;
      peekTRef.current = null;
    }, PEEK_DURATION_MS);
  };

  const replay = () => { playSound('modal'); setPhase('idle'); };

  const handleTap = (card) => {
    if(phase !== 'playing') return;
    if(lockRef.current) return;
    if(flipped.includes(card.id)) return;
    if(matched.includes(card.id)) return;

    /* Son flip dédié à chaque carte retournée */
    playSound('flip');
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
    playSound('toggle');
    setPhase('done');
  };

  const earnedFinal = phase === 'done' && matched.length === deck.length ? rewardFor(moves) + FULL_CLEAR_BONUS : 0;
  const isPerfect   = phase === 'done' && moves === 6 && matched.length === deck.length;
  const completed   = phase === 'done' && matched.length === deck.length;
  const canPlay     = coins >= MEMORY_COST;

  const btnLabel =
      phase === 'idle'    ? t('games.start_btn', { cost: MEMORY_COST })
    : phase === 'playing' ? '…'
    :                       t('games.replay_btn', { cost: MEMORY_COST });

  /* Bannière de fin */
  const banner = phase === 'done'
    ? (completed
        ? (isPerfect
            ? { bg:'linear-gradient(135deg,#F5DC8A,#D4A017)', col:'#5D3A1F', border:'#D4A017', title: t('game_memory.perfect_game') }
            : { bg:'linear-gradient(135deg,#FBEFD4,#F0C050)', col:'#5D3A1F', border:'#D4A017', title: t('game_memory.well_done_n', { n: moves }) })
        : { bg:'linear-gradient(135deg,#5A3520,#3D2010)', col:'#F0E0C0', border:'#3D2010', title: t('game_memory.abandoned') }
      )
    : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, paddingTop:6 }}>

      {/* 2 cartes stats */}
      <div style={{ display:'flex', gap:8, width:'100%', maxWidth:360 }}>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${phase==='playing'?'#D4A017':C.border}`, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ fontSize:11 }}>🎯</div>
          <div style={{ fontSize:22, fontWeight:900, color: phase==='playing'?'#D4A017':C.text, lineHeight:1.1 }}>{moves}</div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>{t('game_memory.moves_label')}</div>
        </div>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${C.border}`, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ fontSize:11 }}>✨</div>
          <div style={{ fontSize:22, fontWeight:900, color:C.text, lineHeight:1.1 }}>{matched.length/2}<span style={{ fontSize:13, color:C.muted, fontWeight:700 }}>/6</span></div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>{t('game_memory.pairs_label')}</div>
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
          const visible   = peek || isFlipped || isMatched;
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
                /* Pendant le peek : pas de transition → toutes les
                   cartes apparaissent en même temps, pas progressivement.
                   Après le peek (peek=false), la transition reprend
                   et anime le flip-back fluide. */
                transition: peek ? 'none' : 'transform .45s cubic-bezier(.36,.07,.19,.97)',
              }}>
                {/* Face cachée (dos) */}
                <div style={{
                  position:'absolute', inset:0,
                  borderRadius:12,
                  background: mtd.cardBack || 'linear-gradient(135deg,#7D4E1F,#4A2C17)',
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
        {phase === 'idle'    && t('game_memory.instruction_idle')}
        {phase === 'playing' && (peek ? t('game_memory.peek') : t('game_memory.play'))}
        {phase === 'done'    && (completed ? t('game_memory.well_done') : t('game_memory.try_better'))}
      </div>

      {/* Switcher de thème (idle uniquement) — pastilles des dos de
          carte débloqués. Masqué si rien à changer. */}
      {phase === 'idle' && (
        <GameThemeSwitcher
          gameId="memory"
          gameThemes={gameThemes}
          setGameThemes={setGameThemes}
          unlocked={unlocked}
        />
      )}

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
        💡 <strong style={{ color:'#D4A017' }}>6 coups = +50 🍪</strong> · 7–16 = +30 · 17–20 = +15 · 21+ = +5
      </div>
    </div>
  );
}

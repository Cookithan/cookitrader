import { useEffect, useRef, useState } from "react";
import { GOLD } from "../../data/themes.js";
import { COMMANDES } from "../../data/commandes.js";
import { CafeScene, CUSTOMERS } from "./CafeScene.jsx";

/* ════════════════════════════════════════════════════
   GuessGame — Devine la commande (PHASE 6C — refonte visuelle)
   ────────────────────────────────────────────────────
   Le joueur tient le comptoir d'un café. À chaque question, un client
   différent (parmi les 5 dessinés en SVG dans CafeScene) arrive depuis
   la droite, énonce sa demande dans une bulle (texte progressif), le
   joueur choisit parmi 4 réponses. 5 questions par partie.

   - COST   = 5 cookies
   - Phases globales : idle → playing → done
   - Sous-phases d'une question (`subPhase`) :
       'entering' (.8s anim walk-in synchronisée avec le CSS de
        CafeScene) → 'speaking' (bulle visible, texte progressif,
        choix actifs)
   - Pas de phase 'leaving' explicite : le `key` du customer change
     au passage à la question suivante, ce qui retrigger l'anim
     csCustomerWalkIn dans CafeScene.
   - Pas de répétition de question ni de client dans la même partie
     (5 indices distincts pour chaque banque).

   Récompenses :
     5/5 → +60   ·   4/5 → +35   ·   3/5 → +15   ·   0-2/5 → 0

   Choix : grille 2×2.
   - Bonne réponse cliquée  → fond #FBEFD4 + ✓ caramel
   - Mauvaise cliquée       → fond #E8DCC8 + ✗ + révéler la bonne
     (palette café-only pour l'UI fonctionnelle ; les illustrations
     des personnages dans CafeScene utilisent des couleurs réalistes)

   Props : coins, onEarn, onSpend, C
═══════════════════════════════════════════════════════ */

export const GUESS_COST = 5;
const NB_QUESTIONS = 5;
const TYPE_SPEED_MS = 28;
const WALK_IN_MS    = 800;          // synchronisé avec csCustomerWalkIn (.8s)
const ANSWER_HOLD_MS = 1100;        // temps avant de passer au client suivant

function pickQuestions(){
  const indices = [];
  while(indices.length < NB_QUESTIONS){
    const idx = Math.floor(Math.random() * COMMANDES.length);
    if(!indices.includes(idx)) indices.push(idx);
  }
  return indices.map(i => COMMANDES[i]);
}

function rewardFor(score){
  if(score === 5) return 100;
  if(score === 4) return 60;
  if(score === 3) return 25;
  return 0;
}

/* Tire `n` indices distincts dans [0, max[, mélangés. */
function pickCustomerIndices(n, max){
  const all = Array.from({ length: max }, (_, i) => i);
  for(let i = all.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i+1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, n);
}

export function GuessGame({ coins, onEarn, onSpend, C }){
  const [phase,    setPhase]    = useState('idle');         // idle | playing | done
  const [questions,setQuestions]= useState([]);              // 5 commandes tirées
  const [customerIndices, setCustomerIndices] = useState([]); // 5 indices dans CUSTOMERS
  const [qIndex,   setQIndex]   = useState(0);
  const [score,    setScore]    = useState(0);
  const [picked,   setPicked]   = useState(null);            // index choix sélectionné (null si pas encore)
  const [typed,    setTyped]    = useState('');              // texte affiché en bulle (progressif)
  const [subPhase, setSubPhase] = useState('entering');      // entering | speaking
  const typeRef    = useRef(null);
  const enterRef   = useRef(null);
  const advanceRef = useRef(null);

  /* Démarrage de chaque question : on lance l'animation d'entrée puis,
     après WALK_IN_MS, on passe en 'speaking' (la bulle s'ouvre). */
  useEffect(()=>{
    if(phase !== 'playing') return;
    setSubPhase('entering');
    setTyped('');
    setPicked(null);
    if(enterRef.current) clearTimeout(enterRef.current);
    enterRef.current = setTimeout(()=>setSubPhase('speaking'), WALK_IN_MS);
    return ()=>{ if(enterRef.current) clearTimeout(enterRef.current); };
  }, [phase, qIndex]);

  /* Écriture progressive : se lance quand le client est arrivé */
  useEffect(()=>{
    if(phase !== 'playing' || subPhase !== 'speaking') return;
    const full = questions[qIndex]?.desc || '';
    setTyped('');
    let i = 0;
    typeRef.current = setInterval(()=>{
      i++;
      setTyped(full.slice(0, i));
      if(i >= full.length) clearInterval(typeRef.current);
    }, TYPE_SPEED_MS);
    return ()=>{ if(typeRef.current) clearInterval(typeRef.current); };
  }, [phase, subPhase, qIndex, questions]);

  /* Cleanup global */
  useEffect(()=>()=>{
    if(typeRef.current)    clearInterval(typeRef.current);
    if(enterRef.current)   clearTimeout(enterRef.current);
    if(advanceRef.current) clearTimeout(advanceRef.current);
  },[]);

  const startGame = () => {
    if(coins < GUESS_COST) return;
    onSpend(GUESS_COST);
    const qs = pickQuestions();
    setQuestions(qs);
    setCustomerIndices(pickCustomerIndices(NB_QUESTIONS, CUSTOMERS.length));
    setQIndex(0);
    setScore(0);
    setPicked(null);
    setSubPhase('entering');
    setPhase('playing');
  };

  const replay = () => setPhase('idle');

  const onPick = (idx) => {
    if(picked !== null) return;            // déjà choisi
    if(phase !== 'playing') return;
    if(subPhase !== 'speaking') return;    // pas pendant l'entrée
    if(typeRef.current) clearInterval(typeRef.current);
    setTyped(questions[qIndex].desc);      // affiche le texte complet
    setPicked(idx);

    const correct = questions[qIndex].answer;
    const isRight = idx === correct;
    if(isRight) setScore(s => s + 1);

    /* On garde ANSWER_HOLD_MS pour laisser voir ✓/✗, puis on incrémente
       qIndex. Le `key` du customer change → l'anim csCustomerWalkIn se
       rejoue (le brief précise que ça suffit visuellement). */
    advanceRef.current = setTimeout(()=>{
      const nextIdx = qIndex + 1;
      if(nextIdx >= NB_QUESTIONS){
        const finalScore = score + (isRight ? 1 : 0);
        const earned = rewardFor(finalScore);
        if(earned > 0) onEarn(earned);
        setPhase('done');
      } else {
        setQIndex(nextIdx);
      }
    }, ANSWER_HOLD_MS);
  };

  const canPlay = coins >= GUESS_COST;
  const current = questions[qIndex];
  const correctIdx = current?.answer;
  const isAnswered = picked !== null;
  const isRight = picked === correctIdx;

  /* Bannière de fin */
  const banner = phase === 'done'
    ? (score === 5
        ? { bg:'linear-gradient(135deg,#F5DC8A,#D4A017)', col:'#5D3A1F', border:'#D4A017', title:'🏆 Sans-faute !' }
        : score >= 3
          ? { bg:'linear-gradient(135deg,#FBEFD4,#F0C050)', col:'#5D3A1F', border:'#D4A017', title:`Bien joué ! ${score}/5` }
          : { bg:'linear-gradient(135deg,#5A3520,#3D2010)', col:'#F0E0C0', border:'#3D2010', title:`${score}/5 — pas de récompense` })
    : null;
  const earnedFinal = rewardFor(score);

  const btnLabel =
      phase === 'idle'    ? `Commencer (${GUESS_COST} 🍪)`
    : phase === 'playing' ? '…'
    :                       `Rejouer (${GUESS_COST} 🍪)`;

  /* Couleur d'un bouton selon état */
  const choiceStyle = (idx) => {
    let bg = C.card;
    let border = C.border;
    let fg = C.text;
    if(isAnswered){
      if(idx === correctIdx){
        bg = '#FBEFD4'; border = '#D4A017'; fg = '#5D3A1F';
      } else if(idx === picked){
        bg = '#E8DCC8'; border = '#8B5A2B'; fg = '#4A2C17';
      } else {
        bg = C.card; border = C.border; fg = C.muted;
      }
    }
    return {
      padding:'14px 12px', borderRadius:14,
      background:bg, color:fg,
      border:`1.5px solid ${border}`,
      fontSize:13, fontWeight:700, lineHeight:1.3,
      cursor: isAnswered ? 'default' : 'pointer',
      textAlign:'center',
      transition:'background .25s, border-color .25s, color .25s',
      minHeight:60,
      display:'flex', alignItems:'center', justifyContent:'center', gap:6,
      position:'relative',
      touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
    };
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, paddingTop:6 }}>

      {/* 2 cartes stats */}
      <div style={{ display:'flex', gap:8, width:'100%', maxWidth:360 }}>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${phase==='playing'?'#D4A017':C.border}`, textAlign:'center' }}>
          <div style={{ fontSize:11 }}>📋</div>
          <div style={{ fontSize:22, fontWeight:900, color: phase==='playing'?'#D4A017':C.text, lineHeight:1.1 }}>
            {phase==='playing' ? qIndex+1 : phase==='done' ? NB_QUESTIONS : 0}<span style={{ fontSize:13, color:C.muted, fontWeight:700 }}>/{NB_QUESTIONS}</span>
          </div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Question</div>
        </div>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${C.border}`, textAlign:'center' }}>
          <div style={{ fontSize:11 }}>✨</div>
          <div style={{ fontSize:22, fontWeight:900, color:C.text, lineHeight:1.1 }}>{score}<span style={{ fontSize:13, color:C.muted, fontWeight:700 }}>/{NB_QUESTIONS}</span></div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Score</div>
        </div>
      </div>

      {/* Barre de progression */}
      <div style={{ width:'100%', maxWidth:360, height:6, borderRadius:3, background:C.card2, overflow:'hidden', border:`1px solid ${C.border}` }}>
        <div style={{
          height:'100%', borderRadius:3,
          width: `${((phase==='playing' ? qIndex : phase==='done' ? NB_QUESTIONS : 0) / NB_QUESTIONS) * 100}%`,
          background: 'linear-gradient(90deg, #C17F3C, #D4A017)',
          transition: 'width .4s ease',
        }} />
      </div>

      {/* Scène café POV barista — voir CafeScene.jsx pour le détail.
          Le `key` du customer change à chaque qIndex → React démonte/
          remonte la div .cs-customer et l'anim csCustomerWalkIn se
          rejoue. La bulle ne s'affiche qu'en sub-phase 'speaking'. */}
      {phase === 'playing' && current && customerIndices.length > 0 && (
        <div style={{ width:'100%', maxWidth:360 }}>
          <CafeScene
            customer={CUSTOMERS[customerIndices[qIndex]]}
            dialogText={typed}
            subPhase={subPhase}
          />
        </div>
      )}

      {/* Choix 2×2 */}
      {phase === 'playing' && current && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, width:'100%', maxWidth:360 }}>
          {current.choices.map((label, idx) => {
            const showCheck = isAnswered && idx === correctIdx;
            const showCross = isAnswered && idx === picked && idx !== correctIdx;
            const choicesActive = subPhase === 'speaking' && !isAnswered;
            return (
              <button
                key={idx}
                onClick={()=>onPick(idx)}
                disabled={!choicesActive}
                style={{ ...choiceStyle(idx), opacity: subPhase==='entering' ? .55 : 1, transition:'opacity .3s, background .25s, border-color .25s, color .25s' }}
              >
                <span>{label}</span>
                {showCheck && <span style={{ fontSize:18, color:'#C17F3C', fontWeight:900 }}>✓</span>}
                {showCross && <span style={{ fontSize:18, color:'#8B5A2B', fontWeight:900 }}>✗</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Texte d'instruction */}
      {phase !== 'done' && (
        <div style={{ minHeight:18, fontSize:13, fontWeight:600, color: phase==='playing' ? (isAnswered ? (isRight ? '#D4A017' : '#8B5A2B') : C.muted) : C.muted, fontStyle: phase==='playing' && !isAnswered ?'italic':'normal', textAlign:'center' }}>
          {phase === 'idle'    && 'Devine ce que veut le client !'}
          {phase === 'playing' && !isAnswered && 'Choisis la bonne réponse'}
          {phase === 'playing' && isAnswered && (isRight ? '✓ Bien vu !' : '✗ Raté')}
        </div>
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
              <div style={{ fontSize:18, fontWeight:900 }}>{score}/{NB_QUESTIONS}</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Score</div>
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

      {/* Tip card */}
      <div style={{ width:'100%', maxWidth:360, padding:'10px 14px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center' }}>
        💡 <strong style={{ color:'#D4A017' }}>5/5 = +60 🍪</strong> · 4/5 = +35 · 3/5 = +15 · 2/5 ou moins = 0
      </div>
    </div>
  );
}

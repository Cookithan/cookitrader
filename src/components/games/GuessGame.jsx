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
   joueur choisit parmi 4 réponses. 5 questions par partie (8 au niv 10+).

   - COST   = 5 cookies
   - Phases globales : idle → playing → done
   - Sous-phases d'une question (`subPhase`) :
       'entering' (.8s anim walk-in synchronisée avec le CSS de
        CafeScene) → 'speaking' (bulle visible, texte progressif,
        choix actifs)
   - Pas de phase 'leaving' explicite : le `key` du customer change
     au passage à la question suivante, ce qui retrigger l'anim
     csCustomerWalkIn dans CafeScene.
   - Pas de répétition de question ni de client dans la même partie.

   Récompenses (mêmes paliers, plus dur au niv 10+) :
     5/5 ou 8/8 → +100  ·  4/5 ou 7/8 → +60  ·  3/5 ou 6/8 → +25  ·  sinon 0

   Mode Expert retiré le 09/05/2026 — toutes les questions sont du
   pool unique standard (65 entrées dans commandes.js).

   Choix : grille 2×2.
   - Bonne réponse cliquée  → fond #FBEFD4 + ✓ caramel
   - Mauvaise cliquée       → fond #E8DCC8 + ✗ + révéler la bonne

   Props : coins, onEarn, onSpend, level, C
═══════════════════════════════════════════════════════ */

export const GUESS_COST = 5;
const TYPE_SPEED_MS = 28;
const WALK_IN_MS    = 800;          // synchronisé avec csCustomerWalkIn (.8s)
const ANSWER_HOLD_MS = 1100;        // temps avant de passer au client suivant

/* Tire `nbQuestions` commandes uniques du pool unique. */
function pickQuestions(nbQuestions){
  const max  = COMMANDES.length;
  const indices = [];
  while(indices.length < Math.min(nbQuestions, max)){
    const idx = Math.floor(Math.random() * max);
    if(!indices.includes(idx)) indices.push(idx);
  }
  return indices.map(i => COMMANDES[i]);
}

/* Paliers de récompense — adaptés au nb de questions (5 ou 8).
   Le perfect rapporte 100 dans les 2 modes ; au niv 10+ il faut juste
   plus de bonnes réponses pour atteindre chaque palier. */
function rewardFor(score, total){
  if(total === 8){
    if(score === 8) return 100;
    if(score === 7) return 60;
    if(score === 6) return 25;
    return 0;
  }
  if(score === 5) return 100;
  if(score === 4) return 60;
  if(score === 3) return 25;
  return 0;
}

/* Tire `n` indices dans [0, max[, mélangés. Si n > max (ex: 8 questions
   pour 5 clients), on cycle plusieurs fois en évitant la répétition
   consécutive entre 2 cycles. Garantit toujours `n` éléments → pas
   d'`undefined` qui ferait planter le rendu CafeScene. */
function pickCustomerIndices(n, max){
  if(max === 0) return [];
  const result = [];
  while(result.length < n){
    const cycle = Array.from({ length: max }, (_, i) => i);
    /* Fisher-Yates shuffle */
    for(let i = cycle.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [cycle[i], cycle[j]] = [cycle[j], cycle[i]];
    }
    /* Eviter qu'un cycle commence par le même client que le dernier ajouté */
    if(result.length > 0 && cycle[0] === result[result.length - 1] && cycle.length > 1){
      [cycle[0], cycle[1]] = [cycle[1], cycle[0]];
    }
    for(let i = 0; i < cycle.length && result.length < n; i++){
      result.push(cycle[i]);
    }
  }
  return result;
}

export function GuessGame({ coins, onEarn, onSpend, onEventChallenge, level = 1, C }){
  /* Niveau 10+ : 8 questions par partie au lieu de 5, pour le même
     palier de récompense (= plus exigeant, pas plus rentable). */
  const NB_QUESTIONS = level >= 10 ? 8 : 5;
  const [phase,    setPhase]    = useState('idle');         // idle | playing | done
  const [questions,setQuestions]= useState([]);              // commandes tirées
  const [customerIndices, setCustomerIndices] = useState([]); // indices dans CUSTOMERS
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
    const qs = pickQuestions(NB_QUESTIONS);
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
        const earned = rewardFor(finalScore, NB_QUESTIONS);
        if(earned > 0) onEarn(earned);
        /* Event 'guess_perfect' : succès si toutes les questions correctes */
        if(finalScore === NB_QUESTIONS) onEventChallenge?.('guess_perfect', 1);
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

  /* Bannière de fin — gold pour parfait, caramel pour palier intermédiaire,
     espresso si pas de récompense (sub-tier de bonnes réponses) */
  const earnedFinal = rewardFor(score, NB_QUESTIONS);
  const banner = phase === 'done'
    ? (score === NB_QUESTIONS
        ? { bg:'linear-gradient(135deg,#F5DC8A,#D4A017)', col:'#5D3A1F', border:'#D4A017', title:'🏆 Sans-faute !' }
        : earnedFinal > 0
          ? { bg:'linear-gradient(135deg,#FBEFD4,#F0C050)', col:'#5D3A1F', border:'#D4A017', title:`Bien joué ! ${score}/${NB_QUESTIONS}` }
          : { bg:'linear-gradient(135deg,#5A3520,#3D2010)', col:'#F0E0C0', border:'#3D2010', title:`${score}/${NB_QUESTIONS} — pas de récompense` })
    : null;

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

      {/* Badge "Défi 8 questions" pour les joueurs niv 10+ */}
      {NB_QUESTIONS === 8 && phase === 'idle' && (
        <div style={{
          display:'inline-block', padding:'5px 12px', borderRadius:11,
          background:'linear-gradient(135deg,#3D2010,#7D4E1F)',
          color:'#F0C050', fontSize:10, fontWeight:900, letterSpacing:1.5, textTransform:'uppercase',
          border:'1.5px solid rgba(212,160,23,.5)',
          boxShadow:'0 3px 10px rgba(74,44,23,.35)',
        }}>
          🎯 Défi 8 questions (niv 10+)
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

      {/* Tip card — paliers selon le mode (5 ou 8 questions) */}
      <div style={{ width:'100%', maxWidth:360, padding:'10px 14px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center' }}>
        💡 <strong style={{ color:'#D4A017' }}>{NB_QUESTIONS}/{NB_QUESTIONS} = +100 🍪</strong> · {NB_QUESTIONS-1}/{NB_QUESTIONS} = +60 · {NB_QUESTIONS-2}/{NB_QUESTIONS} = +25 · moins = 0
      </div>
    </div>
  );
}

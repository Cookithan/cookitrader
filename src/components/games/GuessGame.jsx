import { useEffect, useRef, useState } from "react";
import { GOLD } from "../../data/themes.js";
import { COMMANDES } from "../../data/commandes.js";

/* ════════════════════════════════════════════════════
   GuessGame — Devine la commande (PHASE 6C)
   ────────────────────────────────────────────────────
   Le joueur tient le comptoir d'un café. Un client entre par la droite,
   marche jusqu'au comptoir, puis énonce sa demande dans une bulle (texte
   tapé caractère par caractère). Le joueur choisit la bonne réponse
   parmi 4. À la réponse, le client repart par la gauche et le suivant
   arrive. 5 clients par partie.

   - COST   = 5 cookies
   - Phases globales : idle → playing → done
   - Sous-phases d'une question (`subPhase`) :
       'entering' (1.5s anim walk-in) →
       'speaking' (bulle apparaît, texte progressif, choix actifs) →
       'leaving'  (.8s anim walk-out après réponse) → question suivante
   - Pas de répétition dans la même partie (5 indices distincts).

   Récompenses :
     5/5 → +60   ·   4/5 → +35   ·   3/5 → +15   ·   0-2/5 → 0

   Choix : grille 2×2.
   - Bonne réponse cliquée  → fond #FBEFD4 + ✓ caramel
   - Mauvaise cliquée       → fond #E8DCC8 + ✗ + révéler la bonne
     (palette café-only, pas de rouge ni de vert)

   Props : coins, onEarn, onSpend, C
═══════════════════════════════════════════════════════ */

export const GUESS_COST = 5;
const NB_QUESTIONS = 5;
const TYPE_SPEED_MS = 28;
const WALK_IN_MS    = 1500;
const WALK_OUT_MS   = 800;
const ANSWER_HOLD_MS = 700;
const CLIENT_EMOJIS = ['🧑','👩','🧓','👵','🧔','👨','🧑‍🦱','👩‍🦰','👨‍🦱','🧑‍🎓'];

function pickQuestions(){
  const indices = [];
  while(indices.length < NB_QUESTIONS){
    const idx = Math.floor(Math.random() * COMMANDES.length);
    if(!indices.includes(idx)) indices.push(idx);
  }
  return indices.map(i => COMMANDES[i]);
}

function rewardFor(score){
  if(score === 5) return 60;
  if(score === 4) return 35;
  if(score === 3) return 15;
  return 0;
}

export function GuessGame({ coins, onEarn, onSpend, C }){
  const [phase,    setPhase]    = useState('idle');         // idle | playing | done
  const [questions,setQuestions]= useState([]);              // 5 commandes tirées
  const [clients,  setClients]  = useState([]);              // 5 emojis (un par client)
  const [qIndex,   setQIndex]   = useState(0);
  const [score,    setScore]    = useState(0);
  const [picked,   setPicked]   = useState(null);            // index choix sélectionné (null si pas encore)
  const [typed,    setTyped]    = useState('');              // texte affiché en bulle (progressif)
  const [subPhase, setSubPhase] = useState('entering');      // entering | speaking | leaving
  const typeRef     = useRef(null);
  const enterRef    = useRef(null);
  const leaveRef    = useRef(null);

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
    if(typeRef.current)  clearInterval(typeRef.current);
    if(enterRef.current) clearTimeout(enterRef.current);
    if(leaveRef.current) clearTimeout(leaveRef.current);
  },[]);

  const startGame = () => {
    if(coins < GUESS_COST) return;
    onSpend(GUESS_COST);
    const qs = pickQuestions();
    setQuestions(qs);
    setClients(qs.map(()=>CLIENT_EMOJIS[Math.floor(Math.random()*CLIENT_EMOJIS.length)]));
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
    if(subPhase !== 'speaking') return;    // pas pendant l'entrée/sortie
    if(typeRef.current) clearInterval(typeRef.current);
    setTyped(questions[qIndex].desc);      // affiche le texte complet
    setPicked(idx);

    const correct = questions[qIndex].answer;
    const isRight = idx === correct;
    if(isRight) setScore(s => s + 1);

    /* Séquence : on garde 700ms pour voir le résultat,
       puis 800ms d'animation de sortie, puis question suivante. */
    leaveRef.current = setTimeout(()=>{
      setSubPhase('leaving');
      leaveRef.current = setTimeout(()=>{
        const nextIdx = qIndex + 1;
        if(nextIdx >= NB_QUESTIONS){
          const finalScore = score + (isRight ? 1 : 0);
          const earned = rewardFor(finalScore);
          if(earned > 0) onEarn(earned);
          setPhase('done');
        } else {
          setQIndex(nextIdx);
          /* le useEffect [phase, qIndex] redémarre subPhase='entering' */
        }
      }, WALK_OUT_MS);
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

      {/* Scène comptoir : sol, comptoir, machine à café, serveur (gauche),
          client qui marche depuis la droite. La bulle apparaît au-dessus
          du client une fois qu'il s'est arrêté. */}
      {phase === 'playing' && current && (
        <div style={{
          position:'relative', width:'100%', maxWidth:360, height:200,
          borderRadius:18, overflow:'hidden',
          border:`1px solid ${C.border}`,
          background:'linear-gradient(180deg,#F5E5C8 0%,#FBEFD4 58%,#D8B98F 58%,#C8A878 100%)',
          boxShadow:'inset 0 -8px 18px rgba(74,44,23,.15)',
        }}>
          {/* Étagère arrière-plan : tasses suspendues */}
          <div style={{ position:'absolute', top:6, left:'4%', right:'4%', height:18, display:'flex', justifyContent:'space-around', fontSize:13, opacity:.7, color:'#8B5A2B' }}>
            <span>☕</span><span>🍪</span><span>☕</span><span>🥐</span><span>☕</span>
          </div>

          {/* Comptoir (rectangle marron qui occupe la moitié gauche, posé au sol) */}
          <div style={{
            position:'absolute', left:0, bottom:0, width:'48%', height:'42%',
            background:'linear-gradient(180deg,#7D4E1F 0%,#5A3520 35%,#4A2C17 100%)',
            borderTop:'3px solid #3D2010',
            borderRight:'2px solid #3D2010',
            boxShadow:'4px 0 12px rgba(0,0,0,.18)',
          }}>
            {/* Reflet sur le plan de travail */}
            <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:'linear-gradient(90deg,rgba(212,160,23,.3),rgba(255,255,255,.5),rgba(212,160,23,.3))' }} />
          </div>

          {/* Machine à café derrière le comptoir */}
          <div style={{ position:'absolute', left:'6%', bottom:'42%', fontSize:24, lineHeight:1, filter:'drop-shadow(0 2px 3px rgba(0,0,0,.25))' }}>
            ☕
          </div>

          {/* Serveur (le joueur) — derrière le comptoir, mi-corps */}
          <div style={{ position:'absolute', left:'24%', bottom:'38%', fontSize:38, lineHeight:1, filter:'drop-shadow(0 3px 4px rgba(0,0,0,.22))' }}>
            👨‍🍳
          </div>

          {/* Client qui marche : son origin est right:8% bottom:6%,
              et l'animation translateX s'applique relativement à cette
              position (commence hors-écran à droite, finit à right:8%). */}
          <div
            key={`${qIndex}-${subPhase}`}
            style={{
              position:'absolute', right:'8%', bottom:'6%',
              fontSize:42, lineHeight:1,
              filter:'drop-shadow(0 3px 4px rgba(0,0,0,.22))',
              animation:
                subPhase==='entering' ? `clientWalkIn ${WALK_IN_MS}ms cubic-bezier(.4,.05,.3,1) forwards` :
                subPhase==='leaving'  ? `clientWalkOut ${WALK_OUT_MS}ms ease-in forwards` :
                'none',
              willChange:'transform',
            }}
          >
            {clients[qIndex]}
          </div>

          {/* Bulle de dialogue (apparaît quand le client s'est arrêté) */}
          {subPhase === 'speaking' && (
            <div style={{
              position:'absolute', right:'4%', bottom:'58%',
              maxWidth:'62%',
              padding:'10px 13px',
              borderRadius:'14px 14px 4px 14px',
              background:'#FBF3E2',
              border:'1.5px solid #C8A878',
              color:'#4A2C17',
              fontSize:12, lineHeight:1.4, fontStyle:'italic',
              boxShadow:'0 4px 12px rgba(74,44,23,.22)',
              animation:'bubblePopIn .35s cubic-bezier(.36,.07,.19,.97) both',
              zIndex:5,
            }}>
              « {typed}<span style={{ opacity: typed.length === current.desc.length ? 0 : 1, color:'#D4A017', fontWeight:900 }}>|</span> »
            </div>
          )}
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

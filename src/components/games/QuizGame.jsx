import { useState, useEffect, useRef } from "react";
import { Cookie } from "lucide-react";
import { QUESTIONS } from "../../data/constants.js";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { playSound } from "../../lib/audio.js";

/* ════════════════════════════════════════════════════
   QuizGame — 3 questions tirées dans la difficulté choisie
   - Choix difficulté : Facile / Moyen / Expert (récompense par question 20 / 35 / 60)
   - Aide : −10 🍪 pour cacher 2 mauvaises réponses ; apparaît après 8s d'inaction
   - Cooldown : QUIZ_COOLDOWN_MS (5h). Géré par le parent via msLeft.
   - Couleurs feedback : OR clair pour bonne réponse, MOKA foncé pour mauvaise
                         (jamais vert/rouge — règle palette café-only)
═══════════════════════════════════════════════════════ */

export const QUIZ_QUESTIONS_PER_SESSION = 3;
export const QUIZ_HINT_COST = 10;
export const QUIZ_HINT_DELAY_MS = 8000;

export function QuizGame({ canPlay, msLeft, coins, onEarn, onSpend, onDone, onClose, onEventChallenge, C }) {
  const [chosenDifficulty, setChosenDifficulty] = useState(null);
  const [qIndices,         setQIndices]         = useState([]);

  const pickQuestions = (difficulty) => {
    const pool = QUESTIONS.map((_,i)=>i).filter(i => QUESTIONS[i].difficulty === difficulty);
    const picks = [];
    for (let n=0; n<QUIZ_QUESTIONS_PER_SESSION && pool.length; n++){
      picks.push(pool.splice(Math.floor(Math.random()*pool.length), 1)[0]);
    }
    setQIndices(picks);
    setChosenDifficulty(difficulty);
  };

  const [step,           setStep]           = useState(0);
  const [sel,            setSel]            = useState(null);
  const [hiddenChoices,  setHiddenChoices]  = useState([]);
  const [hintUsed,       setHintUsed]       = useState(false);
  const [hintAvailable,  setHintAvailable]  = useState(false);
  const [score,          setScore]          = useState(0);
  const [correctCount,   setCorrectCount]   = useState(0);
  const [allDone,        setAllDone]        = useState(false);

  const mountRef  = useRef(Date.now());
  const baseMsRef = useRef(msLeft);
  const [, setTick] = useState(0);

  /* timer du compte à rebours quand verrouillé */
  useEffect(() => {
    if(canPlay) return;
    const id = setInterval(() => setTick(t => t+1), 1000);
    return () => clearInterval(id);
  }, [canPlay]);

  /* timer d'apparition de l'aide à chaque nouvelle question */
  useEffect(() => {
    if(!canPlay || allDone || sel !== null) return;
    setHintAvailable(false);
    const id = setTimeout(() => setHintAvailable(true), QUIZ_HINT_DELAY_MS);
    return () => clearTimeout(id);
  }, [step, sel, canPlay, allDone]);

  if(!canPlay && step === 0 && sel === null && !allDone) {
    const elapsed = Date.now() - mountRef.current;
    const remaining = Math.max(0, baseMsRef.current - elapsed);
    const totalSec = Math.ceil(remaining/1000);
    const h = Math.floor(totalSec/3600);
    const m = Math.floor((totalSec%3600)/60);
    const sec = totalSec%60;
    const label = h>0 ? `${h}h ${m.toString().padStart(2,'0')}min` : m>0 ? `${m}min ${sec.toString().padStart(2,'0')}s` : `${sec}s`;
    return (
      <div style={{ textAlign:'center', paddingTop:60 }}>
        <div style={{ fontSize:48, marginBottom:14 }}>⏳</div>
        <div style={{ fontSize:20, fontWeight:800, color:C.text }}>Prochain quiz disponible dans</div>
        <div style={{ fontSize:30, fontWeight:900, color:'#D4A017', marginTop:10, fontVariantNumeric:'tabular-nums' }}>{label}</div>
        <div style={{ fontSize:13, color:C.muted, marginTop:14, lineHeight:1.55, maxWidth:280, margin:'14px auto 0' }}>
          Un nouveau quiz s'ouvre toutes les 5 heures. Reviens plus tard !
        </div>
      </div>
    );
  }

  if(allDone) return (
    <div className="su" style={{ textAlign:'center', paddingTop:50 }}>
      <div className="bi" style={{ fontSize:56, marginBottom:14 }}>{correctCount===QUIZ_QUESTIONS_PER_SESSION?'🏆':correctCount>0?'☕':'😢'}</div>
      <div style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:6 }}>
        {correctCount===QUIZ_QUESTIONS_PER_SESSION?'Sans-faute !':correctCount>0?`${correctCount} bonne${correctCount>1?'s':''} réponse${correctCount>1?'s':''}`:'Aucune bonne réponse'}
      </div>
      <div style={{ fontSize:14, color:C.muted, marginBottom:24 }}>{correctCount}/{QUIZ_QUESTIONS_PER_SESSION} questions</div>

      <button
        onClick={onClose}
        className={score>0 ? 'glow-anim' : ''}
        style={{
          display:'inline-flex', alignItems:'center', gap:10,
          padding:'14px 28px', borderRadius:20,
          background: score>0 ? GOLD : C.card,
          border:`2px solid ${score>0?'transparent':C.border}`,
          boxShadow: score>0?'0 6px 20px rgba(212,160,23,.4)':'none',
          cursor:'pointer'
        }}
      >
        <Cookie size={20} color={score>0?'#fff':C.muted} />
        <span style={{ fontSize:20, fontWeight:800, color:score>0?'#fff':C.muted }}>Récupérer +{score} 🍪</span>
      </button>

      <div style={{ fontSize:12, color:C.muted, marginTop:18 }}>Reviens dans 5h pour un nouveau quiz</div>
    </div>
  );

  if(chosenDifficulty === null) {
    const LEVELS = [
      { id:'Facile', emoji:'🌱', reward:20, bg:'#E5B040', desc:'Questions abordables' },
      { id:'Moyen',  emoji:'☕', reward:35, bg:'#C17F3C', desc:'Pour les amateurs avertis' },
      { id:'Expert', emoji:'🔥', reward:60, bg:'#4A2C17', desc:'Réservé aux puristes' },
    ];
    return (
      <div className="su" style={{ paddingTop:14 }}>
        <div style={{ textAlign:'center', marginBottom:22 }}>
          <div style={{ fontSize:44, marginBottom:8 }}>📚</div>
          <div style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:6 }}>Choisis ta difficulté</div>
          <div style={{ fontSize:13, color:C.muted, lineHeight:1.5, maxWidth:280, margin:'0 auto' }}>
            3 questions seront tirées. Plus c'est dur, plus tu gagnes.
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {LEVELS.map(lv => (
            <button
              key={lv.id}
              onClick={()=>pickQuestions(lv.id)}
              style={{
                display:'flex', alignItems:'center', gap:14,
                padding:'16px 18px', borderRadius:18,
                background:lv.bg, color:'#fff',
                border:'none', textAlign:'left', cursor:'pointer',
                boxShadow:'0 4px 14px rgba(0,0,0,.12)'
              }}
            >
              <div style={{ fontSize:32 }}>{lv.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:800, letterSpacing:.3 }}>{lv.id}</div>
                <div style={{ fontSize:12, opacity:.85, marginTop:2 }}>{lv.desc}</div>
              </div>
              <div style={{ fontSize:14, fontWeight:800, padding:'6px 12px', borderRadius:12, background:'rgba(255,255,255,.18)' }}>+{lv.reward} 🍪</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const q = QUESTIONS[qIndices[step]];

  const goNext = (lastWasCorrect = false) => {
    if(step + 1 >= qIndices.length){
      setAllDone(true);
      onDone();
      /* Event 'quiz_perfect' : succès uniquement si TOUTES les
         questions (3/3) sont bonnes — peu importe le niveau de
         difficulté choisi. setCorrectCount est asynchrone donc on
         cumule le dernier hit en argument. */
      const finalCorrect = correctCount + (lastWasCorrect ? 1 : 0);
      if(finalCorrect === QUIZ_QUESTIONS_PER_SESSION){
        onEventChallenge?.('quiz_perfect', 1);
      }
    } else {
      setStep(s=>s+1);
      setSel(null);
      setHiddenChoices([]);
      setHintUsed(false);
      setHintAvailable(false);
    }
  };

  const answer = (i) => {
    if(sel!==null) return;
    if(hiddenChoices.includes(i)) return;
    setSel(i);
    const isCorrect = i === q.answer;
    playSound(isCorrect ? 'success' : 'error');
    if(isCorrect){
      onEarn(q.reward);
      setScore(s=>s+q.reward);
      setCorrectCount(c=>c+1);
    }
    setTimeout(()=>goNext(isCorrect), 1500);
  };

  const useHint = () => {
    if(hintUsed || coins < QUIZ_HINT_COST || sel !== null) return;
    onSpend(QUIZ_HINT_COST);
    const wrong = [0,1,2,3].filter(i=>i!==q.answer);
    /* shuffle */
    for(let i=wrong.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [wrong[i],wrong[j]]=[wrong[j],wrong[i]];
    }
    setHiddenChoices(wrong.slice(0,2));
    setHintUsed(true);
  };

  const canAffordHint = coins >= QUIZ_HINT_COST;

  return (
    <div>
      {/* Progress 3 questions */}
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {qIndices.map((_,i)=>(
          <div key={i} style={{ flex:1, height:5, borderRadius:3, background: i<step ? GOLD : i===step ? 'rgba(212,160,23,.35)' : C.card2, transition:'background .3s' }} />
        ))}
      </div>

      <div style={{ borderRadius:20, padding:22, background:ESPRESSO, marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:2 }}>QUESTION {step+1}/{qIndices.length}</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, padding:'4px 10px', borderRadius:10, color:'#fff', background: q.difficulty==='Facile' ? '#E5B040' : q.difficulty==='Moyen' ? '#C17F3C' : '#4A2C17' }}>{q.difficulty}</span>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', fontWeight:700 }}>+{q.reward} 🍪</div>
          </div>
        </div>
        <div style={{ fontSize:17, fontWeight:700, color:'#fff', lineHeight:1.45 }}>{q.q}</div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
        {q.choices.map((ch,i)=>{
          const isHidden = hiddenChoices.includes(i);
          let bg=C.card, border=C.border, col=C.text, opacity=1;
          if(isHidden){ bg=C.card2; border=C.border; col=C.muted; opacity=.35; }
          else if(sel!==null){
            if(i===q.answer){ bg='#FBEFD4'; border='#D4A017'; col='#7D5A1E'; }
            else if(i===sel){ bg='#E8DCC8'; border='#6B3D20'; col='#3D2010'; }
          }
          return (
            <button key={i} onClick={()=>answer(i)} disabled={isHidden||sel!==null} style={{ padding:'14px 16px', borderRadius:14, border:`2px solid ${border}`, background:bg, color:col, fontWeight:600, fontSize:14, textAlign:'left', transition:'all .25s', display:'flex', alignItems:'center', gap:10, opacity, cursor:isHidden||sel!==null?'default':'pointer', textDecoration:isHidden?'line-through':'none' }}>
              <span style={{ display:'inline-flex', width:24, height:24, borderRadius:7, background:'rgba(0,0,0,.06)', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>{String.fromCharCode(65+i)}</span>
              {ch}
            </button>
          );
        })}
      </div>

      {/* Aide — apparaît après 8s d'inaction */}
      <div style={{ minHeight:48, display:'flex', justifyContent:'center', alignItems:'center' }}>
        {sel===null && hintAvailable && !hintUsed && (
          <button
            onClick={useHint}
            disabled={!canAffordHint}
            className="su"
            style={{
              padding:'10px 18px', borderRadius:14, fontSize:13, fontWeight:700,
              background: canAffordHint ? 'rgba(212,160,23,.12)' : C.card2,
              color: canAffordHint ? '#D4A017' : C.muted,
              border:`1.5px dashed ${canAffordHint?'rgba(212,160,23,.55)':C.border}`,
              display:'flex', alignItems:'center', gap:8,
              cursor: canAffordHint ? 'pointer' : 'not-allowed'
            }}
          >
            💡 Aide — éliminer 2 mauvaises réponses · −{QUIZ_HINT_COST} 🍪
          </button>
        )}
        {hintUsed && sel===null && (
          <div style={{ fontSize:12, color:C.muted, fontStyle:'italic' }}>Aide utilisée · {QUIZ_HINT_COST} 🍪 dépensés</div>
        )}
      </div>
    </div>
  );
}

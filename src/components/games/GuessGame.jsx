import { useEffect, useRef, useState } from "react";
import { GOLD } from "../../data/themes.js";
import { COMMANDES } from "../../data/commandes.js";
import { COMMANDES_EN } from "../../i18n/commandesEn.js";
import { CafeScene, CUSTOMERS, LEGENDARY_BARISTAS } from "./CafeScene.jsx";
import { playSound } from "../../lib/audio.js";
import { useTranslation } from "../../i18n/index.js";

/* Question fictive utilisée quand le slot tombe sur le barista
   légendaire (drop 0.5% par partie). Texte = bulle qui révèle le code
   promo. Pas de choices/answer — l'UI affiche un bouton unique
   "Recevoir le code" qui valide la question (auto-correct, pas de
   pénalité de score). */
const LEGENDARY_QUESTION = {
  desc: "🌟 Tu m'as l'air d'un vrai amateur... Voici un code rare rien que pour toi : BARISTA05. Saisis-le dans Paramètres → Code promo pour débloquer un thème exclusif !",
  choices: [],
  answer: 0,
  legendary: true,
};
/* Version EN du slot légendaire (même code BARISTA05). Choisi selon
   `lang` dans startGame. */
const LEGENDARY_QUESTION_EN = {
  desc: "🌟 You look like a true coffee lover... Here's a rare code just for you: BARISTA05. Enter it in Settings → Promo code to unlock an exclusive theme!",
  choices: [],
  answer: 0,
  legendary: true,
};

/* Retourne la commande localisée selon la langue. COMMANDES_EN est
   indexé À L'IDENTIQUE de COMMANDES (même ordre, mêmes positions de
   choices → `answer` reste valide). Fallback FR si EN absent. */
function localizedCommande(i, lang){
  const fr = COMMANDES[i];
  if(lang === 'en' && COMMANDES_EN[i]){
    return { ...fr, desc: COMMANDES_EN[i].desc, choices: COMMANDES_EN[i].choices };
  }
  return fr;
}
const LEGENDARY_DROP_RATE       = 0.05;  // 5 % par partie en mode normal
const LEGENDARY_DROP_RATE_ADMIN = 0.50;  // 50 % pour les comptes admin (test/QA)
const ABSURD_TIMEOUT_MS   = 7_000; // 7s sans cliquer = +1 (absurde uniquement). Cliquer = ✗.
/* Sentinelle utilisée comme `idx` quand le timeout déclenche onPick : sert
   à distinguer "le joueur a attendu" d'un vrai clic dans onPick. */
const TIMEOUT_IDX = -1;

/* ════════════════════════════════════════════════════
   GuessGame — Devine la commande (PHASE 6C — refonte visuelle)
   ────────────────────────────────────────────────────
   Le joueur tient le comptoir d'un café. À chaque question, un client
   différent (parmi les 5 dessinés en SVG dans CafeScene) arrive depuis
   la droite, énonce sa demande dans une bulle (texte progressif), le
   joueur choisit parmi 4 réponses. 5 questions par partie (8 au niv 10+).

   - COST   = 10 cookies
   - Phases globales : idle → playing → done
   - Sous-phases d'une question (`subPhase`) :
       'entering' (.8s anim walk-in synchronisée avec le CSS de
        CafeScene) → 'speaking' (bulle visible, texte progressif,
        choix actifs)
   - Pas de phase 'leaving' explicite : le `key` du customer change
     au passage à la question suivante, ce qui retrigger l'anim
     csCustomerWalkIn dans CafeScene.
   - Pas de répétition de question ni de client dans la même partie.

   Récompenses (mode 7 questions plus gradué au niv 10+) :
     Mode 5  : 5/5 → +100  ·  4/5 → +60  ·  3/5 → +25  ·  sinon 0
     Mode 7  : 7/7 → +100  ·  6/7 → +80  ·  5/7 → +45  ·  4/7 → +25  ·  sinon 0

   Mode Expert retiré le 09/05/2026 — toutes les questions sont du
   pool unique standard (65 entrées dans commandes.js).

   Choix : grille 2×2.
   - Bonne réponse cliquée  → fond #FBEFD4 + ✓ caramel
   - Mauvaise cliquée       → fond #E8DCC8 + ✗ + révéler la bonne

   Props : coins, onEarn, onSpend, level, C
═══════════════════════════════════════════════════════ */

export const GUESS_COST = 10;
const TYPE_SPEED_MS = 28;
const WALK_IN_MS    = 800;          // synchronisé avec csCustomerWalkIn (.8s)
const ANSWER_HOLD_MS = 1100;        // temps avant de passer au client suivant

const ABSURD_SESSION_RATE = 0.5;  // 50 % des parties contiennent UNE absurde, max 1.

/* Mélange Fisher-Yates les choices d'une question + remap l'answer index
   (anti-mémo). Sans effet visible pour les absurdes côté UX puisque leur
   answer n'est pas utilisé pour scoring, mais on l'applique uniformément
   pour rester cohérent. */
function shuffleChoices(q){
  const correctText = q.choices[q.answer];
  const shuffled = [...q.choices];
  for(let j = shuffled.length - 1; j > 0; j--){
    const k = Math.floor(Math.random() * (j + 1));
    [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
  }
  return { ...q, choices: shuffled, answer: shuffled.indexOf(correctText) };
}

/* Tire nbQuestions commandes UNIQUES en cap'ant à 1 absurde max par
   partie (rate ABSURD_SESSION_RATE). Approche : pioche depuis le pool
   normal d'abord, puis avec ABSURD_SESSION_RATE de chance, on remplace
   une question random par une absurde tirée au hasard. */
function pickQuestions(nbQuestions, lang){
  /* On travaille sur les INDICES d'origine de COMMANDES (pas des
     sous-tableaux filtrés) pour pouvoir retrouver la traduction EN
     alignée par index dans COMMANDES_EN. */
  const normalIdx = COMMANDES.map((_, i) => i).filter(i => !COMMANDES[i].absurd);
  const absurdIdx = COMMANDES.map((_, i) => i).filter(i =>  COMMANDES[i].absurd);

  const chosen = [];
  while(chosen.length < Math.min(nbQuestions, normalIdx.length)){
    const i = normalIdx[Math.floor(Math.random() * normalIdx.length)];
    if(!chosen.includes(i)) chosen.push(i);
  }
  let qs = chosen.map(i => localizedCommande(i, lang));

  /* Inject UNE seule absurde si proba OK et pool non vide */
  if(absurdIdx.length > 0 && Math.random() < ABSURD_SESSION_RATE){
    const ai   = absurdIdx[Math.floor(Math.random() * absurdIdx.length)];
    const slot = Math.floor(Math.random() * qs.length);
    qs[slot] = localizedCommande(ai, lang);
  }

  return qs.map(shuffleChoices);
}

/* Paliers de récompense — adaptés au nb de questions (5 ou 7).
   Le perfect rapporte 100 dans les 2 modes. Mode 7 questions plus
   gradué : 100/80/45/25 (vs 100/60/25 en mode 5). */
function rewardFor(score, total){
  if(total === 7){
    if(score === 7) return 100;
    if(score === 6) return 80;
    if(score === 5) return 45;
    if(score === 4) return 25;
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

export function GuessGame({ coins, onEarn, onSpend, onEventChallenge, legendarySeen = false, onLegendarySeen, isAdmin = false, level = 1, C }){
  const { t, lang } = useTranslation();
  /* Niveau 10+ : 7 questions par partie au lieu de 5, pour le même
     palier de récompense (= plus exigeant, pas plus rentable). */
  const NB_QUESTIONS = level >= 10 ? 7 : 5;
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
    enterRef.current = setTimeout(()=>{
      /* Son bulle pop synchronisé avec l'apparition visuelle de la bulle */
      playSound('bubble');
      setSubPhase('speaking');
    }, WALK_IN_MS);
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

  const timeoutRef = useRef(null);

  /* Questions absurdes (`absurd:true`) — la SEULE bonne réponse est
     d'attendre 7 s sans cliquer. Cliquer une option = mauvaise réponse
     (toutes les options sont des pièges). Les questions normales et le
     légendaire ne déclenchent pas ce timeout. */
  useEffect(()=>{
    if(phase !== 'playing' || subPhase !== 'speaking' || picked !== null) return;
    if(!questions[qIndex]?.absurd) return;
    timeoutRef.current = setTimeout(()=>{
      onPickRef.current?.(TIMEOUT_IDX);
    }, ABSURD_TIMEOUT_MS);
    return ()=>{ if(timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [phase, subPhase, qIndex, picked, questions]);

  /* Cleanup global */
  useEffect(()=>()=>{
    if(typeRef.current)    clearInterval(typeRef.current);
    if(enterRef.current)   clearTimeout(enterRef.current);
    if(advanceRef.current) clearTimeout(advanceRef.current);
    if(timeoutRef.current) clearTimeout(timeoutRef.current);
  },[]);

  const startGame = () => {
    if(coins < GUESS_COST) return;
    playSound('modal');
    onSpend(GUESS_COST);
    const qs = pickQuestions(NB_QUESTIONS, lang);
    const ci = pickCustomerIndices(NB_QUESTIONS, CUSTOMERS.length);
    /* 5 % par partie ET le légendaire n'a pas déjà été vu (flag
       persistent legendaryBaristaSeen). On injecte un barista légendaire
       (5 variantes visuelles, même code BARISTA05) à un slot aléatoire.
       Sentinelle : customerIndex de ce slot = -1 - variantIdx (donc -1
       pour la 1re, -2 pour la 2e, etc.) — décodé au rendu.
       Important : `onLegendarySeen` est appelé dans onPick au moment du
       clic effectif (pas ici), pour ne pas "consommer" le drop si le
       joueur quitte la partie avant d'atteindre le slot. */
    const dropRate = isAdmin ? LEGENDARY_DROP_RATE_ADMIN : LEGENDARY_DROP_RATE;
    if(!legendarySeen && Math.random() < dropRate){
      const slot     = Math.floor(Math.random() * NB_QUESTIONS);
      const variant  = Math.floor(Math.random() * LEGENDARY_BARISTAS.length);
      qs[slot] = lang === 'en' ? LEGENDARY_QUESTION_EN : LEGENDARY_QUESTION;
      ci[slot] = -1 - variant;
    }
    setQuestions(qs);
    setCustomerIndices(ci);
    setQIndex(0);
    setScore(0);
    setPicked(null);
    setSubPhase('entering');
    setPhase('playing');
  };

  const replay = () => { playSound('modal'); setPhase('idle'); };

  /* Ref vers la dernière version de onPick — le useEffect timeout
     reste stable (pas de closure stale) en l'appelant via cette ref. */
  const onPickRef = useRef(null);

  const onPick = (idx) => {
    if(picked !== null) return;            // déjà choisi
    if(phase !== 'playing') return;
    if(subPhase !== 'speaking') return;    // pas pendant l'entrée
    if(typeRef.current) clearInterval(typeRef.current);
    if(timeoutRef.current) clearTimeout(timeoutRef.current);
    setTyped(questions[qIndex].desc);      // affiche le texte complet
    setPicked(idx);

    /* Trois cas distincts :
       - Légendaire : auto-correct (drop rare = cadeau). Le flag persistent
                      `legendaryBaristaSeen` est marqué ICI (et pas dans
                      startGame) — comme ça si le joueur quitte avant de
                      cliquer "Recevoir le code", il garde sa chance.
       - Absurde    : seul le timeout (idx === TIMEOUT_IDX) gagne ; un
                      clic réel = mauvaise réponse (toutes les options
                      sont des pièges)
       - Normale    : standard, idx === answer */
    const q = questions[qIndex];
    const fromTimeout = idx === TIMEOUT_IDX;
    const isRight =
      q.legendary ? true
    : q.absurd    ? fromTimeout
    :               idx === q.answer;
    if(q.legendary) onLegendarySeen?.();
    playSound(isRight ? 'success' : 'error');
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
  /* Garde le ref synchro avec la dernière version de onPick */
  onPickRef.current = onPick;

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
        ? { bg:'linear-gradient(135deg,#F5DC8A,#D4A017)', col:'#5D3A1F', border:'#D4A017', title: t('game_guess.perfect') }
        : earnedFinal > 0
          ? { bg:'linear-gradient(135deg,#FBEFD4,#F0C050)', col:'#5D3A1F', border:'#D4A017', title: t('game_guess.end_good', { n: score, total: NB_QUESTIONS }) }
          : { bg:'linear-gradient(135deg,#5A3520,#3D2010)', col:'#F0E0C0', border:'#3D2010', title: t('game_guess.end_zero', { n: score, total: NB_QUESTIONS }) })
    : null;

  const btnLabel =
      phase === 'idle'    ? t('games.start_btn', { cost: GUESS_COST })
    : phase === 'playing' ? '…'
    :                       t('games.replay_btn', { cost: GUESS_COST });

  /* Couleur d'un bouton selon état. Absurd : pas de "bonne" option à
     surligner — on highlight uniquement le clic du joueur en ✗. */
  const isAbsurd = !!current?.absurd;
  const choiceStyle = (idx) => {
    let bg = C.card;
    let border = C.border;
    let fg = C.text;
    if(isAnswered){
      if(isAbsurd){
        if(idx === picked){
          bg = '#E8DCC8'; border = '#8B5A2B'; fg = '#4A2C17';
        } else {
          bg = C.card; border = C.border; fg = C.muted;
        }
      } else if(idx === correctIdx){
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
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>{t('game_guess.question_label')}</div>
        </div>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${C.border}`, textAlign:'center' }}>
          <div style={{ fontSize:11 }}>✨</div>
          <div style={{ fontSize:22, fontWeight:900, color:C.text, lineHeight:1.1 }}>{score}<span style={{ fontSize:13, color:C.muted, fontWeight:700 }}>/{NB_QUESTIONS}</span></div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>{t('game_guess.score_label')}</div>
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
          rejoue. La bulle ne s'affiche qu'en sub-phase 'speaking'.
          customerIndices[qIndex] < 0 → barista légendaire variant
          (-1 - variantIdx, cf. startGame). Sinon index dans CUSTOMERS. */}
      {phase === 'playing' && current && customerIndices.length > 0 && (
        <div style={{ width:'100%', maxWidth:360 }}>
          <CafeScene
            customer={
              customerIndices[qIndex] < 0
                ? LEGENDARY_BARISTAS[-1 - customerIndices[qIndex]] || LEGENDARY_BARISTAS[0]
                : CUSTOMERS[customerIndices[qIndex]]
            }
            dialogText={typed}
            subPhase={subPhase}
          />
        </div>
      )}

      {/* Slot légendaire : un bouton unique "Recevoir le code". Auto-correct,
          pas de pénalité (drop rare = bonus pur). */}
      {phase === 'playing' && current?.legendary && (
        <button
          onClick={()=>onPick(0)}
          disabled={subPhase !== 'speaking' || isAnswered}
          style={{
            width:'100%', maxWidth:360, padding:'16px 0', borderRadius:14,
            background:'linear-gradient(135deg,#F5DC8A,#D4A017)',
            color:'#3D2010', fontSize:14, fontWeight:900, letterSpacing:.5,
            border:'2px solid #D4A017',
            cursor: (subPhase !== 'speaking' || isAnswered) ? 'default' : 'pointer',
            boxShadow:'0 6px 20px rgba(212,160,23,.45)',
            opacity: subPhase==='entering' ? .55 : 1,
            transition:'opacity .3s',
          }}
        >
          {isAnswered ? t('game_guess.legendary_received') : t('game_guess.legendary_btn')}
        </button>
      )}

      {/* Choix 2×2 — masqué pour les slots légendaires.
          Absurde : pas de ✓ (aucune option n'est juste), ✗ uniquement
          sur le clic du joueur. Si timeout (picked === TIMEOUT_IDX), pas
          de marquage — un petit bandeau "Patience" apparaît à la place. */}
      {phase === 'playing' && current && !current.legendary && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, width:'100%', maxWidth:360 }}>
          {current.choices.map((label, idx) => {
            const showCheck = isAnswered && !isAbsurd && idx === correctIdx;
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

      {/* Bandeau "Patience" : feedback positif quand le joueur a bien
          attendu sur une question absurde (picked === TIMEOUT_IDX = -1). */}
      {phase === 'playing' && isAbsurd && picked === TIMEOUT_IDX && (
        <div className="su" style={{
          width:'100%', maxWidth:360, padding:'10px 14px', borderRadius:12,
          background:'linear-gradient(135deg,#FBEFD4,#F0C050)',
          border:'1.5px solid #D4A017', color:'#5D3A1F',
          fontSize:13, fontWeight:800, textAlign:'center', letterSpacing:.3,
        }}>
          {t('game_guess.patience')}
        </div>
      )}

      {/* Badge "Défi 7 questions" pour les joueurs niv 10+ */}
      {NB_QUESTIONS === 7 && phase === 'idle' && (
        <div style={{
          display:'inline-block', padding:'5px 12px', borderRadius:11,
          background:'linear-gradient(135deg,#3D2010,#7D4E1F)',
          color:'#F0C050', fontSize:10, fontWeight:900, letterSpacing:1.5, textTransform:'uppercase',
          border:'1.5px solid rgba(212,160,23,.5)',
          boxShadow:'0 3px 10px rgba(74,44,23,.35)',
        }}>
          {t('game_guess.challenge7')}
        </div>
      )}

      {/* Texte d'instruction */}
      {phase !== 'done' && (
        <div style={{ minHeight:18, fontSize:13, fontWeight:600, color: phase==='playing' ? (isAnswered ? (isRight ? '#D4A017' : '#8B5A2B') : C.muted) : C.muted, fontStyle: phase==='playing' && !isAnswered ?'italic':'normal', textAlign:'center' }}>
          {phase === 'idle'    && t('game_guess.idle_intro')}
          {phase === 'playing' && !isAnswered && t('game_guess.choose')}
          {phase === 'playing' && isAnswered && (isRight ? t('game_guess.good_eye') : t('game_guess.missed'))}
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
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>{t('game_guess.score_label')}</div>
            </div>
            <div style={{ width:1, background:'rgba(0,0,0,.15)' }} />
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>+{earnedFinal}</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>{t('game_guess.cookies_label')}</div>
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

      {/* Tip card — paliers selon le mode (5 ou 7 questions) */}
      <div style={{ width:'100%', maxWidth:360, padding:'10px 14px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center' }}>
        {NB_QUESTIONS === 7 ? (
          <>💡 <strong style={{ color:'#D4A017' }}>{t('game_guess.tip7_hl')}</strong>{t('game_guess.tip7_rest')}</>
        ) : (
          <>💡 <strong style={{ color:'#D4A017' }}>{t('game_guess.tip5_hl')}</strong>{t('game_guess.tip5_rest')}</>
        )}
      </div>
    </div>
  );
}

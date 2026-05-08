import { ChevronLeft, Cookie } from "lucide-react";
import { GOLD } from "../../data/themes.js";
import { CheckinGame } from "../games/CheckinGame.jsx";
import { QuizGame } from "../games/QuizGame.jsx";
import { SpinGame } from "../games/SpinGame.jsx";
import { ClickGame } from "../games/ClickGame.jsx";
import { PourGame } from "../games/PourGame.jsx";
import { MemoryGame } from "../games/MemoryGame.jsx";
import { GuessGame } from "../games/GuessGame.jsx";
import { ReflexGame } from "../games/ReflexGame.jsx";
import { PyramidGame } from "../games/PyramidGame.jsx";
import { SlotGame } from "../games/SlotGame.jsx";

/* ════════════════════════════════════════════════════
   GameOverlay — wrapper plein écran (z-index 50)
   - Header commun : bouton retour + titre + compteur cookies
   - Dispatch vers le mini-jeu correspondant à `gameView`
   - Tous les onClose, onEarn, onSpend etc. sont propagés depuis CookiMiner
═══════════════════════════════════════════════════════ */

export function GameOverlay({ gameView, onClose, coins, level, streak, canCheckin, canQuiz, quizMsLeft, clickRecord, onCheckin, checkinReward, onQuizEarn, onQuizDone, onSpinEarn, onSpend, onClickEarn, onUpdateRecord, onJackpot, onEventChallenge, activeSkin, activeRoue, C }) {
  const TITLES = { checkin:'Série du jour', quiz:'Quiz du jour', spin:'Roue de la chance', click:'Cookie Click', pour:'Stop le café', memory:'Memory Café', guess:'Devine la commande', reflex:'Réflexes cookies', pyramid:'Pile de Tasses', slot:'Machine à Sous' };
  return (
    <div style={{ position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, bottom:0, background:C.bg, zIndex:50, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:`1px solid ${C.border}`, background:C.card, flexShrink:0 }}>
        <button onClick={onClose} style={{ width:36, height:36, borderRadius:12, background:C.card2, display:'flex', alignItems:'center', justifyContent:'center', color:C.text }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontSize:17, fontWeight:700, color:C.text, flex:1 }}>{TITLES[gameView]}</span>
        <div style={{ display:'flex', alignItems:'center', gap:5, background:GOLD, borderRadius:14, padding:'6px 12px' }}>
          <Cookie size={14} color="#fff" />
          <span style={{ fontWeight:700, fontSize:14, color:'#fff' }}>{coins}</span>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:20 }}>
        {gameView==='checkin' && <CheckinGame streak={streak} canCheckin={canCheckin} onCheckin={onCheckin} checkinReward={checkinReward} C={C} />}
        {gameView==='quiz'    && <QuizGame    canPlay={canQuiz}  msLeft={quizMsLeft} coins={coins} onEarn={onQuizEarn} onSpend={onSpend} onDone={onQuizDone} onClose={onClose} onEventChallenge={onEventChallenge} C={C} />}
        {gameView==='spin'    && <SpinGame    coins={coins} level={level} onEarn={onSpinEarn} onSpend={onSpend} onJackpot={onJackpot} onEventChallenge={onEventChallenge} activeRoue={activeRoue} C={C} />}
        {gameView==='click'   && <ClickGame   coins={coins} bestScore={clickRecord} onEarn={onClickEarn} onSpend={onSpend} onUpdateRecord={onUpdateRecord} onEventChallenge={onEventChallenge} activeSkin={activeSkin} C={C} />}
        {gameView==='pour'    && <PourGame    onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} C={C} />}
        {gameView==='memory'  && <MemoryGame  coins={coins} onEarn={onClickEarn} onSpend={onSpend} C={C} />}
        {gameView==='guess'   && <GuessGame   coins={coins} level={level} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} C={C} />}
        {gameView==='reflex'  && <ReflexGame  coins={coins} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} C={C} />}
        {gameView==='pyramid' && <PyramidGame coins={coins} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} C={C} />}
        {gameView==='slot'    && <SlotGame    coins={coins} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} C={C} />}
      </div>
    </div>
  );
}

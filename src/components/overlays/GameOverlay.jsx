import { lazy, Suspense } from "react";
import { ChevronLeft, Cookie } from "lucide-react";
import { GOLD } from "../../data/themes.js";
import CafeFillLoader from "../CafeFillLoader.jsx";

/* ════════════════════════════════════════════════════
   GameOverlay — wrapper plein écran (z-index 50)
   - Header commun : bouton retour + titre + compteur cookies
   - Dispatch vers le mini-jeu correspondant à `gameView`
   - Tous les onClose, onEarn, onSpend etc. sont propagés depuis CookiMiner

   ── PERF (12/05/2026) ───────────────────────────────
   Tous les jeux sont chargés en lazy (React.lazy + Suspense). Cible :
   réduire le bundle initial — un seul jeu chargé à la fois, à la
   demande. Les jeux sont des fichiers de 15-40 KB raw qui ne sont
   utilisés que ponctuellement.

   Les jeux exportent en named export → wrap via `.then(m => ({default}))`.
═══════════════════════════════════════════════════════ */

const CheckinGame = lazy(() => import("../games/CheckinGame.jsx").then(m => ({ default: m.CheckinGame })));
const QuizGame    = lazy(() => import("../games/QuizGame.jsx").then(m => ({ default: m.QuizGame })));
const SpinGame    = lazy(() => import("../games/SpinGame.jsx").then(m => ({ default: m.SpinGame })));
const ClickGame   = lazy(() => import("../games/ClickGame.jsx").then(m => ({ default: m.ClickGame })));
const PourGame    = lazy(() => import("../games/PourGame.jsx").then(m => ({ default: m.PourGame })));
const MemoryGame  = lazy(() => import("../games/MemoryGame.jsx").then(m => ({ default: m.MemoryGame })));
const GuessGame   = lazy(() => import("../games/GuessGame.jsx").then(m => ({ default: m.GuessGame })));
const ReflexGame  = lazy(() => import("../games/ReflexGame.jsx").then(m => ({ default: m.ReflexGame })));
const PyramidGame = lazy(() => import("../games/PyramidGame.jsx").then(m => ({ default: m.PyramidGame })));
const SlotGame    = lazy(() => import("../games/SlotGame.jsx").then(m => ({ default: m.SlotGame })));
const FlappyGame  = lazy(() => import("../games/FlappyGame.jsx").then(m => ({ default: m.FlappyGame })));

/* Splash affiché pendant le chunk download : tasse qui se remplit
   (CafeFillLoader). Centré dans la zone de jeu disponible (minHeight
   suffisamment grand pour que le visuel soit au centre de l'écran).
   Sur réseau rapide / chunk en cache, ne s'affiche pas. */
function GameLoadingFallback({ C }){
  return (
    <div style={{
      minHeight:'60vh',
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
    }}>
      <CafeFillLoader size={88} color={C.muted} />
    </div>
  );
}

export function GameOverlay({ gameView, onClose, coins, level, streak, canCheckin, canQuiz, quizMsLeft, clickRecord, onCheckin, checkinReward, onQuizEarn, onQuizDone, onSpinEarn, onSpend, onClickEarn, onCafeEarn, onUpdateRecord, onJackpot, onEventChallenge, spinsLeft, spinsCap, consumeSpin, spinRechargeCost, onRechargeSpin, slotPlaysLeft, slotGamesCap, consumeSlotGame, slotRechargeCost, onRechargeSlot, pyramidPlaysLeft, pyramidGamesCap, consumePyramidGame, pyramidRechargeCost, cafes, onRechargePyramid, activeSkin, activeRoue, legendarySeen, onLegendarySeen, isAdmin, C }) {
  const TITLES = { checkin:'Série du jour', quiz:'Quiz du jour', spin:'Roue de la chance', click:'Cookie Click', pour:'Stop le café', memory:'Memory Café', guess:'Devine la commande', reflex:'Réflexes cookies', pyramid:'Pile de Tasses', slot:'Machine à Sous', flappy:'Flappy Cookie' };
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
        <Suspense fallback={<GameLoadingFallback C={C} />}>
          {gameView==='checkin' && <CheckinGame streak={streak} canCheckin={canCheckin} onCheckin={onCheckin} checkinReward={checkinReward} C={C} />}
          {gameView==='quiz'    && <QuizGame    canPlay={canQuiz}  msLeft={quizMsLeft} coins={coins} onEarn={onQuizEarn} onSpend={onSpend} onDone={onQuizDone} onClose={onClose} onEventChallenge={onEventChallenge} C={C} />}
          {gameView==='spin'    && <SpinGame    coins={coins} level={level} onEarn={onSpinEarn} onSpend={onSpend} onJackpot={onJackpot} onEventChallenge={onEventChallenge} activeRoue={activeRoue} spinsLeft={spinsLeft} spinsCap={spinsCap} consumeSpin={consumeSpin} spinRechargeCost={spinRechargeCost} cafes={cafes} onRechargeSpin={onRechargeSpin} C={C} />}
          {gameView==='click'   && <ClickGame   coins={coins} bestScore={clickRecord} onEarn={onClickEarn} onSpend={onSpend} onUpdateRecord={onUpdateRecord} onEventChallenge={onEventChallenge} activeSkin={activeSkin} C={C} />}
          {gameView==='pour'    && <PourGame    onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} C={C} />}
          {gameView==='memory'  && <MemoryGame  coins={coins} onEarn={onClickEarn} onSpend={onSpend} C={C} />}
          {gameView==='guess'   && <GuessGame   coins={coins} level={level} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} legendarySeen={legendarySeen} onLegendarySeen={onLegendarySeen} isAdmin={isAdmin} C={C} />}
          {gameView==='reflex'  && <ReflexGame  coins={coins} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} activeSkin={activeSkin} C={C} />}
          {gameView==='pyramid' && <PyramidGame coins={coins} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} pyramidPlaysLeft={pyramidPlaysLeft} pyramidGamesCap={pyramidGamesCap} consumePyramidGame={consumePyramidGame} pyramidRechargeCost={pyramidRechargeCost} cafes={cafes} onRechargePyramid={onRechargePyramid} C={C} />}
          {gameView==='slot'    && <SlotGame    coins={coins} level={level} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} slotPlaysLeft={slotPlaysLeft} slotGamesCap={slotGamesCap} consumeSlotGame={consumeSlotGame} slotRechargeCost={slotRechargeCost} cafes={cafes} onRechargeSlot={onRechargeSlot} C={C} />}
          {gameView==='flappy'  && <FlappyGame  coins={coins} onEarn={onClickEarn} onSpend={onSpend} onCafeEarn={onCafeEarn} activeSkin={activeSkin} C={C} />}
        </Suspense>
      </div>
    </div>
  );
}

import { useState } from "react";
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
import { FlappyGame } from "../games/FlappyGame.jsx";
import { CatcherGame } from "../games/CatcherGame.jsx";
import { DuelRaceHUD } from "../games/DuelRaceHUD.jsx";

/* ════════════════════════════════════════════════════
   GameOverlay — wrapper plein écran (z-index 50)
   - Header commun : bouton retour + titre + compteur cookies
   - Dispatch vers le mini-jeu correspondant à `gameView`
   - Tous les onClose, onEarn, onSpend etc. sont propagés depuis CookiMiner

   Imports statiques (revert lazy 13/05/2026, demande user) : tous les
   jeux sont dans le bundle initial → bundle plus gros au démarrage,
   mais ouverture instantanée et zéro Suspense à gérer.
═══════════════════════════════════════════════════════ */

export function GameOverlay({ gameView, onClose, coins, level, streak, canCheckin, canQuiz, quizMsLeft, clickRecord, onCheckin, checkinReward, onQuizEarn, onQuizDone, onSpinEarn, onSpend, onClickEarn, onCafeEarn, onUpdateRecord, onJackpot, onEventChallenge, spinsLeft, spinsCap, consumeSpin, spinRechargeCost, onRechargeSpin, slotPlaysLeft, slotGamesCap, consumeSlotGame, slotRechargeCost, onRechargeSlot, pyramidPlaysLeft, pyramidGamesCap, consumePyramidGame, pyramidRechargeCost, cafes, onRechargePyramid, activeSkin, activeRoue, gameThemes, setGameThemes, unlocked, onPayContinueCatcher, legendarySeen, onLegendarySeen, isAdmin, duelMode = false, onDuelScore, onDuelProgress, duelInfo, myLiveRef, onBotDuelScore, onBotDuelProgress, botLiveRef, C }) {
  const TITLES = { checkin:'Série du jour', quiz:'Quiz du jour', spin:'Roue de la chance', click:'Cookie Click', pour:'Stop le café', memory:'Memory Café', guess:'Devine la commande', reflex:'Réflexes cookies', pyramid:'Pile de Tasses', slot:'Machine à Sous', flappy:'Flappy Cookie', catcher:'Café Express' };
  /* Duel split-screen : uniquement les jeux qui savent s'auto-jouer
     (autoPlay). Les autres restent en écran unique + barre simulée. */
  const split = duelMode && duelInfo && !!duelInfo.autoPlay;
  const [showOpponent, setShowOpponent] = useState(true);   // afficher le gameplay adverse à côté (côte à côte)
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
      {duelMode && duelInfo && (
        <DuelRaceHUD
          myScoreRef={myLiveRef} myAvatar={duelInfo.myAvatar}
          botTarget={duelInfo.botTarget} botAvatar={duelInfo.botAvatar} botName={duelInfo.botName}
          botScoreRef={split ? botLiveRef : null}
          higherWins={duelInfo.higherWins} dur={duelInfo.dur} gameLabel={duelInfo.gameLabel} metric={duelInfo.metric} C={C}
        />
      )}
      {split ? (
        <div style={{ flex:1, display:'flex', minHeight:0, position:'relative' }}>
          {/* Bouton afficher/masquer le gameplay de l'adversaire */}
          <button
            onClick={()=>setShowOpponent(v=>!v)}
            style={{ position:'absolute', top:6, right:8, zIndex:20, pointerEvents:'auto', padding:'5px 10px', borderRadius:20, border:`1px solid ${GOLD}`, background:C.card, color:C.text, fontSize:11, fontWeight:800, cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,.18)' }}
          >
            {showOpponent ? '✕ Adversaire' : '👁 Adversaire'}
          </button>
          {/* ── GAUCHE : ta partie (jouable) ── */}
          <div style={{ flex: showOpponent ? '1.5 1 0' : '1 1 0', overflowY:'auto', padding:10, minHeight:0 }}>
            {gameView==='click'  && <ClickGame  coins={coins} bestScore={clickRecord} onEarn={onClickEarn} onSpend={onSpend} onUpdateRecord={onUpdateRecord} onEventChallenge={onEventChallenge} activeSkin={activeSkin} duelMode={duelMode} onDuelScore={onDuelScore} onDuelProgress={onDuelProgress} C={C} />}
            {gameView==='reflex' && <ReflexGame coins={coins} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} activeSkin={activeSkin} duelMode={duelMode} onDuelScore={onDuelScore} onDuelProgress={onDuelProgress} C={C} />}
          </div>
          {/* ── DROITE : le bot joue pour de vrai (non-cliquable), au choix ── */}
          {showOpponent && (
            <div style={{ flex:'1 1 0', overflow:'hidden', padding:'22px 6px 6px', minHeight:0, position:'relative', pointerEvents:'none', background:C.card2, borderLeft:`3px solid ${GOLD}` }}>
              <div style={{ fontSize:10, fontWeight:800, color:C.muted, marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>🤖 {duelInfo.botName}</div>
              {gameView==='click'  && <ClickGame  coins={coins} bestScore={clickRecord} onEarn={onClickEarn} onSpend={onSpend} onUpdateRecord={onUpdateRecord} onEventChallenge={onEventChallenge} activeSkin={activeSkin} duelMode={true} onDuelScore={onBotDuelScore} onDuelProgress={onBotDuelProgress} autoPlay={true} C={C} />}
              {gameView==='reflex' && <ReflexGame coins={coins} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} activeSkin={activeSkin} duelMode={true} onDuelScore={onBotDuelScore} onDuelProgress={onBotDuelProgress} autoPlay={true} C={C} />}
            </div>
          )}
        </div>
      ) : (
      <div style={{ flex:1, overflowY:'auto', padding:20 }}>
        {gameView==='checkin' && <CheckinGame streak={streak} canCheckin={canCheckin} onCheckin={onCheckin} checkinReward={checkinReward} C={C} />}
        {gameView==='quiz'    && <QuizGame    canPlay={canQuiz}  msLeft={quizMsLeft} coins={coins} onEarn={onQuizEarn} onSpend={onSpend} onDone={onQuizDone} onClose={onClose} onEventChallenge={onEventChallenge} C={C} />}
        {gameView==='spin'    && <SpinGame    coins={coins} level={level} onEarn={onSpinEarn} onSpend={onSpend} onJackpot={onJackpot} onEventChallenge={onEventChallenge} activeRoue={activeRoue} spinsLeft={spinsLeft} spinsCap={spinsCap} consumeSpin={consumeSpin} spinRechargeCost={spinRechargeCost} cafes={cafes} onRechargeSpin={onRechargeSpin} C={C} />}
        {gameView==='click'   && <ClickGame   coins={coins} bestScore={clickRecord} onEarn={onClickEarn} onSpend={onSpend} onUpdateRecord={onUpdateRecord} onEventChallenge={onEventChallenge} activeSkin={activeSkin} duelMode={duelMode} onDuelScore={onDuelScore} onDuelProgress={onDuelProgress} C={C} />}
        {gameView==='pour'    && <PourGame    onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} C={C} />}
        {gameView==='memory'  && <MemoryGame  coins={coins} onEarn={onClickEarn} onSpend={onSpend} gameThemes={gameThemes} setGameThemes={setGameThemes} unlocked={unlocked} duelMode={duelMode} onDuelScore={onDuelScore} onDuelProgress={onDuelProgress} C={C} />}
        {gameView==='guess'   && <GuessGame   coins={coins} level={level} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} legendarySeen={legendarySeen} onLegendarySeen={onLegendarySeen} isAdmin={isAdmin} gameThemes={gameThemes} setGameThemes={setGameThemes} unlocked={unlocked} duelMode={duelMode} onDuelScore={onDuelScore} onDuelProgress={onDuelProgress} C={C} />}
        {gameView==='reflex'  && <ReflexGame  coins={coins} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} activeSkin={activeSkin} duelMode={duelMode} onDuelScore={onDuelScore} onDuelProgress={onDuelProgress} C={C} />}
        {gameView==='pyramid' && <PyramidGame coins={coins} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} pyramidPlaysLeft={pyramidPlaysLeft} pyramidGamesCap={pyramidGamesCap} consumePyramidGame={consumePyramidGame} pyramidRechargeCost={pyramidRechargeCost} cafes={cafes} onRechargePyramid={onRechargePyramid} duelMode={duelMode} onDuelScore={onDuelScore} onDuelProgress={onDuelProgress} C={C} />}
        {gameView==='slot'    && <SlotGame    coins={coins} level={level} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} slotPlaysLeft={slotPlaysLeft} slotGamesCap={slotGamesCap} consumeSlotGame={consumeSlotGame} slotRechargeCost={slotRechargeCost} cafes={cafes} onRechargeSlot={onRechargeSlot} C={C} />}
        {gameView==='flappy'  && <FlappyGame  coins={coins} onEarn={onClickEarn} onSpend={onSpend} onCafeEarn={onCafeEarn} activeSkin={activeSkin} gameThemes={gameThemes} setGameThemes={setGameThemes} unlocked={unlocked} duelMode={duelMode} onDuelScore={onDuelScore} onDuelProgress={onDuelProgress} C={C} />}
        {gameView==='catcher' && <CatcherGame coins={coins} cafes={cafes} onEarn={onClickEarn} onSpend={onSpend} onCafeEarn={onCafeEarn} onPayContinue={onPayContinueCatcher} gameThemes={gameThemes} setGameThemes={setGameThemes} unlocked={unlocked} duelMode={duelMode} onDuelScore={onDuelScore} onDuelProgress={onDuelProgress} C={C} />}
      </div>
      )}
    </div>
  );
}

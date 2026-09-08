import { useEffect, useState } from "react";
import { ChevronLeft, Cookie } from "lucide-react";
import { reprendreMusiqueSiCoupee } from "../../lib/audio.js";
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

   MUSIQUE — la piste de l'accueil n'est pas coupée en entrant dans un
   jeu : c'est une lecture unique et continue pour toute l'app. Mais elle
   pouvait être tombée en route (blur, appel entrant, OS qui reprend la
   sortie audio) et ne jamais repartir. On la réveille donc à chaque
   ouverture de mini-jeu, ce qui garantit qu'aucun jeu ne se joue en
   silence — sans jamais rallumer le son chez qui l'a coupé.
═══════════════════════════════════════════════════════ */

export function GameOverlay({ gameView, onClose, coins, level, streak, canCheckin, canQuiz, quizMsLeft, clickRecord, onCheckin, checkinReward, onQuizEarn, onQuizDone, onSpinEarn, onSpend, onClickEarn, onCafeEarn, onUpdateRecord, onJackpot, onEventChallenge, spinsLeft, spinsCap, consumeSpin, spinRechargeCost, onRechargeSpin, slotPlaysLeft, slotGamesCap, consumeSlotGame, slotRechargeCost, onRechargeSlot, pyramidPlaysLeft, pyramidGamesCap, consumePyramidGame, pyramidRechargeCost, cafes, onRechargePyramid, activeSkin, activeRoue, gameThemes, setGameThemes, unlocked, onPayContinueCatcher, legendarySeen, onLegendarySeen, isAdmin, duelMode = false, onDuelScore, onDuelProgress, duelInfo, myLiveRef, onBotDuelScore, onBotDuelProgress, botLiveRef, C }) {
  const TITLES = { checkin:'Série du jour', quiz:'Quiz du jour', spin:'Roue de la chance', click:'Cookie Click', pour:'Stop le café', memory:'Memory Café', guess:'Devine la commande', reflex:'Réflexes cookies', pyramid:'Pile de Tasses', slot:'Machine à Sous', flappy:'Flappy Cookie', catcher:'Café Express' };
  /* Duel « Option 1 » : le bot joue d'abord (turn='bot' → autoPlay + non
     cliquable + bandeau), puis à toi (turn='me' → interactif). Le changement
     de tour remonte le jeu via key={duelInfo.turn}. */
  const botTurn = duelMode && duelInfo && duelInfo.turn === 'bot';

  /* Un jeu s'ouvre : on s'assure que la musique tourne. `gameView` en
     dépendance — on repasse ici à chaque changement de jeu, pas
     seulement au premier. */
  useEffect(() => { reprendreMusiqueSiCoupee(); }, [gameView]);

  /* ── PLEIN ÉCRAN PENDANT LA PARTIE ─────────────────
     Les sept jeux qui ont une phase de jeu préviennent quand elle
     commence ; l'en-tête s'efface et le jeu prend tout l'écran. Les cinq
     autres (Quiz, Roue, Slot, Stop le café, Check-in) ne signalent rien :
     ce sont des jeux au tour par tour, la barre du haut n'y gêne
     personne — et un écran qui se réorganise sans raison inquiète.

     C'est le JEU qui prévient, pas l'overlay qui devine : la phase vit
     dans le jeu, et lui seul sait quand la partie commence vraiment. */
  const [enJeu, setEnJeu] = useState(false);

  /* Changer de jeu remet l'en-tête : sans ça, quitter une partie en
     cours pour en ouvrir une autre laissait l'écran amputé. */
  useEffect(() => { setEnJeu(false); }, [gameView]);

  /* Le plein écran natif, en plus. Il masque la barre d'adresse sur
     Android ; sur iOS l'API n'existe pas hors vidéo et sur une PWA
     installée il n'y a déjà plus rien à masquer — dans les deux cas
     l'appel échoue en silence et l'en-tête escamotée suffit.

     Le `.catch` est indispensable : la plupart des navigateurs exigent
     un geste utilisateur récent, et une promesse rejetée non attrapée
     remonterait jusqu'à l'ErrorBoundary. */
  useEffect(() => {
    if(!enJeu) return;
    try { document.documentElement.requestFullscreen?.({ navigationUI:'hide' })?.catch(() => {}); } catch { /* non supporté */ }
    return () => {
      try { if(document.fullscreenElement) document.exitFullscreen?.()?.catch(() => {}); } catch { /* idem */ }
    };
  }, [enJeu]);

  return (
    /* game-overlay-in : l'écran arrive en fondu-zoom (v1.30). Sans ça, le
       jeu apparaissait sec, sans lien avec la carte qu'on venait de taper. */
    <div className="game-overlay-in" style={{
      position:'fixed', top:0, left:'50%', transform:'translateX(-50%)',
      width:'100%',
      /* Le cap de 430 px saute pendant la partie : sur une tablette ou en
         paysage, le jeu récupère toute la largeur au lieu d'une colonne
         au milieu de deux bandes vides. */
      maxWidth: enJeu ? 'none' : 430,
      bottom:0, background:C.bg, zIndex:50, display:'flex', flexDirection:'column',
      transition:'max-width .25s ease',
    }}>
      {/* L'en-tête disparaît pendant la partie. Le bouton retour part
          avec — c'est voulu : en Flappy ou en Café Express on tape
          partout, un bouton en coin serait déclenché sans arrêt. Le
          bouton retour d'Android ferme toujours l'écran
          (useBackToClose dans App.jsx), et les parties se terminent
          d'elles-mêmes en quelques secondes. */}
      {!enJeu && (
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
      )}
      {duelMode && duelInfo && (
        <DuelRaceHUD
          myScoreRef={myLiveRef} myAvatar={duelInfo.myAvatar}
          botTarget={duelInfo.botTarget} botAvatar={duelInfo.botAvatar} botName={duelInfo.botName}
          botScoreRef={botTurn ? botLiveRef : null}
          higherWins={duelInfo.higherWins} dur={duelInfo.dur} gameLabel={duelInfo.gameLabel} metric={duelInfo.metric} C={C}
        />
      )}
      <div style={{ flex:1, overflowY:'auto', padding:20, position:'relative' }}>
        {botTurn && (
          <div style={{ position:'sticky', top:-20, zIndex:5, margin:'-20px -20px 14px', padding:'9px 14px', background:GOLD, color:'#fff', fontSize:12.5, fontWeight:900, textAlign:'center', boxShadow:'0 3px 10px rgba(212,160,23,.4)' }}>
            🤖 {duelInfo.botName} joue — regarde, puis bats son score !
          </div>
        )}
        <div style={{ pointerEvents: botTurn ? 'none' : 'auto' }}>
        {gameView==='checkin' && <CheckinGame streak={streak} canCheckin={canCheckin} onCheckin={onCheckin} checkinReward={checkinReward} C={C} />}
        {gameView==='quiz'    && <QuizGame    canPlay={canQuiz}  msLeft={quizMsLeft} coins={coins} onEarn={onQuizEarn} onSpend={onSpend} onDone={onQuizDone} onClose={onClose} onEventChallenge={onEventChallenge} C={C} />}
        {gameView==='spin'    && <SpinGame    coins={coins} level={level} onEarn={onSpinEarn} onSpend={onSpend} onJackpot={onJackpot} onEventChallenge={onEventChallenge} activeRoue={activeRoue} spinsLeft={spinsLeft} spinsCap={spinsCap} consumeSpin={consumeSpin} spinRechargeCost={spinRechargeCost} cafes={cafes} onRechargeSpin={onRechargeSpin} C={C} />}
        {gameView==='click'   && <ClickGame onEnJeu={setEnJeu}   key={duelInfo?.turn} coins={coins} bestScore={clickRecord} onEarn={onClickEarn} onSpend={onSpend} onUpdateRecord={onUpdateRecord} onEventChallenge={onEventChallenge} activeSkin={activeSkin} duelMode={duelMode} onDuelScore={onDuelScore} onDuelProgress={onDuelProgress} autoPlay={botTurn} C={C} />}
        {gameView==='pour'    && <PourGame    onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} C={C} />}
        {gameView==='memory'  && <MemoryGame onEnJeu={setEnJeu}  key={duelInfo?.turn} coins={coins} onEarn={onClickEarn} onSpend={onSpend} gameThemes={gameThemes} setGameThemes={setGameThemes} unlocked={unlocked} duelMode={duelMode} onDuelScore={onDuelScore} onDuelProgress={onDuelProgress} autoPlay={botTurn} C={C} />}
        {gameView==='guess'   && <GuessGame onEnJeu={setEnJeu}   key={duelInfo?.turn} coins={coins} level={level} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} legendarySeen={legendarySeen} onLegendarySeen={onLegendarySeen} isAdmin={isAdmin} gameThemes={gameThemes} setGameThemes={setGameThemes} unlocked={unlocked} duelMode={duelMode} onDuelScore={onDuelScore} onDuelProgress={onDuelProgress} autoPlay={botTurn} C={C} />}
        {gameView==='reflex'  && <ReflexGame onEnJeu={setEnJeu}  key={duelInfo?.turn} coins={coins} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} activeSkin={activeSkin} duelMode={duelMode} onDuelScore={onDuelScore} onDuelProgress={onDuelProgress} autoPlay={botTurn} C={C} />}
        {gameView==='pyramid' && <PyramidGame onEnJeu={setEnJeu} key={duelInfo?.turn} coins={coins} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} pyramidPlaysLeft={pyramidPlaysLeft} pyramidGamesCap={pyramidGamesCap} consumePyramidGame={consumePyramidGame} pyramidRechargeCost={pyramidRechargeCost} cafes={cafes} onRechargePyramid={onRechargePyramid} duelMode={duelMode} onDuelScore={onDuelScore} onDuelProgress={onDuelProgress} autoPlay={botTurn} C={C} />}
        {gameView==='slot'    && <SlotGame    coins={coins} level={level} onEarn={onClickEarn} onSpend={onSpend} onEventChallenge={onEventChallenge} slotPlaysLeft={slotPlaysLeft} slotGamesCap={slotGamesCap} consumeSlotGame={consumeSlotGame} slotRechargeCost={slotRechargeCost} cafes={cafes} onRechargeSlot={onRechargeSlot} C={C} />}
        {gameView==='flappy'  && <FlappyGame onEnJeu={setEnJeu}  key={duelInfo?.turn} coins={coins} onEarn={onClickEarn} onSpend={onSpend} onCafeEarn={onCafeEarn} activeSkin={activeSkin} gameThemes={gameThemes} setGameThemes={setGameThemes} unlocked={unlocked} duelMode={duelMode} onDuelScore={onDuelScore} onDuelProgress={onDuelProgress} autoPlay={botTurn} C={C} />}
        {gameView==='catcher' && <CatcherGame onEnJeu={setEnJeu} key={duelInfo?.turn} coins={coins} cafes={cafes} onEarn={onClickEarn} onSpend={onSpend} onCafeEarn={onCafeEarn} onPayContinue={onPayContinueCatcher} gameThemes={gameThemes} setGameThemes={setGameThemes} unlocked={unlocked} duelMode={duelMode} onDuelScore={onDuelScore} onDuelProgress={onDuelProgress} autoPlay={botTurn} C={C} />}
        </div>
      </div>
    </div>
  );
}

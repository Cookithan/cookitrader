import { useState, useEffect, useRef, useCallback } from "react";
import { Cookie, ShoppingBag, Gamepad2, Home, Gift, Star, CircleDot, MousePointerClick, ChevronLeft, Settings, TrendingUp, Trophy, Coffee, Flame, Zap, LayoutGrid, HelpCircle, Timer, Lock, Dice5, Palette, Bike } from "lucide-react";

import { LEVEL_NAMES, REWARDS, ACHIEVEMENTS, getCheckinReward, QUIZ_COOLDOWN_MS, xpRequired, bonusNiveau, CAFE_MILESTONES_NIVEAUX, JEUX_EN_CHANTIER } from "./data/constants.js";
import { DK, LT, THEMES, GOLD, ESPRESSO, PREMIUM_PALETTE, levelTier } from "./data/themes.js";
import { LEADERBOARD_SCHEMA, generateLeaderboard } from "./data/leaderboard.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { generateUserCode } from "./utils/userCode.js";
import { pickRandomEvent, buildWaitingEvent, ACTIVE_DURATION_MS, MAX_ATTEMPTS, EVENT_LEVEL_MIN } from "./data/events.js";
import { EventBanner } from "./components/EventBanner.jsx";
import { EventAnnounceModal } from "./components/modals/EventAnnounceModal.jsx";
import { EventRewardModal } from "./components/modals/EventRewardModal.jsx";
import { TutorialOverlay, TUTORIAL_STEPS } from "./components/tutorial/TutorialOverlay.jsx";
import { ContextHint, CONTEXT_HINTS } from "./components/tutorial/ContextHint.jsx";
import { SkipConfirmModal } from "./components/modals/SkipConfirmModal.jsx";
import { useInstallPrompt } from "./hooks/useInstallPrompt.js";
import { useSwipe } from "./hooks/useSwipe.js";
import { useBackToClose } from "./hooks/useBackToClose.js";
import SplashScreen from "./components/SplashScreen.jsx";
import { isSupabaseEnabled } from "./lib/supabase.js";
import { upsertProfile, deleteMyProfile, sendGift, getTopTwoTotalEarned, getCommunityCookieTotal, pullProfile, syncDailyCounters, closeWeek, getWeeklyWinners, pingPresence, applyPatchOnce, isPatchApplied, markPatchApplied, listAppliedPatchesByPrefix, getSystemStatus, subscribeSystemStatus, DEFAULT_SYSTEM_STATUS } from "./lib/supabaseSync.js";
import { getCurrentWeekId, getWeekNumberDisplay, MANUAL_RESET_WEEK_ID } from "./lib/weeklyCycle.js";
import { WeeklyChampModal } from "./components/modals/WeeklyChampModal.jsx";
import { NetworkErrorToast } from "./components/NetworkErrorToast.jsx";
import { GLOBAL_CSS } from "./styles/globalStyles.js";

import { AvatarFigure } from "./components/AvatarFigure.jsx";
import { LevelsModal } from "./components/modals/LevelsModal.jsx";
import { LevelCookieMedal } from "./components/LevelCookieMedal.jsx";
import { SentinelleTableau } from "./components/overlays/SentinelleTableau.jsx";
import { SignalementOverlay } from "./components/overlays/SignalementOverlay.jsx";
import { MarketTeaser } from "./components/market/MarketTeaser.jsx";
import { signalerOuverture, brancherRapportDeCrash, rondeSiNecessaire, alertesEnCours, signalementsOuverts, versionPlusRecente } from "./lib/sentinelle.js";
import { LevelUpModal } from "./components/modals/LevelUpModal.jsx";
import { AchievementModal } from "./components/modals/AchievementModal.jsx";
import { LeaderGapWarningModal } from "./components/modals/LeaderGapWarningModal.jsx";
import { OnboardingModal } from "./components/modals/OnboardingModal.jsx";
import { RestoreProfileModal } from "./components/modals/RestoreProfileModal.jsx";
import { PrestigeConfirmModal } from "./components/modals/PrestigeConfirmModal.jsx";
import { MarketRefundModal } from "./components/modals/MarketRefundModal.jsx";
import { SanctionAppliedModal } from "./components/modals/SanctionAppliedModal.jsx";
import { AccountNoticeModal } from "./components/modals/AccountNoticeModal.jsx";
import { getAccountNotices } from "./data/accountNotices.js";
import { PaymentSuccessModal } from "./components/modals/PaymentSuccessModal.jsx";
import { CafesResetNoticeModal } from "./components/modals/CafesResetNoticeModal.jsx";
import { PromoCodeModal } from "./components/modals/PromoCodeModal.jsx";
import { creditFreeShares, adminDebitShares, applyMarketRebalance10pct, getMarketState, MARKET_CONFIG } from "./lib/market.js";
import { isAdminName, ADMIN_NAMES, peutVoirSentinelle } from "./utils/admin.js";
import { SettingsOverlay } from "./components/overlays/SettingsOverlay.jsx";
import { AboutModal } from "./components/modals/AboutModal.jsx";
import { NewVersionModal } from "./components/modals/NewVersionModal.jsx";
import { APP_INFO } from "./lib/appInfo.js";
import { ProfileOverlay } from "./components/overlays/ProfileOverlay.jsx";
import { CollectionContent } from "./components/overlays/CollectionOverlay.jsx";
import { AchievementsOverlay } from "./components/overlays/AchievementsOverlay.jsx";
import { GameOverlay } from "./components/overlays/GameOverlay.jsx";
import { DuelResultModal } from "./components/modals/DuelResultModal.jsx";
import { DuelStakeModal } from "./components/modals/DuelStakeModal.jsx";
import { MatchmakingOverlay } from "./components/overlays/MatchmakingOverlay.jsx";
import { getDuelGame, pickRandomDuelGame, pickThreeDuelGames, rollBotTarget, rollBotStake, makeBotName, makeBotAvatar, resolveDuelScores, settlementFor, listMyDuels, listOpenDuels, acceptDuel, submitDuelScore, createOpenDuel } from "./lib/duels.js";
import { BossEventOverlay } from "./components/overlays/BossEventOverlay.jsx";
import { useCommunityBoss } from "./hooks/useCommunityBoss.js";
import { getMyBossDamage, getBossRank } from "./lib/supabaseSync.js";
import { BOSS_LEVEL_MIN, BOOST_COST_COOKIES, SUPER_COST_CF, bossRewardFor, bossClaimPatchKey, bossFailPatchKey, FAIL_PENALTY_COOKIES, REWARD_MUSIC_ID, bossMusicPatchKey, fourneeNumber, formatBossTimeLeft } from "./data/communityEvents.js";
import { BoutiqueTab } from "./components/tabs/BoutiqueTab.jsx";
import { ClassementTab } from "./components/tabs/ClassementTab.jsx";
import { MarketTab } from "./components/tabs/MarketTab.jsx";
import { MarketLocked } from "./components/tabs/MarketLocked.jsx";
import { InboxModal } from "./components/modals/InboxModal.jsx";
import { getUnreadInboxCount, createInboxMessage } from "./lib/inbox.js";
import { useToast } from "./components/Toaster.jsx";
import { BoostGainToast } from "./components/BoostGainToast.jsx";
import { FriendNotificationModal } from "./components/modals/FriendNotificationModal.jsx";
import { getReceivedFriendRequests, getNewlyAcceptedFriends, getFriends } from "./lib/supabaseSync.js";
import { UserProfileModal } from "./components/modals/UserProfileModal.jsx";
import { SecretBadgeUnlockModal } from "./components/modals/SecretBadgeUnlockModal.jsx";
import { SECRET_BADGES, SECRET_BADGE_BONUS } from "./data/secretBadges.js";
import { setupAudioOnFirstInteraction, setupVisibilityHandler, playSound, playBossMusic, endBossMusic } from "./lib/audio.js";
import { haptic } from "./lib/haptic.js";
import { MAINTENANCE_MODE, isBypassedFromMaintenance } from "./data/maintenance.js";
import MaintenanceScreen from "./components/overlays/MaintenanceScreen.jsx";
import { AnnouncementModal } from "./components/modals/AnnouncementModal.jsx";
import { CommunityMilestoneModal } from "./components/modals/CommunityMilestoneModal.jsx";
import { BoxOpenAnimation } from "./components/modals/BoxOpenAnimation.jsx";
import { ChestOpenAnimation } from "./components/modals/ChestOpenAnimation.jsx";
import { CHEST_TIERS, rollChest } from "./data/chests.js";
import { useTranslation } from "./i18n/index.js";
import MaintenanceWarningModal from "./components/modals/MaintenanceWarningModal.jsx";
import ForceUpdateModal from "./components/modals/ForceUpdateModal.jsx";

/* ════════════════════════════════════════════════════
   COOKITRADER — point d'entrée
   ────────────────────────────────────────────────────
   Toute l'orchestration de l'app vit dans le composant CookiMiner ci-dessous :
     · ÉTATS persistés (localStorage) : voir bloc useLocalStorage()
     · TICK GLOBAL DU MARCHÉ : démarre dès level >= 3, tourne en arrière-plan
     · ACHIEVEMENTS : useEffect qui surveille [totalEarned, streak, level, …]
     · NAVIGATION : 5 onglets (accueil / jeux / classement / marche / boutique)

   Carte des fichiers — où trouver quoi :
     data/
       constants.js   — LEVEL_NAMES, SEGMENTS, REWARDS, ACHIEVEMENTS, QUESTIONS, DAILY_REWARDS
       themes.js      — DK, LT, THEMES, GOLD, ESPRESSO, ROUE_PALETTES, COOKIE_SKINS, PREMIUM_PALETTE
       avatars.js     — ONBOARDING_AVATARS, AVATAR_PREMIUM, getAvatar()
       leaderboard.js — BOT_NAMES, BOT_LEVELS, generateLeaderboard, leaderboardScore
     lib/
       market.js      — logique du marché online (Supabase) : getMarketState,
                        buyShares, sellShares, maintenanceTick…
     hooks/useLocalStorage.js  — persistance auto (clé préfixée 'cookiminer:')
     utils/spin.js             — TW, SEG_A, SEG_C, wRandom (géométrie roue)
     styles/globalStyles.js    — bloc <style> global (keyframes + classes utilitaires)
     components/
       AvatarFigure.jsx
       cookies/   — PremiumCookie · SkinnedCookie
       modals/    — LevelsModal · LevelUpModal · AchievementModal · OnboardingModal
       overlays/  — SettingsOverlay · ProfileOverlay · GameOverlay
       games/     — CheckinGame · QuizGame · SpinGame · ClickGame · PourGame
       market/    — MarketStateCard · MarketChart · TradePanel · PortfolioCard · MarketWelcomeModal
       tabs/      — BoutiqueTab · ClassementTab · MarketTab · MarketLocked

   Conventions :
     · styles inline systématiquement (pas de classes CSS sauf animations dans globalStyles)
     · pas de TypeScript ; JSX pur
     · palette café-only — JAMAIS de rouge ni de vert dans l'UI
     · mobile-first (largeur max 430px, centrée)
═══════════════════════════════════════════════════════ */

/* Formatage compact pour les compteurs du header (cafés / cookies) :
   évite que des grands nombres écrasent le titre "CookiMiner".
   - < 10 000 : nombre brut (jusqu'à 4 chiffres OK dans le pill)
   - 10 000 – 999 999 : "12K" ou "12.3K" selon précision
   - 1 000 000+ : "1.2M"
   Le tooltip natif (title="...") affiche la valeur exacte. */
/* Pseudos dev — comparaison via isAdminName() de utils/admin.js
   (accepte 'admin123' et 'admin558' case-insensitive). ADMIN_NAME
   reste défini pour l'onboarding (pseudo de référence) mais les checks
   utilisent isAdminName() qui accepte les 2. */
const ADMIN_NAME = ADMIN_NAMES[0];

/* Duels — MASQUÉS pendant la v1.30 (décision Cookithan : « on le fera une
   prochaine fois, c'est pas le plus important »). Seule l'entrée « Trouver
   un duel » de l'onglet Jeux est cachée : toute la machinerie reste en
   place et fonctionnelle (matchmaking, auto-play du bot, mises, résultat).
   Repasser à true suffit à tout réafficher — ne PAS supprimer le code. */
const DUELS_VISIBLE = false;

function fmtCompact(n){
  if(n < 10_000) return String(n);
  if(n < 1_000_000){
    const v = n / 1_000;
    return (v < 100 ? v.toFixed(1) : Math.floor(v)) + 'K';
  }
  return (n / 1_000_000).toFixed(1) + 'M';
}

export default function CookiMiner() {
  /* i18n — hook au top pour pouvoir t() partout dans le composant. */
  const { t, localizedField, localizedLevelName } = useTranslation();
  /* ──────────────────────────────────────────────────────────
     MAINTENANCE MODE — short-circuit AVANT tout hook React.
     Lit le userCode directement depuis localStorage (pas via
     useLocalStorage pour ne pas casser l'ordre des hooks lors
     d'un early return). Si MAINTENANCE_MODE=true et que le
     userCode n'est pas whitelisté, on remplace toute l'app
     par <MaintenanceScreen /> — pas de tick, pas de splash,
     pas de jeu.
     Toggle : data/maintenance.js → MAINTENANCE_MODE.
  ────────────────────────────────────────────────────────── */
  if(MAINTENANCE_MODE){
    let lsUserCode = '';
    try{
      const raw = window.localStorage.getItem('cookiminer:userCode');
      if(raw !== null) lsUserCode = JSON.parse(raw);
    }catch{}
    if(!isBypassedFromMaintenance(lsUserCode)){
      return <MaintenanceScreen />;
    }
  }

  /* Splash screen au lancement (BRIEF_SPLASH) — affiché à chaque
     mount React, donc à chaque ouverture ET à chaque refresh (F5).
     Une simple mise en arrière-plan ne re-mount pas → pas de splash.
     Si c'est un refresh (Performance API), on passe en mode "fast"
     (durées ~/2 ; le splash long est inutile à ce moment-là). */
  const [showSplash, setShowSplash] = useState(true);
  const splashFastRef = useRef(false);
  if(typeof window !== 'undefined' && splashFastRef.current === false){
    try{
      const nav = performance.getEntriesByType?.('navigation');
      if(nav?.[0]?.type === 'reload') splashFastRef.current = true;
    }catch{}
  }
  /* useCallback stable : sinon SplashScreen voit une nouvelle référence
     à chaque render parent (tick market, events, etc.), son useEffect
     se relance et les timers ne s'écoulent jamais. */
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);
  const [coins,       setCoins]       = useLocalStorage('coins',       0);
  const [cafes,       setCafes]       = useLocalStorage('cafes',       0);
  const [totalEarned, setTotalEarned] = useLocalStorage('totalEarned', 0);
  /* Compteur hebdomadaire — incrémenté en parallèle de totalEarned.
     Auto-reset à 0 quand le week_id change (passage du vendredi 18 h UTC).
     Sert au classement weekly + récompenses top 3 par semaine. */
  const [weeklyEarned,  setWeeklyEarned]  = useLocalStorage('weeklyEarned',  0);
  const [weeklyWeekId,  setWeeklyWeekId]  = useLocalStorage('weeklyWeekId',  '');
  /* Ref synchronisée pour lire la dernière valeur dans addCoins (closure). */
  const weeklyWeekIdRef = useRef(weeklyWeekId);
  weeklyWeekIdRef.current = weeklyWeekId;
  const [level,       setLevel]       = useLocalStorage('level',       1);
  const [xp,          setXp]          = useLocalStorage('xp',          0);
  const [streak,      setStreak]      = useLocalStorage('streak',      0);
  const [clickRecord, setClickRecord] = useLocalStorage('clickRecord', 0);
  /* Temps total passé dans l'app, en secondes. Incrémenté chaque seconde
     tant que l'onglet est visible (document.visibilityState === 'visible').
     Pause auto quand l'app est en background (économie batterie + métriques
     fiables). Sync Supabase via upsertProfile/pullProfile. */
  const [totalPlayTime, setTotalPlayTime] = useLocalStorage('totalPlayTime', 0);
  const totalPlayTimeRef = useRef(totalPlayTime);
  totalPlayTimeRef.current = totalPlayTime;
  /* Système Prestige : à chaque renaissance (niveau 25 atteint), le joueur
     repart au niveau 1 avec un multiplicateur permanent +10% sur les gains
     🍪. Indicateur visuel par couronne(s) sur le pseudo. Items/achievements/
     cafés/actions $CKM/amis sont préservés. */
  const [prestigeLevel, setPrestigeLevel] = useLocalStorage('prestigeLevel', 0);
  /* Boosters consommables ☕ (sinks récurrents).
     - nextGameDoubler : bool, double le prochain addCoins(>0). Auto-clear
       après usage. Acheté via item `next_game_doubler`.
     - boostUntil : timestamp ms ; si Date.now() < boostUntil → multiplicateur
       x2 sur tous les gains 🍪. Acheté via `boost_x2_1h` (+1 h cumulables). */
  const [nextGameDoubler, setNextGameDoubler] = useLocalStorage('nextGameDoubler', false);
  const [boostUntil,      setBoostUntil]      = useLocalStorage('boostUntil', 0);
  /* Nouveaux sinks 11/05/2026.
     - freeRechargesUntil : timestamp ms ; tant que Date.now() < freeRechargesUntil,
       les recharges Roue/Slot/Pile sont gratuites (pas de débit ☕).
     - streakSaveCount : nombre de "saves" en stock pour préserver le streak
       au cas où un jour est manqué. Consommé automatiquement au check-in
       si lastCheckin antérieur à hier. */
  const [freeRechargesUntil, setFreeRechargesUntil] = useLocalStorage('freeRechargesUntil', 0);
  const [streakSaveCount,    setStreakSaveCount]    = useLocalStorage('streakSaveCount', 0);
  /* bulkTradePasses : charges d'ordre bulk $CKM. Chaque charge permet
     d'acheter/vendre tout son portefeuille (ou max possible) en 1 tx
     avec bypass du cap 30. Item achetable indéfiniment (cumulable). */
  const [bulkTradePasses,    setBulkTradePasses]    = useLocalStorage('bulkTradePasses', 0);
  /* Cap quotidien Bonus VIP : 1 achat / jour / item. Stocke
     `{ [itemId]: 'Mon May 10 2026' }`. Le check de date se fait à la
     lecture (wasBoughtVipToday) — pas de reset planifié, l'entrée
     périme automatiquement quand toDateString change. */
  const [vipPurchasesToday, setVipPurchasesToday] = useLocalStorage('vipPurchasesToday', {});
  /* Drop one-shot du barista légendaire dans Devine la commande. Une fois
     true, plus jamais de roll. Pas synchro Supabase — c'est du loot local
     (cf. theme_cookies qui est synchronisé via `unlocked`). Reset par
     resetProgress (cf. plus bas). */
  const [legendaryBaristaSeen, setLegendaryBaristaSeen] = useLocalStorage('legendaryBaristaSeen', false);
  const [unlocked,    setUnlocked]    = useLocalStorage('unlocked',    []);
  /* Jeux force-unlock par code promo (ex: YUZUKAWAI → flappy même sans
     niveau requis). Array d'ids GAMES.id. Override le levelRequired du
     mini-jeu côté UI : carte non locked, accès direct. */
  const [unlockedGames, setUnlockedGames] = useLocalStorage('unlockedGames', []);
  const [lastCheckin, setLastCheckin] = useLocalStorage('lastCheckin', null);
  const [lastQuiz,    setLastQuiz]    = useLocalStorage('lastQuiz',    null);
  /* Cap quotidien de spins : 50 (niv 1-9) ou 20 (niv 10+). spinsDate
     = toDateString() du dernier spin → reset à 0 au passage minuit.
     Les Jetons VIP réduisent spinsToday mais ne dépassent jamais le cap. */
  const [spinsToday, setSpinsToday] = useLocalStorage('spinsToday', 0);
  const [spinsDate,  setSpinsDate]  = useLocalStorage('spinsDate', null);
  /* Cap quotidien Machine à Sous : 50 parties. Même pattern que les
     spins (state lifté à App.jsx pour gater l'achat du slot_pass dans
     la boutique). Consommé par SlotGame via consumeSlotGame, bumped
     down (récupération) via addSlotPass à l'achat. */
  const [slotGamesToday, setSlotGamesToday] = useLocalStorage('slotGamesToday', 0);
  const [slotGamesDate,  setSlotGamesDate]  = useLocalStorage('slotGamesDate', null);
  /* Compteur quotidien Pile de Tasses (cap 100, reset à minuit). Recharge
     possible via bouton in-game pour 2 ☕ → reset à 0. LS-only pour
     l'instant (pas de sync Supabase) — peut être upgradé plus tard si
     anti-cheat cross-device devient nécessaire. */
  const [pyramidGamesToday, setPyramidGamesToday] = useLocalStorage('pyramidGamesToday', 0);
  const [pyramidGamesDate,  setPyramidGamesDate]  = useLocalStorage('pyramidGamesDate', null);
  const [dark,        setDark]        = useLocalStorage('dark',        false);
  /* MARCHÉ ONLINE (BRIEF_MARCHE_ONLINE) — l'état du marché (prix, stock,
     historique 24h, portfolio) vit côté Supabase et est lu par MarketTab.
     Ici on ne garde que les compteurs LOCAUX qui alimentent les badges
     et achievements : `marketRealized` (plus-value cumulée → Investisseur)
     et `totalInvested` (cookies investis cumulés → 'trader' achievement,
     déclaré plus bas dans le bloc des achievements). */
  const [marketRealized, setMarketRealized] = useLocalStorage('marketRealized', 0);
  const [leaderboard,    setLeaderboard]    = useLocalStorage('leaderboard',    null);
  const [leaderboardLastBoost, setLeaderboardLastBoost] = useLocalStorage('leaderboardLastBoost', '');
  const [leaderboardLastHourly, setLeaderboardLastHourly] = useLocalStorage('leaderboardLastHourly', 0);
  const [userName,    setUserName]    = useLocalStorage('userName',   '');
  const [userAvatar,  setUserAvatar]  = useLocalStorage('userAvatar', null);
  const [joinDate,    setJoinDate]    = useLocalStorage('joinDate',   '');
  const [nameChangeCount, setNameChangeCount] = useLocalStorage('nameChangeCount', 0);
  const [userCode,    setUserCode]    = useLocalStorage('userCode', '');
  const [userBio,     setUserBio]     = useLocalStorage('userBio',  '');
  /* Événements spéciaux (PHASE 6E) — cycle waiting (1-24h) → active
     (1h, 3 essais) → repeat. Persistés pour survivre au refresh. */
  const [activeEvent,     setActiveEvent]     = useLocalStorage('activeEvent',     null);
  const [completedEvents, setCompletedEvents] = useLocalStorage('completedEvents', []);
  const [showEventModal,  setShowEventModal]  = useState(false);
  const [eventReward,     setEventReward]     = useState(null);

  /* Tutoriel guidé (BRIEF_TUTORIEL) — 6 étapes, déclenché au 1er
     lancement après l'onboarding. tutorialStep est volatile (volontaire :
     une session = un tuto), seul `tutorialCompleted` est persisté en LS.
     `seenHints` (array d'ids) tracke les bulles contextuelles déjà vues. */
  const [tutorialStep,    setTutorialStep]    = useState(0);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [seenHints,       setSeenHints]       = useLocalStorage('seenHints', []);
  const [activeHint,      setActiveHint]      = useState(null);

  /* Génère le code ami au premier lancement (post-onboarding ou refresh sans code en LS).
     Reset → on remet à '' dans resetProgress, cet effet régénère un nouveau code propre. */
  useEffect(()=>{
    if(!userCode) setUserCode(generateUserCode());
  },[userCode, setUserCode]);

  /* Audio (BRIEF_AUDIO) — branche les listeners pour lancer la musique
     d'ambiance dès le 1er tap (autoplay mobile bloqué sinon), ET pour
     pauser la musique quand l'app passe en arrière-plan sur mobile. */
  useEffect(() => {
    setupAudioOnFirstInteraction();
    setupVisibilityHandler();
  }, []);

  /* Sync Supabase debouncé (5s). Crée OU met à jour le profil via upsert
     selon que user_code existe déjà ou non — pas de logique séparée
     "création" / "update" à gérer côté client.
     Skipped si Supabase off, pas de userCode, ou pas encore d'userName
     (l'utilisateur n'a pas fini l'onboarding). */
  /* États qu'on a besoin de capturer dans l'effet upsert ci-dessous —
     déclarés ici (avant le useEffect) pour éviter une TDZ sur la deps array. */
  const [earnedAchievements, setEarnedAchievements] = useLocalStorage('achievements', []);
  const [activeTheme,        setActiveTheme]        = useLocalStorage('activeTheme', '');
  /* Titre couleur affiché sur le pseudo (cf. data/titles.js).
     Priorité dans getNameStyle : Créateur > Légende > Titre. '' = aucun.
     Sync via upsertProfile pour visibilité cross-device. */
  const [activeTitle,        setActiveTitle]        = useLocalStorage('activeTitle', '');
  /* PIN de restauration (BRIEF_RESTAURATION sécurité) : 4 chiffres
     auto-générés au 1er besoin pour bloquer les restaurations
     non-autorisées. Visible dans Settings, requis dans RestoreProfileModal. */
  const [restorePin,         setRestorePin]         = useLocalStorage('restorePin', '');
  /* Comptes connus (pour switch rapide via RestoreProfileModal). On stocke
     userCode + userName + lastUsed UNIQUEMENT — le PIN n'est JAMAIS
     persisté ici (toujours retapé pour valider le switch). Cap 5 entrées. */
  const [knownAccounts,      setKnownAccounts]      = useLocalStorage('knownAccounts', []);

  /* Auto-génération du PIN au 1er besoin : si on a un userCode mais
     pas encore de PIN (compte fraîchement créé OU compte existant
     d'avant la migration), on tire 4 chiffres au hasard. Le PIN est
     ensuite sync via le upsertProfile en background. */
  useEffect(() => {
    if(!userCode) return;
    if(restorePin && /^\d{4}$/.test(restorePin)) return;
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    setRestorePin(pin);
  }, [userCode, restorePin, setRestorePin]);

  /* Auto-ajout du compte courant à la liste knownAccounts. Si déjà
     présent, on met juste à jour userName + lastUsed (utile si le
     pseudo a changé). Cap 5 entrées (les + récentes). */
  useEffect(() => {
    if(!userCode || !userName) return;
    setKnownAccounts(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const others = arr.filter(a => a && a.userCode !== userCode);
      const next = [{ userCode, userName, lastUsed: Date.now() }, ...others];
      return next.slice(0, 5);
    });
  }, [userCode, userName, setKnownAccounts]);

  /* État "online" optimiste : on suppose que la sync marche. Ne passe
     à `error` que si un upsert échoue (réseau, RLS, etc.). Ça évite
     l'effet "Hors ligne" pendant les 5s du debounce initial. */
  const [supabaseError, setSupabaseError] = useState(false);
  /* Pull-on-mount : tant que false, on bloque les pushs. Évite que le
     localStorage stale d'un device écrase l'état avancé poussé par un
     autre device sous le même userCode (cas "j'ai perdu 10k cookies en
     reconnectant sur mobile"). Bascule à true une fois la réconciliation
     faite (ou immédiatement si Supabase off / pas encore d'identité). */
  const [pullDone, setPullDone] = useState(false);
  /* Pause de l'upsert auto (timestamp). Tant que pauseUpsertUntil > now,
     on push pas vers Supabase. Utilisé après retour Stripe pour laisser
     le webhook + les re-pulls finaliser sans race condition (l'upsert
     client écrasait sinon les cafés crédités par Stripe). */
  const [pauseUpsertUntil, setPauseUpsertUntil] = useState(0);

  /* Adoption forcée des valeurs serveur — compteur gardé PAR APPAREIL.
     C'est toute la différence avec applyPatchOnce, qui est par COMPTE :
     le 08/09/2026, la sanction de Fedider a été effacée parce que son
     verrou avait été consommé sur un premier téléphone, et qu'un second
     appareil au localStorage périmé a repoussé les anciennes valeurs.
     Ici, CHAQUE appareil compare son compteur à celui du serveur. */
  const [adoptVersion,     setAdoptVersion]     = useLocalStorage('adoptVersion', 0);
  useEffect(()=>{
    if(!isSupabaseEnabled()){ setPullDone(true); return; }
    if(!userCode || !userName){ return; }
    if(pullDone) return;
    let alive = true;
    (async () => {
      const server = await pullProfile(userCode);
      if(!alive){ return; }
      /* Pull si le serveur est en avance sur AU MOINS une dimension
         monotone : total_earned (gameplay) OU cafes (paiement Stripe via
         webhook). Sans le check cafes, un paiement Stripe créditait la
         DB sans que le client le voie (l'upsert client écrasait derrière). */
      /* ── ADOPTION FORCÉE ──────────────────────────────────────
         Quand le serveur porte un compteur supérieur à celui de CET
         appareil, on prend ses valeurs telles quelles, même plus
         basses. C'est le seul moyen qu'une correction faite à la main
         (sanction, remise à plat) tienne : sans ça, le client garde son
         localStorage gonflé et le repousse en base dans les 5 secondes.

         On met l'upsert en pause 8 s, le temps que les setState écrivent,
         sinon le debounce republierait les anciennes valeurs par-dessus. */
      const doitAdopter = server && Number(server.forceAdoptVersion || 0) > Number(adoptVersion || 0);
      if(doitAdopter){
        setPauseUpsertUntil(Date.now() + 8000);
        setAdoptVersion(Number(server.forceAdoptVersion));
      }

      const serverAhead = server && (
        Number(server.totalEarned) > totalEarned ||
        Number(server.cafes) > cafes
      );
      if(serverAhead || doitAdopter){
        setCoins(server.coins);
        setCafes(server.cafes);
        setTotalEarned(server.totalEarned);
        setLevel(server.level);              lvRef.current = server.level;
        setXp(server.xp);                    xpRef.current = server.xp;
        setStreak(server.streak);
        setUnlocked(server.unlocked || []);
        setEarnedAchievements(server.earnedAchievements || []);
        setActiveTheme(server.activeTheme || '');
        setActiveTitle(server.activeTitle || '');
        setNameChangeCount(server.nameChangeCount || 0);
        setPrestigeLevel(server.prestigeLevel || 0);
        showToastRef.current?.(doitAdopter
          ? '☁️ Ton compte a été mis à jour depuis le serveur'
          : '☁️ Données synchronisées');
      }
      /* Anti-cheat cross-device : on merge TOUJOURS les compteurs
         quotidiens, indépendamment de serverAhead. Sinon, se reconnecter
         depuis un autre appareil avec le LS vide laisserait le check-in,
         le quiz, les spins et les slots à dispo (alors que c'est déjà
         consommé sur l'autre device). On prend la valeur LA PLUS
         RESTRICTIVE entre local et serveur. */
      if(server){
        const today = new Date().toDateString();
        /* Check-in : si le serveur a un lastCheckin différent du local,
           prendre celui du serveur (souvent c'est aujourd'hui — bloque
           le re-check-in sur le 2e device). */
        if(server.lastCheckin && server.lastCheckin !== lastCheckin){
          setLastCheckin(server.lastCheckin);
        }
        /* Quiz : timestamp, on prend le max (le plus récent = cooldown
           le plus restrictif). */
        if(Number(server.lastQuiz) > Number(lastQuiz || 0)){
          setLastQuiz(Number(server.lastQuiz));
        }
        /* Spins : si server.spinsDate === aujourd'hui, prendre max(local,
           server). Si server.spinsDate est plus récent que local (= un
           autre jour ou plus avancé), prendre server intégralement. */
        if(server.spinsDate === today){
          if(Number(server.spinsToday) > Number(spinsToday || 0)){
            setSpinsToday(Number(server.spinsToday));
            setSpinsDate(today);
          }
        } else if(server.spinsDate && server.spinsDate !== spinsDate){
          /* Edge case : serveur a un spinsDate différent et qui n'est
             pas aujourd'hui (= sync depuis un autre device hier soir).
             On laisse le code de tick gérer le reset au changement de jour. */
        }
        /* Idem slots */
        if(server.slotGamesDate === today){
          if(Number(server.slotGamesToday) > Number(slotGamesToday || 0)){
            setSlotGamesToday(Number(server.slotGamesToday));
            setSlotGamesDate(today);
          }
        }
        /* Classement hebdomadaire : prendre les valeurs serveur si on
           est sur la même semaine (sinon le local sera reset à la
           prochaine addCoins via auto-detection). Cross-device safe. */
        const currentWeekId = getCurrentWeekId();
        if(server.weeklyWeekId === currentWeekId){
          if(Number(server.weeklyEarned) > Number(weeklyEarned || 0)){
            setWeeklyEarned(Number(server.weeklyEarned));
            setWeeklyWeekId(currentWeekId);
          }
        }
        /* Temps total dans l'app : on prend le MAX(serveur, local) pour
           ne jamais perdre de temps (changement de device, F5 avant sync). */
        const srvPlayTime = Number(server.totalPlayTime) || 0;
        const locPlayTime = Number(totalPlayTimeRef.current) || 0;
        if(srvPlayTime > locPlayTime){
          setTotalPlayTime(srvPlayTime);
        }
      }
      setPullDone(true);
    })();
    return ()=>{ alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCode, userName, pullDone]);
  useEffect(()=>{
    if(!isSupabaseEnabled()) return;
    if(!userCode || !userName) return;
    if(!pullDone) return;   /* ⬅ gate : on attend la réconciliation */
    /* Pause post-Stripe : on skip pour ne pas écraser un crédit webhook
       en cours. Reschedule au moment du déblocage pour pousser ensuite. */
    if(pauseUpsertUntil > Date.now()){
      const remaining = pauseUpsertUntil - Date.now();
      const t = setTimeout(() => setPauseUpsertUntil(0), remaining + 100);
      return () => clearTimeout(t);
    }
    const t = setTimeout(async ()=>{
      /* Filtre `unlocked` aux IDs de badges (REWARDS type='Badge' + secrets)
         pour que les amis voient ma collection sans bloater la requête avec
         tous les thèmes / avatars / musiques unlock. */
      const secretIds = Object.values(SECRET_BADGES).map(b => b.id);
      const badgeIds = (unlocked || []).filter(id =>
        REWARDS.find(r => r.id === id && r.type === 'Badge') ||
        secretIds.includes(id)
      );
      const res = await upsertProfile({
        userCode, userName, userAvatar, level, totalEarned,
        coins, streak, userBio, badgeIds,
        /* Restauration complète : on sync TOUT ce qui doit pouvoir
           être ramené sur un autre appareil. */
        cafes, xp,
        unlocked: unlocked || [],
        nameChangeCount,
        earnedAchievements: earnedAchievements || [],
        activeTheme: activeTheme || '',
        activeTitle: activeTitle || '',
        restorePin: restorePin || '',
        prestigeLevel: prestigeLevel || 0,
        /* Compteurs quotidiens (anti-cheat cross-device). Sans ces 6
           champs, se reconnecter sur un autre appareil donnait accès
           à un re-check-in / re-quiz / spins reset / slots reset. */
        lastCheckin: lastCheckin || null,
        lastQuiz: Number(lastQuiz) || 0,
        spinsToday: Number(spinsToday) || 0,
        spinsDate: spinsDate || null,
        slotGamesToday: Number(slotGamesToday) || 0,
        slotGamesDate: slotGamesDate || null,
        /* Classement hebdomadaire — vendredi 18h UTC reset. */
        weeklyEarned: Number(weeklyEarned) || 0,
        weeklyWeekId: weeklyWeekId || '',
        /* Temps total dans l'app (sec). Push lifetime via debounce 5 s. */
        totalPlayTime: Number(totalPlayTime) || 0,
      });
      setSupabaseError(!res?.ok);
    }, 5000);
    return ()=>clearTimeout(t);
    /* ⚠️ totalPlayTime EST VOLONTAIREMENT ABSENT des deps — il change toutes
       les secondes et reset constamment le debounce 5 s, ce qui empêchait
       TOUT push vers le serveur tant que le joueur était actif. La sync de
       total_play_time est gérée à part par un useEffect dédié (interval
       30 s + flush sur hidden/pagehide). La valeur courante est lue depuis
       le state au moment où un AUTRE champ déclenche un upsert. */
  }, [pullDone, pauseUpsertUntil, userCode, userName, userAvatar, level, totalEarned, coins, streak, userBio, unlocked, cafes, xp, nameChangeCount, earnedAchievements, activeTheme, activeTitle, restorePin, prestigeLevel, lastCheckin, lastQuiz, spinsToday, spinsDate, slotGamesToday, slotGamesDate, weeklyEarned, weeklyWeekId]);

  /* Heartbeat présence — touche last_active toutes les 60 s tant que
     l'onglet est visible. Couplé à visibilitychange : suspend si hidden,
     ping immédiatement à la reprise. Sans ce battement, un user idle
     (juste à regarder le classement) sortirait du compteur online dès
     que l'upsertProfile cesserait de fire (deps inchangées). */
  useEffect(() => {
    if(!isSupabaseEnabled() || !userCode) return;
    let id = null;
    const tick = () => { if(document.visibilityState === 'visible') pingPresence(userCode); };
    const start = () => {
      tick();
      id = setInterval(tick, 60_000);
    };
    const stop = () => { if(id){ clearInterval(id); id = null; } };
    const onVis = () => {
      if(document.visibilityState === 'visible'){ if(!id) start(); }
      else { stop(); }
    };
    if(document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [userCode]);

  const [totalInvested,      setTotalInvested]      = useLocalStorage('totalInvested', 0);
  /* File d'attente des succès à célébrer (FIFO). Un array (et non un slot
     unique) pour ne JAMAIS écraser un 2e succès déclenché en même temps. Le
     bonus est crédité au déclenchement (cf. triggerAchievement), la modale ne
     fait plus que célébrer — donc même si la file est perdue (reload), aucun
     🍪/☕ n'est perdu. */
  const [pendingAchievements, setPendingAchievements] = useState([]);
  const [activeBanner, setActiveBanner] = useLocalStorage('activeBanner','');
  /* Skin du cookie central tappable (cf. COOKIE_SKINS). '' = défaut. */
  const [activeSkin,   setActiveSkin]   = useLocalStorage('activeSkin','');
  /* Mapping { gameId → themeId } pour les thèmes de mini-jeu (cf. data/gameThemes.js).
     Vide ({}) = default partout. Fallback automatique via getActiveTheme()
     si le themeId stocké n'existe plus (sécurité contre LS périmé). */
  const [gameThemes,   setGameThemes]   = useLocalStorage('gameThemes', {});
  /* (activeTitle est déclaré plus haut — utilisé dans le upsertProfile.) */
  /* Codes promo rares révélés via items premium (cf. promoCodes.js
     PROMO_CODES.<X>.secret). Une fois révélé, le code apparaît dans
     PromoCodeModal et peut être saisi pour récupérer la récompense. */
  const [revealedPromoCodes, setRevealedPromoCodes] = useLocalStorage('revealedPromoCodes', []);
  const [pendingLvUp,  setPendingLvUp]  = useState(null);
  const [tab,          setTab]          = useState('accueil');
  const [gameView,     setGameView]     = useState(null);
  /* Carte de jeu en train de « popper ». L'overlay s'ouvrait dans le même
     tick que le tap : l'animation existait mais était instantanément
     recouverte, donc invisible. On joue le pop, PUIS on ouvre (200 ms).
     Assez court pour ne pas se sentir comme de la latence, assez long
     pour que le geste ait une réponse. */
  const [poppingGame,  setPoppingGame]  = useState(null);
  const popTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(popTimerRef.current), []);
  const launchGame = (id) => {
    if(poppingGame) return;            /* double-tap ignoré pendant le pop */
    playSound('modal');
    setPoppingGame(id);
    popTimerRef.current = setTimeout(() => {
      setGameView(id);
      setPoppingGame(null);
    }, 200);
  };
  /* ── Duels 1v1 — Phase 2 : matchmaking « façon Valorant » + boucle bot ── */
  const [duelSession, setDuelSession] = useState(null);   // duel en cours { kind:'bot', gameKey, higherWins, botName, botTarget }
  const [duelResult,  setDuelResult]  = useState(null);   // écran de résultat post-duel
  const [matchmaking, setMatchmaking] = useState(null);   // séquence de recherche { game, botName, botTarget }
  const [showStakeModal, setShowStakeModal] = useState(false);  // sélecteur de mise (poser un défi)
  const [duelHandoff, setDuelHandoff] = useState(null);         // transition « le bot a joué → à toi » (Option 1)
  const duelMyLiveRef  = useRef(0);                       // ton score live (REF → aucun re-render de l'App)
  const duelBotLiveRef = useRef(0);                       // score bot live (idem) — la barre les poll en 10 fps
  const duelSessionRef = useRef(null);                    // miroir sync (évite closure périmée à la fin de partie)
  const matchmakingRef = useRef(null);
  const duelPlayerScoreRef = useRef(null);                // score final joueur (split : on attend les 2)
  const duelBotScoreRef    = useRef(null);                // score final bot (split)
  /* Lance la recherche : tire un jeu au hasard + un bot + sa cible fixe. */
  const startMatchmaking = () => {
    playSound('modal');
    setDuelResult(null);
    duelMyLiveRef.current = 0;
    duelBotLiveRef.current = 0;
    /* Étape A : l'adversaire est un BOT réaliste (il « choisit » son jeu
       parmi 3 et joue). Le vrai matchmaking live 2 joueurs viendra se
       brancher par-dessus (étape B) : si un joueur cherche au même moment
       on l'appaire, sinon ce bot prend le relais. */
    const games3  = pickThreeDuelGames();
    const botPick = games3[Math.floor(Math.random() * games3.length)];
    const m = { kind:'bot', botName: makeBotName(), botAvatar: makeBotAvatar(), offeredGames: games3, botGamePick: botPick.key, botStake: rollBotStake() };
    matchmakingRef.current = m;
    setMatchmaking(m);
  };
  /* POSER un défi : mise choisie → épreuve au hasard → on joue → createOpenDuel. */
  const startCreateDuel = (stakeCookies, stakeCafes) => {
    setShowStakeModal(false);
    playSound('modal');
    setDuelResult(null);
    duelMyLiveRef.current = 0;
    duelBotLiveRef.current = 0;
    const game = pickRandomDuelGame();
    const m = { kind:'create', game, stakeCookies, stakeCafes };
    matchmakingRef.current = m;
    setMatchmaking(m);
  };
  /* Fin du matchmaking → ouvre le jeu (le useEffect duelMode l'auto-lance).
     Online : on ACCEPTE le défi côté serveur + on débite ma mise (escrow)
     AVANT de lancer la partie. */
  const launchDuel = (gameKey, myStake) => {
    const m = matchmakingRef.current;
    if(!m) return;
    const game = getDuelGame(gameKey) || (m.offeredGames && m.offeredGames[0]);
    if(!game) return;
    duelMyLiveRef.current = 0;
    duelBotLiveRef.current = 0;
    /* Option 1 : d'abord le TOUR DU BOT (autoPlay, visible) ; son vrai score
       remplit botTarget en fin de tour, puis TON tour. Mises : le gagnant
       rafle celle de l'adversaire (appliqué au résultat). */
    const sess = { kind:'bot', gameKey: game.key, higherWins: game.higherWins, botName: m.botName, botAvatar: m.botAvatar, turn:'bot', botTarget: null, myStake: myStake || { cookies:0, cafes:0 }, botStake: m.botStake || { cookies:0, cafes:0 } };
    duelSessionRef.current = sess;
    setMatchmaking(null);
    setDuelSession(sess);
    setGameView(game.key);
  };
  /* Fin de la transition « à toi » → lance MON tour (interactif). */
  const startMyTurn = () => {
    const sess = duelSessionRef.current;
    setDuelHandoff(null);
    if(!sess) return;
    duelMyLiveRef.current = 0;
    setGameView(sess.gameKey);
  };
  /* Écrit des REFS, pas du state (aucun re-render App). Route selon le tour :
     pendant le tour du bot, c'est SON score qui monte. */
  const handleDuelProgress = (s) => {
    const v = Math.max(0, Math.floor(s) || 0);
    if(duelSessionRef.current?.turn === 'bot') duelBotLiveRef.current = v;
    else duelMyLiveRef.current = v;
  };
  const handleBotDuelProgress = (s) => { duelBotLiveRef.current = Math.max(0, Math.floor(s) || 0); };

  /* Affiche l'écran de résultat à partir de 2 scores (toi vs adversaire). */
  const showDuelResult = (sess, myScore, oppScore) => {
    const r = resolveDuelScores(sess.higherWins, myScore, oppScore);   // 'challenger'(=moi) | 'opponent'(=bot) | 'draw'
    const outcome = r === 'draw' ? 'draw' : (r === 'challenger' ? 'win' : 'lose');
    /* Mise : cagnotte = les deux mises ; le gagnant remporte la MOITIÉ du pot,
       le perdant perd cette même moitié (symétrique, peu importe qui a le plus
       misé). Plafond de mise = 2× celle du bot (borné à la saisie). */
    const myS  = sess.myStake  || { cookies:0, cafes:0 };
    const botS = sess.botStake || { cookies:0, cafes:0 };
    const halfC = Math.floor(((myS.cookies||0) + (botS.cookies||0)) / 2);
    const halfK = Math.floor(((myS.cafes||0)   + (botS.cafes||0))   / 2);
    let delta = { cookies:0, cafes:0 };
    if(outcome === 'win'){
      delta = { cookies: halfC, cafes: halfK };
      if(halfC) setCoins(c => c + halfC);
      if(halfK) setCafes(c => (c || 0) + halfK);
    } else if(outcome === 'lose'){
      delta = { cookies: -halfC, cafes: -halfK };
      if(halfC) spendCoins(halfC);
      if(halfK) setCafes(c => Math.max(0, (c || 0) - halfK));
    }
    setDuelResult({ gameKey:sess.gameKey, myScore, myAvatar:userAvatar, oppName:sess.botName, oppAvatar:sess.botAvatar, oppScore, outcome, higherWins:sess.higherWins, delta });
    playSound(outcome === 'win' ? 'success' : outcome === 'draw' ? 'modal' : 'error');
  };
  /* Split-screen : ne résout QUE quand les deux scores réels sont là. */
  const finishSplitDuel = () => {
    const sess = duelSessionRef.current;
    const p = duelPlayerScoreRef.current, b = duelBotScoreRef.current;
    if(!sess || p == null || b == null) return;
    duelSessionRef.current = null;
    duelPlayerScoreRef.current = null;
    duelBotScoreRef.current = null;
    setGameView(null);
    setDuelSession(null);
    showDuelResult(sess, p, b);
  };
  /* Fin de MA partie. Split → j'attends le bot ; sinon → vs cible fixe.
     Aucun side-effect nesté dans un updater (règle React strict). */
  const handleDuelScore = (score) => {
    const sess = duelSessionRef.current;
    if(!sess) return;
    if(sess.turn === 'bot'){
      /* Le bot a fini SON tour → on garde son VRAI score, transition « à toi ». */
      const updated = { ...sess, turn:'me', botTarget: score };
      duelSessionRef.current = updated;
      duelBotLiveRef.current = score;
      duelMyLiveRef.current = 0;
      setGameView(null);
      setDuelSession(updated);
      setDuelHandoff({ gameKey: sess.gameKey, botName: sess.botName, botScore: score, higherWins: sess.higherWins, metric: getDuelGame(sess.gameKey)?.metric });
      playSound('modal');
      return;
    }
    /* Mon tour fini → résultat (mon score vs le vrai score du bot). */
    duelSessionRef.current = null;
    setGameView(null);
    setDuelSession(null);
    showDuelResult(sess, score, sess.botTarget);
  };
  /* Fin de la partie du BOT (split uniquement). */
  const handleBotDuelScore = (score) => {
    if(!duelSessionRef.current) return;
    duelBotScoreRef.current = score;
    finishSplitDuel();
  };

  /* ── DUELS EN LIGNE — RÉCONCILIATION ──────────────────────────────
     Relit mes duels et applique le règlement UNE SEULE FOIS par duel
     (applyPatchOnce, clé = duel.id) : verse le pot au gagnant, rembourse
     l'égalité/expiré/annulé. Gère l'async (le challenger touche son gain
     au prochain chargement). Le crédit est BRUT (setCoins/setCafes) →
     transfert pur, ne compte pas au classement. Le bonus Ligue (qui,
     lui, compte) sera ajouté séparément et plafonné. */
  const reconcileDuels = async () => {
    if(!isSupabaseEnabled() || !userCode || !pullDone) return;
    let mine = [];
    try { mine = await listMyDuels(userCode); } catch { return; }
    for(const d of mine){
      const s = settlementFor(d, userCode);
      if(s.kind === 'none' || s.kind === 'lose') continue;   // rien à créditer
      await applyPatchOnce({
        userCode,
        lsKey:    'cookiminer:duel_settle_' + d.id,
        patchKey: 'duel_settle_' + d.id,
        applyFn: () => {
          if(s.cookies > 0) setCoins(c => c + s.cookies);
          if(s.cafes   > 0) setCafes(c => (c || 0) + s.cafes);
          const label   = getDuelGame(d.gameKey)?.label || 'un duel';
          const oppName = d.challengerCode === userCode ? (d.opponentName || 'ton adversaire') : (d.challengerName || 'ton adversaire');
          if(s.kind === 'win'){
            playSound('levelup');
            showToast(`🏆 Duel gagné — +${s.cookies} 🍪${s.cafes ? ` +${s.cafes} ☕` : ''}`);
            createInboxMessage(userCode, 'system', '🏆 Duel remporté !',
              `Tu as battu ${oppName} sur ${label}. Pot récupéré : ${s.cookies} 🍪${s.cafes ? ` + ${s.cafes} ☕` : ''}.`, null).catch(()=>{});
          } else if(s.kind === 'draw'){
            showToast(`🤝 Égalité sur ${label} — mise remboursée`);
          } else if(s.kind === 'refund'){
            showToast(`↩️ Défi non relevé — mise remboursée`);
          }
        },
      });
    }
  };
  /* Réconcilie à l'ouverture (une fois le profil chargé). */
  useEffect(() => {
    if(!isSupabaseEnabled() || !userCode || !pullDone) return;
    reconcileDuels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCode, pullDone]);

  /* 🧪 HARNAIS DE TEST (admin only) : pose un FAUX défi ouvert d'un
     "TestBot" que je peux relever tout seul pour valider la boucle en ligne
     sans 2 comptes. NE PAS exposer aux joueurs (gate isAdminName). */
  const devCreateFakeDuel = async () => {
    if(!isSupabaseEnabled() || !userCode){ showToast('🧪 Supabase requis (local : .env.local)'); return; }
    const game   = pickRandomDuelGame();
    const target = rollBotTarget(game);
    const res = await createOpenDuel({ gameKey: game.key, higherWins: game.higherWins, stakeCookies: 100, stakeCafes: 0, challengerCode: 'ZZZ-B0T', challengerName: 'TestBot', challengerScore: target });
    if(res.error){ showToast(`🧪 ${res.error}`); return; }
    showToast(`🧪 Faux défi posté : ${game.label}, score ${target}, mise 100 🍪 — fais « Trouver un duel »`);
  };
  const [showBoss,     setShowBoss]     = useState(false);
  /* Boss communautaire (Le Gâteau Géant). Déclaré tôt : showBoss/
     bossReward sont lus par useBackToClose & swipeBlocked plus bas. */
  const {
    boss: communityBoss, myDamage: bossMyDamage, contributorCount: bossContribCount,
    activity: bossActivity, attack: bossAttack, attacking: bossAttacking, cooldownLeftMs: bossCooldownMs,
  } = useCommunityBoss({ userCode, enabled: level >= BOSS_LEVEL_MIN });
  const [bossReward,   setBossReward]   = useState(null);
  const [bossPenalty,  setBossPenalty]  = useState(null);
  /* Boss "en cours" (annonce ou combat, statut serveur 'active') →
     on suspend les événements du jour tant qu'il n'est pas résolu. */
  /* « Boss en cours » = statut actif ET fenêtre pas encore expirée.
     Sans le check endsAt, un boss 'active' périmé (personne n'a porté le
     coup qui bascule en 'failed') laisserait la bannière traîner sur
     l'accueil. Couvre l'annonce (avant startsAt) ET le combat. */
  const bossOngoing = !!communityBoss && communityBoss.status === 'active' && Date.now() < (communityBoss.endsAt || 0);
  /* Overlay boss ouvert (= "on est dans l'onglet boss") → musique boss. */
  const bossOverlayOpen = !!communityBoss && (showBoss || !!bossReward || !!bossPenalty);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);
  const [showLevels,   setShowLevels]   = useState(false);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);
  /* Refund marché — modale d'excuses + compensation pour les ex-investisseurs.
     Set au moment du crédit (one-shot, gated par flag LS dans l'effect). */
  const [marketRefundAmount, setMarketRefundAmount] = useState(null);
  /* Récompense top 3 hebdo — modale festive avec compteur cafés animé. */
  const [weeklyChampReward, setWeeklyChampReward] = useState(null);  // { rank, cafes, weekNum }
  /* Sanction appliquée — popup d'avertissement post-débit. */
  const [sanctionApplied, setSanctionApplied] = useState(null);  // { amount, reason }
  /* Message de compte one-shot (v1.29) — sanction ou compensation suite
     a l exploit du Memory. Cf. data/accountNotices.js : la modale
     INFORME seulement, les corrections sont faites en SQL. */
  const [accountNotice, setAccountNotice] = useState(null);
  /* Popup post-achat Stripe — set au montant détecté par le re-pull. */
  const [paymentReceived, setPaymentReceived] = useState(null);
  /* Notice de la refonte économie café (mai 2026) — affichée 1 fois quand
     la migration cafesResetMay10 trigger pour expliquer le reset à 0. */
  const [showCafesResetNotice, setShowCafesResetNotice] = useState(false);
  const [boutiqueMode, setBoutiqueMode] = useState('shop'); // 'shop' | 'premium' | 'collection'
  const [cafeToast,    setCafeToast]    = useState(null);   // { amount, key } | null
  const cafeToastTimerRef = useRef(null);
  /* Popup festif "gain boosté" — déclenché par addCoins quand boost ×2
     ou doubler ont amplifié un gain mini-jeu. Auto-close 1.8 s, merge
     des pops successifs (fenêtre courte) pour éviter le spam. */
  const [boostGainPopup, setBoostGainPopup] = useState(null);
  const boostGainTimerRef = useRef(null);
  const pushBoostGain = useCallback((bonus, sources) => {
    if(!bonus || bonus <= 0) return;
    if(boostGainTimerRef.current) clearTimeout(boostGainTimerRef.current);
    setBoostGainPopup(prev => prev
      ? { bonus: prev.bonus + bonus, boost: prev.boost || sources.boost, doubler: prev.doubler || sources.doubler }
      : { bonus, boost: !!sources.boost, doubler: !!sources.doubler }
    );
    boostGainTimerRef.current = setTimeout(() => setBoostGainPopup(null), 1800);
  }, []);
  const pushBoostGainRef = useRef(pushBoostGain); pushBoostGainRef.current = pushBoostGain;

  /* Inbox (BRIEF_INBOX) — modale + compteur de non-lus.
     Compteur rafraîchi toutes les 30s tant qu'on a un userCode + Supabase actif. */
  const [showInbox,        setShowInbox]        = useState(false);
  const [showAbout,        setShowAbout]        = useState(false);
  /* Sentinelle — ecran admin (cf. lib/sentinelle.js). */
  /* null | 'console' | 'signalement'. Un booleen ne suffisait plus :
     un admin doit pouvoir ouvrir l'entonnoir des joueurs pour l'essayer,
     sans quoi on ne decouvre ses defauts que par un signalement rate. */
  const [vueSentinelle, setVueSentinelle] = useState(null);
  const [alertesSentinelle, setAlertesSentinelle] = useState(0);
  /* Signalements envoyes par les joueurs et pas encore traites. Le
     compteur est public en base (un entier, rien de plus), mais on ne
     le lit que pour un admin : un joueur n a rien a faire du nombre. */
  const [signalementsAttente, setSignalementsAttente] = useState(0);
  /* Notification "nouvelle version" : on garde en LS la dernière version
     vue par l'user. Au mount, si APP_INFO.version diffère → popup.
     Pour un fresh install, lastSeenVersion vaut '' → on calibre direct
     à la version courante SANS pop (le nouveau joueur n'a pas à voir
     un changelog d'ancien). Voir useEffect plus bas. */
  const [lastSeenVersion,  setLastSeenVersion]  = useLocalStorage('lastSeenVersion', '');
  const [showNewVersion,   setShowNewVersion]   = useState(false);
  /* Pastille NOUVEAU sur « À propos » — distincte de lastSeenVersion, qui
     est consommé par la NewVersionModal dès sa fermeture (donc éteint dans
     la quasi-totalité des cas). Celle-ci ne s'éteint que quand l'écran
     À propos est RÉELLEMENT ouvert, et se rallume à chaque nouvelle version.
     Volontairement absent de resetProgress() : c'est un marqueur de lecture,
     pas de la progression de jeu. */
  const [aboutSeenVersion, setAboutSeenVersion] = useLocalStorage('aboutSeenVersion', '');
  const aboutIsNew = aboutSeenVersion !== APP_INFO.version;
  const openAbout = () => {
    playSound('modal');
    setAboutSeenVersion(APP_INFO.version);
    setShowAbout(true);
  };
  /* Maintenance LIVE — pilotée par la table Supabase public.system_status
     via Realtime. Permet de basculer l'app en maintenance OU de pousser
     un popup "Mise à jour disponible" sans devoir redéployer.
     Voir MIGRATION_system_status.sql pour le schéma + les SQL de toggle. */
  const [systemStatus,           setSystemStatus]           = useState(DEFAULT_SYSTEM_STATUS);
  const [liveMaintenanceActive,  setLiveMaintenanceActive]  = useState(false);
  const [showMaintenanceWarning, setShowMaintenanceWarning] = useState(false);
  const [showForceUpdate,        setShowForceUpdate]        = useState(false);
  const [forceUpdateDismissed,   setForceUpdateDismissed]   = useState(false);
  /* Refs : initialFetchDone = a-t-on reçu la 1re réponse de
     getSystemStatus ? (avant ça, on n'a pas encore d'info fiable
     sur le state serveur — on n'agit pas).
     everSeenOff = a-t-on déjà vu maintenance_mode=false depuis
     le mount ? (sinon mode déjà actif à l'arrivée → MaintenanceScreen
     direct, pas de grace period 30s).
     handledOn = anti double-déclenchement quand Realtime renvoie
     plusieurs UPDATE rapprochés. */
  const initialFetchDoneRef  = useRef(false);
  const everSeenSystemOffRef = useRef(false);
  const handledSystemOnRef   = useRef(false);
  /* Restauration : null = fermé, 'fresh' = depuis onboarding (pas de
     warning), 'replace' = depuis settings (warning de remplacement). */
  const [restoreMode,      setRestoreMode]      = useState(null);
  /* Codes promo : tracking des codes déjà utilisés par ce compte
     pour éviter le double-usage. */
  const [showPromoCode,    setShowPromoCode]    = useState(false);
  const [promoCodesUsed,   setPromoCodesUsed]   = useLocalStorage('promoCodesUsed', []);
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);
  const { showToast } = useToast();
  /* Ref synchronisée → permet à addCoins (useCallback deps=[]) d'appeler
     le showToast courant sans avoir à se rebuilder à chaque render. */
  const showToastRef = useRef(showToast); showToastRef.current = showToast;
  /* Refs synchronisés sur userCode/cafes — utilisés par le re-pull
     différé après retour Stripe (les setTimeout closures voient sinon
     des valeurs stale). */
  const userCodeRef = useRef(); userCodeRef.current = userCode;
  const cafesRef    = useRef(); cafesRef.current    = cafes;

  /* Notifs amis au lancement (BRIEF_DEMANDES_AMIS) — file de notifs popées
     une à une. Détection au mount via getReceivedFriendRequests +
     getNewlyAcceptedFriends. Anti-spam : LS notifiedRequestIds garde les IDs
     déjà notifiés pour ne pas re-popper la même demande à chaque ouverture. */
  const [pendingFriendNotifs, setPendingFriendNotifs] = useState([]);

  /* Détection du retour Stripe Checkout au mount. Si l'URL contient
     ?cf_purchase=success, on affiche un toast et on déclenche un re-pull
     différé pour récupérer les cafés crédités côté serveur. Le webhook
     Stripe peut mettre 1-3s à update la DB → on retente plusieurs fois
     pour pas rater. On clean l'URL pour pas re-popper au refresh. */
  useEffect(() => {
    if(typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const purchase = params.get('cf_purchase');
    if(!purchase) return;
    if(purchase === 'success'){
      playSound('success');
      /* PAUSE l'upsert auto pendant 60 s — le temps que le webhook +
         re-pulls finalisent. Sinon le push client à 5s écraserait le
         crédit Stripe (race condition documentée). */
      setPauseUpsertUntil(Date.now() + 60_000);
      /* Re-pull à 3s, 8s, 15s pour rattraper le webhook qui peut être lent.
         Le 1er qui détecte un delta cafés > 0 ouvre la PaymentSuccessModal
         (popup festif). Les retries suivants ne font rien si l'écart est
         déjà rattrapé. */
      const codeAtMount = userCodeRef.current;
      const delays = [3000, 8000, 15000];
      const timers = delays.map(ms => setTimeout(async () => {
        if(!codeAtMount) return;
        const server = await pullProfile(codeAtMount);
        if(!server) return;
        const delta = Number(server.cafes) - (cafesRef.current ?? 0);
        if(delta > 0){
          setCafes(Number(server.cafes));
          setPaymentReceived(delta);
        }
      }, ms));
      /* Clean URL */
      const url = new URL(window.location.href);
      url.searchParams.delete('cf_purchase');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.toString());
      return () => timers.forEach(clearTimeout);
    } else if(purchase === 'cancel'){
      showToastRef.current?.('Paiement annulé');
      const url = new URL(window.location.href);
      url.searchParams.delete('cf_purchase');
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Profil public d'un autre joueur (BRIEF_PROFIL_VISIBLE).
     viewingProfile = { userCode, isCrown } | null. */
  const [viewingProfile, setViewingProfile] = useState(null);
  const openUserProfile = useCallback((code, isCrown = false) => {
    if(!code) return;
    setViewingProfile({ userCode: code, isCrown });
  }, []);

  /* Liste des codes amis (status='accepted') — sert à savoir si la
     ReactionBar doit s'afficher dans UserProfileModal (BRIEF_REACTIONS).
     Rafraîchie au mount + à chaque ouverture d'un profil public, pour
     refléter les amitiés acceptées dans la session courante. */
  const [friendCodes, setFriendCodes] = useState([]);

  /* File des badges secrets à afficher (BRIEF_BADGES_SECRETS).
     File FIFO : on dépile une modale à la fois. Permet de gérer le
     cas Admin qui déclenche les 3 d'un coup, ou un cas réel où 2
     conditions deviendraient vraies en même temps. */
  const [secretBadgeQueue, setSecretBadgeQueue] = useState([]);
  const secretBadgeReward = secretBadgeQueue[0] ?? null;

  /* Génère le leaderboard fictif au premier accès, après reset, ou si schéma obsolète */
  useEffect(()=>{
    const stale = !leaderboard
      || !Array.isArray(leaderboard)
      || leaderboard.length === 0
      || leaderboard[0].__schema !== LEADERBOARD_SCHEMA;
    if(stale) setLeaderboard(generateLeaderboard());
  },[leaderboard, setLeaderboard]);

  /* Concurrence : chaque jour, le bot top 1 (cookies) gagne +300.
     Pas le joueur — il n'est pas dans la liste des bots de toute façon.
     Cap à 30 jours pour éviter l'explosion si l'app est ouverte après une longue pause. */
  useEffect(()=>{
    if(!leaderboard || !Array.isArray(leaderboard) || leaderboard.length === 0) return;
    const today = new Date().toDateString();
    if(leaderboardLastBoost === today) return;

    let daysToBoost = 1;
    if(leaderboardLastBoost){
      const last = new Date(leaderboardLastBoost);
      const now  = new Date();
      last.setHours(0,0,0,0); now.setHours(0,0,0,0);
      const diff = Math.round((now - last) / (1000*60*60*24));
      daysToBoost = Math.max(1, Math.min(30, diff));
    }

    const next = leaderboard.map(p => ({ ...p }));
    for(let d=0; d<daysToBoost; d++){
      let topIdx = 0;
      let topVal = -Infinity;
      for(let i=0; i<next.length; i++){
        if(next[i].totalEarned > topVal){ topVal = next[i].totalEarned; topIdx = i; }
      }
      next[topIdx].totalEarned += 300;
    }
    setLeaderboard(next);
    setLeaderboardLastBoost(today);
  },[leaderboard, leaderboardLastBoost, setLeaderboard, setLeaderboardLastBoost]);

  /* Tick horaire : chaque bot gagne 1 à 10 cookies par heure, en faveur de ceux du bas.
     Le rang est recalculé à chaque heure → effet de rattrapage (les derniers grimpent plus vite).
     Pas le joueur. Capé à 48h. Vérifié au mount + chaque minute. */
  useEffect(()=>{
    if(!leaderboard || !Array.isArray(leaderboard) || leaderboard.length === 0) return;
    const HOUR = 3600 * 1000;
    const tick = () => {
      const now = Date.now();
      const last = leaderboardLastHourly || 0;
      if(!last){ setLeaderboardLastHourly(now); return; }
      const hoursElapsed = Math.floor((now - last) / HOUR);
      if(hoursElapsed <= 0) return;
      const hoursToApply = Math.min(48, hoursElapsed);
      const next = leaderboard.map(p => ({ ...p }));
      for(let h=0; h<hoursToApply; h++){
        /* Tri à chaque heure → rang dynamique */
        const sorted = [...next].sort((a,b) => b.totalEarned - a.totalEarned);
        const total = sorted.length;
        sorted.forEach((p, rank) => {
          /* ratio 0 (top) → 1 (dernier). Plus tu es bas, plus le max est élevé. */
          const ratio = total > 1 ? (total - 1 - rank) / (total - 1) : 0;
          const max = 1 + Math.round(ratio * 9); // 1 (top) à 10 (dernier)
          p.totalEarned += Math.floor(Math.random() * max) + 1;
        });
      }
      setLeaderboard(next);
      setLeaderboardLastHourly(last + hoursToApply * HOUR);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  },[leaderboard, leaderboardLastHourly, setLeaderboard, setLeaderboardLastHourly]);

  const addCafes = useCallback((amount) => {
    if(!amount || amount <= 0) return;
    setCafes(c => c + amount);
    setCafeToast({ amount, key: Date.now() });
    if(cafeToastTimerRef.current) clearTimeout(cafeToastTimerRef.current);
    cafeToastTimerRef.current = setTimeout(()=>setCafeToast(null), 2200);
  },[]);
  const [showOnboarding, setShowOnboarding] = useState(!userName);

  /* Hook PWA : exposé aux paramètres pour le bouton "Installer" */
  const installPrompt = useInstallPrompt();

  /* Notification "nouvelle version" : si lastSeenVersion ≠ APP_INFO.version
     → on déclenche la modale. Cas particuliers :
       - Fresh install (lastSeenVersion === '') : pas de pop, on calibre
         direct à la version courante (le nouveau joueur n'a rien à voir).
       - Pas pendant l'onboarding (un nouveau joueur ne doit pas être
         interrompu) — on attend que showOnboarding soit false ET que
         userName soit défini.
     Une fois affichée, la modale set lastSeenVersion à la fermeture
     (que ce soit "Voir tout" ou "Plus tard"). */
  useEffect(() => {
    if(showOnboarding || !userName) return;
    if(!lastSeenVersion){
      /* Fresh install : on calibre sans pop. */
      setLastSeenVersion(APP_INFO.version);
      return;
    }
    if(lastSeenVersion !== APP_INFO.version){
      setShowNewVersion(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOnboarding, userName]);

  /* ── Tracker temps total passé dans l'app ──────────────────────
     Incrémente totalPlayTime de 1 toutes les 1 s tant que l'onglet
     est visible. Pause auto via Page Visibility API (économie batterie
     + métriques réalistes — on ne compte pas le temps en arrière-plan).
     On vise un seul interval sur toute la vie de l'app. */
  useEffect(() => {
    let intervalId = null;

    const tick = () => {
      if(document.visibilityState !== 'visible') return;
      setTotalPlayTime(t => (Number(t) || 0) + 1);
    };

    const start = () => {
      if(intervalId) return;
      intervalId = setInterval(tick, 1000);
    };
    const stop = () => {
      if(!intervalId) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const onVis = () => {
      if(document.visibilityState === 'visible') start();
      else stop();
    };

    /* Démarre si la page est visible au mount */
    if(document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVis);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Sync dédié de total_play_time ────────────────────────────
     L'upsert général est debouncé 5 s ET ses deps incluaient autrefois
     totalPlayTime (qui change toutes les secondes) → le timeout était
     toujours reset, donc le serveur ne recevait JAMAIS le temps tant
     que le joueur jouait. Bug observé : autre device ou cache vidé
     = compteur à 0 alors que la valeur locale était bonne.
     Fix : push ciblé `total_play_time` toutes les 30 s + flush
     immédiat quand l'onglet devient caché ou se ferme. Best-effort
     (sendBeacon non utilisé : Supabase n'expose pas d'API compatible,
     mais le push 30 s limite la perte à <30 s par fermeture). */
  useEffect(() => {
    if(!isSupabaseEnabled() || !userCode || !pullDone) return;
    let intervalId = null;
    let lastPushed = -1;

    const flush = () => {
      const v = Number(totalPlayTimeRef.current) || 0;
      if(v === lastPushed) return;          /* rien à pousser */
      lastPushed = v;
      syncDailyCounters(userCode, { total_play_time: v });
    };

    intervalId = setInterval(flush, 30000);
    const onVis = () => { if(document.visibilityState === 'hidden') flush(); };
    const onHide = () => flush();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
      flush();                              /* dernier push à l'unmount */
    };
  }, [userCode, pullDone]);

  /* Maintenance LIVE — fetch initial + subscription Realtime à la table
     public.system_status. Au moindre changement (UPDATE SQL côté admin),
     les clients ouverts reçoivent le nouvel état en <1s.

     S'exécute une seule fois au mount (deps=[]). Les bypass userCodes
     (cf. MAINTENANCE_BYPASS_USERCODES dans data/maintenance.js) court-
     circuitent toute la logique → Cookithan voit l'app normalement même
     en maintenance live. */
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    getSystemStatus().then(status => {
      if(cancelled) return;
      initialFetchDoneRef.current = true;
      setSystemStatus(status);
    });

    unsubscribe = subscribeSystemStatus(status => {
      if(cancelled) return;
      initialFetchDoneRef.current = true;
      setSystemStatus(status);
    });

    return () => { cancelled = true; unsubscribe(); };
  }, []);

  /* Réaction aux changements de system_status :
       - maintenance_mode = true & on avait vu false depuis le mount
         → grace period 30s via MaintenanceWarningModal puis screen plein
       - maintenance_mode = true & on ne l'a JAMAIS vu false depuis mount
         (= activée avant l'arrivée du joueur) → écran plein direct
       - maintenance_mode = false → clear screen + warning
       - force_version > APP_INFO.version → popup "Mise à jour dispo" */
  useEffect(() => {
    /* On attend que le 1er fetch soit revenu — sinon le state initial
       (DEFAULT_SYSTEM_STATUS.maintenance_mode = false) ferait croire à
       une transition off→on si le serveur renvoie true, et on tomberait
       sur le warning 30s au lieu de l'écran plein direct. */
    if(!initialFetchDoneRef.current) return;
    if(isBypassedFromMaintenance(userCode)){
      setLiveMaintenanceActive(false);
      setShowMaintenanceWarning(false);
      return;
    }
    if(systemStatus.maintenance_mode){
      if(handledSystemOnRef.current) return;
      handledSystemOnRef.current = true;
      if(everSeenSystemOffRef.current){
        setShowMaintenanceWarning(true);
      }else{
        setLiveMaintenanceActive(true);
      }
    }else{
      everSeenSystemOffRef.current = true;
      handledSystemOnRef.current = false;
      setLiveMaintenanceActive(false);
      setShowMaintenanceWarning(false);
    }
  }, [systemStatus.maintenance_mode, userCode]);

  /* force_version : popup "Mise à jour disponible" + reload.

     ⚠️ CORRIGÉ le 09/09/2026. La condition était `fv !== APP_INFO.version`
     — une inégalité, alors que le commentaire d'origine et celui de
     ForceUpdateModal annonçaient tous deux « force_version > version ».

     Conséquence : un drapeau laissé sur une version ANCIENNE proposait
     aux joueurs déjà à jour de redescendre, en boucle et sans moyen de
     s'en débarrasser. Le drapeau valait « 1.30.1 » en base ce jour-là ;
     il n'a pas mordu uniquement parce que l'app déployée portait le même
     numéro. Au premier changement de version, tout le monde y passait.

     La comparaison est désormais numérique segment par segment : en
     texte, '1.30.2' serait jugé supérieur à '1.30.10'. */
  useEffect(() => {
    const fv = systemStatus.force_version;
    if(fv && versionPlusRecente(fv, APP_INFO.version) && !forceUpdateDismissed){
      setShowForceUpdate(true);
    }else{
      setShowForceUpdate(false);
    }
  }, [systemStatus.force_version, forceUpdateDismissed]);

  /* Bouton retour Android : ferme l'overlay courant au lieu de quitter
     l'app. Pas appliqué à : showOnboarding, tutorialStep, pendingLvUp,
     pendingAchievement (l'utilisateur DOIT les voir / interagir). */
  useBackToClose(!!gameView,        () => setGameView(null));
  useBackToClose(!!matchmaking,     () => { matchmakingRef.current=null; setMatchmaking(null); });
  useBackToClose(showStakeModal,    () => setShowStakeModal(false));
  useBackToClose(!!duelHandoff,     () => { setDuelHandoff(null); duelSessionRef.current=null; setGameView(null); setDuelSession(null); });
  useBackToClose(!!duelResult,      () => setDuelResult(null));
  useBackToClose(showSettings,      () => setShowSettings(false));
  useBackToClose(showProfile,       () => setShowProfile(false));
  useBackToClose(showAllAchievements, () => setShowAllAchievements(false));
  useBackToClose(!!accountNotice,   () => setAccountNotice(null));
  useBackToClose(showLevels,        () => setShowLevels(false));
  useBackToClose(showSkipConfirm,   () => setShowSkipConfirm(false));
  useBackToClose(showEventModal,    () => setShowEventModal(false));
  useBackToClose(!!eventReward,     () => setEventReward(null));
  useBackToClose(showInbox,         () => setShowInbox(false));
  useBackToClose(showAbout,         () => setShowAbout(false));
  useBackToClose(showNewVersion,    () => { setShowNewVersion(false); setLastSeenVersion(APP_INFO.version); });
  useBackToClose(pendingFriendNotifs.length > 0, () => setPendingFriendNotifs(n => n.slice(1)));
  useBackToClose(!!viewingProfile,  () => setViewingProfile(null));
  useBackToClose(!!secretBadgeReward, () => setSecretBadgeQueue(q => q.slice(1)));
  useBackToClose(!!accountNotice,   () => setAccountNotice(null));
  useBackToClose(showBoss || !!bossReward || !!bossPenalty, () => { setShowBoss(false); setBossReward(null); setBossPenalty(null); });

  /* Refresh inbox unread count : initial + toutes les 30s tant que userCode dispo.
     Ne tape Supabase que si activé ; sinon le compteur reste à 0. */
  useEffect(() => {
    if(!userCode || !isSupabaseEnabled()) { setUnreadInboxCount(0); return; }
    let alive = true;
    const refresh = async () => {
      const c = await getUnreadInboxCount(userCode);
      if(alive) setUnreadInboxCount(c);
    };
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, [userCode]);

  /* Refresh friendCodes : au mount + à chaque ouverture de la modale
     UserProfile (pour que les nouveaux amis acceptés dans la session
     soient bien reconnus → ReactionBar visible). */
  useEffect(() => {
    if(!userCode || !isSupabaseEnabled()){ setFriendCodes([]); return; }
    let alive = true;
    (async () => {
      const list = await getFriends(userCode);
      if(alive) setFriendCodes(list.map(f => f.user_code));
    })();
    return () => { alive = false; };
  }, [userCode, viewingProfile]);

  /* Détection au lancement : demandes reçues pending + amitiés
     fraîchement acceptées. Empile les notifs trouvées dans une file ;
     elles s'affichent une par une via FriendNotificationModal.

     Anti-spam :
       - notifiedRequestIds (LS) : IDs des demandes déjà signalées,
         pour qu'une demande pending ne re-popmodale à chaque mount.
       - knownFriendCodes (LS)   : codes amis déjà connus localement ;
         tout nouveau code → notif "X t'a accepté". Mis à jour APRÈS
         détection pour ne plus la repopulariser.

     Cross-device (applyPatchOnce friendNotifsBootstrap_v1) : sur un nouveau
     device, les caches LS sont vides → tous les amis acceptés et toutes
     les demandes pending réapparaîtraient en notif. Si le patch a déjà
     été marqué côté Supabase (autre device a déjà vu les notifs), on
     initialise les caches LS silently sans rien afficher.

     Tourne 1 fois quand userCode + showOnboarding=false (sinon la
     modale onboarding cache la nôtre). */
  useEffect(() => {
    if(!userCode || !isSupabaseEnabled()) return;
    if(showOnboarding) return;
    let alive = true;

    (async () => {
      const received = await getReceivedFriendRequests(userCode);

      let knownCodes = [];
      try { knownCodes = JSON.parse(window.localStorage.getItem('cookiminer:knownFriendCodes') || '[]'); }
      catch { knownCodes = []; }

      let notifiedIds = [];
      try { notifiedIds = JSON.parse(window.localStorage.getItem('cookiminer:notifiedRequestIds') || '[]'); }
      catch { notifiedIds = []; }

      /* Bootstrap cross-device : caches LS vides ET patch déjà appliqué
         sur un autre device → init silently, pas de notif (l'user a déjà
         vu les acceptations/demandes ailleurs). */
      const isFreshOnThisDevice = knownCodes.length === 0 && notifiedIds.length === 0;
      let bootstrapAlready = false;
      if(isFreshOnThisDevice){
        bootstrapAlready = await isPatchApplied(userCode, 'friendNotifsBootstrap_v1');
      }
      if(!alive) return;

      if(bootstrapAlready){
        try {
          const ids = received.map(r => r.request_id);
          window.localStorage.setItem('cookiminer:notifiedRequestIds', JSON.stringify(ids));
        } catch {}
        try {
          const allFriends = await getFriends(userCode);
          if(alive){
            window.localStorage.setItem(
              'cookiminer:knownFriendCodes',
              JSON.stringify(allFriends.map(f => f.user_code)),
            );
          }
        } catch {}
        return;
      }

      const newRequests = received.filter(r => !notifiedIds.includes(r.request_id));
      const newlyAccepted = await getNewlyAcceptedFriends(userCode, knownCodes);
      if(!alive) return;

      const queue = [];
      if(newRequests.length > 0){
        queue.push({
          type:'received',
          count: newRequests.length,
          firstName: newRequests[0].user_name || 'Quelqu\'un',
        });
      }
      newlyAccepted.forEach(f => {
        queue.push({ type:'accepted', friendName: f.user_name || 'Un ami' });
      });

      /* Met à jour les caches LS APRÈS détection pour éviter la re-notif.
         Pour notifiedRequestIds : on garde les IDs reçus aujourd'hui (pas
         tous les anciens — la table inbox conserve l'historique). */
      try {
        const ids = received.map(r => r.request_id);
        window.localStorage.setItem('cookiminer:notifiedRequestIds', JSON.stringify(ids));
      } catch {}
      try {
        const allFriends = await getFriends(userCode);
        if(alive){
          window.localStorage.setItem(
            'cookiminer:knownFriendCodes',
            JSON.stringify(allFriends.map(f => f.user_code)),
          );
        }
      } catch {}

      /* Marque le bootstrap côté Supabase : tout autre device qui se
         connecte ensuite verra ce flag et n'affichera plus les anciennes
         notifs. */
      markPatchApplied(userCode, 'friendNotifsBootstrap_v1').catch(()=>{});

      if(alive && queue.length > 0) setPendingFriendNotifs(queue);
    })();

    return () => { alive = false; };
  }, [userCode, showOnboarding]);

  /* Swipe horizontal pour changer d'onglet — désactivé tant qu'un
     overlay/modal/jeu/tuto est ouvert, pour éviter les conflits.
     `slideDir` mémorise la direction du dernier changement pour
     animer le content entrant (depuis la droite ou la gauche). */
  /* Classement en 3e position : avec 6 onglets de largeur égale aucun ne
     tombe à 50 % (les centres sont à 8/25/42/58/75/92 %). Cookithan préfère
     Classement juste AVANT le milieu (42 %) plutôt qu'après (58 %). */
  const TAB_ORDER = ['accueil','jeux','classement','collection','marche','boutique'];
  const [slideDir, setSlideDir] = useState(null); // 'next' | 'prev' | null

  const goToTab = (target, source = 'click') => {
    const i = TAB_ORDER.indexOf(tab);
    const j = TAB_ORDER.indexOf(target);
    if(j === -1 || j === i) { setTab(target); return; }
    /* Son distinct selon l'origine : 'swipe' = whoosh confirm, 'tab' = clic */
    playSound(source === 'swipe' ? 'swipe' : 'tab');
    /* Tap haptique léger pour confirmer le changement (8ms — discret). */
    haptic('light');
    /* Slide-in CSS uniquement sur clic nav (le swipe gère sa propre
       continuité visuelle via l'animation du wrapper dans useSwipe). */
    if(source === 'swipe'){
      setSlideDir(null);
    } else {
      setSlideDir(j > i ? 'next' : 'prev');
    }
    setTab(target);
  };

  const swipeBlocked = !!(gameView || showSettings || showProfile || showAllAchievements || showLevels || showOnboarding || showSkipConfirm || showEventModal || eventReward || showInbox || showAbout || showNewVersion || viewingProfile || secretBadgeReward || pendingFriendNotifs.length > 0 || tutorialStep > 0 || pendingLvUp || pendingAchievements.length > 0 || showBoss || bossReward || bossPenalty || matchmaking || duelResult || showStakeModal || duelHandoff);
  const swipe = useSwipe({
    enabled: !swipeBlocked,
    onLeft:  () => {
      const i = TAB_ORDER.indexOf(tab);
      if(i >= 0 && i < TAB_ORDER.length - 1) goToTab(TAB_ORDER[i + 1], 'swipe');
    },
    onRight: () => {
      const i = TAB_ORDER.indexOf(tab);
      if(i > 0) goToTab(TAB_ORDER[i - 1], 'swipe');
    },
  });

  /* ── TUTORIEL : démarrage / wires ─────────────── */

  /* Démarre le tuto au 1er lancement (après l'onboarding nom+avatar).
     Si l'utilisateur a déjà joué (totalEarned > 0) sans voir le tuto,
     on le marque comme complété pour ne pas l'embêter rétroactivement. */
  useEffect(()=>{
    if(showOnboarding) return;
    if(tutorialStep > 0) return;
    let completed = false;
    try{ completed = window.localStorage.getItem('cookiminer:tutorialCompleted') === '1'; }catch{}
    if(completed) return;
    if(totalEarned > 0){
      try{ window.localStorage.setItem('cookiminer:tutorialCompleted', '1'); }catch{}
      return;
    }
    setTutorialStep(1);
  }, [showOnboarding, totalEarned, tutorialStep]);

  /* Bulles contextuelles : 1re ouverture des jeux et onglets concernés.
     Bloqué tant que le tuto principal est actif (priorité). */
  useEffect(()=>{
    if(tutorialStep > 0) return;
    if(!gameView) return;
    const map = { quiz:'first-quiz', spin:'first-spin', click:'first-click', pour:'first-stop-cafe' };
    const id = map[gameView];
    if(!id || !CONTEXT_HINTS[id]) return;
    if(seenHints.includes(id)) return;
    setActiveHint(CONTEXT_HINTS[id]);
    setSeenHints(s => s.includes(id) ? s : [...s, id]);
  }, [gameView, tutorialStep, seenHints, setSeenHints]);

  useEffect(()=>{
    if(tutorialStep > 0) return;
    const map = { marche:'first-marche', boutique:'first-boutique' };
    const id = map[tab];
    if(!id || !CONTEXT_HINTS[id]) return;
    if(seenHints.includes(id)) return;
    setActiveHint(CONTEXT_HINTS[id]);
    setSeenHints(s => s.includes(id) ? s : [...s, id]);
  }, [tab, tutorialStep, seenHints, setSeenHints]);

  /* Avance d'une étape du tuto (ou termine si dernière). Chaque étape
     navigue auto vers son tab (cf. TUTORIAL_STEPS.goToTab). En fin de
     tuto on rentre à l'accueil pour démarrer propre. */
  const tutorialNext = () => {
    setTutorialStep(s => {
      const next = s + 1;
      if(next > TUTORIAL_STEPS.length){
        try{ window.localStorage.setItem('cookiminer:tutorialCompleted', '1'); }catch{}
        setTab('accueil');
        return 0;
      }
      return next;
    });
  };

  const tutorialConfirmSkip = () => {
    setShowSkipConfirm(false);
    setTutorialStep(0);
    setTab('accueil');
    try{ window.localStorage.setItem('cookiminer:tutorialCompleted', '1'); }catch{}
  };

  /* Relance manuelle du tuto depuis les paramètres. Ferme tout overlay
     pour que le spotlight ne soit pas masqué, recale sur l'accueil, puis
     démarre à l'étape 1. On ne touche PAS au LS `tutorialCompleted` :
     setTutorialStep(1) bypass directement le useEffect d'auto-start. */
  const restartTutorial = () => {
    setShowSettings(false);
    setShowProfile(false);
    setShowLevels(false);
    setShowAbout(false);
    setShowInbox(false);
    setTab('accueil');
    setTutorialStep(1);
  };

  const lvRef = useRef(level); lvRef.current = level;
  const xpRef = useRef(xp);    xpRef.current = xp;

  const themePalette = activeTheme && THEMES[activeTheme] ? THEMES[activeTheme] : null;
  const inBoutiquePremium = tab === 'boutique' && boutiqueMode === 'premium';
  /* Aperçu Cosmos plus foncé, appliqué temporairement quand on est sur l'onglet Premium */
  const C        = inBoutiquePremium ? PREMIUM_PALETTE : (themePalette ? themePalette : ((dark && unlocked.includes('theme_espresso')) ? DK : LT));
  const isDark   = inBoutiquePremium ? true : (themePalette ? !!themePalette.dark : (dark && unlocked.includes('theme_espresso')));
  const themeSparkles = inBoutiquePremium || (themePalette && themePalette.sparkles);

  /* Quand on quitte l'onglet boutique, reset auto le mode */
  useEffect(()=>{
    if(tab !== 'boutique' && boutiqueMode !== 'shop') setBoutiqueMode('shop');
  },[tab, boutiqueMode]);

  /* Tick 10 s pour rafraîchir le countdown du Boost ×2 (lecture Date.now()
     dans le rendu, ce useState force un re-render). Léger, sans impact perf. */
  const [, setBoostTick] = useState(0);
  useEffect(()=>{
    if(!boostUntil || boostUntil <= Date.now()) return;
    const id = setInterval(() => setBoostTick(t => t + 1), 10_000);
    return () => clearInterval(id);
  }, [boostUntil]);

  /* Thème Noir & Blanc : désature globalement tout en posant une classe
     sur <body>. Plus efficace que d'overrider chaque GOLD/ESPRESSO ; vise
     aussi les overlays fixed qui se rendent hors du wrapper React. Reset
     propre quand on quitte le thème ou au unmount. */
  useEffect(()=>{
    const on = activeTheme === 'theme_noir';
    document.body.classList.toggle('theme-noir-on', on);
    return ()=>{ document.body.classList.remove('theme-noir-on'); };
  },[activeTheme]);
  const xpReq    = xpRequired(level);
  const xpPct    = Math.min((xp/xpReq)*100, 100);
  const canCheckin = lastCheckin !== new Date().toDateString();
  /* lastQuiz est désormais un timestamp ; on tolère l'ancien format string (legacy) en l'ignorant */
  const lastQuizMs = typeof lastQuiz === 'number' ? lastQuiz : 0;
  const quizMsLeft = Math.max(0, QUIZ_COOLDOWN_MS - (Date.now() - lastQuizMs));
  const canQuiz    = quizMsLeft === 0;

  /* Cap quotidien de spins ABSOLU (50 niv 1-9, 20 dès niv 10) — même
     les Jetons VIP n'élèvent pas le plafond. À l'achat d'un jeton on
     déduit `amount` du compteur utilisé (capé à 0), donc l'user
     "récupère" jusqu'à amount tours mais ne peut jamais dépasser le cap. */
  const todayStr   = new Date().toDateString();
  const spinsCap   = level <= 9 ? 50 : 20;
  const isFreshDay = spinsDate !== todayStr;
  /* Clamp à spinsCap : si spinsToday était saved sous un cap supérieur
     (ex: niv 1-9 cap 50, puis niv 10 cap 20 hérité avec value 50), on
     plafonne pour éviter un compteur "fantôme" qui empêcherait l'achat
     d'avoir un effet. */
  const effUsed    = isFreshDay ? 0 : Math.min(spinsToday || 0, spinsCap);
  const spinsLeft  = Math.max(0, spinsCap - effUsed);
  const consumeSpin = useCallback(() => {
    const t = new Date().toDateString();
    if(spinsDate !== t){
      setSpinsDate(t);
      setSpinsToday(1);
      syncDailyCounters(userCode, { spins_today: 1, spins_date: t });
    } else {
      setSpinsToday(n => {
        const next = (n || 0) + 1;
        syncDailyCounters(userCode, { spins_today: next, spins_date: t });
        return next;
      });
    }
  }, [spinsDate, setSpinsDate, setSpinsToday, userCode]);
  const addSpinPass = useCallback((amount) => {
    /* Cap absolu : on déduit du compteur utilisé sans aller en dessous
       de 0, donc l'user ne dépasse jamais spinsCap (et perd l'excédent
       du jeton s'il l'achète sans avoir consommé assez).
       On clamp spinsToday au cap COURANT avant déduction — sinon une
       transition de cap (50 niv 1-9 → 20 niv 10+) avec spinsToday=50
       saved garderait spinsLeft à 0 même après achat (50-20=30 > 20). */
    const t = new Date().toDateString();
    if(spinsDate !== t){
      setSpinsDate(t);
      setSpinsToday(0);   // new day, jeton inutile car déjà à 0
    } else {
      setSpinsToday(n => Math.max(0, Math.min(n || 0, spinsCap) - amount));
    }
  }, [spinsDate, setSpinsDate, setSpinsToday, spinsCap]);

  /* Pendant slot machine — analog des spins. Cap absolu 50, reset à minuit. */
  const slotGamesCap   = 50;
  const isFreshSlotDay = slotGamesDate !== todayStr;
  const slotEffUsed    = isFreshSlotDay ? 0 : (slotGamesToday || 0);
  const slotPlaysLeft  = Math.max(0, slotGamesCap - slotEffUsed);
  const consumeSlotGame = useCallback(() => {
    const t = new Date().toDateString();
    /* Push immédiat cross-device (anti-cheat — sinon le 5s debounce
       laisse une fenêtre où l'autre device pourrait re-jouer). */
    if(slotGamesDate !== t){
      setSlotGamesDate(t);
      setSlotGamesToday(1);
      syncDailyCounters(userCode, { slot_games_today: 1, slot_games_date: t });
    } else {
      setSlotGamesToday(n => {
        const next = (n || 0) + 1;
        syncDailyCounters(userCode, { slot_games_today: next, slot_games_date: t });
        return next;
      });
    }
  }, [slotGamesDate, setSlotGamesDate, setSlotGamesToday, userCode]);
  const addSlotPass = useCallback((amount) => {
    const t = new Date().toDateString();
    if(slotGamesDate !== t){
      setSlotGamesDate(t);
      setSlotGamesToday(0);
    } else {
      /* Idem spin : clamp au cap pour que l'achat soit toujours efficace. */
      setSlotGamesToday(n => Math.max(0, Math.min(n || 0, slotGamesCap) - amount));
    }
  }, [slotGamesDate, setSlotGamesDate, setSlotGamesToday, slotGamesCap]);

  /* Pile de Tasses — cap 50/jour, reset minuit, recharge in-game 2 ☕. */
  const pyramidGamesCap   = 100;
  const pyramidRechargeCost = 1;     // ☕ pour reset à 0 (= +100 essais)
  const isFreshPyramidDay = pyramidGamesDate !== todayStr;
  const pyramidEffUsed    = isFreshPyramidDay ? 0 : (pyramidGamesToday || 0);
  const pyramidPlaysLeft  = Math.max(0, pyramidGamesCap - pyramidEffUsed);
  const consumePyramidGame = useCallback(() => {
    const t = new Date().toDateString();
    if(pyramidGamesDate !== t){
      setPyramidGamesDate(t);
      setPyramidGamesToday(1);
    } else {
      setPyramidGamesToday(n => (n || 0) + 1);
    }
  }, [pyramidGamesDate, setPyramidGamesDate, setPyramidGamesToday]);
  /* Recharge in-game : 1 ☕ → reset compteur à 0 = full essais.
     Gratuite si free_recharges_24h actif (freeRechargesUntil > now).
     Retourne true si OK, false si pas assez de cafés ou pas besoin
     (encore des essais dispo). */
  const rechargePyramid = useCallback(() => {
    if(pyramidPlaysLeft > 0) return false;        /* pas besoin */
    const isFree = freeRechargesUntil && Date.now() < freeRechargesUntil;
    if(!isFree && cafes < pyramidRechargeCost) return false; /* pas assez */
    if(!isFree) setCafes(c => c - pyramidRechargeCost);
    const t = new Date().toDateString();
    setPyramidGamesDate(t);
    setPyramidGamesToday(0);
    playSound('success');
    return true;
  }, [pyramidPlaysLeft, cafes, pyramidRechargeCost, freeRechargesUntil, setCafes, setPyramidGamesDate, setPyramidGamesToday]);

  /* Recharge in-game pour la Roue (spin) — 1 ☕ → reset compteur à 0.
     Gratuite si free_recharges_24h actif. */
  const spinRechargeCost = 1;
  const rechargeSpin = useCallback(() => {
    if(spinsLeft > 0) return false;
    const isFree = freeRechargesUntil && Date.now() < freeRechargesUntil;
    if(!isFree && cafes < spinRechargeCost) return false;
    if(!isFree) setCafes(c => c - spinRechargeCost);
    const t = new Date().toDateString();
    setSpinsDate(t);
    setSpinsToday(0);
    playSound('success');
    return true;
  }, [spinsLeft, cafes, spinRechargeCost, freeRechargesUntil, setCafes, setSpinsDate, setSpinsToday]);

  /* Recharge in-game pour la Machine à Sous — 1 ☕ → reset à 0.
     Gratuite si free_recharges_24h actif. */
  const slotRechargeCost = 1;
  const rechargeSlot = useCallback(() => {
    if(slotPlaysLeft > 0) return false;
    const isFree = freeRechargesUntil && Date.now() < freeRechargesUntil;
    if(!isFree && cafes < slotRechargeCost) return false;
    if(!isFree) setCafes(c => c - slotRechargeCost);
    const t = new Date().toDateString();
    setSlotGamesDate(t);
    setSlotGamesToday(0);
    playSound('success');
    return true;
  }, [slotPlaysLeft, cafes, slotRechargeCost, freeRechargesUntil, setCafes, setSlotGamesDate, setSlotGamesToday]);

  const badges     = REWARDS.filter(r=>r.type==='Badge' && unlocked.includes(r.id));

  /* actions */
  /* `amount`     : delta appliqué aux coins (peut être négatif → perte)
     `gainAmount` : delta compté comme "vrai gain" (XP + totalEarned).
                    Par défaut = amount. Sert pour la vente $CKM : on
                    récupère proceeds en coins mais on ne progresse
                    qu'à hauteur de la plus-value (pnl). */
  const addCoins = useCallback((amount, gainAmount = amount, opts = {})=>{
    /* Multiplicateurs cumulés sur gains positifs uniquement :
       - Prestige     : +10 % par niveau (permanent)
       - Boost ×2 1h  : ×2 si boostUntil > now
       - Doubler      : ×2 sur le prochain gain (one-shot, auto-clear)
       Pertes (amount<=0) inchangées.
       opts.noMult : bypass TOTAL des multiplicateurs (et de la conso du
       doubler). Utilisé par la VENTE $CKM — on récupère un capital investi,
       pas un gain de jeu : le multiplier ne doit pas s'appliquer au principal
       (sinon revendre pendant un boost crée des cookies sur son capital). */
    if(amount > 0 && !opts.noMult){
      const baseAmount   = amount;
      const prestigeMult = 1 + (prestigeLevel || 0) * 0.1;
      const boostActive  = boostUntil && Date.now() < boostUntil;
      /* Boost passé de ×2 à ×1.3 (mai 2026) pour rendre le jeu moins
         pay-to-win en vue de la validation Play Store. Effet beaucoup
         plus modéré, plus fair pour les joueurs free. */
      const boostMult    = boostActive ? 1.3 : 1;
      const doublerMult  = nextGameDoubler ? 2 : 1;
      const totalMult    = prestigeMult * boostMult * doublerMult;
      if(totalMult !== 1){
        amount     = Math.round(amount * totalMult);
        gainAmount = Math.round(gainAmount * totalMult);
      }
      /* Popup "gain boosté" : delta dû à boost+doubler (hors prestige
         qui est always-on, sinon ça popperait sur tous les gains). */
      if(boostMult > 1 || doublerMult > 1){
        const withoutBoost = Math.round(baseAmount * prestigeMult);
        const bonusFromBoost = amount - withoutBoost;
        if(bonusFromBoost > 0){
          pushBoostGainRef.current(bonusFromBoost, { boost: boostMult > 1, doubler: doublerMult > 1 });
        }
      }
      if(nextGameDoubler) setNextGameDoubler(false);
    }
    if(amount<=0){ setCoins(c=>Math.max(0,c+amount)); return; }
    setCoins(c=>c+amount);

    /* Si on n'est pas sur un "vrai gain", on n'avance pas XP/totalEarned */
    let xpDelta = Math.max(0, gainAmount);
    if(xpDelta <= 0) return;

    /* Multiplicateur XP par palier :
       - niv 1-9 : x1.0 (normal, plus de bonus passif niv 9)
       - niv 10+ : malus -20 % (x0.8) — étire la progression en endgame.
         Affecte aussi le compteur du niv 15 (1000 XP = +1 ☕ devient
         ~1250 cookies bruts pour 1 ☕). */
    if(lvRef.current >= 10){
      xpDelta = Math.round(xpDelta * 0.8);
    }

    /* Cap anti-écart top 1 (cf. checkLeaderGap) : si je suis le leader
       et que mon totalEarned atteint top2 × 1.20, les nouveaux gains
       sont plafonnés ici — coins/XP/niveau continuent normalement,
       seul le classement est figé. Ref pour éviter stale closure. */
    setTotalEarned(t => Math.min(totalEarnedCapRef.current, t + xpDelta));

    /* Compteur hebdomadaire — auto-reset à 0 si on est passé sur une
       nouvelle semaine (vendredi 18 h UTC). Lecture via ref pour ne
       pas être affecté par le closure stale de useCallback. */
    const currentWeekId = getCurrentWeekId();
    if(weeklyWeekIdRef.current !== currentWeekId){
      setWeeklyEarned(xpDelta);
      setWeeklyWeekId(currentWeekId);
      weeklyWeekIdRef.current = currentWeekId;
    } else {
      setWeeklyEarned(w => (w || 0) + xpDelta);
    }

    const lv  = lvRef.current;
    const cur = xpRef.current;

    /* Endgame : niveau 25 = palier final. XP accumule de 0 à 60000
       (cap), pas de café loop, pas de level-up vers 26 — le prestige
       prend le relais une fois les 60000 XP atteints. */
    const ENDGAME_XP_CAP = 60000;   // = xpRequired(25)
    if(lv === 25){
      const newXp = Math.min(cur + xpDelta, ENDGAME_XP_CAP);
      setXp(newXp); xpRef.current = newXp;
      return;
    }

    /* Sous le seuil → pas de level up, XP avance normalement */
    if(cur+xpDelta < xpRequired(lv)){
      const next = cur+xpDelta;
      setXp(next); xpRef.current = next;
      return;
    }

    /* Sinon, exactement UN niveau gagné. L'XP excédentaire est perdue
       (cap volontaire pour éviter les sauts type +200 → 2 niveaux d'un coup).
       À partir du niveau 6 (palier "end-game"), le bonus de level-up
       est versé en cafés (1 ☕) au lieu de cookies. La modale LevelUpModal
       affiche le bonus correspondant — code unique côté addCoins. */
    const nl = lv+1;
    setLevel(nl);   lvRef.current = nl;
    setXp(0);       xpRef.current = 0;
    setPendingLvUp(nl);
    playSound('levelup');
    /* Haptic success — 3 pulses, équivalent ressenti du son de niveau. */
    haptic('success');
    /* Bonus de level-up — formule unique dans constants.js, partagée
       avec LevelUpModal pour que l'écran annonce exactement ce que l'app
       verse. Les paliers majeurs ajoutent 1 ☕ PAR-DESSUS les cookies :
       avant, ils ne versaient que le café, et franchir un grand palier
       ne rapportait rien de dépensable. */
    const bonus = bonusNiveau(nl);
    if(CAFE_MILESTONES_NIVEAUX.includes(nl)){
      setTimeout(()=>{ setCafes(c=>c+1); }, 700);
    }
    setTimeout(()=>{ setCoins(c=>c+bonus); setTotalEarned(t=>t+bonus); }, 700);
  },[prestigeLevel, boostUntil, nextGameDoubler, setNextGameDoubler]);

  const spendCoins   = useCallback((a)=>setCoins(c=>Math.max(0,c-a)),[]);

  /* ── BADGES SECRETS (BRIEF_BADGES_SECRETS) ──────────
     Helper de déblocage : ajoute l'id à `unlocked`, ouvre la modale
     festive, crédite SECRET_BADGE_BONUS (+100 🍪) après 700ms.
     Ref `unlockedRef` synchronisée à chaque render → garde anti-doublon
     même en mode strict React où les effets peuvent être rejoués.
     ⚠️ Doit être déclaré APRÈS addCoins (utilisé en deps), sinon TDZ. */
  const unlockedRef = useRef(unlocked); unlockedRef.current = unlocked;
  const unlockSecretBadge = useCallback((key) => {
    const badge = SECRET_BADGES[key];
    if(!badge) return;
    if(unlockedRef.current.includes(badge.id)) return;
    unlockedRef.current = [...unlockedRef.current, badge.id];
    setUnlocked(unlockedRef.current);
    setSecretBadgeQueue(q => [...q, badge]);
    setTimeout(() => addCoins(SECRET_BADGE_BONUS), 700);
  }, [setUnlocked, addCoins]);

  /* Détection des 3 badges secrets — chaque useEffect tape
     unlockSecretBadge(...) qui no-op si déjà unlocked.

     Mode test Admin (`admin558`) : ne reçoit AUCUN badge ni succès —
     compte de test pur, sans pollution du système d'unlocks. */
  /* Helper : tuto fini (lu en LS, pas dans le state).
     Couvre les nouveaux comptes où tutorialStep = 0 AVANT le démarrage du
     tuto (faux positif si on gate juste sur tutorialStep > 0). */
  const isTutorialDone = () => {
    try { return window.localStorage.getItem('cookiminer:tutorialCompleted') === '1'; }
    catch { return true; }
  };

  useEffect(() => {
    if(!userName || showOnboarding) return;
    if(!isTutorialDone()) return;   /* attends fin du tuto avant pop badge */
    const isAdmin = isAdminName(userName);
    if(isAdmin) return;  /* admin → aucun badge */
    /* Cas normal : Noctambule selon l'heure. */
    const hour = new Date().getHours();
    if(hour < 4){
      unlockSecretBadge('noctambule');
    }
  }, [userName, showOnboarding, tutorialStep, unlockSecretBadge]);

  useEffect(() => {
    if(isAdminName(userName)) return;
    if(!isTutorialDone()) return;   /* attends fin du tuto avant pop badge */
    if(marketRealized >= 1000) unlockSecretBadge('investisseur');
  }, [marketRealized, tutorialStep, unlockSecretBadge, userName]);

  useEffect(() => {
    if(isAdminName(userName)) return;
    if(!isTutorialDone()) return;   /* attends fin du tuto avant pop badge */
    if(friendCodes.length >= 3) unlockSecretBadge('amical');
  }, [friendCodes, tutorialStep, unlockSecretBadge, userName]);

  /* Admin doit toujours être au niveau max (test/debug). Bump le compte
     admin existant qui serait resté à 10 après l'extension niv 11-15. */
  useEffect(() => {
    if((userName || '').trim().toLowerCase() !== ADMIN_NAME) return;
    if(level < 15){
      setLevel(15);
      setXp(0);
    }
  }, [userName, level, setLevel, setXp]);

  /* Admin doit avoir TOUS les thèmes débloqués à tout moment (test/debug).
     Resync à chaque chargement : si on rajoute un nouveau thème dans
     REWARDS, le compte admin existant le récupère automatiquement sans
     refaire l'onboarding. Idempotent : ne touche `unlocked` que s'il
     manque effectivement un id thème (Set diff). */
  useEffect(() => {
    if(!isAdminName(userName)) return;
    const allThemeIds = REWARDS.filter(r => r.type === 'Thème').map(r => r.id);
    const missing = allThemeIds.filter(id => !unlocked.includes(id));
    if(missing.length > 0){
      setUnlocked(u => Array.from(new Set([...(u || []), ...missing])));
    }
  }, [userName, unlocked, setUnlocked]);

  /* RENAMES FORCÉS — mapping pseudo problématique → nouveau pseudo,
     appliqué au prochain chargement du joueur concerné. Le sync auto
     (upsertProfile, 5 s) push ensuite le nouveau nom vers Supabase.
     Idempotent : une fois le pseudo changé, le useEffect ne refire pas.
     Pour ajouter d'autres renames : juste étendre l'objet ci-dessous. */
  useEffect(() => {
    if(!userName) return;
    const FORCED_RENAMES = {
      'bandeur de tana': 'Lilian',
    };
    const newName = FORCED_RENAMES[userName.trim().toLowerCase()];
    if(!newName || newName === userName) return;
    setUserName(newName);
    showToastRef.current?.(`Pseudo mis à jour : ${newName}`);
  }, [userName, setUserName]);

  /* CAP ANTI-ÉCART TOP 1 — limite l'écart top 1 vs top 2 du classement
     cookies à +20 %. 2 mécanismes complémentaires :

     1. RÉTROACTIF : checkLeaderGap recalibre totalEarned à pile
        (top2 × 1.20) si on est déjà au-dessus. Trigger au mount +
        après chaque level-up + toutes les 30 s.
     2. PROACTIF  : totalEarnedCap (state + ref) est lu par addCoins
        pour clamper les futurs gains. Tant que je suis top 1 et au
        cap, mes nouveaux gains sont silencieusement plafonnés (pas
        de perte de coins, juste pas de progression au classement).
        Le ref évite de re-créer addCoins à chaque refresh du cap.

     Popup explicatif (1× / session) au moment du recalibrage initial. */
  const GAP_PCT = 1.20;  // Top 1 max +20 % vs Top 2
  const [gapWarning, setGapWarning] = useState(null);  // { myTotal, topTwo, capped } | null
  const [gapShownThisSession, setGapShownThisSession] = useState(false);
  const [totalEarnedCap, setTotalEarnedCap] = useState(Infinity);
  const totalEarnedCapRef = useRef(Infinity);
  useEffect(() => { totalEarnedCapRef.current = totalEarnedCap; }, [totalEarnedCap]);

  const checkLeaderGap = useCallback(async () => {
    if(!userCode) return;
    if(isAdminName(userName)) { setTotalEarnedCap(Infinity); return; }
    const [topOne, topTwo] = await getTopTwoTotalEarned();
    if(!topOne || !topTwo) { setTotalEarnedCap(Infinity); return; }
    if(topOne.user_code !== userCode) { setTotalEarnedCap(Infinity); return; }
    const t2 = Number(topTwo.total_earned) || 0;
    if(t2 <= 0) { setTotalEarnedCap(Infinity); return; }

    const cap = Math.floor(t2 * GAP_PCT);
    setTotalEarnedCap(cap);  // PROACTIF : addCoins lit ce cap via ref

    if(totalEarned > cap){
      /* RÉTROACTIF : recalibrage silencieux. Le sync push à Supabase
         dans les 5 s suivantes. Popup 1×/session pour pas spammer. */
      setTotalEarned(cap);
      if(!gapShownThisSession){
        setGapWarning({ myTotal: totalEarned, topTwo: t2, capped: cap });
        setGapShownThisSession(true);
      }
    }
  }, [userCode, userName, totalEarned, gapShownThisSession, setTotalEarned]);

  /* Check au mount (debounce 3s pour laisser le upsertProfile pousser
     les valeurs locales d'abord — sinon le check tomberait sur des
     valeurs Supabase périmées) + recheck périodique toutes les 30 s
     pour refresh totalEarnedCap quand le top 2 progresse. */
  useEffect(() => {
    const t = setTimeout(checkLeaderGap, 3000);
    const interval = setInterval(checkLeaderGap, 30_000);
    return () => { clearTimeout(t); clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Re-check après chaque level-up (moment où l'écart peut bondir). */
  useEffect(() => {
    if(!pendingLvUp) return;
    const t = setTimeout(checkLeaderGap, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLvUp]);

  /* CAPS FORCÉS — limite max sur totalEarned pour certains joueurs
     (rééquilibrage classement). Source de vérité Supabase
     (applied_patches) → idempotent cross-device.
     Pour ajouter un cap : étendre l'objet (pseudo lowercase → max).
     ⚠️ Lookup userName : pour les nouveaux caps, préférer CLICK_ABUSE_CAPS
     ci-dessous (lookup userCode plus stable). */
  useEffect(() => {
    if(!userName || !userCode || !pullDone) return;
    const TOTAL_EARNED_CAPS = {
      'aaronxbox': 15000,
    };
    const cap = TOTAL_EARNED_CAPS[userName.trim().toLowerCase()];
    if(!cap) return;
    let cancelled = false;
    applyPatchOnce({
      userCode,
      lsKey: 'cookiminer:totalEarnedCapped',
      patchKey: 'totalEarnedCapped_legacy',
      isCancelled: () => cancelled,
      applyFn: () => {
        if(totalEarned > cap){
          setTotalEarned(cap);
          showToastRef.current?.(`📊 Total recalibré à ${cap} 🍪`);
        }
      },
    });
    return () => { cancelled = true; };
  }, [userName, userCode, pullDone, totalEarned, setTotalEarned]);

  /* ── CAPS rétroactifs abuseurs Cookie Click 11/05/2026 ──────────
     Le jeu Cookie Click était trop rentable (combos x2/x3/x4 + caps
     trop hauts → ~7000 🍪/jour). Plusieurs joueurs en ont profité
     pour monter le classement. Le nerf est en place côté code, mais
     il reste à recaler les totals déjà gonflés.
     Lookup par userCode (stable, résistant aux changements de pseudo
     — aaronxbox a justement contourné l'ancien cap userName en passant
     de "aaronxbox" à "aaronxbox_288 #1"). Flag LS distinct.

     ⚠️ Décision 11/05/2026 : la perte est PLAFONNÉE À 40 % MAX du
     total/weekly courant (le joueur garde au moins 60 % de ce qu'il avait).
     Le `totalCap` (resp. `weeklyCap`) est utilisé comme cap STRICT seulement
     s'il ne fait pas tomber le joueur en dessous de 60 % de son montant
     actuel. Sinon, on s'arrête à 60 %.
     Concrètement : nouveau = max(cap, current × 0.6), puis min(current, nouveau).
  ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if(!userCode || !pullDone) return;
    const codeUpper = (userCode || '').toUpperCase();
    /* Cap UNIQUEMENT sur le total_earned (pas le weekly_earned).
       Le hebdo reset chaque vendredi 18 h UTC, donc inutile d'y toucher
       — l'abus se purge tout seul à la prochaine clôture. */
    const CLICK_ABUSE_CAPS = {
      'X6G-4ZL': { totalCap: 15000 },
      'XN2-Z7M': { totalCap: 15000 },
      '83F-LV2': { totalCap: 8000  },
      '5H5-ZA6': { totalCap: 7000  },
      'D99-NN8': { totalCap: 6000  },
    };
    const caps = CLICK_ABUSE_CAPS[codeUpper];
    if(!caps) return;
    let cancelled = false;
    applyPatchOnce({
      userCode,
      lsKey: 'cookiminer:clickAbuseCaps_2026_05_11',
      patchKey: 'clickAbuseCaps_2026_05_11',
      isCancelled: () => cancelled,
      applyFn: () => {
        if(caps.totalCap != null){
          setTotalEarned(t => {
            const cur = t || 0;
            const floor = Math.max(caps.totalCap, Math.floor(cur * 0.6));
            return Math.min(cur, floor);
          });
        }
        showToastRef.current?.(`📊 Total recalibré (équilibrage Cookie Click)`);
      },
    });
    return () => { cancelled = true; };
  }, [userCode, pullDone, setTotalEarned]);

  /* Débits manuels one-shot (rééquilibrage demandé par l'user). Pattern
     jumelé avec TOTAL_EARNED_CAPS — soustrait une valeur fixe au lieu
     de capper. Gate sur `pullDone` pour appliquer APRÈS la sync serveur
     (sinon le pull ramènerait l'ancienne valeur). Le débit est ensuite
     pushé via le upsert auto (5 s).
     Flag LS unique daté pour ne re-débiter qu'une seule fois (créer une
     nouvelle clé `_vN` pour faire un nouveau débit plus tard). */
  useEffect(() => {
    if(!userName || !userCode || !pullDone) return;
    const lname = userName.trim().toLowerCase();
    const COINS_DEBITS = {
      'cookithan': 4000,
    };
    const ckDebit = COINS_DEBITS[lname] || 0;
    if(!ckDebit) return;
    let cancelled = false;
    applyPatchOnce({
      userCode,
      lsKey: 'cookiminer:manualDebit2026_05_10_cookithan_coins',
      patchKey: 'manualDebit_2026_05_10_cookithan_coins',
      isCancelled: () => cancelled,
      applyFn: () => {
        setCoins(c => Math.max(0, (c || 0) - ckDebit));
        showToastRef.current?.(`📊 Recalibrage : -${ckDebit} 🍪`);
      },
    });
    return () => { cancelled = true; };
  }, [userName, userCode, pullDone, setCoins]);

  /* Sanctions administratives — débit forcé du totalEarned (pas du
     solde) avec popup d'avertissement. Lookup par userCode (stable).
     Flag LS one-shot, set AVANT le débit (anti F5 race).
     On débite aussi weekly_earned du même montant pour cohérence
     classement weekly.

     ⚠️ DÉSACTIVÉ 11/05/2026 — le flag LS étant par-device, des
     joueurs changeant de device / réinstallant l'app ont été
     re-sanctionnés (double débit). Sanctions déjà appliquées
     côté serveur, on n'a plus besoin de re-fire. Si un nouveau
     joueur doit être sanctionné, on attendra la migration du
     flag vers Supabase. */
  useEffect(() => {
    return; // Sanctions code-driven neutralisées — anti double-débit
    /* eslint-disable no-unreachable */
    if(!userCode || !pullDone) return;
    const codeUpper = (userCode || '').toUpperCase();
    const SANCTIONS = {
      '7Z4-977': {
        totalEarnedDebit: 10000,
        weeklyEarnedDebit: 10000,
        reason: 'la manipulation du marché $CKM (pump-and-dump)',
      },
    };
    const s = SANCTIONS[codeUpper];
    if(!s) return;
    const FLAG_KEY = 'cookiminer:sanction_2026_05_10_pump';
    try{
      if(window.localStorage.getItem(FLAG_KEY) === '1') return;
      window.localStorage.setItem(FLAG_KEY, '1');
    }catch{ return; }
    if(s.totalEarnedDebit) setTotalEarned(t => Math.max(0, (t || 0) - s.totalEarnedDebit));
    if(s.weeklyEarnedDebit) setWeeklyEarned(w => Math.max(0, (w || 0) - s.weeklyEarnedDebit));
    setSanctionApplied({ amount: s.totalEarnedDebit, reason: s.reason });
  }, [userCode, pullDone, setTotalEarned, setWeeklyEarned]);

  /* Sanctions abus packs $CKM en cookies (audit 10/05/2026) — joueurs
     ayant racheté pack_shares_5/10 en boucle avant le fix one-shot. On
     retire les actions illégitimement créées (portfolio + circulation).
     aaronXbox a cumulé un cashout massif via revente → débit additionnel
     totalEarned/weeklyEarned. Les 3 autres ne sont pas allés au cashout
     (ils détenaient encore le stock), donc shares debit suffit.
     Lookup par userCode (stable), flag LS one-shot par device, set AVANT
     les opérations (anti F5).

     ⚠️ DÉSACTIVÉ 11/05/2026 — flag LS par-device → re-fire au
     changement de device. Plusieurs joueurs ont reperdu shares
     et -10000 totalEarned une 2e fois. Sanctions déjà appliquées,
     on ne re-fire plus. */
  useEffect(() => {
    return; // Sanctions code-driven neutralisées — anti double-débit
    /* eslint-disable no-unreachable */
    if(!userCode || !pullDone || !isSupabaseEnabled()) return;
    const codeUpper = (userCode || '').toUpperCase();
    const reasonExploit = "l'abus des packs actions $CKM en cookies (achats répétés)";
    const PACK_EXPLOIT_SANCTIONS = {
      'X6G-4ZL': { sharesDebit: 23,  totalEarnedDebit: 10000, weeklyEarnedDebit: 10000, reason: reasonExploit + " et le cashout massif" },
      '7Z4-977': { sharesDebit: 259, totalEarnedDebit: 0,     weeklyEarnedDebit: 0,     reason: reasonExploit },
      'AUY-KJ9': { sharesDebit: 135, totalEarnedDebit: 0,     weeklyEarnedDebit: 0,     reason: reasonExploit },
      '83F-LV2': { sharesDebit: 11,  totalEarnedDebit: 0,     weeklyEarnedDebit: 0,     reason: reasonExploit },
    };
    const s = PACK_EXPLOIT_SANCTIONS[codeUpper];
    if(!s) return;
    const FLAG_KEY = 'cookiminer:sanction_2026_05_10_packs_exploit';
    try{
      if(window.localStorage.getItem(FLAG_KEY) === '1') return;
      window.localStorage.setItem(FLAG_KEY, '1');
    }catch{ return; }
    /* Débits locaux immédiats (totalEarned + weekly) — sync auto via
       upsertProfile au prochain tick 5s. */
    if(s.totalEarnedDebit) setTotalEarned(t => Math.max(0, (t || 0) - s.totalEarnedDebit));
    if(s.weeklyEarnedDebit) setWeeklyEarned(w => Math.max(0, (w || 0) - s.weeklyEarnedDebit));
    /* Débit shares server-side (Supabase). Async — pas bloquant.
       adminDebitShares cappe naturellement au stock disponible. */
    if(s.sharesDebit > 0){
      (async () => {
        const res = await adminDebitShares(userCode, s.sharesDebit);
        if(!res?.success){
          // eslint-disable-next-line no-console
          console.warn('[sanction packs] adminDebitShares failed:', res?.error);
        }
      })();
    }
    /* Modale d'avertissement pour TOUS les sanctionnés (shares et/ou
       totalEarned). SanctionAppliedModal affiche les 2 blocs selon ce
       qui est > 0. */
    setSanctionApplied({
      amount: s.totalEarnedDebit || 0,
      sharesDebit: s.sharesDebit || 0,
      reason: s.reason,
    });
  }, [userCode, pullDone, setTotalEarned, setWeeklyEarned]);

  /* ── Message de compte one-shot (v1.30) ─────────────
     Sanction ou compensation suite à l'exploit du Memory. La modale
     n'applique AUCUN effet : les corrections sont faites en SQL, une
     fois pour toutes. Elle ne fait qu'expliquer au joueur ce qui a
     changé sur son compte — sans quoi il rouvre l'app, découvre dix
     niveaux en moins, et croit légitimement à un bug.

     applyPatchOnce → une seule fois par COMPTE, pas par appareil : la
     trace vit côté Supabase. C'est exactement le piège des sanctions de
     mai 2026, qui se rejouaient sur un téléphone neuf faute de verrou
     partagé (cf. le commentaire « double-refund » plus haut).

     Ne se déclenche qu'à partir de cette mise à jour, puisque le
     fichier accountNotices.js n'existe pas avant.

     PLUSIEURS MESSAGES POSSIBLES (08/09/2026) : on parcourt la liste et
     on affiche le PREMIER dont le verrou n'a pas encore été consommé.
     Auparavant la fonction n'en rendait qu'un seul, le plus ancien —
     donc les 16 porteurs d'actions, qui ont tous reçu leur message de
     compensation en 1.29, n'auraient jamais vu celui du regroupement.
     Un seul message par ouverture d'app : deux modales d'affilée, c'est
     un mur de texte que personne ne lit. */
  useEffect(() => {
    if(!userCode || !pullDone || !isSupabaseEnabled()) return;
    const notices = getAccountNotices(userCode);
    if(!notices.length) return;
    let cancelled = false;
    const showNotice = (notice) => applyPatchOnce({
      userCode,
      lsKey:    'cookiminer:' + notice.patch,
      patchKey: notice.patch,
      isCancelled: () => cancelled,
      applyFn: async () => {
        /* ⚠️ ADOPTION FORCÉE DES VALEURS SERVEUR — sans ça, la sanction
           ne tient pas trente secondes.

           Le pull d'ouverture (plus haut) n'accepte le serveur que s'il
           est EN AVANCE : `serverAhead = server.totalEarned > totalEarned
           || server.cafes > cafes`. Or une sanction fait BAISSER ces
           valeurs. Le client garde donc son localStorage gonflé, et
           l'upsert debouncé le repousse en base dans les 5 secondes :
           la correction SQL est effacée par le joueur lui-même, sans
           que personne ne s'en aperçoive.

           On force donc l'adoption ici, une seule fois par compte, en
           mettant l'upsert en pause le temps d'écrire les états.
           C'est aussi ce qui explique qu'un changement fait à la main
           en base ne se voie pas dans l'app : ce n'est pas un cache,
           c'est le client qui gagne.

           ⚠️ Réservé aux messages dont la correction touche la table
           users (forceServerAdoption). Le regroupement d'actions, lui,
           ne vit que dans market_portfolio : lui faire adopter les
           valeurs serveur ferait perdre au joueur la progression
           gagnée depuis son dernier envoi, sans rien corriger. */
        if(notice.forceServerAdoption){
          setPauseUpsertUntil(Date.now() + 8000);
          const srv = await pullProfile(userCode);
          if(srv && !cancelled){
            setCoins(srv.coins);
            setCafes(srv.cafes);
            setTotalEarned(srv.totalEarned);
            setWeeklyEarned(Number(srv.weeklyEarned) || 0);
            setLevel(srv.level);   lvRef.current = srv.level;
            setXp(srv.xp);         xpRef.current = srv.xp;
            setUnlocked(srv.unlocked || []);
            setActiveTheme(srv.activeTheme || '');
            setActiveTitle(srv.activeTitle || '');
          }
        }
        /* Le classement garde son cache de session : sans purge, le
           joueur verrait encore ses anciens chiffres jusqu'à la
           prochaine ouverture de l'app. */
        try{
          sessionStorage.removeItem('leaderboard:cache:v5:alltime');
          sessionStorage.removeItem('leaderboard:cache:v5:weekly');
          sessionStorage.removeItem('leaderboard:market:cache');
        }catch{ /* mode privé : pas de sessionStorage, rien à purger */ }
        if(!cancelled) setAccountNotice(notice);
      },
    });

    (async () => {
      for(const notice of notices){
        if(cancelled) return;
        /* Message qui raconte une correction SQL pas encore passée :
           on ne l'affiche pas et surtout on ne consomme pas son verrou.
           Il ressortira à la prochaine ouverture, une fois le SQL joué. */
        if(notice.requiresMarketPrice){
          const st = await getMarketState();
          if(cancelled) return;
          if(!st || st.current_price < notice.requiresMarketPrice * 0.8) continue;
        }
        const shown = await showNotice(notice);
        if(shown) return;   /* un seul message par ouverture */
      }
    })();

    return () => { cancelled = true; };
  }, [userCode, pullDone]);

  /* Sanction double-refund (Mustang AUY-KJ9, mai 2026).
     Le refund marché utilise un flag LS one-shot par device. Mustang
     a réouvert l'app sur un device frais (LS wipé) → la modale refund
     a re-crédité 15 816 🍪 une 2e fois (le flag absent passe le check).
     Cookies réinvestis sur le marché → top 1 artificiel.

     Débit totalEarned + weekly seul (le solde a déjà été dépensé en
     shares, et les shares pack-exploit sont traitées dans
     PACK_EXPLOIT_SANCTIONS ci-dessus). Flag LS séparé pour ne pas
     re-déclencher la sanction packs.

     ⚠️ Si le useEffect pack_exploit fire dans le même mount, les 2
     setSanctionApplied se chevauchent et seule la dernière modale
     reste visible. Les 2 débits s'appliquent correctement, juste
     l'explication visuelle peut sauter pour l'un. Le reason ci-dessous
     mentionne les 2 incidents pour couvrir ce cas.

     ⚠️ DÉSACTIVÉ 11/05/2026 — même raison (flag LS par-device).
     Sanction déjà appliquée, on ne re-fire plus. */
  useEffect(() => {
    return; // Sanctions code-driven neutralisées — anti double-débit
    /* eslint-disable no-unreachable */
    if(!userCode || !pullDone) return;
    const codeUpper = (userCode || '').toUpperCase();
    const REFUND_BUG_SANCTIONS = {
      'AUY-KJ9': {
        totalEarnedDebit: 15816,
        weeklyEarnedDebit: 15816,
        reason: "le double crédit du refund marché (LS wipé au changement de device) — en plus de l'abus des packs $CKM cookies",
      },
    };
    const s = REFUND_BUG_SANCTIONS[codeUpper];
    if(!s) return;
    const FLAG_KEY = 'cookiminer:sanction_2026_05_10_refund_bug';
    try{
      if(window.localStorage.getItem(FLAG_KEY) === '1') return;
      window.localStorage.setItem(FLAG_KEY, '1');
    }catch{ return; }
    if(s.totalEarnedDebit) setTotalEarned(t => Math.max(0, (t || 0) - s.totalEarnedDebit));
    if(s.weeklyEarnedDebit) setWeeklyEarned(w => Math.max(0, (w || 0) - s.weeklyEarnedDebit));
    setSanctionApplied({
      amount: s.totalEarnedDebit || 0,
      sharesDebit: 0,
      reason: s.reason,
    });
  }, [userCode, pullDone, setTotalEarned, setWeeklyEarned]);

  /* ── COMPENSATION double-sanction 11/05/2026 ────────────────────
     Plusieurs joueurs se sont pris la popup sanction 2 ou 3 fois
     (flag LS par-device → re-fire au changement de device). On
     re-crédite les montants perdus en trop :
       · Mustang (AUY-KJ9, popup vue 2 fois) : -1 = +1× la sanction
         → +135 shares + 15816 totalEarned + 15816 weeklyEarned
       · Dokiler (7Z4-977, popup vue 3 fois) : -1 = +2× la sanction
         → +100 shares + 20000 totalEarned (weekly volontairement
           non compensé pour ne pas exploser le classement hebdo)
     Lookup par userCode (stable). Flag LS distinct des sanctions.
     Set AVANT crédit.
     ⚠️ Si LS wipé sur un nouveau device, le crédit re-fire — mais
     comme c'est un crédit (pas un débit), pire cas = sur-crédit.
  ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if(!userCode || !pullDone) return;
    const codeUpper = (userCode || '').toUpperCase();
    const COMP_BY_CODE = {
      'AUY-KJ9': { totalEarned: 15816, weeklyEarned: 15816, shares: 135, pseudo: 'Mustang' },
      '7Z4-977': { totalEarned: 20000, weeklyEarned: 0,     shares: 100, pseudo: 'Dokiler' },
    };
    const comp = COMP_BY_CODE[codeUpper];
    if(!comp) return;
    let cancelled = false;
    applyPatchOnce({
      userCode,
      lsKey: 'cookiminer:compensation_2026_05_11_double_sanction',
      patchKey: 'compensation_2026_05_11_double_sanction',
      isCancelled: () => cancelled,
      applyFn: () => {
        if(comp.totalEarned) setTotalEarned(t => (t || 0) + comp.totalEarned);
        if(comp.weeklyEarned) setWeeklyEarned(w => (w || 0) + comp.weeklyEarned);
        if(comp.shares > 0 && isSupabaseEnabled()){
          (async () => {
            const res = await creditFreeShares(userCode, comp.shares);
            if(!res?.success){
              // eslint-disable-next-line no-console
              console.warn('[compensation] creditFreeShares failed:', res?.error);
            }
          })();
        }
        showToastRef.current?.(`✨ Compensation appliquée pour ${comp.pseudo} : +${comp.totalEarned} 🍪${comp.shares ? ` + ${comp.shares} $CKM` : ''}`);
      },
    });
    return () => { cancelled = true; };
  }, [userCode, pullDone, setTotalEarned, setWeeklyEarned]);

  /* ── Boost classement hebdo aaronxbox 18/05/2026 ────────────────
     L'user veut que aaronxbox démarre la semaine avec 1000 🍪 au
     CLASSEMENT (weekly_earned), sans toucher solde / total / XP, et
     qu'il continue à cumuler par-dessus (1100, 1200…).
     Le set SQL direct était écrasé par l'upsert client (valeur locale
     gagne). Solution code-driven : on PLANCHE le weeklyEarned local
     du client de aaronxbox à 1000 (Math.max → idempotent, pas de
     double comptage avec le 1000 déjà en base, pas additif). One-shot
     via applied_patches (cross-device). Les gains suivants s'ajoutent
     normalement et l'upsert pousse alors la valeur boostée.
     Lookup par userCode (stable). N'affecte QUE weeklyEarned. */
  useEffect(() => {
    if(!userCode || !pullDone) return;
    if((userCode || '').toUpperCase() !== 'X6G-4ZL') return;
    let cancelled = false;
    applyPatchOnce({
      userCode,
      lsKey: 'cookiminer:weeklyBoost_aaronxbox_1000_2026_05_18',
      patchKey: 'weeklyBoost_aaronxbox_1000_2026_05_18',
      isCancelled: () => cancelled,
      applyFn: () => {
        setWeeklyEarned(w => Math.max(Number(w) || 0, 1000));
      },
    });
    return () => { cancelled = true; };
  }, [userCode, pullDone, setWeeklyEarned]);

  /* ── Débit shares aaronxbox 12/05/2026 ──────────────────────────
     Débit administratif silencieux de 150 actions $CKM sur X6G-4ZL.
     Pas de toast ni popup côté user (comportement d'UPDATE admin).
     adminDebitShares cape naturellement au stock dispo (si l'user en
     a moins que 150 il perd juste tout son stock). applyPatchOnce
     garantit l'idempotence cross-device via Supabase applied_patches.
     S'applique au prochain mount d'aaronxbox.
  ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if(!userCode || !pullDone || !isSupabaseEnabled()) return;
    const codeUpper = (userCode || '').toUpperCase();
    if(codeUpper !== 'X6G-4ZL') return;
    let cancelled = false;
    applyPatchOnce({
      userCode,
      lsKey: 'cookiminer:marketDebit_2026_05_12_aaronxbox_150',
      patchKey: 'marketDebit_2026_05_12_aaronxbox_150',
      isCancelled: () => cancelled,
      applyFn: () => {
        (async () => {
          const res = await adminDebitShares(userCode, 150);
          if(!res?.success){
            // eslint-disable-next-line no-console
            console.warn('[market debit aaronxbox] adminDebitShares failed:', res?.error);
          }
        })();
      },
    });
    return () => { cancelled = true; };
  }, [userCode, pullDone]);

  /* ── Rebalance one-shot du marché — NEUTRALISÉ le 08/09/2026 ────
     Il retirait 10 % des actions d'un joueur, sans compensation, pour
     « décongestionner un marché bloqué loin de la moyenne ». Cette
     notion n'existe plus : depuis la refonte, le cours n'a plus de
     moyenne vers laquelle revenir, et le flottant est large (223
     actions détenues sur 2 000).

     Surtout, il n'avait pas été consommé par tous les comptes :
     vérification faite en base avant la réouverture, un porteur y aurait
     perdu 2 de ses 18 actions à sa prochaine ouverture — juste après
     avoir lu le message qui lui promet que le regroupement n'a rien
     changé à la valeur de son portefeuille. Un mécanisme dormant qui
     ampute un joueur des mois plus tard n'a pas sa place ici.

     Neutralisé comme les sanctions de mai 2026 : on garde le code, il
     ne s'exécute plus.
  ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    return;   /* mécanique neutralisée — cf. bandeau ci-dessus */
    /* eslint-disable no-unreachable */
    if(!userCode || !pullDone || !isSupabaseEnabled()) return;
    let cancelled = false;
    applyPatchOnce({
      userCode,
      lsKey:    'cookiminer:marketRebalance10pct_v1',
      patchKey: 'marketRebalance10pct_v1',
      isCancelled: () => cancelled,
      applyFn: () => {
        (async () => {
          const res = await applyMarketRebalance10pct(userCode);
          if(!res || !res.sharesRemoved) return;
          /* Notification inbox — l'user voit clairement ce qui s'est
             passé en rouvrant l'app, pas juste un changement silencieux. */
          await createInboxMessage(
            userCode,
            'market_rebalance',
            '🔄 Rebalance du marché',
            `Pour décongestionner le marché $CKM, 10 % de tes actions ont été retirées et réinjectées dans le pool disponible.\n\n` +
            `Avant : ${res.sharesBefore} actions\n` +
            `Après : ${res.sharesAfter} actions (−${res.sharesRemoved})`,
            { sharesRemoved: res.sharesRemoved, sharesAfter: res.sharesAfter }
          );
        })();
      },
    });
    return () => { cancelled = true; };
    /* eslint-enable no-unreachable */
  }, [userCode, pullDone]);

  /* ── Sentinelle ───────────────────────────────────────────────
     Trois gestes au démarrage, tous silencieux et sans effet de bord :
       1. brancher l'ErrorBoundary sur la vigie (window.cookiOnError,
          le point d'accroche prévu « pour une télémétrie future ») ;
       2. déposer un rapport d'ouverture — c'est LUI qui donne la
          répartition des versions en circulation, le chiffre qui
          manquait le 08/09 quand un client resté en 1.27 rabotait le
          cours du marché ;
       3. lancer une ronde SI l'intervalle est écoulé. Le premier client
          qui ouvre l'app fait le travail pour tout le monde — c'est ce
          qui rend la vigie autonome : ni PC, ni ligne de commande, ni
          personne pour la déclencher.

     Tout est enveloppé : si MIGRATION_SENTINELLE.sql n'est pas passé,
     les tables n'existent pas et la vigie se tait. L'app ne doit jamais
     casser parce que la surveillance est absente.
  ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if(!userCode || !pullDone || !isSupabaseEnabled()) return;
    brancherRapportDeCrash();
    signalerOuverture(userCode, userName);
    /* Volontairement non attendu : une ronde ne doit jamais retarder
       l'affichage de l'app. */
    rondeSiNecessaire().then(() => {
      /* La pastille n'est calculée que pour un admin : une vigie qu'il
         faut penser à consulter ne sert qu'aux jours où on y pense,
         mais un joueur normal n'a rien à faire des rapports. */
      if(peutVoirSentinelle(userName, userCode)){
        alertesEnCours().then(setAlertesSentinelle).catch(()=>{});
        signalementsOuverts().then(setSignalementsAttente).catch(()=>{});
      }
    });
  }, [userCode, userName, pullDone]);

  /* ── Frais de garde — RETIRÉS le 08/09/2026 ───────────────
     Ils grignotaient 0,5 %/jour des actions d'un joueur qui n'avait pas
     tradé depuis 7 jours, pour décourager la thésaurisation. Ils partent
     en même temps que le bonus de hold, et pour la raison inverse : une
     fois le bonus retiré, garder ses actions n'était plus que puni. Or
     le marché de la 1.30 ne monte que si la communauté accumule — on ne
     peut pas viser une action rare et rogner ceux qui la gardent.
     La fonction applyHoldDecayIfDue a été supprimée de lib/market.js
     avec l'effet : une fonction qui retire des actions à un joueur ne
     doit pas traîner sans appelant.
  ─────────────────────────────────────────────────────────── */

  /* ── Palier communautaire 500 000 🍪 ──────────────────────────
     Quand la somme des total_earned de tous les joueurs (hors admins)
     dépasse 500 000, on offre +100 🍪 + 1 ☕ à chaque joueur — une
     seule fois par compte via applyPatchOnce (clé v1).

     Si l'user a déjà reçu le cadeau côté Supabase mais pas LS local
     (changement de device), applyPatchOnce le détecte et ne re-paye
     pas. Set state pour afficher le popup festif.

     Pour relancer un palier 1M ou 2M : créer un nouveau useEffect
     similaire avec threshold + applyPatchOnce key incrémentée. */
  const [milestoneReward, setMilestoneReward] = useState(null);
  /* Boîte en cours d'ouverture (animation cinéma) — { name, emoji, reward }
     ou null. Le crédit est déjà appliqué quand l'animation démarre, donc
     l'animation est cosmétique : si l'user F5, il a déjà reçu son cadeau. */
  const [openingBox, setOpeningBox] = useState(null);
  /* Coffre premium en cours d'ouverture (data/chests.js) — { chest, items }
     ou null. Comme la Boîte Mystère, les items sont crédités AVANT le
     démarrage de l'animation (F5 friendly). Animation purement cosmétique. */
  const [openingChest, setOpeningChest] = useState(null);
  useEffect(() => {
    if(!userCode || !pullDone || !isSupabaseEnabled()) return;
    let cancelled = false;
    (async () => {
      const total = await getCommunityCookieTotal();
      if(cancelled) return;
      const THRESHOLD = 500_000;
      if(total < THRESHOLD) return;
      applyPatchOnce({
        userCode,
        lsKey:    'cookiminer:communityMilestone_500k_v1',
        patchKey: 'communityMilestone_500k_v1',
        isCancelled: () => cancelled,
        applyFn: () => {
          /* Crédit cadeau : 100 🍪 (compte aussi pour XP/totalEarned)
             + 1 ☕. Le 2e arg de addCoins force le compteur de gains
             "vrais" (XP + totalEarned) — cohérent avec la philosophie. */
          addCoins(100, 100);
          setCafes(c => (c || 0) + 1);
          setMilestoneReward({ threshold: THRESHOLD, cookieReward: 100, cafeReward: 1 });
        },
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCode, pullDone]);

  /* ── Palier communautaire 700 000 🍪 : pop-up + cadeau 1 ☕.
        Cadeau de PALIER (≠ récompense de combat du boss qui, elle,
        ne donne jamais de CF). 1 fois par compte, idempotent
        cross-device via applyPatchOnce. */
  useEffect(() => {
    if(!userCode || !pullDone || !isSupabaseEnabled()) return;
    let cancelled = false;
    (async () => {
      const total = await getCommunityCookieTotal();
      if(cancelled) return;
      const THRESHOLD = 700_000;
      if(total < THRESHOLD) return;
      applyPatchOnce({
        userCode,
        lsKey:    'cookiminer:communityMilestone_700k_v1',
        patchKey: 'communityMilestone_700k_v1',
        isCancelled: () => cancelled,
        applyFn: () => {
          setCafes(c => (c || 0) + 1);
          setMilestoneReward({ threshold: THRESHOLD, cookieReward: 0, cafeReward: 1 });
        },
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCode, pullDone]);

  /* ── Boss communautaire : Le Gâteau Géant ────────────────────────
     Crédit de la récompense (séparation des responsabilités : le hook
     useCommunityBoss — instancié plus haut — gère détection/création/
     Realtime/attaques ; ICI on crédite via le même applyPatchOnce
     idempotent cross-device que le palier 500k legacy).
     JAMAIS de ☕ CF — vecteur de triche éco interdit (mémoire projet). */
  useEffect(() => {
    if(!userCode || !pullDone || !isSupabaseEnabled()) return;
    if(!communityBoss || communityBoss.status !== 'defeated') return;
    const milestone = communityBoss.milestone;
    const claimKey  = bossClaimPatchKey(milestone, communityBoss.startedAt);
    let cancelled = false;
    (async () => {
      /* Le coup fatal a pu être porté par un autre joueur après notre
         dernière attaque — on relit la source de vérité serveur. */
      const dmg = await getMyBossDamage(milestone, userCode);
      if(cancelled) return;
      const reward = bossRewardFor(dmg);
      if(!reward) return;                       // participation insuffisante
      /* Skin RÉSERVÉ AU TOP 3 des plus gros tapeurs (demande Cookithan).
         getBossRank renvoie le rang 0-indexé (0 = 1er, null si 0 dégât) —
         source de vérité serveur, relue après le coup fatal. rank0 > 2 =
         hors podium → pas de skin. */
      const rank0 = await getBossRank(milestone, userCode);
      if(cancelled) return;
      if(rank0 === null || rank0 > 2) return;   // hors top 3
      applyPatchOnce({
        userCode,
        lsKey:    'cookiminer:' + claimKey,
        patchKey: claimKey,
        isCancelled: () => cancelled,
        applyFn: () => {
          /* UNIQUEMENT le skin exclusif — aucun cookie, jamais de CF. */
          setUnlocked(arr => Array.isArray(arr) && !arr.includes(reward.skinId)
            ? [...arr, reward.skinId] : arr);
          /* Pop-up de fin de boss retirée (demande Cookithan) → feedback
             discret via toast + inbox, sans overlay intrusif. */
          showToast(`🍪 Fournée #${fourneeNumber(milestone)} sauvée — skin exclusif débloqué !`);
          playSound('levelup');
          createInboxMessage(
            userCode,
            'system',
            `🍪 Fournée #${fourneeNumber(milestone)} sauvée !`,
            `La communauté a vaincu Le Gâteau Mangeur de Cookies. Tu finis ${rank0 + 1}ᵉ au classement des coups : tu fais partie du TOP 3 et débloques le skin exclusif « Cookie Mangeur » ! Équipe-le dans Paramètres → Apparence.`,
            null,
          ).catch(()=>{});
        },
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityBoss, userCode, pullDone]);

  /* ── Pénalité d'ÉCHEC : si le boss n'est pas vaincu à la fin du
        chrono (status 'failed'), chaque joueur ayant participé ≥1
        fois perd 1000 🍪 (puis sur total_earned si solde insuffisant).
        1 fois par instance via applyPatchOnce. */
  useEffect(() => {
    if(!userCode || !pullDone || !isSupabaseEnabled()) return;
    if(!communityBoss || communityBoss.status !== 'failed') return;
    const milestone = communityBoss.milestone;
    const failKey   = bossFailPatchKey(milestone, communityBoss.startedAt);
    let cancelled = false;
    (async () => {
      const dmg = await getMyBossDamage(milestone, userCode);
      if(cancelled) return;
      if(!dmg || dmg <= 0) return;          // pas participé → pas de pénalité
      applyPatchOnce({
        userCode,
        lsKey:    'cookiminer:' + failKey,
        patchKey: failKey,
        isCancelled: () => cancelled,
        applyFn: () => {
          const pay   = Math.min(FAIL_PENALTY_COOKIES, coins);
          const short = FAIL_PENALTY_COOKIES - pay;     // pris sur total gagné
          setCoins(c => Math.max(0, c - pay));
          if(short > 0) setTotalEarned(t => Math.max(0, t - short));
          /* Pop-up de fin de boss retirée (demande Cookithan) → toast + inbox
             déjà présents ci-dessous suffisent. */
          playSound('error');
          showToast(`☠️ Boss non vaincu — −${FAIL_PENALTY_COOKIES} 🍪`);
          createInboxMessage(
            userCode,
            'system',
            `☠️ Le Gâteau Mangeur de Cookies a gagné…`,
            `La communauté n'a pas terrassé le boss à temps. Pour avoir participé, tu perds ${FAIL_PENALTY_COOKIES} 🍪${short > 0 ? ` (dont ${short} pris sur ton total gagné, solde insuffisant)` : ''}. Personne ne reçoit le skin cette fois.`,
            null,
          ).catch(()=>{});
        },
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityBoss, userCode, pullDone]);

  /* ── Musique du boss : jouée UNIQUEMENT tant que l'overlay boss
        est ouvert. À la fermeture, restaure la musique du menu
        d'avant (sélection du joueur, non écrasée). */
  useEffect(() => {
    if(!bossOverlayOpen) return;
    playBossMusic();
    return () => { endBossMusic(); };
  }, [bossOverlayOpen]);

  /* ── Top 1 du classement des coups : débloque la musique boss en
        permanence (à la résolution, vaincu OU échoué). 1×/instance. */
  useEffect(() => {
    if(!userCode || !pullDone || !isSupabaseEnabled()) return;
    if(!communityBoss || (communityBoss.status !== 'defeated' && communityBoss.status !== 'failed')) return;
    const milestone = communityBoss.milestone;
    const musicKey  = bossMusicPatchKey(milestone, communityBoss.startedAt);
    let cancelled = false;
    (async () => {
      const rank0 = await getBossRank(milestone, userCode);
      if(cancelled || rank0 !== 0) return;          // seulement le Top 1
      applyPatchOnce({
        userCode,
        lsKey:    'cookiminer:' + musicKey,
        patchKey: musicKey,
        isCancelled: () => cancelled,
        applyFn: () => {
          setUnlocked(arr => Array.isArray(arr) && !arr.includes(REWARD_MUSIC_ID)
            ? [...arr, REWARD_MUSIC_ID] : arr);
          showToast('🎵 Top 1 du boss — musique débloquée !');
          createInboxMessage(
            userCode,
            'system',
            `🎵 Top 1 du Gâteau Mangeur de Cookies !`,
            `Tu es le plus gros tapeur de ce boss : la musique exclusive « Thème du Boss » est débloquée en permanence. Active-la dans Paramètres → Audio.`,
            null,
          ).catch(()=>{});
        },
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityBoss, userCode, pullDone]);

  /* Attaque depuis l'overlay. Le boost coûte des 🍪 : on ne débite
     QUE si le coup va réellement partir (mêmes garde-fous que le hook),
     et on rembourse si le serveur ne l'a pas appliqué (cooldown/cap). */
  const handleBossAttack = useCallback(async (kind = 'free') => {
    const blocked = bossCooldownMs > 0 || bossAttacking;
    if(kind === 'boost'){
      if(blocked || coins < BOOST_COST_COOKIES) return;
      setCoins(c => Math.max(0, c - BOOST_COST_COOKIES));
      const res = await bossAttack('boost');
      if(!res || res.applied === 0) setCoins(c => c + BOOST_COST_COOKIES);
      return;
    }
    if(kind === 'super'){
      if(blocked || (cafes || 0) < SUPER_COST_CF) return;
      setCafes(c => Math.max(0, c - SUPER_COST_CF));        // sink CF (voulu)
      const res = await bossAttack('super');
      if(!res || res.applied === 0) setCafes(c => c + SUPER_COST_CF);  // refund
      return;
    }
    if(kind === 'admin'){
      /* One-shot réservé admin (outil de test) — gratuit, ignore le
         cooldown côté hook. Garde-fou : seulement si compte admin. */
      if(!isAdminName(userName)) return;
      await bossAttack('admin');
      return;
    }
    await bossAttack('free');
  }, [bossCooldownMs, bossAttacking, coins, cafes, bossAttack, setCoins, setCafes, userName]);

  /* ── Pop-up d'annonce : à l'apparition d'un boss en phase
        "annonce" (avant starts_at), on ouvre l'overlay UNE fois
        (compte à rebours "arrive dans l'heure"). 1×/palier. */
  useEffect(() => {
    if(!communityBoss || level < BOSS_LEVEL_MIN) return;
    const announcing = communityBoss.startsAt && Date.now() < communityBoss.startsAt;
    if(!announcing) return;
    const k = 'cookiminer:bossSeen_' + communityBoss.milestone;
    let seen = false;
    try{ seen = localStorage.getItem(k) === '1'; }catch{}
    if(seen) return;
    try{ localStorage.setItem(k, '1'); }catch{}
    playSound('modal');
    setShowBoss(true);
  }, [communityBoss, level]);

  /* ── Set streak Dokiler à 6 (13/05/2026) ─────────────────────────
     Demande user : forcer le streak à 6 jours sur le compte 7Z4-977.
     Cross-device safe via applyPatchOnce. */
  useEffect(() => {
    if(!userCode || !pullDone || !isSupabaseEnabled()) return;
    const codeUpper = (userCode || '').toUpperCase();
    if(codeUpper !== '7Z4-977') return;
    let cancelled = false;
    applyPatchOnce({
      userCode,
      lsKey: 'cookiminer:setStreak_2026_05_13_dokiler_6',
      patchKey: 'setStreak_2026_05_13_dokiler_6',
      isCancelled: () => cancelled,
      applyFn: () => {
        setStreak(6);
      },
    });
    return () => { cancelled = true; };
  }, [userCode, pullDone, setStreak]);

  /* ── Retrait badge niv 25 aaronxbox (13/05/2026) ──────────────────
     Renaissance débloque les items niv 25 (badge_origine, skin_origine).
     aaronxbox n'a pas atteint niv 25 mais a le badge → on le retire.
     Cross-device safe. */
  useEffect(() => {
    if(!userCode || !pullDone || !isSupabaseEnabled()) return;
    const codeUpper = (userCode || '').toUpperCase();
    if(codeUpper !== 'X6G-4ZL') return;
    let cancelled = false;
    applyPatchOnce({
      userCode,
      lsKey: 'cookiminer:removeOrigineBadge_2026_05_13_aaronxbox',
      patchKey: 'removeOrigineBadge_2026_05_13_aaronxbox',
      isCancelled: () => cancelled,
      applyFn: () => {
        setUnlocked(arr => Array.isArray(arr)
          ? arr.filter(id => id !== 'badge_origine')
          : arr);
      },
    });
    return () => { cancelled = true; };
  }, [userCode, pullDone, setUnlocked]);

  /* Refund marché — compensation pour les ex-investisseurs après le
     reset du marché (delete from market_portfolio). On crédite chaque
     user de son total_invested perdu. 7Z4-977 EXCLU (pump-and-dumper
     qui avait déjà engrangé +32 637 🍪 de profit avant le crash).
     Lookup par userCode (stable) plutôt que userName (peut changer).
     Flag LS one-shot pour ne créditer qu'une fois par device. */
  useEffect(() => {
    if(!userCode || !pullDone) return;
    const codeUpper = (userCode || '').toUpperCase();
    const MARKET_REFUND = {
      'AUY-KJ9': 15816,
      '83F-LV2': 11116,
      'X6G-4ZL':  2585,
      'W5U-5QV':   783,
      'XN2-Z7M':   111,
    };
    const refund = MARKET_REFUND[codeUpper] || 0;
    if(!refund) return;
    let cancelled = false;
    applyPatchOnce({
      userCode,
      lsKey: 'cookiminer:marketRefund2026_05_10',
      patchKey: 'marketRefund_2026_05_10',
      isCancelled: () => cancelled,
      applyFn: () => {
        setCoins(c => (c || 0) + refund);
        /* Modale d'excuses + résumé du fix (au lieu d'un simple toast).
           Le patch est déjà marqué Supabase, donc fermer ou refresh ou
           changer de device ne re-déclenche pas. */
        setMarketRefundAmount(refund);
      },
    });
    return () => { cancelled = true; };
  }, [userCode, pullDone, setCoins]);

  /* ── CLASSEMENT HEBDOMADAIRE — clôture & récompenses top 3 ──
     Au mount (après pullDone), on calcule la semaine PRÉCÉDENTE et :
     1. On vérifie si elle a une row dans weekly_winners (déjà clôturée).
        Si non, on tente de la clôturer (closeWeek est atomique via PK).
     2. Si je suis dans le top 3 → check flag LS pour pas redistribuer →
        crédit cafés (5/3/1) + ajout badge `champ_W<num>` à unlocked +
        popup festif WeeklyChampModal.
     Re-déclenche à chaque changement de week_id (toutes les semaines). */
  useEffect(() => {
    if(!userCode || !pullDone || isAdminName(userName)) return;
    let alive = true;
    (async () => {
      const currentWeekId = getCurrentWeekId();
      /* Calcule le week_id de la semaine PRÉCÉDENTE = currentWeekId - 7 jours. */
      const prevDate = new Date(currentWeekId);
      prevDate.setUTCDate(prevDate.getUTCDate() - 7);
      const prevWeekId = prevDate.toISOString().slice(0, 10);
      /* Reset manuel 17/05/2026 : on ne distribue PAS de podium pour les
         semaines antérieures au plancher (scores hérités purgés, pas de
         récompense rétroactive aux anciens leaders >10 000). */
      if(prevWeekId < MANUAL_RESET_WEEK_ID) return;
      /* Clôture si pas encore faite (atomique côté Supabase) */
      let winners = await getWeeklyWinners(prevWeekId);
      if(!winners){
        winners = await closeWeek(prevWeekId);
      }
      if(!alive || !winners) return;
      /* Suis-je dans le top 3 ? */
      const codeUpper = userCode.toUpperCase();
      let myRank = 0;
      if(winners.top1_code?.toUpperCase() === codeUpper) myRank = 1;
      else if(winners.top2_code?.toUpperCase() === codeUpper) myRank = 2;
      else if(winners.top3_code?.toUpperCase() === codeUpper) myRank = 3;
      if(myRank === 0) return;
      /* One-shot CROSS-DEVICE via patch Supabase (is_patch_applied). Avant,
         un simple flag localStorage ne survivait pas à un changement
         d'appareil → un joueur top-3 pouvait re-réclamer le ☕ (monnaie rare)
         sur un 2e device. On garde le même lsKey pour bloquer les claims déjà
         effectués sous l'ancien système. */
      const cafesReward = myRank === 1 ? 3 : myRank === 2 ? 2 : 1;
      const weekNum = getWeekNumberDisplay(prevWeekId);
      const badgeId = `champ_W${weekNum}`;
      await applyPatchOnce({
        userCode,
        lsKey: `cookiminer:weeklyChampReward_${prevWeekId}`,
        patchKey: `weeklyChamp_${prevWeekId}`,
        isCancelled: () => !alive,
        applyFn: () => {
          setCafes(c => (c || 0) + cafesReward);
          setUnlocked(u => (u || []).includes(badgeId) ? u : [...(u || []), badgeId]);
          setWeeklyChampReward({ rank: myRank, cafes: cafesReward, weekNum });
        },
      });
    })();
    return () => { alive = false; };
  }, [userCode, pullDone, userName, setCafes, setUnlocked]);


  /* Inbox — applique une récompense quand on ouvre un message pour la 1re
     fois (gift / tournament_reward / referral_reward). InboxModal garantit
     l'unicité via is_processed côté Supabase, donc pas de garde ici.
     showToast (système global) annonce l'application en haut d'écran. */
  const handleApplyReward = useCallback((type, payload) => {
    if(!payload) return;
    if(type === 'gift'){
      if(payload.type === 'cookies' && payload.amount){
        addCoins(payload.amount);
        showToast(`🎁 +${payload.amount} 🍪 reçu !`);
      } else if(payload.type === 'cf' && payload.amount){
        addCafes(payload.amount);
        showToast(`🎁 +${payload.amount} ☕ reçu !`);
      }
      return;
    }
    if(type === 'tournament_reward'){
      const ck = payload.cookies ?? 0;
      const cf = payload.cf ?? 0;
      if(ck) addCoins(ck);
      if(cf) addCafes(cf);
      const parts = [];
      if(ck) parts.push(`+${ck} 🍪`);
      if(cf) parts.push(`+${cf} ☕`);
      if(parts.length) showToast(`🏆 ${parts.join('  ')}`);
      return;
    }
    if(type === 'referral_reward'){
      const ck = payload.cookies ?? 0;
      const cf = payload.cf ?? 0;
      if(ck) addCoins(ck);
      if(cf) addCafes(cf);
      const parts = [];
      if(ck) parts.push(`+${ck} 🍪`);
      if(cf) parts.push(`+${cf} ☕`);
      if(parts.length) showToast(`🎁 Bonus parrainage : ${parts.join('  ')}`);
    }
  }, [addCoins, addCafes, showToast]);

  /* Restauration de profil (BRIEF_RESTAURATION — version complète).
     Wipe complet des clés cookiminer:* puis réinjection des champs
     restaurés et reload — plus simple que de mettre à jour 30 useState
     manuellement. Depuis l'ajout des colonnes Supabase cafes/xp/unlocked/
     name_change_count/earned_achievements/active_theme (08/05/2026), la
     restauration ramène TOUT ce qui compte. */
  const handleRestoreSuccess = useCallback((data) => {
    /* Lire la liste des comptes connus + le compte courant AVANT le wipe.
       On veut préserver la liste à travers le reload, et y ajouter
       l'ancien compte (celui qu'on quitte) + le nouveau (celui qu'on
       charge) pour faciliter les futurs switchs. */
    let known = [];
    let oldUserCode = '';
    let oldUserName = '';
    try{
      const rawList = localStorage.getItem('cookiminer:knownAccounts');
      const parsedList = rawList ? JSON.parse(rawList) : [];
      if(Array.isArray(parsedList)) known = parsedList;
      const rawCode = localStorage.getItem('cookiminer:userCode');
      const rawName = localStorage.getItem('cookiminer:userName');
      if(rawCode) oldUserCode = JSON.parse(rawCode);
      if(rawName) oldUserName = JSON.parse(rawName);
    }catch{}

    try{
      const keysToRemove = [];
      for(let i = 0; i < localStorage.length; i++){
        const k = localStorage.key(i);
        if(k && k.startsWith('cookiminer:')) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }catch{}

    const set = (key, val) => {
      try{ localStorage.setItem('cookiminer:' + key, JSON.stringify(val)); }catch{}
    };
    /* Identité */
    set('userCode',    data.userCode);
    set('userName',    data.userName);
    set('userAvatar',  data.userAvatar);
    set('userBio',     data.userBio);
    set('joinDate',
      data.joinDate
        ? new Date(data.joinDate).toLocaleDateString('fr-FR')
        : new Date().toLocaleDateString('fr-FR')
    );
    /* Progression */
    set('level',       data.level);
    set('xp',          data.xp ?? 0);
    set('coins',       data.cookies);
    set('cafes',       data.cafes ?? 0);
    set('totalEarned', data.totalEarned);
    set('streak',      data.streak);
    /* Items + sélections */
    set('unlocked',        data.unlocked || []);
    set('achievements',    data.earnedAchievements || []);
    set('nameChangeCount', data.nameChangeCount ?? 0);
    set('activeTheme',     data.activeTheme || '');
    set('prestigeLevel',   data.prestigeLevel ?? 0);
    /* PIN sync : on garde le même PIN sur le nouvel appareil — le
       user n'en a qu'un seul à retenir. Il est requis pour restaurer
       sur encore un autre appareil plus tard. */
    set('restorePin',      data.restorePin || '');
    /* Compteurs quotidiens — anti-cheat cross-device. Sans ces 6 set,
       le LS du nouveau device restait vierge → check-in/quiz/roue/slot
       à dispo (alors que déjà consommés sur l'autre device). */
    set('lastCheckin',     data.lastCheckin || null);
    set('lastQuiz',        Number(data.lastQuiz) || 0);
    set('spinsToday',      Number(data.spinsToday) || 0);
    set('spinsDate',       data.spinsDate || null);
    set('slotGamesToday',  Number(data.slotGamesToday) || 0);
    set('slotGamesDate',   data.slotGamesDate || null);
    /* Marché (best-effort) */
    if(data.portfolio?.invested != null){
      set('totalInvested', data.portfolio.invested);
    }

    /* Reconstruit la liste knownAccounts : nouveau compte en tête,
       ancien compte juste après (si différent), puis les autres comptes
       déjà connus dédupliqués. Cap 5. */
    const merged = [
      { userCode: data.userCode, userName: data.userName, lastUsed: Date.now() },
    ];
    if(oldUserCode && oldUserCode !== data.userCode){
      merged.push({ userCode: oldUserCode, userName: oldUserName, lastUsed: Date.now() - 1 });
    }
    known.forEach(a => {
      if(a && a.userCode && !merged.find(m => m.userCode === a.userCode)){
        merged.push(a);
      }
    });
    set('knownAccounts', merged.slice(0, 5));

    /* Reload pour repartir d'un état propre — tous les useState
       useLocalStorage relisent leurs valeurs au mount. */
    window.location.reload();
  }, []);

  /* "Démarrer un nouveau compte" : wipe localStorage (donc onboarding au
     reload) MAIS sans toucher au compte Supabase (pas de deleteMyProfile).
     Différent du reset complet — le compte actuel reste sauvegardé en
     ligne et l'utilisateur peut y revenir via Restaurer un compte.
     Préserve la liste knownAccounts en y ajoutant le compte courant. */
  const handleStartNewAccount = useCallback(() => {
    const ok = window.confirm(
      "Démarrer un nouveau compte ?\n\n" +
      "Ton compte actuel sera mémorisé dans 'Comptes récents' et reste " +
      "sauvegardé en ligne. Tu pourras y revenir via Restaurer un compte " +
      "avec ton code + PIN."
    );
    if(!ok) return;

    let known = [];
    let oldUserCode = '';
    let oldUserName = '';
    try{
      const rawList = localStorage.getItem('cookiminer:knownAccounts');
      const parsedList = rawList ? JSON.parse(rawList) : [];
      if(Array.isArray(parsedList)) known = parsedList;
      const rawCode = localStorage.getItem('cookiminer:userCode');
      const rawName = localStorage.getItem('cookiminer:userName');
      if(rawCode) oldUserCode = JSON.parse(rawCode);
      if(rawName) oldUserName = JSON.parse(rawName);
    }catch{}

    try{
      const keysToRemove = [];
      for(let i = 0; i < localStorage.length; i++){
        const k = localStorage.key(i);
        if(k && k.startsWith('cookiminer:')) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }catch{}

    /* Réécrit knownAccounts avec l'ancien compte en tête */
    const merged = [];
    if(oldUserCode){
      merged.push({ userCode: oldUserCode, userName: oldUserName, lastUsed: Date.now() });
    }
    known.forEach(a => {
      if(a && a.userCode && !merged.find(m => m.userCode === a.userCode)){
        merged.push(a);
      }
    });
    try{
      localStorage.setItem('cookiminer:knownAccounts', JSON.stringify(merged.slice(0, 5)));
    }catch{}

    window.location.reload();
  }, []);

  /* Validation d'un code promo : crédite cookies/cafés/actions et marque le
     code comme utilisé. La modale fait elle-même les checks (validité,
     pas déjà utilisé) — ici on assume que le promo est valide.
     Async car shares passe par Supabase. */
  const redeemPromoCode = useCallback(async (promo) => {
    if(!promo || promoCodesUsed.includes(promo.code)) return;
    /* Mode admin : pas de codes promo (cohérent avec trading désactivé,
       pas de badges/succès attribués). Évite que CMK1 file des actions
       à un compte test. */
    const isAdmin = isAdminName(userName);
    if(isAdmin){
      showToast(`🛠️ Mode admin — codes promo désactivés`);
      return;
    }
    /* Défense cross-device : si l'effect de sync au mount n'a pas encore
       résolu et que l'user a déjà été crédité sur un autre device, le
       check LS rate. On vérifie Supabase à la volée et on sync le LS
       pour que la prochaine tentative soit instantanément bloquée. */
    if(isSupabaseEnabled() && userCode){
      const already = await isPatchApplied(userCode, `promo_${promo.code}`);
      if(already){
        setPromoCodesUsed(arr => Array.isArray(arr) && arr.includes(promo.code) ? arr : [...(arr || []), promo.code]);
        showToast(`🎟️ Code déjà utilisé sur un autre appareil`);
        return;
      }
    }
    /* ── Pas d'actions avant que le marché existe ───────────
       Un code à actions marchait dès le niveau 1 : le joueur arrivait au
       niveau 3 avec un portefeuille déjà garni, sans avoir jamais vu le
       marché — et sans comprendre d'où ça venait. On refuse, et le code
       n'est PAS consommé : il pourra le retaper une fois le marché
       ouvert. */
    if(promo.shares && lvRef.current < MARKET_CONFIG.UNLOCK_LEVEL){
      showToast(`📈 ${t('toast.market_locked_promo', { n: MARKET_CONFIG.UNLOCK_LEVEL })}`);
      return;
    }

    /* Crédit shares en premier (peut échouer si Supabase off) */
    if(promo.shares){
      const res = await creditFreeShares(userCode, promo.shares);
      if(!res?.success){
        showToast(`⚠️ ${res?.error || 'Action non créditée'}`);
        return;  // ne pas marquer le code comme utilisé si l'action a échoué
      }
    }
    if(promo.coins){
      /* Mode silencieux côté XP : direct setCoins + setTotalEarned, sans
         toucher xp/level. Sert aux gros codes qui ne doivent pas faire
         exploser la progression (ex : RICHE +4000). Sinon parcours normal
         via addCoins (qui crédite XP + déclenche level-up éventuel). */
      if(promo.noXp){
        setCoins(c => c + promo.coins);
        setTotalEarned(t => t + promo.coins);
      } else {
        addCoins(promo.coins);
      }
    }
    if(promo.cafes) setCafes(c => c + promo.cafes);
    /* Boost niveau : si le code définit un niveau minimum et qu'on est
       en dessous, on saute directement (sans déclencher pendingLvUp pour
       éviter la modale level-up classique sur un code promo). XP réinit
       à 0 pour repartir propre sur le nouveau palier. */
    if(promo.level && lvRef.current < promo.level){
      setLevel(promo.level);
      setXp(0);
      lvRef.current = promo.level;
      xpRef.current = 0;
    }
    /* Restauration totalEarned : code de récupération qui ramène la
       valeur cumulée à un seuil (ex: après une perte de sync). Idempotent —
       n'écrase JAMAIS une valeur supérieure. */
    if(promo.totalEarnedFloor && totalEarned < promo.totalEarnedFloor){
      setTotalEarned(promo.totalEarnedFloor);
    }
    /* Boost classement cumulé : ajoute au total_earned UNIQUEMENT, sans
       toucher au solde 🍪 dépensable ni à l'XP/level. Le joueur grimpe au
       leaderboard sans recevoir de cookies à dépenser. */
    if(promo.totalEarnedOnly){
      setTotalEarned(t => t + promo.totalEarnedOnly);
    }
    /* Déblocage d'un item REWARDS (typiquement un thème édition limitée
       comme theme_noir via le code BLACK). Idempotent : pas de doublon
       dans `unlocked`. Si on trouve l'item, on déclenche la modale
       festive (réutilise EventRewardModal avec headline "Code promo"). */
    let unlockedItem = null;
    if(promo.unlock){
      setUnlocked(u => u.includes(promo.unlock) ? u : [...u, promo.unlock]);
      unlockedItem = REWARDS.find(r => r.id === promo.unlock) || null;
      if(unlockedItem){
        const typeMap = { 'Thème':'theme', 'Badge':'badge', 'Skin':'skin', 'Avatar':'avatar' };
        setEventReward({
          source:    'promo',
          type:      typeMap[unlockedItem.type] || 'theme',
          id:        unlockedItem.id,
          name:      unlockedItem.name,
          cafeBonus: 0,
        });
      }
    }
    /* unlockGame : force le déblocage d'un mini-jeu indépendamment du
       niveau requis. Idempotent. Utilisé par les codes starter pack. */
    if(promo.unlockGame){
      setUnlockedGames(g => Array.isArray(g) && g.includes(promo.unlockGame) ? g : [...(g || []), promo.unlockGame]);
    }
    setPromoCodesUsed(arr => Array.isArray(arr) ? [...arr, promo.code] : [promo.code]);
    /* Persistance cross-device : marque le code comme appliqué dans
       applied_patches. Tout autre device se logguant sur le compte verra
       le patch et refusera le code. Fire-and-forget — si Supabase est
       down, le crédit local reste valide (sera resync à la prochaine
       reconnexion via le mount effect). */
    if(isSupabaseEnabled() && userCode){
      markPatchApplied(userCode, `promo_${promo.code}`).catch(()=>{});
    }
    playSound('success');
    /* Toast minimal — la modale festive prend le relais quand un item
       est débloqué, donc on ne mentionne pas l'item dans le toast pour
       éviter la redondance. */
    const parts = [];
    if(promo.coins)  parts.push(`+${promo.coins} 🍪`);
    if(promo.totalEarnedOnly) parts.push(`+${promo.totalEarnedOnly} 🍪 (classement)`);
    if(promo.cafes)  parts.push(`+${promo.cafes} ☕`);
    if(promo.shares) parts.push(`+${promo.shares} action${promo.shares > 1 ? 's' : ''} $CKM`);
    if(promo.level)  parts.push(`Niv ${promo.level}`);
    if(promo.unlockGame) parts.push('🎮 jeu débloqué');
    if(parts.length){
      /* Durée allongée pour les "starter packs" (3+ récompenses ou code
         qui débloque un jeu) — le joueur doit pouvoir tout lire. Default
         2.8s sinon, jusqu'à 8s pour les codes généreux. */
      const generous = parts.length >= 3 || !!promo.unlockGame;
      showToast(`🎟️ Code validé : ${parts.join(' · ')}`, generous ? { duration: 8000 } : undefined);
    }
  }, [addCoins, setCoins, setCafes, setLevel, setXp, setUnlocked, setEventReward, setTotalEarned, totalEarned, promoCodesUsed, setPromoCodesUsed, showToast, userCode, userName]);

  /* Cadeaux entre amis (BRIEF_CADEAUX_AMIS). Le débit du sender est local
     (spendCoins / setCafes) ; le crédit du destinataire arrive plus tard
     via inbox (handleApplyReward) à la 1re ouverture du message. */
  const handleSendGift = useCallback(async (recipientCode, giftType) => {
    const balance = { cookies: coins, cf: cafes };
    const res = await sendGift(userCode, recipientCode, giftType, balance);
    if(res.success && res.gift){
      if(res.gift.type === 'cookies') spendCoins(res.gift.amount);
      else if(res.gift.type === 'cf') setCafes(c => Math.max(0, c - res.gift.amount));
      playSound('success');
      showToast(`🎁 Cadeau envoyé !`);
    }
    return res;
  }, [userCode, coins, cafes, spendCoins, setCafes, showToast]);

  /* ── ÉVÉNEMENTS SPÉCIAUX (PHASE 6E) ─────────────── */

  /* Tire le prochain event en phase 'waiting' (timer 1h-24h aléatoire,
     ou 1-3 min en mode dev "Admin"). Si tous les events ont déjà
     été complétés → setActiveEvent(null) : plus de cycle. */
  const triggerNextEvent = (justWonId = null) => {
    /* `justWonId` : id de l'event qu'on vient de gagner. setCompletedEvents
       étant asynchrone, le closure peut encore avoir l'ancienne liste — on
       l'exclut explicitement pour éviter de retirer le nouvel event sur
       celui qu'on vient de gagner. */
    const tpl = pickRandomEvent(completedEvents, justWonId);
    if(!tpl){ setActiveEvent(null); return; }
    const devMode = isAdminName(userName);
    setActiveEvent(buildWaitingEvent(tpl, devMode));
  };

  /* Passe l'event de 'waiting' à 'active' : démarre la fenêtre de 1h
     avec MAX_ATTEMPTS essais, et ouvre la modale d'annonce. */
  const revealEvent = () => {
    setActiveEvent(prev => prev ? ({
      ...prev,
      phase:'active',
      revealAt: Date.now(),
      expiresAt: Date.now() + ACTIVE_DURATION_MS,
      attemptsLeft: MAX_ATTEMPTS,
    }) : prev);
    setShowEventModal(true);
  };

  /* Vérifie si un challenge en cours matche le type/value passé.
     Désormais : essais ILLIMITÉS pendant la fenêtre active (l'user
     peut continuer à tenter tant que l'event n'a pas expiré).
     - Succès → débloque le thème limité, ouvre la modale de récompense,
       lance le prochain cycle (waiting).
     - Échec → silencieux, l'user peut réessayer. */
  const checkEventChallenge = (type, value) => {
    const ev = activeEvent;
    if(!ev || ev.phase !== 'active') return;
    if(Date.now() >= ev.expiresAt) return;
    if(type !== ev.challenge) return;       // pas une tentative pour cet event

    let success = false;
    if(type === 'spin_jackpot')   success = value >= 200;
    if(type === 'market_profit')  success = value >= 100;   // +100 🍪 PnL en 1 vente
    /* 7 events modérés */
    if(type === 'pour_perfect')   success = value >= 1;     // binaire : 1 si parfait
    if(type === 'quiz_perfect')   success = value >= 1;     // binaire
    if(type === 'guess_perfect')  success = value >= 1;     // binaire
    if(type === 'click_sprint')   success = value >= 60;    // clics en une partie
    if(type === 'pyramid_floors') success = value >= 15;    // étages empilés
    if(type === 'slot_three')     success = value >= 1;     // binaire (3-same)
    if(type === 'reflex_score')   success = value >= 20;    // score reflex

    if(success){
      setUnlocked(u => u.includes(ev.reward.id) ? u : [...u, ev.reward.id]);
      setCompletedEvents(c => c.includes(ev.id) ? c : [...c, ev.id]);
      /* Bonus ☕ en plus du thème — affiché par EventRewardModal */
      if(ev.reward.cafeBonus > 0) setCafes(c => c + ev.reward.cafeBonus);
      setEventReward(ev.reward);
      triggerNextEvent(ev.id);   // exclure l'event qu'on vient de gagner
    }
    /* Pas de décrément d'essais — l'user peut continuer tant que
       l'event est actif (jusqu'à expiresAt). */
  };

  /* Initialisation : si level >= 4 et pas d'event en cours → on lance
     un waiting. Couvre le cas du 1er passage au niveau 4. */
  useEffect(()=>{
    if(level < EVENT_LEVEL_MIN) return;
    if(bossOngoing) return;            // boss en cours → pas d'event du jour
    if(activeEvent) return;
    triggerNextEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, bossOngoing]);

  /* Tick périodique (5s) pour gérer les transitions de phase :
     - waiting → active : quand revealAt atteint
     - active  → fail   : quand expiresAt atteint sans succès */
  useEffect(()=>{
    if(level < EVENT_LEVEL_MIN || !activeEvent) return;
    if(bossOngoing) return;            // boss en cours → cycle d'event gelé
    const tick = () => {
      const now = Date.now();
      if(activeEvent.phase === 'waiting' && now >= activeEvent.revealAt){
        revealEvent();
      } else if(activeEvent.phase === 'active' && now >= activeEvent.expiresAt){
        triggerNextEvent();
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return ()=>clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEvent, level, bossOngoing]);

  /* Cleanup one-shot des anciennes clés du marché local v1 (pré-Brief 9).
     Le marché est désormais entièrement online (Supabase) — voir lib/market.js
     et components/tabs/MarketTab.jsx. Les anciennes entrées localStorage
     sont retirées une seule fois par utilisateur. Flag persisté pour ne pas
     re-jouer à chaque mount. `marketRealized` est aussi remis à 0 car son
     ancien total reposait sur la simulation locale. */
  useEffect(() => {
    try {
      if (window.localStorage.getItem('cookiminer:marketV2Cleaned') === '1') return;
      ['ckmPrice', 'ckmHistory', 'ckmShares', 'ckmBasis', 'marketTrades', 'marketHistory']
        .forEach(k => window.localStorage.removeItem('cookiminer:' + k));
      setMarketRealized(0);
      window.localStorage.setItem('cookiminer:marketV2Cleaned', '1');
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Migration one-shot : reset des codes promo déjà utilisés (mai 2026).
     Avant fix f576186, resetProgress oubliait de vider promoCodesUsed.
     Du coup les comptes existants traînent une liste de codes "consommés"
     issue d'anciens tests/resets et bloquent toute nouvelle saisie.
     On vide la liste une seule fois pour offrir un fresh start ; les
     codes utilisés APRÈS cette migration seront tracés normalement. */
  useEffect(() => {
    try {
      if (window.localStorage.getItem('cookiminer:promoCodesV2Cleaned') === '1') return;
      setPromoCodesUsed([]);
      window.localStorage.setItem('cookiminer:promoCodesV2Cleaned', '1');
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Migration one-shot : reset du flag legendaryBaristaSeen (mai 2026).
     Avant le fix qui déplace le set dans onPick, le flag se mettait à
     true dès startGame — du coup les comptes ayant joué Devine la commande
     plusieurs fois pouvaient avoir "consommé" leur drop sans jamais avoir
     vu le légendaire (close avant d'atteindre le slot, etc.). On reset
     une fois pour redonner sa chance à tout le monde. Si le joueur a déjà
     unlocked le thème du barista (legacy theme_cookies OU nouveau
     theme_grains), on ne reset pas — il a réellement vu le drop. */
  useEffect(() => {
    try {
      if (window.localStorage.getItem('cookiminer:legendaryV2Cleaned') === '1') return;
      const already = (unlockedRef.current || []).some(
        id => id === 'theme_cookies' || id === 'theme_grains'
      );
      if (!already) setLegendaryBaristaSeen(false);
      window.localStorage.setItem('cookiminer:legendaryV2Cleaned', '1');
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Migration : theme_cookies (Pâte de Cookie) → theme_grains (Grains
     Torréfiés) — mai 2026, refonte du thème lié au drop barista. Les
     joueurs qui avaient unlocked theme_cookies récupèrent automatiquement
     le nouvel ID. Idem pour activeTheme s'il était sur theme_cookies
     (le composant CookieFloater n'existe plus). Pas de flag LS : le swap
     est idempotent (après remplacement, theme_cookies n'existe plus, donc
     setters renvoient la même ref → pas de boucle). Re-roule si pullProfile
     ré-injecte theme_cookies depuis le serveur. */
  useEffect(() => {
    setUnlocked(arr => {
      if (!Array.isArray(arr) || !arr.includes('theme_cookies')) return arr;
      const next = arr.filter(id => id !== 'theme_cookies');
      if (!next.includes('theme_grains')) next.push('theme_grains');
      return next;
    });
    setActiveTheme(t => (t === 'theme_cookies' ? 'theme_grains' : t));
  }, [unlocked, activeTheme]);

  /* Migration one-shot : reset des cafés à 0 pour tous les utilisateurs
     (mai 2026, refonte économie premium → café devient rare). Ancien
     stock = trop d'avantage vs nouvelle distribution réduite (-45%).
     Idempotence cross-device via applyPatchOnce (applied_patches) — un
     ancien flag LS pré-migration est automatiquement migré en serveur.
     Au prochain upsert (5s), la valeur 0 est poussée vers Supabase.
     Affiche une notice (CafesResetNoticeModal) pour expliquer le reset
     une seule fois par compte. */
  useEffect(() => {
    if(!userCode || !pullDone || !isSupabaseEnabled()) return;
    let cancelled = false;
    applyPatchOnce({
      userCode,
      lsKey: 'cookiminer:cafesResetMay10',
      patchKey: 'cafesResetMay10',
      isCancelled: () => cancelled,
      applyFn: () => {
        const hadCafes = (cafesRef.current ?? 0) > 0;
        setCafes(0);
        if (hadCafes) setShowCafesResetNotice(true);
      },
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCode, pullDone]);

  /* Sync cross-device des codes promo déjà utilisés. Au mount, on
     récupère depuis applied_patches tous les patch_keys 'promo_*' et on
     les pousse en LS (promoCodesUsed) pour que PromoCodeModal refuse
     instantanément un code déjà utilisé sur un autre appareil. La
     modale lit `usedCodes` (passé en prop) qui est exactement ce state. */
  useEffect(() => {
    if(!userCode || !pullDone || !isSupabaseEnabled()) return;
    let cancelled = false;
    (async () => {
      const keys = await listAppliedPatchesByPrefix(userCode, 'promo_');
      if(cancelled || !keys.length) return;
      const codes = keys
        .map(k => k.slice('promo_'.length))
        .filter(Boolean);
      if(!codes.length) return;
      setPromoCodesUsed(arr => {
        const cur = Array.isArray(arr) ? arr : [];
        const merged = Array.from(new Set([...cur, ...codes]));
        return merged.length === cur.length ? cur : merged;
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCode, pullDone]);

  /* Récompense du PROCHAIN check-in — objet {coins, cafes, weekIdx, dayIdx,
     isJackpot, maxTier}. Cf. getCheckinReward dans data/constants.js. */
  const checkinReward = getCheckinReward(streak);
  const resetProgress = () => {
    /* Supabase : supprime le profil online en arrière-plan pour qu'il
       disparaisse du classement et des amis qui m'avaient ajouté.
       Fire-and-forget — si la requête échoue (réseau), on reset quand
       même les states locaux. */
    if(isSupabaseEnabled() && userCode){
      deleteMyProfile(userCode);
    }
    /* Vide aussi le cache leaderboard (sinon je continuerais à voir
       l'ancien classement avec mon ancien profil tant que le tab Classement
       n'est pas refresh). */
    try{ sessionStorage.removeItem('leaderboard:cache'); }catch{}

    setCoins(0); setCafes(0); setTotalEarned(0); setLevel(1); setXp(0);
    setStreak(0); setClickRecord(0); setUnlocked([]); setUnlockedGames([]); setLegendaryBaristaSeen(false); setPrestigeLevel(0);
    setNextGameDoubler(false); setBoostUntil(0); setVipPurchasesToday({});
    setFreeRechargesUntil(0); setStreakSaveCount(0);
    setLastCheckin(null); setLastQuiz(null); setDark(false);
    setMarketRealized(0);
    /* Reset complet : ces states persistés (localStorage) étaient oubliés et
       survivaient au reset. Conséquences : classement hebdo faussé (ancien
       weeklyEarned re-poussé sous le nouveau userCode), passes bulk + caps
       quotidiens hérités, temps de jeu faussé, cap top-1 résiduel. */
    setWeeklyEarned(0); setWeeklyWeekId(''); weeklyWeekIdRef.current = '';
    setTotalPlayTime(0); setBulkTradePasses(0);
    setSpinsToday(0); setSpinsDate(null);
    setSlotGamesToday(0); setSlotGamesDate(null);
    setPyramidGamesToday(0); setPyramidGamesDate(null);
    setTotalEarnedCap(Infinity); totalEarnedCapRef.current = Infinity;
    setLeaderboard(null); setLeaderboardLastBoost(''); setLeaderboardLastHourly(0);
    /* Marché v2 : reset du tutoriel + flag de cleanup pour qu'un éventuel
       re-init redéclenche bien le mini-tutoriel. La portfolio Supabase
       de l'user n'est PAS supprimée (low-impact, persiste sous son code). */
    try {
      window.localStorage.removeItem('cookiminer:marketWelcomeSeen');
      window.localStorage.removeItem('cookiminer:marketV2Cleaned');
    } catch {}
    setUserName(''); setUserAvatar(null); setJoinDate(''); setNameChangeCount(0); setUserCode(''); setUserBio('');
    setEarnedAchievements([]); setTotalInvested(0); setPendingAchievements([]);
    setActiveTheme(''); setActiveBanner(''); setActiveSkin(''); setActiveTitle(''); setGameThemes({}); setRevealedPromoCodes([]); setPromoCodesUsed([]);
    setActiveEvent(null); setCompletedEvents([]);
    setShowEventModal(false); setEventReward(null);
    /* Tuto : reset complet pour qu'un reset rejoue le tuto au démarrage */
    setTutorialStep(0); setShowSkipConfirm(false);
    setSeenHints([]); setActiveHint(null);
    try{ window.localStorage.removeItem('cookiminer:tutorialCompleted'); }catch{}
    setPendingLvUp(null); setGameView(null); setTab('accueil');
    setShowInbox(false); setUnreadInboxCount(0);
    setPendingFriendNotifs([]);
    setViewingProfile(null);
    setSecretBadgeQueue([]);
    unlockedRef.current = [];
    try {
      window.localStorage.removeItem('cookiminer:knownFriendCodes');
      window.localStorage.removeItem('cookiminer:notifiedRequestIds');
    } catch {}
    setShowOnboarding(true);
  };

  /* Prestige (renaissance) — disponible quand niveau 25 atteint avec
     60000 XP cumulés sur ce palier. Reset les progressions volatiles
     (niveau, XP, cookies, totalEarned, clickRecord) et incrémente
     prestigeLevel pour booster le multiplicateur de gains de +10 %.
     Garde tout le reste : items, succès, cafés, actions $CKM, identité,
     amis, ET STREAK (la série de check-ins consécutifs persiste — pas
     juste à raison de récompenser un joueur loyal qui renaît). */
  const doPrestige = () => {
    if(level < 25 || xp < 60000) return;
    /* Évite tout bonus level-up flottant */
    setPendingLvUp(null);
    setLevel(1);   lvRef.current = 1;
    setXp(0);      xpRef.current = 0;
    setCoins(0);
    setTotalEarned(0);
    /* Streak conservé (demande user 13/05/2026) — la série de check-ins
       consécutifs est une métrique d'assiduité indépendante de la progression. */
    setClickRecord(0);
    setPrestigeLevel(p => (p || 0) + 1);
    setShowPrestigeModal(false);
    playSound('levelup');
    showToast(`🌟 Renaissance ! Multiplicateur x${(1 + ((prestigeLevel || 0) + 1) * 0.1).toFixed(1)} sur tous les gains 🍪`);
  };

  const doCheckin    = ()=>{
    playSound('coin');
    /* Verse cookies ET/OU cafés selon la grille (J7 et J14 sont des
       jackpots CF purs — 0 🍪). Confirmé explicitement comme sources CF
       validées : 2 ☕ au J7, 3 ☕ au J14. */
    if(checkinReward.coins > 0) addCoins(checkinReward.coins);
    if(checkinReward.cafes > 0) addCafes(checkinReward.cafes);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24*60*60*1000).toDateString();
    /* Streak save : si lastCheckin n'est NI hier NI null, l'user a raté
       au moins 1 jour. Si on a un save en stock → on consomme et le
       streak continue ; sinon le streak reset à 1.
       (Sans cette logique, le streak incrémentait indéfiniment même
       après plusieurs jours d'absence — équivalent à un bug.) */
    const missedDay = lastCheckin && lastCheckin !== yesterday && lastCheckin !== today;
    let usedSave = false;
    setStreak(s => {
      let next;
      if(missedDay){
        if(streakSaveCount > 0){
          usedSave = true;
          next = (s || 0) + 1;
        } else {
          next = 1; /* reset */
        }
      } else {
        next = (s || 0) + 1;
      }
      syncDailyCounters(userCode, { streak: next, last_checkin: today });
      return next;
    });
    if(usedSave){
      setStreakSaveCount(c => Math.max(0, (c || 0) - 1));
      showToast(`🛡️ Streak sauvé ! ${(streakSaveCount || 0) - 1} restant`);
    }
    setLastCheckin(today);
  };

  /* Cap quotidien Bonus VIP — 1 achat / jour / item. La liste des
     items concernés vit ici (source unique partagée avec BoutiqueTab
     via prop vipPurchasesToday + helper côté UI). */
  const VIP_DAILY_CAP_IDS = ['spin_pass_50', 'spin_pass_20', 'slot_pass_50', 'quiz_skip', 'next_game_doubler', 'boost_x2_1h'];
  const wasBoughtVipToday = (id) => vipPurchasesToday?.[id] === new Date().toDateString();
  const markVipBoughtToday = (id) => {
    setVipPurchasesToday(prev => ({ ...(prev || {}), [id]: new Date().toDateString() }));
  };

  /* Anti-double-clic boutique : un clic ultra-rapide pourrait lire 2×
     la même valeur de `coins`/`cafes` avant que React re-render, et
     débiter 2× (mais ajouter 1× à `unlocked`). Le ref est levé 200ms
     pour bloquer les bursts. Une fois React rendu, l'état à jour gère
     les clics suivants normalement. */
  const unlockingRef = useRef(false);

  const unlockReward = (id)=>{
    if(unlockingRef.current) return;
    unlockingRef.current = true;
    setTimeout(() => { unlockingRef.current = false; }, 200);

    const r=REWARDS.find(x=>x.id===id);
    if(!r){ haptic('warning'); return; }
    /* Cap quotidien VIP — bloque tout rachat le même jour. */
    if(VIP_DAILY_CAP_IDS.includes(id) && wasBoughtVipToday(id)){ haptic('warning'); return; }
    /* Items premium CONSOMMABLES (Jetons VIP) — pas d'ajout à `unlocked`,
       l'utilisateur peut les racheter à volonté tant qu'il a les cafés.
       L'effet (bonus de tours roue) est appliqué directement. */
    if(r.applyAs === 'spin_pass'){
      if(cafes < r.cost) return;
      /* Achat bloqué tant qu'il reste des tours dispos — incite à
         consommer son quota gratuit avant d'acheter. */
      if(spinsLeft > 0) return;
      setCafes(c => Math.max(0, c - r.cost));
      addSpinPass(r.spinPassAmount || 0);
      markVipBoughtToday(id);
      playSound('success');
      showToast(`🎟️ +${r.spinPassAmount} tours de roue ajoutés !`);
      return;
    }
    if(r.applyAs === 'slot_pass'){
      if(cafes < r.cost) return;
      /* Achat bloqué tant qu'il reste des parties dispos. */
      if(slotPlaysLeft > 0) return;
      setCafes(c => Math.max(0, c - r.cost));
      addSlotPass(r.slotPassAmount || 0);
      markVipBoughtToday(id);
      playSound('success');
      showToast(`🎰 +${r.slotPassAmount} parties Machine à Sous !`);
      return;
    }
    /* Skip Quiz — reset le timer, dispo seulement quand quiz est en cooldown. */
    if(r.applyAs === 'quiz_skip'){
      if(cafes < r.cost) return;
      if(canQuiz) return;
      setCafes(c => Math.max(0, c - r.cost));
      setLastQuiz(0);   /* timestamp 0 → cooldown écoulé → canQuiz = true */
      markVipBoughtToday(id);
      playSound('success');
      showToast('⏭️ Quiz à nouveau disponible !');
      return;
    }
    /* Ordre Bulk $CKM — donne 1 charge cumulable. Consommée par
       MarketTab/TradePanel au clic du bouton "Tout". Cumulable (pas
       de cap quotidien VIP) car c'est un consommable qui se justifie
       par usage (à 3 ☕ chacun, l'user paie ce qu'il consomme). */
    if(r.applyAs === 'bulk_trade_pass'){
      if(cafes < r.cost){ haptic('warning'); return; }
      setCafes(c => Math.max(0, c - r.cost));
      setBulkTradePasses(n => (n || 0) + 1);
      playSound('success');
      haptic('medium');
      showToast(`📦 +1 Trade Express $CKM (stock : ${(bulkTradePasses || 0) + 1})`);
      return;
    }
    /* Doubler le prochain gain — flag one-shot consommé par addCoins.
       Refuse si déjà armé pour ne pas griller des cafés inutilement. */
    if(r.applyAs === 'next_game_doubler'){
      if(cafes < r.cost) return;
      if(nextGameDoubler) return;
      setCafes(c => Math.max(0, c - r.cost));
      setNextGameDoubler(true);
      markVipBoughtToday(id);
      playSound('success');
      showToast('🎯 Prochain gain 🍪 doublé !');
      return;
    }
    /* Boost +30 % cookies pendant 1 h (anciennement ×2 — réduit pour la
       validation Play Store). Capé à 1 achat / jour. */
    if(r.applyAs === 'boost_x2_1h'){
      if(cafes < r.cost) return;
      setCafes(c => Math.max(0, c - r.cost));
      const ONE_HOUR = 60 * 60 * 1000;
      const now = Date.now();
      const baseFrom = (boostUntil && boostUntil > now) ? boostUntil : now;
      setBoostUntil(baseFrom + ONE_HOUR);
      markVipBoughtToday(id);
      playSound('success');
      showToast('⚡ Boost +30 % activé pendant 1 heure !');
      return;
    }
    /* Boost +30 % pendant 24 h — extension long format. Cumulable avec le boost 1h. */
    if(r.applyAs === 'boost_x2_24h'){
      if(cafes < r.cost) return;
      setCafes(c => Math.max(0, c - r.cost));
      const ONE_DAY = 24 * 60 * 60 * 1000;
      const now = Date.now();
      const baseFrom = (boostUntil && boostUntil > now) ? boostUntil : now;
      setBoostUntil(baseFrom + ONE_DAY);
      playSound('success');
      showToast('🔥 Boost +30 % activé pendant 24 heures !');
      return;
    }
    /* Recharges gratuites 24 h — Roue/Slot/Pile rechargent sans coût ☕. */
    if(r.applyAs === 'free_recharges_24h'){
      if(cafes < r.cost) return;
      setCafes(c => Math.max(0, c - r.cost));
      const ONE_DAY = 24 * 60 * 60 * 1000;
      const now = Date.now();
      const baseFrom = (freeRechargesUntil && freeRechargesUntil > now) ? freeRechargesUntil : now;
      setFreeRechargesUntil(baseFrom + ONE_DAY);
      playSound('success');
      showToast('🔓 Recharges gratuites activées pendant 24 heures !');
      return;
    }
    /* Streak Save — +1 save en stock. Consommé auto au prochain check-in
       si un jour a été manqué. Pas de cap d'achat (l'user peut en
       empiler plusieurs). */
    if(r.applyAs === 'streak_save'){
      if(cafes < r.cost) return;
      setCafes(c => Math.max(0, c - r.cost));
      setStreakSaveCount(c => (c || 0) + 1);
      playSound('success');
      showToast(`🛡️ Streak Save ajouté ! ${(streakSaveCount || 0) + 1} en stock`);
      return;
    }
    /* Boîte/Coffre — crédit immédiat du boxReward (cafés et/ou cookies)
       puis déclenche une animation cinéma (cosmétique, peut être skippée
       par F5 sans perdre la récompense). One-shot via `unlocked`. */
    if(r.applyAs === 'open_box'){
      if(unlocked.includes(id)){ haptic('warning'); return; }
      if(coins < r.cost){ haptic('warning'); return; }
      spendCoins(r.cost);
      setUnlocked(u => [...u, id]);
      /* Crédit instantané — l'animation est juste pour le show. Si l'user
         F5 pendant l'anim, ses cafés/cookies sont déjà arrivés. */
      const reward = r.boxReward || {};
      if(reward.cafes)   setCafes(c => (c || 0) + reward.cafes);
      if(reward.cookies) addCoins(reward.cookies, reward.cookies);
      /* Lance l'animation. onCollect ferme juste la modale. */
      setOpeningBox({ name: localizedField(r, 'name', 'REWARDS'), emoji: r.emoji, reward });
      playSound('purchase');
      haptic('medium');
      return;
    }
    /* Coffre premium (data/chests.js) — ONE-SHOT (ajouté à `unlocked`
       après ouverture, devient indispo dans la boutique). Roll 3 items
       pondérés par rareté avec filtre amont sur les cosmétiques déjà
       possédés. Crédit immédiat (F5 friendly). Toujours payé en cafés. */
    if(r.applyAs === 'open_chest'){
      if(unlocked.includes(id)){ haptic('warning'); return; }
      if(cafes < r.cost){ haptic('warning'); return; }
      const chest = CHEST_TIERS[r.chestTier];
      if(!chest){ haptic('warning'); return; }
      setCafes(c => (c || 0) - r.cost);
      const items = rollChest(r.chestTier, lvRef.current, unlocked);
      /* Crédite chaque item immédiatement. Loot = cosmétiques ou
         fallback cookies (jamais de ☕ — l'user vient d'en payer).
         Marque aussi le coffre comme ouvert (`id`) → one-shot. */
      let cookieGain = 0;
      const newUnlocks = [id];
      for(const it of items){
        if(it.type === 'cookies') cookieGain += it.amount;
        else if(it.type === 'cosmetic' && it.cosmeticId) newUnlocks.push(it.cosmeticId);
      }
      if(cookieGain > 0) addCoins(cookieGain, cookieGain);
      setUnlocked(u => [...u, ...newUnlocks]);
      setOpeningChest({ chest, items });
      playSound('purchase');
      haptic('medium');
      return;
    }
    /* Pack actions $CKM — crédite N actions via Supabase (creditFreeShares).
       One-shot par défaut (ajouté à `unlocked` après achat). Seuls les
       items explicitement marqués `consumable:true` restent rachetables
       à volonté. Avant ce fix (mai 2026), pack_shares_5 et pack_shares_10
       étaient consommables par défaut → bug exploit (un joueur pouvait
       grinder cookies + racheter le pack en boucle jusqu'au cap 500 actions).
       Mode admin bloqué pour pas polluer la circulation. */
    if(r.applyAs === 'pack_shares'){
      const isCafe = r.currency === 'cafe';
      const isOneShot = !r.consumable;
      if(isOneShot && unlocked.includes(id)) return;
      if(isCafe ? cafes < r.cost : coins < r.cost) return;
      if(isAdminName(userName)){
        showToast('🛠️ Mode admin — packs $CKM désactivés');
        return;
      }
      const n = r.sharesAmount || 0;
      if(isCafe) setCafes(c => Math.max(0, c - r.cost));
      else spendCoins(r.cost);
      (async () => {
        /* investedTotal : le joueur a payé, donc ces actions ont un vrai
           prix de revient. Sans ça, revendre un pack compterait comme
           une plus-value intégrale (et donnerait droit au bonus de hold
           dessus) — le pack se transformerait en imprimante à cookies. */
        const res = await creditFreeShares(userCode, n, isCafe ? {} : { investedTotal: r.cost });
        if(!res?.success){
          /* Rollback du débit si Supabase a refusé */
          if(isCafe) setCafes(c => c + r.cost);
          else addCoins(r.cost);
          showToast(`⚠️ ${res?.error || 'Pack non crédité'}`);
          return;
        }
        /* One-shot premium : marqué comme acheté pour disparaître de la
           boutique. Consommables : pas d'ajout, rachetables à volonté. */
        if(isOneShot) setUnlocked(u => [...u, id]);
        playSound('success');
        showToast(`📈 +${n} action${n > 1 ? 's' : ''} $CKM créditée${n > 1 ? 's' : ''} !`);
      })();
      return;
    }
    /* Branches `pack_cookies` et `unlock_all_shop` retirées (mai 2026) —
       items pay-to-win supprimés du catalogue pour la validation Play
       Store. Si un legacy item devait surgir avec ces applyAs, il
       tombera dans la branche par défaut (rejeté). */
    /* Items normaux : un seul achat, ajout à unlocked */
    if(unlocked.includes(id)){ haptic('warning'); return; }
    if(r.currency==='cafe'){
      if(cafes < r.cost){ haptic('warning'); return; }
      setCafes(c=>Math.max(0, c - r.cost));
    } else {
      if(coins < r.cost){ haptic('warning'); return; }
      spendCoins(r.cost);
    }
    setUnlocked(u=>[...u,id]);

    /* ── Un thème acheté s'équipe tout de suite ──────────
       Avant : on payait, l'écran ne bougeait pas, et il fallait aller le
       chercher dans Ma Collection pour le voir. Acheter une couleur et ne
       pas la voir, c'est le moment exact où l'achat devient décevant.

       Seuls les thèmes : ils changent l'app entière, donc on VOIT
       immédiatement ce qu'on vient de payer. Les autres cosmétiques
       (skin, avatar, titre, roue) restent à équiper à la main — un titre
       s'affiche sur le pseudo devant tout le monde, ce n'est pas à
       l'achat d'en décider. */
    if(r.type === 'Thème'){
      setActiveTheme(id);
      showToast(`🎨 ${localizedField(r, 'name', 'REWARDS')} ${t('shop.equipped_now')}`);
    }

    /* Son d'achat dédié (caisse enregistreuse) + haptic medium. */
    playSound('purchase');
    haptic('medium');
  };

  /* Achievements detection */
  const earnedRef = useRef(earnedAchievements); earnedRef.current = earnedAchievements;
  const triggerAchievement = useCallback((id)=>{
    if(earnedRef.current.includes(id)) return;
    const a = ACHIEVEMENTS.find(x=>x.id===id);
    if(!a) return;
    earnedRef.current = [...earnedRef.current, id];
    setEarnedAchievements(earnedRef.current);
    /* Bonus crédité IMMÉDIATEMENT (et plus à l'encaissement) : garantit
       qu'aucun gain (🍪 + ☕) n'est perdu si la modale est écrasée par un 2e
       succès concurrent ou si l'app recharge avant le clic "Récupérer". Le
       garde earnedRef ci-dessus assure un seul crédit par succès. */
    addCoins(a.bonus);
    if(a.cafesBonus) addCafes(a.cafesBonus);
    /* File de célébration (dédupe par id) — la modale ne crédite plus rien. */
    setPendingAchievements(q => q.some(x => x.id === id) ? q : [...q, a]);
    /* Achievement = moment fort, haptic success (3 pulses) pour
       souligner le déblocage. Jackpot a son propre pattern à part. */
    haptic(id === 'jackpot' ? 'jackpot' : 'success');
  },[addCoins, addCafes]);

  useEffect(()=>{
    if(showOnboarding) return;
    /* Mode admin → aucun succès attribué (compte de test). */
    if(isAdminName(userName)) return;

    /* "end_game" — apex absolu. Conditions très exigeantes pour vraiment
       le mériter :
       1. Niveau 25 (palier endgame final → prestige)
       2. Tous les autres succès visibles gagnés
       3. Boutique 100 % complétée (tous items en 🍪, hors limited)
       4. Les 3 badges secrets débloqués
       5. Les 10 récompenses événements débloquées (3 thèmes + 7 badges
          édition limitée) */
    const endGamePrereqIds = ACHIEVEMENTS
      .filter(a => a.id !== 'end_game')
      .map(a => a.id);
    const allEndGameAchievementsDone = endGamePrereqIds.every(id => earnedAchievements.includes(id));

    const shopItemIds = REWARDS.filter(r => r.currency !== 'cafe' && !r.limited).map(r => r.id);
    const allShopOwned = shopItemIds.every(id => unlocked.includes(id));

    const secretBadgeIds = Object.values(SECRET_BADGES).map(b => b.id);
    const allSecretsOwned = secretBadgeIds.every(id => unlocked.includes(id));

    const eventThemeIds = REWARDS.filter(r => r.limited).map(r => r.id);
    const allEventsOwned = eventThemeIds.every(id => unlocked.includes(id));

    const endGameReady =
      level >= 25 &&
      allEndGameAchievementsDone &&
      allShopOwned &&
      allSecretsOwned &&
      allEventsOwned;

    const checks = [
      ['first_cookie',   totalEarned >= 1],
      ['first_purchase', unlocked.length >= 1],
      ['streak_3',       streak >= 3],
      ['streak_7',       streak >= 7],
      ['level_3',        level >= 3],
      ['level_6',        level >= 6],
      ['level_10',       level >= 10],
      ['level_15',       level >= 15],
      /* Seuil ×5 le 08/09/2026, comme le prix de l'action : à 500 🍪
         l'action, « investir 500 cookies » voulait dire en acheter UNE.
         Ceux qui l'ont déjà décroché le gardent (les succès obtenus ne
         se reprennent pas). */
      ['trader',         totalInvested >= 2500],
      ['end_game',       endGameReady],
    ];
    for(const [id,ok] of checks){
      if(ok && !earnedAchievements.includes(id)){ triggerAchievement(id); break; }
    }
  },[totalEarned, streak, clickRecord, unlocked, level, coins, totalInvested, showOnboarding, earnedAchievements, triggerAchievement, userName]);

  const collectAchievement = ()=>{
    if(pendingAchievements.length === 0) return;
    /* Le bonus a déjà été crédité au déclenchement (cf. triggerAchievement) —
       ce bouton ne fait que défiler la file et célébrer. */
    playSound('coin');
    setPendingAchievements(q => q.slice(1));
  };

  /* GAMES — `levelRequired` (PHASE 6A) :
     - Si `level < levelRequired` → carte verrouillée (cadenas, "Niveau X requis"), clic bloqué
     - On n'affiche que les jeux dont `levelRequired - level <= 1` : le joueur voit
       le prochain palier à débloquer (donne envie), pas tous les futurs jeux d'un coup.
     - `comingSoon:true` marque les jeux dont le code n'existe pas encore (PHASE 6B/6C/6D) :
       le clic reste bloqué même si le niveau est atteint, jusqu'à implémentation. */
  /* `emoji` (v1.30) : filigrane géant au fond de la carte dans l'onglet
     Jeux. Plusieurs jeux partagent la même icône lucide (Coffee pour
     pour/pyramid/flappy/catcher) — l'emoji leur redonne une identité
     propre au premier coup d'œil. */
  const GAMES = [
    { id:'checkin', Icon:Gift,              emoji:'🎁', title: t('games_list.checkin_title'),     desc: t('games_list.checkin_desc'),     reward: checkinReward.isJackpot ? t('games_list.checkin_reward_cf', { n: checkinReward.cafes }) : t('games_list.checkin_reward', { n: checkinReward.coins }), avail:canCheckin, color:'#C17F3C', levelRequired:1 },
    { id:'quiz',    Icon:Star,              emoji:'⭐', title: t('games_list.quiz_title'),         desc: t('games_list.quiz_desc'),         reward: t('games_list.quiz_reward'), avail:canQuiz, color:'#D4A017', levelRequired:1 },
    { id:'spin',    Icon:CircleDot,         emoji:'🎡', title: t('games_list.spin_title'),         desc: t('games_list.spin_desc', { left:spinsLeft, cap:spinsCap }),       reward: t('games_list.spin_reward', { cost: level>=8?20:10 }), avail:coins>=(level>=8?20:10) && spinsLeft > 0, color:'#4A2C17', levelRequired:1 },
    { id:'click',   Icon:MousePointerClick, emoji:'🍪', title: t('games_list.click_title'),        desc: t('games_list.click_desc'),       reward: t('games_list.click_reward'),  avail:coins>=5,    color:'#7D4E1F', levelRequired:1 },
    { id:'pour',    Icon:Coffee,            emoji:'☕', title: t('games_list.pour_title'),         desc: t('games_list.pour_desc'),     reward: t('games_list.pour_reward'),      avail:true,        color:'#5A3520', levelRequired:1 },
    { id:'memory',  Icon:LayoutGrid,        emoji:'🃏', title: t('games_list.memory_title'),       desc: t('games_list.memory_desc'),         reward: t('games_list.memory_reward'), avail:coins>=10, color:'#A0784E', levelRequired:2 },
    { id:'guess',   Icon:HelpCircle,        emoji:'🤔', title: t('games_list.guess_title'),        desc: level >= 10 ? t('games_list.guess_desc_7') : t('games_list.guess_desc_5'), reward: t('games_list.guess_reward'), avail:coins>=10,  color:'#8B5A2B', levelRequired:5 },
    { id:'reflex',  Icon:Timer,             emoji:'⚡', title: t('games_list.reflex_title'),       desc: t('games_list.reflex_desc'), reward: t('games_list.reflex_reward'), avail:coins>=5, color:'#D4A017', levelRequired:6 },
    { id:'pyramid', Icon:Coffee,            emoji:'🗼', title: t('games_list.pyramid_title'),      desc: t('games_list.pyramid_desc'),         reward: t('games_list.pyramid_reward'), avail:coins>=10, color:'#7D4E1F', levelRequired:8 },
    { id:'slot',    Icon:Dice5,             emoji:'🎰', title: t('games_list.slot_title'),         desc: t('games_list.slot_desc'),     reward: t('games_list.slot_reward'), avail:coins>=20, color:'#5C3614', levelRequired:10 },
    { id:'flappy',  Icon:Coffee,            emoji:'🐦', title: t('games_list.flappy_title'),       desc: t('games_list.flappy_desc'), reward: t('games_list.flappy_reward'), avail:coins>=10, color:'#C8945A', levelRequired:12 },
    { id:'catcher', Icon:Coffee,            emoji:'🥤', title: t('games_list.catcher_title'),      desc: t('games_list.catcher_desc'), reward: t('games_list.catcher_reward'), avail:coins>=10, color:'#B5793E', levelRequired:4 },
    { id:'rider',   Icon:Bike,              emoji:'🛞', title: t('games_list.rider_title'),        desc: t('games_list.rider_desc'), reward: t('games_list.rider_reward'), avail:coins>=10, color:'#8B5A2B', levelRequired:7 },
  /* Un jeu encore en chantier ne se montre qu'aux comptes admin — voir
     JEUX_EN_CHANTIER dans data/constants.js. Le filtre est ici, au plus
     près de la liste : c'est le seul endroit d'où part une partie. */
  ].filter(g => !JEUX_EN_CHANTIER.includes(g.id) || isAdminName(userName));

  const s = {
    /* 6 onglets depuis la v1.30 (ajout de Collection) : padding horizontal
       réduit à 4px et libellé en 9.5px pour que « Classement » tienne sans
       passer à la ligne, même sur un écran de 360 px. */
    pill:(active)=>({ padding:'10px 4px', borderRadius:16, flex:1, minWidth:0, display:'flex', flexDirection:'column', alignItems:'center', gap:3, transition:'all .2s', background:active?ESPRESSO:'transparent', color:active?'#fff':C.muted }),
    card:{ borderRadius:18, background:C.card, border:`1px solid ${C.border}`, boxShadow:'0 2px 8px rgba(0,0,0,.05)' },
    /* Pastille du pied de carte niveau (série, boosters actifs). Tout ce
       qui est « état en cours » y tient en une ligne, au lieu d'une carte
       pleine largeur chacun (v1.30). */
    homeTag:{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.18)', fontSize:11.5, fontWeight:800, color:'#fff', whiteSpace:'nowrap' },
    goldBtn:(disabled)=>({ padding:'13px 36px', borderRadius:20, fontSize:14, fontWeight:700, background:disabled?C.card:GOLD, color:disabled?C.muted:'#fff', border:`2px solid ${disabled?C.border:'transparent'}`, boxShadow:disabled?'none':'0 4px 16px rgba(212,160,23,.4)', cursor:disabled?'not-allowed':'pointer' }),
  };

  /* MAINTENANCE LIVE — court-circuit après le grace period 30s. Les
     bypass userCodes (PJ3-56A) passent à travers. Le flag code-driven
     MAINTENANCE_MODE est traité en amont (pré-hooks). */
  if(liveMaintenanceActive && !isBypassedFromMaintenance(userCode)){
    return (
      <MaintenanceScreen
        title={systemStatus.maintenance_title}
        subtitle={systemStatus.maintenance_subtitle}
      />
    );
  }

  /* Pendant le tuto, on bloque TOUS les pop-ups auto pour ne pas masquer
     les bulles. Couvre : NewVersion, Maintenance, ForceUpdate, FriendNotif,
     Announcement, CommunityMilestone, Event, WeeklyChamp, Sanction, Payment,
     CafesReset, SecretBadge, LevelUp, Achievement, MarketRefund, BossEvent,
     coffrets. Les overlays user-triggered (Settings, Profile…) restent
     ouvrables mais c'est volontaire car ils ne pop pas tout seuls.
     Les pop-ups bloqués réapparaîtront naturellement à la fin du tuto
     (les états sont conservés, seul le rendu est gaté). */
  const inTutorial = tutorialStep > 0;

  return (
    <>
    {!inTutorial && (
      <AnnouncementModal
        message={systemStatus.banner_message}
        severity={systemStatus.banner_severity}
      />
    )}
    {!inTutorial && milestoneReward && (
      <CommunityMilestoneModal
        threshold={milestoneReward.threshold}
        cookieReward={milestoneReward.cookieReward}
        cafeReward={milestoneReward.cafeReward}
        onClose={() => setMilestoneReward(null)}
        C={C}
      />
    )}
    {!inTutorial && openingBox && (
      <BoxOpenAnimation
        boxName={openingBox.name}
        boxEmoji={openingBox.emoji}
        reward={openingBox.reward}
        onCollect={() => setOpeningBox(null)}
      />
    )}
    {!inTutorial && openingChest && (
      <ChestOpenAnimation
        chest={openingChest.chest}
        items={openingChest.items}
        onCollect={() => setOpeningChest(null)}
      />
    )}
    <div style={{
      minHeight:'100svh', background:C.bg,
      display:'flex', flexDirection:'column', maxWidth:430, margin:'0 auto',
      fontFamily:'system-ui,-apple-system,sans-serif', color:C.text,
      transition:'background .4s, color .4s',
      position:'relative', overflow:'hidden'
    }}>
      {/* Décor du Thème Pâte de Cookie — cookies décoratifs qui tournent
          en boucle (scale petit→gros + rotation 360°). z-index 0 + fixed
          pour rester en arrière-plan sans bloquer les interactions. */}
      {themeSparkles && (
        <div aria-hidden style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0 }}>
          {[
            { top:'6%',  left:'14%', delay:0,   size:14, char:'✦', col:'#E8D5FF' },
            { top:'18%', left:'80%', delay:1.4, size:12, char:'✦', col:'#FFE89A' },
            { top:'32%', left:'24%', delay:.5,  size:10, char:'✦', col:'#A8D5FF' },
            { top:'48%', left:'8%',  delay:.7,  size:14, char:'✦', col:'#E8D5FF' },
            { top:'58%', left:'72%', delay:2.4, size:11, char:'✦', col:'#FFE89A' },
            { top:'72%', left:'88%', delay:2.1, size:14, char:'✦', col:'#A8D5FF' },
            { top:'86%', left:'18%', delay:1.0, size:12, char:'✦', col:'#E8D5FF' },
            { top:'90%', left:'62%', delay:1.7, size:10, char:'✦', col:'#FFE89A' },
          ].map((p,i)=>(
            <span
              key={i}
              className="float-anim"
              style={{
                position:'absolute', top:p.top, left:p.left,
                fontSize:p.size, animationDelay:`${p.delay}s`,
                color:p.col, opacity:.85,
                filter:`drop-shadow(0 0 6px ${p.col})`,
                fontWeight:900, lineHeight:1
              }}
            >{p.char}</span>
          ))}
        </div>
      )}

      <style>{GLOBAL_CSS}</style>

      {/* HEADER — la zone gauche (avatar + titre) est protégée du
          rétrécissement (flexShrink:0) pour que "CookiMiner" reste
          toujours lisible. Le sous-label "BONJOUR XYZ" peut être
          ellipsé s'il est trop long ; le titre lui ne l'est plus.
          La zone droite (pills cafés/cookies) reste à largeur naturelle
          grâce au format compact (fmtCompact) appliqué aux nombres. */}
      <header style={{ padding:'18px 16px 10px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0, gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1 }}>
          {userName && userAvatar !== null && (
            <button onClick={()=>{ playSound('modal'); setShowProfile(true); }} aria-label="Profil" style={{ padding:0, background:'transparent', border:'none', flexShrink:0 }}>
              <AvatarFigure value={userAvatar} size={42} />
            </button>
          )}
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{userName ? `BONJOUR ${userName.toUpperCase()}` : 'BIENVENUE'}</div>
            {/* Le titre ouvre « À propos » (v1.30). Taper le logo pour voir
                la version et les nouveautés est un réflexe répandu, et
                l'écran était enterré en 3e ligne d'une section de
                Paramètres alors qu'il porte le changelog. */}
            <button
              onClick={openAbout}
              aria-label={t('settings.about_title')}
              style={{
                background:'transparent', border:'none', padding:0,
                display:'block', textAlign:'left', cursor:'pointer', font:'inherit',
                position:'relative',
              }}
            >
              <div style={{
                fontSize:22, fontWeight:900,
                /* theme_grains : haut du gradient = crème pâle, donc C.text
                   (calé sur les cards sombres) devient illisible. On force
                   un brun espresso foncé qui passe sur le crème ET reste
                   lisible quand on scroll vers le bas. */
                color: activeTheme === 'theme_grains' ? '#3D1808' : C.text,
                fontStyle:'italic', letterSpacing:'-0.5px', whiteSpace:'nowrap',
                display:'inline-block',
              }}>
                Cooki<span style={{ color:'#C17F3C' }}>Miner</span>
                {/* Point doré tant que le changelog de cette version n'a
                    pas été ouvert. Pas de texte : le logo doit rester un
                    logo, le point suffit à dire « il y a du neuf ici ». */}
                {aboutIsNew && (
                  <span className="pulse-ring" style={{
                    display:'inline-block', width:7, height:7, borderRadius:'50%',
                    background:'#D4A017', marginLeft:5, verticalAlign:'super',
                  }} />
                )}
              </div>
            </button>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          <button onClick={()=>{ playSound('modal'); setShowSettings(true); }} aria-label="Paramètres" style={{ position:'relative', width:34, height:34, borderRadius:11, background:C.card, border:`1px solid ${C.border}`, color:C.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Settings size={15} />
            {/* Pastille sentinelle — admins seulement. Discrète (6 px, pas
                de chiffre) : elle dit qu'il y a quelque chose à lire, pas
                qu'il faut paniquer. Teinte moka, jamais rouge. */}
            {(alertesSentinelle + signalementsAttente) > 0 && (
              <span className="pulse-ring" aria-hidden style={{
                position:'absolute', top:-2, right:-2, width:8, height:8, borderRadius:'50%',
                background:'#8B5A2B', border:`2px solid ${C.bg}`,
              }} />
            )}
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:5, background:ESPRESSO, borderRadius:20, padding:'8px 12px', border:'1.5px solid rgba(212,160,23,.5)', boxShadow:'0 4px 12px rgba(74,44,23,.4)' }} title={`${cafes} cafés`}>
            <Coffee size={14} color="#F0C050" />
            <span key={cafes} className="coin-pop" style={{ fontWeight:800, fontSize:15, color:'#F0C050', display:'inline-block', minWidth:10, textAlign:'center' }}>{fmtCompact(cafes)}</span>
          </div>
          <div id="cookie-counter" style={{ display:'flex', alignItems:'center', gap:6, background:GOLD, borderRadius:20, padding:'8px 14px', boxShadow:'0 4px 12px rgba(212,160,23,.35)' }} className="gradient-anim" title={`${coins} cookies`}>
            <Cookie size={16} color="#fff" />
            <span key={coins} className="coin-pop" style={{ fontWeight:800, fontSize:18, color:'#fff', display:'inline-block', minWidth:14, textAlign:'center' }}>{fmtCompact(coins)}</span>
          </div>
        </div>
      </header>

      {/* CONTENT — swipe horizontal navigue dans TAB_ORDER.
          Rendu mono-tab simple : un seul tab dans le DOM à la fois.
          À chaque changement, key={tab} force le remount → la classe
          tab-slide-in-{right,left} replay l'anim sur le nouveau tab.
          L'ancien tab disparaît instant (pas d'animation de sortie). */}
      <div
        ref={swipe.ref}
        {...swipe.handlers}
        /* minHeight:0 → fix iOS Safari où un enfant flex:1 + overflow:auto
           grandit à la hauteur du contenu au lieu d'être capé. */
        style={{ flex:1, minHeight:0, overflowY:'auto', overflowX:'hidden', padding:'0 16px', paddingBottom:104, willChange:'transform' }}
      >
        <div
          key={tab}
          className={slideDir === 'next' ? 'tab-slide-in-right' : slideDir === 'prev' ? 'tab-slide-in-left' : ''}
        >

        {/* ── ACCUEIL ── */}
        {tab==='accueil' && (
          <div className="su">
            {/* Bannière événement spécial (PHASE 6E) — visible en
                phase 'waiting' (timer mystère) et en phase 'active'
                (titre + temps restant + essais). */}
            {activeEvent && !bossOngoing && (
              <EventBanner
                event={activeEvent}
                onView={()=>setShowEventModal(true)}
              />
            )}
            {/* Bannière boss communautaire — visible uniquement quand
                un Gâteau Géant est ACTIF (≥ niv 3). Discovery UX : on
                reste vague (menace + temps restant), pas de mécanique
                détaillée — le détail est dans l'overlay au tap. */}
            {bossOngoing && level >= BOSS_LEVEL_MIN && (
              <button
                onClick={()=>{ playSound('modal'); setShowBoss(true); }}
                className="boss-banner"
                style={{
                  width:'100%', background:'linear-gradient(135deg,#7A4A28,#C17F3C)',
                  color:'#fff', padding:'12px 14px', borderRadius:14, marginBottom:14,
                  display:'flex', justifyContent:'space-between', alignItems:'center', gap:10,
                  border:'none', cursor:'pointer', textAlign:'left',
                  boxShadow:'0 6px 18px rgba(122,74,40,.4)',
                }}
              >
                {(() => {
                  const announcing = communityBoss.startsAt && Date.now() < communityBoss.startsAt;
                  const left = announcing
                    ? Math.max(0, communityBoss.startsAt - Date.now())
                    : Math.max(0, (communityBoss.endsAt || 0) - Date.now());
                  return (
                    <>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:800, letterSpacing:.3, marginBottom:2 }}>
                          {announcing
                            ? '⚠️ Le Gâteau Mangeur de Cookies arrive !'
                            : '🍪 Le Gâteau Mangeur de Cookies dévore vos cookies !'}
                        </div>
                        <div style={{ fontSize:11, opacity:.92, fontWeight:600 }}>
                          {announcing
                            ? `⏳ Attaquable dans ${formatBossTimeLeft(left)}`
                            : `⏱️ ${formatBossTimeLeft(left)} · tous ensemble`}
                        </div>
                      </div>
                      <span style={{ flexShrink:0, padding:'6px 12px', borderRadius:10, background:'rgba(255,255,255,.22)', color:'#fff', fontSize:11, fontWeight:800, border:'1px solid rgba(255,255,255,.35)' }}>
                        {announcing ? 'Voir →' : 'Aider →'}
                      </span>
                    </>
                  );
                })()}
              </button>
            )}
            {/* Level card */}
            <button id="card-niveau" onClick={()=>{ playSound('modal'); setShowLevels(true); }} style={{ width:'100%', textAlign:'left', display:'block', borderRadius:24, padding:20, marginBottom:14, background:ESPRESSO, boxShadow:'0 8px 24px rgba(74,44,23,.35)', position:'relative', overflow:'hidden', cursor:'pointer' }}>
              {/* Bulle décorative qui respire (v1.30) — elle était figée. */}
              <div className="level-bubble" aria-hidden style={{ position:'absolute', top:-25, right:-25, width:88, height:88, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />
              {/* Lueur chaude qui enfle et retombe (7 s) — la lumière qui
                  tombe sur le brun, avant même le reflet. */}
              <div className="level-warm" aria-hidden />
              {/* Reflet qui balaie la carte toutes les 5 s : c'est ce qui
                  fait passer le bloc d'« aplat sombre » à « objet qui
                  accroche la lumière ». */}
              <div className="level-sheen" aria-hidden />
              {/* Bannière Cookies premium — overlay décoratif (floating cookies) */}
              {activeBanner === 'banner_cookies' && (
                <div aria-hidden style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
                  {[
                    { top:'6%',  left:'12%', size:32, delay:0,    rot:-12 },
                    { top:'60%', left:'6%',  size:26, delay:1.2,  rot:8   },
                    { top:'24%', left:'82%', size:30, delay:.5,   rot:18  },
                    { top:'74%', left:'40%', size:24, delay:2.1,  rot:-6  },
                    { top:'8%',  left:'52%', size:28, delay:1.7,  rot:14  },
                    { top:'48%', left:'68%', size:30, delay:.9,   rot:-20 },
                  ].map((c,i)=>(
                    <span
                      key={i}
                      className="float-anim"
                      style={{
                        position:'absolute', top:c.top, left:c.left,
                        fontSize:c.size, opacity:.22,
                        transform:`rotate(${c.rot}deg)`,
                        animationDelay:`${c.delay}s`,
                        filter:'drop-shadow(0 1px 2px rgba(0,0,0,.3))',
                      }}
                    >🍪</span>
                  ))}
                </div>
              )}
              <div style={{ position:'absolute', top:14, right:16, fontSize:10, color:'rgba(255,255,255,.45)', display:'flex', alignItems:'center', gap:3, fontWeight:600 }}>
                {t('home.see_all')} <ChevronLeft size={11} style={{ transform:'rotate(180deg)' }} />
              </div>
              {/* Médaille du palier (v1.30) — même signature que les
                  bannières de LevelsModal, dans la teinte de la tranche de
                  5 niveaux : les deux écrans parlent la même langue, et
                  le niveau devient une décoration qu'on porte plutôt
                  qu'une ligne de texte. */}
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:12, marginTop:14 }}>
                {/* Le biscuit porte le numéro (cf. LevelCookieMedal) : une
                    bille brillante avec un chiffre dessus ressemblait à
                    n'importe quel jeu, un cookie nous appartient. `glint`
                    n'est activé qu'ici — dans la liste des 25 paliers, 25
                    éclats simultanés feraient une guirlande. */}
                <LevelCookieMedal
                  level={level}
                  tier={levelTier(level)}
                  variant="earned"
                  size={54}
                  glint
                  C={C}
                />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:2, marginBottom:2, display:'flex', alignItems:'center', gap:6 }}>
                    {t('home.level_uppercase')}
                    {prestigeLevel > 0 && (
                      <span title={`Prestige ${prestigeLevel} · multiplicateur x${(1 + prestigeLevel * 0.1).toFixed(1)}`} style={{ fontSize:11, fontWeight:800, color:'#FFE066', letterSpacing:.5 }}>
                        {prestigeLevel <= 5 ? '👑'.repeat(prestigeLevel) : `👑×${prestigeLevel}`}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:19, fontWeight:800, color:'#fff', lineHeight:1.15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {localizedLevelName(level) || LEVEL_NAMES[level]}
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.6)' }}>{t('profile.stat_total')}</div>
                  <div style={{ fontSize:19, fontWeight:800, color:'#fff' }}>{totalEarned} 🍪</div>
                </div>
              </div>
              {/* Le libellé « Expérience » a sauté : une barre sous une carte
                  de niveau ne peut pas être autre chose. On garde le chiffre. */}
              <div style={{ textAlign:'right', fontSize:10, color:'rgba(255,255,255,.6)', marginBottom:5 }}>
                {xp}/{xpReq} XP
              </div>
              <div style={{ height:8, borderRadius:4, background:'rgba(255,255,255,.18)', overflow:'hidden', position:'relative' }}>
                <div style={{ height:'100%', borderRadius:4, width:`${xpPct}%`, background:'rgba(255,255,255,.85)', transition:'width .8s cubic-bezier(.36,.07,.19,.97)', position:'relative', overflow:'hidden' }}>
                  <div className="shimmer-bar" />
                </div>
              </div>

              {/* Pied de carte : tout l'« état en cours » sur UNE ligne —
                  série, boosters actifs, badges. Chacun avait sa carte
                  pleine largeur avant la v1.30 (jusqu'à 3 blocs empilés). */}
              {(() => {
                const now = Date.now();
                const boostActive = boostUntil && now < boostUntil;
                const leftMin = boostActive ? Math.floor((boostUntil - now) / 60000) : 0;
                const boostLabel = leftMin >= 60
                  ? `${Math.floor(leftMin / 60)}h${String(leftMin % 60).padStart(2,'0')}`
                  : `${leftMin}min`;
                return (
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12, flexWrap:'wrap' }}>
                    <span style={s.homeTag}>
                      <Flame size={12} color="#E8A060" />
                      {streak} {t('home.streak_days', { s: streak > 1 ? 's' : '' })}
                    </span>
                    {boostActive && (
                      <span style={{ ...s.homeTag, background:'linear-gradient(135deg,#D4A017,#C17F3C)', border:'1px solid rgba(255,255,255,.28)' }}>
                        ⚡ ×2 · {boostLabel}
                      </span>
                    )}
                    {nextGameDoubler && (
                      <span style={{ ...s.homeTag, background:'rgba(240,192,80,.18)', border:'1px solid rgba(240,192,80,.45)', color:'#F0C050' }}>
                        🎯 Doubler armé
                      </span>
                    )}
                    {badges.length > 0 && (
                      <span style={{ display:'flex', gap:6 }}>
                        {badges.slice(-6).map(b=><span key={b.id} title={b.name} style={{ fontSize:18 }}>{b.emoji}</span>)}
                      </span>
                    )}
                  </div>
                );
              })()}
            </button>

            {/* Carte Prestige — visible quand niveau 25 atteint avec
                60000 XP cumulés. Renaître = repartir lvl 1 avec un
                multiplicateur permanent. */}
            {level >= 25 && xp >= 60000 && (
              <button
                onClick={()=>{ playSound('modal'); setShowPrestigeModal(true); }}
                className="su"
                style={{
                  width:'100%', textAlign:'left', display:'flex', alignItems:'center', gap:14,
                  padding:'14px 16px', borderRadius:18, marginBottom:14,
                  background:'linear-gradient(135deg, #4A2C17, #1F0E04)',
                  border:'2px solid #D4A017',
                  boxShadow:'0 4px 18px rgba(212,160,23,.4), 0 0 24px rgba(212,160,23,.2)',
                  cursor:'pointer', color:'#fff',
                }}
              >
                <div className="float-anim" style={{ fontSize:34, lineHeight:1 }}>🌟</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:900, color:'#FFE066', letterSpacing:1.5, textTransform:'uppercase', marginBottom:3 }}>
                    Renaissance disponible
                  </div>
                  {/* Une seule ligne : le détail (ce qu'on garde, ce qu'on perd)
                      est dans la modale de confirmation, pas sur l'Accueil. */}
                  <div style={{ fontSize:12.5, fontWeight:700, color:'#fff', lineHeight:1.4 }}>
                    Repartir niveau 1 — gains ×{(1 + (prestigeLevel + 1) * 0.1).toFixed(1)} à vie
                  </div>
                </div>
                <ChevronLeft size={18} color="#F0C050" style={{ transform:'rotate(180deg)' }} />
              </button>
            )}

            {/* Games */}
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>TON CAFÉ DU JOUR</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {GAMES.filter(g => g.id === 'checkin' || g.id === 'quiz').map((g,i)=>(
                <button key={g.id} id={g.id === 'checkin' ? 'card-checkin' : undefined} onClick={()=>{ playSound('modal'); setGameView(g.id); }} className={`su stagger-${i+1}`} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', ...s.card, textAlign:'left' }}>
                  <div className={g.avail?'float-anim':''} style={{ width:46, height:46, borderRadius:13, background:g.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:g.avail?'0 4px 12px rgba(0,0,0,.15)':'none' }}>
                    <g.Icon size={22} color="#fff" />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                      <span style={{ fontWeight:700, fontSize:14 }}>{g.title}</span>
                      {g.avail && <span className="pulse-ring" style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:GOLD, color:'#fff' }}>{t('games_list.available')}</span>}
                    </div>
                    <div style={{ fontSize:11, color:C.muted }}>{g.desc} · {g.reward}</div>
                  </div>
                  <ChevronLeft size={16} color={C.muted} style={{ transform:'rotate(180deg)' }} />
                </button>
              ))}
            </div>

            {/* Le cours du $CKM. Le marché est l'écran le plus vivant de
                l'app et le moins visité : il fallait l'ouvrir pour savoir
                s'il s'y passait quelque chose, donc personne n'y allait,
                donc il ne s'y passait rien. La carte casse la boucle — le
                cours vient au joueur. Elle s'efface d'elle-même sous le
                niveau 3, où le marché n'existe pas encore.

                Remontée AU-DESSUS des succès le 09/09 : en pied de page,
                sous la carte des succès et juste avant le lien Discord,
                elle se lisait comme un pied de page justement — la zone
                où l'œil ne s'arrête plus. Un cours qui bouge n'a rien à
                faire dans les mentions légales de l'écran. */}
            <MarketTeaser level={level} onOpen={() => { playSound('modal'); setTab('marche'); }} C={C} />

            {/* Mes Succès — carte compacte (v1.30). La grille complète des
                22 succès occupait la moitié de l'Accueil (+ un « Voir plus »
                qui la doublait) ; elle vit maintenant dans
                AchievementsOverlay, ouvert au tap. */}
            {(() => {
              const totalA = ACHIEVEMENTS.length;
              const doneA  = earnedAchievements.length;
              const pctA   = totalA > 0 ? Math.round((doneA / totalA) * 100) : 0;
              /* Aperçu : les derniers succès obtenus, dans l'ordre de la
                 liste. 6 max pour tenir sur une ligne sans wrap. */
              const preview = ACHIEVEMENTS.filter(a => earnedAchievements.includes(a.id)).slice(-6);
              return (
                <button
                  onClick={()=>{ playSound('modal'); setShowAllAchievements(true); }}
                  style={{
                    width:'100%', marginTop:20, padding:'14px 16px', borderRadius:18,
                    ...s.card, textAlign:'left', cursor:'pointer', display:'block',
                  }}
                >
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:9 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>
                      {t('achievements.title')} 🏆
                    </span>
                    <span style={{ fontSize:12, fontWeight:800, color:'#D4A017' }}>
                      {doneA} / {totalA}
                    </span>
                  </div>

                  <div style={{ height:6, background:C.card2, borderRadius:3, overflow:'hidden', marginBottom:10 }}>
                    <div style={{
                      width:`${pctA}%`, height:'100%',
                      background:'linear-gradient(90deg, #D4A017, #F0C050)',
                      transition:'width .5s ease-out',
                    }} />
                  </div>

                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                    <span style={{ display:'flex', gap:5, minWidth:0, overflow:'hidden' }}>
                      {preview.length > 0
                        ? preview.map(a => <span key={a.id} style={{ fontSize:19, lineHeight:1 }}>{a.emoji}</span>)
                        : <span style={{ fontSize:11.5, color:C.muted, fontStyle:'italic' }}>{t('achievements.none_yet')}</span>}
                    </span>
                    <span style={{ fontSize:12, fontWeight:700, color:'#D4A017', flexShrink:0 }}>
                      {t('achievements.see_all')} →
                    </span>
                  </div>
                </button>
              );
            })()}

            {/* Bandeau Discord — bugs & suggestions communauté.
                Clic = ouvre invitation Discord dans un nouvel onglet. */}
            {/* v1.30 : réduit à une ligne discrète. C'était une carte
                gradient de 42px de haut sur l'écran le plus vu de l'app,
                alors que l'entrée existe aussi dans Paramètres. */}
            <a
              href="https://discord.gg/EMDQXDBV39"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playSound('modal')}
              style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                marginTop:16, padding:'11px 14px', borderRadius:14,
                background:'transparent',
                border:`1px dashed ${C.border}`,
                textDecoration:'none', color:C.muted,
                fontSize:12, fontWeight:700, cursor:'pointer',
              }}
            >
              💬 <span>{t('home.discord_line')}</span>
              <span style={{ color:'#D4A017', fontWeight:900 }}>↗</span>
            </a>

          </div>
        )}

        {/* ── JEUX ── */}
        {tab==='jeux' && (
          <div className="su">
            {/* Entrée des Duels — masquée en v1.30 (cf. DUELS_VISIBLE en
                tête de fichier). Le reste de la fonctionnalité est intact,
                seul ce bouton la rendait atteignable. */}
            {DUELS_VISIBLE && (
            <button
              onClick={startMatchmaking}
              className="tap-pop"
              style={{ width:'100%', marginBottom:20, padding:'16px 17px', borderRadius:20, border:'1.5px solid #D4A017', background:'linear-gradient(135deg, rgba(212,160,23,.20), rgba(193,127,60,.08))', boxShadow:'0 4px 16px rgba(212,160,23,.18)', display:'flex', alignItems:'center', gap:13, cursor:'pointer', textAlign:'left' }}
            >
              <span style={{ fontSize:24 }}>⚔️</span>
              <span style={{ flex:1 }}>
                <span style={{ display:'block', fontSize:14.5, fontWeight:900, color:C.text }}>Trouver un duel</span>
                <span style={{ display:'block', fontSize:11, color:C.muted, marginTop:2 }}>Un vrai adversaire s'il y en a un, sinon un bot</span>
              </span>
              <span style={{ fontSize:18, color:'#D4A017', fontWeight:900 }}>›</span>
            </button>
            )}
            {/* v1.30 — chaque jeu tenait sur DEUX blocs : l'en-tête coloré
                plus une barre blanche en pied qui répétait « ● Disponible »
                et « Jouer → » sur une carte évidemment tapable. Dix jeux =
                dix barres inutiles et ~1200 px à faire défiler.
                Un seul bloc désormais, et les jeux verrouillés passent en
                rangée compacte — on ne peut pas y jouer, ils n'ont pas
                besoin d'une carte pleine taille. */}
            {(() => {
              const list = GAMES.filter(g =>
                g.id !== 'checkin' && g.id !== 'quiz'
                && (g.levelRequired - level <= 1 || unlockedGames.includes(g.id))
              );
              /* Override force-unlock par code promo (cf. unlockedGames) :
                 si l'id est dans unlockedGames, on ignore le niveau requis. */
              const isLocked = (g) => level < g.levelRequired && !unlockedGames.includes(g.id);
              const playable = list.filter(g => !isLocked(g));
              const locked   = list.filter(isLocked);

              return (<>
                <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:14, paddingTop:6 }}>
                  {t('games_list.section_pick')}
                </div>

                {playable.map((g, i) => {
                  const comingSoon = !!g.comingSoon;
                  return (
                    /* Deux éléments, et c'est indispensable : `.su` utilise
                       animation-fill-mode:both, donc l'élément GARDE le
                       transform de slideUp appliqué par l'animation une fois
                       celle-ci finie — et une animation l'emporte sur une
                       déclaration normale. Sur le même nœud, ni :active ni
                       .game-pop ne pouvaient s'appliquer : la carte ne
                       réagissait pas au doigt. L'entrée en cascade vit donc
                       sur le wrapper, le retour tactile sur le bouton. */
                    <div key={g.id} className={`su stagger-${(i % 4) + 1}`} style={{ marginBottom:14 }}>
                    <button
                      onClick={comingSoon ? undefined : ()=>launchGame(g.id)}
                      disabled={comingSoon}
                      className={`game-card${poppingGame === g.id ? ' game-pop' : ''}`}
                      style={{
                        width:'100%', borderRadius:20,
                        padding:'16px 17px',
                        /* Couleur du jeu + voile clair→sombre : la teinte plate
                           rendait les 10 cartes ternes et interchangeables. */
                        backgroundColor:g.color,
                        backgroundImage:'linear-gradient(145deg, rgba(255,255,255,.16), rgba(0,0,0,.24))',
                        border:'1px solid rgba(255,255,255,.12)',
                        boxShadow:'0 6px 20px rgba(0,0,0,.16)',
                        display:'flex', alignItems:'center', gap:14,
                        textAlign:'left', position:'relative', overflow:'hidden',
                        cursor: comingSoon ? 'not-allowed' : 'pointer',
                        /* Pas assez de cookies / plus de parties : la carte
                           s'estompe. Pas de texte — le jeu l'explique à
                           l'ouverture, et l'écrire 10 fois serait du bruit. */
                        opacity: comingSoon ? .6 : (g.avail ? 1 : .72),
                      }}
                    >
                      {/* Halo à gauche, derrière l'icône : donne du volume
                          sans concurrencer le filigrane de droite. */}
                      <div aria-hidden style={{
                        position:'absolute', top:-38, left:-28,
                        width:110, height:110, borderRadius:'50%',
                        background:'rgba(255,255,255,.08)', pointerEvents:'none',
                      }} />

                      {/* Filigrane géant — l'identité du jeu. Quatre jeux
                          partagent l'icône Coffee ; débordant et incliné,
                          l'emoji les distingue immédiatement. La pastille de
                          récompense a un fond opaque, elle passe par-dessus. */}
                      <div aria-hidden className="game-emoji" style={{
                        position:'absolute', right:-14, bottom:-24,
                        fontSize:82, lineHeight:1, opacity:.15,
                        transform:'rotate(-12deg)', pointerEvents:'none',
                        filter:'drop-shadow(0 2px 6px rgba(0,0,0,.35))',
                        /* Déphasage par carte : sans ça les 10 emojis
                           montent et descendent au même rythme. */
                        animationDelay:`${(i % 5) * 0.55}s`,
                      }}>{g.emoji}</div>

                      <div className={g.avail && !comingSoon ? 'float-anim' : ''} style={{
                        width:50, height:50, borderRadius:15, flexShrink:0,
                        background:'rgba(255,255,255,.18)',
                        border:'1px solid rgba(255,255,255,.22)',
                        boxShadow:'inset 0 1px 0 rgba(255,255,255,.28), 0 3px 8px rgba(0,0,0,.16)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        position:'relative',
                      }}>
                        <g.Icon size={24} color="#fff" />
                      </div>

                      <div style={{ flex:1, minWidth:0, position:'relative' }}>
                        <div style={{ fontSize:15.5, fontWeight:800, color:'#fff', display:'flex', alignItems:'center', gap:7, letterSpacing:'-.2px' }}>
                          {g.title}
                          {g.avail && !comingSoon && (
                            <span className="live-pulse" style={{ width:6, height:6, borderRadius:'50%', background:'#fff', display:'inline-block', flexShrink:0 }} />
                          )}
                        </div>
                        <div style={{ fontSize:11.5, color:'rgba(255,255,255,.74)', marginTop:3, lineHeight:1.35 }}>
                          {comingSoon ? '✨ Bientôt disponible' : g.desc}
                        </div>
                      </div>

                      {/* Récompense en pastille : détachée du fond, elle se lit
                          d'un coup d'œil au lieu de se fondre dans la couleur. */}
                      <div style={{
                        flexShrink:0, maxWidth:'34%', position:'relative',
                        padding:'7px 10px', borderRadius:12,
                        background:'rgba(0,0,0,.22)',
                        border:'1px solid rgba(255,255,255,.14)',
                        textAlign:'right', fontSize:10.5, fontWeight:700,
                        color:'rgba(255,255,255,.95)', lineHeight:1.35,
                      }}>
                        {g.reward}
                      </div>
                    </button>
                    </div>
                  );
                })}

                {locked.length > 0 && (<>
                  <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, margin:'22px 0 12px' }}>
                    {t('games_list.section_locked')}
                  </div>
                  {locked.map(g => (
                    <div key={g.id} style={{
                      display:'flex', alignItems:'center', gap:11,
                      padding:'12px 14px', borderRadius:14, marginBottom:10,
                      background:C.card, border:`1px dashed ${C.border}`,
                    }}>
                      <Lock size={14} color={C.muted} />
                      <span style={{ flex:1, minWidth:0, fontSize:12.5, fontWeight:700, color:C.muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {g.title}
                      </span>
                      <span style={{ flexShrink:0, fontSize:11, fontWeight:800, color:'#D4A017' }}>
                        {t('profile.level_n', { n: g.levelRequired })}
                      </span>
                    </div>
                  ))}
                </>)}
              </>);
            })()}
          </div>
        )}

        {/* ── CLASSEMENT ── */}
          {tab==='classement' && (
            <ClassementTab
              userCode={userCode}
              userName={userName}
              userAvatar={userAvatar}
              earnedAchievements={earnedAchievements}
              activeTitle={activeTitle}
              onOpenProfile={()=>{ playSound('modal'); setShowProfile(true); }}
              /* `isCrown` était codé en dur à true : seule la ligne n°1
                 pouvait s'ouvrir. Maintenant que tout le classement est
                 cliquable, le rang doit voyager avec le code — sinon on
                 couronne le 27e comme le premier. */
              onOpenUserProfile={(code, estPremier)=>{ playSound('modal'); openUserProfile(code, !!estPremier); }}
              C={C}
            />
          )}

          {/* ── MARCHÉ ── (online via Supabase, BRIEF_MARCHE_ONLINE) */}
          {tab==='marche' && (
            level >= 3 ? (
              <MarketTab
                userCode={userCode}
                coins={coins}
                addCoins={addCoins}
                tradingDisabled={isAdminName(userName)}
                bulkTradePasses={bulkTradePasses || 0}
                onConsumeBulkPass={() => setBulkTradePasses(n => Math.max(0, (n || 0) - 1))}
                onTradeComplete={(result)=>{
                  if(result.type === 'buy'){
                    /* L'achievement 'trader' attend totalInvested >= 2 500 cookies */
                    setTotalInvested(t => t + result.cost);
                  } else if(result.type === 'sell'){
                    /* Le badge secret 'investisseur' attend marketRealized >= 1000 */
                    const profit = Math.max(0, Math.round(result.profit || 0));
                    if(profit > 0) setMarketRealized(r => r + profit);
                    /* Event 'market_profit' : succès si plus-value en 1 vente >= 100 🍪 */
                    checkEventChallenge('market_profit', profit);
                  }
                }}
                C={C}
              />
            ) : (
              <MarketLocked level={level} xp={xp} xpReq={xpReq} C={C} />
            )
          )}

          {/* ── MA COLLECTION ── onglet à part entière (v1.30). Décision
              de Cookithan : surtout PAS dans la boutique — acheter et équiper
              sont deux gestes différents. */}
          {tab==='collection' && (
            <CollectionContent
              unlocked={unlocked}
              activeTheme={activeTheme}   setActiveTheme={setActiveTheme}
              activeBanner={activeBanner} setActiveBanner={setActiveBanner}
              activeSkin={activeSkin}     setActiveSkin={setActiveSkin}
              activeTitle={activeTitle}   setActiveTitle={setActiveTitle}
              userAvatar={userAvatar}     setUserAvatar={setUserAvatar}
              gameThemes={gameThemes}     setGameThemes={setGameThemes}
              userName={userName} level={level} prestigeLevel={prestigeLevel}
              earnedAchievements={earnedAchievements}
              onOpenShop={()=>{ playSound('tab'); setBoutiqueMode('shop'); goToTab('boutique'); }}
              C={C}
            />
          )}

          {/* ── BOUTIQUE ── */}
          {tab==='boutique' && (
            <BoutiqueTab
              coins={coins} cafes={cafes} unlocked={unlocked} level={level} onUnlock={unlockReward}
              mode={boutiqueMode} setMode={setBoutiqueMode}
              spinsLeft={spinsLeft}       slotPlaysLeft={slotPlaysLeft}
              userCode={userCode}
              vipPurchasesToday={vipPurchasesToday}
              onOpenCollection={()=>{ playSound('tab'); goToTab('collection'); }}
              C={C}
            />
          )}
        </div>
      </div>

      {/* NAV */}
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, padding:'0 16px 16px', zIndex:40 }}>
        <div style={{ background:isDark?'rgba(30,16,10,.95)':'rgba(253,250,246,.95)', backdropFilter:'blur(12px)', borderRadius:24, border:`1px solid ${C.border}`, boxShadow:'0 8px 32px rgba(0,0,0,.12)', display:'flex', padding:8 }}>
          {[{id:'accueil',Icon:Home,label:t('nav.home')},{id:'jeux',Icon:Gamepad2,label:t('nav.games')},{id:'classement',Icon:Trophy,label:t('nav.leaderboard')},{id:'collection',Icon:Palette,label:t('nav.collection')},{id:'marche',Icon:TrendingUp,label:t('nav.market')},{id:'boutique',Icon:ShoppingBag,label:t('nav.shop')}].map(item=>{
            const showDot = item.id==='accueil' && (canCheckin || canQuiz);
            return (
              <button key={item.id} id={`nav-${item.id}`} onClick={()=>goToTab(item.id)} style={s.pill(tab===item.id)}>
                <span style={{ position:'relative', display:'inline-flex', lineHeight:0 }}>
                  <item.Icon size={19} />
                  {showDot && (
                    <span className="pulse-ring" style={{ position:'absolute', top:-3, right:-4, width:8, height:8, borderRadius:'50%', background:'#D4A017', boxShadow:'0 0 0 2px '+(isDark?'rgba(30,16,10,.95)':'rgba(253,250,246,.95)') }} />
                  )}
                </span>
                <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:'-.2px', maxWidth:'100%', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* GAME OVERLAY */}
      {gameView && (
        <GameOverlay
          gameView={gameView} onClose={()=>{ setGameView(null); duelSessionRef.current=null; duelPlayerScoreRef.current=null; duelBotScoreRef.current=null; setDuelSession(null); }}
          duelMode={!!duelSession} onDuelScore={handleDuelScore} onDuelProgress={handleDuelProgress} myLiveRef={duelMyLiveRef}
          onBotDuelScore={handleBotDuelScore} onBotDuelProgress={handleBotDuelProgress} botLiveRef={duelBotLiveRef}
          duelInfo={duelSession ? { botTarget:duelSession.botTarget, higherWins:duelSession.higherWins, dur:getDuelGame(duelSession.gameKey)?.dur, gameLabel:getDuelGame(duelSession.gameKey)?.label, botName:duelSession.botName, botAvatar:duelSession.botAvatar, myAvatar:userAvatar, turn:duelSession.turn, metric:getDuelGame(duelSession.gameKey)?.metric } : null}
          coins={coins} level={level} streak={streak} canCheckin={canCheckin} canQuiz={canQuiz} clickRecord={clickRecord}
          onCheckin={doCheckin} checkinReward={checkinReward}
          onQuizEarn={addCoins} onQuizDone={()=>{ const ts = Date.now(); setLastQuiz(ts); syncDailyCounters(userCode, { last_quiz: ts }); }} quizMsLeft={quizMsLeft}
          onSpinEarn={addCoins} onSpend={spendCoins}
          onClickEarn={addCoins} onUpdateRecord={s=>setClickRecord(r=>Math.max(r,s))}
          onCafeEarn={()=>setCafes(c => (c || 0) + 1)}
          onJackpot={()=>{ triggerAchievement('jackpot'); }}
          onEventChallenge={checkEventChallenge}
          spinsLeft={spinsLeft} spinsCap={spinsCap} consumeSpin={consumeSpin}
          spinRechargeCost={spinRechargeCost} onRechargeSpin={rechargeSpin}
          slotPlaysLeft={slotPlaysLeft} slotGamesCap={slotGamesCap} consumeSlotGame={consumeSlotGame}
          slotRechargeCost={slotRechargeCost} onRechargeSlot={rechargeSlot}
          pyramidPlaysLeft={pyramidPlaysLeft} pyramidGamesCap={pyramidGamesCap}
          consumePyramidGame={consumePyramidGame}
          pyramidRechargeCost={pyramidRechargeCost} cafes={cafes}
          onRechargePyramid={rechargePyramid}
          activeSkin={activeSkin}
          gameThemes={gameThemes} setGameThemes={setGameThemes}
          unlocked={unlocked}
          /* Continue payant 1× par partie sur Café Express — débite 1 ☕
             côté App pour que le solde + le toast violet/or s'affichent. */
          onPayContinueCatcher={() => {
            if((cafes || 0) < 1) return false;
            setCafes(c => Math.max(0, (c || 0) - 1));
            playSound('purchase');
            haptic('medium');
            return true;
          }}
          legendarySeen={legendaryBaristaSeen}
          onLegendarySeen={()=>{
            setLegendaryBaristaSeen(true);
            /* Le code BARISTA05 est `secret:true` — on le dévoile sur
               ce compte au moment du drop. Sans ça, le joueur ne pourrait
               pas l'utiliser même en l'ayant vu en bulle. */
            setRevealedPromoCodes(prev => {
              const arr = Array.isArray(prev) ? prev : [];
              return arr.includes('BARISTA05') ? arr : [...arr, 'BARISTA05'];
            });
          }}
          isAdmin={isAdminName(userName)}
          C={C}
        />
      )}

      {showStakeModal && <DuelStakeModal coins={coins} cafes={cafes} onConfirm={startCreateDuel} onClose={()=>setShowStakeModal(false)} C={C} />}
      {matchmaking && <MatchmakingOverlay match={matchmaking} onLaunch={launchDuel} onCancel={()=>{ matchmakingRef.current=null; setMatchmaking(null); }} coins={coins} cafes={cafes} C={C} />}
      {duelHandoff && (
        <div style={{ position:'fixed', inset:0, zIndex:75, background:'linear-gradient(160deg,#2A1508,#160800)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, color:'#F0E0C0', textAlign:'center' }}>
          <div style={{ fontSize:12.5, fontWeight:800, color:'rgba(240,224,192,.6)', textTransform:'uppercase', letterSpacing:2 }}>🤖 {duelHandoff.botName} a joué</div>
          <div className="bi" style={{ fontSize:70, fontWeight:900, color:'#D4A017', margin:'14px 0 2px', lineHeight:1, textShadow:'0 0 30px rgba(212,160,23,.5)' }}>{duelHandoff.botScore}</div>
          <div style={{ fontSize:13, color:'rgba(240,224,192,.7)' }}>{duelHandoff.metric}</div>
          <div style={{ fontSize:18, fontWeight:900, marginTop:22 }}>À toi de faire {duelHandoff.higherWins ? 'MIEUX' : 'MOINS'} ! 💪</div>
          <button onClick={startMyTurn} style={{ marginTop:26, width:'100%', maxWidth:300, padding:'16px', borderRadius:16, background:'#D4A017', color:'#fff', fontWeight:900, fontSize:16, border:'none', cursor:'pointer' }}>Jouer mon tour ⚔️</button>
        </div>
      )}
      {duelResult && <DuelResultModal result={duelResult} onRematch={()=>{ setDuelResult(null); startMatchmaking(); }} onClose={()=>setDuelResult(null)} C={C} />}

      {/* BOSS COMMUNAUTAIRE — Le Gâteau Géant. S'ouvre au tap sur la
          bannière (showBoss) OU automatiquement après l'auto-crédit
          d'une victoire (bossReward) pour montrer l'écran de victoire. */}
      {!inTutorial && (showBoss || bossReward || bossPenalty) && communityBoss && (
        <BossEventOverlay
          boss={communityBoss}
          myDamage={bossMyDamage}
          contributorCount={bossContribCount}
          activity={bossActivity}
          attacking={bossAttacking}
          cooldownLeftMs={bossCooldownMs}
          coins={coins}
          cafes={cafes}
          bossReward={bossReward}
          bossPenalty={bossPenalty}
          isAdmin={isAdminName(userName)}
          onAttack={handleBossAttack}
          onClose={()=>{ setShowBoss(false); setBossReward(null); setBossPenalty(null); }}
          C={C}
        />
      )}

      {/* ÉVÉNEMENTS SPÉCIAUX (PHASE 6E) — la modale s'ouvre :
          - automatiquement au passage waiting → active (révélation)
          - au clic sur la bannière en phase 'waiting' (teasing
            + trophées déjà gagnés)
          - au clic sur la bannière en phase 'active' (rappel) */}
      {!inTutorial && showEventModal && activeEvent && (
        <EventAnnounceModal
          event={activeEvent}
          completedEvents={completedEvents}
          onClose={()=>setShowEventModal(false)}
          onGoToChallenge={()=>{
            /* Mappe le challenge → zone à ouvrir. Si inconnu, ne fait rien. */
            const c = activeEvent?.challenge;
            if(c === 'spin_jackpot')   { setTab('jeux'); setGameView('spin'); }
            else if(c === 'market_profit'){ setTab('marche'); }
          }}
          C={C}
        />
      )}
      {!inTutorial && eventReward && (
        <EventRewardModal
          reward={eventReward}
          /* La même modale sert pour les events et pour les codes promo
             qui débloquent un item (cf. promo.unlock dans redeemPromoCode).
             headline + ribbon adaptés selon la source. */
          headline={eventReward?.source === 'promo' ? 'Code promo validé !' : 'Événement réussi !'}
          ribbon={eventReward?.source === 'promo' ? 'Code promo' : 'Édition limitée'}
          onClose={()=>setEventReward(null)}
          /* Thèmes vivent dans Settings, badges dans le profil — route en
             conséquence pour que l'utilisateur voie effectivement sa récompense. */
          onView={()=>{
            if(eventReward?.type === 'badge') setShowProfile(true);
            else                              setShowSettings(true);
          }}
          C={C}
        />
      )}

      {/* SETTINGS OVERLAY */}
      {showSettings && (
        <SettingsOverlay
          onClose={()=>setShowSettings(false)}
          onReset={()=>{ resetProgress(); setShowSettings(false); }}
          install={installPrompt}
          onOpenAbout={openAbout}
          aboutIsNew={aboutIsNew}
          onOpenRestore={()=>setRestoreMode('replace')}
          onStartNewAccount={handleStartNewAccount}
          onOpenPromoCode={()=>setShowPromoCode(true)}
          onRestartTutorial={restartTutorial}
          userCode={userCode}
          restorePin={restorePin}
          onOpenCollection={()=>{ playSound('tab'); setShowSettings(false); goToTab('collection'); }}
          onOpenSentinelle={(vue)=>{
            setShowSettings(false);
            /* Le garde-fou ne fait JAMAIS confiance a ce que demande
               l ecran : un non-admin tombe sur l entonnoir, quoi qu il
               ait cliqué. */
            setVueSentinelle(peutVoirSentinelle(userName, userCode) ? (vue || 'console') : 'signalement');
          }}
          sentinelleAdmin={peutVoirSentinelle(userName, userCode)}
          sentinelleBadge={signalementsAttente}
          C={C}
        />
      )}

      {/* MES SUCCÈS — sorti de l'Accueil en v1.30 (la grille y prenait la
          moitié de l'écran le plus consulté). */}
      {showAllAchievements && (
        <AchievementsOverlay
          onClose={()=>setShowAllAchievements(false)}
          earnedAchievements={earnedAchievements}
          unlocked={unlocked}
          level={level}
          C={C}
        />
      )}

      {/* PROMO CODE MODAL */}
      {showPromoCode && (
        <PromoCodeModal
          onCancel={()=>setShowPromoCode(false)}
          onRedeem={redeemPromoCode}
          usedCodes={Array.isArray(promoCodesUsed) ? promoCodesUsed : []}
          revealedCodes={Array.isArray(revealedPromoCodes) ? revealedPromoCodes : []}
          C={C}
        />
      )}

      {/* PRESTIGE CONFIRM MODAL — confirmation de la renaissance lvl 15 */}
      {showPrestigeModal && (
        <PrestigeConfirmModal
          prestigeLevel={prestigeLevel}
          onConfirm={doPrestige}
          onCancel={()=>setShowPrestigeModal(false)}
          C={C}
        />
      )}

      {/* MARKET REFUND MODAL — excuses + compensation pour ex-investisseurs */}
      {!inTutorial && marketRefundAmount && (
        <MarketRefundModal
          amount={marketRefundAmount}
          onClose={()=>setMarketRefundAmount(null)}
          C={C}
        />
      )}

      {/* WEEKLY CHAMP MODAL — récompense top 3 du classement hebdo */}
      {!inTutorial && weeklyChampReward && (
        <WeeklyChampModal
          rank={weeklyChampReward.rank}
          cafes={weeklyChampReward.cafes}
          weekNum={weeklyChampReward.weekNum}
          onClose={()=>setWeeklyChampReward(null)}
          C={C}
        />
      )}

      {/* SANCTION APPLIED MODAL — avertissement post-débit administratif */}
      {/* Message de compte (sanction / compensation) — passe avant
          les modales de niveau et de succes. Une seule fois par COMPTE :
          applyPatchOnce garde la trace cote Supabase, donc un appareil
          neuf ne le rejoue pas (le piege des anciennes sanctions). */}
      {!inTutorial && accountNotice && (
        <AccountNoticeModal
          notice={accountNotice}
          onClose={()=>setAccountNotice(null)}
        />
      )}

      {!inTutorial && sanctionApplied && (
        <SanctionAppliedModal
          amount={sanctionApplied.amount}
          sharesDebit={sanctionApplied.sharesDebit || 0}
          reason={sanctionApplied.reason}
          onClose={()=>setSanctionApplied(null)}
          C={C}
        />
      )}


      {/* PAYMENT SUCCESS MODAL — popup festif post-achat Stripe */}
      {!inTutorial && paymentReceived && (
        <PaymentSuccessModal
          cafesReceived={paymentReceived}
          onClose={()=>setPaymentReceived(null)}
          C={C}
        />
      )}

      {/* CAFES RESET NOTICE — annonce 1× de la refonte économie premium */}
      {!inTutorial && showCafesResetNotice && (
        <CafesResetNoticeModal
          onClose={()=>setShowCafesResetNotice(false)}
          C={C}
        />
      )}

      {/* ABOUT MODAL — slide-up depuis le bas, par-dessus Settings */}
      {showAbout && (
        <AboutModal
          onClose={()=>setShowAbout(false)}
          C={C}
        />
      )}

      {/* Sentinelle — une porte, deux écrans.

          Un admin ouvre la console (constats, questions, actions). Tous
          les autres ouvrent l'entonnoir de signalement, qui ne sait
          qu'envoyer : il ne lit ni les constats, ni les signalements des
          autres. Le double garde-fou (état ET peutVoirSentinelle) évite
          qu'un état resté à true après un changement de pseudo ne fasse
          basculer un joueur du mauvais côté.

          Ce qui protège vraiment, ce n'est pas ce branchement : c'est la
          phrase de passe, vérifiée en base, sans laquelle rien ne se lit
          ni ne s'exécute. Cacher un écran n'a jamais protégé personne. */}
      {vueSentinelle === 'console' && peutVoirSentinelle(userName, userCode) && (
        <SentinelleTableau onClose={()=>setVueSentinelle(null)} userName={userName} />
      )}

      {vueSentinelle === 'signalement' && (
        <SignalementOverlay
          onClose={()=>{
            setVueSentinelle(null);
            /* Relire le compteur en sortant : un admin qui vient
               d'essayer l'entonnoir doit voir sa pastille bouger tout de
               suite, sinon il croit que rien n'est parti. */
            if(peutVoirSentinelle(userName, userCode)){
              signalementsOuverts().then(setSignalementsAttente).catch(()=>{});
            }
          }}
          userCode={userCode}
          userName={userName}
          level={level}
        />
      )}

      {/* NEW VERSION POPUP — pop si lastSeenVersion ≠ APP_INFO.version
          (sauf fresh install). Au close, marque la version comme vue. */}
      {!inTutorial && showNewVersion && (
        <NewVersionModal
          onClose={() => {
            setShowNewVersion(false);
            setLastSeenVersion(APP_INFO.version);
          }}
          onOpenAbout={openAbout}
          C={C}
        />
      )}

      {/* MAINTENANCE LIVE WARNING — pop quand system_status.maintenance_mode
          passe à true en cours de session. 30s de grace puis bascule sur
          MaintenanceScreen plein écran. */}
      {!inTutorial && showMaintenanceWarning && (
        <MaintenanceWarningModal
          title={systemStatus.maintenance_title}
          subtitle={systemStatus.maintenance_subtitle}
          onDone={() => {
            setShowMaintenanceWarning(false);
            setLiveMaintenanceActive(true);
          }}
        />
      )}

      {/* FORCE UPDATE — pop quand system_status.force_version > APP_INFO.version.
          Permet de notifier les clients ouverts qu'un nouveau bundle est dispo. */}
      {!inTutorial && showForceUpdate && (
        <ForceUpdateModal
          targetVersion={systemStatus.force_version}
          onDismiss={() => setForceUpdateDismissed(true)}
        />
      )}

      {/* RESTORE PROFILE MODAL — depuis onboarding (fresh) ou settings (replace) */}
      {restoreMode && (
        <RestoreProfileModal
          warning={restoreMode === 'replace'}
          onCancel={()=>setRestoreMode(null)}
          onSuccess={handleRestoreSuccess}
          knownAccounts={knownAccounts}
          currentUserCode={userCode}
          onForgetAccount={(codeToForget) => {
            setKnownAccounts(arr => (Array.isArray(arr) ? arr : []).filter(a => a && a.userCode !== codeToForget));
          }}
          C={C}
        />
      )}

      {/* PROFILE OVERLAY */}
      {showProfile && (
        <ProfileOverlay
          onClose={()=>setShowProfile(false)}
          onOpenLevels={()=>{ setShowProfile(false); setShowLevels(true); }}
          onOpenSettings={()=>{ setShowProfile(false); setShowSettings(true); }}
          onOpenCollection={()=>{ playSound('tab'); setShowProfile(false); goToTab('collection'); }}
          onOpenAbout={openAbout}
          userName={userName} setUserName={setUserName}
          userAvatar={userAvatar}
          joinDate={joinDate}
          coins={coins} spendCoins={spendCoins}
          nameChangeCount={nameChangeCount} setNameChangeCount={setNameChangeCount}
          userCode={userCode}
          userBio={userBio} setUserBio={setUserBio}
          level={level} xp={xp} xpReq={xpReq}
          totalEarned={totalEarned} streak={streak} unlocked={unlocked}
          earnedAchievements={earnedAchievements} achievementsTotal={ACHIEVEMENTS.length}
          marketRealized={marketRealized}
          totalPlayTime={totalPlayTime}
          activeTitle={activeTitle}
          onReset={()=>{ resetProgress(); setShowProfile(false); }}
          supabaseEnabled={isSupabaseEnabled()}
          supabaseSyncOk={!supabaseError}
          unreadInboxCount={unreadInboxCount}
          onOpenInbox={()=>{ playSound('modal'); setShowInbox(true); }}
          onOpenFriendProfile={(code)=>{ playSound('modal'); openUserProfile(code, false); }}
          cafes={cafes}
          onSendGift={handleSendGift}
          C={C}
        />
      )}

      {/* INBOX MODAL */}
      {showInbox && (
        <InboxModal
          userCode={userCode}
          onClose={()=>setShowInbox(false)}
          onApplyReward={handleApplyReward}
          onUnreadCountChange={setUnreadInboxCount}
          C={C}
        />
      )}

      {/* NOTIF AMIS (au lancement) — file FIFO, on dépile une notif à la fois.
          'Voir' (received) → ferme la modale et ouvre le profil. */}
      {!inTutorial && pendingFriendNotifs.length > 0 && (
        <FriendNotificationModal
          notification={pendingFriendNotifs[0]}
          onClose={()=>setPendingFriendNotifs(n => n.slice(1))}
          onSeeRequests={()=>{
            setPendingFriendNotifs(n => n.slice(1));
            setShowProfile(true);
          }}
        />
      )}

      {/* PROFIL PUBLIC — vue d'un ami / du top 1 (BRIEF_PROFIL_VISIBLE).
          friendCodes + currentUserCode → la modale active la ReactionBar
          si le profil consulté est dans mes amis (BRIEF_REACTIONS). */}
      {viewingProfile && (
        <UserProfileModal
          userCode={viewingProfile.userCode}
          isCrown={viewingProfile.isCrown}
          currentUserCode={userCode}
          friendCodes={friendCodes}
          onClose={()=>setViewingProfile(null)}
          C={C}
        />
      )}

      {/* BADGE SECRET DÉBLOQUÉ — modale festive en file FIFO
          (BRIEF_BADGES_SECRETS). Mode Admin enchaîne les 3. */}
      {!inTutorial && secretBadgeReward && (
        <SecretBadgeUnlockModal
          key={secretBadgeReward.id}
          badge={secretBadgeReward}
          bonus={SECRET_BADGE_BONUS}
          onClose={()=>setSecretBadgeQueue(q => q.slice(1))}
        />
      )}

      {/* LEVELS MODAL */}
      {showLevels && <LevelsModal currentLevel={level} xp={xp} xpReq={xpReq} onClose={()=>setShowLevels(false)} C={C} />}

      {/* LEVEL UP MODAL */}
      {!inTutorial && pendingLvUp && <LevelUpModal level={pendingLvUp} onCollect={()=>setPendingLvUp(null)} />}

      {/* CAP ANTI-ÉCART TOP 1 — total_earned déjà recalé silencieusement
          à pile 30 % d'avance, le popup explique juste pourquoi. */}
      {!inTutorial && gapWarning && !pendingLvUp && (
        <LeaderGapWarningModal
          myTotal={gapWarning.myTotal}
          topTwo={gapWarning.topTwo}
          capped={gapWarning.capped}
          onClose={()=>setGapWarning(null)}
          C={C}
        />
      )}

      {/* ACHIEVEMENT MODAL */}
      {!inTutorial && pendingAchievements.length > 0 && !pendingLvUp && (
        <AchievementModal achievement={pendingAchievements[0]} onCollect={collectAchievement} />
      )}

      {/* BOOST GAIN POPUP — déclenché par addCoins quand boost ×2 ou
          doubler ont amplifié un mini-jeu. Ne pop pas pour prestige. */}
      {boostGainPopup && (
        <BoostGainToast
          bonus={boostGainPopup.bonus}
          boost={boostGainPopup.boost}
          doubler={boostGainPopup.doubler}
        />
      )}

      {/* CAFÉ TOAST — popup gain de CF */}
      {cafeToast && (
        <div
          key={cafeToast.key}
          aria-live="polite"
          style={{
            position:'fixed', top:88, left:'50%', zIndex:120,
            transform:'translateX(-50%)',
            display:'flex', alignItems:'center', gap:10,
            padding:'12px 22px', borderRadius:22,
            background:'linear-gradient(135deg,#1A0830 0%,#3D1A6B 50%,#5B2A9C 100%)',
            border:'2px solid rgba(212,160,23,.65)',
            boxShadow:'0 8px 28px rgba(74,44,23,.4), 0 0 24px rgba(212,160,23,.5)',
            color:'#F0E0FF', pointerEvents:'none',
            animation:'cafeToastIn .45s cubic-bezier(.36,.07,.19,.97) both'
          }}
        >
          <span style={{ fontSize:24 }}>☕</span>
          <div>
            <div style={{ fontSize:9, fontWeight:800, color:'#F0C050', letterSpacing:2, textTransform:'uppercase' }}>Nouveau gain</div>
            <div style={{ fontSize:18, fontWeight:900, color:'#FFE89A', lineHeight:1, marginTop:2 }}>
              +{cafeToast.amount} <span style={{ fontSize:13, color:'rgba(255,232,154,.85)' }}>CF</span>
            </div>
          </div>
          <span className="sparkle-anim" style={{ fontSize:14, color:'#F0C050', filter:'drop-shadow(0 0 6px rgba(212,160,23,.7))' }}>✨</span>
        </div>
      )}

      {/* ONBOARDING MODAL */}
      {showOnboarding && (
        <OnboardingModal
          C={C}
          install={installPrompt}
          onRestore={() => setRestoreMode('fresh')}
          onComplete={(name, avatarIndex)=>{
            setUserName(name);
            setUserAvatar(avatarIndex);
            if(!joinDate) setJoinDate(new Date().toLocaleDateString('fr-FR'));
            /* 🔑 Code dev — pseudo `admin558` : dotation de test 10 000 🍪 +
               100 ☕, niveau max, classement filtré côté Supabase, et tous les
               succès / badges désactivés (cf. useEffects + checks ailleurs).
               TOUS les thèmes (achetables + édition limitée events) sont
               unlock pour pouvoir les essayer immédiatement. */
            if(isAdminName(name)){
              setCoins(50000);
              setTotalEarned(50000);
              setCafes(100);
              setLevel(15);
              setXp(0);
              const allThemeIds = REWARDS.filter(r => r.type === 'Thème').map(r => r.id);
              setUnlocked(u => Array.from(new Set([...(u || []), ...allThemeIds])));
              /* Tous les succès marqués gagnés pour qu'aucune modale ne pop
                 si l'admin remplit accidentellement une condition. */
              setEarnedAchievements(ACHIEVEMENTS.map(a => a.id));
              setPendingAchievements([]);
            }
            setShowOnboarding(false);
          }}
        />
      )}

      {/* TUTORIEL GUIDÉ — déclenché au 1er lancement après onboarding.
          Spotlight rond sur l'élément ciblé + bulle centrée à l'écran.
          Navigation auto vers le tab de l'étape pour que l'user voie
          le contenu réel pendant qu'il lit. */}
      {tutorialStep > 0 && (
        <TutorialOverlay
          step={tutorialStep}
          onNext={tutorialNext}
          onSkip={()=>setShowSkipConfirm(true)}
          onNavigate={(t)=>{ setShowProfile(false); setShowSettings(false); setTab(t); }}
        />
      )}
      {showSkipConfirm && (
        <SkipConfirmModal
          onCancel={()=>setShowSkipConfirm(false)}
          onConfirm={tutorialConfirmSkip}
          C={C}
        />
      )}
      {/* Bulle contextuelle (1re ouverture jeu/onglet) */}
      <ContextHint hint={activeHint} onClose={()=>setActiveHint(null)} />

      {/* Toast d'erreur réseau Supabase (auto-close 4s) */}
      <NetworkErrorToast />

      {/* Splash custom à chaque mount (ouverture + F5). En mode fast
          si c'est un refresh détecté via Performance API. */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} fast={splashFastRef.current} />}

    </div>
    </>
  );
}

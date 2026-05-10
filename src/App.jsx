import { useState, useEffect, useRef, useCallback } from "react";
import { Cookie, ShoppingBag, Gamepad2, Home, Gift, Star, CircleDot, MousePointerClick, ChevronLeft, Settings, TrendingUp, Trophy, Coffee, Flame, Zap, LayoutGrid, HelpCircle, Timer, Lock, Dice5 } from "lucide-react";

import { LEVEL_NAMES, REWARDS, ACHIEVEMENTS, DAILY_REWARDS, QUIZ_COOLDOWN_MS, xpRequired } from "./data/constants.js";
import { DK, LT, THEMES, GOLD, ESPRESSO, PREMIUM_PALETTE } from "./data/themes.js";
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
import { upsertProfile, deleteMyProfile, sendGift, getTopTwoTotalEarned, pullProfile, syncDailyCounters, closeWeek, getWeeklyWinners, pingPresence } from "./lib/supabaseSync.js";
import { getCurrentWeekId, getWeekNumberDisplay } from "./lib/weeklyCycle.js";
import { WeeklyChampModal } from "./components/modals/WeeklyChampModal.jsx";
import { NetworkErrorToast } from "./components/NetworkErrorToast.jsx";
import { GLOBAL_CSS } from "./styles/globalStyles.js";

import { AvatarFigure } from "./components/AvatarFigure.jsx";
import { LevelsModal } from "./components/modals/LevelsModal.jsx";
import { LevelUpModal } from "./components/modals/LevelUpModal.jsx";
import { AchievementModal } from "./components/modals/AchievementModal.jsx";
import { LeaderGapWarningModal } from "./components/modals/LeaderGapWarningModal.jsx";
import { OnboardingModal } from "./components/modals/OnboardingModal.jsx";
import { RestoreProfileModal } from "./components/modals/RestoreProfileModal.jsx";
import { PrestigeConfirmModal } from "./components/modals/PrestigeConfirmModal.jsx";
import { MarketRefundModal } from "./components/modals/MarketRefundModal.jsx";
import { SanctionAppliedModal } from "./components/modals/SanctionAppliedModal.jsx";
import { PaymentSuccessModal } from "./components/modals/PaymentSuccessModal.jsx";
import { CafesResetNoticeModal } from "./components/modals/CafesResetNoticeModal.jsx";
import { PromoCodeModal } from "./components/modals/PromoCodeModal.jsx";
import { creditFreeShares, adminDebitShares } from "./lib/market.js";
import { isAdminName, ADMIN_NAMES } from "./utils/admin.js";
import { SettingsOverlay } from "./components/overlays/SettingsOverlay.jsx";
import { AboutModal } from "./components/modals/AboutModal.jsx";
import { NewVersionModal } from "./components/modals/NewVersionModal.jsx";
import { APP_INFO } from "./lib/appInfo.js";
import { ProfileOverlay } from "./components/overlays/ProfileOverlay.jsx";
import { GameOverlay } from "./components/overlays/GameOverlay.jsx";
import { BoutiqueTab } from "./components/tabs/BoutiqueTab.jsx";
import { ClassementTab } from "./components/tabs/ClassementTab.jsx";
import { MarketTab } from "./components/tabs/MarketTab.jsx";
import { MarketLocked } from "./components/tabs/MarketLocked.jsx";
import { InboxModal } from "./components/modals/InboxModal.jsx";
import { getUnreadInboxCount } from "./lib/inbox.js";
import { useToast } from "./components/Toaster.jsx";
import { BoostGainToast } from "./components/BoostGainToast.jsx";
import { FriendNotificationModal } from "./components/modals/FriendNotificationModal.jsx";
import { getReceivedFriendRequests, getNewlyAcceptedFriends, getFriends } from "./lib/supabaseSync.js";
import { UserProfileModal } from "./components/modals/UserProfileModal.jsx";
import { SecretBadgeUnlockModal } from "./components/modals/SecretBadgeUnlockModal.jsx";
import { SECRET_BADGES, SECRET_BADGE_BONUS } from "./data/secretBadges.js";
import { setupAudioOnFirstInteraction, setupVisibilityHandler, playSound } from "./lib/audio.js";

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

function fmtCompact(n){
  if(n < 10_000) return String(n);
  if(n < 1_000_000){
    const v = n / 1_000;
    return (v < 100 ? v.toFixed(1) : Math.floor(v)) + 'K';
  }
  return (n / 1_000_000).toFixed(1) + 'M';
}

export default function CookiMiner() {
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
  /* Système Prestige : à chaque renaissance (niveau 15 atteint), le joueur
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
  /* Compteur quotidien Pile de Tasses (cap 50, reset à minuit). Recharge
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
      const serverAhead = server && (
        Number(server.totalEarned) > totalEarned ||
        Number(server.cafes) > cafes
      );
      if(serverAhead){
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
        showToastRef.current?.('☁️ Données synchronisées');
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
      });
      setSupabaseError(!res?.ok);
    }, 5000);
    return ()=>clearTimeout(t);
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
  const [pendingAchievement, setPendingAchievement] = useState(null);
  const [activeBanner, setActiveBanner] = useLocalStorage('activeBanner','');
  /* Skin du cookie central tappable (cf. COOKIE_SKINS). '' = défaut. */
  const [activeSkin,   setActiveSkin]   = useLocalStorage('activeSkin','');
  /* (activeTitle est déclaré plus haut — utilisé dans le upsertProfile.) */
  /* Codes promo rares révélés via items premium (cf. promoCodes.js
     PROMO_CODES.<X>.secret). Une fois révélé, le code apparaît dans
     PromoCodeModal et peut être saisi pour récupérer la récompense. */
  const [revealedPromoCodes, setRevealedPromoCodes] = useLocalStorage('revealedPromoCodes', []);
  const [pendingLvUp,  setPendingLvUp]  = useState(null);
  const [tab,          setTab]          = useState('accueil');
  const [gameView,     setGameView]     = useState(null);
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
  /* Popup post-achat Stripe — set au montant détecté par le re-pull. */
  const [paymentReceived, setPaymentReceived] = useState(null);
  /* Notice de la refonte économie café (mai 2026) — affichée 1 fois quand
     la migration cafesResetMay10 trigger pour expliquer le reset à 0. */
  const [showCafesResetNotice, setShowCafesResetNotice] = useState(false);
  const [boutiqueMode, setBoutiqueMode] = useState('shop'); // 'shop' | 'premium'
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
  /* Notification "nouvelle version" : on garde en LS la dernière version
     vue par l'user. Au mount, si APP_INFO.version diffère → popup.
     Pour un fresh install, lastSeenVersion vaut '' → on calibre direct
     à la version courante SANS pop (le nouveau joueur n'a pas à voir
     un changelog d'ancien). Voir useEffect plus bas. */
  const [lastSeenVersion,  setLastSeenVersion]  = useLocalStorage('lastSeenVersion', '');
  const [showNewVersion,   setShowNewVersion]   = useState(false);
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

  /* Bouton retour Android : ferme l'overlay courant au lieu de quitter
     l'app. Pas appliqué à : showOnboarding, tutorialStep, pendingLvUp,
     pendingAchievement (l'utilisateur DOIT les voir / interagir). */
  useBackToClose(!!gameView,        () => setGameView(null));
  useBackToClose(showSettings,      () => setShowSettings(false));
  useBackToClose(showProfile,       () => setShowProfile(false));
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

      if(alive && queue.length > 0) setPendingFriendNotifs(queue);
    })();

    return () => { alive = false; };
  }, [userCode, showOnboarding]);

  /* Swipe horizontal pour changer d'onglet — désactivé tant qu'un
     overlay/modal/jeu/tuto est ouvert, pour éviter les conflits.
     `slideDir` mémorise la direction du dernier changement pour
     animer le content entrant (depuis la droite ou la gauche). */
  const TAB_ORDER = ['accueil','jeux','classement','marche','boutique'];
  const [slideDir, setSlideDir] = useState(null); // 'next' | 'prev' | null

  const goToTab = (target, source = 'click') => {
    const i = TAB_ORDER.indexOf(tab);
    const j = TAB_ORDER.indexOf(target);
    if(j === -1 || j === i) { setTab(target); return; }
    /* Son distinct selon l'origine : 'swipe' = whoosh confirm, 'tab' = clic */
    playSound(source === 'swipe' ? 'swipe' : 'tab');
    setSlideDir(j > i ? 'next' : 'prev');
    setTab(target);
  };

  const swipeBlocked = !!(gameView || showSettings || showProfile || showLevels || showOnboarding || showSkipConfirm || showEventModal || eventReward || showInbox || showAbout || showNewVersion || viewingProfile || secretBadgeReward || pendingFriendNotifs.length > 0 || tutorialStep > 0 || pendingLvUp || pendingAchievement);
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
    if(tab !== 'boutique' && boutiqueMode === 'premium') setBoutiqueMode('shop');
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
  const pyramidGamesCap   = 50;
  const pyramidRechargeCost = 2;     // ☕ pour reset à 0 (= +50 essais)
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
  /* Recharge in-game : 2 ☕ → reset compteur à 0 = full 50 essais.
     Retourne true si OK, false si pas assez de cafés ou pas besoin
     (encore des essais dispo). */
  const rechargePyramid = useCallback(() => {
    if(pyramidPlaysLeft > 0) return false;        /* pas besoin */
    if(cafes < pyramidRechargeCost) return false; /* pas assez */
    setCafes(c => c - pyramidRechargeCost);
    const t = new Date().toDateString();
    setPyramidGamesDate(t);
    setPyramidGamesToday(0);
    playSound('success');
    return true;
  }, [pyramidPlaysLeft, cafes, pyramidRechargeCost, setCafes, setPyramidGamesDate, setPyramidGamesToday]);

  /* Recharge in-game pour la Roue (spin) — 2 ☕ → reset compteur à 0.
     Remplace les anciens spin_pass_50/20 vendus dans la boutique premium. */
  const spinRechargeCost = 2;
  const rechargeSpin = useCallback(() => {
    if(spinsLeft > 0) return false;
    if(cafes < spinRechargeCost) return false;
    setCafes(c => c - spinRechargeCost);
    const t = new Date().toDateString();
    setSpinsDate(t);
    setSpinsToday(0);
    playSound('success');
    return true;
  }, [spinsLeft, cafes, spinRechargeCost, setCafes, setSpinsDate, setSpinsToday]);

  /* Recharge in-game pour la Machine à Sous (jackpot) — 2 ☕ → reset à 0.
     Remplace l'ancien slot_pass_50 vendu dans la boutique premium. */
  const slotRechargeCost = 2;
  const rechargeSlot = useCallback(() => {
    if(slotPlaysLeft > 0) return false;
    if(cafes < slotRechargeCost) return false;
    setCafes(c => c - slotRechargeCost);
    const t = new Date().toDateString();
    setSlotGamesDate(t);
    setSlotGamesToday(0);
    playSound('success');
    return true;
  }, [slotPlaysLeft, cafes, slotRechargeCost, setCafes, setSlotGamesDate, setSlotGamesToday]);

  const badges     = REWARDS.filter(r=>r.type==='Badge' && unlocked.includes(r.id));

  /* actions */
  /* `amount`     : delta appliqué aux coins (peut être négatif → perte)
     `gainAmount` : delta compté comme "vrai gain" (XP + totalEarned).
                    Par défaut = amount. Sert pour la vente $CKM : on
                    récupère proceeds en coins mais on ne progresse
                    qu'à hauteur de la plus-value (pnl). */
  const addCoins = useCallback((amount, gainAmount = amount)=>{
    /* Multiplicateurs cumulés sur gains positifs uniquement :
       - Prestige     : +10 % par niveau (permanent)
       - Boost ×2 1h  : ×2 si boostUntil > now
       - Doubler      : ×2 sur le prochain gain (one-shot, auto-clear)
       Pertes (amount<=0) inchangées. */
    if(amount > 0){
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

    setTotalEarned(t=>t+xpDelta);

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

    /* Endgame : niveau 16 = palier final. XP accumule de 0 à 20000
       (cap), pas de café loop, pas de level-up vers 17 — le prestige
       prend le relais une fois les 20000 XP atteints. */
    const ENDGAME_XP_CAP = 20000;   // = xpRequired(16)
    if(lv === 16){
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
    /* Bonus de level-up :
       - Paliers majeurs (6, 10, 15, 16) → +1 ☕ (les "milestones")
       - Autres paliers post-6 (7-9, 11-14) → cookies bonus 50+10*nl
       - Niv 1-5 → cookies bonus 10*nl (inchangé)
       Cuts -45% sur la production de café (rareté demandée). */
    const isCafeMilestone = (nl === 6 || nl === 10 || nl === 15 || nl === 16);
    if(isCafeMilestone){
      setTimeout(()=>{ setCafes(c=>c+1); }, 700);
    } else if(nl >= 6){
      const bonus = 50 + 10 * nl;
      setTimeout(()=>{ setCoins(c=>c+bonus); setTotalEarned(t=>t+bonus); }, 700);
    } else {
      const bonus = 10*nl;
      setTimeout(()=>{ setCoins(c=>c+bonus); setTotalEarned(t=>t+bonus); }, 700);
    }
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

  /* CAP ANTI-ÉCART TOP 1 — quand je suis le leader avec plus de 30 %
     d'avance sur le 2e, on RECALIBRE automatiquement mon total_earned
     à pile (top2 × 1.30). Le sync auto (5 s) push ensuite la nouvelle
     valeur vers Supabase et le classement remonte le 2e à 30 % d'écart.
     Le cap est silencieux à l'avant-plan : seul un popup explicatif
     s'affiche (1 fois max par session) pour que l'user comprenne ce
     qui s'est passé.
     Trigger : 1 fois au mount + 1 fois après chaque level-up. */
  const [gapWarning, setGapWarning] = useState(null);  // { myTotal, topTwo, capped } | null
  const [gapShownThisSession, setGapShownThisSession] = useState(false);
  const checkLeaderGap = useCallback(async () => {
    if(!userCode) return;
    if(isAdminName(userName)) return;            // admins exclus du classement → pas concernés
    const [topOne, topTwo] = await getTopTwoTotalEarned();
    if(!topOne || !topTwo) return;               // moins de 2 joueurs publics
    if(topOne.user_code !== userCode) return;    // je ne suis pas le top 1 → rien
    const t2 = Number(topTwo.total_earned) || 0;
    if(t2 <= 0) return;
    const GAP_PCT = 1.25;  // Top 1 max +25 % vs Top 2
    const cap = Math.floor(t2 * GAP_PCT);
    if(totalEarned > cap){
      /* Recalibrage silencieux du total_earned (le sync push à Supabase
         dans les 5 s suivantes). Le popup n'apparaît que la 1re fois
         dans la session pour pas spammer si l'user retrigger plusieurs
         fois (ex : level-up qui re-bump puis re-cap). */
      setTotalEarned(cap);
      if(!gapShownThisSession){
        setGapWarning({ myTotal: totalEarned, topTwo: t2, capped: cap });
        setGapShownThisSession(true);
      }
    }
  }, [userCode, userName, totalEarned, gapShownThisSession, setTotalEarned]);

  /* Check au mount (debounce 3s pour laisser le upsertProfile pousser
     les valeurs locales d'abord — sinon le check tomberait sur des
     valeurs Supabase périmées). */
  useEffect(() => {
    const t = setTimeout(checkLeaderGap, 3000);
    return () => clearTimeout(t);
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
     (rééquilibrage classement). Appliqué au 1er chargement après push,
     puis flag LS pour ne plus retoucher (l'user peut re-progresser
     depuis le cap sans être recapé en boucle).
     Pour ajouter un cap : étendre l'objet (pseudo lowercase → max). */
  useEffect(() => {
    if(!userName) return;
    const TOTAL_EARNED_CAPS = {
      'aaronxbox': 15000,
    };
    const cap = TOTAL_EARNED_CAPS[userName.trim().toLowerCase()];
    if(!cap) return;
    try{
      if(window.localStorage.getItem('cookiminer:totalEarnedCapped') === '1') return;
    }catch{ return; }
    if(totalEarned > cap){
      setTotalEarned(cap);
      showToastRef.current?.(`📊 Total recalibré à ${cap} 🍪`);
    }
    try{ window.localStorage.setItem('cookiminer:totalEarnedCapped', '1'); }catch{}
  }, [userName, totalEarned, setTotalEarned]);

  /* Débits manuels one-shot (rééquilibrage demandé par l'user). Pattern
     jumelé avec TOTAL_EARNED_CAPS — soustrait une valeur fixe au lieu
     de capper. Gate sur `pullDone` pour appliquer APRÈS la sync serveur
     (sinon le pull ramènerait l'ancienne valeur). Le débit est ensuite
     pushé via le upsert auto (5 s).
     Flag LS unique daté pour ne re-débiter qu'une seule fois (créer une
     nouvelle clé `_vN` pour faire un nouveau débit plus tard). */
  useEffect(() => {
    if(!userName || !pullDone) return;
    const lname = userName.trim().toLowerCase();
    const COINS_DEBITS = {
      'cookithan': 4000,
    };
    const ckDebit = COINS_DEBITS[lname] || 0;
    if(!ckDebit) return;
    const FLAG_KEY = 'cookiminer:manualDebit2026_05_10_cookithan_coins';
    try{
      if(window.localStorage.getItem(FLAG_KEY) === '1') return;
    }catch{ return; }
    setCoins(c => Math.max(0, (c || 0) - ckDebit));
    showToastRef.current?.(`📊 Recalibrage : -${ckDebit} 🍪`);
    try{ window.localStorage.setItem(FLAG_KEY, '1'); }catch{}
  }, [userName, pullDone, setCoins]);

  /* Sanctions administratives — débit forcé du totalEarned (pas du
     solde) avec popup d'avertissement. Lookup par userCode (stable).
     Flag LS one-shot, set AVANT le débit (anti F5 race).
     On débite aussi weekly_earned du même montant pour cohérence
     classement weekly. */
  useEffect(() => {
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
     les opérations (anti F5). */
  useEffect(() => {
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
     mentionne les 2 incidents pour couvrir ce cas. */
  useEffect(() => {
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
    const FLAG_KEY = 'cookiminer:marketRefund2026_05_10';
    /* Anti double-crédit : on SET le flag LS AVANT d'appliquer le
       crédit. Si l'user fait F5 entre le crédit et le set du flag,
       le flag absent ferait re-créditer au prochain mount. En settant
       d'abord, on garantit l'idempotence. Si le setItem throw (storage
       full / désactivé), on return sans créditer — mieux que doubler. */
    try{
      if(window.localStorage.getItem(FLAG_KEY) === '1') return;
      window.localStorage.setItem(FLAG_KEY, '1');
    }catch{ return; }
    setCoins(c => (c || 0) + refund);
    /* Modale d'excuses + résumé du fix (au lieu d'un simple toast).
       Le flag est déjà set, donc fermer ou refresh ne re-déclenche pas. */
    setMarketRefundAmount(refund);
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
      /* Flag LS one-shot par semaine — pas de double crédit même si on
         re-mount plusieurs fois ou changement de device. */
      const FLAG_KEY = `cookiminer:weeklyChampReward_${prevWeekId}`;
      try{
        if(window.localStorage.getItem(FLAG_KEY) === '1') return;
        window.localStorage.setItem(FLAG_KEY, '1');
      }catch{ return; }
      /* Récompenses : Top1=5☕, Top2=3☕, Top3=1☕ + badge dynamique */
      const cafesReward = myRank === 1 ? 5 : myRank === 2 ? 3 : 1;
      const weekNum = getWeekNumberDisplay(prevWeekId);
      const badgeId = `champ_W${weekNum}`;
      setCafes(c => (c || 0) + cafesReward);
      setUnlocked(u => (u || []).includes(badgeId) ? u : [...(u || []), badgeId]);
      setWeeklyChampReward({ rank: myRank, cafes: cafesReward, weekNum });
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
    /* Déblocage d'un item REWARDS (typiquement un thème édition limitée
       comme theme_noir via le code BLACK). Idempotent : pas de doublon
       dans `unlocked`. Si on trouve l'item, on déclenche la modale
       festive (réutilise EventRewardModal avec headline "Code promo"). */
    let unlockedItem = null;
    if(promo.unlock){
      setUnlocked(u => u.includes(promo.unlock) ? u : [...u, promo.unlock]);
      unlockedItem = REWARDS.find(r => r.id === promo.unlock) || null;
      if(unlockedItem){
        const typeMap = { 'Thème':'theme', 'Badge':'badge' };
        setEventReward({
          source:    'promo',
          type:      typeMap[unlockedItem.type] || 'theme',
          id:        unlockedItem.id,
          name:      unlockedItem.name,
          cafeBonus: 0,
        });
      }
    }
    setPromoCodesUsed(arr => Array.isArray(arr) ? [...arr, promo.code] : [promo.code]);
    playSound('success');
    /* Toast minimal — la modale festive prend le relais quand un item
       est débloqué, donc on ne mentionne pas l'item dans le toast pour
       éviter la redondance. */
    const parts = [];
    if(promo.coins)  parts.push(`+${promo.coins} 🍪`);
    if(promo.cafes)  parts.push(`+${promo.cafes} ☕`);
    if(promo.shares) parts.push(`+${promo.shares} action${promo.shares > 1 ? 's' : ''} $CKM`);
    if(promo.level)  parts.push(`Niv ${promo.level}`);
    if(parts.length){
      showToast(`🎟️ Code validé : ${parts.join(' · ')}`);
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
    if(activeEvent) return;
    triggerNextEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  /* Tick périodique (5s) pour gérer les transitions de phase :
     - waiting → active : quand revealAt atteint
     - active  → fail   : quand expiresAt atteint sans succès */
  useEffect(()=>{
    if(level < EVENT_LEVEL_MIN || !activeEvent) return;
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
  }, [activeEvent, level]);

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
     Flag LS pour idempotence ; au prochain upsert (5s), la valeur 0 est
     poussée vers Supabase. Les paiements Stripe futurs partent de 0.
     Affiche une notice (CafesResetNoticeModal) pour expliquer. On évite
     de pop la notice pour les fresh installs (pas d'utilisateur encore
     connecté, ou stock déjà = 0). */
  useEffect(() => {
    try {
      if (window.localStorage.getItem('cookiminer:cafesResetMay10') === '1') return;
      const hadCafes = (cafesRef.current ?? 0) > 0;
      setCafes(0);
      window.localStorage.setItem('cookiminer:cafesResetMay10', '1');
      if (hadCafes) setShowCafesResetNotice(true);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkinReward = DAILY_REWARDS[streak % 7];
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
    setStreak(0); setClickRecord(0); setUnlocked([]); setLegendaryBaristaSeen(false); setPrestigeLevel(0);
    setNextGameDoubler(false); setBoostUntil(0); setVipPurchasesToday({});
    setLastCheckin(null); setLastQuiz(null); setDark(false);
    setMarketRealized(0);
    setLeaderboard(null); setLeaderboardLastBoost(''); setLeaderboardLastHourly(0);
    /* Marché v2 : reset du tutoriel + flag de cleanup pour qu'un éventuel
       re-init redéclenche bien le mini-tutoriel. La portfolio Supabase
       de l'user n'est PAS supprimée (low-impact, persiste sous son code). */
    try {
      window.localStorage.removeItem('cookiminer:marketWelcomeSeen');
      window.localStorage.removeItem('cookiminer:marketV2Cleaned');
    } catch {}
    setUserName(''); setUserAvatar(null); setJoinDate(''); setNameChangeCount(0); setUserCode(''); setUserBio('');
    setEarnedAchievements([]); setTotalInvested(0); setPendingAchievement(null);
    setActiveTheme(''); setActiveBanner(''); setActiveSkin(''); setActiveTitle(''); setRevealedPromoCodes([]); setPromoCodesUsed([]);
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

  /* Prestige (renaissance) — disponible quand niveau 16 atteint avec
     20000 XP cumulés sur ce palier. Reset les progressions volatiles
     (niveau, XP, cookies, totalEarned, streak, clickRecord) et incrémente
     prestigeLevel pour booster le multiplicateur de gains de +10 %.
     Garde tout le reste : items, succès, cafés, actions $CKM, identité, amis. */
  const doPrestige = () => {
    if(level < 16 || xp < 20000) return;
    /* Évite tout bonus level-up flottant */
    setPendingLvUp(null);
    setLevel(1);   lvRef.current = 1;
    setXp(0);      xpRef.current = 0;
    setCoins(0);
    setTotalEarned(0);
    setStreak(0);
    setClickRecord(0);
    setPrestigeLevel(p => (p || 0) + 1);
    setShowPrestigeModal(false);
    playSound('levelup');
    showToast(`🌟 Renaissance ! Multiplicateur x${(1 + ((prestigeLevel || 0) + 1) * 0.1).toFixed(1)} sur tous les gains 🍪`);
  };

  const doCheckin    = ()=>{
    playSound('coin');
    addCoins(checkinReward);
    const today = new Date().toDateString();
    setStreak(s => {
      const next = (s || 0) + 1;
      /* Push immédiat anti-cheat cross-device — sinon le 5s debounce
         laisse une fenêtre où l'autre device peut re-check-in. */
      syncDailyCounters(userCode, { streak: next, last_checkin: today });
      return next;
    });
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

  const unlockReward = (id)=>{
    const r=REWARDS.find(x=>x.id===id);
    if(!r) return;
    /* Cap quotidien VIP — bloque tout rachat le même jour. */
    if(VIP_DAILY_CAP_IDS.includes(id) && wasBoughtVipToday(id)) return;
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
        const res = await creditFreeShares(userCode, n);
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
    if(unlocked.includes(id)) return;
    if(r.currency==='cafe'){
      if(cafes < r.cost) return;
      setCafes(c=>Math.max(0, c - r.cost));
    } else {
      if(coins < r.cost) return;
      spendCoins(r.cost);
    }
    setUnlocked(u=>[...u,id]);
    /* Son d'achat dédié (caisse enregistreuse) */
    playSound('purchase');
  };

  /* Achievements detection */
  const earnedRef = useRef(earnedAchievements); earnedRef.current = earnedAchievements;
  const triggerAchievement = useCallback((id)=>{
    if(earnedRef.current.includes(id)) return;
    const a = ACHIEVEMENTS.find(x=>x.id===id);
    if(!a) return;
    earnedRef.current = [...earnedRef.current, id];
    setEarnedAchievements(earnedRef.current);
    setPendingAchievement(prev => prev || a);
  },[]);

  useEffect(()=>{
    if(showOnboarding) return;
    /* Mode admin → aucun succès attribué (compte de test). */
    if(isAdminName(userName)) return;

    /* "end_game" — apex absolu. Conditions très exigeantes pour vraiment
       le mériter :
       1. Niveau 16 (max après refonte Prestige)
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
      level >= 16 &&
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
      ['trader',         totalInvested >= 500],
      ['end_game',       endGameReady],
    ];
    for(const [id,ok] of checks){
      if(ok && !earnedAchievements.includes(id)){ triggerAchievement(id); break; }
    }
  },[totalEarned, streak, clickRecord, unlocked, level, coins, totalInvested, showOnboarding, earnedAchievements, triggerAchievement, userName]);

  const collectAchievement = ()=>{
    const a = pendingAchievement;
    if(!a) return;
    /* Gain de cookies cristallin pour l'encaissement de l'achievement */
    playSound('coin');
    addCoins(a.bonus);
    if(a.cafesBonus) addCafes(a.cafesBonus);
    setPendingAchievement(null);
  };

  /* GAMES — `levelRequired` (PHASE 6A) :
     - Si `level < levelRequired` → carte verrouillée (cadenas, "Niveau X requis"), clic bloqué
     - On n'affiche que les jeux dont `levelRequired - level <= 1` : le joueur voit
       le prochain palier à débloquer (donne envie), pas tous les futurs jeux d'un coup.
     - `comingSoon:true` marque les jeux dont le code n'existe pas encore (PHASE 6B/6C/6D) :
       le clic reste bloqué même si le niveau est atteint, jusqu'à implémentation. */
  const GAMES = [
    { id:'checkin', Icon:Gift,              title:'Série du jour',       desc:'Plus tu reviens, plus tu gagnes', reward:`+${checkinReward} 🍪 aujourd'hui`, avail:canCheckin, color:'#C17F3C', levelRequired:1 },
    { id:'quiz',    Icon:Star,              title:'Quiz du jour',         desc:'Toutes les 5h', reward:'20 à 60 cookies', avail:canQuiz, color:'#D4A017', levelRequired:1 },
    { id:'spin',    Icon:CircleDot,         title:'Roue de la chance',    desc:`${spinsLeft}/${spinsCap} tours/jour`,       reward:`-100 à +200 cookies (coût ${level>=8?20:10}🍪)`, avail:coins>=(level>=8?20:10) && spinsLeft > 0, color:'#4A2C17', levelRequired:1 },
    { id:'click',   Icon:MousePointerClick, title:'Cookie Click',         desc:'Tapotez le cookie !',       reward:'1 cookie / 2 clics',  avail:coins>=5,    color:'#7D4E1F', levelRequired:1 },
    { id:'pour',    Icon:Coffee,            title:'Stop le café',         desc:'Relâche au bon moment',     reward:'0 à 15 cookies',      avail:true,        color:'#5A3520', levelRequired:1 },
    { id:'memory',  Icon:LayoutGrid,        title:'Memory Café',          desc:'Trouve les paires',         reward:'5 à 50 cookies (coût 10🍪)', avail:coins>=10, color:'#A0784E', levelRequired:2 },
    { id:'guess',   Icon:HelpCircle,        title:'Devine la commande',   desc: level >= 10 ? '8 questions café' : '5 questions café', reward:'0 à 100 cookies (coût 10🍪)', avail:coins>=10,  color:'#8B5A2B', levelRequired:5 },
    { id:'reflex',  Icon:Timer,             title:'Réflexes cookies',     desc:'Tape avant que ça disparaisse', reward:'0 à 50 cookies (coût 5🍪)', avail:coins>=5, color:'#D4A017', levelRequired:6 },
    { id:'pyramid', Icon:Coffee,            title:'Pile de Tasses',       desc:'Empile sans rater',         reward:'5 à 70 cookies (coût 10🍪)', avail:coins>=10, color:'#7D4E1F', levelRequired:8 },
    { id:'slot',    Icon:Dice5,             title:'Machine à Sous',       desc:'3 rouleaux, gros lots',     reward:'+25 à +750 cookies (coût 20🍪)', avail:coins>=20, color:'#5C3614', levelRequired:10 },
  ];

  const s = {
    pill:(active)=>({ padding:'10px 12px', borderRadius:18, flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, transition:'all .2s', background:active?ESPRESSO:'transparent', color:active?'#fff':C.muted }),
    card:{ borderRadius:18, background:C.card, border:`1px solid ${C.border}`, boxShadow:'0 2px 8px rgba(0,0,0,.05)' },
    goldBtn:(disabled)=>({ padding:'13px 36px', borderRadius:20, fontSize:14, fontWeight:700, background:disabled?C.card:GOLD, color:disabled?C.muted:'#fff', border:`2px solid ${disabled?C.border:'transparent'}`, boxShadow:disabled?'none':'0 4px 16px rgba(212,160,23,.4)', cursor:disabled?'not-allowed':'pointer' }),
  };

  return (
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
            <div style={{
              fontSize:22, fontWeight:900,
              /* theme_grains : haut du gradient = crème pâle, donc C.text
                 (calé sur les cards sombres) devient illisible. On force
                 un brun espresso foncé qui passe sur le crème ET reste
                 lisible quand on scroll vers le bas. */
              color: activeTheme === 'theme_grains' ? '#3D1808' : C.text,
              fontStyle:'italic', letterSpacing:'-0.5px', whiteSpace:'nowrap',
            }}>Cooki<span style={{ color:'#C17F3C' }}>Miner</span></div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          <button onClick={()=>{ playSound('modal'); setShowSettings(true); }} aria-label="Paramètres" style={{ width:34, height:34, borderRadius:11, background:C.card, border:`1px solid ${C.border}`, color:C.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Settings size={15} />
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
          Le wrapper externe capte le geste et translate son enfant en
          temps réel (via swipe.ref). Le wrapper interne a key={tab} :
          il se remonte à chaque changement, ce qui rejoue l'animation
          tabSlideIn(Right|Left) selon slideDir. */}
      <div
        ref={swipe.ref}
        {...swipe.handlers}
        style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'0 16px', paddingBottom:104, willChange:'transform' }}
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
            {activeEvent && (
              <EventBanner
                event={activeEvent}
                onView={()=>setShowEventModal(true)}
              />
            )}
            {/* Level card */}
            <button id="card-niveau" onClick={()=>{ playSound('modal'); setShowLevels(true); }} style={{ width:'100%', textAlign:'left', display:'block', borderRadius:24, padding:20, marginBottom:14, background:ESPRESSO, boxShadow:'0 8px 24px rgba(74,44,23,.35)', position:'relative', overflow:'hidden', cursor:'pointer' }}>
              <div style={{ position:'absolute', top:-25, right:-25, width:88, height:88, borderRadius:'50%', background:'rgba(255,255,255,.05)' }} />
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
                Voir tous <ChevronLeft size={11} style={{ transform:'rotate(180deg)' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12, marginTop:14 }}>
                <div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:2, marginBottom:2, display:'flex', alignItems:'center', gap:6 }}>
                    NIVEAU {level}
                    {prestigeLevel > 0 && (
                      <span title={`Prestige ${prestigeLevel} · multiplicateur x${(1 + prestigeLevel * 0.1).toFixed(1)}`} style={{ fontSize:11, fontWeight:800, color:'#FFE066', letterSpacing:.5 }}>
                        {prestigeLevel <= 5 ? '👑'.repeat(prestigeLevel) : `👑×${prestigeLevel}`}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:21, fontWeight:800, color:'#fff' }}>{LEVEL_NAMES[level]}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.6)' }}>Total gagné</div>
                  <div style={{ fontSize:20, fontWeight:800, color:'#fff' }}>{totalEarned} 🍪</div>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,.6)', marginBottom:5 }}>
                <span>Expérience</span><span>{xp}/{xpReq}</span>
              </div>
              <div style={{ height:8, borderRadius:4, background:'rgba(255,255,255,.18)', overflow:'hidden', position:'relative' }}>
                <div style={{ height:'100%', borderRadius:4, width:`${xpPct}%`, background:'rgba(255,255,255,.85)', transition:'width .8s cubic-bezier(.36,.07,.19,.97)', position:'relative', overflow:'hidden' }}>
                  <div className="shimmer-bar" />
                </div>
              </div>
              {badges.length>0 && (
                <div style={{ display:'flex', gap:8, marginTop:10 }}>
                  {badges.map(b=><span key={b.id} title={b.name} style={{ fontSize:20 }}>{b.emoji}</span>)}
                </div>
              )}
            </button>

            {/* Indicateurs boosters actifs (boost ×2 en cours / doubler armé) */}
            {(() => {
              const now = Date.now();
              const boostActive = boostUntil && now < boostUntil;
              if(!boostActive && !nextGameDoubler) return null;
              const formatLeft = (ms) => {
                const totalMin = Math.floor(ms / 60000);
                const h = Math.floor(totalMin / 60);
                const m = totalMin % 60;
                return h > 0 ? `${h}h ${String(m).padStart(2,'0')}min` : `${m}min`;
              };
              return (
                <div className="su" style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
                  {boostActive && (
                    <div style={{
                      padding:'10px 14px', borderRadius:14,
                      background:'linear-gradient(135deg, #D4A017, #C17F3C)',
                      border:'1.5px solid rgba(212,160,23,.6)',
                      boxShadow:'0 4px 14px rgba(212,160,23,.35)',
                      color:'#fff', display:'flex', alignItems:'center', gap:10,
                    }}>
                      <span style={{ fontSize:22 }}>⚡</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, fontWeight:900, letterSpacing:1.5, textTransform:'uppercase', opacity:.9 }}>
                          Boost ×2 actif
                        </div>
                        <div style={{ fontSize:13, fontWeight:700 }}>
                          {formatLeft(boostUntil - now)} restantes
                        </div>
                      </div>
                    </div>
                  )}
                  {nextGameDoubler && (
                    <div style={{
                      padding:'10px 14px', borderRadius:14,
                      background:C.card, border:`1.5px solid #D4A017`,
                      color:C.text, display:'flex', alignItems:'center', gap:10,
                    }}>
                      <span style={{ fontSize:22 }}>🎯</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, fontWeight:900, letterSpacing:1.5, textTransform:'uppercase', color:'#D4A017' }}>
                          Doubler armé
                        </div>
                        <div style={{ fontSize:12.5, fontWeight:600, color:C.muted }}>
                          Le prochain gain 🍪 sera ×2
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Carte Prestige — visible quand niveau 16 atteint avec
                20000 XP cumulés. Renaître = repartir lvl 1 avec un
                multiplicateur permanent. */}
            {level >= 16 && xp >= 20000 && (
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
                  <div style={{ fontSize:11, fontWeight:900, color:'#FFE066', letterSpacing:1.5, textTransform:'uppercase', marginBottom:2 }}>
                    Renaissance disponible
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#fff', lineHeight:1.4, marginBottom:2 }}>
                    Recommence niveau 1 — multiplicateur permanent
                  </div>
                  <div style={{ fontSize:11.5, color:'#F0C050', fontWeight:700 }}>
                    Prochain bonus : x{(1 + (prestigeLevel + 1) * 0.1).toFixed(1)} 🍪
                  </div>
                </div>
                <ChevronLeft size={18} color="#F0C050" style={{ transform:'rotate(180deg)' }} />
              </button>
            )}

            {/* Stats — Série uniquement (Record clics retiré) */}
            <div style={{ marginBottom:14 }}>
              <div style={{ ...s.card, padding:16, textAlign:'center' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginBottom:6 }}>
                  <Flame size={14} color="#E07040" />
                  <span style={{ fontSize:11, color:C.muted, fontWeight:700 }}>Série</span>
                </div>
                <div style={{ fontSize:28, fontWeight:800, color:C.text }}>{streak}</div>
                <div style={{ fontSize:11, color:C.muted }}>jour{streak>1?'s':''} consécutif{streak>1?'s':''}</div>
              </div>
            </div>

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
                      {g.avail && <span className="pulse-ring" style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:GOLD, color:'#fff' }}>Dispo</span>}
                    </div>
                    <div style={{ fontSize:11, color:C.muted }}>{g.desc} · {g.reward}</div>
                  </div>
                  <ChevronLeft size={16} color={C.muted} style={{ transform:'rotate(180deg)' }} />
                </button>
              ))}
            </div>

            {/* Achievements */}
            {(() => {
              const visibleAchievements = ACHIEVEMENTS;
              const half = Math.ceil(visibleAchievements.length/2);
              /* end_game est en dernière position dans ACHIEVEMENTS donc
                 invisible tant que l'utilisateur ne déroule pas — surprise
                 cachée à la fin pour récompenser la curiosité. */
              const list = showAllAchievements ? visibleAchievements : visibleAchievements.slice(0, half);
              return (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:22, marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>MES SUCCÈS 🏆</div>
                    <div style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{earnedAchievements.length} / {visibleAchievements.length}</div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {list.map(a=>{
                      const got = earnedAchievements.includes(a.id);
                      const isEndGame = a.id === 'end_game';
                      const isApex = isEndGame;
                      /* Pour end_game (apex final), on calcule la progression
                         de chaque condition pour que le user sache exactement
                         ce qu'il lui manque. */
                      let endGamePrereqs = null;
                      if(isEndGame && !got){
                        const succesList = ACHIEVEMENTS.filter(x => x.id !== 'end_game');
                        const succesDone = succesList.filter(p => earnedAchievements.includes(p.id)).length;
                        const shopList = REWARDS.filter(r => r.currency !== 'cafe' && !r.limited);
                        const shopDone = shopList.filter(r => unlocked.includes(r.id)).length;
                        const secretList = Object.values(SECRET_BADGES);
                        const secretDone = secretList.filter(b => unlocked.includes(b.id)).length;
                        const eventList = REWARDS.filter(r => r.limited);
                        const eventDone = eventList.filter(r => unlocked.includes(r.id)).length;
                        endGamePrereqs = {
                          levelOk:    level >= 16,
                          succesDone, succesTotal: succesList.length,
                          succesOk:   succesDone === succesList.length,
                          shopDone,   shopTotal:   shopList.length,
                          shopOk:     shopDone === shopList.length,
                          secretDone, secretTotal: secretList.length,
                          secretOk:   secretDone === secretList.length,
                          eventDone,  eventTotal:  eventList.length,
                          eventOk:    eventDone === eventList.length,
                        };
                      }
                      /* Style apex spécial — différencié obtenu vs verrouillé :
                           · OBTENU : fond or vif éclatant + halo pulsant
                           · VERROUILLÉ : fond espresso sombre + cadenas, pas de halo
                         Dans les 2 cas la carte ressort fort (gradient + span 2). */
                      const apexStyle = isEndGame
                        ? (got
                            ? { background:'linear-gradient(135deg, #FFE5A0, #F0C050, #E8B040)', border:'2px solid #D4A017' }
                            : { background:'linear-gradient(135deg, #3D2010, #2C1810, #1F0E08)', border:'2px solid rgba(212,160,23,.55)' })
                        : { border: isApex ? '1.5px solid rgba(212,160,23,.55)' : undefined };
                      /* Couleurs de texte selon état apex */
                      const apexTitleColor   = isEndGame ? (got ? '#5D3A1F' : '#F0C050') : C.text;
                      const apexDescColor    = isEndGame ? (got ? '#7D4E1F' : '#C8A878') : C.muted;
                      const apexBonusColor   = isEndGame ? (got ? '#5D3A1F' : '#F0C050') : '#D4A017';
                      const apexBoxBg        = isEndGame && !got ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.5)';
                      const apexBoxBorder    = isEndGame && !got ? '1px dashed rgba(212,160,23,.4)' : '1px dashed rgba(93,58,31,.45)';
                      const apexCheckColor   = isEndGame && !got ? '#F0C050' : '#5D3A1F';
                      const apexUncheckColor = isEndGame && !got ? '#A88060' : '#A07854';

                      return (
                        <div
                          key={a.id}
                          className={isEndGame && got ? 'glow-anim' : ''}
                          style={{
                            ...s.card,
                            padding:'12px 12px',
                            display:'flex', alignItems:'flex-start', gap:10,
                            opacity:got ? 1 : (isEndGame ? 1 : .55),
                            position:'relative',
                            gridColumn: isEndGame ? 'span 2' : undefined,
                            ...apexStyle,
                          }}
                        >
                          {/* Cadenas overlay quand l'apex est verrouillé */}
                          {isEndGame && !got && (
                            <div style={{
                              position:'absolute', top:8, right:8,
                              width:26, height:26, borderRadius:'50%',
                              background:'rgba(15,8,4,.7)',
                              border:'1.5px solid rgba(212,160,23,.6)',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:13, lineHeight:1,
                              boxShadow:'0 2px 6px rgba(0,0,0,.4)',
                            }}>
                              🔒
                            </div>
                          )}
                          <div style={{
                            fontSize: isEndGame ? 30 : 24,
                            flexShrink:0,
                            filter: got
                              ? 'none'
                              : isEndGame
                                ? 'grayscale(.4) brightness(.85)'
                                : 'grayscale(.7)',
                            opacity: isEndGame && !got ? .85 : 1,
                            lineHeight:1,
                          }}>
                            {got ? a.emoji : (isEndGame ? '🏆' : '🔒')}
                          </div>
                          <div style={{ minWidth:0, flex:1 }}>
                            <div style={{
                              fontSize: isEndGame ? 13 : 11,
                              fontWeight:900,
                              color: apexTitleColor,
                              lineHeight:1.2, marginBottom:2,
                              letterSpacing: isEndGame ? .3 : 0,
                            }}>
                              {a.name}
                            </div>
                            <div style={{
                              fontSize:10,
                              color: apexDescColor,
                              lineHeight:1.3,
                              fontWeight: isEndGame ? 600 : 'normal',
                            }}>
                              {a.desc}
                            </div>
                            {endGamePrereqs && (
                              <div style={{
                                marginTop:6, padding:'7px 9px', borderRadius:8,
                                background: apexBoxBg,
                                border: apexBoxBorder,
                                fontSize:10, lineHeight:1.65, fontWeight:700,
                              }}>
                                <div style={{ color: endGamePrereqs.levelOk ? apexCheckColor : apexUncheckColor }}>
                                  {endGamePrereqs.levelOk ? '✓' : '○'} Niveau {level}/16
                                </div>
                                <div style={{ color: endGamePrereqs.succesOk ? apexCheckColor : apexUncheckColor }}>
                                  {endGamePrereqs.succesOk ? '✓' : '○'} {endGamePrereqs.succesDone}/{endGamePrereqs.succesTotal} autres succès
                                </div>
                                <div style={{ color: endGamePrereqs.shopOk ? apexCheckColor : apexUncheckColor }}>
                                  {endGamePrereqs.shopOk ? '✓' : '○'} {endGamePrereqs.shopDone}/{endGamePrereqs.shopTotal} items boutique 🍪
                                </div>
                                <div style={{ color: endGamePrereqs.secretOk ? apexCheckColor : apexUncheckColor }}>
                                  {endGamePrereqs.secretOk ? '✓' : '○'} {endGamePrereqs.secretDone}/{endGamePrereqs.secretTotal} badges secrets
                                </div>
                                <div style={{ color: endGamePrereqs.eventOk ? apexCheckColor : apexUncheckColor }}>
                                  {endGamePrereqs.eventOk ? '✓' : '○'} {endGamePrereqs.eventDone}/{endGamePrereqs.eventTotal} récompenses événements
                                </div>
                              </div>
                            )}
                            <div style={{
                              fontSize:10,
                              color: apexBonusColor,
                              fontWeight:800, marginTop:4,
                            }}>
                              +{a.bonus} 🍪{a.cafesBonus ? ` · +${a.cafesBonus} ☕` : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {visibleAchievements.length > half && (
                    <button
                      onClick={()=>setShowAllAchievements(v=>!v)}
                      style={{ width:'100%', marginTop:10, padding:'10px', borderRadius:12, background:'transparent', border:`1px dashed ${C.border}`, color:C.muted, fontSize:12, fontWeight:700, letterSpacing:.3 }}
                    >
                      {showAllAchievements ? 'Voir moins ↑' : `Voir plus (${visibleAchievements.length - half}) ↓`}
                    </button>
                  )}
                </>
              );
            })()}

          </div>
        )}

        {/* ── JEUX ── */}
        {tab==='jeux' && (
          <div className="su">
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:12, paddingTop:4 }}>CHOISIR UN JEU</div>
            {GAMES.filter(g => g.id !== 'checkin' && g.id !== 'quiz' && g.levelRequired - level <= 1).map(g=>{
              const locked     = level < g.levelRequired;
              const comingSoon = !locked && g.comingSoon;
              const blocked    = locked || comingSoon;
              const onClick    = blocked ? undefined : ()=>{ playSound('modal'); setGameView(g.id); };

              return (
                <button
                  key={g.id}
                  onClick={onClick}
                  disabled={blocked}
                  style={{
                    width:'100%', borderRadius:20, overflow:'hidden',
                    boxShadow: blocked ? '0 2px 8px rgba(0,0,0,.06)' : '0 4px 16px rgba(0,0,0,.1)',
                    marginBottom:12, textAlign:'left', display:'block',
                    cursor: blocked ? 'not-allowed' : 'pointer',
                    opacity: locked ? .65 : 1,
                  }}
                >
                  <div style={{
                    padding:18,
                    background: locked ? 'linear-gradient(135deg,#3D2010,#2A1508)' : g.color,
                    display:'flex', alignItems:'center', gap:14,
                    filter: locked ? 'grayscale(.4)' : 'none',
                  }}>
                    <div style={{ width:54, height:54, borderRadius:16, background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' }}>
                      <g.Icon size={26} color="#fff" />
                      {locked && (
                        <div style={{ position:'absolute', bottom:-4, right:-4, width:22, height:22, borderRadius:'50%', background:'#1A0E08', border:'2px solid #4A2C17', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Lock size={11} color="#F0E0C0" />
                        </div>
                      )}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:17, fontWeight:800, color:'#fff' }}>{g.title}</div>
                      <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', marginTop:2 }}>{g.desc}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,.6)' }}>Récompense</div>
                      <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{g.reward}</div>
                    </div>
                  </div>
                  <div style={{ padding:'10px 18px', background:C.card, borderTop:`1px solid ${C.border}`, display:'flex', justifyContent: locked ? 'center' : (g.avail ? 'space-between' : 'flex-end'), alignItems:'center', gap:6 }}>
                    {locked ? (
                      <span style={{ fontSize:12, fontWeight:700, color:C.muted, display:'flex', alignItems:'center', gap:6, letterSpacing:.3 }}>
                        <Lock size={12} /> Niveau {g.levelRequired} requis
                      </span>
                    ) : comingSoon ? (
                      <span style={{ fontSize:12, fontWeight:700, color:'#C17F3C', letterSpacing:.3 }}>
                        ✨ Bientôt disponible
                      </span>
                    ) : (
                      <>
                        {g.avail && <span style={{ fontSize:12, fontWeight:700, color:'#D4A017', display:'flex', alignItems:'center', gap:5 }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#D4A017', display:'inline-block' }} />Disponible</span>}
                        <span style={{ fontSize:12, color:C.muted, fontWeight:600 }}>Jouer →</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
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
            onOpenUserProfile={(code)=>{ playSound('modal'); openUserProfile(code, true); }}
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
              onTradeComplete={(result)=>{
                if(result.type === 'buy'){
                  /* L'achievement 'trader' attend totalInvested >= 500 cookies */
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

        {/* ── BOUTIQUE ── */}
        {tab==='boutique' && (
          <BoutiqueTab
            coins={coins} cafes={cafes} unlocked={unlocked} level={level} onUnlock={unlockReward}
            mode={boutiqueMode} setMode={setBoutiqueMode}
            activeTheme={activeTheme}   setActiveTheme={setActiveTheme}
            activeBanner={activeBanner} setActiveBanner={setActiveBanner}
            activeSkin={activeSkin}     setActiveSkin={setActiveSkin}
            activeTitle={activeTitle}   setActiveTitle={setActiveTitle}
            userAvatar={userAvatar}     setUserAvatar={setUserAvatar}
            spinsLeft={spinsLeft}       slotPlaysLeft={slotPlaysLeft}
            userCode={userCode}
            vipPurchasesToday={vipPurchasesToday}
            C={C}
          />
        )}
        </div>
      </div>

      {/* NAV */}
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, padding:'0 16px 16px', zIndex:40 }}>
        <div style={{ background:isDark?'rgba(30,16,10,.95)':'rgba(253,250,246,.95)', backdropFilter:'blur(12px)', borderRadius:24, border:`1px solid ${C.border}`, boxShadow:'0 8px 32px rgba(0,0,0,.12)', display:'flex', padding:8 }}>
          {[{id:'accueil',Icon:Home,label:'Accueil'},{id:'jeux',Icon:Gamepad2,label:'Jeux'},{id:'classement',Icon:Trophy,label:'Classement'},{id:'marche',Icon:TrendingUp,label:'Marché'},{id:'boutique',Icon:ShoppingBag,label:'Boutique'}].map(item=>{
            const showDot = item.id==='accueil' && (canCheckin || canQuiz);
            return (
              <button key={item.id} id={`nav-${item.id}`} onClick={()=>goToTab(item.id)} style={s.pill(tab===item.id)}>
                <span style={{ position:'relative', display:'inline-flex', lineHeight:0 }}>
                  <item.Icon size={20} />
                  {showDot && (
                    <span className="pulse-ring" style={{ position:'absolute', top:-3, right:-4, width:8, height:8, borderRadius:'50%', background:'#D4A017', boxShadow:'0 0 0 2px '+(isDark?'rgba(30,16,10,.95)':'rgba(253,250,246,.95)') }} />
                  )}
                </span>
                <span style={{ fontSize:11, fontWeight:700 }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* GAME OVERLAY */}
      {gameView && (
        <GameOverlay
          gameView={gameView} onClose={()=>setGameView(null)}
          coins={coins} level={level} streak={streak} canCheckin={canCheckin} canQuiz={canQuiz} clickRecord={clickRecord}
          onCheckin={doCheckin} checkinReward={checkinReward}
          onQuizEarn={addCoins} onQuizDone={()=>{ const ts = Date.now(); setLastQuiz(ts); syncDailyCounters(userCode, { last_quiz: ts }); }} quizMsLeft={quizMsLeft}
          onSpinEarn={addCoins} onSpend={spendCoins}
          onClickEarn={addCoins} onUpdateRecord={s=>setClickRecord(r=>Math.max(r,s))}
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

      {/* ÉVÉNEMENTS SPÉCIAUX (PHASE 6E) — la modale s'ouvre :
          - automatiquement au passage waiting → active (révélation)
          - au clic sur la bannière en phase 'waiting' (teasing
            + trophées déjà gagnés)
          - au clic sur la bannière en phase 'active' (rappel) */}
      {showEventModal && activeEvent && (
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
      {eventReward && (
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
          unlocked={unlocked}
          activeTheme={activeTheme} setActiveTheme={setActiveTheme}
          onReset={()=>{ resetProgress(); setShowSettings(false); }}
          install={installPrompt}
          onOpenAbout={()=>setShowAbout(true)}
          onOpenRestore={()=>setRestoreMode('replace')}
          onStartNewAccount={handleStartNewAccount}
          onOpenPromoCode={()=>setShowPromoCode(true)}
          userCode={userCode}
          restorePin={restorePin}
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
      {marketRefundAmount && (
        <MarketRefundModal
          amount={marketRefundAmount}
          onClose={()=>setMarketRefundAmount(null)}
          C={C}
        />
      )}

      {/* WEEKLY CHAMP MODAL — récompense top 3 du classement hebdo */}
      {weeklyChampReward && (
        <WeeklyChampModal
          rank={weeklyChampReward.rank}
          cafes={weeklyChampReward.cafes}
          weekNum={weeklyChampReward.weekNum}
          onClose={()=>setWeeklyChampReward(null)}
          C={C}
        />
      )}

      {/* SANCTION APPLIED MODAL — avertissement post-débit administratif */}
      {sanctionApplied && (
        <SanctionAppliedModal
          amount={sanctionApplied.amount}
          sharesDebit={sanctionApplied.sharesDebit || 0}
          reason={sanctionApplied.reason}
          onClose={()=>setSanctionApplied(null)}
          C={C}
        />
      )}


      {/* PAYMENT SUCCESS MODAL — popup festif post-achat Stripe */}
      {paymentReceived && (
        <PaymentSuccessModal
          cafesReceived={paymentReceived}
          onClose={()=>setPaymentReceived(null)}
          C={C}
        />
      )}

      {/* CAFES RESET NOTICE — annonce 1× de la refonte économie premium */}
      {showCafesResetNotice && (
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

      {/* NEW VERSION POPUP — pop si lastSeenVersion ≠ APP_INFO.version
          (sauf fresh install). Au close, marque la version comme vue. */}
      {showNewVersion && (
        <NewVersionModal
          onClose={() => {
            setShowNewVersion(false);
            setLastSeenVersion(APP_INFO.version);
          }}
          onOpenAbout={() => setShowAbout(true)}
          C={C}
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
          userName={userName} setUserName={setUserName}
          userAvatar={userAvatar} setUserAvatar={setUserAvatar}
          joinDate={joinDate}
          coins={coins} spendCoins={spendCoins}
          nameChangeCount={nameChangeCount} setNameChangeCount={setNameChangeCount}
          userCode={userCode}
          userBio={userBio} setUserBio={setUserBio}
          level={level} xp={xp} xpReq={xpReq}
          totalEarned={totalEarned} streak={streak} unlocked={unlocked}
          earnedAchievements={earnedAchievements} achievementsTotal={ACHIEVEMENTS.length}
          marketRealized={marketRealized}
          activeTheme={activeTheme}
          activeSkin={activeSkin}   setActiveSkin={setActiveSkin}
          activeTitle={activeTitle} setActiveTitle={setActiveTitle}
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
      {pendingFriendNotifs.length > 0 && (
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
      {secretBadgeReward && (
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
      {pendingLvUp && <LevelUpModal level={pendingLvUp} onCollect={()=>setPendingLvUp(null)} />}

      {/* CAP ANTI-ÉCART TOP 1 — total_earned déjà recalé silencieusement
          à pile 30 % d'avance, le popup explique juste pourquoi. */}
      {gapWarning && !pendingLvUp && (
        <LeaderGapWarningModal
          myTotal={gapWarning.myTotal}
          topTwo={gapWarning.topTwo}
          capped={gapWarning.capped}
          onClose={()=>setGapWarning(null)}
          C={C}
        />
      )}

      {/* ACHIEVEMENT MODAL */}
      {pendingAchievement && !pendingLvUp && (
        <AchievementModal achievement={pendingAchievement} onCollect={collectAchievement} />
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
              setPendingAchievement(null);
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
  );
}

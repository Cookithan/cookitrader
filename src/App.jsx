import { useState, useEffect, useRef, useCallback } from "react";
import { Cookie, ShoppingBag, Gamepad2, Home, Gift, Star, CircleDot, MousePointerClick, ChevronLeft, Settings, TrendingUp, Trophy, Coffee, Flame, Zap, LayoutGrid, HelpCircle, Timer, Lock } from "lucide-react";

import { LEVEL_NAMES, REWARDS, ACHIEVEMENTS, DAILY_REWARDS, QUIZ_COOLDOWN_MS, xpRequired } from "./data/constants.js";
import { DK, LT, THEMES, GOLD, ESPRESSO, PREMIUM_PALETTE } from "./data/themes.js";
import { LEADERBOARD_SCHEMA, generateLeaderboard } from "./data/leaderboard.js";
import { HISTORY_N, TICK_MS, BIG_MOVE_PCT, BIG_EVENTS, SMALL_EVENTS, MEGA_EVENTS, nextPrice } from "./data/market.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { generateUserCode } from "./utils/userCode.js";
import { pickRandomEvent, buildWaitingEvent, ACTIVE_DURATION_MS, MAX_ATTEMPTS, EVENT_LEVEL_MIN } from "./data/events.js";
import { EventBanner } from "./components/EventBanner.jsx";
import { EventAnnounceModal } from "./components/modals/EventAnnounceModal.jsx";
import { EventRewardModal } from "./components/modals/EventRewardModal.jsx";
import { TutorialOverlay } from "./components/tutorial/TutorialOverlay.jsx";
import { ContextHint, CONTEXT_HINTS } from "./components/tutorial/ContextHint.jsx";
import { SkipConfirmModal } from "./components/modals/SkipConfirmModal.jsx";
import { useInstallPrompt } from "./hooks/useInstallPrompt.js";
import { useSwipe } from "./hooks/useSwipe.js";
import { useBackToClose } from "./hooks/useBackToClose.js";
import SplashScreen from "./components/SplashScreen.jsx";
import { isSupabaseEnabled } from "./lib/supabase.js";
import { upsertProfile, deleteMyProfile } from "./lib/supabaseSync.js";
import { NetworkErrorToast } from "./components/NetworkErrorToast.jsx";
import { GLOBAL_CSS } from "./styles/globalStyles.js";

import { AvatarFigure } from "./components/AvatarFigure.jsx";
import { LevelsModal } from "./components/modals/LevelsModal.jsx";
import { LevelUpModal } from "./components/modals/LevelUpModal.jsx";
import { AchievementModal } from "./components/modals/AchievementModal.jsx";
import { OnboardingModal } from "./components/modals/OnboardingModal.jsx";
import { SettingsOverlay } from "./components/overlays/SettingsOverlay.jsx";
import { ProfileOverlay } from "./components/overlays/ProfileOverlay.jsx";
import { GameOverlay } from "./components/overlays/GameOverlay.jsx";
import { BoutiqueTab } from "./components/tabs/BoutiqueTab.jsx";
import { ClassementTab } from "./components/tabs/ClassementTab.jsx";
import { MarketTab } from "./components/tabs/MarketTab.jsx";
import { MarketLocked } from "./components/tabs/MarketLocked.jsx";
import { InboxModal } from "./components/modals/InboxModal.jsx";
import { getUnreadInboxCount } from "./lib/inbox.js";
import { useToast } from "./components/Toaster.jsx";
import { FriendNotificationModal } from "./components/modals/FriendNotificationModal.jsx";
import { getReceivedFriendRequests, getNewlyAcceptedFriends, getFriends } from "./lib/supabaseSync.js";
import { UserProfileModal } from "./components/modals/UserProfileModal.jsx";
import { UpgradeNoticeModal } from "./components/modals/UpgradeNoticeModal.jsx";
import { SecretBadgeUnlockModal } from "./components/modals/SecretBadgeUnlockModal.jsx";
import { SECRET_BADGES, SECRET_BADGE_BONUS } from "./data/secretBadges.js";
import { setupAudioOnFirstInteraction, playSound } from "./lib/audio.js";

/* ⚠️ Avis de maintenance affiché à CHAQUE ouverture de l'app jusqu'à
   nouvel ordre du user (pas de persistance LS volontaire).
   Pour le désactiver : retire la prop dans le JSX en bas de App.jsx
   (ou supprime carrément l'import et le composant). */

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
       market.js      — PRICE_*, TICK_MS, MARKET_EVENTS, nextPrice(), fmt()
     hooks/useLocalStorage.js  — persistance auto (clé préfixée 'cookiminer:')
     utils/spin.js             — TW, SEG_A, SEG_C, wRandom (géométrie roue)
     styles/globalStyles.js    — bloc <style> global (keyframes + classes utilitaires)
     components/
       AvatarFigure.jsx · Sparkline.jsx
       cookies/   — PremiumCookie · SkinnedCookie
       modals/    — LevelsModal · LevelUpModal · AchievementModal · OnboardingModal · TradeModal
       overlays/  — SettingsOverlay · ProfileOverlay · GameOverlay
       games/     — CheckinGame · QuizGame · SpinGame · ClickGame · PourGame
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
  const [level,       setLevel]       = useLocalStorage('level',       1);
  const [xp,          setXp]          = useLocalStorage('xp',          0);
  const [streak,      setStreak]      = useLocalStorage('streak',      0);
  const [clickRecord, setClickRecord] = useLocalStorage('clickRecord', 0);
  const [unlocked,    setUnlocked]    = useLocalStorage('unlocked',    []);
  const [lastCheckin, setLastCheckin] = useLocalStorage('lastCheckin', null);
  const [lastQuiz,    setLastQuiz]    = useLocalStorage('lastQuiz',    null);
  const [dark,        setDark]        = useLocalStorage('dark',        false);
  const [currentPrice, setCurrentPrice] = useLocalStorage('ckmPrice',    100);
  const [priceHistory, setPriceHistory] = useLocalStorage('ckmHistory',  [100]);
  const [ckmShares,    setCkmShares]    = useLocalStorage('ckmShares',   0);
  const [ckmCostBasis, setCkmCostBasis] = useLocalStorage('ckmBasis',    0);
  const [marketTrades,   setMarketTrades]   = useLocalStorage('marketTrades',   0);
  const [marketRealized, setMarketRealized] = useLocalStorage('marketRealized', 0);
  const [marketHistory,  setMarketHistory]  = useLocalStorage('marketHistory',  []);
  const [leaderboard,    setLeaderboard]    = useLocalStorage('leaderboard',    null);
  const [leaderboardLastBoost, setLeaderboardLastBoost] = useLocalStorage('leaderboardLastBoost', '');
  const [leaderboardLastHourly, setLeaderboardLastHourly] = useLocalStorage('leaderboardLastHourly', 0);
  const [marketEvent,      setMarketEvent]      = useState(null);
  const [marketEventTicks, setMarketEventTicks] = useState(0);
  const [marketBigMoveAt,  setMarketBigMoveAt]  = useState(0);
  const [userName,    setUserName]    = useLocalStorage('userName',   '');
  const [userAvatar,  setUserAvatar]  = useLocalStorage('userAvatar', null);
  const [joinDate,    setJoinDate]    = useLocalStorage('joinDate',   '');
  const [nameChangeCount, setNameChangeCount] = useLocalStorage('nameChangeCount', 0);
  const [userCode,    setUserCode]    = useLocalStorage('userCode', '');
  const [userBio,     setUserBio]     = useLocalStorage('userBio',  '');
  /* Volatil : repart toujours à false au mount → popup réaffichée à
     chaque ouverture de l'app jusqu'à nouvel ordre. */
  const [upgradeNoticeAck, setUpgradeNoticeAck] = useState(false);

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
     d'ambiance dès le 1er tap (autoplay mobile bloqué sinon). */
  useEffect(() => {
    setupAudioOnFirstInteraction();
  }, []);

  /* Sync Supabase debouncé (5s). Crée OU met à jour le profil via upsert
     selon que user_code existe déjà ou non — pas de logique séparée
     "création" / "update" à gérer côté client.
     Skipped si Supabase off, pas de userCode, ou pas encore d'userName
     (l'utilisateur n'a pas fini l'onboarding). */
  /* État "online" optimiste : on suppose que la sync marche. Ne passe
     à `error` que si un upsert échoue (réseau, RLS, etc.). Ça évite
     l'effet "Hors ligne" pendant les 5s du debounce initial. */
  const [supabaseError, setSupabaseError] = useState(false);
  useEffect(()=>{
    if(!isSupabaseEnabled()) return;
    if(!userCode || !userName) return;
    const t = setTimeout(async ()=>{
      const res = await upsertProfile({
        userCode, userName, userAvatar, level, totalEarned,
        coins, streak, userBio,
      });
      setSupabaseError(!res?.ok);
    }, 5000);
    return ()=>clearTimeout(t);
  }, [userCode, userName, userAvatar, level, totalEarned, coins, streak, userBio]);
  const [earnedAchievements, setEarnedAchievements] = useLocalStorage('achievements', []);
  const [totalInvested,      setTotalInvested]      = useLocalStorage('totalInvested', 0);
  const [pendingAchievement, setPendingAchievement] = useState(null);
  const [activeTheme,  setActiveTheme]  = useLocalStorage('activeTheme', '');
  const [activeSkin,   setActiveSkin]   = useLocalStorage('activeSkin',  '');
  const [activeRoue,   setActiveRoue]   = useLocalStorage('activeRoue',  '');
  const [activeBanner, setActiveBanner] = useLocalStorage('activeBanner','');
  const [activeTitle,  setActiveTitle]  = useLocalStorage('activeTitle', '');
  const [pendingLvUp,  setPendingLvUp]  = useState(null);
  const [tab,          setTab]          = useState('accueil');
  const [gameView,     setGameView]     = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);
  const [showLevels,   setShowLevels]   = useState(false);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [boutiqueMode, setBoutiqueMode] = useState('shop'); // 'shop' | 'premium'
  const [cafeToast,    setCafeToast]    = useState(null);   // { amount, key } | null
  const cafeToastTimerRef = useRef(null);

  /* Inbox (BRIEF_INBOX) — modale + compteur de non-lus.
     Compteur rafraîchi toutes les 30s tant qu'on a un userCode + Supabase actif. */
  const [showInbox,        setShowInbox]        = useState(false);
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);
  const { showToast } = useToast();

  /* Notifs amis au lancement (BRIEF_DEMANDES_AMIS) — file de notifs popées
     une à une. Détection au mount via getReceivedFriendRequests +
     getNewlyAcceptedFriends. Anti-spam : LS notifiedRequestIds garde les IDs
     déjà notifiés pour ne pas re-popper la même demande à chaque ouverture. */
  const [pendingFriendNotifs, setPendingFriendNotifs] = useState([]);

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

  const goToTab = (target) => {
    const i = TAB_ORDER.indexOf(tab);
    const j = TAB_ORDER.indexOf(target);
    if(j === -1 || j === i) { setTab(target); return; }
    playSound('tab');
    setSlideDir(j > i ? 'next' : 'prev');
    setTab(target);
  };

  const swipeBlocked = !!(gameView || showSettings || showProfile || showLevels || showOnboarding || showSkipConfirm || showEventModal || eventReward || showInbox || viewingProfile || secretBadgeReward || pendingFriendNotifs.length > 0 || tutorialStep > 0 || pendingLvUp || pendingAchievement);
  const swipe = useSwipe({
    enabled: !swipeBlocked,
    onLeft:  () => {
      const i = TAB_ORDER.indexOf(tab);
      if(i >= 0 && i < TAB_ORDER.length - 1) goToTab(TAB_ORDER[i + 1]);
    },
    onRight: () => {
      const i = TAB_ORDER.indexOf(tab);
      if(i > 0) goToTab(TAB_ORDER[i - 1]);
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

  /* Avance d'une étape du tuto (avec auto-marquage à la fin) */
  const TUTORIAL_TOTAL_STEPS = 5;
  const tutorialNext = () => {
    setTutorialStep(s => {
      const next = s + 1;
      if(next > TUTORIAL_TOTAL_STEPS){
        try{ window.localStorage.setItem('cookiminer:tutorialCompleted', '1'); }catch{}
        return 0;
      }
      return next;
    });
  };

  const tutorialConfirmSkip = () => {
    setShowSkipConfirm(false);
    setTutorialStep(0);
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
  const xpReq    = xpRequired(level);
  const xpPct    = Math.min((xp/xpReq)*100, 100);
  const canCheckin = lastCheckin !== new Date().toDateString();
  /* lastQuiz est désormais un timestamp ; on tolère l'ancien format string (legacy) en l'ignorant */
  const lastQuizMs = typeof lastQuiz === 'number' ? lastQuiz : 0;
  const quizMsLeft = Math.max(0, QUIZ_COOLDOWN_MS - (Date.now() - lastQuizMs));
  const canQuiz    = quizMsLeft === 0;
  const badges     = REWARDS.filter(r=>r.type==='Badge' && unlocked.includes(r.id));

  /* actions */
  /* `amount`     : delta appliqué aux coins (peut être négatif → perte)
     `gainAmount` : delta compté comme "vrai gain" (XP + totalEarned).
                    Par défaut = amount. Sert pour la vente $CKM : on
                    récupère proceeds en coins mais on ne progresse
                    qu'à hauteur de la plus-value (pnl). */
  const addCoins = useCallback((amount, gainAmount = amount)=>{
    if(amount<=0){ setCoins(c=>Math.max(0,c+amount)); return; }
    setCoins(c=>c+amount);

    /* Si on n'est pas sur un "vrai gain", on n'avance pas XP/totalEarned */
    const xpDelta = Math.max(0, gainAmount);
    if(xpDelta <= 0) return;

    setTotalEarned(t=>t+xpDelta);

    const lv  = lvRef.current;
    const cur = xpRef.current;

    /* Niveau max OU sous le seuil → pas de level up, XP avance normalement */
    if(lv>=10 || cur+xpDelta < xpRequired(lv)){
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
    playSound('success');
    if(nl >= 6){
      setTimeout(()=>{ setCafes(c=>c+1); }, 700);
    } else {
      const bonus = 10*nl;
      setTimeout(()=>{ setCoins(c=>c+bonus); setTotalEarned(t=>t+bonus); }, 700);
    }
  },[]);

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

     Mode test Admin : si userName='Admin', les 3 badges sont débloqués
     d'office au mount (modales en cascade via la queue) — permet de
     tester l'affichage sans avoir à attendre 0h-4h, à faire +1000 🍪
     de profit ou à ajouter 3 amis. */
  useEffect(() => {
    if(!userName || showOnboarding) return;
    const isAdmin = (userName || '').trim().toLowerCase() === 'admin';
    if(isAdmin){
      unlockSecretBadge('noctambule');
      unlockSecretBadge('investisseur');
      unlockSecretBadge('amical');
      return;
    }
    /* Cas normal : Noctambule selon l'heure. */
    const hour = new Date().getHours();
    if(hour < 4){
      unlockSecretBadge('noctambule');
    }
  }, [userName, showOnboarding, unlockSecretBadge]);

  useEffect(() => {
    if(marketRealized >= 1000) unlockSecretBadge('investisseur');
  }, [marketRealized, unlockSecretBadge]);

  useEffect(() => {
    if(friendCodes.length >= 3) unlockSecretBadge('amical');
  }, [friendCodes, unlockSecretBadge]);

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

  /* ── ÉVÉNEMENTS SPÉCIAUX (PHASE 6E) ─────────────── */

  /* Tire le prochain event en phase 'waiting' (timer 1h-48h aléatoire,
     ou 1-3 min en mode dev "Admin"). Si tous les events ont déjà
     été complétés → setActiveEvent(null) : plus de cycle. */
  const triggerNextEvent = () => {
    const tpl = pickRandomEvent(completedEvents);
    if(!tpl){ setActiveEvent(null); return; }
    const devMode = (userName || '').trim().toLowerCase() === 'admin';
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
     Une tentative est consommée à chaque appel pour l'event actif courant.
     - Succès → débloque le thème limité, ouvre la modale de récompense,
       lance le prochain cycle (waiting).
     - Échec → décrémente attemptsLeft. Si 0, lance le prochain cycle. */
  const checkEventChallenge = (type, value) => {
    const ev = activeEvent;
    if(!ev || ev.phase !== 'active') return;
    if(Date.now() >= ev.expiresAt) return;
    if(type !== ev.challenge) return;       // pas une tentative pour cet event

    let success = false;
    if(type === 'quiz_perfect') success = value >= 3;       // 3/3 sur quiz Expert (filtré côté QuizGame)
    if(type === 'spin_jackpot') success = value >= 200;
    if(type === 'click_50')     success = value >= 50;

    if(success){
      setUnlocked(u => u.includes(ev.reward.id) ? u : [...u, ev.reward.id]);
      setCompletedEvents(c => c.includes(ev.id) ? c : [...c, ev.id]);
      setEventReward(ev.reward);
      triggerNextEvent();
      return;
    }

    /* Échec d'une tentative */
    const newAttempts = ev.attemptsLeft - 1;
    if(newAttempts <= 0){
      triggerNextEvent();
    } else {
      setActiveEvent(prev => prev ? ({ ...prev, attemptsLeft: newAttempts }) : prev);
    }
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

  /* === Tick global du marché — tourne en arrière-plan dès le niveau 3 === */
  const eventRefGlobal = useRef(null);
  const eventTicksRefGlobal = useRef(0);
  const lastEventIdRef = useRef(null);
  const priceRef = useRef(currentPrice);
  eventRefGlobal.current = marketEvent;
  eventTicksRefGlobal.current = marketEventTicks;
  priceRef.current = currentPrice;

  useEffect(()=>{
    if(level < 3) return;
    const BIG_BEARS = BIG_EVENTS.filter(e => e.biasPct < 0);
    const BIG_BULLS = BIG_EVENTS.filter(e => e.biasPct > 0);
    const pickFrom = (pool) => {
      if(!pool || pool.length === 0) return null;
      if(pool.length === 1) return pool[0];
      const filtered = pool.filter(e => e.id !== lastEventIdRef.current);
      return (filtered.length ? filtered : pool)[Math.floor(Math.random()*(filtered.length || pool.length))];
    };
    const id = setInterval(()=>{
      let ev = eventRefGlobal.current;
      let ticksRemaining = eventTicksRefGlobal.current;
      if(ev){
        ticksRemaining -= 1;
        if(ticksRemaining <= 0){ lastEventIdRef.current = ev.id; setMarketEvent(null); setMarketEventTicks(0); ev = null; }
        else setMarketEventTicks(ticksRemaining);
      } else {
        /* Correction d'extrêmes : si le prix est très éloigné de 100, on force une big news
           dans le sens opposé pour ramener le marché vers sa valeur de base. */
        const p = priceRef.current;
        if(p > 200 && Math.random() < 0.10){
          ev = pickFrom(BIG_BEARS);
        } else if(p < 50 && Math.random() < 0.10){
          ev = pickFrom(BIG_BULLS);
        } else {
          /* Tirage normal : ~1 news par minute (40 ticks à 1.5s)
             0.2% mega · 0.4% big · 2% small → ~2.6%/tick total */
          const r = Math.random();
          if(r < 0.002)            ev = pickFrom(MEGA_EVENTS);
          else if(r < 0.006)       ev = pickFrom(BIG_EVENTS);
          else if(r < 0.026)       ev = pickFrom(SMALL_EVENTS);
        }
        if(ev){ setMarketEvent(ev); setMarketEventTicks(ev.ticks); }
      }
      const bias = ev ? ev.biasPct : 0;
      setCurrentPrice(prev => {
        const np = nextPrice(prev, bias);
        const deltaPct = Math.abs((np - prev) / prev * 100);
        if(deltaPct >= BIG_MOVE_PCT) setMarketBigMoveAt(Date.now());
        setPriceHistory(h => {
          const next = [...h, np];
          return next.length > HISTORY_N ? next.slice(next.length - HISTORY_N) : next;
        });
        return np;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [level]);
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
    setStreak(0); setClickRecord(0); setUnlocked([]);
    setLastCheckin(null); setLastQuiz(null); setDark(false);
    setCurrentPrice(100); setPriceHistory([100]);
    setCkmShares(0); setCkmCostBasis(0);
    setMarketTrades(0); setMarketRealized(0); setMarketHistory([]);
    setMarketEvent(null); setMarketEventTicks(0); setMarketBigMoveAt(0);
    setLeaderboard(null); setLeaderboardLastBoost(''); setLeaderboardLastHourly(0);
    setUserName(''); setUserAvatar(null); setJoinDate(''); setNameChangeCount(0); setUserCode(''); setUserBio('');
    setEarnedAchievements([]); setTotalInvested(0); setPendingAchievement(null);
    setActiveTheme(''); setActiveSkin(''); setActiveRoue(''); setActiveBanner(''); setActiveTitle('');
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
  const doCheckin    = ()=>{ playSound('success'); addCoins(checkinReward); setStreak(s=>s+1); setLastCheckin(new Date().toDateString()); };
  const unlockReward = (id)=>{
    const r=REWARDS.find(x=>x.id===id);
    if(!r||unlocked.includes(id)) return;
    if(r.currency==='cafe'){
      if(cafes < r.cost) return;
      setCafes(c=>Math.max(0, c - r.cost));
    } else {
      if(coins < r.cost) return;
      spendCoins(r.cost);
    }
    setUnlocked(u=>[...u,id]);
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

  const masterRevealed = unlocked.includes('reveal_master');

  useEffect(()=>{
    if(showOnboarding) return;
    /* "master_succes" : caché tant que reveal_master n'est pas acheté.
       Se déclenche si TOUS les autres succès sont gagnés. */
    const otherIds = ACHIEVEMENTS.filter(a => a.id !== 'master_succes').map(a => a.id);
    const allOthersDone = otherIds.every(id => earnedAchievements.includes(id));
    const checks = [
      ['first_cookie',   totalEarned >= 1],
      ['first_purchase', unlocked.length >= 1],
      ['streak_3',       streak >= 3],
      ['streak_7',       streak >= 7],
      ['level_3',        level >= 3],
      ['level_6',        level >= 6],
      ['level_10',       level >= 10],
      ['trader',         totalInvested >= 500],
      ['master_succes',  masterRevealed && allOthersDone],
    ];
    for(const [id,ok] of checks){
      if(ok && !earnedAchievements.includes(id)){ triggerAchievement(id); break; }
    }
  },[totalEarned, streak, clickRecord, unlocked, level, coins, totalInvested, showOnboarding, earnedAchievements, triggerAchievement, masterRevealed]);

  const collectAchievement = ()=>{
    const a = pendingAchievement;
    if(!a) return;
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
    { id:'checkin', Icon:Gift,              title:'Check-in quotidien',  desc:'Plus tu reviens, plus tu gagnes', reward:`+${checkinReward} 🍪 aujourd'hui`, avail:canCheckin, color:'#C17F3C', levelRequired:1 },
    { id:'quiz',    Icon:Star,              title:'Quiz café',            desc:'Toutes les 5h', reward:'20 à 60 cookies', avail:canQuiz, color:'#D4A017', levelRequired:1 },
    { id:'spin',    Icon:CircleDot,         title:'Roue de la fortune',   desc:'Tentez votre chance',       reward:'Variable (coût 20🍪)',avail:coins>=20,   color:'#4A2C17', levelRequired:1 },
    { id:'click',   Icon:MousePointerClick, title:'Défi de clics',        desc:'Tapotez le cookie !',       reward:'1 cookie / 2 clics',  avail:coins>=5,    color:'#7D4E1F', levelRequired:1 },
    { id:'pour',    Icon:Coffee,            title:'Stop le café',         desc:'Relâche au bon moment',     reward:'0 à 15 cookies',      avail:true,        color:'#5A3520', levelRequired:1 },
    { id:'memory',  Icon:LayoutGrid,        title:'Memory Café',          desc:'Trouve les paires',         reward:'5 à 50 cookies (coût 10🍪)', avail:coins>=10, color:'#A0784E', levelRequired:2 },
    { id:'guess',   Icon:HelpCircle,        title:'Devine la commande',   desc:'5 questions café',          reward:'0 à 60 cookies (coût 5🍪)',  avail:coins>=5,  color:'#8B5A2B', levelRequired:3 },
    { id:'reflex',  Icon:Timer,             title:'Réflexes café',        desc:'Tape avant que ça disparaisse', reward:'0 à 50 cookies (coût 5🍪)', avail:coins>=5, color:'#D4A017', levelRequired:4 },
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
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, flexShrink:0 }}>
          {userName && userAvatar !== null && (
            <button onClick={()=>{ playSound('modal'); setShowProfile(true); }} aria-label="Profil" style={{ padding:0, background:'transparent', border:'none', flexShrink:0 }}>
              <AvatarFigure value={userAvatar} size={42} />
            </button>
          )}
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:3, marginBottom:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:140 }}>{userName ? `BONJOUR ${userName.toUpperCase()}` : 'BIENVENUE'}</div>
            <div style={{ fontSize:22, fontWeight:900, color:C.text, fontStyle:'italic', letterSpacing:'-0.5px', whiteSpace:'nowrap' }}>Cooki<span style={{ color:'#C17F3C' }}>Miner</span></div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:1, minWidth:0 }}>
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
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:2, marginBottom:2 }}>NIVEAU {level}</div>
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

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              {[
                { Icon:Flame, label:'Série',        value:streak,      sub:`jour${streak>1?'s':''} consécutif${streak>1?'s':''}`, col:'#E07040' },
                { Icon:Zap,   label:'Record clics', value:clickRecord, sub:'en 10 secondes',                                       col:'#D4A017' },
              ].map(({Icon,label,value,sub,col})=>(
                <div key={label} style={{ ...s.card, padding:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                    <Icon size={14} color={col} />
                    <span style={{ fontSize:11, color:C.muted, fontWeight:700 }}>{label}</span>
                  </div>
                  <div style={{ fontSize:28, fontWeight:800, color:C.text }}>{value}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Games */}
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>TON CAFÉ DU JOUR</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {GAMES.filter(g => g.id === 'checkin' || g.id === 'quiz').map((g,i)=>(
                <button key={g.id} id={g.id === 'checkin' ? 'card-checkin' : undefined} onClick={()=>setGameView(g.id)} className={`su stagger-${i+1}`} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', ...s.card, textAlign:'left' }}>
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

            {/* Achievements (filtre les hidden non révélés) */}
            {(() => {
              const visibleAchievements = ACHIEVEMENTS.filter(a => !a.hidden || masterRevealed);
              const half = Math.ceil(visibleAchievements.length/2);
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
                      return (
                        <div key={a.id} style={{ ...s.card, padding:'12px 12px', display:'flex', alignItems:'center', gap:10, opacity:got?1:.55, position:'relative', border:a.id==='master_succes' ? '1.5px solid rgba(212,160,23,.55)' : undefined }}>
                          <div style={{ fontSize:24, flexShrink:0, filter: got?'none':'grayscale(.7)' }}>{got?a.emoji:'🔒'}</div>
                          <div style={{ minWidth:0, flex:1 }}>
                            <div style={{ fontSize:11, fontWeight:800, color:C.text, lineHeight:1.2, marginBottom:2 }}>{a.name}</div>
                            <div style={{ fontSize:10, color:C.muted, lineHeight:1.3 }}>{a.desc}</div>
                            <div style={{ fontSize:10, color:'#D4A017', fontWeight:700, marginTop:3 }}>+{a.bonus} 🍪</div>
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
              const onClick    = blocked ? undefined : ()=>setGameView(g.id);

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
            onOpenProfile={()=>{ playSound('modal'); setShowProfile(true); }}
            onOpenUserProfile={(code)=>{ playSound('modal'); openUserProfile(code, true); }}
            C={C}
          />
        )}

        {/* ── MARCHÉ ── */}
        {tab==='marche' && (
          level >= 3 ? (
            <MarketTab
              coins={coins}
              currentPrice={currentPrice}
              priceHistory={priceHistory}
              ckmShares={ckmShares} setCkmShares={setCkmShares}
              ckmCostBasis={ckmCostBasis} setCkmCostBasis={setCkmCostBasis}
              marketTrades={marketTrades} setMarketTrades={setMarketTrades}
              marketRealized={marketRealized} setMarketRealized={setMarketRealized}
              marketHistory={marketHistory} setMarketHistory={setMarketHistory}
              event={marketEvent} eventTicks={marketEventTicks} bigMoveAt={marketBigMoveAt}
              onSpend={spendCoins} onEarn={addCoins} onAddCafe={addCafes}
              onInvest={(amount)=>setTotalInvested(t=>t+amount)}
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
            activeSkin={activeSkin}     setActiveSkin={setActiveSkin}
            activeRoue={activeRoue}     setActiveRoue={setActiveRoue}
            activeBanner={activeBanner} setActiveBanner={setActiveBanner}
            activeTitle={activeTitle}   setActiveTitle={setActiveTitle}
            userAvatar={userAvatar}     setUserAvatar={setUserAvatar}
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
              <button key={item.id} id={item.id === 'jeux' ? 'nav-jeux' : item.id === 'boutique' ? 'nav-boutique' : undefined} onClick={()=>goToTab(item.id)} style={s.pill(tab===item.id)}>
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
          coins={coins} streak={streak} canCheckin={canCheckin} canQuiz={canQuiz} clickRecord={clickRecord}
          onCheckin={doCheckin} checkinReward={checkinReward}
          onQuizEarn={addCoins} onQuizDone={()=>setLastQuiz(Date.now())} quizMsLeft={quizMsLeft}
          onSpinEarn={addCoins} onSpend={spendCoins}
          onClickEarn={addCoins} onUpdateRecord={s=>setClickRecord(r=>Math.max(r,s))}
          onJackpot={()=>{ triggerAchievement('jackpot'); }}
          onEventChallenge={checkEventChallenge}
          activeSkin={activeSkin} activeRoue={activeRoue}
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
          C={C}
        />
      )}
      {eventReward && (
        <EventRewardModal
          reward={eventReward}
          onClose={()=>setEventReward(null)}
          onView={()=>{ setShowSettings(true); }}
          C={C}
        />
      )}

      {/* SETTINGS OVERLAY */}
      {showSettings && (
        <SettingsOverlay
          onClose={()=>setShowSettings(false)}
          unlocked={unlocked}
          activeTheme={activeTheme} setActiveTheme={setActiveTheme}
          activeSkin={activeSkin}   setActiveSkin={setActiveSkin}
          activeRoue={activeRoue}   setActiveRoue={setActiveRoue}
          onReset={()=>{ resetProgress(); setShowSettings(false); }}
          install={installPrompt}
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
          earnedAchievements={earnedAchievements} achievementsTotal={ACHIEVEMENTS.filter(a => !a.hidden || masterRevealed).length}
          marketRealized={marketRealized}
          activeTheme={activeTheme} activeSkin={activeSkin} activeRoue={activeRoue}
          activeTitle={activeTitle}
          onReset={()=>{ resetProgress(); setShowProfile(false); }}
          supabaseEnabled={isSupabaseEnabled()}
          supabaseSyncOk={!supabaseError}
          unreadInboxCount={unreadInboxCount}
          onOpenInbox={()=>{ playSound('modal'); setShowInbox(true); }}
          onOpenFriendProfile={(code)=>{ playSound('modal'); openUserProfile(code, false); }}
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

      {/* ACHIEVEMENT MODAL */}
      {pendingAchievement && !pendingLvUp && (
        <AchievementModal achievement={pendingAchievement} onCollect={collectAchievement} />
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
          onComplete={(name, avatarIndex)=>{
            setUserName(name);
            setUserAvatar(avatarIndex);
            if(!joinDate) setJoinDate(new Date().toLocaleDateString('fr-FR'));
            /* 🔑 Code dev — bonus de test si prénom == "Admin" (et compte
               filtré du classement public côté Supabase) */
            if(name.trim().toLowerCase() === 'admin'){
              setCoins(c => c + 1000);
              setTotalEarned(t => t + 1000);
              addCafes(30);
              /* Niveau max sans bonus de level-up qui s'enchaîne */
              setLevel(10);
              setXp(0);
              /* Débloque aussi la révélation du succès caché et le marque gagné */
              setUnlocked(u => u.includes('reveal_master') ? u : [...u, 'reveal_master']);
              /* Tous les succès marqués comme déjà gagnés → pas de modale en cascade */
              setEarnedAchievements(ACHIEVEMENTS.map(a => a.id));
              setPendingAchievement(null);
            }
            setShowOnboarding(false);
          }}
        />
      )}

      {/* TUTORIEL GUIDÉ — déclenché au 1er lancement après onboarding */}
      {tutorialStep > 0 && (
        <TutorialOverlay
          step={tutorialStep}
          onNext={tutorialNext}
          onSkip={()=>setShowSkipConfirm(true)}
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

      {/* Avis de maintenance — réaffiché à CHAQUE ouverture de l'app
          (pas de persistance LS). Tap "j'ai compris" → cache jusqu'au
          prochain refresh. À retirer quand le user le demande. */}
      {!showSplash && !showOnboarding && !upgradeNoticeAck && (
        <UpgradeNoticeModal onAck={()=>setUpgradeNoticeAck(true)} />
      )}
    </div>
  );
}

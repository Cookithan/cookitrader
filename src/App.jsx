import { useState, useEffect, useRef, useCallback } from "react";
import { Cookie, ShoppingBag, Gamepad2, Home, Gift, Star, CircleDot, MousePointerClick, ChevronLeft, Settings, TrendingUp, Trophy, Coffee, Flame, Zap } from "lucide-react";

import { LEVEL_NAMES, REWARDS, ACHIEVEMENTS, DAILY_REWARDS, QUIZ_COOLDOWN_MS } from "./data/constants.js";
import { DK, LT, THEMES, GOLD, ESPRESSO, PREMIUM_PALETTE } from "./data/themes.js";
import { LEADERBOARD_SCHEMA, generateLeaderboard } from "./data/leaderboard.js";
import { HISTORY_N, TICK_MS, BIG_MOVE_PCT, BIG_EVENTS, SMALL_EVENTS, MEGA_EVENTS, nextPrice } from "./data/market.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
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

export default function CookiMiner() {
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
  const [earnedAchievements, setEarnedAchievements] = useLocalStorage('achievements', []);
  const [totalInvested,      setTotalInvested]      = useLocalStorage('totalInvested', 0);
  const [pendingAchievement, setPendingAchievement] = useState(null);
  const [activeTheme, setActiveTheme] = useLocalStorage('activeTheme', '');
  const [activeSkin,  setActiveSkin]  = useLocalStorage('activeSkin',  '');
  const [activeRoue,  setActiveRoue]  = useLocalStorage('activeRoue',  '');
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
  const xpReq    = level * 100;
  const xpPct    = Math.min((xp/xpReq)*100, 100);
  const canCheckin = lastCheckin !== new Date().toDateString();
  /* lastQuiz est désormais un timestamp ; on tolère l'ancien format string (legacy) en l'ignorant */
  const lastQuizMs = typeof lastQuiz === 'number' ? lastQuiz : 0;
  const quizMsLeft = Math.max(0, QUIZ_COOLDOWN_MS - (Date.now() - lastQuizMs));
  const canQuiz    = quizMsLeft === 0;
  const badges     = REWARDS.filter(r=>r.type==='Badge' && unlocked.includes(r.id));

  /* actions */
  const addCoins = useCallback((amount)=>{
    if(amount<=0){ setCoins(c=>Math.max(0,c+amount)); return; }
    setCoins(c=>c+amount);
    setTotalEarned(t=>t+amount);

    const lv  = lvRef.current;
    const cur = xpRef.current;

    /* Niveau max OU sous le seuil → pas de level up, XP avance normalement */
    if(lv>=6 || cur+amount < lv*100){
      const next = cur+amount;
      setXp(next); xpRef.current = next;
      return;
    }

    /* Sinon, exactement UN niveau gagné. L'XP excédentaire est perdue
       (cap volontaire pour éviter les sauts type +200 → 2 niveaux d'un coup). */
    const nl = lv+1, bonus = 10*nl;
    setLevel(nl);   lvRef.current = nl;
    setXp(0);       xpRef.current = 0;
    setPendingLvUp(nl);
    setTimeout(()=>{ setCoins(c=>c+bonus); setTotalEarned(t=>t+bonus); }, 700);
  },[]);

  const spendCoins   = useCallback((a)=>setCoins(c=>Math.max(0,c-a)),[]);

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
    setCoins(0); setCafes(0); setTotalEarned(0); setLevel(1); setXp(0);
    setStreak(0); setClickRecord(0); setUnlocked([]);
    setLastCheckin(null); setLastQuiz(null); setDark(false);
    setCurrentPrice(100); setPriceHistory([100]);
    setCkmShares(0); setCkmCostBasis(0);
    setMarketTrades(0); setMarketRealized(0); setMarketHistory([]);
    setMarketEvent(null); setMarketEventTicks(0); setMarketBigMoveAt(0);
    setLeaderboard(null); setLeaderboardLastBoost(''); setLeaderboardLastHourly(0);
    setUserName(''); setUserAvatar(null); setJoinDate(''); setNameChangeCount(0);
    setEarnedAchievements([]); setTotalInvested(0); setPendingAchievement(null);
    setActiveTheme(''); setActiveSkin(''); setActiveRoue('');
    setPendingLvUp(null); setGameView(null); setTab('accueil');
    setShowOnboarding(true);
  };
  const doCheckin    = ()=>{ addCoins(checkinReward); setStreak(s=>s+1); setLastCheckin(new Date().toDateString()); };
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

  const GAMES = [
    { id:'checkin', Icon:Gift,              title:'Check-in quotidien',  desc:'Plus tu reviens, plus tu gagnes', reward:`+${checkinReward} 🍪 aujourd'hui`, avail:canCheckin, color:'#C17F3C' },
    { id:'quiz',    Icon:Star,              title:'Quiz café',            desc:'Toutes les 5h', reward:'20 à 60 cookies', avail:canQuiz, color:'#D4A017' },
    { id:'spin',    Icon:CircleDot,         title:'Roue de la fortune',   desc:'Tentez votre chance',       reward:'Variable (coût 20🍪)',avail:coins>=20,   color:'#4A2C17' },
    { id:'click',   Icon:MousePointerClick, title:'Défi de clics',        desc:'Tapotez le cookie !',       reward:'1 cookie / 2 clics',  avail:coins>=5,    color:'#7D4E1F' },
    { id:'pour',    Icon:Coffee,            title:'Stop le café',         desc:'Relâche au bon moment',     reward:'0 à 15 cookies',      avail:true,        color:'#5A3520' },
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

      {/* HEADER */}
      <header style={{ padding:'18px 20px 10px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
          {userName && userAvatar !== null && (
            <button onClick={()=>setShowProfile(true)} aria-label="Profil" style={{ padding:0, background:'transparent', border:'none' }}>
              <AvatarFigure value={userAvatar} size={42} />
            </button>
          )}
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:3, marginBottom:1 }}>{userName ? `BONJOUR ${userName.toUpperCase()}` : 'BIENVENUE'}</div>
            <div style={{ fontSize:22, fontWeight:900, color:C.text, fontStyle:'italic', letterSpacing:'-0.5px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>Cooki<span style={{ color:'#C17F3C' }}>Trader</span></div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={()=>setShowSettings(true)} aria-label="Paramètres" style={{ width:34, height:34, borderRadius:11, background:C.card, border:`1px solid ${C.border}`, color:C.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Settings size={15} />
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:5, background:ESPRESSO, borderRadius:20, padding:'8px 12px', border:'1.5px solid rgba(212,160,23,.5)', boxShadow:'0 4px 12px rgba(74,44,23,.4)' }}>
            <Coffee size={14} color="#F0C050" />
            <span key={cafes} className="coin-pop" style={{ fontWeight:800, fontSize:15, color:'#F0C050', display:'inline-block', minWidth:10, textAlign:'center' }}>{cafes}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, background:GOLD, borderRadius:20, padding:'8px 14px', boxShadow:'0 4px 12px rgba(212,160,23,.35)' }} className="gradient-anim">
            <Cookie size={16} color="#fff" />
            <span key={coins} className="coin-pop" style={{ fontWeight:800, fontSize:18, color:'#fff', display:'inline-block', minWidth:14, textAlign:'center' }}>{coins}</span>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 16px', paddingBottom:104 }}>

        {/* ── ACCUEIL ── */}
        {tab==='accueil' && (
          <div className="su">
            {/* Level card */}
            <button onClick={()=>setShowLevels(true)} style={{ width:'100%', textAlign:'left', display:'block', borderRadius:24, padding:20, marginBottom:14, background:ESPRESSO, boxShadow:'0 8px 24px rgba(74,44,23,.35)', position:'relative', overflow:'hidden', cursor:'pointer' }}>
              <div style={{ position:'absolute', top:-25, right:-25, width:88, height:88, borderRadius:'50%', background:'rgba(255,255,255,.05)' }} />
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
                <button key={g.id} onClick={()=>setGameView(g.id)} className={`su stagger-${i+1}`} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', ...s.card, textAlign:'left' }}>
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
            {GAMES.filter(g => g.id !== 'checkin' && g.id !== 'quiz').map(g=>(
              <button key={g.id} onClick={()=>setGameView(g.id)} style={{ width:'100%', borderRadius:20, overflow:'hidden', boxShadow:'0 4px 16px rgba(0,0,0,.1)', marginBottom:12, textAlign:'left', display:'block' }}>
                <div style={{ padding:18, background:g.color, display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:54, height:54, borderRadius:16, background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <g.Icon size={26} color="#fff" />
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
                <div style={{ padding:'10px 18px', background:C.card, borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:g.avail?'space-between':'flex-end', alignItems:'center' }}>
                  {g.avail && <span style={{ fontSize:12, fontWeight:700, color:'#D4A017', display:'flex', alignItems:'center', gap:5 }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#D4A017', display:'inline-block' }} />Disponible</span>}
                  <span style={{ fontSize:12, color:C.muted, fontWeight:600 }}>Jouer →</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── CLASSEMENT ── */}
        {tab==='classement' && (
          <ClassementTab
            leaderboard={leaderboard || []}
            user={{ name:userName, avatar:userAvatar, level, streak, totalEarned, clickRecord, marketRealized, cafes }}
            onOpenProfile={()=>setShowProfile(true)}
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
            activeTheme={activeTheme} setActiveTheme={setActiveTheme}
            activeSkin={activeSkin}   setActiveSkin={setActiveSkin}
            activeRoue={activeRoue}   setActiveRoue={setActiveRoue}
            userAvatar={userAvatar}   setUserAvatar={setUserAvatar}
            C={C}
          />
        )}
      </div>

      {/* NAV */}
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, padding:'0 16px 16px', zIndex:40 }}>
        <div style={{ background:isDark?'rgba(30,16,10,.95)':'rgba(253,250,246,.95)', backdropFilter:'blur(12px)', borderRadius:24, border:`1px solid ${C.border}`, boxShadow:'0 8px 32px rgba(0,0,0,.12)', display:'flex', padding:8 }}>
          {[{id:'accueil',Icon:Home,label:'Accueil'},{id:'jeux',Icon:Gamepad2,label:'Jeux'},{id:'classement',Icon:Trophy,label:'Classement'},{id:'marche',Icon:TrendingUp,label:'Marché'},{id:'boutique',Icon:ShoppingBag,label:'Boutique'}].map(item=>{
            const showDot = item.id==='accueil' && (canCheckin || canQuiz);
            return (
              <button key={item.id} onClick={()=>setTab(item.id)} style={s.pill(tab===item.id)}>
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
          activeSkin={activeSkin} activeRoue={activeRoue}
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
          level={level} xp={xp} xpReq={xpReq}
          totalEarned={totalEarned} streak={streak} unlocked={unlocked}
          earnedAchievements={earnedAchievements} achievementsTotal={ACHIEVEMENTS.filter(a => !a.hidden || masterRevealed).length}
          activeTheme={activeTheme} activeSkin={activeSkin} activeRoue={activeRoue}
          C={C}
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
            /* 🔑 Code dev — bonus de test si prénom == "cookithan" */
            if(name.trim().toLowerCase() === 'cookithan'){
              setCoins(c => c + 1000);
              setTotalEarned(t => t + 1000);
              addCafes(30);
              /* Niveau max sans bonus de level-up qui s'enchaîne */
              setLevel(6);
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
    </div>
  );
}

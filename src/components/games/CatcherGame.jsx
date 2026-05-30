import { useEffect, useRef, useState } from "react";
import { GOLD } from "../../data/themes.js";
import { playSound } from "../../lib/audio.js";
import { useTranslation } from "../../i18n/index.js";
import { getActiveTheme } from "../../data/gameThemes.js";
import { GameThemeSwitcher } from "./GameThemeSwitcher.jsx";

/* ════════════════════════════════════════════════════
   CatcherGame — « Café Express » (refonte design)
   ────────────────────────────────────────────────────
   Tasse SVG custom au bas (anse + soucoupe + vapeur animée), items qui
   tombent du haut (mode normal) ou remontent du bas (variant INVERSE).
   Refonte visuelle 2026-05-26 : background dégradé café riche, tasse
   custom au lieu d'emoji, halos par type d'item, mini-particules au
   catch, screen shake sur glacon, confettis dorés au jackpot final.

   - COST = 10 🍪 · DURÉES sélectionnables = 60 / 120 / 180 s (défaut 60)
   - Items : 🍪 +1 · ☕ +5 · 🧊 glaçon -1 (fige la tasse 500ms)
   - 5 glaçons catchés (ICED_LIMIT) = défaite instantanée (écran "iced")
   - Cookies en chute peuvent muter en glaçon (vibration 500ms d'avertissement)
   - Récompenses 🍪 (paliers scalés ×durée/60) : 240→300 · 170→150 · 120→80 · 85→40 · 55→15 · 30→5
   - Bonus ☕ : +1 si score ≥ 280 (seuil scalé ×durée/60)

   THÈMES (data/gameThemes.js) :
     - skin    : bg, tasseEmoji, itemEmojis, glowColor, darkArena, bgStars
     - variant : INVERSE → tasse en haut, items remontent

   Props : coins, onEarn, onSpend, gameThemes, C
═══════════════════════════════════════════════════════ */

export const CATCHER_COST     = 10;
/* Durées sélectionnables avant la partie (en s). Default = 60 (court). */
export const CATCHER_DURATIONS = [60, 120, 180];
export const CATCHER_DURATION  = 60;   /* legacy export (rétro-compat) */

const ARENA_W   = 360;
const ARENA_H   = 460;
const TASSE_W   = 76;
const TASSE_H   = 62;
const ITEM_SIZE = 48;

/* Game over si on catch ICED_LIMIT glaçons — fin instantanée écran "iced". */
const ICED_LIMIT = 5;

/* Transformation cookie → glaçon en cours de chute. À chaque frame, un
   cookie qui a déjà parcouru ≥ TRANSFORM_AFTER_Y_PCT de l'arena a une
   chance TRANSFORM_PROBA de muter. Calibré pour ressentir la trahison
   sans être unfair (≈ 5-7 % de chance qu'un cookie donné mute avant
   d'atteindre la tasse). */
const TRANSFORM_PROBA      = 0.0015;
const TRANSFORM_AFTER_PCT  = 0.35;
/* Fenêtre d'avertissement avant mutation cookie→glaçon : le cookie
   VIBRE pendant TRANSFORM_WARNING_MS puis se transforme. Donne au
   joueur une chance de se rattraper ou de l'esquiver. */
const TRANSFORM_WARNING_MS = 500;

/* ── TEMPÉRATURE DYNAMIQUE (thème default uniquement) ──────────────
   La tasse a une "température" 0..100 qui module le fond :
     0 = glacial (bleu pâle) · 50 = neutre · 100 = brûlant (espresso)
   Cookie catché : +2 · Café catché : +12 · Glaçon catché : -15.
   Décroissance naturelle vers 50 (T_REST) à 0.02/frame ≈ 1.2°/sec.
   On interpole entre 3 palettes (cold/normal/hot) via mixHex(). */
const TEMP_INIT   = 60;
const TEMP_REST   = 50;
const TEMP_DECAY  = 0.02;     /* par frame */
const TEMP_COOKIE = +2;
const TEMP_CAFE   = +12;
const TEMP_GLACON = -15;

const PALETTE_COLD   = ['#E8F4FF', '#A8C8E0', '#5080A8', '#264F70'];
const PALETTE_NORMAL = ['#FFF5E6', '#F0DCBE', '#C8945A', '#7A4320'];
const PALETTE_HOT    = ['#FFDCB0', '#C8945A', '#5C3614', '#1A0830'];

function mixHex(c1, c2, k){
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * k);
  const g = Math.round(g1 + (g2 - g1) * k);
  const b = Math.round(b1 + (b2 - b1) * k);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}
function gradientForTemp(temp){
  const t = Math.max(0, Math.min(100, temp));
  let from, to, k;
  if(t < 50){ from = PALETTE_COLD; to = PALETTE_NORMAL; k = t / 50; }
  else      { from = PALETTE_NORMAL; to = PALETTE_HOT;    k = (t - 50) / 50; }
  const stops = from.map((c, i) => mixHex(c, to[i], k));
  return `linear-gradient(180deg, ${stops[0]} 0%, ${stops[1]} 30%, ${stops[2]} 70%, ${stops[3]} 100%)`;
}

/* Glaçon (anciennement 🌶️ glacon) — refroidit le café = fige la tasse
   500 ms. Cohérent visuellement avec l'effet, plus universel que le piment. */
/* Valeurs petites pour une durée 60s : cookie/café/glaçon font +1/+5/-1.
   Sur ~140 items en 60s, atteindre 240 (jackpot) demande de la skill. */
const ITEM_META = {
  cookie: { value: +1, weight: 70 },
  cafe:   { value: +5, weight: 8  },
  glacon: { value: -1, weight: 22 },
};

/* Halos colorés par type — lueur subtile derrière l'emoji pour scan rapide */
const ITEM_GLOW = {
  cookie: 'drop-shadow(0 0 5px rgba(193,127,60,.55))',
  cafe:   'drop-shadow(0 0 9px rgba(212,160,23,.85))',
  glacon: 'drop-shadow(0 0 6px rgba(168,200,255,.7))',
};

function pickItemType(){
  const total = Object.values(ITEM_META).reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for(const [k, v] of Object.entries(ITEM_META)){
    if(r < v.weight) return k;
    r -= v.weight;
  }
  return 'cookie';
}

/* Grille calibrée pour 60s — les seuils scalent linéairement avec la
   durée (×2 à 120s, ×3 à 180s) pour rester atteignables/équilibrés.
   6 paliers, jackpot 300 🍪 à 240 (60s), bonus CF rare à 280+ (60s). */
const PALIERS_60S    = [30, 55, 85, 120, 170, 240];
const REWARDS_PALIER = [5, 15, 40, 80, 150, 300];
const CF_THRESHOLD_60S = 280;

function rewardFor(score, duration){
  const m = (duration || 60) / 60;
  for(let i = PALIERS_60S.length - 1; i >= 0; i--){
    if(score >= PALIERS_60S[i] * m) return REWARDS_PALIER[i];
  }
  return 0;
}

function cafeBonusFor(score, duration){
  const m = (duration || 60) / 60;
  return score >= CF_THRESHOLD_60S * m ? 1 : 0;
}

/* ── Tasse SVG custom ────────────────────────────────────
   Anse + corps + soucoupe + café fumant. Couleurs paramétrables
   via les props pour s'adapter aux thèmes (espresso pour dark,
   crème pour les autres). Vapeur via classes CSS .steam-1/2/3
   (cf. globalStyles : keyframes steam1/steam2/steam3). */
function CupSvg({ dark, frozen, inverted }){
  const cupFill   = dark ? '#3D2010' : '#F5E6D3';
  const cupShade  = dark ? '#1A0830' : '#E0C8A8';
  const cupRim    = dark ? '#5A3520' : '#C8945A';
  const saucer    = dark ? '#7A4320' : '#A0784E';
  const coffee    = '#3D2010';
  const steamCol  = dark ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.7)';
  return (
    <svg viewBox="0 0 72 58" width="100%" height="100%" style={{
      filter: frozen ? 'grayscale(.85) brightness(.65)' : 'drop-shadow(0 4px 7px rgba(0,0,0,.3))',
      transform: inverted ? 'scaleY(-1)' : 'none',
      transition: 'filter .2s',
    }}>
      {/* Vapeur (3 wisps animés via classes globales) */}
      <g style={{ transformOrigin: '36px 18px' }}>
        <path d="M 26 16 C 24 12 26 8 25 4" stroke={steamCol} strokeWidth="1.6" fill="none" strokeLinecap="round" style={{ animation:'steam1 2.4s ease-in-out infinite' }}/>
        <path d="M 36 14 C 34 10 36 6 35 2" stroke={steamCol} strokeWidth="1.8" fill="none" strokeLinecap="round" style={{ animation:'steam2 2.8s ease-in-out infinite .4s' }}/>
        <path d="M 46 16 C 44 12 46 8 45 4" stroke={steamCol} strokeWidth="1.6" fill="none" strokeLinecap="round" style={{ animation:'steam3 2.6s ease-in-out infinite .8s' }}/>
      </g>
      {/* Soucoupe */}
      <ellipse cx="36" cy="54" rx="30" ry="3.5" fill={saucer} opacity=".6" />
      <ellipse cx="36" cy="52" rx="32" ry="4" fill={saucer} />
      <ellipse cx="36" cy="51" rx="28" ry="2.5" fill={cupRim} />
      {/* Anse */}
      <path d="M 56 26 Q 68 32 56 44" stroke={cupRim} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M 56 28 Q 65 33 56 42" stroke={cupShade} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Corps tasse — trapèze */}
      <path d="M 12 22 L 60 22 L 56 50 L 16 50 Z" fill={cupFill} stroke={cupRim} strokeWidth="1.8" />
      {/* Reflet latéral */}
      <path d="M 18 26 L 21 46" stroke={cupShade} strokeWidth="2" strokeLinecap="round" opacity=".55"/>
      {/* Rebord supérieur */}
      <ellipse cx="36" cy="22" rx="24" ry="3.5" fill={cupRim} />
      <ellipse cx="36" cy="22" rx="22" ry="2.5" fill={coffee} />
      {/* Reflet sur le café */}
      <ellipse cx="32" cy="21" rx="6" ry=".8" fill="rgba(212,160,23,.45)" />
    </svg>
  );
}

export function CatcherGame({ coins, cafes, onEarn, onSpend, onCafeEarn, onPayContinue, gameThemes, setGameThemes, unlocked = [], C }){
  const { t } = useTranslation();

  /* Thème actif — lu une fois au mount, pas live pendant la partie */
  const theme   = getActiveTheme('catcher', gameThemes || {});
  const td      = theme?.data || {};
  const inverted   = !!td.itemsRiseUp;
  const itemEmojis = td.itemEmojis || { cookie:'🍪', cafe:'☕', glacon:'🧊' };
  const useCustomCup = !td.tasseEmoji || td.tasseEmoji === '☕'; /* on garde la tasse SVG sauf si le thème impose un emoji ('🧺' pour Champ) */
  const tasseEmoji   = td.tasseEmoji || '☕';
  const tempReactive = !!td.temperatureReactive;
  /* arenaBg calculé plus bas (après le useState temperature pour éviter
     une TDZ). Pour les thèmes non réactifs, on fige sur td.bg. */
  const staticBg  = td.bg || 'linear-gradient(180deg, #FFF5E6 0%, #F0DCBE 30%, #C8945A 70%, #7A4320 100%)';
  const isDark    = !!td.darkArena;
  const showStars = !!td.bgStars;

  const TASSE_Y    = inverted ? 16 : (ARENA_H - 78);
  const TASSE_LIP  = inverted ? (TASSE_Y + TASSE_H - 22) : (TASSE_Y + 6);
  const SPAWN_Y    = inverted ? (ARENA_H + ITEM_SIZE) : -ITEM_SIZE;
  const VY_DIR     = inverted ? -1 : +1;

  const [phase,        setPhase]        = useState('idle');
  const [score,        setScore]        = useState(0);
  /* Durée sélectionnée pour la prochaine partie (60/120/180). Une fois
     la partie lancée, on fige dans runningDurationRef pour pas qu'un
     clic accidentel sur un autre choix ne casse les calculs. */
  const [duration,     setDuration]     = useState(60);
  const [timeLeft,     setTimeLeft]     = useState(60);
  const [countdownVal, setCountdownVal] = useState(null);
  const [tasseX,       setTasseX]       = useState(ARENA_W / 2 - TASSE_W / 2);
  const [tilt,         setTilt]         = useState(0);            /* inclinaison de la tasse pendant le swipe */
  const [items,        setItems]        = useState([]);
  const [combo,        setCombo]        = useState(0);
  const [comboActive,  setComboActive]  = useState(false);
  const [frozen,       setFrozen]       = useState(false);
  const [shake,        setShake]        = useState(false);
  const [particles,    setParticles]    = useState([]);           /* mini-particules au catch */
  const [popFx,        setPopFx]        = useState(null);
  const [confettis,    setConfettis]    = useState([]);           /* sur écran 'done' jackpot */
  const [glaconCount,  setGlaconCount]  = useState(0);             /* 5 = game over */
  const [endCause,     setEndCause]     = useState(null);          /* 'timeout' | 'iced' */
  const [temperature,  setTemperature]  = useState(TEMP_INIT);     /* 0..100, modulé en jeu */
  const [continueUsed, setContinueUsed] = useState(false);          /* continue 1× par partie */
  /* Scale CSS appliqué au wrapper interne coord-fixed (360×460).
     Permet aux items d'utiliser `transform: translate3d` en px exacts
     (GPU-accelerated) plutôt que `top/left` en % (qui force un reflow
     CPU à chaque frame). Recalculé via ResizeObserver sur l'arena. */
  const [arenaScale,   setArenaScale]   = useState(1);

  const arenaRef         = useRef(null);
  const tasseXRef        = useRef(tasseX);
  const tasseTargetRef   = useRef(tasseX);                       /* cible visée par le doigt — pour calculer le tilt */
  const itemsRef         = useRef([]);
  const scoreRef         = useRef(0);
  const comboRef         = useRef(0);
  const comboActiveRef   = useRef(false);
  const frozenRef        = useRef(false);
  const particlesRef     = useRef([]);
  const glaconCountRef   = useRef(0);
  const temperatureRef   = useRef(TEMP_INIT);
  const lastTempDisplay  = useRef(TEMP_INIT);
  const pausedAtRef      = useRef(null);   /* timestamp au moment du game over 'iced' */
  const runningDurationRef = useRef(60);   /* durée figée pour la partie en cours */
  const rafRef           = useRef(null);
  const lastTickRef      = useRef(null);   /* timestamp du dernier tick — pour le delta-time */
  const lastSpawnRef     = useRef(0);
  const startTimeRef     = useRef(0);
  const phaseRef         = useRef('idle');
  const comboTimeoutRef  = useRef(null);
  const freezeTimeoutRef = useRef(null);
  const shakeTimeoutRef  = useRef(null);

  useEffect(()=>{ phaseRef.current = phase; }, [phase]);

  /* Observe la largeur réelle de l'arena → met à jour arenaScale.
     Mobile typique : 360px de large → scale=1. Petits écrans (<360px) :
     scale<1 réduit le wrapper coord-fixed pour fit. */
  useEffect(()=>{
    if(!arenaRef.current) return;
    const update = () => {
      const w = arenaRef.current?.offsetWidth;
      if(w && w > 0) setArenaScale(w / ARENA_W);
    };
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if(ro) ro.observe(arenaRef.current);
    window.addEventListener('resize', update);
    return () => { if(ro) ro.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  const startGame = () => {
    if(coins < CATCHER_COST) return;
    onSpend(CATCHER_COST);
    playSound('modal');
    setScore(0);             scoreRef.current = 0;
    setCombo(0);             comboRef.current = 0;
    setComboActive(false);   comboActiveRef.current = false;
    setItems([]);             itemsRef.current = [];
    setParticles([]);         particlesRef.current = [];
    setGlaconCount(0);        glaconCountRef.current = 0;
    setTemperature(TEMP_INIT); temperatureRef.current = TEMP_INIT; lastTempDisplay.current = TEMP_INIT;
    setEndCause(null);
    setContinueUsed(false);   pausedAtRef.current = null;
    runningDurationRef.current = duration;
    setTimeLeft(duration);
    setPhase('countdown');
    setCountdownVal(3);
    setTimeout(()=>setCountdownVal(2),  800);
    setTimeout(()=>setCountdownVal(1), 1600);
    setTimeout(()=>setCountdownVal('GO!'), 2400);
    setTimeout(()=>{
      setCountdownVal(null);
      setPhase('playing');
      startTimeRef.current = Date.now();
      lastSpawnRef.current = Date.now();
      lastTickRef.current  = null;   /* reset delta-time au démarrage */
      rafRef.current = requestAnimationFrame(tick);
    }, 2900);
  };

  const spawnParticles = (x, y, type) => {
    const count = type === 'cafe' ? 7 : type === 'cookie' ? 4 : 5;
    const emoji = type === 'glacon' ? '✦' : itemEmojis[type] || '✦';
    const color = type === 'cafe' ? '#FFE89A' : type === 'cookie' ? '#D4A017' : '#A8C8FF';
    const now   = Date.now();
    const newP  = Array.from({ length:count }, (_, i) => ({
      id: now + i + Math.random(),
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: -2 - Math.random() * 3,
      life: 600,
      born: now,
      emoji, color,
      size: 10 + Math.random() * 6,
    }));
    particlesRef.current = [...particlesRef.current, ...newP];
    setParticles(particlesRef.current);
  };

  const triggerShake = () => {
    setShake(true);
    if(shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    shakeTimeoutRef.current = setTimeout(()=>setShake(false), 320);
  };

  const tick = () => {
    if(phaseRef.current !== 'playing') return;

    const now     = Date.now();
    /* Delta-time : ratio par rapport à 60 fps (1.0 = 60 fps, 2.0 = 30 fps).
       Cap à 3 pour éviter les sauts de position si onglet en arrière-plan
       (où le RAF est throttlé à ~1Hz). Premier tick : dt=1 pour ne pas
       multiplier par un truc bizarre. */
    const dt = lastTickRef.current
      ? Math.min(3, (now - lastTickRef.current) / (1000 / 60))
      : 1;
    lastTickRef.current = now;

    const dur     = runningDurationRef.current;
    const elapsed = (now - startTimeRef.current) / 1000;
    const remain  = Math.max(0, dur - elapsed);
    setTimeLeft(Math.ceil(remain));

    if(remain <= 0){ endGame('timeout'); return; }

    /* Spawn 1000 → 250 ms (accélération marquée — basée sur ratio d'avancée) */
    const elapsedRatio = (dur - remain) / dur;  // 0 → 1
    const spawnDelay   = Math.max(250, 1000 - elapsedRatio * 750);
    if(now - lastSpawnRef.current > spawnDelay){
      lastSpawnRef.current = now;
      const type = pickItemType();
      /* Vitesse de chute : démarre à 3.5-5 px/frame (~1.3-1.8 s pour
         traverser l'arena, snappy dès le 1er item), monte à ~8.5 en fin
         de partie. Avant : 2.0-3.2 (3 s pour tomber = trop mou). */
      const vy = 3.5 + Math.random() * 1.5 + elapsedRatio * 3.5;
      itemsRef.current = [...itemsRef.current, {
        id: now + Math.random(),
        type,
        x: Math.random() * (ARENA_W - ITEM_SIZE),
        y: SPAWN_Y,
        vy,
        wobble: Math.random() * Math.PI * 2,
      }];
    }

    /* Update items + collisions */
    const tasseLeft  = tasseXRef.current;
    const tasseRight = tasseLeft + TASSE_W;
    let scoreDelta = 0;
    let catches    = [];

    const nextItems = [];
    for(const it of itemsRef.current){
      const ny = it.y + it.vy * VY_DIR * dt;

      /* Transformation cookie → glaçon (2 étapes) :
         1. déclenchement aléatoire (TRANSFORM_PROBA) après TRANSFORM_AFTER_PCT
            du chemin → on POSE un `_warning` (timestamp). Le cookie reste
            un cookie pendant TRANSFORM_WARNING_MS, mais il VIBRE (cf. rendu).
            Pendant cette fenêtre le joueur peut encore l'attraper en +1.
         2. à l'expiration du warning, mutation en glaçon + flash blanc-bleu. */
      let curType = it.type;
      let justTransformed = false;
      let warningStart = it._warning || null;
      if(curType === 'cookie' && !it._transformed){
        if(warningStart && now - warningStart >= TRANSFORM_WARNING_MS){
          curType = 'glacon';
          justTransformed = true;
          warningStart = null;
        } else if(
          !warningStart
          && (inverted ? (ny < ARENA_H * (1 - TRANSFORM_AFTER_PCT)) : (ny > ARENA_H * TRANSFORM_AFTER_PCT))
          && Math.random() < TRANSFORM_PROBA
        ){
          warningStart = now;
        }
      }

      const itemMidX = it.x + ITEM_SIZE / 2;
      const inX = itemMidX >= tasseLeft + 8 && itemMidX <= tasseRight - 8;
      const inY = inverted
        ? (ny <= TASSE_LIP && ny + ITEM_SIZE/2 > TASSE_LIP - 22)
        : (ny + ITEM_SIZE >= TASSE_LIP && ny + ITEM_SIZE/2 < TASSE_LIP + 24);

      if(inX && inY){
        const cfg = ITEM_META[curType];
        let v = cfg.value;
        if(v > 0 && comboActiveRef.current) v *= 2;
        scoreDelta += v;
        catches.push({ id:it.id, type:curType, x:it.x + ITEM_SIZE/2, y:TASSE_LIP + (inverted ? 8 : -10), displayValue:v });
        continue;
      }

      const outOfBounds = inverted ? (ny < -ITEM_SIZE) : (ny > ARENA_H);
      if(outOfBounds){
        if(curType === 'cookie'){
          comboRef.current = 0;
          comboActiveRef.current = false;
          setCombo(0);
          setComboActive(false);
          if(comboTimeoutRef.current){ clearTimeout(comboTimeoutRef.current); comboTimeoutRef.current = null; }
        }
        continue;
      }
      nextItems.push({
        ...it, y:ny, type:curType,
        wobble: it.wobble + 0.08,
        _warning: warningStart,
        _transformed: it._transformed || justTransformed,
        _flash: justTransformed ? now : (it._flash && (now - it._flash < 220) ? it._flash : null),
      });
    }

    itemsRef.current = nextItems;
    setItems(nextItems);

    /* Update particules — gravity douce + fade */
    if(particlesRef.current.length > 0){
      const alive = [];
      for(const p of particlesRef.current){
        const age = now - p.born;
        if(age >= p.life) continue;
        alive.push({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy + age * 0.012,
          vy: p.vy + 0.18,
        });
      }
      particlesRef.current = alive;
      setParticles(alive);
    }

    if(scoreDelta !== 0){
      scoreRef.current = Math.max(0, scoreRef.current + scoreDelta);
      setScore(scoreRef.current);
    }

    /* Décroissance naturelle de température vers TEMP_REST (50) — scalée
       par dt pour rester constante peu importe le framerate. */
    const decay = TEMP_DECAY * dt;
    const tCur = temperatureRef.current;
    if(tCur > TEMP_REST)      temperatureRef.current = Math.max(TEMP_REST, tCur - decay);
    else if(tCur < TEMP_REST) temperatureRef.current = Math.min(TEMP_REST, tCur + decay);

    for(const c of catches){
      spawnParticles(c.x, c.y, c.type);
      /* Impact sur la température selon le type */
      if(c.type === 'cookie')      temperatureRef.current += TEMP_COOKIE;
      else if(c.type === 'cafe')   temperatureRef.current += TEMP_CAFE;
      else if(c.type === 'glacon') temperatureRef.current += TEMP_GLACON;
      temperatureRef.current = Math.max(0, Math.min(100, temperatureRef.current));

      if(c.type === 'cookie'){
        comboRef.current = (comboRef.current || 0) + 1;
        setCombo(comboRef.current);
        if(comboRef.current >= 3 && !comboActiveRef.current){
          comboActiveRef.current = true;
          setComboActive(true);
          if(comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
          comboTimeoutRef.current = setTimeout(()=>{
            comboActiveRef.current = false;
            setComboActive(false);
            comboRef.current = 0;
            setCombo(0);
          }, 3000);
        }
        playSound('tap', { volume:0.6 });
      } else if(c.type === 'cafe'){
        playSound('success');
      } else if(c.type === 'glacon'){
        comboRef.current = 0;
        comboActiveRef.current = false;
        setCombo(0);
        setComboActive(false);
        if(comboTimeoutRef.current){ clearTimeout(comboTimeoutRef.current); comboTimeoutRef.current = null; }
        frozenRef.current = true;
        setFrozen(true);
        triggerShake();
        if(freezeTimeoutRef.current) clearTimeout(freezeTimeoutRef.current);
        freezeTimeoutRef.current = setTimeout(()=>{
          frozenRef.current = false;
          setFrozen(false);
        }, 500);
        playSound('error');
        /* Compteur glaçons — game over instantané à ICED_LIMIT */
        glaconCountRef.current += 1;
        setGlaconCount(glaconCountRef.current);
        if(glaconCountRef.current >= ICED_LIMIT){
          /* On laisse le shake/freeze démarrer une frame puis on coupe. */
          setTimeout(() => endGame('iced'), 80);
          return;
        }
      }
      setPopFx({ id:c.id, type:c.type, x:c.x, y:c.y, value:c.displayValue });
      setTimeout(()=>setPopFx(p => (p && p.id === c.id) ? null : p), 700);
    }

    /* Propagation température au state — seulement quand la valeur
       entière a changé (sinon re-render 60×/s pour rien). */
    const tRound = Math.round(temperatureRef.current);
    if(tRound !== lastTempDisplay.current){
      lastTempDisplay.current = tRound;
      setTemperature(tRound);
    }

    rafRef.current = requestAnimationFrame(tick);
  };

  const endGame = (cause = 'timeout') => {
    if(phaseRef.current === 'done') return;        /* éviter double-fin */
    phaseRef.current = 'done';
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    if(comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    if(freezeTimeoutRef.current) clearTimeout(freezeTimeoutRef.current);
    setEndCause(cause);
    setPhase('done');
    /* Si défaite par glaçons et continue pas encore utilisé, on capture
       le timestamp pour pouvoir compenser la pause au resume. */
    if(cause === 'iced' && !continueUsed){
      pausedAtRef.current = Date.now();
    }
    const dur       = runningDurationRef.current;
    const reward    = rewardFor(scoreRef.current, dur);
    const cafeBonus = cafeBonusFor(scoreRef.current, dur);
    if(reward > 0){
      onEarn(reward);
      playSound(scoreRef.current >= 240 * (dur/60) ? 'jackpot' : 'success');
    } else if(cause === 'iced'){
      playSound('error');
    }
    /* Bonus CF rare — utilise le callback dédié pour déclencher le
       toast violet/or, comme Flappy. Pas double-play du son jackpot. */
    if(cafeBonus > 0 && typeof onCafeEarn === 'function'){
      onCafeEarn(cafeBonus);
    }
    /* Jackpot final (240+ à 60s, scalé sur la durée) → confettis dorés */
    if(scoreRef.current >= 240 * (dur/60)){
      const now = Date.now();
      const confs = Array.from({ length:24 }, (_, i) => ({
        id: now + i,
        left: 5 + Math.random() * 90,                 /* % */
        delay: Math.random() * 600,
        duration: 1400 + Math.random() * 1000,
        emoji: ['🍪','☕','✨','🌟'][i % 4],
        size: 14 + Math.random() * 10,
      }));
      setConfettis(confs);
      setTimeout(()=>setConfettis([]), 2800);
    }
  };

  useEffect(()=>()=>{
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    if(comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    if(freezeTimeoutRef.current) clearTimeout(freezeTimeoutRef.current);
    if(shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
  }, []);

  /* Continuer après défaite glaçons — paie 1 ☕, reset glaçons + items,
     compense le startTimeRef pour récupérer le temps restant exact, et
     relance le tick. 1× par partie (continueUsed bloque les usages
     suivants côté UI). */
  const handleContinue = () => {
    if(continueUsed) return;
    if(typeof onPayContinue !== 'function') return;
    const ok = onPayContinue();
    if(!ok) return;
    /* Compense la pause : shift startTime du temps écoulé en pause */
    if(pausedAtRef.current){
      startTimeRef.current += (Date.now() - pausedAtRef.current);
      pausedAtRef.current = null;
    }
    /* Reset glaçons, items en chute, état figé */
    glaconCountRef.current = 0;
    setGlaconCount(0);
    itemsRef.current = [];
    setItems([]);
    particlesRef.current = [];
    setParticles([]);
    frozenRef.current = false;
    setFrozen(false);
    /* Mark used + repasse en playing + relance la boucle */
    setContinueUsed(true);
    setEndCause(null);
    setPhase('playing');
    phaseRef.current = 'playing';
    lastSpawnRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
  };

  const movePointer = (clientX) => {
    if(phaseRef.current !== 'playing' || frozenRef.current) return;
    const rect = arenaRef.current?.getBoundingClientRect();
    if(!rect) return;
    const scaled = ((clientX - rect.left) / rect.width) * ARENA_W;
    const nx = Math.max(0, Math.min(ARENA_W - TASSE_W, scaled - TASSE_W / 2));
    /* Tilt selon la vitesse du mouvement (delta entre cible précédente et nouvelle) */
    const delta = nx - tasseTargetRef.current;
    const tiltDeg = Math.max(-12, Math.min(12, delta * 0.6));
    setTilt(tiltDeg);
    tasseTargetRef.current = nx;
    tasseXRef.current = nx;
    setTasseX(nx);
    /* Décay du tilt après 120ms d'inactivité (touche soulevée ou immobile) */
    clearTimeout(movePointer._t);
    movePointer._t = setTimeout(()=>setTilt(0), 120);
  };

  /* Couleurs HUD selon thème dark */
  const hudMuted = isDark ? 'rgba(255,255,255,.55)' : C.muted;
  const hudText  = isDark ? '#fff' : C.text;

  /* Timer en pourcentage (pour la barre dégradée) */
  const timerPct = Math.max(0, Math.min(100, (timeLeft / (runningDurationRef.current || duration)) * 100));
  const timerCol = timeLeft <= 5 ? '#7A4320' : '#D4A017';

  /* Fond de l'arène — dynamique selon temperature si le thème le veut. */
  const arenaBg = tempReactive ? gradientForTemp(temperature) : staticBg;

  return (
    <div style={{ textAlign:'center', maxWidth:ARENA_W, margin:'0 auto' }}>
      {/* HUD revisité : carte espresso avec score gros au centre, timer
          en barre dégradée fine au-dessus de l'arena. */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'8px 14px', marginBottom:8, borderRadius:14,
        background:'linear-gradient(135deg, #4A2C17 0%, #5C3614 100%)',
        boxShadow:'0 4px 14px rgba(74,44,23,.25)',
        border:'1px solid rgba(212,160,23,.35)',
      }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start' }}>
          <span style={{ fontSize:9, fontWeight:800, color:'rgba(255,232,154,.7)', letterSpacing:1.5, textTransform:'uppercase' }}>
            {t('game_catcher.score_label')}
          </span>
          <span style={{ fontSize:24, fontWeight:900, color:'#FFE89A', lineHeight:1, letterSpacing:-.5 }}>{score}</span>
        </div>
        {/* Compteur glaçons — passe en gold sombre à 3+, pulse à 4 */}
        <div style={{
          display:'flex', flexDirection:'column', alignItems:'center',
          padding:'4px 10px', borderRadius:10,
          background: glaconCount >= 3 ? 'rgba(168,200,255,.18)' : 'transparent',
          border: glaconCount >= 4 ? '1.5px solid #A8C8FF' : '1.5px solid transparent',
          animation: glaconCount >= 4 ? 'perfectPulse 0.7s ease-in-out infinite' : 'none',
          transition: 'background .25s, border-color .25s',
        }}>
          <span style={{ fontSize:9, fontWeight:800, color:'rgba(255,232,154,.7)', letterSpacing:1.5, textTransform:'uppercase' }}>
            🧊
          </span>
          <span style={{
            fontSize:14, fontWeight:900, lineHeight:1.1,
            color: glaconCount >= 4 ? '#A8C8FF' : glaconCount >= 3 ? '#C8C8FF' : '#FFE89A',
          }}>
            {glaconCount}/{ICED_LIMIT}
          </span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
          <span style={{ fontSize:9, fontWeight:800, color:'rgba(255,232,154,.7)', letterSpacing:1.5, textTransform:'uppercase' }}>
            ⏱
          </span>
          <span style={{ fontSize:18, fontWeight:900, color: timeLeft <= 5 ? '#F0C050' : '#FFE89A', lineHeight:1 }}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Barre de timer dégradée */}
      <div style={{ width:'100%', height:4, borderRadius:2, background:'rgba(74,44,23,.2)', marginBottom:6, overflow:'hidden' }}>
        <div style={{
          height:'100%', width:`${timerPct}%`,
          background:`linear-gradient(90deg, ${timerCol}, #FFE89A)`,
          transition:'width .4s linear',
        }} />
      </div>

      {/* Bandeau combo */}
      <div style={{ height:18, marginBottom:6, fontSize:11, fontWeight:800, letterSpacing:.5 }}>
        {comboActive && (
          <span style={{ color:'#D4A017', animation:'perfectPulse 1s ease-in-out infinite' }}>
            ⚡ {t('game_catcher.combo_active', { n: combo })}
          </span>
        )}
      </div>

      {/* ARENA — wrapper externe avec aspectRatio (mesure la largeur
          réelle via ResizeObserver). Le contenu vit dans un wrapper
          interne coord-fixed 360×460 scalé en CSS, ce qui permet aux
          items d'utiliser `transform: translate3d` en px GPU-accelerated. */}
      <div
        ref={arenaRef}
        onTouchStart={e => movePointer(e.touches[0].clientX)}
        onTouchMove={e  => { e.preventDefault(); movePointer(e.touches[0].clientX); }}
        onPointerMove={e => { if(e.pointerType !== 'touch') movePointer(e.clientX); }}
        className={shake ? 'shake-anim' : ''}
        style={{
          position:'relative', width:'100%', maxWidth:ARENA_W, aspectRatio:`${ARENA_W} / ${ARENA_H}`,
          margin:'0 auto', borderRadius:20,
          background: arenaBg,
          border:`2px solid rgba(212,160,23,.45)`, overflow:'hidden',
          touchAction:'none', userSelect:'none',
          cursor:'grab',
          boxShadow:'inset 0 0 32px rgba(74,44,23,.25), 0 6px 18px rgba(0,0,0,.18)',
          animation: shake ? 'shake .28s ease-in-out 2' : 'none',
          /* Transition douce sur le fond (thème température réactif) */
          transition: tempReactive ? 'background 0.45s ease' : 'none',
        }}
      >
        {/* Wrapper interne coord-fixed 360×460 — tous les enfants
            travaillent en px dans ce repère, et le scale CSS gère le
            fit dans l'arena réelle. */}
        <div style={{
          position:'absolute', top:0, left:0,
          width:ARENA_W, height:ARENA_H,
          transformOrigin:'top left',
          transform:`scale(${arenaScale})`,
        }}>
        {/* Étoiles décoratives (thème nuit) */}
        {showStars && (
          <>
            <span style={{ position:'absolute', top:'12%', left:'18%', fontSize:10, color:'#F0C050', opacity:.75 }}>✦</span>
            <span style={{ position:'absolute', top:'22%', right:'24%', fontSize:14, color:'#FFE89A', opacity:.9 }}>✦</span>
            <span style={{ position:'absolute', top:'34%', left:'62%', fontSize:9,  color:'#A8C8FF', opacity:.75 }}>✦</span>
            <span style={{ position:'absolute', top:'46%', left:'8%',  fontSize:11, color:'#F0C050', opacity:.6 }}>·</span>
            <span style={{ position:'absolute', top:'18%', left:'74%', fontSize:8,  color:'#FFE89A', opacity:.85 }}>·</span>
            <span style={{ position:'absolute', top:'52%', right:'14%', fontSize:9, color:'#FFE89A', opacity:.7 }}>✦</span>
          </>
        )}

        {/* Sol/Plafond décoratif comptoir bois */}
        <div style={{
          position:'absolute', left:0, right:0,
          [inverted ? 'top' : 'bottom']: 0, height:22,
          background: inverted
            ? 'linear-gradient(0deg, rgba(60,30,10,0) 0%, rgba(60,30,10,.35) 100%)'
            : 'linear-gradient(180deg, rgba(60,30,10,0) 0%, rgba(60,30,10,.35) 100%)',
        }} />

        {/* Items qui tombent (avec léger wobble horizontal).
            Positionnement via `transform: translate3d` en px (GPU layer,
            pas de reflow). Si l'item vient de muter cookie→glaçon
            (_flash < 220 ms), on ajoute un halo blanc-bleuté. */}
        {items.map(it => {
          const wobbleX  = Math.sin(it.wobble) * 1.4;
          const flashAge = it._flash ? (Date.now() - it._flash) : 999;
          const isFlashing = flashAge < 220;
          /* Vibration pré-transformation : warning actif tant que pas
             encore muté (cookie en sursis). Halo bleuté discret + shake. */
          const isWarning = it._warning && !it._transformed;
          const scale = isFlashing ? (1.2 - flashAge/1100) : 1;
          return (
            <div
              key={it.id}
              style={{
                position:'absolute', left:0, top:0,
                width:ITEM_SIZE, height:ITEM_SIZE,
                fontSize:42, lineHeight:1,
                display:'flex', alignItems:'center', justifyContent:'center',
                filter: isFlashing
                  ? 'drop-shadow(0 0 14px rgba(255,255,255,.95)) drop-shadow(0 0 18px rgba(168,200,255,.9))'
                  : isWarning
                    ? 'drop-shadow(0 0 6px rgba(168,200,255,.7))'
                    : (ITEM_GLOW[it.type] || 'none'),
                transform:`translate3d(${it.x + wobbleX}px, ${it.y}px, 0)${isFlashing ? ` scale(${scale})` : ''}`,
                willChange:'transform',
                animation: isWarning && !isFlashing ? 'shake .12s ease-in-out infinite' : 'none',
                pointerEvents:'none',
                transition:'none',
              }}
            >
              {itemEmojis[it.type]}
            </div>
          );
        })}

        {/* Particules (mini-explosion au catch) */}
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position:'absolute', left:0, top:0,
              fontSize:p.size, color:p.color,
              opacity: Math.max(0, 1 - (Date.now() - p.born) / p.life),
              transform:`translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%)`,
              willChange:'transform, opacity',
              pointerEvents:'none',
              textShadow:'0 1px 2px rgba(0,0,0,.4)',
              fontWeight:900,
            }}
          >
            {p.emoji}
          </div>
        ))}

        {/* Pop FX "+5" "-5" */}
        {popFx && (
          <div
            key={popFx.id}
            style={{
              position:'absolute', left:0, top:0,
              fontSize:16, fontWeight:900,
              color: popFx.value > 0 ? '#FFE89A' : '#7A4320',
              animation:'floatUp .7s ease-out both',
              pointerEvents:'none',
              textShadow:'0 1px 3px rgba(0,0,0,.45)',
              transform:`translate3d(${popFx.x}px, ${popFx.y}px, 0) translate(-50%, 0)`,
            }}
          >
            {popFx.value > 0 ? `+${popFx.value}` : `${popFx.value}`}
          </div>
        )}

        {/* Tasse joueur — SVG custom (sauf si le thème impose un emoji).
            Position via translate3d (GPU). transformOrigin center bottom
            pour que la rotation pivote sur la base de la tasse. */}
        <div
          style={{
            position:'absolute', left:0, top:0,
            width:TASSE_W, height:TASSE_H,
            transform:`translate3d(${tasseX}px, ${TASSE_Y}px, 0) rotate(${tilt}deg)`,
            transformOrigin: `${TASSE_W/2}px ${TASSE_H}px`,
            transition: frozen ? 'none' : 'transform .15s ease-out',
            willChange: 'transform',
            pointerEvents:'none',
          }}
        >
          {useCustomCup ? (
            <CupSvg dark={isDark} frozen={frozen} inverted={inverted} />
          ) : (
            <div style={{
              width:'100%', height:'100%', fontSize:44, lineHeight:1,
              display:'flex', alignItems: inverted ? 'flex-end' : 'flex-start', justifyContent:'center',
              transform: inverted ? 'scaleY(-1)' : 'none',
              filter: frozen ? 'grayscale(.85) brightness(.65)' : 'drop-shadow(0 4px 7px rgba(0,0,0,.3))',
            }}>
              {tasseEmoji}
            </div>
          )}
        </div>

        {/* /wrapper interne coord-fixed */}
        </div>

        {/* Overlay IDLE — preview de la tasse + règles */}
        {phase === 'idle' && (
          <div style={{
            position:'absolute', inset:0,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14,
            background:'rgba(60,30,10,.6)', backdropFilter:'blur(3px)',
            padding:'0 22px',
          }}>
            <div style={{ width:80, height:64, animation:'idle 2.4s ease-in-out infinite' }}>
              {useCustomCup ? <CupSvg dark={isDark} frozen={false} inverted={false} /> : (
                <div style={{ fontSize:54, lineHeight:1 }}>{tasseEmoji}</div>
              )}
            </div>
            <div style={{ fontSize:11, color:'rgba(255,232,154,.85)', fontWeight:800, letterSpacing:2.4, textTransform:'uppercase' }}>
              {inverted ? t('game_catcher.subtitle_inverted') : t('game_catcher.subtitle')}
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.92)', textAlign:'center', lineHeight:1.45, whiteSpace:'pre-line' }}>
              {inverted ? t('game_catcher.rules_inverted') : t('game_catcher.rules')}
            </div>

            {/* Sélecteur de durée — 3 pills 60/120/180 s. Active = bordure
                dorée + fond GOLD. Changer pendant idle, figé pendant partie. */}
            <div style={{ display:'flex', gap:6, marginTop:2 }}>
              {CATCHER_DURATIONS.map(d => {
                const active = duration === d;
                return (
                  <button
                    key={d}
                    onClick={() => { playSound('tap'); setDuration(d); }}
                    style={{
                      padding:'7px 14px', borderRadius:16, fontSize:11, fontWeight:900,
                      background: active ? GOLD : 'rgba(60,30,10,.65)',
                      color: active ? '#fff' : 'rgba(255,232,154,.85)',
                      border: active ? '1.5px solid #FFE89A' : '1.5px solid rgba(255,232,154,.25)',
                      cursor:'pointer', letterSpacing:.4,
                      boxShadow: active ? '0 3px 10px rgba(212,160,23,.4)' : 'none',
                    }}
                  >
                    {d < 60 ? `${d}s` : `${d/60}min`}
                  </button>
                );
              })}
            </div>

            {/* Switcher de thème — pastilles des thèmes débloqués (default
                toujours là). Variant 'dark' car on est sur overlay café. */}
            <GameThemeSwitcher
              gameId="catcher"
              gameThemes={gameThemes}
              setGameThemes={setGameThemes}
              unlocked={unlocked}
              variant="dark"
            />

            <button
              onClick={startGame}
              disabled={coins < CATCHER_COST}
              className={coins >= CATCHER_COST ? 'glow-anim' : ''}
              style={{
                marginTop:6, padding:'14px 32px', borderRadius:24, fontSize:14, fontWeight:800,
                background: coins < CATCHER_COST ? '#5C3614' : GOLD,
                color: coins < CATCHER_COST ? 'rgba(255,255,255,.55)' : '#fff',
                border:'none', cursor: coins < CATCHER_COST ? 'not-allowed' : 'pointer',
                letterSpacing:.3,
                boxShadow: coins >= CATCHER_COST ? '0 4px 18px rgba(212,160,23,.45)' : 'none',
              }}
            >
              {coins < CATCHER_COST
                ? t('game_catcher.need_more', { n: CATCHER_COST - coins })
                : t('game_catcher.play_btn', { cost: CATCHER_COST })}
            </button>
          </div>
        )}

        {/* Overlay COUNTDOWN */}
        {phase === 'countdown' && countdownVal !== null && (
          <div style={{
            position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(60,30,10,.45)',
          }}>
            <div key={countdownVal} style={{
              fontSize:96, fontWeight:900, color:'#FFE89A',
              textShadow:'0 8px 22px rgba(0,0,0,.5), 0 0 24px rgba(212,160,23,.7)',
              animation:'countdown 1s ease-out',
            }}>
              {countdownVal}
            </div>
          </div>
        )}

        {/* Overlay DONE — score + confettis si jackpot */}
        {phase === 'done' && (
          <div style={{
            position:'absolute', inset:0,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10,
            background:'rgba(60,30,10,.72)', backdropFilter:'blur(2.5px)',
            padding:'0 22px', overflow:'hidden',
          }}>
            {/* Confettis dorés sur jackpot */}
            {confettis.map(c => (
              <span
                key={c.id}
                style={{
                  position:'absolute', top:-30, left:`${c.left}%`,
                  fontSize:c.size,
                  animation:`floatUp ${c.duration}ms ease-in ${c.delay}ms forwards`,
                  pointerEvents:'none',
                  filter:'drop-shadow(0 2px 6px rgba(212,160,23,.6))',
                }}
              >
                {c.emoji}
              </span>
            ))}
            {endCause === 'iced' && (
              <>
                <div style={{ fontSize:54, lineHeight:1, animation:'bounceIn .5s ease-out', filter:'drop-shadow(0 0 12px rgba(168,200,255,.7))' }}>🧊</div>
                <div style={{ fontSize:16, color:'#A8C8FF', fontWeight:900, letterSpacing:1, textShadow:'0 2px 8px rgba(0,0,0,.4)' }}>
                  {t('game_catcher.iced_title')}
                </div>
              </>
            )}
            <div style={{ fontSize:10, color:'rgba(255,232,154,.7)', fontWeight:800, letterSpacing:2.5, textTransform:'uppercase' }}>
              {t('game_catcher.final_score')}
            </div>
            <div style={{ fontSize:56, fontWeight:900, color:'#FFE89A', lineHeight:1, animation:'bounceIn .5s ease-out', textShadow:'0 6px 18px rgba(0,0,0,.4)' }}>
              {score}
            </div>
            {rewardFor(scoreRef.current, runningDurationRef.current) > 0 ? (
              <div style={{
                fontSize:15, color:'#fff', fontWeight:800,
                padding:'6px 16px', borderRadius:16,
                background:'linear-gradient(135deg, #C17F3C, #D4A017)',
                boxShadow:'0 4px 12px rgba(212,160,23,.4)',
              }}>
                +{rewardFor(scoreRef.current, runningDurationRef.current)} 🍪
              </div>
            ) : (
              <div style={{ fontSize:12, color:'rgba(255,255,255,.65)' }}>{t('game_catcher.no_reward')}</div>
            )}
            {/* Bonus CF (rare) — affichage festif violet/or comme le café toast */}
            {cafeBonusFor(scoreRef.current, runningDurationRef.current) > 0 && (
              <div style={{
                fontSize:14, color:'#fff', fontWeight:900,
                padding:'7px 18px', borderRadius:18,
                background:'linear-gradient(135deg, #1A0830 0%, #5B2A9C 60%, #D4A017 100%)',
                boxShadow:'0 4px 16px rgba(212,160,23,.5), 0 0 24px rgba(91,42,156,.4)',
                border:'1.5px solid rgba(212,160,23,.65)',
                animation:'bounceIn .6s ease-out .15s both',
              }}>
                ✨ +{cafeBonusFor(scoreRef.current, runningDurationRef.current)} ☕ {t('game_catcher.cf_bonus')}
              </div>
            )}
            {/* Bouton CONTINUE — visible uniquement si défaite glaçons,
                continue pas encore utilisé, et joueur a 1 ☕. Action :
                débite 1 ☕ et reprend la partie là où elle s'est arrêtée. */}
            {endCause === 'iced' && !continueUsed && (
              <button
                onClick={handleContinue}
                disabled={!cafes || cafes < 1}
                className={cafes >= 1 ? 'glow-anim' : ''}
                style={{
                  marginTop:8, padding:'12px 26px', borderRadius:22,
                  fontSize:13, fontWeight:900, letterSpacing:.3,
                  background: cafes >= 1
                    ? 'linear-gradient(135deg, #5B2A9C 0%, #D4A017 100%)'
                    : '#4A2C17',
                  color: cafes >= 1 ? '#fff' : 'rgba(255,255,255,.45)',
                  border:'1.5px solid rgba(212,160,23,.65)',
                  boxShadow: cafes >= 1 ? '0 4px 16px rgba(91,42,156,.4), 0 0 18px rgba(212,160,23,.3)' : 'none',
                  cursor: cafes >= 1 ? 'pointer' : 'not-allowed',
                }}
              >
                ☕ {t('game_catcher.continue_btn')}
              </button>
            )}
            <button
              onClick={()=>{ setPhase('idle'); setConfettis([]); }}
              style={{
                marginTop:8, padding:'12px 30px', borderRadius:22, fontSize:13, fontWeight:800,
                background:GOLD, color:'#fff', border:'none', cursor:'pointer',
                boxShadow:'0 4px 14px rgba(212,160,23,.4)',
              }}
            >
              {t('game_catcher.replay')}
            </button>
          </div>
        )}
      </div>

      {/* Légende sous l'arène — pills avec halos */}
      <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:12, flexWrap:'wrap' }}>
        <span style={{
          padding:'4px 10px', borderRadius:12, fontSize:11, fontWeight:700,
          background:'rgba(193,127,60,.12)', color:hudText, border:'1px solid rgba(193,127,60,.3)',
        }}>{itemEmojis.cookie} +1</span>
        <span style={{
          padding:'4px 10px', borderRadius:12, fontSize:11, fontWeight:800,
          background:'rgba(212,160,23,.18)', color:'#D4A017', border:'1px solid rgba(212,160,23,.45)',
        }}>{itemEmojis.cafe} +5</span>
        <span style={{
          padding:'4px 10px', borderRadius:12, fontSize:11, fontWeight:700,
          background:'rgba(74,44,23,.12)', color:hudMuted, border:'1px solid rgba(74,44,23,.3)',
        }}>{itemEmojis.glacon} -1</span>
      </div>
    </div>
  );
}

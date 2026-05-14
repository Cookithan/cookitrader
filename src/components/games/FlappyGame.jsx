import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../i18n/index.js";
import { GOLD, COOKIE_SKINS } from "../../data/themes.js";
import { PremiumCookie } from "../cookies/PremiumCookie.jsx";
import { SkinnedCookie } from "../cookies/SkinnedCookie.jsx";
import { playSound } from "../../lib/audio.js";

/* ════════════════════════════════════════════════════
   FlappyGame — Flappy Cookie (PHASE 11/05/2026)
   ────────────────────────────────────────────────────
   Mini-jeu type Flappy Bird avec un cookie qui rebondit.
   - COÛT = 10 🍪 par partie · niveau requis 12
   - Tap (onPointerDown) → flap : vélocité Y = -FLAP_SPEED
   - Gravité constante GRAVITY (px/s²) descend le cookie
   - Obstacles = paires de tuyaux (haut + bas) avec un gap
     vertical à esquiver, défilent de droite à gauche
   - Vitesse horizontale augmente avec le score (progressive)
   - +3/+4/+5 🍪 par tuyau (Facile/Normal/Difficile) · cap 200 🍪 · score plafonné à 100
   - 5 % de chance par partie qu'une pièce dorée ☕ apparaisse dans un
     des obstacles entre les indices 5 et 30 → traversée = +1 ☕

   Anti-cheat minimal :
   - Score max 100 (cap dur)
   - Cooldown tap 60 ms (≈ 16 taps/s max, écarte les auto-clickers)
═══════════════════════════════════════════════════════ */

export const FLAPPY_COST = 10;
const REWARD_CAP = 200;
/* Reward par tuyau adapté au mode :
   Facile +3  ·  Normal +4  ·  Difficile +5   (tuyau standard)
   Espresso clair = ×2 du reward du mode (+6 / +8 / +10) */
const SCORE_CAP  = 100;
/* 20 % de chance qu'un nouveau tuyau spawn soit en "espresso clair"
   (couleur plus claire). Le cookie gagne +6 🍪 au lieu de +3 en le
   franchissant. C'est plus fréquent que la pièce dorée mais moins
   payant à l'unité. */
const LIGHT_PIPE_CHANCE = 0.20;
/* 🥚 EASTER EGG : 0.2% par spawn → tuyau "arc-en-ciel" (palette café :
   or → caramel → cuivre → moka, gradient animé). Passer dedans = ×3 du
   reward du mode. Très rare, l'user qui le voit s'en souvient. */
const RAINBOW_PIPE_CHANCE = 0.002;
/* Pièce dorée — 5 % de chance PAR PARTIE (rolled au startGame, pas par
   spawn), comme le legendary barista de Devine la commande. Quand le drop
   est validé, on choisit un obstacle au hasard entre les indices 5 et 30
   pour y placer la pièce. Max 1 pièce par partie. Le cookie la traverse
   sans collision et gagne 1 ☕. */
/* Taux café bonus désormais PAR MODE (cf. MODES.coffeeRate) :
   Facile 5 %, Normal 10 %, Difficile 15 %. Cap toujours à 1 café max
   par partie. */
const GOLDEN_HITBOX = 22;   /* rayon d'interaction (px) */

const ARENA_W = 320;
const ARENA_H = 420;
const COOKIE_SIZE = 44;       // +6 vs init pour plus de présence visuelle
/* La hitbox effective est plus petite que le visuel (le cookie est rond,
   pas carré). 65 % du visuel → on collisione moins sur les "frôlements"
   et le jeu paraît juste. Astuce standard des jeux Flappy. */
const COOKIE_HITBOX = COOKIE_SIZE * 0.65;
const COOKIE_X = 70;          // x fixe du cookie (toujours sur la gauche)
const MAX_FALL_SPEED = 600;

const OBSTACLE_W = 50;
const GAP_MARGIN = 50;        // distance minimum bord arène
const SPEED_RAMP = 4;         // +px/s par tuyau passé
const MAX_SPEED  = 320;       // cap vitesse
const SPAWN_GAP  = 220;       // distance entre 2 obstacles (px)

const TAP_COOLDOWN_MS = 60;

/* 3 modes — Facile relâche tout (gap large, gravité douce, vitesse lente)
   pour les débutants ; Difficile resserre tout pour les vétérans.
   Gravité douce → cookie aérien. Gaps élargis pour rendre le jeu juste. */
/* coffeeRate : chance d'obtenir 1 café bonus PAR PARTIE — augmente
   avec la difficulté (5/10/15 %) pour récompenser ceux qui osent
   les modes durs. Affiché sur chaque carte de mode. */
const MODES = {
  facile:    { label:'Facile',    emoji:'🍼', gap:210, gravity:640,  flapSpeed:-300, baseSpeed:115, reward:3, rewardLight:6,  coffeeRate:0.05 },
  normal:    { label:'Normal',    emoji:'☕', gap:160, gravity:900,  flapSpeed:-350, baseSpeed:150, reward:4, rewardLight:8,  coffeeRate:0.10 },
  difficile: { label:'Difficile', emoji:'🔥', gap:120, gravity:1100, flapSpeed:-390, baseSpeed:180, reward:5, rewardLight:10, coffeeRate:0.15 },
};

export function FlappyGame({ coins, onEarn, onSpend, onCafeEarn, activeSkin, C }){
  const { t } = useTranslation();
  const hasCustomSkin = !!(activeSkin && COOKIE_SKINS[activeSkin] && activeSkin !== '');
  const skin = COOKIE_SKINS[activeSkin] || COOKIE_SKINS[''];
  const [phase, setPhase] = useState('idle');           // idle | countdown | playing | done
  const [mode,  setMode]  = useState('normal');         // facile | normal | difficile
  const [countdownVal, setCountdownVal] = useState(null);
  const [cookieY,    setCookieY]    = useState(ARENA_H / 2);
  const [obstacles,  setObstacles]  = useState([]);     // [{ id, x, gapY }]
  const [score,      setScore]      = useState(0);
  const [earned,     setEarned]     = useState(0);      // cookies effectivement gagnés (avec bonus light)
  const [recordHit,  setRecordHit]  = useState(false);
  const [pops,       setPops]       = useState([]);     // [{ id }] popups +1 🍪 fugaces
  const [shake,      setShake]      = useState(false);   // flash shake de l'arène à l'impact
  const [crashed,    setCrashed]    = useState(false);   // animation chute après collision (avant endGame)
  const [cafePop,    setCafePop]    = useState(0);       // bump anim quand pièce dorée collectée

  const phaseRef    = useRef('idle');
  const cookieYRef  = useRef(ARENA_H / 2);
  const cookieVRef  = useRef(0);
  const obstaclesRef = useRef([]);
  const scoreRef    = useRef(0);
  const earnedRef   = useRef(0);
  const rafRef      = useRef(null);
  const lastTRef    = useRef(0);
  const lastTapRef  = useRef(0);
  const spawnXRef   = useRef(0);   // x du dernier obstacle spawné (pour respecter SPAWN_GAP)
  const spawnCountRef = useRef(0); // nb d'obstacles spawnés cette partie (pour cibler la pièce dorée)
  const goldenIndexRef = useRef(-1); // index de l'obstacle qui aura la pièce dorée (-1 = pas cette partie)
  const modeRef     = useRef('normal');
  const crashedRef  = useRef(false);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { crashedRef.current = crashed; }, [crashed]);
  const modeCfg = MODES[mode] || MODES.normal;

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  /* Cleanup */
  useEffect(() => () => {
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const currentSpeed = () => Math.min(MAX_SPEED, MODES[modeRef.current].baseSpeed + scoreRef.current * SPEED_RAMP);
  const currentGap   = () => MODES[modeRef.current].gap;

  const reset = () => {
    setCookieY(ARENA_H / 2); cookieYRef.current = ARENA_H / 2; cookieVRef.current = 0;
    setObstacles([]); obstaclesRef.current = [];
    setScore(0); scoreRef.current = 0;
    setEarned(0); earnedRef.current = 0;
    spawnXRef.current = ARENA_W;
    spawnCountRef.current = 0;
    /* Roll du café bonus pour cette partie selon le mode actif
       (Facile 5%, Normal 10%, Difficile 15%). Si tiré → choisir un
       index d'obstacle dans [5, 30] pour y placer le café. */
    goldenIndexRef.current = Math.random() < MODES[modeRef.current].coffeeRate
      ? 5 + Math.floor(Math.random() * 26)
      : -1;
    lastTRef.current = 0;
    setCrashed(false); setShake(false);
  };

  const endGame = () => {
    if(phaseRef.current === 'done') return;
    setPhase('done'); phaseRef.current = 'done';
    if(rafRef.current){ cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const reward = Math.min(earnedRef.current, REWARD_CAP);
    if(reward > 0){
      onEarn(reward);
      playSound('success');
    } else {
      playSound('error');
    }
  };

  /* Crash : le cookie touche un tuyau ou un bord → on arrête les obstacles
     et on laisse le cookie tomber jusqu'au sol (pas d'arrêt sec), puis on
     déclenche endGame. Petit shake de l'arène pour le feedback impact. */
  const triggerCrash = () => {
    if(crashedRef.current || phaseRef.current === 'done') return;
    setCrashed(true); crashedRef.current = true;
    setShake(true);
    setTimeout(() => setShake(false), 280);
    playSound('error');
    /* Donne un léger rebond vers le haut au choc, plus visible que de
       continuer la trajectoire en cours. */
    cookieVRef.current = -180;
  };

  const spawnObstacle = () => {
    const gap = currentGap();
    const minY = GAP_MARGIN + gap / 2;
    const maxY = ARENA_H - GAP_MARGIN - gap / 2;
    const gapY = minY + Math.random() * (maxY - minY);
    /* Pièce dorée : seulement sur l'obstacle ciblé (rolled au reset). */
    const hasGolden = spawnCountRef.current === goldenIndexRef.current;
    /* 🥚 Easter egg tuyau arc-en-ciel — rolled en premier, prend priorité
       sur le light (mutuellement exclusifs). */
    const isRainbow = Math.random() < RAINBOW_PIPE_CHANCE;
    /* Espresso clair : 20 % par spawn, indépendant de la pièce dorée. */
    const isLight = !isRainbow && Math.random() < LIGHT_PIPE_CHANCE;
    spawnCountRef.current += 1;
    const ob = {
      id: Date.now() + Math.random(),
      x: ARENA_W + 20, gapY, gap,
      passed: false,
      golden: hasGolden, goldenCollected: false,
      light: isLight,
      rainbow: isRainbow,
    };
    obstaclesRef.current = [...obstaclesRef.current, ob];
    setObstacles(obstaclesRef.current);
  };

  const tick = (ts) => {
    if(!lastTRef.current) lastTRef.current = ts;
    const dt = Math.min(0.05, (ts - lastTRef.current) / 1000); /* cap dt 50 ms anti-jank */
    lastTRef.current = ts;

    /* Cookie physics (paramètres selon le mode actif) */
    const cfg = MODES[modeRef.current];
    cookieVRef.current = Math.min(MAX_FALL_SPEED, cookieVRef.current + cfg.gravity * dt);
    cookieYRef.current = cookieYRef.current + cookieVRef.current * dt;

    /* En mode crashed, on n'évalue plus rien d'autre — le cookie tombe et
       on déclenche endGame() quand il touche le sol. */
    if(crashedRef.current){
      if(cookieYRef.current + COOKIE_HITBOX/2 >= ARENA_H){
        cookieYRef.current = ARENA_H - COOKIE_HITBOX/2;
        setCookieY(cookieYRef.current);
        endGame();
        return;
      }
      setCookieY(cookieYRef.current);
      if(phaseRef.current === 'playing'){
        rafRef.current = requestAnimationFrame(tick);
      }
      return;
    }

    /* Bornes arène = crash (déclenche l'animation de chute) */
    if(cookieYRef.current - COOKIE_HITBOX/2 <= 0 || cookieYRef.current + COOKIE_HITBOX/2 >= ARENA_H){
      cookieYRef.current = Math.max(COOKIE_HITBOX/2, Math.min(ARENA_H - COOKIE_HITBOX/2, cookieYRef.current));
      setCookieY(cookieYRef.current);
      triggerCrash();
      if(phaseRef.current === 'playing'){
        rafRef.current = requestAnimationFrame(tick);
      }
      return;
    }

    /* Obstacles : déplacement et collision */
    const speed = currentSpeed();
    let scoreInc = 0;
    let earnedInc = 0;
    let lastReward = 0;     /* dernier gain unitaire (pour le popup) */
    let lastWasRainbow = false; /* easter egg flag pour le popup/son */
    let lastWasLight = false;
    let collided = false;
    const next = [];
    for(const ob of obstaclesRef.current){
      const newX = ob.x - speed * dt;
      const passed = ob.passed || newX + OBSTACLE_W < COOKIE_X - COOKIE_SIZE/2;
      if(passed && !ob.passed){
        scoreInc += 1;
        const m = MODES[modeRef.current];
        const r = ob.rainbow ? m.reward * 3 : (ob.light ? m.rewardLight : m.reward);
        earnedInc += r;
        lastReward = r;
        lastWasRainbow = !!ob.rainbow;
        lastWasLight = !!ob.light;
      }
      /* Collision AABB sur la hitbox réduite (cookie rond → carré inscrit ~65 %).
         Le visuel est plus grand mais les "frôlements" ne tuent pas. */
      const cookieLeft   = COOKIE_X - COOKIE_HITBOX/2;
      const cookieRight  = COOKIE_X + COOKIE_HITBOX/2;
      const cookieTop    = cookieYRef.current - COOKIE_HITBOX/2;
      const cookieBottom = cookieYRef.current + COOKIE_HITBOX/2;
      const obLeft  = newX;
      const obRight = newX + OBSTACLE_W;
      if(cookieRight > obLeft && cookieLeft < obRight){
        const halfGap = (ob.gap || currentGap()) / 2;
        const gapTop    = ob.gapY - halfGap;
        const gapBottom = ob.gapY + halfGap;
        if(cookieTop < gapTop || cookieBottom > gapBottom){
          collided = true;
        }
      }
      /* Pièce dorée — check de proximité au centre du gap */
      let goldenCollected = ob.goldenCollected;
      if(ob.golden && !goldenCollected){
        const coinX = newX + OBSTACLE_W / 2;
        const coinY = ob.gapY;
        const dx = coinX - COOKIE_X;
        const dy = coinY - cookieYRef.current;
        if(Math.abs(dx) < GOLDEN_HITBOX && Math.abs(dy) < GOLDEN_HITBOX){
          goldenCollected = true;
          onCafeEarn?.();
          playSound('success');
          setCafePop(c => c + 1);
        }
      }
      /* Retire si complètement hors écran à gauche */
      if(newX + OBSTACLE_W > -10){
        next.push({ ...ob, x: newX, passed, goldenCollected });
      }
    }
    obstaclesRef.current = next;

    /* Spawn nouvel obstacle si le précédent est suffisamment loin */
    const lastOb = next[next.length - 1];
    if(!lastOb || (ARENA_W - lastOb.x) >= SPAWN_GAP){
      spawnObstacle();
    }

    /* Apply updates batched */
    setCookieY(cookieYRef.current);
    setObstacles(obstaclesRef.current);
    if(scoreInc > 0){
      const newScore = Math.min(SCORE_CAP, scoreRef.current + scoreInc);
      scoreRef.current = newScore;
      setScore(newScore);
      const newEarned = Math.min(REWARD_CAP, earnedRef.current + earnedInc);
      earnedRef.current = newEarned;
      setEarned(newEarned);
      /* Son : jackpot pour tuyau arc-en-ciel (easter egg), coin atténué
         pour tuyau espresso clair, silence pour tuyau standard (sinon
         trop fréquent et lassant). Volume atténué pour coin (demande
         user 13/05/2026). */
      const popId = ts + Math.random();
      if(lastWasRainbow) playSound('jackpot');
      else if(lastWasLight) playSound('coin', { volume: 0.18 });
      setPops(p => [...p, { id: popId, amount: lastReward, light: lastWasLight, rainbow: lastWasRainbow }]);
      setTimeout(() => setPops(p => p.filter(x => x.id !== popId)), lastWasRainbow ? 1200 : 700);
      /* Auto-end si score cap (anti-cheat) OU reward cap atteint */
      if(newScore >= SCORE_CAP || newEarned >= REWARD_CAP){
        endGame();
        return;
      }
    }

    if(collided){
      triggerCrash();
      if(phaseRef.current === 'playing'){
        rafRef.current = requestAnimationFrame(tick);
      }
      return;
    }

    if(phaseRef.current === 'playing'){
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const startGame = () => {
    if(coins < FLAPPY_COST) return;
    playSound('modal');
    onSpend(FLAPPY_COST);
    reset();
    setPhase('countdown'); phaseRef.current = 'countdown';
    let n = 3;
    setCountdownVal(n);
    const cd = setInterval(() => {
      n--;
      if(n > 0) setCountdownVal(n);
      else if(n === 0) setCountdownVal('GO');
      else {
        clearInterval(cd);
        setCountdownVal(null);
        setPhase('playing'); phaseRef.current = 'playing';
        /* Premier flap auto pour éviter le crash immédiat */
        cookieVRef.current = MODES[modeRef.current].flapSpeed;
        lastTRef.current = 0;
        rafRef.current = requestAnimationFrame(tick);
      }
    }, 700);
  };

  const handleTap = () => {
    if(phaseRef.current !== 'playing' || crashedRef.current) return;
    const now = Date.now();
    if(now - lastTapRef.current < TAP_COOLDOWN_MS) return;
    lastTapRef.current = now;
    cookieVRef.current = MODES[modeRef.current].flapSpeed;
    /* Son de saut synthétisé (sweep 280→600 Hz, sine+tri, env ultra-courte)
       — remplace l'ancien 'tap' générique. Voir audio.js playFlappyJumpSynth. */
    playSound('flappy_jump');
  };

  const replay = () => {
    setPhase('idle'); phaseRef.current = 'idle';
    reset();
    if(!recordHit && score > 0){ /* noop */ }
    setRecordHit(false);
  };

  const canPlay = coins >= FLAPPY_COST;
  const btnLabel =
      phase === 'idle' ? t('games.start_btn', { cost: FLAPPY_COST })
    : phase === 'countdown' ? '…'
    : phase === 'playing'   ? t('game_flappy.tap_to_fly')
    :                         t('games.replay_btn', { cost: FLAPPY_COST });

  /* Rotation du cookie selon la vélocité (effet plongeon / remontée) */
  const cookieRot = Math.max(-25, Math.min(70, cookieVRef.current * 0.12));

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, paddingTop:6 }}>

      {/* Sélecteur de mode (idle uniquement) */}
      {phase === 'idle' && (
        <div style={{ width:'100%', maxWidth:340, display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{
            fontSize:10, fontWeight:700, color:C.muted,
            textTransform:'uppercase', letterSpacing:1.5,
            textAlign:'left',
          }}>
            {t('games.select_mode_short')}
          </div>
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6,
            padding:4, borderRadius:12,
            background:C.card, border:`1px solid ${C.border}`,
          }}>
            {Object.entries(MODES).map(([key, cfg]) => {
              const active = mode === key;
              return (
                <button
                  key={key}
                  onClick={() => { setMode(key); playSound('toggle'); }}
                  style={{
                    padding:'8px 4px', borderRadius:9, border:'none',
                    background: active ? GOLD : 'transparent',
                    color: active ? '#fff' : C.muted,
                    fontSize:11, fontWeight:800, letterSpacing:.3,
                    cursor:'pointer', transition:'background .15s, color .15s',
                    touchAction:'manipulation', userSelect:'none',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                    lineHeight:1.2,
                  }}
                >
                  <span>{cfg.emoji} {cfg.label}</span>
                  <span style={{
                    fontSize:9, fontWeight:700, letterSpacing:.4,
                    opacity: active ? 0.85 : 0.7,
                  }}>
                    {Math.round(cfg.coffeeRate * 100)}% ☕
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display:'flex', gap:10, width:'100%', maxWidth:340 }}>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${phase==='playing'?'#D4A017':C.border}`, textAlign:'center' }}>
          <div style={{ fontSize:11 }}>☕</div>
          <div style={{ fontSize:22, fontWeight:900, color: phase==='playing'?'#D4A017':C.text, lineHeight:1.1 }}>{score}</div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Tuyaux</div>
        </div>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${C.border}`, textAlign:'center' }}>
          <div style={{ fontSize:11 }}>🍪</div>
          <div style={{ fontSize:22, fontWeight:900, color:C.text, lineHeight:1.1 }}>{Math.min(earned, REWARD_CAP)}<span style={{ fontSize:13, color:C.muted, fontWeight:700 }}>/{REWARD_CAP}</span></div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Gagné</div>
        </div>
      </div>

      {/* Arena */}
      <div
        onPointerDown={(e) => { e.preventDefault(); handleTap(); }}
        style={{
          position:'relative',
          width:ARENA_W, height:ARENA_H,
          background:'linear-gradient(180deg, #FFE89A 0%, #F0C8A0 60%, #C8945A 100%)',
          borderRadius:18,
          border:'1.5px solid rgba(212,160,23,.45)',
          overflow:'hidden',
          cursor:'pointer', touchAction:'manipulation',
          userSelect:'none', WebkitUserSelect:'none',
          boxShadow:'inset 0 0 36px rgba(212,160,23,.25)',
          animation: shake ? 'shake .28s ease-in-out 2' : 'none',
        }}
      >
        {/* Sol (zone bas, déco) */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0, height:20,
          background:'linear-gradient(180deg, #8B5A2B, #5A3520)',
          borderTop:'2px solid #6B3D20',
        }}/>

        {/* Obstacles — tuyaux espresso (sombre par défaut, clair si ob.light). */}
        {obstacles.map(ob => {
          const halfGap = (ob.gap || currentGap()) / 2;
          const gapTop = ob.gapY - halfGap;
          const gapBottom = ob.gapY + halfGap;
          const RIM_H = 12;
          /* Tuyau easter egg "arc-en-ciel" : palette café multicolore
             (or → caramel → cuivre → moka), gradient diagonal + animation
             gradientShift pour faire "vibrer" la couleur. */
          const PIPE_GRAD = ob.rainbow
            ? 'linear-gradient(135deg, #FFE066 0%, #D4A017 25%, #C17F3C 50%, #7A5232 75%, #FFE066 100%)'
            : ob.light
              ? 'linear-gradient(90deg, #6B4530 0%, #C8945A 50%, #6B4530 100%)'
              : 'linear-gradient(90deg, #2A1408 0%, #5A3520 50%, #2A1408 100%)';
          const RIM_GRAD  = ob.rainbow
            ? 'linear-gradient(90deg, #C8960C 0%, #FFE066 50%, #C8960C 100%)'
            : ob.light
              ? 'linear-gradient(90deg, #5A3520 0%, #FFB840 50%, #5A3520 100%)'
              : 'linear-gradient(90deg, #1A0804 0%, #7D4E1F 50%, #1A0804 100%)';
          const BORDER_COL = ob.rainbow ? '#C8960C' : (ob.light ? '#5A3520' : '#0F0402');
          /* Animation gradient seulement pour rainbow (palettes statiques sinon). */
          const PIPE_ANIM = ob.rainbow ? 'gradientShift 1.8s ease-in-out infinite' : 'none';
          const PIPE_BG_SIZE = ob.rainbow ? '300% 300%' : 'auto';
          return (
            /* PERF MOBILE : translate3d au lieu de `left:ob.x` pour éviter
               un reflow par frame sur 3-5 obstacles. willChange annonce au
               browser de promouvoir ce wrapper sur sa propre couche GPU. */
            <div key={ob.id} style={{ position:'absolute', left:0, top:0, width:OBSTACLE_W, height:ARENA_H, transform:`translate3d(${ob.x}px, 0, 0)`, willChange:'transform', pointerEvents:'none' }}>
              {/* Tuyau HAUT */}
              <div style={{
                position:'absolute', top:0, left:0, width:OBSTACLE_W, height:gapTop,
                background:PIPE_GRAD,
                backgroundSize: PIPE_BG_SIZE,
                animation: PIPE_ANIM,
                borderLeft:`2px solid ${BORDER_COL}`, borderRight:`2px solid ${BORDER_COL}`,
                boxShadow: ob.rainbow ? '0 0 18px rgba(255,224,102,.55)' : 'none',
              }}/>
              {/* Embouchure basse du tuyau haut */}
              <div style={{
                position:'absolute', top:gapTop - RIM_H, left:-4, width:OBSTACLE_W + 8, height:RIM_H,
                background:RIM_GRAD,
                border:`2px solid ${BORDER_COL}`, borderRadius:'3px',
                boxShadow: ob.rainbow ? '0 0 14px rgba(255,224,102,.7)' : '0 3px 6px rgba(0,0,0,.35)',
              }}/>

              {/* Tuyau BAS */}
              <div style={{
                position:'absolute', top:gapBottom, left:0, width:OBSTACLE_W, height:ARENA_H - gapBottom,
                background:PIPE_GRAD,
                backgroundSize: PIPE_BG_SIZE,
                animation: PIPE_ANIM,
                borderLeft:`2px solid ${BORDER_COL}`, borderRight:`2px solid ${BORDER_COL}`,
                boxShadow: ob.rainbow ? '0 0 18px rgba(255,224,102,.55)' : 'none',
              }}/>
              {/* Embouchure haute du tuyau bas */}
              <div style={{
                position:'absolute', top:gapBottom, left:-4, width:OBSTACLE_W + 8, height:RIM_H,
                background:RIM_GRAD,
                border:`2px solid ${BORDER_COL}`, borderRadius:'3px',
                boxShadow: ob.rainbow ? '0 0 14px rgba(255,224,102,.7)' : '0 -3px 6px rgba(0,0,0,.35)',
              }}/>

              {/* Café bonus — gros emoji ☕ qui flotte et scintille,
                  disparaît quand collecté. Plus de pièce/halo, juste le
                  café direct (demande user 13/05/2026). */}
              {ob.golden && !ob.goldenCollected && (
                <div style={{
                  position:'absolute',
                  left: OBSTACLE_W/2 - 18, top: ob.gapY - 18,
                  width:36, height:36,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:34, lineHeight:1,
                  animation:'float 2.5s ease-in-out infinite',
                  filter:'drop-shadow(0 0 10px rgba(255,210,77,.7))',
                  zIndex:5,
                }}>☕</div>
              )}
            </div>
          );
        })}

        {/* Cookie — réutilise le même sprite que Cookie Click (PremiumCookie
            par défaut ou SkinnedCookie si l'user a activé un skin de la boutique).
            Halo doré conservé pour bien se détacher du fond ambre.
            Quand crashed, halo coupé + filter grayscale pour l'effet "KO".

            PERF MOBILE :
            - On positionne via `transform: translate3d` + composé avec
              `rotate()` plutôt que `top` (translate3d active le GPU compositing).
            - Pas de `transition` sur transform : le rAF met déjà à jour le
              transform à 60fps, une transition CSS de 80ms par-dessus crée un
              double-buffer qui fait du jank sur Android.
            - Un seul `drop-shadow` (au lieu de deux empilés) — chaque
              drop-shadow sur un SVG transformé chaque frame est très coûteux. */}
        <div style={{
          position:'absolute',
          left: COOKIE_X - COOKIE_SIZE/2, top: 0,
          width: COOKIE_SIZE, height: COOKIE_SIZE,
          /* Ombre retirée (demande user 13/05/2026) — ne reste que
             le grayscale/brightness pour l'effet KO quand crashed. */
          filter: crashed
            ? 'grayscale(.7) brightness(.7)'
            : 'none',
          transform:`translate3d(0, ${cookieY - COOKIE_SIZE/2}px, 0) rotate(${cookieRot}deg)`,
          transition: 'filter .2s',
          willChange:'transform',
          pointerEvents:'none',
        }}>
          {hasCustomSkin
            ? <SkinnedCookie skin={skin} noShadow />
            : <PremiumCookie noShadow />}
        </div>

        {/* Popups gain 🍪 fugaces — or pour normal, ambré pour le tuyau
            espresso clair (×2), or saturé géant pour easter egg rainbow (×3). */}
        {pops.map(p => (
          <div key={p.id} style={{
            position:'absolute', top:cookieY - 30, left:COOKIE_X,
            transform:'translateX(-50%)',
            fontSize: p.rainbow ? 22 : (p.light ? 18 : 16),
            fontWeight:900,
            color: p.rainbow ? '#FFE066' : (p.light ? '#FFB840' : '#D4A017'),
            pointerEvents:'none',
            animation: p.rainbow ? 'floatUpFb 1.1s ease-out forwards' : 'floatUpFb .7s ease-out forwards',
            textShadow: p.rainbow
              ? '0 0 12px rgba(255,224,102,.95), 0 2px 5px rgba(0,0,0,.5)'
              : p.light
                ? '0 0 6px rgba(255,184,64,.7), 0 1px 3px rgba(0,0,0,.3)'
                : '0 1px 3px rgba(0,0,0,.3)',
            whiteSpace:'nowrap',
          }}>{p.rainbow ? `🌈 +${p.amount} 🍪 ×3` : `+${p.amount} 🍪`}</div>
        ))}

        {/* Popup +1 ☕ quand pièce dorée collectée — flash plus voyant */}
        {cafePop > 0 && (
          <div key={cafePop} style={{
            position:'absolute', top:cookieY - 50, left:COOKIE_X,
            transform:'translateX(-50%)',
            fontSize:22, fontWeight:900, color:'#C8960C',
            pointerEvents:'none',
            animation:'floatUpFb .9s ease-out forwards',
            textShadow:'0 0 8px rgba(255,210,77,.9), 0 2px 4px rgba(0,0,0,.4)',
            letterSpacing:.5,
          }}>+1 ☕</div>
        )}

        {/* Countdown overlay */}
        {phase === 'countdown' && countdownVal !== null && (
          <div key={String(countdownVal)} style={{
            position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
            fontSize: countdownVal === 'GO' ? 56 : 84, fontWeight:900,
            color: countdownVal === 'GO' ? '#C8960C' : '#D4A017',
            letterSpacing:'-2px',
            animation:'countdown .8s ease-out forwards',
            textShadow:'0 4px 18px rgba(212,160,23,.5)',
            pointerEvents:'none',
          }}>
            {countdownVal === 'GO' ? t('games.go') : countdownVal}
          </div>
        )}

        {/* Game over — overlay sombre + bannière centrée. Overlay assombrissant
            pour bien marquer la fin de partie (vs une simple pause).
            ⚠️ Le centrage est sur le wrapper (pas de transform), l'animation
            popIn vit sur l'enfant pour ne pas écraser le centrage. */}
        {phase === 'done' && (
          <div style={{
            position:'absolute', inset:0,
            background:'rgba(15,8,4,.5)',
            backdropFilter:'blur(2px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            pointerEvents:'none', zIndex:10,
          }}>
            <div
              className="bi"
              style={{
                background:'linear-gradient(135deg,#FBEFD4,#F0C050)',
                color:'#5D3A1F', padding:'16px 26px', borderRadius:16,
                border:'2px solid #D4A017',
                boxShadow:'0 8px 24px rgba(74,44,23,.5)',
                textAlign:'center', minWidth:220,
              }}
            >
              <div style={{ fontSize:16, fontWeight:900, marginBottom:6, letterSpacing:.3 }}>
                {score === 0
                  ? t('game_flappy.end_zero')
                  : t(score > 1 ? 'game_flappy.end_normal' : 'game_flappy.end_singular', { n: score })}
              </div>
              <div style={{ fontSize:13, fontWeight:800, color:'#5D3A1F' }}>+{Math.min(earned, REWARD_CAP)} 🍪</div>
            </div>
          </div>
        )}

        {/* Instruction tap quand idle */}
        {phase === 'idle' && (
          <div style={{
            position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:13, fontWeight:700, color:'#5A3520', fontStyle:'italic',
            pointerEvents:'none',
          }}>
            {t('game_flappy.tap_to_flap_long')}
          </div>
        )}
      </div>

      {/* Bouton principal */}
      <button
        onClick={phase === 'done' ? replay : phase === 'idle' ? startGame : undefined}
        disabled={phase === 'countdown' || phase === 'playing' || (!canPlay && phase !== 'done')}
        className={(phase === 'idle' || phase === 'done') && canPlay ? 'glow-anim' : ''}
        style={{
          width:200, padding:'13px 0', borderRadius:20, fontSize:14, fontWeight:900, letterSpacing:.4,
          background: (phase === 'idle' || phase === 'done') && canPlay ? GOLD : C.card,
          color: (phase === 'idle' || phase === 'done') && canPlay ? '#fff' : C.muted,
          border:`2px solid ${((phase === 'idle' || phase === 'done') && canPlay) ? 'transparent' : C.border}`,
          boxShadow: (phase === 'idle' || phase === 'done') && canPlay ? '0 5px 16px rgba(212,160,23,.4)' : 'none',
          cursor: (phase === 'idle' || phase === 'done') && canPlay ? 'pointer' : 'not-allowed',
          touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
        }}
      >
        {btnLabel}
      </button>

      {/* Tip */}
      <div style={{ width:'100%', maxWidth:340, padding:'10px 14px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center' }}>
        💡 Tap pour faire bondir · Évite les tuyaux · <strong style={{ color:'#D4A017' }}>+{modeCfg.reward} 🍪 / tuyau (+{modeCfg.rewardLight} sur clair) · cap {REWARD_CAP} 🍪</strong>
      </div>
    </div>
  );
}

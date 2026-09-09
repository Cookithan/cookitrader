import { useEffect, useId, useRef, useState } from "react";
import { GOLD, COOKIE_SKINS } from "../../data/themes.js";
import { SkinnedCookie } from "../cookies/SkinnedCookie.jsx";
import { PremiumCookie } from "../cookies/PremiumCookie.jsx";
import { playSound, startRiderEngine, setRiderEngine, stopRiderEngine } from "../../lib/audio.js";
import { haptic } from "../../lib/haptic.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   RiderGame — Cooki Rider (09/09/2026)
   ────────────────────────────────────────────────────
   Un biscuit roule sur une PISTE : des plateformes de pâte séparées par
   du vide, dans un ciel de mousse de lait. Une tasse est posée dessus.

   ── Une piste, pas un paysage ───────────────────────
   La première version dessinait un terrain vallonné continu, et c'était
   l'erreur de fond : sans vide entre les morceaux, la vitesse ne sert à
   rien, donc le maintien du doigt ne sert à rien non plus. Ici chaque
   plateforme est suivie d'un TROU. Tenir le gaz, c'est passer ; lever le
   doigt une seconde de trop, c'est s'écraser contre le flanc de la
   suivante. Toute la tension du jeu tient dans cette phrase.

   Deux règles de tracé, et elles ne sont pas décoratives :
     · une plateforme commence TOUJOURS à plat ou en descente — donc on
       peut toujours s'y poser ; on ne meurt jamais d'un décor injuste
     · seule la FIN d'une plateforme peut se cabrer (le tremplin), et
       c'est de là que viennent les gros vols, donc les figures

   ── La commande est un maintien ─────────────────────
     · au sol   — doigt posé = gaz, doigt levé = frein
     · en l'air — doigt posé = le biscuit tourne (figure arrière)
     · doigt levé en l'air = il se redresse pour poser
   Relâcher n'est donc jamais « ne rien faire ».

   ── Pourquoi la physique est écrite comme ça ────────
   `groundAt(x)` renvoie null au-dessus d'un trou : c'est ce null qui fait
   décoller, aucun test de pente n'est nécessaire. Sur une bosse, le
   décollage se décide en comparant à la GRAVITÉ — si suivre le sol
   demandait de tomber plus vite qu'une chute libre, le biscuit ne peut
   pas rester collé.

   L'atterrissage compare l'angle du biscuit à la pente du sol modulo un
   tour complet : « figure bouclée » et « à plat » sont donc la même
   condition, un seul test. Et si le premier contact se fait très en
   dessous de la surface, ce n'est pas un atterrissage mais un flanc de
   plateforme pris de plein fouet (EDGE_HIT).

   ── Le maintien doit s'ENTENDRE ─────────────────────
   Un doigt posé sur une vitre ne renvoie rien. Le retour est donc
   ailleurs : un bourdon de moteur dont la hauteur suit la vitesse
   (lib/audio.js), des traits de vitesse qui n'apparaissent qu'au-delà de
   STREAK_FROM, de la poussière sous la roue, et une vibration courte aux
   seuls moments forts (figure bouclée, casse).

   ── Rendu : deux transforms par image, pas plus ─────
   La piste est un <path> en coordonnées MONDE, reconstruit seulement
   quand une plateforme est créée ou élaguée — jamais à l'image. La
   caméra est un translate3d sur le calque, le biscuit en est un second.
   Tout le reste est immobile ou animé en CSS.
   (cf. la règle « jamais de top/left en % dans un jeu RAF »)

   Props : coins, onEarn, onSpend, activeSkin, C
═══════════════════════════════════════════════════════ */

export const RIDER_COST = 10;

/* ── Repère interne ────────────────────────────────
   L'aire reste en 320 × 420 quoi qu'il arrive : la physique et les
   collisions ne changent pas d'un pixel selon le téléphone. C'est le CSS
   qui agrandit (cf. echelleArene). */
const ARENA_W = 320;
const ARENA_H = 420;
const RIDER_X = 84;          // x ÉCRAN du biscuit — il ne bouge jamais, c'est la piste qui défile
const COOKIE_SIZE = 40;
const R = COOKIE_SIZE / 2;

const STEP     = 16;         // espacement des points de piste
const TRACK_TH = 15;         // épaisseur du ruban : une PISTE, pas un paysage
const AHEAD    = 620;        // marge de piste générée devant la caméra
const BEHIND   = 240;        // marge conservée derrière

const G         = 1000;
const ACCEL     = 340;       // gaz maintenu, au sol
const BRAKE     = 300;       // doigt levé, au sol
const SLOPE_ACC = 420;       // ce que la pente donne (descente) ou reprend (montée)
const MIN_V     = 60;
const MAX_V     = 360;       // plafond de départ
const V_RAMP    = 150;       // ce que le plafond gagne à difficulté maximale
const START_V   = 210;

const FLIP_AV  = -5.6;   // rad/s, doigt POSÉ en l'air → un tour complet en ~1,12 s
const AV_LERP  = 14;     // la rotation s'installe en ~70 ms au lieu de claquer
const LAND_TOL    = 1.45;    // rad (~83°) — on ne meurt qu'en retombant franchement à l'envers
const EDGE_HIT    = 26;      // px de pénétration au 1er contact = flanc pris de plein fouet
const FALL_DEPTH  = 300;     // px sous la plateforme la plus basse = tombé dans le vide
const AIR_GRACE   = 0.06;    // s — pas de test d'atterrissage juste après le décollage
/* Durée d'une partie. Les règles sont volontairement indulgentes — on
   ne meurt qu'en retombant franchement à l'envers — donc un pilote
   prudent ne tomberait jamais : sans chrono, la partie ne finirait pas.
   Le chrono borne la séance ; le crash, lui, reste la vraie sanction. */
const RUN_TIME    = 75;      // s
const STREAK_FROM = 240;     // vitesse à partir de laquelle les traits de vitesse apparaissent

const TAU = Math.PI * 2;

/* ── Barème ────────────────────────────────────────
   La distance n'est PAS la mesure du talent : avec un chrono et une
   vitesse plafonnée, tout le monde parcourt à peu près la même chose
   s'il ne tombe pas. Elle mesure donc la SURVIE, et ce sont les figures
   qui font l'écart. D'où des paliers de distance plats en haut et un
   bonus de figure élevé.
   Mesuré sur 300 parties de 75 s par profil :
     · qui mitraille le doigt        →  3 s        →   0 🍪
     · qui roule sans jamais tourner → 75 s        → 110 🍪
     · qui tourne (13 figures méd.)  → 75 s        → 266 🍪
   L'ancre reste Café Express : ~300 🍪 pour sa meilleure partie de 60 s.
   ⚠ Les bots ont un doigt parfait au 1/60e de seconde. À revoir après
   de vraies parties. */
const REWARD_PALIERS = [
  { m:150,  r:5   },
  { m:500,  r:20  },
  { m:1000, r:40  },
  { m:1600, r:60  },
  { m:2400, r:85  },
  { m:3300, r:110 },
];
const FLIP_BONUS = 12;
const REWARD_CAP = 320;
const DIST_CAP   = 5000;     // garde-fou : aucun bug ne peut imprimer à l'infini

function rewardFor(m, flips){
  let base = 0;
  for(const p of REWARD_PALIERS) if(m >= p.m) base = p.r;
  if(base === 0 && flips === 0) return 0;
  return Math.min(REWARD_CAP, base + flips * FLIP_BONUS);
}

/* ── La piste ──────────────────────────────────────
   Un run = une plateforme = { x0, ys[] }, un point tous les STEP px. Le
   trou entre deux plateformes n'est stocké nulle part : c'est simplement
   l'absence de piste entre la fin de l'une et le début de la suivante. */
function makeRun(x0, y0){ return { x0, ys:[y0], last:'vague', chips:null }; }
function runEndX(run){ return run.x0 + (run.ys.length - 1) * STEP; }
function runEndY(run){ return run.ys[run.ys.length - 1]; }

function span(run, len, fn){
  const n  = Math.max(1, Math.round(len / STEP));
  const y0 = runEndY(run);
  for(let i = 1; i <= n; i++) run.ys.push(y0 + fn(i / n));
}

function groundAt(runs, x){
  for(const run of runs){
    if(x < run.x0) return null;              // on est dans le trou précédent
    const xe = runEndX(run);
    if(x <= xe){
      const f = (x - run.x0) / STEP;
      const i = Math.min(run.ys.length - 2, Math.floor(f));
      const t = f - i;
      const a = run.ys[i];
      const b = run.ys[i + 1];
      return { y: a + (b - a) * t, slope: (b - a) / STEP };
    }
  }
  return null;                                // au-delà de la piste générée
}

/* ── Le tracé ──────────────────────────────────────
   LA PISTE EST CONTINUE. C'est le point que j'avais raté deux fois : en
   posant un trou derrière chaque plateforme, le biscuit passait sa vie
   en l'air, donc en rotation, donc le doigt ne voulait plus jamais dire
   « gaz ». Ici on roule, et on ne décolle que sur un tremplin ou sur un
   trou — deux événements qu'on voit venir.

   Trois figures, et une seule demande vraiment quelque chose :
     · la vague  — le gros du tracé. Sa pente est bornée pour qu'on ne
                   décolle JAMAIS dessus par accident.
     · le tremplin — on part en l'air une seconde environ. C'est LE
                   moment de décision : lâcher tôt pour poser à plat, ou
                   tenir jusqu'au bout et boucler un tour entier. Les
                   deux marchent ; c'est s'arrêter au milieu qui tue.
     · le trou   — court exprès (~0,22 s de vol) : on le passe gaz au
                   plancher sans y penser. Il ne teste que la vitesse. */
function addFeature(runs, diff){
  const run = runs[runs.length - 1];
  /* Jamais de trou juste après un tremplin : on vole encore quand il
     arrive, on le survole sans le voir, et on s'écrase sur le bord d'en
     face sans avoir rien fait de mal. Une vague, le temps de reposer
     les roues. */
  const r = run.last === 'tremplin' ? 0 : Math.random();

  if(r < 0.55){
    run.last = 'vague';
    const len = 240 + Math.random() * 170;
    /* Pente bornée : au-delà, la vague deviendrait un tremplin
       involontaire et on décollerait sans l'avoir demandé. */
    const dyMax = 0.18 * len;
    let dy = (Math.random() * 2 - 1) * (40 + 34 * diff);
    dy = Math.max(-dyMax, Math.min(dyMax, dy));
    span(run, len, u => dy * (0.5 - 0.5 * Math.cos(Math.PI * u)));
    return;
  }

  if(r < 0.86){
    run.last = 'tremplin';
    /* La pente de sortie est bornée à ~0,75 : au-delà, le vol dépasse
       1,3 s et 800 px, on survole toute la réception et on va mourir
       plus loin sans comprendre. À 0,75 le vol dure ~1,1 s — soit tout
       juste le temps d'un tour complet, ce qui n'est pas un hasard. */
    const rl   = 150 + Math.random() * 40;
    const rise = Math.min(0.48 * rl, 42 + 24 * diff + Math.random() * 18);
    span(run, rl, u => -rise * Math.pow(u, 1.5));
    /* La réception : longue et descendante, toujours plus longue que le
       vol qu'elle reçoit. Sans elle on retombe dans la montée suivante,
       nez en bas, et ça, aucun geste ne le rattrape. */
    span(run, 530 + 170 * diff, u => (150 + 110 * diff) * u);
    return;
  }

  /* Trou. Sa largeur est déduite d'un temps de vol court et constant :
     un trou n'est pas là pour faire tourner le biscuit, seulement pour
     sanctionner celui qui a levé le doigt trop tôt. Et le sol d'en face
     est posé au bout de la parabole, pas au hasard. */
  const vMaxIci = MAX_V + V_RAMP * diff;
  const vRequis = vMaxIci * 0.86;
  const tVol    = 0.20 + Math.random() * 0.06;
  const trou    = vRequis * tVol;
  const n0      = run.ys.length;
  const pente0  = n0 > 1 ? (run.ys[n0 - 1] - run.ys[n0 - 2]) / STEP : 0;
  const chute   = pente0 * vRequis * tVol + 0.5 * G * tVol * tVol + 8 + Math.random() * 20;

  const next = makeRun(runEndX(run) + trou, runEndY(run) + chute);
  next.last = 'trou';
  /* Le tirage est DEHORS : dans la fonction de forme, il serait rejoué
     à chaque point et la plateforme sortirait en dents de scie — des
     pentes de 1,5 invisibles à l'œil mais mortelles à l'atterrissage. */
  const penteRecue = 30 + Math.random() * 50;
  span(next, 240 + Math.random() * 140, u => penteRecue * u);
  runs.push(next);
}

function ensure(runs, camX){
  let changed = false;
  let guard = 0;
  while(runEndX(runs[runs.length - 1]) < camX + ARENA_W + AHEAD && guard++ < 40){
    addFeature(runs, Math.min(1, Math.max(0, runEndX(runs[runs.length - 1]) / 11000)));
    changed = true;
  }
  return changed;
}

function prune(runs, camX){
  const limit = camX - BEHIND;
  let changed = false;
  while(runs.length > 1 && runEndX(runs[0]) < limit){ runs.shift(); changed = true; }
  const first = runs[0];
  let drop = 0;
  while(first.ys.length - drop > 3 && first.x0 + (drop + 1) * STEP < limit) drop++;
  if(drop > 0){
    first.x0 += drop * STEP;
    first.ys  = first.ys.slice(drop);
    changed = true;
  }
  return changed;
}

/* La plateforme la plus basse en jeu : en dessous d'elle on ne peut plus
   retomber sur quoi que ce soit, donc on est tombé. Recalculé seulement
   quand la piste change, pas à chaque image. */
function solLePlusBas(runs){
  let m = -Infinity;
  for(const run of runs) for(const y of run.ys) if(y > m) m = y;
  return m;
}

/* Le ruban de pâte, sa croûte dorée et ses pépites. Reconstruit
   uniquement à la génération d'une plateforme. */
function buildPaths(runs){
  let ribbon = '';
  let crust  = '';
  const chips = [];
  for(const run of runs){
    const n = run.ys.length;
    let haut = `M ${run.x0.toFixed(1)} ${run.ys[0].toFixed(1)}`;
    for(let i = 1; i < n; i++) haut += ` L ${(run.x0 + i * STEP).toFixed(1)} ${run.ys[i].toFixed(1)}`;
    crust += `${haut} `;
    let d = haut;
    for(let i = n - 1; i >= 0; i--){
      d += ` L ${(run.x0 + i * STEP).toFixed(1)} ${(run.ys[i] + TRACK_TH).toFixed(1)}`;
    }
    ribbon += `${d} Z `;

    /* Pépites tirées une fois pour toutes à la création : si on les
       retirait au hasard à chaque reconstruction, elles sauteraient d'un
       endroit à l'autre sous les yeux du joueur. */
    if(!run.chips){
      run.chips = [];
      for(let i = 2; i < n - 1; i += 4){
        run.chips.push({
          x: run.x0 + i * STEP + (Math.random() * 12 - 6),
          y: run.ys[i] + 6 + Math.random() * (TRACK_TH - 12),
          r: 2.4 + Math.random() * 1.5,
        });
      }
    }
    for(const c of run.chips) if(c.x >= run.x0) chips.push(c);
  }
  return { ribbon: ribbon.trim(), crust: crust.trim(), chips };
}

function normAngle(a){
  let x = a % TAU;
  if(x >  Math.PI) x -= TAU;
  if(x < -Math.PI) x += TAU;
  return x;
}

/* Traits de vitesse — positions figées : ils défilent en CSS, seule
   l'opacité du conteneur bouge (une écriture de style par image). */
const STREAKS = [
  { top: 46,  w: 64, dur: 0.42, delay: 0    },
  { top: 96,  w: 44, dur: 0.36, delay: 0.13 },
  { top: 158, w: 78, dur: 0.46, delay: 0.06 },
  { top: 214, w: 52, dur: 0.38, delay: 0.21 },
  { top: 286, w: 68, dur: 0.44, delay: 0.09 },
  { top: 344, w: 40, dur: 0.34, delay: 0.16 },
];

/* Mousse de lait, en parallaxe lente. */
const NUAGES = [
  { x: 20,  y: 40,  w: 96,  h: 30 },
  { x: 168, y: 74,  w: 70,  h: 22 },
  { x: 292, y: 34,  w: 110, h: 34 },
  { x: 430, y: 88,  w: 82,  h: 26 },
  { x: 560, y: 48,  w: 96,  h: 30 },
];
const PARA_W = 700;

export function RiderGame({ coins, onEarn, onSpend, activeSkin, C }){
  const { t } = useTranslation();
  /* Id SVG préfixé : deux <defs> qui partagent un id se télescopent dans
     le DOM et le second rend comme le premier (même piège que
     SkinnedCookie). */
  const dough = `riderDough-${useId().replace(/:/g, '')}`;
  const hasCustomSkin = !!(activeSkin && COOKIE_SKINS[activeSkin] && activeSkin !== '');
  const skin = COOKIE_SKINS[activeSkin] || COOKIE_SKINS[''];

  const [phase, setPhase] = useState('idle');       // idle | countdown | playing | done
  const [countdownVal, setCountdownVal] = useState(null);
  const [echelleArene, setEchelleArene] = useState(1);
  const [paths, setPaths] = useState({ ribbon:'', crust:'', chips:[] });
  const [frame, setFrame] = useState({ camX:0, camY:0, ry:0, ang:0, v:START_V, gr:true });
  const [dist,  setDist]  = useState(0);
  const [reste, setReste] = useState(RUN_TIME);
  const [flips, setFlips] = useState(0);
  const [crashed, setCrashed] = useState(false);
  const [crashReason, setCrashReason] = useState(null);   // 'flip' | 'fall' | 'wall' | 'time'
  const [shake, setShake] = useState(false);
  const [holding, setHolding] = useState(false);
  const [squash, setSquash] = useState(false);
  const [pops, setPops] = useState([]);

  const areneBoxRef = useRef(null);

  const runsRef   = useRef([]);
  const xRef      = useRef(0);
  const yRef      = useRef(0);
  const vRef      = useRef(START_V);
  const vyRef     = useRef(0);
  const angRef    = useRef(0);
  const spinRef   = useRef(0);
  const avRef     = useRef(0);
  const groundedRef = useRef(true);
  const airTimeRef  = useRef(0);
  const camXRef   = useRef(0);
  const camYRef   = useRef(0);
  const basRef    = useRef(0);
  const distRef   = useRef(0);
  const tempsRef  = useRef(0);
  const resteRef  = useRef(RUN_TIME);
  const flipsRef  = useRef(0);
  const crashedRef = useRef(false);
  const crashTRef  = useRef(0);
  const crashKindRef = useRef(null);
  const throttleRef = useRef(false);
  const phaseRef  = useRef('idle');
  const rafRef    = useRef(null);
  const lastTRef  = useRef(0);
  const squashTRef = useRef(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    if(!areneBoxRef.current) return;
    const mesurer = () => {
      const w = areneBoxRef.current?.offsetWidth;
      if(w && w > 0) setEchelleArene(w / ARENA_W);
    };
    mesurer();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(mesurer) : null;
    if(ro) ro.observe(areneBoxRef.current);
    window.addEventListener('resize', mesurer);
    return () => { if(ro) ro.disconnect(); window.removeEventListener('resize', mesurer); };
  }, []);

  /* Le doigt peut se lever HORS de l'aire (on glisse en jouant). Sans ce
     relâché global, le gaz resterait bloqué à fond. */
  useEffect(() => {
    const up = () => { throttleRef.current = false; setHolding(false); };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  /* Le moteur ne doit jamais survivre au démontage : on quitte le jeu en
     plein virage et le bourdon continuerait sur tout le reste de l'app. */
  useEffect(() => () => {
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    if(squashTRef.current) clearTimeout(squashTRef.current);
    stopRiderEngine();
  }, []);

  const popFlip = (n) => {
    const id = Date.now() + Math.random();
    setPops(p => [...p, { id, n }]);
    setTimeout(() => setPops(p => p.filter(x => x.id !== id)), 700);
  };

  const reset = () => {
    /* Piste de départ : longue et plate, on prend sa vitesse avant le
       premier trou. */
    const runs = [makeRun(0, 60)];
    span(runs[0], 520, () => 0);
    runsRef.current = runs;

    xRef.current = 70;
    const g = groundAt(runs, 70);
    yRef.current = (g ? g.y : 60) - R;
    vRef.current = START_V;
    vyRef.current = 0;
    angRef.current = 0; spinRef.current = 0; avRef.current = 0;
    groundedRef.current = true; airTimeRef.current = 0;
    distRef.current = 0; flipsRef.current = 0; tempsRef.current = 0; resteRef.current = RUN_TIME;
    crashedRef.current = false; crashTRef.current = 0; crashKindRef.current = null;
    camXRef.current = xRef.current - RIDER_X;
    camYRef.current = yRef.current - ARENA_H * 0.40;
    lastTRef.current = 0;
    throttleRef.current = false;

    ensure(runs, camXRef.current);
    basRef.current = solLePlusBas(runs);
    setPaths(buildPaths(runs));
    setDist(0); setFlips(0); setReste(RUN_TIME); setCrashed(false); setCrashReason(null);
    setPops([]); setHolding(false); setSquash(false);
    setFrame({ camX:camXRef.current, camY:camYRef.current, ry:yRef.current, ang:0, v:START_V, gr:true });
  };

  const endGame = () => {
    if(phaseRef.current === 'done') return;
    setPhase('done'); phaseRef.current = 'done';
    if(rafRef.current){ cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    stopRiderEngine();
    throttleRef.current = false; setHolding(false);
    if(crashKindRef.current === 'time') setCrashReason('time');
    const reward = rewardFor(distRef.current, flipsRef.current);
    if(reward > 0){ onEarn(reward); playSound('coin'); }
    else playSound('error');
  };

  const crash = (kind) => {
    if(crashedRef.current) return;
    crashedRef.current = true;
    crashKindRef.current = kind;
    crashTRef.current = 0;
    setCrashed(true); setCrashReason(kind);
    if(kind !== 'fall'){
      /* La tasse part en vrille. Sur une chute dans le vide le biscuit
         est déjà loin en dessous : pas de rebond, on abrège. */
      vyRef.current = Math.min(vyRef.current, -170);
    }
    setShake(true);
    setTimeout(() => setShake(false), 240);
    playSound('error');
    haptic('warning');
  };

  const tick = (ts) => {
    if(phaseRef.current !== 'playing') return;
    if(!lastTRef.current) lastTRef.current = ts;
    const dt = Math.min(0.05, (ts - lastTRef.current) / 1000);   // cap anti-jank (onglet en arrière-plan)
    lastTRef.current = ts;

    const runs = runsRef.current;
    const hold = throttleRef.current;

    /* Le chrono ne court pas pendant la chute finale : mourir à la
       dernière seconde ne doit pas escamoter l'animation de casse. */
    if(!crashedRef.current){
      tempsRef.current += dt;
      /* Comparaison contre un ref, pas contre l'état : `tick` est créé
         une fois au départ et garderait une valeur périmée. */
      const r = Math.max(0, Math.ceil(RUN_TIME - tempsRef.current));
      if(r !== resteRef.current){ resteRef.current = r; setReste(r); }
      if(tempsRef.current >= RUN_TIME){ crashKindRef.current = 'time'; endGame(); return; }
    }

    if(crashedRef.current){
      crashTRef.current += dt;
      vRef.current  *= 0.93;
      vyRef.current += G * dt;
      xRef.current  += vRef.current * dt;
      yRef.current  += vyRef.current * dt;
      angRef.current += (crashKindRef.current === 'fall' ? -4 : -9) * dt;
      if(crashTRef.current > (crashKindRef.current === 'fall' ? 0.32 : 0.62)){ endGame(); return; }

    } else if(groundedRef.current){
      const g0 = groundAt(runs, xRef.current);
      const slope = g0 ? g0.slope : 0;
      vRef.current += (hold ? ACCEL : -BRAKE) * dt + slope * SLOPE_ACC * dt;
      /* Le plafond de vitesse monte avec la distance : les vols
         s'allongent, les trous se passent plus vite mais se ratent plus
         franchement. La tension monte sans un obstacle de plus. */
      const maxV = MAX_V + V_RAMP * Math.min(1, xRef.current / 11000);
      vRef.current = Math.max(MIN_V, Math.min(maxV, vRef.current));

      const nx = xRef.current + vRef.current * dt;
      const g1 = groundAt(runs, nx);

      if(!g1){
        /* La plateforme s'arrête : on part avec la vitesse verticale que
           le tremplin vient de donner. */
        groundedRef.current = false; airTimeRef.current = 0; spinRef.current = 0; avRef.current = 0;
        xRef.current = nx;
        playSound('flappy_jump');
      } else {
        const ny = g1.y - R;
        const implied = (ny - yRef.current) / dt;
        if(implied > vyRef.current + G * dt + 6){
          /* Suivre la piste demanderait de tomber plus vite qu'une chute
             libre → impossible, on décolle. */
          groundedRef.current = false; airTimeRef.current = 0; spinRef.current = 0; avRef.current = 0;
          vyRef.current += G * dt;
          xRef.current = nx;
          yRef.current += vyRef.current * dt;
        } else {
          xRef.current = nx;
          yRef.current = ny;
          vyRef.current = implied;
          angRef.current = Math.atan2(g1.slope, 1);
        }
      }

    } else {
      airTimeRef.current += dt;
      vyRef.current += G * dt;
      xRef.current  += vRef.current * dt;
      yRef.current  += vyRef.current * dt;

      /* Doigt posé = ça tourne. Doigt levé = le biscuit se redresse à
         MI-CHEMIN de sa trajectoire : après un très gros vol on pique à
         près de 70°, et suivre ce piqué à la lettre rendrait la pose
         impossible quoi que fasse le joueur. Un pilote redresse. */
      /* La règle de Rider, et rien d'autre : doigt posé, le biscuit
         tourne en arrière ; doigt levé, il GARDE son angle. Aucune
         dérive, aucun redressement automatique — ce que tu vois est ce
         que tu as demandé, et c'est ça qui rend le vol lisible.
         Mes versions précédentes ajoutaient une rotation avant subie et
         un délai pour la compenser : deux inventions qui se battaient
         entre elles, et un jeu injouable. */
      const cible = hold ? FLIP_AV : 0;
      avRef.current += (cible - avRef.current) * Math.min(1, AV_LERP * dt);
      angRef.current  += avRef.current * dt;
      spinRef.current += avRef.current * dt;

      if(yRef.current > basRef.current + FALL_DEPTH){
        crash('fall');
      } else if(airTimeRef.current > AIR_GRACE){
        const g = groundAt(runs, xRef.current);
        if(g && yRef.current >= g.y - R){
          if(yRef.current - (g.y - R) > EDGE_HIT){
            /* Premier contact très en dessous de la surface : ce n'est pas
               un atterrissage, c'est le flanc de la plateforme. */
            crash('wall');
          } else {
            const sa   = Math.atan2(g.slope, 1);
            const diff = normAngle(angRef.current - sa);
            if(Math.abs(diff) > LAND_TOL){
              crash('flip');
            } else {
              groundedRef.current = true;
              yRef.current = g.y - R;
              angRef.current = sa;
              avRef.current = 0;
              vyRef.current = g.slope * vRef.current;
              vRef.current *= 0.96;
              setSquash(true);
              if(squashTRef.current) clearTimeout(squashTRef.current);
              squashTRef.current = setTimeout(() => setSquash(false), 130);
              /* Seules les rotations ARRIÈRE comptent : `spin` accumule
                 aussi la dérive avant du doigt levé, et une chute assez
                 longue aurait offert une figure à qui n'a rien fait. */
              const n = Math.max(0, Math.round(-spinRef.current / TAU));
              if(n > 0){
                flipsRef.current += n;
                setFlips(flipsRef.current);
                playSound('flip');
                haptic('light');
                popFlip(n);
              }
              spinRef.current = 0;
            }
          }
        }
      }
    }

    const m = Math.min(DIST_CAP, Math.max(0, Math.floor(xRef.current / 10)));
    if(m !== distRef.current){ distRef.current = m; setDist(m); }

    camXRef.current = xRef.current - RIDER_X;
    const targetCamY = yRef.current - ARENA_H * 0.40;
    camYRef.current += (targetCamY - camYRef.current) * Math.min(1, 6 * dt);

    const grew   = ensure(runs, camXRef.current);
    const pruned = prune(runs, camXRef.current);
    if(grew || pruned){
      setPaths(buildPaths(runs));
      basRef.current = solLePlusBas(runs);
    }

    if(!crashedRef.current){
      setRiderEngine((vRef.current - MIN_V) / (MAX_V + V_RAMP - MIN_V), hold);
    }

    setFrame({
      camX:camXRef.current, camY:camYRef.current,
      ry:yRef.current, ang:angRef.current,
      v:vRef.current, gr:groundedRef.current,
    });
    rafRef.current = requestAnimationFrame(tick);
  };

  /* Décompte 3-2-1-GO puis départ. La valeur 3 est posée par startGame,
     pas ici : un setState en corps d'effet relance un rendu pour rien. */
  useEffect(() => {
    if(phase !== 'countdown') return;
    let n = 3;
    const id = setInterval(() => {
      n -= 1;
      if(n > 0){ setCountdownVal(n); playSound('tap'); }
      else if(n === 0){ setCountdownVal('GO'); playSound('toggle'); }
      else {
        clearInterval(id);
        setCountdownVal(null);
        setPhase('playing'); phaseRef.current = 'playing';
        lastTRef.current = 0;
        startRiderEngine();
        rafRef.current = requestAnimationFrame(tick);
      }
    }, 560);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startGame = () => {
    if(coins < RIDER_COST) return;
    onSpend(RIDER_COST);
    reset();
    setCountdownVal(3);
    setPhase('countdown');
  };

  /* preventDefault() sur pointerdown supprime le click de compatibilité
     sur mobile : appelé trop tôt, il tuerait le bouton « Rouler » qui vit
     DANS l'aire. On ne l'appelle donc qu'une fois la partie lancée. Le
     décompte accepte déjà le maintien, pour partir gaz ouvert. */
  const down = (e) => {
    const ph = phaseRef.current;
    if(ph !== 'playing' && ph !== 'countdown') return;
    e.preventDefault();
    throttleRef.current = true; setHolding(true);
  };
  const up = () => { throttleRef.current = false; setHolding(false); };

  const earnedNow    = rewardFor(dist, flips);
  const riderScreenY = frame.ry - frame.camY;
  const vitesse01    = Math.max(0, Math.min(1, (frame.v - STREAK_FROM) / 220));
  const jauge01      = Math.max(0, Math.min(1, (frame.v - MIN_V) / (MAX_V + V_RAMP - MIN_V)));
  const enPartie     = phase === 'playing';
  const paraX        = -((frame.camX * 0.22) % PARA_W);
  const paraY        = -frame.camY * 0.12;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, paddingTop:6 }}>

      {/* Stats */}
      <div style={{ display:'flex', gap:8, width:'100%' }}>
        <div style={{ flex:1, padding:'10px 6px', borderRadius:14, background:C.card, border:`1.5px solid ${enPartie?'#D4A017':C.border}`, textAlign:'center' }}>
          <div style={{ fontSize:11 }}>🛞</div>
          <div style={{ fontSize:21, fontWeight:900, color: enPartie?'#D4A017':C.text, lineHeight:1.1 }}>
            {dist}<span style={{ fontSize:12, color:C.muted, fontWeight:700 }}>m</span>
          </div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>{t('game_rider.dist_label')}</div>
        </div>
        <div style={{ flex:1, padding:'10px 6px', borderRadius:14, background:C.card, border:`1.5px solid ${C.border}`, textAlign:'center' }}>
          <div style={{ fontSize:11 }}>🔄</div>
          <div style={{ fontSize:21, fontWeight:900, color:C.text, lineHeight:1.1 }}>{flips}</div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>{t('game_rider.flips_label')}</div>
        </div>
        <div style={{ flex:1, padding:'10px 6px', borderRadius:14, background:C.card, border:`1.5px solid ${C.border}`, textAlign:'center' }}>
          <div style={{ fontSize:11 }}>🍪</div>
          <div style={{ fontSize:21, fontWeight:900, color:C.text, lineHeight:1.1 }}>{earnedNow}</div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>{t('game_rider.earned_label')}</div>
        </div>
      </div>

      {/* Aire — mesureur + metteur à l'échelle : le repère interne reste
          320 × 420 et le CSS agrandit. */}
      <div ref={areneBoxRef} style={{ position:'relative', width:'100%', aspectRatio:`${ARENA_W} / ${ARENA_H}` }}>
      <div style={{ position:'absolute', top:0, left:0, transform:`scale(${echelleArene})`, transformOrigin:'top left' }}>
      <div
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={up}
        style={{
          position:'relative', width:ARENA_W, height:ARENA_H,
          borderRadius:20, overflow:'hidden',
          /* Ciel latte : mousse en haut, café au lait en bas. */
          background:'linear-gradient(180deg, #FCF3E4 0%, #F2DCBB 42%, #E2C295 100%)',
          border:`2px solid ${C.border}`,
          touchAction: (enPartie || phase === 'countdown') ? 'none' : 'manipulation',
          userSelect:'none', cursor:'pointer',
          transform: shake ? 'translateX(-3px)' : 'none',
          transition:'transform .06s',
        }}
      >
        {/* Mousse de lait en parallaxe lente */}
        <div style={{
          position:'absolute', left:0, top:0, width:PARA_W * 2, height:ARENA_H,
          transform:`translate3d(${paraX}px, ${paraY}px, 0)`,
          willChange:'transform', pointerEvents:'none',
        }}>
          {[0, 1].map(k => NUAGES.map((n, i) => (
            <div key={`${k}-${i}`} style={{
              position:'absolute', left:k * PARA_W + n.x, top:n.y,
              width:n.w, height:n.h, borderRadius:n.h,
              background:'rgba(255,255,255,.62)',
            }} />
          )))}
        </div>

        {/* Traits de vitesse — n'apparaissent qu'au-delà de STREAK_FROM.
            Seule l'opacité du conteneur change d'une image à l'autre. */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', opacity: enPartie ? vitesse01 * 0.9 : 0 }}>
          {STREAKS.map((s, i) => (
            <div key={i} style={{
              position:'absolute', left:0, top:s.top, width:s.w, height:2.5,
              borderRadius:3, background:'rgba(255,255,255,.75)',
              animation:`riderStreak ${s.dur}s linear ${s.delay}s infinite`,
            }} />
          ))}
        </div>

        {/* La piste — un seul translate3d pour tout le décor. Les chemins
            sont en coordonnées monde et ne sont refaits qu'à la génération
            d'une plateforme. */}
        <div style={{
          position:'absolute', left:0, top:0, width:0, height:0,
          transform:`translate3d(${-frame.camX}px, ${-frame.camY}px, 0)`,
          willChange:'transform', pointerEvents:'none',
        }}>
          <svg style={{ position:'absolute', left:0, top:0, width:1, height:1, overflow:'visible' }}>
            <defs>
              <linearGradient id={dough} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#DCA968" />
                <stop offset="45%"  stopColor="#BE8547" />
                <stop offset="100%" stopColor="#8E5F30" />
              </linearGradient>
            </defs>
            {/* Ombre portée sous le ruban : détache la piste du ciel */}
            <path d={paths.ribbon} fill="rgba(90,53,32,.20)" transform="translate(0,7)" />
            <path d={paths.ribbon} fill={`url(#${dough})`} />
            {paths.chips.map((c, i) => (
              <circle key={i} cx={c.x} cy={c.y} r={c.r} fill="#4A2C17" opacity="0.78" />
            ))}
            {/* La croûte dorée : c'est elle qui donne le biscuit */}
            <path d={paths.crust} fill="none" stroke="#F3CE8B" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Poussière sous la roue — seulement quand ça pousse au sol */}
        {enPartie && holding && frame.gr && !crashed && (
          <div style={{ position:'absolute', left:0, top:0, pointerEvents:'none' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                position:'absolute',
                left: RIDER_X - 12, top: riderScreenY + R - 4,
                width: 9 - i, height: 9 - i, borderRadius:'50%',
                background:'rgba(142,95,48,.55)',
                animation:`riderDust ${0.42 + i * 0.06}s linear ${i * 0.13}s infinite`,
              }} />
            ))}
          </div>
        )}

        {/* Le biscuit et sa tasse — second et dernier translate3d */}
        <div style={{
          position:'absolute', left:0, top:0,
          width:COOKIE_SIZE, height:COOKIE_SIZE,
          marginLeft:-COOKIE_SIZE / 2, marginTop:-COOKIE_SIZE / 2,
          transform:`translate3d(${RIDER_X}px, ${riderScreenY}px, 0) rotate(${frame.ang}rad) scale(${squash ? 1.14 : 1}, ${squash ? 0.84 : 1})`,
          willChange:'transform', pointerEvents:'none',
          filter: crashed ? 'grayscale(.7)' : 'none',
        }}>
          {/* La tasse : c'est ELLE qui dit si l'atterrissage est bon. Elle
              tourne avec le biscuit, donc « à l'endroit » se lit d'un coup
              d'œil, sans jauge ni indicateur. */}
          <div style={{
            position:'absolute', left:'50%', top:-16, transform:'translateX(-50%)',
            fontSize:16, lineHeight:1, filter:'drop-shadow(0 2px 3px rgba(74,44,23,.45))',
          }}>☕</div>
          {hasCustomSkin ? <SkinnedCookie skin={skin} noShadow /> : <PremiumCookie noShadow />}
        </div>

        {/* Pops de figure */}
        {pops.map(p => (
          <div key={p.id} className="fu" style={{
            position:'absolute', left:RIDER_X, top:riderScreenY - 52,
            transform:'translateX(-50%)', pointerEvents:'none',
            fontSize:14, fontWeight:900, color:GOLD, whiteSpace:'nowrap',
            textShadow:'0 2px 6px rgba(74,44,23,.5)',
          }}>
            {t('game_rider.flip_pop', { n:p.n })}
          </div>
        ))}

        {/* Décompte */}
        {countdownVal !== null && (
          <div style={{
            position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(58,33,19,.32)', fontSize:52, fontWeight:900, color:'#fff',
            textShadow:'0 4px 14px rgba(58,33,19,.6)', pointerEvents:'none',
          }}>{countdownVal}</div>
        )}

        {/* Consigne — disparaît dès qu'on a compris */}
        {enPartie && !crashed && dist < 45 && (
          <div style={{
            position:'absolute', left:0, right:0, bottom:14, textAlign:'center',
            fontSize:12, fontWeight:800, color:'#4A2C17', pointerEvents:'none',
            textShadow:'0 1px 0 rgba(255,255,255,.6)',
          }}>{t('game_rider.hold_hint')}</div>
        )}

        {/* Chrono — un filet en haut de l'aire, pas un chiffre de plus */}
        {enPartie && (
          <div style={{ position:'absolute', left:10, right:10, top:8, height:4, borderRadius:3, background:'rgba(74,44,23,.22)', overflow:'hidden', pointerEvents:'none' }}>
            <div style={{
              height:'100%', borderRadius:3,
              width:`${Math.max(0, Math.min(100, (reste / RUN_TIME) * 100))}%`,
              background: reste <= 10 ? '#8E5F30' : 'rgba(255,255,255,.8)',
              transition:'width .25s linear',
            }} />
          </div>
        )}

        {/* Jauge de vitesse — le seul état permanent affiché */}
        {enPartie && (
          <div style={{
            position:'absolute', right:10, top:10, width:74,
            padding:'5px 7px', borderRadius:14,
            background:'rgba(74,44,23,.30)', pointerEvents:'none',
          }}>
            <div style={{ fontSize:8.5, fontWeight:900, color:'#fff', letterSpacing:.8, textAlign:'center', marginBottom:3 }}>
              {holding ? t('game_rider.gas_on') : t('game_rider.gas_off')}
            </div>
            <div style={{ height:4, borderRadius:3, background:'rgba(255,255,255,.22)', overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:3, width:`${Math.round(jauge01 * 100)}%`,
                background: holding ? GOLD : 'rgba(255,255,255,.5)',
              }} />
            </div>
          </div>
        )}

        {/* Écran d'accueil / de fin */}
        {(phase === 'idle' || phase === 'done') && (
          <div style={{
            position:'absolute', inset:0, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', gap:12, padding:'0 22px',
            background:'rgba(58,33,19,.55)', backdropFilter:'blur(2px)', textAlign:'center',
          }}>
            {phase === 'done' ? (
              <>
                <div style={{ fontSize:19, fontWeight:900, color:'#fff' }}>
                  {crashReason === 'time' ? t('game_rider.end_time')
                    : crashReason === 'fall' ? t('game_rider.end_fall')
                    : crashReason === 'wall' ? t('game_rider.end_wall')
                    : t('game_rider.end_flip')}
                </div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.8)', fontWeight:700 }}>
                  {t('game_rider.end_recap', { m:dist, f:flips })}
                </div>
                {earnedNow > 0 ? (
                  <div style={{ fontSize:30, fontWeight:900, color:GOLD, textShadow:'0 3px 12px rgba(212,160,23,.5)' }}>
                    +{earnedNow} 🍪
                  </div>
                ) : (
                  <div style={{ fontSize:12.5, color:'rgba(255,255,255,.65)', fontWeight:700 }}>{t('game_rider.end_none')}</div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize:34 }}>🛞☕</div>
                <div style={{ fontSize:13.5, fontWeight:800, color:'#fff', lineHeight:1.45 }}>{t('game_rider.intro')}</div>
                <div style={{ fontSize:11.5, color:'rgba(255,255,255,.72)', fontWeight:600, lineHeight:1.45 }}>
                  {t('game_rider.tip', { n:FLIP_BONUS })}
                </div>
              </>
            )}
            <button
              onClick={startGame}
              disabled={coins < RIDER_COST}
              className={coins >= RIDER_COST ? 'glow-anim' : ''}
              style={{
                marginTop:4, padding:'13px 30px', borderRadius:18,
                fontSize:14, fontWeight:900,
                background: coins < RIDER_COST ? '#5C3614' : GOLD,
                color: coins < RIDER_COST ? 'rgba(255,255,255,.55)' : '#fff',
                border:'none', cursor: coins < RIDER_COST ? 'not-allowed' : 'pointer',
                touchAction:'manipulation',
                boxShadow: coins >= RIDER_COST ? '0 4px 18px rgba(212,160,23,.45)' : 'none',
              }}
            >
              {coins < RIDER_COST
                ? t('game_rider.need_more', { n: RIDER_COST - coins })
                : (phase === 'done' ? t('game_rider.replay', { cost: RIDER_COST }) : t('game_rider.play_btn', { cost: RIDER_COST }))}
            </button>
          </div>
        )}
      </div>
      </div>
      </div>
    </div>
  );
}

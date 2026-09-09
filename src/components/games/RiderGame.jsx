import { useEffect, useId, useRef, useState } from "react";
import { GOLD, COOKIE_SKINS } from "../../data/themes.js";
import { SkinnedCookie } from "../cookies/SkinnedCookie.jsx";
import { PremiumCookie } from "../cookies/PremiumCookie.jsx";
import { playSound } from "../../lib/audio.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   RiderGame — Cooki Rider (09/09/2026)
   ────────────────────────────────────────────────────
   Un cookie roule sur un terrain qui défile, une tasse posée dessus.

   LA COMMANDE EST UN MAINTIEN, pas un tap :
     · au sol   — doigt posé = gaz, doigt levé = frein
     · en l'air — doigt posé = le cookie tourne (figure arrière)
   D'où la seule vraie décision du jeu : on lâche QUAND, pour retomber
   la tasse en haut. Trop tôt, la figure n'est pas bouclée ; trop tard,
   on passe le tour de trop. Le café se renverse dans les deux cas.

   ── Pourquoi la physique est écrite comme ça ────────
   Le sol est une suite de POINTS régulièrement espacés (STEP px),
   groupés en « runs » : un run = une portion de sol continue, et
   l'espace ENTRE deux runs est un trou. `groundAt(x)` renvoie donc
   null au-dessus d'un trou — c'est ce null qui fait décoller.

   Le décollage sur une bosse ne se code pas avec un test de pente
   mais avec une comparaison à la gravité : si suivre le terrain
   demanderait de descendre PLUS VITE qu'une chute libre, le cookie
   ne peut pas rester collé — il part en l'air. Un seuil de pente,
   lui, aurait décollé en montée comme en descente.

   L'atterrissage compare l'angle du cookie à la pente du sol à
   l'endroit où il retombe, modulo un tour complet : une figure
   bouclée revient sur le même angle, donc « bouclée » et « à plat »
   sont la même condition, et il n'y a qu'un seul test à écrire.

   ── Rendu : deux transforms par frame, pas plus ─────
   Le décor est dessiné UNE FOIS en coordonnées monde (un <path> SVG),
   dans un calque que la caméra translate en translate3d. Le chemin
   n'est reconstruit que quand du terrain est généré ou élagué — pas
   à chaque image. Le cookie est le second translate3d. Tout le reste
   est immobile : deux compositings GPU par frame, zéro reflow.
   (cf. la règle « jamais de top/left en % dans un jeu RAF »)

   Récompenses — calées sur 400 parties simulées par profil, pas sur
   une jolie arithmétique (cf. la note d'équilibrage plus bas) :
     · qui roule proprement sans jamais tourner : 1150 m / 33 s → 80 🍪
     · qui tourne quand il y a la place          : + ~7 figures → 116 🍪
     · qui garde le doigt collé                  : 144 m / 5 s → 0 🍪
   L'ancre reste Café Express : ~300 🍪 pour une partie de 60 s. Le
   plafond n'est atteint que par les très bonnes parties. À REVOIR
   après de vraies parties au doigt — le bot relâche parfaitement,
   un humain non.

   Props : coins, onEarn, onSpend, activeSkin, C
═══════════════════════════════════════════════════════ */

export const RIDER_COST = 10;

/* ── Repère interne ────────────────────────────────
   L'aire reste en 320 × 420 quoi qu'il arrive : la physique, les
   vitesses et les collisions ne changent pas d'un pixel selon le
   téléphone. C'est le CSS qui agrandit (cf. echelleArene). */
const ARENA_W = 320;
const ARENA_H = 420;
const RIDER_X = 92;          // x ÉCRAN du cookie — il ne bouge jamais, c'est le monde qui défile
const COOKIE_SIZE = 42;
const R = COOKIE_SIZE / 2;   // rayon de la roue

const STEP     = 14;         // espacement des points de sol
const AHEAD    = 520;        // marge de terrain générée devant la caméra
const BEHIND   = 220;        // marge conservée derrière (avant élagage)
const BOTTOM_Y = 1400;       // fond du remplissage du sol (monde)
const Y_MIN    = -190;       // le sol ne monte/descend jamais au-delà
const Y_MAX    = 190;

const G          = 620;      // gravité px/s² — volontairement basse : c'est elle qui donne le temps de vol, donc le temps de tourner
const ACCEL      = 210;      // gaz maintenu, au sol
const BRAKE      = 190;      // doigt levé, au sol
const SLOPE_ACC  = 340;      // ce que la pente donne (descente) ou reprend (montée)
const MIN_V      = 48;
const MAX_V      = 300;      // plafond de départ
const V_RAMP     = 130;      // ce que le plafond gagne quand la difficulté est au maximum
const START_V    = 120;

const FLIP_AV     = -7.2;    // rad/s en l'air, gaz maintenu (rotation arrière) — un tour en ~0,87 s
const LAND_TOL    = 1.15;    // rad (~66°) — au-delà, la tasse se renverse
const FALL_MARGIN = 330;     // px sous le point de décollage = tombé dans le trou
const AIR_GRACE   = 0.08;    // s — pas de test d'atterrissage juste après le décollage

const TAU = Math.PI * 2;

/* ── Barème ────────────────────────────────────────
   Volontairement plat au début (on ne gagne rien avant 60 m) : une
   partie ratée en 3 secondes ne doit rien rapporter du tout. */
const REWARD_PALIERS = [
  { m:120,  r:5   },
  { m:400,  r:15  },
  { m:700,  r:40  },
  { m:1100, r:80  },
  { m:1600, r:150 },
  { m:2400, r:250 },
];
const FLIP_BONUS = 6;
const REWARD_CAP = 320;
const DIST_CAP   = 5000;     // garde-fou : aucun bug ne peut imprimer à l'infini

function rewardFor(m, flips){
  let base = 0;
  for(const p of REWARD_PALIERS) if(m >= p.m) base = p.r;
  if(base === 0 && flips === 0) return 0;
  return Math.min(REWARD_CAP, base + flips * FLIP_BONUS);
}

/* ── Terrain ───────────────────────────────────────
   Un run = { x0, ys[] }, un point tous les STEP px. Le trou entre
   deux runs n'est stocké nulle part : c'est simplement l'absence de
   sol entre la fin de l'un et le début du suivant. */
function makeRun(x0, y0){ return { x0, ys:[y0] }; }
function runEndX(run){ return run.x0 + (run.ys.length - 1) * STEP; }
function runEndY(run){ return run.ys[run.ys.length - 1]; }

/* Ajoute `len` px de sol au run, la forme étant donnée par fn(u∈[0,1])
   en écart depuis le dernier point. La longueur est arrondie à un
   multiple de STEP — c'est ce qui garantit l'espacement régulier, et
   donc une lecture de hauteur en O(1) au lieu d'une recherche. */
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
  return null;                                // au-delà du terrain généré
}

/* ── La réception, la pièce la plus importante du tracé ──
   Un vol dure jusqu'à ~1,4 s à 330 px/s, soit près de 500 px. Si le
   terrain remonte dans cet intervalle, le cookie retombe nez en bas
   sur une pente qui monte : l'écart d'angle dépasse LAND_TOL et la
   partie s'arrête sans que le joueur ait rien fait de mal.
   Toute figure qui envoie en l'air est donc suivie d'une descente
   douce PLUS LONGUE que le vol qu'elle provoque. C'est ce qui rend
   la mort lisible : on ne meurt que d'avoir mal tourné. */
function reception(run, len, drop){
  const d = Math.max(0, Math.min(drop, Y_MAX - runEndY(run)));
  span(run, len, u => d * u);
}

/* La difficulté ne monte pas par des obstacles plus vicieux mais par
   la géométrie : bosses plus hautes et plus courtes, trous plus longs.
   Le même geste devient tendu tout seul. */
function addFeature(runs, diff){
  const run = runs[runs.length - 1];
  const y0  = runEndY(run);
  const r   = Math.random();

  let kind;
  if(diff < 0.12)   kind = r < 0.62 ? 'roll' : 'crest';
  else if(r < 0.34) kind = 'roll';
  else if(r < 0.66) kind = 'crest';
  else              kind = 'jump';

  if(kind === 'roll'){
    /* Le tirage est recentré vers 0 : sans ça le sol dérive vers une
       borne et y reste collé, et on perd tout le relief. */
    const len = 260 + Math.random() * 150;
    const amp = 34 + 40 * diff;
    let dy = (Math.random() * 2 - 1) * amp - y0 * 0.35;
    /* Pente max d'une rampe en cosinus = |dy|·π / 2·len. On la borne à
       0,35 pour qu'un « roll » ne soit jamais un mur à l'atterrissage. */
    const dyMax = 0.223 * len;
    dy = Math.max(-dyMax, Math.min(dyMax, dy));
    dy = Math.max(Y_MIN - y0, Math.min(Y_MAX - y0, dy));
    span(run, len, u => dy * (0.5 - 0.5 * Math.cos(Math.PI * u)));
    return;
  }

  if(kind === 'crest'){
    /* Bosse qui revient à sa hauteur de départ. C'est la DESCENTE qui
       envoie en l'air, pas la montée — d'où une bosse d'autant plus
       courte que la difficulté monte. */
    const h   = 52 + 58 * diff + Math.random() * 26;
    const len = 210 - 50 * diff;
    span(run, len, u => -h * Math.sin(Math.PI * u));
    /* La réception se raccourcit avec la difficulté : c'est là que le
       jeu se durcit vraiment, pas dans la taille des bosses. */
    reception(run, 680 - 200 * diff, 90);
    return;
  }

  /* jump — rampe qui se cabre (u^1.6 : la pente augmente jusqu'au bout,
     c'est ce qui fait un vrai tremplin), puis trou, puis réception. */
  const rampLen = 96 + Math.random() * 34;
  const rise    = 40 + 46 * diff + Math.random() * 18;
  const dy      = Math.max(Y_MIN, y0 - rise) - y0;
  span(run, rampLen, u => dy * Math.pow(u, 1.6));

  const gapLen = 76 + 150 * diff + Math.random() * 48;
  const landY  = Math.min(Y_MAX - 40, runEndY(run) + 30 + Math.random() * 50);
  const next   = makeRun(runEndX(run) + gapLen, landY);
  reception(next, 500 - 150 * diff, 120);
  runs.push(next);
}

function ensure(runs, camX){
  let changed = false;
  let guard = 0;
  while(runEndX(runs[runs.length - 1]) < camX + ARENA_W + AHEAD && guard++ < 40){
    addFeature(runs, Math.min(1, Math.max(0, runEndX(runs[runs.length - 1]) / 12000)));
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

/* Deux chemins : le rempli (sol + masse en dessous) et le liseré de
   surface. Les trous deviennent naturellement des sous-chemins
   séparés — un « M » par run. */
function buildPaths(runs){
  let fill = '';
  let line = '';
  for(const run of runs){
    let d = `M ${run.x0.toFixed(1)} ${run.ys[0].toFixed(1)}`;
    for(let i = 1; i < run.ys.length; i++){
      d += ` L ${(run.x0 + i * STEP).toFixed(1)} ${run.ys[i].toFixed(1)}`;
    }
    line += `${d} `;
    fill += `${d} L ${runEndX(run).toFixed(1)} ${BOTTOM_Y} L ${run.x0.toFixed(1)} ${BOTTOM_Y} Z `;
  }
  return { fill: fill.trim(), line: line.trim() };
}

function normAngle(a){
  let x = a % TAU;
  if(x >  Math.PI) x -= TAU;
  if(x < -Math.PI) x += TAU;
  return x;
}

export function RiderGame({ coins, onEarn, onSpend, activeSkin, C }){
  const { t } = useTranslation();
  /* Id de dégradé préfixé : deux <defs> qui partagent un id se
     télescopent dans le DOM et le second rend comme le premier
     (même piège que SkinnedCookie). */
  const gradId = `riderGround-${useId().replace(/:/g, '')}`;
  const hasCustomSkin = !!(activeSkin && COOKIE_SKINS[activeSkin] && activeSkin !== '');
  const skin = COOKIE_SKINS[activeSkin] || COOKIE_SKINS[''];

  const [phase, setPhase] = useState('idle');       // idle | countdown | playing | done
  const [countdownVal, setCountdownVal] = useState(null);
  const [echelleArene, setEchelleArene] = useState(1);
  const [paths, setPaths] = useState({ fill:'', line:'' });
  const [frame, setFrame] = useState({ camX:0, camY:0, ry:0, ang:0 });
  const [dist,  setDist]  = useState(0);
  const [flips, setFlips] = useState(0);
  const [crashed, setCrashed] = useState(false);
  const [crashReason, setCrashReason] = useState(null);   // 'flip' | 'fall'
  const [shake, setShake] = useState(false);
  const [holding, setHolding] = useState(false);
  const [pops, setPops] = useState([]);

  const areneBoxRef = useRef(null);

  const runsRef   = useRef([]);
  const xRef      = useRef(0);
  const yRef      = useRef(0);
  const vRef      = useRef(START_V);
  const vyRef     = useRef(0);
  const angRef    = useRef(0);
  const avRef     = useRef(0);
  const spinRef   = useRef(0);
  const groundedRef = useRef(true);
  const airTimeRef  = useRef(0);
  const launchYRef  = useRef(0);
  const camXRef   = useRef(0);
  const camYRef   = useRef(0);
  const distRef   = useRef(0);
  const flipsRef  = useRef(0);
  const crashedRef = useRef(false);
  const crashTRef  = useRef(0);
  const crashKindRef = useRef(null);
  const throttleRef = useRef(false);
  const phaseRef  = useRef('idle');
  const rafRef    = useRef(null);
  const lastTRef  = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  /* Mesure de la largeur réelle → échelle. L'aire garde son repère. */
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

  /* Le doigt peut se lever HORS de l'aire (on glisse en jouant). Sans
     ce relâché global, le gaz resterait bloqué à fond. */
  useEffect(() => {
    const up = () => { throttleRef.current = false; setHolding(false); };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  useEffect(() => () => { if(rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const popFlip = (n) => {
    const id = Date.now() + Math.random();
    setPops(p => [...p, { id, n }]);
    setTimeout(() => setPops(p => p.filter(x => x.id !== id)), 700);
  };

  const reset = () => {
    const runs = [makeRun(0, 40)];
    span(runs[0], 430, () => 0);          // ligne de départ plate : on prend sa vitesse
    runsRef.current = runs;

    xRef.current = 60;
    const g = groundAt(runs, 60);
    yRef.current = (g ? g.y : 40) - R;
    vRef.current = START_V;
    vyRef.current = 0;
    angRef.current = 0; avRef.current = 0; spinRef.current = 0;
    groundedRef.current = true; airTimeRef.current = 0;
    launchYRef.current = yRef.current;
    distRef.current = 0; flipsRef.current = 0;
    crashedRef.current = false; crashTRef.current = 0; crashKindRef.current = null;
    camXRef.current = xRef.current - RIDER_X;
    camYRef.current = yRef.current - ARENA_H * 0.58;
    lastTRef.current = 0;
    throttleRef.current = false;

    ensure(runs, camXRef.current);
    setPaths(buildPaths(runs));
    setDist(0); setFlips(0); setCrashed(false); setCrashReason(null);
    setPops([]); setHolding(false);
    setFrame({ camX:camXRef.current, camY:camYRef.current, ry:yRef.current, ang:0 });
  };

  const endGame = () => {
    if(phaseRef.current === 'done') return;
    setPhase('done'); phaseRef.current = 'done';
    if(rafRef.current){ cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    throttleRef.current = false; setHolding(false);
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
    /* La tasse se renverse : le cookie part en vrille. Sur une chute
       dans le trou il est déjà loin en dessous, pas de rebond. */
    if(kind === 'flip'){
      avRef.current = -7;
      vyRef.current = Math.min(vyRef.current, -140);
    }
    setShake(true);
    setTimeout(() => setShake(false), 260);
    playSound('error');
  };

  const tick = (ts) => {
    if(phaseRef.current !== 'playing') return;
    if(!lastTRef.current) lastTRef.current = ts;
    const dt = Math.min(0.05, (ts - lastTRef.current) / 1000);   // cap anti-jank (onglet en arrière-plan)
    lastTRef.current = ts;

    const runs = runsRef.current;
    const hold = throttleRef.current;

    if(crashedRef.current){
      crashTRef.current += dt;
      vRef.current  *= 0.94;
      vyRef.current += G * dt;
      xRef.current  += vRef.current * dt;
      yRef.current  += vyRef.current * dt;
      angRef.current += avRef.current * dt;
      if(crashTRef.current > (crashKindRef.current === 'fall' ? 0.34 : 0.66)){ endGame(); return; }

    } else if(groundedRef.current){
      const g0 = groundAt(runs, xRef.current);
      const slope = g0 ? g0.slope : 0;
      vRef.current += (hold ? ACCEL : -BRAKE) * dt + slope * SLOPE_ACC * dt;
      /* Le plafond de vitesse monte avec la distance : plus on va loin,
         plus les vols sont longs et plus ils débordent des réceptions.
         C'est la montée en tension, et elle ne coûte pas une ligne
         d'obstacle en plus. */
      const maxV = MAX_V + V_RAMP * Math.min(1, xRef.current / 12000);
      vRef.current = Math.max(MIN_V, Math.min(maxV, vRef.current));

      const nx = xRef.current + vRef.current * dt;
      const g1 = groundAt(runs, nx);

      if(!g1){
        /* Le sol s'arrête net : on part avec la vitesse verticale que
           la rampe vient de donner. */
        groundedRef.current = false; airTimeRef.current = 0; spinRef.current = 0;
        launchYRef.current = yRef.current;
        xRef.current = nx;
        playSound('flappy_jump');
      } else {
        const ny = g1.y - R;
        const implied = (ny - yRef.current) / dt;
        if(implied > vyRef.current + G * dt + 6){
          /* Suivre le terrain demanderait de tomber plus vite qu'une
             chute libre → impossible, on décolle. */
          groundedRef.current = false; airTimeRef.current = 0; spinRef.current = 0;
          launchYRef.current = yRef.current;
          vyRef.current += G * dt;
          xRef.current = nx;
          yRef.current += vyRef.current * dt;
          playSound('flappy_jump');
        } else {
          xRef.current = nx;
          yRef.current = ny;
          vyRef.current = implied;
          angRef.current = Math.atan2(g1.slope, 1);
          avRef.current = 0;
        }
      }

    } else {
      airTimeRef.current += dt;
      vyRef.current += G * dt;
      xRef.current  += vRef.current * dt;
      yRef.current  += vyRef.current * dt;

      /* Doigt posé = ça tourne. Doigt levé = le cookie se remet dans
         l'axe de sa trajectoire — c'est ce redressement qui rend le
         jeu jouable : sans lui, toute rampe un peu raide tuerait, vu
         qu'on décolle déjà cabré et qu'on retomberait cabré. Du coup
         relâcher n'est pas « ne rien faire », c'est le geste qui pose. */
      if(hold){
        avRef.current = FLIP_AV;
        angRef.current  += avRef.current * dt;
        spinRef.current += avRef.current * dt;
      } else {
        avRef.current = 0;
        /* On se remet à MI-CHEMIN de la trajectoire, pas dessus : après
           un très gros vol on pique à près de 70°, et suivre ce piqué
           à la lettre rendrait l'atterrissage impossible quoi que
           fasse le joueur. Un pilote redresse avant de poser. */
        const cible = Math.atan2(vyRef.current, vRef.current) * 0.5;
        const pas   = normAngle(cible - angRef.current) * Math.min(1, 8 * dt);
        angRef.current  += pas;
        spinRef.current += pas;
      }

      if(yRef.current > launchYRef.current + FALL_MARGIN){
        crash('fall');
      } else if(airTimeRef.current > AIR_GRACE){
        const g = groundAt(runs, xRef.current);
        if(g && yRef.current >= g.y - R){
          const sa   = Math.atan2(g.slope, 1);
          const diff = normAngle(angRef.current - sa);
          if(Math.abs(diff) > LAND_TOL){
            crash('flip');
          } else {
            groundedRef.current = true;
            yRef.current = g.y - R;
            angRef.current = sa;
            vyRef.current = g.slope * vRef.current;
            avRef.current = 0;
            vRef.current *= 0.95;
            const n = Math.round(Math.abs(spinRef.current) / TAU);
            if(n > 0){
              flipsRef.current += n;
              setFlips(flipsRef.current);
              playSound('flip');
              popFlip(n);
            }
            spinRef.current = 0;
          }
        }
      }
    }

    const m = Math.min(DIST_CAP, Math.max(0, Math.floor(xRef.current / 10)));
    if(m !== distRef.current){ distRef.current = m; setDist(m); }

    camXRef.current = xRef.current - RIDER_X;
    const targetCamY = yRef.current - ARENA_H * 0.58;
    camYRef.current += (targetCamY - camYRef.current) * Math.min(1, 5 * dt);

    const grew   = ensure(runs, camXRef.current);
    const pruned = prune(runs, camXRef.current);
    if(grew || pruned) setPaths(buildPaths(runs));

    setFrame({ camX:camXRef.current, camY:camYRef.current, ry:yRef.current, ang:angRef.current });
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
        rafRef.current = requestAnimationFrame(tick);
      }
    }, 600);
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
     sur mobile : appelé trop tôt, il tuerait le bouton « Rouler » qui
     vit DANS l'aire. On ne l'appelle donc qu'une fois la partie lancée.
     Le décompte accepte déjà le maintien, pour partir gaz ouvert. */
  const down = (e) => {
    const ph = phaseRef.current;
    if(ph !== 'playing' && ph !== 'countdown') return;
    e.preventDefault();
    throttleRef.current = true; setHolding(true);
  };
  const up = () => { throttleRef.current = false; setHolding(false); };

  const earnedNow = rewardFor(dist, flips);
  const riderScreenY = frame.ry - frame.camY;

  /* Décor lointain : une rangée de collines répétée, translatée au
     tiers de la vitesse et remise à zéro modulo sa largeur. Ça donne
     la sensation de vitesse sans un seul élément supplémentaire par
     frame. */
  const PARA_W = 240;
  const paraShift = -((frame.camX * 0.3) % PARA_W);

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, paddingTop:6 }}>

      {/* Stats */}
      <div style={{ display:'flex', gap:8, width:'100%' }}>
        <div style={{ flex:1, padding:'10px 6px', borderRadius:14, background:C.card, border:`1.5px solid ${phase==='playing'?'#D4A017':C.border}`, textAlign:'center' }}>
          <div style={{ fontSize:11 }}>🛞</div>
          <div style={{ fontSize:21, fontWeight:900, color: phase==='playing'?'#D4A017':C.text, lineHeight:1.1 }}>
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

      {/* Aire — mesureur + metteur à l'échelle, comme Flappy : le repère
          interne reste 320 × 420 et le CSS agrandit. */}
      <div ref={areneBoxRef} style={{ position:'relative', width:'100%', aspectRatio:`${ARENA_W} / ${ARENA_H}` }}>
      <div style={{ position:'absolute', top:0, left:0, transform:`scale(${echelleArene})`, transformOrigin:'top left' }}>
      <div
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={up}
        style={{
          position:'relative', width:ARENA_W, height:ARENA_H,
          borderRadius:20, overflow:'hidden',
          background:'linear-gradient(180deg, #F6E3C4 0%, #EBCFA6 46%, #D9B98A 100%)',
          border:`2px solid ${C.border}`,
          touchAction: (phase === 'playing' || phase === 'countdown') ? 'none' : 'manipulation',
          userSelect:'none', cursor:'pointer',
          transform: shake ? 'translateX(-3px)' : 'none',
          transition:'transform .06s',
        }}
      >
        {/* Collines lointaines (parallaxe) */}
        <div style={{
          position:'absolute', left:0, top:0, width:PARA_W * 3, height:ARENA_H,
          transform:`translate3d(${paraShift}px, ${-frame.camY * 0.15}px, 0)`,
          willChange:'transform', pointerEvents:'none',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position:'absolute', left:i * PARA_W, bottom:96, width:PARA_W, height:150,
              background:'radial-gradient(60% 100% at 30% 100%, rgba(160,120,78,.30) 0%, rgba(160,120,78,0) 70%), radial-gradient(55% 100% at 78% 100%, rgba(140,100,64,.26) 0%, rgba(140,100,64,0) 70%)',
            }} />
          ))}
        </div>

        {/* Monde — un seul translate3d pour tout le décor. Le chemin SVG
            est en coordonnées monde et n'est refait qu'à la génération. */}
        <div style={{
          position:'absolute', left:0, top:0, width:0, height:0,
          transform:`translate3d(${-frame.camX}px, ${-frame.camY}px, 0)`,
          willChange:'transform', pointerEvents:'none',
        }}>
          <svg style={{ position:'absolute', left:0, top:0, width:1, height:1, overflow:'visible' }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#8B5A2B" />
                <stop offset="55%"  stopColor="#5A3520" />
                <stop offset="100%" stopColor="#3A2113" />
              </linearGradient>
            </defs>
            <path d={paths.fill} fill={`url(#${gradId})`} />
            <path d={paths.line} fill="none" stroke="#D9A868" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Le cookie et sa tasse — second et dernier translate3d */}
        <div style={{
          position:'absolute', left:0, top:0,
          width:COOKIE_SIZE, height:COOKIE_SIZE,
          marginLeft:-COOKIE_SIZE / 2, marginTop:-COOKIE_SIZE / 2,
          transform:`translate3d(${RIDER_X}px, ${riderScreenY}px, 0) rotate(${frame.ang}rad)`,
          willChange:'transform', pointerEvents:'none',
          filter: crashed ? 'grayscale(.7)' : 'none',
        }}>
          {/* La tasse : c'est ELLE qui dit si l'atterrissage est bon.
              Elle tourne avec le cookie, donc « à l'endroit » se lit
              d'un coup d'œil, sans jauge ni indicateur. */}
          <div style={{
            position:'absolute', left:'50%', top:-17, transform:'translateX(-50%)',
            fontSize:17, lineHeight:1, filter:'drop-shadow(0 2px 3px rgba(74,44,23,.45))',
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
            background:'rgba(58,33,19,.35)', fontSize:52, fontWeight:900, color:'#fff',
            textShadow:'0 4px 14px rgba(58,33,19,.6)', pointerEvents:'none',
          }}>{countdownVal}</div>
        )}

        {/* Consigne pendant la partie — disparaît dès qu'on a compris */}
        {phase === 'playing' && !crashed && dist < 40 && (
          <div style={{
            position:'absolute', left:0, right:0, bottom:14, textAlign:'center',
            fontSize:12, fontWeight:800, color:'#4A2C17', pointerEvents:'none',
            textShadow:'0 1px 0 rgba(255,255,255,.55)',
          }}>{t('game_rider.hold_hint')}</div>
        )}

        {/* Pastille gaz — le seul retour d'état permanent */}
        {phase === 'playing' && (
          <div style={{
            position:'absolute', right:10, top:10,
            padding:'5px 10px', borderRadius:20, fontSize:10.5, fontWeight:900,
            background: holding ? GOLD : 'rgba(74,44,23,.28)',
            color:'#fff', letterSpacing:.5, pointerEvents:'none',
            transition:'background .12s',
          }}>{holding ? t('game_rider.gas_on') : t('game_rider.gas_off')}</div>
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
                <div style={{ fontSize:20, fontWeight:900, color:'#fff' }}>
                  {crashReason === 'fall' ? t('game_rider.end_fall') : t('game_rider.end_flip')}
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

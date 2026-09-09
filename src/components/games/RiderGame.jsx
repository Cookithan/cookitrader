import { useEffect, useRef, useState } from "react";
import { GOLD, COOKIE_SKINS } from "../../data/themes.js";
import { SkinnedCookie } from "../cookies/SkinnedCookie.jsx";
import { PremiumCookie } from "../cookies/PremiumCookie.jsx";
import { playSound, startRiderEngine, setRiderEngine, stopRiderEngine } from "../../lib/audio.js";
import { haptic } from "../../lib/haptic.js";
import { SingleCup } from "./SingleCup.jsx";
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
const R = COOKIE_SIZE / 2;   // rayon de contact : c'est LUI que la physique utilise
/* L'attelage : une tasse posée sur deux roues en cookie. Rien n'est
   redessiné — la tasse est le SingleCup de Pile de Tasses, les roues sont
   les vrais cookies de la boutique. Les trois nombres ci-dessous sont
   liés : bas de roue = ROUE_Y + ROUE/2, et ça doit tomber pile sur R, le
   rayon de contact que la physique utilise. Sinon l'attelage flotte ou
   s'enfonce dans la piste. */
const ROUE        = 24;      // diamètre d'une roue (max 2×R, sinon elle dépasse le sol)
const ROUE_DX     = 13;      // écartement : 2 px de jour entre les roues, on en voit bien deux
const ROUE_Y      = R - ROUE / 2;   // centre de roue sous le châssis → bas pile sur R
const TASSE_W     = 50;      /* largeur du SingleCup (hauteur auto, ratio
                                130×42). Le rapport qui compte est
                                TASSE_W / ROUE : 2,1 écrasait l'attelage,
                                1,5 donnait des roues de tracteur. */
/* Le corps de la tasse n'occupe que les 100 premiers 130es du SVG, l'anse
   le reste — et le miroir (anse à gauche) met donc le corps à DROITE du
   cadre. Pour que la tasse s'agrandisse vers la droite et pas des deux
   côtés, on ancre son bord gauche et on laisse la largeur filer. Sans cet
   ancrage, chaque retouche de TASSE_W la ferait glisser sur les roues. */
const TASSE_BORD_G = -15.5;  // px depuis l'axe de l'attelage
const TASSE_ML     = TASSE_BORD_G - (30 / 130) * TASSE_W;
/* Hauteur d'assise du fond de la tasse, comptée depuis l'essieu. Elle est
   ancrée elle aussi : c'est le FOND qui est posé, et la tasse grandit
   vers le haut. Sans ça, l'élargir la ferait s'enfoncer dans les roues. */
const TASSE_CX     = TASSE_BORD_G + (TASSE_W * 100 / 130) / 2;  // centre du CORPS, d'où sort la vapeur
const TASSE_BAS    = ROUE_Y - 7;
const TASSE_MT     = TASSE_BAS - TASSE_W * (42 / 130);

/* Le monde est dessiné à 0,62 : on voit 516 px de piste de large au lieu
   de 320, et 380 px DEVANT le biscuit au lieu de 236. C'est la première
   chose qui frappe sur les captures de Rider — on voit arriver ce qu'on
   va devoir faire, et le véhicule est minuscule. En gros plan, aucun
   réglage de physique ne peut rendre le jeu lisible. */
const ZOOM_BASE = 0.62;      // échelle au sol
const ZOOM_MIN  = 0.30;      /* échelle en grande chute. La caméra recule
                                pour cadrer le POINT D'ARRIVÉE : sans ça on
                                tombe à l'aveugle et le salto devient un pari
                                au lieu d'une décision. */
const STEP     = 16;         // espacement des points de piste
const AHEAD    = 980;        // marge de piste générée devant la caméra
const BEHIND   = 380;        // marge conservée derrière

/* Volontairement plus légère qu'une vraie gravité : à 1000 le vol était
   écrasé, on retombait avant d'avoir eu le temps de décider quoi que ce
   soit. Elle sert AUSSI à tracer la piste (longueur des réceptions,
   dénivelé des trous, pente maximale d'une vague) — tout ce qui en
   dépend est donc recalculé à partir d'elle, jamais figé en dur. */
const G         = 720;
const ACCEL     = 480;       /* gaz maintenu, au sol. Doit rester au-dessus
                                de SLOPE_ACC × pente maximale (420 × 0,95 =
                                399), sinon on se retrouve à l'arrêt au pied
                                d'un tremplin sans pouvoir le remonter. */
const BRAKE     = 300;       // doigt levé, au sol
const SLOPE_ACC = 420;       // ce que la pente donne (descente) ou reprend (montée)
const MIN_V     = 0;         /* On peut s'arrêter net. Le chrono, lui, ne
                                s'arrête pas : ne rien faire coûte. */
const MAX_V     = 360;       // plafond de départ
const V_RAMP    = 150;       // ce que le plafond gagne à difficulté maximale
const START_V   = 0;         /* L'attelage ne part PAS tout seul. Rien ne
                                bouge tant que le doigt n'est pas posé —
                                sinon la partie commence sans le joueur. */

const FLIP_AV  = -7.0;   /* rad/s en l'air, doigt posé → un tour en 0,90 s.
                            Ce chiffre n'est pas libre : il doit tenir DANS
                            le vol le plus court qu'un tremplin produise,
                            sinon boucler un tour est impossible et le seul
                            geste qui rapporte n'existe pas. */
const AV_LERP  = 4.5;    /* La roue met ~0,22 s à prendre son régime, elle
                            ne claque pas. Ce seul chiffre protège tous les
                            vols courts : sur un saut de 0,35 s, tenir le
                            doigt ne fait plus tourner que de 1,1 rad (sous
                            la tolérance) au lieu de 2,45 — alors qu'un vol
                            long garde tout son tour. Un délai en dur ne
                            savait pas faire les deux. */
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

/* ── Les mondes ────────────────────────────────────
   La piste traverse quatre décors, et le décor n'est pas qu'une couleur :
   chacun rebat les probabilités de figures, l'amplitude du relief et la
   fréquence des flaques. C'est ce qui fait qu'on SENT qu'on avance, plus
   que la difficulté qui monte en continu — celle-là est trop lente pour
   se remarquer.

   Palette café tenue de bout en bout : moka, cuivre, crème, espresso.
   « La Crème » inverse tout (piste sombre sur fond clair) — c'est le
   monde qui surprend, et il tombe au milieu de la partie exprès.

   `deb` est en MÈTRES. Le tableau est lu du dernier au premier. */
const MONDES = [
  { id:'comptoir', deb:0,
    ciel:'linear-gradient(180deg, #2A1A11 0%, #1B100A 55%, #120A06 100%)',
    piste:'#FFE3AC', halo:'rgba(212,160,23,.10)', halo2:'rgba(233,180,88,.26)',
    collines:'rgba(92,58,32,.42)', texte:'rgba(255,231,186,.94)',
    tremplin:0.31, boucle:0.10, falaise:0.10, ampli:1.00, flaque:0.00 },
  { id:'torrefaction', deb:380,
    ciel:'linear-gradient(180deg, #3A1C0A 0%, #24100430 55%, #140800 100%)',
    piste:'#FFB870', halo:'rgba(214,110,26,.12)', halo2:'rgba(236,150,70,.28)',
    collines:'rgba(120,58,18,.46)', texte:'rgba(255,206,158,.94)',
    tremplin:0.38, boucle:0.10, falaise:0.12, ampli:1.25, flaque:0.30 },
  { id:'creme', deb:820,
    ciel:'linear-gradient(180deg, #F6E7CF 0%, #E7CFAA 55%, #D2B084 100%)',
    piste:'#4A2C17', halo:'rgba(74,44,23,.14)', halo2:'rgba(110,70,38,.30)',
    collines:'rgba(150,112,72,.38)', texte:'rgba(58,33,19,.92)',
    tremplin:0.30, boucle:0.16, falaise:0.14, ampli:1.15, flaque:0.35 },
  { id:'expresso', deb:1280,
    ciel:'linear-gradient(180deg, #12100E 0%, #0A0806 60%, #050403 100%)',
    piste:'#FFD24D', halo:'rgba(255,210,77,.13)', halo2:'rgba(255,210,77,.30)',
    collines:'rgba(70,54,34,.40)', texte:'rgba(255,226,140,.95)',
    tremplin:0.34, boucle:0.20, falaise:0.18, ampli:1.45, flaque:0.45 },
];

function mondeA(metres){
  for(let i = MONDES.length - 1; i >= 0; i--) if(metres >= MONDES[i].deb) return i;
  return 0;
}

/* ── Barème ────────────────────────────────────────
   La distance n'est PAS la mesure du talent : avec un chrono et une
   vitesse plafonnée, tout le monde parcourt à peu près la même chose
   s'il ne tombe pas. Elle mesure donc la SURVIE, et ce sont les figures
   qui font l'écart. D'où des paliers de distance plats en haut et un
   bonus de figure élevé.
   Mesuré sur 300 parties de 75 s par profil :
     · qui mitraille le doigt        →  3 s → 0 🍪
     · qui roule sans jamais tourner → 75 s → 110 🍪
     · qui tourne (13 figures méd.)  → 75 s → 266 🍪
   Les miettes (GEM_VALUE) s'ajoutent par-dessus, mais elles sont posées
   sur la parabole d'un saut pris à PLEINE vitesse : les avoir toutes
   veut dire qu'on a piloté juste, pas qu'on est passé par là.
   L'ancre reste Café Express : ~300 🍪 pour sa meilleure partie de 60 s.
   ⚠ Les bots ont un doigt parfait au 1/60e de seconde. À revoir après
   de vraies parties. */
/* Paliers redivisés avec PX_PAR_METRE : ce sont les mêmes distances de
   piste qu'avant, exprimées dans la nouvelle unité. L'équilibre validé
   sur des centaines de parties simulées ne bouge donc pas d'un cookie. */
const REWARD_PALIERS = [
  { m:70,   r:5   },
  { m:230,  r:20  },
  { m:450,  r:40  },
  { m:730,  r:60  },
  { m:1090, r:85  },
  { m:1500, r:110 },
];
const FLIP_BONUS = 12;
const GEM_VALUE  = 2;        // par miette ramassée en vol
const REWARD_CAP = 320;
const PX_PAR_METRE = 22;     /* Un mètre vaut 22 px de piste, pas 10. Le
                                compteur montait trop vite pour qu'on le
                                lise — un score qui défile ne veut plus
                                rien dire. */
const DIST_CAP   = 2500;     // garde-fou : aucun bug ne peut imprimer à l'infini

function rewardFor(m, flips, gems = 0){
  let base = 0;
  for(const p of REWARD_PALIERS) if(m >= p.m) base = p.r;
  if(base === 0 && flips === 0 && gems === 0) return 0;
  return Math.min(REWARD_CAP, base + flips * FLIP_BONUS + gems * GEM_VALUE);
}

/* ── La piste ──────────────────────────────────────
   Un run = une plateforme = { x0, ys[] }, un point tous les STEP px. Le
   trou entre deux plateformes n'est stocké nulle part : c'est simplement
   l'absence de piste entre la fin de l'une et le début de la suivante. */
function makeRun(x0, y0){ return { x0, ys:[y0], last:'vague', loops:[], gems:[], flaques:[] }; }

/* Les miettes ne sont pas semées au hasard : on les pose SUR la parabole
   que le saut va décrire à pleine vitesse. C'est ce qui en fait une
   récompense de pilotage et pas un ramassage — les avoir toutes veut dire
   qu'on a pris le tremplin comme il fallait. */
function semerMiettes(run, x0, y0, vy0, vx, tVol, n){
  for(let i = 1; i <= n; i++){
    const t = tVol * (i / (n + 1));
    run.gems.push({ x: x0 + vx * t, y: y0 + vy0 * t + 0.5 * G * t * t, pris:false });
  }
}
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
function addFeature(runs, diff, monde){
  const run = runs[runs.length - 1];
  /* Jamais de trou ni de boucle juste après un tremplin ou une falaise :
     on vole encore quand ils arrivent, on les survole sans les voir, et
     on s'écrase de l'autre côté sans avoir rien fait de mal. Une vague,
     le temps de reposer les roues. */
  const enVol = run.last === 'tremplin' || run.last === 'falaise';
  const r = enVol ? 0 : Math.random();
  const vTop = MAX_V + V_RAMP * diff;
  /* Les seuils sont cumulés depuis les poids du monde : le reste (ce qui
     dépasse) revient à la vague, qui est le tracé de fond. */
  const sTremplin = monde.tremplin;
  const sBoucle   = sTremplin + monde.boucle;
  const sFalaise  = sBoucle + monde.falaise;

  /* ── la vague : le gros du tracé ── */
  if(r >= sFalaise + 0.10){
    run.last = 'vague';
    const len = 260 + Math.random() * 180;
    /* Une vague ne doit JAMAIS faire décoller : suivre une crête demande
       une accélération verticale de dy·π²·v²/2len², et si elle dépasse
       la gravité le biscuit quitte le sol tout seul. On borne donc dy
       par ce que la gravité peut tenir à la vitesse de pointe du coin —
       une constante en dur serait fausse dès qu'on touche à G. */
    const dyMax = Math.min(0.18 * len, 2 * G * len * len / (Math.PI * Math.PI * vTop * vTop));
    let dy = (Math.random() * 2 - 1) * (40 + 34 * diff) * monde.ampli;
    dy = Math.max(-dyMax, Math.min(dyMax, dy));
    span(run, len, u => dy * (0.5 - 0.5 * Math.cos(Math.PI * u)));
    return;
  }

  /* ── le tremplin : le vol moyen, celui où l'on décide ── */
  if(r < sTremplin){
    run.last = 'tremplin';
    /* Pente de sortie 0,57 à 0,95 : le vol dure alors de 0,93 s à 1,31 s,
       soit toujours plus que les 0,90 s d'un tour complet. C'est la
       condition pour que la figure soit seulement DIFFICILE et pas
       impossible — avec l'ancienne borne (0,72) le vol plafonnait à
       1,02 s et aucun tour ne pouvait se boucler. */
    const rl   = 150 + Math.random() * 40;
    const rise = Math.min(0.63 * rl, 72 + 26 * diff + Math.random() * 20);
    span(run, rl, u => -rise * Math.pow(u, 1.5));
    /* Longueur de la réception CALCULÉE, pas choisie : on résout la
       rencontre entre la parabole du saut et la pente de réception, à la
       vitesse de pointe, et on ajoute 25 %. Une longueur en dur se fait
       systématiquement survoler dès qu'on touche à la gravité ou à la
       vitesse — c'est comme ça qu'on meurt deux plateformes plus loin
       sans rien avoir fait de mal. */
    const penteSortie = 1.5 * rise / rl;
    const pr     = 0.36;
    const tVol   = vTop * (pr + penteSortie) / (0.5 * G);
    const tipX   = runEndX(run);
    const tipY   = runEndY(run);
    const recLen = Math.max(420, vTop * tVol * 1.25);
    span(run, recLen, u => pr * recLen * u);
    semerMiettes(run, tipX, tipY - R, -penteSortie * vTop, vTop, tVol, 3);
    /* La flaque est posée SOUS la trajectoire du saut, avant le point de
       chute : bien pris, le tremplin la survole ; pris trop lentement, on
       atterrit dedans. Elle ne tue pas, elle coupe la vitesse — et c'est
       la vitesse qui fait passer le trou suivant. La sanction arrive donc
       deux secondes plus tard, là où on l'a comprise. */
    if(Math.random() < monde.flaque){
      run.flaques.push({ x: tipX + vTop * tVol * (0.5 + Math.random() * 0.25), prise:false });
    }
    return;
  }

  /* ── la boucle : le morceau de bravoure ──
     Elle ne tue jamais et ne se rate pas : elle se MÉRITE. En dessous de
     la vitesse critique √(G·r) le biscuit ne tiendrait pas au plafond,
     alors il passe dessous et on n'a rien. Tenir son gaz sur toute la
     ligne droite qui précède, c'est ça le prix — et ça rend le maintien
     spectaculaire au lieu de seulement utile. */
  if(r < sBoucle){
    run.last = 'boucle';
    span(run, 150 + Math.random() * 60, () => 0);
    /* `r` est le rayon du CENTRE de la roue, pas du ruban : c'est lui
       qui fixe la vitesse critique √(G·r), donc autant le stocker tel
       quel et dessiner le ruban autour. */
    const rl = 62 + 16 * diff + Math.random() * 14;
    run.loops.push({ x: runEndX(run), y: runEndY(run), r: rl });
    span(run, 240 + Math.random() * 120, () => 0);
    return;
  }

  /* ── la falaise : la grande chute, deux figures si on ose ── */
  if(r < sFalaise){
    run.last = 'falaise';
    /* Une falaise doit offrir DEUX tours à qui ose : la chute est donc
       calibrée pour 1,5 s de vol au minimum en fin de partie. */
    /* Les plus grandes falaises passent les 1,85 s de vol : de quoi
       boucler DEUX tours pour qui ose. C'est le morceau de bravoure. */
    const chute  = (500 + 450 * diff + Math.random() * 400) * monde.ampli;
    const tChute = Math.sqrt(2 * chute / G);
    /* Le trou vaut la MOITIÉ de ce que le vol couvre : on ne peut pas
       tomber court, on se pose forcément bien après le bord. Une falaise
       doit impressionner, pas piéger. */
    const trou = 0.5 * vTop * 0.86 * tChute;
    const next = makeRun(runEndX(run) + trou, runEndY(run) + chute);
    next.last  = 'falaise';
    const bordX  = runEndX(run);
    const bordY  = runEndY(run);
    const recLen = Math.max(520, vTop * tChute * 1.3);
    span(next, recLen, u => 0.22 * recLen * u);
    semerMiettes(next, bordX, bordY - R, 0, vTop * 0.86, tChute, 4);
    runs.push(next);
    return;
  }

  /* ── le trou : court exprès (~0,22 s de vol). Il ne fait pas tourner
     le biscuit, il ne sanctionne que le doigt levé trop tôt. ── */
  run.last = 'trou';
  const vRequis = vTop * 0.86;
  /* Durée de vol d'un petit trou : bornée à 0,19 s, et ce n'est pas un
     chiffre rond choisi au hasard. Doigt posé, le biscuit tourne de
     FLIP_AV × tVol ; au-delà de 0,19 s on dépasse LAND_TOL et franchir
     un simple trou gaz au plancher devient mortel. C'était le tout
     premier reproche du jeu, et il revenait par cette porte-là. */
  const tVol    = Math.min(0.19, LAND_TOL / Math.abs(FLIP_AV) - 0.02) * (0.72 + Math.random() * 0.28);
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
    const bout = runEndX(runs[runs.length - 1]);
    addFeature(runs, Math.min(1, Math.max(0, bout / 11000)), MONDES[mondeA(bout / PX_PAR_METRE)]);
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

/* La ligne de piste, en coordonnées monde. Reconstruite uniquement à la
   génération d'une figure — jamais à l'image. Un « M » par morceau : les
   trous deviennent donc naturellement des sous-chemins séparés. */
/* Hauteur du ruban à une abscisse, dans un run donné — pour poser les
   flaques À PLAT sur la piste plutôt qu'à leur altitude de création. */
function hauteurA(run, x){
  const f = (x - run.x0) / STEP;
  const i = Math.max(0, Math.min(run.ys.length - 2, Math.floor(f)));
  const t = f - i;
  return run.ys[i] + (run.ys[i + 1] - run.ys[i]) * t;
}

function buildPaths(runs){
  let crust = '';
  const loops = [];
  const gems  = [];
  const flaques = [];
  for(const run of runs){
    for(const b of run.loops) loops.push(b);
    for(const g of run.gems) if(!g.pris) gems.push(g);
    for(const f of run.flaques) if(!f.prise) flaques.push({ x:f.x, y:hauteurA(run, f.x) });
    const n = run.ys.length;
    let d = `M ${run.x0.toFixed(1)} ${run.ys[0].toFixed(1)}`;
    for(let i = 1; i < n; i++) d += ` L ${(run.x0 + i * STEP).toFixed(1)} ${run.ys[i].toFixed(1)}`;
    crust += `${d} `;
  }
  return { crust: crust.trim(), loops, gems, flaques };
}

/* Où va-t-on retomber ? Calculé UNE SEULE FOIS au décollage : en vol, ni
   la vitesse horizontale ni la gravité ne changent, donc la parabole est
   déjà écrite. Rejouer la prédiction à chaque image coûterait cent
   intégrations par seconde pour le même résultat. */
function predireAtterrissage(runs, x, y, vy, v){
  const h = 1 / 60;
  let px = x, py = y, pvy = vy, air = 0;
  for(let i = 0; i < 600; i++){
    pvy += G * h; px += v * h; py += pvy * h; air += h;
    const g = groundAt(runs, px);
    if(air > AIR_GRACE && g && py >= g.y - R) return { x:px, y:py };
  }
  return null;
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
  const hasCustomSkin = !!(activeSkin && COOKIE_SKINS[activeSkin] && activeSkin !== '');
  const skin = COOKIE_SKINS[activeSkin] || COOKIE_SKINS[''];

  const [phase, setPhase] = useState('idle');       // idle | countdown | playing | done
  const [countdownVal, setCountdownVal] = useState(null);
  const [echelleArene, setEchelleArene] = useState(1);
  const [paths, setPaths] = useState({ crust:'', loops:[], gems:[], flaques:[] });
  const [frame, setFrame] = useState({ camX:0, camY:0, rx:RIDER_X, ry:0, ang:0, v:START_V, gr:true, sq:0, z:ZOOM_BASE });
  const [dist,  setDist]  = useState(0);
  const [reste, setReste] = useState(RUN_TIME);
  const [flips, setFlips] = useState(0);
  const [gems,  setGems]  = useState(0);
  const [tag,   setTag]   = useState(null);   // petit mot après une belle figure
  const [annonce, setAnnonce] = useState(null);  // carton d'entrée dans un monde
  const [crashed, setCrashed] = useState(false);
  const [crashReason, setCrashReason] = useState(null);   // 'flip' | 'fall' | 'wall' | 'time'
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
  const spinRef   = useRef(0);
  const avRef     = useRef(0);
  const groundedRef = useRef(true);
  const airTimeRef  = useRef(0);
  const zoomRef   = useRef(ZOOM_BASE);
  const atterRef  = useRef(null);
  const boucleRef = useRef(null);
  const maxXRef   = useRef(0);
  const retourCamRef = useRef(0);
  const cibleCamXMonotone = useRef(-Infinity);
  const camXRef   = useRef(0);
  const camYRef   = useRef(0);
  const basRef    = useRef(0);
  const distRef   = useRef(0);
  const tempsRef  = useRef(0);
  const resteRef  = useRef(RUN_TIME);
  const flipsRef  = useRef(0);
  const gemsRef   = useRef(0);
  const mondeRef  = useRef(0);
  const annonceNRef = useRef(0);
  const crashedRef = useRef(false);
  const crashTRef  = useRef(0);
  const crashKindRef = useRef(null);
  const throttleRef = useRef(false);
  const phaseRef  = useRef('idle');
  const rafRef    = useRef(null);
  const lastTRef  = useRef(0);
  const squashRef = useRef(0);

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
    stopRiderEngine();
  }, []);

  /* Le petit mot d'après-figure. Volontairement en minuscules et bref :
     dans Rider il commente sans jamais féliciter, c'est ce ton-là qui
     donne envie de recommencer. */
  const TAGS = { 1:3, 2:3, 3:3, loop:2 };
  const montrerTexte = (cle) => {
    const id = Date.now() + Math.random();
    setTag({ id, cle });
    setTimeout(() => setTag(cur => (cur && cur.id === id ? null : cur)), 700);
  };

  const montrerTag = (famille) => {
    const n   = TAGS[famille] || 1;
    const cle = `game_rider.tag_${famille === 'loop' ? 'loop' : famille === 1 ? 'solo' : famille === 2 ? 'double' : 'triple'}_${Math.floor(Math.random() * n)}`;
    montrerTexte(cle);
  };

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
    distRef.current = 0; flipsRef.current = 0; gemsRef.current = 0; tempsRef.current = 0; resteRef.current = RUN_TIME;
    crashedRef.current = false; crashTRef.current = 0; crashKindRef.current = null;
    boucleRef.current = null;
    zoomRef.current = ZOOM_BASE;
    atterRef.current = null;
    retourCamRef.current = 0;
    cibleCamXMonotone.current = -Infinity;
    maxXRef.current = xRef.current;
    camXRef.current = xRef.current - RIDER_X / ZOOM_BASE;
    camYRef.current = yRef.current - (ARENA_H * 0.42) / ZOOM_BASE;
    zoomRef.current = ZOOM_BASE;
    lastTRef.current = 0;
    throttleRef.current = false;

    ensure(runs, camXRef.current);
    basRef.current = solLePlusBas(runs);
    setPaths(buildPaths(runs));
    setDist(0); setFlips(0); setGems(0); setTag(null); setReste(RUN_TIME); setCrashed(false); setCrashReason(null);
    setPops([]); setHolding(false); squashRef.current = 0;
    mondeRef.current = 0; setAnnonce(null);
    setFrame({ camX:camXRef.current, camY:camYRef.current, rx:RIDER_X, ry:yRef.current, ang:0, v:START_V, gr:true, sq:0, z:ZOOM_BASE });
  };

  const endGame = () => {
    if(phaseRef.current === 'done') return;
    setPhase('done'); phaseRef.current = 'done';
    if(rafRef.current){ cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    stopRiderEngine();
    throttleRef.current = false; setHolding(false);
    if(crashKindRef.current === 'time') setCrashReason('time');
    const reward = rewardFor(distRef.current, flipsRef.current, gemsRef.current);
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
    const maxV = MAX_V + V_RAMP * Math.min(1, xRef.current / 11000);

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

    /* ── Dans la boucle ──
       Position et angle sont pilotés par l'arc, pas par la gravité : une
       fois engagé on va au bout. Le gaz reste actif (il fait la vitesse
       de sortie) mais on ne peut pas descendre sous la vitesse critique
       — se décrocher au plafond serait une mort qu'on ne comprendrait
       pas, et la boucle est là pour amuser, pas pour punir. */
    if(boucleRef.current && !crashedRef.current){
      const b = boucleRef.current;
      const vCrit = Math.sqrt(G * b.r);
      vRef.current += (hold ? ACCEL : -BRAKE) * dt;
      vRef.current = Math.max(MIN_V, Math.min(maxV, vRef.current));

      /* On peut DÉCROCHER. Avant, la vitesse était bornée par le bas et
         le tour se jouait tout seul quoi qu'on fasse — le joueur
         regardait une animation au lieu de piloter. Maintenant, lâcher
         le gaz dans la moitié haute de l'anneau, c'est tomber. C'est ce
         qui fait qu'on TIENT la boucle au lieu de la subir. */
      const hautDeLAnneau = Math.cos(b.theta) < 0.15;
      if(hautDeLAnneau && vRef.current < vCrit){
        boucleRef.current = null;
        retourCamRef.current = 0.5;
        groundedRef.current = false;
        airTimeRef.current = 0; spinRef.current = 0; avRef.current = 0;
        vyRef.current = -Math.sin(b.theta) * vRef.current;
        playSound('error');
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      b.theta += (vRef.current / b.r) * dt;

      if(b.theta >= TAU){
        boucleRef.current = null;
        retourCamRef.current = 0.5;
        xRef.current = b.x;
        const g = groundAt(runs, b.x);
        yRef.current   = (g ? g.y : b.y) - R;
        angRef.current = g ? Math.atan2(g.slope, 1) : 0;
        vyRef.current  = 0; avRef.current = 0; spinRef.current = 0;
        groundedRef.current = true;
        flipsRef.current += 1; setFlips(flipsRef.current);
        playSound('flip'); haptic('success'); popFlip(1); montrerTag('loop');
      } else {
        xRef.current   = b.x + b.r * Math.sin(b.theta);
        yRef.current   = (b.y - R - b.r) + b.r * Math.cos(b.theta);
        angRef.current = -b.theta;
      }

      /* La caméra lâche le biscuit et cadre l'ANNEAU, en x comme en y :
         c'est le tour qu'on doit voir, pas un gros plan sur la roue. */
      const cx = b.x - (ARENA_W * 0.5) / zoomRef.current;
      const cy = (b.y - R - b.r) - (ARENA_H * 0.45) / zoomRef.current;
      /* Elle s'arrête sur l'anneau, elle ne RECULE pas : dans une boucle
         x redescend, et une caméra qui suivrait x donnerait l'impression
         qu'on rembobine. Le max l'empêche partout. */
      camXRef.current = Math.max(camXRef.current, camXRef.current + (cx - camXRef.current) * Math.min(1, 4 * dt));
      camYRef.current += (cy - camYRef.current) * Math.min(1, 5 * dt);
      if(xRef.current > maxXRef.current) maxXRef.current = xRef.current;
      setFrame({
        camX:camXRef.current, camY:camYRef.current,
        rx:xRef.current - camXRef.current, ry:yRef.current, ang:angRef.current,
        v:vRef.current, gr:false, sq:0, z:zoomRef.current,
      });
      setRiderEngine((vRef.current - MIN_V) / (MAX_V + V_RAMP - MIN_V), hold);
      rafRef.current = requestAnimationFrame(tick);
      return;
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
      vRef.current = Math.max(MIN_V, Math.min(maxV, vRef.current));

      const nx = xRef.current + vRef.current * dt;

      /* Entrée en boucle : elle se mérite, elle ne se rate pas. Sous la
         vitesse critique le biscuit passerait sous l'anneau — alors il
         passe dessous, sans dommage et sans figure. */
      for(const run of runs){
        for(const b of run.loops){
          if(b.x > xRef.current && b.x <= nx && vRef.current >= Math.sqrt(G * b.r) * 1.02){
            boucleRef.current = { x:b.x, y:b.y, r:b.r, theta:0 };
            xRef.current = b.x;
            playSound('swipe');
            break;
          }
        }
        if(boucleRef.current) break;
      }
      if(boucleRef.current){
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const g1 = groundAt(runs, nx);

      if(!g1){
        /* La plateforme s'arrête : on part avec la vitesse verticale que
           le tremplin vient de donner. */
        groundedRef.current = false; airTimeRef.current = 0; spinRef.current = 0; avRef.current = 0;
        xRef.current = nx;
        atterRef.current = predireAtterrissage(runs, xRef.current, yRef.current, vyRef.current, vRef.current);
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
          atterRef.current = predireAtterrissage(runs, xRef.current, yRef.current, vyRef.current, vRef.current);
        } else {
          xRef.current = nx;
          yRef.current = ny;
          vyRef.current = implied;
          /* L'angle REJOINT la pente, il ne s'y colle pas d'un coup.
             C'était ça, l'atterrissage sec : on touchait le sol à 40°
             de travers et l'attelage se téléportait à l'horizontale en
             une image. Ici il s'aligne en ~60 ms — assez vite pour
             suivre le relief, assez lent pour qu'on voie la suspension
             travailler. */
          angRef.current += normAngle(Math.atan2(g1.slope, 1) - angRef.current) * Math.min(1, 17 * dt);
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
              atterRef.current = null;
              yRef.current = g.y - R;
              avRef.current = 0;
              vyRef.current = g.slope * vRef.current;
              vRef.current *= 0.96;
              /* Amorti continu plutôt qu'un setTimeout : la valeur
                 retombe dans la boucle de jeu, donc l'écrasement se
                 détend au lieu de se couper net au bout de 130 ms. */
              squashRef.current = 1;
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
                montrerTag(Math.min(3, n));
              }
              spinRef.current = 0;
            }
          }
        }
      }
    }

    /* Les flaques : au sol seulement, et une seule fois. Elles ne tuent
       pas, elles coupent la vitesse de plus de moitié — et comme c'est la
       vitesse qui fait passer le trou suivant, la vraie sanction tombe
       deux secondes plus tard. */
    if(groundedRef.current && !crashedRef.current){
      const recule = vRef.current * dt + 6;
      for(const run of runs){
        for(const f of run.flaques){
          if(f.prise || f.x > xRef.current || f.x < xRef.current - recule) continue;
          f.prise = true;
          vRef.current *= 0.45;
          playSound('error'); haptic('warning');
          setShake(true); setTimeout(() => setShake(false), 200);
          montrerTexte('game_rider.tag_flaque');
          setPaths(buildPaths(runs));
        }
      }
    }

    /* Ramassage. On balaie toutes les miettes en jeu : elles sont une
       soixantaine au plus (la piste est élaguée derrière), donc le test
       de distance au carré coûte moins cher qu'un index à maintenir. */
    if(!crashedRef.current){
      let pris = 0;
      for(const run of runs){
        for(const g of run.gems){
          if(g.pris) continue;
          const dx = g.x - xRef.current;
          const dy = g.y - yRef.current;
          if(dx * dx + dy * dy < 26 * 26){ g.pris = true; pris++; }
        }
      }
      if(pris){
        gemsRef.current += pris; setGems(gemsRef.current);
        playSound('coin', { volume:0.35 });
        setPaths(buildPaths(runs));
      }
    }

    /* La distance se lit sur le point le plus AVANCÉ : dans une boucle
       x recule puis revient, et un compteur qui redescend est une
       promesse cassée. */
    squashRef.current = Math.max(0, squashRef.current - dt * 7);

    if(xRef.current > maxXRef.current) maxXRef.current = xRef.current;
    const m = Math.min(DIST_CAP, Math.max(0, Math.floor(maxXRef.current / PX_PAR_METRE)));
    if(m !== distRef.current){
      distRef.current = m;
      setDist(m);
      const idx = mondeA(m);
      if(idx !== mondeRef.current){
        mondeRef.current = idx;
        /* Compteur plutôt que Date.now() : `tick` tourne dans la boucle
           de rendu et une horloge y est une source impure. */
        const id = ++annonceNRef.current;
        setAnnonce({ id, idx });
        playSound('levelup', { volume:0.35 });
        setTimeout(() => setAnnonce(cur => (cur && cur.id === id ? null : cur)), 1700);
      }
    }

    boucleRef.current = null;
    zoomRef.current = ZOOM_BASE;
    atterRef.current = null;
    retourCamRef.current = 0;
    cibleCamXMonotone.current = -Infinity;
    maxXRef.current = xRef.current;
    /* La caméra colle au biscuit — SAUF pendant la demi-seconde qui suit
       une boucle : elle vient de cadrer l'anneau et un saut sec se
       verrait. Un lissage permanent, lui, coûterait de la visibilité
       devant : à 450 px/s, un suivi lissé traîne de 50 px, autant de
       piste qu'on ne voit plus arriver. */
    /* Échelle : au sol on reste au plus près ; en l'air on recule juste
       assez pour tenir le point d'arrivée à l'écran. C'est la réponse au
       « on ne sait pas où on atterrit » — une grande chute se voit en
       entier, donc le salto redevient une décision. */
    const atter = atterRef.current;
    const cibleZoom = (!groundedRef.current && atter)
      ? Math.max(ZOOM_MIN, Math.min(ZOOM_BASE, (ARENA_H * 0.72) / (Math.abs(atter.y - yRef.current) + 190)))
      : ZOOM_BASE;
    zoomRef.current += (cibleZoom - zoomRef.current) * Math.min(1, 3.4 * dt);
    const z = zoomRef.current;

    const cibleCamX = xRef.current - RIDER_X / z;
    if(retourCamRef.current > 0){
      retourCamRef.current -= dt;
      camXRef.current += (cibleCamX - camXRef.current) * Math.min(1, 7 * dt);
    } else {
      camXRef.current = cibleCamX;
    }
    /* Verrou : jamais en arrière. C'est la seule règle qui tienne, parce
       que trois endroits différents veulent bouger la caméra. */
    camXRef.current = Math.max(camXRef.current, cibleCamXMonotone.current);
    cibleCamXMonotone.current = camXRef.current;
    /* On cadre entre le biscuit et son point de chute, pas sur le
       biscuit seul : sinon reculer ne servirait à rien, le sol resterait
       hors champ. */
    const ancreY = (!groundedRef.current && atter) ? (yRef.current + atter.y) / 2 : yRef.current;
    const targetCamY = ancreY - (ARENA_H * (groundedRef.current ? 0.42 : 0.5)) / z;
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
      rx:xRef.current - camXRef.current, ry:yRef.current, ang:angRef.current,
      v:vRef.current, gr:groundedRef.current, sq:squashRef.current, z:zoomRef.current,
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

  const earnedNow    = rewardFor(dist, flips, gems);
  /* Le SCORE est l'affichage arcade : il monte à chaque mètre et bondit
     à chaque figure, pour qu'on voie la partie avancer. Il ne remplace
     pas le calcul des 🍪 (celui-là est calé sur des centaines de parties
     simulées) — c'est le même effort raconté deux fois, une fois pour
     l'œil, une fois pour l'économie. */
  const score        = dist + flips * 200 + gems * 40;
  const monde        = MONDES[mondeA(dist)];
  const z            = frame.z;
  const riderScreenX = frame.rx * z;
  const riderScreenY = (frame.ry - frame.camY) * z;
  const vitesse01    = Math.max(0, Math.min(1, (frame.v - STREAK_FROM) / 220));
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
          <div style={{ fontSize:21, fontWeight:900, color:C.text, lineHeight:1.1, display:'flex', alignItems:'baseline', justifyContent:'center', gap:5 }}>
            {flips}
            {/* Les miettes vivent dans la même case que les figures : les
                deux se gagnent en l'air, et une quatrième colonne aurait
                écrasé les trois autres sur un écran de 360 px. */}
            {gems > 0 && <span style={{ fontSize:12, fontWeight:800, color:GOLD }}>◆{gems}</span>}
          </div>
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
          /* Nuit moka. Rider joue sur du presque-noir pour que le trait
             de piste soit la seule chose lumineuse de l'écran — c'est ce
             contraste qui rend la trajectoire lisible en mouvement, pas
             la finesse du dessin. On garde la palette café : de l'or sur
             de l'espresso, jamais de néon rouge ou vert. */
          background: monde.ciel,
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
              background: monde.collines,
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
          transform:`scale(${z}) translate(${-frame.camX}px, ${-frame.camY}px)`,
          transformOrigin:'0 0',
          willChange:'transform', pointerEvents:'none',
        }}>
          <svg style={{ position:'absolute', left:0, top:0, width:1, height:1, overflow:'visible' }}>
            {/* La piste est UN TRAIT LUMINEUX, pas un ruban plein.
                Le halo est fait de trois passes de plus en plus fines sur
                le même chemin — un filtre SVG donnerait un flou plus joli
                mais se recalcule à chaque image sur un chemin de 1000 px,
                et c'est exactement ce qu'il ne faut pas faire à 60 fps sur
                un téléphone. Trois traits, trois compositings, zéro flou
                à calculer. */}
            {paths.loops.map((b, i) => (
              <g key={`b${i}`}>
                <circle cx={b.x} cy={b.y - R - b.r} r={b.r + R} fill="none" stroke={monde.halo} strokeWidth="22" />
                <circle cx={b.x} cy={b.y - R - b.r} r={b.r + R} fill="none" stroke={monde.halo2} strokeWidth="12" />
                <circle cx={b.x} cy={b.y - R - b.r} r={b.r + R} fill="none" stroke={monde.piste} strokeWidth="5" />
              </g>
            ))}
            <path d={paths.crust} fill="none" stroke={monde.halo} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
            <path d={paths.crust} fill="none" stroke={monde.halo2} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            <path d={paths.crust} fill="none" stroke={monde.piste} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Les flaques — posées à plat sur le ruban */}
            {paths.flaques.map((f, i) => (
              <ellipse key={`f${i}`} cx={f.x} cy={f.y + 4} rx="27" ry="6.5"
                       fill="rgba(40,22,12,.82)" stroke={monde.halo2} strokeWidth="2" />
            ))}
            {/* Les miettes — losanges posés sur la trajectoire du saut */}
            {paths.gems.map((g, i) => (
              <g key={`g${i}`} transform={`rotate(45 ${g.x.toFixed(1)} ${g.y.toFixed(1)})`}>
                <rect x={g.x - 9} y={g.y - 9} width="18" height="18" rx="3" fill="rgba(212,160,23,.20)" />
                <rect x={g.x - 5} y={g.y - 5} width="10" height="10" rx="2" fill="#FFD98A" />
              </g>
            ))}
          </svg>
        </div>

        {/* Deux fumées, et elles ne disent pas la même chose.

            LA CHALEUR monte du café en permanence : c'est elle qui pose le
            but du jeu sans une ligne de texte — on transporte une tasse
            pleine et chaude, et tout l'enjeu est de ne pas la renverser.

            L'ÉCHAPPEMENT part de l'ARRIÈRE de l'attelage et seulement gaz
            ouvert : c'est le retour visuel du maintien. Devant la tasse il
            se lisait comme de la vapeur, derrière il se lit comme de la
            vitesse.

            Les deux sont ancrés en pixels monde multipliés par le zoom
            courant — l'échelle change en vol, un ancrage fixe décrocherait
            de l'attelage au moment précis où on le regarde. */}
        {enPartie && frame.gr && !crashed && (
          <div style={{ position:'absolute', left:0, top:0, pointerEvents:'none' }}>
            {[0, 1, 2].map(i => (
              <div key={`c${i}`} style={{
                position:'absolute',
                left: riderScreenX + TASSE_CX * z,
                top:  riderScreenY + TASSE_MT * z,
                width: 6 - i, height: 6 - i, borderRadius:'50%',
                background:'rgba(255,244,224,.5)',
                animation:`riderChaleur .7s linear ${i * 0.23}s infinite`,
              }} />
            ))}
            {holding && [0, 1, 2].map(i => (
              <div key={`e${i}`} style={{
                position:'absolute',
                left: riderScreenX - (ROUE_DX + ROUE / 2) * z,
                top:  riderScreenY + ROUE_Y * z,
                width: 8 - i, height: 8 - i, borderRadius:'50%',
                background:'rgba(196,142,80,.42)',
                animation:`riderEchappement ${0.5 + i * 0.07}s linear ${i * 0.16}s infinite`,
              }} />
            ))}
          </div>
        )}

        {/* Le biscuit et sa tasse — second et dernier translate3d */}
        <div style={{
          position:'absolute', left:0, top:0,
          width:COOKIE_SIZE, height:COOKIE_SIZE,
          marginLeft:-COOKIE_SIZE / 2, marginTop:-COOKIE_SIZE / 2,
          transform:`translate3d(${riderScreenX}px, ${riderScreenY}px, 0) rotate(${frame.ang}rad) scale(${z * (1 + 0.15 * frame.sq)}, ${z * (1 - 0.15 * frame.sq)})`,
          willChange:'transform', pointerEvents:'none',
          filter: crashed ? 'grayscale(.7)' : 'none',
        }}>
          {/* La tasse D'ABORD, les roues par-dessus : c'est ce simple
              ordre de rendu qui met les roues devant le café. Elle est
              retournée (anse à gauche) pour regarder dans le sens de la
              marche, et calée par son bord gauche (cf. TASSE_ML). */}
          <div style={{
            position:'absolute', left:'50%', top:'50%',
            width:TASSE_W, marginLeft:TASSE_ML,
            marginTop:TASSE_MT,
            lineHeight:0, pointerEvents:'none',
            transform:'scaleX(-1)',
          }}>
            <SingleCup width={TASSE_W} showCoffeeInside skin="classic" />
          </div>

          {/* Les roues : les VRAIS cookies, donc les skins de la boutique
              roulent. Rendues après la tasse, elles passent devant. */}
          {[-ROUE_DX, ROUE_DX].map(dx => (
            <div key={dx} style={{
              position:'absolute', left:'50%', top:'50%',
              width:ROUE, height:ROUE,
              marginLeft:dx - ROUE / 2, marginTop:ROUE_Y - ROUE / 2,
            }}>
              {hasCustomSkin ? <SkinnedCookie skin={skin} noShadow /> : <PremiumCookie noShadow />}
            </div>
          ))}
        </div>

        {/* Pops de figure */}
        {pops.map(p => (
          <div key={p.id} className="fu" style={{
            position:'absolute', left:riderScreenX, top:riderScreenY - 52,
            transform:'translateX(-50%)', pointerEvents:'none',
            fontSize:14, fontWeight:900, color:GOLD, whiteSpace:'nowrap',
            textShadow:'0 2px 6px rgba(74,44,23,.5)',
          }}>
            {t('game_rider.flip_pop', { n:p.n })}
          </div>
        ))}

        {/* Carton de monde. C'est lui qui fait sentir qu'on avance : la
            difficulté qui monte en continu est trop lente pour se
            remarquer, un changement de décor annoncé, non. */}
        {annonce && (
          <div key={annonce.id} className="su" style={{
            position:'absolute', left:0, right:0, top:'42%', textAlign:'center',
            pointerEvents:'none',
          }}>
            <div style={{ fontSize:11, fontWeight:900, letterSpacing:3, color:monde.texte, opacity:.7 }}>
              {t('game_rider.monde_label')}
            </div>
            <div style={{ fontSize:29, fontWeight:900, letterSpacing:.5, color:monde.texte, textShadow:'0 3px 18px rgba(0,0,0,.5)' }}>
              {t(`game_rider.monde_${MONDES[annonce.idx].id}`)}
            </div>
          </div>
        )}

        {/* Le petit mot — bas de l'aire, minuscules, il s'efface seul */}
        {tag && (
          <div key={tag.id} className="rider-tag" style={{
            position:'absolute', left:0, right:0, bottom:34, textAlign:'center',
            fontSize:26, fontWeight:900, letterSpacing:.3,
            color: monde.texte, pointerEvents:'none',
            textShadow:'0 2px 14px rgba(0,0,0,.5)',
          }}>{t(tag.cle)}</div>
        )}

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
            fontSize:12, fontWeight:800, color:'rgba(255,226,170,.9)', pointerEvents:'none',
            textShadow:'0 2px 8px rgba(0,0,0,.6)',
          }}>{t('game_rider.hold_hint')}</div>
        )}

        {/* Le score, gros et haut, comme dans la référence */}
        {(enPartie || phase === 'countdown') && (
          <div style={{
            position:'absolute', left:0, right:0, top:22, textAlign:'center',
            fontSize:40, fontWeight:900, letterSpacing:-1,
            color: monde.texte, pointerEvents:'none',
            textShadow:'0 3px 18px rgba(0,0,0,.45)', lineHeight:1,
          }}>{score}</div>
        )}

        {/* Chrono — un filet en haut de l'aire, pas un chiffre de plus */}
        {enPartie && (
          <div style={{ position:'absolute', left:10, right:10, top:8, height:4, borderRadius:3, background:'rgba(255,226,170,.14)', overflow:'hidden', pointerEvents:'none' }}>
            <div style={{
              height:'100%', borderRadius:3,
              width:`${Math.max(0, Math.min(100, (reste / RUN_TIME) * 100))}%`,
              background: reste <= 10 ? '#8E5F30' : 'rgba(255,226,170,.85)',
              transition:'width .25s linear',
            }} />
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

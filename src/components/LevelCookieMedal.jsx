import { useId } from "react";

/* ════════════════════════════════════════════════════
   LevelCookieMedal — la médaille de palier, en cookie
   ────────────────────────────────────────────────────
   Remplace la pastille ronde en dégradé qui servait de médaille aux
   bannières de niveau (Accueil + LevelsModal). Une bille brillante avec
   un chiffre dessus, ça ressemblait à n'importe quel jeu ; un cookie
   nous appartient. Le biscuit est volontairement en retrait — c'est un
   support, pas un sujet : le numéro doit rester ce qu'on lit en premier.

   Props :
   - level    : le numéro affiché (ignoré si `children` est fourni)
   - children : contenu alternatif (le cadenas des paliers verrouillés)
   - tier     : { base, edge, soft } — cf. levelTier() dans data/themes.js
   - variant  : 'earned'  → cookie dans la teinte du palier (acquis)
                'active'  → cookie doré (palier en cours)
                'locked'  → cookie éteint (pas encore atteint)
   - size     : diamètre en px (44 dans la modale, 54 sur l'Accueil)
   - glint    : ajoute l'éclat qui balaie la médaille (Accueil seulement —
                dans une liste de 25, ça ferait une guirlande)
   - C        : thème, pour la variante verrouillée

   ⚠ Les IDs de <defs> sont préfixés par useId() : la modale rend 25
   médailles côte à côte, et sans préfixe tous les dégradés collisionnent
   dans le DOM — les 25 cookies prendraient la couleur du premier.
   (Même piège que SkinnedCookie, cf. son bandeau.)

   Les pépites sont placées en couronne, JAMAIS au centre : c'est là que
   tombe le chiffre, et une pépite sous un 8 le rend illisible.

   ⚠️ LE BISCUIT EST ROND, MAIS SANS AUCUN LISERÉ BLANC AUTOUR.
   La première version enfermait le cookie dans un conteneur rond avec
   `border: 2px solid rgba(255,255,255,.38)` : ça lui posait un anneau
   blanc, visible et laid sur le brun de la bannière. Régis, le 09/09 :
   « il y a un cercle blanc autour ». Le rond, lui, il le veut — c'est
   le liseré qui saute, pas la forme.

   Ce qui remplace l'anneau : une lèvre claire DANS le ton du biscuit,
   et un `drop-shadow` posé sur le SVG. Une ombre portée épouse la forme
   réelle du dessin, là où un `box-shadow` redessinerait la boîte du
   conteneur. Ne jamais remettre de `border` blanche ni d'`overflow`
   sur le conteneur : c'est exactement ce qu'on vient d'enlever.
═══════════════════════════════════════════════════════ */

/* Éclaircir ou assombrir une couleur du palier. Sert à fabriquer les
   deux bouts du dégradé du biscuit à partir de sa seule teinte de base.

   POURQUOI : `tier.edge` est un rgba à 50 % d'alpha. L'utiliser comme
   bout extérieur du dégradé faisait littéralement DISPARAÎTRE le bord du
   cookie dans la carte — un biscuit net au centre, flou et délavé sur le
   pourtour. C'est l'autre moitié du « pas beau ». Un biscuit doit être
   opaque de bout en bout ; c'est l'ombre portée qui le détache du fond,
   pas sa transparence. */
function melange(hex, vers, t) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return hex;                       // rgba(), nom CSS… : on ne touche pas
  const n = parseInt(m[1], 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map(v => Math.round(v + (vers - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/* Le biscuit est ROND — demande de Régis, 09/09 : « pour la bannière le
   cookie doit être rond stp ». Un temps il a eu un bord bosselé ; ça ne
   lui allait pas à cette taille, où les bosses passent pour un défaut de
   rendu plutôt que pour du biscuit.

   Le rayon est en dur ici parce qu'il sert TROIS fois : le corps, la
   lèvre claire, et le masque de l'éclat. Les trois doivent bouger
   ensemble ou l'éclat déborde. */
const R = 47;

/* Positions fixes plutôt qu'aléatoires : une médaille doit être la même
   d'un rendu à l'autre, et le trou central doit rester garanti. */
const CHIPS = [
  { x: 28, y: 26, r: 7.5, rot: -18 },
  { x: 73, y: 31, r: 6.5, rot: 24  },
  { x: 20, y: 62, r: 6,   rot: 10  },
  { x: 78, y: 66, r: 7,   rot: -14 },
  { x: 50, y: 84, r: 6.5, rot: 6   },
  { x: 50, y: 15, r: 5.5, rot: -8  },
];

export function LevelCookieMedal({
  level,
  children,
  tier,
  variant = 'earned',
  size = 48,
  glint = false,
  C,
}) {
  const uid = useId().replace(/:/g, '');
  const bodyId  = `lvlCookie-${uid}`;
  const clipId  = `lvlClip-${uid}`;
  const glintId = `lvlGlint-${uid}`;

  const active = variant === 'active';
  const locked = variant === 'locked';

  /* Le biscuit : deux teintes du palier, or pour le palier en cours, et
     la couleur de bordure du thème quand c'est encore verrouillé. Les
     deux bouts sont OPAQUES — on éclaircit et on assombrit la teinte de
     base plutôt que de reprendre `tier.edge`, qui est translucide et
     laissait le bord du cookie se dissoudre dans la carte. */
  const from = locked ? C.border : active ? '#F0C050' : melange(tier.base, 255, .20);
  const to   = locked ? C.border : active ? '#C08A16' : melange(tier.base, 0,   .26);
  const chipColor = locked
    ? C.muted
    : active ? 'rgba(120,78,10,.55)' : 'rgba(60,34,16,.42)';

  /* Le cookie s'efface un peu derrière le chiffre, mais plus autant
     qu'avant : à 0,62 sur le brun de la bannière, il virait au fondu et
     c'est une bonne part du « pas beau ». Le chiffre reste lisible sans
     ça — il est en 900, blanc, avec deux ombres portées. */
  const cookieOpacity = locked ? 0.38 : 1;

  const textColor = locked ? C.muted : active ? '#FFE9A8' : '#fff';

  /* L'ombre épouse le biscuit, pas sa boîte : c'est ce qui le pose SUR
     la bannière au lieu de le laisser flotter dedans — le rôle que
     tenait le liseré blanc, en mieux et sans cercle. */
  /* Une ombre SOMBRE, pas le halo pâle d'avant : `tier.soft` est un
     beige à 18 % d'alpha, qui sur le brun de la bannière n'accroche
     rien du tout. C'est l'ombre qui pose le biscuit sur la carte — le
     rôle que tenait le liseré blanc. */
  const ombre = locked
    ? 'none'
    : active
      ? 'drop-shadow(0 2px 5px rgba(30,15,6,.5)) drop-shadow(0 0 9px rgba(212,160,23,.5))'
      : 'drop-shadow(0 2px 5px rgba(30,15,6,.45))';

  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg
        viewBox="0 0 100 100" aria-hidden
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: cookieOpacity, overflow: 'visible', filter: ombre,
        }}
      >
        <defs>
          <radialGradient id={bodyId} cx="36%" cy="30%" r="78%">
            <stop offset="0%"   stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </radialGradient>
          {/* Le masque de l'éclat. Il vit dans le SVG et non plus sur le
              conteneur : c'était l'`overflow:hidden` du conteneur qui
              posait le liseré blanc avec lui. */}
          <clipPath id={clipId}>
            <circle cx="50" cy="50" r={R} />
          </clipPath>
          <linearGradient id={glintId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
            <stop offset="50%"  stopColor="rgba(255,255,255,.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* Le biscuit. C'est ce qu'on lit en second, après le chiffre. */}
        <circle cx="50" cy="50" r={R} fill={`url(#${bodyId})`} />

        {/* Une lèvre plus claire sur le pourtour, DANS le ton du biscuit :
            elle donne l'épaisseur que le liseré blanc donnait de force,
            sans poser d'anneau étranger sur la bannière. */}
        {!locked && (
          <circle
            cx="50" cy="50" r={R - 1.2}
            fill="none"
            stroke="rgba(255,238,205,.28)"
            strokeWidth="2.2"
          />
        )}

        {/* Pépites en couronne — le centre reste libre pour le chiffre. */}
        {CHIPS.map((c, i) => (
          <ellipse
            key={i}
            cx={c.x} cy={c.y} rx={c.r} ry={c.r * 0.82}
            fill={chipColor}
            transform={`rotate(${c.rot} ${c.x} ${c.y})`}
          />
        ))}

        {/* Reflet spéculaire en haut à gauche : la lumière qui tombe. */}
        {!locked && (
          <ellipse cx="34" cy="26" rx="17" ry="10" fill="rgba(255,255,255,.22)" transform="rotate(-30 34 26)" />
        )}

        {glint && (
          <g clipPath={`url(#${clipId})`}>
            <rect className="level-glint" x="0" y="-5" width="42" height="110" fill={`url(#${glintId})`} />
          </g>
        )}
      </svg>

      <span style={{
        position: 'relative',
        fontWeight: 900,
        fontSize: Math.round(size * 0.4),
        color: textColor,
        lineHeight: 1,
        /* Le chiffre doit tenir même quand une pépite passe dessous. */
        textShadow: locked ? 'none' : '0 1px 3px rgba(40,20,8,.55), 0 0 10px rgba(40,20,8,.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {children ?? level}
      </span>

    </div>
  );
}

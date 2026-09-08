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
═══════════════════════════════════════════════════════ */

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
  const bodyId = `lvlCookie-${uid}`;

  const active = variant === 'active';
  const locked = variant === 'locked';

  /* Le biscuit : deux teintes du palier, or pour le palier en cours,
     et la couleur de bordure du thème quand c'est encore verrouillé. */
  const from = locked ? C.border : active ? '#F0C050' : tier.base;
  const to   = locked ? C.border : active ? '#C08A16' : tier.edge;
  const chipColor = locked
    ? C.muted
    : active ? 'rgba(120,78,10,.55)' : 'rgba(60,34,16,.42)';

  /* « avec de l'opacité » : le cookie s'efface derrière le chiffre.
     Assez présent pour qu'on reconnaisse un biscuit, assez discret pour
     qu'un 25 reste lisible d'un coup d'oeil. */
  const cookieOpacity = locked ? 0.34 : active ? 0.72 : 0.62;

  const textColor = locked ? C.muted : active ? '#FFE9A8' : '#fff';

  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      position: 'relative', overflow: 'hidden', borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      /* L'ombre portée et le liseré restent : c'est ce qui pose la
         médaille SUR la bannière au lieu de la laisser flotter dedans. */
      border: `2px solid ${locked ? C.border : active ? 'rgba(255,232,154,.5)' : 'rgba(255,255,255,.38)'}`,
      boxShadow: locked
        ? 'none'
        : active
          ? '0 3px 12px rgba(212,160,23,.35), inset 0 1px 0 rgba(255,255,255,.35)'
          : `0 3px 10px ${tier.soft}, inset 0 1px 0 rgba(255,255,255,.32)`,
      background: locked
        ? 'transparent'
        : `radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,.18), transparent 60%)`,
    }}>
      <svg
        viewBox="0 0 100 100" aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: cookieOpacity }}
      >
        <defs>
          <radialGradient id={bodyId} cx="36%" cy="30%" r="78%">
            <stop offset="0%"   stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </radialGradient>
        </defs>

        {/* Le biscuit. Le bord est légèrement bosselé (une suite d'arcs
            plutôt qu'un cercle parfait) — c'est le seul détail qui fait
            lire « cookie » et non « jeton ». */}
        <path
          d="M50 3
             C64 3 72 9 78 14 C86 20 97 27 97 41
             C97 53 93 58 93 68 C93 80 82 97 66 97
             C57 97 54 93 48 93 C38 93 28 97 18 89
             C9 82 8 70 6 62 C3 52 3 44 7 34
             C11 23 20 14 29 9 C36 5 43 3 50 3 Z"
          fill={`url(#${bodyId})`}
        />

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

      {glint && <span className="level-glint" aria-hidden />}
    </div>
  );
}

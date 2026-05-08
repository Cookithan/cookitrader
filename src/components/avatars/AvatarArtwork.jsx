/* ════════════════════════════════════════════════════
   AvatarArtwork — illustrations SVG des avatars
   ────────────────────────────────────────────────────
   Polish v2 (2026-05-08) — relief poussé :
   - Gradients SVG (linearGradient / radialGradient) sur les fills principaux
     pour vrai volume (lumière haut-gauche → ombre bas-droite)
   - Highlights crème + ombres internes marquées
   - Contours épais cartoon (strokeWidth 2.8) avec linejoin/linecap round
   - Détails expressifs sur les visages : sourcils, joues, brillance pupille
   - Palette café 100 % stricte (pas de rouge / pas de vert / pas de bleu)

   IDs de gradient préfixés par avatar (`g_<art>_<n>`) pour éviter les
   collisions quand plusieurs avatars sont rendus sur la même page (ex
   leaderboard ou grille de sélection).

   Tous les SVG sont en viewBox 0 0 100 100. Le fond gradient circulaire
   (clé `bg` de avatars.js) est appliqué par AvatarFigure ; le SVG dessine
   uniquement le contenu central.

   3 entrées masquées (`hidden:true` dans avatars.js) : Tasse Café (#0),
   Théière (#4), Croissant (#5). Leur SVG est conservé pour compat des
   profils existants mais ils ne s'affichent plus dans la sélection.
═══════════════════════════════════════════════════════ */

const ESPRESSO  = '#2A1606';
const COOKIE_DK = '#5A2D10';
const MOKA      = '#7D4E1F';
const MOKA_LT   = '#A0784E';
const COOKIE    = '#B86A28';
const CARAMEL   = '#C17F3C';
const CARAMEL_LT= '#E5B040';
const CREME     = '#FAF0E0';
const OR        = '#D4A017';
const OR_LT     = '#F0C050';
const OR_LTR    = '#FFE89A';
const OR_DK     = '#8B6914';
const SKIN      = '#E8C8A4';
const SKIN_DK   = '#B8865E';
const SKIN_LT   = '#F4DCBE';
const STONE     = '#C8B89C';
const STONE_DK  = '#8B7A60';

const STROKE_HEAVY = { stroke: ESPRESSO, strokeWidth: 2.8, strokeLinejoin: 'round', strokeLinecap: 'round' };
const STROKE_MED   = { stroke: ESPRESSO, strokeWidth: 2,   strokeLinejoin: 'round', strokeLinecap: 'round' };
const STROKE_FINE  = { stroke: ESPRESSO, strokeWidth: 1.3, strokeLinejoin: 'round', strokeLinecap: 'round' };

/* ──────────────── 12 AVATARS DE BASE ──────────────── */

/* Tasse Café (HIDDEN) — conservé pour compat */
const Tasse = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <linearGradient id="g_tasse_body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CREME} />
        <stop offset="100%" stopColor="#E5D4B8" />
      </linearGradient>
    </defs>
    <path d="M40 22 Q44 14 40 6"  stroke={CREME} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity=".75" />
    <path d="M50 24 Q54 14 50 4"  stroke={CREME} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity=".85" />
    <path d="M60 22 Q64 14 60 6"  stroke={CREME} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity=".75" />
    <path d="M72 50 Q86 50 86 60 Q86 70 72 70" fill="none" {...STROKE_HEAVY} />
    <path d="M22 42 L72 42 L70 80 Q70 86 60 86 L34 86 Q24 86 24 80 Z" fill="url(#g_tasse_body)" {...STROKE_HEAVY} />
    <ellipse cx="47" cy="48" rx="22" ry="5" fill={ESPRESSO} />
    <ellipse cx="42" cy="46.5" rx="6" ry="1.6" fill={MOKA_LT} opacity=".8" />
    <ellipse cx="47" cy="90" rx="34" ry="5" fill={CREME} {...STROKE_HEAVY} />
  </svg>
);

const Cookie = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <radialGradient id="g_cookie_body" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor={CARAMEL_LT} />
        <stop offset="55%" stopColor={COOKIE} />
        <stop offset="100%" stopColor={COOKIE_DK} />
      </radialGradient>
    </defs>
    {/* corps avec gradient radial pour vrai volume */}
    <circle cx="50" cy="50" r="36" fill="url(#g_cookie_body)" {...STROKE_HEAVY} stroke={COOKIE_DK} strokeWidth="3" />
    {/* ombre basse */}
    <path d="M22 56 Q50 80 78 56 Q70 82 50 86 Q30 82 22 56 Z" fill={ESPRESSO} opacity=".25" />
    {/* pépites avec ombre portée */}
    <circle cx="36" cy="40" r="5" fill={ESPRESSO} />
    <circle cx="60" cy="38" r="4.5" fill={ESPRESSO} />
    <circle cx="55" cy="60" r="5" fill={ESPRESSO} />
    <circle cx="38" cy="62" r="4" fill={ESPRESSO} />
    <circle cx="64" cy="56" r="3.5" fill={ESPRESSO} />
    <circle cx="46" cy="50" r="3" fill={ESPRESSO} />
    {/* ombres pépites (faux 3D) */}
    <ellipse cx="36" cy="44" rx="5" ry="1.2" fill={COOKIE_DK} opacity=".5" />
    <ellipse cx="60" cy="42" rx="4.5" ry="1.1" fill={COOKIE_DK} opacity=".5" />
    <ellipse cx="55" cy="64" rx="5" ry="1.2" fill={COOKIE_DK} opacity=".5" />
    {/* highlights pépites */}
    <circle cx="34.2" cy="38.2" r="1.5" fill={CARAMEL} opacity=".75" />
    <circle cx="58.4" cy="36.3" r="1.3" fill={CARAMEL} opacity=".75" />
    <circle cx="53.5" cy="58.3" r="1.4" fill={CARAMEL} opacity=".75" />
    {/* grand reflet doré */}
    <ellipse cx="36" cy="34" rx="14" ry="6" fill={OR_LTR} opacity=".5" transform="rotate(-22 36 34)" />
    <ellipse cx="32" cy="32" rx="6" ry="2.5" fill={CREME} opacity=".55" transform="rotate(-22 32 32)" />
  </svg>
);

const BaristaH = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <linearGradient id="g_baH_face" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={SKIN_LT} />
        <stop offset="100%" stopColor={SKIN_DK} />
      </linearGradient>
      <linearGradient id="g_baH_cap" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3D2010" />
        <stop offset="100%" stopColor={ESPRESSO} />
      </linearGradient>
    </defs>
    {/* casquette avec dégradé */}
    <path d="M28 38 Q28 22 50 22 Q72 22 72 38 L74 42 L26 42 Z" fill="url(#g_baH_cap)" {...STROKE_HEAVY} />
    <path d="M26 42 Q50 48 74 42 L74 44 L26 44 Z" fill={MOKA} {...STROKE_HEAVY} />
    {/* logo cookie sur casquette */}
    <circle cx="50" cy="32" r="5.5" fill={CARAMEL} stroke={ESPRESSO} strokeWidth="1.4" />
    <circle cx="48" cy="30" r="0.9" fill={ESPRESSO} />
    <circle cx="52" cy="33" r="0.9" fill={ESPRESSO} />
    <circle cx="46.5" cy="33.5" r="0.7" fill={ESPRESSO} />
    {/* visage avec gradient */}
    <circle cx="50" cy="58" r="18" fill="url(#g_baH_face)" {...STROKE_HEAVY} stroke={SKIN_DK} />
    {/* sourcils */}
    <path d="M40 50 Q43 48 46 51" stroke={ESPRESSO} strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M54 51 Q57 48 60 50" stroke={ESPRESSO} strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* yeux brillants */}
    <circle cx="43" cy="56" r="2.6" fill={ESPRESSO} />
    <circle cx="57" cy="56" r="2.6" fill={ESPRESSO} />
    <circle cx="43.8" cy="55" r="0.9" fill={CREME} />
    <circle cx="57.8" cy="55" r="0.9" fill={CREME} />
    {/* joues */}
    <ellipse cx="40" cy="64" rx="3" ry="2" fill={CARAMEL} opacity=".4" />
    <ellipse cx="60" cy="64" rx="3" ry="2" fill={CARAMEL} opacity=".4" />
    {/* sourire */}
    <path d="M43 65 Q50 71 57 65" stroke={ESPRESSO} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M44 67 Q50 70 56 67" fill={CARAMEL} stroke={ESPRESSO} strokeWidth="1.2" opacity=".7" />
    {/* tablier */}
    <path d="M28 82 Q34 78 38 78 L62 78 Q66 78 72 82 L66 95 L34 95 Z" fill={CREME} {...STROKE_HEAVY} />
    <path d="M40 78 L40 86" stroke={MOKA} strokeWidth="2" fill="none" />
    <path d="M60 78 L60 86" stroke={MOKA} strokeWidth="2" fill="none" />
    <circle cx="50" cy="90" r="1.5" fill={MOKA} />
  </svg>
);

const BaristaF = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <linearGradient id="g_baF_face" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={SKIN_LT} />
        <stop offset="100%" stopColor={SKIN_DK} />
      </linearGradient>
      <linearGradient id="g_baF_hair" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#5A3520" />
        <stop offset="100%" stopColor={ESPRESSO} />
      </linearGradient>
    </defs>
    {/* chignon */}
    <circle cx="50" cy="20" r="11" fill="url(#g_baF_hair)" {...STROKE_HEAVY} />
    <ellipse cx="46" cy="17" rx="3" ry="2" fill="#7D4E1F" opacity=".6" />
    {/* cheveux ondulés */}
    <path d="M30 56 Q28 34 50 30 Q72 34 70 56 L70 60 L30 60 Z" fill="url(#g_baF_hair)" {...STROKE_HEAVY} />
    {/* mèches frontales */}
    <path d="M34 38 Q42 32 50 36" stroke={MOKA} strokeWidth="1.6" fill="none" />
    <path d="M50 36 Q58 32 66 38" stroke={MOKA} strokeWidth="1.6" fill="none" />
    {/* visage */}
    <circle cx="50" cy="58" r="17" fill="url(#g_baF_face)" {...STROKE_HEAVY} stroke={SKIN_DK} />
    {/* sourcils fins */}
    <path d="M40 51 Q43 49 46 52" stroke={ESPRESSO} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    <path d="M54 52 Q57 49 60 51" stroke={ESPRESSO} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    {/* cils + yeux */}
    <path d="M40 56 L41 54" stroke={ESPRESSO} strokeWidth="1.3" strokeLinecap="round" />
    <path d="M60 56 L59 54" stroke={ESPRESSO} strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="43" cy="57" r="2.6" fill={ESPRESSO} />
    <circle cx="57" cy="57" r="2.6" fill={ESPRESSO} />
    <circle cx="43.8" cy="56" r="0.9" fill={CREME} />
    <circle cx="57.8" cy="56" r="0.9" fill={CREME} />
    {/* joues marquées */}
    <ellipse cx="40" cy="65" rx="3.2" ry="2.2" fill={CARAMEL} opacity=".55" />
    <ellipse cx="60" cy="65" rx="3.2" ry="2.2" fill={CARAMEL} opacity=".55" />
    {/* sourire */}
    <path d="M43 66 Q50 71 57 66" stroke={ESPRESSO} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    {/* boucles d'oreilles */}
    <circle cx="33" cy="60" r="1.6" fill={OR_LT} stroke={ESPRESSO} strokeWidth="0.9" />
    <circle cx="67" cy="60" r="1.6" fill={OR_LT} stroke={ESPRESSO} strokeWidth="0.9" />
    {/* tablier */}
    <path d="M28 82 Q34 78 38 78 L62 78 Q66 78 72 82 L66 95 L34 95 Z" fill={CREME} {...STROKE_HEAVY} />
    <path d="M40 78 L40 86" stroke={MOKA} strokeWidth="2" fill="none" />
    <path d="M60 78 L60 86" stroke={MOKA} strokeWidth="2" fill="none" />
  </svg>
);

/* Théière (HIDDEN) — conservé pour compat */
const Theiere = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <linearGradient id="g_theiere_body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={OR_LTR} />
        <stop offset="100%" stopColor={OR_DK} />
      </linearGradient>
    </defs>
    <path d="M22 50 Q8 60 22 72" fill="none" {...STROKE_HEAVY} strokeWidth="4" />
    <ellipse cx="50" cy="62" rx="28" ry="22" fill="url(#g_theiere_body)" {...STROKE_HEAVY} />
    <rect x="38" y="36" width="24" height="8" rx="3" fill={OR} {...STROKE_HEAVY} />
    <circle cx="50" cy="32" r="4" fill={OR_LT} {...STROKE_HEAVY} />
    <path d="M76 56 Q88 50 92 54 L88 60 Q82 66 76 64 Z" fill={OR} {...STROKE_HEAVY} />
    <path d="M86 48 Q90 40 86 32" stroke={CREME} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".7" />
    <ellipse cx="40" cy="54" rx="11" ry="6" fill={OR_LTR} opacity=".6" transform="rotate(-20 40 54)" />
  </svg>
);

/* Croissant (HIDDEN) — conservé pour compat */
const Croissant = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <linearGradient id="g_croi_body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F0CA70" />
        <stop offset="100%" stopColor={CARAMEL_LT} />
      </linearGradient>
    </defs>
    <path d="M16 64 Q18 26 50 24 Q82 26 84 64 Q74 50 64 50 Q56 32 50 32 Q44 32 36 50 Q26 50 16 64 Z"
      fill="url(#g_croi_body)" {...STROKE_HEAVY} stroke={MOKA} strokeWidth="3" />
    <path d="M36 50 Q40 60 32 68" stroke={MOKA} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M50 32 Q50 50 42 64" stroke={MOKA} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M64 50 Q60 60 68 68" stroke={MOKA} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <ellipse cx="50" cy="38" rx="14" ry="3" fill={OR_LTR} opacity=".6" />
  </svg>
);

const LatteArt = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <radialGradient id="g_latte_coffee" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stopColor={MOKA_LT} />
        <stop offset="100%" stopColor={ESPRESSO} />
      </radialGradient>
      <radialGradient id="g_latte_cup" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor={CREME} />
        <stop offset="100%" stopColor="#E5D4B8" />
      </radialGradient>
      <linearGradient id="g_latte_heart" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CREME} />
        <stop offset="100%" stopColor="#E5D4B8" />
      </linearGradient>
    </defs>
    {/* anneau crème extérieur */}
    <circle cx="50" cy="50" r="38" fill="url(#g_latte_cup)" {...STROKE_HEAVY} />
    {/* café avec radial */}
    <circle cx="50" cy="50" r="32" fill="url(#g_latte_coffee)" />
    {/* cœur crème centré dans le café (latte art classique) */}
    <path d="M50 70
             C 40 62, 28 54, 28 42
             C 28 34, 36 30, 42 32
             C 46 33, 50 38, 50 42
             C 50 38, 54 33, 58 32
             C 64 30, 72 34, 72 42
             C 72 54, 60 62, 50 70 Z"
      fill="url(#g_latte_heart)" stroke={MOKA} strokeWidth="1.4" strokeLinejoin="round" />
    {/* highlight cœur */}
    <ellipse cx="40" cy="40" rx="5" ry="3" fill={CREME} opacity=".85" transform="rotate(-25 40 40)" />
    {/* highlight tasse */}
    <ellipse cx="34" cy="38" rx="9" ry="3" fill={CREME} opacity=".6" />
  </svg>
);

const Grain = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <linearGradient id="g_grain_body" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#7D4220" />
        <stop offset="50%" stopColor={COOKIE_DK} />
        <stop offset="100%" stopColor={ESPRESSO} />
      </linearGradient>
    </defs>
    <g transform="rotate(-15 50 50)">
      <ellipse cx="50" cy="50" rx="26" ry="38" fill="url(#g_grain_body)" {...STROKE_HEAVY} strokeWidth="3" />
      {/* sillon central profond */}
      <path d="M50 14 Q42 50 50 86" stroke={ESPRESSO} strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M50 18 Q44 50 50 82" stroke="#3D1C02" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M50 22 Q46 50 50 78" stroke={MOKA_LT} strokeWidth="1.2" fill="none" opacity=".7" strokeLinecap="round" />
      {/* reflets de relief */}
      <ellipse cx="36" cy="36" rx="7" ry="16" fill={MOKA_LT} opacity=".55" />
      <ellipse cx="34" cy="32" rx="3.5" ry="7" fill={CARAMEL_LT} opacity=".55" />
      {/* ombre opposée */}
      <ellipse cx="62" cy="64" rx="6" ry="14" fill={ESPRESSO} opacity=".4" />
    </g>
  </svg>
);

const Muffin = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <radialGradient id="g_muffin_top" cx="40%" cy="35%" r="75%">
        <stop offset="0%" stopColor={CARAMEL} />
        <stop offset="60%" stopColor={MOKA} />
        <stop offset="100%" stopColor="#5A3520" />
      </radialGradient>
      <linearGradient id="g_muffin_paper" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CREME} />
        <stop offset="100%" stopColor="#E5D4B8" />
      </linearGradient>
    </defs>
    {/* tête bombée avec gradient radial */}
    <path d="M20 56 Q18 26 50 24 Q82 26 80 56 Q72 60 62 56 Q50 60 38 56 Q28 60 20 56 Z"
      fill="url(#g_muffin_top)" {...STROKE_HEAVY} strokeWidth="3" />
    {/* highlights bosses (lumière haut-gauche) */}
    <ellipse cx="32" cy="34" rx="8" ry="3.5" fill={CARAMEL_LT} opacity=".75" />
    <ellipse cx="55" cy="30" rx="11" ry="3.5" fill={CARAMEL_LT} opacity=".75" />
    {/* pépites bien marquées */}
    <circle cx="36" cy="44" r="3" fill={ESPRESSO} />
    <circle cx="50" cy="38" r="3.2" fill={ESPRESSO} />
    <circle cx="64" cy="44" r="3" fill={ESPRESSO} />
    <circle cx="44" cy="50" r="2.4" fill={ESPRESSO} />
    <circle cx="58" cy="50" r="2.4" fill={ESPRESSO} />
    {/* highlights pépites */}
    <circle cx="34.7" cy="42.5" r="1" fill={MOKA_LT} opacity=".7" />
    <circle cx="48.5" cy="36.5" r="1.1" fill={MOKA_LT} opacity=".7" />
    {/* papier strié */}
    <path d="M20 56 L24 86 L76 86 L80 56 Z" fill="url(#g_muffin_paper)" {...STROKE_HEAVY} />
    <path d="M30 60 L31 84" stroke={MOKA} strokeWidth="1.5" opacity=".55" fill="none" />
    <path d="M40 58 L40 84" stroke={MOKA} strokeWidth="1.5" opacity=".55" fill="none" />
    <path d="M50 58 L50 84" stroke={MOKA} strokeWidth="1.5" opacity=".55" fill="none" />
    <path d="M60 58 L60 84" stroke={MOKA} strokeWidth="1.5" opacity=".55" fill="none" />
    <path d="M70 60 L69 84" stroke={MOKA} strokeWidth="1.5" opacity=".55" fill="none" />
  </svg>
);

const Donut = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <radialGradient id="g_donut_base" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stopColor={CARAMEL} />
        <stop offset="100%" stopColor={MOKA} />
      </radialGradient>
      <linearGradient id="g_donut_glaze" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={OR_LTR} />
        <stop offset="100%" stopColor={OR} />
      </linearGradient>
    </defs>
    {/* base */}
    <circle cx="50" cy="50" r="34" fill="url(#g_donut_base)" {...STROKE_HEAVY} stroke={COOKIE_DK} strokeWidth="3" />
    {/* ombre basse */}
    <path d="M20 56 Q50 78 80 56 Q72 82 50 84 Q28 82 20 56 Z" fill={ESPRESSO} opacity=".3" />
    {/* glaçage caramel coulant — plus dégoulinant */}
    <path d="M50 16 Q84 16 84 50 Q84 56 76 56 Q70 50 60 56 Q50 50 40 56 Q30 50 20 58 Q14 56 14 50 Q14 16 50 16 Z"
      fill="url(#g_donut_glaze)" {...STROKE_HEAVY} stroke={MOKA} />
    {/* trou avec relief */}
    <circle cx="50" cy="50" r="11" fill={MOKA} {...STROKE_HEAVY} />
    <circle cx="50" cy="50" r="7" fill={ESPRESSO} opacity=".55" />
    <circle cx="48" cy="48" r="2" fill={CARAMEL} opacity=".7" />
    {/* sprinkles café-only */}
    <rect x="32" y="26" width="6" height="2.6" rx="1" fill={CARAMEL} transform="rotate(20 35 27)" />
    <rect x="60" y="28" width="6" height="2.6" rx="1" fill={MOKA} transform="rotate(-30 63 29)" />
    <rect x="24" y="42" width="6" height="2.6" rx="1" fill={CREME} transform="rotate(40 27 43)" />
    <rect x="68" y="42" width="6" height="2.6" rx="1" fill={CARAMEL} transform="rotate(15 71 43)" />
    <rect x="62" y="64" width="6" height="2.6" rx="1" fill={MOKA} transform="rotate(-40 65 65)" />
    <rect x="32" y="64" width="6" height="2.6" rx="1" fill={CREME} transform="rotate(35 35 65)" />
    {/* highlight glaçage */}
    <ellipse cx="36" cy="24" rx="14" ry="3.5" fill={CREME} opacity=".7" />
    <ellipse cx="34" cy="22" rx="6" ry="1.5" fill={CREME} opacity=".9" />
  </svg>
);

const CookieKawaii = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <radialGradient id="g_kaw_body" cx="35%" cy="30%" r="80%">
        <stop offset="0%" stopColor={CARAMEL} />
        <stop offset="60%" stopColor={COOKIE} />
        <stop offset="100%" stopColor={COOKIE_DK} />
      </radialGradient>
    </defs>
    {/* corps avec gradient radial */}
    <circle cx="50" cy="50" r="36" fill="url(#g_kaw_body)" {...STROKE_HEAVY} stroke={COOKIE_DK} strokeWidth="3" />
    {/* ombre basse */}
    <path d="M22 56 Q50 80 78 56 Q70 82 50 86 Q30 82 22 56 Z" fill={ESPRESSO} opacity=".3" />
    {/* chips */}
    <circle cx="32" cy="38" r="3.8" fill={ESPRESSO} />
    <circle cx="68" cy="38" r="3.8" fill={ESPRESSO} />
    <circle cx="50" cy="74" r="3.2" fill={ESPRESSO} />
    <circle cx="26" cy="56" r="2.6" fill={ESPRESSO} />
    <circle cx="74" cy="56" r="2.6" fill={ESPRESSO} />
    {/* yeux fermés contents avec petits cils */}
    <path d="M37 50 Q42 43 47 50" stroke={ESPRESSO} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M53 50 Q58 43 63 50" stroke={ESPRESSO} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M37 49 L34 47" stroke={ESPRESSO} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M47 49 L50 46" stroke={ESPRESSO} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M53 49 L50 46" stroke={ESPRESSO} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M63 49 L66 47" stroke={ESPRESSO} strokeWidth="1.4" strokeLinecap="round" />
    {/* joues caramel marquées */}
    <ellipse cx="32" cy="60" rx="5" ry="3" fill={OR} opacity=".55" />
    <ellipse cx="68" cy="60" rx="5" ry="3" fill={OR} opacity=".55" />
    <ellipse cx="31" cy="59" rx="2" ry="1" fill={CREME} opacity=".5" />
    <ellipse cx="67" cy="59" rx="2" ry="1" fill={CREME} opacity=".5" />
    {/* sourire avec dent */}
    <path d="M40 64 Q50 74 60 64" stroke={ESPRESSO} strokeWidth="2.6" fill={MOKA_LT} strokeLinejoin="round" />
    {/* langue */}
    <path d="M46 67 Q50 72 54 67 Q52 70 50 70 Q48 70 46 67 Z" fill={CARAMEL} stroke={ESPRESSO} strokeWidth="1" />
    {/* dent */}
    <rect x="48" y="64" width="2" height="3" fill={CREME} stroke={ESPRESSO} strokeWidth="0.7" />
    {/* highlight cookie */}
    <ellipse cx="34" cy="32" rx="11" ry="5" fill={OR_LTR} opacity=".5" transform="rotate(-22 34 32)" />
    <ellipse cx="30" cy="30" rx="5" ry="2" fill={CREME} opacity=".55" transform="rotate(-22 30 30)" />
  </svg>
);

const BaristaChef = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <linearGradient id="g_baCh_face" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={SKIN_LT} />
        <stop offset="100%" stopColor={SKIN_DK} />
      </linearGradient>
      <linearGradient id="g_baCh_hat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CREME} />
        <stop offset="100%" stopColor="#E5D4B8" />
      </linearGradient>
    </defs>
    {/* toque chef volumineuse */}
    <ellipse cx="50" cy="20" rx="16" ry="11" fill="url(#g_baCh_hat)" {...STROKE_HEAVY} />
    <ellipse cx="34" cy="24" rx="11" ry="9" fill="url(#g_baCh_hat)" {...STROKE_HEAVY} />
    <ellipse cx="66" cy="24" rx="11" ry="9" fill="url(#g_baCh_hat)" {...STROKE_HEAVY} />
    <rect x="30" y="30" width="40" height="8" rx="2" fill="url(#g_baCh_hat)" {...STROKE_HEAVY} />
    {/* highlight toque */}
    <ellipse cx="42" cy="14" rx="6" ry="2" fill={CREME} opacity=".9" />
    {/* visage */}
    <circle cx="50" cy="58" r="19" fill="url(#g_baCh_face)" {...STROKE_HEAVY} stroke={SKIN_DK} />
    {/* sourcils épais */}
    <path d="M40 50 Q43 48 46 51" stroke={ESPRESSO} strokeWidth="2.3" fill="none" strokeLinecap="round" />
    <path d="M54 51 Q57 48 60 50" stroke={ESPRESSO} strokeWidth="2.3" fill="none" strokeLinecap="round" />
    {/* yeux */}
    <circle cx="43" cy="56" r="2.6" fill={ESPRESSO} />
    <circle cx="57" cy="56" r="2.6" fill={ESPRESSO} />
    <circle cx="43.8" cy="55" r="0.9" fill={CREME} />
    <circle cx="57.8" cy="55" r="0.9" fill={CREME} />
    {/* moustache imposante stylée */}
    <path d="M37 67 Q44 71 50 67 Q56 71 63 67" stroke={ESPRESSO} strokeWidth="3.4" fill={ESPRESSO} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M37 67 Q32 72 28 70" stroke={ESPRESSO} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M63 67 Q68 72 72 70" stroke={ESPRESSO} strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* col + nœud papillon */}
    <path d="M30 82 L70 82 L62 95 L38 95 Z" fill={CREME} {...STROKE_HEAVY} />
    <path d="M44 82 L40 78 L40 86 Z" fill={ESPRESSO} stroke={ESPRESSO} strokeWidth="1" />
    <path d="M56 82 L60 78 L60 86 Z" fill={ESPRESSO} stroke={ESPRESSO} strokeWidth="1" />
    <rect x="48" y="80" width="4" height="4" rx="0.5" fill={ESPRESSO} />
  </svg>
);

/* ──────────────── 9 AVATARS PREMIUM ──────────────── */

const AvChef = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <linearGradient id="g_avCh_star" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={OR_LTR} />
        <stop offset="100%" stopColor={OR} />
      </linearGradient>
      <linearGradient id="g_avCh_face" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={SKIN_LT} />
        <stop offset="100%" stopColor={SKIN_DK} />
      </linearGradient>
      <linearGradient id="g_avCh_hat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CREME} />
        <stop offset="100%" stopColor="#E5D4B8" />
      </linearGradient>
    </defs>
    {/* étoile dorée brillante */}
    <path d="M50 4 L53 12 L62 13 L55 19 L57 28 L50 23 L43 28 L45 19 L38 13 L47 12 Z" fill="url(#g_avCh_star)" stroke={OR_DK} strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="48" cy="13" r="1.6" fill={CREME} opacity=".95" />
    {/* toque haute (3 boules) */}
    <ellipse cx="50" cy="34" rx="18" ry="13" fill="url(#g_avCh_hat)" {...STROKE_HEAVY} />
    <ellipse cx="32" cy="38" rx="11" ry="10" fill="url(#g_avCh_hat)" {...STROKE_HEAVY} />
    <ellipse cx="68" cy="38" rx="11" ry="10" fill="url(#g_avCh_hat)" {...STROKE_HEAVY} />
    <rect x="28" y="44" width="44" height="8" rx="2" fill="url(#g_avCh_hat)" {...STROKE_HEAVY} />
    {/* highlight toque */}
    <ellipse cx="42" cy="28" rx="7" ry="2.5" fill={CREME} opacity=".8" />
    {/* visage */}
    <circle cx="50" cy="68" r="18" fill="url(#g_avCh_face)" {...STROKE_HEAVY} stroke={SKIN_DK} />
    {/* sourcils */}
    <path d="M40 60 Q43 58 46 61" stroke={ESPRESSO} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d="M54 61 Q57 58 60 60" stroke={ESPRESSO} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    {/* yeux */}
    <circle cx="43" cy="66" r="2.4" fill={ESPRESSO} />
    <circle cx="57" cy="66" r="2.4" fill={ESPRESSO} />
    <circle cx="43.7" cy="65" r="0.8" fill={CREME} />
    <circle cx="57.7" cy="65" r="0.8" fill={CREME} />
    {/* moustache 'à la française' */}
    <path d="M36 75 Q44 78 50 75 Q56 78 64 75" stroke={ESPRESSO} strokeWidth="3.6" fill={ESPRESSO} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M36 75 Q30 80 26 78" stroke={ESPRESSO} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M64 75 Q70 80 74 78" stroke={ESPRESSO} strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

const AvRobot = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <linearGradient id="g_robot_head" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={STONE} />
        <stop offset="100%" stopColor={STONE_DK} />
      </linearGradient>
      <linearGradient id="g_robot_body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={STONE_DK} />
        <stop offset="100%" stopColor={MOKA} />
      </linearGradient>
      <radialGradient id="g_robot_eye" cx="40%" cy="40%" r="70%">
        <stop offset="0%" stopColor={OR_LTR} />
        <stop offset="100%" stopColor={OR} />
      </radialGradient>
    </defs>
    {/* antenne */}
    <line x1="50" y1="14" x2="50" y2="22" stroke={STONE_DK} strokeWidth="3" strokeLinecap="round" />
    <circle cx="50" cy="11" r="3.8" fill={OR_LT} stroke={OR_DK} strokeWidth="1.5" />
    <circle cx="48.7" cy="9.7" r="1" fill={CREME} />
    {/* engrenage gauche animation feel */}
    <g transform="translate(18 38)">
      <circle r="7.5" fill={STONE} {...STROKE_MED} />
      <circle r="2.6" fill={ESPRESSO} />
      {[0,60,120,180,240,300].map(a=>(
        <rect key={a} x="-1.6" y="-11" width="3.2" height="3.5" fill={STONE} {...STROKE_FINE} transform={`rotate(${a})`} />
      ))}
    </g>
    {/* tête robot avec gradient */}
    <rect x="28" y="24" width="44" height="38" rx="8" fill="url(#g_robot_head)" {...STROKE_HEAVY} strokeWidth="3" />
    {/* highlight tête */}
    <rect x="32" y="27" width="36" height="4" rx="2" fill={CREME} opacity=".25" />
    {/* écran yeux brillants */}
    <rect x="34" y="32" width="14" height="11" rx="3" fill={ESPRESSO} />
    <rect x="52" y="32" width="14" height="11" rx="3" fill={ESPRESSO} />
    <circle cx="41" cy="37.5" r="2.8" fill="url(#g_robot_eye)" />
    <circle cx="59" cy="37.5" r="2.8" fill="url(#g_robot_eye)" />
    <circle cx="41.7" cy="36.5" r="0.9" fill={CREME} />
    <circle cx="59.7" cy="36.5" r="0.9" fill={CREME} />
    {/* boutons sous écrans */}
    <circle cx="36" cy="46" r="0.8" fill={OR_LT} />
    <circle cx="64" cy="46" r="0.8" fill={OR_LT} />
    {/* bouche grille */}
    <rect x="38" y="50" width="24" height="7" rx="2" fill={ESPRESSO} />
    <line x1="44" y1="50" x2="44" y2="57" stroke={STONE} strokeWidth="1.4" />
    <line x1="50" y1="50" x2="50" y2="57" stroke={STONE} strokeWidth="1.4" />
    <line x1="56" y1="50" x2="56" y2="57" stroke={STONE} strokeWidth="1.4" />
    {/* corps avec tasse */}
    <rect x="32" y="64" width="36" height="24" rx="4" fill="url(#g_robot_body)" {...STROKE_HEAVY} strokeWidth="3" />
    <circle cx="50" cy="76" r="7.5" fill={CREME} {...STROKE_MED} />
    <circle cx="50" cy="76" r="4" fill={ESPRESSO} />
    {/* vapeur tasse */}
    <path d="M50 68 Q53 64 50 60" stroke={CREME} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".8" />
    <path d="M46 68 Q43 64 46 60" stroke={CREME} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".55" />
  </svg>
);

const AvChat = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <radialGradient id="g_chat_head" cx="40%" cy="35%" r="75%">
        <stop offset="0%" stopColor={CARAMEL_LT} />
        <stop offset="100%" stopColor={MOKA} />
      </radialGradient>
      <linearGradient id="g_chat_cup" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CREME} />
        <stop offset="100%" stopColor="#E5D4B8" />
      </linearGradient>
    </defs>
    {/* tasse */}
    <ellipse cx="50" cy="80" rx="32" ry="6" fill={CREME} {...STROKE_HEAVY} />
    <path d="M22 58 L24 78 Q28 86 50 86 Q72 86 76 78 L78 58 Z" fill="url(#g_chat_cup)" {...STROKE_HEAVY} />
    <path d="M76 64 Q90 64 90 72 Q90 80 76 80" fill="none" {...STROKE_HEAVY} />
    {/* chat caramel */}
    <ellipse cx="50" cy="48" rx="22" ry="16" fill="url(#g_chat_head)" {...STROKE_HEAVY} stroke={MOKA} strokeWidth="3" />
    {/* oreilles */}
    <path d="M32 36 L30 18 L46 32 Z" fill={CARAMEL} {...STROKE_HEAVY} stroke={MOKA} />
    <path d="M68 36 L70 18 L54 32 Z" fill={CARAMEL} {...STROKE_HEAVY} stroke={MOKA} />
    <path d="M34 32 L36 24 L41 30 Z" fill="#F5C580" />
    <path d="M66 32 L64 24 L59 30 Z" fill="#F5C580" />
    {/* yeux dorés grands */}
    <ellipse cx="42" cy="46" rx="3" ry="4.2" fill={OR_LT} stroke={ESPRESSO} strokeWidth="1.4" />
    <ellipse cx="58" cy="46" rx="3" ry="4.2" fill={OR_LT} stroke={ESPRESSO} strokeWidth="1.4" />
    <ellipse cx="42" cy="46" rx="1" ry="2.8" fill={ESPRESSO} />
    <ellipse cx="58" cy="46" rx="1" ry="2.8" fill={ESPRESSO} />
    <circle cx="42.6" cy="44.5" r="0.8" fill={CREME} />
    <circle cx="58.6" cy="44.5" r="0.8" fill={CREME} />
    {/* nez */}
    <path d="M46 54 L54 54 L50 58 Z" fill={MOKA} stroke={ESPRESSO} strokeWidth="1.2" />
    {/* bouche */}
    <path d="M50 58 L50 60 Q47 62 45 60" stroke={ESPRESSO} strokeWidth="1.4" fill="none" />
    <path d="M50 58 L50 60 Q53 62 55 60" stroke={ESPRESSO} strokeWidth="1.4" fill="none" />
    {/* moustaches */}
    <line x1="30" y1="52" x2="40" y2="52" stroke={ESPRESSO} strokeWidth="1.2" strokeLinecap="round" />
    <line x1="60" y1="52" x2="70" y2="52" stroke={ESPRESSO} strokeWidth="1.2" strokeLinecap="round" />
    <line x1="30" y1="55" x2="40" y2="54" stroke={ESPRESSO} strokeWidth="1.2" strokeLinecap="round" />
    <line x1="60" y1="54" x2="70" y2="55" stroke={ESPRESSO} strokeWidth="1.2" strokeLinecap="round" />
    {/* highlight tasse */}
    <ellipse cx="32" cy="64" rx="4" ry="8" fill={CREME} opacity=".6" />
  </svg>
);

const AvRenard = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <radialGradient id="g_ren_head" cx="40%" cy="35%" r="75%">
        <stop offset="0%" stopColor="#D88E48" />
        <stop offset="100%" stopColor={MOKA} />
      </radialGradient>
    </defs>
    {/* oreilles avec intérieur crème */}
    <path d="M22 40 L26 12 L42 32 Z" fill={CARAMEL} {...STROKE_HEAVY} stroke={MOKA} />
    <path d="M78 40 L74 12 L58 32 Z" fill={CARAMEL} {...STROKE_HEAVY} stroke={MOKA} />
    <path d="M27 30 L29 18 L34 28 Z" fill={CREME} {...STROKE_FINE} />
    <path d="M73 30 L71 18 L66 28 Z" fill={CREME} {...STROKE_FINE} />
    {/* tête */}
    <path d="M22 52 Q22 30 50 28 Q78 30 78 52 Q78 74 50 82 Q22 74 22 52 Z" fill="url(#g_ren_head)" {...STROKE_HEAVY} stroke={MOKA} strokeWidth="3" />
    {/* sourcils blancs */}
    <path d="M30 44 Q34 42 38 44" stroke={CREME} strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M62 44 Q66 42 70 44" stroke={CREME} strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* museau blanc */}
    <path d="M34 60 Q34 76 50 82 Q66 76 66 60 Q58 64 50 64 Q42 64 34 60 Z" fill={CREME} {...STROKE_HEAVY} />
    {/* yeux */}
    <ellipse cx="40" cy="50" rx="2.8" ry="3.4" fill={ESPRESSO} />
    <ellipse cx="60" cy="50" rx="2.8" ry="3.4" fill={ESPRESSO} />
    <circle cx="40.7" cy="49" r="0.9" fill={CREME} />
    <circle cx="60.7" cy="49" r="0.9" fill={CREME} />
    {/* nez triangulaire */}
    <ellipse cx="50" cy="64" rx="3.6" ry="2.8" fill={ESPRESSO} />
    {/* sourire */}
    <path d="M50 67 Q50 71 45 71" stroke={ESPRESSO} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <path d="M50 67 Q50 71 55 71" stroke={ESPRESSO} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    {/* moustaches */}
    <line x1="34" y1="68" x2="26" y2="68" stroke={ESPRESSO} strokeWidth="1.3" strokeLinecap="round" />
    <line x1="66" y1="68" x2="74" y2="68" stroke={ESPRESSO} strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const AvPanda = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <radialGradient id="g_pan_head" cx="40%" cy="35%" r="75%">
        <stop offset="0%" stopColor={CREME} />
        <stop offset="100%" stopColor="#E5D4B8" />
      </radialGradient>
    </defs>
    {/* oreilles */}
    <circle cx="28" cy="30" r="11" fill={ESPRESSO} {...STROKE_HEAVY} />
    <circle cx="72" cy="30" r="11" fill={ESPRESSO} {...STROKE_HEAVY} />
    <circle cx="28" cy="30" r="5" fill={MOKA} opacity=".6" />
    <circle cx="72" cy="30" r="5" fill={MOKA} opacity=".6" />
    {/* tête avec gradient */}
    <circle cx="50" cy="52" r="29" fill="url(#g_pan_head)" {...STROKE_HEAVY} stroke={ESPRESSO} strokeWidth="3" />
    {/* taches yeux */}
    <ellipse cx="40" cy="50" rx="7.5" ry="9.5" fill={ESPRESSO} transform="rotate(-15 40 50)" />
    <ellipse cx="60" cy="50" rx="7.5" ry="9.5" fill={ESPRESSO} transform="rotate(15 60 50)" />
    {/* yeux */}
    <circle cx="40" cy="51" r="2.6" fill={CREME} />
    <circle cx="60" cy="51" r="2.6" fill={CREME} />
    <circle cx="40.5" cy="50.5" r="1.2" fill={ESPRESSO} />
    <circle cx="60.5" cy="50.5" r="1.2" fill={ESPRESSO} />
    <circle cx="41" cy="50" r="0.4" fill={CREME} />
    <circle cx="61" cy="50" r="0.4" fill={CREME} />
    {/* nez */}
    <ellipse cx="50" cy="60" rx="3" ry="2.4" fill={ESPRESSO} />
    {/* sourire avec dent */}
    <path d="M44 66 Q50 72 56 66" stroke={ESPRESSO} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    {/* petite tasse à la patte */}
    <rect x="68" y="62" width="17" height="14" rx="3" fill={CREME} {...STROKE_MED} />
    <ellipse cx="76.5" cy="65" rx="6.5" ry="2" fill={ESPRESSO} />
    <path d="M85 68 Q92 72 87 78" stroke={ESPRESSO} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M76 60 Q78 56 76 52" stroke={CREME} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".75" />
  </svg>
);

const AvDragon = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <linearGradient id="g_dr_head" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7D4220" />
        <stop offset="100%" stopColor={ESPRESSO} />
      </linearGradient>
      <radialGradient id="g_dr_eye" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor={OR_LTR} />
        <stop offset="100%" stopColor={OR} />
      </radialGradient>
    </defs>
    {/* vapeur */}
    <path d="M14 30 Q22 22 14 12" stroke={CREME} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity=".75" />
    <path d="M22 36 Q30 28 22 18" stroke={CREME} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity=".7" />
    {/* tête dragon */}
    <path d="M28 44 Q28 26 50 26 Q72 26 72 44 L68 62 L60 72 L40 72 L32 62 Z"
      fill="url(#g_dr_head)" {...STROKE_HEAVY} strokeWidth="3" />
    {/* mâchoire */}
    <path d="M40 72 Q50 78 60 72" stroke={ESPRESSO} strokeWidth="2.6" fill={MOKA} strokeLinejoin="round" />
    {/* cornes */}
    <path d="M32 28 L26 8 L42 24 Z" fill={STONE} {...STROKE_HEAVY} />
    <path d="M68 28 L74 8 L58 24 Z" fill={STONE} {...STROKE_HEAVY} />
    {/* highlights cornes */}
    <path d="M30 16 L38 22" stroke={CREME} strokeWidth="1.4" fill="none" opacity=".5" strokeLinecap="round" />
    <path d="M70 16 L62 22" stroke={CREME} strokeWidth="1.4" fill="none" opacity=".5" strokeLinecap="round" />
    {/* écailles crête */}
    <path d="M44 26 Q45 18 46 26" fill={MOKA_LT} stroke={ESPRESSO} strokeWidth="1.2" />
    <path d="M50 24 Q51 14 52 24" fill={MOKA_LT} stroke={ESPRESSO} strokeWidth="1.2" />
    <path d="M54 26 Q55 18 56 26" fill={MOKA_LT} stroke={ESPRESSO} strokeWidth="1.2" />
    {/* yeux brillants reptiliens */}
    <ellipse cx="42" cy="46" rx="3.6" ry="4" fill="url(#g_dr_eye)" stroke={ESPRESSO} strokeWidth="1.4" />
    <ellipse cx="58" cy="46" rx="3.6" ry="4" fill="url(#g_dr_eye)" stroke={ESPRESSO} strokeWidth="1.4" />
    <ellipse cx="42" cy="46" rx="1" ry="3" fill={ESPRESSO} />
    <ellipse cx="58" cy="46" rx="1" ry="3" fill={ESPRESSO} />
    <circle cx="42.6" cy="44.6" r="0.8" fill={CREME} />
    <circle cx="58.6" cy="44.6" r="0.8" fill={CREME} />
    {/* naseaux fumants */}
    <ellipse cx="44" cy="60" rx="1.7" ry="2.4" fill={ESPRESSO} />
    <ellipse cx="56" cy="60" rx="1.7" ry="2.4" fill={ESPRESSO} />
    <path d="M44 56 Q44 50 42 46" stroke={CREME} strokeWidth="1.6" fill="none" opacity=".55" strokeLinecap="round" />
    <path d="M56 56 Q56 50 58 46" stroke={CREME} strokeWidth="1.6" fill="none" opacity=".55" strokeLinecap="round" />
    {/* dents (deux crocs) */}
    <path d="M44 72 L46 78 L48 72 Z" fill={CREME} stroke={ESPRESSO} strokeWidth="1" />
    <path d="M52 72 L54 78 L56 72 Z" fill={CREME} stroke={ESPRESSO} strokeWidth="1" />
  </svg>
);

const AvOr = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <radialGradient id="g_or_face" cx="35%" cy="30%" r="80%">
        <stop offset="0%" stopColor={OR_LTR} />
        <stop offset="50%" stopColor={OR_LT} />
        <stop offset="100%" stopColor={OR_DK} />
      </radialGradient>
    </defs>
    {/* étincelles */}
    <path d="M22 22 L24 28 L30 26 L24 30 L26 36 L22 32 L18 36 L20 30 L14 26 L20 28 Z" fill={OR_LTR} opacity=".95" />
    <path d="M78 28 L80 33 L84 32 L80 35 L82 39 L78 36 L74 39 L76 35 L72 32 L76 33 Z" fill={OR_LTR} opacity=".95" />
    <path d="M86 64 L87 68 L91 67 L87 69 L88 73 L86 71 L84 73 L85 69 L81 67 L85 68 Z" fill={OR_LTR} opacity=".85" />
    <path d="M14 70 L15 73 L18 72.5 L15.5 74 L16 77 L14 75.5 L12 77 L13 74 L10 72.5 L13 73 Z" fill={OR_LTR} opacity=".75" />
    {/* médaille avec gradient radial */}
    <circle cx="50" cy="54" r="29" fill="url(#g_or_face)" {...STROKE_HEAVY} stroke={OR_DK} strokeWidth="3.5" />
    {/* anneau intérieur */}
    <circle cx="50" cy="54" r="24" fill="none" stroke={OR_LTR} strokeWidth="1.4" opacity=".7" />
    <circle cx="50" cy="54" r="20" fill="none" stroke={OR_DK} strokeWidth="0.9" opacity=".4" />
    {/* reflets de relief marqués */}
    <ellipse cx="38" cy="42" rx="11" ry="15" fill={OR_LTR} opacity=".65" transform="rotate(-25 38 42)" />
    <ellipse cx="62" cy="64" rx="8" ry="12" fill={OR_DK} opacity=".4" transform="rotate(20 62 64)" />
    {/* yeux fermés style profil pièce */}
    <path d="M37 52 Q42 46 47 52" stroke={OR_DK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <path d="M53 52 Q58 46 63 52" stroke={OR_DK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    {/* sourire serein */}
    <path d="M41 64 Q50 71 59 64" stroke={OR_DK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    {/* sparkles bouche */}
    <circle cx="68" cy="58" r="1.6" fill={CREME} opacity=".95" />
    <circle cx="34" cy="64" r="1.2" fill={CREME} opacity=".75" />
  </svg>
);

const AvLegende = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <linearGradient id="g_leg_crown" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={OR_LTR} />
        <stop offset="100%" stopColor={OR_DK} />
      </linearGradient>
      <linearGradient id="g_leg_cup" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CREME} />
        <stop offset="100%" stopColor="#E5D4B8" />
      </linearGradient>
    </defs>
    {/* couronne avec gradient */}
    <path d="M26 28 L34 12 L40 26 L50 8 L60 26 L66 12 L74 28 L74 38 L26 38 Z" fill="url(#g_leg_crown)" {...STROKE_HEAVY} stroke={OR_DK} strokeWidth="2.6" strokeLinejoin="round" />
    {/* gemmes */}
    <circle cx="34" cy="20" r="3" fill={CREME} stroke={OR_DK} strokeWidth="1.1" />
    <circle cx="34" cy="20" r="1" fill={ESPRESSO} opacity=".5" />
    <circle cx="50" cy="14" r="3.6" fill={CREME} stroke={OR_DK} strokeWidth="1.1" />
    <circle cx="50" cy="14" r="1.3" fill={ESPRESSO} opacity=".5" />
    <circle cx="66" cy="20" r="3" fill={CREME} stroke={OR_DK} strokeWidth="1.1" />
    <circle cx="66" cy="20" r="1" fill={ESPRESSO} opacity=".5" />
    <rect x="26" y="36" width="48" height="6" fill={OR} stroke={OR_DK} strokeWidth="1.5" />
    {/* highlight bandeau */}
    <rect x="28" y="37" width="32" height="1.5" fill={OR_LTR} opacity=".8" />
    {/* tasse de café avec aura */}
    <path d="M70 60 Q84 60 84 68 Q84 76 70 76" fill="none" {...STROKE_HEAVY} strokeWidth="3.5" />
    <path d="M22 50 L72 50 L70 82 Q70 88 60 88 L34 88 Q24 88 24 82 Z" fill="url(#g_leg_cup)" {...STROKE_HEAVY} strokeWidth="3" />
    {/* café fumant à la surface */}
    <ellipse cx="47" cy="56" rx="22" ry="5" fill={ESPRESSO} />
    <ellipse cx="42" cy="54.5" rx="6" ry="1.8" fill={MOKA_LT} opacity=".8" />
    {/* vapeur royale */}
    <path d="M40 48 Q44 40 40 32" stroke={CREME} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".85" />
    <path d="M50 48 Q54 38 50 28" stroke={CREME} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity=".95" />
    <path d="M60 48 Q64 40 60 32" stroke={CREME} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".85" />
    {/* aura dorée autour de la tasse */}
    <path d="M22 50 L72 50 L70 82 Q70 88 60 88 L34 88 Q24 88 24 82 Z" fill="none" stroke={OR_LTR} strokeWidth="2.4" opacity=".7" />
    <path d="M18 50 L76 50 L74 84 Q74 92 62 92 L32 92 Q20 92 20 84 Z" fill="none" stroke={OR_LTR} strokeWidth="1.2" opacity=".4" />
    {/* étoiles flottantes */}
    <circle cx="14" cy="54" r="1.8" fill={OR_LTR} />
    <circle cx="86" cy="54" r="1.8" fill={OR_LTR} />
    <circle cx="12" cy="78" r="1.6" fill={OR_LTR} />
    <circle cx="88" cy="78" r="1.6" fill={OR_LTR} />
    {/* highlight tasse */}
    <ellipse cx="32" cy="62" rx="3.5" ry="10" fill={CREME} opacity=".7" />
  </svg>
);

const AvEternel = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <radialGradient id="g_etr_face" cx="40%" cy="35%" r="80%">
        <stop offset="0%" stopColor={OR_LTR} />
        <stop offset="50%" stopColor={OR_LT} />
        <stop offset="100%" stopColor={OR_DK} />
      </radialGradient>
    </defs>
    {/* halos concentriques */}
    <circle cx="50" cy="50" r="46" fill="none" stroke={OR_LTR} strokeWidth="1.2" opacity=".35" />
    <circle cx="50" cy="50" r="40" fill="none" stroke={OR_LTR} strokeWidth="1.6" opacity=".6" />
    <circle cx="50" cy="50" r="34" fill="none" stroke={OR_LTR} strokeWidth="2.4" opacity=".85" />
    {/* étoiles autour */}
    <circle cx="22" cy="22" r="2" fill={OR_LTR} />
    <circle cx="78" cy="22" r="1.8" fill={OR_LTR} />
    <circle cx="20" cy="78" r="1.8" fill={OR_LTR} />
    <circle cx="80" cy="80" r="2" fill={OR_LTR} />
    <circle cx="50" cy="10" r="1.5" fill={OR_LTR} />
    <circle cx="50" cy="90" r="1.5" fill={OR_LTR} />
    <circle cx="10" cy="50" r="1.3" fill={OR_LTR} />
    <circle cx="90" cy="50" r="1.3" fill={OR_LTR} />
    {/* visage doré central */}
    <circle cx="50" cy="50" r="25" fill="url(#g_etr_face)" {...STROKE_HEAVY} stroke={OR_DK} strokeWidth="3" />
    {/* anneau intérieur */}
    <circle cx="50" cy="50" r="20" fill="none" stroke={OR_LTR} strokeWidth="1.2" opacity=".7" />
    {/* reflet relief */}
    <ellipse cx="42" cy="42" rx="9" ry="12" fill={OR_LTR} opacity=".7" transform="rotate(-25 42 42)" />
    <ellipse cx="40" cy="40" rx="4" ry="6" fill={CREME} opacity=".6" transform="rotate(-25 40 40)" />
    {/* symbole ∞ */}
    <path d="M 36 50 C 36 44 42 44 45 47 L 50 52 L 55 47 C 58 44 64 44 64 50 C 64 56 58 56 55 53 L 50 48 L 45 53 C 42 56 36 56 36 50 Z"
      fill={CREME} stroke={OR_DK} strokeWidth="1.6" strokeLinejoin="round" opacity=".95" />
    {/* étincelles bonus */}
    <path d="M 70 32 L 71 35 L 74 36 L 71 37 L 70 40 L 69 37 L 66 36 L 69 35 Z" fill={CREME} />
    <path d="M 28 68 L 29 70.5 L 31 71 L 29 72 L 28 74.5 L 27 72 L 25 71 L 27 70.5 Z" fill={CREME} />
  </svg>
);

/* Legacy — Cosmos (avatar_aurore) gardé pour profils existants */
const Cosmos = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <defs>
      <radialGradient id="cosmosBg" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stopColor="#5B2A9C" />
        <stop offset="55%" stopColor="#1A0840" />
        <stop offset="100%" stopColor="#070220" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="42" fill="url(#cosmosBg)" />
    <circle cx="34" cy="34" r="1.4" fill="#E8D5FF" />
    <circle cx="66" cy="40" r="1" fill={OR_LTR} />
    <circle cx="44" cy="62" r="1" fill="#A8D5FF" />
    <circle cx="62" cy="66" r="1.4" fill="#E8D5FF" />
    <path d="M50 30 L52 38 L60 40 L52 42 L50 50 L48 42 L40 40 L48 38 Z" fill={OR_LTR} opacity=".9" />
  </svg>
);

/* ──────────────── ROUTER ──────────────── */

export function AvatarArtwork({ art }){
  switch(art){
    /* base */
    case 'tasse':        return <Tasse />;
    case 'cookie':       return <Cookie />;
    case 'baristaH':     return <BaristaH />;
    case 'baristaF':     return <BaristaF />;
    case 'theiere':      return <Theiere />;
    case 'croissant':    return <Croissant />;
    case 'latteArt':     return <LatteArt />;
    case 'grain':        return <Grain />;
    case 'muffin':       return <Muffin />;
    case 'donut':        return <Donut />;
    case 'cookieKawaii': return <CookieKawaii />;
    case 'baristaChef':  return <BaristaChef />;
    /* premium */
    case 'avChef':    return <AvChef />;
    case 'avRobot':   return <AvRobot />;
    case 'avChat':    return <AvChat />;
    case 'avRenard':  return <AvRenard />;
    case 'avPanda':   return <AvPanda />;
    case 'avDragon':  return <AvDragon />;
    case 'avOr':      return <AvOr />;
    case 'avLegende': return <AvLegende />;
    case 'avEternel': return <AvEternel />;
    /* legacy */
    case 'cosmos':    return <Cosmos />;
    default:          return <Cookie />;
  }
}

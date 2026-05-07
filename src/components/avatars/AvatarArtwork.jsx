/* ════════════════════════════════════════════════════
   AvatarArtwork — illustrations SVG des 12 avatars de base + 8 premium
   ────────────────────────────────────────────────────
   Tous les SVG utilisent le viewBox 0 0 100 100, dessinés à la main dans
   la palette café/cookie/caramel/or (PAS de rouge ni de vert).
   Le fond gradient est appliqué par AvatarFigure (rond ou carré), le SVG
   ne dessine QUE le contenu central.

   Ajouter un nouvel avatar :
     1) Ajouter une entrée { id, art:'monArt', name, bg } dans data/avatars.js
     2) Ajouter `case 'monArt': return <MonSvg/>;` dans le switch ci-dessous
     3) Définir le composant SVG plus haut dans ce fichier
═══════════════════════════════════════════════════════ */

const SW = '#FAF0E0';      // crème claire (mousse, contrastes clairs)
const COFFEE = '#2A1606';  // espresso brûlé (lignes foncées)
const SKIN = '#E8C8A4';    // teint visage
const SKIN_DK = '#B8865E'; // ombre visage

/* ──────────────── 12 AVATARS DE BASE ──────────────── */

const Tasse = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* vapeur */}
    <path d="M40 22 Q43 16 40 10" stroke={SW} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".75" />
    <path d="M50 24 Q53 16 50 8"  stroke={SW} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".75" />
    <path d="M60 22 Q63 16 60 10" stroke={SW} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".75" />
    {/* anse */}
    <ellipse cx="74" cy="58" rx="9" ry="11" fill="none" stroke="#FAF0E0" strokeWidth="4.5" />
    {/* corps tasse */}
    <rect x="22" y="40" width="50" height="42" rx="6" fill="#FAF0E0" stroke={COFFEE} strokeWidth="2" />
    {/* café */}
    <ellipse cx="47" cy="46" rx="22" ry="5" fill="#2A1606" />
    {/* soucoupe */}
    <ellipse cx="47" cy="86" rx="32" ry="5" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.5" />
  </svg>
);

const Cookie = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <circle cx="50" cy="50" r="34" fill="#B86A28" stroke="#5A2D10" strokeWidth="2" />
    <ellipse cx="50" cy="50" rx="34" ry="4" fill="#A05818" opacity=".4" />
    <circle cx="38" cy="42" r="5" fill="#3D1C02" />
    <circle cx="60" cy="40" r="4.5" fill="#3D1C02" />
    <circle cx="55" cy="60" r="5" fill="#3D1C02" />
    <circle cx="40" cy="60" r="4" fill="#3D1C02" />
    <circle cx="63" cy="56" r="3.5" fill="#3D1C02" />
    {/* reflet */}
    <ellipse cx="40" cy="38" rx="9" ry="4" fill="rgba(255,235,200,.45)" transform="rotate(-25 40 38)" />
  </svg>
);

const BaristaH = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* casquette */}
    <path d="M30 38 L70 38 L72 30 L28 30 Z" fill="#2A1606" stroke={COFFEE} strokeWidth="1.5" />
    <path d="M30 38 Q50 44 70 38 L72 40 L28 40 Z" fill="#3D2010" />
    {/* visage */}
    <circle cx="50" cy="52" r="16" fill={SKIN} stroke={SKIN_DK} strokeWidth="1.5" />
    {/* yeux */}
    <circle cx="44" cy="52" r="1.8" fill={COFFEE} />
    <circle cx="56" cy="52" r="1.8" fill={COFFEE} />
    {/* sourire */}
    <path d="M44 60 Q50 64 56 60" stroke={COFFEE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    {/* tablier */}
    <path d="M30 78 L70 78 L65 92 L35 92 Z" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.5" />
    <line x1="40" y1="68" x2="40" y2="78" stroke="#FAF0E0" strokeWidth="2" />
    <line x1="60" y1="68" x2="60" y2="78" stroke="#FAF0E0" strokeWidth="2" />
  </svg>
);

const BaristaF = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* chignon */}
    <circle cx="50" cy="28" r="9" fill="#3D2010" />
    {/* cheveux */}
    <path d="M34 50 Q34 36 50 34 Q66 36 66 50 L66 56 L34 56 Z" fill="#3D2010" />
    {/* visage */}
    <circle cx="50" cy="54" r="15" fill={SKIN} stroke={SKIN_DK} strokeWidth="1.5" />
    {/* yeux */}
    <circle cx="44" cy="54" r="1.8" fill={COFFEE} />
    <circle cx="56" cy="54" r="1.8" fill={COFFEE} />
    {/* sourire */}
    <path d="M44 62 Q50 66 56 62" stroke={COFFEE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    {/* tablier */}
    <path d="M30 78 L70 78 L65 92 L35 92 Z" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.5" />
    <line x1="40" y1="70" x2="40" y2="78" stroke="#FAF0E0" strokeWidth="2" />
    <line x1="60" y1="70" x2="60" y2="78" stroke="#FAF0E0" strokeWidth="2" />
  </svg>
);

const Theiere = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* corps */}
    <ellipse cx="50" cy="60" rx="26" ry="20" fill="#D4A017" stroke={COFFEE} strokeWidth="2" />
    {/* couvercle */}
    <rect x="38" y="38" width="24" height="6" rx="2" fill="#D4A017" stroke={COFFEE} strokeWidth="1.5" />
    <circle cx="50" cy="34" r="3" fill="#D4A017" stroke={COFFEE} strokeWidth="1.5" />
    {/* bec */}
    <path d="M76 56 L88 50 L88 56 L78 64 Z" fill="#D4A017" stroke={COFFEE} strokeWidth="1.5" />
    {/* anse */}
    <path d="M24 50 Q14 60 24 70" stroke={COFFEE} strokeWidth="3.2" fill="none" />
    {/* reflet */}
    <ellipse cx="42" cy="52" rx="10" ry="5" fill="rgba(255,250,220,.4)" transform="rotate(-20 42 52)" />
  </svg>
);

const Croissant = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <path d="M20 60 Q22 28 50 26 Q78 28 80 60 Q72 50 64 50 Q56 36 50 36 Q44 36 36 50 Q28 50 20 60 Z"
      fill="#E5B040" stroke="#7D4E1F" strokeWidth="2" strokeLinejoin="round" />
    {/* stries */}
    <path d="M36 50 Q38 60 32 64" stroke="#7D4E1F" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".6" />
    <path d="M50 36 Q50 50 44 60" stroke="#7D4E1F" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".6" />
    <path d="M64 50 Q62 60 68 64" stroke="#7D4E1F" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".6" />
    {/* reflet */}
    <ellipse cx="50" cy="40" rx="14" ry="3" fill="rgba(255,240,200,.4)" />
  </svg>
);

const LatteArt = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* tasse vue dessus */}
    <circle cx="50" cy="50" r="32" fill="#FAF0E0" stroke={COFFEE} strokeWidth="2" />
    <circle cx="50" cy="50" r="28" fill="#7D4E1F" />
    {/* cœur en mousse */}
    <path d="M50 60 Q40 50 40 44 Q40 38 46 38 Q50 38 50 42 Q50 38 54 38 Q60 38 60 44 Q60 50 50 60 Z"
      fill="#FAF0E0" />
    {/* feuille décorative */}
    <path d="M50 40 Q50 50 50 58" stroke="#7D4E1F" strokeWidth="1.2" fill="none" />
  </svg>
);

const Grain = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <ellipse cx="50" cy="50" rx="22" ry="32" fill="#5A2D10" stroke="#1A0A04" strokeWidth="2" transform="rotate(-15 50 50)" />
    {/* sillon central */}
    <path d="M44 22 Q50 50 44 78" stroke="#1A0A04" strokeWidth="2.5" fill="none" transform="rotate(-15 50 50)" strokeLinecap="round" />
    {/* reflet */}
    <ellipse cx="38" cy="38" rx="6" ry="11" fill="rgba(180,120,60,.35)" transform="rotate(-15 38 38)" />
  </svg>
);

const Muffin = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* tête bombée */}
    <path d="M22 52 Q20 32 50 30 Q80 32 78 52 Q70 56 60 52 Q50 56 40 52 Q30 56 22 52 Z"
      fill="#7D4E1F" stroke={COFFEE} strokeWidth="2" />
    {/* pépites */}
    <circle cx="36" cy="42" r="2.4" fill="#1A0A00" />
    <circle cx="50" cy="38" r="2.6" fill="#1A0A00" />
    <circle cx="64" cy="42" r="2.4" fill="#1A0A00" />
    <circle cx="44" cy="48" r="2" fill="#1A0A00" />
    <circle cx="58" cy="48" r="2" fill="#1A0A00" />
    {/* papier strié */}
    <path d="M22 52 L26 82 L74 82 L78 52 Z" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.5" />
    <line x1="32" y1="56" x2="33" y2="80" stroke={COFFEE} strokeWidth="1" opacity=".4" />
    <line x1="42" y1="55" x2="42" y2="80" stroke={COFFEE} strokeWidth="1" opacity=".4" />
    <line x1="50" y1="55" x2="50" y2="80" stroke={COFFEE} strokeWidth="1" opacity=".4" />
    <line x1="58" y1="55" x2="58" y2="80" stroke={COFFEE} strokeWidth="1" opacity=".4" />
    <line x1="68" y1="56" x2="67" y2="80" stroke={COFFEE} strokeWidth="1" opacity=".4" />
  </svg>
);

const Donut = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* base */}
    <circle cx="50" cy="50" r="32" fill="#B88040" stroke="#5A2D10" strokeWidth="2" />
    {/* glaçage */}
    <path d="M50 18 Q82 18 82 50 Q82 56 76 56 Q70 50 60 56 Q50 50 40 56 Q30 50 24 56 Q18 56 18 50 Q18 18 50 18 Z"
      fill="#FAF0E0" stroke="#5A2D10" strokeWidth="1.2" />
    {/* trou */}
    <circle cx="50" cy="50" r="11" fill="#7D4E1F" stroke="#5A2D10" strokeWidth="1.5" />
    {/* sprinkles */}
    <rect x="34" y="30" width="5" height="2" rx="1" fill="#D4A017" transform="rotate(20 36 31)" />
    <rect x="60" y="32" width="5" height="2" rx="1" fill="#7D4E1F" transform="rotate(-30 62 33)" />
    <rect x="28" y="42" width="5" height="2" rx="1" fill="#C17F3C" transform="rotate(40 30 43)" />
    <rect x="68" y="44" width="5" height="2" rx="1" fill="#D4A017" transform="rotate(15 70 45)" />
    <rect x="62" y="62" width="5" height="2" rx="1" fill="#7D4E1F" transform="rotate(-40 64 63)" />
    <rect x="32" y="64" width="5" height="2" rx="1" fill="#C17F3C" transform="rotate(35 34 65)" />
  </svg>
);

const CookieKawaii = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    <circle cx="50" cy="52" r="34" fill="#B86A28" stroke="#5A2D10" strokeWidth="2" />
    {/* chips */}
    <circle cx="32" cy="38" r="3.5" fill="#3D1C02" />
    <circle cx="68" cy="38" r="3.5" fill="#3D1C02" />
    <circle cx="50" cy="74" r="3" fill="#3D1C02" />
    {/* yeux fermés contents */}
    <path d="M38 50 Q42 46 46 50" stroke={COFFEE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d="M54 50 Q58 46 62 50" stroke={COFFEE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    {/* joues roses (gardé tons caramel/cookie) */}
    <ellipse cx="34" cy="60" rx="4" ry="2.5" fill="rgba(212,160,23,.55)" />
    <ellipse cx="66" cy="60" rx="4" ry="2.5" fill="rgba(212,160,23,.55)" />
    {/* bouche */}
    <path d="M44 64 Q50 70 56 64" stroke={COFFEE} strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

const BaristaChef = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* toque chef */}
    <ellipse cx="50" cy="22" rx="14" ry="10" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.5" />
    <ellipse cx="38" cy="26" rx="9" ry="8" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.5" />
    <ellipse cx="62" cy="26" rx="9" ry="8" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.5" />
    <rect x="34" y="32" width="32" height="6" rx="1" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.5" />
    {/* visage */}
    <circle cx="50" cy="56" r="17" fill={SKIN} stroke={SKIN_DK} strokeWidth="1.5" />
    {/* yeux */}
    <circle cx="44" cy="54" r="1.8" fill={COFFEE} />
    <circle cx="56" cy="54" r="1.8" fill={COFFEE} />
    {/* moustache */}
    <path d="M40 64 Q44 66 50 64 Q56 66 60 64" stroke={COFFEE} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <path d="M40 64 Q38 67 36 66" stroke={COFFEE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d="M60 64 Q62 67 64 66" stroke={COFFEE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    {/* col */}
    <path d="M34 80 L66 80 L62 92 L38 92 Z" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.5" />
  </svg>
);

/* ──────────────── 8 AVATARS PREMIUM ──────────────── */

const AvChef = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* étoile au-dessus */}
    <path d="M50 8 L52 14 L58 14 L53 18 L55 24 L50 20 L45 24 L47 18 L42 14 L48 14 Z" fill="#F0C050" stroke="#7D4E1F" strokeWidth="1" />
    {/* toque */}
    <ellipse cx="50" cy="32" rx="16" ry="11" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.5" />
    <ellipse cx="36" cy="36" rx="9" ry="8" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.5" />
    <ellipse cx="64" cy="36" rx="9" ry="8" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.5" />
    <rect x="32" y="42" width="36" height="6" rx="1" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.5" />
    {/* visage */}
    <circle cx="50" cy="64" r="16" fill={SKIN} stroke={SKIN_DK} strokeWidth="1.5" />
    <circle cx="44" cy="62" r="1.8" fill={COFFEE} />
    <circle cx="56" cy="62" r="1.8" fill={COFFEE} />
    {/* moustache imposante */}
    <path d="M38 72 Q44 74 50 72 Q56 74 62 72" stroke={COFFEE} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M38 72 Q34 77 30 75" stroke={COFFEE} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <path d="M62 72 Q66 77 70 75" stroke={COFFEE} strokeWidth="2.6" fill="none" strokeLinecap="round" />
  </svg>
);

const AvRobot = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* antenne */}
    <line x1="50" y1="14" x2="50" y2="22" stroke="#C8B89C" strokeWidth="2.5" />
    <circle cx="50" cy="12" r="3" fill="#F0C050" />
    {/* engrenage gauche */}
    <g transform="translate(20 36)">
      <circle r="6" fill="#C8B89C" stroke={COFFEE} strokeWidth="1.5" />
      <circle r="2" fill={COFFEE} />
      {[0,60,120,180,240,300].map(a=>(
        <rect key={a} x="-1.5" y="-9" width="3" height="3" fill="#C8B89C" stroke={COFFEE} strokeWidth=".8" transform={`rotate(${a})`} />
      ))}
    </g>
    {/* tête robot */}
    <rect x="30" y="24" width="40" height="36" rx="6" fill="#C8B89C" stroke={COFFEE} strokeWidth="2" />
    {/* yeux écran */}
    <rect x="36" y="34" width="10" height="8" rx="2" fill="#2A1606" />
    <rect x="54" y="34" width="10" height="8" rx="2" fill="#2A1606" />
    <circle cx="41" cy="38" r="2" fill="#F0C050" />
    <circle cx="59" cy="38" r="2" fill="#F0C050" />
    {/* bouche grille */}
    <rect x="40" y="48" width="20" height="6" rx="1" fill={COFFEE} />
    <line x1="45" y1="48" x2="45" y2="54" stroke="#C8B89C" strokeWidth="1" />
    <line x1="50" y1="48" x2="50" y2="54" stroke="#C8B89C" strokeWidth="1" />
    <line x1="55" y1="48" x2="55" y2="54" stroke="#C8B89C" strokeWidth="1" />
    {/* corps avec tasse */}
    <rect x="34" y="62" width="32" height="22" rx="3" fill="#A89878" stroke={COFFEE} strokeWidth="2" />
    <circle cx="50" cy="73" r="6" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.2" />
    <circle cx="50" cy="73" r="3" fill="#2A1606" />
  </svg>
);

const AvChat = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* tasse */}
    <ellipse cx="50" cy="78" rx="30" ry="6" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.5" />
    <path d="M22 56 L24 76 Q26 84 50 84 Q74 84 76 76 L78 56 Z" fill="#FAF0E0" stroke={COFFEE} strokeWidth="2" />
    {/* anse */}
    <ellipse cx="80" cy="66" rx="6" ry="9" fill="none" stroke={COFFEE} strokeWidth="3" />
    {/* chat caramel qui dépasse */}
    <ellipse cx="50" cy="48" rx="18" ry="14" fill="#C17F3C" stroke="#7D4E1F" strokeWidth="1.8" />
    {/* oreilles */}
    <path d="M36 38 L34 26 L44 34 Z" fill="#C17F3C" stroke="#7D4E1F" strokeWidth="1.5" />
    <path d="M64 38 L66 26 L56 34 Z" fill="#C17F3C" stroke="#7D4E1F" strokeWidth="1.5" />
    <path d="M37 35 L38 30 L42 33 Z" fill="#7D4E1F" />
    <path d="M63 35 L62 30 L58 33 Z" fill="#7D4E1F" />
    {/* yeux */}
    <ellipse cx="44" cy="46" rx="2" ry="3" fill={COFFEE} />
    <ellipse cx="56" cy="46" rx="2" ry="3" fill={COFFEE} />
    {/* nez */}
    <path d="M48 52 L52 52 L50 55 Z" fill="#7D4E1F" />
    {/* moustaches */}
    <line x1="34" y1="52" x2="42" y2="52" stroke={COFFEE} strokeWidth="1" />
    <line x1="58" y1="52" x2="66" y2="52" stroke={COFFEE} strokeWidth="1" />
    <line x1="34" y1="55" x2="42" y2="54" stroke={COFFEE} strokeWidth="1" />
    <line x1="58" y1="54" x2="66" y2="55" stroke={COFFEE} strokeWidth="1" />
  </svg>
);

const AvRenard = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* oreilles */}
    <path d="M22 38 L26 16 L40 30 Z" fill="#C17F3C" stroke={COFFEE} strokeWidth="1.5" />
    <path d="M78 38 L74 16 L60 30 Z" fill="#C17F3C" stroke={COFFEE} strokeWidth="1.5" />
    <path d="M26 30 L29 22 L34 28 Z" fill="#FAF0E0" />
    <path d="M74 30 L71 22 L66 28 Z" fill="#FAF0E0" />
    {/* tête */}
    <path d="M22 50 Q22 32 50 30 Q78 32 78 50 Q78 70 50 78 Q22 70 22 50 Z" fill="#C17F3C" stroke={COFFEE} strokeWidth="2" />
    {/* museau blanc */}
    <path d="M36 60 Q36 72 50 78 Q64 72 64 60 Q56 64 50 64 Q44 64 36 60 Z" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.2" />
    {/* yeux */}
    <ellipse cx="40" cy="50" rx="2.5" ry="3" fill={COFFEE} />
    <ellipse cx="60" cy="50" rx="2.5" ry="3" fill={COFFEE} />
    {/* nez */}
    <ellipse cx="50" cy="64" rx="3" ry="2.4" fill={COFFEE} />
    {/* moustaches */}
    <line x1="36" y1="68" x2="28" y2="68" stroke={COFFEE} strokeWidth="1" />
    <line x1="64" y1="68" x2="72" y2="68" stroke={COFFEE} strokeWidth="1" />
  </svg>
);

const AvPanda = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* oreilles */}
    <circle cx="28" cy="30" r="9" fill="#1A1206" />
    <circle cx="72" cy="30" r="9" fill="#1A1206" />
    {/* tête */}
    <circle cx="50" cy="50" r="26" fill="#FAF0E0" stroke="#3D2010" strokeWidth="1.5" />
    {/* taches yeux */}
    <ellipse cx="40" cy="48" rx="6" ry="8" fill="#1A1206" transform="rotate(-15 40 48)" />
    <ellipse cx="60" cy="48" rx="6" ry="8" fill="#1A1206" transform="rotate(15 60 48)" />
    {/* yeux */}
    <circle cx="40" cy="49" r="2" fill="#FAF0E0" />
    <circle cx="60" cy="49" r="2" fill="#FAF0E0" />
    {/* nez */}
    <ellipse cx="50" cy="58" rx="2.5" ry="2" fill="#1A1206" />
    {/* sourire */}
    <path d="M44 64 Q50 68 56 64" stroke="#1A1206" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    {/* petite tasse à la patte */}
    <rect x="68" y="62" width="14" height="11" rx="2" fill="#FAF0E0" stroke={COFFEE} strokeWidth="1.2" />
    <ellipse cx="75" cy="64" rx="5" ry="1.4" fill="#2A1606" />
    <path d="M82 66 Q86 68 84 72" stroke={COFFEE} strokeWidth="1.5" fill="none" />
  </svg>
);

const AvDragon = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* vapeur */}
    <path d="M16 32 Q22 24 16 16" stroke={SW} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".75" />
    <path d="M22 38 Q28 30 22 22" stroke={SW} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".7" />
    {/* tête dragon */}
    <path d="M30 44 Q30 30 50 30 Q70 30 70 44 L66 60 L60 70 L40 70 L34 60 Z"
      fill="#5A3520" stroke={COFFEE} strokeWidth="2" strokeLinejoin="round" />
    {/* cornes */}
    <path d="M34 30 L30 18 L40 26 Z" fill="#C8B89C" stroke={COFFEE} strokeWidth="1.5" />
    <path d="M66 30 L70 18 L60 26 Z" fill="#C8B89C" stroke={COFFEE} strokeWidth="1.5" />
    {/* écailles */}
    <path d="M50 30 Q48 22 50 16 Q52 22 50 30" fill="#A0784E" />
    {/* yeux brillants */}
    <ellipse cx="42" cy="46" rx="3" ry="3.5" fill="#F0C050" />
    <ellipse cx="58" cy="46" rx="3" ry="3.5" fill="#F0C050" />
    <circle cx="42" cy="46" r="1.4" fill={COFFEE} />
    <circle cx="58" cy="46" r="1.4" fill={COFFEE} />
    {/* naseaux fumants */}
    <ellipse cx="44" cy="60" rx="1.5" ry="2" fill={COFFEE} />
    <ellipse cx="56" cy="60" rx="1.5" ry="2" fill={COFFEE} />
    <path d="M44 56 Q44 50 42 46" stroke={SW} strokeWidth="1.4" fill="none" opacity=".5" />
    <path d="M56 56 Q56 50 58 46" stroke={SW} strokeWidth="1.4" fill="none" opacity=".5" />
    {/* bouche */}
    <path d="M40 70 Q50 76 60 70" stroke={COFFEE} strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </svg>
);

const AvOr = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* étincelles */}
    <path d="M22 22 L24 28 L30 26 L24 30 L26 36 L22 32 L18 36 L20 30 L14 26 L20 28 Z" fill="#FFE89A" opacity=".85" />
    <path d="M78 28 L80 33 L84 32 L80 35 L82 39 L78 36 L74 39 L76 35 L72 32 L76 33 Z" fill="#FFE89A" opacity=".85" />
    {/* visage doré */}
    <circle cx="50" cy="54" r="26" fill="#F0C050" stroke="#8B6914" strokeWidth="2" />
    {/* reflets */}
    <ellipse cx="40" cy="42" rx="9" ry="13" fill="#FFE89A" opacity=".55" transform="rotate(-25 40 42)" />
    <ellipse cx="62" cy="62" rx="6" ry="10" fill="#8B6914" opacity=".35" transform="rotate(20 62 62)" />
    {/* yeux fermés style vieille pièce */}
    <path d="M38 52 Q42 48 46 52" stroke="#5A4014" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M54 52 Q58 48 62 52" stroke="#5A4014" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* sourire serein */}
    <path d="M42 64 Q50 68 58 64" stroke="#5A4014" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    {/* sparkle bouche */}
    <circle cx="68" cy="58" r="1.2" fill="#FFFFFF" opacity=".9" />
  </svg>
);

const AvLegende = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* couronne */}
    <path d="M28 28 L34 18 L40 26 L50 14 L60 26 L66 18 L72 28 L72 38 L28 38 Z" fill="#F0C050" stroke="#5A4014" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="34" cy="22" r="2.5" fill="#FFFFFF" stroke="#5A4014" strokeWidth=".8" />
    <circle cx="50" cy="18" r="3" fill="#FFFFFF" stroke="#5A4014" strokeWidth=".8" />
    <circle cx="66" cy="22" r="2.5" fill="#FFFFFF" stroke="#5A4014" strokeWidth=".8" />
    <rect x="28" y="36" width="44" height="4" fill="#D4A017" stroke="#5A4014" strokeWidth="1" />
    {/* cookie magique */}
    <circle cx="50" cy="62" r="20" fill="#B86A28" stroke="#5A2D10" strokeWidth="2" />
    <circle cx="42" cy="56" r="3" fill="#3D1C02" />
    <circle cx="58" cy="56" r="3" fill="#3D1C02" />
    <circle cx="50" cy="68" r="2.5" fill="#3D1C02" />
    {/* aura */}
    <circle cx="50" cy="62" r="20" fill="none" stroke="#FFE89A" strokeWidth="1.6" opacity=".7" />
    <circle cx="50" cy="62" r="24" fill="none" stroke="#FFE89A" strokeWidth=".8" opacity=".4" />
    {/* étoiles flottantes */}
    <circle cx="22" cy="52" r="1.4" fill="#FFE89A" />
    <circle cx="78" cy="52" r="1.4" fill="#FFE89A" />
    <circle cx="22" cy="76" r="1.4" fill="#FFE89A" />
    <circle cx="78" cy="76" r="1.4" fill="#FFE89A" />
  </svg>
);

/* avatar_eternel — Halo infini scintillant (récompense level 10) */
const AvEternel = () => (
  <svg viewBox="0 0 100 100" style={{ width:'100%', height:'100%' }}>
    {/* Halos concentriques */}
    <circle cx="50" cy="50" r="44" fill="none" stroke="#FFE89A" strokeWidth=".8" opacity=".3" />
    <circle cx="50" cy="50" r="38" fill="none" stroke="#FFE89A" strokeWidth="1.2" opacity=".5" />
    <circle cx="50" cy="50" r="32" fill="none" stroke="#FFE89A" strokeWidth="1.8" opacity=".75" />
    {/* Étoiles autour */}
    <circle cx="22" cy="22" r="1.6" fill="#FFE89A" />
    <circle cx="78" cy="22" r="1.4" fill="#FFE89A" />
    <circle cx="20" cy="78" r="1.4" fill="#FFE89A" />
    <circle cx="80" cy="80" r="1.6" fill="#FFE89A" />
    <circle cx="50" cy="12" r="1.2" fill="#FFE89A" />
    <circle cx="50" cy="88" r="1.2" fill="#FFE89A" />
    <circle cx="12" cy="50" r="1" fill="#FFE89A" />
    <circle cx="88" cy="50" r="1" fill="#FFE89A" />
    {/* Visage doré central */}
    <circle cx="50" cy="50" r="22" fill="#F0C050" stroke="#8B6914" strokeWidth="2" />
    {/* Reflet */}
    <ellipse cx="42" cy="42" rx="7" ry="10" fill="#FFE89A" opacity=".55" transform="rotate(-25 42 42)" />
    {/* Symbole infini ∞ — deux boucles entrelacées */}
    <path d="M 36 50 C 36 44 42 44 45 47 L 50 52 L 55 47 C 58 44 64 44 64 50 C 64 56 58 56 55 53 L 50 48 L 45 53 C 42 56 36 56 36 50 Z" fill="#FFFFFF" stroke="#5A4014" strokeWidth="1.1" opacity=".95" />
    {/* étincelle bonus */}
    <path d="M 70 32 L 71 35 L 74 36 L 71 37 L 70 40 L 69 37 L 66 36 L 69 35 Z" fill="#FFFFFF" />
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
    <circle cx="66" cy="40" r="1" fill="#FFE89A" />
    <circle cx="44" cy="62" r="1" fill="#A8D5FF" />
    <circle cx="62" cy="66" r="1.4" fill="#E8D5FF" />
    <path d="M50 30 L52 38 L60 40 L52 42 L50 50 L48 42 L40 40 L48 38 Z" fill="#FFE89A" opacity=".9" />
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

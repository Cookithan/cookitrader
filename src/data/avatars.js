/* ════════════════════════════════════════════════════
   AVATARS (PHASE 4)
   ────────────────────────────────────────────────────
   - ONBOARDING_AVATARS : 12 entrées indexées par position (0..11)
                          → userAvatar peut être un nombre 0..11
                          dont 3 marquées `hidden:true` (Tasse / Théière /
                          Croissant) — masquées de la grille de sélection
                          mais conservées pour ne pas casser les profils
                          d'utilisateurs qui les avaient choisis avant.
   - AVATAR_PREMIUM     : 8 avatars cosmétiques achetables/débloqués
                          → userAvatar peut être un id string ('avatar_chef', etc.)
                          + 4 entrées legacy (avatar_cookie / avatar_legend / avatar_aurore)
                            conservées pour ne pas planter les profils existants
   - Chaque avatar a une `art` clé qui désigne le composant SVG dans
     components/avatars/AvatarArtwork.jsx (gros switch).
   - getAvatar(value) résout n'importe quelle valeur en config affichable.

   Helper `getVisibleOnboardingAvatars()` retourne uniquement les avatars
   non `hidden` — utilisé par OnboardingModal et ProfileOverlay pour la
   grille de sélection.
═══════════════════════════════════════════════════════ */

export const ONBOARDING_AVATARS = [
  { id:0,  art:'tasse',        name:'Tasse Café',     bg:'linear-gradient(140deg,#4A2C17,#7D4E1F)', hidden:true },
  { id:1,  art:'cookie',       name:'Cookie',         bg:'linear-gradient(140deg,#C17F3C,#D4A017)', hidden:true },
  { id:2,  art:'baristaH',     name:'Barista H',      bg:'linear-gradient(140deg,#8B5A2B,#C17F3C)' },
  { id:3,  art:'baristaF',     name:'Barista F',      bg:'linear-gradient(140deg,#8B5A2B,#C17F3C)' },
  { id:4,  art:'theiere',      name:'Théière',        bg:'linear-gradient(140deg,#7D4E1F,#A0784E)', hidden:true },
  { id:5,  art:'croissant',    name:'Croissant',      bg:'linear-gradient(140deg,#D4A017,#E5B040)', hidden:true },
  { id:6,  art:'latteArt',     name:'Latte Art',      bg:'linear-gradient(140deg,#4A2C17,#8B5A2B)' },
  { id:7,  art:'grain',        name:'Grain Café',     bg:'linear-gradient(140deg,#3D2010,#6B3D20)' },
  { id:8,  art:'muffin',       name:'Muffin',         bg:'linear-gradient(140deg,#8B5A2B,#C17F3C)' },
  { id:9,  art:'donut',        name:'Donut',          bg:'linear-gradient(140deg,#D4A017,#F0C050)' },
  { id:10, art:'cookieKawaii', name:'Cookie kawaii',  bg:'linear-gradient(140deg,#C17F3C,#D4A017)' },
  { id:11, art:'baristaChef',  name:'Barista chef',   bg:'linear-gradient(140deg,#5C3317,#8B5A2B)' },
];

/* Filtre les avatars masqués — la grille de sélection (Onboarding +
   Profil) ne montre QUE les non-hidden. Les hidden restent résolus
   par getAvatar() pour ne pas casser un user qui a déjà cet ID. */
export const getVisibleOnboardingAvatars = () =>
  ONBOARDING_AVATARS.filter(a => !a.hidden);

/* Tableau séparé pour lister les 8 avatars premium dans l'ordre de la boutique
   (le brief les ordonne par cost croissant) ; AVATAR_PREMIUM ci-dessous reste
   l'index par id, utilisé pour l'affichage. */
export const AVATAR_PREMIUM_LIST = [
  { id:'avatar_chef',    art:'avChef',    name:'Chef étoilé',     bg:'linear-gradient(140deg,#7D4E1F,#C17F3C)' },
  { id:'avatar_robot',   art:'avRobot',   name:'Robot Barista',   bg:'linear-gradient(140deg,#5A4A6A,#8B7AA0)' },
  { id:'avatar_chat',    art:'avChat',    name:'Chat Café',       bg:'linear-gradient(140deg,#8B5A2B,#D4A017)' },
  { id:'avatar_renard',  art:'avRenard',  name:'Renard',          bg:'linear-gradient(140deg,#A86028,#E5A045)' },
  { id:'avatar_panda',   art:'avPanda',   name:'Panda Café',      bg:'linear-gradient(140deg,#C8B89C,#8B7A60)' },
  { id:'avatar_loup',    art:'avLoup',    name:'Loup Mocha',      bg:'radial-gradient(circle at 50% 40%, #4A2C17 0%, #1F0E04 60%, #0A0402 100%)' },
  { id:'avatar_or',      art:'avOr',      name:'Or Massif',       bg:'linear-gradient(140deg,#D4A017,#FFE89A)', glow:true },
  { id:'avatar_legende', art:'avLegende', name:'Légende',         bg:'linear-gradient(140deg,#4A2C17,#D4A017)', glow:true },
  { id:'avatar_sage',    art:'avSage',    name:'Sage du Café',    bg:'linear-gradient(140deg,#3D2010,#8B5A2B)' },
  { id:'avatar_eternel', art:'avEternel', name:'Éternel',         bg:'linear-gradient(140deg,#5A4014,#FFE89A)', glow:true },
];

export const AVATAR_PREMIUM = AVATAR_PREMIUM_LIST.reduce((acc, a) => { acc[a.id] = a; return acc; }, {});

/* Legacy — anciens avatars supprimés du shop, conservés pour les utilisateurs
   qui les ont déjà débloqués/équipés avant la PHASE 4. */
AVATAR_PREMIUM.avatar_cookie = { id:'avatar_cookie', art:'cookie',  name:'Cookie',  bg:'linear-gradient(140deg,#C17F3C,#D4A017)' };
AVATAR_PREMIUM.avatar_legend = { id:'avatar_legend', art:'avOr',    name:'Légende', bg:'linear-gradient(140deg,#D4A017,#FFE89A)', glow:true };
AVATAR_PREMIUM.avatar_aurore = { id:'avatar_aurore', art:'cosmos',  name:'Cosmos',  bg:'transparent', glow:true, full:true };

export function getAvatar(value){
  /* Premium avatars : ID string ('avatar_chef', 'avatar_eternel'...). */
  if(typeof value === 'string' && AVATAR_PREMIUM[value]) return AVATAR_PREMIUM[value];
  /* Onboarding avatars : index 0..11. Supabase peut renvoyer ce nombre
     comme string (user_avatar est une colonne text) — on coerce sans
     casser les IDs string déjà gérés au-dessus. */
  const n = typeof value === 'number' ? value : parseInt(value, 10);
  if(Number.isInteger(n) && ONBOARDING_AVATARS[n]) return ONBOARDING_AVATARS[n];
  return ONBOARDING_AVATARS[0];
}

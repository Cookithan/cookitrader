/* ════════════════════════════════════════════════════
   AVATARS (PHASE 4)
   ────────────────────────────────────────────────────
   - ONBOARDING_AVATARS : 12 avatars de base, indexés par position (0..11)
                          → userAvatar peut être un nombre 0..11
   - AVATAR_PREMIUM     : 8 avatars cosmétiques achetables/débloqués
                          → userAvatar peut être un id string ('avatar_chef', etc.)
                          + 4 entrées legacy (avatar_cookie / avatar_legend / avatar_aurore)
                            conservées pour ne pas planter les profils existants
   - Chaque avatar a une `art` clé qui désigne le composant SVG dans
     components/avatars/AvatarArtwork.jsx (gros switch).
   - getAvatar(value) résout n'importe quelle valeur en config affichable.
═══════════════════════════════════════════════════════ */

export const ONBOARDING_AVATARS = [
  { id:0,  art:'tasse',        name:'Tasse Café',     bg:'linear-gradient(140deg,#4A2C17,#7D4E1F)' },
  { id:1,  art:'cookie',       name:'Cookie',         bg:'linear-gradient(140deg,#C17F3C,#D4A017)' },
  { id:2,  art:'baristaH',     name:'Barista H',      bg:'linear-gradient(140deg,#8B5A2B,#C17F3C)' },
  { id:3,  art:'baristaF',     name:'Barista F',      bg:'linear-gradient(140deg,#8B5A2B,#C17F3C)' },
  { id:4,  art:'theiere',      name:'Théière',        bg:'linear-gradient(140deg,#7D4E1F,#A0784E)' },
  { id:5,  art:'croissant',    name:'Croissant',      bg:'linear-gradient(140deg,#D4A017,#E5B040)' },
  { id:6,  art:'latteArt',     name:'Latte Art',      bg:'linear-gradient(140deg,#4A2C17,#8B5A2B)' },
  { id:7,  art:'grain',        name:'Grain Café',     bg:'linear-gradient(140deg,#3D2010,#6B3D20)' },
  { id:8,  art:'muffin',       name:'Muffin',         bg:'linear-gradient(140deg,#8B5A2B,#C17F3C)' },
  { id:9,  art:'donut',        name:'Donut',          bg:'linear-gradient(140deg,#D4A017,#F0C050)' },
  { id:10, art:'cookieKawaii', name:'Cookie kawaii',  bg:'linear-gradient(140deg,#C17F3C,#D4A017)' },
  { id:11, art:'baristaChef',  name:'Barista chef',   bg:'linear-gradient(140deg,#5C3317,#8B5A2B)' },
];

/* Tableau séparé pour lister les 8 avatars premium dans l'ordre de la boutique
   (le brief les ordonne par cost croissant) ; AVATAR_PREMIUM ci-dessous reste
   l'index par id, utilisé pour l'affichage. */
export const AVATAR_PREMIUM_LIST = [
  { id:'avatar_chef',    art:'avChef',    name:'Chef étoilé',     bg:'linear-gradient(140deg,#7D4E1F,#C17F3C)' },
  { id:'avatar_robot',   art:'avRobot',   name:'Robot Barista',   bg:'linear-gradient(140deg,#5A4A6A,#8B7AA0)' },
  { id:'avatar_chat',    art:'avChat',    name:'Chat Café',       bg:'linear-gradient(140deg,#8B5A2B,#D4A017)' },
  { id:'avatar_renard',  art:'avRenard',  name:'Renard',          bg:'linear-gradient(140deg,#A86028,#E5A045)' },
  { id:'avatar_panda',   art:'avPanda',   name:'Panda Café',      bg:'linear-gradient(140deg,#C8B89C,#8B7A60)' },
  { id:'avatar_dragon',  art:'avDragon',  name:'Dragon Espresso', bg:'linear-gradient(140deg,#3D1C02,#7D4E1F)' },
  { id:'avatar_or',      art:'avOr',      name:'Or Massif',       bg:'linear-gradient(140deg,#D4A017,#FFE89A)', glow:true },
  { id:'avatar_legende', art:'avLegende', name:'Légende',         bg:'linear-gradient(140deg,#4A2C17,#D4A017)', glow:true },
];

export const AVATAR_PREMIUM = AVATAR_PREMIUM_LIST.reduce((acc, a) => { acc[a.id] = a; return acc; }, {});

/* Legacy — anciens avatars supprimés du shop, conservés pour les utilisateurs
   qui les ont déjà débloqués/équipés avant la PHASE 4. */
AVATAR_PREMIUM.avatar_cookie = { id:'avatar_cookie', art:'cookie',  name:'Cookie',  bg:'linear-gradient(140deg,#C17F3C,#D4A017)' };
AVATAR_PREMIUM.avatar_legend = { id:'avatar_legend', art:'avOr',    name:'Légende', bg:'linear-gradient(140deg,#D4A017,#FFE89A)', glow:true };
AVATAR_PREMIUM.avatar_aurore = { id:'avatar_aurore', art:'cosmos',  name:'Cosmos',  bg:'transparent', glow:true, full:true };

export function getAvatar(value){
  if(typeof value === 'number') return ONBOARDING_AVATARS[value] || ONBOARDING_AVATARS[0];
  if(typeof value === 'string' && AVATAR_PREMIUM[value]) return AVATAR_PREMIUM[value];
  return ONBOARDING_AVATARS[0];
}

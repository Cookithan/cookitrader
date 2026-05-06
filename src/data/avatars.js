/* ════════════════════════════════════════════════════
   AVATARS
   - ONBOARDING_AVATARS : 4 avatars de base, indexés par position (0..3)
                          -> userAvatar peut être un nombre 0..3
   - AVATAR_PREMIUM     : avatars cosmétiques achetables/débloqués
                          -> userAvatar peut être un id string ('avatar_cookie', etc.)
   - getAvatar(value)   : helper qui résout n'importe quelle valeur en config affichable
                          (kind, bg, stroke / emoji, label, glow, full)
════════════════════════════════════════════════════ */

export const ONBOARDING_AVATARS = [
  { kind:'base', bg:'#E8DCC8', stroke:'#4A2C17', label:'Crème'    },
  { kind:'base', bg:'#D4A017', stroke:'#fff',    label:'Or'       },
  { kind:'base', bg:'#C17F3C', stroke:'#fff',    label:'Caramel'  },
  { kind:'base', bg:'#4A2C17', stroke:'#F0E6D3', label:'Espresso' },
];

export const AVATAR_PREMIUM = {
  avatar_cookie: { kind:'emoji', bg:'#C17F3C', emoji:'🍪', label:'Cookie' },
  avatar_chef:   { kind:'emoji', bg:'#E8DCC8', emoji:'👨‍🍳', label:'Chef' },
  avatar_legend: { kind:'emoji', bg:'#D4A017', emoji:'👑', label:'Légende', glow:true },
  avatar_aurore: { kind:'emoji', bg:'transparent', emoji:'🌌', label:'Cosmos', glow:true, full:true },
};

export function getAvatar(value){
  if(typeof value === 'number') return ONBOARDING_AVATARS[value] || ONBOARDING_AVATARS[0];
  if(typeof value === 'string' && AVATAR_PREMIUM[value]) return AVATAR_PREMIUM[value];
  return ONBOARDING_AVATARS[0];
}

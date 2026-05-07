/* ════════════════════════════════════════════════════
   secretBadges.js — 3 badges cachés (BRIEF_BADGES_SECRETS)
   ────────────────────────────────────────────────────
   Pas listés dans la boutique. Découverts en remplissant une condition
   silencieuse :
     - Noctambule    : ouvrir l'app entre 0h et 4h locales
     - Investisseur  : profit cumulé marché ≥ 1000 🍪 (state marketRealized)
     - Amical        : ≥ 3 amis acceptés (status='accepted')

   Quand débloqué :
     · l'id du badge est ajouté à `unlocked` (LS) — persistance
     · une modale festive s'ouvre (SecretBadgeUnlockModal)
     · +100 🍪 versés au joueur

   ⚠️ Ces badges ne doivent JAMAIS apparaître dans le profil tant qu'ils
      ne sont pas débloqués (sinon ils ne sont plus secrets).
═══════════════════════════════════════════════════════ */

export const SECRET_BADGES = {
  noctambule: {
    id: 'badge_noctambule',
    name: '🦉 Noctambule',
    shortName: 'Noctambule',
    description: 'Tu joues quand le monde dort…',
    icon: '🦉',
    color: '#3D2010',
    bgGradient: 'linear-gradient(135deg, #2C1810, #3D2010)',
  },
  investisseur: {
    id: 'badge_investisseur',
    name: '💎 Investisseur',
    shortName: 'Investisseur',
    description: 'Maître du marché — +1000 🍪 de profit',
    icon: '💎',
    color: '#D4A017',
    bgGradient: 'linear-gradient(135deg, #D4A017, #C17F3C)',
  },
  amical: {
    id: 'badge_amical',
    name: '👥 Amical',
    shortName: 'Amical',
    description: 'Le café se savoure entre amis',
    icon: '👥',
    color: '#C17F3C',
    bgGradient: 'linear-gradient(135deg, #C17F3C, #A0784E)',
  },
};

/* Bonus en cookies versé à chaque déblocage. Volontairement modeste —
   c'est la modale festive qui fait la récompense émotionnelle. */
export const SECRET_BADGE_BONUS = 100;

export function getSecretBadgeById(id){
  return Object.values(SECRET_BADGES).find(b => b.id === id) ?? null;
}

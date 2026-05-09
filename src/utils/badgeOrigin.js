/* ════════════════════════════════════════════════════
   badgeOrigin.js — origine humaine d'un badge
   ────────────────────────────────────────────────────
   Donne une explication "comment on l'a débloqué" à partir d'un id.
   3 sources possibles :
     - 'shop'   : badge boutique classique (cost > 0)
     - 'event'  : badge récompense d'événement spécial (limited:true + event)
     - 'secret' : badge SECRET_BADGES (déclenché par condition cachée)

   Les conditions des badges secrets ne sont stockées nulle part dans
   les données — elles vivent dans le code (App.jsx + leurs hooks). On
   les recopie ici en français lisible pour la modale d'info.
═══════════════════════════════════════════════════════ */

import { REWARDS } from "../data/constants.js";
import { SPECIAL_EVENTS } from "../data/events.js";
import { SECRET_BADGES } from "../data/secretBadges.js";

const SECRET_HINTS = {
  badge_noctambule:   "Ouvrir l'app entre 0h et 4h (heure locale).",
  badge_investisseur: "Cumuler 1000 🍪 ou plus de profit sur le marché $CKM.",
  badge_amical:       "Atteindre 3 amis acceptés ou plus dans ta liste.",
};

export function getBadgeOrigin(badgeId){
  /* Secret en premier — sa shape est différente de REWARDS */
  const secret = Object.values(SECRET_BADGES).find(b => b.id === badgeId);
  if(secret){
    return {
      source: 'secret',
      label:  'Badge secret',
      hint:   SECRET_HINTS[badgeId] || secret.description,
    };
  }
  const reward = REWARDS.find(r => r.id === badgeId && r.type === 'Badge');
  if(!reward) return null;
  if(reward.event){
    const ev = SPECIAL_EVENTS.find(e => e.id === reward.event);
    return {
      source: 'event',
      label:  ev ? ev.title : 'Événement spécial',
      hint:   ev ? ev.description : 'Récompense d\'un événement spécial.',
    };
  }
  return {
    source: 'shop',
    label:  'Acheté en boutique',
    hint:   `Coût : ${reward.cost} 🍪 · Niveau requis : ${reward.levelRequired}.`,
  };
}

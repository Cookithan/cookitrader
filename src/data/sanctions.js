/* ════════════════════════════════════════════════════
   sanctions.js — comptes sanctionnés (étiquette privée)
   ────────────────────────────────────────────────────
   Liste des userCodes ayant violé les règles. Affiche un bandeau
   d'avertissement UNIQUEMENT sur le profil privé du joueur concerné
   (lui voit, les autres ne voient rien). Aucun blocage gameplay —
   c'est purement informatif / pédagogique.

   Conforme aux politiques Play Store : pas de "name and shame" public,
   juste un message direct au compte concerné.
═══════════════════════════════════════════════════════ */

export const SANCTIONED_USERS = {
  '7Z4-977': {
    reason: 'Manipulation du marché $CKM (pump-and-dump)',
    date: '2026-05-10',
    detail: 'Cycle d\'achats/ventes massifs ayant fait chuter le prix de 123 → 80 🍪 en 5 minutes, lésant les autres investisseurs.',
  },
};

/* Lookup case-insensitive. Retourne null si l'user n'est pas sanctionné. */
export function getSanction(userCode){
  if(!userCode) return null;
  return SANCTIONED_USERS[userCode.toUpperCase()] || null;
}

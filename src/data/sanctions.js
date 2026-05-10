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
    /* Période pendant laquelle la sanction est visible publiquement
       (badge ⚠️ dans le classement). Au-delà, étiquette redevient
       privée (uniquement sur le profil propre du sanctionné). */
    publicUntil: '2026-05-11T20:00:00.000Z',
  },
};

/* Lookup case-insensitive. Retourne null si l'user n'est pas sanctionné. */
export function getSanction(userCode){
  if(!userCode) return null;
  return SANCTIONED_USERS[userCode.toUpperCase()] || null;
}

/* Vrai si la sanction est encore dans la fenêtre publique (24 h post-incident).
   Au-delà, le bandeau reste affiché sur le profil privé du sanctionné mais
   le badge ⚠️ disparaît du classement. */
export function isSanctionPublic(userCode, now = new Date()){
  const s = getSanction(userCode);
  if(!s || !s.publicUntil) return false;
  return new Date(s.publicUntil).getTime() > now.getTime();
}

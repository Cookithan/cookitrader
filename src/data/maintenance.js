/* ════════════════════════════════════════════════════
   MAINTENANCE MODE — flag + whitelist
   ────────────────────────────────────────────────────
   Quand MAINTENANCE_MODE = true, l'app affiche un écran plein
   qui remplace l'UI normale. Les joueurs ne peuvent plus rien faire :
   pas de tick marché, pas de jeu, pas de boutique.

   BYPASS : les userCodes listés dans MAINTENANCE_BYPASS_USERCODES
   passent à travers et accèdent à l'app normalement (pour tester
   les fixes en prod sans débloquer pour tout le monde).

   Pour activer : passer MAINTENANCE_MODE à true + redeploy.
   Pour désactiver : repasser à false + redeploy.
═══════════════════════════════════════════════════════ */

export const MAINTENANCE_MODE = false;

/* Whitelist (lookup case-insensitive). PJ3-56A = compte Cookithan. */
export const MAINTENANCE_BYPASS_USERCODES = ['PJ3-56A'];

export const MAINTENANCE_MESSAGE = {
  title: 'Maintenance en cours',
  subtitle: 'On répare quelques bugs côté cuisine.\nReviens dans quelques heures !',
};

export function isBypassedFromMaintenance(userCode){
  if(!userCode) return false;
  const uc = String(userCode).trim().toUpperCase();
  return MAINTENANCE_BYPASS_USERCODES.some(c => c.toUpperCase() === uc);
}

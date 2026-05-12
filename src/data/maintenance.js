/* ════════════════════════════════════════════════════
   MAINTENANCE MODE — flag + whitelist
   ────────────────────────────────────────────────────
   Deux modes complémentaires :

   1. CODE-DRIVEN (cette constante MAINTENANCE_MODE)
      Nécessite un deploy. Utile en mode "panique" si Supabase est
      down ou si on veut bloquer même les fresh installs avant que
      le client puisse charger system_status.

   2. LIVE (Supabase public.system_status)
      Toggle instantané sans deploy via UPDATE SQL. Les clients
      ouverts voient le MaintenanceWarningModal après 30s de grace,
      puis l'écran plein. Recommandé pour 99% des cas.
      Voir MIGRATION_system_status.sql à la racine du repo.

   Quand le flag est actif, l'app affiche un écran plein qui remplace
   l'UI normale. Les joueurs ne peuvent plus rien faire : pas de tick
   marché, pas de jeu, pas de boutique.

   BYPASS : les userCodes listés dans MAINTENANCE_BYPASS_USERCODES
   passent à travers (dans les deux modes) et accèdent à l'app
   normalement (pour tester les fixes en prod sans débloquer pour
   tout le monde).

   ──── MODE 1 (code-driven) ────
   Pour activer : passer MAINTENANCE_MODE à true + redeploy.
   Pour désactiver : repasser à false + redeploy.

   ──── MODE 2 (live via SQL) ────
   -- Activer pour tout le monde (sauf bypass userCodes)
   UPDATE public.system_status
   SET maintenance_mode = true,
       maintenance_title = 'Maintenance en cours',
       maintenance_subtitle = E'On répare un truc, reviens dans 10 min !',
       updated_at = now()
   WHERE id = 1;

   -- Désactiver
   UPDATE public.system_status
   SET maintenance_mode = false, updated_at = now()
   WHERE id = 1;

   -- Forcer les clients ouverts à voir "Mise à jour dispo" + reload
   UPDATE public.system_status
   SET force_version = '1.15.1', updated_at = now()
   WHERE id = 1;

   -- Effacer le force_version (après que tout le monde ait reload)
   UPDATE public.system_status
   SET force_version = NULL, updated_at = now()
   WHERE id = 1;
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

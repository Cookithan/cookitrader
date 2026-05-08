/* ════════════════════════════════════════════════════
   admin.js — helpers pour identifier les comptes admin
   ────────────────────────────────────────────────────
   Plusieurs pseudos peuvent être reconnus comme admin (compte de test
   du créateur). Liste centralisée ici pour éviter la duplication des
   checks à travers les fichiers.

   Côté Supabase, on utilise le pattern 'admin%' (ilike) pour exclure
   d'un coup tous les pseudos commençant par 'admin' du classement
   public et des stats globales — couvre les noms actuels et futurs.
═══════════════════════════════════════════════════════ */

export const ADMIN_NAMES = ['admin123', 'admin558'];

/* Pattern SQL ILIKE pour les filtres Supabase. Couvre tous les pseudos
   qui commencent par 'admin' (case-insensitive). */
export const ADMIN_ILIKE_PATTERN = 'admin%';

/* Test case-insensitive si un pseudo correspond à un compte admin. */
export function isAdminName(name){
  return ADMIN_NAMES.includes((name || '').trim().toLowerCase());
}

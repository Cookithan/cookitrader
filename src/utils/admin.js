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

/* Pseudos hors-classement (en plus des admins) — joueurs trop avancés
   qui rendent la concurrence impossible pour les nouveaux. Exclus des
   leaderboards (cookies + marché) et des stats globales communauté.
   Ajouter ici un pseudo (lowercase) suffit à l'exclure partout. */
export const NON_RANKED_NAMES = ['aaronxbox'];

/* Helper : applique les .not() pour exclure admins + NON_RANKED_NAMES
   sur une query Supabase. À utiliser pour TOUTES les queries de
   classement / stats globales pour rester cohérent.

   Usage : `notInLeaderboard(supabase.from('users').select(...))` */
export function notInLeaderboard(query){
  let q = query.not('user_name', 'ilike', ADMIN_ILIKE_PATTERN);
  for(const name of NON_RANKED_NAMES){
    q = q.not('user_name', 'ilike', name);
  }
  return q;
}

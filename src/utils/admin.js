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

/* ── Qui peut ouvrir la Sentinelle ────────────────────
   Un PSEUDO ne prouve rien : il se change en trois secondes, et le
   premier venu qui se renomme admin123 ouvrirait l'écran. On accepte
   donc aussi des CODES de compte, qui eux sont attribués à la création
   et ne se choisissent pas.

   Ce que ça donne : voir l'état de santé de l'app. Rien de plus. AGIR
   demande la phrase de passe, qui n'est ni ici, ni dans le code envoyé
   aux joueurs, ni dans le téléphone — seulement dans la base et dans la
   tête de Cookithan. Cette liste peut donc être publique sans risque : elle
   dit qui a le droit de REGARDER.

   PJ3-56A  — le compte du créateur (déjà whitelisté pour la maintenance)
   9WX-W7Q  — « Le vrai Cooki », le compte de jeu de Cookithan */
export const CODES_SENTINELLE = ['PJ3-56A', '9WX-W7Q'];

export function peutVoirSentinelle(name, code){
  if (isAdminName(name)) return true;
  return CODES_SENTINELLE.includes((code || '').trim().toUpperCase());
}

/* Pseudos hors-classement (en plus des admins) — joueurs trop avancés
   qui rendent la concurrence impossible pour les nouveaux. Exclus des
   leaderboards Cookies + stats globales (PAS du marché, qui utilise
   notAdmin() à la place). Ajouter ici un pseudo (lowercase) suffit à
   l'exclure partout. */
export const NON_RANKED_NAMES = [];

/* Helper : applique .not() pour exclure UNIQUEMENT les admins. À utiliser
   sur les queries où on veut garder tous les joueurs publics (ex :
   classement Marché — aaronxbox y reste car la concurrence trade est
   indépendante de son niveau de jeu).

   Usage : `notAdmin(supabase.from('users').select(...))` */
export function notAdmin(query){
  return query.not('user_name', 'ilike', ADMIN_ILIKE_PATTERN);
}

/* Helper : applique les .not() pour exclure admins + NON_RANKED_NAMES
   sur une query Supabase. À utiliser pour les queries de classement
   Cookies / stats globales communauté. Le classement Marché utilise
   notAdmin() à la place pour rester ouvert à tous les traders.

   Usage : `notInLeaderboard(supabase.from('users').select(...))` */
export function notInLeaderboard(query){
  let q = notAdmin(query);
  for(const name of NON_RANKED_NAMES){
    q = q.not('user_name', 'ilike', name);
  }
  return q;
}

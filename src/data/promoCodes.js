/* ════════════════════════════════════════════════════
   promoCodes.js — codes promo distribuables manuellement
   ────────────────────────────────────────────────────
   Cookithan distribue ces codes à ses joueurs (réseaux sociaux,
   Discord, événements). L'utilisateur les rentre depuis Settings →
   Code promo et reçoit la récompense (cookies / cafés).

   Anti-double-usage : chaque code ne peut être utilisé qu'UNE seule
   fois par compte (state LS `promoCodesUsed`).

   Format de chaque entrée :
     - coins   : montant 🍪 crédité (peut être 0)
     - noXp    : si true, les `coins` ne donnent PAS d'XP (juste solde
                 + totalEarned). Évite qu'un gros code fasse exploser
                 les niveaux. Sans effet si coins=0.
     - cafes   : montant ☕ crédité (peut être 0)
     - shares  : actions $CKM offertes (peut être 0) — nécessite Supabase
     - level   : si défini, force le niveau minimum après application
                 (utile pour les codes "boost" qui catapultent à un niveau
                 directement, sans passer par les addCoins palier par palier)
     - totalEarnedFloor : si défini, garantit que totalEarned est >= valeur
                 (utilisé pour les codes de RESTAURATION quand on a besoin
                 de raligner total_earned avec le level forcé pour rester
                 cohérent au classement)
     - unlock  : id d'un item REWARDS à ajouter à `unlocked` (typiquement
                 un thème édition limitée). Le toast mentionnera le nom.
     - label   : description courte (affichée à la confirmation)
     - secret  : si true, le code n'est PAS utilisable tant qu'il n'a
                 pas été révélé via l'item premium "Révéler Code Promo
                 Rare" (state LS `revealedPromoCodes`). Le code reste
                 inconnu sinon — typiquement gagné en payant ☕.

   Lookup case-insensitive (input.toUpperCase() comparé aux clés).
═══════════════════════════════════════════════════════ */

export const PROMO_CODES = {
  'BIENVENUE': { coins: 100,  cafes: 0, label: 'Bienvenue !' },
  'TOP1':      { coins: 50,   cafes: 0, label: 'Top 1 du classement' },
  'COOKITHAN': { coins: 0,    cafes: 2, label: 'Merci du créateur' },
  'MERCI':     { coins: 50,   cafes: 1, label: 'Petit merci' },
  'CMK1':      { coins: 0,    cafes: 0, shares: 1, label: '1 action $CKM offerte' },
  'CMK5':      { coins: 0,    cafes: 0, shares: 5, label: '5 actions $CKM offertes' },
  /* Code thème — débloque le thème exclusif Noir & Blanc (édition
     limitée, pas en boutique). Pas de cookies/cafés associés. */
  'BLACK':     { coins: 0,    cafes: 0, unlock: 'theme_noir', label: 'Thème Noir & Blanc débloqué' },
  /* Drop rare via le barista légendaire dans Devine la commande
     (1 % par partie, one-shot). `secret:true` → utilisable uniquement
     si l'utilisateur a effectivement croisé le barista (ajouté à
     revealedPromoCodes au moment du drop, cf. App.jsx). Empêche
     qu'un joueur récupère le code via Discord et l'utilise sans
     l'avoir mérité. */
  'BARISTA05': { coins: 0,    cafes: 0, unlock: 'theme_cookies', secret: true, label: 'Thème Pâte de Cookie débloqué' },
  /* Code YUZURU — 5 actions $CKM offertes, distribuable. Anti-double-use
     natif (1 fois par compte). À retirer du catalogue après campagne. */
  'YUZURU':    { coins: 0,    cafes: 0, shares: 5, label: '5 actions $CKM offertes' },
};

/* IDs des codes secrets — utilisé par l'item premium pour révéler. */
export const SECRET_PROMO_CODES = Object.entries(PROMO_CODES)
  .filter(([_, v]) => v.secret)
  .map(([k]) => k);

/* lookupPromoCode :
   - rejette les codes secrets non encore révélés
     (revealed = liste d'IDs déjà révélés par l'utilisateur)
   - rejette les codes inconnus
   - retourne `{ code, coins, cafes, ... }` enrichi sinon. */
export function lookupPromoCode(rawInput, revealed = []){
  const code = (rawInput || '').trim().toUpperCase();
  if(!code) return null;
  const entry = PROMO_CODES[code];
  if(!entry) return null;
  /* Code secret pas encore révélé pour cet utilisateur → invisible */
  if(entry.secret && !revealed.includes(code)) return null;
  return { code, ...entry };
}

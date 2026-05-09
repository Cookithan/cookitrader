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
     - cafes   : montant ☕ crédité (peut être 0)
     - shares  : actions $CKM offertes (peut être 0) — nécessite Supabase
     - level   : si défini, force le niveau minimum après application
                 (utile pour les codes "boost" qui catapultent à un niveau
                 directement, sans passer par les addCoins palier par palier)
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
  /* Code rare — révélé uniquement via l'item premium "Révéler Code
     Promo Rare" (5 ☕, niveau 13). Récompense exclusive. */
  'LEGENDE13': { coins: 500,  cafes: 3, label: 'Code Rare — Légende du 13', secret: true },
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

/* ════════════════════════════════════════════════════
   promoCodes.js — codes promo distribuables manuellement
   ────────────────────────────────────────────────────
   Cookithan distribue ces codes à ses joueurs (réseaux sociaux,
   Discord, événements). L'utilisateur les rentre depuis Settings →
   Code promo et reçoit la récompense (cookies / cafés).

   Anti-double-usage : chaque code ne peut être utilisé qu'UNE seule
   fois par compte (state LS `promoCodesUsed`).

   Format de chaque entrée :
     - coins  : montant 🍪 crédité (peut être 0)
     - cafes  : montant ☕ crédité (peut être 0)
     - label  : description courte (affichée à la confirmation)

   Lookup case-insensitive (input.toUpperCase() comparé aux clés).

   Pour ajouter un nouveau code : juste ajouter une entrée et push.
═══════════════════════════════════════════════════════ */

export const PROMO_CODES = {
  'BIENVENUE': { coins: 100,  cafes: 0, label: 'Bienvenue !' },
  'TOP1':      { coins: 200,  cafes: 0, label: 'Top 1 du classement' },
  'COOKITHAN': { coins: 0,    cafes: 2, label: 'Merci du créateur' },
  'MERCI':     { coins: 50,   cafes: 1, label: 'Petit merci' },
};

export function lookupPromoCode(rawInput){
  const code = (rawInput || '').trim().toUpperCase();
  if(!code) return null;
  const entry = PROMO_CODES[code];
  if(!entry) return null;
  return { code, ...entry };
}

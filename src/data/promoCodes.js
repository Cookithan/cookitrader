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
     - totalEarnedOnly : si défini, AJOUTE ce montant à totalEarned UNIQUEMENT
                 (pas de solde 🍪 dépensable, pas d'XP, pas de level-up). Sert
                 aux codes "boost de classement cumulé" : le joueur grimpe au
                 leaderboard total_earned sans recevoir de cookies à dépenser.
                 Additif (contrairement à totalEarnedFloor qui est un plancher).
     - unlock  : id d'un item REWARDS à ajouter à `unlocked` (typiquement
                 un thème édition limitée). Le toast mentionnera le nom.
     - unlockGame : id d'un mini-jeu (GAMES.id : flappy, slot, etc.) à
                 débloquer indépendamment du niveau. Persistant via
                 useLocalStorage('unlockedGames'). Override le levelRequired.
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
  /* Cookies bonus — code récurrent distribuable. */
  'COOKIMINER': { coins: 123, cafes: 0, label: '123 🍪 offerts' },
  /* Café bonus — code récurrent distribuable. */
  'LATTE':      { coins: 0,   cafes: 1, label: '1 ☕ offert' },
  /* Code action $CKM minimal — récompense fidélité.
     CMK10/20/30 supprimés mai 2026 après exploit des packs cookies :
     volume trop élevé combiné aux packs avait gonflé artificiellement
     la circulation des actions. CMK1 reste pour des distributions
     ciblées sans risque d'inflation.
     Convention : préfixe `CMK` (et non `CKM`) — cohérent historique
     même si le ticker affiché est $CKM. */
  'CMK1':      { coins: 0,    cafes: 0, shares: 1,  label: '1 action $CKM offerte' },
  /* Code dédié 3 actions $CKM — distribution ponctuelle. */
  '3TROIS':    { coins: 0,    cafes: 0, shares: 3,  label: '3 actions $CKM offertes' },
  /* Code thème — débloque le thème exclusif Noir & Blanc (édition
     limitée, pas en boutique). Pas de cookies/cafés associés. */
  'BLACK':     { coins: 0,    cafes: 0, unlock: 'theme_noir', label: 'Thème Noir & Blanc débloqué' },
  /* Code skin — débloque le Cookie Rose édition limitée (inspiration
     thème Cappuccino Velours). Rose poudré + pépites chocolat. */
  'PINK':      { coins: 0,    cafes: 0, unlock: 'skin_pink', label: '🌸 Cookie Rose débloqué' },
  /* Code avatar — débloque le Grain Légendaire (fève de café en or
     massif). Édition limitée, pas en boutique. */
  'GRAIN16':   { coins: 0,    cafes: 0, unlock: 'avatar_grain_legende', label: '☕ Grain Légendaire débloqué' },
  /* Drop rare via le barista légendaire dans Devine la commande
     (1 % par partie, one-shot). `secret:true` → utilisable uniquement
     si l'utilisateur a effectivement croisé le barista (ajouté à
     revealedPromoCodes au moment du drop, cf. App.jsx). Empêche
     qu'un joueur récupère le code via Discord et l'utilise sans
     l'avoir mérité. */
  'BARISTA05': { coins: 0,    cafes: 0, unlock: 'theme_grains', secret: true, label: 'Thème Cookie & Espresso débloqué' },

  /* ── 10 codes thématiques barista (distribuables Discord/réseaux) ── */
  'ESPRESSO':    { coins: 50,  cafes: 0, label: '☕ Espresso — 50 🍪' },
  'CAPPUCCINO':  { coins: 80,  cafes: 1, label: '☕ Cappuccino — 80 🍪 + 1 ☕' },
  'MACCHIATO':   { coins: 60,  cafes: 0, label: '☕ Macchiato — 60 🍪' },
  'MOKKA':       { coins: 100, cafes: 0, label: '🍫 Mokka — 100 🍪' },
  'ARABICA':     { coins: 75,  cafes: 0, shares: 1, label: '🌱 Arabica — 75 🍪 + 1 action' },
  'RISTRETTO':   { coins: 40,  cafes: 0, label: '☕ Ristretto — 40 🍪 (petit mais costaud)' },
  'BARISTA':     { coins: 0,   cafes: 2, label: '👨‍🍳 Barista — 2 ☕' },
  'CREMA':       { coins: 90,  cafes: 0, label: '🤎 Crema — 90 🍪' },
  'GRINDER':     { coins: 50,  cafes: 0, label: '⚙️ Grinder — 50 🍪' },
  'ROAST':       { coins: 120, cafes: 0, label: '🔥 Roast — 120 🍪' },

  /* Café bonus — distribution ponctuelle. */
  'DIO456':      { coins: 0, cafes: 4, label: '☕ 4 cafés offerts' },

  /* Cadeau bêta-testeurs (annoncé dans la popup nouvelle version 1.27.0-beta).
     Source ☕ validée explicitement par l'user 04/07/2026. One-shot/compte. */
  'BETA':        { coins: 0, cafes: 3, label: '🧪 Bêta — 3 ☕ offerts' },

  /* Boost de classement cumulé — +7000 🍪 sur total_earned UNIQUEMENT
     (pas de solde dépensable, pas d'XP). Fait grimper au leaderboard
     cumulé sans déséquilibrer l'économie 🍪. One-shot par compte. */
  'ASCENSION':   { coins: 0, cafes: 0, totalEarnedOnly: 7000, label: '📈 +7000 🍪 au classement cumulé' },

  /* Starter Pack de bienvenue (distribuable réseaux) — 3 récompenses :
     500 🍪 (noXp:true → pas d'explosion de niveau) + 3 ☕ + déblocage
     immédiat du mini-jeu Flappy Cookie (normalement niveau 12). */
  'STARTER':     { coins: 500, noXp: true, cafes: 3, unlockGame: 'flappy', label: '🎁 Starter Pack — 500 🍪 + 3 ☕ + Flappy Cookie' },
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
export function lookupPromoCode(rawInput, revealed = [], codesEnBase = []){
  const code = (rawInput || '').trim().toUpperCase();
  if(!code) return null;

  const entry = PROMO_CODES[code];
  if(entry){
    /* Code secret pas encore révélé pour cet utilisateur → invisible */
    if(entry.secret && !revealed.includes(code)) return null;
    return { code, ...entry };
  }

  /* ── Codes créés depuis la Sentinelle ────────────────
     Les 24 codes ci-dessus vivent dans le code de l'app : ils utilisent
     des mécaniques riches (forcer un niveau, débloquer un mini-jeu,
     révéler un code secret) qui n'auraient rien à faire en base.

     Ceux-ci sont créés depuis le téléphone, sans redéploiement, et se
     limitent aux trois récompenses courantes. Ils sont cherchés APRÈS
     les autres : un code écrit dans l'app garde toujours la priorité,
     donc personne ne peut en détourner un en créant le même nom. */
  const enBase = (codesEnBase || []).find(c => String(c.code).toUpperCase() === code);
  if(enBase && enBase.actif !== false){
    return {
      code,
      coins:  Number(enBase.coins)  || 0,
      cafes:  Number(enBase.cafes)  || 0,
      shares: Number(enBase.shares) || 0,
      label:  enBase.label || 'Code promo',
      noXp:   true,   /* prudence : un code créé à la volée ne fait pas exploser les niveaux */
    };
  }

  return null;
}

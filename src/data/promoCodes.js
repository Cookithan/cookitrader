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

/* fusionner — une ligne de base par-dessus l'entrée écrite dans l'app.

   On part TOUJOURS de l'entrée écrite pour ne rien perdre en route : si
   la migration des colonnes riches n'a pas encore été collée, la ligne
   de base ne connaît que cookies/cafés/actions, et BLACK doit continuer
   de débloquer son thème. La base impose donc ses montants (c'est ce
   qu'on modifie depuis le téléphone) et complète le reste seulement
   quand elle a quelque chose à dire. */
function fusionner(ecrit, base){
  const ou = (deBase, deLApp) => (deBase === null || deBase === undefined || deBase === '' ? deLApp : deBase);

  /* Un code qui ne vient PAS du fichier ci-dessus a été tapé à la
     volée depuis la console : on lui interdit de donner de l'XP, pour
     qu'un zéro de trop dans le champ « cookies » ne catapulte personne
     au niveau 25. Les 24 codes historiques, eux, gardent leur réglage
     d'origine — c'est le sens de `origine = 'app'`. */
  const venuDeLApp = base.origine === 'app';

  return {
    ...(ecrit || {}),
    coins:  Number(base.coins)  || 0,
    cafes:  Number(base.cafes)  || 0,
    shares: Number(base.shares) || 0,
    label:  ou(base.label, ecrit?.label) || 'Code promo',

    unlock:     ou(base.unlock,      ecrit?.unlock),
    unlockGame: ou(base.unlock_game, ecrit?.unlockGame),
    level:      ou(base.niveau,      ecrit?.level),
    totalEarnedOnly:  ou(base.total_earned_only,  ecrit?.totalEarnedOnly),
    totalEarnedFloor: ou(base.total_earned_floor, ecrit?.totalEarnedFloor),

    /* Jamais dé-secrétisable depuis la base : BARISTA05 se mérite. */
    secret: base.secret === true || ecrit?.secret === true,
    noXp:   venuDeLApp ? !!(base.no_xp ?? ecrit?.noXp) : true,
  };
}

/* lookupPromoCode :
   - rejette les codes secrets non encore révélés
     (revealed = liste d'IDs déjà révélés par l'utilisateur)
   - rejette les codes inconnus
   - retourne `{ code, coins, cafes, ... }` enrichi sinon.

   QUI DÉCIDE, DE LA BASE OU DU FICHIER
   ────────────────────────────────────
   La base fait foi. Trois cas, dans cet ordre :

     · ligne active en base    → c'est elle (fusionnée avec l'entrée
                                 écrite, cf. ci-dessus)
     · ligne marquée supprimée → le code est mort, on ne retombe PAS
                                 sur le fichier
     · aucune ligne            → l'entrée écrite dans ce fichier

   Le deuxième cas est le seul qui rende la suppression réelle. Sans
   lui, « supprimer BLACK » depuis la console n'aurait rien supprimé :
   l'app serait retombée sur sa copie en dur et le code aurait continué
   de marcher, en affichant le contraire. La ligne morte laissée en base
   est ce qui interdit ce retour en arrière.

   Le troisième est le filet : tant que sql/CODES_HISTORIQUES_EN_BASE.sql
   n'est pas collé — ou si Supabase est injoignable — tout fonctionne
   comme avant. */
export function lookupPromoCode(rawInput, revealed = [], codesEnBase = []){
  const code = (rawInput || '').trim().toUpperCase();
  if(!code) return null;

  const ecrit  = PROMO_CODES[code] || null;
  const enBase = (codesEnBase || []).find(c => String(c.code).toUpperCase() === code) || null;

  let entry;
  if(enBase){
    if(enBase.actif === false) return null;
    entry = fusionner(ecrit, enBase);
  } else {
    if(!ecrit) return null;
    entry = ecrit;
  }

  /* Code secret pas encore révélé pour cet utilisateur → invisible */
  if(entry.secret && !revealed.includes(code)) return null;

  return { code, ...entry };
}

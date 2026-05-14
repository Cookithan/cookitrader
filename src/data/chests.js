import { REWARDS } from "./constants.js";

/* ════════════════════════════════════════════════════
   COFFRES PREMIUM — 3 tiers (Bronze / Or / Légendaire)
   ────────────────────────────────────────────────────
   PHILOSOPHIE — le coffre est un OUTIL DE DÉCOUVERTE, pas un trade.
   Tu paies en ☕, tu reçois des COSMÉTIQUES (skins/thèmes/avatars/badges/
   titres/musiques) que tu n'as pas encore — jamais des ☕ en retour.

   FILTRE EN AMONT : la fonction `rollChest` exclut les IDs déjà dans
   `ownedIds` ET les items qui requièrent un niveau supérieur. Aucun
   doublon possible, même intra-coffre (les items tirés sont ajoutés au
   filtre pour les tirages suivants du même coffre).

   FALLBACK COOKIES : si le pool de cosmétiques pour la rareté tirée est
   vide après filtre (joueur whale qui a déjà tout pris dans la rareté),
   on tombe sur un montant de cookies de compensation. C'est volontairement
   modeste — le coffre n'est plus rentable quand il n'y a plus rien à
   découvrir, et c'est OK : à ce stade le joueur est censé chercher
   d'autres choses à acquérir.

   AUCUN ☕ DANS LE LOOT : explicite — pas de loop ☕ → ☕ qui n'apporte
   rien à part transformer un coût premium en un autre coût premium.
═══════════════════════════════════════════════════════ */

/* ── Tiers visibles dans REWARDS (achat) ──────────────── */
export const CHEST_TIERS = {
  bronze: {
    id: 'chest_bronze',
    name: 'Coffre Bronze',
    emoji: '📦',
    cost: 5,                /* ☕ */
    levelRequired: 3,
    glow: '#C17F3C',
    glowSoft: 'rgba(193,127,60,.35)',
    desc: '3 cosmétiques à découvrir',
  },
  gold: {
    id: 'chest_gold',
    name: "Coffre d'Or",
    emoji: '🎁',
    cost: 15,
    levelRequired: 5,
    glow: '#D4A017',
    glowSoft: 'rgba(212,160,23,.45)',
    desc: '3 cosmétiques rares à découvrir',
  },
  legendary: {
    id: 'chest_legendary',
    name: 'Coffre Légendaire',
    emoji: '💎',
    cost: 40,
    levelRequired: 8,
    glow: '#FFE066',
    glowSoft: 'rgba(255,224,102,.55)',
    desc: '3 cosmétiques épiques à découvrir',
  },
};

/* ── Distribution de rareté par tier ──────────────────
   Bronze : pull majoritairement commun/rare, qq épique, pas de légendaire
   Or     : centré sur rare + bonne chance épique + légendaire occasionnel
   Légendaire : centré sur épique + chance solide légendaire
   Total = 100 par tier. */
const TIER_DISTRIBUTION = {
  bronze:    { common: 65, rare: 30, epic: 5,  legendary: 0  },
  gold:      { common: 25, rare: 50, epic: 22, legendary: 3  },
  legendary: { common: 5,  rare: 25, epic: 55, legendary: 15 },
};

/* ── Couleurs de glow par rareté (palette café-only) ───── */
export const RARITY_VISUAL = {
  common:    { glow:'#C9A77A', soft:'rgba(201,167,122,.35)', label:'Commun'     },
  rare:      { glow:'#D4A017', soft:'rgba(212,160,23,.45)',  label:'Rare'       },
  epic:      { glow:'#F0C050', soft:'rgba(240,192,80,.55)',  label:'Épique'     },
  legendary: { glow:'#FFE066', soft:'rgba(255,224,102,.65)', label:'Légendaire' },
};

/* ── Fallback cookies si le pool d'une rareté est épuisé
   Volontairement modeste — la valeur du coffre est dans la découverte,
   pas dans la compensation. Approximativement aligné sur le coût en 🍪
   d'un item de la rareté équivalente en boutique standard. */
const RESOURCE_FALLBACK = {
  common:    300,
  rare:      1000,
  epic:      2500,
  legendary: 5000,
};

/* ── Catégorisation des cosmétiques par rareté (basée sur cost 🍪) ──
   common    : 0-499      → badges/avatars/thèmes débutants
   rare      : 500-1499   → mid-tier
   epic      : 1500-3499  → high-tier
   legendary : 3500+      → endgame */
function rarityOf(cost){
  if(cost >= 3500) return 'legendary';
  if(cost >= 1500) return 'epic';
  if(cost >= 500)  return 'rare';
  return 'common';
}

/* Items lootables : uniquement les cosmétiques pur (Skin/Thème/Avatar/
   Badge/Titre/Musique). Exclus : premium ☕, Boîte Mystère, éditions
   limitées événements, packs $CKM, jetons VIP, boosters consommables. */
function isLootable(reward){
  if(!reward) return false;
  if(reward.currency === 'cafe') return false;
  if(reward.inPremium) return false;
  if(reward.limited) return false;
  if(reward.applyAs === 'pack_shares') return false;
  return ['Skin','Thème','Avatar','Badge','Titre','Musique'].includes(reward.type);
}

const COSMETIC_POOL_BY_RARITY = {
  common:    REWARDS.filter(r => isLootable(r) && rarityOf(r.cost) === 'common'),
  rare:      REWARDS.filter(r => isLootable(r) && rarityOf(r.cost) === 'rare'),
  epic:      REWARDS.filter(r => isLootable(r) && rarityOf(r.cost) === 'epic'),
  legendary: REWARDS.filter(r => isLootable(r) && rarityOf(r.cost) === 'legendary'),
};

/* ── Tirage pondéré (rareté) ─────────────────────────── */
function pickRarity(tierId){
  const dist = TIER_DISTRIBUTION[tierId];
  const r = Math.random() * 100;
  let cum = 0;
  for(const [rarity, w] of Object.entries(dist)){
    cum += w;
    if(r < cum) return rarity;
  }
  return 'common';
}

/* Tire un cosmétique dispo (non possédé, niveau atteint) à la rareté
   donnée. Retourne null si pool vide après filtre — le caller bascule
   alors sur le fallback cookies. */
function pickCosmetic(rarity, level, ownedIds){
  const pool = COSMETIC_POOL_BY_RARITY[rarity] || [];
  const available = pool.filter(r =>
    !ownedIds.includes(r.id) &&
    (!r.levelRequired || level >= r.levelRequired)
  );
  if(available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

/* ── API publique ──────────────────────────────────────
   Tire 1 item du coffre. Retourne un objet normalisé :
     { rarity, type:'cosmetic'|'cookies', amount?, cosmeticId?,
       label, emoji, sourceReward? }
   Toujours essayer cosmétique d'abord ; fallback cookies si pool vide. */
function rollItem(tierId, level, ownedIds){
  const rarity = pickRarity(tierId);
  const reward = pickCosmetic(rarity, level, ownedIds);
  if(reward){
    return {
      rarity,
      type: 'cosmetic',
      cosmeticId: reward.id,
      amount: null,
      label: reward.name,
      emoji: reward.emoji,
      sourceReward: reward,
    };
  }
  /* Pool vide → fallback cookies modeste. */
  const amount = RESOURCE_FALLBACK[rarity];
  return {
    rarity,
    type: 'cookies',
    amount,
    cosmeticId: null,
    label: `+${amount.toLocaleString('fr-FR')} 🍪`,
    emoji: '🍪',
  };
}

/* Tire les 3 items d'un coffre. `tierId` ∈ 'bronze' | 'gold' | 'legendary'.
   IMPORTANT : on étend ownedIds au fil des tirages pour éviter de droper
   2 fois le même cosmétique dans le même coffre. */
export function rollChest(tierId, level, ownedIds){
  if(!TIER_DISTRIBUTION[tierId]) throw new Error(`Unknown chest tier: ${tierId}`);
  const items = [];
  const lockedIds = [...(ownedIds || [])];
  for(let i = 0; i < 3; i++){
    const it = rollItem(tierId, level, lockedIds);
    if(it.cosmeticId) lockedIds.push(it.cosmeticId);
    items.push(it);
  }
  return items;
}

/* Retourne le tier d'un reward ID 'chest_<tier>' (helper pour App.jsx). */
export function tierFromRewardId(rewardId){
  if(rewardId === 'chest_bronze')    return 'bronze';
  if(rewardId === 'chest_gold')      return 'gold';
  if(rewardId === 'chest_legendary') return 'legendary';
  return null;
}

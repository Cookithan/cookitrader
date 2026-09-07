import { REWARDS } from "../data/constants.js";

/* ════════════════════════════════════════════════════
   levelUnlocks.js — ce que chaque palier apporte réellement
   ────────────────────────────────────────────────────
   L'app connaissait déjà tout ça, mais ne le montrait nulle part : la
   liste des niveaux se contentait d'un nom et d'un coût en XP. Monter
   de niveau n'annonçait donc jamais ce qu'on allait y gagner.

   Tout est DÉRIVÉ des données existantes, rien n'est saisi en double :
     · mini-jeux   → `levelRequired` du tableau GAMES (passé en argument,
                     car il est construit dans App.jsx avec les libellés
                     déjà traduits)
     · marché $CKM → seuil niveau 3 (cf. App.jsx, `level >= 3`)
     · cafés ☕     → paliers 6/10/15/20/25 (cf. addCoins, isCafeMilestone)
     · cookies     → même formule que le bonus de level-up
     · boutique    → items REWARDS dont le levelRequired vaut ce palier
     · prestige    → niveau 25, l'apex

   ⚠️ Si l'un de ces seuils change dans App.jsx, il doit changer ICI aussi.
   Les constantes sont exportées pour qu'un futur refactor puisse les
   importer plutôt que les redéclarer.
═══════════════════════════════════════════════════════ */

export const CAFE_MILESTONES = [6, 10, 15, 20, 25];
export const MARKET_LEVEL    = 3;
export const PRESTIGE_LEVEL  = 25;

/* Bonus en cookies d'un passage de niveau — miroir d'App.jsx. */
export function levelCoinBonus(n){
  if(CAFE_MILESTONES.includes(n)) return 0;   /* ces paliers donnent du ☕ */
  return n >= 6 ? 50 + 10 * n : 10 * n;
}

/* Items de boutique qui s'ouvrent à ce palier. Mêmes exclusions que la
   BoutiqueTab : premium, éditions limitées et ex-boutique $CKM n'entrent
   pas dans la progression par palier. */
export function levelShopCount(n){
  return REWARDS.filter(r =>
    r.levelRequired === n
    && r.currency !== 'cafe'
    && !r.limited && !r.inPremium && !r.inActionsShop
    && r.applyAs !== 'pack_shares' && r.applyAs !== 'game_theme'
  ).length;
}

/* Liste affichable de ce que le palier `n` débloque.
   `games` = tableau GAMES d'App.jsx · `t` = fonction de traduction. */
export function levelUnlocks(n, games = [], t = (k)=>k){
  const out = [];

  games
    .filter(g => g.levelRequired === n && g.id !== 'checkin' && g.id !== 'quiz')
    .forEach(g => out.push({ icon: g.emoji || '🎮', text: g.title, strong: true }));

  if(n === MARKET_LEVEL) out.push({ icon:'📈', text: t('levels.unlock_market'), strong: true });
  if(n === PRESTIGE_LEVEL) out.push({ icon:'🌟', text: t('levels.unlock_prestige'), strong: true });

  if(CAFE_MILESTONES.includes(n)){
    out.push({ icon:'☕', text: t('levels.unlock_cafe') });
  } else if(n > 1){
    out.push({ icon:'🍪', text: t('levels.unlock_cookies', { n: levelCoinBonus(n) }) });
  }

  const shop = levelShopCount(n);
  if(shop > 0){
    out.push({ icon:'🛍️', text: t('levels.unlock_rewards', { n: shop, s: shop > 1 ? 's' : '' }) });
  }

  return out;
}

/* ════════════════════════════════════════════════════
   marketFeed.js — Helpers du feed marché (activité joueurs uniquement)
   ────────────────────────────────────────────────────
   En phase 1, le feed n'affiche QUE les transactions réelles des autres
   joueurs (lues via getMarketActivity → market_transactions JOIN users).
   Pas de news scriptées, pas de détection de mouvements.
═══════════════════════════════════════════════════════ */

/* Convertit une transaction enrichie (cf. getMarketActivity) en item de feed. */
export function activityToFeedItem(tx) {
  return {
    id: `activity_${tx.user_code}_${tx.created_at}`,
    /* 'gift' = actions offertes par un code promo. Elles poussent le
       cours comme un achat, donc même sentiment — mais une icône à
       elles, pour qu'on ne croie pas que le joueur a dépensé. */
    icon: tx.type === 'buy' ? '🛒' : tx.type === 'gift' ? '🎁' : '💰',
    user_code: tx.user_code,
    user_name: tx.user_name,
    user_avatar: tx.user_avatar,
    type: tx.type,
    shares: tx.shares,
    price_per_share: tx.price_per_share,
    sentiment: tx.type === 'sell' ? 'down' : 'up',
    timestampMs: tx.timestampMs,
  };
}

/* "il y a X min" — format relatif court, FR. */
export function formatRelativeTime(timestampMs, now = Date.now()) {
  const diff = Math.max(0, now - timestampMs);
  if (diff < 30_000)     return "à l'instant";
  if (diff < 60_000)     return `il y a ${Math.floor(diff / 1000)} s`;
  if (diff < 3_600_000)  return `il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`;
  return `il y a ${Math.floor(diff / 86_400_000)} j`;
}

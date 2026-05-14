import { useEffect, useState } from 'react';
import { activityToFeedItem, formatRelativeTime } from '../../lib/marketFeed';
import { useTranslation } from '../../i18n/index.js';

/* ════════════════════════════════════════════════════
   MarketFeed — Petit flux d'activité joueurs sous la courbe
   ────────────────────────────────────────────────────
   Affiche uniquement les transactions réelles des autres joueurs
   (achats/ventes), dans un encart discret placé sous le chart.

   Style café-only (CLAUDE.md) :
   - buy  → or  #D4A017 (sentiment 'up')
   - sell → moka #7D4E1F (sentiment 'down')

   Props :
   - activity : transactions enrichies (cf. getMarketActivity)
   - C        : thème
═══════════════════════════════════════════════════════ */

const SENTIMENT_COLOR = { up: '#D4A017', down: '#7D4E1F' };

function FeedLine({ item, C, now, t }) {
  const fg = SENTIMENT_COLOR[item.sentiment];
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '5px 8px',
      borderRadius: 8,
      fontSize: 11,
      lineHeight: 1.3,
    }}>
      <span style={{ fontSize: 12, flexShrink: 0, opacity: 0.85 }}>{item.icon}</span>
      <span style={{ flex: 1, minWidth: 0, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span style={{ color: fg, fontWeight: 700 }}>{item.user_name}</span>
        {' '}
        {item.type === 'buy' ? t('feed.bought') : t('feed.sold')}
        {' '}
        <span style={{ fontWeight: 700 }}>{item.shares}</span>
        {' '}{t('feed.at')} {item.price_per_share.toFixed(0)} 🍪
      </span>
      <span style={{ fontSize: 9, color: C.muted, flexShrink: 0 }}>
        {formatRelativeTime(item.timestampMs, now)}
      </span>
    </div>
  );
}

export function MarketFeed({ activity, C }) {
  const { t } = useTranslation();
  /* Force re-render toutes les 30s pour rafraîchir les "il y a X min". */
  const [, forceRender] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceRender(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!activity || activity.length === 0) return null;

  const now = Date.now();
  const items = activity.map(activityToFeedItem).slice(0, 3);

  return (
    <div style={{
      background: C.card2 || 'rgba(0,0,0,.03)',
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: '6px 8px',
      marginBottom: 12,
      marginTop: -4,
    }}>
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        color: C.muted,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        padding: '2px 4px 4px',
      }}>
        {t('feed.recent_activity')}
      </div>
      <div>
        {items.map(item => (
          <FeedLine key={item.id} item={item} C={C} now={now} t={t} />
        ))}
      </div>
    </div>
  );
}

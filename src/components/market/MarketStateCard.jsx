import { useState } from 'react';

/* ════════════════════════════════════════════════════
   MarketStateCard — bandeau prix + stock
   - state    : { current_price, available_shares, total_shares_supply }
   - dayChange: variation % vs il y a 24h (pour le label trend)
   Trend = "Plus haut qu'hier" / "Plus bas qu'hier" / "Stable" — pas de %
   affiché côté joueur (UX simplifiée). Bulle d'aide (?) explique la mécanique.
═══════════════════════════════════════════════════════ */

export function MarketStateCard({ state, dayChange }) {
  const [showHelp, setShowHelp] = useState(false);
  const available = state?.available_shares ?? 0;
  const total = state?.total_shares_supply ?? 10000;
  const availablePct = (available / total) * 100;

  let trendText, trendColor, arrow;
  if (dayChange > 1) {
    trendText = "Plus haut qu'hier"; trendColor = '#F0C050'; arrow = '↑';
  } else if (dayChange < -1) {
    trendText = "Plus bas qu'hier"; trendColor = '#A88060'; arrow = '↓';
  } else {
    trendText = 'Stable'; trendColor = 'rgba(255,255,255,0.7)'; arrow = '→';
  }

  return (
    <div style={{
      background: 'linear-gradient(140deg, #4A2C17, #7D4E1F)',
      borderRadius: 18,
      padding: 18,
      color: '#fff',
      marginBottom: 12,
      boxShadow: '0 8px 24px rgba(74,44,23,.35)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 2 }}>
            $CKM · Action Cookie
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#D4A017', marginTop: 4, lineHeight: 1 }}>
            {state ? state.current_price.toFixed(0) : '—'}
            <span style={{ fontSize: 18, color: 'rgba(212,160,23,0.7)', marginLeft: 6 }}>🍪</span>
          </div>
          <div style={{ fontSize: 13, color: trendColor, marginTop: 4, fontWeight: 700 }}>
            {arrow} {trendText}
          </div>
        </div>
        <div style={{
          background: 'rgba(212, 160, 23, 0.2)',
          border: '1.5px solid rgba(212, 160, 23, 0.5)',
          borderRadius: 12,
          padding: '6px 12px',
          fontSize: 11,
          fontWeight: 700,
          color: '#D4A017',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span className="live-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: '#D4A017', display: 'inline-block' }} />
          LIVE
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
              💎 Actions disponibles
            </span>
            <button
              onClick={() => setShowHelp(!showHelp)}
              style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'rgba(212,160,23,0.25)',
                border: '1px solid rgba(212,160,23,0.5)',
                color: '#D4A017', fontSize: 11, fontWeight: 800,
                cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >?</button>
          </div>
          <span style={{ color: '#D4A017', fontWeight: 700, fontSize: 11 }}>
            {available.toLocaleString()} / {total.toLocaleString()}
          </span>
        </div>
        <div style={{ height: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${availablePct}%`,
            background: 'linear-gradient(90deg, #C17F3C, #D4A017)',
            borderRadius: 4,
            transition: 'width 0.5s ease',
          }} />
        </div>

        {showHelp && (
          <div style={{
            marginTop: 8,
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 10,
            fontSize: 11,
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.4,
          }}>
            💡 Plus les joueurs achètent, moins il en reste et plus le prix monte. Quand on vend, le stock revient.
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';

/* ════════════════════════════════════════════════════
   MarketStateCard — bandeau prix + stock
   - state    : { current_price, available_shares, total_shares_supply }
   - dayChange: variation % vs il y a 24h (pour le label trend)
   Trend = "Plus haut qu'hier" / "Plus bas qu'hier" / "Stable" — pas de %
   affiché côté joueur (UX simplifiée). Bulle d'aide (?) explique la mécanique.
═══════════════════════════════════════════════════════ */

function fmtHM(date) {
  if (!date) return '';
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}h${m}`;
}

export function MarketStateCard({ state, dayChange, marketStatus }) {
  const [showHelp, setShowHelp] = useState(false);

  /* Flash live ticker — quand le prix change entre 2 refreshs, on rejoue
     une animation courte (or pour hausse, moka pour baisse). Le `key`
     change à chaque variation pour forcer le remount → l'animation se
     déclenche systématiquement, même si la direction est la même. */
  const prevPriceRef = useRef(null);
  const [flash, setFlash] = useState({ dir: null, key: 0 });
  useEffect(() => {
    if (!state) return;
    const prev = prevPriceRef.current;
    const curr = state.current_price;
    /* Seuil minuscule (0.01) pour ignorer le bruit JS, mais déclencher
       même sur des micro-variations (mean reversion permanente). */
    if (prev !== null && Math.abs(prev - curr) > 0.01) {
      setFlash(f => ({ dir: curr > prev ? 'up' : 'down', key: f.key + 1 }));
    }
    prevPriceRef.current = curr;
  }, [state?.current_price]);

  const available = state?.available_shares ?? 0;
  const total = state?.total_shares_supply ?? 1000;
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
            $CKM · Action CookiMiner
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, marginTop: 4, lineHeight: 1 }}>
            <span
              key={flash.key}
              className={
                flash.dir === 'up'   ? 'price-flash-up'   :
                flash.dir === 'down' ? 'price-flash-down' : ''
              }
              style={{ color: '#D4A017', transformOrigin: 'left center' }}
            >
              {state ? state.current_price.toFixed(0) : '—'}
            </span>
            <span style={{ fontSize: 18, color: 'rgba(212,160,23,0.7)', marginLeft: 6 }}>🍪</span>
          </div>
          <div style={{ fontSize: 13, color: trendColor, marginTop: 4, fontWeight: 700 }}>
            {arrow} {trendText}
          </div>
        </div>
        {(() => {
          const open = marketStatus?.open ?? true;
          const maintenance = marketStatus?.maintenance;
          const next = marketStatus?.nextChange;
          /* 3 états visuels distincts : OUVERT (or pulsant), MAINTENANCE
             (orange + clé) ou FERMÉ (gris + horaire). */
          const bg     = open ? 'rgba(212, 160, 23, 0.2)' : maintenance ? 'rgba(193, 127, 60, 0.28)' : 'rgba(120, 90, 60, 0.25)';
          const border = open ? 'rgba(212, 160, 23, 0.5)' : maintenance ? 'rgba(193, 127, 60, 0.65)' : 'rgba(160, 130, 100, 0.5)';
          const fg     = open ? '#D4A017' : maintenance ? '#FFB060' : '#D8C8B0';
          const label  = open ? 'OUVERT' : maintenance ? '🛠️ MAINTENANCE' : 'FERMÉ';
          return (
            <div style={{
              background: bg,
              border: `1.5px solid ${border}`,
              borderRadius: 12,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 700,
              color: fg,
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
              minWidth: 92,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {open && <span className="live-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: '#D4A017', display: 'inline-block' }} />}
                {label}
              </div>
              {maintenance ? (
                <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.85, letterSpacing: 0.3 }}>
                  trading bloqué
                </div>
              ) : next ? (
                <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.85, letterSpacing: 0.3 }}>
                  {open ? 'ferme' : 'ouvre'} {fmtHM(next)}
                </div>
              ) : null}
            </div>
          );
        })()}
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

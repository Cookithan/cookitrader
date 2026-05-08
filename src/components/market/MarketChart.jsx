/* ════════════════════════════════════════════════════
   MarketChart — courbe SVG des prix sur la fenêtre choisie
   - history       : [{ price, recorded_at }, ...] trié chronologiquement
                      (déjà filtré server-side selon range)
   - range         : minutes (60 / 1440)
   - onRangeChange : callback pour changer la fenêtre
   - Couleur courbe : caramel (#D4A017) si trend haussier sur la fenêtre,
                       moka (#7D4E1F) sinon. Pas de rouge / vert.
═══════════════════════════════════════════════════════ */

const RANGES = [
  { id: 60,   label: '1h'  },
  { id: 1440, label: '24h' },
];

function RangeSelector({ range, onRangeChange, C }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {RANGES.map(r => {
        const active = r.id === range;
        return (
          <button
            key={r.id}
            onClick={() => onRangeChange(r.id)}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.3,
              background: active ? 'rgba(212,160,23,0.2)' : C.card2,
              color: active ? '#D4A017' : C.muted,
              border: `1px solid ${active ? 'rgba(212,160,23,0.45)' : C.border}`,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

export function MarketChart({ history, range, onRangeChange, C }) {
  const empty = !history || history.length === 0;
  const single = history && history.length === 1;

  if (empty || single) {
    return (
      <div style={{
        background: C.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        border: `1.5px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>📊 Évolution</div>
          <RangeSelector range={range} onRangeChange={onRangeChange} C={C} />
        </div>
        <div style={{
          padding: '24px 8px',
          textAlign: 'center',
          color: C.muted,
          fontSize: 12,
        }}>
          {empty ? (
            <>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📊</div>
              <div>Aucune donnée sur les {range >= 60 ? `${range / 60}h` : `${range}m`} dernières.</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Essaie une fenêtre plus large.</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📈</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                Premier point : {history[0].price.toFixed(0)} 🍪
              </div>
              <div style={{ marginTop: 4 }}>La courbe se dessinera dans quelques secondes.</div>
            </>
          )}
        </div>
      </div>
    );
  }

  const prices = history.map(h => h.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = Math.max(maxPrice - minPrice, 1);

  const W = 320;
  const H = 120;
  const PAD = 8;

  const points = history.map((h, i) => {
    const x = PAD + (i / (history.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((h.price - minPrice) / priceRange) * (H - PAD * 2);
    return { x, y };
  });

  const pathD = points.map((p, i) =>
    (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)
  ).join(' ');

  const areaD = pathD + ` L ${points[points.length - 1].x.toFixed(1)},${H - PAD} L ${points[0].x.toFixed(1)},${H - PAD} Z`;

  const trend = prices[prices.length - 1] >= prices[0];
  const lineColor = trend ? '#D4A017' : '#7D4E1F';
  const fillColor = trend ? 'rgba(212,160,23,0.2)' : 'rgba(125,78,31,0.2)';

  return (
    <div style={{
      background: C.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      border: `1.5px solid ${C.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>
          📊 Évolution
        </div>
        <RangeSelector range={range} onRangeChange={onRangeChange} C={C} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 120, display: 'block' }}>
        <line x1={PAD} y1={H/2} x2={W-PAD} y2={H/2} stroke={C.border} strokeWidth="1" strokeDasharray="3,3" opacity="0.6"/>
        <path d={areaD} fill={fillColor}/>
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
        <circle cx={points[points.length-1].x} cy={points[points.length-1].y} r="4" fill={lineColor}/>
        <circle cx={points[points.length-1].x} cy={points[points.length-1].y} r="6" fill="none" stroke={lineColor} strokeWidth="1" opacity="0.5"/>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted, marginTop: 6 }}>
        <span>Min : {minPrice.toFixed(0)} 🍪</span>
        <span>{history.length} points</span>
        <span>Max : {maxPrice.toFixed(0)} 🍪</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MarketChart — courbe SVG des prix sur 24h
   - history : [{ price, recorded_at }, ...] trié chronologiquement
   - Si <2 points : message "En attente de données"
   - Couleur : caramel (#D4A017) si trend haussier sur la fenêtre,
              moka (#7D4E1F) sinon — pas de rouge / vert.
═══════════════════════════════════════════════════════ */

export function MarketChart({ history, C }) {
  if (!history || history.length === 0) {
    return (
      <div style={{
        background: C.card,
        borderRadius: 16,
        padding: 40,
        textAlign: 'center',
        color: C.muted,
        fontSize: 13,
        marginBottom: 12,
        border: `1.5px solid ${C.border}`,
      }}>
        📊 En attente de données du marché...
      </div>
    );
  }
  /* Avec 1 seul point, pas encore de courbe possible — message d'attente
     avec le prix de départ pour que l'utilisateur sache que ça démarre. */
  if (history.length === 1) {
    return (
      <div style={{
        background: C.card,
        borderRadius: 16,
        padding: 24,
        textAlign: 'center',
        color: C.muted,
        fontSize: 12,
        marginBottom: 12,
        border: `1.5px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>📈</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
          Prix de départ : {history[0].price.toFixed(0)} 🍪
        </div>
        <div style={{ marginTop: 4, lineHeight: 1.4 }}>
          La courbe se dessinera au fil des prochains snapshots (1 / heure).
        </div>
      </div>
    );
  }

  const prices = history.map(h => h.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = Math.max(maxPrice - minPrice, 1);

  const W = 320;
  const H = 120;
  const PAD = 8;

  const points = history.map((h, i) => {
    const x = PAD + (i / (history.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((h.price - minPrice) / range) * (H - PAD * 2);
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
          📊 Évolution sur 24h
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>
          {history.length} points
        </div>
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
        <span>Max : {maxPrice.toFixed(0)} 🍪</span>
      </div>
    </div>
  );
}

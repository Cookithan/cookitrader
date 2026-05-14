import { useRef, useState } from 'react';
import { useTranslation } from '../../i18n/index.js';

/* ════════════════════════════════════════════════════
   MarketChart — Courbe SVG des prix avec hover/touch
   ────────────────────────────────────────────────────
   - history : [{ price, recorded_at }, ...] trié chronologiquement
   - range   : minutes (60 / 1440)
   - Hover/touch : crosshair vertical + tooltip prix+heure

   Mobile-first : `touchAction:'none'` pour éviter le scroll vertical
   pendant l'interaction, `onPointerMove` couvre souris ET touch.
   Couleurs café-only (CLAUDE.md) : pas de rouge / pas de vert.
═══════════════════════════════════════════════════════ */

const RANGES = [
  { id: 60,   label: '1h'  },
  { id: 1440, label: '24h' },
];

const W = 320;
const H = 120;
const PAD = 8;

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

function fmtTime(iso) {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function MarketChart({ history, range, onRangeChange, C }) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const empty  = !history || history.length === 0;
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
          <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>📊 {t('chart.evolution')}</div>
          <RangeSelector range={range} onRangeChange={onRangeChange} C={C} />
        </div>
        <div style={{ padding: '24px 8px', textAlign: 'center', color: C.muted, fontSize: 12 }}>
          {empty ? (
            <>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📊</div>
              <div>{t('chart.no_data', { range: range >= 60 ? `${range / 60}h` : `${range}m` })}</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>{t('chart.try_wider')}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📈</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                {t('chart.first_point', { n: history[0].price.toFixed(0) })}
              </div>
              <div style={{ marginTop: 4 }}>{t('chart.will_draw_soon')}</div>
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

  const points = history.map((h, i) => {
    const x = PAD + (i / (history.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((h.price - minPrice) / priceRange) * (H - PAD * 2);
    return { x, y };
  });

  const pathD = points.map((p, i) =>
    (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)
  ).join(' ');

  const areaD = pathD
    + ` L ${points[points.length - 1].x.toFixed(1)},${H - PAD}`
    + ` L ${points[0].x.toFixed(1)},${H - PAD} Z`;

  const trend = prices[prices.length - 1] >= prices[0];
  const lineColor = trend ? '#D4A017' : '#7D4E1F';
  const fillColor = trend ? 'rgba(212,160,23,0.2)' : 'rgba(125,78,31,0.2)';

  const handlePointerMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const idx = Math.round(pct * (history.length - 1));
    setHoverIdx(idx);
  };

  const handlePointerLeave = () => setHoverIdx(null);

  const hovered = hoverIdx !== null ? history[hoverIdx] : null;
  const hoveredPt = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div style={{
      background: C.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      border: `1.5px solid ${C.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>📊 {t('chart.evolution')}</div>
        <RangeSelector range={range} onRangeChange={onRangeChange} C={C} />
      </div>

      {/* Wrapper relative + pointer handlers : couvre souris ET touch.
          touchAction:'none' empêche le scroll vertical quand on glisse
          sur la courbe sur mobile. */}
      <div
        ref={containerRef}
        style={{ position: 'relative', touchAction: 'none', userSelect: 'none' }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerMove}
      >
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 120, display: 'block' }}>
          <line x1={PAD} y1={H/2} x2={W-PAD} y2={H/2} stroke={C.border} strokeWidth="1" strokeDasharray="3,3" opacity="0.6"/>
          <path d={areaD} fill={fillColor}/>
          <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>

          {/* Dernier point */}
          <circle cx={points[points.length-1].x} cy={points[points.length-1].y} r="4" fill={lineColor}/>
          <circle cx={points[points.length-1].x} cy={points[points.length-1].y} r="6" fill="none" stroke={lineColor} strokeWidth="1" opacity="0.5"/>

          {/* Crosshair vertical au hover */}
          {hoveredPt && (
            <>
              <line
                x1={hoveredPt.x} y1={PAD}
                x2={hoveredPt.x} y2={H-PAD}
                stroke="#D4A017" strokeWidth="1" strokeDasharray="2,2" opacity="0.7"
              />
              <circle cx={hoveredPt.x} cy={hoveredPt.y} r="5" fill="#fff" stroke={lineColor} strokeWidth="2"/>
            </>
          )}
        </svg>

        {/* Tooltip flottant — positionné en % de la largeur container.
            Bord clamp pour ne pas dépasser à gauche/droite. */}
        {hovered && hoveredPt && (
          <div style={{
            position: 'absolute',
            left: `${Math.max(8, Math.min(92, (hoveredPt.x / W) * 100))}%`,
            top: -2,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            background: '#3D2010',
            color: '#FFE066',
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,.4)',
            border: '1px solid rgba(212,160,23,.4)',
            zIndex: 2,
          }}>
            {hovered.price.toFixed(0)} 🍪
            <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.75, fontWeight: 600 }}>
              {fmtTime(hovered.recorded_at)}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted, marginTop: 6 }}>
        <span>{t('chart.min')} : {minPrice.toFixed(0)} 🍪</span>
        <span>{history.length} {t('chart.points')}</span>
        <span>{t('chart.max')} : {maxPrice.toFixed(0)} 🍪</span>
      </div>
    </div>
  );
}

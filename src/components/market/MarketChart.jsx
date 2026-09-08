import { useRef, useState } from 'react';
import { useTranslation } from '../../i18n/index.js';

/* ════════════════════════════════════════════════════
   MarketChart — Courbe SVG des prix avec hover/touch
   ────────────────────────────────────────────────────
   - history : [{ price, recorded_at }, ...] trié chronologiquement
   - range   : minutes (60 / 1440 / 10080 / 43200)
   - Hover/touch : crosshair vertical + tooltip prix+heure

   Mobile-first : `touchAction:'none'` pour éviter le scroll vertical
   pendant l'interaction, `onPointerMove` couvre souris ET touch.
   Couleurs café-only (CLAUDE.md) : pas de rouge / pas de vert.

   ⚠️ L'AXE DES X EST TEMPOREL (08/09/2026), plus positionnel. Avant,
   les points étaient espacés régulièrement quel que soit leur instant :
   dix ordres passés en une minute occupaient autant de largeur que cinq
   heures de calme. Sur une fenêtre d'un mois, ça donnait une courbe qui
   racontait n'importe quoi. Chaque point est désormais placé à sa vraie
   date — les périodes creuses se voient, les rafales aussi.
═══════════════════════════════════════════════════════ */

const RANGES = [
  { id: 60,    label: '1 h'    },
  { id: 1440,  label: '24 h'   },
  { id: 10080, label: '7 j'    },
  { id: 43200, label: '1 mois' },
];

const W = 320;
const H = 132;
const PAD = 8;
const PAD_TOP = 12;

const GOLD     = '#D4A017';
const ESPRESSO = '#7D4E1F';

function RangeSelector({ range, onRangeChange, C }) {
  return (
    /* flex-wrap et non scroll horizontal : les quatre fenêtres doivent
       être visibles d'un coup, y compris sur un écran de 360 px. */
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {RANGES.map(r => {
        const active = r.id === range;
        return (
          <button
            key={r.id}
            onPointerDown={() => onRangeChange(r.id)}
            style={{
              flex: '1 1 auto',
              padding: '5px 10px',
              borderRadius: 9,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.3,
              background: active ? 'rgba(212,160,23,0.2)' : C.card2,
              color: active ? GOLD : C.muted,
              border: `1px solid ${active ? 'rgba(212,160,23,0.5)' : C.border}`,
              cursor: 'pointer',
              touchAction: 'manipulation',
              transition: 'background .2s, color .2s, border-color .2s',
            }}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

const two = (n) => String(n).padStart(2, '0');

/* Étiquette d'un instant, calibrée sur la largeur de la fenêtre : sur
   une heure on veut l'heure précise, sur un mois on veut la date. */
function fmtStamp(iso, range) {
  const d = new Date(iso);
  if (range <= 1440) return `${two(d.getHours())}:${two(d.getMinutes())}`;
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}`;
}

function fmtStampFull(iso, range) {
  const d = new Date(iso);
  const heure = `${two(d.getHours())}:${two(d.getMinutes())}`;
  if (range <= 1440) return heure;
  return `${two(d.getDate())}/${two(d.getMonth() + 1)} ${heure}`;
}

export function MarketChart({ history, range, onRangeChange, C }) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const empty  = !history || history.length === 0;
  const single = history && history.length === 1;
  const rangeLabel = (RANGES.find(r => r.id === range) || {}).label || `${range} min`;

  if (empty || single) {
    return (
      <div style={{
        background: C.card,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        border: `1.5px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 10 }}>
          📊 {t('chart.evolution')}
        </div>
        <div style={{ padding: '20px 8px 22px', textAlign: 'center', color: C.muted, fontSize: 12 }}>
          {empty ? (
            <>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📊</div>
              <div>{t('chart.no_data', { range: rangeLabel })}</div>
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
        <RangeSelector range={range} onRangeChange={onRangeChange} C={C} />
      </div>
    );
  }

  const prices = history.map(h => h.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  /* Marché parfaitement plat : on force une amplitude pour que la ligne
     se pose au milieu de la carte, et non collée en bas. */
  const priceRange = Math.max(maxPrice - minPrice, 1);

  const times = history.map(h => new Date(h.recorded_at).getTime());
  const t0 = times[0];
  const t1 = times[times.length - 1];
  const span = Math.max(t1 - t0, 1);

  const points = history.map((h, i) => {
    const x = PAD + ((times[i] - t0) / span) * (W - PAD * 2);
    const y = H - PAD - ((h.price - minPrice) / priceRange) * (H - PAD - PAD_TOP);
    return { x, y };
  });

  const pathD = points.map((p, i) =>
    (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)
  ).join(' ');

  const areaD = pathD
    + ` L ${points[points.length - 1].x.toFixed(1)},${H - PAD}`
    + ` L ${points[0].x.toFixed(1)},${H - PAD} Z`;

  const first = prices[0];
  const last  = prices[prices.length - 1];
  const delta = first > 0 ? ((last - first) / first) * 100 : 0;
  const trend = last >= first;
  const lineColor = trend ? GOLD : ESPRESSO;
  const gradId = trend ? 'ckmUp' : 'ckmDown';

  const handlePointerMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    /* L'axe étant temporel, on cherche le point le plus proche en X et
       non l'index proportionnel — sinon le curseur accroche le mauvais
       point dès que les mesures ne sont pas régulières. */
    const targetX = PAD + pct * (W - PAD * 2);
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - targetX);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    setHoverIdx(best);
  };

  const handlePointerLeave = () => setHoverIdx(null);

  const hovered = hoverIdx !== null ? history[hoverIdx] : null;
  const hoveredPt = hoverIdx !== null ? points[hoverIdx] : null;
  const lastPt = points[points.length - 1];

  return (
    <div style={{
      background: C.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      border: `1.5px solid ${C.border}`,
    }}>
      {/* En-tête : le titre, et surtout la variation SUR LA FENÊTRE
          CHOISIE — c'est la réponse à la question qu'on se pose en
          changeant de fenêtre (« et sur un mois, ça donne quoi ? »). */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>📊 {t('chart.evolution')}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: lineColor, whiteSpace: 'nowrap' }}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)} %
          </span>
          <span style={{ fontSize: 10, color: C.muted, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {rangeLabel}
          </span>
        </div>
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
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 132, display: 'block' }}>
          <defs>
            {/* Dégradé sous la courbe : dense contre la ligne, éteint
                vers le bas. Un aplat uniforme écrasait le relief. */}
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={lineColor} stopOpacity="0.34" />
              <stop offset="55%"  stopColor={lineColor} stopOpacity="0.12" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Trois repères horizontaux : haut, milieu, bas de l'amplitude
              affichée. Donne une échelle à l'oeil sans encombrer. */}
          {[0, 0.5, 1].map(f => {
            const y = (H - PAD) - f * (H - PAD - PAD_TOP);
            return (
              <line key={f} x1={PAD} y1={y} x2={W - PAD} y2={y}
                stroke={C.border} strokeWidth="1" strokeDasharray="3,4"
                opacity={f === 0.5 ? 0.55 : 0.3} />
            );
          })}

          <path d={areaD} fill={`url(#${gradId})`} />
          <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {/* Dernier point : pastille pleine + halo qui respire. Le
              battement est en SMIL et non en CSS — pas de keyframe à
              ajouter dans globalStyles pour un seul élément. */}
          <circle cx={lastPt.x} cy={lastPt.y} r="4" fill={lineColor} />
          <circle cx={lastPt.x} cy={lastPt.y} r="6" fill="none" stroke={lineColor} strokeWidth="1.2" opacity="0.55">
            <animate attributeName="r" values="5;10;5" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.55;0;0.55" dur="2.4s" repeatCount="indefinite" />
          </circle>

          {/* Crosshair vertical au hover */}
          {hoveredPt && (
            <>
              <line
                x1={hoveredPt.x} y1={PAD_TOP}
                x2={hoveredPt.x} y2={H - PAD}
                stroke={GOLD} strokeWidth="1" strokeDasharray="2,2" opacity="0.7"
              />
              <circle cx={hoveredPt.x} cy={hoveredPt.y} r="5" fill={C.card} stroke={lineColor} strokeWidth="2" />
            </>
          )}
        </svg>

        {/* Tooltip flottant — positionné en % de la largeur container.
            Bord clamp pour ne pas dépasser à gauche/droite. */}
        {hovered && hoveredPt && (
          <div style={{
            position: 'absolute',
            left: `${Math.max(9, Math.min(91, (hoveredPt.x / W) * 100))}%`,
            top: -4,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            background: '#3D2010',
            color: '#FFE066',
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 800,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,.4)',
            border: '1px solid rgba(212,160,23,.4)',
            zIndex: 2,
          }}>
            {hovered.price.toFixed(0)} 🍪
            <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.75, fontWeight: 600 }}>
              {fmtStampFull(hovered.recorded_at, range)}
            </span>
          </div>
        )}
      </div>

      {/* Bornes de temps sous la courbe : sans elles, une fenêtre d'un
          mois ne dit pas de quand à quand elle parle. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: C.muted, marginTop: 3, fontWeight: 600 }}>
        <span>{fmtStamp(history[0].recorded_at, range)}</span>
        <span>{fmtStamp(history[history.length - 1].recorded_at, range)}</span>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 10, color: C.muted, marginTop: 8, marginBottom: 10, fontWeight: 700,
      }}>
        <span>{t('chart.min')} <span style={{ color: C.text }}>{minPrice.toFixed(0)} 🍪</span></span>
        <span style={{ opacity: .7 }}>{history.length} {t('chart.points')}</span>
        <span>{t('chart.max')} <span style={{ color: C.text }}>{maxPrice.toFixed(0)} 🍪</span></span>
      </div>

      <RangeSelector range={range} onRangeChange={onRangeChange} C={C} />
    </div>
  );
}

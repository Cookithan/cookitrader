import { PRICE_REF } from "../data/market.js";

/* ════════════════════════════════════════════════════
   Sparkline — courbe SVG du prix $CKM
   - history : tableau des derniers prix (ordre chronologique, n derniers)
   - up      : booléen — direction du DERNIER tick (couleur de la courbe)
   - 1 path linePath + 1 path areaPath dégradé + 1 cercle blanc bordé sur le dernier point
   - Stretch via preserveAspectRatio:none : adapté à la largeur de la carte parent
════════════════════════════════════════════════════ */

export function Sparkline({ history, up }) {
  const W = 300, H = 80, PAD = 4;
  const pts = history.length >= 2 ? history : [history[0] ?? PRICE_REF, history[0] ?? PRICE_REF];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = (max - min) || 1;
  const stepX = pts.length > 1 ? (W - PAD*2) / (pts.length - 1) : 0;
  const yOf = (v) => PAD + (1 - (v - min) / span) * (H - PAD*2);
  const coords = pts.map((v,i) => [PAD + i*stepX, yOf(v)]);
  const linePath = coords.map(([x,y],i) => (i===0?`M${x.toFixed(1)} ${y.toFixed(1)}`:`L${x.toFixed(1)} ${y.toFixed(1)}`)).join(' ');
  const areaPath = `${linePath} L${(PAD + (pts.length-1)*stepX).toFixed(1)} ${H-PAD} L${PAD} ${H-PAD} Z`;
  const stroke = up ? '#D4A017' : '#4A2C17';
  const gradId = up ? 'sparkUp' : 'sparkDown';
  const gradColor = up ? '#D4A017' : '#7D4E1F';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width:'100%', height:80, display:'block', overflow:'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={gradColor} stopOpacity=".55" />
          <stop offset="100%" stopColor={gradColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} style={{ transition:'d .25s ease' }} />
      <path d={linePath}  fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" style={{ transition:'d .25s ease, stroke .25s ease', filter:'drop-shadow(0 1px 2px rgba(0,0,0,.25))' }} />
      {coords.length > 0 && (
        <circle cx={coords[coords.length-1][0]} cy={coords[coords.length-1][1]} r="3.2" fill="#fff" stroke={stroke} strokeWidth="2" style={{ transition:'cx .25s ease, cy .25s ease' }} />
      )}
    </svg>
  );
}

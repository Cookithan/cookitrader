import { useState } from "react";
import { fmt } from "../../data/market.js";
import { GOLD, ESPRESSO } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   TradeModal — bottom sheet d'achat/vente $CKM
   - mode : 'buy' | 'sell' (initial, on peut switch dans le modal)
   - buyMax = floor(coins * 0.8)        — cap d'investissement à 80% des cookies actifs
   - shares = ckmShares détenues
   - amount unifié : entier en mode buy (cookies) / float 3 décimales en mode sell ($CKM)
   - Stepper +/− · slider 0..100% · pills 25/50/75/MAX
   - Switch buy/sell désactivé si la position correspondante est vide
═══════════════════════════════════════════════════════ */

export function TradeModal({ mode, onClose, coins, buyMax, shares, price, onBuy, onSell, C }) {
  const [currentMode, setCurrentMode] = useState(mode);
  const isBuy = currentMode === 'buy';
  const max   = isBuy ? buyMax : shares;
  const [amount, setAmount] = useState(0);

  const clamp = (v) => Math.max(0, Math.min(v, max));
  const setPct = (p) => setAmount(isBuy ? Math.floor(max * p) : Math.round(max * p * 1000) / 1000);
  const onInput = (e) => {
    const raw = e.target.value.replace(',', '.');
    if(raw === '' || raw === '.') { setAmount(0); return; }
    const v = parseFloat(raw);
    if(isNaN(v)) return;
    setAmount(clamp(v));
  };
  const step = isBuy ? Math.max(1, Math.round(buyMax / 50)) : Math.max(0.001, Math.round((shares/50)*1000)/1000);
  const inc = () => setAmount(a => clamp((isBuy ? Math.floor(a) : a) + step));
  const dec = () => setAmount(a => clamp((isBuy ? Math.floor(a) : a) - step));

  /* Slider */
  const sliderPct = max > 0 ? (amount / max) * 100 : 0;
  const onSlider = (e) => {
    const pct = Number(e.target.value);
    setAmount(isBuy ? Math.floor(max * pct/100) : Math.round((max * pct/100) * 1000) / 1000);
  };

  /* Reset l'amount quand on switch buy/sell */
  const switchTo = (m) => {
    if(m === currentMode) return;
    setCurrentMode(m);
    setAmount(0);
  };

  const previewParts    = isBuy ? (price > 0 ? amount / price : 0) : amount;
  const previewProceeds = isBuy ? null : Math.floor(amount * price);
  const valid = isBuy ? (amount >= 1 && amount <= buyMax) : (amount > 1e-6 && amount <= shares);
  const canSwitchSell = shares > 1e-9;
  const canSwitchBuy  = buyMax >= 1;

  const confirm = () => {
    if(!valid) return;
    if(isBuy) onBuy(amount); else onSell(amount);
  };

  const tabBg = (active, isBuyTab) => active
    ? (isBuyTab ? GOLD : ESPRESSO)
    : 'transparent';

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.78)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:80, backdropFilter:'blur(6px)' }}>
      <div onClick={e=>e.stopPropagation()} className="bi" style={{ background:C.card, borderTopLeftRadius:24, borderTopRightRadius:24, padding:'18px 18px 22px', width:'100%', maxWidth:430, border:`1px solid ${C.border}`, boxShadow:'0 -10px 32px rgba(0,0,0,.35)' }}>

        {/* Petite poignée */}
        <div style={{ width:40, height:4, borderRadius:2, background:C.border, margin:'0 auto 14px' }} />

        {/* Toggle Buy / Sell */}
        <div style={{ display:'flex', gap:6, padding:4, borderRadius:14, background:C.card2, marginBottom:14 }}>
          <button
            onClick={()=>canSwitchBuy && switchTo('buy')}
            disabled={!canSwitchBuy}
            style={{
              flex:1, padding:'10px 0', borderRadius:10, fontSize:13, fontWeight:800, letterSpacing:.4,
              background: tabBg(isBuy, true),
              color: isBuy ? '#fff' : (canSwitchBuy ? C.text : C.muted),
              cursor: canSwitchBuy ? 'pointer' : 'not-allowed',
              boxShadow: isBuy ? '0 4px 12px rgba(212,160,23,.4)' : 'none'
            }}
          >
            ACHETER
          </button>
          <button
            onClick={()=>canSwitchSell && switchTo('sell')}
            disabled={!canSwitchSell}
            style={{
              flex:1, padding:'10px 0', borderRadius:10, fontSize:13, fontWeight:800, letterSpacing:.4,
              background: tabBg(!isBuy, false),
              color: !isBuy ? '#fff' : (canSwitchSell ? C.text : C.muted),
              cursor: canSwitchSell ? 'pointer' : 'not-allowed',
              boxShadow: !isBuy ? '0 4px 12px rgba(74,44,23,.4)' : 'none'
            }}
          >
            VENDRE
          </button>
        </div>

        {/* Prix actuel + max */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, fontSize:11 }}>
          <span style={{ color:C.muted }}>$CKM @ <strong style={{ color:C.text }}>{fmt(price)} 🍪</strong></span>
          <span style={{ color:C.muted }}>Max : <strong style={{ color:C.text }}>{isBuy ? `${buyMax} 🍪` : `${fmt(shares,3)} $CKM`}</strong></span>
        </div>

        {/* Stepper + input */}
        <div style={{ display:'flex', alignItems:'stretch', gap:8, marginBottom:10 }}>
          <button onClick={dec} disabled={amount<=0} style={{ width:46, borderRadius:14, background:C.card2, border:`1.5px solid ${C.border}`, fontSize:24, fontWeight:800, color:amount<=0?C.muted:C.text, cursor:amount<=0?'not-allowed':'pointer' }}>−</button>
          <div style={{ flex:1, position:'relative' }}>
            <input
              type="text" inputMode="decimal"
              value={amount === 0 ? '' : (isBuy ? String(Math.floor(amount)) : fmt(amount, 3))}
              onChange={onInput}
              placeholder="0"
              style={{ width:'100%', padding:'14px 14px 14px 14px', fontSize:24, fontWeight:800, background:C.card2, border:`2px solid ${valid?'#D4A017':C.border}`, borderRadius:14, color:C.text, outline:'none', textAlign:'center', transition:'border-color .2s' }}
            />
            <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', fontSize:11, color:C.muted, fontWeight:700, pointerEvents:'none' }}>
              {isBuy ? '🍪' : '$CKM'}
            </span>
          </div>
          <button onClick={inc} disabled={amount>=max} style={{ width:46, borderRadius:14, background:C.card2, border:`1.5px solid ${C.border}`, fontSize:24, fontWeight:800, color:amount>=max?C.muted:C.text, cursor:amount>=max?'not-allowed':'pointer' }}>+</button>
        </div>

        {/* Slider */}
        <div style={{ padding:'4px 4px 6px' }}>
          <input
            type="range"
            min={0} max={100} step={1}
            value={Math.round(sliderPct)}
            onChange={onSlider}
            style={{
              width:'100%', height:6, borderRadius:3, appearance:'none', cursor:'pointer',
              background:`linear-gradient(to right, ${isBuy?'#D4A017':'#7D4E1F'} 0%, ${isBuy?'#D4A017':'#7D4E1F'} ${sliderPct}%, ${C.card2} ${sliderPct}%, ${C.card2} 100%)`
            }}
          />
        </div>

        {/* Pills % */}
        <div style={{ display:'flex', gap:6, marginBottom:14 }}>
          {[0.25, 0.5, 0.75, 1].map(p => {
            const isMax = p === 1;
            return (
              <button
                key={p}
                onClick={()=>setPct(p)}
                style={{
                  flex:1, padding:'9px 0', borderRadius:10, fontSize:11, fontWeight:800, letterSpacing:.3,
                  background: isMax ? (isBuy?GOLD:ESPRESSO) : C.card2,
                  color: isMax ? '#fff' : C.text,
                  border: `1px solid ${isMax ? 'transparent' : C.border}`,
                  cursor:'pointer',
                  boxShadow: isMax ? '0 3px 10px rgba(74,44,23,.25)' : 'none'
                }}
              >
                {isMax ? 'MAX' : `${p*100}%`}
              </button>
            );
          })}
        </div>

        {/* Preview compacte */}
        <div style={{ borderRadius:14, padding:'12px 14px', background:C.card2, border:`1px solid ${C.border}`, marginBottom:14, fontSize:13 }}>
          {isBuy ? (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ color:C.muted }}>Tu obtiens</span>
                <span style={{ fontWeight:800, color:'#D4A017' }}>{fmt(previewParts, 3)} $CKM</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:C.muted }}>Cookies restants</span>
                <span style={{ fontWeight:700, color:C.text }}>{coins - Math.floor(amount)} 🍪</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ color:C.muted }}>Tu reçois</span>
                <span style={{ fontWeight:800, color:'#D4A017' }}>{previewProceeds} 🍪</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:C.muted }}>Parts restantes</span>
                <span style={{ fontWeight:700, color:C.text }}>{fmt(Math.max(0, shares-amount), 3)} $CKM</span>
              </div>
            </>
          )}
        </div>

        {/* Bouton confirmation */}
        <button
          onClick={confirm} disabled={!valid}
          className={valid ? 'pulse-ring' : ''}
          style={{ width:'100%', padding:16, borderRadius:16, fontSize:16, fontWeight:900, background: valid ? (isBuy?GOLD:ESPRESSO) : C.card2, color: valid?'#fff':C.muted, border:`2px solid ${valid?'transparent':C.border}`, boxShadow: valid?'0 8px 22px rgba(74,44,23,.35)':'none', letterSpacing:.5, cursor:valid?'pointer':'not-allowed' }}
        >
          {isBuy
            ? `Acheter pour ${Math.floor(amount)} 🍪`
            : `Vendre pour ${previewProceeds || 0} 🍪`}
        </button>
      </div>
    </div>
  );
}

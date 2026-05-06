import { useState, useRef } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { fmt, TICK_MS } from "../../data/market.js";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { Sparkline } from "../Sparkline.jsx";
import { TradeModal } from "../modals/TradeModal.jsx";

/* ════════════════════════════════════════════════════
   MarketTab — interface du marché $CKM (niveau >= 3)
   - Tick global piloté par CookiMiner (priceHistory mis à jour à chaque tick)
   - 3 ranges : 15s (5 ticks) · 1 min (20) · 5 min (100)
   - Achat capé à 80% des cookies actifs (buyMax)
   - Vente : "Tout vendre" en un clic, ou TradeModal pour fraction
   - Convertisseur 1000 🍪 → 1 ☕ (envoie via onAddCafe)
   - Historique trades (50 derniers, persisté)
   - Bandeau event : 3 niveaux d'intensité (small/big/mega) avec styling distinct
═══════════════════════════════════════════════════════ */

export function MarketTab({ coins, currentPrice, priceHistory, ckmShares, setCkmShares, ckmCostBasis, setCkmCostBasis, marketTrades, setMarketTrades, marketRealized, setMarketRealized, marketHistory, setMarketHistory, event, eventTicks, bigMoveAt, onSpend, onEarn, onAddCafe, onInvest, C }) {
  const [trade, setTrade] = useState(null);            // 'buy' | 'sell' | null
  const [chartRange, setChartRange] = useState('1min'); // '15s' | '1min' | '5min'
  const openPriceRef = useRef(currentPrice);

  const RANGES = [
    { id:'15s',  label:'15s',  ticks: 5  },
    { id:'1min', label:'1 min', ticks: 20 },
    { id:'5min', label:'5 min', ticks: 100 },
  ];
  const currentRange = RANGES.find(r => r.id === chartRange) || RANGES[1];
  const visibleHistory = priceHistory.slice(-currentRange.ticks);

  const lastTickUp = priceHistory.length >= 2
    ? priceHistory[priceHistory.length - 1] >= priceHistory[priceHistory.length - 2]
    : true;

  const sessionDelta = currentPrice - openPriceRef.current;
  const sessionPct   = (sessionDelta / openPriceRef.current) * 100;
  const portfolioValue = ckmShares * currentPrice;
  const pl       = portfolioValue - ckmCostBasis;
  const plPct    = ckmCostBasis > 0 ? (pl / ckmCostBasis) * 100 : 0;
  const hasShares = ckmShares > 1e-9;

  const buyMax = Math.floor(coins * 0.8);
  const canBuy = buyMax >= 1;

  const bigMoveActive = Date.now() - bigMoveAt < 3500;

  const pushHistory = (entry) => {
    setMarketHistory(h => {
      const next = [{ ...entry, ts: Date.now(), id: Date.now() + Math.random() }, ...(h || [])];
      return next.slice(0, 50);
    });
  };

  /* commit achat */
  const doBuy = (cookiesIn) => {
    const amount = Math.min(cookiesIn, buyMax);
    if(amount <= 0) return;
    const parts = amount / currentPrice;
    onSpend(amount);
    setCkmShares(s => s + parts);
    setCkmCostBasis(b => b + amount);
    setMarketTrades(t => t + 1);
    if(onInvest) onInvest(amount);
    pushHistory({ type:'buy', cost:amount, parts, price:currentPrice });
    setTrade(null);
  };
  /* commit vente */
  const doSell = (partsOut) => {
    const parts = Math.min(partsOut, ckmShares);
    if(parts <= 1e-9) return;
    const proceeds = Math.floor(parts * currentPrice);
    /* coût de base proportionnel retiré */
    const fraction = parts / ckmShares;
    const basisOut = ckmCostBasis * fraction;
    const newShares = ckmShares - parts;
    const newBasis  = newShares < 1e-9 ? 0 : ckmCostBasis - basisOut;
    setCkmShares(newShares);
    setCkmCostBasis(newBasis);
    setMarketTrades(t => t + 1);
    const pnl = proceeds - Math.round(basisOut);
    setMarketRealized(r => r + pnl);
    /* On crédite proceeds aux coins (capital + plus-value) mais on ne
       compte que la plus-value (pnl positif) comme "gain" pour XP +
       totalEarned. Récupérer son capital ne fait pas progresser. */
    onEarn(proceeds, Math.max(0, pnl));
    pushHistory({ type:'sell', proceeds, parts, price:currentPrice, pnl });
    setTrade(null);
  };

  return (
    <div className="su">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, paddingTop:4 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>MARCHÉ $CKM</div>
        <div style={{ fontSize:11, color:C.muted, display:'flex', alignItems:'center', gap:6 }}>
          <span className="live-pulse" style={{ width:7, height:7, borderRadius:'50%', background:'#D4A017', display:'inline-block' }} />
          en direct
        </div>
      </div>

      {/* Bandeau événement */}
      {event && (() => {
        const isMega = event.kind === 'mega';
        const isBig  = event.kind === 'big';
        const isUp   = event.biasPct >= 0;
        const big    = isBig || isMega;

        const padding = isMega ? '16px 14px' : isBig ? '14px 14px' : '12px 14px';
        const bg = isMega
          ? (isUp
              ? 'linear-gradient(135deg, #F5DC8A 0%, #D4A017 50%, #C17F3C 100%)'
              : 'linear-gradient(135deg, #1A0A04 0%, #2A1508 50%, #1A0A04 100%)')
          : isBig
            ? (isUp ? 'linear-gradient(135deg, #D4A017, #C17F3C)' : 'linear-gradient(135deg, #2A1508, #0F0804)')
            : (isUp ? 'linear-gradient(135deg, rgba(212,160,23,.18), rgba(193,127,60,.12))' : 'linear-gradient(135deg, rgba(74,44,23,.92), rgba(45,24,12,.82))');
        const borderColor = isMega ? (isUp ? '#FFE4A0' : '#D4A017') : isBig ? '#D4A017' : (isUp ? '#D4A017' : '#5A3520');
        const borderWidth = isMega ? 3 : isBig ? 2.5 : 1.5;
        const txtColor = isMega ? (isUp ? '#3D2010' : '#F0C050') : big ? (isUp ? '#fff' : '#F0E0C0') : (isUp ? C.text : '#F0E0C0');
        const shadow = isMega
          ? (isUp
              ? '0 0 40px rgba(212,160,23,.85), inset 0 0 0 6px rgba(255,255,255,.25)'
              : '0 0 36px rgba(212,160,23,.7), inset 0 0 0 6px rgba(0,0,0,.35)')
          : isBig ? '0 0 24px rgba(212,160,23,.55)' : 'none';

        return (
          <div className={`bi ${big ? 'pulse-ring' : ''}`} style={{
            display:'flex', alignItems:'center', gap:12,
            padding, borderRadius:16, marginBottom:12,
            background:bg,
            border:`${borderWidth}px solid ${borderColor}`,
            color:txtColor,
            boxShadow:shadow,
            position:'relative', overflow:'hidden'
          }}>
            <div className={isMega ? 'wiggle-anim' : ''} style={{ fontSize: isMega?40:isBig?32:26, flexShrink:0 }}>{event.emoji}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2, flexWrap:'wrap' }}>
                <span style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:isMega?2.5:1.5, color: isMega ? (isUp ? '#3D2010' : '#D4A017') : (big ? (isUp ? '#fff' : '#D4A017') : '#D4A017') }}>
                  {isMega ? (isUp ? '🚀 ÉVÉNEMENT MAJEUR' : '🚨 ALERTE MAJEURE') : isBig ? '🔥 BIG NEWS' : 'News'}
                </span>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:8, background: isMega ? (isUp ? 'rgba(61,32,16,.25)' : 'rgba(212,160,23,.3)') : (big ? 'rgba(255,255,255,.22)' : 'rgba(212,160,23,.22)'), color: isMega ? (isUp ? '#3D2010' : '#F5DC8A') : (big ? '#fff' : '#D4A017') }}>
                  {isUp ? '+' : ''}{event.biasPct}%/tick
                </span>
              </div>
              <div style={{ fontSize: isMega?15:isBig?14:13, fontWeight:900, lineHeight:1.2 }}>{event.label}</div>
              <div style={{ fontSize:11, opacity:.9, marginTop:2 }}>{event.desc}</div>
            </div>
            <div style={{ fontSize:11, fontWeight:700, opacity:.8, flexShrink:0 }}>{eventTicks} t</div>
          </div>
        );
      })()}

      {/* Carte prix */}
      <div style={{ borderRadius:22, padding:18, background:ESPRESSO, marginBottom:12, position:'relative', overflow:'hidden', boxShadow:'0 8px 24px rgba(74,44,23,.35)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:2, marginBottom:4 }}>PRIX ACTUEL</div>
            <div key={currentPrice} className="market-tick" style={{ fontSize:34, fontWeight:900, color:'#fff', lineHeight:1, letterSpacing:'-1px' }}>
              {fmt(currentPrice)} <span style={{ fontSize:18, color:'rgba(255,255,255,.65)' }}>🍪</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:8, fontSize:13, fontWeight:700, color: sessionDelta>=0?'#F0C050':'#A88060' }}>
              {sessionDelta>=0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
              {sessionDelta>=0?'+':''}{fmt(sessionPct)}% <span style={{ color:'rgba(255,255,255,.45)', fontWeight:500, marginLeft:4 }}>(session)</span>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:2, marginBottom:4 }}>1 $CKM =</div>
            <div style={{ fontSize:14, fontWeight:700, color:'#F0C050' }}>{fmt(currentPrice)} 🍪</div>
          </div>
        </div>

        {/* Range selector */}
        <div style={{ display:'flex', gap:6, marginBottom:8, justifyContent:'flex-end' }}>
          {RANGES.map(r => {
            const active = r.id === chartRange;
            return (
              <button
                key={r.id}
                onClick={()=>setChartRange(r.id)}
                style={{
                  padding:'4px 12px', borderRadius:10, fontSize:11, fontWeight:700, letterSpacing:.3,
                  background: active ? 'rgba(212,160,23,.25)' : 'rgba(255,255,255,.06)',
                  color: active ? '#F0C050' : 'rgba(255,255,255,.6)',
                  border: `1px solid ${active ? 'rgba(212,160,23,.5)' : 'rgba(255,255,255,.1)'}`,
                  cursor:'pointer', transition:'all .2s'
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Sparkline SVG */}
        <Sparkline history={visibleHistory} up={lastTickUp} />
      </div>

      {/* Portefeuille */}
      <div style={{ borderRadius:18, padding:16, background:C.card, border:`1px solid ${C.border}`, marginBottom:12 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>PORTEFEUILLE</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <div>
            <div style={{ fontSize:11, color:C.muted, marginBottom:2 }}>Parts détenues</div>
            <div style={{ fontSize:18, fontWeight:800, color:C.text }}>{fmt(ckmShares, 3)} <span style={{ fontSize:11, color:C.muted, fontWeight:700 }}>$CKM</span></div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:2 }}>Valeur</div>
            <div style={{ fontSize:18, fontWeight:800, color:C.text }}>{fmt(portfolioValue)} <span style={{ fontSize:11, color:C.muted, fontWeight:700 }}>🍪</span></div>
          </div>
        </div>
        {hasShares ? (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 12px', borderRadius:11, background: pl>=0 ? 'rgba(212,160,23,.1)' : 'rgba(74,44,23,.12)', border:`1px solid ${pl>=0?'rgba(212,160,23,.3)':'rgba(74,44,23,.3)'}` }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>Plus / moins-value</span>
            <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:14, fontWeight:800, color: pl>=0?'#D4A017':'#7D4E1F' }}>
              {pl>=0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {pl>=0?'+':''}{fmt(pl)} 🍪 <span style={{ fontSize:11, fontWeight:700, opacity:.75 }}>({pl>=0?'+':''}{fmt(plPct)}%)</span>
            </span>
          </div>
        ) : (
          <div style={{ fontSize:12, color:C.muted, fontStyle:'italic', textAlign:'center', padding:'4px 0' }}>
            Investis tes cookies pour suivre ta P&L ici
          </div>
        )}
      </div>

      {/* Boutons trade */}
      <div style={{ display:'flex', gap:10 }}>
        <button
          onClick={()=>setTrade('buy')}
          disabled={!canBuy}
          className={canBuy && bigMoveActive ? 'pulse-ring' : ''}
          style={{ flex:1, padding:'14px 0', borderRadius:16, fontSize:14, fontWeight:800, background: canBuy?GOLD:C.card, color: canBuy?'#fff':C.muted, border:`2px solid ${canBuy?'transparent':C.border}`, boxShadow: canBuy?'0 4px 14px rgba(212,160,23,.35)':'none', letterSpacing:.3, cursor:canBuy?'pointer':'not-allowed' }}
        >
          Acheter
        </button>
        <button
          onClick={()=>setTrade('sell')}
          disabled={!hasShares}
          style={{ flex:1, padding:'14px 0', borderRadius:16, fontSize:14, fontWeight:800, background: hasShares?ESPRESSO:C.card, color: hasShares?'#fff':C.muted, border:`2px solid ${hasShares?'transparent':C.border}`, letterSpacing:.3, cursor:hasShares?'pointer':'not-allowed' }}
        >
          Vendre
        </button>
      </div>

      {/* Tout vendre — liquide la position en un clic */}
      {hasShares && (
        <button
          onClick={()=>doSell(ckmShares)}
          style={{
            width:'100%', marginTop:8, padding:'12px 0', borderRadius:14,
            fontSize:13, fontWeight:800, letterSpacing:.3,
            background:'transparent', color:'#D4A017',
            border:'1.5px solid #D4A017',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            cursor:'pointer'
          }}
        >
          ⚡ Tout vendre maintenant ({Math.floor(ckmShares * currentPrice)} 🍪)
        </button>
      )}

      {!canBuy && !hasShares && (
        <div style={{ marginTop:12, fontSize:11, color:C.muted, textAlign:'center', lineHeight:1.5 }}>
          Tu as besoin d'au moins quelques cookies pour investir.
        </div>
      )}

      {/* Stats trades */}
      {marketTrades > 0 && (
        <div style={{ marginTop:14, padding:'12px 14px', borderRadius:14, background:C.card, border:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
          <div>
            <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5 }}>Mes trades</div>
            <div style={{ fontSize:18, fontWeight:800, color:C.text, marginTop:2 }}>{marketTrades}</div>
          </div>
          <div style={{ width:1, alignSelf:'stretch', background:C.border }} />
          <div style={{ flex:1, textAlign:'right' }}>
            <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5 }}>Réalisé</div>
            <div style={{ fontSize:18, fontWeight:800, color: marketRealized > 0 ? '#D4A017' : marketRealized < 0 ? '#7D4E1F' : C.text, marginTop:2 }}>
              {marketRealized >= 0 ? '+' : ''}{marketRealized} 🍪
            </div>
          </div>
        </div>
      )}

      {/* Historique des trades */}
      {Array.isArray(marketHistory) && marketHistory.length > 0 && (
        <details style={{ marginTop:10, borderRadius:14, background:C.card, border:`1px solid ${C.border}`, overflow:'hidden' }}>
          <summary style={{
            padding:'12px 14px', cursor:'pointer', listStyle:'none',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            fontSize:12, fontWeight:800, color:C.text, letterSpacing:.3
          }}>
            <span style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:14 }}>📜</span>
              Historique ({marketHistory.length})
            </span>
            <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>Voir →</span>
          </summary>
          <div style={{ maxHeight:280, overflowY:'auto', borderTop:`1px solid ${C.border}` }}>
            {marketHistory.map(t => {
              const d = new Date(t.ts);
              const today = new Date();
              const isToday = d.toDateString() === today.toDateString();
              const yesterday = new Date(); yesterday.setDate(today.getDate()-1);
              const isYesterday = d.toDateString() === yesterday.toDateString();
              const dateLabel = isToday ? `Aujourd'hui ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
                : isYesterday ? `Hier ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
                : `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
              const isBuy = t.type === 'buy';
              return (
                <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:`1px solid ${C.border}`, fontSize:12 }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{isBuy ? '🛒' : '💰'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                      <span style={{ fontWeight:800, color: isBuy ? '#C17F3C' : '#D4A017' }}>
                        {isBuy ? 'Achat' : 'Vente'} · {fmt(t.parts, 3)} $CKM
                      </span>
                      <span style={{ fontWeight:700, color:C.text, whiteSpace:'nowrap' }}>
                        {isBuy ? `−${t.cost}` : `+${t.proceeds}`} 🍪
                      </span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginTop:2, fontSize:10, color:C.muted }}>
                      <span>@ {fmt(t.price)} 🍪 · {dateLabel}</span>
                      {!isBuy && (
                        <span style={{ fontWeight:700, color: t.pnl > 0 ? '#D4A017' : t.pnl < 0 ? '#7D4E1F' : C.muted }}>
                          {t.pnl >= 0 ? '+' : ''}{t.pnl} 🍪
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* Convertisseur Cookies → CF */}
      <div style={{ marginTop:14, padding:'14px 14px', borderRadius:14, background:'linear-gradient(135deg, rgba(74,44,23,.95), rgba(45,24,12,.85))', border:'1.5px solid rgba(212,160,23,.4)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#F0C050', textTransform:'uppercase', letterSpacing:1.5, marginBottom:2 }}>Convertir</div>
          <div style={{ fontSize:13, fontWeight:800, color:'#fff', lineHeight:1.3 }}>1 000 🍪 → 1 ☕</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:2 }}>Échange rare et coûteux</div>
        </div>
        <button
          onClick={()=>{
            if(coins < 1000) return;
            onSpend(1000);
            if(onAddCafe) onAddCafe(1);
          }}
          disabled={coins < 1000}
          style={{
            padding:'10px 18px', borderRadius:14, fontSize:13, fontWeight:900, letterSpacing:.4,
            background: coins >= 1000 ? GOLD : 'rgba(255,255,255,.08)',
            color: coins >= 1000 ? '#fff' : 'rgba(255,255,255,.45)',
            border:`1.5px solid ${coins >= 1000 ? 'transparent' : 'rgba(255,255,255,.15)'}`,
            boxShadow: coins >= 1000 ? '0 4px 14px rgba(212,160,23,.45)' : 'none',
            cursor: coins >= 1000 ? 'pointer' : 'not-allowed', flexShrink:0
          }}
        >
          Convertir
        </button>
      </div>

      {/* Légende compacte */}
      <div style={{ marginTop:14, padding:'10px 12px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, lineHeight:1.5 }}>
        Le $CKM est volatil — variations ±2 à ±30% toutes les {TICK_MS/1000}s. Les <strong style={{ color:C.text }}>News</strong> font bouger le cours pendant ~20-30s. Investis max 80% de tes cookies actifs.
      </div>

      {trade && (
        <TradeModal
          mode={trade}
          onClose={()=>setTrade(null)}
          coins={coins}
          buyMax={buyMax}
          shares={ckmShares}
          price={currentPrice}
          onBuy={doBuy}
          onSell={doSell}
          C={C}
        />
      )}
    </div>
  );
}

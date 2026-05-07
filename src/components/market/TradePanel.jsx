import { useState } from 'react';
import { buyShares, sellShares, MAX_SHARES_PER_USER, MARKET_CONFIG } from '../../lib/market';

/* ════════════════════════════════════════════════════
   TradePanel — onglets Acheter / Vendre + sélecteur quantité
   - state, portfolio, userCode, coins : props nécessaires aux calculs
   - onTradeSuccess(result) : appelé après succès. result inclut `type`
       ('buy' | 'sell') + cost ou gained + profit (vente). C'est MarketTab
       qui consomme le résultat pour appeler addCoins() puis refresh().
   - max calculé dynamiquement : min(stock dispo, cookies/prix, limite user)
═══════════════════════════════════════════════════════ */

function fmtHM(date) {
  if (!date) return '';
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}h${m}`;
}

export function TradePanel({ state, portfolio, userCode, coins, onTradeSuccess, marketStatus, C }) {
  const [quantity, setQuantity] = useState(1);
  const [mode, setMode] = useState('buy');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const price = state?.current_price ?? 100;
  const IPS = MARKET_CONFIG.IMPACT_PER_SHARE;

  /* Slippage symétrique : on facture / verse au prix POST-impact.
     Aller-retour instantané = perte ≈ 2 × IPS × qty (anti-exploit). */
  const buyPrice  = price * (1 + IPS * quantity);
  const sellPrice = Math.max(MARKET_CONFIG.PRICE_MIN, price * (1 - IPS * quantity));
  const totalCost = Math.ceil(buyPrice * quantity);
  const totalGain = Math.floor(sellPrice * quantity);

  /* Max achetable en tenant compte du slippage : résolution quadratique
     ceil(price × (1 + IPS × n) × n) ≤ coins puis fine-tune pour le ceil. */
  const computeMaxBuyable = () => {
    if (price <= 0 || coins <= 0) return 0;
    const a = price * IPS;
    const b = price;
    const disc = b * b + 4 * a * coins;
    let n = Math.floor((-b + Math.sqrt(disc)) / (2 * a));
    n = Math.min(n, state?.available_shares ?? 0, MAX_SHARES_PER_USER - (portfolio?.shares ?? 0));
    /* Sûreté : ajuste de 1-2 si le ceil fait passer au-dessus de coins */
    while (n > 0) {
      const cost = Math.ceil(price * (1 + IPS * n) * n);
      if (cost <= coins) break;
      n--;
    }
    return Math.max(0, n);
  };

  const maxBuyable = computeMaxBuyable();
  const maxSellable = portfolio?.shares ?? 0;
  const isClosed = marketStatus && !marketStatus.open;

  const max = mode === 'buy' ? maxBuyable : maxSellable;
  const canTrade = !isClosed && max >= 1 && quantity <= max;

  const handleTrade = async () => {
    if (loading || !canTrade) return;
    setLoading(true);
    setFeedback(null);

    const result = mode === 'buy'
      ? await buyShares(userCode, quantity)
      : await sellShares(userCode, quantity);

    setLoading(false);
    if (result.error) {
      setFeedback({ type: 'error', msg: result.error });
    } else {
      setFeedback({
        type: 'success',
        msg: mode === 'buy'
          ? `✓ Acheté ${quantity} action(s) pour ${result.cost} 🍪`
          : `✓ Vendu ${quantity} action(s) pour ${result.gained} 🍪`
      });
      onTradeSuccess(result);
      setQuantity(1);
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  /* Quick selector values, dédupliqués + filtrés <= max */
  const quickValues = [...new Set([1, 5, 10, max].filter(v => v >= 1 && v <= max))].slice(0, 4);

  return (
    <div style={{
      background: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      border: `1.5px solid ${C.border}`,
    }}>
      {/* Bandeau marché fermé */}
      {isClosed && (
        <div style={{
          padding: '10px 12px', borderRadius: 12, marginBottom: 12,
          background: 'rgba(125, 78, 31, 0.12)',
          border: '1.5px solid rgba(125, 78, 31, 0.35)',
          color: '#7D4E1F', fontSize: 12, fontWeight: 700,
          textAlign: 'center', lineHeight: 1.4,
        }}>
          🔒 Marché fermé — réouverture à {fmtHM(marketStatus?.nextChange)}
        </div>
      )}

      {/* Tabs Buy/Sell */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          onClick={() => { setMode('buy'); setQuantity(1); setFeedback(null); }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 12,
            border: 'none',
            background: mode === 'buy' ? 'linear-gradient(135deg, #D4A017, #C17F3C)' : C.card2,
            color: mode === 'buy' ? '#fff' : C.muted,
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          📈 Acheter
        </button>
        <button
          onClick={() => { setMode('sell'); setQuantity(1); setFeedback(null); }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 12,
            border: 'none',
            background: mode === 'sell' ? 'linear-gradient(135deg, #7D4E1F, #5C3317)' : C.card2,
            color: mode === 'sell' ? '#fff' : C.muted,
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          📉 Vendre
        </button>
      </div>

      {/* Quantity selector */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginBottom: 8 }}>
          <span>Quantité</span>
          <span style={{ color: '#D4A017', fontWeight: 700 }}>Max : {max}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: C.card2, border: `1.5px solid ${C.border}`,
              fontSize: 20, fontWeight: 800, color: C.text,
              cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
              opacity: quantity <= 1 ? 0.4 : 1,
            }}>−</button>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(Math.max(1, Math.min(Math.max(max, 1), parseInt(e.target.value) || 1)))}
            style={{
              flex: 1, height: 40, textAlign: 'center',
              fontSize: 18, fontWeight: 800, color: C.text,
              border: `1.5px solid ${C.border}`, borderRadius: 10,
              background: C.bg,
            }}
          />
          <button onClick={() => setQuantity(Math.min(Math.max(max, 1), quantity + 1))}
            disabled={quantity >= max}
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: C.card2, border: `1.5px solid ${C.border}`,
              fontSize: 20, fontWeight: 800, color: C.text,
              cursor: quantity >= max ? 'not-allowed' : 'pointer',
              opacity: quantity >= max ? 0.4 : 1,
            }}>+</button>
        </div>
        {quickValues.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {quickValues.map(v => (
              <button key={v}
                onClick={() => setQuantity(v)}
                style={{
                  flex: 1, padding: '6px', borderRadius: 8,
                  background: quantity === v ? '#D4A017' : C.card2,
                  color: quantity === v ? '#fff' : C.muted,
                  border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>
                {v === max && v > 10 ? 'MAX' : v}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Total */}
      <div style={{
        background: C.card2,
        borderRadius: 12,
        padding: '10px 12px',
        marginBottom: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: C.muted }}>
          {mode === 'buy' ? 'Coût total' : 'Tu recevras'}
        </span>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#D4A017' }}>
          {mode === 'buy' ? totalCost : totalGain} 🍪
        </span>
      </div>

      {/* Action button */}
      <button
        onClick={handleTrade}
        disabled={loading || !canTrade}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 14,
          border: 'none',
          background: canTrade
            ? (mode === 'buy' ? 'linear-gradient(135deg, #D4A017, #C17F3C)' : 'linear-gradient(135deg, #7D4E1F, #5C3317)')
            : C.border,
          color: canTrade ? '#fff' : C.muted,
          fontWeight: 800,
          fontSize: 15,
          cursor: canTrade && !loading ? 'pointer' : 'not-allowed',
          boxShadow: canTrade ? '0 4px 12px rgba(212,160,23,0.4)' : 'none',
        }}
      >
        {loading ? '...' : (mode === 'buy'
          ? `Acheter pour ${totalCost} 🍪`
          : `Vendre pour ${totalGain} 🍪`)}
      </button>

      {/* Feedback */}
      {feedback && (
        <div style={{
          marginTop: 10,
          padding: '8px 12px',
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 600,
          background: feedback.type === 'success' ? 'rgba(212,160,23,0.12)' : 'rgba(125,78,31,0.12)',
          color: feedback.type === 'success' ? '#C8960C' : '#7D4E1F',
          textAlign: 'center',
        }}>
          {feedback.msg}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { buyShares, sellShares, MAX_SHARES_PER_USER, MARKET_CONFIG } from '../../lib/market';

/* ════════════════════════════════════════════════════
   TradePanel — onglets Acheter / Vendre + sélecteur quantité
   - state, portfolio, userCode, coins : props nécessaires aux calculs
   - onTradeSuccess(result) : appelé après succès. result inclut `type`
       ('buy' | 'sell') + cost ou gained + profit (vente). C'est MarketTab
       qui consomme le résultat pour appeler addCoins() puis refresh().
   - max calculé dynamiquement : min(stock dispo, cookies/prix, limite user)

   ── Ordre Bulk $CKM (12/05/2026) ──
   - bulkTradePasses : nombre de charges "tout vendre/acheter" en stock
   - onConsumeBulkPass : callback déclenché quand on consomme une charge
   Quand bulkTradePasses > 0, un bouton "📦 Tout" apparaît sous le sélecteur :
   - Met la quantité au max théorique (sans cap MAX_SHARES_PER_TX)
   - Au prochain trade, passe bypassTxCap=true à la lib market
   - Consomme 1 charge après succès
═══════════════════════════════════════════════════════ */

function fmtHM(date) {
  if (!date) return '';
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}h${m}`;
}

export function TradePanel({ state, portfolio, userCode, coins, onTradeSuccess, marketStatus, tradingDisabled, bulkTradePasses = 0, onConsumeBulkPass, C }) {
  const [quantity, setQuantity] = useState(1);
  const [mode, setMode] = useState('buy');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  /* Quand l'user clique sur "Tout" (bulk), on arme un trade qui bypass
     le cap MAX_SHARES_PER_TX. Le flag est désarmé dès que l'user retouche
     la quantité (anti gaspillage de charge si changement d'avis). */
  const [bulkArmed, setBulkArmed] = useState(false);

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

  /* maxTheorical = max sans cap MAX_SHARES_PER_TX (utilisé pour le bouton
     "Tout" du bulk pass). Le cap volume quotidien reste actif côté lib. */
  const maxTheoretical = mode === 'buy' ? maxBuyable : maxSellable;
  /* maxStandard = avec cap MAX_SHARES_PER_TX appliqué (mode normal). */
  const maxStandard = Math.min(MARKET_CONFIG.MAX_SHARES_PER_TX, maxTheoretical);
  /* Si bulk armé, la borne UI est maxTheoretical, sinon maxStandard. */
  const max = bulkArmed ? maxTheoretical : maxStandard;
  const canTrade = !isClosed && !tradingDisabled && max >= 1 && quantity <= max;

  /* Wrapper pour setQuantity qui désarme automatiquement le bulk si
     l'user revient à une valeur ≤ cap standard (sinon on lui garde sa
     charge, il l'a pas consommée). */
  const updateQuantity = (n) => {
    setQuantity(n);
    if (bulkArmed && n <= MARKET_CONFIG.MAX_SHARES_PER_TX) {
      setBulkArmed(false);
    }
  };

  const armBulk = () => {
    if (bulkTradePasses <= 0) return;
    if (maxTheoretical < 1) return;
    setQuantity(maxTheoretical);
    setBulkArmed(true);
    setFeedback(null);
  };

  const handleTrade = async () => {
    if (loading || !canTrade) return;
    setLoading(true);
    setFeedback(null);

    const opts = bulkArmed ? { bypassTxCap: true } : {};
    const result = mode === 'buy'
      ? await buyShares(userCode, quantity, opts)
      : await sellShares(userCode, quantity, opts);

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
      if (bulkArmed) {
        onConsumeBulkPass?.();
        setBulkArmed(false);
      }
      setQuantity(1);
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  /* Quick selector values, dédupliqués + filtrés <= max */
  const quickValues = [...new Set([1, 5, 10, maxStandard].filter(v => v >= 1 && v <= maxStandard))].slice(0, 4);

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

      {/* Bandeau mode admin (compte de test, trading désactivé) */}
      {tradingDisabled && !isClosed && (
        <div style={{
          padding: '10px 12px', borderRadius: 12, marginBottom: 12,
          background: 'rgba(125, 78, 31, 0.12)',
          border: '1.5px solid rgba(125, 78, 31, 0.35)',
          color: '#7D4E1F', fontSize: 12, fontWeight: 700,
          textAlign: 'center', lineHeight: 1.4,
        }}>
          🛠️ Mode admin — trading désactivé
        </div>
      )}

      {/* Tabs Buy/Sell */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          onClick={() => { setMode('buy'); updateQuantity(1); setFeedback(null); setBulkArmed(false); }}
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
          onClick={() => { setMode('sell'); updateQuantity(1); setFeedback(null); setBulkArmed(false); }}
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
          <span style={{ color: bulkArmed ? '#FFE89A' : '#D4A017', fontWeight: 700 }}>
            {bulkArmed ? `📦 Tout : ${maxTheoretical}` : `Max : ${max}`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => updateQuantity(Math.max(1, quantity - 1))}
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
            onChange={e => updateQuantity(Math.max(1, Math.min(Math.max(max, 1), parseInt(e.target.value) || 1)))}
            style={{
              flex: 1, height: 40, textAlign: 'center',
              fontSize: 18, fontWeight: 800, color: C.text,
              border: `1.5px solid ${bulkArmed ? '#D4A017' : C.border}`, borderRadius: 10,
              background: C.bg,
              boxShadow: bulkArmed ? '0 0 0 2px rgba(212,160,23,.25)' : 'none',
            }}
          />
          <button onClick={() => updateQuantity(Math.min(Math.max(max, 1), quantity + 1))}
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
                onClick={() => updateQuantity(v)}
                style={{
                  flex: 1, padding: '6px', borderRadius: 8,
                  background: !bulkArmed && quantity === v ? '#D4A017' : C.card2,
                  color: !bulkArmed && quantity === v ? '#fff' : C.muted,
                  border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>
                {v === maxStandard && v > 10 ? 'MAX' : v}
              </button>
            ))}
          </div>
        )}

        {/* Bouton bulk "Tout" — visible uniquement si l'user a des charges
            ET que le bulk apporte une valeur (maxTheoretical > cap standard). */}
        {bulkTradePasses > 0 && maxTheoretical > MARKET_CONFIG.MAX_SHARES_PER_TX && (
          <button
            onClick={armBulk}
            disabled={bulkArmed || maxTheoretical < 1}
            style={{
              width:'100%', marginTop:8,
              padding:'10px 12px', borderRadius:10,
              background: bulkArmed
                ? 'linear-gradient(135deg,#D4A017,#A07514)'
                : 'rgba(212,160,23,.12)',
              color: bulkArmed ? '#fff' : '#D4A017',
              border: bulkArmed
                ? '1.5px solid #D4A017'
                : '1.5px solid rgba(212,160,23,.4)',
              fontSize:12, fontWeight:800, letterSpacing:.3,
              cursor: bulkArmed ? 'default' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              touchAction:'manipulation',
            }}
          >
            📦 {bulkArmed
              ? `Trade Express : ${maxTheoretical} action${maxTheoretical > 1 ? 's' : ''} (-1 charge à la confirmation)`
              : `Tout ${mode === 'buy' ? 'acheter' : 'vendre'} (${maxTheoretical}) · stock ${bulkTradePasses} 📦`}
          </button>
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

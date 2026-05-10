import { useEffect, useState, useCallback } from 'react';
import {
  getMarketState, getMarketHistory,
  getUserPortfolio, maintenanceTick, getMarketStatus,
} from '../../lib/market';
import { isSupabaseEnabled } from '../../lib/supabase';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { MarketStateCard } from '../market/MarketStateCard.jsx';
import { MarketChart } from '../market/MarketChart.jsx';
import { PortfolioCard } from '../market/PortfolioCard.jsx';
import { TradePanel } from '../market/TradePanel.jsx';
import { MarketWelcomeModal } from '../market/MarketWelcomeModal.jsx';

/* ════════════════════════════════════════════════════
   MarketTab — onglet marché $CKM en ligne (Supabase)
   - Fetch initial + refresh auto toutes les 15s
   - Maintenance (inflation + snapshot historique) toutes les 5 min
     (idempotente côté lib si <1h depuis le dernier tick)
   - Au PREMIER accès : MarketWelcomeModal (3 étapes), flag persisté
   - onTradeSuccess(result) : applique l'effet sur les cookies (addCoins),
     incrémente le compteur de plus-value réalisée (badge Investisseur),
     puis refresh.
   - Mode dégradé : si Supabase off → message clair, pas de crash.
═══════════════════════════════════════════════════════ */

export function MarketTab({ userCode, coins, addCoins, onTradeComplete, tradingDisabled, C }) {
  const [state, setState] = useState(null);
  const [history, setHistory] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [dayChange, setDayChange] = useState(0);
  const [chartRange, setChartRange] = useState(1440);  /* minutes — défaut 24h */
  const [marketStatus, setMarketStatus] = useState(() => getMarketStatus());
  const [welcomeSeen, setWelcomeSeen] = useLocalStorage('marketWelcomeSeen', false);
  const [showWelcome, setShowWelcome] = useState(!welcomeSeen);

  const closeWelcome = () => {
    setShowWelcome(false);
    setWelcomeSeen(true);
  };

  const refresh = useCallback(async () => {
    if (!isSupabaseEnabled()) return;
    /* Toujours récupérer 24h pour calculer dayChange (vs il y a 24h),
       et la fenêtre choisie pour la courbe — 2 requêtes parallèles. */
    const [s, hRange, h24, p] = await Promise.all([
      getMarketState(),
      getMarketHistory(chartRange),
      getMarketHistory(24 * 60),
      userCode ? getUserPortfolio(userCode) : Promise.resolve(null),
    ]);
    setState(s);
    setHistory(hRange);
    setPortfolio(p);
    /* Passer s au getMarketStatus pour qu'il détecte le circuit breaker
       (lit serverState.circuit_breaker_until). Sinon UI manquerait le
       statut CB. */
    setMarketStatus(getMarketStatus(new Date(), s));

    if (s && h24.length > 0) {
      const oldPrice = h24[0].price;
      const change = ((s.current_price - oldPrice) / oldPrice) * 100;
      setDayChange(change);
    } else {
      setDayChange(0);
    }
  }, [userCode, chartRange]);

  useEffect(() => {
    refresh();
    maintenanceTick();
    /* Maintenance + refresh à 5s pour matcher SNAPSHOT_SECONDS — courbe
       très fluide en vue 1m (12 points/min). Le throttle global empêche
       les doublons même avec plusieurs clients connectés. */
    const tickInt = setInterval(maintenanceTick, 5 * 1000);
    const refreshInt = setInterval(refresh, 5 * 1000);
    return () => {
      clearInterval(tickInt);
      clearInterval(refreshInt);
    };
  }, [refresh]);

  /* Applique l'effet d'un trade réussi sur les cookies, puis remonte
     le résultat à App.jsx pour qu'il alimente les compteurs locaux
     (badge Investisseur via marketRealized, achievement Trader via
     totalInvested). */
  const handleTradeSuccess = useCallback((result) => {
    if (!result || !result.success) return;
    if (result.type === 'buy') {
      /* Achat : on dépense les cookies, pas de XP gagnée */
      addCoins(-result.cost);
    } else if (result.type === 'sell') {
      /* Vente : on crédite proceeds, mais on ne compte que la plus-value
         comme "vrai gain" (XP + totalEarned), via le 2e arg d'addCoins. */
      const profit = Math.max(0, Math.round(result.profit || 0));
      addCoins(result.gained, profit);
    }
    if (onTradeComplete) onTradeComplete(result);
    refresh();
  }, [addCoins, onTradeComplete, refresh]);

  /* Mode dégradé : Supabase indisponible */
  if (!isSupabaseEnabled()) {
    return (
      <div style={{ padding: 16, paddingBottom: 100 }}>
        <div style={{
          background: C.card,
          border: `1.5px solid ${C.border}`,
          borderRadius: 16,
          padding: 24,
          textAlign: 'center',
          color: C.muted,
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📡</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            Marché hors ligne
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.4 }}>
            La connexion au serveur n'est pas disponible. Reviens un peu plus tard !
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, paddingBottom: 100 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, paddingTop:4 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>MARCHÉ $CKM</div>
        <div style={{ fontSize:11, color:C.muted }}>Partagé entre tous les joueurs</div>
      </div>

      {/* Bandeau Maintenance / Circuit Breaker — 2 cas distincts. */}
      {marketStatus?.maintenance && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(193,127,60,.18), rgba(212,160,23,.18))',
          border: '1.5px solid rgba(193,127,60,.6)',
          borderRadius: 14,
          padding: '14px 16px',
          marginBottom: 14,
          color: '#FFB060',
          fontSize: 13,
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.5,
          boxShadow: '0 4px 14px rgba(193,127,60,.25)',
        }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>
            {marketStatus.circuitBreaker ? '⚡' : '🛠️'}
          </div>
          <div style={{ marginBottom: 4 }}>
            {marketStatus.circuitBreaker ? 'Circuit breaker activé' : 'Marché en maintenance'}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, opacity: .85 }}>
            {marketStatus.circuitBreaker
              ? 'Variation trop forte détectée — pause automatique 1 h.'
              : 'Trading suspendu temporairement — réouverture bientôt.'}
          </div>
        </div>
      )}

      <MarketStateCard state={state} dayChange={dayChange} marketStatus={marketStatus} />
      <MarketChart history={history} range={chartRange} onRangeChange={setChartRange} C={C} />
      <PortfolioCard portfolio={portfolio} currentPrice={state?.current_price ?? 100} C={C} />
      <TradePanel
        state={state}
        portfolio={portfolio}
        userCode={userCode}
        coins={coins}
        onTradeSuccess={handleTradeSuccess}
        marketStatus={marketStatus}
        tradingDisabled={tradingDisabled}
        C={C}
      />

      {showWelcome && <MarketWelcomeModal onClose={closeWelcome} />}
    </div>
  );
}

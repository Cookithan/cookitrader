import { useEffect, useState, useCallback } from 'react';
import {
  getMarketState, getMarketHistory, getMarketActivity, getMarketPulse,
  getUserPortfolio, maintenanceTick, getMarketStatus,
} from '../../lib/market';
import { isSupabaseEnabled } from '../../lib/supabase';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { MarketStateCard } from '../market/MarketStateCard.jsx';
import { MarketChart } from '../market/MarketChart.jsx';
import { MarketFeed } from '../market/MarketFeed.jsx';
import { MarketPulse } from '../market/MarketPulse.jsx';
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

export function MarketTab({ userCode, coins, addCoins, onTradeComplete, tradingDisabled, bulkTradePasses = 0, onConsumeBulkPass, C }) {
  const [state, setState] = useState(null);
  const [history, setHistory] = useState([]);
  const [activity, setActivity] = useState([]);
  const [pulse, setPulse] = useState(null);
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
    /* En parallèle : prix courant, courbe (fenêtre choisie), historique 24h
       (sert au dayChange + au feed pour détecter les sauts), portfolio user,
       activité globale récente (alimente le feed live). */
    const [s, hRange, h24, p, act, pls] = await Promise.all([
      getMarketState(),
      getMarketHistory(chartRange),
      getMarketHistory(24 * 60),
      userCode ? getUserPortfolio(userCode) : Promise.resolve(null),
      getMarketActivity(15),
      getMarketPulse(),
    ]);
    setState(s);
    setHistory(hRange);
    setActivity(act);
    setPulse(pls);
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

      {/* Bandeau Maintenance / Circuit Breaker — fond espresso sombre +
          bord doré épais + halo doré pulsant pour attirer l'attention.
          Palette café-only respectée (or + crème + espresso). */}
      {marketStatus?.maintenance && (
        <div className="glow-anim" style={{
          background: 'linear-gradient(135deg, #3D2010 0%, #5C3317 50%, #3D2010 100%)',
          border: '2px solid #D4A017',
          borderRadius: 18,
          padding: '20px 22px',
          marginBottom: 16,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Bandeau décoratif diagonal "PAUSE" en arrière-plan */}
          <div aria-hidden style={{
            position: 'absolute',
            top: -8, right: -40,
            transform: 'rotate(20deg)',
            background: 'rgba(212,160,23,.18)',
            color: 'rgba(255,232,154,.35)',
            padding: '4px 50px',
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: 4,
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}>
            Pause · Pause · Pause
          </div>

          <div style={{
            fontSize: 44, lineHeight: 1, marginBottom: 8,
            filter: 'drop-shadow(0 0 10px rgba(212,160,23,.7)) drop-shadow(0 2px 4px rgba(0,0,0,.4))',
          }}>
            {marketStatus.circuitBreaker ? '⚡' : '🛠️'}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 800, color: 'rgba(255,232,154,.7)',
            letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6,
          }}>
            {marketStatus.circuitBreaker ? 'Circuit breaker' : 'Maintenance'}
          </div>
          <div style={{
            fontSize: 17, fontWeight: 900, color: '#FFE066',
            letterSpacing: .3, marginBottom: 8,
            textShadow: '0 0 12px rgba(212,160,23,.6)',
          }}>
            {marketStatus.circuitBreaker ? 'Marché en pause auto' : 'Marché temporairement fermé'}
          </div>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'rgba(255,232,154,.78)',
            lineHeight: 1.5, maxWidth: 320, margin: '0 auto',
          }}>
            {marketStatus.circuitBreaker
              ? '⚠ Variation de prix trop forte détectée. Réouverture automatique dans 1 h.'
              : 'Le trading est suspendu le temps d\'un rééquilibrage. Réouverture bientôt — merci de ta patience ☕'}
          </div>
        </div>
      )}

      <MarketStateCard state={state} dayChange={dayChange} marketStatus={marketStatus} />
      <MarketPulse pulse={pulse} C={C} />
      <MarketChart history={history} range={chartRange} onRangeChange={setChartRange} C={C} />
      <MarketFeed activity={activity} C={C} />
      <PortfolioCard portfolio={portfolio} currentPrice={state?.current_price ?? 100} C={C} />
      <TradePanel
        state={state}
        portfolio={portfolio}
        userCode={userCode}
        coins={coins}
        onTradeSuccess={handleTradeSuccess}
        marketStatus={marketStatus}
        tradingDisabled={tradingDisabled}
        bulkTradePasses={bulkTradePasses}
        onConsumeBulkPass={onConsumeBulkPass}
        C={C}
      />

      {showWelcome && <MarketWelcomeModal onClose={closeWelcome} />}
    </div>
  );
}

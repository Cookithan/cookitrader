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
import { PortfolioCard } from '../market/PortfolioCard.jsx';
import { TradePanel } from '../market/TradePanel.jsx';
import { MarketWelcomeModal } from '../market/MarketWelcomeModal.jsx';
import { useTranslation } from '../../i18n/index.js';

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

   v1.30 — l'écran est réordonné autour de l'action : prix → courbe →
   mon portefeuille → acheter/vendre → activité des autres. Le titre
   « MARCHÉ » a sauté (l'onglet de nav le dit) et MarketPulse est monté
   dans MarketFeed : les deux encarts répondaient à la même question.
═══════════════════════════════════════════════════════ */

export function MarketTab({ userCode, coins, addCoins, onTradeComplete, tradingDisabled, bulkTradePasses = 0, onConsumeBulkPass, C }) {
  const { t } = useTranslation();
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
      /* Vente : on crédite le produit (principal + plus-value), mais on ne
         compte que la plus-value comme "vrai gain" (XP + totalEarned) via le
         2e arg. noMult:true → les multiplicateurs (boost/doubler/prestige)
         ne s'appliquent PAS : un produit de vente n'est pas un gain de jeu,
         sinon revendre pendant un boost créerait des cookies sur le capital. */
      const profit = Math.max(0, Math.round(result.profit || 0));
      addCoins(result.gained, profit, { noMult: true });
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
            {t('market.offline_title')}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.4 }}>
            {t('market.offline_desc')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, paddingBottom: 100 }}>
      {/* Bandeau Maintenance / Circuit Breaker — compacté en v1.30 : il
          faisait 4 blocs de texte, un emoji de 44 px et un ruban diagonal,
          alors que la carte de prix juste dessous affiche déjà le statut.
          Une ligne suffit à dire pourquoi on ne peut pas trader. */}
      {marketStatus?.maintenance && (
        <div className="glow-anim" style={{
          background: 'linear-gradient(135deg, #3D2010 0%, #5C3317 50%, #3D2010 100%)',
          border: '2px solid #D4A017',
          borderRadius: 16,
          padding: '13px 16px',
          marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 13,
        }}>
          <div style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>
            {marketStatus.circuitBreaker ? '⚡' : '🛠️'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 900, color: '#FFE066', marginBottom: 2 }}>
              {marketStatus.circuitBreaker ? t('market.cb_title') : t('market.maintenance_title')}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,232,154,.78)', lineHeight: 1.45 }}>
              {marketStatus.circuitBreaker ? t('market.cb_desc') : t('market.maintenance_desc')}
            </div>
          </div>
        </div>
      )}

      {/* Ordre de lecture (v1.30) : le prix, la courbe, CE QUE JE POSSÈDE,
          puis L'ACTION. Le panneau d'achat/vente — le seul endroit où l'on
          fait quelque chose — était relégué après deux encarts sociaux.
          Ceux-ci passent en pied de page, fusionnés en un seul. */}
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
        bulkTradePasses={bulkTradePasses}
        onConsumeBulkPass={onConsumeBulkPass}
        C={C}
      />

      <MarketFeed activity={activity} pulse={pulse} C={C} />

      {showWelcome && <MarketWelcomeModal onClose={closeWelcome} />}
    </div>
  );
}

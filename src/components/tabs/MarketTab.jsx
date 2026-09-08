import { useEffect, useState, useCallback } from 'react';
import {
  getMarketState, getMarketHistory, getMarketActivity, getMarketPulse,
  getUserPortfolio, maintenanceTick, getMarketStatus, MARKET_CONFIG,
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
   - Maintenance (circuit breaker + battement de coeur de la courbe) —
     depuis le 08/09/2026 elle ne touche plus au prix : seuls les achats
     et les ventes le font bouger
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
    /* Refresh à 5 s : c'est le délai pour VOIR l'ordre d'un autre joueur
       apparaître sur la courbe. Le tick, lui, est throttlé côté lib à
       SNAPSHOT_SECONDS (60 s) — on l'appelle souvent, il ne fait rien la
       plupart du temps. Le throttle est global : pas de doublon même avec
       plusieurs clients connectés. */
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
      {/* Fermeture officielle (v1.29, conservée en 1.30) — distincte de la
          maintenance : pas de compte à rebours, pas de "réouverture
          bientôt". On dit pourquoi c'est fermé et surtout que rien n'est
          perdu, sinon le joueur qui a 300 actions croit qu'on les lui a
          confisquées. Compacté au format 1.30 (une ligne + le rassurant). */}
      {marketStatus?.closed && (
        <div style={{
          background: 'linear-gradient(135deg, #2E1808 0%, #4A2A12 55%, #2E1808 100%)',
          border: '2px solid rgba(201,154,46,.55)',
          borderRadius: 16,
          padding: '13px 16px 14px',
          marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>🔒</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 900, color: '#FFE066', marginBottom: 2 }}>
                {t('market.closed_title')}
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,232,154,.78)', lineHeight: 1.45 }}>
                {t('market.closed_desc')}
              </div>
            </div>
          </div>
          <div style={{
            fontSize: 11.5, fontWeight: 700, color: '#F3D9A4', lineHeight: 1.45,
            background: 'rgba(0,0,0,.22)', border: '1px solid rgba(201,154,46,.3)',
            borderRadius: 11, padding: '9px 11px', marginTop: 11,
          }}>
            {t('market.closed_keep')}
          </div>
        </div>
      )}

      {marketStatus?.maintenance && !marketStatus?.closed && (
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
      <PortfolioCard portfolio={portfolio} currentPrice={state?.current_price ?? MARKET_CONFIG.PRICE_INITIAL} C={C} />

      {/* Marché officiellement fermé : on retire le panneau d'échange au
          lieu de l'afficher grisé — le bandeau du haut a déjà tout dit,
          et un formulaire mort avec une heure de réouverture bidon
          (nextChange est null quand c'est une fermeture) ferait croire
          à un bug. */}
      {!marketStatus?.closed && (
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
      )}

      <MarketFeed activity={activity} pulse={pulse} C={C} />

      {showWelcome && <MarketWelcomeModal onClose={closeWelcome} />}
    </div>
  );
}

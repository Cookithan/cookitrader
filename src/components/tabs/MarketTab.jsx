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
═══════════════════════════════════════════════════════ */

export function MarketTab({ userCode, coins, addCoins, onTradeComplete, tradingDisabled, bulkTradePasses = 0, onConsumeBulkPass, onOpenActionsShop, C }) {
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
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, paddingTop:4 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>{t('market.title')}</div>
        <div style={{ fontSize:11, color:C.muted }}>{t('market.shared_subtitle')}</div>
      </div>

      {/* Bandeau Maintenance / Circuit Breaker — fond espresso sombre +
          bord doré épais + halo doré pulsant pour attirer l'attention.
          Palette café-only respectée (or + crème + espresso). */}
      {/* Fermeture officielle (v1.29) — bandeau distinct de la maintenance :
          pas de compte à rebours, pas de "réouverture bientôt". On dit
          pourquoi c'est fermé et surtout que rien n'est perdu, sinon le
          joueur qui a 300 actions croit qu'on les lui a confisquées. */}
      {marketStatus?.closed && (
        <div style={{
          background: 'linear-gradient(135deg, #2E1808 0%, #4A2A12 55%, #2E1808 100%)',
          border: '2px solid rgba(201,154,46,.55)',
          borderRadius: 18,
          padding: '22px 22px 18px',
          marginBottom: 16,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 42, lineHeight: 1, marginBottom: 10 }}>🔒</div>
          <div style={{
            fontSize: 10, fontWeight: 800, color: 'rgba(255,232,154,.6)',
            letterSpacing: 3, textTransform: 'uppercase', marginBottom: 7,
          }}>
            {t('market.closed_label')}
          </div>
          <div style={{
            fontSize: 17, fontWeight: 900, color: '#FFE066',
            letterSpacing: .3, marginBottom: 10,
          }}>
            {t('market.closed_title')}
          </div>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'rgba(255,232,154,.72)',
            lineHeight: 1.55, maxWidth: 320, margin: '0 auto 12px',
          }}>
            {t('market.closed_desc')}
          </div>
          <div style={{
            fontSize: 11.5, fontWeight: 700, color: '#F3D9A4',
            lineHeight: 1.5, background: 'rgba(0,0,0,.22)',
            border: '1px solid rgba(201,154,46,.3)',
            borderRadius: 12, padding: '10px 12px',
          }}>
            {t('market.closed_keep')}
          </div>
        </div>
      )}

      {marketStatus?.maintenance && !marketStatus?.closed && (
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
            {t('market.pause_label')}
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
            {marketStatus.circuitBreaker ? t('market.cb_label') : t('market.maintenance_label')}
          </div>
          <div style={{
            fontSize: 17, fontWeight: 900, color: '#FFE066',
            letterSpacing: .3, marginBottom: 8,
            textShadow: '0 0 12px rgba(212,160,23,.6)',
          }}>
            {marketStatus.circuitBreaker ? t('market.cb_title') : t('market.maintenance_title')}
          </div>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'rgba(255,232,154,.78)',
            lineHeight: 1.5, maxWidth: 320, margin: '0 auto',
          }}>
            {marketStatus.circuitBreaker ? t('market.cb_desc') : t('market.maintenance_desc')}
          </div>
        </div>
      )}

      <MarketStateCard state={state} dayChange={dayChange} marketStatus={marketStatus} />
      <MarketPulse pulse={pulse} C={C} />
      <MarketChart history={history} range={chartRange} onRangeChange={setChartRange} C={C} />
      <MarketFeed activity={activity} C={C} />
      <PortfolioCard portfolio={portfolio} currentPrice={state?.current_price ?? 100} C={C} />

      {/* Accroche Boutique Actions — découvrabilité : un joueur dans le
          Marché doit savoir qu'il peut dépenser ses actions $CKM en
          cosmétiques exclusifs. Clic → onglet Boutique, sous-vue Actions. */}
      {onOpenActionsShop && (() => {
        const sh = Number(portfolio?.shares) || 0;
        const ready = sh >= 500;
        return (
          <button
            onClick={ready ? onOpenActionsShop : undefined}
            disabled={!ready}
            style={{
              width:'100%', textAlign:'left', cursor: ready ? 'pointer' : 'default',
              background:'linear-gradient(135deg, rgba(201,154,46,.16), rgba(139,90,43,.22))',
              border:`1.5px solid ${ready ? '#C99A2E' : 'rgba(201,154,46,.45)'}`,
              borderRadius:16, padding:'14px 16px', margin:'14px 0',
              display:'flex', alignItems:'center', gap:14,
              boxShadow: ready ? '0 4px 16px rgba(201,154,46,.28)' : 'none',
              opacity: ready ? 1 : .85,
            }}
          >
            <div style={{ fontSize:30, lineHeight:1, filter: ready ? 'none' : 'grayscale(.4)' }}>{ready ? '🏦' : '🔒'}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:2 }}>
                {t('market.actions_shop_title')}
              </div>
              <div style={{ fontSize:11, color:C.muted, lineHeight:1.45 }}>
                {ready
                  ? t('market.actions_shop_ready')
                  : t('market.actions_shop_progress', { have: sh, need: 500 })}
              </div>
            </div>
            {ready && <div style={{ fontSize:18, color:'#C99A2E', fontWeight:900, lineHeight:1 }}>›</div>}
          </button>
        );
      })()}

      {/* Marché officiellement fermé : on retire le panneau d'échange au
          lieu de l'afficher grisé — le bandeau du haut a déjà tout dit,
          et un formulaire mort avec une heure de réouverture bidon
          (nextChange est null quand c'est une fermeture) ferait croire
          à un bug. La Boutique Actions, elle, reste ouverte : les
          actions gardent une utilité. */}
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

      {showWelcome && <MarketWelcomeModal onClose={closeWelcome} />}
    </div>
  );
}

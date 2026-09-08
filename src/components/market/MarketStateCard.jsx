import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../i18n/index.js';
import { MARKET_CONFIG } from '../../lib/market';

/* ════════════════════════════════════════════════════
   MarketStateCard — bandeau prix + rareté
   - state    : { current_price, shares_in_circulation, total_shares_supply }
   - dayChange: variation % vs il y a 24h
   Trend = "Plus haut qu'hier" / "Plus bas qu'hier" / "Stable", suivi du
   pourcentage réel. La jauge du bas montre la part du flottant DÉTENUE
   par les joueurs : elle se remplit à mesure que la communauté accumule.
   Bulle d'aide (?) explique la mécanique.
═══════════════════════════════════════════════════════ */

function fmtHM(date) {
  if (!date) return '';
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}h${m}`;
}

export function MarketStateCard({ state, dayChange, marketStatus }) {
  const { t } = useTranslation();
  const [showHelp, setShowHelp] = useState(false);

  /* Flash live ticker — quand le prix change entre 2 refreshs, on rejoue
     une animation courte (or pour hausse, moka pour baisse). Le `key`
     change à chaque variation pour forcer le remount → l'animation se
     déclenche systématiquement, même si la direction est la même. */
  const prevPriceRef = useRef(null);
  const [flash, setFlash] = useState({ dir: null, key: 0 });
  useEffect(() => {
    if (!state) return;
    const prev = prevPriceRef.current;
    const curr = state.current_price;
    /* Seuil minuscule (0.01) pour ignorer le bruit JS, mais déclencher
       même sur des micro-variations (mean reversion permanente). */
    if (prev !== null && Math.abs(prev - curr) > 0.01) {
      setFlash(f => ({ dir: curr > prev ? 'up' : 'down', key: f.key + 1 }));
    }
    prevPriceRef.current = curr;
  }, [state?.current_price]);

  const total = state?.total_shares_supply ?? MARKET_CONFIG.TOTAL_SHARES;
  const held  = state?.shares_in_circulation ?? 0;
  /* Jauge inversée le 08/09/2026 : on montre ce que la communauté
     DÉTIENT, pas ce qui reste en rayon. À 2 000 actions de flottant, la
     barre « disponibles » était pleine à 89 % en permanence et ne
     racontait rien. Remplie par les achats, elle raconte la raréfaction
     — exactement l'objectif de la refonte. */
  const heldPct = Math.max(0, Math.min(100, (held / Math.max(total, 1)) * 100));

  let trendText, trendColor, arrow;
  if (dayChange > 1) {
    trendText = t('market_card.higher_than_yesterday'); trendColor = '#F0C050'; arrow = '↑';
  } else if (dayChange < -1) {
    trendText = t('market_card.lower_than_yesterday'); trendColor = '#A88060'; arrow = '↓';
  } else {
    trendText = t('market_card.stable'); trendColor = 'rgba(255,255,255,0.7)'; arrow = '→';
  }
  /* Le chiffre, en plus de la phrase. Il avait été retiré par souci de
     simplicité ; dans un marché qui n'obéit plus qu'aux joueurs, la
     variation du jour EST l'information. */
  const showPct = Number.isFinite(dayChange) && Math.abs(dayChange) >= 0.1;

  return (
    <div style={{
      background: 'linear-gradient(140deg, #4A2C17, #7D4E1F)',
      borderRadius: 18,
      padding: 18,
      color: '#fff',
      marginBottom: 12,
      boxShadow: '0 8px 24px rgba(74,44,23,.35)',
      /* relative + overflow:hidden : sans les deux, le reflet balaierait
         par-dessus les cartes voisines au lieu de rester dans les coins
         arrondis de la bannière. */
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Lueur chaude qui enfle et retombe (7 s), puis reflet qui balaie
          la bannière (5 s). Mêmes animations que la carte de niveau de
          l'Accueil — c'est le même objet : une plaque brune qui doit
          accrocher la lumière au lieu de rester un aplat. Transform et
          opacity seulement : composité GPU, aucun reflow. */}
      <div className="card-warm" aria-hidden />
      <div className="card-sheen" aria-hidden />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 2 }}>
            {t('market_card.ckm_label')}
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, marginTop: 4, lineHeight: 1 }}>
            <span
              key={flash.key}
              className={
                flash.dir === 'up'   ? 'price-flash-up'   :
                flash.dir === 'down' ? 'price-flash-down' : ''
              }
              style={{ color: '#D4A017', transformOrigin: 'left center' }}
            >
              {state ? state.current_price.toFixed(0) : '—'}
            </span>
            <span style={{ fontSize: 18, color: 'rgba(212,160,23,0.7)', marginLeft: 6 }}>🍪</span>
          </div>
          <div style={{ fontSize: 13, color: trendColor, marginTop: 5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span>{arrow} {trendText}</span>
            {showPct && (
              <span style={{
                fontSize: 11, fontWeight: 900, letterSpacing: .2,
                background: 'rgba(0,0,0,.22)',
                border: `1px solid ${dayChange > 0 ? 'rgba(240,192,80,.45)' : 'rgba(168,128,96,.45)'}`,
                borderRadius: 8, padding: '2px 7px', whiteSpace: 'nowrap',
              }}>
                {dayChange > 0 ? '+' : ''}{dayChange.toFixed(1)} % <span style={{ opacity: .65, fontWeight: 700 }}>{t('market_card.over_24h')}</span>
              </span>
            )}
          </div>
        </div>
        {(() => {
          const open = marketStatus?.open ?? true;
          const maintenance = marketStatus?.maintenance;
          const next = marketStatus?.nextChange;
          /* 3 états visuels distincts : OUVERT (or pulsant), MAINTENANCE
             (orange + clé) ou FERMÉ (gris + horaire). */
          const bg     = open ? 'rgba(212, 160, 23, 0.2)' : maintenance ? 'rgba(193, 127, 60, 0.28)' : 'rgba(120, 90, 60, 0.25)';
          const border = open ? 'rgba(212, 160, 23, 0.5)' : maintenance ? 'rgba(193, 127, 60, 0.65)' : 'rgba(160, 130, 100, 0.5)';
          const fg     = open ? '#D4A017' : maintenance ? '#FFB060' : '#D8C8B0';
          const label  = open ? t('market_card.open') : maintenance ? `🛠️ ${t('market_card.maintenance')}` : t('market_card.closed');
          return (
            <div style={{
              background: bg,
              border: `1.5px solid ${border}`,
              borderRadius: 12,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 700,
              color: fg,
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
              minWidth: 92,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {open && <span className="live-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: '#D4A017', display: 'inline-block' }} />}
                {label}
              </div>
              {maintenance ? (
                <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.85, letterSpacing: 0.3 }}>
                  {t('market_card.trading_blocked')}
                </div>
              ) : next ? (
                <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.85, letterSpacing: 0.3 }}>
                  {open ? t('market_card.closes') : t('market_card.opens')} {fmtHM(next)}
                </div>
              ) : null}
            </div>
          );
        })()}
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
              💎 {t('market_card.held_shares')}
            </span>
            <button
              onClick={() => setShowHelp(!showHelp)}
              style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'rgba(212,160,23,0.25)',
                border: '1px solid rgba(212,160,23,0.5)',
                color: '#D4A017', fontSize: 11, fontWeight: 800,
                cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >?</button>
          </div>
          <span style={{ color: '#D4A017', fontWeight: 800, fontSize: 11 }}>
            {held.toLocaleString('fr-FR')} <span style={{ opacity: .6, fontWeight: 700 }}>/ {total.toLocaleString('fr-FR')}</span>
          </span>
        </div>
        <div style={{ height: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            /* Minimum visible : à 11 % de flottant détenu, une barre
               strictement proportionnelle ressemble à une barre vide. */
            width: `${Math.max(heldPct, 2)}%`,
            background: 'linear-gradient(90deg, #C17F3C, #D4A017)',
            borderRadius: 4,
            transition: 'width 0.5s ease',
          }} />
        </div>

        {showHelp && (
          <div style={{
            marginTop: 8,
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 10,
            fontSize: 11,
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.4,
          }}>
            💡 {t('market_card.help_text')}
          </div>
        )}
      </div>
    </div>
  );
}

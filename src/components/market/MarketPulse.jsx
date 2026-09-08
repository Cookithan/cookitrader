/* ════════════════════════════════════════════════════
   MarketPulse — Widget "foule" : activité communautaire du marché 24 h
   ────────────────────────────────────────────────────
   Affiche 3 infos compactes :
   - Nombre de traders actifs sur 24 h
   - Volume total d'actions échangées
   - Ratio achats / ventes (mini-baromètre or/moka)

   Caché si aucune activité sur 24 h.
   Style café-only (CLAUDE.md) : achats = or (#D4A017), ventes = moka (#7D4E1F).

   v1.30 — PLUS DE CARTE À LUI : le composant ne rend qu'une ligne, il est
   monté à l'intérieur de MarketFeed. Les deux disaient « ce que font les
   autres » et occupaient deux encarts empilés dans l'onglet Marché.

   Props :
   - pulse : { activeTraders, buyVolume, sellVolume, totalVolume } | null
   - C     : thème
═══════════════════════════════════════════════════════ */

import { useTranslation } from '../../i18n/index.js';

export function MarketPulse({ pulse, C }) {
  const { t, lang } = useTranslation();
  if (!pulse) return null;
  const { activeTraders, buyVolume, sellVolume, totalVolume } = pulse;
  if (activeTraders === 0 && totalVolume === 0) return null;

  const buyPct  = totalVolume > 0 ? Math.round((buyVolume  / totalVolume) * 100) : 50;
  const sellPct = 100 - buyPct;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      flexWrap: 'wrap',
      padding: '2px 4px 8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.muted }}>
        <span style={{ fontSize: 13 }}>👥</span>
        <b style={{ color: C.text, fontWeight: 800 }}>{activeTraders}</b>
        {t(activeTraders > 1 ? 'pulse.traders_24h_plural' : 'pulse.traders_24h_singular')}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.muted }}>
        <span style={{ fontSize: 13 }}>📊</span>
        <b style={{ color: C.text, fontWeight: 800 }}>{totalVolume.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')}</b>
        {t(totalVolume > 1 ? 'pulse.shares_plural' : 'pulse.shares_singular')}
      </div>

      {/* Baromètre buy/sell : barre proportionnelle or/moka */}
      <div style={{ flex: 1, minWidth: 110, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          flex: 1, height: 5, borderRadius: 3,
          background: '#7D4E1F',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            width: `${buyPct}%`,
            height: '100%',
            background: '#D4A017',
            transition: 'width 0.4s ease',
          }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
          <span style={{ color: '#D4A017' }}>🛒 {buyPct}%</span>
          <span style={{ color: C.muted, margin: '0 4px' }}>·</span>
          <span style={{ color: '#7D4E1F' }}>💰 {sellPct}%</span>
        </span>
      </div>
    </div>
  );
}

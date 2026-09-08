import { getHoldDuration } from '../../lib/market';
import { useTranslation } from '../../i18n/index.js';

/* ════════════════════════════════════════════════════
   PortfolioCard — ce que je possède, ce que ça vaut
   ────────────────────────────────────────────────────
   Props :
   - portfolio    : { shares, total_invested, weighted_buy_at } | null
   - currentPrice : prix actuel (state.current_price)
   - C            : thème

   Si 0 action : invite à acheter.
   Sinon : deux chiffres côte à côte (combien j'en ai / combien ça vaut),
   la plus-value en bandeau, et le prix de revient + la durée de
   détention en pied de carte.

   v1.30 (08/09/2026) — le bloc « bonus de hold » a disparu avec la
   mécanique elle-même : elle majorait la plus-value de 10 à 100 % selon
   la durée de détention, donc elle fabriquait des cookies sans qu'aucun
   prix n'ait bougé. La durée de détention reste affichée : elle est
   informative (et les frais de garde s'y appuient toujours).

   Le prix de revient, lui, réapparaît. Il avait été retiré par souci de
   simplicité, mais dans un marché où le cours ne bouge plus que par les
   joueurs, « à combien j'ai acheté » est LA question qu'on se pose
   avant de vendre.
═══════════════════════════════════════════════════════ */

const GOLD     = '#D4A017';
const ESPRESSO = '#7D4E1F';

function fmtDuration(ms) {
  if (!ms || ms < 0) return '< 1 min';
  const days  = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins  = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0)  return `${days} j ${hours} h`;
  if (hours > 0) return `${hours} h ${mins} min`;
  if (mins > 0)  return `${mins} min`;
  return '< 1 min';
}

const fmt = (n) => Math.round(n).toLocaleString('fr-FR');

export function PortfolioCard({ portfolio, currentPrice, C }) {
  const { t } = useTranslation();

  if (!portfolio || portfolio.shares === 0) {
    return (
      <div style={{
        background: C.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        border: `1.5px solid ${C.border}`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>💼</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t('portfolio.no_shares_title')}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
          {t('portfolio.no_shares_hint')}
        </div>
      </div>
    );
  }

  const currentValue = Math.floor(portfolio.shares * currentPrice);
  const invested     = Math.round(Number(portfolio.total_invested) || 0);
  const profit       = Math.round(currentValue - invested);
  const avgPrice     = portfolio.shares > 0 ? invested / portfolio.shares : 0;
  const profitPct    = invested > 0 ? (profit / invested) * 100 : 0;
  const up           = profit > 0;
  const flat         = profit === 0;
  const profitColor  = up ? GOLD : flat ? C.muted : ESPRESSO;
  const holdMs       = getHoldDuration(portfolio.weighted_buy_at);

  return (
    <div style={{
      background: C.card,
      borderRadius: 16,
      padding: '14px 16px 12px',
      marginBottom: 12,
      border: `1.5px solid ${C.border}`,
      /* Filet doré à gauche : la carte « ce qui est à moi » se distingue
         d'un coup d'oeil des cartes d'information au-dessus. */
      borderLeft: `3px solid ${GOLD}`,
    }}>
      <div style={{
        fontSize: 10, color: C.muted, textTransform: 'uppercase',
        letterSpacing: 2, fontWeight: 800, marginBottom: 12,
      }}>
        💼 {t('portfolio.my_shares')}
      </div>

      {/* Les deux chiffres qui comptent, côte à côte. Séparés par un
          filet vertical plutôt que par un cadre : moins de bruit. */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 14 }}>
        <div style={{ flex: '0 0 auto', minWidth: 74 }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: C.text, lineHeight: 1 }}>
            {portfolio.shares}
          </div>
          <div style={{ fontSize: 9.5, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
            {t('portfolio.label_shares')}
          </div>
        </div>

        <div style={{ width: 1, background: C.border, alignSelf: 'stretch', opacity: .8 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: GOLD, lineHeight: 1, whiteSpace: 'nowrap' }}>
            {fmt(currentValue)} <span style={{ fontSize: 18 }}>🍪</span>
          </div>
          <div style={{ fontSize: 9.5, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
            {t('portfolio.label_value')}
          </div>
        </div>
      </div>

      {/* Plus-value : le chiffre ET le pourcentage, parce qu'un gain de
          1 473 🍪 ne veut rien dire sans savoir sur quelle mise. */}
      <div style={{
        marginTop: 12,
        padding: '9px 12px',
        background: up ? 'rgba(212,160,23,0.12)' : flat ? 'rgba(160,130,100,0.10)' : 'rgba(125,78,31,0.14)',
        border: `1px solid ${up ? 'rgba(212,160,23,.3)' : flat ? 'rgba(160,130,100,.22)' : 'rgba(125,78,31,.3)'}`,
        borderRadius: 11,
        fontSize: 12,
        color: profitColor,
        fontWeight: 800,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
      }}>
        <span>{up ? '📈' : flat ? '➖' : '📉'} {up ? t('portfolio.current_gain') : flat ? t('portfolio.even') : t('portfolio.current_loss')}</span>
        <span style={{ whiteSpace: 'nowrap' }}>
          {up ? '+' : ''}{fmt(profit)} 🍪
          {invested > 0 && !flat && (
            <span style={{ fontSize: 10.5, opacity: .75, marginLeft: 5 }}>
              ({up ? '+' : ''}{profitPct.toFixed(1)} %)
            </span>
          )}
        </span>
      </div>

      {/* Pied de carte : les deux repères utiles avant de vendre. */}
      <div style={{
        marginTop: 9,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 10,
        fontSize: 10.5,
        color: C.muted,
        fontWeight: 600,
      }}>
        <span>{t('portfolio.label_avg')} <strong style={{ color: C.text }}>{fmt(avgPrice)} 🍪</strong></span>
        {holdMs > 0 && (
          <span>⏳ {t('portfolio.hold_since')} <strong style={{ color: C.text }}>{fmtDuration(holdMs)}</strong></span>
        )}
      </div>
    </div>
  );
}

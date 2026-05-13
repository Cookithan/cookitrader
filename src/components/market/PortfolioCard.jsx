import { getHoldBonus, MARKET_CONFIG } from '../../lib/market';

/* ════════════════════════════════════════════════════
   PortfolioCard — Mes actions + PnL + hold bonus actif
   ────────────────────────────────────────────────────
   Props :
   - portfolio    : { shares, total_invested, weighted_buy_at } | null
   - currentPrice : prix actuel (state.current_price)
   - C            : thème

   Si 0 action : invite à acheter.
   Sinon : valeur, gain/perte (cookies, sans %), et — si applicable —
   barre de progression vers le prochain palier de bonus de hold.

   Pas de prix moyen ni de % affiché — décision UX simplifiée (cf.
   commentaire historique). Le bonus de hold reste affiché car c'est
   une mécanique de récompense visible que le joueur doit comprendre.
═══════════════════════════════════════════════════════ */

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

export function PortfolioCard({ portfolio, currentPrice, C }) {
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
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Aucune action</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
          Achète tes premières $CKM pour commencer !
        </div>
      </div>
    );
  }

  const currentValue = Math.floor(portfolio.shares * currentPrice);
  const profit = Math.round(currentValue - portfolio.total_invested);
  const profitColor = profit >= 0 ? '#D4A017' : '#7D4E1F';
  const profitIcon  = profit > 0 ? '📈' : profit < 0 ? '📉' : '➖';

  /* ─── Bonus de hold ──────────────────────────────────────
     getHoldBonus retourne le tier actuel. On cherche aussi le prochain
     tier (palier supérieur) pour afficher une jauge de progression.
     Tiers sont triés desc dans MARKET_CONFIG → on les retri en asc
     pour repérer "celui juste au-dessus du holdMs courant". */
  const weightedBuyAt = portfolio.weighted_buy_at;
  const hb = getHoldBonus(weightedBuyAt);
  const tiersAsc = [...MARKET_CONFIG.HOLD_BONUS_TIERS].sort((a, b) => a.minMs - b.minMs);
  const nextTier = tiersAsc.find(t => t.minMs > (hb.holdMs || 0));
  const currentMinMs = tiersAsc
    .filter(t => (hb.holdMs || 0) >= t.minMs)
    .reduce((acc, t) => Math.max(acc, t.minMs), 0);
  const progress = nextTier
    ? Math.max(0, Math.min(1, ((hb.holdMs || 0) - currentMinMs) / (nextTier.minMs - currentMinMs)))
    : 1;

  return (
    <div style={{
      background: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      border: `1.5px solid ${C.border}`,
    }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
        💼 Mes actions
      </div>

      <div style={{ fontSize: 14, color: C.text, lineHeight: 1.4 }}>
        Tu as <strong style={{ color: '#D4A017', fontSize: 16 }}>{portfolio.shares}</strong> action(s) qui valent maintenant <strong style={{ color: '#D4A017', fontSize: 16 }}>{currentValue} 🍪</strong>
      </div>

      <div style={{
        marginTop: 10,
        padding: '8px 12px',
        background: profit >= 0 ? 'rgba(212,160,23,0.12)' : 'rgba(125,78,31,0.12)',
        borderRadius: 10,
        fontSize: 12,
        color: profitColor,
        fontWeight: 700,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>{profitIcon} {profit > 0 ? 'Gain actuel' : profit < 0 ? 'Perte actuelle' : "À l'équilibre"}</span>
        <span>{profit > 0 ? '+' : ''}{profit} 🍪</span>
      </div>

      {/* Hold bonus — affiché uniquement si weighted_buy_at présent.
          Sinon (portefeuille hérité d'avant la colonne SQL), on saute. */}
      {weightedBuyAt && (
        <div style={{
          marginTop: 10,
          padding: '8px 12px',
          background: 'rgba(168,128,96,.10)',
          border: '1px solid rgba(168,128,96,.25)',
          borderRadius: 10,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            color: C.text,
            fontWeight: 700,
          }}>
            <span style={{ color: C.muted, fontWeight: 600 }}>
              ⏳ Hold depuis <span style={{ color: C.text, fontWeight: 700 }}>{fmtDuration(hb.holdMs)}</span>
            </span>
            <span style={{ color: hb.pct > 0 ? '#D4A017' : C.muted }}>
              {hb.pct > 0 ? `Bonus +${Math.round(hb.pct * 100)}%` : 'Pas de bonus'}
            </span>
          </div>

          {nextTier && (
            <div style={{ marginTop: 6 }}>
              <div style={{
                height: 4,
                background: 'rgba(0,0,0,.18)',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${progress * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #C17F3C, #D4A017)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 3, textAlign: 'right' }}>
                prochain palier : +{Math.round(nextTier.bonus * 100)}% à {nextTier.label}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PortfolioCard — affiche les actions détenues + valeur + P&L
   - portfolio    : { shares, total_invested } depuis Supabase
   - currentPrice : prix actuel (depuis state.current_price)
   Si 0 actions → message d'invitation à acheter.
   Sinon : phrase claire "Tu as X action(s) qui valent Y 🍪" + gain/perte
   simple en cookies (pas de %, pas de prix moyen — UX simplifiée).
═══════════════════════════════════════════════════════ */

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
  const profitIcon = profit > 0 ? '📈' : (profit < 0 ? '📉' : '➖');

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
        <span>{profitIcon} {profit > 0 ? 'Gain actuel' : (profit < 0 ? 'Perte actuelle' : 'À l\'équilibre')}</span>
        <span>{profit > 0 ? '+' : ''}{profit} 🍪</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   UpgradeNoticeModal — avis de maintenance plein écran
   ────────────────────────────────────────────────────
   Modale rouge/blanc pour prévenir le joueur que l'app est en cours
   d'amélioration et qu'il ne devrait pas y jouer le temps que les
   briefs soient appliqués (sinon risque d'incohérence avec la DB).

   ⚠️ DÉROGATION CLAUDE.md règle 10 ('pas de rouge') — ici c'est
   l'exception 'panneau critique' explicite, demandée par le user.
   Le rouge est limité à cette modale et ne déteint pas sur le reste.

   Versioning : la prop `version` est stockée en LS quand l'user clique
   "j'ai compris". Si on bump la version dans App.jsx, la modale
   réapparaît (utile pour signaler une nouvelle phase d'évolution).

   Props :
     onAck : () → ferme la modale + persiste l'acquittement
═══════════════════════════════════════════════════════ */

export function UpgradeNoticeModal({ onAck }){
  return (
    <div
      role="alertdialog"
      aria-labelledby="upgrade-notice-title"
      style={{
        position:'fixed', inset:0, zIndex:9000,
        background:'linear-gradient(160deg,#B22222 0%,#8B1A1A 100%)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'24px 22px',
        animation:'inboxOverlayIn .25s ease-out both',
      }}
    >
      <div style={{
        width:'100%', maxWidth:380,
        background:'#fff',
        borderRadius:22,
        padding:'28px 22px 22px',
        textAlign:'center',
        boxShadow:'0 16px 40px rgba(0,0,0,.4)',
        border:'3px solid #B22222',
        animation:'bounceIn .55s cubic-bezier(.36,.07,.19,.97) both',
      }}>
        <div style={{ fontSize:64, lineHeight:1, marginBottom:8 }}>⚠️</div>

        <div
          id="upgrade-notice-title"
          style={{
            fontSize:11, color:'#B22222', letterSpacing:3, textTransform:'uppercase',
            fontWeight:800, marginBottom:8,
          }}
        >
          Avis important
        </div>

        <div style={{
          fontSize:22, fontWeight:900, color:'#2C1810',
          marginBottom:14, letterSpacing:.2,
        }}>
          Phase d'amélioration
        </div>

        <div style={{
          fontSize:14, color:'#2C1810', lineHeight:1.5,
          marginBottom:22,
        }}>
          L'application est en cours d'évolution. Pour éviter toute perte
          de progression ou incohérence sur ton compte, <strong>merci de ne
          pas jouer pendant cette période</strong>.
        </div>

        <button
          onClick={onAck}
          style={{
            width:'100%', padding:'14px 20px',
            background:'#B22222', color:'#fff',
            border:'none', borderRadius:14,
            fontSize:15, fontWeight:800, letterSpacing:.3,
            cursor:'pointer',
            boxShadow:'0 6px 16px rgba(178,34,34,.4)',
          }}
        >
          ✓ Oui, j'ai compris
        </button>
      </div>
    </div>
  );
}

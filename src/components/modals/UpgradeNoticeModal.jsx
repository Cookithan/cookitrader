/* ════════════════════════════════════════════════════
   UpgradeNoticeModal — avis de maintenance plein écran (admin only)
   ────────────────────────────────────────────────────
   Modale rouge/blanc affichée UNIQUEMENT aux comptes admin
   (admin123 / admin558) pour rappeler que l'app est en phase
   d'amélioration et qu'il ne faut pas y jouer en prod côté admin
   (sinon la sync auto peut décaler des données réelles).

   ⚠️ DÉROGATION CLAUDE.md règle 10 ("pas de rouge") — exception
   "panneau critique admin" assumée.

   Versioning : `version` est stockée en LS quand admin clique
   "j'ai compris". Bump UPGRADE_NOTICE_VERSION dans App.jsx pour
   ré-afficher la modale après une nouvelle phase.

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
          Avis admin
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

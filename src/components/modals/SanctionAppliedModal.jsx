import { GOLD, ESPRESSO } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   SanctionAppliedModal — popup d'avertissement (sanction)
   ────────────────────────────────────────────────────
   S'affiche au prochain mount pour les comptes ayant subi un débit
   administratif (sanction). Ton ferme mais pas humiliant — explique
   ce qui s'est passé et ce qui a été retiré.

   Props :
   - amount      : cookies retirés du totalEarned (0 = pas affiché)
   - sharesDebit : actions $CKM retirées du portefeuille (0 = pas affiché)
   - reason      : courte description ("Manipulation du marché…")
   - onClose     : ferme la modale
   - C           : palette
═══════════════════════════════════════════════════════ */

export function SanctionAppliedModal({ amount, sharesDebit = 0, reason, onClose, C }){
  const hasCookies = (amount || 0) > 0;
  const hasShares  = (sharesDebit || 0) > 0;
  return (
    <div
      onClick={onClose}
      role="dialog"
      style={{
        position:'fixed', inset:0, zIndex:97,
        background:'rgba(15,8,4,.88)', backdropFilter:'blur(6px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:18,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bi"
        style={{
          width:'100%', maxWidth:380,
          background:C.card, borderRadius:24,
          border:'2px solid #C17F3C',
          boxShadow:'0 24px 60px rgba(0,0,0,.55), 0 0 24px rgba(193,127,60,.35)',
          overflow:'hidden',
        }}
      >
        {/* Header espresso + accent caramel (pas or vif — registre 'sanction') */}
        <div style={{
          background:`linear-gradient(135deg, ${ESPRESSO} 0%, #5C3317 100%)`,
          color:'#FFB060',
          padding:'22px 22px 18px', textAlign:'center',
        }}>
          <div style={{ fontSize:48, lineHeight:1, marginBottom:6 }}>⚠️</div>
          <div style={{
            fontSize:11, fontWeight:900, letterSpacing:3,
            textTransform:'uppercase', opacity:.85, marginBottom:4,
          }}>
            Sanction appliquée
          </div>
          <div style={{ fontSize:18, fontWeight:900, color:'#FFE066', letterSpacing:.3 }}>
            Recalibrage administratif
          </div>
        </div>

        <div style={{ padding:'18px 22px 4px' }}>
          <p style={{ fontSize:13, color:C.text, lineHeight:1.6, margin:0, marginBottom:14 }}>
            Suite à <strong>{reason}</strong>, ton compte a été ajusté
            pour compenser les gains issus de l'incident.
          </p>

          {/* Détail du débit shares (si présent) */}
          {hasShares && (
            <div style={{
              background:'linear-gradient(135deg, #4A2C17, #5C3317)',
              borderRadius:14, padding:'14px 16px',
              marginBottom: hasCookies ? 10 : 14, textAlign:'center',
              border:'1.5px solid #C17F3C',
            }}>
              <div style={{ fontSize:10, fontWeight:900, color:'#FFB060', letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>
                Actions $CKM retirées
              </div>
              <div style={{ fontSize:30, fontWeight:900, color:'#FFE066', lineHeight:1 }}>
                -{(sharesDebit || 0).toLocaleString('fr-FR')} 📈
              </div>
              <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,232,154,.7)', marginTop:4, fontStyle:'italic' }}>
                (actions générées via un bug désormais corrigé)
              </div>
            </div>
          )}

          {/* Détail du débit totalEarned (si présent) */}
          {hasCookies && (
            <div style={{
              background:'linear-gradient(135deg, #5C3317, #7D4818)',
              borderRadius:14, padding:'14px 16px',
              marginBottom:14, textAlign:'center',
              border:'1.5px solid #C17F3C',
            }}>
              <div style={{ fontSize:10, fontWeight:900, color:'#FFB060', letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>
                Total earned ajusté
              </div>
              <div style={{ fontSize:30, fontWeight:900, color:'#FFE066', lineHeight:1 }}>
                -{(amount || 0).toLocaleString('fr-FR')} 🍪
              </div>
              <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,232,154,.7)', marginTop:4, fontStyle:'italic' }}>
                (ton solde de cookies n'est pas touché)
              </div>
            </div>
          )}

          <div style={{
            background:C.card2, borderRadius:12, padding:'10px 14px',
            border:`1px solid ${C.border}`, marginBottom:18,
            fontSize:11.5, color:C.muted, lineHeight:1.5,
          }}>
            🤝 Tu peux continuer à jouer normalement. Cette sanction
            est ponctuelle et vise à maintenir l'équilibre du jeu pour
            tous les autres joueurs.
          </div>
        </div>

        <div style={{ padding:'0 22px 20px' }}>
          <button
            onClick={onClose}
            style={{
              width:'100%', padding:'13px 0', borderRadius:14,
              background:'#3D2010', color:'#FFE066',
              fontSize:14, fontWeight:900, letterSpacing:.5,
              border:'none', cursor:'pointer',
              boxShadow:'0 6px 18px rgba(0,0,0,.3)',
            }}
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}

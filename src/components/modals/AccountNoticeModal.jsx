import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   AccountNoticeModal — message de compte one-shot (v1.29)
   ────────────────────────────────────────────────────
   Une seule modale, deux tons, pilotée par data/accountNotices.js :

     kind 'sanction' → espresso, bordure moka. Ferme mais pas
       humiliante : on explique ce qui s'est passé et on liste ce qui a
       été retiré, ligne par ligne. Un joueur qui rouvre l'app et
       découvre 10 niveaux en moins mérite de savoir pourquoi, sinon il
       croit à un bug et il a raison de le croire.

     kind 'reward' → or. On rend, on dit pourquoi.

   PALETTE : aucun rouge, y compris pour la sanction (règle café-only du
   projet). Les pertes se disent en tons espresso, pas en alarme.

   La modale n'applique AUCUN effet — elle informe. Les corrections sont
   faites en SQL. Cf. l'en-tête de accountNotices.js pour la raison
   (les sanctions client-side de mai 2026 double-débitaient).

   Props : notice (cf. getAccountNotice), onClose, C
═══════════════════════════════════════════════════════ */

export function AccountNoticeModal({ notice, onClose }) {
  const { t } = useTranslation();
  if (!notice) return null;
  const sanction = notice.kind === 'sanction';
  const lignes = sanction ? (notice.removed || []) : (notice.gained || []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position:'fixed', inset:0, zIndex:98,
        background:'rgba(15,8,4,.88)', backdropFilter:'blur(6px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:18,
      }}
    >
      <div className="bi" style={{
        width:'100%', maxWidth:380, maxHeight:'86vh', overflowY:'auto',
        background: sanction
          ? 'linear-gradient(150deg,#3D2010,#241208)'
          : 'linear-gradient(150deg,#F5DC8A,#D4A017)',
        borderRadius:24,
        border: `2px solid ${sanction ? '#8B5A2B' : '#B8860B'}`,
        boxShadow:'0 24px 64px rgba(0,0,0,.55)',
        padding:'26px 22px 20px',
      }}>

        <div style={{ textAlign:'center', fontSize:44, lineHeight:1, marginBottom:10 }}>
          {sanction ? '⚖️' : '🎁'}
        </div>

        <div style={{
          textAlign:'center', fontSize:19, fontWeight:900, lineHeight:1.25,
          color: sanction ? '#F0C050' : '#3D2010', marginBottom:12,
        }}>
          {notice.title}
        </div>

        <div style={{
          fontSize:12.5, lineHeight:1.55, marginBottom:16,
          color: sanction ? 'rgba(255,232,190,.82)' : '#5D3A1F',
        }}>
          {notice.reason}
        </div>

        {lignes.length > 0 && (
          <div style={{
            borderRadius:14, padding:'12px 14px', marginBottom:16,
            background: sanction ? 'rgba(0,0,0,.28)' : 'rgba(61,32,16,.12)',
            border: `1px solid ${sanction ? 'rgba(212,160,23,.3)' : 'rgba(61,32,16,.22)'}`,
          }}>
            <div style={{
              fontSize:10, fontWeight:900, letterSpacing:1.6, textTransform:'uppercase',
              color: sanction ? '#C8945C' : '#5D3A1F', marginBottom:8,
            }}>
              {sanction ? 'Ce qui a été retiré' : 'Ce qui t\'a été rendu'}
            </div>
            {lignes.map((l, i) => (
              <div key={i} style={{
                display:'flex', gap:8, fontSize:12, lineHeight:1.5,
                color: sanction ? 'rgba(255,232,190,.9)' : '#3D2010',
                marginBottom: i === lignes.length - 1 ? 0 : 6,
              }}>
                <span style={{ flexShrink:0, opacity:.7 }}>{sanction ? '−' : '+'}</span>
                <span>{l}</span>
              </div>
            ))}
          </div>
        )}

        {notice.footer && (
          <div style={{
            fontSize:11.5, lineHeight:1.55, fontStyle:'italic', marginBottom:18,
            color: sanction ? 'rgba(255,232,190,.6)' : '#5D3A1F',
          }}>
            {notice.footer}
          </div>
        )}

        <button
          onClick={onClose}
          className="tap-pop"
          style={{
            width:'100%', padding:13, borderRadius:16,
            fontSize:14.5, fontWeight:800, letterSpacing:.3, cursor:'pointer',
            background: sanction ? 'linear-gradient(135deg,#8B5A2B,#5C3317)' : '#3D2010',
            color: sanction ? '#F0E0C0' : '#F5DC8A',
            border:'none',
          }}
        >
          {t('common.understood_short')}
        </button>
      </div>
    </div>
  );
}

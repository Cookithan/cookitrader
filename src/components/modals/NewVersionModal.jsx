import { useState } from "react";
import { APP_INFO, CHANGELOG } from "../../lib/appInfo.js";
import { GOLD, ESPRESSO } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   NewVersionModal — popup "Nouvelle version disponible"
   ────────────────────────────────────────────────────
   Affiché au mount par App.jsx quand `lastSeenVersion` ≠ APP_INFO.version
   (un fresh install set immédiatement lastSeenVersion = version courante
   pour ne PAS pop sur les nouveaux comptes).

   Contenu :
     - Header GOLD avec version
     - Titre de la release la plus récente (premier item CHANGELOG)
     - 3 puces preview des nouveautés (les 3 premiers `changes`)
     - CTA "Voir tout" → onOpenAbout (ouvre AboutModal)
     - CTA "Plus tard" → ferme

   Props :
     onClose      — ferme et marque la version comme vue
     onOpenAbout  — ouvre la modale À propos (et marque comme vue)
     C            — palette
═══════════════════════════════════════════════════════ */

export function NewVersionModal({ onClose, onOpenAbout, C }){
  const [closing, setClosing] = useState(false);
  const release = CHANGELOG[0] || null;

  const handleClose = () => {
    if(closing) return;
    setClosing(true);
    setTimeout(onClose, 280);
  };

  const handleSeeAll = () => {
    if(closing) return;
    setClosing(true);
    setTimeout(() => {
      onOpenAbout?.();
      onClose?.();
    }, 200);
  };

  if(!release) return null;

  return (
    <div
      onClick={handleClose}
      role="dialog"
      className={closing ? 'inbox-overlay-out' : 'inbox-overlay-in'}
      style={{
        position:'fixed', inset:0, zIndex:98,
        display:'flex', alignItems:'flex-end', justifyContent:'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={closing ? 'inbox-slide-down' : 'inbox-slide-up'}
        style={{
          width:'100%', maxWidth:430,
          background:C.bg,
          borderTopLeftRadius:24, borderTopRightRadius:24,
          maxHeight:'85vh', display:'flex', flexDirection:'column',
          boxShadow:'0 -8px 32px rgba(15,8,4,.45)',
          position:'relative',
        }}
      >
        {/* Drag handle */}
        <div style={{ width:40, height:4, background:C.border, borderRadius:2, margin:'10px auto 8px', flexShrink:0 }} />

        {/* Header GOLD */}
        <div style={{
          background:GOLD,
          padding:'18px 22px 16px',
          textAlign:'center', color:'#fff',
        }}>
          <div style={{ fontSize:38, lineHeight:1, marginBottom:6 }}>🎉</div>
          <div style={{
            fontSize:10, fontWeight:900, letterSpacing:3,
            textTransform:'uppercase', opacity:.85, marginBottom:3,
          }}>
            Nouvelle version
          </div>
          <div style={{ fontSize:20, fontWeight:900, letterSpacing:.4 }}>
            v{APP_INFO.version}
          </div>
        </div>

        {/* Contenu scrollable */}
        <div style={{ padding:'18px 20px 4px', overflowY:'auto', flex:1 }}>
          <div style={{
            fontSize:14, fontWeight:800, color:C.text,
            textAlign:'center', marginBottom:14, lineHeight:1.35,
          }}>
            {release.title}
          </div>

          <div style={{
            background:C.card, borderRadius:14, padding:'12px 14px',
            border:`1.5px solid ${C.border}`, marginBottom:14,
          }}>
            <div style={{
              fontSize:10, fontWeight:800, color:C.muted,
              textTransform:'uppercase', letterSpacing:2, marginBottom:8,
            }}>
              ✨ Au programme
            </div>
            <ul style={{ margin:0, paddingLeft:18, fontSize:12.5, color:C.text, lineHeight:1.55 }}>
              {release.changes.slice(0, 3).map((c, i) => (
                <li key={i} style={{ marginBottom:4 }}>{c}</li>
              ))}
              {release.changes.length > 3 && (
                <li style={{ marginTop:6, fontStyle:'italic', color:C.muted, listStyle:'none', marginLeft:-12 }}>
                  + {release.changes.length - 3} autre{release.changes.length - 3 > 1 ? 's' : ''} nouveauté{release.changes.length - 3 > 1 ? 's' : ''}…
                </li>
              )}
            </ul>
          </div>

          <div style={{
            fontSize:11, color:C.muted, textAlign:'center',
            fontStyle:'italic', marginBottom:14,
          }}>
            Le détail complet et le changelog des versions précédentes sont dans <strong>À propos</strong>.
          </div>
        </div>

        {/* Footer CTA */}
        <div style={{ padding:'4px 20px 20px', display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
          <button
            onClick={handleSeeAll}
            style={{
              width:'100%', padding:'13px 0', borderRadius:14,
              background:GOLD, color:'#fff', border:'none',
              fontSize:14, fontWeight:900, letterSpacing:.4,
              boxShadow:'0 6px 18px rgba(212,160,23,.4)',
              cursor:'pointer',
            }}
          >
            Voir toutes les nouveautés →
          </button>
          <button
            onClick={handleClose}
            style={{
              width:'100%', padding:'10px 0', borderRadius:12,
              background:'transparent', color:C.muted, border:'none',
              fontSize:12.5, fontWeight:700,
              cursor:'pointer',
            }}
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { createPortal } from "react-dom";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   WeeklyResetNoticeModal — annonce "classement remis à zéro"
   ────────────────────────────────────────────────────
   Popup centré (bi bounce-in), rendu via createPortal dans
   document.body (échappe à tout containing block transform/filter
   d'un ancêtre — même contrainte que WeeklyRewardsModal).

   But : rassurer le joueur après une remise à zéro du classement
   hebdo. Message clé en 3 temps :
     1. une nouvelle course commence
     2. il n'a RIEN perdu (cookies / niveau / récompenses intacts)
     3. c'est pour que tout le monde reparte à égalité et puisse
        viser la 1re place

   Palette café-only (pas de rouge/vert). i18n via `weekly_reset.*`.

   Props :
     onClose — ferme la modale (le caller gère le flag "déjà vu")
     C       — palette active
═══════════════════════════════════════════════════════ */
export function WeeklyResetNoticeModal({ onClose, C }){
  const { t } = useTranslation();
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    if(closing) return;
    setClosing(true);
    setTimeout(onClose, 200);
  };

  if(typeof document === 'undefined') return null;

  return createPortal((
    <div
      onClick={handleClose}
      role="dialog"
      style={{
        position:"fixed", top:0, left:0, right:0, bottom:0, zIndex:9999,
        background:"rgba(15,8,4,.78)",
        backdropFilter:"blur(6px)",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:18,
        opacity: closing ? 0 : 1,
        transition: "opacity .2s ease-out",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bi"
        style={{
          width:"100%", maxWidth:380,
          background:C.bg,
          borderRadius:24,
          maxHeight:"85vh", display:"flex", flexDirection:"column",
          boxShadow:"0 24px 64px rgba(0,0,0,.45)",
          overflow:"hidden",
        }}
      >
        {/* Header */}
        <div style={{ background:ESPRESSO, padding:"22px 22px 18px", textAlign:"center", color:"#fff" }}>
          <div style={{ fontSize:42, lineHeight:1, marginBottom:8 }}>🏁</div>
          <div style={{ fontSize:19, fontWeight:900, color:"#F0C050", letterSpacing:.3 }}>
            {t('weekly_reset.title')}
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.75)", marginTop:6 }}>
            {t('weekly_reset.intro')}
          </div>
        </div>

        {/* Corps */}
        <div style={{ padding:"18px 22px 4px", flex:1, overflowY:"auto" }}>
          <div style={{
            background:"linear-gradient(135deg, rgba(212,160,23,.12), rgba(193,127,60,.16))",
            border:"1px solid rgba(212,160,23,.45)",
            borderRadius:14, padding:"14px 16px",
            fontSize:13, color:C.text, lineHeight:1.6, marginBottom:12,
          }}>
            ✅ <strong>{t('weekly_reset.kept')}</strong>
          </div>
          <div style={{
            fontSize:12.5, color:C.text, lineHeight:1.6,
            padding:"0 4px", marginBottom:8,
          }}>
            🤝 {t('weekly_reset.why')}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding:"14px 22px 20px", flexShrink:0 }}>
          <button
            onClick={handleClose}
            style={{
              width:"100%", padding:"13px 0", borderRadius:14,
              background:GOLD, color:"#fff", border:"none",
              fontSize:14, fontWeight:900, letterSpacing:.4,
              boxShadow:"0 4px 14px rgba(212,160,23,.35)",
              cursor:"pointer",
            }}
          >
            {t('weekly_reset.cta')}
          </button>
        </div>
      </div>
    </div>
  ), document.body);
}

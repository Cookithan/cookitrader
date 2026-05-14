import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { GOLD } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   MaintenanceWarningModal — alerte 30s avant bascule maintenance
   ────────────────────────────────────────────────────
   Pop-up déclenché par App.jsx quand system_status.maintenance_mode
   passe de false → true en cours de session (cf. supabaseSync
   subscribeSystemStatus). Donne 30s au joueur pour finir/quitter sa
   partie avant que l'écran MaintenanceScreen plein écran prenne le
   relais.

   Props :
     title    — titre custom (fallback "Maintenance imminente")
     subtitle — message custom (fallback message générique)
     seconds  — durée du compte à rebours (défaut 30)
     onDone   — callback appelé à expiration OU au clic du bouton
═══════════════════════════════════════════════════════ */

export default function MaintenanceWarningModal({
  title,
  subtitle,
  seconds = 30,
  onDone,
}){
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if(remaining <= 0){
      onDone?.();
      return;
    }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onDone]);

  const C = { text:'#F0E6D3', muted:'#A88B70' };
  const pct = Math.max(0, Math.min(100, (remaining / seconds) * 100));

  return (
    <div
      role="alertdialog"
      aria-labelledby="maintenance-warning-title"
      style={{
        position:'fixed', inset:0, zIndex:9500,
        background:'linear-gradient(160deg,rgba(10,4,2,.85) 0%,rgba(31,14,4,.92) 100%)',
        backdropFilter:'blur(8px)',
        WebkitBackdropFilter:'blur(8px)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'24px 22px',
        animation:'inboxOverlayIn .25s ease-out both',
      }}
    >
      <div style={{
        width:'100%', maxWidth:380,
        background:'linear-gradient(180deg,#2A1408 0%,#1A0A04 100%)',
        borderRadius:22,
        padding:'26px 22px 22px',
        textAlign:'center',
        boxShadow:'0 16px 40px rgba(0,0,0,.55), 0 0 0 1px rgba(212,160,23,.25)',
        border:'1px solid rgba(212,160,23,.4)',
        animation:'bounceIn .55s cubic-bezier(.36,.07,.19,.97) both',
        color:C.text,
      }}>
        {/* Pastille outil */}
        <div style={{
          width:62, height:62, borderRadius:'50%',
          background:GOLD,
          margin:'0 auto 14px',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 6px 18px rgba(212,160,23,.5)',
          animation:'wiggle 1.8s ease-in-out infinite',
        }}>
          <Wrench size={30} strokeWidth={2.4} color="#fff" />
        </div>

        <div
          id="maintenance-warning-title"
          style={{
            fontSize:11, letterSpacing:3, textTransform:'uppercase',
            fontWeight:800, color:'#D4A017', marginBottom:6,
          }}
        >
          {t('modal.maintenance_notice')}
        </div>

        <div style={{
          fontSize:22, fontWeight:900, color:'#FFE8A8',
          marginBottom:12, letterSpacing:.2, lineHeight:1.2,
        }}>
          {title || t('modal.maintenance_imminent')}
        </div>

        <div style={{
          fontSize:14, color:C.muted, lineHeight:1.55,
          marginBottom:20, whiteSpace:'pre-line',
        }}>
          {subtitle || t('modal.maintenance_save_progress')}
        </div>

        {/* Compte à rebours géant */}
        <div style={{
          fontSize:48, fontWeight:900, color:'#D4A017',
          lineHeight:1, marginBottom:10,
          textShadow:'0 0 24px rgba(212,160,23,.5)',
          fontVariantNumeric:'tabular-nums',
        }}>
          {remaining}s
        </div>

        {/* Barre de progression */}
        <div style={{
          height:6, borderRadius:3,
          background:'rgba(212,160,23,.15)',
          overflow:'hidden',
          marginBottom:22,
        }}>
          <div style={{
            height:'100%', width:`${pct}%`,
            background:GOLD,
            transition:'width 1s linear',
            borderRadius:3,
          }} />
        </div>

        <button
          onClick={() => onDone?.()}
          style={{
            width:'100%', padding:'13px 20px',
            background:'rgba(212,160,23,.15)',
            color:'#FFE8A8',
            border:'1px solid rgba(212,160,23,.4)',
            borderRadius:14,
            fontSize:14, fontWeight:700, letterSpacing:.3,
            cursor:'pointer',
            touchAction:'manipulation',
          }}
        >
          {t('modal.ok_understood')}
        </button>
      </div>
    </div>
  );
}

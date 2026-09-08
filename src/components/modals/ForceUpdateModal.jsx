import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { GOLD } from "../../data/themes.js";
import { APP_INFO } from "../../lib/appInfo.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   ForceUpdateModal — popup "Nouvelle version disponible" déclenché
   par system_status.force_version > APP_INFO.version (comparaison
   numerique reelle depuis le 09/09/2026 — cf. App.jsx)
   ────────────────────────────────────────────────────
   Contrairement à NewVersionModal (qui pop au mount d'un client qui
   *ouvre* l'app après un deploy), celui-ci s'affiche aux clients
   **déjà ouverts** quand l'admin met à jour force_version en SQL.
   → Permet de pousser un reload sans attendre que les joueurs
   ferment/relancent l'app.

   Au clic "Relancer maintenant" : unregister les service workers PWA
   (sinon le cache peut servir l'ancien bundle) puis location.reload().

   Props :
     targetVersion — la version annoncée par le serveur (system_status.force_version)
     onDismiss     — clic "Plus tard" (popup re-pop au prochain refresh
                     puisque force_version reste > APP_INFO.version)
═══════════════════════════════════════════════════════ */

export default function ForceUpdateModal({ targetVersion, onDismiss }){
  const { t } = useTranslation();
  const [reloading, setReloading] = useState(false);

  const handleReload = async () => {
    if(reloading) return;
    setReloading(true);
    try{
      if('serviceWorker' in navigator){
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister().catch(() => {})));
      }
      if(typeof caches !== 'undefined'){
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k).catch(() => {})));
      }
    }catch{}
    window.location.reload();
  };

  return (
    <div
      role="dialog"
      aria-labelledby="force-update-title"
      style={{
        position:'fixed', inset:0, zIndex:9400,
        background:'rgba(15,8,4,.65)',
        backdropFilter:'blur(6px)',
        WebkitBackdropFilter:'blur(6px)',
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
        boxShadow:'0 16px 40px rgba(0,0,0,.5), 0 0 0 1px rgba(212,160,23,.25)',
        border:'1px solid rgba(212,160,23,.4)',
        animation:'bounceIn .55s cubic-bezier(.36,.07,.19,.97) both',
        color:'#F0E6D3',
      }}>
        <div style={{ fontSize:48, lineHeight:1, marginBottom:8 }}>🎉</div>

        <div
          id="force-update-title"
          style={{
            fontSize:11, letterSpacing:3, textTransform:'uppercase',
            fontWeight:800, color:'#D4A017', marginBottom:6,
          }}
        >
          {t('modal.update_available')}
        </div>

        <div style={{
          fontSize:22, fontWeight:900, color:'#FFE8A8',
          marginBottom:10, letterSpacing:.2, lineHeight:1.2,
        }}>
          {t('modal.new_version_avail')}
        </div>

        <div style={{
          fontSize:13, color:'#A88B70', lineHeight:1.55,
          marginBottom:18,
        }}>
          {t('modal.you_have')} <strong style={{ color:'#FFE8A8' }}>v{APP_INFO.version}</strong>
          {targetVersion ? <> · {t('modal.avail_lc')} <strong style={{ color:'#FFE8A8' }}>v{targetVersion}</strong></> : null}
          <br />{t('modal.reload_app')}
        </div>

        <button
          onClick={handleReload}
          disabled={reloading}
          style={{
            width:'100%', padding:'14px 20px',
            background:GOLD,
            color:'#fff',
            border:'none',
            borderRadius:14,
            fontSize:15, fontWeight:800, letterSpacing:.3,
            cursor: reloading ? 'wait' : 'pointer',
            boxShadow:'0 6px 16px rgba(212,160,23,.45)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            opacity: reloading ? .7 : 1,
            touchAction:'manipulation',
            marginBottom:10,
          }}
        >
          <RefreshCw size={18} strokeWidth={2.6} style={{
            animation: reloading ? 'spin360 1s linear infinite' : 'none',
          }} />
          {reloading ? t('modal.reloading') : t('modal.reload_now')}
        </button>

        <button
          onClick={onDismiss}
          style={{
            width:'100%', padding:'10px 20px',
            background:'transparent', color:'#A88B70',
            border:'none',
            fontSize:13, fontWeight:600, letterSpacing:.3,
            cursor:'pointer',
            touchAction:'manipulation',
          }}
        >
          {t('modal.later')}
        </button>
      </div>
    </div>
  );
}

import { Cookie, Wrench } from "lucide-react";
import { ESPRESSO, GOLD } from "../../data/themes.js";
import { MAINTENANCE_MESSAGE } from "../../data/maintenance.js";
import { APP_INFO } from "../../lib/appInfo.js";
import { GLOBAL_CSS } from "../../styles/globalStyles.js";

/* ════════════════════════════════════════════════════
   MaintenanceScreen — écran plein "Maintenance en cours"
   ────────────────────────────────────────────────────
   Remplace toute l'app quand MAINTENANCE_MODE = true (code-driven,
   nécessite un deploy) OU quand system_status.maintenance_mode = true
   en Supabase (live, instantané via Realtime — voir App.jsx + le
   MaintenanceWarningModal qui donne un grace period 30s avant
   l'affichage de cet écran). Aucune interaction possible.

   Props (toutes optionnelles) :
     title    — surcharge le titre par défaut (sinon MAINTENANCE_MESSAGE.title)
     subtitle — surcharge le sous-titre par défaut

   Style :
   - Fond ESPRESSO profond (palette café-only, pas de rouge/vert)
   - Cookie central qui pulse + bouclette outil en overlay
   - Titre + sous-titre + version en bas
   - Mobile-first (max-width 430, centré)
═══════════════════════════════════════════════════════ */

export default function MaintenanceScreen({ title, subtitle } = {}){
  const C = { text:'#F0E6D3', muted:'#A88B70', accent:'#D4A017' };
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:99999,
      background:'linear-gradient(160deg,#0A0402 0%,#1F0E04 50%,#1A0A02 100%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'24px', textAlign:'center',
      fontFamily:'system-ui,-apple-system,sans-serif', color:C.text,
      userSelect:'none', touchAction:'none',
    }}>
      <style>{GLOBAL_CSS}</style>

      {/* Sparkles décoratifs */}
      <div aria-hidden style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
        {[
          { top:'12%', left:'18%', delay:0,   size:14, col:'#D4A017' },
          { top:'24%', left:'78%', delay:1.2, size:11, col:'#C17F3C' },
          { top:'48%', left:'10%', delay:.6,  size:12, col:'#D4A017' },
          { top:'66%', left:'82%', delay:2.0, size:13, col:'#C17F3C' },
          { top:'82%', left:'26%', delay:1.5, size:10, col:'#D4A017' },
          { top:'88%', left:'70%', delay:.9,  size:11, col:'#C17F3C' },
        ].map((p,i)=>(
          <span
            key={i}
            className="float-anim"
            style={{
              position:'absolute', top:p.top, left:p.left,
              fontSize:p.size, animationDelay:`${p.delay}s`,
              color:p.col, opacity:.7,
              filter:`drop-shadow(0 0 6px ${p.col})`,
              fontWeight:900, lineHeight:1
            }}
          >✦</span>
        ))}
      </div>

      {/* Cookie central + outil en overlay */}
      <div style={{
        position:'relative',
        width:140, height:140,
        marginBottom:32,
        animation:'idle 3.5s ease-in-out infinite'
      }}>
        <div style={{
          position:'absolute', inset:0,
          borderRadius:'50%',
          background:'radial-gradient(circle at 35% 30%, #C8945A 0%, #8B5A2A 55%, #5A3520 100%)',
          boxShadow:'0 0 48px rgba(212,160,23,.35), inset -8px -8px 20px rgba(0,0,0,.4), inset 6px 6px 12px rgba(255,220,170,.2)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Cookie size={70} strokeWidth={1.5} color="#3D2010" style={{ opacity:.7 }} />
        </div>
        {/* Pastille outil */}
        <div style={{
          position:'absolute', bottom:-6, right:-6,
          width:54, height:54, borderRadius:'50%',
          background:GOLD,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 4px 16px rgba(212,160,23,.55), 0 0 0 4px #1F0E04',
          animation:'wiggle 1.8s ease-in-out infinite'
        }}>
          <Wrench size={28} strokeWidth={2.4} color="#fff" />
        </div>
      </div>

      <h1 style={{
        margin:'0 0 16px 0',
        fontSize:26, fontWeight:800,
        letterSpacing:.5,
        background:'linear-gradient(180deg,#FFE89A,#D4A017)',
        WebkitBackgroundClip:'text', backgroundClip:'text',
        WebkitTextFillColor:'transparent',
        textShadow:'0 0 24px rgba(212,160,23,.3)',
      }}>
        🍪 {title || MAINTENANCE_MESSAGE.title}
      </h1>

      <p style={{
        margin:0, fontSize:15, lineHeight:1.6,
        color:C.muted, maxWidth:320,
        whiteSpace:'pre-line'
      }}>
        {subtitle || MAINTENANCE_MESSAGE.subtitle}
      </p>

      <div style={{
        marginTop:36,
        padding:'10px 18px',
        borderRadius:14,
        background:'rgba(212,160,23,.12)',
        border:'1px solid rgba(212,160,23,.3)',
        fontSize:12, color:C.muted, letterSpacing:.4,
      }}>
        CookiMiner · v{APP_INFO.version}
      </div>
    </div>
  );
}

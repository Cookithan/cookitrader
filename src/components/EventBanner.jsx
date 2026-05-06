import { useEffect, useState } from "react";
import { formatTimeLeft, MAX_ATTEMPTS } from "../data/events.js";

/* ════════════════════════════════════════════════════
   EventBanner — bannière persistante d'événement (PHASE 6E)
   ────────────────────────────────────────────────────
   Affichée sur l'accueil tant qu'un activeEvent existe. Deux modes :

   - phase 'waiting' (mystère, timer 1-24h) :
       Style sobre espresso, on ne révèle pas le challenge.
       Texte : "🎁 Prochain événement dans Xh XXmin"

   - phase 'active' (1h pour réussir, 3 essais max) :
       Style gradient or vif (glow), le challenge est révélé.
       Texte : "[titre] · Xh XXmin · N essai(s)"
       Cliquable → ouvre EventAnnounceModal pour rappeler le détail.

   Le timer countdown est rafraîchi 1×/seconde.

   Props :
   - event   : activeEvent
   - onView  : appelé au clic (ouvre EventAnnounceModal en phase active)
═══════════════════════════════════════════════════════ */

export function EventBanner({ event, onView }){
  const [now, setNow] = useState(()=>Date.now());
  useEffect(()=>{
    const id = setInterval(()=>setNow(Date.now()), 1000);
    return ()=>clearInterval(id);
  }, []);

  if(!event) return null;

  if(event.phase === 'waiting'){
    const ms = event.revealAt - now;
    if(ms <= 0) return null;   // transition en cours, masque le temps d'un tick
    return (
      <button
        onClick={onView}
        style={{
          width:'100%',
          background:'linear-gradient(135deg,#3D2010,#5A3520)',
          color:'#F0E0C0', padding:'11px 14px', borderRadius:14,
          marginBottom:14,
          display:'flex', justifyContent:'space-between', alignItems:'center', gap:10,
          border:'1px solid rgba(212,160,23,.28)',
          boxShadow:'0 4px 14px rgba(0,0,0,.18)',
          cursor:'pointer', textAlign:'left',
        }}
      >
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:1.5, textTransform:'uppercase', color:'#D4A017', marginBottom:2 }}>
            🎁 Événement à venir
          </div>
          <div style={{ fontSize:12, fontWeight:600, opacity:.85 }}>
            Prochain dans <strong style={{ color:'#F5DC8A' }}>{formatTimeLeft(ms)}</strong>
          </div>
        </div>
        <span style={{
          flexShrink:0, padding:'5px 10px', borderRadius:9,
          background:'rgba(212,160,23,.18)', color:'#F5DC8A',
          fontSize:11, fontWeight:800, letterSpacing:.3,
          border:'1px solid rgba(212,160,23,.4)',
        }}>
          Voir →
        </span>
      </button>
    );
  }

  /* phase 'active' */
  const ms = event.expiresAt - now;
  if(ms <= 0) return null;
  const attempts = event.attemptsLeft ?? MAX_ATTEMPTS;

  return (
    <button
      onClick={onView}
      className="glow-anim"
      style={{
        width:'100%',
        background:'linear-gradient(135deg,#D4A017,#C17F3C)',
        color:'#fff', padding:'12px 14px', borderRadius:14,
        marginBottom:14,
        display:'flex', justifyContent:'space-between', alignItems:'center', gap:10,
        border:'none', cursor:'pointer', textAlign:'left',
        boxShadow:'0 6px 18px rgba(212,160,23,.4)',
      }}
    >
      <div style={{ minWidth:0, flex:1 }}>
        <div style={{ fontSize:12, fontWeight:800, letterSpacing:.3, marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {event.title}
        </div>
        <div style={{ fontSize:11, opacity:.92, fontWeight:600 }}>
          ⏱️ {formatTimeLeft(ms)} · 🎯 {attempts} essai{attempts > 1 ? 's' : ''}
        </div>
      </div>
      <span style={{
        flexShrink:0, padding:'6px 12px', borderRadius:10,
        background:'rgba(255,255,255,.22)', color:'#fff',
        fontSize:11, fontWeight:800, letterSpacing:.3,
        border:'1px solid rgba(255,255,255,.35)',
      }}>
        Voir →
      </span>
    </button>
  );
}

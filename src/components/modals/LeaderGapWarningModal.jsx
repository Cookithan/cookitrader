import { Crown, AlertCircle } from "lucide-react";
import { GOLD, ESPRESSO } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   LeaderGapWarningModal — avertissement anti-écart top 1
   ────────────────────────────────────────────────────
   Affichée au top 1 quand son `total_earned` dépasse celui du top 2 de
   plus de GAP_PCT (30 %) — incite à laisser de la concurrence aux
   poursuivants. PRÉVENTIF, pas bloquant : aucun gain n'est freiné, c'est
   juste un rappel pour préserver l'équilibre du classement.

   Affichée au max 1 fois par session (state parent), pas de LS.
   Palette café-only — pas de rouge alerte (cf. règle CLAUDE.md).

   Props :
     - myTotal   : total_earned du joueur (top 1)
     - topTwo    : total_earned du 2ème
     - onClose   : ferme la modal
     - C         : palette du thème actif
═══════════════════════════════════════════════════════ */

export function LeaderGapWarningModal({ myTotal, topTwo, onClose, C }){
  const ratio = topTwo > 0 ? (myTotal / topTwo) : 0;
  const pctAhead = topTwo > 0
    ? Math.round(((myTotal - topTwo) / topTwo) * 100)
    : 0;

  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0,
        background:'rgba(15,8,4,.85)',
        display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:90, backdropFilter:'blur(6px)', padding:18,
      }}
    >
      <div
        onClick={(e)=>e.stopPropagation()}
        className="bi"
        style={{
          width:'100%', maxWidth:360,
          background:C.card, borderRadius:24,
          padding:'28px 22px 22px',
          boxShadow:'0 24px 60px rgba(0,0,0,.55)',
          border:`2px solid #D4A017`,
          textAlign:'center',
        }}
      >
        {/* Icône couronne dorée */}
        <div style={{
          width:64, height:64, borderRadius:16,
          background:GOLD,
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 14px',
          boxShadow:'0 8px 22px rgba(212,160,23,.5)',
        }}>
          <Crown size={32} color="#fff" />
        </div>

        <div style={{
          fontSize:11, fontWeight:900, color:'#C17F3C',
          textTransform:'uppercase', letterSpacing:2, marginBottom:6,
        }}>
          Écart trop grand
        </div>

        <div style={{
          fontSize:20, fontWeight:900, color:C.text,
          marginBottom:12, lineHeight:1.25,
        }}>
          Tu domines le classement !
        </div>

        {/* Carte stats — comparaison avec le 2ème */}
        <div style={{
          background: ESPRESSO,
          borderRadius:14, padding:'14px 16px', marginBottom:14,
          color:'#F0E6D3',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
            <span style={{ fontSize:11, color:'#D4A017', fontWeight:700, letterSpacing:.5 }}>👑 Toi</span>
            <span style={{ fontSize:18, fontWeight:900, color:'#FFE5A0', fontVariantNumeric:'tabular-nums' }}>
              {myTotal.toLocaleString('fr-FR')} 🍪
            </span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
            <span style={{ fontSize:11, color:'rgba(255,255,255,.7)', fontWeight:700, letterSpacing:.5 }}>🥈 Top 2</span>
            <span style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,.85)', fontVariantNumeric:'tabular-nums' }}>
              {topTwo.toLocaleString('fr-FR')} 🍪
            </span>
          </div>
          <div style={{ height:1, background:'rgba(212,160,23,.3)', margin:'8px 0' }} />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <span style={{ fontSize:11, color:'rgba(255,255,255,.7)', fontWeight:700, letterSpacing:.5 }}>Avance</span>
            <span style={{ fontSize:18, fontWeight:900, color:'#F0C050', fontVariantNumeric:'tabular-nums' }}>
              +{pctAhead}%
            </span>
          </div>
        </div>

        {/* Message explicatif */}
        <div style={{
          display:'flex', alignItems:'flex-start', gap:10,
          padding:'10px 12px', borderRadius:12,
          background:'rgba(212,160,23,.1)',
          border:'1px solid rgba(212,160,23,.4)',
          marginBottom:18, textAlign:'left',
        }}>
          <AlertCircle size={16} color="#C17F3C" style={{ flexShrink:0, marginTop:2 }} />
          <div style={{ fontSize:12, color:C.text, lineHeight:1.5 }}>
            Tu as <strong style={{ color:'#C17F3C' }}>plus de 30 % d'avance</strong> sur le 2<sup>e</sup>.
            Laisse aux autres une chance de te rattraper — le classement reste plus fun avec de la concurrence !
          </div>
        </div>

        <button
          onClick={onClose}
          className="glow-anim"
          style={{
            width:'100%', padding:'13px 0', borderRadius:14,
            background:GOLD, color:'#fff',
            fontSize:14, fontWeight:900, letterSpacing:.4,
            border:'none', boxShadow:'0 6px 20px rgba(212,160,23,.4)',
            cursor:'pointer',
          }}
        >
          Compris, je ralentis 🐌
        </button>
      </div>
    </div>
  );
}

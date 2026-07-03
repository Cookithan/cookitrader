import { useState } from "react";
import { GOLD } from "../../data/themes.js";
import { DUEL_CONFIG } from "../../lib/duels.js";

/* ════════════════════════════════════════════════════
   DuelStakeModal — choisir sa mise avant de POSER un défi
   ────────────────────────────────────────────────────
   Le joueur choisit sa mise (🍪 obligatoire, ☕ « prestige » optionnel),
   puis joue une épreuve tirée au sort et pose son score comme défi
   ouvert. La mise est débitée (escrow) à la création côté App.
   Mises = TRANSFERT entre joueurs (jamais de ☕ créé). Palette café-only.

   props : coins, cafes, onConfirm(stakeCookies, stakeCafes), onClose, C
═══════════════════════════════════════════════════════ */
export function DuelStakeModal({ coins = 0, cafes = 0, onConfirm, onClose, C }){
  const OPTS  = [50, 100, 250, 500].filter(v => v <= DUEL_CONFIG.MAX_STAKE_COOKIES);
  const KOPTS = [0, 1, 2].filter(v => v <= DUEL_CONFIG.MAX_STAKE_CAFES);
  const [stakeC, setStakeC] = useState(100);
  const [stakeK, setStakeK] = useState(0);
  const affordable = coins >= stakeC && (cafes || 0) >= stakeK;

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:70, background:'rgba(20,10,4,.6)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} className="su" style={{ width:'100%', maxWidth:430, background:C.card, borderTopLeftRadius:24, borderTopRightRadius:24, borderTop:`1px solid ${C.border}`, padding:'20px 18px calc(20px + env(safe-area-inset-bottom))' }}>
        <div style={{ textAlign:'center', marginBottom:4 }}>
          <div style={{ fontSize:19, fontWeight:900, color:C.text }}>📢 Poser un défi</div>
          <div style={{ fontSize:12, color:C.muted, marginTop:4, lineHeight:1.4 }}>Choisis ta mise, joue une épreuve au hasard, pose ton score. Un joueur pourra le relever — le gagnant rafle le pot.</div>
        </div>

        <div style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1, margin:'18px 0 8px' }}>Mise 🍪 (solde : {coins})</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
          {OPTS.map(v => (
            <button key={v} onClick={()=>setStakeC(v)} disabled={coins < v}
              style={{ padding:'13px 4px', borderRadius:12, border:`1px solid ${stakeC===v ? GOLD : C.border}`, background: stakeC===v ? GOLD : C.card2, color: stakeC===v ? '#fff' : (coins < v ? C.muted : C.text), fontWeight:900, fontSize:14, cursor: coins < v ? 'not-allowed' : 'pointer', opacity: coins < v ? .5 : 1 }}>
              {v}
            </button>
          ))}
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:14, padding:'10px 12px', borderRadius:12, background:C.card2, border:`1px solid ${C.border}` }}>
          <span style={{ fontSize:12.5, fontWeight:800, color:C.text }}>+ Mise ☕ <span style={{ color:C.muted, fontWeight:600 }}>(prestige · solde {cafes})</span></span>
          <div style={{ display:'flex', gap:6 }}>
            {KOPTS.map(v => (
              <button key={v} onClick={()=>setStakeK(v)} disabled={(cafes||0) < v}
                style={{ width:34, height:34, borderRadius:10, border:`1px solid ${stakeK===v ? GOLD : C.border}`, background: stakeK===v ? GOLD : 'transparent', color: stakeK===v ? '#fff' : ((cafes||0) < v ? C.muted : C.text), fontWeight:900, cursor:(cafes||0) < v ? 'not-allowed' : 'pointer', opacity:(cafes||0) < v ? .5 : 1 }}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={()=>affordable && onConfirm(stakeC, stakeK)}
          disabled={!affordable}
          style={{ width:'100%', marginTop:18, padding:'15px', borderRadius:16, background: affordable ? GOLD : C.card2, color: affordable ? '#fff' : C.muted, fontWeight:900, fontSize:14.5, border:'none', cursor: affordable ? 'pointer' : 'not-allowed' }}
        >
          {affordable ? `Jouer & poser (${stakeC} 🍪${stakeK ? ` + ${stakeK} ☕` : ''})` : 'Solde insuffisant'}
        </button>
        <button onClick={onClose} style={{ width:'100%', marginTop:10, padding:'12px', borderRadius:14, background:'transparent', color:C.muted, fontWeight:800, fontSize:13, border:`1px solid ${C.border}`, cursor:'pointer' }}>Annuler</button>
      </div>
    </div>
  );
}

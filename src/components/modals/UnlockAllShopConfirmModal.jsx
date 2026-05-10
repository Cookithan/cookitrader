import { useState, useEffect, useRef } from "react";
import { GOLD, ESPRESSO } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   UnlockAllShopConfirmModal — confirmation Coup de Grâce
   ────────────────────────────────────────────────────
   Anti-misclick : 200 ☕ c'est gros, le joueur doit taper
   "DEBLOQUE" pour valider. Aligné stylistiquement sur
   PrestigeConfirmModal (même pattern saisie + bandeau or).

   Props :
   - cafes      : solde actuel de cafés (pour avertir si insuffisant)
   - itemCount  : nombre d'items qui seront débloqués
   - cost       : coût en ☕ (200 par défaut, lu depuis REWARDS)
   - onConfirm  : trigger le déblocage côté parent
   - onCancel   : ferme la modale
   - C          : palette
═══════════════════════════════════════════════════════ */

const CONFIRM_WORD = 'DEBLOQUE';

export function UnlockAllShopConfirmModal({ cafes = 0, itemCount = 0, cost = 200, onConfirm, onCancel, C }){
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const trimmed = input.trim().toUpperCase();
  const valid   = trimmed === CONFIRM_WORD && cafes >= cost;

  return (
    <div
      onClick={onCancel}
      role="alertdialog"
      style={{
        position:'fixed', inset:0, zIndex:95,
        background:'rgba(15,8,4,.85)', backdropFilter:'blur(6px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:18,
      }}
    >
      <div
        onClick={(e)=>e.stopPropagation()}
        className="bi"
        style={{
          width:'100%', maxWidth:380,
          background:C.card, borderRadius:24,
          border:`2px solid ${GOLD}`,
          boxShadow:'0 24px 60px rgba(0,0,0,.55), 0 0 24px rgba(212,160,23,.35)',
          overflow:'hidden',
        }}
      >
        {/* Bandeau or */}
        <div style={{
          background:GOLD, padding:'18px 22px',
          textAlign:'center', color:'#3D2010',
        }}>
          <div style={{ fontSize:46, lineHeight:1, marginBottom:6 }}>👑</div>
          <div style={{ fontSize:11, fontWeight:900, letterSpacing:3, textTransform:'uppercase' }}>
            Coup de Grâce
          </div>
          <div style={{ fontSize:18, fontWeight:900, marginTop:4 }}>
            Tout débloquer d'un coup
          </div>
        </div>

        <div style={{ padding:'18px 22px 20px' }}>
          {/* Récap */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:800, color:C.muted, letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>
              Tu vas recevoir
            </div>
            <ul style={{ fontSize:12.5, color:C.text, lineHeight:1.7, paddingLeft:18, margin:0 }}>
              <li><strong>{itemCount} items</strong> de la boutique 🍪 débloqués (badges, thèmes, avatars, skins, titres, musiques)</li>
              <li>Tous activables immédiatement depuis ton profil</li>
              <li>Pas de remboursement possible — achat unique</li>
            </ul>
          </div>

          {/* Coût */}
          <div style={{
            background:ESPRESSO, color:'#F0C050',
            padding:'12px 16px', borderRadius:14, marginBottom:18,
            border:'1.5px solid rgba(212,160,23,.4)',
            textAlign:'center',
          }}>
            <div style={{ fontSize:10, letterSpacing:2, textTransform:'uppercase', fontWeight:800, opacity:.85, marginBottom:4 }}>
              Coût
            </div>
            <div style={{ fontSize:22, fontWeight:900, color:'#FFE066' }}>
              {cost} ☕
            </div>
            <div style={{ fontSize:10.5, color:'rgba(255,255,255,.65)', marginTop:4, fontStyle:'italic' }}>
              Solde après : {Math.max(0, cafes - cost)} ☕
            </div>
          </div>

          {/* Avertissement solde insuffisant */}
          {cafes < cost && (
            <div style={{
              fontSize:11.5, color:'#A87858', textAlign:'center', fontWeight:700,
              padding:'8px 12px', borderRadius:10, marginBottom:14,
              background:'rgba(125,78,31,.15)', border:'1px solid rgba(125,78,31,.35)',
            }}>
              ⚠ Solde insuffisant — il te manque {cost - cafes} ☕
            </div>
          )}

          {/* Input de confirmation */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:6 }}>
              Tape <strong style={{ color:C.text, letterSpacing:2 }}>{CONFIRM_WORD}</strong> pour confirmer
            </div>
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={input}
              onChange={(e)=>setInput(e.target.value.toUpperCase())}
              placeholder={CONFIRM_WORD}
              maxLength={20}
              style={{
                width:'100%', padding:'12px 14px',
                borderRadius:12, fontSize:16, fontWeight:900, letterSpacing:3,
                textAlign:'center', outline:'none',
                border: `2px solid ${valid ? GOLD : C.border}`,
                background:C.card2, color:valid ? '#D4A017' : C.text,
                fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
                boxSizing:'border-box',
              }}
            />
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button
              onClick={onCancel}
              style={{
                flex:1, padding:'13px 0', borderRadius:14,
                background:'transparent', color:C.muted,
                border:`1.5px solid ${C.border}`,
                fontSize:13, fontWeight:700, cursor:'pointer',
              }}
            >
              Annuler
            </button>
            <button
              onClick={()=>{ if(valid){ onConfirm(); } }}
              disabled={!valid}
              style={{
                flex:1.5, padding:'13px 0', borderRadius:14,
                background: valid ? GOLD : C.card2,
                color: valid ? '#fff' : C.muted,
                border:'none', fontSize:13, fontWeight:900, letterSpacing:.5,
                cursor: valid ? 'pointer' : 'not-allowed',
                boxShadow: valid ? '0 6px 18px rgba(212,160,23,.45)' : 'none',
              }}
            >
              👑 COUP DE GRÂCE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

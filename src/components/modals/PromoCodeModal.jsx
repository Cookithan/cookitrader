import { useEffect, useRef, useState } from "react";
import { GOLD } from "../../data/themes.js";
import { lookupPromoCode } from "../../data/promoCodes.js";

/* ════════════════════════════════════════════════════
   PromoCodeModal — saisie d'un code promo
   ────────────────────────────────────────────────────
   L'utilisateur tape un code (case-insensitive). Validation locale
   contre PROMO_CODES + check usedCodes pour éviter le double usage.

   Props :
     onCancel
     onRedeem(promo)  : { code, coins, cafes, label } — appelé en cas
                        de succès, le parent crédite + persiste
     usedCodes        : array de codes déjà utilisés (LS)
     C
═══════════════════════════════════════════════════════ */
export function PromoCodeModal({ onCancel, onRedeem, usedCodes = [], C }){
  const [input,    setInput]    = useState('');
  const [feedback, setFeedback] = useState(null);  // { type: 'ok'|'err', msg }
  const [shake,    setShake]    = useState(false);
  const [loading,  setLoading]  = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const submit = () => {
    if(loading) return;
    const promo = lookupPromoCode(input);
    if(!promo){
      setFeedback({ type:'err', msg:'Code invalide' });
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    if(usedCodes.includes(promo.code)){
      setFeedback({ type:'err', msg:'Code déjà utilisé sur ce compte' });
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    setLoading(true);
    onRedeem(promo);
    setFeedback({
      type:'ok',
      msg: `+${promo.coins ? `${promo.coins} 🍪` : ''}${promo.coins && promo.cafes ? ' · ' : ''}${promo.cafes ? `+${promo.cafes} ☕` : ''} — ${promo.label}`,
    });
    setTimeout(onCancel, 1600);
  };

  return (
    <div
      onClick={onCancel}
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
          padding:'24px 22px 22px',
          boxShadow:'0 24px 60px rgba(0,0,0,.55)',
          border:`1.5px solid ${C.border}`,
          animation: shake ? 'shake .42s ease-in-out' : undefined,
        }}
      >
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:14 }}>
          <div style={{ fontSize:46, lineHeight:1 }}>🎟️</div>
          <div style={{ fontSize:18, fontWeight:900, color:C.text, marginTop:8 }}>
            Code promo
          </div>
          <div style={{ fontSize:12, color:C.muted, marginTop:6, lineHeight:1.5 }}>
            Saisis un code distribué par Cookithan pour gagner des cookies
            ou cafés.
          </div>
        </div>

        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={input}
          onChange={(e) => { setInput(e.target.value.toUpperCase()); if(feedback) setFeedback(null); }}
          onKeyDown={(e) => { if(e.key === 'Enter') submit(); }}
          placeholder="EX : TOP1"
          maxLength={20}
          style={{
            width:'100%', padding:'12px 14px',
            borderRadius:12,
            border: feedback?.type === 'err' ? '2px solid #7D4E1F' : `2px solid ${C.border}`,
            background:C.card2, color:'#D4A017',
            fontSize:18, fontWeight:900, letterSpacing:3,
            textAlign:'center', outline:'none',
            fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
            boxSizing:'border-box',
            transition:'border-color .2s',
          }}
        />

        {feedback && (
          <div style={{
            marginTop:10, padding:'9px 12px', borderRadius:10,
            fontSize:12, fontWeight:700, textAlign:'center',
            background: feedback.type === 'ok' ? 'rgba(212,160,23,.15)' : 'rgba(125,78,31,.15)',
            color:      feedback.type === 'ok' ? '#C8960C' : '#7D4E1F',
          }}>
            {feedback.type === 'ok' ? '✓ ' : '⚠️ '}
            {feedback.msg}
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginTop:14 }}>
          <button
            onClick={onCancel}
            style={{
              flex:1, padding:'12px 0', borderRadius:14,
              background:'transparent', border:`1.5px solid ${C.border}`,
              color:C.muted, fontSize:13, fontWeight:700, cursor:'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!input.trim() || loading}
            style={{
              flex:1.5, padding:'12px 0', borderRadius:14,
              background: input.trim() && !loading ? GOLD : C.card2,
              color:      input.trim() && !loading ? '#fff' : C.muted,
              border:'none', fontSize:13, fontWeight:800, letterSpacing:.3,
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              boxShadow: input.trim() && !loading ? '0 6px 18px rgba(212,160,23,.4)' : 'none',
            }}
          >
            {loading ? '…' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { GOLD } from "../../data/themes.js";
import { lookupPromoCode } from "../../data/promoCodes.js";
import { codesPromoEnBase } from "../../lib/sentinelle.js";
import { useTranslation } from "../../i18n/index.js";

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
     revealedCodes    : array de codes secrets révélés via items premium
                        (cf. promoCodes.js, flag `secret`)
     C
═══════════════════════════════════════════════════════ */
export function PromoCodeModal({ onCancel, onRedeem, usedCodes = [], revealedCodes = [], C }){
  /* Les codes créés depuis la Sentinelle vivent en base : on les charge
     à l'ouverture de la modale. Si la lecture échoue (hors ligne, table
     absente), la liste reste vide et seuls les codes historiques
     répondent — le joueur ne voit jamais d'erreur pour autant. */
  const [codesBase, setCodesBase] = useState([]);
  useEffect(() => { codesPromoEnBase().then(setCodesBase).catch(() => {}); }, []);
  const { t } = useTranslation();
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
    const promo = lookupPromoCode(input, revealedCodes, codesBase);
    if(!promo){
      setFeedback({ type:'err', msg: t('modal.promo_invalid') });
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    if(usedCodes.includes(promo.code)){
      setFeedback({ type:'err', msg: t('modal.promo_already_used') });
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    setLoading(true);
    onRedeem(promo);
    /* Construction propre du message : on ne mentionne que les
       monnaies effectivement créditées (évite '+' isolé si coins=0).
       Pour un code "unlock" pur (sans monnaie), seul le label est
       affiché (ex : "Thème Noir & Blanc débloqué"). */
    const parts = [];
    if(promo.coins)  parts.push(`+${promo.coins} 🍪`);
    if(promo.cafes)  parts.push(`+${promo.cafes} ☕`);
    if(promo.shares) parts.push(`+${promo.shares} action${promo.shares > 1 ? 's' : ''} $CKM`);
    setFeedback({
      type:'ok',
      msg: parts.length ? `${parts.join(' · ')} — ${promo.label}` : promo.label,
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
            {t('modal.promo_title_no_emoji')}
          </div>
          <div style={{ fontSize:12, color:C.muted, marginTop:6, lineHeight:1.5 }}>
            {t('modal.promo_desc_full')}
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
          placeholder={t('modal.promo_placeholder_example')}
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
            {t('common.cancel')}
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
            {loading ? '…' : t('modal.promo_redeem')}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { GOLD } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   ChangeBioModal — modale d'édition de la bio (PHASE 5)
   ────────────────────────────────────────────────────
   Gratuite, contrairement au pseudo. Textarea bornée à 80 caractères
   avec compteur visible. Le bouton "Enregistrer" reste actif tant que
   le texte est différent de la valeur initiale (vide compris, pour
   pouvoir effacer une bio existante).

   Props :
   - currentBio : valeur actuelle (peut être vide)
   - onSave(text) : appelé avec le texte trimmed à la confirmation
   - onClose : ferme sans sauver
   - C : palette
═══════════════════════════════════════════════════════ */
const MAX = 80;

export function ChangeBioModal({ currentBio = '', onSave, onClose, C }){
  const { t } = useTranslation();
  const [text, setText] = useState(currentBio);
  const trimmed = text.trim();
  const changed = trimmed !== (currentBio || '').trim();

  const submit = () => {
    if(!changed) return;
    onSave(trimmed);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.78)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:90, backdropFilter:'blur(6px)', padding:16 }}>
      <div className="bi" style={{ background:C.card, borderRadius:24, padding:'26px 22px', maxWidth:340, width:'100%', boxShadow:'0 24px 60px rgba(0,0,0,.45)', border:`1.5px solid ${C.border}` }}>

        <div style={{ textAlign:'center', marginBottom:18 }}>
          <div style={{ fontSize:34, marginBottom:6 }}>✍️</div>
          <div style={{ fontSize:18, fontWeight:900, color:C.text, marginBottom:4 }}>{currentBio ? t('modal.edit_bio') : t('modal.add_bio')}</div>
          <div style={{ fontSize:11, color:C.muted }}>
            {t('modal.bio_tagline')}
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <textarea
            value={text}
            onChange={e=>setText(e.target.value.slice(0, MAX))}
            maxLength={MAX}
            autoFocus
            rows={3}
            placeholder={t('modal.bio_placeholder')}
            style={{
              width:'100%', padding:'12px 14px', borderRadius:13,
              border:`2px solid ${C.border}`, background:C.bg, color:C.text,
              fontSize:14, fontWeight:500, outline:'none',
              fontFamily:'inherit', boxSizing:'border-box', resize:'none',
              lineHeight:1.45,
            }}
          />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
            <span style={{ fontSize:10, color:C.muted, fontStyle:'italic' }}>
              {t('modal.bio_free_anytime')}
            </span>
            <span style={{ fontSize:11, color: text.length > MAX*0.85 ? '#C17F3C' : C.muted, fontWeight:600 }}>
              {text.length}/{MAX}
            </span>
          </div>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'13px 0', borderRadius:14, background:'transparent', border:`1.5px solid ${C.border}`, color:C.muted, fontSize:13, fontWeight:700, cursor:'pointer' }}>
            {t('common.cancel')}
          </button>
          <button
            onClick={submit}
            disabled={!changed}
            style={{
              flex:1.5, padding:'13px 0', borderRadius:14,
              background: changed ? GOLD : C.card2,
              color: changed ? '#fff' : C.muted,
              border:'none', fontSize:13, fontWeight:800,
              cursor: changed ? 'pointer' : 'not-allowed',
              boxShadow: changed ? '0 6px 18px rgba(212,160,23,.35)' : 'none',
              letterSpacing:.3,
            }}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

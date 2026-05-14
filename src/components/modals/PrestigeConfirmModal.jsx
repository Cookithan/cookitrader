import { useState, useEffect, useRef } from "react";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   PrestigeConfirmModal — confirmation de la renaissance
   ────────────────────────────────────────────────────
   Le joueur doit explicitement TAPER "RENAITRE" dans un input pour
   confirmer (anti-clic accidentel). Sinon le bouton reste verrouillé.

   Props :
   - prestigeLevel : niveau de prestige actuel (avant renaissance)
   - onConfirm     : callback déclenche le doPrestige côté parent
   - onCancel      : ferme la modale
   - C             : palette
═══════════════════════════════════════════════════════ */

export function PrestigeConfirmModal({ prestigeLevel = 0, onConfirm, onCancel, C }){
  const { t, lang } = useTranslation();
  /* Mot de confirmation adapté à la langue active. La validation reste
     stricte (uppercase, trimmed) sur ce mot précis. */
  const CONFIRM_WORD = lang === 'en' ? 'REBIRTH' : 'RENAITRE';
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const trimmed = input.trim().toUpperCase();
  const valid   = trimmed === CONFIRM_WORD;
  const nextMult = 1 + (prestigeLevel + 1) * 0.1;

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
          <div style={{ fontSize:46, lineHeight:1, marginBottom:6 }}>🌟</div>
          <div style={{ fontSize:11, fontWeight:900, letterSpacing:3, textTransform:'uppercase' }}>
            {t('prestige.header_n', { n: prestigeLevel + 1 })}
          </div>
          <div style={{ fontSize:18, fontWeight:900, marginTop:4 }}>
            {t('prestige.about_to_restart')}
          </div>
        </div>

        <div style={{ padding:'18px 22px 20px' }}>
          {/* Récap */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:800, color:C.muted, letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>
              {t('prestige.lose_label')}
            </div>
            <ul style={{ fontSize:12.5, color:C.text, lineHeight:1.7, paddingLeft:18, margin:0 }}>
              <li>{t('prestige.lose_1')}</li>
              <li>{t('prestige.lose_2')}</li>
              <li>{t('prestige.lose_3')}</li>
            </ul>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:800, color:C.muted, letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>
              {t('prestige.keep_label')}
            </div>
            <ul style={{ fontSize:12.5, color:C.text, lineHeight:1.7, paddingLeft:18, margin:0 }}>
              <li>{t('prestige.keep_1')}</li>
              <li>{t('prestige.keep_2')}</li>
              <li>{t('prestige.keep_3')}</li>
              <li>{t('prestige.keep_4')}</li>
            </ul>
          </div>

          {/* Récompense */}
          <div style={{
            background:ESPRESSO, color:'#F0C050',
            padding:'12px 16px', borderRadius:14, marginBottom:18,
            border:'1.5px solid rgba(212,160,23,.4)',
            textAlign:'center',
          }}>
            <div style={{ fontSize:10, letterSpacing:2, textTransform:'uppercase', fontWeight:800, opacity:.85, marginBottom:4 }}>
              {t('prestige.permanent_bonus')}
            </div>
            <div style={{ fontSize:22, fontWeight:900, color:'#FFE066' }}>
              {t('prestige.mult_all_gains', { mult: nextMult.toFixed(1) })}
            </div>
            {prestigeLevel > 0 && (
              <div style={{ fontSize:10.5, color:'rgba(255,255,255,.65)', marginTop:4, fontStyle:'italic' }}>
                {t('prestige.before_was', { mult: (1 + prestigeLevel * 0.1).toFixed(1) })}
              </div>
            )}
          </div>

          {/* Input de confirmation */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:6 }}>
              {t('prestige.type_to_confirm_before')} <strong style={{ color:C.text, letterSpacing:2 }}>{CONFIRM_WORD}</strong> {t('prestige.type_to_confirm_after')}
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
              {t('common.cancel')}
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
              🌟 {t('prestige.rebirth_btn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

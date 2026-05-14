import { useState } from "react";
import { Cookie } from "lucide-react";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { NAME_CHANGE_PRICES, getNameChangePrice } from "../../data/constants.js";
import { isNameTaken } from "../../lib/supabaseSync.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   ChangeNameModal — modale payante pour changer le prénom
   ────────────────────────────────────────────────────
   Le 1er prénom (onboarding) est gratuit. Une fois en jeu,
   chaque modif coûte de plus en plus cher :
     count=0 → 100 🍪    count=1 → 250
     count=2 → 500       count≥3 → 1000 (plafond)

   Props :
   - currentName        : prénom actuel (préremplit le champ)
   - coins              : solde courant (pour griser le bouton)
   - nameChangeCount    : combien de fois l'utilisateur a déjà payé
   - onConfirm(name)    : appelé après validation. Parent gère
                          spendCoins + setUserName + incrément du compteur
   - onClose            : ferme la modale sans rien changer
   - C                  : palette active (light/dark/thème)
═══════════════════════════════════════════════════════ */
export function ChangeNameModal({ currentName, coins, nameChangeCount, userCode, onConfirm, onClose, C }){
  const { t } = useTranslation();
  const [name, setName] = useState(currentName || '');
  const [checking, setChecking] = useState(false);
  const [takenError, setTakenError] = useState('');
  const price = getNameChangePrice(nameChangeCount);
  const nextPrice = getNameChangePrice(nameChangeCount + 1);
  const trimmed = name.trim();
  const enough = coins >= price;
  const valid  = !!trimmed && trimmed !== currentName && enough && !checking;

  const submit = async () => {
    if(!valid) return;
    setTakenError('');
    setChecking(true);
    const { taken, error } = await isNameTaken(trimmed, userCode);
    setChecking(false);
    if(error){ setTakenError(error); return; }
    if(taken){ setTakenError(t('modal.name_taken')); return; }
    onConfirm(trimmed, price);
  };

  /* Vide l'erreur dès que l'utilisateur retape — sinon le message
     reste collé alors qu'il est en train de corriger. */
  const onNameChange = (e) => {
    setName(e.target.value);
    if(takenError) setTakenError('');
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.78)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:90, backdropFilter:'blur(6px)', padding:16 }}>
      <div className="bi" style={{ background:C.card, borderRadius:24, padding:'26px 22px', maxWidth:340, width:'100%', boxShadow:'0 24px 60px rgba(0,0,0,.45)', border:`1.5px solid ${C.border}` }}>

        <div style={{ textAlign:'center', marginBottom:18 }}>
          <div style={{ fontSize:34, marginBottom:6 }}>✏️</div>
          <div style={{ fontSize:18, fontWeight:900, color:C.text, marginBottom:4 }}>{t('modal.change_name')}</div>
          <div style={{ fontSize:11, color:C.muted }}>
            {t('modal.current_name')}: <span style={{ fontWeight:700, color:C.text }}>{currentName || '—'}</span>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:6 }}>{t('modal.new_name')}</div>
          <input
            value={name}
            onChange={onNameChange}
            maxLength={20}
            autoFocus
            placeholder={t('modal.your_name_placeholder')}
            style={{ width:'100%', padding:'13px 15px', borderRadius:13, border:`2px solid ${takenError ? '#A87858' : C.border}`, background:C.bg, color:C.text, fontSize:15, fontWeight:600, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
          />
          <div style={{ fontSize:10, color:C.muted, marginTop:5, textAlign:'right' }}>{trimmed.length}/20</div>
          {takenError && (
            <div className="su" style={{ fontSize:11, color:'#A87858', marginTop:7, fontWeight:600, textAlign:'center' }}>
              ⚠ {takenError}
            </div>
          )}
        </div>

        {/* Bloc tarif */}
        <div style={{ background:ESPRESSO, borderRadius:16, padding:'14px 16px', marginBottom:14, border:'1px solid rgba(212,160,23,.35)', boxShadow:'0 6px 18px rgba(74,44,23,.25)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:2, fontWeight:700 }}>{t('modal.cost')}</div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                <span style={{ fontSize:24, fontWeight:900, color:'#F0C050' }}>{price}</span>
                <Cookie size={18} color="#F0C050" />
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:1.5, fontWeight:700 }}>{t('modal.balance')}</div>
              <div style={{ fontSize:14, fontWeight:800, color: enough ? '#fff' : '#A87858', marginTop:2 }}>
                {coins} 🍪
              </div>
            </div>
          </div>
          {nameChangeCount > 0 && nextPrice !== price && (
            <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', marginTop:8, fontStyle:'italic' }}>
              💡 {t('modal.next_change', { n: nextPrice })}
            </div>
          )}
          {nameChangeCount > 0 && nextPrice === price && (
            <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', marginTop:8, fontStyle:'italic' }}>
              💡 {t('modal.max_price_reached')}
            </div>
          )}
        </div>

        {!enough && (
          <div style={{ fontSize:11, color:'#A87858', textAlign:'center', marginBottom:12, fontWeight:600 }}>
            {t('modal.not_enough_cookies_play')}
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'13px 0', borderRadius:14, background:'transparent', border:`1.5px solid ${C.border}`, color:C.muted, fontSize:13, fontWeight:700, cursor:'pointer' }}>
            {t('common.cancel')}
          </button>
          <button
            onClick={submit}
            disabled={!valid}
            style={{
              flex:1.5, padding:'13px 0', borderRadius:14,
              background: valid ? GOLD : C.card2,
              color: valid ? '#fff' : C.muted,
              border:'none', fontSize:13, fontWeight:800,
              cursor: valid ? 'pointer' : 'not-allowed',
              boxShadow: valid ? '0 6px 18px rgba(212,160,23,.35)' : 'none',
              letterSpacing:.3,
            }}
          >
            {checking ? t('modal.checking') : t('modal.confirm_for', { n: price })}
          </button>
        </div>
      </div>
    </div>
  );
}

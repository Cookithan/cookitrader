import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { ONBOARDING_AVATARS, getVisibleOnboardingAvatars } from "../../data/avatars.js";
import { GOLD } from "../../data/themes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { isNameTaken } from "../../lib/supabaseSync.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   OnboardingModal — premier lancement
   - 3 étapes : Pseudo → Avatar → Tips
   - z-index 200, fond noir blur
   - onComplete(name, avatarIndex) est appelé à la fin
   - Le code dev "cookithan" (dans CookiMiner > setShowOnboarding) accorde un bonus
═══════════════════════════════════════════════════════ */

export function OnboardingModal({ onComplete, onRestore, install, C }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [openTip, setOpenTip] = useState(null);
  const [checkingName, setCheckingName] = useState(false);
  const [nameError, setNameError] = useState('');

  const goldBtn = (disabled) => ({
    width:'100%', padding:'15px 22px', borderRadius:18, fontSize:15, fontWeight:800,
    background:disabled?C.card2:GOLD, color:disabled?C.muted:'#fff',
    border:`2px solid ${disabled?C.border:'transparent'}`,
    boxShadow:disabled?'none':'0 6px 20px rgba(212,160,23,.4)',
    cursor:disabled?'not-allowed':'pointer', letterSpacing:.3,
    transition:'all .25s'
  });

  const trimmed = name.trim();

  /* Vérifie en ligne que le pseudo n'est pas déjà pris avant de
     passer à l'avatar. Le code dev "admin*" est laissé passer (il
     est déjà filtré du classement public, et plusieurs sessions de
     test peuvent réutiliser le même pseudo). */
  const goToAvatar = async () => {
    if(!trimmed || checkingName) return;
    setNameError('');
    if(/^admin/i.test(trimmed)){ setStep(1); return; }
    setCheckingName(true);
    const { taken, error } = await isNameTaken(trimmed);
    setCheckingName(false);
    if(error){ setNameError(error); return; }
    if(taken){ setNameError(t('modal.name_taken')); return; }
    setStep(1);
  };

  const onNameChange = (e) => {
    setName(e.target.value);
    if(nameError) setNameError('');
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, backdropFilter:'blur(8px)', padding:18 }}>
      <div className="bi" style={{ width:'100%', maxWidth:380, background:C.card, borderRadius:28, padding:'28px 22px', boxShadow:'0 24px 64px rgba(0,0,0,.55)', border:`1px solid ${C.border}` }}>

        {/* Progress dots */}
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:22 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: i===step?22:8, height:8, borderRadius:4, background: i<=step?GOLD:C.card2, transition:'all .3s' }} />
          ))}
        </div>

        {step === 0 && (
          <div className="su" style={{ textAlign:'center' }}>
            <div className="float-anim" style={{ fontSize:64, marginBottom:14, display:'inline-block' }}>☕</div>
            <div style={{ fontSize:22, fontWeight:900, color:C.text, marginBottom:6 }}>{t('modal.onboarding_welcome_long')}</div>
            <div style={{ fontSize:13, color:C.muted, marginBottom:22, lineHeight:1.5 }}>{t('modal.onboarding_tagline')}</div>
            <div style={{ textAlign:'left', marginBottom:18 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5 }}>{t('modal.choose_name')}</label>
              <input
                value={name}
                onChange={onNameChange}
                placeholder={t('modal.your_name_placeholder')}
                maxLength={20}
                autoFocus
                style={{
                  width:'100%', marginTop:8, padding:'14px 16px', borderRadius:14,
                  border:`2px solid ${nameError ? '#A87858' : C.border}`, background:C.card2, color:C.text,
                  fontSize:15, fontWeight:600, outline:'none',
                  fontFamily:'inherit'
                }}
                onKeyDown={e=>{ if(e.key==='Enter') goToAvatar(); }}
              />
              {nameError && (
                <div className="su" style={{ fontSize:11.5, color:'#A87858', marginTop:8, fontWeight:600, textAlign:'center' }}>
                  ⚠ {nameError}
                </div>
              )}
            </div>
            <button onClick={goToAvatar} disabled={!trimmed || checkingName} style={goldBtn(!trimmed || checkingName)}>
              {checkingName ? t('modal.checking') : t('common.next') + ' →'}
            </button>

            {/* Carte d'installation PWA — Android/Desktop = bouton natif,
                iOS = instruction Safari, déjà installé = rien. Ne s'affiche
                qu'au moment du pseudo (étape la plus longue, l'user lit) :
                volontairement absent étape avatar/tips pour ne pas dupliquer. */}
            {install && !install.isStandalone && (install.canInstall || install.isIos) && (
              <div className="su" style={{
                marginTop:14, padding:'12px 14px', borderRadius:14,
                background:'linear-gradient(135deg, rgba(212,160,23,.10), rgba(193,127,60,.14))',
                border:'1px solid rgba(212,160,23,.4)',
                textAlign:'left',
              }}>
                {install.canInstall ? (
                  <>
                    <div style={{ fontSize:12.5, fontWeight:800, color:C.text, marginBottom:3 }}>
                      📲 {t('modal.install_app_title')}
                    </div>
                    <div style={{ fontSize:11, color:C.muted, lineHeight:1.45, marginBottom:10 }}>
                      {t('modal.install_app_desc')}
                    </div>
                    <button
                      onClick={() => install.install()}
                      style={{
                        width:'100%', padding:'10px 14px', borderRadius:11,
                        background:GOLD, color:'#fff', border:'none',
                        fontSize:13, fontWeight:800, letterSpacing:.3,
                        boxShadow:'0 4px 12px rgba(212,160,23,.35)',
                        cursor:'pointer',
                      }}
                    >
                      {t('modal.install_now')}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:12.5, fontWeight:800, color:C.text, marginBottom:3 }}>
                      📲 Installer sur iOS
                    </div>
                    <div style={{ fontSize:11, color:C.muted, lineHeight:1.5 }}>
                      Sur Safari : appuie sur <strong style={{ color:'#D4A017' }}>Partager ⬆</strong>{' '}
                      en bas de l'écran, puis <strong style={{ color:'#D4A017' }}>« Sur l'écran d'accueil »</strong>.
                    </div>
                  </>
                )}
              </div>
            )}

            {onRestore && (
              <button
                onClick={onRestore}
                style={{
                  marginTop:12, background:'transparent', border:'none',
                  fontSize:12.5, color:C.muted, fontWeight:700,
                  textDecoration:'underline', cursor:'pointer', padding:6,
                }}
              >
                {t('modal.already_have_account')}
              </button>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="su" style={{ textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:900, color:C.text, marginBottom:6 }}>{t('modal.onboarding_avatar_q')}</div>
            <div style={{ fontSize:12, color:C.muted, marginBottom:18 }}>{t('modal.change_later')}</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:22, justifyItems:'center' }}>
              {getVisibleOnboardingAvatars().map((av) => {
                const i = av.id;
                const selected = avatar === i;
                return (
                  <button
                    key={i}
                    onClick={()=>setAvatar(i)}
                    className={selected?'pulse-ring':''}
                    style={{
                      padding:0,
                      borderRadius:'50%',
                      border:`3px solid ${selected?'#D4A017':'transparent'}`,
                      cursor:'pointer',
                      boxShadow:selected?'0 4px 16px rgba(212,160,23,.45)':'0 2px 6px rgba(0,0,0,.15)',
                      transition:'all .2s',
                      background:'transparent',
                      lineHeight:0,
                      display:'inline-flex',
                    }}
                    aria-label={`Avatar ${av.name}`}
                  >
                    <AvatarFigure value={i} size={62} />
                  </button>
                );
              })}
            </div>
            <button
              onClick={()=>setStep(2)}
              disabled={avatar===null}
              style={goldBtn(avatar===null)}
            >
              {t('common.next')} →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="su" style={{ textAlign:'center' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:18 }}>
              <AvatarFigure value={avatar} size={48} />
              <div style={{ fontSize:22, fontWeight:900, color:C.text }}>{t('modal.well_played_name', { name: trimmed })}</div>
            </div>
            <div style={{ fontSize:11, color:C.muted, marginBottom:10, fontStyle:'italic' }}>{t('modal.tap_card_more')}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:22, textAlign:'left' }}>
              {[
                { id:'play',   ico:'🎮', t: t('modal.tip_play_title'),   d: t('modal.tip_play_desc'),   tip: t('modal.tip_play_long') },
                { id:'earn',   ico:'🍪', t: t('modal.tip_earn_title'),   d: t('modal.tip_earn_desc'),   tip: t('modal.tip_earn_long') },
                { id:'invest', ico:'📈', t: t('modal.tip_invest_title'), d: t('modal.tip_invest_desc'), tip: t('modal.tip_invest_long') },
              ].map(c=>{
                const open = openTip === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={()=>setOpenTip(open?null:c.id)}
                    style={{
                      width:'100%', display:'block', padding:'12px 14px', borderRadius:14,
                      background:C.card2, border:`1px solid ${open?'#D4A017':C.border}`,
                      textAlign:'left', cursor:'pointer',
                      transition:'border-color .2s'
                    }}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ fontSize:28, flexShrink:0 }}>{c.ico}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:2 }}>{c.t}</div>
                        <div style={{ fontSize:11, color:C.muted, lineHeight:1.4 }}>{c.d}</div>
                      </div>
                      <ChevronLeft size={16} color={C.muted} style={{ transform:`rotate(${open?90:-90}deg)`, transition:'transform .25s', flexShrink:0 }} />
                    </div>
                    {open && (
                      <div className="su" style={{ marginTop:10, paddingTop:10, borderTop:`1px dashed ${C.border}`, fontSize:12, color:C.text, lineHeight:1.5 }}>
                        💡 {c.tip}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <button onClick={()=>onComplete(trimmed, avatar)} className="glow-anim" style={goldBtn(false)}>
              {t('modal.lets_go')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

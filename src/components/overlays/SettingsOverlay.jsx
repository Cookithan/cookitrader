import { useState } from "react";
import { ChevronLeft, Check, Lock, AlertTriangle, Download, Share, Info, Eye, EyeOff, Copy, MessagesSquare, Globe } from "lucide-react";
import { REWARDS } from "../../data/constants.js";
import { THEMES, LT, GOLD } from "../../data/themes.js";
import { ResetProgressButton } from "../profile/ResetProgressButton.jsx";
import { useTranslation } from "../../i18n/index.js";
import {
  MUSICS,
  getAudioSettings,
  setUiSoundEnabled,
  setMusicEnabled,
  playMusic,
  playSound,
  getCurrentMusicId,
} from "../../lib/audio.js";

/* ════════════════════════════════════════════════════
   SettingsOverlay — plein écran z-index 60
   - Sections : APPARENCE (onglets Thèmes/Skins/Roues) · DONNÉES · ZONE SENSIBLE
   - L'onglet Apparence ne montre QUE ce que l'utilisateur a débloqué
     (le défaut n'est jamais "verrouillé")
   - Reset progression : double validation (bouton dashed → confirmation espresso)
   - L'item premium (applyAs:'theme'/'skin') s'affiche aussi dans son onglet
═══════════════════════════════════════════════════════ */

export function SettingsOverlay({ onClose, unlocked, activeTheme, setActiveTheme, onReset, install, onOpenAbout, onOpenRestore, onStartNewAccount, onOpenPromoCode, userCode, restorePin, C }) {
  const { t, lang, setLang, localizedField } = useTranslation();

  /* PIN reveal toggle + feedback copie */
  const [pinRevealed,      setPinRevealed]      = useState(false);
  const [pinCopied,        setPinCopied]        = useState(false);
  const [codeCopied,       setCodeCopied]       = useState(false);
  /* Carte 'Mes infos de récupération' collapsée par défaut (trop volumineuse) */
  const [recoveryRevealed, setRecoveryRevealed] = useState(false);

  const copyText = async (txt, kind) => {
    try{
      await navigator.clipboard.writeText(txt);
      if(kind === 'pin'){ setPinCopied(true);  setTimeout(()=>setPinCopied(false), 1400); }
      else              { setCodeCopied(true); setTimeout(()=>setCodeCopied(false), 1400); }
    }catch{}
  };

  /* État audio synchronisé avec audio.js (LS). Re-render local à chaque
     changement pour refléter le toggle / la musique en lecture. */
  const [audio, setAudio] = useState(() => ({
    ...getAudioSettings(),
    currentMusicId: getCurrentMusicId(),
  }));
  const toggleUi = () => {
    const next = !audio.uiSoundEnabled;
    setUiSoundEnabled(next);
    setAudio(a => ({ ...a, uiSoundEnabled: next }));
    if(next) playSound('toggle');
  };
  const toggleMusic = () => {
    const next = !audio.musicEnabled;
    setMusicEnabled(next);
    setAudio(a => ({ ...a, musicEnabled: next, currentMusicId: getCurrentMusicId() }));
    playSound('toggle');
  };
  const chooseMusic = (id) => {
    playSound('tap');
    playMusic(id);
    setAudio(a => ({ ...a, currentMusicId: id }));
  };

  /* Musiques disponibles : la gratuite + celles débloquées via items
     boutique 'music_<key>' → MUSICS[key]. */
  const availableMusics = Object.values(MUSICS).filter(m =>
    m.free || unlocked.includes('music_' + m.id)
  );

  const unlockedThemes = REWARDS.filter(r => unlocked.includes(r.id) && (r.type==='Thème' || (r.type==='Premium' && r.applyAs==='theme')));

  const renderItem = (item, isActive, onToggle, swatch) => (
    <button
      key={item.id}
      onClick={onToggle}
      style={{
        display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:12,
        background: isActive ? 'rgba(212,160,23,.12)' : 'transparent',
        border: `1.5px solid ${isActive ? '#D4A017' : C.border}`,
        cursor:'pointer', textAlign:'left', width:'100%'
      }}
    >
      {swatch}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{(localizedField(item, 'name', 'REWARDS') || '').replace(/^(Thème|Cookie|Roue|Theme)\s+/, '').replace(/\s(Theme|Cookie)$/, '')}</div>
        <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{item.desc}</div>
      </div>
      {isActive && <Check size={16} color="#D4A017" />}
    </button>
  );

  const defaultRow = (label, sub, isActive, onClick) => (
    <button
      onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:12,
        background: isActive ? 'rgba(212,160,23,.12)' : 'transparent',
        border: `1.5px solid ${isActive ? '#D4A017' : C.border}`,
        cursor:'pointer', textAlign:'left', width:'100%'
      }}
    >
      <div style={{ width:36, height:36, borderRadius:10, background:LT.bg, border:`1px solid ${LT.border}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:C.muted }}>—</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{label}</div>
        <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{sub}</div>
      </div>
      {isActive && <Check size={16} color="#D4A017" />}
    </button>
  );

  const themeSwatch = (id) => {
    const palette = THEMES[id];
    const swatchBg = palette ? palette.bg : LT.bg;
    const filter = palette && palette.hueRotate ? `hue-rotate(${palette.hueRotate}deg) saturate(${palette.saturate||1})` : 'none';
    return <div style={{ width:36, height:36, borderRadius:10, background:swatchBg, border:`1px solid ${palette?palette.border:C.border}`, flexShrink:0, filter }} />;
  };

  return (
    <div style={{ position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, bottom:0, background:C.bg, zIndex:60, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:`1px solid ${C.border}`, background:C.card, flexShrink:0 }}>
        <button onClick={onClose} style={{ width:36, height:36, borderRadius:12, background:C.card2, display:'flex', alignItems:'center', justifyContent:'center', color:C.text }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontSize:17, fontWeight:700, color:C.text, flex:1 }}>{t('settings.title')}</span>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:18 }}>

        {/* Apparence — uniquement les thèmes (skins cookie/roue retirés) */}
        <section>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>{t('settings.section_appearance')}</div>
          <div style={{ borderRadius:16, background:C.card, border:`1px solid ${C.border}`, padding:14, display:'flex', flexDirection:'column', gap:10 }}>
            {defaultRow(t('settings.theme_default'), t('settings.theme_default_desc'), activeTheme==='', ()=>setActiveTheme(''))}
            {unlockedThemes.length === 0 ? (
              <div style={{ display:'flex', alignItems:'center', gap:10, color:C.muted, fontSize:12, padding:'8px 4px', fontStyle:'italic' }}>
                <Lock size={14} /> {t('settings.themes_locked_hint')}
              </div>
            ) : (
              unlockedThemes.map(t => renderItem(
                t, activeTheme === t.id,
                ()=>setActiveTheme(activeTheme === t.id ? '' : t.id),
                themeSwatch(t.id)
              ))
            )}
          </div>
        </section>

        {/* Audio (BRIEF_AUDIO) */}
        <section>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>{t('settings.section_audio')}</div>
          <div style={{ borderRadius:16, background:C.card, border:`1px solid ${C.border}`, padding:14 }}>

            {/* Toggle sons UI */}
            <button
              onClick={toggleUi}
              style={{
                width:'100%', padding:'10px 4px', display:'flex',
                alignItems:'center', justifyContent:'space-between',
                background:'transparent', border:'none', cursor:'pointer',
              }}
            >
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{t('settings.audio_ui')}</div>
                <div style={{ fontSize:11, color:C.muted }}>{t('settings.audio_ui_desc')}</div>
              </div>
              <Switch enabled={audio.uiSoundEnabled} />
            </button>

            <div style={{ height:1, background:C.border, opacity:.5, margin:'4px 0' }} />

            {/* Toggle musique */}
            <button
              onClick={toggleMusic}
              style={{
                width:'100%', padding:'10px 4px', display:'flex',
                alignItems:'center', justifyContent:'space-between',
                background:'transparent', border:'none', cursor:'pointer',
              }}
            >
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{t('settings.audio_music')}</div>
                <div style={{ fontSize:11, color:C.muted }}>{t('settings.audio_music_desc')}</div>
              </div>
              <Switch enabled={audio.musicEnabled} />
            </button>

            {/* Sélecteur de musique (si musique activée) */}
            {audio.musicEnabled && (
              <div style={{ marginTop:10, paddingTop:12, borderTop:`1px dashed ${C.border}` }}>
                <div style={{ fontSize:11, color:C.muted, marginBottom:8, textTransform:'uppercase', letterSpacing:1.5, fontWeight:700 }}>
                  {t('settings.audio_current_music')}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {availableMusics.map(m => {
                    const active = audio.currentMusicId === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={()=>chooseMusic(m.id)}
                        style={{
                          padding:'10px 12px', borderRadius:11,
                          border: active ? '2px solid #D4A017' : `1.5px solid ${C.border}`,
                          background: active
                            ? 'linear-gradient(135deg, rgba(212,160,23,.12), rgba(193,127,60,.12))'
                            : 'transparent',
                          color:C.text,
                          fontSize:13, fontWeight:700,
                          display:'flex', alignItems:'center', justifyContent:'space-between',
                          cursor:'pointer', textAlign:'left',
                        }}
                      >
                        <span>{m.emoji} {m.name}</span>
                        {active && (
                          <span style={{ fontSize:10, fontWeight:800, color:'#D4A017', letterSpacing:.3 }}>{t('settings.audio_now_playing')}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {availableMusics.length === 1 && (
                  <div style={{ fontSize:11, color:C.muted, marginTop:10, fontStyle:'italic', textAlign:'center', lineHeight:1.45 }}>
                    {t('settings.audio_unlock_hint')}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Langue / Language — switch FR ↔ EN, ré-rend toute l'app en live
            via le hook useTranslation (useSyncExternalStore). */}
        <section>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
            <Globe size={11} /> {t('settings.section_language')}
          </div>
          <div style={{ borderRadius:16, background:C.card, border:`1px solid ${C.border}`, padding:14 }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:10 }}>
              {t('settings.lang_select')}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {[
                { id:'fr', flag:'🇫🇷', label:t('settings.lang_fr') },
                { id:'en', flag:'🇬🇧', label:t('settings.lang_en') },
              ].map(opt => {
                const active = lang === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => { if(!active){ playSound('toggle'); setLang(opt.id); } }}
                    style={{
                      flex:1, padding:'10px 12px', borderRadius:12,
                      background: active ? 'rgba(212,160,23,.14)' : 'transparent',
                      border: `1.5px solid ${active ? '#D4A017' : C.border}`,
                      color: active ? '#D4A017' : C.text,
                      fontSize:13, fontWeight:800, cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                      transition:'all .2s',
                    }}
                  >
                    <span style={{ fontSize:18, lineHeight:1 }}>{opt.flag}</span>
                    {opt.label}
                    {active && <Check size={14} color="#D4A017" />}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Données */}
        <section>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>{t('settings.section_data')}</div>
          <div style={{ borderRadius:16, background:C.card, border:`1px solid ${C.border}`, padding:16, marginBottom:8 }}>
            <div style={{ fontSize:13, color:C.text, marginBottom:4 }}>{t('settings.data_local_save')}</div>
            <div style={{ fontSize:11, color:C.muted, lineHeight:1.5 }}>
              {t('settings.data_local_desc')}
            </div>
          </div>

          {/* Carte infos de récupération — collapsée par défaut, révélée
              au tap pour ne pas occuper trop de place. */}
          {(userCode || restorePin) && !recoveryRevealed && (
            <button
              onClick={() => setRecoveryRevealed(true)}
              style={{
                width:'100%', borderRadius:16,
                background:'linear-gradient(140deg, rgba(212,160,23,.08), rgba(193,127,60,.06))',
                border:'1px solid rgba(212,160,23,.32)',
                padding:'14px 16px', marginBottom:8,
                display:'flex', alignItems:'center', justifyContent:'space-between',
                cursor:'pointer', textAlign:'left',
              }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                <div style={{
                  width:34, height:34, borderRadius:9,
                  background:'rgba(212,160,23,.12)',
                  border:'1px solid rgba(212,160,23,.3)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>
                  <Lock size={14} color="#D4A017" />
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text }}>
                    {t('settings.data_recovery_title')}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                    {t('settings.data_recovery_sub')}
                  </div>
                </div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:'#D4A017', flexShrink:0, letterSpacing:.3 }}>
                {t('settings.data_recovery_see')}
              </span>
            </button>
          )}

          {(userCode || restorePin) && recoveryRevealed && (
            <div style={{
              borderRadius:16,
              background:'linear-gradient(140deg, rgba(212,160,23,.08), rgba(193,127,60,.06))',
              border:'1px solid rgba(212,160,23,.32)',
              padding:'14px 16px', marginBottom:8,
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                  <Lock size={14} color="#D4A017" />
                  <div style={{ fontSize:13, fontWeight:800, color:C.text }}>
                    {t('settings.data_recovery_title')}
                  </div>
                </div>
                <button
                  onClick={() => { setRecoveryRevealed(false); setPinRevealed(false); }}
                  style={{
                    background:'transparent', border:'none',
                    fontSize:11, fontWeight:700, color:C.muted,
                    cursor:'pointer', padding:4,
                    textDecoration:'underline',
                  }}
                >
                  {t('settings.data_recovery_hide')}
                </button>
              </div>

              {/* Ligne CODE */}
              <div style={{
                display:'flex', alignItems:'center', justifyContent:'space-between', gap:10,
                padding:'8px 10px', borderRadius:10,
                background:C.bg, border:`1px solid ${C.border}`,
                marginBottom:8,
              }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.2, marginBottom:2 }}>{t('settings.data_code_label')}</div>
                  <div style={{
                    fontSize:16, fontWeight:900, color:'#D4A017',
                    letterSpacing:3, fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
                  }}>
                    {userCode || '—'}
                  </div>
                </div>
                <button
                  onClick={() => userCode && copyText(userCode, 'code')}
                  disabled={!userCode}
                  aria-label={t('common.copy')}
                  style={{
                    background: codeCopied ? 'rgba(212,160,23,.18)' : 'transparent',
                    border:`1px solid ${codeCopied ? '#D4A017' : C.border}`,
                    color: codeCopied ? '#D4A017' : C.muted,
                    padding:'6px 10px', borderRadius:9,
                    fontSize:11, fontWeight:700, cursor:'pointer',
                    display:'flex', alignItems:'center', gap:5,
                  }}
                >
                  {codeCopied ? <><Check size={12}/> {t('common.copied')}</> : <><Copy size={12}/> {t('common.copy')}</>}
                </button>
              </div>

              {/* Ligne PIN */}
              <div style={{
                display:'flex', alignItems:'center', justifyContent:'space-between', gap:10,
                padding:'8px 10px', borderRadius:10,
                background:C.bg, border:`1px solid ${C.border}`,
              }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.2, marginBottom:2 }}>
                    {t('settings.data_pin_label')} <span style={{ color:'#C17F3C' }}>· {t('settings.data_pin_secret')}</span>
                  </div>
                  <div style={{
                    fontSize:16, fontWeight:900, color:'#D4A017',
                    letterSpacing:5, fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
                  }}>
                    {restorePin
                      ? (pinRevealed ? restorePin : '••••')
                      : '— génération…'}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <button
                    onClick={() => setPinRevealed(v => !v)}
                    disabled={!restorePin}
                    aria-label={pinRevealed ? t('common.hide') : t('common.show')}
                    style={{
                      background:'transparent',
                      border:`1px solid ${C.border}`,
                      color:C.muted,
                      width:32, height:30, borderRadius:9,
                      cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}
                  >
                    {pinRevealed ? <EyeOff size={13}/> : <Eye size={13}/>}
                  </button>
                  <button
                    onClick={() => restorePin && copyText(restorePin, 'pin')}
                    disabled={!restorePin}
                    aria-label={t('common.copy')}
                    style={{
                      background: pinCopied ? 'rgba(212,160,23,.18)' : 'transparent',
                      border:`1px solid ${pinCopied ? '#D4A017' : C.border}`,
                      color: pinCopied ? '#D4A017' : C.muted,
                      padding:'6px 10px', borderRadius:9,
                      fontSize:11, fontWeight:700, cursor:'pointer',
                      display:'flex', alignItems:'center', gap:5,
                    }}
                  >
                    {pinCopied ? <><Check size={12}/> {t('common.copied')}</> : <><Copy size={12}/> {t('common.copy')}</>}
                  </button>
                </div>
              </div>

              <div style={{ fontSize:10.5, color:C.muted, marginTop:10, lineHeight:1.5 }}>
                {t('settings.data_recovery_note')}
                <strong style={{ color:'#7D4E1F' }}> {t('settings.data_pin_warning')}</strong>
              </div>
            </div>
          )}

          {onOpenRestore && (
            <button
              onClick={() => { playSound('modal'); onOpenRestore(); }}
              style={{
                width:'100%', borderRadius:16,
                background:C.card, border:`1px solid ${C.border}`,
                padding:'14px 16px',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                cursor:'pointer', textAlign:'left',
                marginBottom:8,
              }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
                <div style={{
                  width:38, height:38, borderRadius:10,
                  background:'rgba(212,160,23,.12)',
                  border:'1px solid rgba(212,160,23,.3)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0, fontSize:18,
                }}>
                  🔄
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text }}>
                    {t('settings.data_restore')}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                    {t('settings.data_restore_sub')}
                  </div>
                </div>
              </div>
              <span style={{ fontSize:18, color:C.muted, flexShrink:0 }}>→</span>
            </button>
          )}

          {onStartNewAccount && (
            <button
              onClick={() => { playSound('modal'); onStartNewAccount(); }}
              style={{
                width:'100%', borderRadius:16,
                background:C.card, border:`1px solid ${C.border}`,
                padding:'14px 16px',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                cursor:'pointer', textAlign:'left',
                marginBottom:8,
              }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
                <div style={{
                  width:38, height:38, borderRadius:10,
                  background:'rgba(212,160,23,.12)',
                  border:'1px solid rgba(212,160,23,.3)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0, fontSize:18,
                }}>
                  🌱
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text }}>
                    {t('settings.data_new_account')}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                    {t('settings.data_new_account_sub')}
                  </div>
                </div>
              </div>
              <span style={{ fontSize:18, color:C.muted, flexShrink:0 }}>→</span>
            </button>
          )}

          {onOpenPromoCode && (
            <button
              onClick={() => { playSound('modal'); onOpenPromoCode(); }}
              style={{
                width:'100%', borderRadius:16,
                background:'linear-gradient(135deg, #C25822 0%, #E8985A 100%)',
                border:'1px solid #A0451A',
                padding:'14px 16px',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                cursor:'pointer', textAlign:'left',
                boxShadow:'0 4px 14px rgba(160, 69, 26, 0.3)',
              }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
                <div style={{
                  width:38, height:38, borderRadius:10,
                  background:'rgba(255,255,255,.18)',
                  border:'1px solid rgba(255,255,255,.32)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0, fontSize:18,
                }}>
                  🎟️
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:'#fff', letterSpacing:.2 }}>
                    {t('settings.data_promo')}
                  </div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.85)', marginTop:2 }}>
                    {t('settings.data_promo_sub')}
                  </div>
                </div>
              </div>
              <span style={{ fontSize:18, color:'#fff', flexShrink:0, fontWeight:800 }}>→</span>
            </button>
          )}
        </section>

        {/* Installation PWA — bouton si Android/Desktop, instruction si iOS,
            badge "déjà installée" si standalone, rien sinon. */}
        {install && (install.canInstall || install.isIos || install.isStandalone) && (
          <section>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>{t('settings.section_installation')}</div>
            <div style={{ borderRadius:16, background:C.card, border:`1px solid ${C.border}`, padding:16 }}>
              {install.isStandalone ? (
                <div style={{ display:'flex', alignItems:'center', gap:10, color:'#D4A017', fontSize:13, fontWeight:700 }}>
                  <Check size={18} /> {t('settings.install_installed')}
                </div>
              ) : install.canInstall ? (
                <>
                  <div style={{ fontSize:13, color:C.text, marginBottom:4 }}>{t('settings.install_cta_title')}</div>
                  <div style={{ fontSize:11, color:C.muted, lineHeight:1.5, marginBottom:12 }}>
                    {t('settings.install_cta_desc')}
                  </div>
                  <button
                    onClick={()=>install.install()}
                    style={{
                      width:'100%', padding:'12px 0', borderRadius:14,
                      background:GOLD, color:'#fff',
                      fontSize:13, fontWeight:800, letterSpacing:.3,
                      border:'none',
                      boxShadow:'0 4px 12px rgba(212,160,23,.4)',
                      cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    }}
                  >
                    <Download size={16} /> {t('settings.install_button')}
                  </button>
                </>
              ) : install.isIos ? (
                <>
                  <div style={{ fontSize:13, color:C.text, marginBottom:4 }}>{t('settings.install_ios_title')}</div>
                  <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}>
                    {/* Texte iOS — pose Share emoji manuellement pour préserver la richesse visuelle */}
                    {lang === 'fr'
                      ? <>Sur Safari : appuie sur <strong style={{ color:'#D4A017' }}><Share size={11} style={{ display:'inline', verticalAlign:'middle' }} /> Partager</strong> en bas de l'écran, puis <strong style={{ color:'#D4A017' }}>« Sur l'écran d'accueil »</strong>.</>
                      : <>In Safari: tap <strong style={{ color:'#D4A017' }}><Share size={11} style={{ display:'inline', verticalAlign:'middle' }} /> Share</strong> at the bottom of the screen, then <strong style={{ color:'#D4A017' }}>"Add to Home Screen"</strong>.</>
                    }
                  </div>
                </>
              ) : null}
            </div>
          </section>
        )}

        {/* Communauté — serveur Discord pour bugs & suggestions */}
        <section>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>{t('settings.section_community')}</div>
          <a
            href="https://discord.gg/EMDQXDBV39"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playSound('modal')}
            style={{
              width:'100%', borderRadius:16,
              background:C.card, border:`1px solid ${C.border}`,
              padding:'14px 16px',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              cursor:'pointer', textAlign:'left',
              textDecoration:'none', color:'inherit',
              boxSizing:'border-box',
            }}
          >
            <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
              <div style={{
                width:38, height:38, borderRadius:10,
                background:'rgba(212,160,23,.12)',
                border:'1px solid rgba(212,160,23,.3)',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0,
              }}>
                <MessagesSquare size={18} color="#D4A017" />
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:800, color:C.text }}>
                  {t('settings.community_title')}
                </div>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                  {t('settings.community_sub')}
                </div>
              </div>
            </div>
            <span style={{ fontSize:18, color:C.muted, flexShrink:0 }}>↗</span>
          </a>
        </section>

        {/* À propos — version, changelog, stats communauté */}
        {onOpenAbout && (
          <section>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>{t('settings.section_about')}</div>
            <button
              onClick={() => { playSound('modal'); onOpenAbout(); }}
              style={{
                width:'100%', borderRadius:16,
                background:C.card, border:`1px solid ${C.border}`,
                padding:'14px 16px',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                cursor:'pointer', textAlign:'left',
              }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
                <div style={{
                  width:38, height:38, borderRadius:10,
                  background:'rgba(212,160,23,.12)',
                  border:'1px solid rgba(212,160,23,.3)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>
                  <Info size={18} color="#D4A017" />
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text }}>
                    {t('settings.about_title')}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                    {t('settings.about_sub')}
                  </div>
                </div>
              </div>
              <span style={{ fontSize:18, color:C.muted, flexShrink:0 }}>→</span>
            </button>
          </section>
        )}

        {/* Zone à risque — repoussée tout en bas, palette espresso, double validation */}
        <section style={{ marginTop:'auto', paddingTop:14, borderTop:`1px dashed ${C.border}` }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
            <AlertTriangle size={11} /> {t('settings.section_danger')}
          </div>

          <ResetProgressButton onReset={onReset} C={C} />
        </section>

      </div>
    </div>
  );
}

/* Toggle visuel iOS-like — palette café (or quand activé, gris quand off) */
function Switch({ enabled }){
  return (
    <div style={{
      width:44, height:26, borderRadius:13,
      position:'relative', flexShrink:0,
      background: enabled ? 'linear-gradient(135deg,#D4A017,#C17F3C)' : '#E8DDD0',
      transition:'background .2s',
      boxShadow: enabled ? '0 2px 8px rgba(212,160,23,.35)' : 'inset 0 1px 2px rgba(0,0,0,.08)',
    }}>
      <div style={{
        position:'absolute', top:3,
        left: enabled ? 21 : 3,
        width:20, height:20, borderRadius:'50%',
        background:'#fff',
        boxShadow:'0 2px 4px rgba(0,0,0,.25)',
        transition:'left .2s',
      }} />
    </div>
  );
}

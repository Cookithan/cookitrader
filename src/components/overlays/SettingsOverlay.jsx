import { useState } from "react";
import { ChevronLeft, Check, Lock, AlertTriangle, Download, Share, Info, Eye, EyeOff, Copy } from "lucide-react";
import { REWARDS } from "../../data/constants.js";
import { THEMES, LT, GOLD } from "../../data/themes.js";
import { ResetProgressButton } from "../profile/ResetProgressButton.jsx";
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

  /* PIN reveal toggle + feedback copie */
  const [pinRevealed, setPinRevealed] = useState(false);
  const [pinCopied,   setPinCopied]   = useState(false);
  const [codeCopied,  setCodeCopied]  = useState(false);

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
        <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{item.name.replace(/^(Thème|Cookie|Roue)\s+/, '')}</div>
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
        <span style={{ fontSize:17, fontWeight:700, color:C.text, flex:1 }}>Paramètres</span>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:18 }}>

        {/* Apparence — uniquement les thèmes (skins cookie/roue retirés) */}
        <section>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>APPARENCE</div>
          <div style={{ borderRadius:16, background:C.card, border:`1px solid ${C.border}`, padding:14, display:'flex', flexDirection:'column', gap:10 }}>
            {defaultRow('Défaut', 'Crème classique', activeTheme==='', ()=>setActiveTheme(''))}
            {unlockedThemes.length === 0 ? (
              <div style={{ display:'flex', alignItems:'center', gap:10, color:C.muted, fontSize:12, padding:'8px 4px', fontStyle:'italic' }}>
                <Lock size={14} /> Débloque des thèmes en boutique pour les activer ici.
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
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>AUDIO</div>
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
                <div style={{ fontSize:13, fontWeight:800, color:C.text }}>Sons d'interface</div>
                <div style={{ fontSize:11, color:C.muted }}>Petits sons sur les boutons</div>
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
                <div style={{ fontSize:13, fontWeight:800, color:C.text }}>Musique d'ambiance</div>
                <div style={{ fontSize:11, color:C.muted }}>Musique de fond pendant le jeu</div>
              </div>
              <Switch enabled={audio.musicEnabled} />
            </button>

            {/* Sélecteur de musique (si musique activée) */}
            {audio.musicEnabled && (
              <div style={{ marginTop:10, paddingTop:12, borderTop:`1px dashed ${C.border}` }}>
                <div style={{ fontSize:11, color:C.muted, marginBottom:8, textTransform:'uppercase', letterSpacing:1.5, fontWeight:700 }}>
                  Musique en cours
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
                          <span style={{ fontSize:10, fontWeight:800, color:'#D4A017', letterSpacing:.3 }}>● En lecture</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {availableMusics.length === 1 && (
                  <div style={{ fontSize:11, color:C.muted, marginTop:10, fontStyle:'italic', textAlign:'center', lineHeight:1.45 }}>
                    💡 Débloque d'autres musiques dans la boutique
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Données */}
        <section>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>DONNÉES</div>
          <div style={{ borderRadius:16, background:C.card, border:`1px solid ${C.border}`, padding:16, marginBottom:8 }}>
            <div style={{ fontSize:13, color:C.text, marginBottom:4 }}>Sauvegarde locale</div>
            <div style={{ fontSize:11, color:C.muted, lineHeight:1.5 }}>
              Ta progression est enregistrée automatiquement dans ce navigateur. Elle est conservée même après fermeture, mais ne suit pas entre appareils.
            </div>
          </div>

          {/* Carte infos de récupération — code + PIN. Code toujours visible
              (même que le code ami), PIN caché par défaut + toggle révéler. */}
          {(userCode || restorePin) && (
            <div style={{
              borderRadius:16,
              background:'linear-gradient(140deg, rgba(212,160,23,.08), rgba(193,127,60,.06))',
              border:'1px solid rgba(212,160,23,.32)',
              padding:'14px 16px', marginBottom:8,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <Lock size={14} color="#D4A017" />
                <div style={{ fontSize:13, fontWeight:800, color:C.text }}>
                  Mes infos de récupération
                </div>
              </div>

              {/* Ligne CODE */}
              <div style={{
                display:'flex', alignItems:'center', justifyContent:'space-between', gap:10,
                padding:'8px 10px', borderRadius:10,
                background:C.bg, border:`1px solid ${C.border}`,
                marginBottom:8,
              }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.2, marginBottom:2 }}>Code</div>
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
                  aria-label="Copier le code"
                  style={{
                    background: codeCopied ? 'rgba(212,160,23,.18)' : 'transparent',
                    border:`1px solid ${codeCopied ? '#D4A017' : C.border}`,
                    color: codeCopied ? '#D4A017' : C.muted,
                    padding:'6px 10px', borderRadius:9,
                    fontSize:11, fontWeight:700, cursor:'pointer',
                    display:'flex', alignItems:'center', gap:5,
                  }}
                >
                  {codeCopied ? <><Check size={12}/> Copié</> : <><Copy size={12}/> Copier</>}
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
                    PIN <span style={{ color:'#C17F3C' }}>· secret</span>
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
                    aria-label={pinRevealed ? 'Cacher le PIN' : 'Révéler le PIN'}
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
                    aria-label="Copier le PIN"
                    style={{
                      background: pinCopied ? 'rgba(212,160,23,.18)' : 'transparent',
                      border:`1px solid ${pinCopied ? '#D4A017' : C.border}`,
                      color: pinCopied ? '#D4A017' : C.muted,
                      padding:'6px 10px', borderRadius:9,
                      fontSize:11, fontWeight:700, cursor:'pointer',
                      display:'flex', alignItems:'center', gap:5,
                    }}
                  >
                    {pinCopied ? <><Check size={12}/> Copié</> : <><Copy size={12}/> Copier</>}
                  </button>
                </div>
              </div>

              <div style={{ fontSize:10.5, color:C.muted, marginTop:10, lineHeight:1.5 }}>
                Note ces 2 infos quelque part. Tu en as besoin pour récupérer ton compte sur un autre appareil.
                <strong style={{ color:'#7D4E1F' }}> Ne partage jamais ton PIN.</strong>
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
                    Restaurer / changer de compte
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                    Charger un autre profil via son code + PIN
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
                    Démarrer un nouveau compte
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                    Onboarding fresh — l'actuel reste sauvegardé en ligne
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
                  flexShrink:0, fontSize:18,
                }}>
                  🎟️
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text }}>
                    Code promo
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                    Saisis un code distribué par Cookithan
                  </div>
                </div>
              </div>
              <span style={{ fontSize:18, color:C.muted, flexShrink:0 }}>→</span>
            </button>
          )}
        </section>

        {/* Installation PWA — bouton si Android/Desktop, instruction si iOS,
            badge "déjà installée" si standalone, rien sinon. */}
        {install && (install.canInstall || install.isIos || install.isStandalone) && (
          <section>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>INSTALLATION</div>
            <div style={{ borderRadius:16, background:C.card, border:`1px solid ${C.border}`, padding:16 }}>
              {install.isStandalone ? (
                <div style={{ display:'flex', alignItems:'center', gap:10, color:'#D4A017', fontSize:13, fontWeight:700 }}>
                  <Check size={18} /> App installée sur ton appareil ✓
                </div>
              ) : install.canInstall ? (
                <>
                  <div style={{ fontSize:13, color:C.text, marginBottom:4 }}>Installer CookiMiner 🍪</div>
                  <div style={{ fontSize:11, color:C.muted, lineHeight:1.5, marginBottom:12 }}>
                    Ajoute l'app à ton écran d'accueil pour la lancer en plein écran, comme une vraie app native.
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
                    <Download size={16} /> Installer l'application
                  </button>
                </>
              ) : install.isIos ? (
                <>
                  <div style={{ fontSize:13, color:C.text, marginBottom:4 }}>Installer CookiMiner sur iOS</div>
                  <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}>
                    Sur Safari : appuie sur <strong style={{ color:'#D4A017' }}>
                      <Share size={11} style={{ display:'inline', verticalAlign:'middle' }} /> Partager
                    </strong> en bas de l'écran, puis <strong style={{ color:'#D4A017' }}>« Sur l'écran d'accueil »</strong>.
                  </div>
                </>
              ) : null}
            </div>
          </section>
        )}

        {/* À propos — version, changelog, stats communauté */}
        {onOpenAbout && (
          <section>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>À PROPOS</div>
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
                    À propos de CookiMiner
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                    Version, nouveautés, crédits
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
            <AlertTriangle size={11} /> ZONE SENSIBLE
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

import { useState } from "react";
import { ChevronLeft, Check, Lock, AlertTriangle } from "lucide-react";
import { REWARDS } from "../../data/constants.js";
import { THEMES, COOKIE_SKINS, LT, GOLD } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   SettingsOverlay — plein écran z-index 60
   - Sections : APPARENCE (onglets Thèmes/Skins/Roues) · DONNÉES · ZONE SENSIBLE
   - L'onglet Apparence ne montre QUE ce que l'utilisateur a débloqué
     (le défaut n'est jamais "verrouillé")
   - Reset progression : double validation (bouton dashed → confirmation espresso)
   - L'item premium (applyAs:'theme'/'skin') s'affiche aussi dans son onglet
═══════════════════════════════════════════════════════ */

export function SettingsOverlay({ onClose, unlocked, activeTheme, setActiveTheme, activeSkin, setActiveSkin, activeRoue, setActiveRoue, onReset, C }) {
  const [confirming, setConfirming] = useState(false);
  const [appearanceTab, setAppearanceTab] = useState('themes'); // 'themes' | 'skins' | 'roues'

  const unlockedThemes = REWARDS.filter(r => unlocked.includes(r.id) && (r.type==='Thème' || (r.type==='Premium' && r.applyAs==='theme')));
  const unlockedSkins  = REWARDS.filter(r => unlocked.includes(r.id) && (r.type==='Skin'  || (r.type==='Premium' && r.applyAs==='skin')));
  const unlockedRoues  = REWARDS.filter(r => unlocked.includes(r.id) && r.type==='Roue');

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
  const skinSwatch = (item) => {
    const cfg = COOKIE_SKINS[item.id];
    const bg = cfg ? `radial-gradient(circle at 35% 30%, ${cfg.body[0].c}, ${cfg.body[cfg.body.length-1].c})` : 'linear-gradient(135deg,#E8B57A,#6B3812)';
    return <div style={{ width:36, height:36, borderRadius:'50%', background:bg, border:`1.5px solid ${cfg?cfg.ring:'#3D2010'}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{item.emoji}</div>;
  };
  const roueSwatch = (item) => (
    <div style={{ width:36, height:36, borderRadius:'50%', background:'conic-gradient(#4A2C17, #C17F3C, #D4A017, #6B3D20, #4A2C17)', border:`1.5px solid #3D2010`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{item.emoji}</div>
  );

  const TABS = [
    { id:'themes', label:'Thèmes',       icon:'🎨', count:unlockedThemes.length },
    { id:'skins',  label:'Skins cookie', icon:'🍪', count:unlockedSkins.length  },
    { id:'roues',  label:'Skins roue',   icon:'🎯', count:unlockedRoues.length  },
  ];

  return (
    <div style={{ position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, bottom:0, background:C.bg, zIndex:60, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:`1px solid ${C.border}`, background:C.card, flexShrink:0 }}>
        <button onClick={onClose} style={{ width:36, height:36, borderRadius:12, background:C.card2, display:'flex', alignItems:'center', justifyContent:'center', color:C.text }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontSize:17, fontWeight:700, color:C.text, flex:1 }}>Paramètres</span>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:18 }}>

        {/* Apparence */}
        <section>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>APPARENCE</div>

          {/* Onglets segmentés */}
          <div style={{ display:'flex', gap:6, padding:4, borderRadius:14, background:C.card2, marginBottom:10 }}>
            {TABS.map(t => {
              const active = appearanceTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={()=>setAppearanceTab(t.id)}
                  style={{
                    flex:1, padding:'8px 4px', borderRadius:10,
                    fontSize:11, fontWeight:800, letterSpacing:.3,
                    background: active ? GOLD : 'transparent',
                    color: active ? '#fff' : C.text,
                    boxShadow: active ? '0 4px 10px rgba(212,160,23,.35)' : 'none',
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5
                  }}
                >
                  <span style={{ fontSize:13 }}>{t.icon}</span>
                  <span>{t.label}</span>
                  <span style={{ fontSize:10, opacity:.85 }}>({t.count})</span>
                </button>
              );
            })}
          </div>

          {/* Contenu de l'onglet actif */}
          <div style={{ borderRadius:16, background:C.card, border:`1px solid ${C.border}`, padding:14, display:'flex', flexDirection:'column', gap:10 }}>

            {appearanceTab === 'themes' && (
              <>
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
              </>
            )}

            {appearanceTab === 'skins' && (
              <>
                {defaultRow('Cookie classique', 'Skin par défaut', activeSkin==='', ()=>setActiveSkin(''))}
                {unlockedSkins.length === 0 ? (
                  <div style={{ display:'flex', alignItems:'center', gap:10, color:C.muted, fontSize:12, padding:'8px 4px', fontStyle:'italic' }}>
                    <Lock size={14} /> Débloque des skins en boutique pour les activer ici.
                  </div>
                ) : (
                  unlockedSkins.map(s => renderItem(
                    s, activeSkin === s.id,
                    ()=>setActiveSkin(activeSkin === s.id ? '' : s.id),
                    skinSwatch(s)
                  ))
                )}
              </>
            )}

            {appearanceTab === 'roues' && (
              <>
                {defaultRow('Roue classique', 'Apparence par défaut', activeRoue==='', ()=>setActiveRoue(''))}
                {unlockedRoues.length === 0 ? (
                  <div style={{ display:'flex', alignItems:'center', gap:10, color:C.muted, fontSize:12, padding:'8px 4px', fontStyle:'italic' }}>
                    <Lock size={14} /> Débloque des skins de roue en boutique pour les activer ici.
                  </div>
                ) : (
                  unlockedRoues.map(r => renderItem(
                    r, activeRoue === r.id,
                    ()=>setActiveRoue(activeRoue === r.id ? '' : r.id),
                    roueSwatch(r)
                  ))
                )}
              </>
            )}

          </div>
        </section>

        {/* Données */}
        <section>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>DONNÉES</div>
          <div style={{ borderRadius:16, background:C.card, border:`1px solid ${C.border}`, padding:16 }}>
            <div style={{ fontSize:13, color:C.text, marginBottom:4 }}>Sauvegarde locale</div>
            <div style={{ fontSize:11, color:C.muted, lineHeight:1.5 }}>
              Ta progression est enregistrée automatiquement dans ce navigateur. Elle est conservée même après fermeture, mais ne suit pas entre appareils.
            </div>
          </div>
        </section>

        {/* Zone à risque — repoussée tout en bas, palette espresso, double validation */}
        <section style={{ marginTop:'auto', paddingTop:14, borderTop:`1px dashed ${C.border}` }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
            <AlertTriangle size={11} /> ZONE SENSIBLE
          </div>

          {!confirming ? (
            <button onClick={()=>setConfirming(true)} style={{ width:'100%', padding:11, borderRadius:12, background:'transparent', border:`1px dashed ${C.border}`, color:C.muted, fontWeight:500, fontSize:12, letterSpacing:.2 }}>
              Réinitialiser ma progression
            </button>
          ) : (
            <div style={{ borderRadius:14, padding:14, background:'linear-gradient(135deg,#3D2010,#2A1508)', border:'1px solid #4A2C17' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#F0E0C0', marginBottom:6 }}>Tout effacer ?</div>
              <div style={{ fontSize:11, color:'rgba(240,224,192,.7)', lineHeight:1.5, marginBottom:14 }}>
                Cookies, niveau, série, record, récompenses débloquées et thème seront définitivement perdus. Cette action est irréversible.
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>setConfirming(false)} style={{ flex:1, padding:10, borderRadius:11, background:'rgba(240,224,192,.1)', color:'#F0E0C0', fontWeight:700, fontSize:12, border:'1px solid rgba(240,224,192,.2)' }}>
                  Annuler
                </button>
                <button onClick={onReset} style={{ flex:1, padding:10, borderRadius:11, background:'#1A0E08', color:'#A88060', fontWeight:700, fontSize:12, border:'1px solid #3D2010' }}>
                  Tout effacer
                </button>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

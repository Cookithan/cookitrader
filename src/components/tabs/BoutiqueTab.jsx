import { useState } from "react";
import { Cookie, Coffee, Check, Lock } from "lucide-react";
import { REWARDS } from "../../data/constants.js";
import { GOLD, ESPRESSO } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   BoutiqueTab — onglet boutique (mode 'shop' | 'premium')
   - SHOP : items en cookies, filtrés par type (Tous / Badge / Titre / Thème /
            Avatar / Skin / Roue), ne révèle un nouveau niveau que si tout l'actuel
            est acheté (paiement cookies uniquement, pas premium)
   - PREMIUM : items currency:'cafe' uniquement
   - Snapshot initialUnlocked : items achetés AVANT ce mount sont masqués
                                (l'utilisateur les retrouve dans Profil/Paramètres).
                                Les achats faits PENDANT cette session restent visibles.
   - "Activer/Désactiver" pour Thème / Skin / Roue (mutuellement exclusifs).
                Avatar : pas de désactivation, juste switch.
═══════════════════════════════════════════════════════ */

export function BoutiqueTab({ coins, cafes, unlocked, level, onUnlock, mode, setMode, activeTheme, activeSkin, activeRoue, userAvatar, setActiveTheme, setActiveSkin, setActiveRoue, setUserAvatar, C }) {
  const [filter, setFilter] = useState('Tous');
  /* Snapshot des items déjà achetés au mount : on les cache de la boutique
     (l'utilisateur les retrouve dans Profil ou Paramètres). Achats faits
     pendant cette session restent visibles jusqu'au prochain mount. */
  const [initialUnlocked] = useState(unlocked);
  const FILTERS = ['Tous','Badge','Titre','Thème','Avatar','Skin','Roue'];

  const ACTIVATABLE = {
    'Thème' :[activeTheme, setActiveTheme],
    'Skin'  :[activeSkin,  setActiveSkin],
    'Roue'  :[activeRoue,  setActiveRoue],
    /* Avatar : pas de désactivation possible, juste switch (gère plus bas) */
    'Avatar':[userAvatar,  setUserAvatar],
  };

  /* Révèle un niveau de plus uniquement quand tout celui en cours est acheté
     (n'inclut PAS les items premium) */
  let revealedLevel = 1;
  for(let n=1; n<=level; n++){
    const itemsAtN = REWARDS.filter(r => r.levelRequired === n && r.currency !== 'cafe');
    revealedLevel = n;
    if(!itemsAtN.every(it => unlocked.includes(it.id))) break;
  }

  let visible;
  if(mode === 'premium'){
    visible = REWARDS.filter(r => r.currency === 'cafe' && !initialUnlocked.includes(r.id));
  } else {
    /* PHASE 6E — les items `limited` sont la règle inverse : visibles
       UNIQUEMENT s'ils sont débloqués (gagnés via événement spécial),
       avec un badge "Édition limitée". On lit `unlocked` (live) pour
       les afficher dès la victoire, sans attendre le prochain mount. */
    visible = REWARDS.filter(r => {
      if(r.currency === 'cafe') return false;
      if(r.limited) return unlocked.includes(r.id);
      return !initialUnlocked.includes(r.id) && r.levelRequired <= revealedLevel;
    });
  }
  const filtered = mode === 'premium' || filter==='Tous' ? visible : visible.filter(r=>r.type===filter);
  const shown = [...filtered].sort((a,b)=>{
    const ua = unlocked.includes(a.id), ub = unlocked.includes(b.id);
    if(ua !== ub) return ua ? -1 : 1;
    if(a.levelRequired !== b.levelRequired) return a.levelRequired - b.levelRequired;
    return a.cost - b.cost;
  });

  return (
    <div className="su" style={{ position:'relative' }}>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, paddingTop:4 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>BOUTIQUE</div>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, fontWeight:700, color:C.text }}>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}><Coffee size={13} color="#F0C050" /> {cafes}</span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}><Cookie size={14} color="#D4A017" /> {coins}</span>
        </div>
      </div>

      {/* Toggle Boutique / Premium */}
      <div style={{ display:'flex', gap:6, padding:4, borderRadius:14, background:C.card2, marginBottom:14 }}>
        <button
          onClick={()=>setMode('shop')}
          style={{
            flex:1, padding:'10px 0', borderRadius:10, fontSize:13, fontWeight:800, letterSpacing:.4,
            background: mode==='shop' ? GOLD : 'transparent',
            color: mode==='shop' ? '#fff' : C.text,
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            boxShadow: mode==='shop' ? '0 4px 12px rgba(212,160,23,.4)' : 'none', cursor:'pointer'
          }}
        >
          <Cookie size={14} color={mode==='shop' ? '#fff' : C.muted} />
          BOUTIQUE
        </button>
        <button
          onClick={()=>setMode('premium')}
          style={{
            flex:1, padding:'10px 0', borderRadius:10, fontSize:13, fontWeight:800, letterSpacing:.4,
            background: mode==='premium' ? ESPRESSO : 'transparent',
            color: mode==='premium' ? '#F0C050' : C.text,
            border: mode==='premium' ? '1.5px solid rgba(212,160,23,.55)' : '1.5px solid transparent',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            boxShadow: mode==='premium' ? '0 4px 14px rgba(74,44,23,.5)' : 'none', cursor:'pointer'
          }}
        >
          <Coffee size={14} color={mode==='premium' ? '#F0C050' : C.muted} />
          PREMIUM
        </button>
      </div>

      {/* Bandeau Premium (mode='premium' uniquement) */}
      {mode === 'premium' && (
        <div className="su" style={{
          padding:'14px 16px', borderRadius:16, marginBottom:14,
          background:ESPRESSO, border:'1.5px solid rgba(212,160,23,.45)',
          boxShadow:'0 0 20px rgba(212,160,23,.25)',
          display:'flex', alignItems:'center', gap:12
        }}>
          <Coffee size={28} color="#F0C050" />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'#F0C050', letterSpacing:1.5 }}>EXCLUSIF</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.85)', marginTop:2, lineHeight:1.4 }}>
              Items rares payés en cafés ☕. Gagne-en au level-up, achievements et jackpot.
            </div>
          </div>
        </div>
      )}

      {/* Pills (uniquement en mode shop) */}
      {mode === 'shop' && (
        <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:2 }}>
          {FILTERS.map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700, whiteSpace:'nowrap', background:filter===f?GOLD:C.card, color:filter===f?'#fff':C.muted, border:`1px solid ${filter===f?'transparent':C.border}`, transition:'all .2s' }}>{f}</button>
          ))}
        </div>
      )}
      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {shown.map((r,i)=>{
          const isPremium  = r.currency === 'cafe';
          const isUnlocked = unlocked.includes(r.id);
          const lvOK       = level >= r.levelRequired;
          const canAfford  = isPremium ? cafes >= r.cost : coins >= r.cost;
          const lvLocked   = !lvOK && !isUnlocked;
          /* Pour les premium : on regarde applyAs pour piocher le bon activator */
          const activeKey  = isPremium
            ? (r.applyAs==='theme'  ? 'Thème'
              : r.applyAs==='skin'  ? 'Skin'
              : r.applyAs==='avatar'? 'Avatar'
              : null)
            : r.type;
          const activatable = ACTIVATABLE[activeKey];
          const isActive    = activatable && activatable[0] === r.id;

          return (
            <div key={r.id} className={`su stagger-${(i%4)+1}`} style={{
              borderRadius:18, padding:16,
              background: isPremium ? `linear-gradient(160deg, ${C.card}, ${C.card2})` : C.card,
              border:`2px solid ${isUnlocked?'#D4A017': isPremium ? 'rgba(212,160,23,.55)' : C.border}`,
              boxShadow: isUnlocked
                ? '0 0 20px rgba(212,160,23,.25)'
                : isPremium ? '0 0 18px rgba(74,44,23,.18)' : '0 2px 8px rgba(0,0,0,.04)',
              transition:'all .3s', position:'relative', overflow:'hidden',
              opacity:lvLocked ? .55 : 1
            }}>
              {isPremium && !isUnlocked && (
                <span style={{ position:'absolute', top:8, right:10, fontSize:9, fontWeight:800, padding:'3px 7px', borderRadius:8, background:ESPRESSO, color:'#F0C050', letterSpacing:.5 }}>PREMIUM</span>
              )}
              {/* PHASE 6E — badge "Édition limitée" (remplace le ✨ habituel) */}
              {r.limited && isUnlocked && (
                <span style={{ position:'absolute', top:8, right:10, fontSize:9, fontWeight:800, padding:'3px 7px', borderRadius:8, background:'linear-gradient(135deg,#D4A017,#C17F3C)', color:'#fff', letterSpacing:.5, boxShadow:'0 2px 6px rgba(212,160,23,.35)' }}>ÉDITION LIMITÉE</span>
              )}
              {isUnlocked && !r.limited && <span className="sparkle-anim" style={{ position:'absolute', top:8, right:10, fontSize:14, animationDelay:`${i*0.3}s` }}>✨</span>}
              <div className={isUnlocked ? 'float-anim' : ''} style={{ fontSize:30, marginBottom:8, display:'inline-block', filter:lvLocked?'grayscale(.7)':'none' }}>{lvLocked ? '🔒' : r.emoji}</div>
              <div style={{ fontWeight:700, fontSize:13, color:C.text, marginBottom:3 }}>{r.name}</div>
              <div style={{ fontSize:11, color:C.muted, marginBottom:12 }}>{r.desc}</div>

              {isUnlocked ? (
                activatable ? (
                  <button
                    onClick={()=>{
                      const isAvatar = activeKey === 'Avatar';
                      if(isAvatar){ if(!isActive) activatable[1](r.id); }
                      else activatable[1](isActive ? '' : r.id);
                    }}
                    disabled={activeKey === 'Avatar' && isActive}
                    style={{
                      width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:700,
                      background: isActive ? GOLD : 'transparent',
                      color: isActive ? '#fff' : '#D4A017',
                      border: `1.5px solid ${isActive ? 'transparent' : '#D4A017'}`,
                      display:'flex', alignItems:'center', justifyContent:'center', gap:5, cursor: activeKey === 'Avatar' && isActive ? 'default' : 'pointer'
                    }}
                  >
                    {isActive ? <><Check size={12} color="#fff" /> {activeKey === 'Avatar' ? 'Porté' : 'Activé'}</> : 'Activer'}
                  </button>
                ) : (
                  <div style={{ fontSize:12, fontWeight:700, color:'#D4A017', display:'flex', alignItems:'center', gap:4 }}><Check size={12} color="#D4A017" /> Débloqué</div>
                )
              ) : lvLocked ? (
                <div style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:700, background:C.card2, color:'#D4A017', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                  <Lock size={11} color="#D4A017" /> Niveau {r.levelRequired} requis
                </div>
              ) : isPremium ? (
                <button onClick={()=>onUnlock(r.id)} className={canAfford ? 'pulse-ring' : ''} style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:800, background:canAfford?ESPRESSO:C.card2, color:canAfford?'#F0C050':C.muted, border:`1.5px solid ${canAfford?'rgba(212,160,23,.5)':C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:5, cursor:canAfford?'pointer':'not-allowed' }}>
                  {canAfford?<Coffee size={11} color="#F0C050"/>:<Lock size={11}/>} {r.cost} cafés
                </button>
              ) : (
                <button onClick={()=>onUnlock(r.id)} className={canAfford ? 'pulse-ring' : ''} style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:700, background:canAfford?GOLD:C.card2, color:canAfford?'#fff':C.muted, border:`1px solid ${canAfford?'transparent':C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:4, cursor:canAfford?'pointer':'not-allowed' }}>
                  {canAfford?<Cookie size={11} color="#fff"/>:<Lock size={11}/>} {r.cost} cookies
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state quand tout est déjà acheté */}
      {shown.length === 0 && (
        <div style={{ textAlign:'center', padding:'30px 20px', borderRadius:16, background:C.card, border:`1px dashed ${C.border}`, color:C.muted }}>
          <div style={{ fontSize:36, marginBottom:8 }}>{mode==='premium' ? '☕' : '🛍️'}</div>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>
            {mode==='premium' ? 'Aucun item premium dispo' : 'Rien de nouveau ici'}
          </div>
          <div style={{ fontSize:11, lineHeight:1.5, maxWidth:260, margin:'0 auto' }}>
            {mode==='premium'
              ? 'Tu as déjà tout débloqué côté premium.'
              : 'Tu as déjà tout débloqué pour ton niveau. Monte de niveau pour de nouvelles récompenses !'}
            <br/>
            Retrouve tes items dans <strong style={{ color:C.text }}>Profil</strong> ou <strong style={{ color:C.text }}>Paramètres</strong>.
          </div>
        </div>
      )}

      <div style={{ textAlign:'center', marginTop:24, fontSize:12, color:C.muted, fontStyle:'italic', paddingBottom:8 }}>
        {mode === 'premium'
          ? 'Plus de cafés bientôt — moyens de paiement à venir 💳'
          : 'Monte de niveau pour débloquer plus de récompenses ! ☕'}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Cookie, Coffee, Check, Lock, ChevronRight, ChevronLeft } from "lucide-react";
import { REWARDS } from "../../data/constants.js";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { playMusic, getCurrentMusicId, playSound } from "../../lib/audio.js";
import { BuyCafesModal } from "../modals/BuyCafesModal.jsx";

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

export function BoutiqueTab({ coins, cafes, unlocked, level, onUnlock, mode, setMode, activeTheme, activeBanner, activeSkin, activeTitle, userAvatar, setActiveTheme, setActiveBanner, setActiveSkin, setActiveTitle, setUserAvatar, spinsLeft = 0, slotPlaysLeft = 0, userCode = '', vipPurchasesToday = {}, C }) {
  const [filter, setFilter] = useState('Tous');
  /* Sous-vue du premium : 'main' (catégories + items normaux) ou 'jetons'
     (spin_pass + slot_pass uniquement). On ne pollue pas la grid premium
     principale avec les jetons consommables — ils ont leur dédiée. */
  const [premiumView, setPremiumView] = useState('main');
  const [showBuyCafes, setShowBuyCafes] = useState(false);
  /* Snapshot des items déjà achetés au mount : on les cache de la boutique
     (l'utilisateur les retrouve dans Profil ou Paramètres). Achats faits
     pendant cette session restent visibles jusqu'au prochain mount. */
  const [initialUnlocked] = useState(unlocked);
  const FILTERS = ['Tous','Badge','Thème','Avatar','Skin','Titre','Musique','Pack'];

  /* Musique active — état local synchronisé avec le système audio (LS).
     Convention : côté REWARDS l'id est `music_<key>` (ex 'music_matin') ;
     côté MUSICS / playMusic la clé est `<key>` (ex 'matin'). On strip le
     préfixe avant l'appel et pour comparer la sélection.
     Note : `activeMusicId` côté state local stocke l'id REWARDS (`music_<key>`)
     pour matcher r.id directement dans la comparaison `isActive`. */
  const fromMusicsKey = (k) => k ? `music_${k}` : '';
  const toMusicsKey   = (id) => id ? id.replace(/^music_/, '') : '';
  const [activeMusicId, setActiveMusicIdState] = useState(fromMusicsKey(getCurrentMusicId()));
  const setActiveMusic = (id) => {
    const key = toMusicsKey(id);
    if(key){ playMusic(key); }
    setActiveMusicIdState(id || fromMusicsKey(getCurrentMusicId()));
  };

  const ACTIVATABLE = {
    'Thème'   :[activeTheme,  setActiveTheme],
    'Bannière':[activeBanner, setActiveBanner],
    /* Avatar : pas de désactivation possible, juste switch (gère plus bas) */
    'Avatar'  :[userAvatar,   setUserAvatar],
    /* Musique : pas de "désactivation" depuis la boutique — on switch
       vers la musique sélectionnée. La désactivation passe par Settings. */
    'Musique' :[activeMusicId, setActiveMusic],
    /* Skin cookie : activable comme un thème (toggle '' = défaut) */
    'Skin'    :[activeSkin,   setActiveSkin],
    /* Titre couleur : activable comme un thème (toggle '' = aucun titre) */
    'Titre'   :[activeTitle,  setActiveTitle],
  };

  /* Révèle un niveau de plus uniquement quand tout celui en cours est acheté.
     Ignore les items premium (☕), les items 'limited' (thèmes événements
     qui peuvent ne jamais être gagnés — sinon on bloque la progression) et
     les items consommables (Pack actions $CKM, jamais ajoutés à unlocked). */
  const isCountable = (r) =>
    r.currency !== 'cafe' && !r.limited && r.applyAs !== 'pack_shares';
  let revealedLevel = 1;
  for(let n=1; n<=level; n++){
    const itemsAtN = REWARDS.filter(r => r.levelRequired === n && isCountable(r));
    revealedLevel = n;
    if(!itemsAtN.every(it => unlocked.includes(it.id))) break;
  }

  /* Stats du niveau boutique en cours pour la barre de progression */
  const itemsAtRevealed = REWARDS.filter(r =>
    r.levelRequired === revealedLevel && isCountable(r)
  );
  const earnedAtRevealed = itemsAtRevealed.filter(it => unlocked.includes(it.id)).length;
  const totalAtRevealed  = itemsAtRevealed.length;
  const remainingAtRevealed = totalAtRevealed - earnedAtRevealed;
  const shopProgressPct = totalAtRevealed > 0
    ? Math.round((earnedAtRevealed / totalAtRevealed) * 100)
    : 100;

  /* Helper : un item est-il un consommable "Bonus VIP" (jetons jeux +
     boosters café) ? Tous regroupés dans la sous-vue 'jetons' du Premium. */
  const CONSUMABLE_APPLY_AS = ['spin_pass', 'slot_pass', 'quiz_skip', 'next_game_doubler', 'boost_x2_1h'];
  const isJeton = (r) => CONSUMABLE_APPLY_AS.includes(r.applyAs);

  let visible;
  if(mode === 'premium'){
    visible = REWARDS.filter(r => {
      if(r.currency !== 'cafe') return false;
      /* Filtres par niveau (utilisés par les Jetons VIP) :
         - levelRequired : niveau minimum pour voir l'item
         - levelMax      : niveau maximum (au-dessus, l'item est caché) */
      if(r.levelRequired && level < r.levelRequired) return false;
      if(r.levelMax && level > r.levelMax) return false;
      /* Sous-vue jetons : uniquement les jetons consommables. */
      if(premiumView === 'jetons') return isJeton(r);
      /* Sous-vue main : on cache les jetons (ils sont dans leur catégorie). */
      if(isJeton(r)) return false;
      return !initialUnlocked.includes(r.id);
    });
  } else {
    /* Les items `limited` (édition limitée gagnés via événements) ne
       sont JAMAIS dans la boutique — l'utilisateur les retrouve dans
       Profil/Paramètres pour les équiper. Sortie boutique propre.
       Les Packs $CKM sont consommables : toujours visibles tant que
       le niveau est atteint (ne sont jamais dans `unlocked`). */
    visible = REWARDS.filter(r => {
      if(r.currency === 'cafe') return false;
      if(r.limited) return false;
      if(r.applyAs === 'pack_shares') return r.levelRequired <= revealedLevel;
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
          onClick={()=>{ if(mode!=='shop'){ playSound('tab'); setMode('shop'); setPremiumView('main'); } }}
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
          onClick={()=>{ if(mode!=='premium'){ playSound('tab'); setMode('premium'); setPremiumView('main'); } }}
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

      {/* Bandeau Premium — uniquement en sous-vue jetons (la vue main
         premium pose maintenant directement la carte d'achat ☕ en tête,
         sans bandeau "EXCLUSIF" qui faisait doublon visuel). */}
      {mode === 'premium' && premiumView === 'jetons' && (
        <button
          onClick={()=>{ playSound('tab'); setPremiumView('main'); }}
          style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'10px 14px', borderRadius:12, marginBottom:14,
            background:'transparent', color:C.text,
            border:`1.5px solid ${C.border}`,
            fontSize:13, fontWeight:700, cursor:'pointer',
          }}
        >
          <ChevronLeft size={16} /> Retour Premium
        </button>
      )}

      {/* Carte achat de cafés réels (Stripe) — affichée en 1er, version
         simple (style ESPRESSO discret, plus la grande carte glow). */}
      {mode === 'premium' && premiumView === 'main' && userCode && (
        <button
          onClick={()=>{ playSound('modal'); setShowBuyCafes(true); }}
          style={{
            width:'100%', display:'flex', alignItems:'center', gap:14,
            padding:'14px 16px', borderRadius:16, marginBottom:14,
            background:ESPRESSO,
            border:'1.5px solid rgba(212,160,23,.55)',
            boxShadow:'0 4px 16px rgba(74,44,23,.4)',
            cursor:'pointer', color:'#fff', textAlign:'left',
          }}
        >
          <div style={{ fontSize:32 }}>☕</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:900, color:'#F0C050', marginBottom:2, letterSpacing:.3 }}>Acheter des cafés</div>
            <div style={{ fontSize:11.5, color:'rgba(255,255,255,.75)', lineHeight:1.4 }}>
              15 / 50 / 200 ☕ — paiement sécurisé Stripe
            </div>
          </div>
          <ChevronRight size={18} color="#F0C050" />
        </button>
      )}

      {/* Carte d'entrée vers les Jetons VIP (vue main premium uniquement) */}
      {mode === 'premium' && premiumView === 'main' && (
        <button
          onClick={()=>{ playSound('tab'); setPremiumView('jetons'); }}
          style={{
            width:'100%', display:'flex', alignItems:'center', gap:14,
            padding:'14px 16px', borderRadius:16, marginBottom:14,
            background:`linear-gradient(135deg, ${C.card}, ${C.card2})`,
            border:'1.5px solid rgba(212,160,23,.45)',
            boxShadow:'0 4px 14px rgba(74,44,23,.25)',
            cursor:'pointer', color:C.text, textAlign:'left',
          }}
        >
          <div style={{ fontSize:32 }}>🎫</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:900, color:C.text, marginBottom:2 }}>Bonus VIP</div>
            <div style={{ fontSize:11.5, color:C.muted, lineHeight:1.4 }}>
              Jetons (roue, slot) + boosters (×2 cookies, skip quiz…)
            </div>
          </div>
          <ChevronRight size={18} color={C.muted} />
        </button>
      )}

      {showBuyCafes && (
        <BuyCafesModal userCode={userCode} onClose={()=>setShowBuyCafes(false)} C={C} />
      )}

      {/* Bandeau Niveau Boutique (mode='shop' uniquement) — montre la progression
          d'achat au palier en cours et incite à compléter pour débloquer le suivant */}
      {mode === 'shop' && (
        <div style={{
          padding:'12px 14px', borderRadius:14, marginBottom:14,
          background:ESPRESSO,
          border:'1.5px solid rgba(212,160,23,.4)',
          boxShadow:'0 4px 14px rgba(74,44,23,.35)',
        }}>
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            gap:8, marginBottom:8,
          }}>
            <div style={{
              fontSize:11, fontWeight:800, color:'rgba(255,255,255,.75)',
              textTransform:'uppercase', letterSpacing:1.5,
            }}>
              🏪 Boutique · Niveau {revealedLevel}
            </div>
            <div style={{
              fontSize:11, fontWeight:800, color:'#F0C050',
              fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
            }}>
              {totalAtRevealed > 0 ? `${earnedAtRevealed}/${totalAtRevealed}` : '—'}
            </div>
          </div>

          {/* Barre de progression */}
          <div style={{
            height:6, background:'rgba(0,0,0,.3)', borderRadius:3, overflow:'hidden',
          }}>
            <div style={{
              width:`${shopProgressPct}%`, height:'100%',
              background:'linear-gradient(90deg, #D4A017, #F0C050)',
              transition:'width .4s ease-out',
              boxShadow: shopProgressPct > 0 ? '0 0 8px rgba(240,192,80,.6)' : 'none',
            }} />
          </div>

          {/* Hint contextuel sous la barre */}
          <div style={{
            fontSize:10.5, color:'rgba(255,255,255,.6)',
            marginTop:7, lineHeight:1.4,
          }}>
            {totalAtRevealed === 0
              ? `Aucun item au niveau ${revealedLevel}.`
              : remainingAtRevealed === 0
                ? (revealedLevel >= level
                    ? `🎉 Tout pris au niv ${revealedLevel} ! Monte de niveau pour débloquer la suite.`
                    : `🎉 Niveau ${revealedLevel} complet — niveau ${revealedLevel + 1} débloqué.`)
                : `Encore ${remainingAtRevealed} item${remainingAtRevealed > 1 ? 's' : ''} à acheter pour passer au niveau ${revealedLevel + 1}.`}
          </div>
        </div>
      )}

      {/* Pills (uniquement en mode shop) */}
      {mode === 'shop' && (
        <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:2 }}>
          {FILTERS.map(f=>(
            <button key={f} onClick={()=>{ if(filter!==f){ playSound('tab'); setFilter(f); } }} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700, whiteSpace:'nowrap', background:filter===f?GOLD:C.card, color:filter===f?'#fff':C.muted, border:`1px solid ${filter===f?'transparent':C.border}`, transition:'all .2s' }}>{f}</button>
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
          /* Jetons VIP : achat uniquement si quota quotidien épuisé. */
          const isSpinPass = r.applyAs === 'spin_pass';
          const isSlotPass = r.applyAs === 'slot_pass';
          /* Cap quotidien Bonus VIP — 1 achat / jour / item. Synchro avec
             la liste VIP_DAILY_CAP_IDS côté App.jsx (source unique = back). */
          const vipBoughtToday = !!vipPurchasesToday && vipPurchasesToday[r.id] === new Date().toDateString();
          const passLockedReason =
              vipBoughtToday                     ? 'Revient demain'
            : (isSpinPass && spinsLeft > 0)     ? `Reste ${spinsLeft} tour${spinsLeft>1?'s':''}`
            : (isSlotPass && slotPlaysLeft > 0) ? `Reste ${slotPlaysLeft} partie${slotPlaysLeft>1?'s':''}`
            : null;
          const passLocked = !!passLockedReason;
          /* Pour les premium : on regarde applyAs pour piocher le bon activator */
          const activeKey  = isPremium
            ? (r.applyAs==='theme'  ? 'Thème'
              : r.applyAs==='avatar'? 'Avatar'
              : r.applyAs==='banner'? 'Bannière'
              : r.applyAs==='music' ? 'Musique'
              : r.applyAs==='skin'  ? 'Skin'
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
              <div style={{ fontSize:11, color:C.muted, marginBottom: (r.savingsLabel || r.applyAs === 'unlock_all_shop') ? 6 : 12 }}>{r.desc}</div>
              {/* Badge "économies" — sur les packs/items ULTRA pour justifier le prix.
                  unlock_all_shop : calcul dynamique de la valeur 🍪 totale débloquée. */}
              {(() => {
                let label = r.savingsLabel;
                if(!label && r.applyAs === 'unlock_all_shop'){
                  const totalCookies = REWARDS
                    .filter(rw => rw.currency !== 'cafe' && !rw.limited && rw.applyAs !== 'pack_shares')
                    .reduce((sum, rw) => sum + (rw.cost || 0), 0);
                  label = `Économise ~${totalCookies.toLocaleString('fr-FR')} 🍪`;
                }
                if(!label || isUnlocked) return null;
                return (
                  <div style={{
                    display:'inline-block',
                    fontSize:9.5, fontWeight:800, color:'#3D2010',
                    background:'linear-gradient(135deg,#F5DC8A,#D4A017)',
                    padding:'2px 7px', borderRadius:8,
                    marginBottom:10, letterSpacing:.3,
                    boxShadow:'0 2px 6px rgba(212,160,23,.3)',
                  }}>
                    ✨ {label}
                  </div>
                );
              })()}

              {isUnlocked ? (
                activatable ? (
                  <button
                    onClick={()=>{
                      const noToggle = activeKey === 'Avatar' || activeKey === 'Musique';
                      if(noToggle){ if(!isActive) activatable[1](r.id); }
                      else activatable[1](isActive ? '' : r.id);
                    }}
                    disabled={(activeKey === 'Avatar' || activeKey === 'Musique') && isActive}
                    style={{
                      width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:700,
                      background: isActive ? GOLD : 'transparent',
                      color: isActive ? '#fff' : '#D4A017',
                      border: `1.5px solid ${isActive ? 'transparent' : '#D4A017'}`,
                      display:'flex', alignItems:'center', justifyContent:'center', gap:5, cursor: ((activeKey === 'Avatar' || activeKey === 'Musique') && isActive) ? 'default' : 'pointer'
                    }}
                  >
                    {isActive ? <><Check size={12} color="#fff" /> {activeKey === 'Avatar' ? 'Porté' : activeKey === 'Musique' ? 'En lecture' : 'Activé'}</> : 'Activer'}
                  </button>
                ) : (
                  <div style={{ fontSize:12, fontWeight:700, color:'#D4A017', display:'flex', alignItems:'center', gap:4 }}><Check size={12} color="#D4A017" /> Débloqué</div>
                )
              ) : lvLocked ? (
                <div style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:700, background:C.card2, color:'#D4A017', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                  <Lock size={11} color="#D4A017" /> Niveau {r.levelRequired} requis
                </div>
              ) : isPremium ? (
                passLocked ? (
                  <div style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:11.5, fontWeight:700, background:C.card2, color:C.muted, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontStyle:'italic' }}>
                    <Lock size={11}/> {passLockedReason}
                  </div>
                ) : (
                  <button onClick={()=>onUnlock(r.id)} className={canAfford ? 'pulse-ring' : ''} style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:800, background:canAfford?ESPRESSO:C.card2, color:canAfford?'#F0C050':C.muted, border:`1.5px solid ${canAfford?'rgba(212,160,23,.5)':C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:5, cursor:canAfford?'pointer':'not-allowed' }}>
                    {canAfford?<Coffee size={11} color="#F0C050"/>:<Lock size={11}/>} {r.cost} cafés
                  </button>
                )
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

import { useState } from "react";
import { ChevronLeft, Settings, Lock } from "lucide-react";
import { LEVEL_NAMES, REWARDS } from "../../data/constants.js";
import { ONBOARDING_AVATARS, AVATAR_PREMIUM, AVATAR_PREMIUM_LIST } from "../../data/avatars.js";
import { GOLD } from "../../data/themes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { ChangeNameModal } from "../modals/ChangeNameModal.jsx";
import { FriendsSection } from "../profile/FriendsSection.jsx";

/* ════════════════════════════════════════════════════
   ProfileOverlay — plein écran z-index 60
   - Mode normal : carte identité, niveau (avec bouton "Voir les niveaux"),
     stats, équipement, titres, badges, FriendsSection (code ami + zone
     "à venir"), boutons "Modifier mon pseudo" (ouvre ChangeNameModal
     payante) et "Modifier mon avatar", crédit auteur en pied
   - Mode édition : grille avatars (base + premium débloqués)
   - Le pseudo n'est PLUS modifiable depuis le mode édition — passe par
     la modale payante ChangeNameModal (PHASE 1 du brief améliorations)
   - userCode est généré dans App.jsx puis passé en prop ; on l'affiche
     ici via FriendsSection (PHASE 3)
   - Le compte d'achievementsTotal ignore master_succes si non révélé
═══════════════════════════════════════════════════════ */

export function ProfileOverlay({
  onClose, onOpenLevels, onOpenSettings,
  userName, setUserName, userAvatar, setUserAvatar, joinDate,
  coins, spendCoins, nameChangeCount, setNameChangeCount,
  userCode,
  level, xp, xpReq, totalEarned, streak, unlocked,
  earnedAchievements, achievementsTotal,
  activeTheme, activeSkin, activeRoue,
  C
}) {
  const [editing, setEditing] = useState(false);
  const [editAvatar, setEditAvatar] = useState(userAvatar);
  const [showChangeName, setShowChangeName] = useState(false);

  const xpPct = Math.min((xp/xpReq)*100, 100);
  const badges = REWARDS.filter(r => r.type==='Badge'  && unlocked.includes(r.id));
  const titres = REWARDS.filter(r => r.type==='Titre'  && unlocked.includes(r.id));

  /* Sélecteur d'avatar (PHASE 4) :
     - "Mes avatars" : 12 de base (toujours dispos) + premium débloqués
     - "À débloquer" : premium non débloqués, grisés avec cadenas */
  const myBaseAvatars = ONBOARDING_AVATARS.map((a,i)=>({ value:i, art:a.art, bg:a.bg, name:a.name, owned:true }));
  const myPremiumAvatars = AVATAR_PREMIUM_LIST
    .filter(a => unlocked.includes(a.id))
    .map(a => ({ value:a.id, art:a.art, bg:a.bg, name:a.name, owned:true }));
  const lockedPremiumAvatars = AVATAR_PREMIUM_LIST
    .filter(a => !unlocked.includes(a.id))
    .map(a => {
      const r = REWARDS.find(x => x.id === a.id);
      return { value:a.id, art:a.art, bg:a.bg, name:a.name, owned:false,
               cost: r ? r.cost : 0, levelRequired: r ? r.levelRequired : 1 };
    });

  const equipment = [
    { label:'Avatar', kind:'avatar', value:userAvatar },
    { label:'Thème',  kind:'item',   id:activeTheme, item: activeTheme ? REWARDS.find(r=>r.id===activeTheme) : null },
    { label:'Skin',   kind:'item',   id:activeSkin,  item: activeSkin  ? REWARDS.find(r=>r.id===activeSkin)  : null },
    { label:'Roue',   kind:'item',   id:activeRoue,  item: activeRoue  ? REWARDS.find(r=>r.id===activeRoue)  : null },
  ];

  const saveEdit = () => {
    if(editAvatar===null) return;
    setUserAvatar(editAvatar);
    setEditing(false);
  };

  const confirmNameChange = (newName, price) => {
    spendCoins(price);
    setUserName(newName);
    setNameChangeCount(c => c + 1);
    setShowChangeName(false);
  };

  return (
    <div style={{ position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, bottom:0, background:C.bg, zIndex:60, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:`1px solid ${C.border}`, background:C.card, flexShrink:0 }}>
        <button onClick={onClose} style={{ width:36, height:36, borderRadius:12, background:C.card2, display:'flex', alignItems:'center', justifyContent:'center', color:C.text }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontSize:17, fontWeight:700, color:C.text, flex:1 }}>{editing ? 'Modifier mon avatar' : 'Mon profil'}</span>
        {!editing && (
          <button onClick={onOpenSettings} aria-label="Paramètres" style={{ width:34, height:34, borderRadius:11, background:C.card2, color:C.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Settings size={15} />
          </button>
        )}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'18px 18px 28px', display:'flex', flexDirection:'column', gap:18 }}>

        {editing ? (
          <>
            <section>
              <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>MES AVATARS</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, justifyItems:'center' }}>
                {[...myBaseAvatars, ...myPremiumAvatars].map(a => {
                  const sel = editAvatar===a.value;
                  return (
                    <button
                      key={String(a.value)}
                      onClick={()=>setEditAvatar(a.value)}
                      className={sel?'pulse-ring':''}
                      style={{
                        padding:0, borderRadius:'50%',
                        border:`3px solid ${sel?'#D4A017':'transparent'}`,
                        cursor:'pointer',
                        boxShadow:sel?'0 4px 16px rgba(212,160,23,.45)':'0 2px 6px rgba(0,0,0,.15)',
                        transition:'all .2s',
                        background:'transparent', lineHeight:0,
                        display:'inline-flex',
                      }}
                      aria-label={a.name}
                    >
                      <AvatarFigure value={a.value} size={66} />
                    </button>
                  );
                })}
              </div>
            </section>

            {lockedPremiumAvatars.length > 0 && (
              <section>
                <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>À DÉBLOQUER</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, justifyItems:'center' }}>
                  {lockedPremiumAvatars.map(a => (
                    <div
                      key={a.value}
                      title={`${a.name} — niveau ${a.levelRequired} requis · ${a.cost} 🍪`}
                      style={{
                        position:'relative',
                        width:66, height:66,
                        opacity:.55,
                        filter:'grayscale(.55)',
                      }}
                    >
                      <AvatarFigure value={a.value} size={66} />
                      <div style={{
                        position:'absolute', inset:0, borderRadius:'50%',
                        background:'rgba(15,8,4,.45)',
                        display:'flex', alignItems:'center', justifyContent:'center'
                      }}>
                        <Lock size={20} color="#FAF0E0" />
                      </div>
                      <div style={{
                        position:'absolute', bottom:-4, left:'50%', transform:'translateX(-50%)',
                        fontSize:9, fontWeight:800,
                        background:'#2A1606', color:'#F0C050',
                        padding:'2px 6px', borderRadius:8,
                        border:'1px solid rgba(212,160,23,.4)',
                        whiteSpace:'nowrap',
                      }}>
                        Niv {a.levelRequired}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:11, color:C.muted, marginTop:14, fontStyle:'italic', textAlign:'center' }}>
                  Débloque-les depuis la boutique ✨
                </div>
              </section>
            )}

            <div style={{ display:'flex', gap:10, marginTop:'auto' }}>
              <button onClick={()=>{ setEditing(false); setEditAvatar(userAvatar); }} style={{ flex:1, padding:'13px 0', borderRadius:14, background:'transparent', border:`1.5px solid ${C.border}`, color:C.muted, fontSize:14, fontWeight:700 }}>
                Annuler
              </button>
              <button onClick={saveEdit} disabled={editAvatar===null} style={{ flex:1, padding:'13px 0', borderRadius:14, background: editAvatar===null ? C.card2 : GOLD, color: editAvatar===null ? C.muted : '#fff', border:'none', fontSize:14, fontWeight:800, cursor:editAvatar===null?'not-allowed':'pointer' }}>
                Confirmer
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Identité */}
            <section style={{ textAlign:'center', paddingTop:6 }}>
              <div style={{ margin:'0 auto 14px', display:'inline-flex' }}>
                <AvatarFigure value={userAvatar} size={108} />
              </div>
              <div style={{ fontSize:24, fontWeight:900, color:C.text, marginBottom:4 }}>{userName || 'Joueur'}</div>
              {joinDate && (
                <div style={{ fontSize:11, color:C.muted }}>Membre depuis le {joinDate}</div>
              )}
              <div style={{ marginTop:10, display:'inline-block', padding:'5px 14px', borderRadius:14, background:'rgba(212,160,23,.12)', border:'1px solid rgba(212,160,23,.45)' }}>
                <span style={{ fontSize:12, fontWeight:800, color:'#D4A017', letterSpacing:.5 }}>{LEVEL_NAMES[level]}</span>
              </div>
            </section>

            {/* Niveau */}
            <section>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>NIVEAU {level}</div>
                <div style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{xp} / {xpReq} XP</div>
              </div>
              <div style={{ height:8, borderRadius:4, background:C.card2, overflow:'hidden', marginBottom:10 }}>
                <div style={{ height:'100%', width:`${xpPct}%`, background:GOLD, transition:'width .8s cubic-bezier(.36,.07,.19,.97)' }} />
              </div>
              <button onClick={onOpenLevels} style={{ width:'100%', padding:'10px', borderRadius:12, background:'transparent', border:`1.5px solid ${C.border}`, color:C.text, fontSize:12, fontWeight:700 }}>
                Voir les niveaux →
              </button>
            </section>

            {/* Stats */}
            <section>
              <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>STATISTIQUES</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { label:'Total gagné', value:totalEarned, sub:'cookies', col:'#D4A017' },
                  { label:'Série',        value:streak,      sub:`jour${streak>1?'s':''}`, col:'#E07040' },
                  { label:'Succès',       value:`${earnedAchievements.length}/${achievementsTotal}`, sub:'débloqués', col:'#C17F3C' },
                  { label:'Items',        value:`${unlocked.length}/${REWARDS.length}`, sub:'possédés', col:'#7D4E1F' },
                ].map(st => (
                  <div key={st.label} style={{ borderRadius:14, background:C.card, border:`1px solid ${C.border}`, padding:'12px 14px' }}>
                    <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:4 }}>{st.label}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:st.col, lineHeight:1.1 }}>{st.value}</div>
                    <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{st.sub}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Équipement */}
            <section>
              <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>ÉQUIPEMENT</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
                {equipment.map(e => (
                  <div key={e.label} style={{ borderRadius:12, background:C.card, border:`1px solid ${C.border}`, padding:'10px 6px', textAlign:'center', minHeight:72, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}>
                    {e.kind === 'avatar'
                      ? <AvatarFigure value={e.value} size={32} />
                      : <div style={{ fontSize:22 }}>{e.item ? e.item.emoji : '–'}</div>
                    }
                    <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:.5, textTransform:'uppercase' }}>{e.label}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Titres débloqués */}
            {titres.length > 0 && (
              <section>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>MES TITRES</div>
                  <div style={{ fontSize:11, color:C.muted }}>{titres.length}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {titres.map(t => (
                    <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:C.card, border:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:18 }}>{t.emoji}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{t.name.replace(/^Titre\s+"?|"$/g, '').replace(/"$/, '')}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Badges */}
            <section>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>MES BADGES</div>
                <div style={{ fontSize:11, color:C.muted }}>{badges.length}</div>
              </div>
              {badges.length === 0 ? (
                <div style={{ fontSize:12, color:C.muted, fontStyle:'italic', padding:'10px 4px' }}>Aucun badge encore — direction la boutique !</div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
                  {badges.map(b => (
                    <div key={b.id} style={{ borderRadius:12, background:C.card, border:'1px solid rgba(212,160,23,.4)', padding:'10px 4px', textAlign:'center' }}>
                      <div style={{ fontSize:24, marginBottom:4 }}>{b.emoji}</div>
                      <div style={{ fontSize:9, fontWeight:700, color:C.text, lineHeight:1.2 }}>{b.name.replace(/^Badge\s+/, '')}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <FriendsSection userCode={userCode} C={C} />

            <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:6 }}>
              <button onClick={()=>setShowChangeName(true)} style={{ width:'100%', padding:'13px 0', borderRadius:14, background:'transparent', border:`1.5px solid ${C.border}`, color:C.text, fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <span>Modifier mon pseudo</span>
                <span style={{ fontSize:11, fontWeight:800, color:'#D4A017' }}>· payant 🍪</span>
              </button>
              <button onClick={()=>{ setEditAvatar(userAvatar); setEditing(true); }} style={{ width:'100%', padding:'13px 0', borderRadius:14, background:'transparent', border:`1.5px solid ${C.border}`, color:C.text, fontSize:13, fontWeight:700 }}>
                Modifier mon avatar
              </button>
            </div>

            {/* Crédit auteur — toujours en pied de profil (PHASE 2) */}
            <div style={{ textAlign:'center', marginTop:32, paddingBottom:16, fontSize:11, color:'rgba(139,106,90,0.6)', fontWeight:500 }}>
              Réalisé avec <strong style={{ color:'#C17F3C' }}>Claude Code</strong> par <strong style={{ color:'#C17F3C' }}>Cookithan</strong>
              <div style={{ fontSize:10, marginTop:2, opacity:0.7 }}>
                CookiTrader v1.0
              </div>
            </div>
          </>
        )}

      </div>

      {showChangeName && (
        <ChangeNameModal
          currentName={userName}
          coins={coins}
          nameChangeCount={nameChangeCount}
          onConfirm={confirmNameChange}
          onClose={()=>setShowChangeName(false)}
          C={C}
        />
      )}
    </div>
  );
}

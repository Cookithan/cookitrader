import { useState } from "react";
import { ChevronLeft, Settings, Lock, Mail } from "lucide-react";
import { LEVEL_NAMES, REWARDS } from "../../data/constants.js";
import { ONBOARDING_AVATARS, AVATAR_PREMIUM, AVATAR_PREMIUM_LIST } from "../../data/avatars.js";
import { GOLD } from "../../data/themes.js";
import { SECRET_BADGES } from "../../data/secretBadges.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { ChangeNameModal } from "../modals/ChangeNameModal.jsx";
import { ChangeBioModal } from "../modals/ChangeBioModal.jsx";
import { FriendsSection } from "../profile/FriendsSection.jsx";
import { ResetProgressButton } from "../profile/ResetProgressButton.jsx";

/* ════════════════════════════════════════════════════
   ProfileOverlay — plein écran z-index 60 (PHASE 5)
   ────────────────────────────────────────────────────
   Structure de la vue normale :
     1. Carte profil principale (gradient beige) — avatar 92px, pseudo, titre,
        code ami, "membre depuis…", barre XP, bouton "Voir les niveaux"
     2. Bio courte (affichage uniquement si remplie)
     3. Stats grid 2×3 (Total gagné · Série · Niveau · Succès · Items · CKM)
     4. Mes Badges
     5. Mes Amis (FriendsSection)
     6. Boutons d'édition : pseudo (payant), avatar (gratuit), bio (gratuit)
     7. Réinitialiser ma progression (double validation, ResetProgressButton)
     8. Crédit "Réalisé avec Claude Code par Cookithan"

   Mode édition (toggle "Modifier mon avatar") : sections "Mes avatars"
   + "À débloquer" (grille des 12 base + 8 premium avec cadenas).

   Le pseudo n'est PLUS éditable depuis le mode édition — passe par la
   ChangeNameModal payante (PHASE 1). La bio passe par ChangeBioModal
   (PHASE 5, gratuite). Le compte d'achievementsTotal ignore master_
   succes si non révélé.
═══════════════════════════════════════════════════════ */

export function ProfileOverlay({
  onClose, onOpenLevels, onOpenSettings,
  userName, setUserName, userAvatar, setUserAvatar, joinDate,
  coins, spendCoins, nameChangeCount, setNameChangeCount,
  userCode,
  userBio, setUserBio,
  level, xp, xpReq, totalEarned, streak, unlocked,
  earnedAchievements, achievementsTotal,
  marketRealized = 0,
  activeTheme, activeSkin, activeRoue,
  onReset,
  supabaseEnabled = false,
  supabaseSyncOk  = false,
  unreadInboxCount = 0,
  onOpenInbox,
  onOpenFriendProfile,
  C
}) {
  const [editing, setEditing] = useState(false);
  const [editAvatar, setEditAvatar] = useState(userAvatar);
  const [showChangeName, setShowChangeName] = useState(false);
  const [showChangeBio,  setShowChangeBio]  = useState(false);

  const xpPct = Math.min((xp/xpReq)*100, 100);
  const badges = REWARDS.filter(r => r.type==='Badge'  && unlocked.includes(r.id));
  /* Badges secrets débloqués (BRIEF_BADGES_SECRETS). Les non-débloqués
     restent invisibles — sinon ce ne sont plus des secrets. */
  const secretBadgesUnlocked = Object.values(SECRET_BADGES).filter(b => unlocked.includes(b.id));

  /* Sélecteur d'avatar (PHASE 4) :
     - "Mes avatars" : 12 de base (toujours dispos) + premium débloqués
     - "À débloquer" : premium non débloqués, grisés avec cadenas */
  /* Filtre les onboarding `hidden:true` (Tasse / Théière / Croissant
     retirés du shop mais conservés en data pour compat profils existants).
     On garde l'index original via a.id pour ne pas remapper les valeurs. */
  const myBaseAvatars = ONBOARDING_AVATARS
    .filter(a => !a.hidden)
    .map(a => ({ value:a.id, art:a.art, bg:a.bg, name:a.name, owned:true }));
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

  const confirmBio = (text) => {
    setUserBio(text);
    setShowChangeBio(false);
  };

  return (
    <div style={{ position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, bottom:0, background:C.bg, zIndex:60, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:`1px solid ${C.border}`, background:C.card, flexShrink:0 }}>
        <button onClick={onClose} style={{ width:36, height:36, borderRadius:12, background:C.card2, display:'flex', alignItems:'center', justifyContent:'center', color:C.text }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontSize:17, fontWeight:700, color:C.text, flex:1, display:'flex', alignItems:'center', gap:10 }}>
          {editing ? 'Modifier mon avatar' : 'Mon profil'}
          {!editing && (
            supabaseEnabled && supabaseSyncOk ? (
              <span style={{ fontSize:10, fontWeight:700, color:'#D4A017', letterSpacing:.3 }} title="Profil synchronisé en ligne">● Synchronisé</span>
            ) : (
              <span style={{ fontSize:10, fontWeight:700, color:'#8B6A5A', letterSpacing:.3 }} title="Pas de sync en ligne">○ Hors ligne</span>
            )
          )}
        </span>
        {!editing && onOpenInbox && (
          <button
            onClick={onOpenInbox}
            aria-label={unreadInboxCount > 0 ? `Boîte de réception (${unreadInboxCount} non lus)` : 'Boîte de réception'}
            className={unreadInboxCount > 0 ? 'inbox-pulse' : undefined}
            style={{
              position:'relative',
              width:34, height:34, borderRadius:11,
              background:C.card2, color:C.muted,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}
          >
            <Mail size={15} />
            {unreadInboxCount > 0 && (
              <span
                className="inbox-badge-pulse"
                style={{
                  position:'absolute', top:-4, right:-4,
                  minWidth:18, height:18, padding:'0 5px',
                  borderRadius:9,
                  background:'#D4A017', color:'#fff',
                  fontSize:10, fontWeight:800,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  border:`2px solid ${C.card}`,
                  boxShadow:'0 2px 6px rgba(212,160,23,.5)',
                }}
              >
                {unreadInboxCount > 99 ? '99+' : unreadInboxCount}
              </span>
            )}
          </button>
        )}
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
            {/* 1. Carte profil principale (beige) — avatar + identité + XP */}
            <section style={{
              background:'linear-gradient(140deg,#F5E5C8,#E5CDA8)',
              borderRadius:22, padding:'22px 20px',
              boxShadow:'0 8px 24px rgba(139,106,90,.18)',
              border:'1px solid rgba(193,127,60,.35)',
              display:'flex', flexDirection:'column', alignItems:'center',
            }}>
              <AvatarFigure value={userAvatar} size={92} />
              <div style={{ fontSize:24, fontWeight:900, color:'#3D2010', marginTop:12, marginBottom:6, letterSpacing:.2, textAlign:'center' }}>
                {userName || 'Joueur'}
              </div>
              <div style={{ padding:'4px 12px', borderRadius:12, background:'rgba(212,160,23,.22)', border:'1px solid rgba(193,127,60,.55)', marginBottom:8 }}>
                <span style={{ fontSize:11, fontWeight:800, color:'#7D4E1F', letterSpacing:.5 }}>
                  {LEVEL_NAMES[level]}
                </span>
              </div>
              {userCode && (
                <div style={{ fontSize:11, color:'#8B6A5A', marginBottom:2, fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace', letterSpacing:1.5 }}>
                  Code · {userCode}
                </div>
              )}
              {joinDate && (
                <div style={{ fontSize:11, color:'#A88060', marginBottom:14 }}>
                  Membre depuis le {joinDate}
                </div>
              )}

              <div style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:joinDate?0:14, marginBottom:6 }}>
                <span style={{ fontSize:10, fontWeight:700, color:'#8B6A5A', textTransform:'uppercase', letterSpacing:2 }}>
                  NIVEAU {level}
                </span>
                <span style={{ fontSize:11, color:'#7D4E1F', fontWeight:600 }}>
                  {xp} / {xpReq} XP
                </span>
              </div>
              <div style={{ width:'100%', height:8, borderRadius:4, background:'rgba(74,44,23,.15)', overflow:'hidden', marginBottom:12 }}>
                <div style={{ height:'100%', width:`${xpPct}%`, background:GOLD, transition:'width .8s cubic-bezier(.36,.07,.19,.97)' }} />
              </div>
              <button onClick={onOpenLevels} style={{ width:'100%', padding:'9px', borderRadius:11, background:'rgba(255,255,255,.5)', border:'1px solid rgba(193,127,60,.4)', color:'#4A2C17', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                Voir tous les niveaux →
              </button>
            </section>

            {/* 2. Bio courte (affichage uniquement) */}
            {userBio && (
              <section style={{
                borderRadius:14, padding:'14px 16px',
                background:C.card, border:`1px solid ${C.border}`,
                fontSize:13, color:C.text, lineHeight:1.5, fontStyle:'italic',
                position:'relative',
              }}>
                <span style={{ fontSize:18, color:'#C17F3C', position:'absolute', top:6, left:10, opacity:.6 }}>"</span>
                <div style={{ padding:'0 14px' }}>{userBio}</div>
                <span style={{ fontSize:18, color:'#C17F3C', position:'absolute', bottom:0, right:10, opacity:.6 }}>"</span>
              </section>
            )}

            {/* 3. Stats grid 2×3 */}
            <section>
              <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>STATISTIQUES</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { label:'Total gagné',  value:totalEarned, sub:'cookies', col:'#D4A017' },
                  { label:'Série',         value:streak,      sub:`jour${streak>1?'s':''}`, col:'#E07040' },
                  { label:'Niveau',        value:level,       sub:LEVEL_NAMES[level], col:'#8B5A2B' },
                  { label:'Succès',        value:`${earnedAchievements.length}/${achievementsTotal}`, sub:'débloqués', col:'#C17F3C' },
                  { label:'Items',         value:`${unlocked.length}/${REWARDS.length}`, sub:'possédés', col:'#7D4E1F' },
                  { label:'Marché',        value:marketRealized, sub:`cookies $CKM`, col:'#A0784E' },
                ].map(st => (
                  <div key={st.label} style={{ borderRadius:14, background:C.card, border:`1px solid ${C.border}`, padding:'12px 14px' }}>
                    <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:4 }}>{st.label}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:st.col, lineHeight:1.1 }}>{st.value}</div>
                    <div style={{ fontSize:10, color:C.muted, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{st.sub}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Mes Badges (boutique + secrets découverts) */}
            <section>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>MES BADGES</div>
                <div style={{ fontSize:11, color:C.muted }}>{badges.length + secretBadgesUnlocked.length}</div>
              </div>
              {badges.length === 0 && secretBadgesUnlocked.length === 0 ? (
                <div style={{ fontSize:12, color:C.muted, fontStyle:'italic', padding:'10px 4px' }}>Aucun badge encore — direction la boutique !</div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
                  {/* Badges secrets en premier (effet "découvert" plus marquant) */}
                  {secretBadgesUnlocked.map(sb => (
                    <div key={sb.id} title={sb.description} style={{
                      borderRadius:12, padding:'10px 4px',
                      background: sb.bgGradient,
                      border: `2px solid ${sb.color}`,
                      boxShadow: `0 4px 12px ${sb.color}33`,
                      color:'#fff', textAlign:'center', position:'relative',
                    }}>
                      <div style={{ fontSize:24, marginBottom:4 }}>{sb.icon}</div>
                      <div style={{ fontSize:9, fontWeight:800, lineHeight:1.2 }}>{sb.shortName}</div>
                      <div style={{
                        position:'absolute', top:-6, right:-6,
                        fontSize:8, fontWeight:900, letterSpacing:.5,
                        background:'#3D2010', color:'#F0C050',
                        padding:'2px 6px', borderRadius:8,
                        border:'1px solid rgba(212,160,23,.5)',
                      }}>SECRET</div>
                    </div>
                  ))}
                  {badges.map(b => (
                    <div key={b.id} style={{ borderRadius:12, background:C.card, border:'1px solid rgba(212,160,23,.4)', padding:'10px 4px', textAlign:'center' }}>
                      <div style={{ fontSize:24, marginBottom:4 }}>{b.emoji}</div>
                      <div style={{ fontSize:9, fontWeight:700, color:C.text, lineHeight:1.2 }}>{b.name.replace(/^Badge\s+/, '')}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 5. Mes Amis */}
            <FriendsSection userCode={userCode} myCoins={coins} onOpenProfile={onOpenFriendProfile} C={C} />

            {/* 6. Boutons d'édition (pseudo / avatar / bio) */}
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:6 }}>
              <button onClick={()=>setShowChangeName(true)} style={{ width:'100%', padding:'13px 0', borderRadius:14, background:'transparent', border:`1.5px solid ${C.border}`, color:C.text, fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <span>Modifier mon pseudo</span>
                <span style={{ fontSize:11, fontWeight:800, color:'#D4A017' }}>· payant 🍪</span>
              </button>
              <button onClick={()=>{ setEditAvatar(userAvatar); setEditing(true); }} style={{ width:'100%', padding:'13px 0', borderRadius:14, background:'transparent', border:`1.5px solid ${C.border}`, color:C.text, fontSize:13, fontWeight:700 }}>
                Modifier mon avatar
              </button>
              <button onClick={()=>setShowChangeBio(true)} style={{ width:'100%', padding:'13px 0', borderRadius:14, background:'transparent', border:`1.5px solid ${C.border}`, color:C.text, fontSize:13, fontWeight:700 }}>
                {userBio ? 'Modifier ma bio' : '+ Ajouter une bio'}
              </button>
            </div>

            {/* 7. Réinitialiser ma progression */}
            {onReset && (
              <section style={{ marginTop:8 }}>
                <ResetProgressButton onReset={onReset} C={C} />
              </section>
            )}

            {/* 8. Crédit auteur — toujours en pied de profil (PHASE 2) */}
            <div style={{ textAlign:'center', marginTop:24, paddingBottom:16, fontSize:11, color:'rgba(139,106,90,0.6)', fontWeight:500 }}>
              Réalisé avec <strong style={{ color:'#C17F3C' }}>Claude Code</strong> par <strong style={{ color:'#C17F3C' }}>Cookithan</strong>
              <div style={{ fontSize:10, marginTop:2, opacity:0.7 }}>
                CookiMiner v1.0
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

      {showChangeBio && (
        <ChangeBioModal
          currentBio={userBio}
          onSave={confirmBio}
          onClose={()=>setShowChangeBio(false)}
          C={C}
        />
      )}
    </div>
  );
}

import { useState } from "react";
import { ChevronLeft, Settings, Mail, User, MessageSquare, Palette } from "lucide-react";
import { LEVEL_NAMES, REWARDS } from "../../data/constants.js";
import { GOLD } from "../../data/themes.js";
import { APP_INFO } from "../../lib/appInfo.js";
import { getSanction } from "../../data/sanctions.js";
import { SECRET_BADGES } from "../../data/secretBadges.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { ChangeNameModal } from "../modals/ChangeNameModal.jsx";
import { ChangeBioModal } from "../modals/ChangeBioModal.jsx";
import { BadgeOriginModal } from "../modals/BadgeOriginModal.jsx";
import { getBadgeOrigin } from "../../utils/badgeOrigin.js";
import { formatPlayTime } from "../../utils/formatPlayTime.js";
import { FriendsSection } from "../profile/FriendsSection.jsx";
import { ResetProgressButton } from "../profile/ResetProgressButton.jsx";
import { getNameStyle } from "../../utils/legend.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   ProfileOverlay — plein écran z-index 60 (PHASE 5)
   ────────────────────────────────────────────────────
   Structure de la vue normale :
     1. Carte profil principale (gradient beige) — avatar 92px, pseudo, titre,
        code ami, "membre depuis…", barre XP, bouton "Voir les niveaux"
     2. Bio courte (affichage uniquement si remplie)
     3. Stats grid 2×3 (Total gagné · Série · Niveau · Succès · Items · CKM)
     4. Mes Badges
     4b. Entrée « Ma Collection » (v1.30 — l'équipement se fait là-bas)
     5. Mes Amis (FriendsSection)
     6. Boutons d'édition : pseudo (payant), bio (gratuit)
     7. Réinitialiser ma progression (double validation, ResetProgressButton)
     8. Crédit "Réalisé par Cookithan"

   v1.30 — le Profil ne gère plus QUE l'identité. Le choix de l'avatar,
   des skins et des titres a déménagé dans CollectionOverlay : un seul
   écran pour équiper. Le pseudo passe par la ChangeNameModal payante,
   la bio par ChangeBioModal (gratuite). Le compte d'achievementsTotal
   ignore master_succes si non révélé.
═══════════════════════════════════════════════════════ */

export function ProfileOverlay({
  onClose, onOpenLevels, onOpenSettings, onOpenCollection,
  userName, setUserName, userAvatar, joinDate,
  coins, spendCoins, nameChangeCount, setNameChangeCount,
  userCode,
  userBio, setUserBio,
  level, xp, xpReq, totalEarned, streak, unlocked,
  earnedAchievements, achievementsTotal,
  marketRealized = 0,
  totalPlayTime = 0,
  activeTitle,
  onReset,
  supabaseEnabled = false,
  supabaseSyncOk  = false,
  unreadInboxCount = 0,
  onOpenInbox,
  onOpenFriendProfile,
  cafes = 0,
  onSendGift,
  C
}) {
  const { t, localizedField, localizedLevelName } = useTranslation();
  const levelLabel = localizedLevelName(level) || LEVEL_NAMES[level];
  const [showChangeName, setShowChangeName] = useState(false);
  const [showChangeBio,  setShowChangeBio]  = useState(false);
  /* Badge cliqué → modale "comment j'ai débloqué". null = pas de modale. */
  const [originBadge, setOriginBadge] = useState(null);
  const originInfo = originBadge ? getBadgeOrigin(originBadge.id) : null;

  const xpPct = Math.min((xp/xpReq)*100, 100);
  const badges = REWARDS.filter(r => r.type==='Badge'  && unlocked.includes(r.id));
  /* Badges secrets débloqués (BRIEF_BADGES_SECRETS). Les non-débloqués
     restent invisibles — sinon ce ne sont plus des secrets. */
  const secretBadgesUnlocked = Object.values(SECRET_BADGES).filter(b => unlocked.includes(b.id));

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
          {t('profile.title')}
          {supabaseEnabled && supabaseSyncOk ? (
            <span style={{ fontSize:10, fontWeight:700, color:'#D4A017', letterSpacing:.3 }} title={t('profile.sync_online_title')}>● {t('profile.synced')}</span>
          ) : (
            <span style={{ fontSize:10, fontWeight:700, color:'#8B6A5A', letterSpacing:.3 }} title={t('profile.sync_offline_title')}>○ {t('profile.offline')}</span>
          )}
        </span>
        {onOpenInbox && (
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
        <button onClick={onOpenSettings} aria-label={t('settings.title')} style={{ width:34, height:34, borderRadius:11, background:C.card2, color:C.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Settings size={15} />
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'18px 18px 28px', display:'flex', flexDirection:'column', gap:18 }}>

        {(
          <>
            {/* Bandeau de sanction privé — visible UNIQUEMENT par le user
                concerné (pas dans le classement public ni les profils amis).
                Pas de blocage gameplay, juste un message pédagogique. */}
            {(() => {
              const sanction = getSanction(userCode);
              if(!sanction) return null;
              return (
                <section style={{
                  background:'linear-gradient(135deg, #5C3317 0%, #7D4818 100%)',
                  border:'1.5px solid #C17F3C',
                  borderRadius:14,
                  padding:'14px 16px',
                  marginBottom:14,
                  color:'#FFE066',
                  boxShadow:'0 4px 14px rgba(92,51,23,.4)',
                }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                    <div style={{ fontSize:24, lineHeight:1, flexShrink:0 }}>⚠️</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:900, letterSpacing:1.5, textTransform:'uppercase', color:'#FFB060', marginBottom:4 }}>
                        Compte sanctionné
                      </div>
                      <div style={{ fontSize:13, fontWeight:800, color:'#FFE066', marginBottom:6 }}>
                        {sanction.reason}
                      </div>
                      <div style={{ fontSize:11, color:'rgba(255,232,154,.8)', lineHeight:1.5, fontStyle:'italic' }}>
                        {sanction.detail}
                      </div>
                      <div style={{ fontSize:10, color:'rgba(255,232,154,.6)', marginTop:6 }}>
                        Date : {sanction.date} · Étiquette visible uniquement par toi.
                      </div>
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* 1. Carte profil principale (beige) — avatar + identité + XP */}
            <section style={{
              background:'linear-gradient(140deg,#F5E5C8,#E5CDA8)',
              borderRadius:22, padding:'22px 20px',
              boxShadow:'0 8px 24px rgba(139,106,90,.18)',
              border:'1px solid rgba(193,127,60,.35)',
              display:'flex', flexDirection:'column', alignItems:'center',
            }}>
              <AvatarFigure value={userAvatar} size={92} />
              {/* Key liée à activeTitle force React à remount le node DOM
                  à chaque changement de titre — sans ça, background-clip:text
                  + animation CSS gardent l'ancien rendu (carré de couleur). */}
              <div
                key={`pseudo-${activeTitle || 'none'}`}
                style={{
                  fontSize:24, fontWeight:900, color:'#3D2010',
                  marginTop:12, marginBottom:6, letterSpacing:.2, textAlign:'center',
                  ...(getNameStyle(userName, earnedAchievements, activeTitle) || {}),
                }}
              >
                {userName || 'Joueur'}
              </div>
              <div style={{ padding:'4px 12px', borderRadius:12, background:'rgba(212,160,23,.22)', border:'1px solid rgba(193,127,60,.55)', marginBottom:8 }}>
                <span style={{ fontSize:11, fontWeight:800, color:'#7D4E1F', letterSpacing:.5 }}>
                  {levelLabel}
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
                  {t('home.level_uppercase')} {level}
                </span>
                <span style={{ fontSize:11, color:'#7D4E1F', fontWeight:600 }}>
                  {xp} / {xpReq} XP
                </span>
              </div>
              <div style={{ width:'100%', height:8, borderRadius:4, background:'rgba(74,44,23,.15)', overflow:'hidden', marginBottom:12 }}>
                <div style={{ height:'100%', width:`${xpPct}%`, background:GOLD, transition:'width .8s cubic-bezier(.36,.07,.19,.97)' }} />
              </div>
              <button onClick={onOpenLevels} style={{ width:'100%', padding:'9px', borderRadius:11, background:'rgba(255,255,255,.5)', border:'1px solid rgba(193,127,60,.4)', color:'#4A2C17', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                {t('profile.see_all_levels')}
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
              <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>{t('profile.stats')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { label: t('profile.stat_total'),  value:totalEarned, sub: t('common.cookies'), col:'#D4A017' },
                  { label: t('profile.stat_streak'), value:streak,      sub: t('profile.day_unit', { n: streak, s: streak > 1 ? 's' : '' }), col:'#E07040' },
                  { label: t('profile.stat_level'),  value:level,       sub: levelLabel, col:'#8B5A2B' },
                  { label: t('profile.stat_achievements'), value:`${earnedAchievements.length}/${achievementsTotal}`, sub: t('profile.unlocked_lc'), col:'#C17F3C' },
                  { label: t('profile.stat_items'),  value:`${unlocked.length}/${REWARDS.length}`, sub: t('profile.owned_lc'), col:'#7D4E1F' },
                  { label: t('profile.stat_market'), value:marketRealized, sub: t('profile.cookies_ckm'), col:'#A0784E' },
                  { label: t('profile.stat_playtime'), value:formatPlayTime(totalPlayTime), sub: t('profile.on_app'), col:'#5C3317' },
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
                <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>{t('profile.my_badges')}</div>
                <div style={{ fontSize:11, color:C.muted }}>{badges.length + secretBadgesUnlocked.length}</div>
              </div>
              {badges.length === 0 && secretBadgesUnlocked.length === 0 ? (
                <div style={{ fontSize:12, color:C.muted, fontStyle:'italic', padding:'10px 4px' }}>{t('profile.no_badge_yet')}</div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
                  {/* Badges secrets en premier (effet "découvert" plus marquant) */}
                  {secretBadgesUnlocked.map(sb => (
                    <button
                      key={sb.id}
                      onClick={()=>setOriginBadge(sb)}
                      aria-label={`Voir comment j'ai débloqué ${sb.shortName}`}
                      style={{
                        borderRadius:12, padding:'10px 4px',
                        background: sb.bgGradient,
                        border: `2px solid ${sb.color}`,
                        boxShadow: `0 4px 12px ${sb.color}33`,
                        color:'#fff', textAlign:'center', position:'relative',
                        cursor:'pointer', font:'inherit',
                      }}
                    >
                      <div style={{ fontSize:24, marginBottom:4 }}>{sb.icon}</div>
                      <div style={{ fontSize:9, fontWeight:800, lineHeight:1.2 }}>{sb.shortName}</div>
                      <div style={{
                        position:'absolute', top:-6, right:-6,
                        fontSize:8, fontWeight:900, letterSpacing:.5,
                        background:'#3D2010', color:'#F0C050',
                        padding:'2px 6px', borderRadius:8,
                        border:'1px solid rgba(212,160,23,.5)',
                      }}>SECRET</div>
                    </button>
                  ))}
                  {badges.map(b => (
                    <button
                      key={b.id}
                      onClick={()=>setOriginBadge(b)}
                      aria-label={`Voir comment j'ai débloqué ${b.name}`}
                      style={{
                        borderRadius:12, background:C.card,
                        border:'1px solid rgba(212,160,23,.4)',
                        padding:'10px 4px', textAlign:'center',
                        cursor:'pointer', font:'inherit', color:'inherit',
                      }}
                    >
                      <div style={{ fontSize:24, marginBottom:4 }}>{b.emoji}</div>
                      <div style={{ fontSize:9, fontWeight:700, color:C.text, lineHeight:1.2 }}>{localizedField(b, 'name', 'REWARDS').replace(/^Badge\s+/, '').replace(/\sBadge$/, '')}</div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* 4b. Ma Collection — porte d'entrée unique vers l'équipement
                (avatars, skins, titres, thèmes, musiques). Les sélecteurs
                vivaient ici avant la v1.30 ; ils ont déménagé pour qu'il
                n'y ait plus qu'UN seul endroit où équiper. */}
            {onOpenCollection && (
              <button
                onClick={onOpenCollection}
                style={{
                  width:'100%', borderRadius:16,
                  background:'linear-gradient(140deg, rgba(212,160,23,.12), rgba(193,127,60,.08))',
                  border:'1.5px solid rgba(212,160,23,.45)',
                  padding:'14px 16px',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  cursor:'pointer', textAlign:'left',
                }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
                  <div style={{
                    width:38, height:38, borderRadius:10,
                    background:'rgba(212,160,23,.16)',
                    border:'1px solid rgba(212,160,23,.35)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0,
                  }}>
                    <Palette size={18} color="#D4A017" />
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text }}>
                      {t('collection.open')}
                    </div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                      {t('collection.open_sub')}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize:18, color:'#D4A017', flexShrink:0 }}>→</span>
              </button>
            )}

            {/* 5. Mes Amis */}
            <FriendsSection
              userCode={userCode}
              myCoins={coins}
              myCafes={cafes}
              onOpenProfile={onOpenFriendProfile}
              onSendGift={onSendGift}
              C={C}
            />

            {/* 6. Boutons d'édition (pseudo / avatar / bio) — fond carte
                + bord doré + icône pour ressortir sur tous les thèmes
                (transparent + border C.border se fondait avant). */}
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:6 }}>
              <button
                onClick={()=>setShowChangeName(true)}
                style={{
                  width:'100%', padding:'13px 14px', borderRadius:14,
                  background: `linear-gradient(135deg, ${C.card}, ${C.card2})`,
                  border:'1.5px solid rgba(212,160,23,.5)',
                  color:C.text, fontSize:13, fontWeight:800,
                  boxShadow:'0 2px 10px rgba(0,0,0,.08)',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  cursor:'pointer',
                }}
              >
                <User size={15} color="#D4A017" />
                <span>{t('profile.edit_name')}</span>
                <span style={{ fontSize:11, fontWeight:800, color:'#D4A017' }}>· payant 🍪</span>
              </button>
              <button
                onClick={()=>setShowChangeBio(true)}
                style={{
                  width:'100%', padding:'13px 14px', borderRadius:14,
                  background: `linear-gradient(135deg, ${C.card}, ${C.card2})`,
                  border:'1.5px solid rgba(212,160,23,.5)',
                  color:C.text, fontSize:13, fontWeight:800,
                  boxShadow:'0 2px 10px rgba(0,0,0,.08)',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  cursor:'pointer',
                }}
              >
                <MessageSquare size={15} color="#D4A017" />
                {userBio ? t('modal.edit_bio') : '+ ' + t('modal.add_bio')}
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
              {t('profile.realized_by')} <strong style={{ color:'#C17F3C' }}>Cookithan</strong>
              <div style={{ fontSize:10, marginTop:2, opacity:0.7 }}>
                CookiMiner v{APP_INFO.version}
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
          userCode={userCode}
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

      {originBadge && originInfo && (
        <BadgeOriginModal
          badge={originBadge}
          origin={originInfo}
          onClose={()=>setOriginBadge(null)}
          C={C}
        />
      )}
    </div>
  );
}

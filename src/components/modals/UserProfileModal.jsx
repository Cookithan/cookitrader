import { useEffect, useState } from "react";
import { getPublicProfile, sendReaction } from "../../lib/supabaseSync.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { LEVEL_NAMES, REWARDS } from "../../data/constants.js";
import { SECRET_BADGES } from "../../data/secretBadges.js";

/* ════════════════════════════════════════════════════
   UserProfileModal — vue résumée d'un ami / du top 1 (BRIEF_PROFIL_VISIBLE)
   ────────────────────────────────────────────────────
   Modale slide-up plein largeur (max 430px). Charge le profil via
   getPublicProfile(userCode) au mount. Si profil absent → message
   d'erreur. La date d'inscription est cachée si isCrown (pour le top 1).

   Variantes :
     · isCrown=true  → bandeau '👑 Roi du classement' + pas de date
     · isCrown=false → date d'inscription en pied

   Pas de bouton "ajouter en ami" dans la modale (UX simple — on copie
   le code et on l'ajoute via la liste d'amis si on veut).

   Pas de rouge ni de vert. Réutilise les keyframes inboxSlideUp/Down
   (déjà dans globalStyles).

   Props :
     userCode  — string XXX-XXX
     isCrown   — bool (true = top 1)
     onClose   — () → ferme la modale (animation gérée ici)
     C         — palette
═══════════════════════════════════════════════════════ */

function formatJoinDate(raw){
  if(!raw) return null;
  /* `join_date` est stocké en string FR (ex: "06/05/2026") par
     l'onboarding actuel. On essaie de le présenter tel quel ; si
     c'est un ISO on le convertit en FR. */
  if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) return raw;
  try {
    return new Date(raw).toLocaleDateString('fr-FR');
  } catch {
    return raw;
  }
}

export function UserProfileModal({ userCode, isCrown = false, currentUserCode, friendCodes = [], onClose, C }){
  /* Barre de réactions visible si l'utilisateur consulté est :
     - un ami (status='accepted'), OU
     - le top 1 du classement (isCrown=true)
     Et jamais soi-même. */
  const isOther  = !!(currentUserCode && userCode && currentUserCode !== userCode);
  const isFriend = isOther && friendCodes.includes(userCode);
  const canReact = isOther && (isFriend || isCrown);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    if(!userCode) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const p = await getPublicProfile(userCode);
      if(alive){
        setProfile(p);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userCode]);

  const handleClose = () => {
    if(closing) return;
    setClosing(true);
    setTimeout(onClose, 280);
  };

  const handleCopy = async () => {
    if(!profile?.user_code) return;
    try{
      await navigator.clipboard.writeText(profile.user_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }catch{}
  };

  return (
    <div
      onClick={handleClose}
      className={closing ? 'inbox-overlay-out' : 'inbox-overlay-in'}
      style={{
        position:'fixed', inset:0, zIndex:90,
        backdropFilter:'blur(4px)',
        display:'flex', alignItems:'flex-end', justifyContent:'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={closing ? 'inbox-slide-down' : 'inbox-slide-up'}
        style={{
          width:'100%', maxWidth:430,
          background:C.bg,
          borderTopLeftRadius:24, borderTopRightRadius:24,
          maxHeight:'85vh', display:'flex', flexDirection:'column',
          boxShadow:'0 -8px 32px rgba(15,8,4,.4)',
          position:'relative', overflow:'hidden',
        }}
      >
        {/* Drag handle */}
        <div style={{ width:40, height:4, background:C.border, borderRadius:2, margin:'10px auto 0', flexShrink:0 }} />

        {/* Bouton fermer */}
        <button
          onClick={handleClose}
          aria-label="Fermer"
          style={{
            position:'absolute', top:14, right:14,
            width:32, height:32, borderRadius:10,
            background:C.card, border:`1px solid ${C.border}`,
            color:C.muted, fontSize:16, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:1,
          }}
        >✕</button>

        {/* Contenu scrollable */}
        <div style={{ overflowY:'auto', padding:'8px 18px 24px' }}>
          {loading ? (
            <div style={{ padding:'60px 20px', textAlign:'center', color:C.muted, fontSize:13 }}>
              Chargement du profil…
            </div>
          ) : !profile ? (
            <div style={{ padding:'60px 20px', textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:10 }}>🤷</div>
              <div style={{ fontSize:14, fontWeight:800, color:C.text }}>Profil introuvable</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>
                Ce joueur n'existe plus ou a été supprimé.
              </div>
            </div>
          ) : (
            <ProfileContent
              profile={profile}
              isCrown={isCrown}
              canReact={canReact}
              currentUserCode={currentUserCode}
              copied={copied}
              onCopy={handleCopy}
              C={C}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileContent({ profile, isCrown, canReact, currentUserCode, copied, onCopy, C }){
  const joinDate = formatJoinDate(profile.join_date);
  const levelTitle = LEVEL_NAMES[profile.level] || `Niveau ${profile.level ?? 1}`;
  const cookies     = Number(profile.cookies)      || 0;
  const totalEarned = Number(profile.total_earned) || 0;
  const streak      = Number(profile.streak)       || 0;
  const level       = Number(profile.level)        || 1;
  const userBio     = (profile.user_bio || '').trim();

  /* Badges débloqués (sync via colonne `badges` text comma-separated).
     On croise avec REWARDS (badges classiques) + SECRET_BADGES (secrets). */
  const badgeIds = (profile.badges || '').split(',').filter(Boolean);
  const badges = REWARDS.filter(r => r.type === 'Badge' && badgeIds.includes(r.id));
  const secretBadges = Object.values(SECRET_BADGES).filter(b => badgeIds.includes(b.id));

  return (
    <div style={{ paddingTop:6 }}>
      {/* Bandeau 👑 (top 1 uniquement) */}
      {isCrown && (
        <div style={{
          background:'linear-gradient(135deg,#F0C050,#D4A017)',
          color:'#fff',
          padding:'6px 14px', borderRadius:100,
          fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:2,
          textAlign:'center', margin:'0 auto 14px',
          width:'fit-content',
          boxShadow:'0 4px 12px rgba(212,160,23,.4)',
        }}>
          👑 Roi du classement
        </div>
      )}

      {/* En-tête : avatar + identité — flex column pour vraiment centrer
          l'avatar (textAlign:center ne centre que les inline). */}
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        marginBottom:14,
      }}>
        <AvatarFigure value={profile.user_avatar} size={92} />
        <div style={{ fontSize:22, fontWeight:900, color:C.text, marginTop:12, textAlign:'center' }}>
          {profile.user_name || 'Joueur'}
        </div>
        <div style={{
          fontSize:11, color:'#D4A017', fontWeight:800,
          textTransform:'uppercase', letterSpacing:2, marginTop:5,
          textAlign:'center',
        }}>
          {levelTitle}
        </div>
        <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
          Niveau {level}
        </div>
      </div>

      {/* Bio (si non vide) */}
      {userBio && (
        <div style={{
          background:C.card,
          borderRadius:14, padding:'12px 14px',
          marginBottom:12, border:`1.5px solid ${C.border}`,
          fontSize:13, color:C.text, lineHeight:1.45, fontStyle:'italic',
          position:'relative',
        }}>
          <span style={{ fontSize:18, color:'#C17F3C', position:'absolute', top:6, left:10, opacity:.6 }}>"</span>
          <div style={{ padding:'0 14px' }}>{userBio}</div>
          <span style={{ fontSize:18, color:'#C17F3C', position:'absolute', bottom:0, right:10, opacity:.6 }}>"</span>
        </div>
      )}

      {/* Stats grille 2×2 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
        <StatBlock icon="🍪" value={cookies.toLocaleString('fr-FR')}     label="Cookies"     C={C} />
        <StatBlock icon="📊" value={totalEarned.toLocaleString('fr-FR')} label="Total gagné" C={C} />
        <StatBlock icon="🔥" value={streak}                              label="Série"        C={C} />
        <StatBlock icon="⭐" value={level}                               label="Niveau"       C={C} />
      </div>

      {/* Carte classements */}
      <div style={{
        background:'linear-gradient(140deg,#4A2C17,#7D4E1F)',
        borderRadius:16, padding:14, color:'#fff', marginBottom:12,
      }}>
        <div style={{
          fontSize:11, color:'rgba(255,255,255,.6)',
          textTransform:'uppercase', letterSpacing:2, marginBottom:10,
        }}>
          🏆 Classements
        </div>
        <div style={{ display:'flex', justifyContent:'space-around', textAlign:'center' }}>
          <div>
            <div style={{ fontSize:24, fontWeight:900, color:'#F0C050' }}>
              {profile.cookies_rank ? `#${profile.cookies_rank}` : '—'}
            </div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:2 }}>
              🍪 Cookies
            </div>
          </div>
          <div style={{ width:1, background:'rgba(255,255,255,.15)' }} />
          <div>
            <div style={{ fontSize:24, fontWeight:900, color:'#F0C050' }}>
              {profile.market_rank ? `#${profile.market_rank}` : '—'}
            </div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:2 }}>
              📈 Marché
            </div>
          </div>
        </div>
      </div>

      {/* Badges — uniquement si l'utilisateur en a au moins un */}
      {(badges.length > 0 || secretBadges.length > 0) && (
        <div style={{
          background:C.card, borderRadius:14, padding:'12px 14px',
          border:`1.5px solid ${C.border}`, marginBottom:12,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>BADGES</div>
            <div style={{ fontSize:11, color:C.muted }}>{badges.length + secretBadges.length}</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
            {/* Secrets en premier */}
            {secretBadges.map(sb => (
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
              <div key={b.id} title={b.desc || b.name} style={{
                borderRadius:12, background:C.card2, border:'1px solid rgba(212,160,23,.4)', padding:'10px 4px', textAlign:'center'
              }}>
                <div style={{ fontSize:24, marginBottom:4 }}>{b.emoji}</div>
                <div style={{ fontSize:9, fontWeight:700, color:C.text, lineHeight:1.2 }}>{b.name.replace(/^Badge\s+/, '')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Réactions emoji — pour les amis ET le top 1 (BRIEF_REACTIONS) */}
      {canReact && (
        <ReactionBar
          senderCode={currentUserCode}
          recipientCode={profile.user_code}
          recipientName={profile.user_name || 'ce joueur'}
          C={C}
        />
      )}

      {/* Code ami + bouton copier */}
      <div style={{
        background:C.card, borderRadius:14, padding:'12px 14px',
        border:`1.5px solid ${C.border}`, textAlign:'center',
        marginBottom:12,
      }}>
        <div style={{
          fontSize:10, color:C.muted, textTransform:'uppercase',
          letterSpacing:2, marginBottom:4, fontWeight:700,
        }}>
          Code ami
        </div>
        <div style={{
          fontSize:18, fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
          fontWeight:800, color:'#D4A017', letterSpacing:3,
        }}>
          {profile.user_code}
        </div>
        <button
          onClick={onCopy}
          style={{
            marginTop:8, padding:'7px 14px',
            background: copied ? 'rgba(212,160,23,.18)' : C.bg,
            border:`1.5px solid ${copied ? 'rgba(212,160,23,.55)' : C.border}`,
            borderRadius:10,
            fontSize:12, fontWeight:700,
            color: copied ? '#D4A017' : C.text,
            cursor:'pointer', transition:'all .25s',
          }}
        >
          {copied ? '✓ Copié' : '📋 Copier le code'}
        </button>
      </div>

      {/* Date d'inscription (sauf isCrown) */}
      {joinDate && !isCrown && (
        <div style={{
          textAlign:'center', fontSize:11, color:C.muted, fontStyle:'italic',
          marginTop:4,
        }}>
          Joueur depuis le {joinDate}
        </div>
      )}
    </div>
  );
}

function StatBlock({ icon, value, label, C }){
  return (
    <div style={{
      background:C.card, borderRadius:14,
      padding:'12px 8px', border:`1.5px solid ${C.border}`,
      textAlign:'center',
    }}>
      <div style={{ fontSize:18, marginBottom:2 }}>{icon}</div>
      <div style={{ fontSize:18, fontWeight:900, color:C.text, lineHeight:1.1 }}>
        {value}
      </div>
      <div style={{
        fontSize:10, color:C.muted,
        textTransform:'uppercase', letterSpacing:1,
        marginTop:3, fontWeight:700,
      }}>
        {label}
      </div>
    </div>
  );
}

const REACTIONS = [
  { emoji:'👏', label:'Bravo' },
  { emoji:'☕', label:'Café'  },
  { emoji:'🔥', label:'Feu'   },
  { emoji:'🍪', label:'Cookie'},
];

function ReactionBar({ senderCode, recipientCode, recipientName, C }){
  const [feedback, setFeedback] = useState(null); // { type:'ok'|'err', msg }
  const [sending,  setSending]  = useState(false);

  const handleSend = async (emoji) => {
    if(sending) return;
    setSending(true);
    setFeedback(null);
    const result = await sendReaction(senderCode, recipientCode, emoji);
    setSending(false);
    if(result.error){
      setFeedback({ type:'err', msg: result.error });
    } else {
      setFeedback({ type:'ok', msg:`${emoji} envoyé à ${recipientName} !` });
    }
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div style={{
      background:C.card, borderRadius:14, padding:'14px 14px 12px',
      border:`1.5px solid ${C.border}`, marginBottom:12,
    }}>
      <div style={{
        fontSize:11, color:C.muted, fontWeight:700,
        textTransform:'uppercase', letterSpacing:2,
        marginBottom:10, textAlign:'center',
      }}>
        💬 Envoie une réaction
      </div>

      <div style={{ display:'flex', justifyContent:'space-around', gap:8 }}>
        {REACTIONS.map(r => (
          <button
            key={r.emoji}
            onClick={() => handleSend(r.emoji)}
            disabled={sending}
            aria-label={`Envoyer ${r.label}`}
            title={r.label}
            style={{
              width:56, height:56, borderRadius:14,
              background:C.bg,
              border:`1.5px solid ${C.border}`,
              fontSize:28, lineHeight:1,
              cursor: sending ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'transform .12s ease',
            }}
          >
            {r.emoji}
          </button>
        ))}
      </div>

      {/* Feedback café-only : or pour succès, moka pour erreur */}
      {feedback && (
        <div style={{
          marginTop:10, padding:'7px 10px',
          borderRadius:10, fontSize:12, fontWeight:700,
          textAlign:'center',
          background: feedback.type === 'ok' ? 'rgba(212,160,23,.15)' : 'rgba(125,78,31,.15)',
          color:      feedback.type === 'ok' ? '#C8960C' : '#7D4E1F',
        }}>
          {feedback.msg}
        </div>
      )}
    </div>
  );
}

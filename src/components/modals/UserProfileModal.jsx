import { useEffect, useState } from "react";
import { getPublicProfile, sendReaction, sendFriendRequest } from "../../lib/supabaseSync.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { LEVEL_NAMES, REWARDS } from "../../data/constants.js";
import { SECRET_BADGES } from "../../data/secretBadges.js";
import { getNameStyle } from "../../utils/legend.js";
import { formatPlayTime } from "../../utils/formatPlayTime.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   UserProfileModal — vue résumée d'un ami / du top 1 (BRIEF_PROFIL_VISIBLE)
   ────────────────────────────────────────────────────
   Modale slide-up plein largeur (max 430px). Charge le profil via
   getPublicProfile(userCode) au mount. Si profil absent → message
   d'erreur. La date d'inscription est cachée si isCrown (pour le top 1).

   Variantes :
     · isCrown=true  → bandeau '👑 Roi du classement' + pas de date
     · isCrown=false → date d'inscription en pied

   Bouton « Ajouter en ami » depuis le 08/09/2026. Avant, il fallait
   copier le code puis aller le coller dans la liste d'amis : trois
   écrans pour un geste, et le classement — l'endroit même où l'on
   croise des gens à ajouter — n'y menait pas. Le bouton n'apparaît que
   pour quelqu'un d'autre qui n'est pas déjà un ami.

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

/* "Vu il y a X" lisible. Renvoie null si raw absent. */
function formatLastSeen(raw){
  if(!raw) return null;
  const ms = Date.now() - new Date(raw).getTime();
  if(!Number.isFinite(ms) || ms < 0) return null;
  const min = Math.floor(ms / 60_000);
  if(min < 60)    return `Vu il y a ${Math.max(min, 1)} min`;
  const h = Math.floor(min / 60);
  if(h < 24)      return `Vu il y a ${h} h`;
  const d = Math.floor(h / 24);
  if(d < 7)       return `Vu il y a ${d} j`;
  return `Vu il y a +${Math.floor(d/7)} sem`;
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
              isOther={isOther}
              isFriend={isFriend}
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

function ProfileContent({ profile, isCrown, canReact, currentUserCode, isOther, isFriend, copied, onCopy, C }){
  const { t, localizedLevelName } = useTranslation();
  const joinDate = formatJoinDate(profile.join_date);
  const levelTitle = (localizedLevelName(profile.level) || LEVEL_NAMES[profile.level]) || t('modal.level_n', { n: profile.level ?? 1 });
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
        <div style={{
          fontSize:22, fontWeight:900, color:C.text, marginTop:12, textAlign:'center',
          ...(getNameStyle(profile.user_name, profile.earned_achievements, profile.active_title) || {}),
        }}>
          {profile.user_name || 'Joueur'}
        </div>
        {(profile.prestige_level || 0) > 0 && (
          <div title={`Prestige ${profile.prestige_level} · multiplicateur x${(1 + profile.prestige_level * 0.1).toFixed(1)}`} style={{
            fontSize:14, fontWeight:800, color:'#D4A017', marginTop:4, letterSpacing:.5,
          }}>
            {profile.prestige_level <= 5 ? '👑'.repeat(profile.prestige_level) : `👑×${profile.prestige_level}`}
          </div>
        )}
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

        {/* Présence : pastille caramel pulse si en ligne, sinon "Vu il y a…" */}
        {profile.is_online ? (
          <div style={{
            display:'inline-flex', alignItems:'center', gap:6, marginTop:8,
            padding:'3px 10px', borderRadius:10,
            background:'linear-gradient(135deg, rgba(212,160,23,.18), rgba(193,127,60,.18))',
            border:'1px solid rgba(212,160,23,.5)',
          }}>
            <span style={{
              width:7, height:7, borderRadius:'50%',
              background:'#D4A017',
              boxShadow:'0 0 6px rgba(212,160,23,.85)',
              animation:'pulse-dot 1.6s ease-in-out infinite',
            }} />
            <span style={{ fontSize:11, fontWeight:800, color:'#D4A017', letterSpacing:.3 }}>
              En ligne
            </span>
          </div>
        ) : (() => {
          const seen = formatLastSeen(profile.last_active);
          return seen ? (
            <div style={{ fontSize:11, color:C.muted, marginTop:6, fontStyle:'italic' }}>
              {seen}
            </div>
          ) : null;
        })()}
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

      {/* Stats grille — 2 colonnes, 3 lignes (ajout du temps total). */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
        <StatBlock icon="🍪" value={cookies.toLocaleString('fr-FR')}     label="Cookies"     C={C} />
        <StatBlock icon="📊" value={totalEarned.toLocaleString('fr-FR')} label="Total gagné" C={C} />
        <StatBlock icon="🔥" value={streak}                              label="Série"        C={C} />
        <StatBlock icon="⭐" value={level}                               label="Niveau"       C={C} />
        <StatBlock icon="⏱️" value={formatPlayTime(profile.total_play_time)} label="Temps total" C={C} />
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
        {/* Le geste principal : l'ajouter. Le code reste juste dessous,
            pour qui veut le transmettre ailleurs. */}
        {isOther && (
          <BoutonAmi
            monCode={currentUserCode}
            sonCode={profile.user_code}
            dejaAmi={isFriend}
          />
        )}

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

/* ── AJOUTER EN AMI ───────────────────────────────────
   Toute la validation vit déjà dans sendFriendRequest : son propre code,
   relation existante, cooldown de 30 s, code inconnu. On ne la refait
   pas ici — on affiche ce qu'elle répond.

   Une fois la demande partie, le bouton ne redevient pas cliquable :
   renvoyer ne ferait que buter sur le cooldown, et un bouton qui
   redevient actif invite à réessayer pour rien. */
function BoutonAmi({ monCode, sonCode, dejaAmi }){
  const { t } = useTranslation();
  const [envoi, setEnvoi] = useState(false);
  const [etat,  setEtat]  = useState(null);   /* { ok } | { ok:false, msg } */

  const encadre = (fond, bord, couleur, texte) => (
    <div style={{
      marginTop:10, padding:'9px 14px', borderRadius:11,
      background:fond, border:`1.5px solid ${bord}`,
      fontSize:12.5, fontWeight:800, color:couleur,
    }}>{texte}</div>
  );

  if(dejaAmi)  return encadre('rgba(212,160,23,.12)', 'rgba(212,160,23,.35)', '#C8960C', t('profile.friend_already'));
  if(etat?.ok) return encadre('rgba(212,160,23,.15)', 'rgba(212,160,23,.45)', '#C8960C', t('profile.friend_sent'));

  const envoyer = async () => {
    if(envoi) return;
    setEnvoi(true);
    const res = await sendFriendRequest(monCode, sonCode);
    setEnvoi(false);
    setEtat(res?.error ? { ok:false, msg:res.error } : { ok:true });
  };

  return (
    <>
      <button
        onClick={envoyer}
        disabled={envoi}
        style={{
          marginTop:10, width:'100%', padding:'11px 14px',
          background:'linear-gradient(135deg,#D4A017,#C17F3C)',
          border:'none', borderRadius:12,
          fontSize:13, fontWeight:900, color:'#fff',
          opacity: envoi ? .6 : 1,
          cursor: envoi ? 'not-allowed' : 'pointer',
          boxShadow:'0 4px 12px rgba(212,160,23,.32)',
        }}
      >
        🤝 {envoi ? t('profile.friend_sending') : t('profile.add_friend')}
      </button>

      {/* Échec : ton moka, jamais de rouge (cf. CLAUDE.md). */}
      {etat && !etat.ok && (
        <div style={{
          marginTop:8, padding:'7px 10px', borderRadius:10,
          background:'rgba(125,78,31,.15)', color:'#7D4E1F',
          fontSize:12, fontWeight:700,
        }}>
          {etat.msg}
        </div>
      )}
    </>
  );
}

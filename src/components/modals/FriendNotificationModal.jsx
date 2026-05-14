/* ════════════════════════════════════════════════════
   FriendNotificationModal — popup au lancement (BRIEF_DEMANDES_AMIS phase 4)
   ────────────────────────────────────────────────────
   Affichée à la 1re ouverture après réception d'une demande, ou quand
   un ami a accepté ma propre demande depuis la dernière session.

   Variantes :
     · type:'received' → "📬 X veut être ton ami" + boutons Plus tard / Voir
     · type:'accepted' → "🎉 X t'a ajouté en ami" + bouton Génial !

   Plusieurs notifs : la file est gérée par App.jsx, on dépile une notif
   à la fois. Pas de queue interne ici.

   Couleurs : gradient moka/café + accent or. Aucun rouge/vert.

   Props :
     notification  — { type, count?, firstName?, friendName? }
     onClose       — ferme la notif courante (passe à la suivante)
     onSeeRequests — ouvre le profil pour traiter les demandes (type=received)
═══════════════════════════════════════════════════════ */

const overlayStyle = {
  position:'fixed', inset:0, zIndex:90,
  background:'rgba(45,22,8,0.7)', backdropFilter:'blur(4px)',
  display:'flex', alignItems:'center', justifyContent:'center',
  padding:20,
};
const cardStyle = {
  background:'linear-gradient(140deg,#4A2C17,#7D4E1F)',
  borderRadius:20, padding:'28px 22px',
  maxWidth:340, width:'100%',
  color:'#fff', textAlign:'center',
  border:'2px solid rgba(212,160,23,0.45)',
  boxShadow:'0 16px 40px rgba(0,0,0,.5), 0 0 24px rgba(212,160,23,.18)',
  animation:'bounceIn .55s cubic-bezier(.36,.07,.19,.97) both',
};
const btnPrimary = {
  flex:1, padding:'12px 18px',
  background:'linear-gradient(135deg,#D4A017,#C17F3C)',
  color:'#fff', border:'none', borderRadius:14,
  fontWeight:800, fontSize:14, cursor:'pointer',
  boxShadow:'0 4px 12px rgba(212,160,23,.4)',
};
const btnSecondary = {
  flex:1, padding:'12px 18px',
  background:'rgba(255,255,255,.08)',
  color:'#fff', border:'1.5px solid rgba(255,255,255,.3)',
  borderRadius:14, fontWeight:700, fontSize:14, cursor:'pointer',
};
const labelStyle = {
  fontSize:11, color:'#F0C050', letterSpacing:3, textTransform:'uppercase',
  fontWeight:700,
};
const titleStyle = {
  fontSize:18, fontWeight:800, color:'#fff', marginTop:6, lineHeight:1.3,
};
const subStyle = {
  fontSize:13, color:'rgba(255,255,255,.75)', marginTop:8, lineHeight:1.4,
};

import { useTranslation } from "../../i18n/index.js";

export function FriendNotificationModal({ notification, onClose, onSeeRequests }){
  const { t } = useTranslation();
  if(!notification) return null;

  if(notification.type === 'received'){
    const single = notification.count === 1;
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={cardStyle} onClick={(e)=>e.stopPropagation()}>
          <div style={{ fontSize:56, marginBottom:6 }}>📬</div>
          <div style={labelStyle}>{t('friend_notif.new_request')}</div>
          <div style={titleStyle}>
            {single
              ? t('friend_notif.wants_to_be_friend', { name: notification.firstName || t('friend_notif.someone') })
              : t('friend_notif.n_new_requests', { n: notification.count })}
          </div>
          <div style={subStyle}>
            {single ? t('friend_notif.go_profile_single') : t('friend_notif.go_profile_multi')}
          </div>
          <div style={{ display:'flex', gap:10, marginTop:20 }}>
            <button onClick={onClose} style={btnSecondary}>{t('modal.later')}</button>
            <button onClick={onSeeRequests} style={btnPrimary}>{t('common.show')}</button>
          </div>
        </div>
      </div>
    );
  }

  if(notification.type === 'accepted'){
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={cardStyle} onClick={(e)=>e.stopPropagation()}>
          <div style={{ fontSize:56, marginBottom:6 }}>🎉</div>
          <div style={labelStyle}>{t('friend_notif.request_accepted')}</div>
          <div style={titleStyle}>
            {t('friend_notif.added_you', { name: notification.friendName || t('friend_notif.a_friend') })}
          </div>
          <div style={subStyle}>
            {t('friend_notif.now_friends')}
          </div>
          <button
            onClick={onClose}
            style={{ ...btnPrimary, marginTop:20, width:'100%', flex:'none' }}
          >
            {t('friend_notif.awesome')}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

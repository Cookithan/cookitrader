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

export function FriendNotificationModal({ notification, onClose, onSeeRequests }){
  if(!notification) return null;

  if(notification.type === 'received'){
    const single = notification.count === 1;
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={cardStyle} onClick={(e)=>e.stopPropagation()}>
          <div style={{ fontSize:56, marginBottom:6 }}>📬</div>
          <div style={labelStyle}>Nouvelle demande d'ami</div>
          <div style={titleStyle}>
            {single
              ? `${notification.firstName || 'Quelqu\'un'} veut être ton ami !`
              : `Tu as ${notification.count} nouvelles demandes`}
          </div>
          <div style={subStyle}>
            {single
              ? 'Va sur ton profil pour accepter ou refuser.'
              : 'Va sur ton profil pour les traiter.'}
          </div>
          <div style={{ display:'flex', gap:10, marginTop:20 }}>
            <button onClick={onClose} style={btnSecondary}>Plus tard</button>
            <button onClick={onSeeRequests} style={btnPrimary}>Voir</button>
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
          <div style={labelStyle}>Demande acceptée !</div>
          <div style={titleStyle}>
            {notification.friendName || 'Un ami'} t'a ajouté en ami !
          </div>
          <div style={subStyle}>
            Vous êtes maintenant amis sur CookiMiner.
          </div>
          <button
            onClick={onClose}
            style={{ ...btnPrimary, marginTop:20, width:'100%', flex:'none' }}
          >
            Génial ! 🎉
          </button>
        </div>
      </div>
    );
  }

  return null;
}

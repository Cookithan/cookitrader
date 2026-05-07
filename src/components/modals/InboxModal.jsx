import { useCallback, useEffect, useState } from "react";
import {
  getInboxMessages,
  markAsRead,
  markAllAsRead,
  deleteMessage,
  cleanupOldMessages,
  markAsProcessed,
} from "../../lib/inbox.js";

/* ════════════════════════════════════════════════════
   InboxModal — boîte de réception (BRIEF_INBOX phase 4)
   ────────────────────────────────────────────────────
   Modale slide-up depuis le bas (pleine largeur 430px). À l'ouverture :
     1. cleanupOldMessages() — purge > 30 jours
     2. getInboxMessages()   — charge la liste (déjà parsée payload)

   Interaction sur un message :
     - tap : expand (affiche body + bouton Supprimer)
     - 1er expand : marque is_read=true + applique la récompense si
       payload contient un crédit (cookies/cf) ET is_processed=false.
       onApplyReward(type, payload) délègue le crédit à App.jsx.
     - 2e tap : ré-collapse (sans nouvelle action)

   Couleurs :
     - Accents typés (or / caramel / espresso) — palette café-only.
     - Message non lu : bordure colorée + ombre légère.
     - Message lu : bordure beige discrète.

   Props :
     userCode          (string)        — pour les requêtes Supabase
     onClose           ()              — ferme la modale (animation gérée ici)
     onApplyReward     (type, payload) — applique cookies/CF + toast
     onUnreadCountChange (n)           — sync l'app avec le compteur
     C                 (palette)
═══════════════════════════════════════════════════════ */

const TYPE_ACCENTS = {
  friend_request:    { accent:'#D4A017', icon:'📬' },
  friend_accepted:   { accent:'#C17F3C', icon:'🎉' },
  gift:              { accent:'#D4A017', icon:'🎁' },
  tournament_reward: { accent:'#C17F3C', icon:'🏆' },
  referral_reward:   { accent:'#D4A017', icon:'🎁' },
  reaction:          { accent:'#C17F3C', icon:'💬' },
  system:            { accent:'#8B6A5A', icon:'📜' },
};

function formatDate(iso){
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
  } catch { return ''; }
}

export function InboxModal({ userCode, onClose, onApplyReward, onUnreadCountChange, C }){
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [closing, setClosing]   = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    await cleanupOldMessages(userCode);
    const list = await getInboxMessages(userCode);
    setMessages(list);
    setLoading(false);
    /* Sync compteur app : la liste fraîche reflète l'état Supabase */
    if(onUnreadCountChange){
      onUnreadCountChange(list.filter(m => !m.is_read).length);
    }
  }, [userCode, onUnreadCountChange]);

  useEffect(() => { refresh(); }, [refresh]);

  /* Animation de fermeture (slide-down 280ms) avant unmount */
  const handleClose = () => {
    if(closing) return;
    setClosing(true);
    setTimeout(onClose, 280);
  };

  const handleOpenMessage = async (msg) => {
    /* Marquage lu */
    if(!msg.is_read){
      setMessages(ms => ms.map(x => x.id === msg.id ? { ...x, is_read:true } : x));
      markAsRead(msg.id);
      if(onUnreadCountChange){
        onUnreadCountChange(messages.filter(m => !m.is_read && m.id !== msg.id).length);
      }
    }
    /* Application récompense (1 seule fois grâce à is_processed) */
    if(!msg.is_processed && msg.payload && onApplyReward){
      try {
        onApplyReward(msg.type, msg.payload);
        setMessages(ms => ms.map(x => x.id === msg.id ? { ...x, is_processed:true, is_read:true } : x));
        markAsProcessed(msg.id);
      } catch(e){
        console.warn('handleOpenMessage reward error:', e);
      }
    }
  };

  const handleDelete = async (msg) => {
    setMessages(ms => ms.filter(x => x.id !== msg.id));
    await deleteMessage(msg.id);
    if(onUnreadCountChange && !msg.is_read){
      onUnreadCountChange(messages.filter(m => !m.is_read && m.id !== msg.id).length);
    }
  };

  const handleMarkAllRead = async () => {
    setMessages(ms => ms.map(x => ({ ...x, is_read:true })));
    await markAllAsRead(userCode);
    if(onUnreadCountChange) onUnreadCountChange(0);
  };

  const unreadCount = messages.filter(m => !m.is_read).length;
  const total = messages.length;

  return (
    <div
      onClick={handleClose}
      className={closing ? 'inbox-overlay-out' : 'inbox-overlay-in'}
      style={{
        position:'fixed', inset:0, zIndex:80,
        background:'rgba(15,8,4,.55)',
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
          boxShadow:'0 -8px 32px rgba(15,8,4,.35)',
          position:'relative',
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
          }}
        >✕</button>

        {/* Header */}
        <div style={{
          padding:'14px 18px 4px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          gap:10, flexShrink:0,
        }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>
              📬 Messagerie
            </div>
            <div style={{ fontSize:18, fontWeight:800, color:C.text, marginTop:2 }}>
              {total === 0 ? 'Aucun message' : `${total} message${total > 1 ? 's' : ''}`}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                background:C.card, border:`1.5px solid ${C.border}`,
                borderRadius:10, padding:'7px 12px',
                fontSize:11, fontWeight:700, color:C.text,
                cursor:'pointer', flexShrink:0,
              }}
            >
              Tout marquer lu
            </button>
          )}
        </div>

        {/* Liste */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 18px 24px' }}>
          {loading ? (
            <div style={{ padding:40, textAlign:'center', color:C.muted, fontSize:13 }}>
              Chargement…
            </div>
          ) : total === 0 ? (
            <div style={{
              padding:'40px 20px', textAlign:'center',
              background:C.card, borderRadius:16, border:`1.5px solid ${C.border}`,
            }}>
              <div style={{ fontSize:48, marginBottom:8 }}>📭</div>
              <div style={{ fontSize:14, fontWeight:800, color:C.text }}>Pas de message</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:4, lineHeight:1.5 }}>
                Tu recevras ici tes notifications,<br/>cadeaux et récompenses.
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <InboxMessageItem
                key={msg.id}
                message={msg}
                onOpen={() => handleOpenMessage(msg)}
                onDelete={() => handleDelete(msg)}
                C={C}
              />
            ))
          )}

          {total > 0 && (
            <div style={{
              fontSize:10, color:C.muted, textAlign:'center',
              marginTop:14, fontStyle:'italic',
            }}>
              Les messages sont supprimés automatiquement après 30 jours
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InboxMessageItem({ message, onOpen, onDelete, C }){
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_ACCENTS[message.type] ?? TYPE_ACCENTS.system;
  const dateStr = formatDate(message.created_at);

  const handleClick = () => {
    if(!expanded){
      setExpanded(true);
      onOpen();
    } else {
      setExpanded(false);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background:C.card,
        borderRadius:14,
        padding:12,
        marginBottom:8,
        border: message.is_read ? `1.5px solid ${C.border}` : `2px solid ${meta.accent}`,
        cursor:'pointer',
        boxShadow: !message.is_read ? `0 4px 12px ${meta.accent}33` : 'none',
        transition:'border-color .2s, box-shadow .2s',
      }}
    >
      <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
        {/* Indicateur non lu (point coloré) */}
        {!message.is_read && (
          <div style={{
            width:8, height:8, borderRadius:'50%',
            background:meta.accent, marginTop:7, flexShrink:0,
          }} />
        )}
        <div style={{ fontSize:18, lineHeight:1, marginTop:2, flexShrink:0 }}>{meta.icon}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8 }}>
            <div style={{
              fontSize:13,
              fontWeight: message.is_read ? 600 : 800,
              color:C.text,
              flex:1, minWidth:0,
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {message.title}
            </div>
            <div style={{ fontSize:10, color:C.muted, flexShrink:0 }}>
              {dateStr}
            </div>
          </div>
          {expanded && (
            <>
              <div style={{
                fontSize:12, color:C.muted, marginTop:6, lineHeight:1.45,
                whiteSpace:'pre-wrap',
              }}>
                {message.body}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                style={{
                  marginTop:8,
                  background:'transparent', border:'none',
                  fontSize:11, color:C.muted,
                  cursor:'pointer', textDecoration:'underline',
                  padding:0,
                }}
              >
                Supprimer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

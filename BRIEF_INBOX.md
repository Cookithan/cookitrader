# Brief — Inbox / Boîte de réception 📬

Lis bien le CLAUDE.md avant de commencer.

## 🎯 Concept

Boîte de réception centralisée qui collecte **toutes les notifications** importantes du joueur :
- 📬 Demandes d'amis reçues
- 🎉 Demandes d'amis acceptées
- 🎁 Cadeaux reçus
- 🏆 Récompenses tournoi
- 🎁 Bonus parrainage
- 💬 Réactions reçues
- 📜 Notifications système (événements, mises à jour)

## ⚙️ Règles

- 📥 **Tout** entre dedans (choix Q19A)
- 🔔 **Bouton inbox pulse** quand non lus (Q20B)
- 🗑️ **Suppression auto après 30 jours** (Q21B)
- ✅ Interaction : ouvrir un message le marque comme lu, peut être supprimé manuellement

## ⚠️ Pré-requis
- Supabase fonctionnel
- Les autres briefs (parrainage, cadeaux, réactions, tournoi) écrivent dans cette table

---

# PHASE 1 — SQL

⚠️ **À faire par l'utilisateur**.

```sql
-- Table inbox messages
create table public.inbox_messages (
  id uuid default gen_random_uuid() primary key,
  user_code text not null,
  type text not null check (type in (
    'friend_request', 'friend_accepted', 'gift', 'tournament_reward',
    'referral_reward', 'reaction', 'system'
  )),
  title text not null,
  body text not null,
  payload text,  -- JSON optionnel pour les actions (ex: cadeau à débloquer)
  is_read boolean not null default false,
  is_processed boolean not null default false, -- true quand le crédit cookies/CF a été appliqué
  created_at timestamptz not null default now()
);

create index idx_inbox_user on public.inbox_messages(user_code, created_at desc);
create index idx_inbox_unread on public.inbox_messages(user_code, is_read);

alter table public.inbox_messages enable row level security;

create policy "Users can read their own inbox"
  on public.inbox_messages for select using (true);
create policy "Anyone can insert (for cross-user messages)"
  on public.inbox_messages for insert with check (true);
create policy "Users can update their own messages"
  on public.inbox_messages for update using (true) with check (true);
create policy "Users can delete their own messages"
  on public.inbox_messages for delete using (true);
```

---

# PHASE 2 — Module inbox

Créer `src/lib/inbox.js` :

```js
import { supabase, isSupabaseEnabled } from './supabase';

const MESSAGE_TTL_DAYS = 30;

/**
 * Récupère tous les messages de l'inbox de l'utilisateur (non expirés).
 */
export async function getInboxMessages(userCode) {
  if (!isSupabaseEnabled() || !userCode) return [];

  const since = new Date(Date.now() - MESSAGE_TTL_DAYS * 24 * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from('inbox_messages')
    .select('*')
    .eq('user_code', userCode)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('getInboxMessages error:', error);
    return [];
  }
  return data ?? [];
}

/**
 * Compte les messages non lus.
 */
export async function getUnreadInboxCount(userCode) {
  if (!isSupabaseEnabled() || !userCode) return 0;

  const since = new Date(Date.now() - MESSAGE_TTL_DAYS * 24 * 3600 * 1000).toISOString();

  const { count } = await supabase
    .from('inbox_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_code', userCode)
    .eq('is_read', false)
    .gte('created_at', since);

  return count ?? 0;
}

/**
 * Marque un message comme lu.
 */
export async function markAsRead(messageId) {
  if (!isSupabaseEnabled()) return;
  await supabase
    .from('inbox_messages')
    .update({ is_read: true })
    .eq('id', messageId);
}

/**
 * Marque tous les messages comme lus.
 */
export async function markAllAsRead(userCode) {
  if (!isSupabaseEnabled() || !userCode) return;
  await supabase
    .from('inbox_messages')
    .update({ is_read: true })
    .eq('user_code', userCode)
    .eq('is_read', false);
}

/**
 * Supprime un message manuellement.
 */
export async function deleteMessage(messageId) {
  if (!isSupabaseEnabled()) return;
  await supabase
    .from('inbox_messages')
    .delete()
    .eq('id', messageId);
}

/**
 * Suppression auto des messages > 30 jours (à appeler à chaque ouverture de l'inbox).
 */
export async function cleanupOldMessages(userCode) {
  if (!isSupabaseEnabled() || !userCode) return;

  const cutoff = new Date(Date.now() - MESSAGE_TTL_DAYS * 24 * 3600 * 1000).toISOString();

  await supabase
    .from('inbox_messages')
    .delete()
    .eq('user_code', userCode)
    .lt('created_at', cutoff);
}

/**
 * Crée un message inbox (helper).
 */
export async function createInboxMessage(userCode, type, title, body, payload = null) {
  if (!isSupabaseEnabled() || !userCode) return;

  await supabase.from('inbox_messages').insert({
    user_code: userCode,
    type,
    title,
    body,
    payload: payload ? JSON.stringify(payload) : null,
  });
}

/**
 * Marque comme processed (= les rewards ont été appliqués au compte).
 * Évite de re-créditer si l'utilisateur ouvre le message plusieurs fois.
 */
export async function markAsProcessed(messageId) {
  if (!isSupabaseEnabled()) return;
  await supabase
    .from('inbox_messages')
    .update({ is_processed: true, is_read: true })
    .eq('id', messageId);
}
```

---

# PHASE 3 — Bouton inbox dans la nav (avec pulsation)

Ajouter une icône inbox dans la **bottom bar** ou dans le **profil** (selon où c'est le plus visible).

```jsx
function InboxButton({ userCode, unreadCount, onOpen }) {
  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={onOpen}
      style={{
        position: 'relative',
        background: 'transparent',
        border: 'none',
        padding: 8,
        cursor: 'pointer',
        animation: hasUnread ? 'inboxPulse 1.6s ease-in-out infinite' : 'none',
      }}
    >
      <span style={{ fontSize: 24 }}>📬</span>
      {hasUnread && (
        <span style={{
          position: 'absolute',
          top: 4, right: 0,
          background: '#D4A017',
          color: 'white',
          fontSize: 10,
          fontWeight: 800,
          padding: '2px 6px',
          borderRadius: 100,
          minWidth: 18,
          textAlign: 'center',
          boxShadow: '0 2px 6px rgba(212,160,23,0.5)',
        }}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
```

CSS à ajouter :

```css
@keyframes inboxPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
```

---

# PHASE 4 — Modal inbox (slide depuis le bas)

```jsx
function InboxModal({ userCode, onClose, onApplyReward }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    await cleanupOldMessages(userCode);
    const list = await getInboxMessages(userCode);
    setMessages(list);
    setLoading(false);
  }, [userCode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Animation slide
  const [mounted, setMounted] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 300);
  };

  const handleOpenMessage = async (msg) => {
    if (!msg.is_read) {
      await markAsRead(msg.id);
      setMessages(m => m.map(x => x.id === msg.id ? { ...x, is_read: true } : x));
    }

    // Appliquer la récompense si pas encore fait
    if (!msg.is_processed && msg.payload) {
      try {
        const payload = JSON.parse(msg.payload);
        if (payload.cookies || payload.cf || payload.amount) {
          onApplyReward(msg.type, payload);
          await markAsProcessed(msg.id);
          setMessages(m => m.map(x => x.id === msg.id ? { ...x, is_processed: true } : x));
        }
      } catch {}
    }
  };

  const handleDelete = async (msg) => {
    await deleteMessage(msg.id);
    setMessages(m => m.filter(x => x.id !== msg.id));
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead(userCode);
    setMessages(m => m.map(x => ({ ...x, is_read: true })));
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div onClick={handleClose} style={{ /* overlay */ }}>
      <div onClick={e => e.stopPropagation()} style={{ /* slide card */ }}>
        <div style={{ width: 40, height: 4, background: '#E8DDD0', borderRadius: 2, margin: '12px auto 0' }} />

        <button onClick={handleClose} style={{ /* close btn */ }}>✕</button>

        <div style={{ padding: '14px 18px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: '#8B6A5A', textTransform: 'uppercase', letterSpacing: 2 }}>
                📬 Messagerie
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#2C1810', marginTop: 2 }}>
                {messages.length === 0 ? 'Aucun message' : `${messages.length} message${messages.length > 1 ? 's' : ''}`}
              </div>
            </div>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} style={{
                background: '#F5EFE6',
                border: '1.5px solid #E8DDD0',
                borderRadius: 10,
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 700,
                color: '#5C3317',
                cursor: 'pointer',
              }}>
                Tout marquer lu
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#8B6A5A' }}>Chargement...</div>
          ) : messages.length === 0 ? (
            <div style={{
              padding: 40,
              textAlign: 'center',
              background: 'white',
              borderRadius: 16,
              border: '1.5px solid #E8DDD0',
            }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#2C1810' }}>Pas de message</div>
              <div style={{ fontSize: 12, color: '#8B6A5A', marginTop: 4 }}>
                Tu recevras ici tes notifications, cadeaux, récompenses...
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <InboxMessageItem
                key={msg.id}
                message={msg}
                onOpen={() => handleOpenMessage(msg)}
                onDelete={() => handleDelete(msg)}
              />
            ))
          )}

          {messages.length > 0 && (
            <div style={{ fontSize: 10, color: '#A0784E', textAlign: 'center', marginTop: 14, fontStyle: 'italic' }}>
              Les messages sont supprimés automatiquement après 30 jours
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InboxMessageItem({ message, onOpen, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    if (!expanded) {
      setExpanded(true);
      onOpen();
    } else {
      setExpanded(false);
    }
  };

  // Couleur d'accent par type
  const typeColors = {
    friend_request: '#D4A017',
    friend_accepted: '#C17F3C',
    gift: '#D4A017',
    tournament_reward: '#C17F3C',
    referral_reward: '#D4A017',
    reaction: '#C17F3C',
    system: '#8B6A5A',
  };
  const accent = typeColors[message.type] ?? '#D4A017';

  const dateStr = new Date(message.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short',
  });

  return (
    <div
      onClick={handleClick}
      style={{
        background: 'white',
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        border: message.is_read ? '1.5px solid #E8DDD0' : `2px solid ${accent}`,
        cursor: 'pointer',
        boxShadow: !message.is_read ? `0 4px 12px ${accent}33` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Indicateur non lu */}
        {!message.is_read && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: accent, marginTop: 6, flexShrink: 0,
          }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div style={{
              fontSize: 13,
              fontWeight: message.is_read ? 600 : 800,
              color: '#2C1810',
              flex: 1,
              minWidth: 0,
            }}>
              {message.title}
            </div>
            <div style={{ fontSize: 10, color: '#A0784E', flexShrink: 0 }}>
              {dateStr}
            </div>
          </div>
          {expanded && (
            <>
              <div style={{ fontSize: 12, color: '#8B6A5A', marginTop: 6, lineHeight: 1.4 }}>
                {message.body}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                style={{
                  marginTop: 8,
                  background: 'transparent',
                  border: 'none',
                  fontSize: 11,
                  color: '#A0784E',
                  cursor: 'pointer',
                  textDecoration: 'underline',
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
```

---

# PHASE 5 — Refresh des messages au lancement

```js
useEffect(() => {
  if (!userCode) return;

  let alive = true;
  const refresh = async () => {
    const count = await getUnreadInboxCount(userCode);
    if (alive) setUnreadCount(count);
  };

  refresh();
  // Refresh toutes les 30s
  const t = setInterval(refresh, 30000);
  return () => { alive = false; clearInterval(t); };
}, [userCode]);
```

---

# PHASE 6 — Application des récompenses

Quand un message est ouvert pour la première fois, appliquer ses effets :

```jsx
const handleApplyReward = (type, payload) => {
  // Cadeau reçu
  if (type === 'gift') {
    if (payload.type === 'cookies') addCoins(payload.amount);
    else if (payload.type === 'cf') addCafe(payload.amount);
    showToast(`🎁 +${payload.amount} ${payload.type === 'cookies' ? '🍪' : '☕'} reçu !`);
  }

  // Récompense tournoi
  if (type === 'tournament_reward' && payload.cookies) {
    addCoins(payload.cookies);
    addCafe(payload.cf ?? 0);
    showToast(`🏆 +${payload.cookies} 🍪 +${payload.cf} ☕`);
  }

  // Bonus parrainage
  if (type === 'referral_reward' && payload.cookies) {
    addCoins(payload.cookies);
    addCafe(payload.cf ?? 0);
    showToast(`🎁 Bonus parrainage : +${payload.cookies} 🍪`);
  }
};
```

---

# PHASE 7 — Tests

1. Bouton inbox avec badge si messages non lus ✅
2. Tap → modal slide ouvre ✅
3. Message non lu en doré, lu en gris discret
4. Tap sur message → s'expand + lecture/marqué lu
5. Si message contient une récompense (cadeau, tournoi, parrainage) → appliquée à l'ouverture ✅
6. Bouton "Tout marquer lu" → tout passe en gris ✅
7. Bouton "Supprimer" → message disparait
8. Message > 30 jours → supprimé auto au prochain chargement

## Vérifications globales
- ☑ Tous les types de notifications convergent dans l'inbox
- ☑ Bouton pulse quand messages non lus
- ☑ Récompenses appliquées 1 seule fois (`is_processed` empêche le double crédit)
- ☑ Suppression auto après 30 jours
- ☑ Pas de rouge ni de vert

# Brief — Réactions emojis sur profil 💬

Lis bien le CLAUDE.md avant de commencer.

## 🎯 Concept

Quand tu consultes le profil d'un ami (via le brief profil visible), tu peux lui envoyer une **réaction emoji** (👏, ☕, 🔥, 🍪). Il la reçoit dans son inbox au prochain lancement.

## ⚠️ Pré-requis
- BRIEF_PROFIL_VISIBLE déjà appliqué
- BRIEF_INBOX déjà appliqué (table inbox_messages)

---

## ⚙️ Règles

- 4 réactions disponibles : 👏 ☕ 🔥 🍪
- Visible **uniquement sur le profil des amis** (pas du top 1 inconnu)
- **Cooldown 1h** entre 2 réactions vers le même ami (anti-spam)
- L'ami reçoit dans son inbox : "Tom t'a envoyé un 🔥"
- Pas de récompense, c'est juste un signe d'amitié

---

# PHASE 1 — Fonction d'envoi

Ajouter dans `src/lib/supabaseSync.js` :

```js
const REACTION_COOLDOWN_MS = 60 * 60 * 1000; // 1h
const lastReactionSent = {}; // cache local

const ALLOWED_REACTIONS = ['👏', '☕', '🔥', '🍪'];

export async function sendReaction(senderCode, recipientCode, emoji) {
  if (!isSupabaseEnabled()) return { error: 'Hors ligne' };
  if (!ALLOWED_REACTIONS.includes(emoji)) return { error: 'Emoji invalide' };
  if (senderCode === recipientCode) return { error: 'Pas à soi-même' };

  // Cooldown
  const cacheKey = `${senderCode}->${recipientCode}`;
  const last = lastReactionSent[cacheKey] ?? 0;
  if (Date.now() - last < REACTION_COOLDOWN_MS) {
    const remaining = Math.ceil((REACTION_COOLDOWN_MS - (Date.now() - last)) / 60000);
    return { error: `Attends ${remaining}min avant de re-réagir` };
  }

  // Récupérer le nom du sender pour l'inbox message
  const { data: sender } = await supabase
    .from('users')
    .select('user_name')
    .eq('user_code', senderCode)
    .maybeSingle();

  // Envoyer un message inbox au destinataire
  const { error } = await supabase.from('inbox_messages').insert({
    user_code: recipientCode,
    type: 'reaction',
    title: `${emoji} Réaction de ${sender?.user_name ?? 'un ami'}`,
    body: `${sender?.user_name ?? 'Quelqu\'un'} t'a envoyé un ${emoji}`,
    payload: JSON.stringify({ emoji, senderCode }),
  });

  if (error) return { error: error.message };

  lastReactionSent[cacheKey] = Date.now();
  return { success: true };
}
```

---

# PHASE 2 — UI : Boutons réactions sur le profil ami

Modifier le composant `<UserProfileModal>` (du brief profil visible) pour ajouter une **rangée de boutons réactions** quand on consulte le profil d'un **ami** (pas du top 1 inconnu).

```jsx
function ProfileContent({ profile, isCrown, isFriend, currentUserCode }) {
  // ... contenu existant ...

  return (
    <div>
      {/* ... sections existantes ... */}

      {/* Réactions — seulement pour les amis */}
      {isFriend && (
        <ReactionBar
          senderCode={currentUserCode}
          recipientCode={profile.user_code}
          recipientName={profile.user_name}
        />
      )}
    </div>
  );
}

function ReactionBar({ senderCode, recipientCode, recipientName }) {
  const [feedback, setFeedback] = useState(null);
  const [sending, setSending] = useState(false);

  const REACTIONS = [
    { emoji: '👏', label: 'Bravo' },
    { emoji: '☕', label: 'Café' },
    { emoji: '🔥', label: 'Feu' },
    { emoji: '🍪', label: 'Cookie' },
  ];

  const handleSend = async (emoji) => {
    if (sending) return;
    setSending(true);
    setFeedback(null);

    const result = await sendReaction(senderCode, recipientCode, emoji);

    setSending(false);
    if (result.error) {
      setFeedback({ type: 'error', msg: result.error });
    } else {
      setFeedback({
        type: 'success',
        msg: `${emoji} envoyé à ${recipientName} !`
      });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      border: '1.5px solid #E8DDD0',
    }}>
      <div style={{
        fontSize: 11,
        color: '#8B6A5A',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 10,
        textAlign: 'center',
      }}>
        💬 Envoie une réaction
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', gap: 8 }}>
        {REACTIONS.map(r => (
          <button
            key={r.emoji}
            onClick={() => handleSend(r.emoji)}
            disabled={sending}
            style={{
              width: 56, height: 56,
              borderRadius: 14,
              background: '#F5EFE6',
              border: '1.5px solid #E8DDD0',
              fontSize: 28,
              cursor: sending ? 'not-allowed' : 'pointer',
              transition: 'transform 0.1s',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {r.emoji}
          </button>
        ))}
      </div>

      {feedback && (
        <div style={{
          marginTop: 10,
          padding: '6px 10px',
          borderRadius: 10,
          fontSize: 12,
          textAlign: 'center',
          background: feedback.type === 'success' ? 'rgba(212,160,23,0.15)' : 'rgba(125,78,31,0.15)',
          color: feedback.type === 'success' ? '#C8960C' : '#7D4E1F',
          fontWeight: 600,
        }}>
          {feedback.msg}
        </div>
      )}
    </div>
  );
}
```

---

# PHASE 3 — Détecter "ami" vs "top 1 inconnu"

Quand on ouvre la modal profil, faut savoir si c'est un ami ou pas :

```jsx
function CookiMiner() {
  const [viewingProfile, setViewingProfile] = useState(null);

  const openProfile = async (userCode, isCrown = false) => {
    // Vérifier si c'est un ami
    const friends = await getFriends(userCode); // ou utiliser le state local
    const friendCodes = friends.map(f => f.user_code);
    const isFriend = friendCodes.includes(userCode);

    setViewingProfile({ userCode, isCrown, isFriend });
  };

  // ...
  {viewingProfile && (
    <UserProfileModal
      userCode={viewingProfile.userCode}
      isCrown={viewingProfile.isCrown}
      isFriend={viewingProfile.isFriend}
      currentUserCode={userCode}
      onClose={() => setViewingProfile(null)}
    />
  )}
}
```

⚠️ **Plus simple** : passer la liste des codes amis directement et faire le test dans la modal :

```jsx
const isFriend = friendCodes.includes(profile.user_code);
```

---

# PHASE 4 — Tests

1. Compte A consulte le profil de Compte B (qui est ami) → barre réactions visible ✅
2. A clique 🔥 → feedback "🔥 envoyé à B !" ✅
3. B ouvre l'app → modal inbox "🔥 Réaction de A" ✅
4. A re-clique 🔥 sur B dans l'heure → "Attends 60min..." ✅
5. A consulte le profil du top 1 inconnu → **PAS** de barre réactions ✅

## Vérifications globales
- ☑ 4 réactions emojis fonctionnelles
- ☑ Cooldown 1h respecté
- ☑ Inbox du destinataire reçoit le message
- ☑ Pas affichées pour les profils non-amis
- ☑ Pas de rouge ni de vert

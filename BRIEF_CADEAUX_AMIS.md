# Brief — Cadeaux entre amis 🎁

Lis bien le CLAUDE.md avant de commencer.

## 🎯 Concept

Tu peux **payer un cadeau** à un ami : 50 🍪 OU 1 ☕ (ton choix). Tu payes le coût toi-même, ton ami reçoit la récompense. Anti-abus : max 3 cadeaux par jour total.

## ⚙️ Règles

- 🎁 **2 types de cadeaux** :
  - **Petit cadeau** : 50 🍪 (tu payes 50, ami reçoit 50)
  - **Gros cadeau** : 1 ☕ (tu payes 1 ☕, ami reçoit 1 ☕)
- 🚫 **Limite** : max **3 cadeaux/jour** total (peu importe le type)
- 👤 **Cible** : uniquement tes amis acceptés
- 📬 L'ami reçoit dans son inbox : "Tom t'a offert 50 🍪 !"

## ⚠️ Pré-requis
- Système d'amis (BRIEF_DEMANDES_AMIS)
- Inbox (BRIEF_INBOX)

---

# PHASE 1 — SQL

⚠️ **À faire par l'utilisateur**.

```sql
-- Table des cadeaux envoyés (pour anti-spam)
create table public.gifts_sent (
  id uuid default gen_random_uuid() primary key,
  sender_code text not null,
  recipient_code text not null,
  type text not null check (type in ('cookies', 'cf')),
  amount numeric not null,
  sent_at timestamptz not null default now()
);

create index idx_gifts_sender on public.gifts_sent(sender_code);
create index idx_gifts_sent_at on public.gifts_sent(sent_at desc);

alter table public.gifts_sent enable row level security;

create policy "Anyone can read gifts" on public.gifts_sent for select using (true);
create policy "Anyone can insert gifts" on public.gifts_sent for insert with check (true);
```

---

# PHASE 2 — Fonctions

Ajouter dans `src/lib/supabaseSync.js` :

```js
const GIFT_CONFIG = {
  COOKIES_AMOUNT: 50,
  CF_AMOUNT: 1,
  MAX_PER_DAY: 3,
};

export const GIFT_TYPES = {
  cookies: { type: 'cookies', amount: 50, icon: '🍪', label: '50 cookies' },
  cf: { type: 'cf', amount: 1, icon: '☕', label: '1 café' },
};

/**
 * Compte les cadeaux envoyés par un user dans les dernières 24h.
 */
export async function getGiftsSentToday(senderCode) {
  if (!isSupabaseEnabled() || !senderCode) return 0;

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabase
    .from('gifts_sent')
    .select('*', { count: 'exact', head: true })
    .eq('sender_code', senderCode)
    .gte('sent_at', since);

  return count ?? 0;
}

/**
 * Envoie un cadeau à un ami.
 * Vérifie : ami valide, limite quotidienne, solde suffisant.
 * Le coût est débité du sender, le destinataire reçoit la récompense via inbox.
 */
export async function sendGift(senderCode, recipientCode, giftType, currentBalance) {
  if (!isSupabaseEnabled()) return { error: 'Hors ligne' };

  const gift = GIFT_TYPES[giftType];
  if (!gift) return { error: 'Type de cadeau invalide' };

  if (senderCode === recipientCode) return { error: 'Pas à toi-même' };

  // 1. Vérifier la limite quotidienne
  const todayCount = await getGiftsSentToday(senderCode);
  if (todayCount >= GIFT_CONFIG.MAX_PER_DAY) {
    return { error: `Limite atteinte (${GIFT_CONFIG.MAX_PER_DAY} cadeaux/jour)` };
  }

  // 2. Vérifier le solde
  if (gift.type === 'cookies' && currentBalance.cookies < gift.amount) {
    return { error: `Pas assez de cookies (besoin ${gift.amount})` };
  }
  if (gift.type === 'cf' && currentBalance.cf < gift.amount) {
    return { error: `Pas assez de cafés (besoin ${gift.amount})` };
  }

  // 3. Vérifier que c'est un ami
  const { data: me } = await supabase
    .from('users')
    .select('id, user_name')
    .eq('user_code', senderCode)
    .maybeSingle();
  if (!me) return { error: 'Profil introuvable' };

  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .eq('user_id', me.id)
    .eq('friend_code', recipientCode)
    .eq('status', 'accepted')
    .maybeSingle();

  if (!friendship) return { error: 'Ce code n\'est pas dans tes amis' };

  // 4. Insérer le cadeau (log)
  await supabase.from('gifts_sent').insert({
    sender_code: senderCode,
    recipient_code: recipientCode,
    type: gift.type,
    amount: gift.amount,
  });

  // 5. Envoyer le message inbox au destinataire
  await supabase.from('inbox_messages').insert({
    user_code: recipientCode,
    type: 'gift',
    title: `🎁 ${me.user_name} t'a offert un cadeau !`,
    body: `Tu as reçu ${gift.amount} ${gift.icon}`,
    payload: JSON.stringify({
      type: gift.type,
      amount: gift.amount,
      senderCode,
      senderName: me.user_name,
    }),
  });

  return { success: true, gift };
}
```

---

# PHASE 3 — UI : Bouton "Offrir" sur chaque ami

Modifier la `<FriendCard>` pour ajouter une icône 🎁 (en plus de l'avatar/nom/levels existants) :

```jsx
function FriendCard({ friend, onGift, onOpenProfile, ... }) {
  return (
    <div style={{ /* card existante */ }}>
      {/* Avatar / nom / niveau / différence cookies */}
      {/* ... */}

      {/* Bouton offrir */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onGift(friend);
        }}
        style={{
          background: 'linear-gradient(135deg, #D4A017, #C17F3C)',
          color: 'white',
          border: 'none',
          borderRadius: 10,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 800,
          cursor: 'pointer',
          marginRight: 6,
        }}
      >
        🎁
      </button>

      {/* Bouton retirer (existant) */}
      <button onClick={(e) => { e.stopPropagation(); handleRemove(friend); }} style={{ /* existant */ }}>
        ✕
      </button>
    </div>
  );
}
```

---

# PHASE 4 — Modal de choix du cadeau

```jsx
function GiftModal({ friend, currentCookies, currentCf, onClose, onSend }) {
  const [selectedType, setSelectedType] = useState(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    getGiftsSentToday(/* userCode */).then(setTodayCount);
  }, []);

  const remaining = GIFT_CONFIG.MAX_PER_DAY - todayCount;

  const canSendCookies = currentCookies >= 50 && remaining > 0;
  const canSendCf = currentCf >= 1 && remaining > 0;

  const handleSend = async () => {
    if (!selectedType || sending) return;
    setSending(true);
    const result = await onSend(selectedType);
    setSending(false);

    if (result.error) {
      setFeedback({ type: 'error', msg: result.error });
    } else {
      setFeedback({ type: 'success', msg: `🎁 Envoyé à ${friend.user_name} !` });
      setTimeout(onClose, 1500);
    }
  };

  return (
    <div style={{ /* overlay */ }}>
      <div style={{ /* modal card */ }}>
        <button onClick={onClose} style={{ /* close */ }}>✕</button>

        <div style={{ textAlign: 'center', padding: '4px 0 14px' }}>
          <div style={{ fontSize: 48 }}>🎁</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#2C1810', marginTop: 8 }}>
            Offrir un cadeau à
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#D4A017', marginTop: 4 }}>
            {friend.user_name}
          </div>
        </div>

        {/* Compteur restants */}
        <div style={{
          background: 'rgba(212,160,23,0.1)',
          borderRadius: 10,
          padding: '6px 12px',
          fontSize: 11,
          color: '#8B6A5A',
          textAlign: 'center',
          marginBottom: 14,
        }}>
          🎁 {remaining}/{GIFT_CONFIG.MAX_PER_DAY} cadeaux restants aujourd'hui
        </div>

        {/* Choix */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <GiftOption
            icon="🍪"
            amount="50 cookies"
            cost={`Coût : 50 🍪 (tu as ${currentCookies})`}
            selected={selectedType === 'cookies'}
            disabled={!canSendCookies}
            onClick={() => canSendCookies && setSelectedType('cookies')}
          />
          <GiftOption
            icon="☕"
            amount="1 café"
            cost={`Coût : 1 ☕ (tu as ${currentCf})`}
            selected={selectedType === 'cf'}
            disabled={!canSendCf}
            onClick={() => canSendCf && setSelectedType('cf')}
          />
        </div>

        {/* Feedback */}
        {feedback && (
          <div style={{
            marginTop: 14,
            padding: '8px 12px',
            borderRadius: 10,
            fontSize: 12,
            background: feedback.type === 'success' ? 'rgba(212,160,23,0.15)' : 'rgba(125,78,31,0.15)',
            color: feedback.type === 'success' ? '#C8960C' : '#7D4E1F',
            textAlign: 'center',
            fontWeight: 700,
          }}>
            {feedback.msg}
          </div>
        )}

        {/* Boutons actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={{ /* btn moka */ }}>Annuler</button>
          <button
            onClick={handleSend}
            disabled={!selectedType || sending}
            style={{
              flex: 1,
              padding: '12px',
              background: selectedType ? 'linear-gradient(135deg, #D4A017, #C17F3C)' : '#E8DDD0',
              color: selectedType ? 'white' : '#8B6A5A',
              border: 'none',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 14,
              cursor: selectedType && !sending ? 'pointer' : 'not-allowed',
            }}
          >
            {sending ? '...' : 'Envoyer le cadeau'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GiftOption({ icon, amount, cost, selected, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: selected ? 'linear-gradient(135deg, rgba(212,160,23,0.15), rgba(193,127,60,0.15))' : 'white',
        border: selected ? '2px solid #D4A017' : '1.5px solid #E8DDD0',
        borderRadius: 14,
        padding: 14,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 32 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#2C1810', marginTop: 6 }}>{amount}</div>
      <div style={{ fontSize: 10, color: '#8B6A5A', marginTop: 4 }}>{cost}</div>
    </button>
  );
}
```

---

# PHASE 5 — Réception des cadeaux

Au lancement (où on traite déjà les notifs inbox), si un message `type='gift'` arrive et n'a pas été lu :

```js
// Quand l'inbox notifie un cadeau reçu
const handleGiftReceived = (message) => {
  const payload = JSON.parse(message.payload);
  
  // Créditer le destinataire
  if (payload.type === 'cookies') {
    addCoins(payload.amount);
  } else if (payload.type === 'cf') {
    addCafe(payload.amount);
  }
  
  // Marquer le message comme lu (optionnel selon le brief inbox)
  // ...
};
```

⚠️ **Important** : c'est l'**inbox** qui déclenche le crédit. Le crédit ne se fait pas automatiquement à l'envoi côté serveur (parce qu'on n'a pas de fonction Edge), mais quand le destinataire ouvre l'app et lit son inbox.

---

# PHASE 6 — Tests

1. A a 200 🍪 et 5 ☕, envoie 50 🍪 à B → A passe à 150 🍪, B reçoit dans son inbox ✅
2. A envoie 1 ☕ à B → A passe à 4 ☕, B reçoit ✅
3. A envoie 3 cadeaux dans la journée, le 4e échoue : "Limite atteinte" ✅
4. A essaie d'envoyer 50 🍪 mais en a que 30 → "Pas assez" ✅
5. A essaie d'envoyer à un non-ami → "Pas dans tes amis" ✅
6. B ouvre son inbox → reçoit ses cookies/CF ✅

## Vérifications globales
- ☑ Bouton 🎁 sur chaque carte ami
- ☑ Modal claire avec choix cookies / CF
- ☑ Limite 3/jour respectée
- ☑ Solde du sender débité, destinataire crédité via inbox
- ☑ Pas de rouge ni de vert

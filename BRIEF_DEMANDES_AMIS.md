# Brief — Système de demandes d'amis 👥📬

Lis bien le CLAUDE.md avant de commencer.
**Procède UNE phase à la fois et attends ma validation visuelle entre chaque.**

---

## 🎯 Concept

Transformer le système d'amis actuel (ajout unilatéral) en **système bilatéral** type Snapchat :

- A envoie une **demande d'ami** à B
- B reçoit la demande dans sa section "Demandes reçues"
- B peut **accepter** ou **refuser**
- Si accepté → ils deviennent amis (relation mutuelle visible des 2 côtés)
- Si refusé → la demande disparaît (silencieux pour A)

Plus social, plus naturel, plus addictif.

---

## ⚠️ Pré-requis

- Le système d'amis Supabase actuel fonctionne (table `friendships` existe avec colonnes `user_id`, `friend_code`)
- Les utilisateurs sont identifiés par leur `user_code` unique
- Le brief `BRIEF_FIX_RESET.md` est appliqué (pour ne pas avoir de fantômes)

---

# ══════════════════════════════════════════════
# PHASE 1 — Migration de la table `friendships`
# ══════════════════════════════════════════════

⚠️ **Cette phase est à faire par l'utilisateur** dans le SQL Editor Supabase.

Claude Code doit afficher ces instructions et **attendre la confirmation** avant de continuer.

## SQL à exécuter

```sql
-- Ajouter une colonne 'status' pour gérer l'état de la demande
alter table public.friendships
  add column if not exists status text not null default 'accepted'
  check (status in ('pending', 'accepted'));

-- Index pour requêtes rapides sur le statut
create index if not exists idx_friendships_status
  on public.friendships(status);

create index if not exists idx_friendships_friend_code
  on public.friendships(friend_code);

-- Les amitiés existantes restent en 'accepted' (par défaut)
-- Pas besoin d'UPDATE explicite vu le default
```

## Action utilisateur

1. Aller sur Supabase → **SQL Editor** → **New query**
2. Coller le SQL ci-dessus
3. Cliquer **Run**
4. Vérifier dans **Table Editor → friendships** que :
   - La colonne `status` existe
   - Les amitiés existantes ont `status = 'accepted'`

## Vérifications phase 1
- ☑ Colonne `status` ajoutée à la table `friendships`
- ☑ Toutes les amitiés existantes sont en `accepted`
- ☑ Aucune erreur dans le SQL Editor
- ☑ Les indexes sont créés

---

# ══════════════════════════════════════════════
# PHASE 2 — Nouvelles fonctions Supabase
# ══════════════════════════════════════════════

Modifier `src/lib/supabaseSync.js` pour ajouter les fonctions de gestion des demandes.

## Fonctions à ajouter

```js
// ═══════════════════════════════════════════
// CONFIG anti-spam
// ═══════════════════════════════════════════
const FRIEND_REQUEST_LIMITS = {
  MAX_PENDING: 50,            // Max 50 demandes en attente envoyées
  COOLDOWN_MS: 30 * 1000,     // 30s entre 2 demandes vers le même utilisateur
};

// Cache local du dernier envoi par friendCode (pour le cooldown)
const lastRequestSent = {};

/**
 * Envoie une demande d'ami (status='pending').
 * Avant l'envoi, vérifie :
 * - Que le code cible existe
 * - Que ce n'est pas son propre code
 * - Qu'il n'y a pas déjà une amitié (pending ou accepted)
 * - Que l'utilisateur n'a pas déjà 50 demandes pending
 * - Cooldown 30s vers le même utilisateur
 */
export async function sendFriendRequest(myUserCode, friendCode) {
  if (!isSupabaseEnabled()) return { error: 'Hors ligne' };

  // 1. Validation du code
  if (!friendCode || !friendCode.match(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/)) {
    return { error: 'Format invalide (ex: B4R-1ST)' };
  }
  if (friendCode === myUserCode) {
    return { error: "C'est ton propre code 😄" };
  }

  // 2. Cooldown anti-spam
  const lastSent = lastRequestSent[friendCode] ?? 0;
  const elapsed = Date.now() - lastSent;
  if (elapsed < FRIEND_REQUEST_LIMITS.COOLDOWN_MS) {
    const remaining = Math.ceil((FRIEND_REQUEST_LIMITS.COOLDOWN_MS - elapsed) / 1000);
    return { error: `Attends ${remaining}s avant de réessayer` };
  }

  // 3. Vérifier que le code cible existe
  const { data: friend, error: lookupErr } = await supabase
    .from('users')
    .select('id, user_code, user_name')
    .eq('user_code', friendCode)
    .maybeSingle();

  if (lookupErr || !friend) {
    return { error: "Ce code n'existe pas" };
  }

  // 4. Récupérer mon ID
  const { data: me } = await supabase
    .from('users')
    .select('id')
    .eq('user_code', myUserCode)
    .maybeSingle();

  if (!me) return { error: 'Profil non trouvé' };

  // 5. Vérifier qu'on n'a pas déjà une relation (peu importe le statut)
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .eq('user_id', me.id)
    .eq('friend_code', friendCode)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'accepted') return { error: 'Déjà dans tes amis' };
    if (existing.status === 'pending') return { error: 'Demande déjà envoyée' };
  }

  // 6. Vérifier la limite des 50 pending
  const { count: pendingCount } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', me.id)
    .eq('status', 'pending');

  if ((pendingCount ?? 0) >= FRIEND_REQUEST_LIMITS.MAX_PENDING) {
    return { error: 'Trop de demandes en attente (max 50)' };
  }

  // 7. Créer la demande (status='pending')
  const { error: insertErr } = await supabase
    .from('friendships')
    .insert({
      user_id: me.id,
      friend_code: friendCode,
      status: 'pending',
    });

  if (insertErr) {
    return { error: 'Erreur : ' + insertErr.message };
  }

  // 8. Enregistrer le moment du dernier envoi (cooldown)
  lastRequestSent[friendCode] = Date.now();

  return { success: true, friend };
}

/**
 * Récupère les demandes d'amis REÇUES (que d'autres m'ont envoyées).
 * Renvoie chacune avec le profil de l'expéditeur.
 */
export async function getReceivedFriendRequests(myUserCode) {
  if (!isSupabaseEnabled() || !myUserCode) return [];

  // 1. Trouver toutes les amitiés où je suis le 'friend_code' et le statut est 'pending'
  const { data: requests } = await supabase
    .from('friendships')
    .select('id, user_id, added_at')
    .eq('friend_code', myUserCode)
    .eq('status', 'pending')
    .order('added_at', { ascending: false });

  if (!requests || requests.length === 0) return [];

  // 2. Récupérer les profils des expéditeurs
  const userIds = requests.map(r => r.user_id);
  const { data: senders } = await supabase
    .from('users')
    .select('id, user_code, user_name, user_avatar, level')
    .in('id', userIds);

  const senderMap = {};
  (senders || []).forEach(s => { senderMap[s.id] = s; });

  return requests.map(r => ({
    request_id: r.id,
    added_at: r.added_at,
    ...senderMap[r.user_id],
  })).filter(r => r.user_code); // skip si profil expéditeur supprimé
}

/**
 * Récupère mes demandes ENVOYÉES en attente (pour info — A ne peut pas les annuler).
 */
export async function getSentFriendRequests(myUserCode) {
  if (!isSupabaseEnabled() || !myUserCode) return [];

  const { data: me } = await supabase
    .from('users')
    .select('id')
    .eq('user_code', myUserCode)
    .maybeSingle();

  if (!me) return [];

  const { data } = await supabase
    .from('friendships')
    .select('id, friend_code, added_at')
    .eq('user_id', me.id)
    .eq('status', 'pending');

  return data || [];
}

/**
 * Accepte une demande reçue.
 * Ça crée une relation MUTUELLE :
 * - L'amitié de A→B passe en 'accepted'
 * - On crée aussi une amitié de B→A en 'accepted'
 */
export async function acceptFriendRequest(myUserCode, requestId) {
  if (!isSupabaseEnabled()) return { error: 'Hors ligne' };

  // 1. Récupérer la demande
  const { data: request } = await supabase
    .from('friendships')
    .select('id, user_id, friend_code')
    .eq('id', requestId)
    .eq('status', 'pending')
    .maybeSingle();

  if (!request) return { error: 'Demande introuvable' };
  if (request.friend_code !== myUserCode) return { error: 'Pas autorisé' };

  // 2. Récupérer le code de l'expéditeur (pour la relation inverse)
  const { data: sender } = await supabase
    .from('users')
    .select('user_code')
    .eq('id', request.user_id)
    .maybeSingle();

  if (!sender) return { error: 'Expéditeur introuvable' };

  // 3. Récupérer mon ID
  const { data: me } = await supabase
    .from('users')
    .select('id')
    .eq('user_code', myUserCode)
    .maybeSingle();

  if (!me) return { error: 'Mon profil introuvable' };

  // 4. Marquer la demande comme acceptée
  await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', requestId);

  // 5. Créer la relation inverse (moi → lui) en 'accepted'
  // Vérifier qu'elle n'existe pas déjà avant d'insérer
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .eq('user_id', me.id)
    .eq('friend_code', sender.user_code)
    .maybeSingle();

  if (!existing) {
    await supabase
      .from('friendships')
      .insert({
        user_id: me.id,
        friend_code: sender.user_code,
        status: 'accepted',
      });
  } else if (existing.status === 'pending') {
    // Cas rare : on lui avait aussi envoyé une demande qu'il avait pas encore vue
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', existing.id);
  }

  return { success: true, friendName: sender.user_code };
}

/**
 * Refuse une demande reçue (= la supprime).
 * Action silencieuse côté expéditeur.
 */
export async function declineFriendRequest(myUserCode, requestId) {
  if (!isSupabaseEnabled()) return { error: 'Hors ligne' };

  const { data: request } = await supabase
    .from('friendships')
    .select('id, friend_code')
    .eq('id', requestId)
    .eq('status', 'pending')
    .maybeSingle();

  if (!request) return { error: 'Demande introuvable' };
  if (request.friend_code !== myUserCode) return { error: 'Pas autorisé' };

  // Supprimer la demande
  await supabase
    .from('friendships')
    .delete()
    .eq('id', requestId);

  return { success: true };
}

/**
 * Modifier la fonction getFriends existante pour qu'elle ne récupère
 * QUE les amis avec status='accepted' (pas les pending).
 */
export async function getFriends(myUserCode) {
  if (!isSupabaseEnabled() || !myUserCode) return [];

  const { data: me } = await supabase
    .from('users')
    .select('id')
    .eq('user_code', myUserCode)
    .maybeSingle();

  if (!me) return [];

  // FILTRE IMPORTANT : status='accepted' uniquement
  const { data: links } = await supabase
    .from('friendships')
    .select('friend_code')
    .eq('user_id', me.id)
    .eq('status', 'accepted');

  if (!links || links.length === 0) return [];

  const codes = links.map(l => l.friend_code);
  const { data: profiles } = await supabase
    .from('users')
    .select('*')
    .in('user_code', codes);

  return profiles || [];
}

/**
 * Détecter les NOUVELLES amitiés acceptées depuis la dernière connexion.
 * Comparer la liste actuelle d'amis avec celle stockée localement.
 */
export async function getNewlyAcceptedFriends(myUserCode, knownFriendCodes) {
  const currentFriends = await getFriends(myUserCode);
  const currentCodes = currentFriends.map(f => f.user_code);

  // Filtrer les nouveaux (présents dans current mais pas dans known)
  const newOnes = currentFriends.filter(f => !knownFriendCodes.includes(f.user_code));

  return newOnes;
}
```

⚠️ **Garder l'ancienne fonction `addFriend`** pour rétro-compat le temps de migrer toute l'UI. On la marquera `deprecated` plus tard.

## Vérifications phase 2
- ☑ Toutes les fonctions exportées sans erreur
- ☑ Pas de plantage au chargement
- ☑ La fonction `getFriends` filtre maintenant sur `status='accepted'`

---

# ══════════════════════════════════════════════
# PHASE 3 — UI : Section "Demandes reçues" dans le profil
# ══════════════════════════════════════════════

Modifier le composant `FriendsTab` (ou la section amis du profil) pour ajouter :
1. **Compteur de demandes reçues** en haut (avec badge)
2. **Liste des demandes** avec boutons Accepter / Refuser

## Structure visuelle

```
┌────────────────────────────────────┐
│ MON CODE AMI : B4R-1ST  [Copier]  │
├────────────────────────────────────┤
│ Ajouter un ami :                   │
│ [    Code    ] [Envoyer]           │
├────────────────────────────────────┤
│ 📬 Demandes reçues (2) ●          │  ← nouveau
│   👤 Léa  Niveau 3                 │
│   [✓ Accepter]  [✗ Refuser]        │
│                                    │
│   👤 Hugo Niveau 5                 │
│   [✓ Accepter]  [✗ Refuser]        │
├────────────────────────────────────┤
│ 👥 Mes amis (3)                    │
│   ... liste existante ...          │
└────────────────────────────────────┘
```

## Composant `FriendRequestsSection`

```jsx
function FriendRequestsSection({ userCode, onRequestHandled }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await getReceivedFriendRequests(userCode);
    setRequests(list);
    setLoading(false);
  }, [userCode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAccept = async (requestId) => {
    const result = await acceptFriendRequest(userCode, requestId);
    if (result.success) {
      // Retirer de la liste localement
      setRequests(r => r.filter(req => req.request_id !== requestId));
      // Rafraîchir la liste d'amis dans le composant parent
      onRequestHandled?.('accepted');
    }
  };

  const handleDecline = async (requestId) => {
    const result = await declineFriendRequest(userCode, requestId);
    if (result.success) {
      setRequests(r => r.filter(req => req.request_id !== requestId));
      onRequestHandled?.('declined');
    }
  };

  if (loading) return null; // ou un mini loader
  if (requests.length === 0) return null; // section cachée si vide

  return (
    <div style={{ marginTop: 16, marginBottom: 16 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 13,
          fontWeight: 800,
          color: '#2C1810',
        }}>
          📬 Demandes reçues
        </span>
        <span style={{
          background: 'linear-gradient(135deg, #D4A017, #C17F3C)',
          color: 'white',
          fontWeight: 800,
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 100,
          minWidth: 22,
          textAlign: 'center',
        }}>
          {requests.length}
        </span>
      </div>

      {requests.map(req => (
        <div
          key={req.request_id}
          style={{
            background: 'white',
            borderRadius: 14,
            padding: 12,
            marginBottom: 8,
            border: '2px solid #D4A017',
            boxShadow: '0 4px 12px rgba(212,160,23,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <Avatar id={req.user_avatar} size={42} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#2C1810' }}>
                {req.user_name}
              </div>
              <div style={{ fontSize: 11, color: '#8B6A5A' }}>
                Niveau {req.level} · veut être ton ami
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleAccept(req.request_id)}
              style={{
                flex: 1,
                padding: '10px',
                background: 'linear-gradient(135deg, #D4A017, #C17F3C)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              ✓ Accepter
            </button>
            <button
              onClick={() => handleDecline(req.request_id)}
              style={{
                flex: 1,
                padding: '10px',
                background: '#F5EFE6',
                color: '#5C3317',
                border: '1.5px solid #E8DDD0',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              ✗ Refuser
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Modification du formulaire "Ajouter un ami"

Le bouton "Ajouter" doit maintenant appeler `sendFriendRequest` au lieu de `addFriend`. Le feedback affiché change :

```jsx
const handleSend = async () => {
  if (sending) return;
  setSending(true);
  const result = await sendFriendRequest(userCode, inputCode.toUpperCase());
  setSending(false);

  if (result.error) {
    setFeedback({ type: 'error', msg: result.error });
  } else {
    setFeedback({
      type: 'success',
      msg: `📬 Demande envoyée à ${result.friend.user_name} !`
    });
    setInputCode('');
  }
  setTimeout(() => setFeedback(null), 4000);
};
```

⚠️ **Le bouton doit s'appeler "Envoyer la demande"** (pas "Ajouter") pour bien refléter qu'il faudra l'accord du destinataire.

## Vérifications phase 3
- ☑ Section "📬 Demandes reçues (X)" apparaît si demandes pending, sinon cachée
- ☑ Cartes des demandes avec bordure dorée distinctive
- ☑ Boutons Accepter (gradient doré) et Refuser (beige neutre)
- ☑ Tap "Accepter" → la demande disparaît + l'ami apparaît dans la liste d'amis
- ☑ Tap "Refuser" → la demande disparaît silencieusement
- ☑ Bouton "Envoyer la demande" remplace "Ajouter"
- ☑ Feedback : "📬 Demande envoyée à [nom]" au lieu de "✓ Ajouté"

---

# ══════════════════════════════════════════════
# PHASE 4 — Notification au lancement
# ══════════════════════════════════════════════

Quand l'utilisateur ouvre l'app, vérifier 2 choses :

1. **A-t-il des demandes reçues en attente ?** → afficher modal "Tu as X nouvelles demandes d'amis"
2. **Une de ses demandes envoyées a-t-elle été acceptée depuis sa dernière connexion ?** → afficher modal "Léa a accepté ta demande !"

## Logique de détection

```jsx
function CookiMiner() {
  // ... état existant ...
  const [pendingNotifications, setPendingNotifications] = useState([]);

  useEffect(() => {
    if (!userCode) return;

    let alive = true;
    (async () => {
      // 1. Récupérer les demandes reçues
      const received = await getReceivedFriendRequests(userCode);

      // 2. Détecter les nouvelles amitiés acceptées
      const knownFriendCodes = JSON.parse(
        localStorage.getItem('cookiminer:knownFriendCodes') || '[]'
      );
      const newlyAccepted = await getNewlyAcceptedFriends(userCode, knownFriendCodes);

      if (!alive) return;

      const notifs = [];

      // Demandes reçues
      if (received.length > 0) {
        notifs.push({
          type: 'received',
          count: received.length,
          firstName: received[0].user_name,
        });
      }

      // Nouvelles amitiés acceptées
      newlyAccepted.forEach(f => {
        notifs.push({
          type: 'accepted',
          friendName: f.user_name,
        });
      });

      // Mettre à jour la liste connue
      const allFriends = await getFriends(userCode);
      localStorage.setItem(
        'cookiminer:knownFriendCodes',
        JSON.stringify(allFriends.map(f => f.user_code))
      );

      if (notifs.length > 0) {
        setPendingNotifications(notifs);
      }
    })();

    return () => { alive = false; };
  }, [userCode]);

  // Afficher la première notif (les autres viennent après)
  const currentNotif = pendingNotifications[0];

  return (
    <>
      {/* ... reste de l'app ... */}

      {currentNotif && (
        <FriendNotificationModal
          notification={currentNotif}
          onClose={() => setPendingNotifications(n => n.slice(1))}
          onSeeRequests={() => {
            // Aller à l'onglet Profil → section Amis → Demandes
            setPendingNotifications(n => n.slice(1));
            setTab('profile');
          }}
        />
      )}
    </>
  );
}
```

## Composant `FriendNotificationModal`

```jsx
function FriendNotificationModal({ notification, onClose, onSeeRequests }) {
  if (notification.type === 'received') {
    return (
      <div style={overlayStyle}>
        <div style={modalCardStyle}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>📬</div>
          <div style={{ fontSize: 11, color: '#D4A017', letterSpacing: 3, textTransform: 'uppercase' }}>
            Nouvelle demande d'ami
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#2C1810', marginTop: 6 }}>
            {notification.count === 1
              ? `${notification.firstName} veut être ton ami !`
              : `Tu as ${notification.count} nouvelles demandes`}
          </div>
          <div style={{ fontSize: 13, color: '#8B6A5A', marginTop: 8 }}>
            Va sur ton profil pour les accepter ou refuser.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button onClick={onClose} style={btnSecondaryStyle}>Plus tard</button>
            <button onClick={onSeeRequests} style={btnPrimaryStyle}>Voir</button>
          </div>
        </div>
      </div>
    );
  }

  if (notification.type === 'accepted') {
    return (
      <div style={overlayStyle}>
        <div style={modalCardStyle}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 11, color: '#D4A017', letterSpacing: 3, textTransform: 'uppercase' }}>
            Demande acceptée !
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#2C1810', marginTop: 6 }}>
            {notification.friendName} t'a ajouté en ami !
          </div>
          <div style={{ fontSize: 13, color: '#8B6A5A', marginTop: 8 }}>
            Vous êtes maintenant amis sur CookiMiner.
          </div>
          <button onClick={onClose} style={{ ...btnPrimaryStyle, marginTop: 18, width: '100%' }}>
            Génial ! 🎉
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Styles partagés
const overlayStyle = {
  position: 'fixed', inset: 0,
  background: 'rgba(45, 22, 8, 0.7)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 200, padding: 20,
};
const modalCardStyle = {
  background: 'linear-gradient(140deg, #4A2C17, #7D4E1F)',
  borderRadius: 20, padding: 24, maxWidth: 340, width: '100%',
  color: 'white', textAlign: 'center',
  border: '2px solid rgba(212,160,23,0.4)',
  boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
};
const btnPrimaryStyle = {
  flex: 1, padding: '12px 24px',
  background: 'linear-gradient(135deg, #D4A017, #C17F3C)',
  color: 'white', border: 'none', borderRadius: 14,
  fontWeight: 800, fontSize: 14, cursor: 'pointer',
};
const btnSecondaryStyle = {
  flex: 1, padding: '12px 24px',
  background: 'rgba(255,255,255,0.1)',
  color: 'white', border: '1.5px solid rgba(255,255,255,0.3)',
  borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer',
};
```

## Vérifications phase 4
- ☑ Au lancement, si demande reçue en attente → modal "📬 X veut être ton ami"
- ☑ Tap "Voir" → ouvre le profil avec la section demandes visible
- ☑ Tap "Plus tard" → ferme la modal
- ☑ Si plusieurs notifs (ex: 1 reçue + 1 acceptée) → elles s'affichent l'une après l'autre
- ☑ Au lancement, si une demande envoyée a été acceptée → modal "🎉 [nom] t'a ajouté"
- ☑ Si rien de nouveau → aucune modal au lancement

---

# ══════════════════════════════════════════════
# PHASE 5 — Tests finaux
# ══════════════════════════════════════════════

## Scénarios à tester (avec 2 navigateurs ou 2 comptes)

### Test 1 — Demande basique
1. Compte A envoie une demande à B
2. **A** : voit "📬 Demande envoyée à B" en feedback
3. **B** : ouvre l'app → modal "📬 A veut être ton ami"
4. **B** : tap "Voir" → arrive sur le profil avec demande visible
5. **B** : tap "Accepter" → demande disparaît, A apparaît dans la liste d'amis
6. **A** : ouvre l'app → modal "🎉 B t'a ajouté en ami !"

### Test 2 — Refus
1. **A** envoie demande à **B**
2. **B** : tap "Refuser" → demande supprimée
3. **A** : aucune notification (silencieux)
4. **B** : la demande n'apparaît plus dans sa section
5. **A** peut renvoyer une nouvelle demande après 30s (cooldown)

### Test 3 — Validation et erreurs
1. **A** envoie demande à un code inexistant → "Ce code n'existe pas"
2. **A** envoie demande à son propre code → "C'est ton propre code 😄"
3. **A** envoie 2 demandes au même code → la 2e dit "Demande déjà envoyée"
4. **A** est ami avec **B**, essaie d'envoyer demande → "Déjà dans tes amis"
5. **A** envoie demande à **B**, puis re-essaie dans les 30s → "Attends Xs"

### Test 4 — Migration des amitiés existantes
1. Avant le brief : **A** et **B** étaient déjà amis (ancien système)
2. Après migration SQL : la relation est en `accepted` automatiquement
3. **A** voit toujours **B** dans sa liste d'amis (pas de régression)

### Test 5 — Reset complet (brief précédent)
1. **A** a une demande pending de **B**
2. **A** réinitialise sa progression (BRIEF_FIX_RESET)
3. La demande est supprimée de la base (cascade ou suppression manuelle dans `deleteUserCompletely`)
4. **B** ne voit plus son ancien profil dans le classement

⚠️ **Important** : compléter `deleteUserCompletely` dans le brief précédent pour aussi supprimer les amitiés OÙ l'utilisateur est `friend_code`.

## Vérifications globales
- ☑ Pas de rouge ni de vert (palette café uniquement)
- ☑ Mobile-friendly (testé sur 390px)
- ☑ Pas de spam Supabase (max 1 requête / action)
- ☑ Pas de fuite mémoire (les listeners se nettoient)
- ☑ Tout fonctionne en mode hors ligne (modes dégradés activés)

---

# ══════════════════════════════════════════════
# 💡 NOTES IMPORTANTES POUR CLAUDE CODE
# ══════════════════════════════════════════════

- **Conserver l'ancienne fonction `addFriend`** pour rétro-compat. Marquer `@deprecated` en commentaire mais ne pas supprimer immédiatement.
- **Les amitiés sont toujours bilatérales** : quand on accepte, créer la relation INVERSE en `accepted`. Comme ça `getFriends()` marche pour les 2 utilisateurs.
- **Anti-spam** : le cooldown 30s est en mémoire (objet `lastRequestSent`). Si l'utilisateur recharge la page, le cooldown se reset. C'est OK pour CookiMiner.
- **Performance** : `getReceivedFriendRequests` fait 2 requêtes (demandes + profils expéditeurs). Acceptable car appelé peu souvent.
- **`localStorage` `knownFriendCodes`** : garde la liste des codes amis acceptés pour détecter les nouveaux. Mis à jour à chaque ouverture de l'app.
- **Notifications** : si l'utilisateur a 5 amis qui acceptent en même temps, on affiche 5 modals à la suite. Acceptable mais on peut améliorer plus tard (groupage).
- **Réutiliser le composant `<Avatar>`** existant.
- **Pas de système "Bloquer"** dans cette version (assumé).

Bon dev ! ☕👥📬

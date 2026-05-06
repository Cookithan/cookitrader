# Brief — Backend Supabase (Amis & Classement en ligne) 🌐

Lis bien le CLAUDE.md avant de commencer.
**Important : ce brief est gros. Fais UNE phase à la fois et attends la validation utilisateur entre chaque.**

---

## ⚠️ Pré-requis avant de commencer

Avant que Claude Code commence quoi que ce soit, **l'utilisateur doit d'abord créer un compte Supabase et configurer son projet**. Cette partie ne peut pas être faite par Claude Code.

### Action utilisateur — Créer le projet Supabase

1. Aller sur **https://supabase.com**
2. Cliquer **"Start your project"** → se connecter avec GitHub
3. Cliquer **"New project"** :
   - **Name** : `cookitrader`
   - **Database password** : générer un mot de passe **fort** et le **noter quelque part** (à ne pas perdre)
   - **Region** : `West EU (Ireland)` ou `Frankfurt` (le plus proche de la France)
   - **Plan** : `Free`
4. Attendre 1-2 minutes que le projet soit créé

### Action utilisateur — Récupérer les clés

5. Une fois le projet créé, aller dans **Settings** (en bas à gauche) → **API**
6. Copier 2 valeurs et les **donner à Claude Code** :
   - **Project URL** (ex. `https://abcdefgh.supabase.co`)
   - **anon / public** key (la longue clé qui commence par `eyJ...`)

⚠️ Ces clés sont **publiques** (elles peuvent être commitées sur GitHub), c'est normal pour la `anon` key. La sécurité est gérée par les **Row Level Security (RLS)** côté Supabase.

---

# ══════════════════════════════════════════════
# PHASE 1 — Configuration du projet & connexion
# ══════════════════════════════════════════════

## Étape 1A — Installer le SDK Supabase

```bash
npm install @supabase/supabase-js
```

## Étape 1B — Créer les variables d'environnement

Créer un fichier `.env.local` à la racine du projet (à NE PAS committer — vérifier qu'il est dans `.gitignore`) :

```
VITE_SUPABASE_URL=https://xxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxx
```

Ces valeurs proviennent du dashboard Supabase.

## Étape 1C — Créer un client Supabase partagé

Créer un fichier `src/lib/supabase.js` :

```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars missing. Online features disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseEnabled = () => supabase !== null;
```

⚠️ Si `supabase` est null (en cas de souci), l'app doit continuer à marcher en local (mode dégradé).

## Vérifications phase 1
- ☑ `npm install @supabase/supabase-js` réussi
- ☑ Fichier `.env.local` créé avec les bonnes valeurs
- ☑ `.env.local` bien dans `.gitignore`
- ☑ Fichier `src/lib/supabase.js` créé
- ☑ Pas d'erreur dans la console navigateur

---

# ══════════════════════════════════════════════
# PHASE 2 — Création des tables Supabase (action utilisateur)
# ══════════════════════════════════════════════

⚠️ **Cette phase doit être faite par l'utilisateur dans le dashboard Supabase**, pas par Claude Code.

Claude Code doit afficher ces instructions à l'utilisateur, lui faire ouvrir le dashboard Supabase, et attendre qu'il confirme avant de continuer.

## Action utilisateur — Ouvrir l'éditeur SQL

1. Dashboard Supabase → cliquer **SQL Editor** dans le menu de gauche
2. Cliquer **"New query"**
3. Coller le SQL ci-dessous **en entier**
4. Cliquer **"Run"** (en bas à droite)

## Le SQL à exécuter

```sql
-- Table principale des utilisateurs
create table public.users (
  id uuid default gen_random_uuid() primary key,
  user_code text unique not null,
  user_name text not null,
  user_avatar text default '0',
  level int default 1,
  total_earned int default 0,
  cookies int default 0,
  streak int default 0,
  user_bio text default '',
  join_date timestamptz default now(),
  last_active timestamptz default now()
);

-- Index pour recherches rapides
create index idx_users_code on public.users(user_code);
create index idx_users_total_earned on public.users(total_earned desc);

-- Table des relations d'amitié
create table public.friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  friend_code text not null,
  added_at timestamptz default now(),
  unique(user_id, friend_code)
);

create index idx_friendships_user on public.friendships(user_id);

-- Activer Row Level Security (sécurité)
alter table public.users enable row level security;
alter table public.friendships enable row level security;

-- Politique : tout le monde peut LIRE les profils publics
create policy "Profiles are viewable by everyone"
  on public.users for select
  using (true);

-- Politique : tout le monde peut INSÉRER (création de compte anonyme)
create policy "Anyone can create a profile"
  on public.users for insert
  with check (true);

-- Politique : seul le propriétaire peut UPDATE son propre profil
-- (basé sur user_code stocké côté client)
create policy "Users can update own profile via code"
  on public.users for update
  using (true)
  with check (true);

-- Politique : tout le monde peut LIRE les amitiés
create policy "Friendships are viewable by everyone"
  on public.friendships for select
  using (true);

-- Politique : tout le monde peut INSÉRER une amitié
create policy "Anyone can add a friendship"
  on public.friendships for insert
  with check (true);

-- Politique : tout le monde peut DELETE une amitié
create policy "Anyone can delete a friendship"
  on public.friendships for delete
  using (true);
```

⚠️ **Note de sécurité** : Pour rester simple sans authentification, on accepte que n'importe qui puisse modifier n'importe quel profil via `user_code`. C'est suffisant pour une app de jeu non-compétitive. Si l'app grossit, on pourra ajouter une vraie auth Supabase plus tard.

## Action utilisateur — Vérifier

5. Aller dans **Table Editor** (menu gauche)
6. Vérifier que les 2 tables sont créées : `users` et `friendships`
7. Confirmer à Claude Code que c'est OK

## Vérifications phase 2
- ☑ Les 2 tables apparaissent dans Table Editor
- ☑ Aucune erreur dans le SQL Editor
- ☑ RLS activée sur les 2 tables (icône cadenas verte)

---

# ══════════════════════════════════════════════
# PHASE 3 — Synchronisation du profil utilisateur
# ══════════════════════════════════════════════

## Objectif
Quand un utilisateur joue, son profil est automatiquement créé/mis à jour dans Supabase.

## Étape 3A — Création du profil au premier lancement

Modifier la logique d'initialisation : si `userCode` est généré pour la première fois, créer le profil dans Supabase.

```js
// src/lib/supabaseSync.js
import { supabase, isSupabaseEnabled } from './supabase';

export async function createUserProfile(profile) {
  if (!isSupabaseEnabled()) return null;

  const { data, error } = await supabase
    .from('users')
    .insert({
      user_code: profile.userCode,
      user_name: profile.userName,
      user_avatar: String(profile.userAvatar),
      level: profile.level,
      total_earned: profile.totalEarned,
      cookies: profile.cookies,
      streak: profile.streak,
      user_bio: profile.userBio || '',
      join_date: profile.joinDate,
      last_active: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.warn('createUserProfile error:', error);
    return null;
  }
  return data;
}
```

## Étape 3B — Sync automatique des changements

Ajouter un `useEffect` dans `CookiTrader` qui sync le profil Supabase à chaque changement important (avec **debounce** pour ne pas spammer le serveur) :

```js
// Sync vers Supabase (debounced 5s)
useEffect(() => {
  if (!isSupabaseEnabled()) return;
  if (!userCode) return;

  const t = setTimeout(async () => {
    await supabase
      .from('users')
      .upsert({
        user_code: userCode,
        user_name: userName,
        user_avatar: String(userAvatar),
        level,
        total_earned: totalEarned,
        cookies,
        streak,
        user_bio: userBio || '',
        last_active: new Date().toISOString(),
      }, { onConflict: 'user_code' });
  }, 5000); // attend 5s avant d'envoyer

  return () => clearTimeout(t);
}, [userCode, userName, userAvatar, level, totalEarned, cookies, streak, userBio]);
```

⚠️ Le **debounce de 5 secondes** est important : si l'utilisateur clique 50 fois sur le défi de clics, on ne fait pas 50 appels au serveur, mais 1 seul après 5s d'inactivité. Ça reste **largement** sous la limite gratuite de Supabase.

## Étape 3C — Indicateur de connexion

Petit indicateur discret en haut du Profil :
- ✅ Vert "En ligne" si `isSupabaseEnabled() && lastSyncOk`
- ⚠️ Gris "Hors ligne" si pas de connexion

```jsx
{isSupabaseEnabled() ? (
  <div style={{ fontSize: 11, color: '#D4A017' }}>● Synchronisé</div>
) : (
  <div style={{ fontSize: 11, color: '#8B6A5A' }}>○ Hors ligne</div>
)}
```

⚠️ **Pas de rouge ni de vert** : utiliser caramel (`#D4A017`) pour "OK" et moka (`#8B6A5A`) pour "déconnecté".

## Vérifications phase 3
- ☑ Au premier lancement, un profil est créé dans Supabase
- ☑ Modifier son nom → le changement apparaît dans Supabase après 5s
- ☑ Gagner des cookies → la valeur monte dans Supabase après 5s
- ☑ L'app continue de fonctionner si Supabase est down (mode dégradé)
- ☑ Indicateur "En ligne / Hors ligne" sur le profil

---

# ══════════════════════════════════════════════
# PHASE 4 — Système d'amis fonctionnel 👥
# ══════════════════════════════════════════════

## Objectif
Activer le vrai système d'amis : ajouter un code, voir le vrai profil de l'autre joueur.

## Étape 4A — Ajouter un ami

```js
// src/lib/supabaseSync.js
export async function addFriend(myUserCode, friendCode) {
  if (!isSupabaseEnabled()) {
    return { error: 'Hors ligne' };
  }

  // Vérifier que le code ami existe
  const { data: friend, error: lookupErr } = await supabase
    .from('users')
    .select('id, user_code, user_name')
    .eq('user_code', friendCode)
    .single();

  if (lookupErr || !friend) {
    return { error: "Ce code n'existe pas ou personne ne l'a encore." };
  }

  // Récupérer mon ID
  const { data: me } = await supabase
    .from('users')
    .select('id')
    .eq('user_code', myUserCode)
    .single();

  if (!me) return { error: 'Profil non trouvé' };

  // Insérer la relation
  const { error: insertErr } = await supabase
    .from('friendships')
    .insert({ user_id: me.id, friend_code: friendCode });

  if (insertErr) {
    if (insertErr.code === '23505') return { error: 'Déjà dans ta liste' };
    return { error: 'Erreur : ' + insertErr.message };
  }

  return { success: true, friend };
}
```

## Étape 4B — Récupérer la liste des amis

```js
export async function getFriends(myUserCode) {
  if (!isSupabaseEnabled()) return [];

  // 1. Mon ID
  const { data: me } = await supabase
    .from('users')
    .select('id')
    .eq('user_code', myUserCode)
    .single();
  if (!me) return [];

  // 2. Mes amitiés
  const { data: links } = await supabase
    .from('friendships')
    .select('friend_code')
    .eq('user_id', me.id);
  if (!links || links.length === 0) return [];

  // 3. Profils complets des amis
  const codes = links.map(l => l.friend_code);
  const { data: profiles } = await supabase
    .from('users')
    .select('*')
    .in('user_code', codes);

  return profiles || [];
}

export async function removeFriend(myUserCode, friendCode) {
  if (!isSupabaseEnabled()) return false;
  const { data: me } = await supabase
    .from('users').select('id').eq('user_code', myUserCode).single();
  if (!me) return false;

  await supabase
    .from('friendships')
    .delete()
    .eq('user_id', me.id)
    .eq('friend_code', friendCode);
  return true;
}
```

## Étape 4C — UI mise à jour

Remplacer le composant `FriendsTab` (qui affichait "À venir") par la version fonctionnelle :

### En haut : ton code (inchangé)
Carte ESPRESSO avec code + bouton "Copier".

### Au milieu : ajouter un ami
Input + bouton, avec gestion des états :
- **Loading** : "Recherche..."
- **Success** : message vert (en caramel `#D4A017`) "✓ Ami ajouté !"
- **Error** : message moka avec le texte de l'erreur retournée

```jsx
const [inputCode, setInputCode] = useState('');
const [adding, setAdding] = useState(false);
const [feedback, setFeedback] = useState(null);

const handleAdd = async () => {
  if (!inputCode.match(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/)) {
    setFeedback({ type: 'error', msg: 'Format invalide (ex: B4R-1ST)' });
    return;
  }
  if (inputCode === userCode) {
    setFeedback({ type: 'error', msg: "C'est ton propre code 😄" });
    return;
  }
  setAdding(true);
  const result = await addFriend(userCode, inputCode);
  setAdding(false);
  if (result.error) {
    setFeedback({ type: 'error', msg: result.error });
  } else {
    setFeedback({ type: 'success', msg: `✓ ${result.friend.user_name} ajouté !` });
    setInputCode('');
    refreshFriendsList(); // reload la liste
  }
};
```

### En bas : liste des amis (vraie data)

Charger via `useEffect` au montage du composant :

```jsx
useEffect(() => {
  let alive = true;
  (async () => {
    const list = await getFriends(userCode);
    if (alive) setFriendsList(list);
  })();
  return () => { alive = false; };
}, [userCode]);
```

Pour chaque ami, afficher une `FriendCard` :
- Avatar (selon `user_avatar`)
- Nom + niveau
- **Différence de cookies** par rapport à toi (vrais cookies depuis Supabase) :
  - Plus que toi → "💪 +234 cookies par rapport à toi" en caramel
  - Moins que toi → "🎯 -156 cookies par rapport à toi" en moka
  - Égal → "🤝 Vous êtes à égalité"
- Date de dernière activité ("Il y a 2h", "Hier", "Il y a 3 jours")
- Bouton ✕ pour retirer

## Vérifications phase 4
- ☑ Ajouter le code d'un autre profil de test fonctionne
- ☑ Le profil ami récupéré a les vraies données (nom, niveau, cookies)
- ☑ Quand le profil ami change ses cookies, ça se met à jour (au prochain refresh)
- ☑ Retirer un ami fonctionne
- ☑ Erreurs gérées proprement (code invalide, déjà ami, etc.)

---

# ══════════════════════════════════════════════
# PHASE 5 — Classement en ligne 🏆
# ══════════════════════════════════════════════

## Objectif
Remplacer le classement actuel (avec les 29 bots fictifs) par un **vrai classement basé sur les utilisateurs réels** de Supabase.

## Étape 5A — Récupérer le top 50 des joueurs

```js
// src/lib/supabaseSync.js
export async function getLeaderboard(limit = 50) {
  if (!isSupabaseEnabled()) return [];

  const { data, error } = await supabase
    .from('users')
    .select('user_code, user_name, user_avatar, level, total_earned, streak')
    .order('total_earned', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('getLeaderboard error:', error);
    return [];
  }
  return data || [];
}
```

## Étape 5B — Récupérer ma position

```js
export async function getMyRank(myUserCode) {
  if (!isSupabaseEnabled()) return null;

  const { data: me } = await supabase
    .from('users')
    .select('total_earned')
    .eq('user_code', myUserCode)
    .single();
  if (!me) return null;

  // Compter combien d'utilisateurs ont plus que moi
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gt('total_earned', me.total_earned);

  return (count ?? 0) + 1; // mon rang
}
```

## Étape 5C — Refondre le composant Classement

**Supprimer** la liste des 29 bots fictifs.
**Remplacer** par la vraie data Supabase.

Affichage :

```jsx
function LeaderboardTab({ userCode }) {
  const [list, setList] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [leaderboard, rank] = await Promise.all([
        getLeaderboard(50),
        getMyRank(userCode),
      ]);
      if (alive) {
        setList(leaderboard);
        setMyRank(rank);
        setLoading(false);
      }
    })();

    // Refresh toutes les 30 secondes
    const interval = setInterval(async () => {
      const [leaderboard, rank] = await Promise.all([
        getLeaderboard(50),
        getMyRank(userCode),
      ]);
      if (alive) {
        setList(leaderboard);
        setMyRank(rank);
      }
    }, 30000);

    return () => { alive = false; clearInterval(interval); };
  }, [userCode]);

  if (loading) return <LoadingState />;

  return (
    <>
      {/* Bandeau du joueur */}
      <div style={{ /* carte ESPRESSO avec mon rang */ }}>
        <div>Ton rang</div>
        <div style={{ fontSize: 32, color: '#D4A017' }}>#{myRank}</div>
        <div>sur {list.length}+ joueurs</div>
      </div>

      {/* Top 50 */}
      {list.map((user, i) => (
        <LeaderRow
          key={user.user_code}
          rank={i + 1}
          user={user}
          isMe={user.user_code === userCode}
        />
      ))}
    </>
  );
}
```

### Composant `LeaderRow`

Pour chaque ligne :
- Rang (avec couleurs spéciales pour 1er, 2e, 3e — toujours en tons café)
  - 🥇 1er : fond gradient or `linear-gradient(135deg, #F0C050, #D4A017)`
  - 🥈 2e : fond gradient bronze `linear-gradient(135deg, #C8A878, #A0784E)`
  - 🥉 3e : fond gradient cuivre `linear-gradient(135deg, #B07840, #7D4E1F)`
  - 4+ : fond blanc cassé
- Avatar
- Nom + niveau
- Total cookies gagnés en gros
- Si `isMe` → bordure dorée + icône ✦

## Vérifications phase 5
- ☑ Le classement affiche les vrais utilisateurs Supabase
- ☑ Mon rang se calcule correctement
- ☑ Le top 3 a un style spécial (or/bronze/cuivre)
- ☑ Mon profil est mis en évidence dans la liste
- ☑ Refresh automatique toutes les 30s
- ☑ Si je joue, mes cookies montent dans le classement (après le delay de sync de 5s)
- ☑ Plus aucun bot fictif visible

---

# ══════════════════════════════════════════════
# PHASE 6 — Optimisations & cache
# ══════════════════════════════════════════════

## Objectif
S'assurer que l'app reste **rapide et fluide** même avec les appels réseau.

## Étape 6A — Mode offline-first

L'app doit toujours **afficher d'abord les données locales** (localStorage), puis charger les données serveur en arrière-plan.

Si Supabase est down ou lent → l'app continue de fonctionner avec les données locales. Pas de blocage utilisateur.

## Étape 6B — Cache du classement

Stocker le dernier classement reçu dans `sessionStorage` pour qu'il s'affiche instantanément à l'ouverture du tab :

```js
const cached = sessionStorage.getItem('leaderboard:cache');
if (cached) {
  setList(JSON.parse(cached));
}
// Puis fetch async
const fresh = await getLeaderboard(50);
sessionStorage.setItem('leaderboard:cache', JSON.stringify(fresh));
setList(fresh);
```

## Étape 6C — Gestion des erreurs réseau

Wrapper toutes les fonctions Supabase avec `try/catch`.
En cas d'erreur réseau, afficher un toast discret en bas :

```jsx
{networkError && (
  <div style={{
    position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(74,44,23,0.9)',
    color: '#F0E6D3',
    padding: '8px 16px',
    borderRadius: 12,
    fontSize: 12,
  }}>
    ⚠️ Connexion limitée — données locales affichées
  </div>
)}
```

## Vérifications phase 6
- ☑ L'app se charge instantanément même sans Internet
- ☑ Le classement s'affiche même en cache si pas de connexion
- ☑ Pas d'écran blanc en attente de Supabase
- ☑ Toast d'erreur discret en cas de souci réseau

---

# ══════════════════════════════════════════════
# CONCERNANT LES LIMITES DU PLAN GRATUIT
# ══════════════════════════════════════════════

Plan **Free Supabase** :
- ✅ 500 MB de base de données → des **dizaines de milliers** d'utilisateurs avant saturation
- ✅ Bande passante illimitée pour les requêtes
- ⚠️ Si **7 jours sans activité** → projet en pause (cliquer un bouton pour le réveiller)

Tant que tu es en dessous de **~10 000 utilisateurs actifs/mois**, c'est largement gratuit.
Au-delà, le plan Pro est à **25$/mois**.

---

# ══════════════════════════════════════════════
# CONCERNANT LA TRICHE
# ══════════════════════════════════════════════

⚠️ Comme on n'a pas d'authentification serveur, **un utilisateur technique pourrait modifier son score directement via l'API**.

Pour CookiTrader, c'est acceptable parce que :
- Le classement est **fun**, pas compétitif avec récompenses réelles
- L'app est petite, peu d'incitation à tricher
- Si quelqu'un triche, ça ne casse rien (il triche pour lui-même)

Si plus tard l'app grossit et qu'il faut sécuriser, on ajoutera :
- Une vraie authentification Supabase
- Des **Edge Functions** qui valident les gains côté serveur

Pour l'instant, on reste simple.

# Brief — Voir le profil d'un ami / du top 1 👤👀

Lis bien le CLAUDE.md avant de commencer.
**Procède UNE étape à la fois et attends ma validation visuelle entre chaque.**

---

## 🎯 Concept

Permettre aux joueurs de **consulter le profil** :
- De **leurs amis** depuis leur liste d'amis
- Du **top 1 du classement Cookies** (peu importe si c'est un ami ou pas)

Ouverture en **modal qui glisse depuis le bas** (style Instagram). Profil en **mode résumé** : avatar, pseudo, niveau, cookies, badges, bio, classements.

---

## ⚠️ Pré-requis

- Le système d'amis Supabase fonctionne (le brief Supabase a été appliqué)
- Le classement online par cookies fonctionne avec de vrais utilisateurs
- Les avatars / badges / titres / bios sont déjà persistés dans Supabase (table `users`)

---

# ══════════════════════════════════════════════
# ÉTAPE 1 — Fonction de récupération du profil
# ══════════════════════════════════════════════

Ajouter une fonction qui récupère le profil **complet** d'un utilisateur via son `user_code`.

À placer dans `src/lib/supabaseSync.js` (ou équivalent) :

```js
import { supabase, isSupabaseEnabled } from './supabase';

/**
 * Récupère le profil public d'un utilisateur via son user_code.
 * Inclut aussi sa position dans les classements.
 *
 * @param {string} userCode Code de l'utilisateur cible
 * @returns {Promise<Object|null>} Profil enrichi ou null
 */
export async function getPublicProfile(userCode) {
  if (!isSupabaseEnabled() || !userCode) return null;

  // 1. Récupérer le profil de base
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_code', userCode)
    .maybeSingle();

  if (error || !user) {
    console.warn('getPublicProfile: utilisateur introuvable', userCode);
    return null;
  }

  // 2. Calculer son rang dans le classement Cookies
  const { count: rankCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gt('total_earned', user.total_earned);

  const cookiesRank = (rankCount ?? 0) + 1;

  // 3. (Optionnel) Calculer son rang dans le classement Marché si table existe
  let marketRank = null;
  let marketShares = 0;
  let marketValue = 0;
  try {
    const { data: portfolio } = await supabase
      .from('market_portfolio')
      .select('shares')
      .eq('user_code', userCode)
      .maybeSingle();

    if (portfolio && portfolio.shares > 0) {
      marketShares = portfolio.shares;

      // Récupérer le prix actuel pour calculer la valeur
      const { data: state } = await supabase
        .from('market_state')
        .select('current_price')
        .eq('id', 1)
        .maybeSingle();

      if (state) {
        marketValue = Math.floor(parseFloat(state.current_price) * portfolio.shares);
      }

      // Compter combien ont plus d'actions
      const { count: marketCount } = await supabase
        .from('market_portfolio')
        .select('*', { count: 'exact', head: true })
        .gt('shares', portfolio.shares);

      marketRank = (marketCount ?? 0) + 1;
    }
  } catch (e) {
    // Tables marché peut-être pas créées encore, on ignore
  }

  return {
    ...user,
    cookies_rank: cookiesRank,
    market_rank: marketRank,
    market_shares: marketShares,
    market_value: marketValue,
  };
}
```

## Vérifications étape 1
- ☑ Fonction `getPublicProfile` exportée
- ☑ Renvoie bien le profil + le rang dans les classements
- ☑ Ne plante pas si les tables marché n'existent pas

---

# ══════════════════════════════════════════════
# ÉTAPE 2 — Composant `<UserProfileModal>` (modal slide)
# ══════════════════════════════════════════════

Créer un nouveau composant qui affiche le profil en modal slidante depuis le bas.

```jsx
import { useEffect, useState } from 'react';
import { getPublicProfile } from '../lib/supabaseSync';
import Avatar from './Avatar'; // ou nom du composant existant

function UserProfileModal({ userCode, isOwnProfile = false, isCrown = false, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userCode) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const p = await getPublicProfile(userCode);
      if (alive) {
        setProfile(p);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userCode]);

  // Animation d'entrée
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: mounted ? 'rgba(45, 22, 8, 0.6)' : 'rgba(45, 22, 8, 0)',
        backdropFilter: 'blur(6px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        transition: 'background 0.3s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#F5EFE6',
          width: '100%',
          maxWidth: 430,
          maxHeight: '85vh',
          borderRadius: '24px 24px 0 0',
          overflow: 'auto',
          transform: mounted ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          paddingBottom: 24,
        }}
      >
        {/* Handle de drag (esthétique) */}
        <div style={{
          width: 40, height: 4,
          background: '#E8DDD0',
          borderRadius: 2,
          margin: '12px auto 0',
        }} />

        {/* Bouton fermer */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 32, height: 32,
            borderRadius: '50%',
            background: 'rgba(45,22,8,0.1)',
            border: 'none',
            color: '#5C3317',
            fontSize: 16,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >✕</button>

        {loading ? (
          <ProfileLoadingState />
        ) : !profile ? (
          <ProfileNotFound />
        ) : (
          <ProfileContent profile={profile} isOwnProfile={isOwnProfile} isCrown={isCrown} />
        )}
      </div>
    </div>
  );
}

function ProfileLoadingState() {
  return (
    <div style={{ padding: 60, textAlign: 'center', color: '#8B6A5A' }}>
      Chargement du profil...
    </div>
  );
}

function ProfileNotFound() {
  return (
    <div style={{ padding: 60, textAlign: 'center', color: '#8B6A5A' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🤷</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Profil introuvable</div>
    </div>
  );
}
```

## Vérifications étape 2
- ☑ Modal slide bien depuis le bas avec animation
- ☑ Tap sur le fond (en dehors de la modal) la ferme
- ☑ Bouton ✕ en haut à droite la ferme
- ☑ Loader pendant la récupération du profil
- ☑ Message "Profil introuvable" si le code n'existe pas

---

# ══════════════════════════════════════════════
# ÉTAPE 3 — Composant `<ProfileContent>`
# ══════════════════════════════════════════════

Le contenu réel du profil affiché dans la modal :

```jsx
function ProfileContent({ profile, isCrown }) {
  return (
    <div style={{ padding: '12px 18px 0' }}>

      {/* Bandeau couronne si c'est le top 1 */}
      {isCrown && (
        <div style={{
          background: 'linear-gradient(135deg, #F0C050, #D4A017)',
          color: 'white',
          padding: '6px 14px',
          borderRadius: 100,
          fontSize: 11,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: 2,
          textAlign: 'center',
          margin: '0 auto 14px',
          width: 'fit-content',
          boxShadow: '0 4px 12px rgba(212, 160, 23, 0.4)',
        }}>
          👑 Roi du classement
        </div>
      )}

      {/* En-tête : avatar + identité */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <Avatar id={profile.user_avatar} size={92} />
        <div style={{
          fontSize: 22,
          fontWeight: 900,
          color: '#2C1810',
          marginTop: 12,
        }}>
          {profile.user_name}
        </div>
        {profile.title && (
          <div style={{
            fontSize: 11,
            color: '#D4A017',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 2,
            marginTop: 4,
          }}>
            {profile.title}
          </div>
        )}
        <div style={{ fontSize: 12, color: '#8B6A5A', marginTop: 4 }}>
          Niveau {profile.level}
        </div>
      </div>

      {/* Bio (si présente) */}
      {profile.user_bio && profile.user_bio.trim() !== '' && (
        <div style={{
          background: 'white',
          borderRadius: 14,
          padding: '10px 14px',
          marginBottom: 12,
          border: '1.5px solid #E8DDD0',
          fontSize: 13,
          color: '#5C3317',
          lineHeight: 1.4,
          fontStyle: 'italic',
        }}>
          "{profile.user_bio}"
        </div>
      )}

      {/* Stats principales en grille */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
        marginBottom: 12,
      }}>
        <StatBlock
          icon="🍪"
          value={profile.cookies?.toLocaleString() ?? '0'}
          label="Cookies"
        />
        <StatBlock
          icon="📊"
          value={profile.total_earned?.toLocaleString() ?? '0'}
          label="Total gagné"
        />
        <StatBlock
          icon="🔥"
          value={profile.streak ?? 0}
          label="Série"
        />
        <StatBlock
          icon="⭐"
          value={profile.level ?? 1}
          label="Niveau"
        />
      </div>

      {/* Classements */}
      <div style={{
        background: 'linear-gradient(140deg, #4A2C17, #7D4E1F)',
        borderRadius: 16,
        padding: 14,
        color: 'white',
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.6)',
          textTransform: 'uppercase',
          letterSpacing: 2,
          marginBottom: 10,
        }}>
          🏆 Classements
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#D4A017' }}>
              #{profile.cookies_rank ?? '—'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
              🍪 Cookies
            </div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.15)' }} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#D4A017' }}>
              {profile.market_rank ? `#${profile.market_rank}` : '—'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
              📈 Marché
            </div>
          </div>
        </div>
      </div>

      {/* Code ami (pour permettre de copier et ajouter manuellement) */}
      <div style={{
        background: 'white',
        borderRadius: 14,
        padding: '12px 14px',
        marginBottom: 12,
        border: '1.5px solid #E8DDD0',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 10,
          color: '#8B6A5A',
          textTransform: 'uppercase',
          letterSpacing: 2,
          marginBottom: 4,
        }}>
          Code ami
        </div>
        <div style={{
          fontSize: 18,
          fontFamily: 'monospace',
          fontWeight: 800,
          color: '#D4A017',
          letterSpacing: 3,
        }}>
          {profile.user_code}
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(profile.user_code)}
          style={{
            marginTop: 8,
            padding: '6px 14px',
            background: '#F5EFE6',
            border: '1.5px solid #E8DDD0',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            color: '#5C3317',
            cursor: 'pointer',
          }}
        >
          📋 Copier le code
        </button>
      </div>

      {/* Date d'inscription (uniquement pour les amis, pas le top 1) */}
      {profile.join_date && !isCrown && (
        <div style={{
          textAlign: 'center',
          fontSize: 11,
          color: '#A0784E',
          fontStyle: 'italic',
        }}>
          Joueur depuis le {new Date(profile.join_date).toLocaleDateString('fr-FR')}
        </div>
      )}
    </div>
  );
}

function StatBlock({ icon, value, label }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 14,
      padding: '12px 8px',
      border: '1.5px solid #E8DDD0',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
      <div style={{
        fontSize: 18,
        fontWeight: 900,
        color: '#2C1810',
        lineHeight: 1.1,
      }}>{value}</div>
      <div style={{
        fontSize: 10,
        color: '#8B6A5A',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
        fontWeight: 700,
      }}>{label}</div>
    </div>
  );
}
```

⚠️ **Différences clés** :
- Si `isCrown=true` (top 1) : bandeau "👑 Roi du classement" en haut + **pas de date d'inscription**
- Si `isCrown=false` (ami) : pas de bandeau couronne + **date d'inscription affichée**
- Dans les 2 cas : **bio affichée** si remplie

## Vérifications étape 3
- ☑ Avatar gros au centre
- ☑ Pseudo + titre (si débloqué) + niveau
- ☑ Bio en italique entre guillemets si présente
- ☑ 4 stats en grille 2x2 (cookies, total gagné, série, niveau)
- ☑ Carte classements avec rang Cookies + rang Marché (ou — si pas d'actions)
- ☑ Carte code ami avec bouton copier
- ☑ Date d'inscription en bas (sauf si top 1)
- ☑ Bandeau couronne dorée en haut si top 1

---

# ══════════════════════════════════════════════
# ÉTAPE 4 — Carte ami cliquable + indicateur visuel
# ══════════════════════════════════════════════

Modifier la `FriendCard` existante (dans la liste d'amis du profil) pour qu'elle soit cliquable et ouvre la modal du profil de l'ami.

## Approche

Wrapping de la carte avec un `onClick` qui ouvre la modal :

```jsx
function FriendCard({ friend, onOpenProfile, ... }) {
  return (
    <div
      onClick={() => onOpenProfile(friend.user_code)}
      style={{
        background: 'white',
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        border: '1.5px solid #E8DDD0',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        transition: 'transform 0.1s, box-shadow 0.15s',
        // Effet visuel au survol/tap
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {/* Avatar */}
      <Avatar id={friend.user_avatar} size={42} />

      {/* Infos */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#2C1810' }}>
          {friend.user_name}
        </div>
        <div style={{ fontSize: 11, color: '#8B6A5A' }}>
          Niveau {friend.level} · {/* différence cookies, comme avant */}
        </div>
      </div>

      {/* Indicateur "voir profil" */}
      <div style={{
        fontSize: 14,
        color: '#D4A017',
        opacity: 0.7,
      }}>
        👁️
      </div>

      {/* Bouton retirer (existant) - empêcher la propagation pour pas ouvrir le profil */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRemove(friend.user_code);
        }}
        style={{ /* style existant */ }}
      >
        ✕
      </button>
    </div>
  );
}
```

⚠️ Le bouton "✕" pour retirer doit faire `e.stopPropagation()` pour ne PAS ouvrir le profil quand on retire l'ami.

## Vérifications étape 4
- ☑ Tap sur la carte ami → ouvre la modal du profil
- ☑ Tap sur le bouton ✕ → ouvre le confirm de suppression (PAS le profil)
- ☑ Petit effet de scale 0.98 au tap (feedback tactile)
- ☑ Icône 👁️ discrète à droite indique que c'est cliquable

---

# ══════════════════════════════════════════════
# ÉTAPE 5 — Top 1 du classement cliquable
# ══════════════════════════════════════════════

Modifier le composant `LeaderRow` du classement Cookies pour que **uniquement le rang #1** soit cliquable.

```jsx
function LeaderRow({ rank, user, isMe, onOpenProfile }) {
  // Seul le rang 1 est cliquable
  const isClickable = rank === 1 && !isMe;

  return (
    <div
      onClick={isClickable ? () => onOpenProfile(user.user_code) : undefined}
      style={{
        // ... styles existants ...
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'transform 0.1s',
      }}
      onMouseDown={isClickable ? (e => e.currentTarget.style.transform = 'scale(0.98)') : undefined}
      onMouseUp={isClickable ? (e => e.currentTarget.style.transform = 'scale(1)') : undefined}
    >
      {/* Contenu existant (rang, avatar, nom, cookies) */}
      ...

      {/* Indicateur 👁️ si cliquable */}
      {isClickable && (
        <div style={{
          fontSize: 14,
          color: 'white',
          opacity: 0.8,
          marginLeft: 6,
        }}>
          👁️
        </div>
      )}
    </div>
  );
}
```

⚠️ **Pourquoi pas si `isMe`** : pas la peine d'ouvrir un profil sur soi-même, ça ferait doublon avec la page Profil.

⚠️ **Tu peux choisir** d'étendre cette logique aux **3 premiers** plus tard si tu trouves que c'est trop limitant. Pour l'instant on s'en tient à ton choix : **#1 uniquement**.

## Vérifications étape 5
- ☑ Tap sur le top 1 → ouvre la modal de son profil avec le bandeau "👑 Roi du classement"
- ☑ Tap sur le top 2, 3, etc. → rien ne se passe (pas cliquables)
- ☑ Si je suis moi-même le top 1, ma ligne n'est PAS cliquable (j'ai déjà mon profil)
- ☑ Petit indicateur 👁️ visible sur la ligne du top 1 pour montrer qu'on peut cliquer

---

# ══════════════════════════════════════════════
# ÉTAPE 6 — Intégration dans App.jsx
# ══════════════════════════════════════════════

Au niveau du composant racine, gérer l'état d'ouverture de la modal de profil + le code utilisateur à afficher.

```jsx
function CookiMiner() {
  // ... états existants ...

  // État pour la modal profil
  const [viewingProfile, setViewingProfile] = useState(null);
  // viewingProfile = { userCode: 'B4R-1ST', isCrown: true } ou null

  const openProfile = (userCode, isCrown = false) => {
    setViewingProfile({ userCode, isCrown });
  };

  const closeProfile = () => {
    setViewingProfile(null);
  };

  return (
    <>
      {/* ... le reste de l'app ... */}

      {/* Passer openProfile aux composants concernés */}
      <FriendsTab onOpenProfile={(code) => openProfile(code, false)} />
      <LeaderboardTab onOpenProfile={(code) => openProfile(code, true)} />

      {/* Modal profil (rendue par-dessus tout) */}
      {viewingProfile && (
        <UserProfileModal
          userCode={viewingProfile.userCode}
          isCrown={viewingProfile.isCrown}
          onClose={closeProfile}
        />
      )}
    </>
  );
}
```

## Vérifications étape 6
- ☑ Ouvrir profil ami depuis la liste d'amis → modal avec le profil + date d'inscription
- ☑ Ouvrir profil top 1 depuis le classement → modal avec couronne 👑 + sans date
- ☑ Tap sur le fond ou le ✕ → ferme la modal
- ☑ Pas de bug si on ouvre rapidement plusieurs profils différents

---

# ══════════════════════════════════════════════
# ÉTAPE 7 — Tests finaux
# ══════════════════════════════════════════════

## Scénarios à tester

1. **Profil d'un ami inexistant** — code ami valide mais utilisateur supprimé → "Profil introuvable"
2. **Profil avec bio** — l'ami a écrit une bio, elle s'affiche bien en italique avec guillemets
3. **Profil sans bio** — l'ami n'a pas de bio, la carte bio n'apparaît pas
4. **Profil sans titre débloqué** — pas de ligne titre, juste niveau
5. **Profil sans actions marché** — rang marché affiche "—"
6. **Profil top 1 = moi-même** — la ligne n'est pas cliquable
7. **Animation de la modal** — slide bien depuis le bas, fluide
8. **Fermeture** — tap fond OU bouton ✕ ferme correctement
9. **Copier le code** — bouton "📋 Copier" fonctionne
10. **Performance** — chargement du profil < 1 seconde

## Vérifications globales
- ☑ Pas de rouge ni de vert (palette café)
- ☑ Mobile-friendly (testé sur 390px)
- ☑ Pas de plantage si Supabase est down (modal affiche "Profil introuvable" gracieusement)
- ☑ Modal ne reste pas ouverte si on change d'onglet entre temps
- ☑ Classement marché du profil = `—` si Supabase n'a pas la table `market_portfolio`

---

# ══════════════════════════════════════════════
# 💡 NOTES IMPORTANTES POUR CLAUDE CODE
# ══════════════════════════════════════════════

- **Pas de bouton "Ajouter en ami"** dans la modal (choix UX assumé pour rester simple)
- **L'utilisateur peut toujours copier le code** depuis la modal et l'ajouter manuellement dans la liste d'amis
- **Performance Supabase** : `getPublicProfile` fait 3-4 requêtes. Pas idéal si on l'appelle souvent. Pour cette feature, c'est OK car on ouvre un profil de temps en temps.
- **Couronne uniquement pour rang #1** : pas de bandeau spécial pour les autres rangs (gold/silver/bronze sont déjà visibles dans le classement, pas besoin de redire)
- **Compatibilité tables marché** : la fonction `getPublicProfile` essaie de récupérer le rang marché mais ne plante pas si les tables n'existent pas (try/catch). C'est important si le brief marché online n'a pas encore été appliqué.
- **Modal accessible** : le tap en dehors de la modal la ferme (UX standard mobile)
- **Réutiliser le composant `<Avatar>`** existant — pas en redessiner un

Bon dev ! ☕👤👀

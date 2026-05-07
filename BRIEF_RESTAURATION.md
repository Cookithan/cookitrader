# Brief — Restauration cloud / Nouveau téléphone 🔄

Lis bien le CLAUDE.md avant de commencer.

## 🎯 Concept

Si l'utilisateur **change de téléphone** ou **réinstalle l'app**, il peut **récupérer son profil** en saisissant son code unique. Toutes ses données (cookies, niveau, badges, amis, etc.) sont restaurées depuis Supabase.

## ⚠️ Pré-requis
- Supabase fonctionnel
- BRIEF_FIX_RESET appliqué (pour que la suppression de profil soit propre)

---

## ⚙️ Comment ça marche

1. L'utilisateur ouvre l'app sur un nouveau téléphone
2. Au lieu de créer un nouveau compte, il clique "**J'ai déjà un compte**"
3. Il saisit son code (ex: `B4R-1ST`)
4. L'app récupère ses données depuis Supabase et restaure le `localStorage`

---

# PHASE 1 — Fonction de restauration

Ajouter dans `src/lib/supabaseSync.js` :

```js
/**
 * Restaure un profil utilisateur depuis Supabase via son user_code.
 * Récupère TOUTES les données du joueur et les remet en localStorage.
 *
 * @param {string} userCode Code de l'utilisateur (ex: 'B4R-1ST')
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function restoreProfile(userCode) {
  if (!isSupabaseEnabled()) return { error: 'Hors ligne' };

  // 1. Validation du format
  if (!userCode || !userCode.match(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/)) {
    return { error: 'Format invalide (ex: B4R-1ST)' };
  }

  // 2. Récupérer le profil
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_code', userCode)
    .maybeSingle();

  if (error) return { error: 'Erreur réseau' };
  if (!user) return { error: "Ce code n'existe pas" };

  // 3. Récupérer le portfolio marché si présent
  let portfolio = null;
  try {
    const { data } = await supabase
      .from('market_portfolio')
      .select('*')
      .eq('user_code', userCode)
      .maybeSingle();
    portfolio = data;
  } catch {}

  // 4. Récupérer les amis
  let friendCodes = [];
  try {
    const { data: links } = await supabase
      .from('friendships')
      .select('friend_code')
      .eq('user_id', user.id)
      .eq('status', 'accepted');
    friendCodes = (links || []).map(l => l.friend_code);
  } catch {}

  return {
    success: true,
    data: {
      userCode: user.user_code,
      userName: user.user_name,
      userAvatar: user.user_avatar,
      userBio: user.user_bio,
      level: user.level,
      cookies: user.cookies ?? 0,
      cf: user.cf ?? 0,
      totalEarned: user.total_earned ?? 0,
      streak: user.streak ?? 0,
      title: user.title,
      unlocked: user.unlocked ?? [],
      portfolio,
      friendCodes,
    },
  };
}
```

---

# PHASE 2 — Bouton "J'ai déjà un compte" à l'onboarding

Au tout premier lancement (avant la saisie du nom), ajouter une option discrète :

```jsx
function OnboardingWelcome({ onCreate, onRestore }) {
  return (
    <div style={{ /* layout onboarding */ }}>
      <div style={{ fontSize: 64 }}>🍪</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: '#2C1810', marginTop: 12 }}>
        Bienvenue sur CookiMiner !
      </div>
      <div style={{ fontSize: 14, color: '#8B6A5A', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
        Joue à des mini-jeux, gagne des cookies, deviens le meilleur barista du classement. ☕
      </div>

      <button
        onClick={onCreate}
        style={{
          width: '100%',
          padding: 14,
          marginTop: 24,
          background: 'linear-gradient(135deg, #D4A017, #C17F3C)',
          color: 'white',
          border: 'none',
          borderRadius: 14,
          fontWeight: 800,
          fontSize: 15,
          cursor: 'pointer',
        }}
      >
        🚀 Créer un nouveau compte
      </button>

      <button
        onClick={onRestore}
        style={{
          marginTop: 12,
          background: 'transparent',
          color: '#8B6A5A',
          border: 'none',
          fontSize: 13,
          textDecoration: 'underline',
          cursor: 'pointer',
        }}
      >
        J'ai déjà un compte
      </button>
    </div>
  );
}
```

---

# PHASE 3 — Modal de saisie du code

```jsx
function RestoreProfileModal({ onCancel, onSuccess }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRestore = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);

    const result = await restoreProfile(code.toUpperCase());

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onSuccess(result.data);
  };

  return (
    <div style={{ /* overlay */ }}>
      <div style={{ /* modal card */ }}>
        <div style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontSize: 56 }}>🔄</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#2C1810', marginTop: 8 }}>
            Restaure ton compte
          </div>
          <div style={{ fontSize: 13, color: '#8B6A5A', marginTop: 8, lineHeight: 1.4 }}>
            Saisis ton code unique CookiMiner. Tu le trouves dans ton ancien profil.
          </div>
        </div>

        <div style={{ padding: '0 14px' }}>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Ex: B4R-1ST"
            maxLength={7}
            style={{
              width: '100%',
              padding: 14,
              fontSize: 20,
              fontWeight: 800,
              color: '#D4A017',
              textAlign: 'center',
              border: '2px solid #E8DDD0',
              borderRadius: 12,
              fontFamily: 'monospace',
              letterSpacing: 4,
            }}
          />

          {error && (
            <div style={{
              marginTop: 10,
              padding: '8px 12px',
              background: 'rgba(125,78,31,0.15)',
              borderRadius: 10,
              fontSize: 12,
              color: '#7D4E1F',
              textAlign: 'center',
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, padding: 14 }}>
          <button onClick={onCancel} style={{ /* btn secondaire */ }}>
            Annuler
          </button>
          <button
            onClick={handleRestore}
            disabled={loading || !code.match(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/)}
            style={{
              flex: 1,
              padding: 12,
              background: 'linear-gradient(135deg, #D4A017, #C17F3C)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '...' : 'Restaurer'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

# PHASE 4 — Application des données restaurées

Quand `onSuccess(data)` est appelé, restaurer le state global de l'app :

```js
const handleRestoreSuccess = (data) => {
  // 1. Sauvegarder en localStorage
  localStorage.setItem('cookiminer:userCode', data.userCode);
  localStorage.setItem('cookiminer:userName', data.userName);
  localStorage.setItem('cookiminer:userAvatar', data.userAvatar ?? '0');
  localStorage.setItem('cookiminer:userBio', data.userBio ?? '');
  localStorage.setItem('cookiminer:level', String(data.level));
  localStorage.setItem('cookiminer:coins', String(data.cookies));
  localStorage.setItem('cookiminer:cafes', String(data.cf));
  localStorage.setItem('cookiminer:totalEarned', String(data.totalEarned));
  localStorage.setItem('cookiminer:streak', String(data.streak));
  localStorage.setItem('cookiminer:title', data.title ?? '');
  localStorage.setItem('cookiminer:unlocked', JSON.stringify(data.unlocked));

  // 2. Reload pour que tout se réinitialise correctement
  window.location.reload();
};
```

⚠️ Le `reload` permet à l'app de partir d'un état propre avec les nouvelles données. Plus simple que de mettre à jour 15 useState manuellement.

---

# PHASE 5 — Bouton aussi dans les paramètres

Pour ceux qui veulent restaurer alors qu'ils ont déjà un compte créé par erreur :

Dans les paramètres, ajouter un bouton "🔄 Restaurer un compte existant" qui ouvre la même modal.

⚠️ **Avertissement** avant de restaurer : "Tes données actuelles seront remplacées. Êtes-vous sûr ?"

```jsx
function RestoreAccountSettingsButton({ onOpenRestore }) {
  const [showWarning, setShowWarning] = useState(false);

  const handleClick = () => {
    setShowWarning(true);
  };

  const handleConfirm = () => {
    setShowWarning(false);
    onOpenRestore();
  };

  return (
    <>
      <button onClick={handleClick} style={{ /* style bouton paramètres */ }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>🔄 Restaurer un compte</div>
          <div style={{ fontSize: 11, color: '#8B6A5A' }}>Recharger un profil existant</div>
        </div>
      </button>

      {showWarning && (
        <div style={{ /* overlay modal */ }}>
          <div style={{ /* card centrée */ }}>
            <div style={{ fontSize: 48, textAlign: 'center' }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#2C1810', marginTop: 8, textAlign: 'center' }}>
              Attention
            </div>
            <div style={{ fontSize: 13, color: '#8B6A5A', marginTop: 8, lineHeight: 1.5, textAlign: 'center' }}>
              Restaurer un autre compte va <strong>remplacer ton profil actuel</strong>. Continuer ?
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => setShowWarning(false)} style={{ /* btn moka */ }}>Annuler</button>
              <button onClick={handleConfirm} style={{ /* btn doré */ }}>Restaurer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

---

# PHASE 6 — Tests

1. **Premier lancement nouveau tel** : écran de bienvenue avec "Créer un compte" et "J'ai déjà un compte" ✅
2. **Tap "J'ai déjà un compte"** → modal de saisie du code
3. **Code valide** → toutes les données sont restaurées (cookies, niveau, badges, amis) ✅
4. **Code invalide** → "Ce code n'existe pas"
5. **Code mal formaté** → "Format invalide"
6. **Restauration depuis paramètres** → modal d'avertissement avant remplacement

## Vérifications globales
- ☑ Restauration complète de tous les éléments (cookies, level, badges, amis...)
- ☑ Bouton accessible à l'onboarding ET aux paramètres
- ☑ Avertissement si remplacement d'un compte existant
- ☑ Pas de rouge ni de vert
- ☑ Pas de plantage si Supabase est down (message d'erreur clair)

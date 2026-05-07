# Brief Correctif — Reset Complet du Profil 🗑️

Lis bien le CLAUDE.md avant de commencer.
**Procède UNE étape à la fois et attends ma validation.**

---

## 🐛 Bug à corriger

Quand l'utilisateur **réinitialise sa progression** dans l'app actuelle :
- ✅ Le `localStorage` local est bien vidé
- ❌ **MAIS** son entrée dans Supabase reste (table `users`)
- ❌ **ET** ses entrées dans `friendships`, `market_portfolio`, etc. restent aussi

Résultat : son ancien profil "fantôme" continue d'apparaître dans le classement online avec ses anciens cookies, alors que lui repart à zéro avec un nouveau code.

## 🎯 Solution

À chaque reset de progression, **supprimer complètement** l'entrée Supabase du joueur (et toutes ses données associées) AVANT de vider le localStorage. Comme ça il repart vraiment de zéro avec un nouveau code, et plus aucun fantôme dans la base.

---

# ══════════════════════════════════════════════
# ÉTAPE 1 — Fonction de suppression Supabase
# ══════════════════════════════════════════════

Ajouter une fonction `deleteUserCompletely` qui supprime **toutes les traces** d'un utilisateur dans Supabase.

À placer dans `src/lib/supabaseSync.js` (ou `src/lib/supabase.js` selon ton organisation actuelle) :

```js
import { supabase, isSupabaseEnabled } from './supabase';

/**
 * Supprime COMPLÈTEMENT un utilisateur de Supabase et toutes ses données associées.
 * À appeler avant de vider le localStorage lors d'un reset de progression.
 *
 * @param {string} userCode Code de l'utilisateur à supprimer
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteUserCompletely(userCode) {
  if (!isSupabaseEnabled()) {
    return { success: true }; // Pas de Supabase = rien à supprimer
  }
  if (!userCode) {
    return { success: false, error: 'Pas de userCode' };
  }

  try {
    // 1. Trouver l'ID de l'utilisateur (les amitiés sont liées par user_id, pas user_code)
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('user_code', userCode)
      .maybeSingle();

    // 2. Supprimer les amitiés OÙ L'UTILISATEUR EST AMI DE QUELQU'UN (via user_id)
    if (user?.id) {
      await supabase
        .from('friendships')
        .delete()
        .eq('user_id', user.id);
    }

    // 3. Supprimer les amitiés OÙ L'UTILISATEUR EST L'AMI AJOUTÉ (via friend_code)
    // (= les autres l'avaient ajouté comme ami, on retire ces liens)
    await supabase
      .from('friendships')
      .delete()
      .eq('friend_code', userCode);

    // 4. Supprimer son portfolio marché (si table existe)
    await supabase
      .from('market_portfolio')
      .delete()
      .eq('user_code', userCode);

    // 5. Supprimer ses transactions marché (optionnel, garde l'historique anonymisé)
    // On peut soit supprimer (perte de l'historique global), soit anonymiser
    // Choix : on supprime pour cohérence
    await supabase
      .from('market_transactions')
      .delete()
      .eq('user_code', userCode);

    // 6. Enfin, supprimer l'utilisateur lui-même
    const { error: userErr } = await supabase
      .from('users')
      .delete()
      .eq('user_code', userCode);

    if (userErr) {
      console.warn('deleteUserCompletely: erreur sur users:', userErr);
      return { success: false, error: userErr.message };
    }

    return { success: true };
  } catch (e) {
    console.warn('deleteUserCompletely: exception:', e);
    return { success: false, error: e.message };
  }
}
```

⚠️ **Important** : ne pas paniquer si certaines tables n'existent pas encore (genre `market_portfolio` si le brief marché n'est pas fait). Les `await` sur des tables inexistantes ne planteront pas l'app, ils retourneront une erreur silencieuse.

## Vérifications étape 1
- ☑ Fonction `deleteUserCompletely` exportée
- ☑ Pas d'erreur dans la console au chargement
- ☑ Importable dans le composant qui gère le reset

---

# ══════════════════════════════════════════════
# ÉTAPE 2 — Modifier la logique de reset
# ══════════════════════════════════════════════

Trouver le bouton "**Réinitialiser ma progression**" dans le code (probablement dans la page Profil ou Paramètres) et modifier sa logique pour appeler la suppression Supabase **AVANT** de vider le localStorage.

## Code actuel à trouver

Quelque chose comme :

```js
const handleReset = () => {
  if (confirm('Réinitialiser ?')) {
    localStorage.clear();
    window.location.reload();
  }
};
```

## Code à mettre à la place

```js
import { deleteUserCompletely } from '../lib/supabaseSync'; // adapter le chemin

const handleReset = async () => {
  if (!confirm('Réinitialiser ta progression ? Tout sera effacé et tu auras un nouveau code ami.')) {
    return;
  }

  setIsResetting(true); // afficher un loader pendant la suppression

  try {
    // 1. Supprimer le compte Supabase si connecté
    if (userCode) {
      const result = await deleteUserCompletely(userCode);
      if (!result.success) {
        console.warn('Suppression Supabase incomplète:', result.error);
        // On continue quand même - localStorage sera vidé
      }
    }
  } catch (e) {
    console.warn('Erreur reset Supabase:', e);
  }

  // 2. Vider TOUT le localStorage (rien à garder, c'est une suppression complète)
  localStorage.clear();

  // 3. Reload l'app — un nouveau code sera généré au prochain démarrage
  window.location.reload();
};
```

⚠️ **Note** : pas besoin de garder le `userCode` dans le localStorage. Au prochain démarrage de l'app, comme `localStorage` est vide, la logique d'initialisation génèrera **automatiquement un nouveau code** (c'est ce que fait `generateUserCode()` au premier lancement).

## Améliorations UX

### State de chargement

Ajouter un state pour montrer que ça travaille (la suppression Supabase peut prendre 1-2 secondes) :

```js
const [isResetting, setIsResetting] = useState(false);

// Dans le bouton :
<button
  onClick={handleReset}
  disabled={isResetting}
  style={{...}}
>
  {isResetting ? 'Suppression en cours...' : 'Réinitialiser ma progression'}
</button>
```

### Confirmation plus claire

Au lieu d'un `confirm()` natif (moche), utiliser une vraie modal de confirmation :

```jsx
{showResetConfirm && (
  <div style={{
    position: 'fixed', inset: 0,
    background: 'rgba(45,22,8,0.7)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: 20,
  }}>
    <div style={{
      background: 'white', borderRadius: 18, padding: 24,
      maxWidth: 340, width: '100%', textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#2C1810', marginBottom: 8 }}>
        Réinitialiser ta progression ?
      </div>
      <div style={{ fontSize: 13, color: '#8B6A5A', marginBottom: 16, lineHeight: 1.4 }}>
        Tu vas perdre <strong>tout ton avancement</strong> :
        <br/>cookies, niveaux, badges, code ami, classement.
        <br/><br/>
        Cette action est <strong>irréversible</strong>.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setShowResetConfirm(false)}
          disabled={isResetting}
          style={{
            flex: 1, padding: '12px',
            background: '#F5EFE6', border: '1.5px solid #E8DDD0',
            borderRadius: 12, fontWeight: 700, color: '#5C3317',
            cursor: 'pointer',
          }}
        >
          Annuler
        </button>
        <button
          onClick={confirmReset}
          disabled={isResetting}
          style={{
            flex: 1, padding: '12px',
            background: 'linear-gradient(135deg, #7D4E1F, #5C3317)',
            border: 'none', borderRadius: 12,
            color: 'white', fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {isResetting ? '...' : 'Tout effacer'}
        </button>
      </div>
    </div>
  </div>
)}
```

⚠️ **Couleurs** : pas de rouge ! Le bouton "Tout effacer" reste en moka (`#7D4E1F → #5C3317`) — c'est suffisamment "sérieux" sans être rouge.

## Vérifications étape 2
- ☑ Le bouton "Réinitialiser" déclenche maintenant une vraie modal de confirmation (pas un `confirm()` moche)
- ☑ La modal explique clairement ce qui va se passer
- ☑ Le bouton "Tout effacer" est en moka (pas rouge)
- ☑ Pendant la suppression, le bouton affiche "..." et est désactivé
- ☑ Après suppression, l'app reload et un nouveau code est généré

---

# ══════════════════════════════════════════════
# ÉTAPE 3 — Tests
# ══════════════════════════════════════════════

## Scénario de test complet

1. **Setup initial** :
   - Ouvre l'app sur un navigateur (Chrome)
   - Joue un peu, gagne quelques cookies (genre 200)
   - Note ton code ami (ex: `B4R-1ST`)

2. **Vérifier que tu es dans Supabase** :
   - Va sur Supabase → Table Editor → `users`
   - Tu dois voir une ligne avec ton `user_code` et tes cookies

3. **Vérifier le classement online** :
   - Dans l'app, ouvre l'onglet Classement
   - Tu dois te voir avec tes cookies

4. **Faire le reset** :
   - Aller dans Profil → "Réinitialiser ma progression"
   - Modal de confirmation apparaît
   - Cliquer "Tout effacer"
   - Loader pendant 1-2s
   - L'app reload automatiquement

5. **Vérifier que l'ancien profil est supprimé** :
   - Va sur Supabase → Table Editor → `users`
   - L'ancienne ligne avec ton ancien code N'EXISTE PLUS ✅
   - Une nouvelle ligne apparaît avec un NOUVEAU code (créée au sync auto post-reload)

6. **Vérifier le classement** :
   - Ouvre à nouveau le classement online
   - L'ancien fantôme avec ses 200 cookies n'apparaît PLUS ✅
   - Tu apparais comme nouveau joueur avec 0 cookies

7. **Test des amitiés** (si tu as un compte test 2) :
   - Avant le reset, ajoute le compte 2 comme ami
   - Reset le compte 1
   - Sur le compte 2, vérifier que ton ancien profil n'est plus dans la liste d'amis ✅

## Vérifications globales

- ☑ Plus aucun fantôme dans le classement après reset
- ☑ Plus aucune amitié orpheline dans `friendships`
- ☑ Plus aucun portfolio marché dans `market_portfolio` (si table existe)
- ☑ Nouveau code généré automatiquement après reload
- ☑ Si Supabase est down → le reset local fonctionne quand même (pas de blocage)

---

# ══════════════════════════════════════════════
# 💡 NOTES IMPORTANTES POUR CLAUDE CODE
# ══════════════════════════════════════════════

- **Ordre de suppression important** : amitiés → portfolio → transactions → user (les FK pourraient bloquer si on supprime user en premier, même si on a `on delete cascade` parfois)
- **Pas besoin de gérer l'erreur "table inexistante"** : si une table n'existe pas (genre `market_portfolio` avant le brief marché), Supabase renvoie juste une erreur silencieuse, le code continue
- **Toujours vider le localStorage à la fin** : peu importe que la suppression Supabase ait réussi ou pas, l'utilisateur veut son reset local
- **Reload obligatoire** : `window.location.reload()` à la fin pour que l'app génère un nouveau code et reparte propre
- **Ne PAS demander confirmation par défaut** : Claude Code pourrait ajouter trop de confirmations imbriquées. Une seule modal claire suffit.

Bon dev ! ☕🗑️

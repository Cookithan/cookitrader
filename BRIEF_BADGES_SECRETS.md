# Brief — Badges secrets 🏅

Lis bien le CLAUDE.md avant de commencer.

## 🎯 Concept

3 badges cachés que les joueurs découvrent **en les déclenchant**. Pas listés dans la boutique. Quand débloqué, animation festive + ajout à la collection de badges du joueur.

## 🏅 Les 3 badges

### 🦉 Noctambule
- **Condition** : ouvrir l'app entre **0h et 4h** (heure locale du téléphone)
- **Description** : "Tu joues quand le monde dort..."
- **Couleur** : moka foncé `#3D2010`

### 💎 Investisseur
- **Condition** : avoir un **profit cumulé de +1000 🍪** sur le marché $CKM (somme des bénéfices de toutes les transactions de vente)
- **Description** : "Maître du marché"
- **Couleur** : doré `#D4A017`

### 👥 Amical
- **Condition** : avoir **3 amis** acceptés dans sa liste
- **Description** : "Le café se savoure entre amis"
- **Couleur** : caramel `#C17F3C`

---

# PHASE 1 — Constantes des badges secrets

Créer `src/lib/secretBadges.js` :

```js
export const SECRET_BADGES = {
  noctambule: {
    id: 'badge_noctambule',
    name: '🦉 Noctambule',
    description: 'Tu joues quand le monde dort...',
    icon: '🦉',
    color: '#3D2010',
    bgGradient: 'linear-gradient(135deg, #2C1810, #3D2010)',
  },
  investisseur: {
    id: 'badge_investisseur',
    name: '💎 Investisseur',
    description: 'Maître du marché — +1000 🍪 de profit',
    icon: '💎',
    color: '#D4A017',
    bgGradient: 'linear-gradient(135deg, #D4A017, #C17F3C)',
  },
  amical: {
    id: 'badge_amical',
    name: '👥 Amical',
    description: 'Le café se savoure entre amis',
    icon: '👥',
    color: '#C17F3C',
    bgGradient: 'linear-gradient(135deg, #C17F3C, #A0784E)',
  },
};

export function getSecretBadgeById(id) {
  return Object.values(SECRET_BADGES).find(b => b.id === id);
}
```

---

# PHASE 2 — Détection des conditions

## 2A. Noctambule

Dans `App.jsx`, au montage initial :

```js
useEffect(() => {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 4) {
    if (!unlocked.includes('badge_noctambule')) {
      unlockSecretBadge('noctambule');
    }
  }
}, []);
```

## 2B. Investisseur

À ajouter dans la logique de **vente d'actions** (après `sellShares` réussi) :

```js
// Calculer le profit cumulé total
const cumulativeProfit = await getCumulativeMarketProfit(userCode);

if (cumulativeProfit >= 1000 && !unlocked.includes('badge_investisseur')) {
  unlockSecretBadge('investisseur');
}
```

Ajouter cette fonction dans `src/lib/market.js` :

```js
export async function getCumulativeMarketProfit(userCode) {
  if (!isSupabaseEnabled() || !userCode) return 0;

  const { data: transactions } = await supabase
    .from('market_transactions')
    .select('type, shares, price_per_share, total_amount')
    .eq('user_code', userCode)
    .order('created_at', { ascending: true });

  if (!transactions || transactions.length === 0) return 0;

  // Calcul simple : somme des ventes - somme des achats
  let totalBuys = 0;
  let totalSells = 0;
  transactions.forEach(t => {
    if (t.type === 'buy') totalBuys += parseFloat(t.total_amount);
    else totalSells += parseFloat(t.total_amount);
  });

  return Math.floor(totalSells - totalBuys);
}
```

⚠️ Cette formule simple est correcte pour CookiMiner. Pour un calcul ultra précis (FIFO/LIFO), c'est trop complexe pour pas grand chose.

## 2C. Amical

Dans la fonction qui ajoute un ami (après acceptation) :

```js
// Après que la nouvelle amitié soit confirmée
const friends = await getFriends(userCode);
if (friends.length >= 3 && !unlocked.includes('badge_amical')) {
  unlockSecretBadge('amical');
}
```

---

# PHASE 3 — Fonction `unlockSecretBadge`

```js
function unlockSecretBadge(badgeKey) {
  const badge = SECRET_BADGES[badgeKey];
  if (!badge) return;
  if (unlocked.includes(badge.id)) return;

  setUnlocked(u => [...u, badge.id]);
  setSecretBadgeReward(badge); // déclenche la modal
  
  // Bonus cookies en récompense
  addCoins(100);
}
```

---

# PHASE 4 — Modal de déblocage festive

```jsx
function SecretBadgeUnlockModal({ badge, onClose }) {
  if (!badge) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(45,22,8,0.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 250, padding: 20,
    }}>
      <div style={{
        background: badge.bgGradient,
        borderRadius: 24,
        padding: 32,
        maxWidth: 340,
        width: '100%',
        textAlign: 'center',
        color: 'white',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        border: `3px solid ${badge.color}`,
        animation: 'badgePop 0.6s cubic-bezier(.34,1.56,.64,1)',
      }}>
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.7)',
          textTransform: 'uppercase',
          letterSpacing: 4,
          marginBottom: 8,
        }}>
          ✨ Badge secret découvert
        </div>

        <div style={{
          fontSize: 80,
          margin: '12px 0',
          animation: 'badgeIcon 1s ease-in-out infinite alternate',
        }}>
          {badge.icon}
        </div>

        <div style={{ fontSize: 22, fontWeight: 900 }}>
          {badge.name}
        </div>

        <div style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.85)',
          marginTop: 8,
          fontStyle: 'italic',
          lineHeight: 1.4,
        }}>
          {badge.description}
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 12,
          padding: 10,
          marginTop: 18,
          fontSize: 13,
          fontWeight: 700,
        }}>
          🎁 Bonus : +100 🍪
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 18,
            padding: '12px 32px',
            background: 'rgba(255,255,255,0.2)',
            border: '1.5px solid rgba(255,255,255,0.4)',
            color: 'white',
            borderRadius: 14,
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Génial ! ✨
        </button>
      </div>
    </div>
  );
}
```

CSS à ajouter :

```css
@keyframes badgePop {
  0% { transform: scale(0) rotate(-180deg); opacity: 0; }
  60% { transform: scale(1.1) rotate(10deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes badgeIcon {
  from { transform: scale(1); }
  to { transform: scale(1.1) rotate(5deg); }
}
```

---

# PHASE 5 — Affichage des badges débloqués

Dans la **section badges** du profil, afficher les badges secrets débloqués **avec un effet "découvert"** différent des badges classiques :

```jsx
{Object.values(SECRET_BADGES).map(badge => {
  const isUnlocked = unlocked.includes(badge.id);
  if (!isUnlocked) return null; // on n'affiche pas les badges secrets non découverts
  
  return (
    <div key={badge.id} style={{
      background: badge.bgGradient,
      borderRadius: 14,
      padding: 12,
      color: 'white',
      textAlign: 'center',
      border: `2px solid ${badge.color}`,
      boxShadow: `0 4px 12px ${badge.color}33`,
    }}>
      <div style={{ fontSize: 32 }}>{badge.icon}</div>
      <div style={{ fontSize: 12, fontWeight: 800, marginTop: 4 }}>
        {badge.name.replace(/^[^ ]+ /, '')}
      </div>
      <div style={{ fontSize: 9, opacity: 0.8, marginTop: 2 }}>SECRET ✨</div>
    </div>
  );
})}
```

⚠️ **Important** : ne **JAMAIS** afficher les badges secrets non débloqués (sinon ils ne sont plus secrets).

---

# PHASE 6 — Tests

1. **Noctambule** : changer manuellement l'heure du téléphone à 2h → ouvrir l'app → modal pop ✅
2. **Investisseur** : faire +1000 🍪 de profit sur plusieurs ventes → modal pop ✅
3. **Amical** : avoir 3 amis acceptés → modal pop ✅
4. **Pas de doublon** : si déjà débloqué, ne pas re-déclencher
5. **Persistance** : badge reste dans le profil après reload

## Vérifications globales
- ☑ 3 badges secrets fonctionnels
- ☑ Animation festive au déblocage
- ☑ Bonus +100 🍪 versé
- ☑ Badges non débloqués INVISIBLES dans le profil
- ☑ Pas de rouge ni de vert

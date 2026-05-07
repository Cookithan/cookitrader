# Brief — Classement du Marché 📈🏆

Lis bien le CLAUDE.md avant de commencer.
**Procède UNE étape à la fois et attends ma validation visuelle entre chaque.**

---

## ⚠️ Pré-requis

- Le brief **`BRIEF_MARCHE_ONLINE.md`** doit être **terminé et fonctionnel**
- Les tables Supabase `market_state` et `market_portfolio` doivent exister
- L'onglet Classement actuel (par cookies) doit déjà fonctionner

---

## 🎯 Concept

Ajouter un **deuxième classement** dans l'onglet Classement existant, à côté du classement Cookies. Les joueurs sont classés par la **valeur actuelle de leur portfolio** ($CKM × prix actuel).

```
┌──────────────────────────────┐
│  🍪 Cookies  │  📈 Marché    │  ← onglets
└──────────────────────────────┘

[Stats globales du marché]

[Ta position : #12 avec 230 🍪]

🥇 #1  🐱 Tom         2 350 🍪
🥈 #2  🐼 Léa         1 875 🍪
🥉 #3  🦊 Hugo        1 530 🍪
   #4  🐲 Alice         980 🍪
   ...
```

---

# ══════════════════════════════════════════════
# ÉTAPE 1 — Fonctions de récupération
# ══════════════════════════════════════════════

Ajouter ces fonctions à la fin de `src/lib/market.js` :

```js
// ═══════════════════════════════════════════
// CLASSEMENT MARCHÉ
// ═══════════════════════════════════════════

/**
 * Récupère le top N des plus gros portfolios (par valeur actuelle).
 * @param {number} limit Nombre max d'entrées (défaut 10)
 * @returns {Array} Liste enrichie de {user_code, user_name, user_avatar, level, shares, current_value}
 */
export async function getMarketLeaderboard(limit = 10) {
  if (!isSupabaseEnabled()) return [];

  // 1. Récupérer le prix actuel
  const state = await getMarketState();
  if (!state) return [];
  const currentPrice = state.current_price;

  // 2. Récupérer les portfolios non vides triés par nombre d'actions
  // (on triera ensuite par valeur côté client, c'est équivalent puisque le prix
  // est le même pour tout le monde)
  const { data: portfolios, error: pErr } = await supabase
    .from('market_portfolio')
    .select('user_code, shares, total_invested')
    .gt('shares', 0)
    .order('shares', { ascending: false })
    .limit(limit);

  if (pErr || !portfolios || portfolios.length === 0) return [];

  // 3. Enrichir avec les infos utilisateur (nom, avatar, niveau)
  const codes = portfolios.map(p => p.user_code);
  const { data: users } = await supabase
    .from('users')
    .select('user_code, user_name, user_avatar, level')
    .in('user_code', codes);

  const userMap = {};
  (users || []).forEach(u => { userMap[u.user_code] = u; });

  // 4. Calculer la valeur actuelle de chaque portfolio
  return portfolios.map(p => {
    const user = userMap[p.user_code] || {};
    const currentValue = Math.floor(p.shares * currentPrice);
    return {
      user_code: p.user_code,
      user_name: user.user_name || 'Joueur',
      user_avatar: user.user_avatar || '0',
      level: user.level || 1,
      shares: p.shares,
      current_value: currentValue,
    };
  });
}

/**
 * Récupère le rang d'un utilisateur dans le classement marché.
 * @param {string} userCode Code de l'utilisateur
 * @returns {Object|null} {rank, shares, current_value} ou null si pas d'actions
 */
export async function getMyMarketRank(userCode) {
  if (!isSupabaseEnabled() || !userCode) return null;

  // 1. Récupérer mon portfolio
  const myPortfolio = await getUserPortfolio(userCode);
  if (!myPortfolio || myPortfolio.shares === 0) return null;

  // 2. Compter combien d'utilisateurs ont plus d'actions que moi
  const { count } = await supabase
    .from('market_portfolio')
    .select('*', { count: 'exact', head: true })
    .gt('shares', myPortfolio.shares);

  // 3. Récupérer le prix actuel pour calculer la valeur
  const state = await getMarketState();
  const currentPrice = state?.current_price ?? 100;
  const currentValue = Math.floor(myPortfolio.shares * currentPrice);

  return {
    rank: (count ?? 0) + 1,
    shares: myPortfolio.shares,
    current_value: currentValue,
  };
}

/**
 * Récupère les statistiques globales du marché.
 * @returns {Object} {active_traders, shares_held, total_supply}
 */
export async function getMarketGlobalStats() {
  if (!isSupabaseEnabled()) return null;

  const state = await getMarketState();
  if (!state) return null;

  // Compter les traders actifs (qui ont ≥ 1 action)
  const { count: activeCount } = await supabase
    .from('market_portfolio')
    .select('*', { count: 'exact', head: true })
    .gt('shares', 0);

  return {
    active_traders: activeCount ?? 0,
    shares_held: state.shares_in_circulation,
    total_supply: state.total_shares_supply,
  };
}
```

## Vérifications étape 1
- ☑ Pas d'erreur dans la console au chargement
- ☑ Les 3 nouvelles fonctions sont bien exportées

---

# ══════════════════════════════════════════════
# ÉTAPE 2 — Ajouter les onglets dans le classement
# ══════════════════════════════════════════════

Repérer le composant actuel du classement (probablement `LeaderboardTab.jsx` ou similaire) et **ajouter un système d'onglets**.

## Structure à mettre en place

```jsx
function LeaderboardTab({ userCode }) {
  const [tab, setTab] = useState('cookies'); // 'cookies' | 'market'

  return (
    <div style={{ padding: 16, paddingBottom: 100 }}>
      {/* Onglets */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 14,
        background: 'white',
        borderRadius: 14,
        padding: 4,
        border: '1.5px solid #E8DDD0',
      }}>
        <button
          onClick={() => setTab('cookies')}
          style={tabBtnStyle(tab === 'cookies')}
        >
          🍪 Cookies
        </button>
        <button
          onClick={() => setTab('market')}
          style={tabBtnStyle(tab === 'market')}
        >
          📈 Marché
        </button>
      </div>

      {/* Contenu selon l'onglet */}
      {tab === 'cookies' && <CookiesLeaderboard userCode={userCode} />}
      {tab === 'market' && <MarketLeaderboard userCode={userCode} />}
    </div>
  );
}

const tabBtnStyle = (active) => ({
  flex: 1,
  padding: '10px',
  borderRadius: 10,
  border: 'none',
  background: active ? 'linear-gradient(135deg, #D4A017, #C17F3C)' : 'transparent',
  color: active ? 'white' : '#8B6A5A',
  fontWeight: 800,
  fontSize: 13,
  cursor: 'pointer',
  transition: 'all 0.15s',
});
```

⚠️ **Le classement Cookies actuel** (avec ses bots ou avec les vrais utilisateurs si Supabase) doit être **conservé tel quel**. On l'extrait juste dans un sous-composant `<CookiesLeaderboard>` pour pouvoir le switch avec `<MarketLeaderboard>`.

## Vérifications étape 2
- ☑ 2 onglets visibles en haut du Classement (Cookies / Marché)
- ☑ Onglet actif en gradient doré, inactif en moka
- ☑ Switch entre les 2 sans rechargement
- ☑ L'ancien classement Cookies fonctionne toujours dans son onglet

---

# ══════════════════════════════════════════════
# ÉTAPE 3 — Composant `<MarketLeaderboard>`
# ══════════════════════════════════════════════

Créer ce nouveau composant.

```jsx
import { useEffect, useState, useCallback } from 'react';
import { getMarketLeaderboard, getMyMarketRank, getMarketGlobalStats } from '../lib/market';
import Avatar from './Avatar'; // ou le composant avatar utilisé ailleurs

function MarketLeaderboard({ userCode }) {
  const [list, setList] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [leaderboard, rank, globalStats] = await Promise.all([
      getMarketLeaderboard(10),
      getMyMarketRank(userCode),
      getMarketGlobalStats(),
    ]);
    setList(leaderboard);
    setMyRank(rank);
    setStats(globalStats);
    setLoading(false);
  }, [userCode]);

  useEffect(() => {
    refresh();
    // Refresh auto toutes les 30s (le prix bouge donc les valeurs aussi)
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  if (loading && list.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#8B6A5A' }}>
        Chargement du classement...
      </div>
    );
  }

  return (
    <>
      {/* Stats globales du marché */}
      {stats && <MarketGlobalStats stats={stats} />}

      {/* Ma position (si j'ai des actions) */}
      {myRank && <MyMarketRankCard myRank={myRank} />}

      {/* Top 10 */}
      {list.length === 0 ? (
        <EmptyMarketLeaderboard />
      ) : (
        <div>
          <div style={{
            fontSize: 11, fontWeight: 800, color: '#8B6A5A',
            textTransform: 'uppercase', letterSpacing: 2,
            marginBottom: 10, marginTop: 4,
          }}>
            🏆 Top 10 des traders
          </div>
          {list.map((entry, i) => (
            <MarketLeaderRow
              key={entry.user_code}
              rank={i + 1}
              entry={entry}
              isMe={entry.user_code === userCode}
            />
          ))}
        </div>
      )}
    </>
  );
}
```

---

# ══════════════════════════════════════════════
# ÉTAPE 4 — Sous-composants
# ══════════════════════════════════════════════

## `<MarketGlobalStats>` — Stats globales en haut

```jsx
function MarketGlobalStats({ stats }) {
  const heldPct = stats.total_supply > 0
    ? Math.round((stats.shares_held / stats.total_supply) * 100)
    : 0;

  return (
    <div style={{
      background: 'linear-gradient(140deg, #4A2C17, #7D4E1F)',
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      color: 'white',
    }}>
      <div style={{
        fontSize: 11, color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase', letterSpacing: 2,
        marginBottom: 10,
      }}>
        🌍 Le marché en chiffres
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#D4A017' }}>
            {stats.active_traders}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
            👥 Traders actifs
          </div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.15)' }} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#D4A017' }}>
            {stats.shares_held.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
            💎 Actions détenues
          </div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.15)' }} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#D4A017' }}>
            {heldPct}%
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
            📊 Du marché
          </div>
        </div>
      </div>
    </div>
  );
}
```

## `<MyMarketRankCard>` — Ma position perso

```jsx
function MyMarketRankCard({ myRank }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(212,160,23,0.15), rgba(193,127,60,0.15))',
      border: '2px solid #D4A017',
      borderRadius: 14,
      padding: '12px 16px',
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontSize: 11, color: '#8B6A5A', textTransform: 'uppercase', letterSpacing: 1.5 }}>
          ✨ Ta position
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#D4A017', lineHeight: 1.2 }}>
          #{myRank.rank}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#2C1810' }}>
          {myRank.current_value} 🍪
        </div>
        <div style={{ fontSize: 11, color: '#8B6A5A' }}>
          {myRank.shares} action(s)
        </div>
      </div>
    </div>
  );
}
```

## `<MarketLeaderRow>` — Une ligne du classement

```jsx
function MarketLeaderRow({ rank, entry, isMe }) {
  // Style spécial pour le top 3
  let rankBg = '#F5EFE6';
  let rankColor = '#8B6A5A';
  let rankIcon = `#${rank}`;

  if (rank === 1) {
    rankBg = 'linear-gradient(135deg, #F0C050, #D4A017)';
    rankColor = 'white';
    rankIcon = '🥇';
  } else if (rank === 2) {
    rankBg = 'linear-gradient(135deg, #C8A878, #A0784E)';
    rankColor = 'white';
    rankIcon = '🥈';
  } else if (rank === 3) {
    rankBg = 'linear-gradient(135deg, #B07840, #7D4E1F)';
    rankColor = 'white';
    rankIcon = '🥉';
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: 14,
      padding: '10px 12px',
      marginBottom: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      border: isMe ? '2px solid #D4A017' : '1.5px solid #E8DDD0',
      boxShadow: isMe ? '0 4px 12px rgba(212,160,23,0.25)' : 'none',
    }}>
      {/* Rang */}
      <div style={{
        width: 38, height: 38,
        borderRadius: 10,
        background: rankBg,
        color: rankColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900,
        fontSize: rank <= 3 ? 18 : 13,
        flexShrink: 0,
      }}>
        {rankIcon}
      </div>

      {/* Avatar */}
      <Avatar id={entry.user_avatar} size={36} />

      {/* Infos joueur */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 800, color: '#2C1810',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {entry.user_name}
          {isMe && <span style={{ color: '#D4A017', marginLeft: 6, fontSize: 11 }}>✦ Toi</span>}
        </div>
        <div style={{ fontSize: 11, color: '#8B6A5A' }}>
          Niveau {entry.level}
        </div>
      </div>

      {/* Valeur du portfolio */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#D4A017' }}>
          {entry.current_value.toLocaleString()} 🍪
        </div>
        <div style={{ fontSize: 10, color: '#8B6A5A' }}>
          {entry.shares} actions
        </div>
      </div>
    </div>
  );
}
```

## `<EmptyMarketLeaderboard>` — Aucun trader

```jsx
function EmptyMarketLeaderboard() {
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 32,
      textAlign: 'center',
      border: '1.5px solid #E8DDD0',
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📈</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#2C1810', marginBottom: 6 }}>
        Aucun trader pour le moment
      </div>
      <div style={{ fontSize: 12, color: '#8B6A5A', lineHeight: 1.5 }}>
        Sois le premier à acheter des $CKM<br/>
        et prends la tête du classement !
      </div>
    </div>
  );
}
```

## Vérifications étape 4
- ☑ Stats globales en haut (3 chiffres : traders actifs / actions détenues / % du marché)
- ☑ Si l'utilisateur a des actions → carte "Ta position" en doré juste en-dessous
- ☑ Si l'utilisateur n'a pas d'actions → pas de carte "Ta position" (et il n'apparaît pas dans le top)
- ☑ Top 10 affiché avec medailles 🥇🥈🥉 pour les 3 premiers
- ☑ Si je suis dans le top → ma ligne a une bordure dorée + "✦ Toi"
- ☑ Si aucun trader → message "Sois le premier"
- ☑ Refresh automatique toutes les 30s (les valeurs bougent avec le prix)

---

# ══════════════════════════════════════════════
# ÉTAPE 5 — Tests
# ══════════════════════════════════════════════

## À tester manuellement

1. **Onglet Marché vide** : si personne n'a acheté d'actions encore → "Sois le premier"
2. **Toi seul as des actions** : tu apparais en #1 avec ta valeur
3. **Avec plusieurs joueurs** : ouvrir l'app sur 2 navigateurs (ou un copain) → acheter sur les 2 → vérifier que les 2 apparaissent dans le top dans le bon ordre
4. **Le prix change** : acheter pour faire monter le prix → vérifier que les valeurs des autres traders augmentent aussi (refresh 30s)
5. **Joueur sans actions** : vérifier qu'un compte avec 0 action ne s'affiche **PAS** dans le classement marché (mais s'affiche bien dans le classement Cookies)
6. **Médailles** : top 3 ont bien les couleurs spéciales (or / bronze / cuivre)

## Vérifications globales
- ☑ Pas de rouge ni de vert (palette café uniquement)
- ☑ Mobile-friendly (390px de large)
- ☑ Pas de plantage si Supabase est down (afficher un message)
- ☑ Pas de spam de requêtes (max ~1 toutes les 30s pour ce composant)
- ☑ Tab Cookies original fonctionne toujours pareil

---

# ══════════════════════════════════════════════
# 💡 NOTES IMPORTANTES POUR CLAUDE CODE
# ══════════════════════════════════════════════

- **Réutiliser le composant `<Avatar>`** existant dans le projet, pas en redessiner un
- Les **couleurs des médailles** utilisent uniquement la palette café (or, bronze, cuivre — tons chauds)
- **Filtre obligatoire** : `gt('shares', 0)` partout pour exclure les non-traders du classement marché
- L'utilisateur **sans aucune action** ne voit **PAS** la carte "Ta position" (puisqu'il n'a pas de rang dans ce classement)
- Le calcul `current_value = shares * current_price` se fait **côté client** après récupération du prix → pas besoin de stocker la valeur en BDD
- Si tu vois une faute de frappe dans le brief, **utilise le bon nom** (ex: `current_price` ou `currentPrice` selon le code existant)

Bon dev ! ☕📈🏆

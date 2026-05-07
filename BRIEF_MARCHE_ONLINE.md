# Brief — Marché $CKM en ligne (Supabase) 📈💎

Lis bien le CLAUDE.md avant de commencer.
**Fais UNE phase à la fois et attends ma validation visuelle avant de passer à la suivante.**

---

## 🎯 Concept

Le marché actuel est local (chaque joueur a sa propre courbe). On le transforme en **vrai marché partagé** entre tous les utilisateurs via Supabase, avec un système d'**offre/demande réaliste** :

- **10 000 actions $CKM** existent au total
- Quand quelqu'un achète, le stock disponible diminue ET le prix monte
- Quand il revend, le stock revient ET le prix descend
- Affiché en temps réel : "X actions disponibles" + courbe partagée par tous

---

## 💡 Philosophie UX : SIMPLE POUR LE JOUEUR

⚠️ **Le marché doit être compréhensible immédiatement** par un débutant. C'est un jeu mobile fun, pas une app de trading pro.

**Choix de simplification appliqués partout** :
- ✅ Pas de pourcentages cryptiques → "Plus haut qu'hier" / "Plus bas qu'hier" / "Stable"
- ✅ Pas de "volume 24h" affiché par défaut (récupéré dans la base mais non affiché)
- ✅ Portfolio simplifié : "Tu as X actions qui valent Y 🍪" + gain/perte en cookies (pas de %)
- ✅ Boutons d'action explicites : "Acheter pour 145 🍪" (au lieu de juste "Acheter")
- ✅ Bulle d'aide (?) à côté de "Stock disponible" qui explique en 1 phrase
- ✅ **Mini-tutoriel 3 étapes** au premier accès au marché (skippable)
- ❌ Pas de "prix moyen" / "investi total" / autres calculs avancés affichés

---

## ⚠️ Pré-requis

- Supabase configuré et fonctionnel (briefs précédents)
- `src/lib/supabase.js` existe et exporte `supabase` + `isSupabaseEnabled`
- Variables d'environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` en place sur Vercel ET en local

---

# ══════════════════════════════════════════════
# PHASE 1 — Création des tables Supabase
# ══════════════════════════════════════════════

⚠️ **Cette phase doit être faite par l'utilisateur** dans le dashboard Supabase.
Claude Code doit afficher ces instructions et **attendre la confirmation** avant de continuer.

## Action utilisateur

1. Aller sur Supabase → **SQL Editor** → cliquer **"+"** pour une nouvelle query
2. Coller le SQL ci-dessous **en entier**
3. Cliquer **Run** (Ctrl+Entrée)

## Le SQL à exécuter

```sql
-- ═══════════════════════════════════════════
-- TABLES DU MARCHÉ
-- ═══════════════════════════════════════════

-- État global du marché (1 seule ligne)
create table public.market_state (
  id int primary key default 1,
  current_price numeric not null default 100,
  shares_in_circulation int not null default 0,
  total_shares_supply int not null default 10000,
  last_inflation_at timestamptz not null default now(),
  last_updated timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.market_state (id) values (1)
on conflict (id) do nothing;

-- Historique des prix (snapshot toutes les 5 min)
create table public.market_history (
  id uuid default gen_random_uuid() primary key,
  price numeric not null,
  shares_circulating int not null default 0,
  recorded_at timestamptz not null default now()
);

create index idx_market_history_time on public.market_history(recorded_at desc);

-- Transactions
create table public.market_transactions (
  id uuid default gen_random_uuid() primary key,
  user_code text not null,
  type text not null check (type in ('buy', 'sell')),
  shares int not null check (shares > 0),
  price_per_share numeric not null,
  total_amount numeric not null,
  created_at timestamptz not null default now()
);

create index idx_transactions_time on public.market_transactions(created_at desc);
create index idx_transactions_user on public.market_transactions(user_code);

-- Portfolio des utilisateurs
create table public.market_portfolio (
  user_code text primary key,
  shares int not null default 0,
  total_invested numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════
-- ACTIVATION RLS + POLITIQUES
-- ═══════════════════════════════════════════
alter table public.market_state enable row level security;
alter table public.market_history enable row level security;
alter table public.market_transactions enable row level security;
alter table public.market_portfolio enable row level security;

create policy "Anyone can read market state"
  on public.market_state for select using (true);
create policy "Anyone can update market state"
  on public.market_state for update using (true) with check (true);

create policy "Anyone can read history"
  on public.market_history for select using (true);
create policy "Anyone can insert history"
  on public.market_history for insert with check (true);

create policy "Anyone can read transactions"
  on public.market_transactions for select using (true);
create policy "Anyone can insert transactions"
  on public.market_transactions for insert with check (true);

create policy "Anyone can read portfolio"
  on public.market_portfolio for select using (true);
create policy "Anyone can insert portfolio"
  on public.market_portfolio for insert with check (true);
create policy "Anyone can update portfolio"
  on public.market_portfolio for update using (true) with check (true);
```

## Vérifications phase 1
- ☑ 4 tables visibles dans Table Editor : `market_state`, `market_history`, `market_transactions`, `market_portfolio`
- ☑ La ligne unique dans `market_state` a `current_price = 100`, `shares_in_circulation = 0`, `total_shares_supply = 10000`
- ☑ RLS active sur les 4 tables (cadenas vert)

---

# ══════════════════════════════════════════════
# PHASE 2 — Module marché côté client
# ══════════════════════════════════════════════

Créer `src/lib/market.js` avec toute la logique du marché.

```js
import { supabase, isSupabaseEnabled } from './supabase';

// ═══════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════
export const MARKET_CONFIG = {
  PRICE_MIN: 10,
  PRICE_MAX: 1000,
  PRICE_INITIAL: 100,
  TOTAL_SHARES: 10000,
  IMPACT_PER_SHARE: 0.005,        // +0.5% par action achetée
  DAILY_INFLATION: 0.001,         // +0.1% par jour
  MEAN_REVERSION_LOW: 30,
  MEAN_REVERSION_HIGH: 700,
  MEAN_REVERSION_RATE: 0.0008,
  MAX_SHARES_PER_USER_PCT: 0.10,  // 10% du total = 1000 actions max par user
  HISTORY_HOURS: 24,
};

export const MAX_SHARES_PER_USER = Math.floor(
  MARKET_CONFIG.TOTAL_SHARES * MARKET_CONFIG.MAX_SHARES_PER_USER_PCT
);

// ═══════════════════════════════════════════
// LECTURE
// ═══════════════════════════════════════════

export async function getMarketState() {
  if (!isSupabaseEnabled()) return null;
  const { data, error } = await supabase
    .from('market_state')
    .select('*')
    .eq('id', 1)
    .single();
  if (error) {
    console.warn('getMarketState error:', error);
    return null;
  }
  return {
    ...data,
    current_price: parseFloat(data.current_price),
    available_shares: data.total_shares_supply - data.shares_in_circulation,
  };
}

export async function getMarketHistory() {
  if (!isSupabaseEnabled()) return [];
  const since = new Date(Date.now() - MARKET_CONFIG.HISTORY_HOURS * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from('market_history')
    .select('price, recorded_at')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });
  return (data || []).map(d => ({ ...d, price: parseFloat(d.price) }));
}

export async function getDailyVolume() {
  if (!isSupabaseEnabled()) return { buy: 0, sell: 0, total: 0 };
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from('market_transactions')
    .select('type, shares')
    .gte('created_at', since);
  const result = { buy: 0, sell: 0, total: 0 };
  data?.forEach(t => {
    if (t.type === 'buy') result.buy += t.shares;
    else result.sell += t.shares;
    result.total += t.shares;
  });
  return result;
}

export async function getUserPortfolio(userCode) {
  if (!isSupabaseEnabled() || !userCode) return null;
  const { data } = await supabase
    .from('market_portfolio')
    .select('*')
    .eq('user_code', userCode)
    .maybeSingle();
  if (!data) return { user_code: userCode, shares: 0, total_invested: 0 };
  return {
    ...data,
    total_invested: parseFloat(data.total_invested),
  };
}

// ═══════════════════════════════════════════
// ACHAT
// ═══════════════════════════════════════════
export async function buyShares(userCode, shares) {
  if (!isSupabaseEnabled()) return { error: 'Hors ligne' };
  if (!shares || shares < 1) return { error: 'Quantité invalide' };

  const state = await getMarketState();
  if (!state) return { error: 'Marché indisponible' };

  // Vérifier le stock disponible
  if (shares > state.available_shares) {
    return { error: `Seulement ${state.available_shares} action(s) disponible(s)` };
  }

  // Vérifier la limite par utilisateur
  const portfolio = await getUserPortfolio(userCode);
  if (portfolio.shares + shares > MAX_SHARES_PER_USER) {
    const remaining = MAX_SHARES_PER_USER - portfolio.shares;
    return {
      error: `Limite max ${MAX_SHARES_PER_USER} actions par utilisateur. Tu peux en acheter ${Math.max(0, remaining)} de plus`
    };
  }

  const currentPrice = state.current_price;
  const totalCost = Math.ceil(currentPrice * shares);

  // Calculer le nouveau prix
  const priceImpact = MARKET_CONFIG.IMPACT_PER_SHARE * shares;
  let newPrice = currentPrice * (1 + priceImpact);
  newPrice = Math.min(MARKET_CONFIG.PRICE_MAX, newPrice);

  // Update état du marché
  const { error: updateErr } = await supabase
    .from('market_state')
    .update({
      current_price: newPrice,
      shares_in_circulation: state.shares_in_circulation + shares,
      last_updated: new Date().toISOString(),
    })
    .eq('id', 1);

  if (updateErr) return { error: 'Erreur de mise à jour du marché' };

  // Log transaction
  await supabase.from('market_transactions').insert({
    user_code: userCode,
    type: 'buy',
    shares,
    price_per_share: currentPrice,
    total_amount: totalCost,
  });

  // Update portfolio
  await supabase.from('market_portfolio').upsert({
    user_code: userCode,
    shares: portfolio.shares + shares,
    total_invested: portfolio.total_invested + totalCost,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_code' });

  return {
    success: true,
    cost: totalCost,
    pricePaid: currentPrice,
    newPrice,
    sharesNow: portfolio.shares + shares,
  };
}

// ═══════════════════════════════════════════
// VENTE
// ═══════════════════════════════════════════
export async function sellShares(userCode, shares) {
  if (!isSupabaseEnabled()) return { error: 'Hors ligne' };
  if (!shares || shares < 1) return { error: 'Quantité invalide' };

  const portfolio = await getUserPortfolio(userCode);
  if (portfolio.shares < shares) {
    return { error: `Tu n'as que ${portfolio.shares} action(s)` };
  }

  const state = await getMarketState();
  if (!state) return { error: 'Marché indisponible' };

  const currentPrice = state.current_price;
  const totalGained = Math.floor(currentPrice * shares);

  // Calculer le nouveau prix (la vente fait baisser)
  const priceImpact = MARKET_CONFIG.IMPACT_PER_SHARE * shares;
  let newPrice = currentPrice * (1 - priceImpact);
  newPrice = Math.max(MARKET_CONFIG.PRICE_MIN, newPrice);

  // Calculer la valeur restante du portfolio (pour l'investi)
  // Approche simple : proportionnelle aux actions vendues
  const ratio = shares / portfolio.shares;
  const investedReleased = portfolio.total_invested * ratio;

  // Update marché
  await supabase
    .from('market_state')
    .update({
      current_price: newPrice,
      shares_in_circulation: state.shares_in_circulation - shares,
      last_updated: new Date().toISOString(),
    })
    .eq('id', 1);

  // Log transaction
  await supabase.from('market_transactions').insert({
    user_code: userCode,
    type: 'sell',
    shares,
    price_per_share: currentPrice,
    total_amount: totalGained,
  });

  // Update portfolio
  const newShares = portfolio.shares - shares;
  await supabase.from('market_portfolio').upsert({
    user_code: userCode,
    shares: newShares,
    total_invested: newShares === 0 ? 0 : portfolio.total_invested - investedReleased,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_code' });

  return {
    success: true,
    gained: totalGained,
    pricePaid: currentPrice,
    newPrice,
    sharesNow: newShares,
    profit: totalGained - investedReleased,
  };
}

// ═══════════════════════════════════════════
// MAINTENANCE (inflation + régression + snapshot historique)
// À appeler depuis le client toutes les X minutes
// ═══════════════════════════════════════════
export async function maintenanceTick() {
  if (!isSupabaseEnabled()) return;

  const state = await getMarketState();
  if (!state) return;

  const now = Date.now();
  const lastInflation = new Date(state.last_inflation_at).getTime();
  const hoursSince = (now - lastInflation) / (3600 * 1000);

  // Si moins d'1h depuis la dernière maintenance, on skip
  if (hoursSince < 1) return;

  let newPrice = state.current_price;

  // 1. Inflation par jour (proportionnelle au temps écoulé)
  const daysSince = hoursSince / 24;
  newPrice = newPrice * (1 + MARKET_CONFIG.DAILY_INFLATION * daysSince);

  // 2. Régression vers la moyenne (si trop bas ou trop haut)
  if (newPrice < MARKET_CONFIG.MEAN_REVERSION_LOW) {
    // Sous le seuil bas → faire remonter doucement
    const distance = MARKET_CONFIG.MEAN_REVERSION_LOW - newPrice;
    newPrice += distance * MARKET_CONFIG.MEAN_REVERSION_RATE * hoursSince;
  } else if (newPrice > MARKET_CONFIG.MEAN_REVERSION_HIGH) {
    // Au-dessus du seuil haut → faire redescendre doucement
    const distance = newPrice - MARKET_CONFIG.MEAN_REVERSION_HIGH;
    newPrice -= distance * MARKET_CONFIG.MEAN_REVERSION_RATE * hoursSince;
  }

  // Clamp dans les bornes
  newPrice = Math.max(MARKET_CONFIG.PRICE_MIN, Math.min(MARKET_CONFIG.PRICE_MAX, newPrice));

  // Update state
  await supabase
    .from('market_state')
    .update({
      current_price: newPrice,
      last_inflation_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    })
    .eq('id', 1);

  // 3. Snapshot historique
  await supabase.from('market_history').insert({
    price: newPrice,
    shares_circulating: state.shares_in_circulation,
  });
}
```

## Vérifications phase 2
- ☑ Fichier `src/lib/market.js` créé
- ☑ Pas d'erreur dans la console au chargement de l'app
- ☑ Les imports fonctionnent

---

# ══════════════════════════════════════════════
# PHASE 3 — UI : Carte d'état du marché
# ══════════════════════════════════════════════

Refondre la page Marché actuelle pour afficher les vraies données Supabase.

## Composant `MarketStateCard`

À placer en haut de la page Marché :

```jsx
function MarketStateCard({ state, dayChange }) {
  const [showHelp, setShowHelp] = useState(false);
  const available = state?.available_shares ?? 0;
  const total = state?.total_shares_supply ?? 10000;
  const availablePct = (available / total) * 100;

  // Trend message au lieu d'un %
  let trendText, trendColor, arrow;
  if (dayChange > 1) {
    trendText = "Plus haut qu'hier"; trendColor = '#D4A017'; arrow = '↑';
  } else if (dayChange < -1) {
    trendText = "Plus bas qu'hier"; trendColor = '#7D4E1F'; arrow = '↓';
  } else {
    trendText = "Stable"; trendColor = '#8B6A5A'; arrow = '→';
  }

  return (
    <div style={{
      background: 'linear-gradient(140deg, #4A2C17, #7D4E1F)',
      borderRadius: 18,
      padding: 18,
      color: 'white',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 2 }}>
            $CKM · Action Cookie
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#D4A017', marginTop: 4, lineHeight: 1 }}>
            {state ? state.current_price.toFixed(0) : '—'}
            <span style={{ fontSize: 18, color: 'rgba(212,160,23,0.7)', marginLeft: 6 }}>🍪</span>
          </div>
          <div style={{ fontSize: 13, color: trendColor, marginTop: 4, fontWeight: 700 }}>
            {arrow} {trendText}
          </div>
        </div>
        <div style={{
          background: 'rgba(212, 160, 23, 0.2)',
          border: '1.5px solid rgba(212, 160, 23, 0.5)',
          borderRadius: 12,
          padding: '6px 12px',
          fontSize: 11,
          fontWeight: 700,
          color: '#D4A017',
        }}>
          📊 LIVE
        </div>
      </div>

      {/* Barre des actions disponibles + bulle d'aide */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
              💎 Actions disponibles
            </span>
            <button
              onClick={() => setShowHelp(!showHelp)}
              style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'rgba(212,160,23,0.25)',
                border: '1px solid rgba(212,160,23,0.5)',
                color: '#D4A017', fontSize: 11, fontWeight: 800,
                cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >?</button>
          </div>
          <span style={{ color: '#D4A017', fontWeight: 700, fontSize: 11 }}>
            {available.toLocaleString()} / {total.toLocaleString()}
          </span>
        </div>
        <div style={{ height: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${availablePct}%`,
            background: 'linear-gradient(90deg, #C17F3C, #D4A017)',
            borderRadius: 4,
            transition: 'width 0.5s ease',
          }} />
        </div>

        {/* Bulle d'aide qui apparaît au clic */}
        {showHelp && (
          <div style={{
            marginTop: 8,
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 10,
            fontSize: 11,
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.4,
          }}>
            💡 Plus les joueurs achètent, moins il en reste et plus le prix monte. Quand on vend, le stock revient.
          </div>
        )}
      </div>
    </div>
  );
}
```

## Vérifications phase 3
- ☑ Carte état du marché s'affiche en haut
- ☑ Prix actuel visible (récupéré depuis Supabase)
- ☑ Variation 24h calculée (en caramel si positif, moka si négatif — pas de rouge/vert !)
- ☑ Barre actions disponibles avec gradient doré
- ☑ Volume 24h affiché (achats / ventes / total)

---

# ══════════════════════════════════════════════
# PHASE 4 — UI : Courbe et historique
# ══════════════════════════════════════════════

## Composant `MarketChart`

Affiche la courbe SVG des 24 dernières heures.

```jsx
function MarketChart({ history }) {
  if (!history || history.length < 2) {
    return (
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 40,
        textAlign: 'center',
        color: '#8B6A5A',
        fontSize: 13,
        marginBottom: 12,
      }}>
        📊 En attente de données du marché...
      </div>
    );
  }

  const prices = history.map(h => h.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = Math.max(maxPrice - minPrice, 1);

  const W = 320;
  const H = 120;
  const PAD = 8;

  const points = history.map((h, i) => {
    const x = PAD + (i / (history.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((h.price - minPrice) / range) * (H - PAD * 2);
    return { x, y };
  });

  const pathD = points.map((p, i) =>
    (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)
  ).join(' ');

  const areaD = pathD + ` L ${points[points.length - 1].x.toFixed(1)},${H - PAD} L ${points[0].x.toFixed(1)},${H - PAD} Z`;

  const trend = prices[prices.length - 1] >= prices[0];
  const lineColor = trend ? '#D4A017' : '#7D4E1F';
  const fillColor = trend ? 'rgba(212,160,23,0.2)' : 'rgba(125,78,31,0.2)';

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      border: '1.5px solid #E8DDD0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#2C1810' }}>
          📊 Évolution sur 24h
        </div>
        <div style={{ fontSize: 11, color: '#8B6A5A' }}>
          {history.length} points
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 120, display: 'block' }}>
        {/* Grid lines */}
        <line x1={PAD} y1={H/2} x2={W-PAD} y2={H/2} stroke="#F0E4D0" strokeWidth="1" strokeDasharray="3,3"/>
        {/* Area under curve */}
        <path d={areaD} fill={fillColor}/>
        {/* Curve */}
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
        {/* Last point */}
        <circle cx={points[points.length-1].x} cy={points[points.length-1].y} r="4" fill={lineColor}/>
        <circle cx={points[points.length-1].x} cy={points[points.length-1].y} r="6" fill="none" stroke={lineColor} strokeWidth="1" opacity="0.5"/>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#A0784E', marginTop: 6 }}>
        <span>Min : {minPrice.toFixed(0)} 🍪</span>
        <span>Max : {maxPrice.toFixed(0)} 🍪</span>
      </div>
    </div>
  );
}
```

## Vérifications phase 4
- ☑ Courbe SVG s'affiche avec les vraies données Supabase
- ☑ Min et max affichés sous la courbe
- ☑ Couleur caramel si tendance haussière, moka si baissière
- ☑ Si aucun historique encore, message "En attente"

---

# ══════════════════════════════════════════════
# PHASE 5 — UI : Achat / Vente
# ══════════════════════════════════════════════

## Composant `TradePanel`

Boutons d'achat/vente avec sélecteur de quantité.

```jsx
function TradePanel({ state, portfolio, userCode, coins, onTradeSuccess }) {
  const [quantity, setQuantity] = useState(1);
  const [mode, setMode] = useState('buy'); // 'buy' | 'sell'
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const price = state?.current_price ?? 100;
  const totalCost = Math.ceil(price * quantity);
  const totalGain = Math.floor(price * quantity);

  const maxBuyable = Math.min(
    state?.available_shares ?? 0,
    Math.floor(coins / price),
    MAX_SHARES_PER_USER - (portfolio?.shares ?? 0)
  );
  const maxSellable = portfolio?.shares ?? 0;

  const max = mode === 'buy' ? maxBuyable : maxSellable;
  const canTrade = max >= 1;

  const handleTrade = async () => {
    if (loading || !canTrade) return;
    setLoading(true);
    setFeedback(null);

    const result = mode === 'buy'
      ? await buyShares(userCode, quantity)
      : await sellShares(userCode, quantity);

    setLoading(false);
    if (result.error) {
      setFeedback({ type: 'error', msg: result.error });
    } else {
      setFeedback({
        type: 'success',
        msg: mode === 'buy'
          ? `✓ Acheté ${quantity} action(s) pour ${result.cost} 🍪`
          : `✓ Vendu ${quantity} action(s) pour ${result.gained} 🍪`
      });
      onTradeSuccess(result);
      setQuantity(1);
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      border: '1.5px solid #E8DDD0',
    }}>
      {/* Tabs Buy/Sell */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          onClick={() => { setMode('buy'); setQuantity(1); setFeedback(null); }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 12,
            border: 'none',
            background: mode === 'buy' ? 'linear-gradient(135deg, #D4A017, #C17F3C)' : '#F5EFE6',
            color: mode === 'buy' ? 'white' : '#8B6A5A',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          📈 Acheter
        </button>
        <button
          onClick={() => { setMode('sell'); setQuantity(1); setFeedback(null); }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 12,
            border: 'none',
            background: mode === 'sell' ? 'linear-gradient(135deg, #7D4E1F, #5C3317)' : '#F5EFE6',
            color: mode === 'sell' ? 'white' : '#8B6A5A',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          📉 Vendre
        </button>
      </div>

      {/* Quantity selector */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8B6A5A', marginBottom: 8 }}>
          <span>Quantité</span>
          <span style={{ color: '#D4A017', fontWeight: 700 }}>Max : {max}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#F5EFE6', border: '1.5px solid #E8DDD0',
              fontSize: 20, fontWeight: 800, color: '#2C1810', cursor: 'pointer'
            }}>−</button>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(Math.max(1, Math.min(max, parseInt(e.target.value) || 1)))}
            style={{
              flex: 1, height: 40, textAlign: 'center',
              fontSize: 18, fontWeight: 800, color: '#2C1810',
              border: '1.5px solid #E8DDD0', borderRadius: 10,
              background: 'white',
            }}
          />
          <button onClick={() => setQuantity(Math.min(max, quantity + 1))}
            disabled={quantity >= max}
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#F5EFE6', border: '1.5px solid #E8DDD0',
              fontSize: 20, fontWeight: 800, color: '#2C1810', cursor: 'pointer'
            }}>+</button>
        </div>
        {/* Quick selectors */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {[1, 5, 10, max].filter((v, i, arr) => v >= 1 && arr.indexOf(v) === i).slice(0, 4).map(v => (
            <button key={v}
              onClick={() => setQuantity(v)}
              style={{
                flex: 1, padding: '6px', borderRadius: 8,
                background: quantity === v ? '#D4A017' : '#F5EFE6',
                color: quantity === v ? 'white' : '#8B6A5A',
                border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer'
              }}>
              {v === max && v > 10 ? 'MAX' : v}
            </button>
          ))}
        </div>
      </div>

      {/* Total */}
      <div style={{
        background: '#F5EFE6',
        borderRadius: 12,
        padding: '10px 12px',
        marginBottom: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: '#8B6A5A' }}>
          {mode === 'buy' ? 'Coût total' : 'Tu recevras'}
        </span>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#D4A017' }}>
          {mode === 'buy' ? totalCost : totalGain} 🍪
        </span>
      </div>

      {/* Action button */}
      <button
        onClick={handleTrade}
        disabled={loading || !canTrade}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 14,
          border: 'none',
          background: canTrade
            ? (mode === 'buy' ? 'linear-gradient(135deg, #D4A017, #C17F3C)' : 'linear-gradient(135deg, #7D4E1F, #5C3317)')
            : '#E8DDD0',
          color: canTrade ? 'white' : '#8B6A5A',
          fontWeight: 800,
          fontSize: 15,
          cursor: canTrade ? 'pointer' : 'not-allowed',
          boxShadow: canTrade ? '0 4px 12px rgba(212,160,23,0.4)' : 'none',
        }}
      >
        {loading ? '...' : (mode === 'buy'
          ? `Acheter pour ${totalCost} 🍪`
          : `Vendre pour ${totalGain} 🍪`)}
      </button>

      {/* Feedback */}
      {feedback && (
        <div style={{
          marginTop: 10,
          padding: '8px 12px',
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 600,
          background: feedback.type === 'success' ? 'rgba(212,160,23,0.1)' : 'rgba(125,78,31,0.1)',
          color: feedback.type === 'success' ? '#C8960C' : '#7D4E1F',
          textAlign: 'center',
        }}>
          {feedback.msg}
        </div>
      )}
    </div>
  );
}
```

## Vérifications phase 5
- ☑ Onglets Buy/Sell qui changent de couleur (caramel pour acheter, moka pour vendre)
- ☑ Sélecteur +/- + champ quantité
- ☑ Boutons rapides (1, 5, 10, MAX)
- ☑ Coût total calculé en temps réel
- ☑ Achat fonctionnel : le prix monte, le portfolio monte, les cookies baissent
- ☑ Vente fonctionnelle : le prix baisse, le portfolio baisse, les cookies montent
- ☑ Erreurs affichées si pas assez de cookies / actions / disponible

---

# ══════════════════════════════════════════════
# PHASE 6 — Mon portfolio
# ══════════════════════════════════════════════

## Composant `PortfolioCard`

Carte qui montre les actions détenues du joueur + sa valeur actuelle + son profit/perte.

```jsx
function PortfolioCard({ portfolio, currentPrice }) {
  if (!portfolio || portfolio.shares === 0) {
    return (
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        border: '1.5px solid #E8DDD0',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>💼</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#2C1810' }}>Aucune action</div>
        <div style={{ fontSize: 11, color: '#8B6A5A', marginTop: 2 }}>
          Achète tes premières $CKM pour commencer !
        </div>
      </div>
    );
  }

  const currentValue = Math.floor(portfolio.shares * currentPrice);
  const profit = currentValue - portfolio.total_invested;
  const profitColor = profit >= 0 ? '#D4A017' : '#7D4E1F';
  const profitIcon = profit > 0 ? '📈' : (profit < 0 ? '📉' : '➖');

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      border: '1.5px solid #E8DDD0',
    }}>
      <div style={{ fontSize: 11, color: '#8B6A5A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
        💼 Mes actions
      </div>

      {/* Phrase claire */}
      <div style={{ fontSize: 14, color: '#2C1810', lineHeight: 1.4 }}>
        Tu as <strong style={{ color: '#D4A017', fontSize: 16 }}>{portfolio.shares}</strong> action(s) qui valent maintenant <strong style={{ color: '#D4A017', fontSize: 16 }}>{currentValue} 🍪</strong>
      </div>

      {/* Gain/perte simple */}
      <div style={{
        marginTop: 10,
        padding: '8px 12px',
        background: profit >= 0 ? 'rgba(212,160,23,0.1)' : 'rgba(125,78,31,0.1)',
        borderRadius: 10,
        fontSize: 12,
        color: profitColor,
        fontWeight: 700,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>{profitIcon} {profit > 0 ? 'Gain actuel' : (profit < 0 ? 'Perte actuelle' : 'À l\'équilibre')}</span>
        <span>{profit > 0 ? '+' : ''}{profit} 🍪</span>
      </div>
    </div>
  );
}
```

## Vérifications phase 6
- ☑ Si pas d'actions → message d'invitation
- ☑ Si actions : nombre, valeur actuelle, profit/perte affichés
- ☑ Couleur caramel si profit, moka si perte
- ☑ Prix moyen d'achat affiché en bas

---

# ══════════════════════════════════════════════
# PHASE 7 — Page Marché complète + sync
# ══════════════════════════════════════════════

Assembler toutes les pièces dans `MarketTab.jsx`.

```jsx
import { useEffect, useState, useCallback } from 'react';
import {
  getMarketState, getMarketHistory,
  getUserPortfolio, maintenanceTick
} from '../lib/market';

function MarketTab({ userCode, coins }) {
  const [state, setState] = useState(null);
  const [history, setHistory] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [dayChange, setDayChange] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);

  // Mini-tutoriel à la première ouverture du marché
  useEffect(() => {
    const seen = localStorage.getItem('cookiminer:marketWelcomeSeen');
    if (!seen) setShowWelcome(true);
  }, []);

  const closeWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('cookiminer:marketWelcomeSeen', '1');
  };

  const refresh = useCallback(async () => {
    if (!userCode) return;
    const [s, h, p] = await Promise.all([
      getMarketState(),
      getMarketHistory(),
      getUserPortfolio(userCode),
    ]);
    setState(s);
    setHistory(h);
    setPortfolio(p);

    // Calcul de la variation 24h
    if (s && h.length > 0) {
      const oldPrice = h[0].price;
      const change = ((s.current_price - oldPrice) / oldPrice) * 100;
      setDayChange(change);
    }
  }, [userCode]);

  useEffect(() => {
    refresh();
    maintenanceTick();
    const tickInt = setInterval(maintenanceTick, 5 * 60 * 1000);
    const refreshInt = setInterval(refresh, 15000);
    return () => {
      clearInterval(tickInt);
      clearInterval(refreshInt);
    };
  }, [refresh]);

  return (
    <div style={{ padding: 16, paddingBottom: 100 }}>
      <MarketStateCard state={state} dayChange={dayChange} />
      <MarketChart history={history} />
      <PortfolioCard portfolio={portfolio} currentPrice={state?.current_price ?? 100} />
      <TradePanel
        state={state}
        portfolio={portfolio}
        userCode={userCode}
        coins={coins}
        onTradeSuccess={refresh}
      />

      {showWelcome && <MarketWelcomeModal onClose={closeWelcome} />}
    </div>
  );
}

// Mini-tutoriel 3 étapes au premier accès
function MarketWelcomeModal({ onClose }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      icon: '📊',
      title: 'Bienvenue sur le marché $CKM !',
      text: 'Ici tu peux acheter et vendre des actions Cookie. Le prix change selon ce que font les autres joueurs.',
    },
    {
      icon: '📈',
      title: 'Comment ça marche ?',
      text: 'Achète quand tu penses que le prix va monter. Vends quand tu penses qu\'il va descendre. Plus le marché bouge, plus c\'est rentable !',
    },
    {
      icon: '💎',
      title: 'Stock limité',
      text: 'Il n\'y a que 10 000 actions au total. Plus les gens achètent, plus c\'est rare et plus le prix monte. Bon trade !',
    },
  ];
  const cur = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(45, 22, 8, 0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 20,
    }}>
      <div style={{
        background: 'linear-gradient(140deg, #4A2C17, #7D4E1F)',
        borderRadius: 20, padding: 24, maxWidth: 340, width: '100%',
        color: 'white', textAlign: 'center',
        border: '2px solid rgba(212,160,23,0.4)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{cur.icon}</div>
        <div style={{ fontSize: 11, color: '#D4A017', letterSpacing: 3, textTransform: 'uppercase' }}>
          Étape {step + 1} / {steps.length}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#D4A017', marginTop: 6 }}>
          {cur.title}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 12, lineHeight: 1.5 }}>
          {cur.text}
        </div>
        <button
          onClick={() => isLast ? onClose() : setStep(step + 1)}
          style={{
            marginTop: 20, padding: '12px 24px',
            background: 'linear-gradient(135deg, #D4A017, #C17F3C)',
            color: 'white', border: 'none', borderRadius: 14,
            fontWeight: 800, fontSize: 14, cursor: 'pointer',
            width: '100%',
          }}
        >
          {isLast ? "C'est parti ! 🚀" : 'Suivant →'}
        </button>
        {!isLast && (
          <button
            onClick={onClose}
            style={{
              marginTop: 8, background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.5)', fontSize: 11,
              textDecoration: 'underline', cursor: 'pointer',
            }}
          >
            Passer
          </button>
        )}
      </div>
    </div>
  );
}
```

## Vérifications phase 7
- ☑ Page Marché s'ouvre sans erreur
- ☑ Toutes les sections s'affichent correctement (état + courbe + mes actions + acheter/vendre)
- ☑ **Mini-tutoriel 3 étapes** apparaît au PREMIER accès au marché (puis ne réapparaît plus)
- ☑ Bouton (?) à côté de "Stock disponible" ouvre une bulle d'aide
- ☑ Refresh auto toutes les 15s (visible en testant : achat depuis un autre compte/onglet → la courbe et le prix se mettent à jour automatiquement)
- ☑ La maintenance se déclenche toutes les 5 min (snapshot historique + inflation)
- ☑ Pas de spam Supabase (vérifier le dashboard, pas plus de 2-3 requêtes par minute)

---

# ══════════════════════════════════════════════
# PHASE 8 — Migration de l'ancien marché local
# ══════════════════════════════════════════════

⚠️ **IMPORTANT** : il y avait un système de marché local avec courbe simulée (et possiblement des news café qui faisaient varier le prix).

## À supprimer
- L'ancien state local `marketPrice`, `marketHistory`, etc. dans `App.jsx`
- L'ancien composant `MarketTab` (le remplacer par le nouveau)
- Les fonctions de simulation aléatoire de prix
- Les news café qui modifiaient le prix (les garder en lecture si elles existent, mais elles n'affectent plus le marché)

## À conserver
- Le système de cookies de l'utilisateur (la monnaie locale)
- La logique d'achat utilisait `addCoins` / `spendCoins` — adapter pour qu'au lieu de modifier le prix local, on appelle `buyShares` / `sellShares` qui gèrent tout côté Supabase

⚠️ **Sauvegarde importante** : après migration, vérifier que les utilisateurs existants peuvent ouvrir le marché sans crash. Si leur ancien `localStorage` contenait `marketPrice`, ce champ peut rester (il est juste ignoré).

## Vérifications phase 8
- ☑ Plus de simulation locale du marché
- ☑ Tous les calculs se font côté Supabase
- ☑ Fermer l'app et la rouvrir → le prix est toujours le même (synchro online)
- ☑ Ouvrir l'app sur 2 navigateurs différents → même prix affiché des 2 côtés
- ☑ Acheter sur l'un → le prix se met à jour sur l'autre dans les 15s

---

# ══════════════════════════════════════════════
# RAPPELS GLOBAUX
# ══════════════════════════════════════════════

- 🚫 **Pas de rouge ni de vert** : le caramel (#D4A017) pour les positifs, le moka (#7D4E1F) pour les négatifs
- 📱 Mobile-first : tout doit être beau sur 390px de large
- 💾 Persistance : pas besoin de localStorage pour le marché (tout est sur Supabase)
- ⚠️ Mode dégradé : si Supabase est down, afficher un message clair et désactiver les boutons (pas de crash)
- 📊 Refresh : toutes les 15s suffisent — ne pas mettre plus, ça surchargerait Supabase
- 🔒 Sécurité : les politiques RLS sont permissives. Si quelqu'un manipule la DB depuis la console, c'est sa faute. Pour CookiMiner ce niveau est OK.

# Brief — Stats personnelles 📊

Lis bien le CLAUDE.md avant de commencer.

## 🎯 Concept

Page **"Mes stats"** accessible depuis le profil, qui montre les **stats COMPLÈTES** de la semaine en cours. Reset chaque **dimanche minuit** (sauf pour les nouveaux joueurs inscrits ce jour-là). Pas de comparaison à la semaine précédente (simple).

## 📊 Stats complètes à afficher

- 🍪 **Cookies gagnés cette semaine**
- 🎮 **Parties jouées** (toutes catégories)
- 🏆 **Jeu favori** (le plus joué)
- 🌅 **Heure préférée pour jouer** (créneau le plus actif : matin / après-midi / soir / nuit)
- 🔥 **Streak max** (record toutes catégories confondues, perso, pas weekly)
- 📈 **Position max atteinte au classement** (record, perso, pas weekly)
- 💰 **Profit marché cette semaine** (si tu as joué au marché)
- 📊 **% réussite quiz** cette semaine
- ⏱️ **Temps total joué** estimé (en minutes)

---

# PHASE 1 — SQL pour tracker

⚠️ **À faire par l'utilisateur**.

```sql
-- Table de stats hebdomadaires (1 ligne par utilisateur par semaine)
create table public.weekly_stats (
  id uuid default gen_random_uuid() primary key,
  user_code text not null,
  week_start date not null,  -- lundi de la semaine (ISO)
  cookies_earned int not null default 0,
  games_played int not null default 0,
  games_by_type jsonb not null default '{}',  -- {"quiz": 12, "wheel": 5, ...}
  hours_played jsonb not null default '{}',   -- {"morning": 2, "afternoon": 5, "evening": 8, "night": 1}
  market_profit numeric not null default 0,
  quiz_correct int not null default 0,
  quiz_total int not null default 0,
  total_minutes_played int not null default 0,
  last_updated timestamptz not null default now(),
  unique(user_code, week_start)
);

-- Table de records permanents (jamais reset)
create table public.user_records (
  user_code text primary key,
  best_streak int not null default 0,
  best_rank int,  -- meilleure position au classement (1 = top, null si jamais classé)
  total_lifetime_cookies int not null default 0,
  updated_at timestamptz not null default now()
);

create index idx_weekly_stats_user on public.weekly_stats(user_code);
create index idx_weekly_stats_week on public.weekly_stats(week_start);

alter table public.weekly_stats enable row level security;
alter table public.user_records enable row level security;

create policy "Anyone can read weekly stats"
  on public.weekly_stats for select using (true);
create policy "Anyone can insert weekly stats"
  on public.weekly_stats for insert with check (true);
create policy "Anyone can update weekly stats"
  on public.weekly_stats for update using (true) with check (true);
create policy "Anyone can read records"
  on public.user_records for select using (true);
create policy "Anyone can insert records"
  on public.user_records for insert with check (true);
create policy "Anyone can update records"
  on public.user_records for update using (true) with check (true);
```

---

# PHASE 2 — Module stats

Créer `src/lib/stats.js` :

```js
import { supabase, isSupabaseEnabled } from './supabase';

// Helpers de date

/**
 * Renvoie la date du lundi de la semaine courante (ISO, format YYYY-MM-DD).
 */
export function getCurrentWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=dim, 1=lun, ...
  const diff = day === 0 ? 6 : day - 1; // jours depuis lundi
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

/**
 * Renvoie le créneau horaire actuel.
 */
function getCurrentTimeSlot() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 24) return 'evening';
  return 'night';
}

/**
 * Récupère ou crée la ligne stats de la semaine courante.
 */
async function getCurrentWeekStats(userCode) {
  if (!isSupabaseEnabled() || !userCode) return null;

  const weekStart = getCurrentWeekStart();
  const { data } = await supabase
    .from('weekly_stats')
    .select('*')
    .eq('user_code', userCode)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (data) return data;

  // Créer la ligne si elle n'existe pas
  const { data: created } = await supabase
    .from('weekly_stats')
    .insert({ user_code: userCode, week_start: weekStart })
    .select()
    .single();

  return created;
}

/**
 * Trackers individuels (à appeler depuis la logique des jeux).
 */

export async function trackCookiesEarned(userCode, amount) {
  if (!isSupabaseEnabled() || !userCode || amount <= 0) return;

  const stats = await getCurrentWeekStats(userCode);
  if (!stats) return;

  await supabase
    .from('weekly_stats')
    .update({
      cookies_earned: stats.cookies_earned + amount,
      last_updated: new Date().toISOString(),
    })
    .eq('id', stats.id);
}

export async function trackGamePlayed(userCode, gameType) {
  if (!isSupabaseEnabled() || !userCode) return;

  const stats = await getCurrentWeekStats(userCode);
  if (!stats) return;

  const gamesByType = { ...(stats.games_by_type || {}) };
  gamesByType[gameType] = (gamesByType[gameType] || 0) + 1;

  const hoursPlayed = { ...(stats.hours_played || {}) };
  const slot = getCurrentTimeSlot();
  hoursPlayed[slot] = (hoursPlayed[slot] || 0) + 1;

  await supabase
    .from('weekly_stats')
    .update({
      games_played: stats.games_played + 1,
      games_by_type: gamesByType,
      hours_played: hoursPlayed,
      last_updated: new Date().toISOString(),
    })
    .eq('id', stats.id);
}

export async function trackQuizResult(userCode, correctCount, totalCount) {
  if (!isSupabaseEnabled() || !userCode) return;

  const stats = await getCurrentWeekStats(userCode);
  if (!stats) return;

  await supabase
    .from('weekly_stats')
    .update({
      quiz_correct: stats.quiz_correct + correctCount,
      quiz_total: stats.quiz_total + totalCount,
      last_updated: new Date().toISOString(),
    })
    .eq('id', stats.id);
}

export async function trackMarketProfit(userCode, profit) {
  if (!isSupabaseEnabled() || !userCode) return;

  const stats = await getCurrentWeekStats(userCode);
  if (!stats) return;

  await supabase
    .from('weekly_stats')
    .update({
      market_profit: parseFloat(stats.market_profit) + profit,
      last_updated: new Date().toISOString(),
    })
    .eq('id', stats.id);
}

export async function trackPlayTime(userCode, minutes) {
  if (!isSupabaseEnabled() || !userCode) return;

  const stats = await getCurrentWeekStats(userCode);
  if (!stats) return;

  await supabase
    .from('weekly_stats')
    .update({
      total_minutes_played: stats.total_minutes_played + minutes,
      last_updated: new Date().toISOString(),
    })
    .eq('id', stats.id);
}

/**
 * Records permanents (jamais reset).
 */
export async function updateRecord(userCode, field, value) {
  if (!isSupabaseEnabled() || !userCode) return;

  const { data: existing } = await supabase
    .from('user_records')
    .select('*')
    .eq('user_code', userCode)
    .maybeSingle();

  const updates = { user_code: userCode, updated_at: new Date().toISOString() };

  if (field === 'streak' && (!existing || value > existing.best_streak)) {
    updates.best_streak = value;
  }
  if (field === 'rank' && (!existing || !existing.best_rank || value < existing.best_rank)) {
    updates.best_rank = value;
  }

  if (Object.keys(updates).length > 2) {
    await supabase
      .from('user_records')
      .upsert(updates, { onConflict: 'user_code' });
  }
}

/**
 * Récupère les stats actuelles pour la page "Mes stats".
 */
export async function getMyStats(userCode) {
  if (!isSupabaseEnabled() || !userCode) return null;

  const stats = await getCurrentWeekStats(userCode);
  const { data: records } = await supabase
    .from('user_records')
    .select('*')
    .eq('user_code', userCode)
    .maybeSingle();

  if (!stats) return null;

  // Calculer le jeu favori
  const games = stats.games_by_type || {};
  const favoriteGame = Object.keys(games).reduce((a, b) =>
    games[a] > games[b] ? a : b, null);

  // Calculer le créneau préféré
  const hours = stats.hours_played || {};
  const favoriteSlot = Object.keys(hours).reduce((a, b) =>
    hours[a] > hours[b] ? a : b, null);

  return {
    weekStart: stats.week_start,
    cookiesEarned: stats.cookies_earned,
    gamesPlayed: stats.games_played,
    favoriteGame,
    favoriteSlot,
    marketProfit: parseFloat(stats.market_profit),
    quizSuccessRate: stats.quiz_total > 0
      ? Math.round((stats.quiz_correct / stats.quiz_total) * 100)
      : 0,
    totalMinutes: stats.total_minutes_played,
    bestStreak: records?.best_streak ?? 0,
    bestRank: records?.best_rank ?? null,
  };
}
```

---

# PHASE 3 — Intégrer les trackers

Dans la logique des jeux et actions :

```js
// Après gain de cookies (n'importe où)
trackCookiesEarned(userCode, amount);

// Après une partie de quiz
trackGamePlayed(userCode, 'quiz');
trackQuizResult(userCode, correctCount, 3); // 3 questions au quiz

// Après une partie de roue
trackGamePlayed(userCode, 'wheel');

// Idem pour défi clic, stop café, memory, devine, réflexes
trackGamePlayed(userCode, 'click_challenge');
trackGamePlayed(userCode, 'stop_coffee');
trackGamePlayed(userCode, 'memory');
trackGamePlayed(userCode, 'guess_order');
trackGamePlayed(userCode, 'reflex');

// Après vente d'actions $CKM (avec profit)
trackMarketProfit(userCode, profit);

// Après que le streak augmente
updateRecord(userCode, 'streak', newStreakValue);

// Après chaque chargement du classement, si nouvelle position max
updateRecord(userCode, 'rank', currentRank);
```

⚠️ **Tracking du temps de jeu** : ajouter un `useEffect` au montage de l'app qui démarre un timer, et tracker toutes les 5 minutes :

```js
useEffect(() => {
  if (!userCode) return;
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      trackPlayTime(userCode, 5);
    }
  }, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, [userCode]);
```

---

# PHASE 4 — UI : Page "Mes stats"

Bouton "📊 Mes stats" dans le profil → ouvre une modal slide depuis le bas (style profil visible).

```jsx
function MyStatsModal({ userCode, onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyStats(userCode).then(s => {
      setStats(s);
      setLoading(false);
    });
  }, [userCode]);

  // Animation slide
  const [mounted, setMounted] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 300);
  };

  const slotLabels = {
    morning: '🌅 Matin (6h-12h)',
    afternoon: '☀️ Après-midi (12h-18h)',
    evening: '🌆 Soir (18h-0h)',
    night: '🌙 Nuit (0h-6h)',
  };

  const gameLabels = {
    quiz: 'Quiz café',
    wheel: 'Roue de la fortune',
    click_challenge: 'Défi de clics',
    stop_coffee: 'Stop le café',
    memory: 'Memory café',
    guess_order: 'Devine la commande',
    reflex: 'Réflexes café',
  };

  return (
    <div onClick={handleClose} style={{ /* overlay */ }}>
      <div onClick={e => e.stopPropagation()} style={{ /* slide panel */ }}>
        <div style={{ /* drag handle */ }} />
        <button onClick={handleClose} style={{ /* close btn */ }}>✕</button>

        <div style={{ padding: '12px 18px 24px' }}>
          <div style={{
            fontSize: 11,
            color: '#8B6A5A',
            textTransform: 'uppercase',
            letterSpacing: 2,
            textAlign: 'center',
          }}>
            📊 Mes stats de la semaine
          </div>
          <div style={{ fontSize: 11, color: '#A0784E', textAlign: 'center', marginTop: 2, fontStyle: 'italic' }}>
            Reset chaque dimanche à minuit
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}>Chargement...</div>
          ) : !stats ? (
            <div style={{ padding: 60, textAlign: 'center' }}>Aucune stat encore</div>
          ) : (
            <>
              {/* Stats principales en grille 2x2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                <StatBlock icon="🍪" value={stats.cookiesEarned.toLocaleString()} label="Cookies cette semaine" />
                <StatBlock icon="🎮" value={stats.gamesPlayed} label="Parties jouées" />
                <StatBlock icon="📊" value={`${stats.quizSuccessRate}%`} label="Réussite quiz" />
                <StatBlock icon="⏱️" value={`${stats.totalMinutes} min`} label="Temps de jeu" />
              </div>

              {/* Préférences */}
              <SectionCard title="🎯 Tes préférences cette semaine">
                {stats.favoriteGame && (
                  <Row label="🏆 Jeu favori" value={gameLabels[stats.favoriteGame] ?? stats.favoriteGame} />
                )}
                {stats.favoriteSlot && (
                  <Row label="⏰ Créneau préféré" value={slotLabels[stats.favoriteSlot] ?? stats.favoriteSlot} />
                )}
              </SectionCard>

              {/* Marché */}
              {stats.marketProfit !== 0 && (
                <SectionCard title="📈 Marché cette semaine">
                  <Row
                    label="💰 Profit"
                    value={`${stats.marketProfit > 0 ? '+' : ''}${Math.floor(stats.marketProfit)} 🍪`}
                    valueColor={stats.marketProfit >= 0 ? '#D4A017' : '#7D4E1F'}
                  />
                </SectionCard>
              )}

              {/* Records permanents (jamais reset) */}
              <SectionCard title="🏅 Records personnels (tous temps)">
                <Row label="🔥 Streak max" value={stats.bestStreak} />
                <Row label="👑 Meilleure position classement" value={stats.bestRank ? `#${stats.bestRank}` : 'Non classé'} />
              </SectionCard>
            </>
          )}
        </div>
      </div>
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
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: '#2C1810', marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#8B6A5A', marginTop: 2, fontWeight: 700 }}>{label}</div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 14,
      padding: 14,
      marginTop: 12,
      border: '1.5px solid #E8DDD0',
    }}>
      <div style={{ fontSize: 11, color: '#8B6A5A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, valueColor = '#2C1810' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
      <span style={{ fontSize: 13, color: '#5C3317' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: valueColor }}>{value}</span>
    </div>
  );
}
```

---

# PHASE 5 — Reset auto le dimanche minuit

⚠️ **Pas de reset à faire** — la table `weekly_stats` a une ligne par semaine grâce au `unique(user_code, week_start)`. Quand on passe au lundi suivant, `getCurrentWeekStart()` renvoie le nouveau lundi → une nouvelle ligne est créée automatiquement.

Les nouveaux joueurs inscrits dans la semaine ont automatiquement leur ligne créée à leur première action, donc ils ont leurs stats de la semaine en cours partielle. C'est OK — ils verront simplement moins de chiffres jusqu'au lundi suivant.

---

# PHASE 6 — Tests

1. Compte A joue plusieurs jeux → stats remontent ✅
2. A consulte la page Mes stats → tout est visible ✅
3. Le créneau "Soir" est calculé correctement si on joue à 20h
4. Au passage du dimanche minuit → nouvelle ligne créée le lundi
5. Records permanents (streak max, position max) ne reset pas

## Vérifications globales
- ☑ Tracker à chaque jeu/gain/quiz
- ☑ Page "Mes stats" claire et complète
- ☑ Reset auto le dimanche (pas de tâche manuelle)
- ☑ Records permanents séparés des stats hebdo
- ☑ Pas de rouge ni de vert

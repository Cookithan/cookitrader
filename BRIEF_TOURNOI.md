# Brief — Tournoi du week-end 🏆

Lis bien le CLAUDE.md avant de commencer.

## 🎯 Concept

Chaque samedi matin (00h) à dimanche soir (23h59), un **tournoi spécial** se lance automatiquement. Les joueurs accumulent des cookies, **classement uniquement basé sur les cookies gagnés pendant le tournoi**. Le tournoi est visible dans **l'onglet Classement** comme un 3ème onglet à côté de Cookies et Marché.

## ⚙️ Règles

- 📅 **Samedi 0h → Dimanche 23h59** (week-end strict)
- 🎯 **Critère** : cookies gagnés pendant le tournoi (uniquement)
- 🥇 **Top 3** : 1000 🍪 + 5 ☕ / 500 🍪 + 2 ☕ / 200 🍪 + 1 ☕
- 🏅 **Top 4-10** : 100 🍪 + 1 ☕ chacun
- 🥺 **Hors top 10** : rien
- 🎁 **Récompenses versées** dimanche minuit (ou au prochain lancement de l'app le lundi)

## ⚠️ Pré-requis
- BRIEF_STATS_PERSO appliqué (on track déjà les cookies gagnés)
- BRIEF_INBOX appliqué (pour livrer les récompenses)

---

# PHASE 1 — SQL

⚠️ **À faire par l'utilisateur**.

```sql
-- Table tournois (1 entrée par tournoi week-end)
create table public.tournaments (
  id uuid default gen_random_uuid() primary key,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'closed', 'rewards_sent')),
  created_at timestamptz not null default now()
);

-- Table participations (1 entrée par joueur par tournoi)
create table public.tournament_entries (
  id uuid default gen_random_uuid() primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  user_code text not null,
  cookies_earned int not null default 0,
  final_rank int,  -- rempli en fin de tournoi
  rewards_paid boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(tournament_id, user_code)
);

create index idx_tournament_entries_tournament on public.tournament_entries(tournament_id);
create index idx_tournament_entries_cookies on public.tournament_entries(cookies_earned desc);
create index idx_tournaments_status on public.tournaments(status);

alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;

create policy "Anyone can read tournaments" on public.tournaments for select using (true);
create policy "Anyone can insert tournaments" on public.tournaments for insert with check (true);
create policy "Anyone can update tournaments" on public.tournaments for update using (true) with check (true);
create policy "Anyone can read entries" on public.tournament_entries for select using (true);
create policy "Anyone can insert entries" on public.tournament_entries for insert with check (true);
create policy "Anyone can update entries" on public.tournament_entries for update using (true) with check (true);
```

---

# PHASE 2 — Module tournoi

Créer `src/lib/tournament.js` :

```js
import { supabase, isSupabaseEnabled } from './supabase';

const TOURNAMENT_REWARDS = {
  1: { cookies: 1000, cf: 5 },
  2: { cookies: 500, cf: 2 },
  3: { cookies: 200, cf: 1 },
  // 4-10 : 100 + 1
};
const TOP_PARTICIPATION = { cookies: 100, cf: 1 };

/**
 * Calcule la fenêtre du tournoi du week-end courant ou suivant.
 */
export function getCurrentWeekendWindow() {
  const now = new Date();
  const day = now.getDay(); // 0=dim, 6=sam

  // Trouver le samedi 0h
  let saturday = new Date(now);
  if (day === 6) {
    // On est samedi
    saturday.setHours(0, 0, 0, 0);
  } else if (day === 0) {
    // On est dimanche → samedi était hier
    saturday.setDate(now.getDate() - 1);
    saturday.setHours(0, 0, 0, 0);
  } else {
    // Lundi-vendredi → prochain samedi
    const diff = 6 - day;
    saturday.setDate(now.getDate() + diff);
    saturday.setHours(0, 0, 0, 0);
  }

  const sundayEnd = new Date(saturday);
  sundayEnd.setDate(saturday.getDate() + 2);
  sundayEnd.setHours(0, 0, 0, 0);
  sundayEnd.setMilliseconds(sundayEnd.getMilliseconds() - 1);

  return {
    start: saturday,
    end: sundayEnd,
    isActive: now >= saturday && now <= sundayEnd,
  };
}

/**
 * Récupère ou crée le tournoi actif.
 */
export async function getOrCreateActiveTournament() {
  if (!isSupabaseEnabled()) return null;

  const window = getCurrentWeekendWindow();
  if (!window.isActive) return null;

  // Chercher un tournoi actif qui correspond
  const { data: existing } = await supabase
    .from('tournaments')
    .select('*')
    .eq('start_at', window.start.toISOString())
    .maybeSingle();

  if (existing) return existing;

  // Créer le tournoi
  const { data: created } = await supabase
    .from('tournaments')
    .insert({
      start_at: window.start.toISOString(),
      end_at: window.end.toISOString(),
      status: 'active',
    })
    .select()
    .single();

  return created;
}

/**
 * Tracker le gain de cookies pendant le tournoi.
 * À appeler depuis la logique de gain de cookies, comme trackCookiesEarned.
 */
export async function trackTournamentCookies(userCode, amount) {
  if (!isSupabaseEnabled() || !userCode || amount <= 0) return;

  const tournament = await getOrCreateActiveTournament();
  if (!tournament) return;

  // Récupérer ou créer l'entrée
  const { data: entry } = await supabase
    .from('tournament_entries')
    .select('*')
    .eq('tournament_id', tournament.id)
    .eq('user_code', userCode)
    .maybeSingle();

  if (entry) {
    await supabase
      .from('tournament_entries')
      .update({
        cookies_earned: entry.cookies_earned + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entry.id);
  } else {
    await supabase
      .from('tournament_entries')
      .insert({
        tournament_id: tournament.id,
        user_code: userCode,
        cookies_earned: amount,
      });
  }
}

/**
 * Récupère le classement du tournoi actif (top 50).
 */
export async function getTournamentLeaderboard(limit = 50) {
  if (!isSupabaseEnabled()) return [];

  const tournament = await getOrCreateActiveTournament();
  if (!tournament) return [];

  const { data: entries } = await supabase
    .from('tournament_entries')
    .select('user_code, cookies_earned')
    .eq('tournament_id', tournament.id)
    .order('cookies_earned', { ascending: false })
    .limit(limit);

  if (!entries || entries.length === 0) return [];

  // Enrichir avec les profils
  const codes = entries.map(e => e.user_code);
  const { data: users } = await supabase
    .from('users')
    .select('user_code, user_name, user_avatar, level')
    .in('user_code', codes);

  const userMap = {};
  (users || []).forEach(u => { userMap[u.user_code] = u; });

  return entries.map(e => ({
    ...e,
    ...userMap[e.user_code],
  }));
}

/**
 * Récupère ma position dans le tournoi actif.
 */
export async function getMyTournamentRank(userCode) {
  if (!isSupabaseEnabled() || !userCode) return null;

  const tournament = await getOrCreateActiveTournament();
  if (!tournament) return null;

  const { data: myEntry } = await supabase
    .from('tournament_entries')
    .select('cookies_earned')
    .eq('tournament_id', tournament.id)
    .eq('user_code', userCode)
    .maybeSingle();

  if (!myEntry) return { rank: null, cookies: 0 };

  const { count } = await supabase
    .from('tournament_entries')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournament.id)
    .gt('cookies_earned', myEntry.cookies_earned);

  return {
    rank: (count ?? 0) + 1,
    cookies: myEntry.cookies_earned,
  };
}

/**
 * Vérifie si l'utilisateur a des récompenses non perçues à recevoir
 * (un tournoi terminé où il était dans le top 10 et n'a pas encore été crédité).
 */
export async function checkPendingTournamentRewards(userCode) {
  if (!isSupabaseEnabled() || !userCode) return [];

  // Trouver les tournois terminés où l'utilisateur était classé et pas encore payé
  const { data: pending } = await supabase
    .from('tournament_entries')
    .select('id, tournament_id, cookies_earned, final_rank, tournaments!inner(end_at, status)')
    .eq('user_code', userCode)
    .eq('rewards_paid', false)
    .not('final_rank', 'is', null)
    .lte('final_rank', 10);

  return pending || [];
}

/**
 * Calcule la récompense pour un rang donné.
 */
export function getRewardForRank(rank) {
  if (!rank || rank > 10) return null;
  if (rank <= 3) return TOURNAMENT_REWARDS[rank];
  return TOP_PARTICIPATION;
}

/**
 * Clôture un tournoi terminé et calcule les classements finaux.
 * À appeler au prochain lancement de l'app si un tournoi expiré n'a pas été clos.
 */
export async function closeExpiredTournaments() {
  if (!isSupabaseEnabled()) return;

  const now = new Date().toISOString();

  // Trouver les tournois 'active' dont end_at est dépassé
  const { data: expired } = await supabase
    .from('tournaments')
    .select('id, end_at')
    .eq('status', 'active')
    .lt('end_at', now);

  if (!expired || expired.length === 0) return;

  for (const t of expired) {
    // Calculer les rangs finaux pour les top 10
    const { data: entries } = await supabase
      .from('tournament_entries')
      .select('id, user_code, cookies_earned')
      .eq('tournament_id', t.id)
      .order('cookies_earned', { ascending: false })
      .limit(10);

    if (entries && entries.length > 0) {
      // Mettre à jour le rang final pour chaque
      for (let i = 0; i < entries.length; i++) {
        await supabase
          .from('tournament_entries')
          .update({ final_rank: i + 1 })
          .eq('id', entries[i].id);
      }
    }

    // Marquer le tournoi comme clos
    await supabase
      .from('tournaments')
      .update({ status: 'closed' })
      .eq('id', t.id);
  }
}
```

---

# PHASE 3 — Hook tracker dans la logique de gain

Modifier la fonction qui gère `addCoins` pour aussi tracker dans le tournoi :

```js
const addCoins = (amount) => {
  setCoins(c => c + amount);
  setTotalEarned(t => t + amount);
  
  // Tracker stats hebdo
  trackCookiesEarned(userCode, amount);
  
  // Tracker tournoi (si actif)
  trackTournamentCookies(userCode, amount);
};
```

---

# PHASE 4 — Onglet Tournoi dans le Classement

Ajouter un 3ème onglet à la page Classement :

```jsx
function LeaderboardTab({ userCode }) {
  const [tab, setTab] = useState('cookies');

  return (
    <div style={{ padding: 16, paddingBottom: 100 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: 'white', borderRadius: 14, padding: 4 }}>
        <TabButton active={tab === 'cookies'} onClick={() => setTab('cookies')}>🍪 Cookies</TabButton>
        <TabButton active={tab === 'market'} onClick={() => setTab('market')}>📈 Marché</TabButton>
        <TabButton active={tab === 'tournament'} onClick={() => setTab('tournament')}>🏆 Tournoi</TabButton>
      </div>

      {tab === 'cookies' && <CookiesLeaderboard userCode={userCode} />}
      {tab === 'market' && <MarketLeaderboard userCode={userCode} />}
      {tab === 'tournament' && <TournamentLeaderboard userCode={userCode} />}
    </div>
  );
}

function TournamentLeaderboard({ userCode }) {
  const [entries, setEntries] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [tournamentActive, setTournamentActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const window = getCurrentWeekendWindow();
    setTournamentActive(window.isActive);

    if (window.isActive) {
      Promise.all([
        getTournamentLeaderboard(50),
        getMyTournamentRank(userCode),
      ]).then(([list, rank]) => {
        setEntries(list);
        setMyRank(rank);
      });
    }

    // Timer de fin
    const updateTime = () => {
      const w = getCurrentWeekendWindow();
      if (w.isActive) {
        const diff = w.end - new Date();
        const hours = Math.floor(diff / (3600 * 1000));
        const minutes = Math.floor((diff % (3600 * 1000)) / 60000);
        setTimeLeft(`${hours}h ${minutes}min`);
      } else {
        // Calculer le temps avant le prochain samedi 0h
        const next = new Date();
        const daysUntilSat = (6 - next.getDay() + 7) % 7 || 7;
        next.setDate(next.getDate() + daysUntilSat);
        next.setHours(0, 0, 0, 0);
        const diff = next - new Date();
        const days = Math.floor(diff / (24 * 3600 * 1000));
        const hours = Math.floor((diff % (24 * 3600 * 1000)) / 3600000);
        setTimeLeft(`${days}j ${hours}h`);
      }
    };
    updateTime();
    const t = setInterval(updateTime, 60000);
    return () => clearInterval(t);
  }, [userCode]);

  if (!tournamentActive) {
    return (
      <div style={{
        background: 'linear-gradient(140deg, #4A2C17, #7D4E1F)',
        borderRadius: 16,
        padding: 24,
        color: 'white',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#D4A017' }}>
          Pas de tournoi en cours
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 8, lineHeight: 1.4 }}>
          Le prochain tournoi commence samedi 0h.
          <br/>Sois prêt à enchaîner les jeux !
        </div>
        <div style={{
          background: 'rgba(212,160,23,0.15)',
          borderRadius: 12,
          padding: '8px 14px',
          marginTop: 14,
          fontSize: 12,
          fontWeight: 700,
          color: '#D4A017',
        }}>
          ⏰ Prochain tournoi dans {timeLeft}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Bandeau actif */}
      <div style={{
        background: 'linear-gradient(135deg, #D4A017, #C17F3C)',
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
        color: 'white',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.9 }}>
          🏆 Tournoi en cours
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>
          ⏰ Reste {timeLeft}
        </div>
      </div>

      {/* Ma position */}
      {myRank && myRank.rank && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(212,160,23,0.15), rgba(193,127,60,0.15))',
          border: '2px solid #D4A017',
          borderRadius: 14,
          padding: 12,
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#8B6A5A', textTransform: 'uppercase' }}>Ma position</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#D4A017' }}>#{myRank.rank}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#2C1810' }}>
              {myRank.cookies.toLocaleString()} 🍪
            </div>
            <div style={{ fontSize: 11, color: '#8B6A5A' }}>gagnés</div>
          </div>
        </div>
      )}

      {/* Récompenses info */}
      <div style={{
        background: 'white',
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
        border: '1.5px solid #E8DDD0',
      }}>
        <div style={{ fontSize: 11, color: '#8B6A5A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
          🎁 Récompenses du tournoi
        </div>
        <RewardRow icon="🥇" label="1er" value="1000 🍪 + 5 ☕" />
        <RewardRow icon="🥈" label="2e" value="500 🍪 + 2 ☕" />
        <RewardRow icon="🥉" label="3e" value="200 🍪 + 1 ☕" />
        <RewardRow icon="🏅" label="Top 4-10" value="100 🍪 + 1 ☕" />
      </div>

      {/* Top 50 */}
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: '#8B6A5A' }}>
          Aucun participant pour le moment. Sois le premier !
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#8B6A5A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
            Top 50 du tournoi
          </div>
          {entries.map((e, i) => (
            <TournamentRow key={e.user_code} rank={i + 1} entry={e} isMe={e.user_code === userCode} />
          ))}
        </>
      )}
    </>
  );
}

function RewardRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: '#5C3317' }}>{icon} {label}</span>
      <span style={{ color: '#D4A017', fontWeight: 800 }}>{value}</span>
    </div>
  );
}

function TournamentRow({ rank, entry, isMe }) {
  // Top 3 avec couleurs spéciales (or/bronze/cuivre comme classement marché)
  let rankStyle = {};
  if (rank === 1) rankStyle = { background: 'linear-gradient(135deg, #F0C050, #D4A017)', color: 'white' };
  else if (rank === 2) rankStyle = { background: 'linear-gradient(135deg, #C8A878, #A0784E)', color: 'white' };
  else if (rank === 3) rankStyle = { background: 'linear-gradient(135deg, #B07840, #7D4E1F)', color: 'white' };

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
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: rankStyle.background ?? '#F5EFE6',
        color: rankStyle.color ?? '#8B6A5A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: rank <= 3 ? 18 : 13,
      }}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
      </div>
      <Avatar id={entry.user_avatar} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#2C1810' }}>
          {entry.user_name}{isMe && <span style={{ color: '#D4A017', marginLeft: 4 }}>✦</span>}
        </div>
        <div style={{ fontSize: 11, color: '#8B6A5A' }}>Niveau {entry.level}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#D4A017' }}>
          {entry.cookies_earned.toLocaleString()}
        </div>
        <div style={{ fontSize: 10, color: '#8B6A5A' }}>🍪 gagnés</div>
      </div>
    </div>
  );
}
```

---

# PHASE 5 — Distribution des récompenses au lancement

Au démarrage de l'app, vérifier s'il y a des récompenses en attente :

```js
useEffect(() => {
  if (!userCode) return;

  (async () => {
    // 1. Clôturer les tournois expirés
    await closeExpiredTournaments();

    // 2. Vérifier les récompenses en attente
    const pending = await checkPendingTournamentRewards(userCode);
    if (pending.length > 0) {
      for (const entry of pending) {
        const reward = getRewardForRank(entry.final_rank);
        if (!reward) continue;

        // Créditer
        addCoins(reward.cookies);
        addCafe(reward.cf);

        // Marquer comme payé
        await supabase
          .from('tournament_entries')
          .update({ rewards_paid: true })
          .eq('id', entry.id);

        // Envoyer dans l'inbox
        await supabase.from('inbox_messages').insert({
          user_code: userCode,
          type: 'tournament_reward',
          title: `🏆 Tournoi terminé !`,
          body: `Tu as fini #${entry.final_rank}. Récompense : ${reward.cookies} 🍪 + ${reward.cf} ☕`,
        });
      }
    }
  })();
}, [userCode]);
```

---

# PHASE 6 — Tests

1. Samedi 0h ou plus tard → onglet "🏆 Tournoi" actif avec timer
2. Avant le tournoi → message "Pas de tournoi" avec compte à rebours vers prochain samedi
3. Compte A gagne 100 🍪 pendant tournoi → entry monte de 100 ✅
4. Compte B fait plus de cookies que A → A descend dans le classement
5. Lundi matin → tournoi clos, top 10 reçoit ses cookies + ☕ via inbox

## Vérifications globales
- ☑ Tournoi auto-créé au début du week-end
- ☑ Tracking cookies pendant le tournoi
- ☑ Top 3 récompensés généreusement
- ☑ Top 4-10 reçoivent une consolation
- ☑ Timer affiché (en cours ou avant tournoi)
- ☑ Pas de rouge ni de vert

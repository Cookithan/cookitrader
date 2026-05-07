# Brief — Code de parrainage 🎁

Lis bien le CLAUDE.md avant de commencer. **Procède UNE phase à la fois.**

## 🎯 Concept

Quand un nouveau joueur s'inscrit avec le code parrainage d'un utilisateur existant, les **deux gagnent un bonus** quand le filleul atteint le **niveau 3**.

## ⚠️ Pré-requis
- Supabase fonctionnel
- Système d'amis avec demandes (BRIEF_DEMANDES_AMIS)

---

## ⚙️ Règles

- 🎯 **Code parrainage** = le `user_code` lui-même (pas de code séparé)
- 🏆 **Récompense parrain** : +500 🍪 + 1 ☕
- 🎁 **Récompense filleul** : +200 🍪 + 1 ☕ (à l'inscription, peu importe son niveau)
- ⏳ **Délai** : le bonus parrain est versé quand le filleul atteint **niveau 3**
- 🚫 **Limite** : max **3 parrainages** par compte
- 🔒 Un utilisateur ne peut pas se parrainer lui-même
- 🔒 Un filleul ne peut avoir qu'un seul parrain

---

# PHASE 1 — SQL Supabase

⚠️ **À faire par l'utilisateur** dans le SQL Editor.

```sql
-- Table des parrainages
create table public.referrals (
  id uuid default gen_random_uuid() primary key,
  parrain_code text not null,
  filleul_code text not null unique,  -- 1 seul parrain par filleul
  filleul_level_at_signup int not null default 1,
  parrain_bonus_paid boolean not null default false,
  filleul_bonus_paid boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_referrals_parrain on public.referrals(parrain_code);
create index idx_referrals_filleul on public.referrals(filleul_code);

alter table public.referrals enable row level security;

create policy "Anyone can read referrals"
  on public.referrals for select using (true);
create policy "Anyone can insert referrals"
  on public.referrals for insert with check (true);
create policy "Anyone can update referrals"
  on public.referrals for update using (true) with check (true);
```

## Vérifications phase 1
- ☑ Table `referrals` créée avec contrainte UNIQUE sur `filleul_code`
- ☑ RLS active

---

# PHASE 2 — Fonctions Supabase

Ajouter dans `src/lib/supabaseSync.js` :

```js
const REFERRAL_CONFIG = {
  MAX_PARRAINAGES: 3,
  REWARD_PARRAIN: { cookies: 500, cf: 1 },
  REWARD_FILLEUL: { cookies: 200, cf: 1 },
  LEVEL_REQUIRED: 3,
};

export const REFERRAL_REWARDS = REFERRAL_CONFIG;

/**
 * Enregistre un parrainage à l'inscription du filleul.
 * Donne directement le bonus filleul, le bonus parrain attend niveau 3.
 */
export async function registerReferral(parrainCode, filleulCode, currentFilleulLevel) {
  if (!isSupabaseEnabled()) return { error: 'Hors ligne' };
  if (!parrainCode || !filleulCode) return { error: 'Codes invalides' };
  if (parrainCode === filleulCode) return { error: 'On ne se parraine pas soi-même' };

  // 1. Vérifier que le parrain existe
  const { data: parrain } = await supabase
    .from('users')
    .select('id, user_code')
    .eq('user_code', parrainCode)
    .maybeSingle();
  if (!parrain) return { error: "Code parrainage invalide" };

  // 2. Vérifier qu'on est pas déjà filleul
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('filleul_code', filleulCode)
    .maybeSingle();
  if (existing) return { error: 'Tu as déjà un parrain' };

  // 3. Vérifier la limite parrain (max 3)
  const { count } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('parrain_code', parrainCode);
  if ((count ?? 0) >= REFERRAL_CONFIG.MAX_PARRAINAGES) {
    return { error: 'Ce parrain a déjà atteint sa limite' };
  }

  // 4. Insérer le parrainage
  const { error: insertErr } = await supabase
    .from('referrals')
    .insert({
      parrain_code: parrainCode,
      filleul_code: filleulCode,
      filleul_level_at_signup: currentFilleulLevel ?? 1,
      filleul_bonus_paid: true, // on donne direct
    });

  if (insertErr) return { error: insertErr.message };

  return {
    success: true,
    rewardFilleul: REFERRAL_CONFIG.REWARD_FILLEUL,
  };
}

/**
 * À appeler quand le joueur monte de niveau.
 * Si le joueur a un parrain ET vient d'atteindre le niveau 3, on déclenche le bonus.
 * Renvoie le bonus à appliquer côté parrain via inbox.
 */
export async function checkReferralBonusOnLevelUp(filleulCode, newLevel) {
  if (!isSupabaseEnabled()) return null;
  if (newLevel < REFERRAL_CONFIG.LEVEL_REQUIRED) return null;

  // Trouver le parrainage du filleul
  const { data: ref } = await supabase
    .from('referrals')
    .select('id, parrain_code, parrain_bonus_paid')
    .eq('filleul_code', filleulCode)
    .maybeSingle();

  if (!ref || ref.parrain_bonus_paid) return null;

  // Marquer comme payé
  await supabase
    .from('referrals')
    .update({ parrain_bonus_paid: true })
    .eq('id', ref.id);

  // Déposer un message dans l'inbox du parrain (voir BRIEF_INBOX)
  await sendInboxMessage(ref.parrain_code, {
    type: 'referral_reward',
    title: '🎁 Ton filleul a atteint le niveau 3 !',
    body: `Tu reçois ${REFERRAL_CONFIG.REWARD_PARRAIN.cookies} 🍪 + ${REFERRAL_CONFIG.REWARD_PARRAIN.cf} ☕`,
    rewards: REFERRAL_CONFIG.REWARD_PARRAIN,
  });

  return { parrainCode: ref.parrain_code, reward: REFERRAL_CONFIG.REWARD_PARRAIN };
}

/**
 * Récupère les stats parrainage pour l'utilisateur.
 */
export async function getReferralStats(userCode) {
  if (!isSupabaseEnabled()) return null;
  const { data: refs } = await supabase
    .from('referrals')
    .select('filleul_code, parrain_bonus_paid, created_at')
    .eq('parrain_code', userCode);

  const total = refs?.length ?? 0;
  const completed = refs?.filter(r => r.parrain_bonus_paid).length ?? 0;
  const pending = total - completed;
  const remaining = Math.max(0, REFERRAL_CONFIG.MAX_PARRAINAGES - total);

  return { total, completed, pending, remaining };
}

// Helper interne (sera remplacé par la vraie fonction du brief inbox)
async function sendInboxMessage(userCode, message) {
  // Si la table inbox_messages existe, on insère
  try {
    await supabase.from('inbox_messages').insert({
      user_code: userCode,
      type: message.type,
      title: message.title,
      body: message.body,
      payload: message.rewards ? JSON.stringify(message.rewards) : null,
    });
  } catch (e) {
    console.warn('Inbox not ready yet:', e);
  }
}
```

⚠️ La fonction `sendInboxMessage` dépend du brief Inbox. Si tu fais celui-ci avant l'inbox, marque la fonction TODO et fais le bonus directement (ajout direct de cookies).

---

# PHASE 3 — UI : Champ "Code parrainage" à l'onboarding

Lors de la **première utilisation** (saisie du nom + avatar), ajouter une **étape optionnelle** : "As-tu un code parrainage ?".

```jsx
function OnboardingStep3Referral({ onSkip, onSubmit }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!code.match(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/)) {
      setError('Format invalide (ex: B4R-1ST)');
      return;
    }
    setLoading(true);
    const result = await onSubmit(code.toUpperCase());
    setLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <div style={{ /* card centrée style onboarding */ }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎁</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#2C1810', textAlign: 'center' }}>
        As-tu un code parrainage ?
      </div>
      <div style={{ fontSize: 13, color: '#8B6A5A', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
        Si un ami t'a invité, entre son code pour gagner <strong>200 🍪 + 1 ☕</strong> en bonus !
      </div>

      <input
        type="text"
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        placeholder="Ex: B4R-1ST"
        maxLength={7}
        style={{ /* style input café */ }}
      />

      {error && (
        <div style={{ color: '#7D4E1F', fontSize: 12, marginTop: 8 }}>{error}</div>
      )}

      <button onClick={handleSubmit} disabled={loading} style={{ /* btn doré */ }}>
        {loading ? '...' : 'Valider le code'}
      </button>

      <button onClick={onSkip} style={{ /* btn discret */ }}>
        Plus tard
      </button>
    </div>
  );
}
```

⚠️ **Étape optionnelle** : "Plus tard" doit toujours être présent. Si l'utilisateur skippe, il pourra ajouter un parrain plus tard depuis ses paramètres (dans une prochaine version).

## Application des récompenses filleul

Si `registerReferral` réussit :
```js
addCoins(200);
addCafe(1);
showToast('🎁 +200 🍪 +1 ☕ Bienvenue !');
```

---

# PHASE 4 — UI : Section "Mes filleuls" dans le profil

Dans la page Profil, ajouter une section :

```jsx
function ReferralStatsCard({ userCode }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getReferralStats(userCode).then(setStats);
  }, [userCode]);

  if (!stats) return null;

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      border: '1.5px solid #E8DDD0',
    }}>
      <div style={{ fontSize: 11, color: '#8B6A5A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
        🎁 Parrainage
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#D4A017' }}>{stats.total}</div>
          <div style={{ fontSize: 10, color: '#8B6A5A' }}>Filleuls</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#C17F3C' }}>{stats.completed}</div>
          <div style={{ fontSize: 10, color: '#8B6A5A' }}>Niveau 3+</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#8B6A5A' }}>{stats.remaining}</div>
          <div style={{ fontSize: 10, color: '#8B6A5A' }}>Restants</div>
        </div>
      </div>

      <div style={{
        marginTop: 12,
        padding: '8px 12px',
        background: 'rgba(212,160,23,0.1)',
        borderRadius: 10,
        fontSize: 11,
        color: '#8B6A5A',
        textAlign: 'center',
        lineHeight: 1.4,
      }}>
        💡 Partage ton code à tes amis. Quand ils atteignent le niveau 3, tu gagnes <strong>500 🍪 + 1 ☕</strong> !
      </div>
    </div>
  );
}
```

---

# PHASE 5 — Trigger sur level up

Dans la logique de **passage de niveau** (probablement dans `App.jsx`), appeler `checkReferralBonusOnLevelUp` :

```js
const handleLevelUp = (newLevel) => {
  // ... logique existante ...
  
  // Vérifier si on déclenche un bonus parrain
  checkReferralBonusOnLevelUp(userCode, newLevel)
    .then(result => {
      if (result) {
        console.log('Bonus parrain déclenché vers', result.parrainCode);
      }
    });
};
```

---

# PHASE 6 — Tests

1. Compte A → code `ABC-123`
2. Compte B s'inscrit avec parrainage `ABC-123` → reçoit 200 🍪 + 1 ☕ ✅
3. Compte B joue, atteint niveau 3 → A reçoit dans son inbox "🎁 Filleul niveau 3" ✅
4. Compte C tente de parrainer Compte B → erreur "Tu as déjà un parrain" ✅
5. A parraine 3 personnes → erreur "Limite atteinte" sur le 4e ✅
6. Section "🎁 Parrainage" visible dans profil A avec 3/3 filleuls

## Vérifications globales
- ☑ Le filleul reçoit son bonus immédiatement à l'inscription
- ☑ Le parrain reçoit son bonus quand le filleul atteint niveau 3
- ☑ Max 3 parrainages respecté
- ☑ Pas de rouge ni de vert

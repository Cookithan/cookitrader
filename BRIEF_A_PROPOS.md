# Brief — Page À propos / Changelog 📜

Lis bien le CLAUDE.md avant de commencer.

## 🎯 Concept

Page **"À propos"** accessible depuis les **paramètres** qui contient :
- Version de l'app (genre `v1.5.0`)
- Logo + description
- **Changelog** : liste des dernières mises à jour (manuelle, mise à jour à chaque release importante)
- Stats globales en temps réel (combien de joueurs, combien de cookies gagnés au total)
- Lien vers le code source GitHub
- Crédits

## ⚠️ Pré-requis
- Supabase fonctionnel
- Un endroit "Paramètres" existant dans l'app (sinon le créer)

---

# PHASE 1 — Constantes app

Créer `src/lib/appInfo.js` :

```js
export const APP_INFO = {
  version: '1.5.0',
  releaseDate: '2026-05-07',
  github: 'https://github.com/Cookithan/cookitrader',
  description: 'App mobile de récompenses café & cookies. Mini-jeux, marché spéculatif $CKM, classement, amis et tournois.',
  author: 'Cookithan',
};

export const CHANGELOG = [
  {
    version: '1.5.0',
    date: '2026-05-07',
    title: '🚀 Marché online + Réseau social',
    changes: [
      '📈 Marché $CKM 100% online avec offre/demande',
      '🏆 Classement marché par valeur du portfolio',
      '👥 Demandes d\'amis avec acceptation',
      '👤 Voir le profil des amis et du top 1',
      '🎁 Système de parrainage (500 🍪 + 1 ☕)',
      '🏅 Badges secrets : Noctambule, Investisseur, Amical',
      '🎁 Offrir des cadeaux aux amis',
      '📊 Stats personnelles hebdomadaires',
      '🏆 Tournoi du week-end (samedi-dimanche)',
      '📬 Inbox de notifications',
      '🐛 Fix : reset complet du profil',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-05-06',
    title: '🎵 Sons & musiques',
    changes: [
      '🔊 Sons d\'interface partout',
      '🎵 Musique d\'ambiance Jazz Café',
      '🎵 3 musiques achetables (Lofi, Bossa Nova, Café Parisien)',
      '✨ Pack premium ☕ : Lounge Doré + Symphonie Royale',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-05-05',
    title: '☁️ Backend Supabase',
    changes: [
      '🌍 Profil synchronisé en ligne',
      '🏆 Classement online avec vrais utilisateurs',
      '👥 Système d\'amis basique',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-05-04',
    title: '✨ Splash + PWA',
    changes: [
      '✨ Splash screen "CookiMiner" lettre par lettre',
      '📱 App installable sur l\'écran d\'accueil',
      '🌐 Déployée sur cookiminer.vercel.app',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-05-03',
    title: '🎮 Refonte des jeux',
    changes: [
      '☕ Devine la commande — scène café POV serveur',
      '⚡ Réflexes café — table en bois immersive',
      '🎯 Memory Café — nouveau mini-jeu',
      '🎓 Tutoriel guidé pour les nouveaux',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-05-02',
    title: '🎉 Lancement initial',
    changes: [
      '5 mini-jeux : Check-in, Quiz, Roue, Défi de clics, Stop café',
      '🛍️ Boutique de récompenses (badges, titres, thèmes, avatars)',
      '📊 Marché $CKM local',
      '👤 Profil avec progression',
    ],
  },
];
```

⚠️ **À mettre à jour à chaque release**. Garde les 5-6 dernières versions max pour ne pas surcharger.

---

# PHASE 2 — Stats globales depuis Supabase

Ajouter dans `src/lib/supabaseSync.js` :

```js
/**
 * Récupère les stats globales de toute la communauté CookiMiner.
 */
export async function getGlobalCommunityStats() {
  if (!isSupabaseEnabled()) return null;

  // Compter les utilisateurs
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  // Sommer les total_earned
  const { data: users } = await supabase
    .from('users')
    .select('total_earned');

  const totalCookiesEarned = users?.reduce(
    (sum, u) => sum + (u.total_earned || 0),
    0
  ) ?? 0;

  // Compter les amitiés actives
  const { count: friendshipsCount } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'accepted');

  // Compter les transactions marché si table existe
  let marketTransactionsCount = 0;
  try {
    const { count } = await supabase
      .from('market_transactions')
      .select('*', { count: 'exact', head: true });
    marketTransactionsCount = count ?? 0;
  } catch (e) {
    // Table peut-être pas créée
  }

  return {
    userCount: userCount ?? 0,
    totalCookiesEarned,
    friendshipsCount: Math.floor((friendshipsCount ?? 0) / 2), // car chaque amitié est en double (A→B et B→A)
    marketTransactionsCount,
  };
}
```

---

# PHASE 3 — Page À propos dans les paramètres

Si tu n'as pas encore de page "Paramètres", la créer ou l'ajouter dans le profil.

```jsx
function SettingsPage({ onOpenAbout, ... }) {
  return (
    <div style={{ padding: 16 }}>
      {/* ... autres réglages existants : audio, notifications, etc. ... */}

      {/* Section À propos */}
      <button
        onClick={onOpenAbout}
        style={{
          width: '100%',
          background: 'white',
          border: '1.5px solid #E8DDD0',
          borderRadius: 14,
          padding: 14,
          marginTop: 12,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#2C1810' }}>
            📜 À propos de CookiMiner
          </div>
          <div style={{ fontSize: 11, color: '#8B6A5A', marginTop: 2 }}>
            Version, nouveautés, crédits
          </div>
        </div>
        <div style={{ fontSize: 18, color: '#8B6A5A' }}>→</div>
      </button>
    </div>
  );
}
```

---

# PHASE 4 — Modal "À propos"

```jsx
function AboutModal({ onClose }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getGlobalCommunityStats().then(setStats);
  }, []);

  // Animation slide
  const [mounted, setMounted] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0,
        background: mounted ? 'rgba(45,22,8,0.6)' : 'rgba(45,22,8,0)',
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
          maxHeight: '90vh',
          borderRadius: '24px 24px 0 0',
          overflow: 'auto',
          transform: mounted ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          paddingBottom: 24,
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, background: '#E8DDD0', borderRadius: 2, margin: '12px auto 0' }} />

        {/* Close */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 32, height: 32,
            borderRadius: '50%',
            background: 'rgba(45,22,8,0.1)',
            border: 'none',
            color: '#5C3317',
            fontSize: 16, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>

        <div style={{ padding: '14px 18px 0' }}>

          {/* Header app */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 56 }}>🍪</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#2C1810', marginTop: 8 }}>
              CookiMiner
            </div>
            <div style={{ fontSize: 11, color: '#D4A017', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
              v{APP_INFO.version}
            </div>
            <div style={{ fontSize: 12, color: '#8B6A5A', marginTop: 8, lineHeight: 1.4, padding: '0 12px' }}>
              {APP_INFO.description}
            </div>
          </div>

          {/* Stats globales */}
          {stats && (
            <div style={{
              background: 'linear-gradient(140deg, #4A2C17, #7D4E1F)',
              borderRadius: 16,
              padding: 14,
              color: 'white',
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, textAlign: 'center' }}>
                🌍 La communauté CookiMiner
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <CommunityStatBlock icon="👥" value={stats.userCount.toLocaleString()} label="Joueurs" />
                <CommunityStatBlock icon="🍪" value={stats.totalCookiesEarned.toLocaleString()} label="Cookies gagnés" />
                <CommunityStatBlock icon="🤝" value={stats.friendshipsCount.toLocaleString()} label="Amitiés" />
                <CommunityStatBlock icon="📈" value={stats.marketTransactionsCount.toLocaleString()} label="Transactions $CKM" />
              </div>
            </div>
          )}

          {/* Changelog */}
          <div style={{
            background: 'white',
            borderRadius: 14,
            padding: 14,
            marginBottom: 14,
            border: '1.5px solid #E8DDD0',
          }}>
            <div style={{ fontSize: 11, color: '#8B6A5A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
              📋 Nouveautés
            </div>

            {CHANGELOG.map((release, i) => (
              <div key={release.version} style={{ marginBottom: i === CHANGELOG.length - 1 ? 0 : 16, paddingBottom: i === CHANGELOG.length - 1 ? 0 : 14, borderBottom: i === CHANGELOG.length - 1 ? 'none' : '1px dashed #E8DDD0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#D4A017' }}>
                    v{release.version}
                    {i === 0 && (
                      <span style={{
                        marginLeft: 8,
                        fontSize: 10,
                        background: '#D4A017',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: 8,
                        fontWeight: 700,
                      }}>NOUVEAU</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: '#A0784E' }}>{release.date}</div>
                </div>
                <div style={{ fontSize: 12, color: '#5C3317', fontWeight: 700, marginBottom: 6 }}>
                  {release.title}
                </div>
                <ul style={{ fontSize: 11, color: '#8B6A5A', paddingLeft: 18, lineHeight: 1.6, margin: 0 }}>
                  {release.changes.map((c, j) => (
                    <li key={j}>{c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Liens et crédits */}
          <div style={{
            background: 'white',
            borderRadius: 14,
            padding: 14,
            marginBottom: 14,
            border: '1.5px solid #E8DDD0',
          }}>
            <div style={{ fontSize: 11, color: '#8B6A5A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
              🔗 Liens
            </div>
            <a
              href={APP_INFO.github}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                padding: '10px 12px',
                background: '#F5EFE6',
                borderRadius: 10,
                fontSize: 13,
                color: '#2C1810',
                textDecoration: 'none',
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              💻 Code source GitHub
            </a>
          </div>

          {/* Crédits */}
          <div style={{
            textAlign: 'center',
            fontSize: 11,
            color: '#A0784E',
            fontStyle: 'italic',
            marginTop: 8,
          }}>
            Réalisé avec 🍪 par <strong style={{ color: '#C17F3C', fontStyle: 'normal' }}>{APP_INFO.author}</strong>
            <br/>
            {APP_INFO.releaseDate}
          </div>

        </div>
      </div>
    </div>
  );
}

function CommunityStatBlock({ icon, value, label }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: 10,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 900, color: '#D4A017', marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{label}</div>
    </div>
  );
}
```

---

# PHASE 5 — Tests

1. Aller dans Paramètres → Tap "À propos" → modal slide ✅
2. Voir version, description, stats globales temps réel
3. Voir liste des changelog avec badge "NOUVEAU" sur la dernière version
4. Tap "Code source GitHub" → ouvre dans un nouvel onglet ✅
5. Crédits Cookithan en bas

## Vérifications globales
- ☑ Page À propos accessible depuis Paramètres
- ☑ Stats globales chargées en live depuis Supabase
- ☑ Changelog visible et bien formaté
- ☑ Pas de rouge ni de vert
- ☑ Mobile-friendly

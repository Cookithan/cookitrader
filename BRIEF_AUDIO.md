# Brief — Système Audio CookiMiner 🔊🎵

Lis bien le CLAUDE.md avant de commencer.
**Procède UNE phase à la fois et attends ma validation entre chaque.**

---

## 🎯 Concept

Ajouter du son à l'app pour passer d'une UI silencieuse à une vraie expérience tactile et immersive. Deux volets :

1. **Sons UI** — petits sons discrets sur les interactions (tap, validation, etc.)
2. **Musiques d'ambiance** — une musique de fond avec **3 musiques achetables** dans la boutique + **1 pack premium** de 2 musiques exclusives en ☕ CF

Tout est désactivable depuis les paramètres.

---

## 📦 Récap des assets nécessaires

### Sons UI (6 sons gratuits, libres de droits)
- `tap.mp3` — Petit click sur les boutons
- `success.mp3` — Validation/confirmation
- `error.mp3` — Erreur (doux, pas agressif)
- `modal.mp3` — Ouverture de modal (swoosh)
- `tab.mp3` — Changement d'onglet
- `toggle.mp3` — Activation/désactivation switch

### Musiques d'ambiance (~2-3 minutes en boucle, format MP3 64-128 kbps mono)

| Musique | Statut | Prix | Niveau |
|---|---|---|---|
| 🎷 Jazz Café | Gratuit (par défaut) | 0 🍪 | 1 |
| 🎵 Lofi Hip-Hop | Boutique | 1000 🍪 | 5 |
| 🇧🇷 Bossa Nova | Boutique | 1500 🍪 | 5 |
| ☕ Café Parisien | Boutique | 2000 🍪 | 5 |
| ✨ Pack Doré (Lounge Doré + Symphonie Royale) | Pack premium ☕ | 5 ☕ | 5 |

---

# ══════════════════════════════════════════════
# PHASE 0 — Récupérer les fichiers audio (action utilisateur)
# ══════════════════════════════════════════════

⚠️ **Cette phase doit être faite par l'utilisateur**, pas par Claude Code.

Claude Code doit afficher ces instructions et **attendre la confirmation** avant de continuer.

## Sources libres de droits recommandées

### 🔊 Pour les sons UI

Aller sur **https://pixabay.com/sound-effects/** (totalement libre, même commercial, sans attribution requise) et chercher :

| Fichier final | Mots-clés à chercher | Notes |
|---|---|---|
| `tap.mp3` | "ui tap", "click button" | Court (< 0.3s), discret |
| `success.mp3` | "success ding", "level up short" | "Ting" cristallin (~0.5s) |
| `error.mp3` | "error soft", "fail soft" | Doux, pas agressif (~0.5s) |
| `modal.mp3` | "swoosh", "whoosh ui" | Souffle court (~0.4s) |
| `tab.mp3` | "tab click", "ui tap soft" | Très court (< 0.2s) |
| `toggle.mp3` | "switch toggle", "toggle ui" | Click distinct (~0.3s) |

**Astuce** : sur Pixabay, filtrer par durée < 1 seconde pour les sons UI.

### 🎵 Pour les musiques

Sources gratuites recommandées :
- **Pixabay Music** : https://pixabay.com/music/ (libre commercial, sans attribution)
- **YouTube Audio Library** : https://studio.youtube.com → Bibliothèque audio (libre commercial)
- **Bensound** : https://www.bensound.com (Royalty Free)

| Fichier final | Mots-clés à chercher |
|---|---|
| `music-jazz-cafe.mp3` | "jazz cafe", "smooth jazz cafe", "swing cafe" |
| `music-lofi.mp3` | "lofi", "lofi hip hop", "lofi cafe" |
| `music-bossa-nova.mp3` | "bossa nova", "smooth bossa", "brazilian cafe" |
| `music-cafe-parisien.mp3` | "french cafe", "accordion cafe", "musette" |
| `music-lounge-dore.mp3` | "lounge piano", "elegant lounge", "luxury jazz" |
| `music-symphonie-royale.mp3` | "classical baroque", "vivaldi", "bach piano" |

⚠️ **Critères** : musique en **boucle propre** (loopable), 2-3 minutes max, fichier < 2 Mo (compression mp3 64-128 kbps suffit).

## Action utilisateur

1. Télécharger les **6 sons UI** + **6 musiques** depuis les sources ci-dessus
2. Les renommer **exactement** comme indiqué dans les tableaux
3. Les placer dans le dossier `public/sounds/` du projet (créer le dossier si inexistant)
4. Confirmer à Claude Code que tous les fichiers sont en place

⚠️ Si certains fichiers ne sont pas trouvés, on peut faire la phase suivante avec les sons disponibles et compléter plus tard.

## Vérifications phase 0
- ☑ Dossier `public/sounds/` créé
- ☑ 6 sons UI placés (`tap.mp3`, `success.mp3`, `error.mp3`, `modal.mp3`, `tab.mp3`, `toggle.mp3`)
- ☑ 6 musiques placées (jazz, lofi, bossa, parisien, doré, royale)
- ☑ Total < 15 Mo (sinon trop lourd à charger sur mobile)

---

# ══════════════════════════════════════════════
# PHASE 1 — Système audio central
# ══════════════════════════════════════════════

Créer `src/lib/audio.js` qui gère tous les sons et musiques.

```js
// ═══════════════════════════════════════════
// SYSTÈME AUDIO COOKIMINER
// ═══════════════════════════════════════════

// Catalogue des sons UI
const UI_SOUNDS = {
  tap:     '/sounds/tap.mp3',
  success: '/sounds/success.mp3',
  error:   '/sounds/error.mp3',
  modal:   '/sounds/modal.mp3',
  tab:     '/sounds/tab.mp3',
  toggle:  '/sounds/toggle.mp3',
};

// Catalogue des musiques
export const MUSICS = {
  jazz:       { id: 'jazz',       name: 'Jazz Café',         emoji: '🎷', file: '/sounds/music-jazz-cafe.mp3',       free: true },
  lofi:       { id: 'lofi',       name: 'Lofi Hip-Hop',      emoji: '🎵', file: '/sounds/music-lofi.mp3',            cost: 1000, currency: 'cookies' },
  bossa:      { id: 'bossa',      name: 'Bossa Nova',        emoji: '🇧🇷', file: '/sounds/music-bossa-nova.mp3',      cost: 1500, currency: 'cookies' },
  parisien:   { id: 'parisien',   name: 'Café Parisien',     emoji: '☕', file: '/sounds/music-cafe-parisien.mp3',   cost: 2000, currency: 'cookies' },
  dore:       { id: 'dore',       name: 'Lounge Doré',       emoji: '✨', file: '/sounds/music-lounge-dore.mp3',     cost: 5,    currency: 'cf', pack: 'premium' },
  royale:     { id: 'royale',     name: 'Symphonie Royale',  emoji: '💎', file: '/sounds/music-symphonie-royale.mp3', cost: 5,   currency: 'cf', pack: 'premium' },
};

// Cache des Audio objects (évite de re-charger à chaque play)
const audioCache = {};

let currentMusic = null;
let musicAudio = null;
let firstInteraction = false;

// === SETTINGS (persistées dans localStorage) ===
function getSettings() {
  try {
    return JSON.parse(localStorage.getItem('cookiminer:audioSettings')) || {
      uiSoundEnabled: true,
      musicEnabled: true,
      currentMusicId: 'jazz',
    };
  } catch {
    return { uiSoundEnabled: true, musicEnabled: true, currentMusicId: 'jazz' };
  }
}

function saveSettings(s) {
  localStorage.setItem('cookiminer:audioSettings', JSON.stringify(s));
}

export function getAudioSettings() {
  return getSettings();
}

export function setUiSoundEnabled(enabled) {
  const s = getSettings();
  s.uiSoundEnabled = enabled;
  saveSettings(s);
}

export function setMusicEnabled(enabled) {
  const s = getSettings();
  s.musicEnabled = enabled;
  saveSettings(s);
  if (enabled && firstInteraction) {
    playMusic(s.currentMusicId);
  } else {
    stopMusic();
  }
}

// === PLAY UI SOUND ===
export function playSound(name) {
  const s = getSettings();
  if (!s.uiSoundEnabled) return;
  if (!UI_SOUNDS[name]) {
    console.warn('Unknown sound:', name);
    return;
  }

  try {
    // Réutilise l'objet audio s'il existe (évite glitches)
    if (!audioCache[name]) {
      audioCache[name] = new Audio(UI_SOUNDS[name]);
      audioCache[name].volume = 0.5;
    }
    const audio = audioCache[name];
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Silently ignore (mobile autoplay restrictions)
    });
  } catch (e) {
    console.warn('Sound error:', e);
  }
}

// === PLAY MUSIC ===
export function playMusic(musicId) {
  const s = getSettings();
  if (!s.musicEnabled) return;

  const music = MUSICS[musicId];
  if (!music) return;

  // Si la même musique est déjà en train de jouer, on ne fait rien
  if (currentMusic === musicId && musicAudio && !musicAudio.paused) return;

  // Stop la précédente
  stopMusic();

  try {
    musicAudio = new Audio(music.file);
    musicAudio.volume = 0.25; // Volume bas pour ambiance
    musicAudio.loop = true;
    musicAudio.play().catch(() => {
      // Mobile autoplay - sera relancé au premier tap
    });
    currentMusic = musicId;

    // Sauvegarder le choix
    s.currentMusicId = musicId;
    saveSettings(s);
  } catch (e) {
    console.warn('Music error:', e);
  }
}

export function stopMusic() {
  if (musicAudio) {
    try { musicAudio.pause(); } catch {}
    musicAudio = null;
  }
  currentMusic = null;
}

export function getCurrentMusicId() {
  return currentMusic || getSettings().currentMusicId;
}

// === FIRST INTERACTION HANDLER ===
// Sur mobile, le navigateur bloque l'autoplay. On lance la musique au 1er tap.
export function setupAudioOnFirstInteraction() {
  if (firstInteraction) return;
  const handler = () => {
    firstInteraction = true;
    const s = getSettings();
    if (s.musicEnabled) {
      playMusic(s.currentMusicId);
    }
    document.removeEventListener('click', handler);
    document.removeEventListener('touchstart', handler);
    document.removeEventListener('keydown', handler);
  };
  document.addEventListener('click', handler);
  document.addEventListener('touchstart', handler);
  document.addEventListener('keydown', handler);
}
```

## Vérifications phase 1
- ☑ Fichier `src/lib/audio.js` créé
- ☑ Pas d'erreur dans la console au chargement
- ☑ Les fonctions sont bien exportées

---

# ══════════════════════════════════════════════
# PHASE 2 — Initialisation au lancement
# ══════════════════════════════════════════════

Dans `App.jsx` (ou le composant racine), au montage initial, appeler `setupAudioOnFirstInteraction()` pour préparer l'auto-lancement de la musique au premier tap.

```jsx
import { useEffect } from 'react';
import { setupAudioOnFirstInteraction } from './lib/audio';

function App() {
  useEffect(() => {
    setupAudioOnFirstInteraction();
  }, []);

  // ... reste du composant
}
```

## Vérifications phase 2
- ☑ Au premier tap dans l'app, la musique Jazz Café démarre automatiquement
- ☑ Si l'utilisateur ferme et rouvre l'app, ça remarche au premier tap
- ☑ Pas de message d'erreur autoplay dans la console

---

# ══════════════════════════════════════════════
# PHASE 3 — Sons UI dans les boutons
# ══════════════════════════════════════════════

Ajouter `playSound('tap')` aux principaux boutons de l'app.

## Approche recommandée

Plutôt que de modifier chaque bouton, créer un **wrapper sonore léger** :

```jsx
// Dans un fichier utility, par exemple src/lib/audio.js (à la fin)
export function withSound(handler, soundName = 'tap') {
  return (...args) => {
    playSound(soundName);
    if (handler) return handler(...args);
  };
}
```

Puis l'utiliser dans les boutons existants :

```jsx
// AVANT
<button onClick={handleClick}>OK</button>

// APRÈS
<button onClick={withSound(handleClick)}>OK</button>
```

## Liste des boutons à sonoriser

### Avec son `'tap'`
- Tous les boutons de navigation (onglets bottom bar)
- Boutons "Retour" dans les jeux
- Boutons d'options dans les modals (Annuler, Fermer)
- Boutons des jeux (jouer, suivant, etc.)

### Avec son `'success'`
- Validation d'achat boutique
- Validation de réponse correcte (Quiz, Devine la commande)
- Niveau supérieur atteint
- Récompense check-in quotidien
- Match Memory Café

### Avec son `'error'`
- Mauvaise réponse Quiz / Devine la commande
- Échec d'achat (pas assez de cookies)
- Stop le café : zone ratée

### Avec son `'modal'`
- Ouverture de toutes les modals (settings, achat, info, etc.)

### Avec son `'tab'`
- Changement d'onglet (bottom bar)

### Avec son `'toggle'`
- Toggle sons UI / musique dans les paramètres
- Toggle de notifications si présent

⚠️ **Procéder par module** : sonoriser d'abord la nav + onglets + boutons des paramètres (PHASE 3a), puis les jeux (PHASE 3b), puis la boutique et le marché (PHASE 3c). **Tester entre chaque** pour valider que rien n'est cassé.

## Vérifications phase 3
- ☑ Tap sur un onglet → son `tab`
- ☑ Tap sur n'importe quel bouton → son `tap`
- ☑ Bonne réponse Quiz → son `success`
- ☑ Mauvaise réponse Quiz → son `error`
- ☑ Ouverture modal → son `modal`
- ☑ Aucun bouton ne plante après ajout du wrapper
- ☑ Les sons ne sont **PAS** trop forts (volume 50% max)

---

# ══════════════════════════════════════════════
# PHASE 4 — Musiques dans la boutique
# ══════════════════════════════════════════════

Ajouter une nouvelle catégorie **"Musiques"** dans la boutique avec les 3 musiques achetables en cookies + le pack premium en ☕.

## Items à ajouter dans le tableau `REWARDS`

```js
// Musiques boutique (cookies)
{ id: 'music_lofi',     name: '🎵 Musique Lofi Hip-Hop',     desc: 'Ambiance étudiant chill',     cost: 1000, type: 'Musique', emoji: '🎵', levelRequired: 5 },
{ id: 'music_bossa',    name: '🇧🇷 Musique Bossa Nova',       desc: 'Soleil brésilien',            cost: 1500, type: 'Musique', emoji: '🇧🇷', levelRequired: 5 },
{ id: 'music_parisien', name: '☕ Musique Café Parisien',    desc: 'Accordéon romantique',        cost: 2000, type: 'Musique', emoji: '☕', levelRequired: 5 },

// Pack premium en cafés
{ id: 'pack_dore', name: '✨ Pack Doré (2 musiques)', desc: 'Lounge Doré + Symphonie Royale', cost: 5, currency: 'cf', type: 'Pack Musique', emoji: '✨', levelRequired: 5 },
```

⚠️ Si la structure actuelle des items boutique gère déjà la propriété `currency`, parfait. Sinon, l'ajouter pour différencier achat en 🍪 vs ☕.

## Logique d'achat du pack

Quand l'utilisateur achète `pack_dore` :
- Débite **5 ☕**
- Ajoute **2 IDs** dans `unlocked` : `music_dore` ET `music_royale`
- Ne pas ajouter `pack_dore` lui-même dans `unlocked` (juste les 2 musiques)

```js
function handlePurchase(item) {
  if (item.id === 'pack_dore') {
    // Achat spécial : débloque 2 musiques
    spendCafes(5);
    setUnlocked(u => [...u, 'music_dore', 'music_royale']);
    playSound('success');
    return;
  }
  // ... logique normale pour les autres items
}
```

## Vérifications phase 4
- ☑ 3 musiques 🍪 visibles dans la boutique au niveau 5+
- ☑ Pack Doré visible dans la catégorie premium
- ☑ Achat d'une musique 🍪 fonctionne et débite les cookies
- ☑ Achat du Pack Doré débloque les 2 musiques d'un coup
- ☑ Items déjà achetés sont marqués comme "Possédé"

---

# ══════════════════════════════════════════════
# PHASE 5 — Sélecteur de musique dans les paramètres
# ══════════════════════════════════════════════

Dans la page Profil ou dans les Paramètres, ajouter une section **🎵 Audio** :

```jsx
function AudioSettings({ unlocked }) {
  const [settings, setSettings] = useState(getAudioSettings());

  const toggleUiSound = () => {
    const newVal = !settings.uiSoundEnabled;
    setUiSoundEnabled(newVal);
    setSettings({ ...settings, uiSoundEnabled: newVal });
    if (newVal) playSound('toggle');
  };

  const toggleMusic = () => {
    const newVal = !settings.musicEnabled;
    setMusicEnabled(newVal);
    setSettings({ ...settings, musicEnabled: newVal });
    playSound('toggle');
  };

  // Liste des musiques disponibles : la gratuite + celles débloquées
  const availableMusics = Object.values(MUSICS).filter(m =>
    m.free || unlocked.includes('music_' + m.id)
  );

  const changeMusic = (musicId) => {
    playSound('tap');
    playMusic(musicId);
    setSettings({ ...settings, currentMusicId: musicId });
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      border: '1.5px solid #E8DDD0',
    }}>
      <div style={{ fontSize: 11, color: '#8B6A5A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>
        🎵 Audio
      </div>

      {/* Toggle sons UI */}
      <ToggleRow
        label="Sons d'interface"
        description="Petits sons sur les boutons"
        enabled={settings.uiSoundEnabled}
        onToggle={toggleUiSound}
      />

      {/* Toggle musique */}
      <ToggleRow
        label="Musique d'ambiance"
        description="Musique de fond pendant le jeu"
        enabled={settings.musicEnabled}
        onToggle={toggleMusic}
      />

      {/* Sélecteur de musique (si la musique est activée) */}
      {settings.musicEnabled && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #E8DDD0' }}>
          <div style={{ fontSize: 11, color: '#8B6A5A', marginBottom: 8 }}>
            Musique actuelle :
          </div>
          {availableMusics.map(m => (
            <button
              key={m.id}
              onClick={() => changeMusic(m.id)}
              style={{
                width: '100%',
                padding: '10px 12px',
                marginBottom: 6,
                borderRadius: 10,
                border: settings.currentMusicId === m.id
                  ? '2px solid #D4A017'
                  : '1.5px solid #E8DDD0',
                background: settings.currentMusicId === m.id
                  ? 'linear-gradient(135deg, rgba(212,160,23,0.1), rgba(193,127,60,0.1))'
                  : 'white',
                color: '#2C1810',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{m.emoji} {m.name}</span>
              {settings.currentMusicId === m.id && (
                <span style={{ fontSize: 11, color: '#D4A017' }}>● En lecture</span>
              )}
            </button>
          ))}
          {availableMusics.length === 1 && (
            <div style={{ fontSize: 11, color: '#A0784E', marginTop: 8, fontStyle: 'italic', textAlign: 'center' }}>
              💡 Débloque d'autres musiques dans la boutique !
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Composant utilitaire
function ToggleRow({ label, description, enabled, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        cursor: 'pointer',
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#2C1810' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#8B6A5A' }}>{description}</div>
      </div>
      <div style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: enabled ? 'linear-gradient(135deg, #D4A017, #C17F3C)' : '#E8DDD0',
        position: 'relative',
        transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute',
          top: 3,
          left: enabled ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'white',
          transition: 'left 0.2s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }} />
      </div>
    </div>
  );
}
```

⚠️ **Mapping unlock IDs** : la fonction `availableMusics` filtre selon les IDs débloqués. Vérifier que les IDs cohérents :
- Item boutique `music_lofi` → débloque la musique `lofi` dans MUSICS
- Item boutique `music_bossa` → débloque la musique `bossa`
- Item boutique `music_parisien` → débloque la musique `parisien`
- Item boutique `pack_dore` → débloque les musiques `dore` ET `royale`
- Le filtre dans `availableMusics` doit gérer ce mapping correctement

## Vérifications phase 5
- ☑ Section 🎵 Audio visible dans le profil/paramètres
- ☑ Toggle sons UI fonctionne (jouer un son confirme l'état)
- ☑ Toggle musique fonctionne (la musique se coupe/relance)
- ☑ Si musique activée, liste des musiques disponibles affichée
- ☑ Cliquer sur une musique change la musique en cours instantanément
- ☑ Au début du jeu, seul "Jazz Café" est visible (les autres sont dans la boutique)
- ☑ Après achat d'une musique boutique, elle apparaît dans le sélecteur
- ☑ Après achat du Pack Doré, les 2 musiques apparaissent
- ☑ La musique sélectionnée persiste entre les sessions

---

# ══════════════════════════════════════════════
# PHASE 6 — Tests finaux
# ══════════════════════════════════════════════

## Scénarios à tester

1. **Premier lancement** — l'app démarre, splash, premier tap → musique Jazz Café démarre + son `tap` joué
2. **Naviguer entre les onglets** — sons `tab` joués
3. **Ouvrir une modal** — son `modal`
4. **Bonne réponse au quiz** — son `success`
5. **Mauvaise réponse au quiz** — son `error`
6. **Couper la musique** dans les paramètres → la musique s'arrête
7. **Rallumer la musique** → elle reprend là où elle était (ou redémarre, peu importe)
8. **Couper les sons UI** → plus aucun son sur les boutons (mais musique continue)
9. **Acheter Lofi** → musique apparaît dans le sélecteur, peut la lancer
10. **Acheter Pack Doré** (5 ☕) → les 2 musiques premium apparaissent dans le sélecteur
11. **Fermer l'app, rouvrir** → la dernière musique choisie se relance au premier tap
12. **Mode hors ligne** — les sons et musiques continuent (locaux dans `public/sounds/`)

## Vérifications globales
- ☑ Pas de spam audio (jouer un son ne bloque pas le reste)
- ☑ Les fichiers totalisent < 15 Mo (vérifier avec `du -sh public/sounds/`)
- ☑ Pas de freeze à l'ouverture (les musiques chargent en arrière-plan)
- ☑ Tout fonctionne en mode PWA installée
- ☑ Mobile-friendly (testé sur 390px)

---

# ══════════════════════════════════════════════
# 💡 NOTES IMPORTANTES POUR CLAUDE CODE
# ══════════════════════════════════════════════

- **Sons en cache** : `audioCache` évite de recharger un son à chaque play, c'est important pour la perf
- **Volume musique** : 0.25 (25%) — la musique d'ambiance ne doit jamais cacher les sons UI
- **Volume sons UI** : 0.5 (50%) — assez audible mais pas agressif
- **Pas d'autoplay** : la musique démarre uniquement après une interaction utilisateur (limitation navigateur mobile)
- **Format MP3** : universellement supporté, contrairement à OGG/WAV
- **Pas de WebAudio API** : Audio HTML5 suffit, plus simple et compatible partout
- **Boucle propre** : `loop = true` sur le music audio, mais la musique elle-même doit être loopable (sinon on entend la coupure)
- **Si un fichier audio manque** : le `playSound` / `playMusic` plante silencieusement (try/catch), l'app ne crash pas

Bon dev ! ☕🔊🎵

# Brief — Anti-cheat Défi de clics 🛡️

Lis bien le CLAUDE.md avant de commencer.
**Procède UNE phase à la fois et attends ma validation entre chaque.**

## 🐛 Le problème

Le mini-jeu **Défi de clics** est exploitable :
- Un auto-clicker permet de faire 50-100 clics/seconde (vs ~10/s pour un humain)
- Un script JS dans la console permet 1000+ clics/seconde
- Résultat : 500 cookies en 5 secondes au lieu des ~50 légitimes

Il faut **bloquer ces tricheurs** avec des techniques anti-cheat côté client.

## ⚙️ Règles de protection

- 🚫 **Cap dur** : maximum **12 clics par seconde** (humain rapide ~10-12, donc 12 = limite réaliste)
- 🤖 **Détection de pattern** : si les clics sont espacés de manière trop régulière (genre exactement 50ms à chaque fois), c'est un bot
- 📊 **Score max par partie** : 150 clics max comptabilisés
- ⚠️ **Feedback** : afficher un avertissement "Tricherie détectée, ralentis !"
- 🎯 **Périmètre** : uniquement le **Défi de clics**

---

# PHASE 1 — Module anti-cheat

Créer `src/lib/antiCheat.js` :

```js
// ANTI-CHEAT POUR LE DEFI DE CLICS

const CLICK_LIMITS = {
  MAX_CLICKS_PER_SECOND: 12,
  MAX_CLICKS_PER_GAME: 150,
  PATTERN_DETECTION_WINDOW: 10,
  PATTERN_TOLERANCE_MS: 5,
};

/**
 * Tracker qui surveille les clics d'une partie et détecte la triche.
 */
export class ClickTracker {
  constructor() {
    this.clickTimestamps = [];
    this.cheatDetected = false;
    this.cheatReason = null;
    this.totalLegitimateClicks = 0;
  }

  /**
   * Enregistre un clic et retourne s'il est valide ou non.
   */
  registerClick() {
    const now = performance.now();

    // 1. Cap dur (12 clics/s)
    const oneSecondAgo = now - 1000;
    const recentClicks = this.clickTimestamps.filter(t => t > oneSecondAgo);

    if (recentClicks.length >= CLICK_LIMITS.MAX_CLICKS_PER_SECOND) {
      return {
        accepted: false,
        reason: 'Trop rapide ! Maximum 12 clics par seconde.',
        isCheat: true,
      };
    }

    // 2. Score max
    if (this.totalLegitimateClicks >= CLICK_LIMITS.MAX_CLICKS_PER_GAME) {
      return {
        accepted: false,
        reason: 'Score maximum atteint pour cette partie.',
        isCheat: false,
      };
    }

    // 3. Détection de pattern bot
    if (this.clickTimestamps.length >= CLICK_LIMITS.PATTERN_DETECTION_WINDOW) {
      const isPatternBot = this._detectBotPattern(now);
      if (isPatternBot) {
        this.cheatDetected = true;
        this.cheatReason = 'Pattern de bot détecté';
        return {
          accepted: false,
          reason: 'Tricherie détectée, ralentis !',
          isCheat: true,
        };
      }
    }

    // Clic valide
    this.clickTimestamps.push(now);
    this.totalLegitimateClicks++;
    return { accepted: true, isCheat: false };
  }

  /**
   * Détecte si les derniers clics suivent un pattern de bot
   * (espacements quasi-identiques = écart-type très faible).
   */
  _detectBotPattern(currentTime) {
    const recentTimestamps = [
      ...this.clickTimestamps.slice(-CLICK_LIMITS.PATTERN_DETECTION_WINDOW + 1),
      currentTime,
    ];

    if (recentTimestamps.length < CLICK_LIMITS.PATTERN_DETECTION_WINDOW) {
      return false;
    }

    const intervals = [];
    for (let i = 1; i < recentTimestamps.length; i++) {
      intervals.push(recentTimestamps[i] - recentTimestamps[i - 1]);
    }

    const avg = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
    const variance = intervals.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Si tous les clics sont quasi identiquement espacés (stdDev < 5ms) = bot
    return stdDev < CLICK_LIMITS.PATTERN_TOLERANCE_MS;
  }

  reset() {
    this.clickTimestamps = [];
    this.cheatDetected = false;
    this.cheatReason = null;
    this.totalLegitimateClicks = 0;
  }

  getValidScore() {
    return Math.min(this.totalLegitimateClicks, CLICK_LIMITS.MAX_CLICKS_PER_GAME);
  }
}

export const ANTICHEAT_CONFIG = CLICK_LIMITS;
```

## Vérifications phase 1
- ☑ Fichier `src/lib/antiCheat.js` créé
- ☑ Pas d'erreur dans la console au chargement

---

# PHASE 2 — Intégration dans le Défi de clics

Trouver le composant du **Défi de clics** (probablement `ClickChallenge.jsx` ou similaire dans `src/components/`).

## Modifications

### 2A. Importer le tracker

```jsx
import { useRef, useState, useEffect } from 'react';
import { ClickTracker } from '../lib/antiCheat';
```

### 2B. Initialiser le tracker au début de la partie

```jsx
function ClickChallenge({ onComplete }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [warningMessage, setWarningMessage] = useState(null);
  const trackerRef = useRef(null);

  useEffect(() => {
    trackerRef.current = new ClickTracker();
    setWarningMessage(null);
  }, []);

  // ... reste de la logique existante
}
```

### 2C. Modifier le handler de clic

Remplacer la fonction qui incrémente le score :

```jsx
const handleClick = () => {
  if (timeLeft <= 0 || !trackerRef.current) return;

  const result = trackerRef.current.registerClick();

  if (!result.accepted) {
    if (result.isCheat) {
      setWarningMessage(result.reason);
      setTimeout(() => setWarningMessage(null), 1500);
    }
    return; // Le clic est ignoré
  }

  setScore(s => s + 1);
};
```

### 2D. Afficher l'avertissement

Dans le JSX, ajouter au-dessus du bouton de clic :

```jsx
{warningMessage && (
  <div style={{
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #7D4E1F, #5C3317)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 800,
    boxShadow: '0 4px 12px rgba(125,78,31,0.4)',
    zIndex: 100,
    pointerEvents: 'none',
    animation: 'cheatWarning 0.3s ease-out',
  }}>
    ⚠️ {warningMessage}
  </div>
)}
```

CSS à ajouter :

```css
@keyframes cheatWarning {
  0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0); }
}
```

### 2E. Score validé à la fin

```jsx
useEffect(() => {
  if (timeLeft === 0 && trackerRef.current) {
    const finalScore = trackerRef.current.getValidScore();

    if (trackerRef.current.cheatDetected) {
      console.warn('Cheat detected:', trackerRef.current.cheatReason);
    }

    onComplete(finalScore);
  }
}, [timeLeft]);
```

⚠️ **Important** : le score affiché en temps réel (`score`) sert juste à l'UI. Le score final envoyé à `onComplete` vient de `getValidScore()` pour être 100% fiable.

## Vérifications phase 2
- ☑ Le score n'augmente plus au-delà de 12 clics/seconde
- ☑ L'avertissement "⚠️ Tricherie détectée, ralentis !" apparaît en moka
- ☑ Le score final est capé à 150 max
- ☑ Pour un joueur normal (5-10 clics/s), aucune différence

---

# PHASE 3 — Tests anti-cheat

## Test 1 — Joueur normal
1. Lance le Défi de clics
2. Clique normalement (~8-10/s) pendant 10s
3. **Attendu** : score normal (50-100), aucun avertissement

## Test 2 — Auto-clicker rapide
1. Lance un auto-clicker (extension Chrome ou app) à **30 clics/seconde**
2. Lance le Défi de clics
3. **Attendu** :
   - Le score ne dépasse PAS 12 clics/s
   - L'avertissement apparaît
   - Score final plafonné à 150

## Test 3 — Script console
Ouvrir la console (F12) et taper :
```js
const btn = document.querySelector('button[data-clicker]'); // adapter le sélecteur
for (let i = 0; i < 1000; i++) btn.click();
```
**Attendu** : score reste cappé, avertissement, pas de crash

## Test 4 — Pattern bot régulier
1. Auto-clicker à exactement **100ms entre chaque clic** (= 10/s, sous le cap)
2. **Attendu** :
   - Au début ça marche
   - Après 10 clics avec exactement 100ms d'écart → "Pattern détecté"
   - Score plafonné

## Vérifications globales
- ☑ Joueur normal : aucune différence
- ☑ Auto-clicker rapide : bloqué
- ☑ Pattern régulier : détecté
- ☑ Script console : ineffectif
- ☑ Pas de plantage
- ☑ Avertissement en moka, pas en rouge

---

# PHASE 4 — Bonus : Reset des cookies trichés du pote

## Sur Supabase

1. Va sur Supabase → **Table Editor** → table `users`
2. Trouve la ligne du pote (par `user_code` ou `user_name`)
3. Modifie `cookies` pour mettre le bon montant (genre 50)
4. Modifie `total_earned` pareillement
5. Sauvegarde

## Alternative SQL

```sql
update public.users
set cookies = 50, total_earned = 50
where user_code = 'CODE-AMI';
```

⚠️ Remplace `CODE-AMI` par le vrai code du pote. Ne touche pas aux autres comptes.

---

# 💡 NOTES POUR CLAUDE CODE

- **Ne pas modifier les autres jeux** : uniquement le Défi de clics
- **`performance.now()`** plus fiable que `Date.now()` (non affecté par changements d'horloge)
- **Pas de validation serveur** dans cette version (choix utilisateur)
- **Avertissement en moka** (`#7D4E1F → #5C3317`), pas en rouge
- **Clics rejetés silencieusement** : le tricheur voit que ça marche pas, sans bloquer hard
- **Score max 150** = tu confirmeras avec le testing si c'est trop bas/haut

Bon dev ! ☕🛡️

# Brief — Splash Screen au lancement de CookiMiner ☕✨

Lis bien le CLAUDE.md avant de commencer.
**Propose-moi un plan en puces et attends ma validation avant de coder.**

---

## Objectif

Quand l'utilisateur ouvre CookiMiner (en PWA installée OU en navigateur), afficher un **écran de chargement** stylé pendant **2 secondes** avant l'accueil :

- 🎬 Le mot **"CookiMiner"** s'écrit lettre par lettre (10 lettres, ~1.7s)
- 🌗 Fond **marron foncé** (gradient espresso)
- ✨ Texte **caramel clair** avec halo doré
- 📝 Sous-titre "Café · Cookies · Mining" qui apparaît à la fin
- 💫 3 points dorés qui pulsent (loading)
- ⏱️ Fade out vers l'app après 2.2 secondes

À la place du splash natif PWA actuel (icône grise 1 seconde) qui n'est pas joli.

---

## Étape 1 — Désactiver/optimiser le splash natif PWA

Le splash natif PWA est généré automatiquement à partir du manifest et de l'icône.
Sur iOS/Android, ça affiche juste l'icône avec le `background_color` du manifest.

### Action 1A — Modifier `public/manifest.webmanifest`

Changer le `background_color` pour qu'il corresponde au **gradient sombre** du splash custom (transition douce) :

```json
{
  "name": "CookiMiner",
  "short_name": "CookiMiner",
  "description": "App mobile de récompenses café & cookies",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#3D2010",
  "theme_color": "#C17F3C",
  "lang": "fr",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Action 1B — Modifier `index.html`

S'assurer que le `<body>` a bien `background-color: #3D2010` AVANT que React ne soit chargé :

```html
<style>
  html, body {
    margin: 0;
    padding: 0;
    background-color: #3D2010;
  }
  body {
    /* Empêcher flash blanc au premier paint */
    color: #E8C896;
  }
</style>
```

À mettre **dans le `<head>` de `index.html`**, dans une balise `<style>` directement (pas dans un fichier CSS séparé qui se charge plus tard).

⚠️ Important : ça évite le flash blanc qu'on voit parfois en attendant le chargement de React.

---

## Étape 2 — Créer le composant `SplashScreen.jsx`

À placer dans `src/components/SplashScreen.jsx` :

```jsx
import { useEffect, useState } from 'react';

export default function SplashScreen({ onFinish }) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Démarrer le fade out à 2.0s
    const fadeTimer = setTimeout(() => setFadingOut(true), 2000);
    // Démonter le composant à 2.5s (après le fade)
    const removeTimer = setTimeout(() => onFinish(), 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [onFinish]);

  const letters = 'CookiMiner'.split('');

  return (
    <div className={`splash-screen ${fadingOut ? 'fade-out' : ''}`}>
      <div className="splash-blob splash-blob-1"></div>
      <div className="splash-blob splash-blob-2"></div>

      <div className="splash-title">
        {letters.map((letter, i) => (
          <span
            key={i}
            className="splash-letter"
            style={{ animationDelay: `${0.05 + i * 0.17}s` }}
          >
            {letter}
          </span>
        ))}
      </div>

      <div className="splash-subtitle">Café · Cookies · Mining</div>

      <div className="splash-dots">
        <div className="splash-dot"></div>
        <div className="splash-dot"></div>
        <div className="splash-dot"></div>
      </div>
    </div>
  );
}
```

---

## Étape 3 — CSS du splash

À ajouter dans le fichier CSS global (le bloc `<style>` de `App.jsx` si tout est inline, ou dans `index.css`) :

```css
/* === SPLASH SCREEN === */
.splash-screen {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #4A2C17 0%, #3D2010 50%, #2C1810 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 24px;
  z-index: 9999;
  transition: opacity 0.5s ease;
  overflow: hidden;
}
.splash-screen.fade-out {
  opacity: 0;
  pointer-events: none;
}

.splash-blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(40px);
}
.splash-blob-1 {
  top: 10%;
  left: -20%;
  width: 200px;
  height: 200px;
  background: rgba(212, 160, 23, 0.15);
}
.splash-blob-2 {
  bottom: 10%;
  right: -15%;
  width: 180px;
  height: 180px;
  background: rgba(193, 127, 60, 0.12);
}

.splash-title {
  display: flex;
  gap: 0;
  z-index: 2;
}
.splash-letter {
  font-size: 44px;
  font-weight: 900;
  color: #E8C896;
  text-shadow:
    0 2px 8px rgba(212, 160, 23, 0.4),
    0 0 24px rgba(212, 160, 23, 0.2);
  opacity: 0;
  transform: translateY(20px) scale(0.7);
  animation: splashLetterIn 0.4s cubic-bezier(.34, 1.56, .64, 1) forwards;
  letter-spacing: 0;
}
@keyframes splashLetterIn {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.7);
  }
  60% {
    opacity: 1;
    transform: translateY(-4px) scale(1.1);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.splash-subtitle {
  color: #A0784E;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 4px;
  text-transform: uppercase;
  opacity: 0;
  animation: splashSubIn 0.5s ease 1.7s forwards;
  z-index: 2;
}
@keyframes splashSubIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 0.9; transform: translateY(0); }
}

.splash-dots {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  opacity: 0;
  animation: splashDotsIn 0.4s ease 1.9s forwards;
  z-index: 2;
}
@keyframes splashDotsIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.splash-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #D4A017;
  animation: splashDotPulse 1.2s ease-in-out infinite;
}
.splash-dot:nth-child(2) { animation-delay: 0.15s; }
.splash-dot:nth-child(3) { animation-delay: 0.30s; }
@keyframes splashDotPulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
```

---

## Étape 4 — Intégrer dans `App.jsx`

Dans le composant principal `CookiMiner` (ou `App`), ajouter au début :

```jsx
import SplashScreen from './components/SplashScreen';

function App() {
  // Logique : montrer le splash UNIQUEMENT au premier mount,
  // pas à chaque re-render ni quand l'utilisateur revient sur l'app
  const [showSplash, setShowSplash] = useState(() => {
    // On vérifie sessionStorage pour savoir si le splash a déjà été montré
    // dans cette session (= depuis l'ouverture de l'app)
    return sessionStorage.getItem('splashShown') !== '1';
  });

  const handleSplashFinish = () => {
    sessionStorage.setItem('splashShown', '1');
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      {/* ...le reste de l'app... */}
    </>
  );
}
```

⚠️ **Pourquoi `sessionStorage` et pas `useState` simple ?**
- Le splash s'affiche à **chaque ouverture de l'app** (chaque session)
- Mais **PAS** quand l'utilisateur passe rapidement sur une autre app et revient (l'onglet reste ouvert)
- Si tu fermes vraiment l'app (ou la PWA) et la rouvres → nouvelle session → splash réapparaît
- Si tu fais juste minimiser/restaurer → même session → pas de splash

C'est exactement le comportement attendu.

---

## Étape 5 — Bonus : couleur de la barre d'état système

Pour que la **barre d'état du téléphone** (heure, batterie) corresponde au splash en sombre :

Dans `index.html`, ajouter dans le `<head>` :

```html
<meta name="theme-color" content="#3D2010" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#C17F3C" media="(prefers-color-scheme: light)">
```

Comme ça :
- Pendant le splash → barre d'état sombre adaptée
- Pendant l'app → barre d'état caramel cohérente

⚠️ Si une balise `<meta name="theme-color">` existe déjà, **remplacer** par les deux ci-dessus.

---

## Vérifications après implémentation

- ☑ Au lancement de l'app, le splash apparaît immédiatement (pas de flash blanc avant)
- ☑ Le mot "CookiMiner" s'écrit lettre par lettre (10 lettres, chacune rebondit)
- ☑ Le sous-titre "Café · Cookies · Mining" apparaît à 1.7s
- ☑ Les 3 points dorés pulsent à 1.9s
- ☑ Fade out commence à 2.0s, terminé à 2.5s
- ☑ Le splash se ferme et l'app s'affiche
- ☑ Si l'utilisateur passe sur une autre app et revient → **PAS de splash** (l'onglet reste ouvert, sessionStorage actif)
- ☑ Si l'utilisateur ferme la PWA/onglet et la rouvre → **splash réapparaît** (nouvelle session)
- ☑ Aucune régression sur l'app
- ☑ Mobile-friendly (testé sur 390px de large)
- ☑ Palette uniquement café — pas de rouge ni de vert

---

## Notes importantes pour Claude Code

- Ne pas modifier le `<title>` de la page — il reste "CookiMiner 🍪"
- Si l'app a déjà un wrapper d'authentification ou un loader, le splash doit s'afficher **par-dessus tout** (`z-index: 9999`)
- Si l'utilisateur lance l'app **sans avoir fait l'onboarding** (premier lancement), l'ordre est :
  1. Splash (2.5s)
  2. Onboarding (saisie nom + avatar)
  3. Tutoriel (si déjà implémenté)
  4. Accueil normal
- **Ne pas activer le splash en mode dev** si tu veux gagner du temps en debug : ajouter une condition `import.meta.env.DEV ? false : ...` dans le `useState` (optionnel)

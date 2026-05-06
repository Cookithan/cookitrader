# Brief — Configurer CookiTrader en PWA 📱

Lis bien le CLAUDE.md avant de commencer.
**Propose-moi un plan en puces et attends ma validation avant de coder.**

---

## Objectif

Transformer l'app web actuelle en **Progressive Web App (PWA)** pour que l'utilisateur puisse :
- L'**installer sur l'écran d'accueil** de son téléphone (Android et iOS)
- La lancer **plein écran** comme une vraie app native (pas de barre de navigateur)
- L'utiliser **hors-ligne** une fois chargée la première fois
- Avoir une **icône cookie 🍪 sur le bureau** du téléphone

Aucun changement fonctionnel — juste de la config et des assets.

---

## Étape 1 — Placer les icônes

L'utilisateur a déjà téléchargé 4 fichiers PNG à mettre dans le dossier `public/` à la racine du projet :

```
public/
  icon-192.png            (icône standard 192×192)
  icon-512.png            (icône standard 512×512)
  icon-512-maskable.png   (version "maskable" pour Android)
  apple-touch-icon.png    (icône iOS 180×180)
```

⚠️ **Si les icônes ne sont pas encore là**, demande à l'utilisateur de les déposer dans `public/` avant de continuer. Sans elles, l'app sera installable mais avec une icône par défaut moche.

---

## Étape 2 — Créer `public/manifest.webmanifest`

Créer le fichier manifest avec ce contenu exact :

```json
{
  "name": "CookiTrader",
  "short_name": "CookiTrader",
  "description": "App mobile de récompenses café & cookies — mini-jeux, marché simulé, classement",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F5EFE6",
  "theme_color": "#C17F3C",
  "lang": "fr",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

---

## Étape 3 — Modifier `index.html`

Dans `<head>`, **ajouter ces balises** (juste avant la fermeture `</head>`) :

```html
<!-- PWA -->
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#C17F3C">

<!-- Apple/iOS specific -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="CookiTrader">

<!-- Mobile viewport -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

Si une balise viewport existe déjà, la **remplacer** par celle ci-dessus (importante pour empêcher le zoom au double-tap sur mobile).

Vérifier que le `<title>` est bien `CookiTrader 🍪`.

---

## Étape 4 — Installer le plugin Vite PWA

Dans le terminal du projet :

```bash
npm install -D vite-plugin-pwa
```

---

## Étape 5 — Configurer Vite

Modifier `vite.config.js` pour ajouter le plugin PWA. Voici la version finale attendue :

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: false, // on utilise notre manifest.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
})
```

⚠️ **Garde la config existante** si elle a d'autres options — fusionne-les. Ne supprime rien d'autre.

---

## Étape 6 — Ajouter une bannière "Installer l'app" (optionnel mais recommandé)

Dans `App.jsx`, ajouter un nouveau composant `InstallBanner` qui s'affiche **uniquement la première fois**, **uniquement sur mobile**, **uniquement si l'app n'est pas déjà installée**.

### Logique

```js
function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('cookiminer:installDismissed') === '1'
  );

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner after 30s of usage to not be intrusive
      setTimeout(() => { if (!dismissed) setShow(true); }, 30000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShow(false);
  };

  const dismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('cookiminer:installDismissed', '1');
  };

  if (!show || dismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 90,
      left: '50%',
      transform: 'translateX(-50%)',
      maxWidth: 410,
      width: 'calc(100% - 20px)',
      background: 'linear-gradient(135deg, #D4A017, #C17F3C)',
      borderRadius: 18,
      padding: '14px 16px',
      boxShadow: '0 8px 24px rgba(74,44,23,0.3)',
      color: 'white',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      animation: 'slideUp 0.4s ease'
    }}>
      <span style={{ fontSize: 28 }}>🍪</span>
      <div style={{ flex: 1, fontSize: 13 }}>
        <div style={{ fontWeight: 800 }}>Installe CookiTrader</div>
        <div style={{ opacity: 0.85, fontSize: 12 }}>Sur ton écran d'accueil, en 1 clic</div>
      </div>
      <button onClick={install} style={{
        background: 'white',
        color: '#C17F3C',
        border: 'none',
        borderRadius: 12,
        padding: '8px 14px',
        fontWeight: 800,
        fontSize: 13,
        cursor: 'pointer'
      }}>Installer</button>
      <button onClick={dismiss} style={{
        background: 'transparent',
        color: 'white',
        border: 'none',
        fontSize: 18,
        opacity: 0.7,
        cursor: 'pointer',
        padding: 4
      }}>✕</button>
    </div>
  );
}
```

Puis l'inclure dans le `return` de `App` à côté des autres modals.

⚠️ **Note iOS** : `beforeinstallprompt` n'existe PAS sur Safari iOS. Sur iPhone, l'utilisateur doit faire manuellement Partager → Ajouter à l'écran d'accueil. La bannière ne s'affichera donc que sur Android. C'est normal et acceptable pour cette première version.

---

## Étape 7 — Tester en local

1. **Build de production** (la PWA ne marche QUE en build, pas en `npm run dev`) :
   ```bash
   npm run build
   npm run preview
   ```

2. Ouvrir l'URL `http://localhost:4173` dans **Chrome desktop**.

3. Ouvrir DevTools → onglet **Application** → **Manifest** : vérifier qu'il n'y a pas d'erreur, que les icônes s'affichent.

4. Onglet **Service Workers** : vérifier qu'il y en a un d'enregistré et activé.

5. Dans la barre d'adresse Chrome, une **icône d'installation** ⊕ doit apparaître à droite. Cliquer dessus → l'app s'installe en mode app desktop.

---

## Étape 8 — Tester sur mobile

1. Lancer `npm run preview -- --host` (au lieu de `npm run dev -- --host` qui ne sert pas la PWA).
2. Récupérer l'IP affichée (ex. `http://192.168.1.42:4173`).
3. Sur le téléphone (même Wi-Fi), ouvrir cette URL dans **Chrome (Android)** ou **Safari (iOS)**.
4. **Android** : un prompt "Ajouter à l'écran d'accueil" apparaît automatiquement, ou via Menu → "Installer l'app".
5. **iOS** : appuyer sur le bouton Partager (carré avec flèche vers le haut) → "Sur l'écran d'accueil".
6. Vérifier que l'icône cookie 🍪 apparaît sur l'écran d'accueil.
7. La lancer → elle doit s'ouvrir **plein écran** sans barre Chrome/Safari.

---

## Vérifications finales

- ☑ L'icône cookie apparaît bien sur l'écran d'accueil après installation
- ☑ L'app se lance plein écran (pas de barre URL visible)
- ☑ La couleur du fond pendant le splash est `#F5EFE6`
- ☑ La couleur de la barre d'état du téléphone est `#C17F3C` (caramel)
- ☑ L'app fonctionne **sans connexion** (mode avion) après l'avoir ouverte une première fois
- ☑ La bannière "Installer" apparaît après 30s sur Android (et pas du tout sur iOS, c'est normal)
- ☑ Le double-tap ne zoome plus la page sur mobile
- ☑ Aucun changement fonctionnel — tous les jeux/features marchent comme avant

---

## Notes importantes

- **HTTPS requis pour vraie utilisation** — La PWA fonctionne en HTTP local pour tester, mais pour qu'elle soit installable depuis n'importe où, il faudra héberger l'app sur HTTPS (Vercel ou Netlify le font automatiquement gratuitement). C'est l'**Étape 2 de notre plan global** (déploiement web).
- **Pas de backend nécessaire** — la PWA reste 100% côté client, comme l'app actuelle.
- **localStorage continue de marcher** — la persistance reste identique.
- **Ne pas activer `display: 'fullscreen'`** dans le manifest — `standalone` suffit et garde la barre d'état système (heure, batterie) visible, ce qui est meilleur UX.

# Brief — Déploiement Vercel CookiTrader 🌍

Lis bien le CLAUDE.md avant de commencer.
**Ce brief est un guide pas-à-pas pour l'utilisateur. Accompagne-le, ne fais pas tout tout seul.**

---

## Objectif

Mettre **CookiTrader en ligne sur Internet** avec une vraie URL publique (ex. `cookitrader.vercel.app`) pour que :
- L'app soit accessible depuis n'importe quel téléphone, n'importe où
- N'importe qui puisse l'installer en PWA (la PWA nécessite HTTPS, ce que Vercel fournit gratuitement)
- L'utilisateur puisse partager le lien à ses amis
- Chaque commit GitHub redéploie automatiquement la nouvelle version

Vercel est **100% gratuit** pour les projets persos. Pas de carte bancaire demandée.

---

## Pré-requis

- Le projet doit être **sur GitHub** (✅ c'est déjà le cas pour CookiTrader, repo `Cookithan/cookitrader`)
- L'utilisateur doit avoir un compte GitHub (déjà le cas)
- L'utilisateur n'a **PAS** besoin de compte Vercel — on va le créer

---

## Étape 1 — Vérifier que le projet build correctement

Avant de déployer, il faut s'assurer que `npm run build` passe sans erreur en local.

Dans le terminal du projet :

```bash
npm run build
```

Vérifications :
- ☑ La commande se termine **sans erreur**
- ☑ Un dossier `dist/` est créé à la racine
- ☑ Dedans il y a un `index.html` + un dossier `assets/` avec les JS/CSS bundlés
- ☑ Si la PWA est déjà configurée (Étape 1 du plan), il y a aussi `manifest.webmanifest`, `sw.js`, et les icônes

Si **erreur de build** :
- Lire l'erreur attentivement et la corriger avant de continuer
- Causes fréquentes : import manquant, syntaxe invalide, fichier mal référencé
- Demander à l'utilisateur de partager l'erreur si tu n'arrives pas à la résoudre

---

## Étape 2 — Tester le build en local

```bash
npm run preview
```

Ouvrir l'URL affichée (`http://localhost:4173`) et **tester rapidement** :
- L'app se charge
- On peut naviguer entre les onglets
- Au moins un mini-jeu fonctionne
- Les images/icônes s'affichent

Si tout est OK → on peut déployer.
Si quelque chose est cassé → corriger avant de continuer.

---

## Étape 3 — Pousser les derniers changements sur GitHub

Vérifier qu'il n'y a rien d'oublié à committer :

```bash
git status
```

S'il y a des fichiers modifiés :

```bash
git add .
git commit -m "Préparation du déploiement Vercel"
git push
```

⚠️ **Vérifier que `.gitignore`** contient bien :
```
node_modules
dist
.env
.env.local
```

Sinon ajouter ces lignes au `.gitignore` puis recommitter.

---

## Étape 4 — Création du compte Vercel (action utilisateur)

**Cette étape est à faire par l'utilisateur dans son navigateur**, pas par Claude Code.

Donner ces instructions à l'utilisateur :

1. Aller sur **https://vercel.com**
2. Cliquer **"Sign Up"** (en haut à droite)
3. Choisir **"Continue with GitHub"** → autoriser Vercel à accéder au compte GitHub
4. Vercel demande de remplir un nom d'équipe → mettre par exemple `cookithan` ou n'importe quoi
5. Choisir le plan **"Hobby"** (gratuit, par défaut)
6. Skip les questions optionnelles ("How did you hear about us?" etc.)

L'utilisateur arrive sur le dashboard Vercel.

---

## Étape 5 — Importer le projet (action utilisateur)

Sur le dashboard Vercel :

1. Cliquer **"Add New..."** → **"Project"**
2. Section "Import Git Repository" → trouver **`cookitrader`** dans la liste
3. Si le repo n'apparaît pas → cliquer **"Adjust GitHub App Permissions"** et autoriser l'accès au repo
4. Cliquer **"Import"** à côté de `cookitrader`

Vercel détecte automatiquement que c'est un projet **Vite** ✨

Sur la page de configuration :
- **Project Name** : laisser `cookitrader` (ce sera l'URL : `cookitrader.vercel.app`)
- **Framework Preset** : doit être détecté comme **"Vite"** automatiquement
- **Root Directory** : laisser `./` (par défaut)
- **Build Command** : `npm run build` (par défaut, OK)
- **Output Directory** : `dist` (par défaut, OK)
- **Install Command** : `npm install` (par défaut, OK)
- **Environment Variables** : rien à ajouter (CookiTrader n'utilise pas de backend)

Cliquer le gros bouton **"Deploy"** 🚀

---

## Étape 6 — Attendre le build (1-2 minutes)

Vercel affiche le log de build en temps réel.
Phases :
1. **Cloning** (5s)
2. **Installing dependencies** (30-60s)
3. **Building** (15-30s) → c'est la partie où Vite compile l'app
4. **Deploying** (10s)

Si tout se passe bien → écran de **félicitations** avec confettis 🎉 et lien vers l'app.

L'URL est du type `cookitrader-xxxxx.vercel.app` (le `xxxxx` est aléatoire au début, on va le simplifier).

Cliquer sur le lien → l'app charge depuis Internet 🌐

---

## Étape 7 — Tester l'app en ligne

**Sur PC** :
- Ouvrir l'URL Vercel dans Chrome
- Naviguer dans tous les onglets
- Tester au moins 2 mini-jeux
- Vérifier que les icônes/images s'affichent
- F12 → onglet Console : pas d'erreur rouge

**Sur téléphone** :
- Ouvrir l'URL dans Chrome (Android) ou Safari (iOS)
- Vérifier que c'est fluide
- **Si la PWA est configurée** : tenter d'installer l'app
  - Android : prompt automatique "Ajouter à l'écran d'accueil"
  - iOS : Partager → "Sur l'écran d'accueil"
- L'icône cookie 🍪 doit apparaître sur l'écran d'accueil
- Lancer depuis l'icône → app plein écran

---

## Étape 8 — Personnaliser l'URL (optionnel)

Par défaut Vercel donne `cookitrader-cookithan.vercel.app` ou similaire.
Pour avoir juste **`cookitrader.vercel.app`** (plus court et propre) :

1. Sur le dashboard Vercel, ouvrir le projet **cookitrader**
2. Onglet **"Settings"** (en haut)
3. Sous-onglet **"Domains"** (à gauche)
4. Si `cookitrader.vercel.app` est libre → cliquer "Add" et le réserver
5. Sinon → essayer `cookitrader-app.vercel.app`, `cookitraderapp.vercel.app`, etc.

L'ancien domaine continue de fonctionner aussi (les deux pointent vers la même app).

---

## Étape 9 — Déploiement automatique futur

À partir de maintenant, **chaque `git push`** déclenche un nouveau déploiement automatique sur Vercel.

Workflow :
1. L'utilisateur modifie le code en local (avec ou sans Claude Code)
2. `git add . && git commit -m "..."`
3. `git push`
4. Vercel détecte le push → rebuild → redéploie en ~1 minute
5. La nouvelle version est en ligne automatiquement

**Branches non-`main`** : Vercel crée des **previews** automatiques pour chaque branche, super pratique pour tester sans casser la prod.

---

## Étape 10 — Partager le lien

L'utilisateur peut maintenant :
- ☑ Envoyer le lien à ses amis par SMS, Discord, etc.
- ☑ Le mettre en bio Insta/TikTok
- ☑ L'ajouter au README GitHub

Snippet à ajouter au début du `README.md` du repo :

```markdown
## 🌐 App en ligne

👉 **[cookitrader.vercel.app](https://cookitrader.vercel.app)**

Installable comme app mobile (PWA) sur Android et iOS.
```

---

## Vérifications finales

- ☑ L'app se charge sans erreur sur l'URL Vercel
- ☑ Tous les mini-jeux fonctionnent en ligne
- ☑ Le `localStorage` persiste entre les visites (la progression est gardée)
- ☑ La PWA est installable depuis l'URL HTTPS publique
- ☑ Chaque `git push` déploie automatiquement
- ☑ L'URL est sympa et facile à partager

---

## En cas de problème

**Build qui plante sur Vercel mais marche en local :**
- Différence de version Node : vérifier `package.json` → ajouter `"engines": { "node": ">=18" }`
- Variables d'environnement : à ajouter dans Settings → Environment Variables

**App qui charge mais écran blanc :**
- F12 → Console → lire l'erreur
- Vérifier que les chemins d'icônes sont en absolu (`/icon-192.png`) et pas relatif

**Domaine personnalisé `.com` plus tard :**
- Acheter un domaine (Namecheap ~10€/an)
- Le configurer dans Vercel → Settings → Domains
- Vercel gère le SSL automatiquement

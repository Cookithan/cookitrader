# 🗺️ Roadmap CookiTrader — Ordre des briefs

Voici **l'ordre exact** dans lequel donner les briefs à Claude Code.
Chaque brief doit être **terminé et validé** avant de passer au suivant.

---

## 📋 Les 5 briefs à faire dans l'ordre

| # | Brief | Objectif | Pourquoi maintenant ? |
|---|---|---|---|
| **1** | `BRIEF_AMELIORATIONS.md` | Nouveaux jeux, avatars, profil enrichi, événements, boutique nettoyée | C'est la grosse mise à jour de gameplay. Faut consolider l'app avant tout le reste. |
| **2** | `BRIEF_TUTORIEL.md` | Tour guidé pour les nouveaux joueurs | À faire **après** les améliorations pour que le tuto pointe vers la version finale. |
| **3** | `BRIEF_PWA.md` | Rendre l'app installable sur ton téléphone | L'app est mature, on peut la mettre sur mobile pour la tester en vrai. |
| **4** | `BRIEF_VERCEL.md` | Mettre l'app en ligne (URL publique gratuite) | Tu pourras enfin la partager à tes amis avec un lien. |
| **5** | `BRIEF_SUPABASE.md` | Vrai serveur en ligne pour amis & classement | Une fois l'app déployée, on connecte les vraies fonctionnalités online. |

---

## 🎯 Détail par brief

### 1️⃣ BRIEF_AMELIORATIONS.md (le plus gros)

**6 phases internes, prend plusieurs sessions :**

1. Changement de nom payant (100/250/500/1000 🍪)
2. Nettoyage boutique (retirer 2 skins + 1 titre) + crédit "Réalisé par Cookithan"
3. Préparer le système d'amis (UI seulement, code unique généré, vraie connexion plus tard)
4. Avatars premium (12 base + 8 premium en boutique)
5. Page Profil enrichie (bio, code visible)
6. 3 nouveaux jeux + déblocages par niveau + événements spéciaux

⚠️ La phase **3** crée juste l'UI avec un message "À venir" — la vraie connexion amis arrivera au brief 5.
Pour le **classement**, il reste avec ses bots actuels jusqu'au brief 5 où on les remplace par de vrais utilisateurs.

### 2️⃣ BRIEF_TUTORIEL.md

Tour guidé à 6 étapes (~1 minute) qui apparaît au premier lancement :
- Effet spotlight (cercle découpé dans voile sombre)
- Skippable
- Bulles contextuelles à la 1re ouverture de chaque jeu

### 3️⃣ BRIEF_PWA.md

Configuration PWA :
- Manifest, service worker
- Icônes (les 4 PNG kawaii sont déjà prêtes)
- Bannière d'installation discrète
- Test sur ton tel via Wi-Fi local

### 4️⃣ BRIEF_VERCEL.md

Déploiement gratuit sur Vercel :
- Compte Vercel via GitHub
- Build automatique à chaque push
- URL `cookitrader.vercel.app` partageable
- HTTPS automatique = PWA installable depuis n'importe où

### 5️⃣ BRIEF_SUPABASE.md (le plus technique)

Backend en ligne pour les fonctionnalités sociales :
- Création du projet Supabase (gratuit)
- 2 tables (users, friendships)
- Sync automatique du profil (debounced 5s)
- Vrais amis via codes
- Vrai classement basé sur les utilisateurs réels (remplace les bots)
- Mode offline-first (l'app marche même sans connexion)

⚠️ **Pour ce brief**, l'utilisateur doit créer un compte Supabase manuellement et donner les clés à Claude Code.

---

## ⏱️ Estimation de temps

Ces estimations dépendent de toi (tests, validation visuelle, ajustements demandés à Claude Code) :

| Brief | Sessions estimées |
|---|---|
| 1. Améliorations | 4-6 sessions (une phase à la fois) |
| 2. Tutoriel | 1 session |
| 3. PWA | 1 session |
| 4. Vercel | 1 session courte |
| 5. Supabase | 2-3 sessions |

**Total estimé : ~10 sessions** sur plusieurs semaines.

---

## 🎮 État actuel vs final

### Maintenant
- 5 mini-jeux locaux
- Marché $CKM local
- Boutique avec skins
- Classement avec 29 bots fictifs
- Profil simple
- 100% local (localStorage)
- Pas de mobile, pas de partage

### Après les 5 briefs
- 8 mini-jeux (3 nouveaux ajoutés, déblocables par niveau)
- Événements spéciaux limités dans le temps (1h-4h)
- Avatars premium dessinés à la main
- Profil enrichi avec bio
- Tutoriel guidé pour nouveaux joueurs
- App installable sur écran d'accueil (PWA)
- URL publique partageable
- **Vrais amis** avec d'autres joueurs réels
- **Vrai classement** entre tous les utilisateurs CookiTrader

---

## 💡 Conseils

1. **Une phase à la fois**. Toujours. Ne jamais dire à Claude Code "fais tout le brief" — il va planter.

2. **Commit Git régulièrement**. Après chaque phase validée, fais un `git add . && git commit -m "..." && git push`. Si quelque chose casse plus tard, tu pourras revenir en arrière.

3. **Teste sur petit écran**. Redimensionne ton navigateur en 390px de large régulièrement pour vérifier que rien ne déborde.

4. **Ne saute pas d'étape**. L'ordre des briefs est important — par exemple le tuto doit venir après les améliorations pour pointer vers la bonne version de l'app.

5. **Reviens me voir** entre les briefs si :
   - Tu vois un bug
   - Tu as une nouvelle idée
   - Tu veux que j'ajuste un brief avant de le donner

---

Bon courage ! 🚀☕🍪

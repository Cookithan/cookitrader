# 🚀 BRIEF MASTER — À LIRE EN PREMIER

**Lis ce fichier EN ENTIER avant de toucher à quoi que ce soit.**

---

## 🎯 Mission

Tu vas appliquer **15 briefs** sur l'application **CookiMiner** dans un **ordre précis**. Chaque brief est un fichier `.md` à la racine du projet. **L'ordre est non négociable** car les briefs ont des dépendances entre eux.

---

## 📋 RÈGLES STRICTES

### Règle 1 — Un brief à la fois
- Ne lis JAMAIS plusieurs briefs en avance
- Ne mélange JAMAIS plusieurs briefs en même temps
- Termine **complètement** un brief avant de passer au suivant

### Règle 2 — Une phase à la fois dans chaque brief
- Chaque brief contient plusieurs phases numérotées
- Fais **une seule phase**, attends la validation de l'utilisateur, puis passe à la suivante
- Ne passe PAS à la phase suivante sans validation explicite

### Règle 3 — Commits réguliers
- **Commit après chaque phase validée** avec un message clair
- Format : `git commit -m "feat(brief-XX): [description courte]"`
- Exemples :
  - `feat(fix-reset): supprime les données Supabase au reset`
  - `feat(inbox): création de la table inbox_messages`
  - `feat(audio): ajoute le système de sons UI`

### Règle 4 — Phases SQL sont à faire par l'utilisateur
- Quand un brief demande de créer des tables Supabase (PHASE 1 souvent), tu **affiches le SQL** à l'utilisateur et tu **attends sa confirmation** qu'il l'a exécuté
- Ne tente JAMAIS d'exécuter du SQL toi-même via une API quelconque
- Une fois confirmé, tu passes à la phase suivante

### Règle 5 — Toujours proposer un plan avant de coder
- Avant chaque phase, donne un **plan en puces** de ce que tu vas faire
- Attends la validation de l'utilisateur avec un "ok" ou "go"
- Puis seulement, tu codes

### Règle 6 — Respecter la palette CookiMiner
- ☕ Couleurs : caramel `#D4A017`, moka `#7D4E1F`, café `#4A2C17`, lait `#F5EFE6`
- 🚫 **JAMAIS de rouge ni de vert** (sauf cas extrême comme un panneau d'erreur critique)
- 📱 Mobile-first : tout doit être beau sur 390px de large
- ☕ Tout doit rester dans le thème café

---

## 🗂️ ORDRE EXACT DES BRIEFS À APPLIQUER

⚠️ **Cet ordre est obligatoire** car :
- L'inbox doit être fait AVANT tous les briefs qui y déposent des messages
- Le système d'amis avec demandes doit être fait AVANT le profil visible
- Le marché online doit être fait AVANT le classement marché
- Les stats perso doivent être faites AVANT le tournoi (qui track aussi les cookies)

### 🔧 PHASE A — Fix & Foundation

#### 1. `BRIEF_FIX_RESET.md` 🗑️
- **Rôle** : Corriger un bug — quand un user reset son profil, son ancien compte reste dans Supabase comme un "fantôme"
- **Durée estimée** : 30-45 min
- **Dépendances** : aucune
- **Pourquoi en premier** : nettoie la base avant de tester quoi que ce soit

#### 2. `BRIEF_INBOX.md` 📬
- **Rôle** : Créer une boîte de réception centralisée pour toutes les notifs
- **Durée estimée** : 1h-1h30
- **Dépendances** : aucune
- **Pourquoi en 2** : **TOUS** les briefs suivants y écrivent des messages (cadeaux, tournois, parrainage, réactions). Sans inbox, les autres ne fonctionneront pas.

---

### 👥 PHASE B — Réseau social

#### 3. `BRIEF_DEMANDES_AMIS.md` 👥
- **Rôle** : Système d'amis bilatéral (demande → acceptation)
- **Durée estimée** : 1h-1h30
- **Dépendances** : inbox

#### 4. `BRIEF_PROFIL_VISIBLE.md` 👤
- **Rôle** : Voir le profil d'un ami / du top 1 du classement
- **Durée estimée** : 1h-1h30
- **Dépendances** : demandes amis

#### 5. `BRIEF_REACTIONS.md` 💬
- **Rôle** : Envoyer des emojis (👏 ☕ 🔥 🍪) sur le profil d'un ami
- **Durée estimée** : 45 min
- **Dépendances** : profil visible + inbox

---

### 🏅 PHASE C — Engagement

#### 6. `BRIEF_BADGES_SECRETS.md` 🏅
- **Rôle** : 3 badges cachés (Noctambule, Investisseur, Amical)
- **Durée estimée** : 1h
- **Dépendances** : aucune

#### 7. `BRIEF_STATS_PERSO.md` 📊
- **Rôle** : Page "Mes stats" hebdomadaires + records permanents
- **Durée estimée** : 1h-1h30
- **Dépendances** : aucune (mais **PRÉ-REQUIS pour tournoi**)

#### 8. `BRIEF_AUDIO.md` 🔊
- **Rôle** : Sons UI + musiques d'ambiance (Jazz gratuit + 3 boutique + pack premium)
- **Durée estimée** : 2h
- **Dépendances** : aucune
- ⚠️ **Phase 0** : l'utilisateur doit récupérer les fichiers audio sur Pixabay AVANT de commencer

---

### 📈 PHASE D — Marché spéculatif

#### 9. `BRIEF_MARCHE_ONLINE.md` 📈
- **Rôle** : Transformer le marché local en marché online avec offre/demande
- **Durée estimée** : 2-3h (gros morceau, 8 phases)
- **Dépendances** : aucune

#### 10. `BRIEF_CLASSEMENT_MARCHE.md` 🏆
- **Rôle** : 3ème onglet dans le classement (par valeur du portfolio)
- **Durée estimée** : 1h
- **Dépendances** : marché online

#### 11. `BRIEF_TOURNOI.md` 🏆
- **Rôle** : Tournoi du week-end (samedi 0h → dimanche 23h59)
- **Durée estimée** : 1h-1h30
- **Dépendances** : stats perso + inbox

---

### 🎁 PHASE E — Croissance & polish

#### 12. `BRIEF_CADEAUX_AMIS.md` 🎁
- **Rôle** : Offrir 50 🍪 ou 1 ☕ à un ami (max 3/jour)
- **Durée estimée** : 45 min
- **Dépendances** : inbox + système d'amis

#### 13. `BRIEF_PARRAINAGE.md` 🎁
- **Rôle** : Code parrainage (filleul reçoit 200 🍪 + 1 ☕, parrain reçoit 500 🍪 + 1 ☕ au niveau 3)
- **Durée estimée** : 1h-1h30
- **Dépendances** : inbox

#### 14. `BRIEF_RESTAURATION.md` 🔄
- **Rôle** : Récupérer son profil sur un nouveau téléphone via son code
- **Durée estimée** : 45 min
- **Dépendances** : aucune

#### 15. `BRIEF_A_PROPOS.md` 📜
- **Rôle** : Page À propos avec version, changelog, stats globales communauté
- **Durée estimée** : 30 min
- **Dépendances** : optionnel — tous les autres pour avoir un changelog complet
- **À faire en dernier** : c'est la cherry on top

---

## ⏱️ ESTIMATION TOTALE

**~16-20 heures** sur 1-2 semaines.

L'utilisateur peut faire **2-3 briefs par soirée** s'il est motivé.

---

## 🚀 COMMENT COMMENCER

Quand l'utilisateur dit **"on commence"** ou **"go"** :

1. Tu réponds : **"OK, je commence par le BRIEF #1 — BRIEF_FIX_RESET.md. Je le lis et te propose un plan en puces."**
2. Tu lis intégralement `BRIEF_FIX_RESET.md`
3. Tu donnes un plan synthétique en puces
4. Tu attends son "ok"
5. Tu fais la **phase 1**, attends validation, commit
6. Tu fais la **phase 2**, attends validation, commit
7. Etc.
8. Une fois le brief #1 terminé, tu dis : **"Brief #1 terminé. Veux-tu que j'enchaîne sur le BRIEF #2 — BRIEF_INBOX.md ?"**
9. Tu n'attaque JAMAIS le brief suivant sans confirmation

---

## 🛡️ EN CAS DE DOUTE

- **Si une instruction est ambiguë** → demande à l'utilisateur, ne devine pas
- **Si quelque chose plante** → arrête tout, rollback au dernier commit, explique le problème
- **Si tu vois un conflit avec du code existant** → signale-le AVANT de modifier
- **Si tu n'es pas sûr de l'ordre des briefs** → relis ce fichier (le brief master)
- **Si l'utilisateur veut sauter un brief** → préviens-le des conséquences sur les briefs suivants

---

## 🎨 RAPPEL PALETTE

```
Caramel doré :  #D4A017  ← couleur principale (boutons d'action, accents)
Caramel foncé : #C17F3C  ← gradients, hover
Moka :          #7D4E1F  ← boutons secondaires, indicateurs négatifs
Café :          #4A2C17  ← arrière-plans foncés
Espresso :      #2C1810  ← textes principaux
Lait beige :    #F5EFE6  ← arrière-plan général
Crème :         #E8DDD0  ← bordures, séparateurs
Sable :         #8B6A5A  ← textes secondaires
```

⚠️ Si tu hésites sur une couleur, prends-en une dans cette liste. Ne JAMAIS introduire de rouge (#FF... avec composante rouge dominante) ou de vert (#00...).

---

## 📝 STYLE DES COMMITS

Format recommandé pour Git :

```
feat(brief-XX-name): [description claire]
fix(brief-XX-name): [bug corrigé]
docs(brief-XX-name): [docs ajoutées]
```

Exemples concrets :
- `feat(inbox): création de la table inbox_messages SQL`
- `feat(inbox): module src/lib/inbox.js avec fonctions de base`
- `feat(inbox): bouton inbox avec compteur non lus`
- `feat(inbox): modal slide depuis le bas`
- `feat(profile-visible): fonction getPublicProfile dans supabaseSync`
- `fix(reset): suppression des amitiés inversées au reset`

Comme ça l'utilisateur voit clairement la progression dans son `git log`.

---

## ✅ CHECKLIST AVANT DE COMMENCER

Avant de dire "ok je commence", vérifie que tu as :

- [ ] Lu **ce fichier en entier** (le brief master)
- [ ] Compris l'ordre des 15 briefs
- [ ] Compris les **6 règles strictes**
- [ ] Identifié que la **PHASE 1 SQL** des briefs est à faire par l'utilisateur
- [ ] Compris la **palette café** (pas de rouge/vert)
- [ ] Compris qu'il faut un **commit après chaque phase validée**

Si tout est ok, dis à l'utilisateur :

**"J'ai lu le BRIEF_MASTER. J'ai compris l'ordre des 15 briefs et les règles. Quand tu veux, je commence par le BRIEF #1 (BRIEF_FIX_RESET.md). Dis 'go' et je propose un plan."**

---

## 🍪 BON COURAGE

L'utilisateur (Cookithan) a bossé super dur sur cette app. Sois rigoureux, soigné, et fais du travail propre. Pas de précipitation. 

Une fois les 15 briefs appliqués, **CookiMiner sera une vraie app mobile sociale complète**. C'est le projet de quelqu'un de passionné, traite-le comme tel. ☕

À toi de jouer !

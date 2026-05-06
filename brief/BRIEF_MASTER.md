# CookiMiner — Brief Master 🍪☕
# Lis bien le CLAUDE.md avant de commencer.
# IMPORTANT : Fais UNE phase à la fois. Après chaque phase, arrête-toi
# et attends que l'utilisateur vérifie dans le navigateur avant de continuer.

---

# ══════════════════════════════════════════════
# PHASE 1 — 40 questions Quiz + système de difficulté
# ══════════════════════════════════════════════
# Faire en premier car c'est le changement le plus isolé et le moins risqué.

## 1A — Remplacer le tableau QUESTIONS

Remplacer le tableau QUESTIONS existant par celui-ci :

const QUESTIONS = [

  // FACILE (reward: 20)
  { q:"De quelle couleur est un espresso bien préparé ?", choices:["Noir avec une mousse dorée","Blanc","Marron clair","Bleu"], answer:0, reward:20, difficulty:'Facile' },
  { q:"Qu'est-ce qu'un cappuccino ?", choices:["Un café avec de la crème fouettée","Un café avec du lait moussé en parts égales","Un café glacé","Un café sans sucre"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quelle est la forme classique d'un cookie américain ?", choices:["Carré","Triangulaire","Rond et plat","En forme d'étoile"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Quel ingrédient donne son goût amer au café ?", choices:["Le sucre","La caféine","Le lait","La vanille"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Le café pousse sur quel type de plante ?", choices:["Un arbre fruitier","Un arbuste","Une liane","Un cactus"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quelle boisson contient du café et du lait chaud ?", choices:["Thé au lait","Café au lait","Chocolat chaud","Limonade"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quel est l'ingrédient principal d'un cookie classique ?", choices:["Farine, beurre, sucre","Lait, œufs, sel","Levure, eau, miel","Cacao, crème, fécule"], answer:0, reward:20, difficulty:'Facile' },
  { q:"À quelle température boit-on un café chaud idéalement ?", choices:["20-30°C","40-50°C","60-70°C","90-100°C"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Qu'est-ce qu'un décaféiné ?", choices:["Un café très fort","Un café dont la caféine a été retirée","Un café sucré","Un café froid"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Les pépites dans un cookie au chocolat sont faites de ?", choices:["Caramel durci","Chocolat","Noisettes","Sucre caramélisé"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Que signifie 'latte' en italien ?", choices:["Café","Lait","Crème","Sucre"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quel pays est le plus grand producteur de café au monde ?", choices:["Colombie","Éthiopie","Brésil","Vietnam"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Un cookie 'chewy' est un cookie ?", choices:["Très dur et croquant","Moelleux et fondant","Sans sucre","Salé"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Comment appelle-t-on la mousse crémeuse sur un espresso ?", choices:["Mousse","Crema","Écume","Latte"], answer:1, reward:20, difficulty:'Facile' },

  // MOYEN (reward: 35)
  { q:"Quelle est la différence entre un Arabica et un Robusta ?", choices:["L'Arabica est plus amer et fort","L'Arabica est plus doux et aromatique","Le Robusta est plus cher","Il n'y a aucune différence"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Le 'cold brew' se prépare comment ?", choices:["Café versé sur des glaçons","Infusion à froid pendant 12-24h","Espresso refroidi au réfrigérateur","Café mixé avec de la glace"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quel est le rôle du beurre dans un cookie ?", choices:["Donner du croquant uniquement","Apporter du moelleux, du goût et lier les ingrédients","Remplacer les œufs","Faire lever la pâte"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"D'où vient originellement le mot 'cookie' ?", choices:["De l'anglais 'cook'","Du néerlandais 'koekje' (petit gâteau)","Du français 'coquille'","De l'italien 'cucina'"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Qu'est-ce qu'un 'flat white' ?", choices:["Un café allongé à l'eau","Un espresso avec peu de lait micro-moussé","Un café froid avec crème","Un café sans mousse"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Pourquoi met-on du sel dans les cookies ?", choices:["Pour les conserver plus longtemps","Pour équilibrer et rehausser le goût sucré","Pour les rendre croustillants","C'est une erreur de recette"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Le café Kopi Luwak est célèbre pour quoi ?", choices:["C'est le café le moins cher du monde","Il est produit à partir de grains digérés par une civette","Il contient 3x plus de caféine","Il pousse uniquement en France"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quelle farine est généralement utilisée pour les cookies ?", choices:["Farine de riz","Farine de blé tout usage","Farine de maïs","Farine de seigle"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Qu'est-ce que le 'latte art' ?", choices:["Une marque de café","Des dessins créés dans la mousse de lait","Un type de café glacé","La décoration du café en boutique"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Un cookie 'snickerdoodle' est parfumé à quoi ?", choices:["Chocolat et noisette","Cannelle et sucre","Citron et pavot","Vanille et noix de coco"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Combien de grammes de caféine contient un espresso moyen ?", choices:["5-10 mg","60-80 mg","150-200 mg","300 mg"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Qu'est-ce que le 'bloom' lors de la préparation d'un café filtre ?", choices:["La couleur du café dans la tasse","Un pré-mouillage du café pour libérer le CO2","Le bruit de la machine","L'écume qui se forme"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quel sucre donne un goût de caramel et d'humidité aux cookies ?", choices:["Sucre blanc","Sucre roux (cassonade)","Sucre glace","Sirop d'érable"], answer:1, reward:35, difficulty:'Moyen' },

  // EXPERT (reward: 60)
  { q:"Qu'est-ce que la 'troisième vague' du café ?", choices:["La 3e tasse de la journée","Un mouvement qui traite le café comme un produit artisanal de terroir","Une technique d'extraction à la vague","Le 3e pays producteur mondial"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quel est le ratio idéal café/eau pour un espresso classique ?", choices:["1:1","1:2 (1g café pour 2g d'eau)","1:10","1:20"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Que signifie 'single origin' sur un sac de café ?", choices:["Le café vient d'une seule plantation ou région","Le café n'a qu'une seule torréfaction","Il y a un seul grain par tasse","C'est un café bio certifié"], answer:0, reward:60, difficulty:'Expert' },
  { q:"Pourquoi réfrigérer la pâte à cookies avant cuisson ?", choices:["Pour accélérer la cuisson","Pour solidifier le beurre et développer les arômes","Pour éviter que ça colle","C'est une légende, ça ne change rien"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quel processus de traitement des grains donne des notes fruitées ?", choices:["Le processus lavé (washed)","Le processus naturel (natural)","La torréfaction claire","Le processus honey"], answer:1, reward:60, difficulty:'Expert' },
  { q:"La réaction de Maillard dans un cookie, c'est quoi ?", choices:["La fonte du chocolat à haute température","La réaction entre sucres et protéines qui crée la couleur dorée","La levée de la pâte au four","La cristallisation du sucre en refroidissant"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Qu'est-ce que le 'dialing in' chez un barista ?", choices:["Appeler le fournisseur de café","Ajuster finement la mouture et le temps d'extraction","Nettoyer la machine espresso","Peser les doses de café"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quel acide est principalement responsable de l'acidité d'un café ?", choices:["Acide sulfurique","Acide chlorogénique","Acide citrique","Acide acétique"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Pourquoi utilise-t-on levure chimique ET bicarbonate dans certains cookies ?", choices:["Pour doubler la levée","Bicarbonate pour l'étalement/dorure, levure pour la hauteur","C'est redondant","Pour neutraliser l'acidité du cacao"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Le SCA note le café sur combien de points ?", choices:["50 points","100 points","10 points","200 points"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Qu'est-ce qu'un café 'specialty' selon le SCA ?", choices:["Un café vendu en boutique spécialisée","Un café qui obtient plus de 80/100 à la dégustation","Un café bio et équitable","Un café d'une seule variété"], answer:1, reward:60, difficulty:'Expert' },
];

## 1B — Modifier le composant QuizGame

- La récompense vient de `q.reward` (plus de valeur fixe)
- Afficher un badge de difficulté en haut de la question :
  - Facile → fond `#E5B040` texte blanc
  - Moyen  → fond `#C17F3C` texte blanc
  - Expert → fond `#4A2C17` texte blanc
- Bonne réponse  → fond `#FBEFD4` bordure `#D4A017` (jamais de vert)
- Mauvaise réponse → fond `#E8DCC8` bordure `#6B3D20` (jamais de rouge)
- Mettre à jour le reward affiché dans GAMES : "20 à 60 cookies"

## ✅ STOP — Vérifier dans le navigateur avant de continuer
- Le quiz affiche bien le badge de difficulté ?
- La récompense change selon la question tirée ?
- Les couleurs de feedback sont bien caramel/moka ?

---

# ══════════════════════════════════════════════
# PHASE 2 — Onboarding premier lancement
# ══════════════════════════════════════════════
# Ne commencer qu'après validation de la Phase 1.

## Objectif
Afficher une modal de bienvenue uniquement au tout premier lancement
(détecté par l'absence de clé 'cookiminer_save' dans localStorage,
ou si `userName` est vide/null dans le save).

## Composant OnboardingModal

Créer un composant `OnboardingModal({ onComplete })` avec 3 étapes.
Il s'affiche par-dessus tout (z-index 200), fond noir semi-transparent.

### Étape 1 — Bienvenue + saisie du prénom
- Grand emoji ☕ animé (float-anim)
- Titre : "Bienvenue dans CookiMiner !"
- Sous-titre : "L'app qui récompense ta passion pour le café et les cookies"
- Champ texte : "Comment t'appelles-tu ?" (placeholder: "Ton prénom...")
- Bouton "Suivant →" en gradient GOLD (désactivé si champ vide)

### Étape 2 — Choix de l'avatar
- Titre : "Choisis ton avatar"
- Grille 4×3 de 12 avatars SVG simples (cercle coloré gradient ESPRESSO
  avec un grand emoji centré dedans) :
  ☕ 🍪 👨‍🍳 🫖 🍫 🥐 🎨 🌱 🧁 🍮 🎩 💎
- Tap sur un avatar = sélectionné (bordure dorée qui pulse)
- Bouton "Suivant →" en gradient GOLD

### Étape 3 — Explication rapide
- 3 cartes horizontales empilées, chacune avec une icône + texte :
  - 🎮 "Joue chaque jour — Check-in, Quiz, Roue, Défi de clics"
  - 🍪 "Gagne des cookies — Et monte de niveau pour débloquer la boutique"
  - 📈 "Investis sur le marché — Fais fructifier tes cookies en $CKM"
- Bouton "C'est parti ! 🍪" en gradient GOLD (glow-anim)
- Au clic : appelle `onComplete(prenom, avatarIndex)`

## Intégration dans CookiMiner

- Ajouter state `showOnboarding` initialisé à `true` si `save?.userName` est vide ou null, sinon `false`
- Afficher `<OnboardingModal onComplete={(name, avatar) => { setUserName(name); setUserAvatar(avatar); setShowOnboarding(false); }} />` si `showOnboarding === true`
- `joinDate` fixé à `new Date().toLocaleDateString('fr-FR')` si pas déjà dans le save

## ✅ STOP — Vérifier dans le navigateur avant de continuer
- La modal apparaît bien au premier lancement ?
- Les 3 étapes s'enchaînent bien ?
- Le prénom et l'avatar sont bien sauvegardés ?
- Si on rafraîchit après l'onboarding, la modal ne réapparaît pas ?

---

# ══════════════════════════════════════════════
# PHASE 3 — Badge sur l'onglet Jeux
# ══════════════════════════════════════════════
# Très simple, ne commencer qu'après Phase 2 validée.

## Objectif
Indiquer visuellement dans la nav qu'une activité est disponible.

## Implémentation

Dans la nav du bas, sur le bouton "Jeux" :
- Si `canCheckin || canQuiz` → afficher un petit point doré en position absolue
  en haut à droite de l'icône Gamepad2
- Le point : width 8px, height 8px, borderRadius 50%, background `#D4A017`
  + animation `pulse-ring` (déjà dans le CSS global)
- Disparaît automatiquement quand `canCheckin` et `canQuiz` sont tous les deux faux

## ✅ STOP — Vérifier dans le navigateur avant de continuer
- Le point doré apparaît bien sur l'icône Jeux ?
- Il pulse bien ?
- Il disparaît après avoir fait le check-in ET le quiz ?

---

# ══════════════════════════════════════════════
# PHASE 4 — Achievements (succès surprises)
# ══════════════════════════════════════════════
# Ne commencer qu'après Phase 3 validée.

## Données — tableau ACHIEVEMENTS

Ajouter ce tableau constant près de REWARDS :

const ACHIEVEMENTS = [
  { id:'first_cookie',   name:'Premier Cookie !',   desc:'Tu as gagné ton premier cookie',          emoji:'🌱', bonus:5  },
  { id:'first_purchase', name:'Premier Achat !',    desc:'Tu as débloqué ton premier item boutique', emoji:'🛍️', bonus:10 },
  { id:'streak_3',       name:'En Route !',         desc:'3 jours de check-in consécutifs',          emoji:'🔥', bonus:15 },
  { id:'streak_7',       name:'En Feu !',           desc:'7 jours de check-in consécutifs',          emoji:'💥', bonus:30 },
  { id:'jackpot',        name:'Gros Lot !',         desc:'Tu as touché +200 à la roue',              emoji:'🎰', bonus:50 },
  { id:'clics_50',       name:'Éclair !',           desc:'Plus de 50 clics en 10 secondes',          emoji:'⚡', bonus:20 },
  { id:'level_3',        name:'En Progression !',   desc:'Tu as atteint le niveau 3',                emoji:'⭐', bonus:25 },
  { id:'level_6',        name:'Légende !',          desc:'Tu as atteint le niveau maximum',          emoji:'👑', bonus:100 },
  { id:'trader',         name:'Trader !',           desc:'Tu as investi 500 cookies en $CKM',        emoji:'💹', bonus:40 },
  { id:'rich',           name:'Riche !',            desc:'Tu as atteint 500 cookies simultanément',  emoji:'💰', bonus:30 },
];

## State à ajouter dans CookiMiner

- `earnedAchievements: []` — IDs des achievements déjà débloqués (à persister dans localStorage)
- `pendingAchievement: null` — achievement à afficher en modal (ne pas persister)

## Composant AchievementModal

Composant `AchievementModal({ achievement, onCollect })` :
- Overlay z-index 90 (sous LevelUpModal qui est à 100)
- Carte centrée avec animation bounceIn, gradient ESPRESSO
- Grand emoji (achievement.emoji) avec wiggle-anim
- "🏆 Succès débloqué !" en petit texte caramel
- Nom du succès en gros blanc
- Description en grisé
- Bonus : "+X 🍪" en doré
- Bouton "Récupérer !" gradient GOLD avec glow-anim
- Au clic : `addCoins(achievement.bonus)` + `onCollect()`

## Logique de déclenchement

Créer une fonction `checkAchievements(context)` appelée après chaque action importante.
`context` est un objet avec les valeurs actuelles : `{ coins, totalEarned, streak, clickRecord, unlocked, earnedAchievements, level }`.

La fonction retourne l'ID du premier achievement non encore gagné qui est maintenant rempli, ou null.

Conditions de déclenchement :
- `first_cookie`   → `totalEarned >= 1`
- `first_purchase` → `unlocked.length >= 1`
- `streak_3`       → `streak >= 3`
- `streak_7`       → `streak >= 7`
- `jackpot`        → déclenché manuellement dans SpinGame quand result.value === 200
- `clics_50`       → `clickRecord > 50`
- `level_3`        → `level >= 3`
- `level_6`        → `level >= 6`
- `trader`         → déclenché manuellement dans le marché quand total investi >= 500
- `rich`           → `coins >= 500`

Appeler `checkAchievements` dans `useEffect` qui écoute : `[totalEarned, streak, clickRecord, unlocked, level, coins]`

Quand un achievement est détecté :
1. Ajouter son ID dans `earnedAchievements`
2. Mettre `pendingAchievement` = l'objet achievement
3. Afficher `<AchievementModal>`

## Section Achievements sur le profil

Dans `ProfilTab` (si elle existe) ou créer une section sur l'onglet Accueil :
- Titre "Mes Succès 🏆"
- Grille des achievements : débloqués en couleur, non débloqués en grisé avec 🔒
- Chaque carte : emoji + nom + description + bonus

## ✅ STOP — Vérifier dans le navigateur avant de continuer
- Gagner un cookie → modal "Premier Cookie" apparaît ?
- La modal se ferme et donne bien le bonus ?
- Le même achievement ne se déclenche pas deux fois ?
- Les achievements s'affichent sur le profil ?

---

# ══════════════════════════════════════════════
# PHASE 5 — Boutique complète
# ══════════════════════════════════════════════
# Ne commencer qu'après Phase 4 validée.
# C'est la phase la plus longue — faire étape par étape.

## 5A — Nouveau tableau REWARDS complet

Remplacer le tableau REWARDS par :

const REWARDS = [
  // BADGES
  { id:'badge_debutant',    name:'Badge Débutant',    desc:'Premier pas dans CookiMiner',    cost:30,   type:'Badge', emoji:'🌱', levelRequired:1 },
  { id:'badge_curieux',     name:'Badge Curieux',     desc:'Toujours en quête de savoir',    cost:80,   type:'Badge', emoji:'🔍', levelRequired:1 },
  { id:'badge_barista',     name:'Badge Barista',     desc:'Maîtrise de base du café',       cost:120,  type:'Badge', emoji:'☕', levelRequired:2 },
  { id:'badge_explorateur', name:'Badge Explorateur', desc:'Pour les curieux qui vont loin', cost:150,  type:'Badge', emoji:'🗺️', levelRequired:2 },
  { id:'badge_alchimiste',  name:'Badge Alchimiste',  desc:'Transforme tout en or',          cost:450,  type:'Badge', emoji:'⚗️', levelRequired:4 },
  { id:'badge_chef',        name:'Badge Chef',        desc:'Pour les acharnés du cookie',    cost:500,  type:'Badge', emoji:'👨‍🍳', levelRequired:5 },
  { id:'badge_legende',     name:'Badge Légende',     desc:'Le summum de CookiMiner',        cost:1000, type:'Badge', emoji:'👑', levelRequired:6 },
  // TITRES
  { id:'titre_grand_cru',    name:'Titre "Grand Cru"',        desc:'Affichez votre prestige', cost:200,  type:'Titre', emoji:'🏅', levelRequired:2 },
  { id:'titre_torrefacteur', name:'Titre "Torréfacteur"',     desc:'Maîtrise du feu',         cost:250,  type:'Titre', emoji:'🏆', levelRequired:3 },
  { id:'titre_maestro',      name:'Titre "Maestro"',          desc:'Au sommet de l\'art',     cost:700,  type:'Titre', emoji:'🎯', levelRequired:5 },
  { id:'titre_legende',      name:'Titre "Légende du Cookie"',desc:'Le titre ultime',         cost:1500, type:'Titre', emoji:'✨', levelRequired:6 },
  // THÈMES
  { id:'theme_creme',      name:'Thème Crème Vanille',   desc:'Fond crème doux et chaud',    cost:80,   type:'Thème', emoji:'🍦', levelRequired:1 },
  { id:'theme_espresso',   name:'Thème Nuit Espresso',   desc:'Fond sombre café',            cost:300,  type:'Thème', emoji:'🌙', levelRequired:2 },
  { id:'theme_caramel',    name:'Thème Caramel Sunrise', desc:'Dégradé chaud animé',         cost:450,  type:'Thème', emoji:'🌅', levelRequired:3 },
  { id:'theme_chocolat',   name:'Thème Chocolat Noir',   desc:'Fond brun intense',           cost:600,  type:'Thème', emoji:'🍫', levelRequired:4 },
  { id:'theme_legendaire', name:'Thème Légendaire',      desc:'Fond doré avec particules',   cost:1200, type:'Thème', emoji:'💫', levelRequired:6 },
  // CADRES
  { id:'cadre_cookie',  name:'Cadre Cookie',    desc:'Bordure dorée simple',         cost:200, type:'Cadre', emoji:'🍪', levelRequired:1 },
  { id:'cadre_latte',   name:'Cadre Latte Art', desc:'Bordure avec motif latte',     cost:400, type:'Cadre', emoji:'🎨', levelRequired:3 },
  { id:'cadre_premium', name:'Cadre Or Massif', desc:'Bordure dorée animée épaisse', cost:800, type:'Cadre', emoji:'✨', levelRequired:5 },
  // SKINS COOKIE
  { id:'skin_glace',    name:'Cookie Glacé',      desc:'Glaçage blanc brillant',      cost:150,  type:'Skin', emoji:'🍦', levelRequired:2 },
  { id:'skin_chocolat', name:'Cookie Chocolat',   desc:'Tout chocolat avec éclats',   cost:250,  type:'Skin', emoji:'🍫', levelRequired:3 },
  { id:'skin_dore',     name:'Cookie Doré',       desc:'Brillance animée',            cost:700,  type:'Skin', emoji:'⭐', levelRequired:5 },
  { id:'skin_legende',  name:'Cookie Légendaire', desc:'Cookie qui pulse en caramel', cost:1500, type:'Skin', emoji:'💎', levelRequired:6 },
  // SKINS ROUE
  { id:'roue_chocolat', name:'Roue Chocolat',   desc:'Segments cacao et moka profond', cost:200,  type:'Roue', emoji:'🍫', levelRequired:2 },
  { id:'roue_caramel',  name:'Roue Caramel',    desc:'Tons dorés et ambrés chauds',   cost:350,  type:'Roue', emoji:'🍯', levelRequired:3 },
  { id:'roue_vanille',  name:'Roue Vanille',    desc:'Segments crème et beige doux',  cost:500,  type:'Roue', emoji:'🍦', levelRequired:4 },
  { id:'roue_legende',  name:'Roue Légendaire', desc:'Or massif avec effet brillant', cost:1000, type:'Roue', emoji:'👑', levelRequired:6 },
];

## 5B — Système de niveaux requis dans BoutiqueTab

- `level >= levelRequired` ET `coins >= cost` → bouton achat actif + pulse-ring doré
- `level >= levelRequired` ET `coins < cost` → 🔒 + prix en moka
- `level < levelRequired` → carte grisée + 🔒 + "Niveau X requis" en `#D4A017`
- Débloqué → "✓ Débloqué" en caramel, pas de bouton

Trier : débloqués en premier, puis levelRequired croissant, puis cost croissant.

Filtres pills : Tous / Badge / Titre / Thème / Cadre / Skin / Roue

Message bas : "Monte de niveau pour débloquer plus de récompenses ! ☕"

## 5C — States à ajouter dans CookiMiner

- `activeTheme` (string, défaut '')
- `activeSkin`  (string, défaut '')
- `activeRoue`  (string, défaut '')
- `activeCadre` (string, défaut '')

Tous à persister dans localStorage.

## 5D — Appliquer les thèmes visuels

Un seul thème actif à la fois. Bouton Activer/Désactiver dans la boutique.

Palettes :
- theme_creme      → bg:'#FDFAF0' card:'#FFFEF8'
- theme_espresso   → bg:'#0F0804' card:'#1E100A' (intégrer avec le dark existant)
- theme_caramel    → bg:'linear-gradient(160deg,#F5DEB3,#E8A045)' avec gradient-anim
- theme_chocolat   → bg:'#1A0F08' card:'#2D1A0E' text:'#F0E6D3'
- theme_legendaire → bg:'#1A1200' card:'#2A1E00' + particules dorées flottantes (3-4 emojis ✨ en position absolue avec float-anim)

## 5E — Skins cookie dans ClickGame

Passer `activeSkin` en prop à ClickGame.
- Défaut      → SVG actuel inchangé
- skin_glace  → ajouter ellipse blanche `rgba(255,255,255,0.55)` sur le dessus + petit reflet
- skin_chocolat → fill '#3D1C02' + pépites '#1A0A00'
- skin_dore   → fill '#D4A017' + glow-anim sur le SVG entier
- skin_legende → fill alterne '#D4A017'/'#C17F3C' via gradientShift

## 5F — Skins roue dans SpinGame

Passer `activeRoue` en prop à SpinGame.
Créer ROUE_PALETTES :
- défaut      → ['#4A2C17','#C17F3C','#6B3D20','#D4A017','#A0784E','#E5B040','#2D1810','#F0C050','#F5DC8A']
- roue_chocolat→ ['#1A0A00','#3D1C02','#2D1200','#5C2E0A','#4A1E06','#6B3A10','#0F0600','#7A4818','#8B5520']
- roue_caramel → ['#C17F3C','#D4A017','#B8860B','#E5B040','#C8960C','#F0C050','#A07830','#F5DC8A','#FFE4A0']
- roue_vanille → ['#E8DCC8','#F0E6D3','#DDD0B8','#FDFAF6','#EDE0C8','#F5EFE6','#D4C4A8','#FFFEF8','#FFF8EC']
- roue_legende → ['#8B6914','#D4A017','#A07820','#F0C050','#C8960C','#F5DC8A','#6B5010','#FFE4A0','#FFF0C0']
  + ctx.shadowColor='rgba(212,160,23,0.6)' ctx.shadowBlur=8 sur chaque segment

## 5G — Cadres sur le profil et carte niveau

Un seul cadre actif. Bouton Activer/Désactiver.
- cadre_cookie  → border '3px solid #D4A017'
- cadre_latte   → border '3px solid #C17F3C'
- cadre_premium → border '4px solid #D4A017' + glow-anim

## ✅ STOP — Vérifier dans le navigateur avant de terminer
- Tous les items s'affichent avec le bon état (verrouillé niveau / verrouillé coins / achetable / débloqué) ?
- Les filtres fonctionnent ?
- Activer un thème change bien le fond de l'app ?
- Activer un skin cookie change bien le cookie dans le défi ?
- Activer un skin roue change bien les couleurs des segments ?
- Les cadres s'affichent sur la carte profil/niveau ?
- Tout est sauvegardé dans localStorage (rafraîchir = tout reste) ?

---

# ══════════════════════════════════════════════
# RAPPELS GLOBAUX POUR TOUTES LES PHASES
# ══════════════════════════════════════════════

- Tout reste dans App.jsx (sauf si > 1200 lignes → proposer de découper)
- Pas de TypeScript, pas de nouvelles dépendances npm
- Pas de rouge ni de vert — palette café uniquement
- Mobile-first : tout doit être beau sur 390px de large
- Bandeau ══════ pour chaque nouvelle section
- Styles inline partout sauf keyframes dans le bloc <style> existant
- Après chaque phase : tester dans le navigateur AVANT de passer à la suite

# Brief Master v2 — Améliorations CookiTrader 🚀

Lis bien le CLAUDE.md avant de commencer.
**Important : fais UNE phase à la fois. Après chaque phase, arrête-toi et attends que l'utilisateur valide visuellement avant de passer à la suite.**

Six phases au total, ordonnées du plus simple au plus complexe :

1. **Changement de nom payant**
2. **Nettoyage boutique + crédit Cookithan**
3. **Système d'amis** avec codes
4. **Avatars premium** + refonte sélecteur
5. **Page Profil enrichie**
6. **3 nouveaux jeux + déblocages par niveau + événements spéciaux**

---

# ══════════════════════════════════════════════
# PHASE 1 — Changement de nom payant 💰
# ══════════════════════════════════════════════

## Objectif
Permettre à l'utilisateur de changer son `userName` en payant en cookies, avec un prix qui augmente à chaque changement.

## State à ajouter
```js
const [nameChangeCount, setNameChangeCount] = useState(save?.nameChangeCount ?? 0);
```
À persister dans localStorage avec les autres states.

## Tarif
```js
const NAME_CHANGE_PRICES = [100, 250, 500, 1000];
function getNameChangePrice(count) {
  return NAME_CHANGE_PRICES[Math.min(count, NAME_CHANGE_PRICES.length - 1)];
}
```
- 1er changement (count=0) → 100 🍪
- 2e (count=1) → 250 🍪
- 3e (count=2) → 500 🍪
- 4e et + → 1000 🍪 (plafonné)

Le **premier nom** lors de l'onboarding est gratuit.

## Composant `ChangeNameModal`
Modal accessible depuis le **Profil** via bouton "Modifier mon prénom" :
- Affichage du nom actuel
- Champ texte (max 20 caractères)
- Affichage **bien visible** du prix : "Coût : XX 🍪"
- Si pas assez de cookies → bouton désactivé en moka
- Boutons : "Annuler" (discret) et "Confirmer pour XX 🍪" (gradient GOLD)
- À la confirmation : `spendCoins(price)`, `setUserName(newName)`, `setNameChangeCount(c => c + 1)`

Si `nameChangeCount > 0`, afficher en plus :
> "💡 Prochain changement : 250 🍪"

## Vérifications
- ☑ Le bouton apparaît dans le Profil
- ☑ Le prix affiché est bien 100 puis 250 puis 500 puis 1000
- ☑ Cookies décrémentés correctement
- ☑ Le nom change partout dans l'app
- ☑ Compteur persiste entre sessions

---

# ══════════════════════════════════════════════
# PHASE 2 — Nettoyage boutique + crédit Cookithan 🧹
# ══════════════════════════════════════════════

## Objectif A — Réduire la boutique

L'utilisateur trouve la boutique trop chargée. Retirer :
- Les **skins cookies rares** (garder seulement 2)
- Quelques **titres** trop intermédiaires

### Skins cookies à GARDER (2 maximum)
```
{ id:'skin_chocolat', name:'Cookie Chocolat', desc:'Tout chocolat avec éclats', cost:250, type:'Skin', emoji:'🍫', levelRequired:3 },
{ id:'skin_dore',     name:'Cookie Doré',     desc:'Brillance animée',          cost:700, type:'Skin', emoji:'⭐', levelRequired:5 },
```

### Skins cookies à RETIRER
- `skin_glace`
- `skin_legende`

### Titres à GARDER (les plus iconiques)
```
{ id:'titre_grand_cru',    name:'Titre "Grand Cru"',         cost:200,  levelRequired:2 },
{ id:'titre_torrefacteur', name:'Titre "Torréfacteur"',      cost:400,  levelRequired:3 },
{ id:'titre_legende',      name:'Titre "Légende du Cookie"', cost:1500, levelRequired:6 },
```

### Titre à RETIRER
- `titre_maestro`

⚠️ **Important** : si un utilisateur avait déjà acheté un de ces items retirés, **ne pas planter l'app**. Les IDs supprimés peuvent rester dans `unlocked` sans crash — il faut juste que la boutique ne les affiche plus.

## Objectif B — Crédit "Réalisé par Cookithan"

Petit texte discret en pied du Profil :

```jsx
<div style={{
  textAlign: 'center',
  marginTop: 32,
  paddingBottom: 16,
  fontSize: 11,
  color: 'rgba(139,106,90,0.6)',
  fontWeight: 500,
}}>
  Réalisé avec 🍪 par <strong style={{ color: '#C17F3C' }}>Cookithan</strong>
  <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>
    CookiTrader v1.0
  </div>
</div>
```

## Vérifications
- ☑ Boutique a moins d'items
- ☑ Aucun crash si utilisateur avait acheté un item retiré
- ☑ Le crédit Cookithan apparaît tout en bas du Profil

---

# ══════════════════════════════════════════════
# PHASE 3 — Préparer le système d'amis (UI seulement) 👥
# ══════════════════════════════════════════════

## ⚠️ Important
Le **vrai système d'amis avec autres joueurs** sera implémenté plus tard via un backend (Supabase).
Cette phase met en place **uniquement l'interface utilisateur** + la génération du code unique de l'utilisateur, **sans profils fictifs**.

## Objectif
- Générer le code unique de l'utilisateur (sera utilisé plus tard pour identifier les joueurs)
- Afficher la section "Mes Amis" avec un message "À venir prochainement"
- L'UI sera prête pour la suite

## Génération du code utilisateur

Au premier lancement (en même temps que `joinDate`) :

```js
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // pas de O/0/I/1
function generateUserCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code.slice(0, 3) + '-' + code.slice(3);
}
```

Exemples : `B4R-1ST`, `K9F-2X7`, `M3N-Q8B`.

State persisté :
```js
const [userCode, setUserCode] = useState(save?.userCode ?? generateUserCode());
```

## Composant `FriendsTab` (sur le Profil)

### En haut : ton code
Carte gradient ESPRESSO avec :
- "MON CODE AMI" en uppercase
- Code en gros, couleur dorée, lettres espacées, font monospace
- Bouton "📋 Copier" qui utilise `navigator.clipboard.writeText(userCode)`
- Texte explicatif : "Garde ce code, il te servira bientôt pour ajouter tes amis"

### Au milieu : zone "À venir"
Une carte centrée avec :
```jsx
<div style={{
  background: 'rgba(193,127,60,0.08)',
  border: '2px dashed rgba(193,127,60,0.3)',
  borderRadius: 16,
  padding: 24,
  textAlign: 'center',
  marginTop: 16,
}}>
  <div style={{ fontSize: 48, marginBottom: 8 }}>👥</div>
  <div style={{ fontSize: 16, fontWeight: 800, color: '#2C1810', marginBottom: 6 }}>
    Système d'amis — Bientôt disponible
  </div>
  <div style={{ fontSize: 12, color: '#8B6A5A' }}>
    Tu pourras ajouter d'autres joueurs avec leur code et comparer vos progressions !
  </div>
</div>
```

⚠️ **Pas de profils fictifs**, pas de bots, pas de fonction `generateFriendProfile`.
Quand le vrai système sera en place (backend Supabase), on connectera l'UI à de vraies données.

## Vérifications
- ☑ Le code utilisateur s'affiche correctement
- ☑ Le code est généré au premier lancement et persiste
- ☑ Le bouton "Copier" copie bien dans le presse-papier
- ☑ Message "À venir" affiché clairement
- ☑ Aucun système de bots/profils fictifs visible

---

# ══════════════════════════════════════════════
# PHASE 4 — Avatars premium + refonte 🎨
# ══════════════════════════════════════════════

## Objectif
12 avatars de base (gratuits) + 8 avatars premium débloqués via la boutique.

## Avatars de base (gratuits)

12 avatars SVG illustrés. Chacun : carré arrondi 80×80px, fond gradient, illustration centrale dessinée à la main.

```js
const AVATARS = [
  { id: 0,  name: 'Tasse Café',     bg: 'linear-gradient(140deg,#4A2C17,#7D4E1F)', concept: 'tasse blanche avec café noir + vapeur' },
  { id: 1,  name: 'Cookie',          bg: 'linear-gradient(140deg,#C17F3C,#D4A017)', concept: 'cookie rond marron avec 3 chips' },
  { id: 2,  name: 'Barista H',       bg: 'linear-gradient(140deg,#8B5A2B,#C17F3C)', concept: 'visage masc + tablier + casquette' },
  { id: 3,  name: 'Barista F',       bg: 'linear-gradient(140deg,#8B5A2B,#C17F3C)', concept: 'visage fém + tablier + chignon' },
  { id: 4,  name: 'Théière',         bg: 'linear-gradient(140deg,#7D4E1F,#A0784E)', concept: 'théière dorée avec bec verseur' },
  { id: 5,  name: 'Croissant',       bg: 'linear-gradient(140deg,#D4A017,#E5B040)', concept: 'croissant doré' },
  { id: 6,  name: 'Latte Art',       bg: 'linear-gradient(140deg,#4A2C17,#8B5A2B)', concept: 'tasse vue dessus + cœur dans la mousse' },
  { id: 7,  name: 'Grain Café',      bg: 'linear-gradient(140deg,#3D2010,#6B3D20)', concept: 'grain de café marron foncé' },
  { id: 8,  name: 'Muffin',          bg: 'linear-gradient(140deg,#8B5A2B,#C17F3C)', concept: 'muffin avec papier strié' },
  { id: 9,  name: 'Donut',           bg: 'linear-gradient(140deg,#D4A017,#F0C050)', concept: 'donut glacé avec sprinkles' },
  { id: 10, name: 'Cookie kawaii',   bg: 'linear-gradient(140deg,#C17F3C,#D4A017)', concept: 'cookie avec yeux+bouche+joues roses' },
  { id: 11, name: 'Barista chef',    bg: 'linear-gradient(140deg,#5C3317,#8B5A2B)', concept: 'visage avec toque chef + moustache' },
];
```

## Avatars premium (boutique)

8 nouveaux items dans `REWARDS` :

```js
{ id:'avatar_chef',     name:'Avatar Chef étoilé',     desc:'Toque, moustache et étoile',     cost:200,  type:'Avatar', emoji:'👨‍🍳', levelRequired:2 },
{ id:'avatar_robot',    name:'Avatar Robot Barista',   desc:'Robot mignon avec engrenages',   cost:300,  type:'Avatar', emoji:'🤖',   levelRequired:3 },
{ id:'avatar_chat',     name:'Avatar Chat Café',       desc:'Chat orange dans une tasse',     cost:400,  type:'Avatar', emoji:'🐱',   levelRequired:3 },
{ id:'avatar_renard',   name:'Avatar Renard',          desc:'Renard avec moustaches',         cost:500,  type:'Avatar', emoji:'🦊',   levelRequired:4 },
{ id:'avatar_panda',    name:'Avatar Panda Café',      desc:'Panda avec petite tasse',        cost:600,  type:'Avatar', emoji:'🐼',   levelRequired:4 },
{ id:'avatar_dragon',   name:'Avatar Dragon Espresso', desc:'Dragon qui crache de la vapeur', cost:800,  type:'Avatar', emoji:'🐲',   levelRequired:5 },
{ id:'avatar_or',       name:'Avatar Or Massif',       desc:'Visage doré scintillant',        cost:1500, type:'Avatar', emoji:'✨',   levelRequired:6 },
{ id:'avatar_legende',  name:'Avatar Légende',         desc:'Couronne + cookie magique',      cost:2500, type:'Avatar', emoji:'👑',   levelRequired:6 },
```

Pour chaque avatar premium, Claude Code crée un SVG dessiné à la main.

## Sélecteur d'avatar

Modal accessible depuis le Profil :
- Section **"Mes avatars"** : grille 3×4 avec les 12 de base + premium débloqués
- Section **"À débloquer"** : avatars premium non débloqués (grisés + cadenas + niveau requis)
- Tap → bordure dorée qui pulse
- Bouton "Confirmer"

State :
```js
const [userAvatar, setUserAvatar] = useState(save?.userAvatar ?? 0);
```

`userAvatar` peut être un nombre 0-11 (de base) ou une string ID (premium).

## Vérifications
- ☑ 12 avatars de base s'affichent
- ☑ 8 avatars premium dans la boutique
- ☑ Achat débloque dans le picker
- ☑ Avatar s'affiche partout : profil, classement, friends list

---

# ══════════════════════════════════════════════
# PHASE 5 — Page Profil enrichie 👤
# ══════════════════════════════════════════════

## Structure de la page

```
┌────────────────────────────────────┐
│ [Carte profil principale]          │
│ ↓                                   │
│ [Bio courte] (facultatif)          │
│ ↓                                   │
│ [Stats grid 2×3]                   │
│ ↓                                   │
│ [Mes Badges]                        │
│ ↓                                   │
│ [Mes Amis]                          │
│ ↓                                   │
│ [Boutons : nom / avatar / bio]     │
│ ↓                                   │
│ [Réinitialiser progression]        │
│ ↓                                   │
│ Réalisé par Cookithan              │
└────────────────────────────────────┘
```

## Carte profil principale

- Grand avatar (`size=80`)
- Nom d'utilisateur (gros, blanc)
- Titre débloqué OU nom du niveau
- **Code ami** affiché en petit ("Code: B4R-1ST")
- Barre XP

Si cadre actif, appliquer la bordure correspondante.

## Bio courte (facultative)

State :
```js
const [userBio, setUserBio] = useState(save?.userBio ?? '');
```

- Si vide → bouton "+ Ajouter une bio"
- Si rempli → afficher le texte + bouton "Modifier"

Modal d'édition :
- Textarea, **max 80 caractères**
- Compteur en bas ("23/80")
- Bouton "Enregistrer" (gratuit)

## Vérifications
- ☑ Carte profil affiche tout correctement
- ☑ Bio facultative se sauvegarde
- ☑ Tous les boutons fonctionnent
- ☑ Mobile-friendly

---

# ══════════════════════════════════════════════
# PHASE 6 — Nouveaux jeux + déblocages + événements 🎮
# ══════════════════════════════════════════════

⚠️ **Phase la plus longue. Faire chaque sous-partie individuellement.**

## 6A — Système de déblocage par niveau

Sur l'accueil, modifier la liste des jeux pour gérer le déblocage :

| Jeu | Niveau requis |
|---|---|
| Check-in quotidien | 1 |
| Quiz | 1 |
| Roue de la fortune | 1 |
| Défi de clics | 1 |
| Stop le café | 1 |
| Memory Café | **2** |
| Devine la commande | **3** |
| Réflexes café | **4** |

Pour chaque jeu locked :
- Carte grisée avec cadenas + texte "Niveau X requis"
- Pas cliquable
- Donne envie de progresser

Ajouter `levelRequired` dans la liste `GAMES`. Au clic, vérifier `level >= levelRequired`.

## 6B — Memory Café 🎯 (niveau 2)

**Concept** : grille 4×3 (12 cartes = 6 paires) face cachée. Tap pour retourner.

**Détails** :
- Coût : 10 🍪 par partie
- 6 paires d'icônes : ☕ 🍪 🥐 🍫 🫖 🥛
- Mélange aléatoire à chaque partie
- Compteur de coups affiché en haut
- Bouton "Abandonner" (pas de récompense)

**Récompenses** :
- 12 coups (parfait) → +50 cookies + animation bonus
- 13-16 coups → +30 cookies
- 17-20 coups → +15 cookies
- 21+ coups → +5 cookies

**Animations** :
- Carte qui se retourne en 3D (rotation Y avec `transform: rotateY(180deg)`)
- Match : les 2 cartes pulsent en doré puis disparaissent en floating
- Mismatch : les 2 cartes tremblent (`shake`) puis se reretournent

## 6C — Devine la commande 📦 (niveau 3)

**Concept** : un client virtuel donne une description, choisir la bonne boisson parmi 4.

**Détails** :
- Coût : 5 🍪 par partie
- 5 questions par partie (tirées aléatoirement, sans répétition dans la même partie)

**Récompenses** :
- 5/5 → +60 cookies
- 4/5 → +35 cookies
- 3/5 → +15 cookies
- 0-2/5 → 0 cookie

**Banque de commandes** :

```js
const COMMANDES = [
  { desc: "Je voudrais un café fort, court et avec une mousse dorée.",
    choices: ['Cappuccino', 'Espresso', 'Latte', 'Américano'], answer: 1 },
  { desc: "J'aimerais quelque chose avec beaucoup de mousse de lait, comme un dessert.",
    choices: ['Espresso', 'Macchiato', 'Cappuccino', 'Cold Brew'], answer: 2 },
  { desc: "Une boisson froide pour aujourd'hui, infusée plusieurs heures à froid.",
    choices: ['Café glacé', 'Cold Brew', 'Americano', 'Iced Latte'], answer: 1 },
  { desc: "Un café noir doublé, je veux du peps.",
    choices: ['Espresso', 'Doppio', 'Lungo', 'Ristretto'], answer: 1 },
  { desc: "Je veux un latte mais avec moins de lait, plus de café.",
    choices: ['Flat White', 'Cappuccino', 'Mocha', 'Latte'], answer: 0 },
  { desc: "Un café avec une touche de chocolat fondu.",
    choices: ['Latte', 'Mocha', 'Macchiato', 'Cortado'], answer: 1 },
  { desc: "Du thé noir avec du lait et des épices indiennes.",
    choices: ['Earl Grey', 'Chai Latte', 'Matcha', 'Thé vert'], answer: 1 },
  { desc: "Un espresso avec très très peu d'eau, ultra concentré.",
    choices: ['Lungo', 'Doppio', 'Ristretto', 'Macchiato'], answer: 2 },
  { desc: "Un café allongé à l'eau, doux à boire.",
    choices: ['Espresso', 'Americano', 'Lungo', 'Mocha'], answer: 1 },
  { desc: "Une infusion de poudre de thé vert japonais.",
    choices: ['Matcha', 'Sencha', 'Chai', 'Earl Grey'], answer: 0 },
  { desc: "Un grand cookie avec des pépites au chocolat noir.",
    choices: ['Cookie classique', 'Cookie chocolat', 'Brownie', 'Madeleine'], answer: 1 },
  { desc: "Un petit gâteau au beurre en forme de coquillage.",
    choices: ['Madeleine', 'Financier', 'Sablé', 'Cookie'], answer: 0 },
  { desc: "Un croissant fourré au chocolat.",
    choices: ['Croissant', 'Pain au chocolat', 'Brioche', 'Chausson'], answer: 1 },
  { desc: "Un café espresso versé sur de la glace vanille.",
    choices: ['Cold Brew', 'Affogato', 'Frappé', 'Iced Latte'], answer: 1 },
  { desc: "Un café espresso avec une petite tache de mousse de lait.",
    choices: ['Cortado', 'Macchiato', 'Cappuccino', 'Flat White'], answer: 1 },
  { desc: "Un thé vert chinois à l'arôme floral.",
    choices: ['Matcha', 'Jasmin', 'Sencha', 'Oolong'], answer: 1 },
  { desc: "Un café à parts égales avec du lait chaud.",
    choices: ['Latte', 'Cortado', 'Cappuccino', 'Macchiato'], answer: 1 },
  { desc: "Un café préparé à la cafetière italienne.",
    choices: ['Espresso', 'Moka', 'Americano', 'French Press'], answer: 1 },
  { desc: "Un dessert moelleux à base de chocolat fondu.",
    choices: ['Brownie', 'Cookie', 'Madeleine', 'Tartelette'], answer: 0 },
  { desc: "Un sablé léger avec amande et beurre.",
    choices: ['Madeleine', 'Financier', 'Sablé', 'Macaron'], answer: 1 },
  { desc: "Une boisson glacée fouettée avec lait et café.",
    choices: ['Frappé', 'Iced Latte', 'Cold Brew', 'Affogato'], answer: 0 },
  { desc: "Un thé infusé avec lait, popularisé en Angleterre.",
    choices: ['Earl Grey', 'Thé au lait', 'Chai', 'Oolong'], answer: 1 },
  { desc: "Petit biscuit rond fourré de ganache aux deux couleurs.",
    choices: ['Macaron', 'Sablé', 'Madeleine', 'Cookie'], answer: 0 },
  { desc: "Café espresso double avec lait micro-moussé.",
    choices: ['Latte', 'Flat White', 'Cappuccino', 'Mocha'], answer: 1 },
  { desc: "Une viennoiserie pliée et croustillante en forme de demi-lune.",
    choices: ['Pain au chocolat', 'Croissant', 'Brioche', 'Chausson'], answer: 1 },
  { desc: "Un thé bleu/vert oxydé partiellement.",
    choices: ['Oolong', 'Matcha', 'Sencha', 'Jasmin'], answer: 0 },
  { desc: "Café espresso avec eau chaude — diluée comme un café filtre.",
    choices: ['Lungo', 'Americano', 'Espresso', 'Doppio'], answer: 1 },
  { desc: "Un café avec sirop, mousse de lait et chocolat saupoudré.",
    choices: ['Latte', 'Mocha', 'Cappuccino', 'Frappé'], answer: 1 },
  { desc: "Pâtisserie ronde, glacée, parfois fourrée.",
    choices: ['Donut', 'Beignet', 'Macaron', 'Madeleine'], answer: 0 },
  { desc: "Café avec mousse épaisse et crémeuse, très généreuse.",
    choices: ['Cappuccino', 'Latte', 'Macchiato', 'Cortado'], answer: 0 },
];
```

**Animations** :
- Bulle de dialogue avec écriture progressive (caractère par caractère, ~30ms/caractère)
- 4 boissons en grille 2×2
- Bonne réponse → fond `#FBEFD4`, ✓
- Mauvaise réponse → fond `#E8DCC8`, ✗ + révéler la bonne

## 6D — Réflexes café ⚡ (niveau 4)

**Concept** : un cookie apparaît à un endroit aléatoire, taper dessus avant qu'il disparaisse.

**Détails** :
- Coût : 5 🍪 par partie
- Durée : 30 secondes
- Cookie apparaît à des positions aléatoires (zone : 3/4 supérieurs de l'écran de jeu)
- Reste visible 1.5s au début → 0.5s à la fin (s'accélère progressivement)
- Compteur de cookies tapés
- Loupé = un cookie tapé en moins (mais minimum 0)

**Récompenses** :
- 25+ tapés → +50 cookies + record si battu
- 15-24 → +25 cookies
- 5-14 → +10 cookies
- 0-4 → 0 cookie

**Animations** :
- Cookie apparaît avec pop-in (`bi`)
- Au tap : explosion de mini-cookies (5-7 emojis 🍪 qui partent dans tous les sens)
- Si raté : disparition + petit shake de l'écran

## 6E — Événements spéciaux ⏰ (niveau 4+)

**Concept** : à partir du niveau 4, un événement aléatoire peut se déclencher quand l'utilisateur ouvre l'app. Il dure entre 1h et 4h. Si le joueur réussit pendant la fenêtre, il gagne un thème limité.

### State à ajouter
```js
const [activeEvent, setActiveEvent] = useState(save?.activeEvent ?? null);
const [completedEvents, setCompletedEvents] = useState(save?.completedEvents ?? []);
const [lastEventTime, setLastEventTime] = useState(save?.lastEventTime ?? 0);
const [showEventModal, setShowEventModal] = useState(false);
```

`activeEvent` est un objet :
```js
{
  id: 'event_chocolat',
  title: '🍫 Fête du Chocolat !',
  description: '...',
  challenge: 'quiz_perfect',
  reward: { type: 'theme', id: 'theme_chocolat_festif', name: '...' },
  startedAt: 1730000000000,
  expiresAt: 1730014400000,
  progress: 0
}
```

### Logique de déclenchement

Au montage de `CookiTrader` :

```js
useEffect(() => {
  if (level < 4) return;

  // Si event actif et pas expiré → rien à faire
  if (activeEvent && activeEvent.expiresAt > Date.now()) return;

  // Si event actif mais expiré → on le retire
  if (activeEvent && activeEvent.expiresAt <= Date.now()) {
    setActiveEvent(null);
  }

  // 25% de chance de déclencher un nouvel event
  // (mais pas plus d'un toutes les 24h pour ne pas spam)
  const hoursSinceLast = (Date.now() - lastEventTime) / 3600000;
  if (hoursSinceLast >= 24 && Math.random() < 0.25) {
    triggerRandomEvent();
  }
}, [level]);
```

### Liste des événements

```js
const SPECIAL_EVENTS = [
  {
    id: 'event_chocolat',
    title: '🍫 Fête du Chocolat !',
    description: 'Réussis un quiz parfait (5/5) pour gagner le thème "Chocolat Festif" !',
    challenge: 'quiz_perfect',
    reward: { type: 'theme', id: 'theme_chocolat_festif', name: 'Thème Chocolat Festif' },
  },
  {
    id: 'event_jackpot',
    title: '🎰 Tour Spécial Roue !',
    description: 'Tombe sur +200 à la roue pour débloquer le thème "Or Massif Limité" !',
    challenge: 'spin_jackpot',
    reward: { type: 'theme', id: 'theme_or_limite', name: 'Thème Or Massif Limité' },
  },
  {
    id: 'event_speedster',
    title: '⚡ Défi Speedster !',
    description: 'Atteins 50+ clics au défi de clics pour gagner le thème "Vitesse Lumière" !',
    challenge: 'click_50',
    reward: { type: 'theme', id: 'theme_vitesse', name: 'Thème Vitesse Lumière' },
  },
  {
    id: 'event_collector',
    title: '🍪 Collectionneur !',
    description: 'Gagne 100 cookies pendant cet événement pour débloquer le thème "Forêt Cookies" !',
    challenge: 'earn_100',
    reward: { type: 'theme', id: 'theme_foret_cookies', name: 'Thème Forêt Cookies' },
  },
];

function triggerRandomEvent() {
  const available = SPECIAL_EVENTS.filter(e => !completedEvents.includes(e.id));
  if (available.length === 0) return; // tous déjà complétés

  const event = available[Math.floor(Math.random() * available.length)];

  // Durée aléatoire : 1h à 4h
  const durationMs = (1 + Math.random() * 3) * 3600 * 1000;

  setActiveEvent({
    ...event,
    startedAt: Date.now(),
    expiresAt: Date.now() + durationMs,
    progress: 0,
  });
  setLastEventTime(Date.now());
  setShowEventModal(true);
}
```

### Modal d'annonce

Quand un event se déclenche, modal d'annonce :
- Carte centrée gradient ESPRESSO avec animation `bi`
- Emoji 🎉 grand
- "ÉVÉNEMENT SPÉCIAL !" en uppercase doré
- Titre du jeu
- Description
- **Timer countdown** : "Temps restant : Xh XXmin"
- Bouton "C'est parti ! 🚀"

### Bannière persistante

Tant que `activeEvent` existe :

```jsx
{activeEvent && activeEvent.expiresAt > Date.now() && (
  <div style={{
    background: 'linear-gradient(135deg, #D4A017, #C17F3C)',
    color: 'white', padding: 12, borderRadius: 14,
    marginBottom: 14,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    animation: 'glow 2s ease-in-out infinite',
  }}>
    <div>
      <div style={{ fontSize: 12, fontWeight: 700 }}>{activeEvent.title}</div>
      <div style={{ fontSize: 11, opacity: 0.85 }}>
        ⏱️ {formatTime(activeEvent.expiresAt - Date.now())} restant
      </div>
    </div>
    <button onClick={() => setShowEventModal(true)}>Voir</button>
  </div>
)}
```

### Détection du challenge

Fonction utilitaire à appeler depuis les jeux concernés :

```js
function checkEventChallenge(challengeType, value) {
  if (!activeEvent) return;
  if (activeEvent.expiresAt <= Date.now()) return;

  let success = false;
  if (challengeType === 'quiz_perfect' && activeEvent.challenge === 'quiz_perfect' && value === 5) {
    success = true;
  } else if (challengeType === 'spin_jackpot' && activeEvent.challenge === 'spin_jackpot' && value === 200) {
    success = true;
  } else if (challengeType === 'click_50' && activeEvent.challenge === 'click_50' && value >= 50) {
    success = true;
  } else if (challengeType === 'earn' && activeEvent.challenge === 'earn_100') {
    const newProgress = (activeEvent.progress ?? 0) + value;
    if (newProgress >= 100) {
      success = true;
    } else {
      setActiveEvent(prev => ({ ...prev, progress: newProgress }));
    }
  }

  if (success) {
    setUnlocked(u => [...u, activeEvent.reward.id]);
    setCompletedEvents(c => [...c, activeEvent.id]);
    setEventReward(activeEvent.reward); // déclenche modal de récompense
    setActiveEvent(null);
  }
}
```

Appeler cette fonction depuis :
- Quiz : `checkEventChallenge('quiz_perfect', score)` à la fin
- Roue : `checkEventChallenge('spin_jackpot', resultValue)` après chaque spin
- Défi de clics : `checkEventChallenge('click_50', clicks)` à la fin
- Tous les `addCoins` : `checkEventChallenge('earn', amount)` (pour event_collector)

### Modal de récompense

Quand l'utilisateur réussit un challenge :
- Modal `bi` avec confettis
- "🏆 ÉVÉNEMENT RÉUSSI !"
- Nom du thème débloqué
- Bouton "Voir mon thème"

### Thèmes limités

```js
const LIMITED_THEMES = [
  { id: 'theme_chocolat_festif', name: 'Chocolat Festif',     bg: 'linear-gradient(140deg,#3D1A0E,#7D3919)', card: '#5C2614', text: '#F5DCC8' },
  { id: 'theme_or_limite',       name: 'Or Massif Limité',    bg: 'linear-gradient(140deg,#3D2810,#8B6914)', card: '#5C4014', text: '#FFE4A0' },
  { id: 'theme_vitesse',         name: 'Vitesse Lumière',     bg: 'linear-gradient(140deg,#1A1F30,#3D4A6A)', card: '#2A3050', text: '#E0E8FF' },
  { id: 'theme_foret_cookies',   name: 'Forêt Cookies',       bg: 'linear-gradient(140deg,#1A2010,#3D4A1F)', card: '#2A3018', text: '#E0F0CC' },
];
```

Dans la boutique : ces thèmes apparaissent **uniquement s'ils sont débloqués** (impossible de les acheter, juste de les voir comme déjà possédés, avec un badge "Édition limitée").

## Vérifications phase 6

- ☑ Memory Café fonctionne, récompenses calculées
- ☑ Devine la commande tire 5 questions sans répétition
- ☑ Réflexes café s'accélère progressivement
- ☑ Les jeux sont verrouillés selon le niveau
- ☑ Au niveau 4+, événement aléatoire peut se déclencher
- ☑ Bannière persistante avec timer countdown
- ☑ Réussir le challenge débloque le thème limité
- ☑ Le même événement ne se redéclenche pas s'il est complété
- ☑ Pas plus d'un événement par 24h

---

# ══════════════════════════════════════════════
# RAPPELS GLOBAUX
# ══════════════════════════════════════════════

- Tout reste dans la structure de fichiers actuelle
- Pas de TypeScript, pas de nouvelles dépendances npm
- **Pas de rouge ni de vert** — palette café uniquement
- Mobile-first : 390px de large
- Bandeau `══════` pour chaque nouvelle section
- À chaque nouveau state, ajouter à la persistance localStorage
- Tester chaque phase visuellement avant de passer à la suivante

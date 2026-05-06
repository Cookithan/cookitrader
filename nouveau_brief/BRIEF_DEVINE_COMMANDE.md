# Brief — Refonte du jeu "Devine la commande" 🎬

Lis bien le CLAUDE.md avant de commencer.
**Propose-moi un plan en puces et attends ma validation avant de coder.**

---

## Contexte

Le jeu "Devine la commande" (composant `GuessGame.jsx` dans `src/components/games/`) est actuellement minimaliste : un comptoir plat en bas, un emoji blond qui flotte dans le vide à droite, et une bulle de dialogue.

On va le refondre pour créer une **vraie scène immersive de café** avec :
- 🎬 Vue à la première personne du serveur (POV barista derrière son comptoir)
- 🏪 Décor 3D : sol en perspective, mur avec cadre/lampe/étagère, plante, table en arrière-plan
- ☕ Comptoir 3D avec machine expresso, vitrine pâtisseries, caisse
- 👥 **5 clients différents** dessinés à la main qui se succèdent à chaque question (un client = une question)
- 🎨 Animation d'arrivée du client depuis la droite + bulle de dialogue qui pop

---

## ⚠️ Important — Ce qu'il faut PRÉSERVER

La **logique de jeu existante reste identique** :
- Coût : 5 🍪 par partie
- 5 questions par partie tirées au hasard depuis la banque `COMMANDES`
- Récompenses : 5/5 = +60, 4/5 = +35, 3/5 = +15, ≤2/5 = 0
- Calcul du score, gestion des bonnes/mauvaises réponses
- Bouton retour, gestion des phases (intro → questions → résultat)

**On change UNIQUEMENT le rendu visuel** de la scène (la zone qui contient actuellement le comptoir + le client).

---

## Étape 1 — Préserver / Adapter la logique existante

### États existants à conserver
- `phase` (idle, playing, result)
- `currentIndex` (numéro de la question 0-4)
- `score` (nombre de bonnes réponses)
- `picked` (la réponse cliquée)
- `subPhase` (entering, speaking, walking)

### États à ajouter

```js
// Choisir un client aléatoire pour chaque question (déterministe sur l'index)
const [customerIndices, setCustomerIndices] = useState([]);
```

Au lancement de la partie, mélanger l'ordre des 5 customers de manière aléatoire :
```js
useEffect(() => {
  if (phase === 'playing' && currentIndex === 0) {
    const order = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
    setCustomerIndices(order);
  }
}, [phase, currentIndex]);

const currentCustomer = CUSTOMERS[customerIndices[currentIndex] ?? 0];
```

⚠️ Le client courant ne dépend PAS de la question. Question = texte, Client = visage. On les associe juste pour avoir un "humain qui dit cette commande".

---

## Étape 2 — Banque des 5 clients (à ajouter en haut du fichier)

Tableau des 5 clients différents avec leurs SVG. Chacun fait 110×120 (viewBox).

```jsx
const CUSTOMERS = [
  // 1. Jeune homme, cheveux bruns, chemise bleue
  {
    id: 'jeune_homme',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <path d="M 18 120 L 18 88 Q 18 70 34 64 L 76 64 Q 92 70 92 88 L 92 120 Z" fill="#5C7A9E"/>
        <path d="M 42 65 L 55 76 L 68 65 L 68 58 L 42 58 Z" fill="#3D5775"/>
        <ellipse cx="55" cy="58" rx="10" ry="7" fill="#E5B894"/>
        <circle cx="55" cy="36" r="22" fill="#F0C490"/>
        <path d="M 33 32 Q 31 18 40 12 Q 50 7 60 9 Q 72 12 75 24 Q 76 30 74 34 L 72 28 Q 67 24 60 25 L 50 25 Q 42 26 35 32 Z" fill="#5C3317"/>
        <ellipse cx="47" cy="37" rx="2.5" ry="3" fill="#2C1810"/>
        <ellipse cx="63" cy="37" rx="2.5" ry="3" fill="#2C1810"/>
        <path d="M 55 41 L 53 47 L 57 47 Z" fill="#D4A07C" opacity="0.4"/>
        <path d="M 50 51 Q 55 54 60 51" stroke="#2C1810" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <ellipse cx="40" cy="44" rx="3" ry="2.5" fill="#E59080" opacity="0.4"/>
        <ellipse cx="70" cy="44" rx="3" ry="2.5" fill="#E59080" opacity="0.4"/>
      </svg>
    )
  },
  // 2. Femme rousse, chignon, pull rouge
  {
    id: 'femme_rousse',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <path d="M 16 120 L 16 86 Q 16 68 34 62 L 76 62 Q 94 68 94 86 L 94 120 Z" fill="#A85040"/>
        <path d="M 38 64 Q 55 72 72 64 L 72 56 Q 55 60 38 56 Z" fill="#7D3525"/>
        <ellipse cx="55" cy="58" rx="9" ry="6" fill="#F0C490"/>
        <circle cx="55" cy="34" r="22" fill="#F5D0A0"/>
        <ellipse cx="55" cy="14" rx="14" ry="10" fill="#C45828"/>
        <path d="M 33 30 Q 32 22 40 18 L 70 18 Q 78 22 77 30 Q 75 26 70 26 L 40 26 Q 35 26 33 30 Z" fill="#C45828"/>
        <ellipse cx="55" cy="10" rx="8" ry="6" fill="#A04020"/>
        <ellipse cx="46" cy="35" rx="2.5" ry="3" fill="#2C1810"/>
        <ellipse cx="64" cy="35" rx="2.5" ry="3" fill="#2C1810"/>
        <path d="M 53 39 L 51 44 L 55 44 Z" fill="#D4A07C" opacity="0.5"/>
        <path d="M 49 49 Q 55 52 61 49" stroke="#A0405C" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <ellipse cx="38" cy="42" rx="3" ry="2.5" fill="#E59080" opacity="0.5"/>
        <ellipse cx="72" cy="42" rx="3" ry="2.5" fill="#E59080" opacity="0.5"/>
        <ellipse cx="42" cy="60" rx="2" ry="3" fill="#D4A017"/>
      </svg>
    )
  },
  // 3. Homme âgé, chapeau, moustache, costume vert
  {
    id: 'homme_age',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <path d="M 18 120 L 18 88 Q 18 72 34 66 L 76 66 Q 92 72 92 88 L 92 120 Z" fill="#3D5040"/>
        <path d="M 42 67 L 55 76 L 68 67 L 68 62 L 42 62 Z" fill="#2A3528"/>
        <ellipse cx="55" cy="60" rx="9" ry="6" fill="#D4A07C"/>
        <circle cx="55" cy="38" r="22" fill="#E5B894"/>
        <path d="M 30 26 Q 28 22 30 18 L 80 18 Q 82 22 80 26 Z" fill="#3D2010"/>
        <ellipse cx="55" cy="20" rx="28" ry="6" fill="#5C3317"/>
        <ellipse cx="55" cy="22" rx="26" ry="3" fill="#3D2010"/>
        <ellipse cx="46" cy="40" rx="2.5" ry="3" fill="#2C1810"/>
        <ellipse cx="64" cy="40" rx="2.5" ry="3" fill="#2C1810"/>
        <path d="M 41 38 L 51 38 M 59 38 L 69 38" stroke="#5C3317" strokeWidth="2"/>
        <path d="M 55 44 L 53 50 L 57 50 Z" fill="#A0784E" opacity="0.6"/>
        <path d="M 48 56 Q 55 53 62 56" stroke="#2C1810" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M 40 58 Q 45 60 48 58" fill="#9D9D9D"/>
        <path d="M 62 58 Q 65 60 70 58" fill="#9D9D9D"/>
        <ellipse cx="40" cy="48" rx="2" ry="1.5" fill="#E59080" opacity="0.4"/>
        <ellipse cx="70" cy="48" rx="2" ry="1.5" fill="#E59080" opacity="0.4"/>
      </svg>
    )
  },
  // 4. Jeune femme blonde, pull rose
  {
    id: 'femme_blonde',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <path d="M 16 120 L 16 86 Q 16 68 32 62 L 78 62 Q 94 68 94 86 L 94 120 Z" fill="#D85580"/>
        <path d="M 38 64 Q 55 72 72 64 L 72 56 Q 55 60 38 56 Z" fill="#A8345C"/>
        <ellipse cx="55" cy="58" rx="9" ry="6" fill="#F5D0A0"/>
        <circle cx="55" cy="34" r="22" fill="#FCE0B8"/>
        <path d="M 28 36 Q 26 16 42 8 Q 55 4 68 8 Q 84 16 82 36 Q 80 32 78 28 L 75 22 L 70 26 L 65 18 L 58 24 L 50 16 L 42 24 L 36 18 L 32 26 L 28 30 Z" fill="#F5D478"/>
        <path d="M 30 38 Q 26 50 28 70 Q 30 60 32 50 Z" fill="#F5D478"/>
        <path d="M 80 38 Q 84 50 82 70 Q 80 60 78 50 Z" fill="#F5D478"/>
        <ellipse cx="46" cy="35" rx="2.5" ry="3" fill="#2C1810"/>
        <ellipse cx="64" cy="35" rx="2.5" ry="3" fill="#2C1810"/>
        <ellipse cx="46" cy="34" rx="0.8" ry="1" fill="white"/>
        <ellipse cx="64" cy="34" rx="0.8" ry="1" fill="white"/>
        <path d="M 53 39 L 51 44 L 55 44 Z" fill="#D4A07C" opacity="0.5"/>
        <path d="M 48 49 Q 55 53 62 49" stroke="#C04060" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="37" cy="42" rx="3.5" ry="3" fill="#E59080" opacity="0.55"/>
        <ellipse cx="73" cy="42" rx="3.5" ry="3" fill="#E59080" opacity="0.55"/>
      </svg>
    )
  },
  // 5. Hipster, barbe, pull marron
  {
    id: 'hipster',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <path d="M 18 120 L 18 88 Q 18 70 34 64 L 76 64 Q 92 70 92 88 L 92 120 Z" fill="#7D4520"/>
        <path d="M 42 66 L 55 78 L 68 66 L 68 60 L 42 60 Z" fill="#5C3015"/>
        <ellipse cx="55" cy="60" rx="9" ry="6" fill="#E5B894"/>
        <circle cx="55" cy="36" r="22" fill="#F0C490"/>
        <path d="M 32 30 Q 28 18 38 10 Q 48 5 58 7 Q 70 10 76 22 Q 78 30 76 38 L 74 30 Q 70 28 64 28 Q 60 26 56 26 Q 50 26 44 28 Q 38 30 35 36 Z" fill="#3D2010"/>
        <ellipse cx="55" cy="14" rx="14" ry="6" fill="#3D2010"/>
        <ellipse cx="46" cy="37" rx="2.5" ry="3" fill="#2C1810"/>
        <ellipse cx="64" cy="37" rx="2.5" ry="3" fill="#2C1810"/>
        <path d="M 41 33 L 51 33 M 59 33 L 69 33" stroke="#3D2010" strokeWidth="2.5"/>
        <path d="M 55 41 L 53 47 L 57 47 Z" fill="#D4A07C" opacity="0.5"/>
        <path d="M 47 52 Q 55 50 63 52 Q 62 58 55 60 Q 48 58 47 52 Z" fill="#3D2010"/>
        <path d="M 50 56 Q 55 58 60 56" stroke="#2C1810" strokeWidth="1" fill="none"/>
      </svg>
    )
  }
];
```

---

## Étape 3 — Le composant Scene (à créer)

Remplacer toute la zone de scène existante (probablement nommée `<div className="scene">` ou équivalent) par ce nouveau composant `<CafeScene>` :

```jsx
function CafeScene({ customer, dialogText, subPhase }) {
  return (
    <div className="cafe-scene">
      {/* Wall background */}
      <div className="cs-wall" />

      {/* Floor with 3D perspective */}
      <div className="cs-floor" />

      {/* Wall decorations */}
      <div className="cs-picture">☕</div>

      <div className="cs-lamp" />

      <div className="cs-shelf">
        <div className="cs-cup-mini" />
        <div className="cs-cup-mini" />
        <div className="cs-cup-mini" />
        <div className="cs-cup-mini" />
      </div>

      {/* Plant in pot (left, behind customer) */}
      <div className="cs-plant">
        <svg viewBox="0 0 35 50" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%' }}>
          <path d="M 7 35 L 28 35 L 26 48 L 9 48 Z" fill="#7D4E1F"/>
          <ellipse cx="17.5" cy="35" rx="11" ry="2" fill="#5C3317"/>
          <ellipse cx="10" cy="22" rx="6" ry="14" fill="#4A6B3A" transform="rotate(-15 10 22)"/>
          <ellipse cx="25" cy="20" rx="5" ry="12" fill="#5A7B4A" transform="rotate(20 25 20)"/>
          <ellipse cx="17" cy="14" rx="6" ry="14" fill="#3A5B2A"/>
          <ellipse cx="13" cy="28" rx="4" ry="9" fill="#4A6B3A" transform="rotate(-25 13 28)"/>
          <ellipse cx="22" cy="28" rx="4" ry="9" fill="#5A7B4A" transform="rotate(25 22 28)"/>
        </svg>
      </div>

      {/* Background table with chairs (right, behind customer) */}
      <div className="cs-table-bg">
        <svg viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%' }}>
          <rect x="6" y="20" width="14" height="20" rx="2" fill="#5C3317"/>
          <rect x="30" y="20" width="14" height="20" rx="2" fill="#5C3317"/>
          <ellipse cx="25" cy="42" rx="20" ry="6" fill="#7D4E1F"/>
          <ellipse cx="25" cy="40" rx="20" ry="6" fill="#A0784E"/>
          <ellipse cx="25" cy="40" rx="18" ry="4" fill="#C8A878" opacity="0.6"/>
          <rect x="22" y="42" width="6" height="14" fill="#5C3317"/>
          <ellipse cx="20" cy="38" rx="3" ry="1" fill="#F0E4D0"/>
          <rect x="17" y="35" width="6" height="3" rx="1" fill="#F0E4D0"/>
        </svg>
      </div>

      {/* THE CUSTOMER (with key to retrigger animation) */}
      <div className="cs-customer" key={customer.id}>
        {customer.svg}
        <div className="cs-bubble">{dialogText}</div>
      </div>

      {/* Steam from machine */}
      <div className="cs-steam" />
      <div className="cs-steam s2" />

      {/* Counter items */}
      <div className="cs-counter-items">
        {/* Espresso machine */}
        <div className="cs-machine">
          <svg viewBox="0 0 56 64" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%' }}>
            <defs>
              <linearGradient id="machGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#E5E5E5"/>
                <stop offset="0.5" stopColor="#A8A8A8"/>
                <stop offset="1" stopColor="#707070"/>
              </linearGradient>
            </defs>
            <rect x="4" y="2" width="48" height="9" rx="2" fill="#3D2010"/>
            <rect x="6" y="4" width="44" height="2" fill="#5C3317"/>
            <rect x="6" y="10" width="44" height="42" rx="3" fill="url(#machGrad)"/>
            <rect x="14" y="16" width="28" height="9" rx="1" fill="#2C1810"/>
            <text x="28" y="22.5" fontSize="6" fill="#D4A017" textAnchor="middle" fontWeight="bold">CAFE</text>
            <circle cx="14" cy="36" r="5" fill="#1A1A1A"/>
            <circle cx="14" cy="36" r="3.5" fill="#F5EFE6"/>
            <line x1="14" y1="36" x2="16" y2="33" stroke="#2C1810" strokeWidth="1"/>
            <circle cx="28" cy="36" r="3" fill="#D4A017"/>
            <circle cx="38" cy="36" r="3" fill="#8B6A5A"/>
            <rect x="20" y="44" width="16" height="6" rx="1" fill="#3D2010"/>
            <rect x="24" y="50" width="3" height="4" fill="#1A1A1A"/>
            <rect x="29" y="50" width="3" height="4" fill="#1A1A1A"/>
            <line x1="50" y1="14" x2="54" y2="22" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="54" cy="22" r="1.5" fill="#707070"/>
          </svg>
        </div>

        {/* Pastry display */}
        <div className="cs-pastry">
          <svg viewBox="0 0 36 30" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%' }}>
            <rect x="2" y="22" width="32" height="6" rx="1" fill="#5C3317"/>
            <rect x="3" y="23" width="30" height="2" fill="#7D4E1F"/>
            <path d="M 5 22 Q 5 6 18 4 Q 31 6 31 22 Z" fill="rgba(220,230,240,0.5)" stroke="#A0A0A0" strokeWidth="1"/>
            <path d="M 8 20 Q 8 10 14 7" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none"/>
            <circle cx="13" cy="20" r="3" fill="#D4A017"/>
            <circle cx="13" cy="19" r="1" fill="#5C3317"/>
            <circle cx="22" cy="20" r="3" fill="#C17F3C"/>
            <circle cx="21" cy="19" r="0.8" fill="#3D2010"/>
            <circle cx="23" cy="20" r="0.8" fill="#3D2010"/>
          </svg>
        </div>

        {/* Cash register */}
        <div className="cs-register">
          <svg viewBox="0 0 42 38" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%' }}>
            <rect x="2" y="20" width="38" height="16" rx="2" fill="#3D2010"/>
            <rect x="2" y="20" width="38" height="3" fill="#5C3317"/>
            <rect x="6" y="6" width="30" height="16" rx="2" fill="#5C3317"/>
            <rect x="9" y="9" width="24" height="6" rx="1" fill="#1A1A1A"/>
            <rect x="11" y="11" width="20" height="2" fill="#D4A017"/>
            <rect x="9" y="17" width="3" height="3" rx="0.5" fill="#A0A0A0"/>
            <rect x="14" y="17" width="3" height="3" rx="0.5" fill="#A0A0A0"/>
            <rect x="19" y="17" width="3" height="3" rx="0.5" fill="#A0A0A0"/>
            <rect x="24" y="17" width="3" height="3" rx="0.5" fill="#A0A0A0"/>
            <rect x="29" y="17" width="3" height="3" rx="0.5" fill="#D4A017"/>
          </svg>
        </div>
      </div>

      {/* COUNTER 3D */}
      <div className="cs-counter">
        <div className="cs-counter-top" />
        <div className="cs-counter-front" />
      </div>
    </div>
  );
}
```

---

## Étape 4 — CSS de la scène

À ajouter dans le bloc `<style>` global (où se trouvent les autres keyframes) :

```css
/* === CAFE SCENE === */
.cafe-scene {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 18px;
  overflow: hidden;
  position: relative;
  margin-bottom: 14px;
  box-shadow: 0 12px 32px rgba(74, 44, 23, 0.25);
  border: 2px solid #E8DDD0;
}

/* Wall background */
.cs-wall {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 60%;
  background: linear-gradient(180deg, #F0D8B0 0%, #E5C088 50%, #D4A572 100%);
}

/* Floor — 3D perspective */
.cs-floor {
  position: absolute;
  bottom: 0;
  left: -10%; right: -10%;
  height: 50%;
  background: linear-gradient(180deg, #C8A878 0%, #B89868 30%, #A88858 60%, #987848 100%);
  transform: rotateX(60deg);
  transform-origin: bottom center;
  z-index: 1;
}
.cs-floor::before {
  content: '';
  position: absolute; inset: 0;
  background-image:
    linear-gradient(90deg, transparent 24%, rgba(74,44,23,0.25) 25%, transparent 26%),
    linear-gradient(90deg, transparent 49%, rgba(74,44,23,0.25) 50%, transparent 51%),
    linear-gradient(90deg, transparent 74%, rgba(74,44,23,0.25) 75%, transparent 76%),
    linear-gradient(180deg, transparent 33%, rgba(74,44,23,0.2) 33.5%, transparent 34%),
    linear-gradient(180deg, transparent 66%, rgba(74,44,23,0.15) 66.5%, transparent 67%);
}

/* Wall picture */
.cs-picture {
  position: absolute;
  top: 8%; left: 8%;
  width: 50px; height: 38px;
  background: #2C1810;
  border: 3px solid #5C3317;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: 0 3px 8px rgba(0,0,0,0.3);
  z-index: 2;
}
.cs-picture::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  width: 1px; height: 8px;
  background: #5C3317;
}

/* Hanging lamp */
.cs-lamp {
  position: absolute;
  top: 0; right: 18%;
  width: 2px; height: 22%;
  background: #3D2010;
  z-index: 2;
}
.cs-lamp::after {
  content: '';
  position: absolute;
  bottom: -8px; left: -14px;
  width: 30px; height: 18px;
  background: linear-gradient(180deg, #D4A017, #8B6914);
  border-radius: 0 0 16px 16px;
  box-shadow: 0 0 24px rgba(255, 200, 100, 0.7);
  border: 1.5px solid #5C3317;
}

/* Wall shelf with mini cups */
.cs-shelf {
  position: absolute;
  top: 12%; right: 5%;
  width: 90px; height: 28px;
  background: linear-gradient(180deg, #5C3317 0%, #3D2010 100%);
  border-radius: 2px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  padding: 0 4px 2px;
  z-index: 2;
}
.cs-cup-mini {
  width: 14px; height: 16px;
  background: linear-gradient(180deg, #F0E4D0 0%, #DCC8A8 100%);
  border-radius: 2px 2px 4px 4px;
  border: 1px solid #A0784E;
  position: relative;
}
.cs-cup-mini::after {
  content: '';
  position: absolute;
  right: -3px; top: 4px;
  width: 4px; height: 6px;
  border: 1px solid #A0784E;
  border-left: none;
  border-radius: 0 4px 4px 0;
}

/* Plant */
.cs-plant {
  position: absolute;
  bottom: 38%; left: 4%;
  width: 35px;
  z-index: 2;
}

/* Background table */
.cs-table-bg {
  position: absolute;
  bottom: 36%; right: 6%;
  width: 50px;
  z-index: 2;
  transform: scale(0.85);
  opacity: 0.95;
}

/* Customer */
.cs-customer {
  position: absolute;
  bottom: 32%;
  left: 50%;
  transform: translateX(-50%);
  width: 110px;
  z-index: 5;
  animation: csCustomerWalkIn 0.8s ease-out;
  transform-origin: bottom center;
}
@keyframes csCustomerWalkIn {
  from { transform: translateX(180%); opacity: 0; }
  to   { transform: translateX(-50%); opacity: 1; }
}

.cs-bubble {
  position: absolute;
  bottom: 105%;
  left: 50%;
  transform: translateX(-25%);
  background: white;
  border-radius: 14px;
  padding: 9px 13px;
  font-size: 11px;
  color: #2C1810;
  font-weight: 600;
  line-height: 1.35;
  box-shadow: 0 6px 16px rgba(74,44,23,0.3);
  width: 165px;
  animation: csBubblePop 0.4s ease-out 0.6s backwards;
  z-index: 6;
}
.cs-bubble::after {
  content: '';
  position: absolute;
  bottom: -8px; left: 30%;
  width: 0; height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
}
@keyframes csBubblePop {
  0%   { transform: translateX(-25%) scale(0); opacity: 0; }
  70%  { transform: translateX(-25%) scale(1.05); opacity: 1; }
  100% { transform: translateX(-25%) scale(1); opacity: 1; }
}

/* Steam */
.cs-steam {
  position: absolute;
  bottom: 32%; left: 18%;
  width: 4px; height: 14px;
  background: rgba(255,255,255,0.7);
  border-radius: 50%;
  filter: blur(2px);
  animation: csSteamFloat 1.8s ease-in-out infinite;
  z-index: 4;
}
.cs-steam.s2 { left: 22%; animation-delay: 0.4s; }
@keyframes csSteamFloat {
  0%   { transform: translateY(0) scale(1); opacity: 0.8; }
  100% { transform: translateY(-30px) scale(1.6); opacity: 0; }
}

/* Counter items */
.cs-counter-items {
  position: absolute;
  bottom: 26%;
  left: 0; right: 0;
  z-index: 5;
  pointer-events: none;
  height: 64px;
}
.cs-machine {
  position: absolute;
  bottom: 0; left: 8%;
  width: 56px; height: 64px;
}
.cs-pastry {
  position: absolute;
  bottom: 0; right: 32%;
  width: 36px; height: 30px;
}
.cs-register {
  position: absolute;
  bottom: 2px; right: 8%;
  width: 42px; height: 38px;
}

/* COUNTER 3D */
.cs-counter {
  position: absolute;
  bottom: 0;
  left: -5%; right: -5%;
  height: 32%;
  z-index: 4;
}
.cs-counter-top {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 28px;
  background: linear-gradient(180deg, #E5C088 0%, #C8A878 25%, #8B6A4E 70%, #5C3317 100%);
  box-shadow:
    inset 0 2px 4px rgba(255, 230, 180, 0.6),
    inset 0 -2px 4px rgba(0, 0, 0, 0.3);
  transform: perspective(400px) rotateX(35deg);
  transform-origin: bottom;
  border-top: 2px solid rgba(255, 240, 200, 0.7);
}
.cs-counter-top::before {
  content: '';
  position: absolute;
  top: 4px; left: 5%; right: 5%;
  height: 4px;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 245, 220, 0.8) 30%, rgba(255, 245, 220, 0.8) 70%, transparent 100%);
  border-radius: 50%;
  filter: blur(2px);
}
.cs-counter-front {
  position: absolute;
  top: 24px; left: 0; right: 0; bottom: 0;
  background: linear-gradient(180deg, #5C3317 0%, #3D2010 100%);
  background-image:
    linear-gradient(90deg, transparent 19%, rgba(0,0,0,0.4) 20%, transparent 21%),
    linear-gradient(90deg, transparent 39%, rgba(0,0,0,0.4) 40%, transparent 41%),
    linear-gradient(90deg, transparent 59%, rgba(0,0,0,0.4) 60%, transparent 61%),
    linear-gradient(90deg, transparent 79%, rgba(0,0,0,0.4) 80%, transparent 81%),
    linear-gradient(180deg, #5C3317 0%, #3D2010 100%);
  box-shadow:
    inset 0 6px 12px rgba(0,0,0,0.4),
    inset 0 -2px 4px rgba(0,0,0,0.5);
  border-top: 1px solid rgba(0,0,0,0.6);
}
.cs-counter-front::after {
  content: '';
  position: absolute;
  bottom: -6px; left: 5%; right: 5%;
  height: 8px;
  background: rgba(0, 0, 0, 0.4);
  filter: blur(4px);
  border-radius: 50%;
}
```

---

## Étape 5 — Intégrer dans `GuessGame.jsx`

Dans le rendu de la phase `playing` :

```jsx
<CafeScene
  customer={currentCustomer}
  dialogText={currentQuestion.desc}
  subPhase={subPhase}
/>
```

Remplacer **toute** l'ancienne zone de scène (le comptoir plat + l'emoji blond) par cette nouvelle structure.

⚠️ **Bien retirer** :
- L'ancien div avec l'emoji 👱 ou 👨 ou similaire
- Les anciens éléments du comptoir actuel (le rectangle marron simple)
- L'ancienne bulle si elle existe en dehors de `cs-customer`

---

## Étape 6 — Animation de transition entre questions

Quand l'utilisateur passe à la question suivante (après avoir cliqué une réponse), il faut que :
1. Le client actuel sorte vers la gauche (animation walk-out 0.4s)
2. Le nouveau client arrive de la droite (animation walk-in 0.8s)

Pour ça, utiliser le `key` du composant qui change avec chaque `currentIndex` ou customer ID :

```jsx
<div className="cs-customer" key={`cust-${currentIndex}`}>
  ...
</div>
```

Quand `key` change, React démonte/remonte → l'animation `csCustomerWalkIn` se rejoue automatiquement.

⚠️ **Pas besoin** de gérer manuellement la sortie du précédent client — la simplicité de l'arrivée du nouveau suffit visuellement.

---

## Vérifications après l'implémentation

- ☑ La scène a un fond mur + sol en perspective 3D
- ☑ Le comptoir occupe la moitié inférieure et a un effet 3D (top en perspective + façade avec planches)
- ☑ La machine à expresso métallique est sur le comptoir à gauche, avec vapeur qui monte
- ☑ La vitrine de pâtisseries au centre du comptoir
- ☑ La caisse enregistreuse à droite
- ☑ Cadre photo café accroché en haut à gauche du mur
- ☑ Lampe suspendue avec halo doré
- ☑ Étagère avec 4 mini-tasses en haut à droite
- ☑ Plante en pot derrière le client à gauche
- ☑ Petite table avec chaises en arrière-plan à droite
- ☑ Le client SVG arrive depuis la droite avec animation
- ☑ Bulle de dialogue qui pop en délai 0.6s après l'arrivée
- ☑ Les 5 clients sont **différents** (jeune homme, femme rousse, homme âgé, femme blonde, hipster)
- ☑ À chaque question, un nouveau client (mélangé aléatoirement)
- ☑ La logique de jeu existante (score, récompenses, etc.) **n'a pas changé**
- ☑ Les boutons de réponse fonctionnent normalement
- ☑ Tout est mobile-friendly (testé en 390px de large)
- ☑ Palette uniquement café — pas de rouge ni de vert
- ☑ Aucune régression sur les autres jeux

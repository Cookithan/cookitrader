# Brief — Tutoriel guidé au premier lancement 🎓

Lis bien le CLAUDE.md avant de commencer.
**Propose-moi un plan en puces et attends ma validation avant de coder.**

---

## Objectif

Quand un nouveau joueur arrive sur CookiTrader, lui faire un **tour guidé d'environ 1 minute** qui présente les fonctionnalités clés, en pointant vers chaque élément avec des bulles d'aide.

**Style** : court, dynamique, jamais ennuyeux. 6 étapes maximum.

---

## Choix utilisateur validés

- ✅ **Skippable** dès le début (bouton "Passer le tutoriel")
- ✅ **Action obligatoire au check-in** (bloquer tant qu'il n'a pas cliqué)
- ✅ **Spotlight = cercle découpé** dans un voile sombre (effet pro)
- ❌ **Pas d'icône d'aide permanente** dans l'app
- ✅ **Mini-bulles contextuelles** la première fois qu'on ouvre certains jeux

---

## Étape 1 — Détecter le premier lancement

Le tutoriel se déclenche automatiquement si :
- `localStorage.getItem('cookiminer:tutorialCompleted') !== '1'`
- ET `totalEarned === 0` (le joueur n'a encore rien gagné)

Si l'utilisateur a **déjà joué** (`totalEarned > 0`), marquer le tutoriel comme complété pour ne pas l'embêter :
```js
useEffect(() => {
  if (totalEarned > 0 && localStorage.getItem('cookiminer:tutorialCompleted') !== '1') {
    localStorage.setItem('cookiminer:tutorialCompleted', '1');
  }
}, [totalEarned]);
```

State à ajouter dans `CookiTrader` :
- `tutorialStep: 0` → 0 = pas de tuto, 1 à 6 = étapes du tuto

L'onboarding existant (saisie nom + avatar) **doit se finir AVANT** le tutoriel. Une fois l'onboarding fermé, déclencher `setTutorialStep(1)`.

---

## Étape 2 — Composant `TutorialOverlay`

C'est le composant principal. Il s'affiche par-dessus toute l'app avec un voile sombre semi-transparent.

### Structure

```jsx
function TutorialOverlay({ step, onNext, onSkip }) {
  if (step === 0) return null;
  const config = TUTORIAL_STEPS[step - 1];
  if (!config) return null;

  return (
    <>
      {/* Voile sombre avec spotlight découpé */}
      <SpotlightOverlay target={config.target} />

      {/* Bulle de texte */}
      <TutorialBubble
        text={config.text}
        position={config.position}
        actionRequired={config.actionRequired}
        onNext={onNext}
        onSkip={step === 1 ? onSkip : null}
        stepCount={step}
        totalSteps={6}
      />
    </>
  );
}
```

### États du tutoriel : 6 étapes

```js
const TUTORIAL_STEPS = [
  {
    target: 'card-niveau',          // ID HTML de la carte niveau
    text: 'Voici ton niveau de Barista. Joue pour monter !',
    position: 'bottom',
    actionRequired: false,
  },
  {
    target: 'cookie-counter',       // ID du compteur en haut à droite
    text: 'Les cookies 🍪 sont ta monnaie principale.',
    position: 'bottom',
    actionRequired: false,
  },
  {
    target: 'card-checkin',         // ID de la carte check-in
    text: 'Récupère ton bonus quotidien ici 👇',
    position: 'top',
    actionRequired: true,           // Bloque tant que pas cliqué
  },
  {
    target: 'card-niveau',          // Re-pointer la carte niveau (XP)
    text: 'Bravo ! Tu as gagné de l\'XP — la barre se remplit.',
    position: 'bottom',
    actionRequired: false,
    autoNext: 2500,                 // Avance auto après 2.5s
  },
  {
    target: 'nav-jeux',             // ID de l'onglet Jeux dans la nav
    text: 'D\'autres mini-jeux t\'attendent ici !',
    position: 'top',
    actionRequired: false,
  },
  {
    target: 'nav-boutique',         // ID de l'onglet Boutique
    text: 'Et dépense tes cookies pour personnaliser ton profil.',
    position: 'top',
    actionRequired: false,
  },
];
```

⚠️ **Note importante sur les étapes** : il n'y a **PAS** d'étape pour le marché ni le profil dans le tuto initial. Ils se découvriront via les bulles contextuelles ou seront introduits quand débloqués (ex. marché au niveau 3 — voir Étape 6).

---

## Étape 3 — Le SpotlightOverlay (cercle découpé)

C'est l'élément qui rend le tuto pro : un voile sombre semi-transparent recouvre tout, sauf un **cercle lumineux** autour de l'élément ciblé.

### Implémentation avec SVG

```jsx
function SpotlightOverlay({ target }) {
  const [bounds, setBounds] = useState(null);

  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setBounds(rect);
    // Re-update on scroll/resize
    const update = () => setBounds(el.getBoundingClientRect());
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
    };
  }, [target]);

  if (!bounds) return null;

  // Cercle un peu plus grand que l'élément, avec padding
  const padding = 12;
  const cx = bounds.left + bounds.width / 2;
  const cy = bounds.top + bounds.height / 2;
  const r = Math.max(bounds.width, bounds.height) / 2 + padding;

  return (
    <svg
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 200,
        pointerEvents: 'none',
      }}
    >
      <defs>
        <mask id="spotlight-mask">
          {/* Tout en blanc (visible) */}
          <rect width="100%" height="100%" fill="white" />
          {/* Cercle en noir (transparent) */}
          <circle cx={cx} cy={cy} r={r} fill="black" />
        </mask>
      </defs>
      {/* Voile sombre sauf le cercle */}
      <rect
        width="100%"
        height="100%"
        fill="rgba(15, 8, 4, 0.78)"
        mask="url(#spotlight-mask)"
        style={{ transition: 'all 0.3s ease' }}
      />
      {/* Anneau doré autour du spotlight */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#D4A017"
        strokeWidth="3"
        opacity="0.7"
        style={{ filter: 'drop-shadow(0 0 8px rgba(212,160,23,0.6))' }}
      />
    </svg>
  );
}
```

### Animation du cercle

Pour que le cercle "respire" doucement (effet glow), ajouter dans le bloc `<style>` global :

```css
@keyframes spotlightPulse {
  0%, 100% { stroke-width: 3; opacity: 0.7; }
  50%      { stroke-width: 5; opacity: 1; }
}
```

Et appliquer `style={{ animation: 'spotlightPulse 1.8s ease-in-out infinite' }}` sur le `<circle>` doré.

---

## Étape 4 — La bulle de texte (TutorialBubble)

Bulle qui apparaît à côté de l'élément ciblé.

### Implémentation

```jsx
function TutorialBubble({ text, position, actionRequired, onNext, onSkip, stepCount, totalSteps }) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShouldShow(true), 400);
    return () => clearTimeout(t);
  }, [text]);

  if (!shouldShow) return null;

  return (
    <div
      className="bi"
      style={{
        position: 'fixed',
        bottom: position === 'bottom' ? 'auto' : 100,
        top: position === 'bottom' ? '60%' : 'auto',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(140deg, #4A2C17, #7D4E1F)',
        color: 'white',
        borderRadius: 18,
        padding: '16px 20px',
        maxWidth: 320,
        width: 'calc(100% - 40px)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.4), 0 0 24px rgba(212,160,23,0.3)',
        border: '2px solid rgba(212,160,23,0.4)',
        zIndex: 210,
      }}
    >
      {/* Step counter */}
      <div style={{
        fontSize: 10,
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 6,
      }}>
        Étape {stepCount} / {totalSteps}
      </div>

      {/* Text */}
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1.45,
        marginBottom: 14,
      }}>
        {text}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        {onSkip ? (
          <button
            onClick={onSkip}
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Passer le tutoriel
          </button>
        ) : <div />}

        {!actionRequired ? (
          <button
            onClick={onNext}
            style={{
              padding: '8px 18px',
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #D4A017, #C17F3C)',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Suivant →
          </button>
        ) : (
          <div style={{
            fontSize: 11,
            color: '#D4A017',
            fontWeight: 700,
          }}>
            👇 Clique pour continuer
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Étape 5 — Action obligatoire à l'étape 3 (check-in)

À l'étape 3, le tutoriel attend que l'utilisateur clique sur la carte Check-in. Il ne peut **pas** avancer avec un bouton "Suivant".

### Logique

Modifier `doCheckin()` pour avancer le tutoriel si on est à l'étape 3 :

```js
const doCheckin = () => {
  // ... logique existante ...

  // Si on est dans le tuto à l'étape 3, passer à l'étape 4
  if (tutorialStep === 3) {
    setTimeout(() => setTutorialStep(4), 500); // Léger délai pour voir l'animation de gain
  }
};
```

L'utilisateur **doit** cliquer la carte Check-in. Pas d'autre moyen d'avancer (sauf "Passer le tutoriel" qui est désactivé après l'étape 1).

---

## Étape 6 — Skip le tutoriel

Le bouton "Passer le tutoriel" n'est visible **qu'à l'étape 1** (pour ne pas être tenté de skip après avoir déjà commencé).

Au clic :
1. Afficher une **modal de confirmation** :
   ```
   ⚠️ Passer le tutoriel ?
   Tu peux le manquer si tu débutes — mais tu peux toujours explorer librement.

   [Annuler]  [Confirmer]
   ```
2. Si confirmé : `setTutorialStep(0)` + `localStorage.setItem('cookiminer:tutorialCompleted', '1')`

---

## Étape 7 — Ajouter les IDs sur les éléments cibles

Dans le code existant, ajouter `id="..."` sur les éléments suivants :

```jsx
<div id="card-niveau" ...>            {/* La grande carte ESPRESSO niveau + XP */}
<div id="cookie-counter" ...>          {/* Le pill doré avec 🍪 [N] en haut à droite */}
<button id="card-checkin" ...>         {/* La carte cliquable du Check-in dans l'accueil */}
<button id="nav-jeux" ...>             {/* Le bouton "Jeux" dans la nav du bas */}
<button id="nav-boutique" ...>         {/* Le bouton "Boutique" dans la nav */}
```

Il faut juste **ajouter** ces IDs sans rien d'autre changer.

---

## Étape 8 — Mini-bulles contextuelles (1re fois)

En plus du tutoriel principal, afficher des **bulles courtes** la première fois que l'utilisateur ouvre certains éléments. Une fois vue, la bulle ne réapparaît plus jamais.

### Liste des bulles contextuelles

```js
const CONTEXT_HINTS = {
  'first-quiz': {
    text: '💡 Réponds bien pour gagner des cookies — un quiz par jour !',
    trigger: 'open-quiz',
  },
  'first-spin': {
    text: '🎰 La roue te fait gagner... ou perdre des cookies. Bonne chance !',
    trigger: 'open-spin',
  },
  'first-click': {
    text: '⚡ Tape le cookie le plus vite possible en 10 secondes !',
    trigger: 'open-click',
  },
  'first-stop-cafe': {
    text: '☕ Maintiens le bouton, vise la zone dorée — sans déborder !',
    trigger: 'open-stop-cafe',
  },
  'first-marche': {
    text: '📈 Investis tes cookies en $CKM. Le prix monte ET descend !',
    trigger: 'open-marche',
  },
  'first-boutique': {
    text: '🛍️ Achète badges, titres, thèmes et skins pour personnaliser !',
    trigger: 'open-boutique',
  },
};
```

### Implémentation

State global :
```js
const [seenHints, setSeenHints] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem('cookiminer:seenHints') || '[]');
  } catch { return []; }
});

const [activeHint, setActiveHint] = useState(null);

const showHint = (hintId) => {
  if (seenHints.includes(hintId) || tutorialStep > 0) return;
  setActiveHint(CONTEXT_HINTS[hintId]);
  const newSeen = [...seenHints, hintId];
  setSeenHints(newSeen);
  localStorage.setItem('cookiminer:seenHints', JSON.stringify(newSeen));
};
```

Appeler `showHint('first-quiz')` quand l'utilisateur ouvre le Quiz pour la première fois, etc.

### Composant ContextHint

Plus simple que le tutoriel — juste une bulle qui apparaît en bas, sans spotlight :

```jsx
function ContextHint({ hint, onClose }) {
  if (!hint) return null;

  return (
    <div
      className="bi"
      style={{
        position: 'fixed',
        bottom: 110,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(140deg, #4A2C17, #7D4E1F)',
        color: 'white',
        borderRadius: 16,
        padding: '12px 16px',
        maxWidth: 320,
        width: 'calc(100% - 40px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        border: '1.5px solid rgba(212,160,23,0.3)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
        {hint.text}
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          borderRadius: 8,
          padding: '4px 8px',
          color: 'white',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        ✕
      </button>
    </div>
  );
}
```

Auto-close après 6 secondes :
```js
useEffect(() => {
  if (!activeHint) return;
  const t = setTimeout(() => setActiveHint(null), 6000);
  return () => clearTimeout(t);
}, [activeHint]);
```

---

## Étape 9 — Intégration dans `CookiTrader`

Dans le `return` du composant principal, ajouter à la fin (après les autres modals) :

```jsx
{tutorialStep > 0 && (
  <TutorialOverlay
    step={tutorialStep}
    onNext={() => setTutorialStep(s => {
      const next = s + 1;
      if (next > 6) {
        localStorage.setItem('cookiminer:tutorialCompleted', '1');
        return 0;
      }
      return next;
    })}
    onSkip={() => setShowSkipConfirm(true)}
  />
)}

{showSkipConfirm && (
  <SkipConfirmModal
    onCancel={() => setShowSkipConfirm(false)}
    onConfirm={() => {
      setShowSkipConfirm(false);
      setTutorialStep(0);
      localStorage.setItem('cookiminer:tutorialCompleted', '1');
    }}
  />
)}

<ContextHint hint={activeHint} onClose={() => setActiveHint(null)} />
```

---

## Vérifications après implémentation

- ☑ Au premier lancement (après l'onboarding nom+avatar), le tutoriel démarre automatiquement
- ☑ Le voile sombre avec cercle découpé fonctionne correctement
- ☑ La bulle se positionne sans se superposer à l'élément ciblé
- ☑ Le bouton "Passer le tutoriel" n'est visible qu'à l'étape 1
- ☑ À l'étape 3, l'utilisateur DOIT cliquer le check-in (pas de bouton Suivant)
- ☑ Après check-in, l'étape 4 se déclenche automatiquement (avec auto-skip après 2.5s)
- ☑ À la fin (étape 6 + Suivant), le tuto se ferme et `tutorialCompleted` est mis à `'1'`
- ☑ Les utilisateurs existants (`totalEarned > 0`) ne voient PAS le tutoriel
- ☑ Les bulles contextuelles s'affichent à la 1re ouverture de chaque jeu/onglet
- ☑ Une bulle vue ne réapparaît jamais (stockée dans `seenHints`)
- ☑ Tutoriel + bulles ne se déclenchent JAMAIS en même temps (priorité au tutoriel)
- ☑ Tout est mobile-friendly (testé en 390px de large)
- ☑ Tout reste en palette café — aucun rouge ni vert

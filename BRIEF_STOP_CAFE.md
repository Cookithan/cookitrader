# Brief — Refonte du jeu "Stop le café" 🎯

Lis bien le CLAUDE.md avant de commencer.
**Propose-moi un plan en puces et attends ma validation avant de coder.**

---

## Contexte

Le jeu "Stop le café" existe déjà dans `App.jsx` mais son design est trop minimal.
On va le refondre avec une vraie tasse animée qui se remplit, des zones colorées, des feedbacks visuels riches.

---

## Ce qu'il faut faire

Localiser le composant `StopCafeGame` (ou équivalent — le jeu "Stop le café") dans `App.jsx`
et **remplacer son JSX et son CSS par la version complète ci-dessous**, en adaptant juste :
- La récupération des cookies (utiliser `onEarn` et `onSpend` du composant existant)
- Le wrapper extérieur (garder l'overlay GameOverlay existant, on remplace seulement le contenu interne)

---

## Mécaniques de jeu

- **Maintien** du bouton → la tasse se remplit en direct
- Vitesse de remplissage : **38% par seconde** (atteint 100% en environ 2,6s)
- **Zone dorée (90-99%)** → +6 cookies au relâchement
- **Parfait (100-105%)** → +15 cookies au relâchement
- **Débordement (> 105%)** → -3 cookies, fin auto du tour
- **Trop tôt (< 90%)** → 0 cookie
- Reset automatique 2,2s après le résultat

**Logique d'affichage IMPORTANTE** : la priorité va au débordement.
Si `pct > 105` → "💧 Ça déborde !"
Sinon si `pct >= 100` → "★ Parfait ! Lâche maintenant !"
Sinon si `pct >= 90` → "✦ Zone dorée"
Sinon → "Maintiens pour verser le café"

Ne **jamais** afficher "Parfait" et "Ça déborde" en même temps.

---

## Structure visuelle (de haut en bas)

1. **Header avec compteur cookies** — déjà géré par GameOverlay
2. **Stats en haut** : 2 cartes côte à côte
   - "Niveau" (en %, doré)
   - "Parfaits d'affilée" (avec petit badge ⭐ doré)
3. **Tasse SVG centrée** (180×180) avec :
   - Soucoupe en dessous
   - Tasse en céramique crème (couleur `#F0E4D0`)
   - Anneau coloré autour (zone-ring) qui change selon la zone
   - Glow radial derrière la tasse qui s'allume en zone dorée/parfait
   - Café qui se remplit (clip-path) couleur `#5C3317`
   - Mousse de café en haut couleur `#C8A878`
   - 3 traînées de vapeur animées en haut (qui s'arrêtent quand on lâche)
4. **% de remplissage en gros** (52px, couleur dynamique selon zone)
5. **Label** sous le % : "Maintiens..." / "Zone dorée" / "Parfait !" / "Ça déborde !"
6. **Bannière de résultat** (apparaît au relâchement, disparaît au reset)
7. **Bouton "☕ Maintenir"** central (200×64, gradient GOLD, pulse pendant maintien)
8. **3 cartes "tips"** en bas avec les règles du jeu

---

## Palette de couleurs

- Fond app : `#F5EFE6`
- Cartes blanches : `white` avec border `1.5px solid #E8DDD0`
- Texte principal : `#2C1810`
- Texte muet : `#8B6A5A`
- Or/caramel (zone dorée) : `#D4A017`
- Or clair (parfait) : `#F5DC8A`, `#C8960C`
- Espresso (débordement) : `#6B3D20`, `#3D2010`
- Gradient gold : `linear-gradient(135deg, #D4A017, #C17F3C)`
- Gradient win : `linear-gradient(135deg, #FBEFD4, #F0C050)`
- Gradient perfect : `linear-gradient(135deg, #F5DC8A, #D4A017)`
- Gradient lose : `linear-gradient(135deg, #5D3A1F, #2D1810)`

**Pas de rouge ni de vert** — tons cookie/café uniquement.

---

## Animations à ajouter dans le bloc `<style>` global

Si elles n'existent pas déjà :

```css
@keyframes steam1 { 0%,100%{transform:translateY(0) scaleX(1) rotate(-3deg);opacity:.7} 50%{transform:translateY(-18px) scaleX(1.3) rotate(3deg);opacity:0} }
@keyframes steam2 { 0%,100%{transform:translateY(0) scaleX(1) rotate(4deg);opacity:.5} 50%{transform:translateY(-22px) scaleX(1.4) rotate(-4deg);opacity:0} }
@keyframes steam3 { 0%,100%{transform:translateY(0) scaleX(1) rotate(-2deg);opacity:.6} 50%{transform:translateY(-16px) scaleX(1.2) rotate(2deg);opacity:0} }
@keyframes pulseHold { 0%,100%{box-shadow:0 0 0 0 rgba(212,160,23,.5)} 50%{box-shadow:0 0 0 12px rgba(212,160,23,0)} }
@keyframes popIn { 0%{transform:scale(0) translateY(20px);opacity:0} 60%{transform:scale(1.15) translateY(-4px)} 100%{transform:scale(1) translateY(0);opacity:1} }
@keyframes floatUpFb { 0%{opacity:1;transform:translateX(-50%) translateY(0)} 100%{opacity:0;transform:translateX(-50%) translateY(-40px)} }
@keyframes glowRing { 0%,100%{box-shadow:0 0 16px rgba(212,160,23,.4)} 50%{box-shadow:0 0 32px rgba(212,160,23,.9)} }
@keyframes perfectPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
```

---

## Code complet du composant

Adapter au style React existant (styles inline + sans tailwind).
Les states React internes au jeu :
- `fillPct` (number, 0-108)
- `holding` (boolean)
- `gameOver` (boolean)
- `parfaits` (number, compteur de parfaits d'affilée)
- `totalPlayed` (number)
- `result` (objet { type, title, sub } ou null)
- `feedback` (objet { text, color, key } ou null pour l'animation float)

Utiliser `useRef` pour stocker l'animation frame ID et le timestamp précédent.
Utiliser `requestAnimationFrame` pour la boucle de remplissage.

### Logique d'animation principale

```js
const FILL_RATE = 38;     // % par seconde
const GOLD_MIN = 90;
const PERFECT = 100;
const OVERFLOW = 105;

const tick = (ts) => {
  if (!lastTimeRef.current) lastTimeRef.current = ts;
  const dt = (ts - lastTimeRef.current) / 1000;
  lastTimeRef.current = ts;

  setFillPct(prev => {
    const next = Math.min(prev + FILL_RATE * dt, 108);
    if (next >= OVERFLOW) {
      resolveGame(next);
      return next;
    }
    return next;
  });

  if (holdingRef.current && !gameOverRef.current) {
    rafRef.current = requestAnimationFrame(tick);
  }
};
```

### Logique resolveGame

```js
const resolveGame = (pct) => {
  setGameOver(true);
  setHolding(false);
  cancelAnimationFrame(rafRef.current);

  setTotalPlayed(t => t + 1);

  if (pct > OVERFLOW) {
    setParfaits(0);
    onSpend(3); // perdre 3 cookies
    setResult({ type: 'lose', title: '💧 Ça déborde !', sub: '-3 🍪 perdus' });
    showFeedback('-3 🍪', '#6B3D20');
  } else if (pct >= PERFECT) {
    setParfaits(p => p + 1);
    onEarn(15);
    setResult({ type: 'perfect', title: '⭐ Parfait absolu !', sub: '+15 🍪 gagnés' });
    showFeedback('+15 🍪', '#C8960C');
  } else if (pct >= GOLD_MIN) {
    setParfaits(p => p + 1);
    onEarn(6);
    setResult({ type: 'win', title: '✦ Zone dorée !', sub: '+6 🍪 gagnés' });
    showFeedback('+6 🍪', '#D4A017');
  } else {
    setParfaits(0);
    setResult({ type: 'lose', title: 'Trop tôt...', sub: 'Vise entre 90% et 100%' });
  }

  setTimeout(reset, 2200);
};

const reset = () => {
  setFillPct(0);
  setGameOver(false);
  setResult(null);
  lastTimeRef.current = null;
};
```

### Logique de zone (priorité au débordement)

```js
const getZone = (pct) => {
  if (pct > OVERFLOW) return 'overflow';
  if (pct >= PERFECT) return 'perfect';
  if (pct >= GOLD_MIN) return 'gold';
  return 'idle';
};

const getLabel = (pct) => {
  if (pct > OVERFLOW) return '💧 Ça déborde !';
  if (pct >= PERFECT)  return '★ Parfait ! Lâche maintenant !';
  if (pct >= GOLD_MIN) return '✦ Zone dorée — encore un peu...';
  return 'Maintiens pour verser le café';
};
```

---

## Points clés du SVG de la tasse

- viewBox 180×180
- ClipPath `cup-clip` qui suit la forme intérieure de la tasse
- `<rect id="coffee-fill">` clippé qui monte selon `fillPct`
- `<ellipse id="foam">` (mousse) qui suit le haut du café
- Anse à droite avec deux paths superposés (couleur extérieure et intérieure)
- Reflet blanc sur la gauche de la tasse (path avec `stroke="rgba(255,255,255,0.6)"`)
- Bord supérieur (rim) avec deux ellipses superposées

Calcul du remplissage SVG :
```js
const maxH = 95;
const h = (Math.min(fillPct, 105) / 105) * maxH;
const y = 155 - h;
// rect: y={y} height={h + 5}
// foam: cy={y + 2} opacity={Math.min(fillPct/30, 0.85)}
```

---

## Gestion du touch / mouse

```jsx
<button
  onMouseDown={startHold}
  onMouseUp={stopHold}
  onMouseLeave={stopHold}
  onTouchStart={(e) => { e.preventDefault(); startHold(); }}
  onTouchEnd={stopHold}
  style={{ touchAction: 'manipulation', userSelect: 'none' }}
>
```

Refs nécessaires :
- `holdingRef` (mirror de `holding` pour la closure RAF)
- `gameOverRef` (mirror de `gameOver`)
- `rafRef` (id requestAnimationFrame)
- `lastTimeRef` (timestamp précédent)

À chaque `setHolding` ou `setGameOver`, mettre à jour le ref correspondant via un `useEffect`.

---

## Vérifications à faire après l'implémentation

- ☕ Maintenir le bouton remplit la tasse en environ 2,6s à 100%
- ✦ Lâcher entre 90 et 99% donne +6 cookies (zone dorée)
- ⭐ Lâcher entre 100 et 105% donne +15 cookies (parfait)
- 💧 Dépasser 105% sans lâcher déclenche -3 cookies automatiquement
- Le label affiche toujours **un seul** message à la fois (jamais "Parfait" en même temps que "Ça déborde")
- Les "Parfaits d'affilée" se réinitialisent à 0 si on rate (débordement ou trop tôt)
- La vapeur s'arrête bien quand on lâche
- L'anneau coloré change instantanément selon la zone
- Animation de remplissage fluide
- Reset automatique après 2,2s
- Test mobile : le tap fonctionne bien sans double-tap zoom

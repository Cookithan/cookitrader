# Brief — Refonte du jeu "Réflexes café" ⚡🍪

Lis bien le CLAUDE.md avant de commencer.
**Propose-moi un plan en puces et attends ma validation avant de coder.**

---

## Contexte

Le jeu "Réflexes café" (`ReflexGame.jsx` dans `src/components/games/`) existe déjà et fonctionne, mais son design est **trop minimaliste** : une zone beige uniforme avec un petit cookie qui apparaît et disparaît. Manque de jus, de feedback, d'ambiance.

On va le refondre pour créer une **vraie table de café** vue de dessus, avec un cookie premium et des effets d'impact qui claquent.

---

## ⚠️ Important — Ce qu'il faut PRÉSERVER

La **logique de jeu existante reste intacte** :
- Coût : 5 🍪 par partie
- Durée : 30 secondes
- Cookie apparaît à des positions aléatoires
- Cookie reste visible 1.5s au début → 0.5s à la fin (s'accélère)
- Tap réussi → score +1, nouveau cookie après 150ms
- Loupé → score -1 (min 0), nouveau cookie après 220ms
- Récompenses : 25+ → +50 cookies + record / 15-24 → +25 / 5-14 → +10 / ≤4 → 0
- Phases : idle → countdown 3-2-1-GO → playing 30s → done
- Persistance du record dans localStorage

**On change UNIQUEMENT le rendu visuel** de l'aire de jeu, du cookie, et des effets de tap.

---

## Étape 1 — Nouveau design de l'aire de jeu (table en bois)

L'aire de jeu actuelle est probablement un `<div>` avec fond beige uniforme. La remplacer par cette structure :

```jsx
<div className="reflex-arena">
  {/* Background table en bois */}
  <div className="rx-arena-bg" />

  {/* Wood knots décoratifs */}
  <div className="rx-knot rx-k1" />
  <div className="rx-knot rx-k2" />
  <div className="rx-knot rx-k3" />

  {/* Halo de lumière au centre */}
  <div className="rx-light-spot" />

  {/* Compteur combo en haut à gauche */}
  <div className="rx-combo-counter">
    🔥 Combo : <span className="num">{combo}</span>
  </div>

  {/* Badge combo qui pop */}
  {comboBadge && (
    <div className="rx-combo-badge" key={comboBadge.key}>
      {comboBadge.text}
    </div>
  )}

  {/* Le cookie cliquable (positionné aléatoirement) */}
  {currentCookie && (
    <div
      className={`rx-cookie ${currentCookie.tapped ? 'tapped' : ''} ${currentCookie.disappearing ? 'disappearing' : ''}`}
      style={{ left: currentCookie.x + 'px', top: currentCookie.y + 'px' }}
      onClick={handleTap}
    >
      {/* SVG du cookie premium - voir étape 3 */}
    </div>
  )}

  {/* Particules de tap injectées dynamiquement */}
  <div ref={particlesRef} className="rx-particles-layer" />
</div>
```

⚠️ **Garder la logique JS existante** pour la spawn / disparition / tap. On change juste le rendu.

---

## Étape 2 — CSS de l'aire de jeu

À ajouter dans le bloc `<style>` global :

```css
/* === RÉFLEXES CAFÉ === */
.reflex-arena {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 18px;
  overflow: hidden;
  position: relative;
  margin-bottom: 14px;
  box-shadow: 0 12px 32px rgba(74, 44, 23, 0.3);
  border: 2px solid #E8DDD0;
}

/* Table en bois */
.rx-arena-bg {
  position: absolute;
  inset: 0;
  background:
    /* Wood grain - vertical lines (planches) */
    repeating-linear-gradient(90deg,
      transparent 0px,
      transparent 38px,
      rgba(74, 44, 23, 0.4) 38px,
      rgba(74, 44, 23, 0.4) 40px,
      transparent 40px,
      transparent 78px,
      rgba(74, 44, 23, 0.3) 78px,
      rgba(74, 44, 23, 0.3) 80px),
    /* Subtle horizontal grain */
    repeating-linear-gradient(0deg,
      rgba(193, 127, 60, 0.1) 0px,
      rgba(193, 127, 60, 0.1) 1px,
      transparent 1px,
      transparent 4px),
    linear-gradient(135deg, #B07E4F 0%, #8B5A2B 50%, #6B4220 100%);
}
.rx-arena-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 30%, rgba(45, 22, 8, 0.5) 100%);
  pointer-events: none;
}

/* Nœuds de bois décoratifs */
.rx-knot {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #5C3317, #3D2010);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  opacity: 0.6;
  z-index: 1;
}
.rx-k1 { top: 15%; left: 12%; width: 12px; height: 8px; }
.rx-k2 { top: 70%; right: 18%; width: 10px; height: 7px; }
.rx-k3 { top: 45%; left: 78%; width: 14px; height: 9px; }

/* Halo lumière */
.rx-light-spot {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 60% 50% at 50% 40%, rgba(255, 220, 150, 0.18), transparent 70%);
  pointer-events: none;
  z-index: 1;
}

/* Compteur combo en haut à gauche */
.rx-combo-counter {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(45, 22, 8, 0.85);
  backdrop-filter: blur(8px);
  color: #D4A017;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 800;
  z-index: 5;
  border: 1.5px solid rgba(212, 160, 23, 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.rx-combo-counter .num { font-size: 16px; }

/* Badge combo (x2/x3/x4) */
.rx-combo-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(135deg, #D4A017, #C17F3C);
  color: white;
  padding: 6px 12px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 900;
  z-index: 5;
  box-shadow: 0 4px 12px rgba(212, 160, 23, 0.5);
  animation: rxComboPop 0.3s ease;
}
@keyframes rxComboPop {
  0% { transform: scale(0); opacity: 0; }
  70% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

/* === COOKIE CIBLE === */
.rx-cookie {
  position: absolute;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  cursor: pointer;
  z-index: 4;
  animation: rxCookieAppear 0.25s ease-out;
  transform-origin: center;
  transition: opacity 0.15s;
}
.rx-cookie.disappearing {
  animation: rxCookieDisappear 0.2s ease-out forwards;
  pointer-events: none;
}
.rx-cookie.tapped {
  animation: rxCookieTapped 0.3s ease-out forwards;
  pointer-events: none;
}

/* Anneau qui pulse autour du cookie */
.rx-cookie::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(212, 160, 23, 0.5);
  animation: rxCookiePulse 0.8s ease-in-out infinite;
  pointer-events: none;
}

@keyframes rxCookieAppear {
  0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
  60%  { transform: scale(1.15) rotate(5deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}
@keyframes rxCookieDisappear {
  0%   { transform: scale(1) rotate(0); opacity: 1; }
  100% { transform: scale(0) rotate(40deg); opacity: 0; }
}
@keyframes rxCookieTapped {
  0%   { transform: scale(1); opacity: 1; }
  50%  { transform: scale(1.4); opacity: 0.8; }
  100% { transform: scale(0); opacity: 0; }
}
@keyframes rxCookiePulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50%      { transform: scale(1.15); opacity: 0; }
}

/* Particules de tap (crumbs + sparkles) */
.rx-particles-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 6;
}
.rx-crumb {
  position: absolute;
  font-size: 16px;
  animation: rxCrumbFly 0.7s ease-out forwards;
  pointer-events: none;
}
@keyframes rxCrumbFly {
  0%   { transform: translate(0, 0) rotate(0) scale(1); opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(0.4); opacity: 0; }
}
.rx-plus-one {
  position: absolute;
  font-size: 18px;
  font-weight: 900;
  color: #D4A017;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  animation: rxPlusOneFloat 0.7s ease-out forwards;
  pointer-events: none;
}
@keyframes rxPlusOneFloat {
  0%   { transform: translate(-50%, 0) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50px) scale(1.4); opacity: 0; }
}
```

---

## Étape 3 — Le cookie SVG premium

À l'intérieur du `<div className="rx-cookie">`, mettre **exactement** ce SVG (cookie haute qualité) :

```jsx
<svg viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'100%', display:'block', filter:'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}>
  <defs>
    <radialGradient id="ckGrad" cx="38%" cy="32%" r="78%">
      <stop offset="0%" stopColor="#F0BB7A"/>
      <stop offset="45%" stopColor="#C17F3C"/>
      <stop offset="100%" stopColor="#7D4E1F"/>
    </radialGradient>
    <radialGradient id="ckChip" cx="35%" cy="30%" r="80%">
      <stop offset="0%" stopColor="#5C2C0A"/>
      <stop offset="100%" stopColor="#1A0A00"/>
    </radialGradient>
  </defs>
  <circle cx="35" cy="36" r="32" fill="#7D4E1F"/>
  <circle cx="35" cy="35" r="32" fill="url(#ckGrad)"/>
  <circle cx="35" cy="35" r="32" fill="none" stroke="rgba(255,225,170,0.4)" strokeWidth="1"/>
  <ellipse cx="22" cy="22" rx="5" ry="4" fill="#1F0E04" transform="rotate(-20 22 22)"/>
  <ellipse cx="22" cy="22" rx="4" ry="3" fill="url(#ckChip)" transform="rotate(-20 22 22)"/>
  <ellipse cx="46" cy="20" rx="4" ry="3" fill="#1F0E04" transform="rotate(15 46 20)"/>
  <ellipse cx="46" cy="20" rx="3.2" ry="2.3" fill="url(#ckChip)" transform="rotate(15 46 20)"/>
  <ellipse cx="18" cy="44" rx="4" ry="3" fill="#1F0E04" transform="rotate(-10 18 44)"/>
  <ellipse cx="18" cy="44" rx="3.2" ry="2.3" fill="url(#ckChip)" transform="rotate(-10 18 44)"/>
  <ellipse cx="50" cy="44" rx="5" ry="4" fill="#1F0E04" transform="rotate(25 50 44)"/>
  <ellipse cx="50" cy="44" rx="4" ry="3" fill="url(#ckChip)" transform="rotate(25 50 44)"/>
  <ellipse cx="34" cy="52" rx="4" ry="3" fill="#1F0E04" transform="rotate(-5 34 52)"/>
  <ellipse cx="34" cy="52" rx="3.2" ry="2.3" fill="url(#ckChip)" transform="rotate(-5 34 52)"/>
  <ellipse cx="36" cy="34" rx="3" ry="2.3" fill="#1F0E04"/>
  <ellipse cx="36" cy="34" rx="2.3" ry="1.5" fill="url(#ckChip)"/>
  <ellipse cx="22" cy="16" rx="10" ry="5" fill="rgba(255,235,200,0.4)" transform="rotate(-30 22 16)"/>
  <ellipse cx="20" cy="14" rx="5" ry="2" fill="rgba(255,250,225,0.55)" transform="rotate(-30 20 14)"/>
</svg>
```

⚠️ **Attention React** : utiliser `stopColor` (pas `stop-color`) et `strokeWidth` (pas `stroke-width`) — sinon ça produit des warnings.

---

## Étape 4 — Système de combo

Ajouter ces states dans `ReflexGame` :

```js
const [combo, setCombo] = useState(0);
const [comboBadge, setComboBadge] = useState(null); // { text, key }
```

**Logique** :
- À chaque cookie tapé → `combo++`
- À chaque cookie loupé → `combo = 0`
- Quand `combo === 3` → afficher badge "x2 🔥" pendant 1.5s
- Quand `combo === 7` → afficher badge "x3 ⚡" pendant 1.5s
- Quand `combo === 12` → afficher badge "x4 💥" pendant 1.5s

```js
// Quand tap réussi
const handleTap = (e) => {
  // ... logique existante (score+1, etc.)
  const newCombo = combo + 1;
  setCombo(newCombo);

  if (newCombo === 3)  setComboBadge({ text: 'x2 🔥', key: Date.now() });
  if (newCombo === 7)  setComboBadge({ text: 'x3 ⚡', key: Date.now() });
  if (newCombo === 12) setComboBadge({ text: 'x4 💥', key: Date.now() });

  // Particules (voir étape 5)
  spawnTapParticles(e);
};

// Auto-clear du badge après 1.5s
useEffect(() => {
  if (!comboBadge) return;
  const t = setTimeout(() => setComboBadge(null), 1500);
  return () => clearTimeout(t);
}, [comboBadge]);

// Quand cookie loupé
const onCookieMissed = () => {
  // ... logique existante (score-1, etc.)
  setCombo(0);
};
```

⚠️ **Le combo est purement visuel** — il ne change pas les récompenses du jeu. C'est juste pour l'effet wahou. La logique de scoring reste inchangée.

---

## Étape 5 — Particules au tap (crumbs + plus-one)

Au moment où l'utilisateur tape un cookie, faire jaillir 6 particules autour + un "+1 🍪" qui flotte.

```js
const particlesRef = useRef(null);

const spawnTapParticles = (e) => {
  const arenaEl = particlesRef.current?.parentElement;
  if (!arenaEl) return;
  const arenaRect = arenaEl.getBoundingClientRect();

  // Position du cookie tapé
  const cookieEl = e.currentTarget;
  const cookieRect = cookieEl.getBoundingClientRect();
  const x = cookieRect.left - arenaRect.left + cookieRect.width / 2;
  const y = cookieRect.top - arenaRect.top + cookieRect.height / 2;

  // 6 crumbs qui jaillissent en cercle
  for (let i = 0; i < 6; i++) {
    const crumb = document.createElement('div');
    crumb.className = 'rx-crumb';
    crumb.textContent = i % 2 === 0 ? '🍪' : '✨';
    crumb.style.left = (x - 8) + 'px';
    crumb.style.top  = (y - 8) + 'px';
    const angle = (i / 6) * Math.PI * 2;
    const dist = 50 + Math.random() * 30;
    crumb.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
    crumb.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
    crumb.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    particlesRef.current.appendChild(crumb);
    setTimeout(() => crumb.remove(), 700);
  }

  // +1 🍪 qui flotte
  const plus = document.createElement('div');
  plus.className = 'rx-plus-one';
  plus.textContent = '+1 🍪';
  plus.style.left = x + 'px';
  plus.style.top = (y - 10) + 'px';
  particlesRef.current.appendChild(plus);
  setTimeout(() => plus.remove(), 700);
};
```

---

## Étape 6 — Stat "Tapés" qui s'allume + "Temps" qui devient urgent

Modifier les stats au-dessus de l'aire de jeu :

```jsx
<div className={`stat ${phase === 'playing' ? 'active' : ''}`}>
  <div className="stat-icon">🍪</div>
  <div className="stat-val">{score}</div>
  <div className="stat-label">Tapés</div>
</div>

<div className={`stat ${timeLeft <= 5 && phase === 'playing' ? 'urgent' : ''}`}>
  <div className="stat-icon">⏱️</div>
  <div className="stat-val">{timeLeft}<span style={{fontSize:13, color:'#8B6A5A'}}>s</span></div>
  <div className="stat-label">Temps</div>
</div>
```

CSS à ajouter (si pas déjà là) :

```css
.stat.active {
  border-color: #D4A017;
  box-shadow: 0 4px 12px rgba(212, 160, 23, 0.25);
}
.stat.urgent {
  border-color: #6B3D20;
  animation: rxShake 0.25s ease infinite;
}
.stat.urgent .stat-val {
  color: #6B3D20;
}
@keyframes rxShake {
  0%, 100% { transform: translate(0, 0); }
  25%      { transform: translate(-2px, 1px); }
  75%      { transform: translate(2px, -1px); }
}
```

Et la barre de temps qui passe en moka quand ≤5s :

```jsx
<div className="time-bar-wrap">
  <div
    className={`time-bar ${timeLeft <= 5 ? 'urgent' : ''}`}
    style={{ width: (timeLeft / 30 * 100) + '%' }}
  />
</div>
```

```css
.time-bar.urgent {
  background: linear-gradient(90deg, #4A2C17, #6B3D20);
}
```

---

## Étape 7 — Texte d'instruction au-dessus de la zone de récompense

Sous l'aire de jeu, afficher selon la phase :

```jsx
<div className="rx-instruction">
  {phase === 'idle' && 'Prêt à tester tes réflexes ?'}
  {phase === 'countdown' && 'Prépare-toi...'}
  {phase === 'playing' && 'Tape ! Tape ! Tape !'}
  {phase === 'done' && 'Bien joué !'}
</div>
```

```css
.rx-instruction {
  text-align: center;
  font-size: 13px;
  font-weight: 800;
  color: #D4A017;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 12px;
  min-height: 18px;
}
```

---

## Vérifications après implémentation

- ☑ L'aire de jeu a maintenant un fond **table en bois** (planches verticales + grain horizontal + nœuds de bois)
- ☑ **Vignette sombre** sur les bords donne de la profondeur
- ☑ **Halo lumineux** au centre simule un spot
- ☑ Le cookie est **plus gros (70px)** et **premium** (gradient profond, chips à gradient, reflet)
- ☑ **Anneau qui pulse** autour du cookie pour l'attirer l'œil
- ☑ Cookie apparaît avec **pop animation** (rotation + scale)
- ☑ Cookie loupé disparaît avec **rotation + fade**
- ☑ Cookie tapé : explose en scale 1.4 puis disparaît
- ☑ **6 particules** 🍪 et ✨ giclent autour à chaque tap
- ☑ **+1 🍪 doré** flotte vers le haut à chaque tap
- ☑ **Compteur combo** persistant en haut à gauche
- ☑ **Badge x2/x3/x4** apparaît à 3/7/12 combos d'affilée
- ☑ Combo reset à 0 si on rate un cookie
- ☑ Carte "Temps" tremble en moka dans les 5 dernières secondes
- ☑ Barre de temps passe sombre en mode urgence
- ☑ La logique de jeu existante n'a PAS été modifiée (scores, récompenses, durée, accélération)
- ☑ Le record dans localStorage fonctionne toujours
- ☑ Tout est mobile-friendly (testé en 390px)
- ☑ Palette uniquement café — pas de rouge ni de vert

---

## ⚠️ Rappels importants à Claude Code

- **Ne touche PAS à la logique de spawn / disparition / tap / score** — copie le SVG et le CSS, intègre les nouveaux états (combo, comboBadge, particlesRef), c'est tout.
- **Tous les selectors préfixés `rx-`** pour éviter les conflits avec d'autres jeux.
- **Le SVG doit être copié EXACTEMENT** (avec `stopColor`, pas `stop-color`).
- **Pas d'optimisation** : si le code semble redondant, copie-le quand même.
- **Procède par étapes** :
  1. Étape 1+2 : structure + CSS de l'arena (sans toucher au cookie pour l'instant)
  2. Étape 3 : remplacer le cookie par le nouveau SVG
  3. Étape 4 : ajouter le système de combo
  4. Étape 5 : ajouter les particules au tap
  5. Étape 6+7 : finitions (stats urgentes, instruction)
- Faire un commit à la fin de chaque étape testée visuellement.

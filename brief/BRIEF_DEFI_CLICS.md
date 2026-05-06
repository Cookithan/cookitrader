# Brief — Refonte du jeu "Défi de clics" 🍪

Lis bien le CLAUDE.md avant de commencer.
**Propose-moi un plan en puces et attends ma validation avant de coder.**

---

## Contexte

Le jeu "Défi de clics" (`ClickGame` dans `App.jsx`) existe déjà mais son design est trop simple.
On va le refondre avec un cookie premium animé, un compte à rebours, des combos, et plein de feedbacks visuels.

---

## Ce qu'il faut faire

Localiser le composant `ClickGame` dans `App.jsx` et **remplacer son contenu** par la version refaite ci-dessous.
Garder le wrapper `GameOverlay` existant — on remplace seulement le contenu interne.

---

## Mécaniques de jeu

- **Coût pour jouer** : 5 cookies (existant, à conserver via `onSpend(5)`)
- **Compte à rebours 3-2-1-GO** avant le démarrage du jeu (animation visible)
- **Durée** : 10 secondes
- **Récompense** : `Math.floor(clicks / 2)` cookies via `onEarn`
- **Record** : si `clicks > clickRecord`, mettre à jour via `onUpdateRecord(clicks)` et déclencher confettis
- **Combos** : système d'encouragement visuel (pas d'effet sur les gains)
  - 5 clics consécutifs en moins de 250ms → "x2 🔥"
  - 12 clics consécutifs → "x3 ⚡"
  - 20 clics consécutifs → "x4 💥"
  - Combo se reset si plus de 250ms entre 2 clics

---

## Structure visuelle (de haut en bas)

1. **Header GameOverlay** — déjà géré (titre + retour + compteur cookies)
2. **3 cartes de stats côte à côte** :
   - 🍪 **Clics** (compteur en direct)
   - ⏱️ **Temps** (10s → 0s, devient sombre et tremble dans les 3 dernières secondes)
   - 🏆 **Record** (record actuel ; pulse en doré si battu)
3. **Barre de temps** horizontale qui se vide pendant la partie
4. **Zone du cookie** (280×280) avec :
   - Halo radial doré derrière qui s'allume quand le jeu est lancé
   - Le cookie SVG premium (voir code ci-dessous)
   - Anneaux dorés qui se propagent à chaque tap
   - Particules `+1 🍪` qui s'envolent à chaque tap
   - Overlay compte à rebours (3, 2, 1, GO!) avec animation
   - Badge combo "x2 🔥" qui apparaît en haut à droite
5. **Texte d'instruction** sous le cookie ("Prêt à tapoter le cookie ?" / "Tape ! Tape ! Tape !")
6. **Bannière de résultat** (apparaît à la fin, avec 3 stats : Clics, Clics/s, Cookies gagnés)
7. **Bouton "Commencer / Rejouer"** central qui glow doucement
8. **Carte tip** en bas avec la règle (1 cookie = 2 clics)

---

## Le cookie SVG premium (à utiliser)

C'est le cookie principal du jeu (skin par défaut). Il combine gradient premium + texture relief.
Voici le code SVG complet à intégrer dans le composant React :

```jsx
<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'100%', display:'block' }}>
  <defs>
    <radialGradient id="cookie-grad" cx="38%" cy="32%" r="78%">
      <stop offset="0%" stopColor="#F0BB7A"/>
      <stop offset="45%" stopColor="#C17F3C"/>
      <stop offset="100%" stopColor="#7D4E1F"/>
    </radialGradient>
    <radialGradient id="chip-grad" cx="35%" cy="30%" r="80%">
      <stop offset="0%" stopColor="#5C2C0A"/>
      <stop offset="100%" stopColor="#1A0A00"/>
    </radialGradient>
    <radialGradient id="chip-grad-small" cx="35%" cy="30%" r="80%">
      <stop offset="0%" stopColor="#4A2008"/>
      <stop offset="100%" stopColor="#0F0500"/>
    </radialGradient>
  </defs>

  {/* Ombre */}
  <ellipse cx="110" cy="208" rx="74" ry="9" fill="rgba(0,0,0,.18)"/>

  {/* Corps du cookie */}
  <circle cx="110" cy="113" r="98" fill="#7D4E1F"/>
  <circle cx="110" cy="110" r="100" fill="url(#cookie-grad)"/>

  {/* Bord organique */}
  <path d="M 110 12 Q 132 16 148 24 Q 168 34 182 50 Q 198 70 204 94 Q 210 116 206 138 Q 200 162 184 180 Q 166 196 142 204 Q 116 210 92 206 Q 66 200 46 186 Q 24 168 14 144 Q 6 120 12 96 Q 20 72 36 54 Q 56 34 82 22 Q 96 16 110 12"
        stroke="#7D4E1F" strokeWidth="2" fill="none" opacity=".45"/>

  {/* Anneau scintillant */}
  <circle cx="110" cy="110" r="100" fill="none" stroke="rgba(255,225,170,.35)" strokeWidth="1.5"/>

  {/* Fissures de pâte */}
  <path d="M 70 70 Q 85 95 110 100 Q 130 105 150 88" stroke="#5C3317" strokeWidth="1.5" fill="none" opacity=".5"/>
  <path d="M 60 140 Q 90 145 115 155 Q 145 165 165 145" stroke="#5C3317" strokeWidth="1.5" fill="none" opacity=".4"/>
  <path d="M 145 50 Q 155 75 145 95" stroke="#5C3317" strokeWidth="1.2" fill="none" opacity=".35"/>

  {/* Gros chips */}
  <ellipse cx="78" cy="80" rx="14" ry="10" fill="#1F0E04" transform="rotate(-20 78 80)"/>
  <ellipse cx="78" cy="80" rx="12" ry="8" fill="url(#chip-grad)" transform="rotate(-20 78 80)"/>
  <ellipse cx="74" cy="76" rx="3.5" ry="2.5" fill="rgba(255,200,140,.4)" transform="rotate(-20 74 76)"/>

  <ellipse cx="138" cy="68" rx="12" ry="9" fill="#1F0E04" transform="rotate(15 138 68)"/>
  <ellipse cx="138" cy="68" rx="10" ry="7" fill="url(#chip-grad)" transform="rotate(15 138 68)"/>
  <ellipse cx="135" cy="65" rx="3" ry="2" fill="rgba(255,200,140,.4)" transform="rotate(15 135 65)"/>

  <ellipse cx="62" cy="128" rx="12" ry="9" fill="#1F0E04" transform="rotate(-10 62 128)"/>
  <ellipse cx="62" cy="128" rx="10" ry="7" fill="url(#chip-grad)" transform="rotate(-10 62 128)"/>
  <ellipse cx="59" cy="125" rx="3" ry="2" fill="rgba(255,200,140,.4)" transform="rotate(-10 59 125)"/>

  <ellipse cx="155" cy="125" rx="14" ry="10" fill="#1F0E04" transform="rotate(25 155 125)"/>
  <ellipse cx="155" cy="125" rx="12" ry="8" fill="url(#chip-grad)" transform="rotate(25 155 125)"/>
  <ellipse cx="151" cy="121" rx="3.5" ry="2.5" fill="rgba(255,200,140,.4)" transform="rotate(25 151 121)"/>

  <ellipse cx="105" cy="160" rx="13" ry="9" fill="#1F0E04" transform="rotate(-5 105 160)"/>
  <ellipse cx="105" cy="160" rx="11" ry="7" fill="url(#chip-grad)" transform="rotate(-5 105 160)"/>
  <ellipse cx="102" cy="156" rx="3" ry="2" fill="rgba(255,200,140,.4)" transform="rotate(-5 102 156)"/>

  {/* Petits chips */}
  <ellipse cx="158" cy="162" rx="10" ry="7" fill="#1F0E04" transform="rotate(10 158 162)"/>
  <ellipse cx="158" cy="162" rx="8" ry="5" fill="url(#chip-grad-small)" transform="rotate(10 158 162)"/>
  <ellipse cx="50" cy="168" rx="10" ry="7" fill="#1F0E04" transform="rotate(-15 50 168)"/>
  <ellipse cx="50" cy="168" rx="8" ry="5" fill="url(#chip-grad-small)" transform="rotate(-15 50 168)"/>
  <ellipse cx="115" cy="105" rx="9" ry="7" fill="#1F0E04" transform="rotate(5 115 105)"/>
  <ellipse cx="115" cy="105" rx="7" ry="5" fill="url(#chip-grad-small)" transform="rotate(5 115 105)"/>

  {/* Reflet glossy */}
  <ellipse cx="76" cy="62" rx="32" ry="16" fill="rgba(255,235,200,.4)" transform="rotate(-30 76 62)"/>
  <ellipse cx="70" cy="56" rx="16" ry="7" fill="rgba(255,250,225,.55)" transform="rotate(-30 70 56)"/>

  {/* Sparkles */}
  <circle cx="158" cy="50" r="2" fill="rgba(255,235,180,.95)"/>
  <circle cx="172" cy="78" r="1.5" fill="rgba(255,235,180,.85)"/>
  <circle cx="48" cy="98" r="1.5" fill="rgba(255,235,180,.85)"/>
  <circle cx="180" cy="155" r="1.5" fill="rgba(255,235,180,.8)"/>
  <circle cx="35" cy="140" r="1.2" fill="rgba(255,235,180,.7)"/>
  <circle cx="95" cy="38" r="1.2" fill="rgba(255,235,180,.7)"/>
</svg>
```

⚠️ **IMPORTANT** : si la boutique a des skins de cookie débloqués (`activeSkin`), garder la logique pour pouvoir overrider ce SVG par défaut. Sinon utiliser ce SVG comme cookie standard.

---

## Animations à ajouter dans le bloc `<style>` global

```css
@keyframes idle { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-8px) rotate(2deg)} }
@keyframes pulseGlow { 0%,100%{box-shadow:0 0 0 0 rgba(212,160,23,.5)} 50%{box-shadow:0 0 0 14px rgba(212,160,23,0)} }
@keyframes floatUpClick { 0%{opacity:1;transform:translate(-50%,0) scale(1)} 100%{opacity:0;transform:translate(calc(-50% + var(--tx,0)),-80px) scale(.6)} }
@keyframes shake { 0%,100%{transform:translate(0,0) rotate(0)} 25%{transform:translate(-2px,1px) rotate(-1deg)} 75%{transform:translate(2px,-1px) rotate(1deg)} }
@keyframes ringExpand { 0%{transform:scale(.5);opacity:.8} 100%{transform:scale(2);opacity:0} }
@keyframes countdown { 0%{transform:scale(2);opacity:0} 30%{transform:scale(1);opacity:1} 80%{transform:scale(1);opacity:1} 100%{transform:scale(.5);opacity:0} }
@keyframes glow { 0%,100%{box-shadow:0 0 16px rgba(212,160,23,.4)} 50%{box-shadow:0 0 32px rgba(212,160,23,.85)} }
@keyframes popIn { 0%{transform:scale(0) translateY(20px);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
@keyframes recordPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
@keyframes confetti { 0%{transform:translate(0,0) rotate(0);opacity:1} 100%{transform:translate(var(--tx),var(--ty)) rotate(720deg);opacity:0} }
```

---

## Logique React

### States internes

```js
const [phase, setPhase] = useState('idle'); // idle, countdown, playing, done
const [clicks, setClicks] = useState(0);
const [timeLeft, setTimeLeft] = useState(10);
const [countdown, setCountdown] = useState(null); // 3, 2, 1, 'GO', null
const [particles, setParticles] = useState([]); // floating +1 cookies
const [rings, setRings] = useState([]); // tap rings
const [combo, setCombo] = useState(null); // { text, key }
const [pressed, setPressed] = useState(false);
const [showConfetti, setShowConfetti] = useState(false);
```

### Refs

```js
const lastTapRef = useRef(0);    // timestamp dernier tap
const comboCountRef = useRef(0); // taille du combo en cours
const timerRef = useRef(null);   // setInterval id
const countdownRef = useRef(null);
```

### Démarrage avec compte à rebours

```js
const startGame = () => {
  if (coins < 5) return;
  onSpend(5);
  setPhase('countdown');
  setClicks(0);
  setTimeLeft(10);
  comboCountRef.current = 0;

  let n = 3;
  setCountdown(n);
  countdownRef.current = setInterval(() => {
    n--;
    if (n > 0) {
      setCountdown(n);
    } else if (n === 0) {
      setCountdown('GO');
    } else {
      clearInterval(countdownRef.current);
      setCountdown(null);
      setPhase('playing');
      // Démarrer le timer principal
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            endGame();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
  }, 800);
};
```

### Gestion du tap

```js
const handleTap = (e) => {
  if (phase !== 'playing') return;
  e.preventDefault();
  setClicks(c => c + 1);
  setPressed(true);
  setTimeout(() => setPressed(false), 80);

  // Particle
  const id = Date.now() + Math.random();
  const tx = (Math.random() - 0.5) * 80;
  setParticles(p => [...p, { id, tx }]);
  setTimeout(() => setParticles(p => p.filter(x => x.id !== id)), 800);

  // Ring
  setRings(r => [...r, id]);
  setTimeout(() => setRings(r => r.filter(x => x !== id)), 550);

  // Combo
  const now = Date.now();
  if (now - lastTapRef.current < 250) {
    comboCountRef.current++;
    if (comboCountRef.current === 5)  setCombo({ text:'x2 🔥', key: now });
    if (comboCountRef.current === 12) setCombo({ text:'x3 ⚡', key: now });
    if (comboCountRef.current === 20) setCombo({ text:'x4 💥', key: now });
  } else {
    comboCountRef.current = 1;
  }
  lastTapRef.current = now;
};
```

Combo se reset visuellement après 1.5s :
```js
useEffect(() => {
  if (!combo) return;
  const t = setTimeout(() => setCombo(null), 1500);
  return () => clearTimeout(t);
}, [combo]);
```

### Fin de partie

```js
const endGame = () => {
  setPhase('done');
  const earned = Math.floor(clicks / 2);
  if (earned > 0) onEarn(earned);
  if (clicks > bestScore) {
    onUpdateRecord(clicks);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1500);
  }
};
```

---

## Palette de couleurs

- Fond app : `#F5EFE6` (déjà géré par le thème)
- Cartes blanches : `white`, border `1.5px solid #E8DDD0`
- Texte primaire : `#2C1810`
- Texte muet : `#8B6A5A`
- Or/caramel : `#D4A017`
- Espresso (urgence temps) : `#6B3D20`, `#4A2C17`
- Gradient gold (boutons) : `linear-gradient(135deg, #D4A017, #C17F3C)`
- Gradient win (résultat normal) : `linear-gradient(135deg, #FBEFD4, #F0C050)`
- Gradient record (résultat record battu) : `linear-gradient(135deg, #F5DC8A, #D4A017)`

**Pas de rouge ni de vert** — tons cookie/café uniquement (rappel CLAUDE.md).

---

## Détails de comportement

### Cartes de stats

- **Clics** : bordure passe à `#D4A017` quand `phase === 'playing'`
- **Temps** : bordure passe à `#6B3D20` + animation `shake` quand `timeLeft <= 3`
- **Record** : pulse en doré pendant 1.5s quand un nouveau record est battu

### Barre de temps

- Largeur = `(timeLeft / 10) * 100%`
- Gradient caramel doré normalement
- Gradient sombre `#4A2C17 → #6B3D20` quand `timeLeft <= 3`

### Cookie

- Animation `idle` (flottement doux) quand `phase === 'idle' || phase === 'done'`
- Pas d'animation idle pendant `playing`
- Au tap : `transform: scale(.88) rotate(-3deg)` pendant 80ms
- Filter `grayscale(.4) brightness(.85)` quand `phase === 'done'`
- Halo glow derrière qui s'intensifie quand `phase === 'playing'`

### Compte à rebours

- Numbers 3, 2, 1 affichés en grand (96px, fontWeight 900, couleur `#D4A017`)
- "GO !" en plus petit (64px, couleur `#C8960C`)
- Animation `countdown` qui scale-in puis scale-out

### Confettis (sur record battu)

- 14 emojis (🍪 et ✨ alternés) qui explosent depuis le centre
- Trajectoires circulaires (cos/sin × distance aléatoire 120-180px)
- Animation `confetti` 1.4s
- Délai en cascade : `${i * 0.02}s`

---

## Vérifications après l'implémentation

- ✅ Compte à rebours 3-2-1-GO visible avant le jeu
- ✅ Clics se comptent en direct dans la stat
- ✅ Anneaux dorés se propagent à chaque tap
- ✅ Particules `+1 🍪` flottantes à chaque tap
- ✅ Cookie a animation idle quand pas en jeu
- ✅ Carte Temps tremble dans les 3 dernières secondes
- ✅ Combos x2/x3/x4 apparaissent sur clics rapides
- ✅ Bannière de résultat avec 3 stats (Clics, Clics/s, Cookies)
- ✅ Confettis si record battu
- ✅ Bouton glow doucement quand idle, "Rejouer" après partie
- ✅ Plus de cookies = `Math.floor(clicks/2)` reçus via `onEarn`
- ✅ `onUpdateRecord(clicks)` appelé si record battu
- ✅ Palette uniquement café — pas de rouge ni de vert
- ✅ Test mobile : taps fluides, pas de double-tap zoom

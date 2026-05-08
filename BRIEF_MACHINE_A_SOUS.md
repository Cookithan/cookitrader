# Brief — Mini-jeu "Machine à Sous" 🎰☕

Lis bien le CLAUDE.md avant de commencer.
**Procède UNE phase à la fois et attends ma validation visuelle entre chaque phase.**

⚠️ **IMPORTANT POUR LE DESIGN** : ce brief contient le HTML/CSS **EXACT** à utiliser pour la machine à sous. **Ne pas réinventer**, ne pas remplacer par d'autres emojis, ne pas changer les couleurs. Coller TEL QUEL et adapter dynamiquement avec React.

---

## 🎯 Concept du jeu

**Machine à Sous** est un mini-jeu de hasard qui simule une vraie machine à sous de casino. Le joueur paye 20 🍪, les 3 rouleaux tournent et s'arrêtent un par un (suspense). Selon la combinaison, il gagne des cookies.

Visuellement c'est inspiré des **vraies machines à sous** : cadre marron foncé avec rouleaux dorés. Le tout 100% dans la palette café CookiMiner.

---

## ⚙️ Règles précises

| Élément | Valeur |
|---|---|
| Coût pour jouer | **20 cookies** |
| Niveau requis | **10** |
| Cooldown entre lancers | **1 seconde** |
| Limite quotidienne | **50 parties / jour** |
| Espérance mathématique | ≈ **0** (équilibrée, ni casino qui plume ni cadeau) |

---

## 🎲 Symboles & Probabilités

5 symboles distincts dans le thème café. Chaque rouleau tire un symbole indépendamment selon ces poids :

| Symbole | Poids | Probabilité par rouleau |
|---|---|---|
| 7️⃣ Jackpot | 5 | 5% |
| 💎 Diamant | 8 | 8% |
| ☕ Café | 10 | 10% |
| 🥐 Croissant | 25 | 25% |
| 🍪 Cookie | 52 | 52% |

⚠️ **Note importante** : Les probabilités finales (3 identiques) découlent du calcul `p^3` :
- 3 × 7️⃣ = 5%³ = 0,0125% ≈ très rare
- 3 × 💎 = 8%³ = 0,051%
- 3 × ☕ = 10%³ = 0,1%
- 3 × 🥐 = 25%³ = 1,56%
- 3 × 🍪 = 52%³ = 14%

Pour atteindre les probabilités annoncées dans la maquette (0.05% pour jackpot, etc.), on **ajuste les poids** ou on utilise un tirage **biaisé** par table de probabilités. **Choisir l'approche tirage par table** (plus simple à équilibrer) — voir code phase 2.

---

## 💰 Récompenses

| Combinaison | Gain |
|---|---|
| 3 × 7️⃣ | **+750 🍪** + JACKPOT |
| 3 × 💎 | **+250 🍪** |
| 3 × ☕ | **+150 🍪** |
| 3 × 🥐 | **+80 🍪** |
| 3 × 🍪 | **+50 🍪** |
| 2 identiques | **+25 🍪** |
| Aucun match | **0 🍪** |

---

# ══════════════════════════════════════════════
# PHASE 1 — Vérifier les prérequis
# ══════════════════════════════════════════════

## À vérifier

1. ☑ Le système de mini-jeux existe (Memory, Réflexes, Pile de Tasses, etc.)
2. ☑ Le système de niveaux fonctionne
3. ☑ La fonction `addCoins(amount)` existe
4. ☑ La fonction `spendCoins(amount)` existe (ou équivalent)
5. ☑ La sauvegarde quotidienne existe pour le compteur "X / 50 parties aujourd'hui"

## Action utilisateur

Confirmer que ces prérequis sont OK avant de commencer.

---

# ══════════════════════════════════════════════
# PHASE 2 — Module logique (`src/lib/slotMachine.js`)
# ══════════════════════════════════════════════

Créer le fichier `src/lib/slotMachine.js` :

```js
// ════════════════════════════════════════════
// LOGIQUE MACHINE À SOUS
// ════════════════════════════════════════════

export const SLOT_SYMBOLS = ['7️⃣', '💎', '☕', '🥐', '🍪'];

// Configuration des gains pour 3 identiques
export const TRIPLE_GAINS = {
  '7️⃣': { gain: 750, name: 'Jackpot', isJackpot: true },
  '💎': { gain: 250, name: 'Diamant', isJackpot: false },
  '☕': { gain: 150, name: 'Café', isJackpot: false },
  '🥐': { gain: 80,  name: 'Croissant', isJackpot: false },
  '🍪': { gain: 50,  name: 'Cookie', isJackpot: false },
};

// Constantes de jeu
export const SLOT_CONFIG = {
  COST: 20,
  REQUIRED_LEVEL: 10,
  COOLDOWN_MS: 1000,
  MAX_PER_DAY: 50,
  PAIR_GAIN: 25,
  REEL_STOP_DELAY_MS: 500, // délai entre l'arrêt de chaque rouleau
  REEL_FIRST_STOP_MS: 800, // délai avant le 1er rouleau s'arrête
  JACKPOT_EXPLOSION_MS: 1500, // durée de l'explosion avant que la modal pop
};

/**
 * Tire un résultat selon les probabilités cibles.
 * On utilise un tirage par table pour avoir des probabilités exactes.
 *
 * Probabilités cibles :
 * - Triple 7 (jackpot) : 0.05%
 * - Triple diamant    : 0.2%
 * - Triple café       : 0.3%
 * - Triple croissant  : 1.6%
 * - Triple cookie     : 6.4%
 * - 2 identiques      : 54%
 * - Aucun match       : 37.45%
 *
 * Total = 100%
 *
 * @returns {[string, string, string]} les 3 symboles tirés
 */
export function spinSlotMachine() {
  const rand = Math.random() * 100;
  let cumulative = 0;

  // Triple 7 : 0.05%
  cumulative += 0.05;
  if (rand < cumulative) return ['7️⃣', '7️⃣', '7️⃣'];

  // Triple diamant : 0.2%
  cumulative += 0.2;
  if (rand < cumulative) return ['💎', '💎', '💎'];

  // Triple café : 0.3%
  cumulative += 0.3;
  if (rand < cumulative) return ['☕', '☕', '☕'];

  // Triple croissant : 1.6%
  cumulative += 1.6;
  if (rand < cumulative) return ['🥐', '🥐', '🥐'];

  // Triple cookie : 6.4%
  cumulative += 6.4;
  if (rand < cumulative) return ['🍪', '🍪', '🍪'];

  // 2 identiques : 54%
  cumulative += 54;
  if (rand < cumulative) {
    return generateTwoSameResult();
  }

  // Aucun match : 37.45%
  return generateNoMatchResult();
}

/**
 * Génère un résultat avec exactement 2 symboles identiques.
 */
function generateTwoSameResult() {
  // Tirer le symbole qui sera doublé
  const sym = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
  // Tirer un autre symbole différent
  let otherSym;
  do {
    otherSym = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
  } while (otherSym === sym);

  // Choisir une position pour l'élément différent (0, 1 ou 2)
  const oddPos = Math.floor(Math.random() * 3);

  const result = [sym, sym, sym];
  result[oddPos] = otherSym;
  return result;
}

/**
 * Génère un résultat sans match (3 symboles tous différents OU pattern A-B-A à exclure).
 * On force 3 symboles strictement différents.
 */
function generateNoMatchResult() {
  const shuffled = [...SLOT_SYMBOLS].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1], shuffled[2]];
}

/**
 * Évalue le résultat et renvoie le gain.
 *
 * @param {[string, string, string]} result
 * @returns {{ gain: number, type: 'jackpot' | 'triple' | 'pair' | 'none', symbolName?: string, symbol?: string }}
 */
export function evaluateResult(result) {
  const [a, b, c] = result;
  const allSame = a === b && b === c;
  const twoSame = (a === b) || (b === c) || (a === c);

  if (allSame) {
    const config = TRIPLE_GAINS[a];
    return {
      gain: config.gain,
      type: config.isJackpot ? 'jackpot' : 'triple',
      symbolName: config.name,
      symbol: a,
    };
  }

  if (twoSame) {
    return { gain: SLOT_CONFIG.PAIR_GAIN, type: 'pair' };
  }

  return { gain: 0, type: 'none' };
}

/**
 * Détermine quels rouleaux sont gagnants pour le highlight visuel.
 * Renvoie un tableau de booléens [reel1, reel2, reel3].
 */
export function getWinningReels(result) {
  const [a, b, c] = result;
  if (a === b && b === c) return [true, true, true];
  if (a === b) return [true, true, false];
  if (b === c) return [false, true, true];
  if (a === c) return [true, false, true];
  return [false, false, false];
}
```

## Vérifications phase 2
- ☑ Fichier `src/lib/slotMachine.js` créé
- ☑ Pas d'erreur de syntaxe
- ☑ Les fonctions sont exportées : `spinSlotMachine`, `evaluateResult`, `getWinningReels`
- ☑ Faire un test rapide : `console.log(spinSlotMachine())` doit renvoyer un tableau de 3 emojis

---

# ══════════════════════════════════════════════
# PHASE 3 — Composant `<SlotMachineGame>` — Structure
# ══════════════════════════════════════════════

Créer `src/components/SlotMachineGame.jsx` :

```jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  SLOT_SYMBOLS,
  SLOT_CONFIG,
  spinSlotMachine,
  evaluateResult,
  getWinningReels,
} from '../lib/slotMachine';

export default function SlotMachineGame({ onClose, coins, addCoins, spendCoins, level }) {
  // ÉTAT DES ROULEAUX
  const [reelStates, setReelStates] = useState([
    { spinning: false, stopping: false, symbol: '?', isWinner: false, isJackpot: false },
    { spinning: false, stopping: false, symbol: '?', isWinner: false, isJackpot: false },
    { spinning: false, stopping: false, symbol: '?', isWinner: false, isJackpot: false },
  ]);

  // ÉTAT DU JEU
  const [isSpinning, setIsSpinning] = useState(false);
  const [machineEffect, setMachineEffect] = useState(null); // null | 'win-flash' | 'jackpot-flash'

  // FEEDBACK
  const [toasts, setToasts] = useState([]); // [{ id, message, type }]
  const [showJackpotModal, setShowJackpotModal] = useState(false);
  const [jackpotAmount, setJackpotAmount] = useState(0);
  const [machineConfetti, setMachineConfetti] = useState([]); // [{ id, color, transform, delay }]

  // COMPTEUR & COOLDOWN
  const [gamesToday, setGamesToday] = useState(0);
  const [lastSpinAt, setLastSpinAt] = useState(0);

  // RÉFÉRENCES
  const spinIntervalRef = useRef(null);
  const cycleIntervalRef = useRef(null);

  // Charger le compteur quotidien depuis le localStorage
  useEffect(() => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('cookiminer:slotMachineGamesToday');
    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === today) {
        setGamesToday(data.count);
      }
    }
  }, []);

  // Sauvegarder le compteur quand il change
  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem('cookiminer:slotMachineGamesToday', JSON.stringify({
      date: today,
      count: gamesToday,
    }));
  }, [gamesToday]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearTimeout(spinIntervalRef.current);
      if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
    };
  }, []);

  // ... le reste sera implémenté dans les phases suivantes
}
```

## Vérifications phase 3
- ☑ Composant `SlotMachineGame` créé avec la structure ci-dessus
- ☑ Aucune erreur React (l'app build)
- ☑ Le compteur quotidien se charge depuis le localStorage

---

# ══════════════════════════════════════════════
# PHASE 4 — Layout visuel (la machine, les rouleaux, le tableau)
# ══════════════════════════════════════════════

⚠️ **CRITIQUE** : Coller exactement les couleurs et tailles ci-dessous. Aucune modification.

Ajouter dans le composant `SlotMachineGame` le rendu JSX :

```jsx
return (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 100,
    background: '#F5EFE6',
    display: 'flex', flexDirection: 'column',
    padding: 16,
    fontFamily: 'system-ui, sans-serif',
    overflowY: 'auto',
  }}>
    {/* HEADER */}
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 12,
    }}>
      <button
        onClick={onClose}
        style={{
          background: 'rgba(45, 22, 8, 0.08)',
          border: 'none', borderRadius: '50%',
          width: 36, height: 36, color: '#2C1810',
          fontSize: 18, cursor: 'pointer',
        }}
      >‹</button>
      <div style={{
        fontSize: 17, fontWeight: 800, flex: 1, textAlign: 'center',
        marginLeft: -36, color: '#2C1810',
      }}>Machine à Sous</div>
      <div style={{
        background: '#D4A017', borderRadius: 100,
        padding: '6px 12px', fontWeight: 800, fontSize: 13, color: '#2C1810',
      }}>🍪 {coins.toLocaleString()}</div>
    </div>

    {/* SUBTITLE */}
    <div style={{
      textAlign: 'center', color: '#C17F3C',
      fontSize: 11, fontWeight: 800, letterSpacing: 3,
      textTransform: 'uppercase', margin: '14px 0 16px',
    }}>🎰 Tente ta chance</div>

    {/* TOAST CONTAINER (positionnés en haut au-dessus de la machine) */}
    <div style={{
      position: 'absolute', top: 130, left: 0, right: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      zIndex: 60, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <SlotToast key={t.id} message={t.message} type={t.type} />
      ))}
    </div>

    {/* MACHINE WRAPPER (position relative pour les confettis) */}
    <div style={{
      margin: '0 auto 16px', width: '100%', maxWidth: 320,
      position: 'relative',
    }}>
      <SlotMachineCabinet
        reelStates={reelStates}
        machineEffect={machineEffect}
      />

      {/* Confettis émis depuis la machine */}
      {machineConfetti.map(c => (
        <div
          key={c.id}
          style={{
            position: 'absolute',
            left: '50%', top: '50%',
            width: 8, height: 8,
            background: c.color,
            borderRadius: 2,
            pointerEvents: 'none',
            animation: 'slotMachineConfetti 1.6s ease-out forwards',
            animationDelay: c.delay + 's',
            '--confetti-end': c.transform,
          }}
        />
      ))}
    </div>

    {/* BOUTON LANCER */}
    <div style={{ textAlign: 'center', margin: '18px 0 14px' }}>
      <button
        onClick={handleSpin}
        disabled={!canSpin()}
        style={{
          background: canSpin()
            ? 'linear-gradient(180deg, #E8B81B 0%, #D4A017 50%, #B58A0E 100%)'
            : 'linear-gradient(180deg, #C9B788 0%, #A89968 100%)',
          color: canSpin() ? '#2C1810' : 'rgba(44, 24, 16, 0.5)',
          border: 'none', borderRadius: 100,
          padding: '14px 38px',
          fontSize: 15, fontWeight: 900,
          cursor: canSpin() ? 'pointer' : 'not-allowed',
          boxShadow: canSpin()
            ? '0 4px 0 #8C6800, 0 8px 16px rgba(212, 160, 23, 0.4)'
            : '0 4px 0 #6E6240',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          transition: 'all 0.1s',
        }}
      >
        {getButtonLabel()}
      </button>
    </div>

    {/* TABLEAU DES GAINS */}
    <PayoutTable />

    {/* COMPTEUR */}
    <div style={{
      textAlign: 'center', marginTop: 12,
      fontSize: 11, color: '#A0784E', fontStyle: 'italic',
    }}>
      {gamesToday} / {SLOT_CONFIG.MAX_PER_DAY} parties aujourd'hui
    </div>

    {/* MODAL JACKPOT */}
    {showJackpotModal && (
      <JackpotModal
        amount={jackpotAmount}
        onClose={() => setShowJackpotModal(false)}
      />
    )}
  </div>
);

// ────────────────────────────────────────────
// Helper : peut-on lancer ?
// ────────────────────────────────────────────
function canSpin() {
  if (isSpinning) return false;
  if (level < SLOT_CONFIG.REQUIRED_LEVEL) return false;
  if (coins < SLOT_CONFIG.COST) return false;
  if (gamesToday >= SLOT_CONFIG.MAX_PER_DAY) return false;
  if (Date.now() - lastSpinAt < SLOT_CONFIG.COOLDOWN_MS) return false;
  return true;
}

// ────────────────────────────────────────────
// Label du bouton selon l'état
// ────────────────────────────────────────────
function getButtonLabel() {
  if (level < SLOT_CONFIG.REQUIRED_LEVEL) return `🔒 Niveau ${SLOT_CONFIG.REQUIRED_LEVEL} requis`;
  if (gamesToday >= SLOT_CONFIG.MAX_PER_DAY) return '🔒 Limite atteinte';
  if (coins < SLOT_CONFIG.COST) return '🔒 Pas assez de cookies';
  if (isSpinning) return '...';
  return `▶ Lancer (${SLOT_CONFIG.COST} 🍪)`;
}
```

## Sous-composants à créer

### `<SlotMachineCabinet>` (le cadre + les rouleaux)

```jsx
function SlotMachineCabinet({ reelStates, machineEffect }) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, #5C3317 0%, #4A2C17 100%)',
      borderRadius: 22,
      padding: '18px 14px',
      boxShadow: machineEffect === 'jackpot-flash'
        ? '0 0 60px rgba(212, 160, 23, 1), 0 0 100px rgba(212, 160, 23, 0.7), inset 0 0 30px rgba(255, 215, 90, 0.5)'
        : machineEffect === 'win-flash'
          ? '0 0 30px rgba(212, 160, 23, 0.6), inset 0 0 20px rgba(255, 215, 90, 0.3)'
          : '0 12px 30px rgba(76, 44, 23, 0.35), inset 0 -3px 0 rgba(0,0,0,0.3), inset 0 2px 0 rgba(212, 160, 23, 0.15)',
      transform: machineEffect === 'jackpot-flash' ? 'scale(1.05)' : 'scale(1)',
      transition: 'all 0.3s ease-out',
      position: 'relative',
      border: '2px solid #3D2010',
    }}>
      {/* 2 boules dorées sur les coins (déco) */}
      <div style={{
        position: 'absolute', top: -6, left: 20,
        width: 14, height: 14, borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, #FFD75A 0%, #D4A017 60%, #A07B0E 100%)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }} />
      <div style={{
        position: 'absolute', top: -6, right: 20,
        width: 14, height: 14, borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, #FFD75A 0%, #D4A017 60%, #A07B0E 100%)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }} />

      {/* 3 ROULEAUX */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
      }}>
        {reelStates.map((reel, i) => (
          <SlotReel key={i} state={reel} />
        ))}
      </div>
    </div>
  );
}
```

### `<SlotReel>` (un rouleau)

```jsx
function SlotReel({ state }) {
  const reelStyle = {
    background: 'linear-gradient(180deg, #FFD24D 0%, #E8B81B 50%, #C99607 100%)',
    borderRadius: 12,
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 38,
    boxShadow: state.isJackpot
      ? 'inset 0 -3px 0 rgba(0,0,0,0.18), inset 0 2px 0 rgba(255, 235, 150, 0.5), 0 0 50px rgba(255, 215, 90, 1), 0 0 80px rgba(212, 160, 23, 0.8)'
      : state.isWinner
        ? 'inset 0 -3px 0 rgba(0,0,0,0.18), inset 0 2px 0 rgba(255, 235, 150, 0.5), 0 0 24px rgba(212, 160, 23, 0.9), 0 0 40px rgba(212, 160, 23, 0.5), 0 4px 8px rgba(0,0,0,0.15)'
        : 'inset 0 -3px 0 rgba(0,0,0,0.18), inset 0 2px 0 rgba(255, 235, 150, 0.5), 0 4px 8px rgba(0,0,0,0.15)',
    position: 'relative',
    overflow: 'hidden',
    border: '1.5px solid #A07B0E',
    animation: state.isJackpot
      ? 'slotReelJackpot 0.3s ease-in-out infinite alternate'
      : state.isWinner
        ? 'slotReelWinner 0.5s ease-out infinite alternate'
        : 'none',
  };

  const symbolStyle = {
    animation: state.spinning
      ? 'slotReelSpin 0.06s linear infinite'
      : state.stopping
        ? 'slotReelStop 0.5s cubic-bezier(0.25, 0.1, 0.25, 1.5)'
        : 'none',
  };

  return (
    <div style={reelStyle}>
      <div style={symbolStyle}>{state.symbol}</div>
    </div>
  );
}
```

### `<SlotToast>`

```jsx
function SlotToast({ message, type }) {
  const isBigWin = type === 'big-win';
  return (
    <div style={{
      background: isBigWin
        ? 'linear-gradient(135deg, #C17F3C, #A57021)'
        : 'linear-gradient(135deg, #D4A017, #C17F3C)',
      color: 'white',
      padding: isBigWin ? '10px 20px' : '8px 16px',
      borderRadius: 100,
      fontSize: isBigWin ? 14 : 13,
      fontWeight: 800,
      boxShadow: isBigWin
        ? '0 6px 16px rgba(193, 127, 60, 0.5)'
        : '0 4px 12px rgba(212, 160, 23, 0.4)',
      whiteSpace: 'nowrap',
      animation: 'slotToastSlide 2s ease-out forwards',
    }}>
      {message}
    </div>
  );
}
```

### `<PayoutTable>`

```jsx
function PayoutTable() {
  const ROWS = [
    { count: '3×', symbol: '7️⃣', name: 'Jackpot', prob: '0,05 %', gain: '+750 🍪', isJackpot: true },
    { count: '3×', symbol: '💎', name: 'Diamant', prob: '0,2 %', gain: '+250 🍪' },
    { count: '3×', symbol: '☕', name: 'Café', prob: '0,3 %', gain: '+150 🍪' },
    { count: '3×', symbol: '🥐', name: 'Croissant', prob: '1,6 %', gain: '+80 🍪' },
    { count: '3×', symbol: '🍪', name: 'Cookie', prob: '6,4 %', gain: '+50 🍪' },
  ];

  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 60px 70px',
    alignItems: 'center',
    padding: '6px 0',
    fontSize: 12,
    borderBottom: '1px dashed #E8DDD0',
  };

  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: 14,
      border: '1.5px solid #E8DDD0',
      boxShadow: '0 2px 8px rgba(76, 44, 23, 0.06)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 800, color: '#8B6A5A',
        textTransform: 'uppercase', letterSpacing: 2,
        textAlign: 'center', marginBottom: 12,
      }}>💰 Combinaisons & gains</div>

      {ROWS.map((row, i) => (
        <div key={i} style={{
          ...rowStyle,
          background: row.isJackpot ? 'linear-gradient(90deg, rgba(212, 160, 23, 0.15), rgba(193, 127, 60, 0.05))' : 'transparent',
          borderRadius: row.isJackpot ? 8 : 0,
          padding: row.isJackpot ? '6px 8px' : '6px 0',
          margin: row.isJackpot ? '-2px -4px' : 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: 11, color: '#8B6A5A', fontWeight: 700 }}>{row.count}</span>
            <span style={{ fontSize: 16 }}>{row.symbol}</span>
          </div>
          <div style={{ fontSize: 12, color: '#2C1810', fontWeight: 700 }}>{row.name}</div>
          <div style={{ fontSize: 11, color: '#8B6A5A', textAlign: 'right' }}>{row.prob}</div>
          <div style={{
            fontSize: 13,
            color: row.isJackpot ? '#C17F3C' : '#D4A017',
            fontWeight: row.isJackpot ? 900 : 800,
            textAlign: 'right',
          }}>{row.gain}</div>
        </div>
      ))}

      {/* Divider */}
      <div style={{ height: 1, background: '#E8DDD0', margin: '6px 0' }} />

      {/* 2 identiques */}
      <div style={{ ...rowStyle, borderBottom: '1px dashed #E8DDD0' }}>
        <div></div>
        <div style={{ fontSize: 12, color: '#2C1810', fontWeight: 700 }}>2 identiques</div>
        <div style={{ fontSize: 11, color: '#8B6A5A', textAlign: 'right' }}>54 %</div>
        <div style={{ fontSize: 13, color: '#D4A017', fontWeight: 800, textAlign: 'right' }}>+25 🍪</div>
      </div>

      {/* Aucun match */}
      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <div></div>
        <div style={{ fontSize: 12, color: '#2C1810', fontWeight: 700 }}>Aucun match</div>
        <div style={{ fontSize: 11, color: '#8B6A5A', textAlign: 'right' }}>37 %</div>
        <div style={{ fontSize: 13, color: '#8B6A5A', fontWeight: 800, textAlign: 'right' }}>0</div>
      </div>
    </div>
  );
}
```

### `<JackpotModal>`

```jsx
function JackpotModal({ amount, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(45, 22, 8, 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
      animation: 'slotJackpotFadeIn 0.4s ease-out',
    }}>
      <div style={{
        background: 'linear-gradient(140deg, #D4A017 0%, #C17F3C 100%)',
        borderRadius: 24, padding: '32px 28px',
        maxWidth: 320, width: '100%',
        textAlign: 'center', color: 'white',
        boxShadow: '0 20px 60px rgba(212, 160, 23, 0.6)',
        border: '3px solid #FFD75A',
        animation: 'slotJackpotPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        position: 'relative',
      }}>
        <div style={{
          fontSize: 64, marginBottom: 8,
          animation: 'slotJackpotBounce 0.5s ease-in-out infinite alternate',
        }}>🎰</div>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: 4,
          textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.85)',
        }}>✨ Jackpot ✨</div>
        <div style={{
          fontSize: 32, fontWeight: 900, margin: '6px 0 4px',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>INCROYABLE !</div>
        <div style={{
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 14, padding: '10px 20px',
          fontSize: 24, fontWeight: 900,
          margin: '14px 0', display: 'inline-block',
        }}>+{amount} 🍪</div>
        <button
          onClick={onClose}
          style={{
            background: 'white', color: '#D4A017',
            border: 'none', borderRadius: 14,
            padding: '12px 32px',
            fontSize: 14, fontWeight: 900,
            cursor: 'pointer', width: '100%', marginTop: 8,
            textTransform: 'uppercase', letterSpacing: 1,
          }}
        >Encaisser</button>
      </div>
    </div>
  );
}
```

## CSS global à ajouter (dans `index.css` ou équivalent)

```css
/* ════════════════════════════════════════════
   ANIMATIONS MACHINE À SOUS
   ════════════════════════════════════════════ */

@keyframes slotReelSpin {
  0% { transform: translateY(-100%); opacity: 0.3; }
  50% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(100%); opacity: 0.3; }
}

@keyframes slotReelStop {
  0% { transform: translateY(-50px) scale(0.8); opacity: 0; }
  60% { transform: translateY(5px) scale(1.1); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes slotReelWinner {
  from { transform: scale(1); }
  to { transform: scale(1.05); }
}

@keyframes slotReelJackpot {
  0% { transform: scale(1); }
  100% { transform: scale(1.12); }
}

@keyframes slotToastSlide {
  0% { opacity: 0; transform: translateY(-20px) scale(0.8); }
  15% { opacity: 1; transform: translateY(0) scale(1); }
  85% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
}

@keyframes slotMachineConfetti {
  0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
  100% { opacity: 0; transform: var(--confetti-end); }
}

@keyframes slotJackpotFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slotJackpotPop {
  0% { transform: scale(0) rotate(-12deg); }
  100% { transform: scale(1) rotate(0deg); }
}

@keyframes slotJackpotBounce {
  from { transform: scale(1) rotate(-3deg); }
  to { transform: scale(1.15) rotate(5deg); }
}
```

## Vérifications phase 4
- ☑ Machine à sous visible avec cadre marron + rouleaux dorés + 2 boules dorées sur les coins
- ☑ Bouton "Lancer (20 🍪)" stylé doré avec ombre 3D
- ☑ Tableau des gains visible avec jackpot mis en avant
- ☑ Compteur "X / 50 parties aujourd'hui" affiché
- ☑ Couleurs respectées (palette café uniquement)
- ☑ Aucune animation déclenchée en idle (rouleaux affichent "?")

---

# ══════════════════════════════════════════════
# PHASE 5 — Logique du spin (séquence d'animation)
# ══════════════════════════════════════════════

Ajouter dans le composant `SlotMachineGame` :

```jsx
// ────────────────────────────────────────────
// FONCTION DE LANCER
// ────────────────────────────────────────────

const handleSpin = useCallback(() => {
  if (!canSpin()) return;

  setIsSpinning(true);
  setLastSpinAt(Date.now());
  spendCoins(SLOT_CONFIG.COST);
  setGamesToday(g => g + 1);

  // Reset des effets précédents
  setMachineEffect(null);
  setReelStates(prev => prev.map(r => ({
    ...r,
    spinning: true,
    stopping: false,
    isWinner: false,
    isJackpot: false,
  })));

  // Tirer le résultat
  const result = spinSlotMachine();
  const evaluation = evaluateResult(result);

  // Cycler les symboles aléatoirement pendant le spin
  const cycleInterval = setInterval(() => {
    setReelStates(prev => prev.map(r => {
      if (!r.spinning) return r;
      return {
        ...r,
        symbol: SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
      };
    }));
  }, 60);
  cycleIntervalRef.current = cycleInterval;

  // Arrêter le rouleau 1 après 800ms
  setTimeout(() => {
    setReelStates(prev => {
      const next = [...prev];
      next[0] = { ...next[0], spinning: false, stopping: true, symbol: result[0] };
      return next;
    });
  }, SLOT_CONFIG.REEL_FIRST_STOP_MS);

  // Arrêter le rouleau 2 après 1300ms
  setTimeout(() => {
    setReelStates(prev => {
      const next = [...prev];
      next[1] = { ...next[1], spinning: false, stopping: true, symbol: result[1] };
      return next;
    });
  }, SLOT_CONFIG.REEL_FIRST_STOP_MS + SLOT_CONFIG.REEL_STOP_DELAY_MS);

  // Arrêter le rouleau 3 après 1800ms et évaluer
  setTimeout(() => {
    setReelStates(prev => {
      const next = [...prev];
      next[2] = { ...next[2], spinning: false, stopping: true, symbol: result[2] };
      return next;
    });
    clearInterval(cycleInterval);

    // Petite pause pour que le 3e arrêt se termine, puis évaluer
    setTimeout(() => evaluateAndReward(result, evaluation), 600);
  }, SLOT_CONFIG.REEL_FIRST_STOP_MS + SLOT_CONFIG.REEL_STOP_DELAY_MS * 2);
}, [coins, level, gamesToday, lastSpinAt]);

// ────────────────────────────────────────────
// ÉVALUATION DU RÉSULTAT
// ────────────────────────────────────────────

const evaluateAndReward = (result, evaluation) => {
  const winningReels = getWinningReels(result);

  if (evaluation.type === 'jackpot') {
    // 1. Highlight les 3 rouleaux en mode jackpot
    setReelStates(prev => prev.map((r, i) => ({
      ...r,
      isJackpot: winningReels[i],
    })));

    // 2. Flash de la machine + confettis
    setMachineEffect('jackpot-flash');
    spawnMachineConfetti(40);

    // 3. Après 1.5s, modal jackpot
    setTimeout(() => {
      setJackpotAmount(evaluation.gain);
      setShowJackpotModal(true);
      addCoins(evaluation.gain);
    }, SLOT_CONFIG.JACKPOT_EXPLOSION_MS);

    // Re-enable spin après la séquence complète
    setTimeout(() => {
      setIsSpinning(false);
      setMachineEffect(null);
    }, SLOT_CONFIG.JACKPOT_EXPLOSION_MS + 800);

  } else if (evaluation.type === 'triple') {
    // 3 identiques (pas jackpot) : flash + toast big-win
    setReelStates(prev => prev.map((r, i) => ({
      ...r,
      isWinner: winningReels[i],
    })));
    setMachineEffect('win-flash');
    spawnMachineConfetti(20);
    showToast(`🎉 +${evaluation.gain} 🍪 ${evaluation.symbolName} !`, 'big-win');
    addCoins(evaluation.gain);

    setTimeout(() => {
      setIsSpinning(false);
      setMachineEffect(null);
    }, 800);

  } else if (evaluation.type === 'pair') {
    // 2 identiques : juste highlight + toast
    setReelStates(prev => prev.map((r, i) => ({
      ...r,
      isWinner: winningReels[i],
    })));
    showToast(`+${evaluation.gain} 🍪`);
    addCoins(evaluation.gain);

    setTimeout(() => {
      setIsSpinning(false);
    }, 800);

  } else {
    // Aucun match : rien
    setTimeout(() => {
      setIsSpinning(false);
    }, 400);
  }
};

// ────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────

const showToast = (message, type = '') => {
  const id = Date.now() + Math.random();
  setToasts(prev => [...prev, { id, message, type }]);
  setTimeout(() => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, 2100);
};

const spawnMachineConfetti = (count) => {
  const colors = ['#D4A017', '#C17F3C', '#FFD75A', '#A57021'];
  const confettis = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 120;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    const rot = Math.random() * 720 - 360;
    confettis.push({
      id: i + '-' + Date.now(),
      color: colors[i % 4],
      transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
      delay: Math.random() * 0.2,
    });
  }
  setMachineConfetti(confettis);
  setTimeout(() => setMachineConfetti([]), 1700);
};
```

## Vérifications phase 5
- ☑ Tap "Lancer" → 20 🍪 débités
- ☑ Les 3 rouleaux tournent avec symboles qui défilent
- ☑ Le rouleau 1 s'arrête à 800ms
- ☑ Le rouleau 2 s'arrête à 1300ms
- ☑ Le rouleau 3 s'arrête à 1800ms (chacun avec animation rebond)
- ☑ Si **2 identiques** → toast "+25 🍪" en haut + rouleaux gagnants pulsent
- ☑ Si **3 identiques (pas jackpot)** → toast "🎉 +X 🍪 [Nom] !" + machine flash + confettis
- ☑ Si **3 × 7️⃣** → machine explose 1.5s avec confettis + rouleaux animés en mode jackpot, PUIS modal pop
- ☑ Si **aucun match** → rien d'affiché, juste les rouleaux qui s'arrêtent
- ☑ Cooldown de 1s entre 2 lancers

---

# ══════════════════════════════════════════════
# PHASE 6 — Intégration dans le menu des jeux
# ══════════════════════════════════════════════

Trouver l'endroit où sont listés les mini-jeux (probablement `GamesTab.jsx` ou similaire).

Ajouter une carte **Machine à Sous** :

```jsx
{
  id: 'slot_machine',
  name: 'Machine à Sous',
  emoji: '🎰',
  description: 'Tente ta chance pour le jackpot',
  cost: 20,
  level: 10,
  component: SlotMachineGame,
}
```

⚠️ Adapter au format des autres jeux existants. Si le format n'utilise pas de `component`, on appelle `<SlotMachineGame />` au clic.

## Vérifications phase 6
- ☑ "Machine à Sous" visible dans la liste des jeux
- ☑ Verrouillé si niveau < 10 (cadenas affiché)
- ☑ Coût 20 🍪 affiché
- ☑ Tap → ouvre l'écran du jeu

---

# ══════════════════════════════════════════════
# PHASE 7 — Tracking stats (optionnel, si BRIEF_STATS_PERSO appliqué)
# ══════════════════════════════════════════════

Si le brief Stats perso est appliqué, ajouter le tracking :

```js
// Au moment du lancer
trackGamePlayed(userCode, 'slot_machine');

// Au moment du gain
if (evaluation.gain > 0) {
  trackCookiesEarned(userCode, evaluation.gain);
}
```

À placer dans `evaluateAndReward` juste après `addCoins(evaluation.gain)`.

## Vérifications phase 7
- ☑ Le jeu apparaît dans les stats hebdo si appliqué
- ☑ Si pas appliqué, ignorer cette phase

---

# ══════════════════════════════════════════════
# PHASE 8 — Tests complets
# ══════════════════════════════════════════════

## Scénarios à tester

1. **Niveau insuffisant** : utilisateur niveau 5 → bouton grisé "🔒 Niveau 10 requis"
2. **Pas assez de cookies** : utilisateur a 10 🍪 → bouton "🔒 Pas assez de cookies"
3. **Limite quotidienne** : 50 parties faites → bouton "🔒 Limite atteinte"
4. **Cooldown** : tap "Lancer" deux fois rapidement → 2e tap ignoré (1s entre)
5. **Lancer normal** : niveau 10 + 100 🍪 → tap → -20 🍪 → animation
6. **Aucun match** : aucun feedback particulier, juste les rouleaux qui s'arrêtent
7. **2 identiques** : toast "+25 🍪" + rouleaux gagnants surlignés en doré
8. **3 cookies** : toast "🎉 +50 🍪 Cookie !" + machine flash + confettis
9. **3 cafés** : toast "🎉 +150 🍪 Café !" + machine flash + confettis
10. **3 × 7️⃣ (jackpot)** : explosion sur place 1.5s + confettis + modal "🎰 INCROYABLE +750 🍪"
11. **Reload de la page** : compteur quotidien (X/50) reste correct
12. **Changement de jour** : compteur se reset à 0/50

## Vérifications globales
- ☑ Pas de rouge ni de vert (uniquement palette café)
- ☑ Mobile-friendly (testé sur 390px)
- ☑ Animations fluides (60 FPS)
- ☑ Effets visuels distincts pour 2 identiques / 3 identiques / jackpot
- ☑ Pas de fuite mémoire (intervals bien cleanup au démontage)
- ☑ Compteur quotidien fonctionne (localStorage)

---

# ══════════════════════════════════════════════
# 💡 NOTES IMPORTANTES POUR CLAUDE CODE
# ══════════════════════════════════════════════

## ⚠️ Règles strictes

1. **NE PAS REMPLACER** les emojis 7️⃣ 💎 ☕ 🥐 🍪 par d'autres. La cohérence avec le tableau des gains et la maquette validée est cruciale.

2. **NE PAS CHANGER** les couleurs. Seules autorisées :
   - `#2C1810` (espresso, textes principaux)
   - `#3D2010`, `#4A2C17`, `#5C3317` (cadre machine, contours)
   - `#7D4E1F`, `#A07B0E` (moka, contours dorés)
   - `#A57021` (caramel foncé)
   - `#B58A0E`, `#C99607` (gradient bouton/rouleaux)
   - `#C17F3C` (caramel)
   - `#D4A017`, `#E8B81B`, `#FFD24D` (doré, gradient)
   - `#FFD75A` (doré clair, accents jackpot)
   - `#F5EFE6` (lait, fond app)
   - `#E8DDD0` (crème, séparateurs)
   - `#8B6A5A`, `#A0784E` (sable, textes secondaires)

3. **NE PAS UTILISER** de rouge, vert, ou bleu (sauf gris pour fond).

4. **NE PAS SIMPLIFIER** les animations :
   - Le rouleau qui défile DOIT cycler en `60ms`
   - Les rouleaux DOIVENT s'arrêter un par un (800ms / 1300ms / 1800ms)
   - L'explosion jackpot DOIT durer **exactement 1.5s** AVANT que la modal pop

## 🔧 Performance

- **`setInterval`** pour le cycle des symboles, **`setTimeout`** pour les arrêts (pas de `requestAnimationFrame` ici)
- **`clearInterval`/`clearTimeout`** dans le cleanup du `useEffect` (au démontage)
- Si l'utilisateur ferme l'écran pendant un spin → tous les timers doivent être nettoyés

## 📱 Mobile

- Bouton "Lancer" suffisamment gros pour tap mobile (padding 14px 38px)
- Pas de `cursor: pointer` qui casserait le tap (les `:active` doivent fonctionner)
- Tester que la modal jackpot couvre bien tout l'écran

## 🎯 Anti-cheat

- Pas besoin d'anti-cheat additionnel : le coût (20 🍪 par lancer) + cooldown (1s) + limite quotidienne (50) suffisent
- Le tirage est côté client mais l'espérance ≈ 0 limite le gain potentiel
- Si on veut renforcer plus tard, on peut faire le tirage côté Supabase via une fonction

## 🎨 Animations préfixées `slot*`

Pour éviter les conflits avec d'autres animations CSS du projet :
- `slotReelSpin`, `slotReelStop`, `slotReelWinner`, `slotReelJackpot`
- `slotToastSlide`
- `slotMachineConfetti`
- `slotJackpotFadeIn`, `slotJackpotPop`, `slotJackpotBounce`

## 📋 Ordre d'application recommandé

1. Phase 1 (vérif prérequis)
2. Phase 2 (module logique `slotMachine.js`)
3. Phase 3 (structure du composant)
4. Phase 4 (layout visuel) — IMPORTANT, valider visuellement avant la suite
5. Phase 5 (logique du spin) — la plus complexe
6. Phase 6 (intégration menu)
7. Phase 7 (stats si applicable)
8. Phase 8 (tests)

Bon dev ! ☕🎰

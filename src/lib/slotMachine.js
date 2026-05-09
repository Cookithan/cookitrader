/* ════════════════════════════════════════════════════
   slotMachine.js — logique pure de la Machine à Sous (BRIEF)
   ────────────────────────────────────────────────────
   Tirage par TABLE de probabilités (et non pondération sur 3 reels
   indépendants) → garantit des probas exactes faciles à équilibrer.

   - spinSlotMachine()  : retourne [sym1, sym2, sym3]
   - evaluateResult(r)  : retourne { gain, type, symbolName?, symbol? }
   - getWinningReels(r) : [bool, bool, bool] pour le highlight visuel

   Total des probas = 100 % :
     0.05 % triple 7  · 0.2 % triple 💎 · 0.3 % triple ☕
     1.6 % triple 🥐  · 6.4 % triple 🍪
     54 % paire (2 same) · 37.45 % aucun match
═══════════════════════════════════════════════════════ */

export const SLOT_SYMBOLS = ['7️⃣', '💎', '☕', '🥐', '🍪'];

export const TRIPLE_GAINS = {
  '7️⃣': { gain: 750, name: 'Jackpot',  isJackpot: true  },
  '💎': { gain: 250, name: 'Diamant',  isJackpot: false },
  '☕': { gain: 150, name: 'Café',     isJackpot: false },
  '🥐': { gain: 80,  name: 'Croissant',isJackpot: false },
  '🍪': { gain: 50,  name: 'Cookie',   isJackpot: false },
};

export const SLOT_CONFIG = {
  COST: 20,
  REQUIRED_LEVEL: 10,
  COOLDOWN_MS: 1000,
  /* Limite quotidienne (re-instauré mai 2026, demande user) — 50 essais
     par jour. Reset auto à minuit local via le compteur gamesToday côté
     SlotGame qui regarde le date string. */
  MAX_PER_DAY: 50,
  PAIR_GAIN: 25,
  REEL_FIRST_STOP_MS: 800,
  REEL_STOP_DELAY_MS: 500,
  JACKPOT_EXPLOSION_MS: 1500,
};

/* Tire un résultat selon la table cible. */
export function spinSlotMachine() {
  const rand = Math.random() * 100;
  let cum = 0;

  cum += 0.05;
  if (rand < cum) return ['7️⃣', '7️⃣', '7️⃣'];

  cum += 0.2;
  if (rand < cum) return ['💎', '💎', '💎'];

  cum += 0.3;
  if (rand < cum) return ['☕', '☕', '☕'];

  cum += 1.6;
  if (rand < cum) return ['🥐', '🥐', '🥐'];

  cum += 6.4;
  if (rand < cum) return ['🍪', '🍪', '🍪'];

  cum += 54;
  if (rand < cum) return generateTwoSameResult();

  return generateNoMatchResult();
}

/* 2 symboles identiques + 1 différent (position aléatoire) */
function generateTwoSameResult() {
  const sym = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
  let other;
  do {
    other = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
  } while (other === sym);
  const oddPos = Math.floor(Math.random() * 3);
  const result = [sym, sym, sym];
  result[oddPos] = other;
  return result;
}

/* 3 symboles strictement différents */
function generateNoMatchResult() {
  const shuffled = [...SLOT_SYMBOLS].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1], shuffled[2]];
}

/* Évalue le résultat — retourne { gain, type, symbolName?, symbol? } */
export function evaluateResult(result) {
  const [a, b, c] = result;
  const allSame = a === b && b === c;
  const twoSame = (a === b) || (b === c) || (a === c);

  if (allSame) {
    const cfg = TRIPLE_GAINS[a];
    return {
      gain: cfg.gain,
      type: cfg.isJackpot ? 'jackpot' : 'triple',
      symbolName: cfg.name,
      symbol: a,
    };
  }
  if (twoSame) {
    return { gain: SLOT_CONFIG.PAIR_GAIN, type: 'pair' };
  }
  return { gain: 0, type: 'none' };
}

/* Quels rouleaux brillent dans le highlight */
export function getWinningReels(result) {
  const [a, b, c] = result;
  if (a === b && b === c) return [true, true, true];
  if (a === b) return [true, true, false];
  if (b === c) return [false, true, true];
  if (a === c) return [true, false, true];
  return [false, false, false];
}

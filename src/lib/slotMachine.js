/* ════════════════════════════════════════════════════
   slotMachine.js — logique pure de la Machine à Sous (BRIEF)
   ────────────────────────────────────────────────────
   Tirage par TABLE de probabilités (et non pondération sur 3 reels
   indépendants) → garantit des probas exactes faciles à équilibrer.

   - spinSlotMachine()  : retourne [sym1, sym2, sym3]
   - evaluateResult(r)  : retourne { gain, type, symbolName?, symbol? }
   - getWinningReels(r) : [bool, bool, bool] pour le highlight visuel

   Total des probas = 100 % (refonte 13/05/2026 — plus généreux) :
     0.1 % triple 7  · 0.4 % triple 💎 · 0.6 % triple ☕
     2.5 % triple 🥐 · 9 % triple 🍪
     58 % paire (2 same) · 29.4 % aucun match

   Expected value ≈ 23.6 🍪 par spin (coût 20) → +3.6 🍪 moyen par spin
   → ~180 🍪 net par jour si on use les 50 essais. Sensation casino mais
   net positif pour le joueur patient.
═══════════════════════════════════════════════════════ */

export const SLOT_SYMBOLS = ['7️⃣', '💎', '☕', '🥐', '🍪'];

/* Gains boostés 13/05/2026 — demande user "plus généreux" */
export const TRIPLE_GAINS = {
  '7️⃣': { gain: 1000, name: 'Jackpot',  isJackpot: true  },
  '💎': { gain: 400,  name: 'Diamant',  isJackpot: false },
  '☕': { gain: 250,  name: 'Café',     isJackpot: false },
  '🥐': { gain: 130,  name: 'Croissant',isJackpot: false },
  '🍪': { gain: 80,   name: 'Cookie',   isJackpot: false },
};

export const SLOT_CONFIG = {
  COST: 20,
  REQUIRED_LEVEL: 10,
  COOLDOWN_MS: 1000,
  /* Limite quotidienne (re-instauré mai 2026, demande user) — 50 essais
     par jour. Reset auto à minuit local via le compteur gamesToday côté
     SlotGame qui regarde le date string. */
  MAX_PER_DAY: 50,
  PAIR_GAIN: 35,                  // boost 25 → 35 (13/05/2026)
  REEL_FIRST_STOP_MS: 800,
  REEL_STOP_DELAY_MS: 500,
  JACKPOT_EXPLOSION_MS: 1500,
};

/* Tire un résultat selon la table cible. */
export function spinSlotMachine() {
  const rand = Math.random() * 100;
  let cum = 0;

  cum += 0.1;
  if (rand < cum) return ['7️⃣', '7️⃣', '7️⃣'];

  cum += 0.4;
  if (rand < cum) return ['💎', '💎', '💎'];

  cum += 0.6;
  if (rand < cum) return ['☕', '☕', '☕'];

  cum += 2.5;
  if (rand < cum) return ['🥐', '🥐', '🥐'];

  cum += 9;
  if (rand < cum) return ['🍪', '🍪', '🍪'];

  cum += 58;
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

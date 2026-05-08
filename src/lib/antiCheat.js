/* ════════════════════════════════════════════════════
   antiCheat.js — protection du Défi de clics (BRIEF_ANTICHEAT)
   ────────────────────────────────────────────────────
   3 protections combinées contre les auto-clickers et scripts console :

   1. **Cap dur 12 CPS** : un humain rapide tape ~10-12 clics/s, donc
      au-delà de 12 dans une fenêtre glissante d'1 s → clic ignoré.
   2. **Score max 150** par partie : même un joueur très bon tient
      dans cette enveloppe ; un bot serait coupé bien avant.
   3. **Détection de pattern bot** : si les 10 derniers clics sont
      espacés de manière quasi identique (écart-type < 5 ms), c'est
      très probablement un script à intervalle fixe — flag `isCheat`.

   `performance.now()` est utilisé partout (plus fiable que `Date.now()`
   qui peut être affecté par un changement d'horloge système).

   Le tracker est instancié au début d'une partie (`new ClickTracker()`)
   et réinitialisé via `reset()`. Le score final fiable est obtenu
   via `getValidScore()` — c'est cette valeur qui doit être versée à
   `onComplete`, pas le compteur visuel utilisé pour l'affichage.
═══════════════════════════════════════════════════════ */

const CLICK_LIMITS = {
  MAX_CLICKS_PER_SECOND: 12,
  MAX_CLICKS_PER_GAME: 150,
  PATTERN_DETECTION_WINDOW: 10,
  PATTERN_TOLERANCE_MS: 5,
};

/**
 * Tracker qui surveille les clics d'une partie et détecte la triche.
 */
export class ClickTracker {
  constructor() {
    this.clickTimestamps = [];
    this.cheatDetected = false;
    this.cheatReason = null;
    this.totalLegitimateClicks = 0;
  }

  /**
   * Enregistre un clic et retourne s'il est valide ou non.
   */
  registerClick() {
    const now = performance.now();

    // 1. Cap dur (12 clics/s)
    const oneSecondAgo = now - 1000;
    const recentClicks = this.clickTimestamps.filter(t => t > oneSecondAgo);

    if (recentClicks.length >= CLICK_LIMITS.MAX_CLICKS_PER_SECOND) {
      return {
        accepted: false,
        reason: 'Trop rapide ! Maximum 12 clics par seconde.',
        isCheat: true,
      };
    }

    // 2. Score max
    if (this.totalLegitimateClicks >= CLICK_LIMITS.MAX_CLICKS_PER_GAME) {
      return {
        accepted: false,
        reason: 'Score maximum atteint pour cette partie.',
        isCheat: false,
      };
    }

    // 3. Détection de pattern bot
    if (this.clickTimestamps.length >= CLICK_LIMITS.PATTERN_DETECTION_WINDOW) {
      const isPatternBot = this._detectBotPattern(now);
      if (isPatternBot) {
        this.cheatDetected = true;
        this.cheatReason = 'Pattern de bot détecté';
        return {
          accepted: false,
          reason: 'Tricherie détectée, ralentis !',
          isCheat: true,
        };
      }
    }

    // Clic valide
    this.clickTimestamps.push(now);
    this.totalLegitimateClicks++;
    return { accepted: true, isCheat: false };
  }

  /**
   * Détecte si les derniers clics suivent un pattern de bot
   * (espacements quasi-identiques = écart-type très faible).
   */
  _detectBotPattern(currentTime) {
    const recentTimestamps = [
      ...this.clickTimestamps.slice(-CLICK_LIMITS.PATTERN_DETECTION_WINDOW + 1),
      currentTime,
    ];

    if (recentTimestamps.length < CLICK_LIMITS.PATTERN_DETECTION_WINDOW) {
      return false;
    }

    const intervals = [];
    for (let i = 1; i < recentTimestamps.length; i++) {
      intervals.push(recentTimestamps[i] - recentTimestamps[i - 1]);
    }

    const avg = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
    const variance = intervals.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Si tous les clics sont quasi identiquement espacés (stdDev < 5ms) = bot
    return stdDev < CLICK_LIMITS.PATTERN_TOLERANCE_MS;
  }

  reset() {
    this.clickTimestamps = [];
    this.cheatDetected = false;
    this.cheatReason = null;
    this.totalLegitimateClicks = 0;
  }

  getValidScore() {
    return Math.min(this.totalLegitimateClicks, CLICK_LIMITS.MAX_CLICKS_PER_GAME);
  }
}

export const ANTICHEAT_CONFIG = CLICK_LIMITS;

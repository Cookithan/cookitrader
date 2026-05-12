/* ════════════════════════════════════════════════════
   antiCheat.js — protection Cookie Click (refonte 12/05/2026, v4)
   ────────────────────────────────────────────────────
   Priorité : zéro faux positif pour les humains rapides, mais
   détection des autoclickers OS-level (qui passent isTrusted).

   Couches actives :

   1. **event.isTrusted** : event JS console / dispatchEvent. Défait
      les bots de console (cas le plus fréquent en ligne).

   2. **Variance coordonnées (touch/pen uniquement)** : auto-clic mobile
      stationnaire. SKIP pour souris (humain ne bouge pas le curseur).

   3. **Visibility API** : page en arrière-plan = pas humain.

   4. **CPS cap GLISSANT 25/s** : un humain TOP-tier (jitter clicker
      professionnel) plafonne ~16-18 CPS. 25+ = bot mécanique. Seuil
      assez haut pour ne pas pénaliser les fast clickers normaux.

   5. **Pattern bot STRICT** : sur 10 clics, si stdDev < 4 ms ET
      avg < 100 ms → robot avec timing trop régulier. Un humain rapide
      a stdDev ≥ 8 ms même en clic rythmique entraîné. 4 ms = inhumain.

   6. **Score max 300 clics/partie** : ceinture + bretelles.

   Pourquoi 25 CPS et 4 ms stdDev ? L'utilisateur a testé un autoclicker
   à 1 ms d'intervalle = 1000 CPS, stdDev ~0 → les deux checks le
   capturent. Et un humain à 15 CPS avec stdDev 10 ms passe partout.

   `performance.now()` partout — plus fiable que `Date.now()`.
═══════════════════════════════════════════════════════ */

const LIMITS = {
  MAX_CLICKS_PER_GAME:     300,   // 37 CPS sur 8 s, impossible humain
  COORD_WINDOW:            8,     // nb clics pour analyse coords (touch only)
  COORD_MIN_DISPERSION_PX: 4,     // dispersion min acceptée (X et Y) sur touch
  CPS_CAP:                 25,    // CPS max acceptable (Guinness humain ~16)
  PATTERN_WINDOW:          10,    // nb clics pour analyse pattern timing
  PATTERN_MAX_STDDEV_MS:   4,     // stdDev max — sous ce seuil = bot mécanique
  PATTERN_AVG_LIMIT_MS:    100,   // pattern check actif si avg < 100 ms (10+ CPS)
};

export class ClickTracker {
  constructor() {
    /* clicks = liste de { time, x, y } pour TOUS les clics validés.
       Permet variance + pattern detection sur fenêtre glissante. */
    this.clicks = [];
    this.cheatDetected = false;
    this.cheatReason = null;
    this.validCount = 0;
    this.startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  }

  registerClick(event) {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    /* ── 1. isTrusted check ─────────────────────────
       Premier filtre, le plus efficace contre les bots JS console. */
    if (event && event.isTrusted === false) {
      this.cheatDetected = true;
      this.cheatReason = 'Événement synthétique';
      return { accepted: false, isCheat: true, reason: 'Clic non valide' };
    }

    /* ── 2. Score max ─────────────────────────────── */
    if (this.validCount >= LIMITS.MAX_CLICKS_PER_GAME) {
      return { accepted: false, isCheat: false, reason: 'Score max atteint.' };
    }

    /* ── 3. Visibility check ────────────────────────
       Page en arrière-plan = utilisateur ne regarde pas. */
    if (typeof document !== 'undefined' && document.hidden) {
      this.cheatDetected = true;
      this.cheatReason = 'Page en arrière-plan';
      return { accepted: false, isCheat: true, reason: 'Reviens sur la page !' };
    }

    /* Extraction coordonnées (depuis PointerEvent ou TouchEvent) */
    let x = null, y = null;
    if (event) {
      if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
        x = event.clientX; y = event.clientY;
      } else if (event.touches && event.touches[0]) {
        x = event.touches[0].clientX; y = event.touches[0].clientY;
      } else if (event.changedTouches && event.changedTouches[0]) {
        x = event.changedTouches[0].clientX; y = event.changedTouches[0].clientY;
      }
    }

    /* ── 4. Variance de coordonnées ─────────────────
       Sur les COORD_WINDOW derniers clics + le clic actuel : si X ET Y
       dispersent < 4 px, c'est un auto-clic à position fixe.

       ⚠️ SKIP pour les souris : un humain qui clique vite avec une
       souris ne déplace PAS le curseur entre les clics → tous les
       clics sont au même pixel → faux positif. Sur touch/pen, le
       doigt/stylet varie toujours de quelques px. */
    const isMouse = event && event.pointerType === 'mouse';
    if (!isMouse && x !== null && y !== null && this.clicks.length >= LIMITS.COORD_WINDOW - 1) {
      const recentClicks = this.clicks.slice(-(LIMITS.COORD_WINDOW - 1));
      const allHaveCoords = recentClicks.every(c => c.x !== null && c.y !== null);
      if (allHaveCoords) {
        const xs = [...recentClicks.map(c => c.x), x];
        const ys = [...recentClicks.map(c => c.y), y];
        const xRange = Math.max(...xs) - Math.min(...xs);
        const yRange = Math.max(...ys) - Math.min(...ys);
        if (xRange < LIMITS.COORD_MIN_DISPERSION_PX && yRange < LIMITS.COORD_MIN_DISPERSION_PX) {
          this.cheatDetected = true;
          this.cheatReason = 'Position figée';
          return { accepted: false, isCheat: true, reason: 'Auto-clic détecté' };
        }
      }
    }

    /* ── 5. CPS cap (25/s) ──────────────────────────
       Seuil très haut — ne déclenche QUE sur des autoclickers natifs.
       Records humains officiels (jitter click) plafonnent ~16-18 CPS,
       et seulement en burst de < 1 s. 25 CPS soutenu = bot. */
    const oneSecondAgo = now - 1000;
    const recentCount = this.clicks.filter(c => c.time > oneSecondAgo).length;
    if (recentCount >= LIMITS.CPS_CAP) {
      this.cheatDetected = true;
      this.cheatReason = 'Vitesse anormale';
      return { accepted: false, isCheat: true, reason: 'Vitesse anormale détectée' };
    }

    /* ── 6. Pattern bot STRICT ──────────────────────
       Sur les 10 derniers clics STOCKÉS (pas le clic en cours) : si
       stdDev < 4 ms ET cadence > 10 CPS, c'est un robot. Important :
       on n'inclut PAS `now` dans le calcul — sinon après une "pulse"
       du bot, le grand intervalle stored→now casserait artificiellement
       le stdDev et laisserait passer la pulse suivante.

       Une fois que les 10 stockés sont uniformes (stdDev < 4 ms), le
       check bloque toutes les tentatives suivantes du bot, indéfiniment. */
    if (this.clicks.length >= LIMITS.PATTERN_WINDOW) {
      const stored = this.clicks.slice(-LIMITS.PATTERN_WINDOW).map(c => c.time);
      const intervals = [];
      for (let i = 1; i < stored.length; i++) {
        intervals.push(stored[i] - stored[i - 1]);
      }
      const avg = intervals.reduce((s, v) => s + v, 0) / intervals.length;
      const variance = intervals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev < LIMITS.PATTERN_MAX_STDDEV_MS && avg < LIMITS.PATTERN_AVG_LIMIT_MS) {
        this.cheatDetected = true;
        this.cheatReason = 'Pattern mécanique';
        return { accepted: false, isCheat: true, reason: 'Pattern mécanique détecté' };
      }
    }

    /* Clic valide */
    this.clicks.push({ time: now, x, y });
    this.validCount++;
    return { accepted: true, isCheat: false };
  }

  reset() {
    this.clicks = [];
    this.cheatDetected = false;
    this.cheatReason = null;
    this.validCount = 0;
    this.startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  }

  getValidScore() {
    return Math.min(this.validCount, LIMITS.MAX_CLICKS_PER_GAME);
  }
}

export const ANTICHEAT_CONFIG = LIMITS;

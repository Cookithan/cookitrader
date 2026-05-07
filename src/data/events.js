/* ════════════════════════════════════════════════════
   EVENTS — événements spéciaux (PHASE 6E)
   ────────────────────────────────────────────────────
   Cycle en 2 phases pour chaque événement :

   1. PHASE 'waiting' (mystère) — durée aléatoire 1h..48h (WAIT_MIN_MS..WAIT_MAX_MS)
      Une bannière "🎁 Prochain événement dans Xh XXmin" est affichée
      sur l'accueil, mais le challenge n'est pas révélé.

   2. PHASE 'active' — durée ACTIVE_DURATION_MS, max MAX_ATTEMPTS essais
      L'event est révélé via EventAnnounceModal. La bannière change
      pour montrer le titre + timer + essais restants. Si le joueur
      réussit le challenge → reward + nouveau cycle. Si échec
      (3 essais OU 1h expirée) → nouveau cycle (l'event raté reste
      éligible et pourra revenir).

   Quand tous les events ont été complétés (in completedEvents),
   pickRandomEvent renvoie null → plus de cycle.

   Forme d'un activeEvent :
   {
     id, title, description, challenge, reward,  // template
     phase:        'waiting' | 'active',
     revealAt:     timestamp,                    // début phase 'active'
     expiresAt:    timestamp,                    // fin phase 'active' (= revealAt + 1h)
     attemptsLeft: number,                       // 3 → 0
   }

   challenge supportés (déclenchés par checkEventChallenge dans App.jsx) :
   - 'spin_jackpot'   → 1 essai = 1 spin. Succès si valeur >= 200
   - 'market_profit'  → déclenché à chaque vente sur le marché. Succès si la
                        plus-value de la vente >= 100 🍪. 3 essais (3 ventes).
   - 'streak_check'   → vérifié à l'ouverture de l'event ET à chaque check-in
                        quotidien. Succès si streak >= 5. 1 essai (binaire).

   Un template peut surcharger le nombre d'essais via `attempts:N`. Sinon
   c'est MAX_ATTEMPTS qui s'applique.
═══════════════════════════════════════════════════════ */

export const EVENT_LEVEL_MIN     = 4;
export const WAIT_MIN_MS         =  1 * 3600 * 1000;
export const WAIT_MAX_MS         = 48 * 3600 * 1000;
export const ACTIVE_DURATION_MS  =  1 * 3600 * 1000;
export const MAX_ATTEMPTS        = 3;

export const SPECIAL_EVENTS = [
  {
    id: 'event_jackpot',
    title: '🎰 Tour Spécial Roue !',
    description: 'Tombe sur +200 à la roue pour débloquer le thème "Or Massif Limité" !',
    challenge: 'spin_jackpot',
    reward: { type:'theme', id:'theme_or_limite', name:'Thème Or Massif Limité' },
  },
  {
    id: 'event_market_pro',
    title: '📈 Marché en Folie !',
    description: 'Réalise +100 🍪 de plus-value en une seule vente sur le marché pour décrocher le thème "Trader Avisé" !',
    challenge: 'market_profit',
    reward: { type:'theme', id:'theme_trader', name:'Thème Trader Avisé' },
  },
  {
    id: 'event_streak',
    title: '🔥 Série de Feu !',
    description: 'Atteins une série de 5 jours d\'affilée pour gagner le thème "Flamme Vivante" !',
    challenge: 'streak_check',
    reward: { type:'theme', id:'theme_flamme', name:'Thème Flamme Vivante' },
    attempts: 1,
  },
];

/* Tire un event parmi ceux pas encore complétés. Retourne null si tous
   ont déjà été gagnés. */
export function pickRandomEvent(completedIds = []){
  const available = SPECIAL_EVENTS.filter(e => !completedIds.includes(e.id));
  if(available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

/* Construit un activeEvent en phase 'waiting' à partir d'un template.
   La phase 'active' sera enclenchée plus tard via revealEvent().

   Si `devMode` est vrai (mode dev "cookithan" dans App.jsx), la fenêtre
   d'attente est raccourcie à 1-3 minutes pour faciliter les tests.
   Mode normal : 1h-48h. */
export function buildWaitingEvent(template, devMode = false){
  const minMs = devMode ? 60_000     : WAIT_MIN_MS;          // 1 min en dev
  const maxMs = devMode ? 3 * 60_000 : WAIT_MAX_MS;          // 3 min en dev
  const waitMs = minMs + Math.random() * (maxMs - minMs);
  const now = Date.now();
  return {
    ...template,
    phase: 'waiting',
    revealAt:     now + waitMs,
    expiresAt:    0,
    attemptsLeft: template.attempts ?? MAX_ATTEMPTS,
  };
}

/* Format compact pour les bannières/modals : "Xh XXmin" si >=1h,
   sinon "XXmin XXs". Garde un format stable (toujours 2 segments). */
export function formatTimeLeft(ms){
  if(ms <= 0) return '0 min';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if(h >= 1) return `${h}h ${String(m).padStart(2,'0')}min`;
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}min ${String(s).padStart(2,'0')}s`;
}

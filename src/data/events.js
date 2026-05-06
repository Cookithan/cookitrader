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
   - 'quiz_perfect' → 1 essai = 1 quiz Expert terminé. Succès si parfait (3/3).
                      QuizGame filtre en interne et ne notifie que sur Expert.
                      event_chocolat n'a qu'1 essai à cause du cooldown 5h
                      entre quiz (template.attempts:1 surcharge MAX_ATTEMPTS).
   - 'spin_jackpot' → 1 essai = 1 spin. Succès si valeur >= 200
   - 'click_50'     → 1 essai = 1 défi de clics terminé. Succès si clicks >= 50

   Un template peut surcharger le nombre d'essais via `attempts:N`. Sinon
   c'est MAX_ATTEMPTS qui s'applique.

   event_collector ('earn_100') a été retiré : son modèle cumulatif ne
   se prête pas au système de "3 essais".
═══════════════════════════════════════════════════════ */

export const EVENT_LEVEL_MIN     = 4;
export const WAIT_MIN_MS         =  1 * 3600 * 1000;
export const WAIT_MAX_MS         = 48 * 3600 * 1000;
export const ACTIVE_DURATION_MS  =  1 * 3600 * 1000;
export const MAX_ATTEMPTS        = 3;

export const SPECIAL_EVENTS = [
  {
    id: 'event_chocolat',
    title: '🍫 Fête du Chocolat !',
    description: 'Réussis un quiz Expert parfait (3/3) pour gagner le thème "Chocolat Festif" !',
    challenge: 'quiz_perfect',
    reward: { type:'theme', id:'theme_chocolat_festif', name:'Thème Chocolat Festif' },
    attempts: 1,
  },
  {
    id: 'event_jackpot',
    title: '🎰 Tour Spécial Roue !',
    description: 'Tombe sur +200 à la roue pour débloquer le thème "Or Massif Limité" !',
    challenge: 'spin_jackpot',
    reward: { type:'theme', id:'theme_or_limite', name:'Thème Or Massif Limité' },
  },
  {
    id: 'event_speedster',
    title: '⚡ Défi Speedster !',
    description: 'Atteins 50+ clics au défi de clics pour gagner le thème "Vitesse Lumière" !',
    challenge: 'click_50',
    reward: { type:'theme', id:'theme_vitesse', name:'Thème Vitesse Lumière' },
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

/* ════════════════════════════════════════════════════
   EVENTS — événements spéciaux (PHASE 6E)
   ────────────────────────────────────────────────────
   Cycle en 2 phases pour chaque événement :

   1. PHASE 'waiting' (mystère) — durée aléatoire 1h..24h (WAIT_MIN_MS..WAIT_MAX_MS)
      Une bannière "🎁 Prochain événement dans Xh XXmin" est affichée
      sur l'accueil, mais le challenge n'est pas révélé.

   2. PHASE 'active' — durée ACTIVE_DURATION_MS, ESSAIS ILLIMITÉS
      L'event est révélé via EventAnnounceModal. La bannière change
      pour montrer le titre + timer. Le joueur peut tenter autant
      qu'il veut tant que la fenêtre est ouverte. Si le joueur
      réussit le challenge → reward + nouveau cycle. Si la fenêtre
      expire (1h) sans succès → nouveau cycle (l'event raté reste
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
export const WAIT_MAX_MS         = 24 * 3600 * 1000;
export const ACTIVE_DURATION_MS  =  1 * 3600 * 1000;
export const MAX_ATTEMPTS        = 3;

/* Chaque event verse aussi un bonus en café (cafeBonus). Ajouté à
   reward — consommé dans App.jsx::checkEventChallenge et affiché
   par EventAnnounceModal (teasing) et EventRewardModal (récap).

   3 events historiques (thèmes) + 7 events modérés (badges) =
   10 récompenses à collectionner pour la check Légende Vivante. */
export const SPECIAL_EVENTS = [
  /* ─── 3 events thèmes (originaux) ─── */
  {
    id: 'event_jackpot',
    title: '🎰 Tour Spécial Roue !',
    description: 'Tombe sur +200 à la roue pour débloquer le thème "Or Massif Limité" !',
    tease: 'Fais tourner ce qui doit tourner — le sort fera le reste.',
    challenge: 'spin_jackpot',
    reward: { type:'theme', id:'theme_or_limite', name:'Thème Or Massif Limité', cafeBonus:1 },
  },
  {
    id: 'event_market_pro',
    title: '📈 Marché en Folie !',
    description: 'Réalise +100 🍪 de plus-value en une seule vente sur le marché pour décrocher le thème "Trader Avisé" !',
    tease: 'Acheter bas, revendre haut — le café se cuisine en cents.',
    challenge: 'market_profit',
    reward: { type:'theme', id:'theme_trader', name:'Thème Trader Avisé', cafeBonus:1 },
  },
  {
    id: 'event_streak',
    title: '🔥 Série de Feu !',
    description: 'Atteins une série de 5 jours d\'affilée pour gagner le thème "Flamme Vivante" !',
    tease: 'Cinq aubes, une flamme.',
    challenge: 'streak_check',
    reward: { type:'theme', id:'theme_flamme', name:'Thème Flamme Vivante', cafeBonus:1 },
    attempts: 1,
  },

  /* ─── 7 events badges (modérés, ajoutés 09/05/2026) ─── */
  {
    id: 'event_pour_perfect',
    title: '🎯 Concentration Maximale !',
    description: 'Atteins un score parfait (15 🍪) à "Stop le Café" !',
    tease: 'Ni trop, ni trop peu. La main connaît le bon moment.',
    challenge: 'pour_perfect',
    reward: { type:'badge', id:'badge_tireur', name:'Badge Tireur', cafeBonus:1 },
  },
  {
    id: 'event_quiz_perfect',
    title: '🧠 Esprit Aiguisé !',
    description: 'Réponds correctement à toutes les questions du Quiz du jour !',
    tease: 'Trois questions, et aucune ne pardonne.',
    challenge: 'quiz_perfect',
    reward: { type:'badge', id:'badge_cerveau', name:'Badge Cerveau', cafeBonus:1 },
  },
  {
    id: 'event_guess_perfect',
    title: '📚 Maître Barista !',
    description: 'Devine toutes les commandes (5/5 ou 8/8) à "Devine la commande" !',
    tease: 'Lis le client comme un livre — sans rater une page.',
    challenge: 'guess_perfect',
    reward: { type:'badge', id:'badge_erudit', name:'Badge Érudit', cafeBonus:1 },
  },
  {
    id: 'event_click_sprint',
    title: '⚡ Sprinter Cookie !',
    description: 'Atteins 60 clics ou plus au Cookie Click en une partie !',
    tease: 'Que tes doigts brûlent — la vitesse fait pleuvoir.',
    challenge: 'click_sprint',
    reward: { type:'badge', id:'badge_sprinter', name:'Badge Sprinter', cafeBonus:1 },
  },
  {
    id: 'event_pyramid_15',
    title: '🏗️ Architecte du Café !',
    description: 'Empile 15 tasses ou plus à "Pile de Tasses" !',
    tease: 'Plus haut, sans tomber. La gravité attend son moment.',
    challenge: 'pyramid_floors',
    reward: { type:'badge', id:'badge_architecte', name:'Badge Architecte', cafeBonus:1 },
  },
  {
    id: 'event_slot_three',
    title: '💰 Tirelire Pleine !',
    description: 'Aligne 3 symboles identiques à la Machine à Sous !',
    tease: 'Trois fois la même chose, et la fortune sourit.',
    challenge: 'slot_three',
    reward: { type:'badge', id:'badge_tirelire', name:'Badge Tirelire', cafeBonus:1 },
  },
  {
    id: 'event_reflex_pro',
    title: '🦅 Œil de Lynx !',
    description: 'Atteins un score de 20 ou plus à "Réflexes cookies" !',
    tease: 'Vingt instants fugaces — ne laisse rien filer.',
    challenge: 'reflex_score',
    reward: { type:'badge', id:'badge_aigle', name:'Badge Aigle', cafeBonus:1 },
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
   Mode normal : 1h-24h. */
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

/* ════════════════════════════════════════════════════
   appInfo.js — métadonnées app + changelog (BRIEF_A_PROPOS)
   ────────────────────────────────────────────────────
   Version visible dans la modale "À propos" (Paramètres → bas).
   À mettre à jour à chaque release notable.

   Convention :
     - Garder 5-6 entrées max dans CHANGELOG (les + récentes).
     - L'entrée d'index 0 reçoit le badge NOUVEAU dans l'UI.
     - Pas de rouge / vert dans les emojis (palette café-only).
     - Chaque entrée a `title` (FR) et `title_en` (EN) + idem pour `changes`.
       Lookup via localizedField(release, 'title') dans AboutModal.
═══════════════════════════════════════════════════════ */

export const APP_INFO = {
  version: '1.25.0',
  releaseDate: '2026-05-26',
  github: 'https://github.com/Cookithan/cookitrader',
  description: "App mobile de récompenses café & cookies. Mini-jeux quotidiens, marché spéculatif $CKM, classement, amis et boutique premium.",
  author: 'Cookithan',
};

export const CHANGELOG = [
  {
    version: '1.25.0',
    date: '2026-05-26',
    title: '⚡ Café Express plus fluide, plus long, plus libre',
    title_en: '⚡ Café Express smoother, longer, more flexible',
    changes: [
      "⚡ Café Express tourne fluide sur tous les téléphones — fix d'un bug où le jeu était trop lent sur certains appareils",
      "⏱ Choisis la durée de ta partie : 60s, 2 min ou 3 min (paliers de récompense scalés en conséquence)",
      "🎨 Switche de thème directement depuis l'écran de Café Express, plus besoin d'aller dans les Paramètres",
    ],
    changes_en: [
      "⚡ Café Express now runs smoothly on all phones — fixed a bug where the game was too slow on some devices",
      "⏱ Choose your match duration: 60s, 2 min or 3 min (reward tiers scale accordingly)",
      "🎨 Switch theme straight from the Café Express screen — no need to open Settings",
    ],
  },
  {
    version: '1.24.0',
    date: '2026-05-26',
    title: '⚡ Café Express + thèmes de mini-jeu',
    title_en: '⚡ Café Express + game themes',
    changes: [
      "⚡ Nouveau mini-jeu Café Express : glisse ta tasse pour attraper les 🍪 et ☕, évite les 🧊 qui figent la tasse !",
      "🎨 10 nouveaux thèmes pour personnaliser tes mini-jeux (Café Express, Flappy, Devine la commande, Memory) — disponibles en boutique et activables dans les Paramètres",
      "🎁 Série du jour étoffée : 2 semaines progressives, jackpot 2 ☕ au J7 et 3 ☕ au J14, palier max maintenu après",
      "🏆 Classement « Cette semaine » : seuls les joueurs ayant joué cette semaine y apparaissent (plus juste)",
      "📚 Tutoriel guidé : plus aucune pop-up ne vient le masquer, et tu peux le refaire depuis les Paramètres",
      "🛒 Boutique : filtres mieux organisés sur 2 lignes avec icônes",
    ],
    changes_en: [
      "⚡ New mini-game Café Express: slide your cup to catch the 🍪 and ☕, avoid the 🧊 that freeze the cup!",
      "🎨 10 new themes to customize your mini-games (Café Express, Flappy, Guess the order, Memory) — available in the shop and activable from Settings",
      "🎁 Beefed-up daily streak: 2 progressive weeks, jackpot 2 ☕ on day 7 and 3 ☕ on day 14, max tier maintained after",
      "🏆 'This week' leaderboard: only players who played this week show up (fairer)",
      "📚 Guided tutorial: no more pop-ups blocking it, and you can replay it from Settings",
      "🛒 Shop: filters better organized on 2 rows with icons",
    ],
  },
  {
    version: '1.23.0',
    date: '2026-05-19',
    title: '🏆 Classement cumulé + quiz corsé',
    title_en: '🏆 All-time leaderboard + tougher quiz',
    changes: [
      "🏆 Nouveau classement « Depuis le début » : les cookies cumulés de toujours, en plus du classement de la semaine",
      "📚 Quiz : la difficulté Facile laisse place à plus de questions Moyen et Expert",
      "🍪 Memory : petit bonus en complétant toutes les paires",
      "✨ …et d'autres surprises à débusquer en jouant 👀",
    ],
    changes_en: [
      "🏆 New \"All-time\" leaderboard: your lifetime cookies, alongside the weekly ranking",
      "📚 Quiz: the Easy difficulty makes way for more Medium and Expert questions",
      "🍪 Memory: a small bonus for clearing all the pairs",
      "✨ …and other surprises to uncover while playing 👀",
    ],
  },
  {
    version: '1.22.0',
    date: '2026-05-18',
    title: '🏦 Boutique Actions + roue ajustée',
    title_en: '🏦 Shares Shop + tuned wheel',
    changes: [
      "🏦 Nouvelle Boutique Actions : accumule des actions $CKM et débloque-la pour échanger tes actions contre des récompenses exclusives (thèmes, avatars, cafés…)",
      "📈 Un repère dans le Marché t'indique ta progression vers son déblocage",
      "🎡 Roue : les petits gains du palier intermédiaire ont été revalorisés",
      "🛒 Correctif : un pack d'actions $CKM acheté ne reste plus affiché à tort dans la boutique",
    ],
    changes_en: [
      "🏦 New Shares Shop: stack up $CKM shares and unlock it to trade your shares for exclusive rewards (themes, avatars, coffees…)",
      "📈 A marker in the Market shows your progress toward unlocking it",
      "🎡 Wheel: the mid-tier small wins have been bumped up",
      "🛒 Fix: a purchased $CKM shares pack no longer wrongly stays shown in the shop",
    ],
  },
  {
    version: '1.21.0',
    date: '2026-05-17',
    title: '🏆 Classement hebdo remis à zéro + roue rééquilibrée',
    title_en: '🏆 Weekly leaderboard reset + rebalanced wheel',
    changes: [
      "🏆 Le classement repart à zéro : une nouvelle course chaque semaine, le podium est à prendre (tes cookies, ton niveau et tes récompenses restent 100 % intacts)",
      "🎡 La roue est rééquilibrée et adaptée à ton niveau — trois paliers de mises et de gains, plus de suspense",
      "🌍 Le mini-jeu « Devine la commande » est désormais entièrement traduit en anglais",
      "📊 Chaque ligne du classement affiche le score de la semaine ET le total cumulé du joueur",
    ],
    changes_en: [
      "🏆 The leaderboard is reset: a fresh race every week, the podium is yours to grab (your cookies, level and rewards stay 100% intact)",
      "🎡 The wheel is rebalanced and scaled to your level — three tiers of stakes and rewards, more suspense",
      "🌍 The \"Guess the order\" mini-game is now fully translated to English",
      "📊 Every leaderboard row shows the weekly score AND the player's all-time total",
    ],
  },
];

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
  version: '1.24.0',
  releaseDate: '2026-05-26',
  github: 'https://github.com/Cookithan/cookitrader',
  description: "App mobile de récompenses café & cookies. Mini-jeux quotidiens, marché spéculatif $CKM, classement, amis et boutique premium.",
  author: 'Cookithan',
};

export const CHANGELOG = [
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
  {
    version: '1.20.1',
    date: '2026-05-14',
    title: '🎟️ Codes promo verrouillés cross-device',
    title_en: '🎟️ Promo codes locked cross-device',
    changes: [
      "🎟️ Les codes promo ne peuvent plus être réutilisés en changeant d'appareil — un code = une seule fois par compte, où que tu te connectes",
    ],
    changes_en: [
      "🎟️ Promo codes can no longer be reused by switching devices — one code = one redemption per account, anywhere you log in",
    ],
  },
  {
    version: '1.20.0',
    date: '2026-05-14',
    title: '🌍 App bilingue FR / EN + marché libéré',
    title_en: '🌍 Bilingual app FR / EN + market unleashed',
    changes: [
      "🌍 L'app est maintenant entièrement traduite en anglais — bascule la langue depuis les Paramètres",
      "📈 Le marché ne tire plus le prix vers 100 — la courbe peut s'envoler ou plonger plus longtemps",
      "🔔 Les pops d'amis acceptés ne réapparaissent plus quand tu te connectes sur un autre appareil",
    ],
    changes_en: [
      "🌍 The app is now fully translated to English — switch language from Settings",
      "📈 The market no longer pulls the price back toward 100 — the curve can fly higher or dive longer",
      "🔔 Accepted-friend pop-ups no longer reappear when you log in on another device",
    ],
  },
];

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
  version: '1.21.0',
  releaseDate: '2026-05-17',
  github: 'https://github.com/Cookithan/cookitrader',
  description: "App mobile de récompenses café & cookies. Mini-jeux quotidiens, marché spéculatif $CKM, classement, amis et boutique premium.",
  author: 'Cookithan',
};

export const CHANGELOG = [
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
  {
    version: '1.19.3',
    date: '2026-05-14',
    title: '🎡 Roue plus généreuse + surprises cachées',
    title_en: '🎡 More generous Wheel + hidden surprises',
    changes: [
      "🎡 La roue est rééquilibrée 75/25 : trois fois plus de gains que de pertes (les pertes mordent encore mais beaucoup moins souvent)",
      "✨ De nouvelles surprises planquées dans certains mini-jeux — très rares à dénicher, gros bonus quand ça tombe",
    ],
    changes_en: [
      "🎡 The wheel is rebalanced 75/25: three times more wins than losses (losses still bite but much less often)",
      "✨ New surprises tucked away in some mini-games — very rare to find, big bonus when it drops",
    ],
  },
  {
    version: '1.19.2',
    date: '2026-05-14',
    title: '📲 Vraie installation PWA + 🎁 Coffres Mystères',
    title_en: '📲 Real PWA install + 🎁 Mystery Chests',
    changes: [
      "📲 L'app peut maintenant s'installer comme une vraie app — mode offline, mises à jour gérées proprement, plus un raccourci dans le navigateur",
      "🎁 Nouvelle section « Coffres Mystères » dans la boutique premium — chaque coffre se découvre en une seule ouverture et révèle 3 cosmétiques cachés",
      "🥉 3 tiers à débloquer selon ton niveau : Bronze, Or et Légendaire — la rareté monte avec le prix",
    ],
    changes_en: [
      "📲 The app can now install like a real native app — offline mode, properly handled updates, no longer just a browser shortcut",
      "🎁 New \"Mystery Chests\" section in the premium shop — each chest opens once and reveals 3 hidden cosmetics",
      "🥉 3 tiers to unlock by level: Bronze, Gold and Legendary — rarity climbs with price",
    ],
  },
  {
    version: '1.19.1',
    date: '2026-05-13',
    title: '🎉 Palier communautaire 500 000 🍪 + polish marché',
    title_en: '🎉 500,000 🍪 community milestone + market polish',
    changes: [
      "🎉 Palier communautaire : la communauté a miné 500 000 cookies — un cadeau pour tous les joueurs",
      "⚡ Renommage : « Ordre Bulk $CKM » devient « Trade Express $CKM » (plus clair pour les nouveaux)",
      "🎁 De nouveaux codes promo à dénicher sur les réseaux",
      "✨ De nouvelles surprises planquées dans la boutique…",
    ],
    changes_en: [
      "🎉 Community milestone: the community has mined 500,000 cookies — a gift for all players",
      "⚡ Rename: \"$CKM Bulk Order\" becomes \"$CKM Express Trade\" (clearer for newcomers)",
      "🎁 New promo codes to dig up on social media",
      "✨ New surprises tucked away in the shop…",
    ],
  },
];

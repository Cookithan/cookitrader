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
  version: '1.30.1',
  releaseDate: '2026-09-08',
  github: 'https://github.com/Cookithan/cookitrader',
  description: "App mobile de récompenses café & cookies. Mini-jeux quotidiens, marché spéculatif $CKM, classement, amis et boutique premium.",
  author: 'Cookithan',
};

export const CHANGELOG = [
  /* La 1.30 continue : on AJOUTE une entrée, on ne réécrit pas la
     précédente — les joueurs l'ont déjà lue.

     Celle-ci ne parle que de ce qui est VISIBLE pour eux. La console
     d'administration, son thème bleu et les codes promo passés en base
     sont sortis dans la même livraison, mais un joueur ne les verra
     jamais : les annoncer ne ferait que noyer la seule ligne qui le
     concerne. */
  {
    version: '1.30.1',
    date: '2026-09-08',
    title: '🛡️ Dis-nous ce qui ne va pas',
    title_en: "🛡️ Tell us what's wrong",
    changes: [
      "🛡️ La Sentinelle arrive dans les Paramètres : signale un bug, un souci de cookies, un joueur, ou souffle une idée",
      "🎯 Deux ou trois questions guidées suffisent : tu choisis l'écran, puis ce qui cloche, et tu racontes en une phrase",
      "📮 Ton pseudo, ton niveau et ta version partent avec — rien à recopier, et de quoi reproduire le problème",
      "🌍 Tout l'écran existe en français et en anglais",
    ],
    changes_en: [
      "🛡️ The Sentinel lands in Settings: report a bug, a cookie problem, a player, or drop an idea",
      "🎯 Two or three guided questions is all it takes: pick the screen, then what went wrong, then tell us in one sentence",
      "📮 Your name, level and app version travel with it — nothing to copy out, and enough to reproduce the problem",
      "🌍 The whole screen exists in French and in English",
    ],
  },
  {
    version: '1.30.0',
    date: '2026-09-08',
    title: '✨ Une app plus claire, une Collection à toi',
    title_en: '✨ A clearer app, a Collection of your own',
    changes: [
      "🎨 Nouvel onglet Ma Collection : thèmes, avatars, skins, titres et musiques réunis au même endroit. On achète en boutique, on équipe ici",
      "🧹 Accueil, Boutique, Jeux, Classement et Paramètres allégés : moins d'encarts, l'essentiel en premier, et tes succès ont leur propre écran",
      "🏅 Les niveaux changent de visage : médaille en cookie, bannières colorées par tranche de 5 paliers",
      "📈 Le marché $CKM se refond : l'action vaudra 500 🍪, et son cours ne bougera plus QUE par vos achats et vos ventes — plus aucun retour automatique. vos actions ont été conservées, et le marché rouvre",
      "📊 Nouvelle courbe : fenêtres 1 h / 24 h / 7 j / 1 mois, variation affichée, chaque point à sa vraie date",
      "🧊 Café Express : correction du cookie qui se téléportait en haut de l'écran avant de se changer en glaçon",
    ],
    changes_en: [
      "🎨 New My Collection tab: themes, avatars, skins, titles and music all in one place. Buy in the shop, equip here",
      "🧹 Home, Shop, Games, Leaderboard and Settings decluttered: fewer boxes, the essentials first, and your achievements now have their own screen",
      "🏅 Levels get a new look: cookie medal, banners tinted by group of 5 tiers",
      "📈 The $CKM market is being rebuilt: a share will be worth 500 🍪, and its price will move ONLY when you buy and sell — no automatic drift back. your shares were kept, and the market is open again",
      "📊 New chart: 1h / 24h / 7d / 1 month windows, change shown, every point at its real date",
      "🧊 Café Express: fixed the cookie teleporting to the top of the screen before turning into an ice cube",
    ],
  },
  {
    version: '1.29.0',
    date: '2026-09-07',
    title: '⚖️ Économie remise d\'aplomb',
    title_en: '⚖️ Economy set straight',
    changes: [
      "🧩 Memory : correction d'un bug qui pouvait verser des milliers de 🍪 par partie — il traînait là depuis deux semaines",
      "⚖️ Les comptes qui en ont profité ont été corrigés (cookies, cafés, niveau, actions, objets) et les deux classements recalculés",
      "🎁 Les actions $CKM effacées lors du reset du marché ont été rendues à tout le monde",
      "✉️ Si ton compte a été touché — dans un sens ou dans l'autre — un message t'attend à l'ouverture avec le détail",
      "🔒 Le marché $CKM ferme le temps qu'on le refonde. Tes actions et ton portefeuille sont conservés, et la Boutique Actions reste ouverte",
    ],
    changes_en: [
      "🧩 Memory: fixed a bug that could pay out thousands of 🍪 per run — it had been there for two weeks",
      "⚖️ Accounts that exploited it have been corrected (cookies, coffees, level, shares, items) and both leaderboards recomputed",
      "🎁 The $CKM shares wiped during the market reset have been given back to everyone",
      "✉️ If your account was affected — either way — a message is waiting for you on open with the details",
      "🔒 The $CKM market is closing while we rebuild it. Your shares and portfolio are kept, and the Shares Shop stays open",
    ],
  },
  {
    version: '1.27.0-beta',
    date: '2026-07-04',
    title: '🥊 Duels : mises & choix du jeu',
    title_en: '🥊 Duels: stakes & game pick',
    changes: [
      "💰 Les Duels prennent des mises ! Mise tes 🍪 (et ☕) jusqu'à 2× l'adversaire — le gagnant remporte la moitié de la cagnotte",
      "🎯 Choisis ton épreuve parmi 3 : tu vois le choix de l'adversaire avant de trancher, avec un aperçu du gameplay",
      "🤖 L'adversaire joue vraiment sous tes yeux — des scores enfin réalistes à battre",
      "🎁 Cadeau bêta-testeurs : entre le code BETA dans les Paramètres pour 3 ☕",
      "⚖️ Le marché $CKM se rééquilibre doucement vers 100",
    ],
    changes_en: [
      "💰 Duels now have stakes! Bet your 🍪 (and ☕) up to 2× your opponent — the winner takes half the pot",
      "🎯 Pick your challenge from 3: see your opponent's pick before deciding, with a gameplay preview",
      "🤖 Your opponent actually plays in front of you — finally realistic scores to beat",
      "🎁 Beta-tester gift: enter the code BETA in Settings for 3 ☕",
      "⚖️ The $CKM market gently rebalances back toward 100",
    ],
  },
  {
    version: '1.26.0-beta',
    date: '2026-07-03',
    title: '🥊 Duels 1v1 — bêta !',
    title_en: '🥊 1v1 Duels — beta!',
    changes: [
      "🥊 Nouveauté en bêta : les Duels 1v1 ! Depuis l'onglet Jeux, tape « Trouver un duel »",
      "🎯 Recherche d'un adversaire, épreuve tirée au sort + ses règles, puis affronte-le sur un mini-jeu",
      "📊 Barre de course en direct : ton score face au sien, le meneur s'illumine en or",
      "🧪 C'est une toute première version bêta — teste et dis-nous ce que t'en penses !",
    ],
    changes_en: [
      "🥊 New in beta: 1v1 Duels! From the Games tab, tap \"Find a duel\"",
      "🎯 Opponent search, a random challenge + its rules, then face them on a mini-game",
      "📊 Live race bar: your score against theirs, the leader lights up in gold",
      "🧪 This is an early beta — give it a try and tell us what you think!",
    ],
  },
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
];

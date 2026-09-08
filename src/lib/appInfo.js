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
  version: '1.30.0',
  releaseDate: '2026-09-07',
  github: 'https://github.com/Cookithan/cookitrader',
  description: "App mobile de récompenses café & cookies. Mini-jeux quotidiens, marché spéculatif $CKM, classement, amis et boutique premium.",
  author: 'Cookithan',
};

export const CHANGELOG = [
  /* ⚠️ BROUILLON — NE PAS DÉPLOYER EN L'ÉTAT ⚠️
     La 1.30 est loin d'être finie (≈ 10 % du périmètre voulu au 07/09/2026) :
     ce qui suit ne couvre que le premier chantier, la simplification de
     l'interface. Le titre, la date et TOUS les points sont à réécrire
     quand la version sera vraiment terminée — sinon les joueurs
     recevront un changelog qui décrit un dixième de la mise à jour. */
  {
    version: '1.30.0',
    date: '2026-09-07',
    title: '✨ Une app plus claire, une Collection à toi',
    title_en: '✨ A clearer app, a Collection of your own',
    changes: [
      "🎨 Nouvel onglet Ma Collection : thèmes, avatars, skins, titres et musiques réunis au même endroit. On achète en boutique, on équipe ici",
      "🗂️ Tout y est rangé par famille et par provenance — boutique, premium, éditions limitées, codes promo",
      "🧹 Accueil, Boutique, Classement, Marché et Paramètres allégés : moins d'encarts, l'essentiel en premier",
      "🏆 Tes succès ont leur propre écran, ils n'occupent plus la moitié de l'accueil",
      "ℹ️ Tape le logo CookiMiner en haut de l'écran pour retrouver les nouveautés à tout moment",
      "🏦 La boutique en actions $CKM ferme — ce que tu y avais obtenu reste à toi et s'équipe dans Ma Collection",
      "📈 Le marché $CKM change d'échelle : l'action vaut 500 🍪, et le cours ne bouge plus QUE par les achats et les ventes des joueurs — plus aucun retour automatique",
      "📊 Nouvelle courbe : fenêtres 1 h / 24 h / 7 j / 1 mois, variation affichée, et chaque point posé à sa vraie date",
      "⏳ Le bonus de hold disparaît : une vente rapporte le cours, et rien d'autre",
    ],
    changes_en: [
      "🎨 New My Collection tab: themes, avatars, skins, titles and music all in one place. Buy in the shop, equip here",
      "🗂️ Everything is sorted by family and by origin — shop, premium, limited editions, promo codes",
      "🧹 Home, Shop, Leaderboard, Market and Settings decluttered: fewer boxes, the essentials first",
      "🏆 Your achievements now have their own screen instead of filling half the home tab",
      "ℹ️ Tap the CookiMiner logo at the top to check what's new at any time",
      "🏦 The $CKM shares shop is closing — whatever you unlocked there stays yours and is equipped in My Collection",
      "📈 The $CKM market changes scale: a share is worth 500 🍪, and the price now moves ONLY when players buy and sell — no automatic drift back",
      "📊 New chart: 1h / 24h / 7d / 1 month windows, change shown, and every point placed at its real date",
      "⏳ The hold bonus is gone: a sale pays the market price, and nothing else",
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
];

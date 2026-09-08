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
  version: '1.30.2',
  releaseDate: '2026-09-09',
  github: 'https://github.com/Cookithan/cookitrader',
  description: "App mobile de récompenses café & cookies. Mini-jeux quotidiens, marché spéculatif $CKM, classement, amis et boutique premium.",
  author: 'Cookithan',
};

export const CHANGELOG = [
  {
    version: '1.30.2',
    date: '2026-09-09',
    title: '🎮 Des aires de jeu plus grandes',
    title_en: '🎮 Bigger play areas',
    changes: [
      "🏅 Les bonus de niveau suivent enfin l’effort : ils plafonnaient à 290 🍪 alors que le palier coûtait 40 000 XP. Le niveau 25 rapporte désormais 2000 🍪, et les grands paliers versent les cookies EN PLUS du café",
      "🎮 Les aires de jeu s’agrandissent : Flappy Cookie gagne 60 % de surface, Café Express 27 %, Pile de Tasses et Réflexes s’élargissent aussi",
      "🥤 Café Express : les parties de 2 et 3 minutes rapportaient trois fois moins par minute que celle d’une minute. Les gains suivent enfin la durée",
      "🐦 Flappy Cookie : le ciel bleu laisse place à un dégradé café au lait, assorti aux tuyaux",
      "📈 Le cours du $CKM s’affiche en bas de l’accueil, et les actions offertes par code promo le font enfin monter comme un vrai achat",
      "📚 Quiz refondu : du café et du biscuit à la place des questions sur l’app, la difficulté FACILE est de retour, et Moyen n’est plus parfois plus dur qu’Expert",
      "🎨 Un thème acheté s’équipe tout de suite — plus besoin d’aller le chercher dans Ma Collection",
      "🤝 Ajoute n’importe qui en ami directement depuis le classement, sans lui demander son code",
      "🎵 De la musique dans tous les mini-jeux : elle ne se coupe plus en route",
    ],
    changes_en: [
      "🏅 Level-up bonuses finally follow the effort: they capped at 290 🍪 while a tier cost 40,000 XP. Level 25 now pays 2000 🍪, and the big tiers grant cookies ON TOP of the coffee",
      "🎮 Play areas get bigger: Flappy Cookie gains 60 % of surface, Café Express 27 %, Cup Stack and Reflexes widen too",
      "🥤 Café Express: the 2- and 3-minute runs paid three times less per minute than the 1-minute one. Rewards now follow the duration",
      "🐦 Flappy Cookie: the blue sky makes way for a café-au-lait gradient, matching the pipes",
      "📈 The $CKM price now shows at the bottom of Home, and shares granted by promo codes finally push it up like a real purchase",
      "📚 Quiz rebuilt: coffee and biscuits instead of questions about the app, the EASY tier is back, and Medium is no longer sometimes harder than Expert",
      "🎨 A theme you buy is equipped right away — no more digging through My Collection",
      "🤝 Add anyone as a friend straight from the leaderboard, without asking for their code",
      "🎵 Music in every mini-game: it no longer cuts out along the way",
    ],
  },
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
    /* Première version de ces lignes : une liste de fonctionnalités —
       « la Sentinelle arrive dans les Paramètres », « deux ou trois
       questions guidées ». Exact, et sans effet : personne n'ouvre un
       écran parce qu'il est bien conçu.

       Ce qu'un joueur doit comprendre ici tient en deux choses. Que
       quelqu'un surveille SON compte pendant qu'il ne joue pas — les
       tricheurs, les bugs qui lui coûtent des cookies, le marché qui
       dérape. Et que ce qu'il raconte ne se perd pas dans le vide, ni
       ne s'étale devant les autres joueurs.

       On parle donc de protection et de confidentialité avant de parler
       du formulaire. Le formulaire, il le verra bien tout seul. */
    title: '🛡️ La Sentinelle veille sur toi — et tu peux lui parler',
    title_en: '🛡️ The Sentinel watches over you — now you can talk to it',
    changes: [
      "🛡️ Elle veille sur le jeu jour et nuit : comptes qui trichent, bugs qui coûtent des cookies, cours du marché qui dérape — rien ne lui échappe",
      "💬 Nouveau : tu peux lui parler. Un bug, un cookie disparu, un joueur douteux, une idée — c'est dans les Paramètres",
      "🎯 Deux ou trois questions et c'est parti. Pas de formulaire à remplir, pas d'e-mail, rien à recopier",
      "🔒 Ce que tu lui confies ne va qu'à Cookithan. Aucun autre joueur ne peut le lire",
      "🍪 Une récompense qui n'arrive pas, un achat qui ne donne rien ? Dis-le. C'est comme ça que ça se répare",
    ],
    changes_en: [
      "🛡️ It watches the game day and night: cheating accounts, bugs that cost you cookies, market prices going wild — nothing gets past it",
      "💬 New: you can talk to it. A bug, a missing cookie, a shady player, an idea — it's in Settings",
      "🎯 Two or three questions and it's sent. No form to fill in, no email, nothing to copy out",
      "🔒 What you tell it goes to Cookithan and nobody else. No other player can read it",
      "🍪 A reward that never arrived, a purchase that gave you nothing? Say so. That's how it gets fixed",
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
];

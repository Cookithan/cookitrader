/* ════════════════════════════════════════════════════
   appInfo.js — métadonnées app + changelog (BRIEF_A_PROPOS)
   ────────────────────────────────────────────────────
   Version visible dans la modale "À propos" (Paramètres → bas).
   À mettre à jour à chaque release notable.

   Convention :
     - Garder 5-6 entrées max dans CHANGELOG (les + récentes).
     - L'entrée d'index 0 reçoit le badge NOUVEAU dans l'UI.
     - Pas de rouge / vert dans les emojis (palette café-only).
═══════════════════════════════════════════════════════ */

export const APP_INFO = {
  version: '1.9.0',
  releaseDate: '2026-05-10',
  github: 'https://github.com/Cookithan/cookitrader',
  description: "App mobile de récompenses café & cookies. Mini-jeux quotidiens, marché spéculatif $CKM, classement, amis et boutique premium.",
  author: 'Cookithan',
};

export const CHANGELOG = [
  {
    version: '1.9.0',
    date: '2026-05-10',
    title: '☕ Monétisation, prestige & refonte café',
    changes: [
      "💳 Paiement Stripe pour acheter des cafés (10 / 50 / 200 ☕)",
      "🌟 Système Prestige (Renaissance) — niveau 16 'Ascendant Caféiné' à 20000 XP",
      "👑 Couronnes visibles dans le classement à chaque prestige (×10 % bonus permanent sur tous les gains 🍪)",
      "⚡ Nouveaux boosters consommables : ×2 cookies (1 h), Skip quiz, Doubler prochain gain",
      "🎫 Catégorie 'Bonus VIP' regroupe tous les jetons + boosters dans le Premium",
      "🎰 Cap 50 parties / jour sur la Machine à Sous + ticket 50 parties (3 ☕)",
      "🐺 Avatar Loup Mocha (remplace Dragon Espresso) — fourrure mocha sur fond espresso sombre",
      "🌑 Thème exclusif 'Noir & Blanc' via code promo BLACK (greyscale total)",
      "🍪 Thème 'Pâte de Cookie' via code rare BARISTA05 (drop 1 % chez le barista légendaire de Devine la commande)",
      "🎓 Tutoriel élargi : 7 étapes couvrant classement, marché, boutique en plus",
      "💰 Économie café rééquilibrée : sources -45 %, stock global reset à 0",
      "🐛 Fix : sync cross-device cassait les paiements Stripe (race upsert client)",
    ],
  },
  {
    version: '1.8.0',
    date: '2026-05-09',
    title: '🛍️ Boutique enrichie + audio complet',
    changes: [
      "🎨 9 nouveaux skins cookie (Caramel, Onyx, Doré, Phoenix, Originel…)",
      "🏷️ 9 titres couleur shimmer pour ton pseudo (Mousse → Cosmique)",
      "🎵 5 nouvelles musiques (Café du Matin, Velvet Smoke, Beat de l'Empereur, Veillée Lofi, Nuit Cosmique)",
      "📈 Packs $CKM — achète directement 5 ou 10 actions",
      "🎟️ Item premium 'Révéler Code Promo Rare' (5 ☕ niv 13)",
      "🔊 8 sons d'effets dédiés (caisse, jackpot, slot, bulle…)",
      "💧 Bruit du café qui coule pendant le 'Stop le café'",
      "🪟 Sons sur tous les jeux silencieux (Click, Memory, Reflex, Devine)",
      "👤 Sélecteurs Skin & Titre dans le profil",
      "🛒 Chaque niveau a maintenant 3 ou 4 items à débloquer",
    ],
  },
  {
    version: '1.7.0',
    date: '2026-05-09',
    title: '🎰 Niveaux 11-15 + Machine à Sous',
    changes: [
      "🆙 5 nouveaux niveaux : Empereur Caféiné → Cookie Originel",
      "🎰 Nouveau mini-jeu Machine à Sous (débloqué niv 13)",
      "🛡️ 3 badges et 2 thèmes en plus dans la boutique",
      "🌌 Endgame XP→☕ décalé du niv 10 au niv 15 — plus de progression",
      "📜 Restauration complète de profil avec PIN sécurisé",
      "🔄 Récupère ton compte sur un autre appareil avec ton code + PIN",
    ],
  },
  {
    version: '1.6.0',
    date: '2026-05-08',
    title: '🎁 Cadeaux + niveaux 7-9 + anti-triche',
    changes: [
      "🎁 Offrir 50 🍪 ou 1 ☕ à un ami (max 3 cadeaux par jour)",
      "🏗️ Nouveau mini-jeu Pile de Tasses (niv 8) — empile sans tomber",
      "⬆️ Niveaux 7-9 remplis : Mocha Cosmique, Sage du Café, Maître Mythique",
      "💫 Bonus passif +15 % XP à partir du niveau 9",
      "🎓 Mode Expert Devine la commande (niv 7+, V60 / Geisha / Chemex…)",
      "🎰 Roue à 20 🍪 dès le niveau 8",
      "🛡️ Anti-triche Cookie Clicker v2 (cap 12 clics/s, détection pattern)",
      "🔇 Musique en pause quand l'app passe en arrière-plan",
      "🎨 Avatars : 8 onboarding + 9 premium thématisés café/cookie",
      "🐛 Fix : amitiés bloquées en pending par une RLS manquante",
    ],
  },
  {
    version: '1.5.0',
    date: '2026-05-07',
    title: '📈 Marché en ligne + réseau social',
    changes: [
      "📈 Marché $CKM 100 % online avec offre/demande partagée entre joueurs",
      "🏆 Classement marché par actions $CKM détenues",
      "⏰ Horaires marché : 6 h → minuit (heure locale)",
      "👥 Demandes d'amis bilatérales (envoyer / accepter / refuser)",
      "👤 Voir le profil d'un ami ou du top 1 du classement",
      "💬 Réactions emoji depuis le profil (👏 ☕ 🔥 🍪)",
      "📬 Inbox de notifications centralisée",
      "🏅 Badges secrets : Noctambule · Investisseur · Amical",
      "🎉 Événements spéciaux : 3 défis avec thèmes limités + bonus ☕",
      "🐛 Fix : reset complet du profil + avatars cross-device",
    ],
  },
  {
    version: '1.4.0',
    date: '2026-05-06',
    title: '🎵 Audio complet',
    changes: [
      "🔊 Sons d'interface partout (tap, succès, modale…)",
      "🎵 4 musiques d'ambiance (Jazz Café, Bossa Nova, Café Parisien, Lounge Doré)",
      "☕ Pack premium ☕ : Lofi + Symphonie Royale",
      "🔇 Mute global + sélection de la piste en cours",
    ],
  },
  {
    version: '1.3.0',
    date: '2026-05-05',
    title: '☁️ Backend Supabase',
    changes: [
      "🌍 Profil synchronisé en ligne via Supabase",
      "🏆 Classement online avec vrais joueurs",
      "🎓 Tutoriel guidé pour les nouveaux",
      "✨ Splash screen lettre par lettre",
      "📱 PWA installable sur l'écran d'accueil",
    ],
  },
];

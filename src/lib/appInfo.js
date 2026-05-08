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
  version: '1.6.0',
  releaseDate: '2026-05-08',
  github: 'https://github.com/Cookithan/cookitrader',
  description: "App mobile de récompenses café & cookies. Mini-jeux quotidiens, marché spéculatif $CKM, classement, amis et boutique premium.",
  author: 'Cookithan',
};

export const CHANGELOG = [
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
  {
    version: '1.0.0',
    date: '2026-05-02',
    title: '🎉 Lancement initial',
    changes: [
      "5 mini-jeux : Check-in, Devine la commande, Roue, Défi de clics, Stop café",
      "🛍️ Boutique : badges, titres, thèmes, avatars, skins, roues",
      "📊 Marché $CKM local",
      "👤 Profil avec progression sur 10 niveaux",
    ],
  },
];

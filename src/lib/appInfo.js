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
  version: '1.19.0',
  releaseDate: '2026-05-13',
  github: 'https://github.com/Cookithan/cookitrader',
  description: "App mobile de récompenses café & cookies. Mini-jeux quotidiens, marché spéculatif $CKM, classement, amis et boutique premium.",
  author: 'Ethan Cuomo',
};

export const CHANGELOG = [
  {
    version: '1.19.0',
    date: '2026-05-13',
    title: '📊 Marché vivant + popup système',
    changes: [
      "📰 Activité des autres joueurs visible sous la courbe (3 dernières transactions)",
      "📊 Pouls du marché : nb de traders 24 h, volume, ratio achats/ventes en un coup d'œil",
      "✨ Le prix flashe en temps réel à chaque variation (or hausse / moka baisse)",
      "👆 Glisse ton doigt sur la courbe : prix + heure exacte à chaque instant",
      "⏳ Carte Mes Actions enrichie : durée de hold + bonus actif + jauge prochain palier",
      "⚡ Cooldown entre 2 achats $CKM ramené à 15 s (vs 60 s) — réagis enfin en direct",
      "⚖️ Anti-monopole renforcé : top 1 du classement cookies plafonné automatiquement",
      "📣 Nouveau : popup d'annonces pilotées en live (maintenance, événements, mises à jour)",
      "❓ +30 questions au Quiz, +15 commandes au mini-jeu Devine la commande",
      "🔊 Son du bonus Flappy Cookie atténué",
    ],
  },
  {
    version: '1.18.0',
    date: '2026-05-13',
    title: '⏱️ Temps total joué + progression XP adoucie',
    changes: [
      "⏱️ Nouveau : temps total passé sur l'app affiché dans ton profil et celui des autres joueurs",
      "⬆️ Niveaux 6 à 14 adoucis : fini le mur brutal au passage du 6 → 7 (progression ~×1.33 par palier)",
      "🐛 Fix d'affichage Android pour les utilisateurs avec un titre couleur animé",
    ],
  },
  {
    version: '1.17.0',
    date: '2026-05-13',
    title: '🎰 Refonte mini-jeux + UX fluide',
    changes: [
      "🎡 Roue : 10 segments alternés gain/perte, 50/50 pile, événement spectaculaire sur jackpot +200",
      "🎰 Machine à Sous plus généreuse : gains boostés (jackpot 750→1000), probabilités x2 sur les triples, paire +25→+35",
      "🐦 Flappy Cookie : café bonus plus fréquent (% variable par mode), nouveau son de saut, ombre du cookie retirée",
      "☕ Stop le café : hitbox du bouton élargie (plus de lâché frustrant), tasse redessinée + recentrée sur l'assiette",
      "🍪 Cookie Click : 2 clics = 1 🍪 + retrait du cap, timer & barre parfaitement synchronisés",
      "🌟 Renaissance : la série de check-ins (streak) est désormais conservée",
      "🛡️ Anti-triche refondu : zéro faux positif pour les joueurs rapides",
      "🚀 App entièrement fluide : retour à un bundle unique, plus de chargements en cascade",
    ],
  },
  {
    version: '1.16.0',
    date: '2026-05-12',
    title: '⚡ Perf + UX polish + Ordre Bulk $CKM',
    changes: [
      "⚡ App 2× plus rapide à charger (bundle initial divisé par 2)",
      "🎬 Transition entre onglets totalement refondue (glisse iOS-like)",
      "📳 Vibrations subtiles sur les actions clés (achat, niveau, succès)",
      "💫 Animations skeleton dorées sur le classement pendant le chargement",
      "🛡️ Plus d'écran blanc en cas de bug — écran de récupération propre",
      "🔄 Maintenance & mises à jour pilotables en live (sans deploy)",
      "📈 Cap actions $CKM par transaction : 20 → 30",
      "📦 Nouvel item premium : Ordre Bulk $CKM (3 ☕) — achète OU vends d'un coup tout ton portefeuille (bypass cap, cumulable)",
      "⬆️ XP niveaux 9-12 adouci (-25%) — fin du mur post-niveau 8",
    ],
  },
  {
    version: '1.15.0',
    date: '2026-05-11',
    title: '🎮 Flappy Cookie + niveaux 16-25 + Discord communauté',
    changes: [
      "🎮 Nouveau mini-jeu Flappy Cookie (niv 12) — 3 modes Facile/Normal/Difficile, esquive les tuyaux espresso",
      "✨ Tuyaux clairs aléatoires (×2 reward) et bonus rares à dénicher",
      "⬆️ Extension à 25 niveaux : Ascendant Caféiné → Origine du Cookie (le palier final endgame est désormais au niv 25)",
      "🛍️ 13 nouveaux items boutique pour les niveaux 16-25 (badges, titres, skins, thèmes)",
      "🌋 Thème Forge Caféinée — palette volcanique sombre + or saturé",
      "⚡ 3 boosts premium en plus : Boost +30 % (24 h), Recharges Gratuites (24 h), Streak Save",
      "💬 Serveur Discord intégré (accueil + paramètres + à propos) pour bugs & suggestions",
      "🥞 Pile de Tasses : cap quotidien 50 → 100 + recharge 2 ☕ → 1 ☕",
      "🎰 Roue & Machine à Sous : recharge 2 ☕ → 1 ☕",
      "🧠 Memory Café : aperçu 0,5 s de toutes les cartes au démarrage",
      "🍪 Cookie Click : refonte douce (auto-fin au cap, +1 🍪 par clic, plus équilibré)",
      "📊 Rééquilibrage XP : progression du niv 3 au niv 24 plus posée pour valoriser la montée",
      "🛡️ Système de patches Supabase cross-device — fini les doubles pop-ups au changement d'appareil",
      "🎯 Modale 'Voir détails' du classement enfin centrée à l'écran",
      "☕ Stop le café : fini les arrêts inopinés quand le doigt glisse hors du bouton",
    ],
  },
  {
    version: '1.14.0',
    date: '2026-05-11',
    title: '🎮 Pile de Tasses & Cookie Click — diversifiés + recharge in-game',
    changes: [
      "🥞 Pile de Tasses : 3 modes au choix (Normal / Rapide / Précision) avec caps adaptés",
      "✨ Pile de Tasses : tasses spéciales aléatoires (dorée bonus, fragile, large) dès 5 tasses posées",
      "🍪 Cookie Click : 3 modes (Normal 5 s / Rapide 3 s / Frénétique 8 s avec cookie qui bouge)",
      "🔥 Cookie Click : les combos x2/x3/x4 boostent vraiment le reward (avant : juste visuels)",
      "🎰 Roue & Machine à Sous : recharge directe pour 2 ☕ quand le quota est atteint",
      "🛒 Plus besoin d'aller dans la boutique premium pour racheter des tours / parties",
      "⏳ Pile de Tasses : 50 essais quotidiens, recharge 2 ☕ pour repartir à 50",
    ],
  },
];

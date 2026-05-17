/* ════════════════════════════════════════════════════
   CONSTANTES GAMEPLAY
   - LEVEL_NAMES : titre de chaque palier (1..15)
   - xpRequired  : XP nécessaire pour passer au niveau suivant
                    · 1..5  → level*100+50  (linéaire, montée rapide)
                    · 6..9  → level²*50     (palier durci pour le end-game)
   - SEGMENTS    : 11 segments de la roue (valeur, label, weight, color)
   - DAILY_REWARDS : check-in J1..J7 (J7 = jackpot hebdo)
   - REWARDS     : tous les items boutique (Badge / Titre / Thème / Avatar / Skin / Roue / Premium)
   - ACHIEVEMENTS: succès
   - QUESTIONS   : pool quiz, chacune a difficulty + reward + 4 choices
   - QUIZ_COOLDOWN_MS : 5h entre deux quiz
   - NAME_CHANGE_PRICES : tarif progressif du changement de prénom
════════════════════════════════════════════════════ */

export const LEVEL_NAMES = [
  '',
  'Barista',                    // 1
  'Torréfacteur',               // 2
  'Maître',                     // 3
  'Grand Barista',              // 4
  'Chef Pâtissier',             // 5
  'Légende',                    // 6
  'Connaisseur du Café',        // 7
  'Virtuose Café',              // 8
  'Maître Mythique',            // 9
  'Éternel du Cookie',          // 10
  'Empereur Caféiné',           // 11
  'Alchimiste du Cookie',       // 12
  'Gardien des Saveurs',        // 13 — débloque la Machine à Sous
  'Phoenix du Café',            // 14
  'Cookie Originel',            // 15
  'Ascendant Caféiné',          // 16
  'Visionnaire du Café',        // 17
  'Sage du Cookie',             // 18
  'Mystique Caféiné',           // 19
  'Oracle du Café',             // 20
  'Souverain Cookie',           // 21
  'Avatar du Café',             // 22
  'Démiurge Caféiné',           // 23
  'Légende Cosmique',           // 24
  'Origine du Cookie',          // 25 — palier endgame final : 60000 XP à grinder, café loop actif, prestige proposé à 60000
];

/* XP requise dans le niveau `level` pour passer à `level+1`.
   Rééquilibrage 11/05/2026 : avec les jeux gonflés (click + pile +
   spin + memory), les joueurs montaient au niveau 10 en ~2 jours.
   - Niv 1-2 : inchangé (onboarding doit rester rapide)
   - Niv 3-5 : ×1.5
   - Niv 6-24 : level²×50×1.5  (end-game qui se mérite)
   - Niv 25 : 60000  (palier final, café loop actif → prestige) */
/* Smoothing 6-14 (13/05/2026) — refonte de la courbe pour éliminer
   le mur 5→6→7. Progression ~×1.33 par palier au lieu du saut brutal
   825 → 2700 (×3.3) au niv 6. Reprise de la formule normale à partir
   du niveau 15. Demande user. */
const SMOOTH_XP = {
  6:  1100,
  7:  1500,
  8:  2000,
  9:  2700,
  10: 3600,
  11: 4800,
  12: 6500,
  13: 9000,
  14: 12000,
};

export function xpRequired(level){
  if(level <= 2) return level * 100 + 50;
  if(level <= 5) return Math.round((level * 100 + 50) * 1.5);
  if(level === 25) return 60000;
  if(SMOOTH_XP[level] !== undefined) return SMOOTH_XP[level];
  return Math.round(level * level * 50 * 1.5);
}

/* Tarif du changement de prénom — le 1er (onboarding) est gratuit,
   ensuite le compteur démarre à 0 et le prix grimpe à chaque modif.
   Plafonné à 1000 🍪 dès le 4e changement. */
export const NAME_CHANGE_PRICES = [100, 250, 500, 1000];
export function getNameChangePrice(count){
  return NAME_CHANGE_PRICES[Math.min(count, NAME_CHANGE_PRICES.length - 1)];
}

/* Roue 100% café & cookie (rééquilibrage 17/05/2026 #2 — adouci
   suite retour prod : "trop de -, +200 trop fréquent") :
   - 11 segments (5 gains / 6 pertes), visuel rayé clair/foncé
   - 72/28 : 72 de poids en gains, 28 en pertes → ~72 % de tours
     gagnants (moins punitif que le 60/40 précédent)
   - Jackpot +200 (idx 8) et grosse sanction -100 (idx 9) rendus
     RARES : poids 1 chacun (~1 % par tour) — risque/récompense
     symétrique mais le jackpot redevient un vrai événement
   - Montants croissants par tranche de niveau (3 roues, cf. tiers)
   - Reste rentable sur la durée mais plus serrée qu'en 75/25
   - Jackpot conservé à +200 EXACT (détection `value === 200` en dur
     dans SpinGame + easter egg secret +500 qui atterrit dessus —
     NE PAS changer cette valeur)
   - Sparkle/event JACKPOT sur +200 (overlay plein écran 2.5s) */
/* 3 ROUES par tranche de niveau (1-5 / 6-15 / 16-25).
   ── INVARIANT CAPITAL ──
   Les 3 tiers ont EXACTEMENT les mêmes `weight`, le même `color` et
   le même ORDRE (11 segments). Seuls `value` et
   `label` changent. Conséquence : la géométrie (utils/spin.js : TW,
   SEG_A, SEG_C, wRandom) reste identique quelle que soit la roue —
   wRandom() renvoie un index, et SpinGame mappe cet index dans le
   tier du joueur (cf. getSegmentsForLevel). NE PAS désaligner les
   poids/ordre entre tiers.
   Le segment d'index 8 vaut TOUJOURS 200 (jackpot) : SpinGame le
   détecte en dur via `value === 200` + easter egg secret +500. */
/* 11 segments. Rôle par index (FIXE, commun aux 3 tiers) :
     0 gain  · 1 perte · 2 gain  · 3 perte · 4 gain · 5 perte
     6 gain  · 7 perte · 8 GAIN +200 (jackpot) · 9 PERTE -100
     10 perte
   Split 60/40 : poids gains (idx 0,2,4,6,8) = 60, poids pertes
   (idx 1,3,5,7,9,10) = 40 → 60 % de tours gagnants.
   Le -100 (idx 9) accompagne toujours le +200 (idx 8) : gros
   jackpot ⇒ grosse sanction, tous deux rares (poids 3). */
const SEG_COLORS = ['#E8C588','#7A5232','#D4A017','#5A3520','#E5B040','#4A2A14','#F0C050','#3D2010','#FFD700','#1F0E04','#2A1810'];
/* idx :          0   1   2   3   4   5   6   7   8(+200) 9(-100) 10
   rôle :          G   L   G   L   G   L   G   L   G       L       L
   gains  idx 0,2,4,6,8 = 26+21+16+8+1 = 72
   pertes idx 1,3,5,7,9,10 = 10+8+5+2+1+2 = 28  (total 100) */
const SEG_WEIGHTS = [26, 10, 21, 8, 16, 5, 8, 2, 1, 1, 2];
function buildTier(values){
  return values.map((value, i) => ({
    value,
    label: (value > 0 ? '+' : '') + value,
    weight: SEG_WEIGHTS[i],
    color: SEG_COLORS[i],
  }));
}

/* Niveaux 1-5 (coût 10 🍪) — petits montants. 72 % gagnant.
   EV ≈ +16/tour (net ≈ +6). -100 rare en face du +200. */
export const SEGMENTS_LOW  = buildTier([ 15, -5,  20, -10,  35, -15,  60, -25, 200, -100, -30]);

/* Niveaux 6-15 (coût 10 puis 20 dès le niv 8) — montants moyens.
   72 % gagnant. EV ≈ +33/tour (net ≈ +13 à +23). */
export const SEGMENTS_MID  = buildTier([ 30, -10, 40, -15,  70, -25, 120, -40, 200, -100, -50]);

/* Niveaux 16-25 (coût 20 🍪) — endgame, économie plus large.
   72 % gagnant. EV ≈ +46/tour (net ≈ +26). */
export const SEGMENTS_HIGH = buildTier([ 40, -15, 60, -25, 100, -40, 180, -60, 200, -100, -75]);

/* Retourne la roue correspondant au niveau du joueur. */
export function getSegmentsForLevel(level){
  const L = Number(level) || 1;
  if(L <= 5)  return SEGMENTS_LOW;
  if(L <= 15) return SEGMENTS_MID;
  return SEGMENTS_HIGH;
}

/* Canonique pour la géométrie (utils/spin.js) — poids/ordre communs
   aux 3 tiers, donc n'importe lequel convient pour les angles. */
export const SEGMENTS = SEGMENTS_MID;

/* Récompenses check-in : index = jour dans la semaine (0..6). Jour 7 = jackpot. */
export const DAILY_REWARDS = [15, 20, 30, 40, 55, 75, 200];

export const REWARDS = [
  // BADGES
  { id:'badge_debutant', name:'Badge Débutant', desc:'Premier pas dans CookiMiner', cost:30,   type:'Badge', emoji:'🌱', levelRequired:1 },
  { id:'badge_barista',  name:'Badge Barista',  desc:'Maîtrise de base du café',    cost:120,  type:'Badge', emoji:'☕', levelRequired:2 },
  { id:'badge_chef',     name:'Badge Chef',     desc:'Pour les acharnés du cookie', cost:500,  type:'Badge', emoji:'👨‍🍳', levelRequired:5 },
  { id:'badge_legende',  name:'Badge Légende',  desc:'Le summum de CookiMiner',     cost:1000, type:'Badge', emoji:'👑', levelRequired:6 },
  { id:'badge_connaisseur', name:'Badge Connaisseur', desc:'Tu maîtrises l\'art du café',  cost:600,  type:'Badge', emoji:'🎓', levelRequired:7 },
  { id:'badge_eternel',   name:'Badge Éternel',   desc:'Au-delà de la Légende',         cost:2500, type:'Badge', emoji:'🌟', levelRequired:10 },
  { id:'badge_originel',  name:'Badge Originel',  desc:'Incarnation du premier cookie', cost:4000, type:'Badge', emoji:'✴️', levelRequired:15 },
  /* Badges niveaux 16-25 (extension endgame). Prix progressifs. */
  { id:'badge_ascendant', name:'Badge Ascendant', desc:'Tu as transcendé le cookie',     cost:1500, type:'Badge', emoji:'🚀', levelRequired:16 },
  { id:'badge_sage',      name:'Badge Sage',      desc:'Ta sagesse caféinée éclaire',    cost:2500, type:'Badge', emoji:'📜', levelRequired:18 },
  { id:'badge_oracle',    name:'Badge Oracle',    desc:'Tu vois au-delà du visible',     cost:3500, type:'Badge', emoji:'🔮', levelRequired:20 },
  { id:'badge_avatar',    name:'Badge Avatar',    desc:'Incarnation du café absolu',     cost:4500, type:'Badge', emoji:'👁️', levelRequired:22 },
  { id:'badge_origine',   name:'Badge Origine',   desc:'Le premier cookie en personne',  cost:8000, type:'Badge', emoji:'⚛️', levelRequired:25 },
  // TITRES
  // THÈMES
  { id:'theme_creme',      name:'Thème Cappuccino Mousseux', desc:'Fond rosé crème chaud',     cost:80,   type:'Thème', emoji:'☁️', levelRequired:1 },
  { id:'theme_espresso',   name:'Thème Nuit Espresso',       desc:'Fond sombre café',          cost:300,  type:'Thème', emoji:'🌙', levelRequired:2 },
  { id:'theme_caramel',    name:'Thème Caramel Sunrise',     desc:'Dégradé chaud animé',       cost:450,  type:'Thème', emoji:'🌅', levelRequired:3 },
  { id:'theme_legendaire', name:'Thème Légendaire',          desc:'Fond doré avec particules', cost:1200, type:'Thème', emoji:'💫', levelRequired:6 },
  { id:'theme_velours',    name:'Thème Cappuccino Velours',  desc:'Crème mousseuse douce',       cost:1500, type:'Thème', emoji:'🤎', levelRequired:9 },
  { id:'theme_cuir',       name:'Thème Cuir & Espresso',     desc:'Sombre cuir + accents or',    cost:1800, type:'Thème', emoji:'🛋️', levelRequired:11 },
  { id:'theme_elixir',     name:'Thème Élixir Doré',         desc:'Or liquide en fusion',        cost:1500, type:'Thème', emoji:'🧪', levelRequired:12 },
  { id:'theme_renaissance', name:'Thème Renaissance',         desc:'Flammes de phénix orangées',  cost:2500, type:'Thème', emoji:'🔥', levelRequired:14 },
  /* Thèmes niveaux 17-23 (extension endgame). */
  { id:'theme_visionnaire', name:'Thème Visionnaire',         desc:'Aube céleste pâle apaisante', cost:3000, type:'Thème', emoji:'🌄', levelRequired:17 },
  { id:'theme_demiurge',    name:'Thème Démiurge',            desc:'Or massif + violet créateur', cost:5000, type:'Thème', emoji:'⚜️', levelRequired:23 },
  /* Thèmes ÉDITION LIMITÉE (PHASE 6E) — débloqués via événements
     spéciaux uniquement. cost:0, flag `limited:true` + `event:<id>`.
     La boutique les masque tant qu'ils ne sont pas dans `unlocked` ;
     une fois débloqués, ils apparaissent avec un badge "Édition limitée"
     et sont déjà marqués comme possédés. */
  { id:'theme_or_limite', name:'Thème Or Massif Limité', desc:'Édition limitée — Tour Spécial Roue', cost:0, type:'Thème', emoji:'🥇', levelRequired:4, limited:true, event:'event_jackpot'     },
  { id:'theme_trader',    name:'Thème Trader Avisé',     desc:'Édition limitée — Marché en Folie',   cost:0, type:'Thème', emoji:'📈', levelRequired:4, limited:true, event:'event_market_pro'  },
  /* Édition limitée — uniquement via le code promo BLACK. Pas d'event,
     pas de boutique. `promo` mémorise la source pour info (utilisé par
     getBadgeOrigin si un jour on étend l'idée aux thèmes). */
  { id:'theme_noir',      name:'Thème Noir & Blanc',     desc:'Édition limitée — Code promo BLACK', cost:0, type:'Thème', emoji:'⚫', levelRequired:1, limited:true, promo:'BLACK'             },
  /* Édition limitée — drop rare via le barista légendaire dans
     Devine la commande (0.5% par partie). Code BARISTA05 affiché en bulle. */
  { id:'theme_grains',    name:'Thème Cookie & Espresso', desc:'Édition limitée — Drop rare barista légendaire', cost:0, type:'Thème', emoji:'☕', levelRequired:1, limited:true, promo:'BARISTA05' },
  /* Édition limitée — Code promo PINK. Skin rose poudré inspiré du
     thème Cappuccino Velours. Pas en boutique : uniquement via code. */
  { id:'skin_pink',       name:'Cookie Rose',             desc:'Édition limitée — Code promo PINK',          cost:0, type:'Skin',  emoji:'🌸', levelRequired:1, limited:true, promo:'PINK' },
  /* Édition limitée — Code promo GRAIN16. Avatar fève de café légendaire
     (or massif + halo). Pas en boutique : uniquement via code. */
  { id:'avatar_grain_legende', name:'Grain Légendaire',   desc:'Édition limitée — Code promo GRAIN16',       cost:0, type:'Avatar', emoji:'☕', levelRequired:1, limited:true, promo:'GRAIN16' },

  /* 7 badges événements (ajoutés 09/05/2026) — défis modérés */
  { id:'badge_tireur',     name:'Badge Tireur',     desc:'Édition limitée — Stop parfait',         cost:0, type:'Badge', emoji:'🎯', levelRequired:4, limited:true, event:'event_pour_perfect' },
  { id:'badge_cerveau',    name:'Badge Cerveau',    desc:'Édition limitée — Quiz parfait',         cost:0, type:'Badge', emoji:'🧠', levelRequired:4, limited:true, event:'event_quiz_perfect' },
  { id:'badge_erudit',     name:'Badge Érudit',     desc:'Édition limitée — Devine parfait',       cost:0, type:'Badge', emoji:'📚', levelRequired:4, limited:true, event:'event_guess_perfect' },
  { id:'badge_sprinter',   name:'Badge Sprinter',   desc:'Édition limitée — 60 clics ou plus',     cost:0, type:'Badge', emoji:'⚡', levelRequired:4, limited:true, event:'event_click_sprint' },
  { id:'badge_architecte', name:'Badge Architecte', desc:'Édition limitée — 15 étages empilés',    cost:0, type:'Badge', emoji:'🏗️', levelRequired:4, limited:true, event:'event_pyramid_15' },
  { id:'badge_tirelire',   name:'Badge Tirelire',   desc:'Édition limitée — Triple Slot',          cost:0, type:'Badge', emoji:'💰', levelRequired:4, limited:true, event:'event_slot_three' },
  { id:'badge_aigle',      name:'Badge Aigle',      desc:'Édition limitée — Réflexes 20+',         cost:0, type:'Badge', emoji:'🦅', levelRequired:4, limited:true, event:'event_reflex_pro' },
  // AVATARS premium (8 — PHASE 4)
  { id:'avatar_chef',    name:'Avatar Chef étoilé',     desc:'Toque, moustache et étoile',     cost:200,  type:'Avatar', emoji:'👨‍🍳', levelRequired:2 },
  { id:'avatar_robot',   name:'Avatar Robot Barista',   desc:'Robot mignon avec engrenages',   cost:300,  type:'Avatar', emoji:'🤖',   levelRequired:3 },
  { id:'avatar_chat',    name:'Avatar Chat Café',       desc:'Chat caramel dans une tasse',    cost:400,  type:'Avatar', emoji:'🐱',   levelRequired:3 },
  { id:'avatar_renard',  name:'Avatar Renard',          desc:'Renard avec moustaches',         cost:500,  type:'Avatar', emoji:'🦊',   levelRequired:4 },
  { id:'avatar_panda',   name:'Avatar Panda Café',      desc:'Panda avec petite tasse',        cost:600,  type:'Avatar', emoji:'🐼',   levelRequired:4 },
  { id:'avatar_loup',    name:'Avatar Loup Mocha',      desc:'Loup au regard intense, fourrure mocha', cost:800,  type:'Avatar', emoji:'🐺',   levelRequired:5 },
  { id:'avatar_or',      name:'Avatar Or Massif',       desc:'Visage doré scintillant',        cost:1500, type:'Avatar', emoji:'✨',   levelRequired:6 },
  { id:'avatar_legende', name:'Avatar Légende',         desc:'Couronne + cookie magique',      cost:2500, type:'Avatar', emoji:'👑',   levelRequired:6 },
  { id:'avatar_sage',    name:'Avatar Sage du Café',    desc:'Vieil homme barbu et serein',    cost:800,  type:'Avatar', emoji:'🧙',   levelRequired:8 },
  { id:'avatar_eternel', name:'Avatar Éternel',         desc:'Halo infini scintillant',        cost:4500, type:'Avatar', emoji:'♾️',   levelRequired:10 },
  // MUSIQUES (BRIEF_AUDIO) — débloquent les musiques d'ambiance ; mapping
  // id:'music_<key>' → MUSICS.<key> côté src/lib/audio.js
  // Catalogue 5 nouvelles + 2 existantes en 🍪 (assets Pixabay CC0 mai 2026).
  { id:'music_matin',    name:'Café du Matin',       desc:'Jazz café du petit matin',  cost:100,  type:'Musique', emoji:'🌅', levelRequired:1 },
  { id:'music_bossa',    name:'Musique Bossa Nova',  desc:'Soleil brésilien',          cost:500,  type:'Musique', emoji:'🇧🇷', levelRequired:5 },
  { id:'music_royale',   name:'Symphonie Royale',    desc:'Musique classique baroque', cost:600,  type:'Musique', emoji:'💎', levelRequired:5 },
  { id:'music_velvet',   name:'Velvet Smoke',        desc:'Slow jazz velouté & fumé',  cost:700,  type:'Musique', emoji:'🍷', levelRequired:9 },
  { id:'music_empereur', name:"Beat de l'Empereur",  desc:'Drill puissant et urbain',  cost:800,  type:'Musique', emoji:'👑', levelRequired:11 },
  { id:'music_veillee',  name:'Veillée Lofi',        desc:'Lofi cinématique posé',     cost:900,  type:'Musique', emoji:'🌙', levelRequired:14 },
  { id:'music_cosmique', name:'Nuit Cosmique',       desc:'Lofi nocturne stellaire',   cost:1000, type:'Musique', emoji:'🌠', levelRequired:15 },

  // SKINS COOKIE — change l'apparence du cookie central tappable
  // id:'skin_<key>' → COOKIE_SKINS.<key> côté src/data/themes.js
  { id:'skin_caramel',  name:'Cookie Caramel',  desc:'Pâte ambrée chaude',          cost:250,  type:'Skin', emoji:'🍯', levelRequired:2 },
  { id:'skin_noisette', name:'Cookie Noisette', desc:'Brun roux noisette',          cost:450,  type:'Skin', emoji:'🌰', levelRequired:4 },
  { id:'skin_onyx',     name:'Cookie Onyx',     desc:'Cacao noir + pépites or',     cost:900,  type:'Skin', emoji:'🖤', levelRequired:8 },
  { id:'skin_emeraude', name:'Cookie Émeraude', desc:'Halo doré chaud',             cost:1100, type:'Skin', emoji:'💚', levelRequired:9 },
  { id:'skin_dore',     name:'Cookie Doré',     desc:'Or massif scintillant',       cost:1800, type:'Skin', emoji:'✨', levelRequired:10 },
  { id:'skin_cuir',     name:'Cookie Cuir',     desc:'Tabac sombre + or',           cost:1600, type:'Skin', emoji:'🛋️', levelRequired:11 },
  { id:'skin_mythique', name:'Cookie Mythique', desc:'Glaçage + halo mythique',     cost:2500, type:'Skin', emoji:'🌟', levelRequired:13 },
  { id:'skin_phoenix',  name:'Cookie Phoenix',  desc:'Flammes ambrées vives',       cost:2700, type:'Skin', emoji:'🔥', levelRequired:14 },
  { id:'skin_originel', name:'Cookie Originel', desc:'Or cosmique + violet',        cost:3500, type:'Skin', emoji:'🪐', levelRequired:15 },
  /* Skins niveaux 20 et 25 (extension endgame). */
  { id:'skin_oracle',   name:'Cookie Oracle',   desc:'Multicolore mystique iridescent', cost:4500, type:'Skin', emoji:'🔮', levelRequired:20 },
  { id:'skin_origine',  name:'Cookie Origine',  desc:'Primordial · or-violet-cyan',     cost:8000, type:'Skin', emoji:'⚛️', levelRequired:25 },

  // TITRES COULEUR — effet shimmer sur le pseudo (cf. src/data/titles.js)
  // Sélectionnable depuis Profil. Priorité après Créateur et Légende Vivante.
  { id:'title_mousse',   name:'Titre Mousse',   desc:'Reflet crème mousseuse',  cost:350,  type:'Titre', emoji:'☁️', levelRequired:3 },
  { id:'title_caramel',  name:'Titre Caramel',  desc:'Shimmer caramel ambré',   cost:800,  type:'Titre', emoji:'🍯', levelRequired:7 },
  { id:'title_cuivre',   name:'Titre Cuivre',   desc:'Reflet cuivre métallique',cost:1000, type:'Titre', emoji:'🧱', levelRequired:8 },
  { id:'title_velours',  name:'Titre Velours',  desc:'Texture café veloutée',   cost:1200, type:'Titre', emoji:'🤎', levelRequired:9 },
  { id:'title_or',       name:'Titre Or',       desc:'Brillance or massif',     cost:2000, type:'Titre', emoji:'👑', levelRequired:10 },
  { id:'title_elixir',   name:'Titre Élixir',   desc:'Éclat or liquide',        cost:1700, type:'Titre', emoji:'🧪', levelRequired:12 },
  { id:'title_saveur',   name:'Titre Saveur',   desc:'Dégradé café-épices',     cost:2200, type:'Titre', emoji:'🌶️', levelRequired:13 },
  { id:'title_phenix',   name:'Titre Phénix',   desc:'Flammes ardentes',        cost:2400, type:'Titre', emoji:'🔥', levelRequired:14 },
  { id:'title_cosmique', name:'Titre Cosmique', desc:'Lueur stellaire violette',cost:3500, type:'Titre', emoji:'💜', levelRequired:15 },
  /* Titres niveaux 17-24 (extension endgame). */
  { id:'title_visionnaire',     name:'Titre Visionnaire',     desc:'Aube céleste pâle',          cost:2000, type:'Titre', emoji:'🌄', levelRequired:17 },
  { id:'title_mystique',        name:'Titre Mystique',        desc:'Violet vacillant mystérieux', cost:2800, type:'Titre', emoji:'🔮', levelRequired:19 },
  { id:'title_souverain',       name:'Titre Souverain',       desc:'Or massif royal',             cost:3500, type:'Titre', emoji:'👑', levelRequired:21 },
  { id:'title_cosmique_vivant', name:'Titre Cosmique Vivant', desc:'Étoile multi-couleur ultime', cost:5500, type:'Titre', emoji:'🌌', levelRequired:24 },

  // PACKS $CKM — crédite N actions instantanément (via creditFreeShares).
  // ONE-SHOT (fix mai 2026 anti-exploit) : ajoutés à `unlocked` après
  // achat, disparaissent de la boutique. Avant le fix, c'était consommable
  // et un joueur pouvait grinder cookies + acheter en boucle jusqu'au cap.
  { id:'pack_shares_5',  applyAs:'pack_shares', sharesAmount:5,  name:'Pack 5 actions $CKM',  desc:'+5 actions sur ton portefeuille',  cost:450, type:'Pack', emoji:'📈', levelRequired:7 },
  { id:'pack_shares_10', applyAs:'pack_shares', sharesAmount:10, name:'Pack 10 actions $CKM', desc:'+10 actions sur ton portefeuille', cost:850, type:'Pack', emoji:'📊', levelRequired:12 },

  /* Coffres / Boîtes — items one-shot avec animation cinéma à l'ouverture.
     Préfixe `box_` ou `chest_` selon le tier (boîte basique → coffre rare).
     boxReward.cafes : nombre de ☕ offerts à l'ouverture (récompense fixe
     côté boîte basique ; les futurs coffres premium pourront avoir loot
     aléatoire). Marqué one-shot (ajout à `unlocked`) — pas rachetable. */
  { id:'box_starter', applyAs:'open_box', boxReward:{ cafes:3 }, name:'Boîte Mystère', desc:'Ouvre-la pour découvrir une surprise café !', cost:1000, type:'Coffre', emoji:'📦', levelRequired:5, inPremium:true },

  /* Coffres premium (data/chests.js) — 3 tiers, rachetables à volonté
     (JAMAIS ajoutés à `unlocked`, pas de flag `consumable` nécessaire
     puisqu'aucun handler ne les y met).
     Chaque ouverture tire 3 items via rollChest() — ressources (🍪/☕) +
     cosmétiques pondérés par rareté, filtre amont sur items déjà possédés. */
  { id:'chest_bronze',    currency:'cafe', applyAs:'open_chest', chestTier:'bronze',    name:'Coffre Bronze',     desc:'3 cosmétiques à découvrir',         cost:5,  type:'Coffre', emoji:'📦', levelRequired:3, inPremium:true },
  { id:'chest_gold',      currency:'cafe', applyAs:'open_chest', chestTier:'gold',      name:"Coffre d'Or",       desc:'3 cosmétiques rares à découvrir',   cost:15, type:'Coffre', emoji:'🎁', levelRequired:5, inPremium:true },
  { id:'chest_legendary', currency:'cafe', applyAs:'open_chest', chestTier:'legendary', name:'Coffre Légendaire', desc:'3 cosmétiques épiques à découvrir', cost:40, type:'Coffre', emoji:'💎', levelRequired:8, inPremium:true },

  // SINKS PREMIUM ULTRA — items chers pour justifier le bundle 200 ☕ Stripe (mai 2026)
  /* Avatar Cosmonaute Caféiné — collectionneur whale (15 ☕). One-shot,
     ajouté à unlocked. Géré par la branche items normaux (currency=cafe). */
  { id:'avatar_cosmonaute', currency:'cafe', applyAs:'avatar', name:'Avatar Cosmonaute Caféiné', desc:'Casque doré, visière mocha, halo cosmique', cost:15, type:'Avatar', emoji:'🧑‍🚀', levelRequired:5 },
  /* Skin Cookie Galactique — collectionneur whale (15 ☕). Skin avec
     particules cosmiques (palette violet/or). One-shot. */
  { id:'skin_galactique', currency:'cafe', applyAs:'skin', name:'Skin Cookie Galactique', desc:'Halo violet stellaire + chips dorées', cost:7, type:'Skin', emoji:'🔮', levelRequired:5 },
  /* Packs $CKM cafés / packs cookies / Coup de Grâce supprimés (mai 2026)
     pour rendre le jeu moins pay-to-win en vue de la validation Play Store.
     Ils sont retirés du catalogue mais les ID restent référencés dans le
     code pour compatibilité avec les comptes qui les auraient déjà achetés
     (apparaissent dans Profil/Settings comme items débloqués historiques).
     - pack_shares_25 / _50 / _100  : packs actions volumes (pay-to-market)
     - pack_cookies_5k / _10k       : bypass de grind cookies
     - unlock_all_shop              : LE pay-to-win extrême (200 ☕) */

  // PREMIUM — Collection Cosmos (payés en cafés ☕)
  /* Jetons VIP roue/slot supprimés (mai 2026) — remplacés par un bouton
     "Recharger 2 ☕" directement dans le jeu quand le quota est épuisé.
     Plus besoin de transiter par la boutique premium. Les IDs
     spin_pass_50/20 et slot_pass_50 ne sont plus référencés. */

  { id:'theme_cosmos',   currency:'cafe', applyAs:'theme',       name:'Thème Cosmos',          desc:'Fond galactique exclusif',     cost:5,  type:'Premium', emoji:'🌌', levelRequired:1 },
  { id:'banner_cookies', currency:'cafe', applyAs:'banner',      name:'Bannière Cookies',      desc:'Décor 🍪 sur ta carte niveau', cost:3,  type:'Premium', emoji:'🍪', levelRequired:1 },
  { id:'music_lofi',     currency:'cafe', applyAs:'music',       name:'Musique Lofi Hip-Hop', desc:'Ambiance étudiant chill',      cost:3,  type:'Premium', emoji:'🎵', levelRequired:1 },
  /* Pack 1 action premium — ONE-SHOT (ajouté à unlocked après achat).
     Option "petit volume cher" en café pour les joueurs qui veulent juste
     1 action sans grinder. Cohérent avec pack_shares_5/10 cookies one-shot. */
  { id:'pack_share_premium', currency:'cafe', applyAs:'pack_shares', sharesAmount:1, name:'1 Action $CKM', desc:'+1 action sur ton portefeuille', cost:1, type:'Premium', emoji:'📈', levelRequired:3 },

  /* Boosters consommables (sinks récurrents pour pousser à dépenser ☕).
     Tous CONSUMABLES : pas d'ajout à `unlocked`, rachetables à volonté.
     Cf. unlockReward dans App.jsx pour les effets. */
  { id:'quiz_skip',          currency:'cafe', applyAs:'quiz_skip',          name:'Skip Quiz',           desc:'Réinitialise instantanément le cooldown du quiz', cost:2, type:'Premium', emoji:'⏭️',  levelRequired:1 },
  { id:'next_game_doubler',  currency:'cafe', applyAs:'next_game_doubler',  name:'Double prochain gain',desc:'Le prochain gain 🍪 d\'un mini-jeu est doublé',    cost:1, type:'Premium', emoji:'🎯',  levelRequired:1 },
  { id:'boost_x2_1h',        currency:'cafe', applyAs:'boost_x2_1h',        name:'Boost +30 % (1 h)',   desc:'Gains 🍪 augmentés de 30 % pendant 1 heure',         cost:5, type:'Premium', emoji:'⚡',  levelRequired:3 },

  /* Nouveaux sinks premium (11/05/2026) — gamme moyenne 5-15 ☕. */
  { id:'boost_x2_24h',       currency:'cafe', applyAs:'boost_x2_24h',       name:'Boost +30 % (24 h)',  desc:'Gains 🍪 augmentés de 30 % pendant 24 heures',       cost:10, type:'Premium', emoji:'🔥',  levelRequired:3 },
  { id:'free_recharges_24h', currency:'cafe', applyAs:'free_recharges_24h', name:'Recharges Gratuites (24 h)', desc:'Roue, Slot et Pile rechargent sans coût ☕ pendant 24 h', cost:8, type:'Premium', emoji:'🔓',  levelRequired:3 },
  { id:'streak_save',        currency:'cafe', applyAs:'streak_save',        name:'Streak Save',         desc:'Sauve ta série de check-ins si tu rates 1 jour',     cost:4, type:'Premium', emoji:'🛡️', levelRequired:2 },
  { id:'theme_forge',        currency:'cafe', applyAs:'theme',              name:'Thème Forge Caféinée',desc:'Palette volcanique sombre · bordeaux brûlé + or saturé', cost:12, type:'Premium', emoji:'🌋', levelRequired:3 },
  { id:'bulk_trade_pass',    currency:'cafe', applyAs:'bulk_trade_pass',    name:'Trade Express $CKM',  desc:'1 charge : achète ou vends tout ton portefeuille d\'un seul coup, sans limite de quantité',          cost:3, type:'Premium', emoji:'📦', levelRequired:3 },

  /* ─── BOUTIQUE ACTIONS (17/05/2026) ─────────────────────────────
     Cosmétiques EXCLUSIFs payés en actions $CKM (`currency:'shares'`,
     flag `inActionsShop:true`). Accessibles uniquement via la sous-vue
     dédiée quand le solde d'actions ≥ 500 ; 1 achat par cycle puis il
     faut regagner 500 actions (cf. ActionsShopView). Exclus de la
     boutique 🍪 et Premium ☕ (filtres `inActionsShop`). Titres : l'id
     DOIT matcher une clé TITLE_STYLES (titles.js). One-shot (unlocked).
     Coûts 120-500 actions. */
  { id:'as_badge_diamond', inActionsShop:true, currency:'shares', name:'Mains de Diamant',  desc:'Tu ne vends jamais dans la panique',         cost:300, type:'Badge',  emoji:'💎', levelRequired:3 },
  { id:'as_badge_whale',   inActionsShop:true, currency:'shares', name:'Baleine du Marché', desc:'Tes ordres font bouger le $CKM',             cost:500, type:'Badge',  emoji:'🐋', levelRequired:3 },
  { id:'as_theme_parquet', inActionsShop:true, currency:'shares', applyAs:'theme',  name:'Thème Parquet',     desc:'Salle des marchés — espresso & or',  cost:250, type:'Thème',  emoji:'📊', levelRequired:3 },
  { id:'as_theme_lingot',  inActionsShop:true, currency:'shares', applyAs:'theme',  name:'Thème Lingot d\'Or', desc:'Or massif luxe — le thème des magnats', cost:450, type:'Thème',  emoji:'🥇', levelRequired:3 },
  { id:'as_avatar_wolf',   inActionsShop:true, currency:'shares', applyAs:'avatar', name:'Loup du Marché',    desc:'Le prédateur de la corbeille $CKM',  cost:300, type:'Avatar', emoji:'🐺', levelRequired:3 },
  { id:'as_avatar_gold',   inActionsShop:true, currency:'shares', applyAs:'avatar', name:'Trader Doré',       desc:'Auréolé d\'or — réservé aux investisseurs', cost:400, type:'Avatar', emoji:'🪙', levelRequired:3 },
  { id:'as_cafe_pouch',    inActionsShop:true, currency:'shares', applyAs:'as_cafe', cafeReward:4, name:'Sachet de Cafés', desc:'Échange tes actions contre 4 ☕',  cost:400, type:'Café',   emoji:'☕', levelRequired:3 },
];

/* Achievements (succès surprises) */
export const ACHIEVEMENTS = [
  { id:'first_cookie',   name:'Premier Cookie !',   desc:'Tu as gagné ton premier cookie',           emoji:'🌱', bonus:5   },
  { id:'first_purchase', name:'Premier Achat !',    desc:'Tu as débloqué ton premier item boutique', emoji:'🛍️', bonus:10  },
  { id:'streak_3',       name:'En Route !',         desc:'3 jours de check-in consécutifs',          emoji:'🔥', bonus:15  },
  { id:'streak_7',       name:'En Feu !',           desc:'7 jours de check-in consécutifs',          emoji:'💥', bonus:30,  cafesBonus:1 },
  { id:'jackpot',        name:'Gros Lot !',         desc:'Tu as touché +200 à la roue',              emoji:'🎰', bonus:50,  cafesBonus:1 },
  { id:'level_3',        name:'En Progression !',   desc:'Tu as atteint le niveau 3',                emoji:'⭐', bonus:25  },
  { id:'level_6',        name:'Légende !',          desc:'Tu as atteint le niveau 6 — Légende',      emoji:'👑', bonus:100, cafesBonus:1 },
  { id:'level_10',       name:'Éternel !',          desc:'Tu as atteint le niveau 10 — Éternel',     emoji:'♾️', bonus:200, cafesBonus:2 },
  { id:'level_15',       name:'Cookie Originel !',  desc:'Tu as atteint le niveau maximum',          emoji:'🌌', bonus:500, cafesBonus:3 },
  { id:'trader',         name:'Trader !',           desc:'Tu as investi 500 cookies en $CKM',        emoji:'💹', bonus:40  },
  /* Apex final : niveau 15 atteint + tous les autres succès visibles débloqués. */
  { id:'end_game',       name:'Légende Vivante !',  desc:'Niveau max + tous les autres succès',      emoji:'🏆', bonus:1000, cafesBonus:12 },
];

/* Pool Quiz du jour — questions sur CookiMiner et le thème café/cookie.
   93 questions (30 Facile · 29 Moyen · 34 Expert) tirées 3 par session
   (cf QUIZ_QUESTIONS_PER_SESSION). Mix ~50 % mécaniques de l'app,
   ~50 % culture café/pâtisserie.
   3 niveaux : Facile (20 🍪), Moyen (35 🍪), Expert (60 🍪). */
export const QUESTIONS = [
  // FACILE (reward: 20)
  { q:"Quel pays est l'origine historique du café ?", choices:["Italie","Éthiopie","Brésil","Yémen"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quelle plante produit les grains de café ?", choices:["Théier","Caféier","Cacaoyer","Olivier"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Combien de niveaux a CookiMiner ?", choices:["10","12","15","20"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Quel est le titre du niveau 1 dans CookiMiner ?", choices:["Apprenti","Barista","Maître","Légende"], answer:1, reward:20, difficulty:'Facile' },
  { q:"De quelle couleur est un grain de café AVANT torréfaction ?", choices:["Brun","Noir","Vert","Jaune"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Comment se nomme la mousse dorée à la surface d'un espresso ?", choices:["Mousse","Crema","Schiuma","Latte"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quel pays est le 1er producteur mondial de café ?", choices:["Colombie","Brésil","Vietnam","Éthiopie"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Combien de questions tirées par session au Quiz du jour ?", choices:["1","3","5","10"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quel mini-jeu fait deviner les commandes des clients ?", choices:["Quiz","Devine la commande","Memory Café","Réflexes"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quelle est la monnaie premium dans CookiMiner ?", choices:["Cookies","Cafés","Diamants","Étoiles"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quel emoji représente la monnaie principale CookiMiner ?", choices:["🍰","🥐","🍪","☕"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Quel ingrédient principal du chocolat chaud ?", choices:["Caféine","Cacao","Cannelle","Curcuma"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Comment se nomme le métier de celui qui prépare le café ?", choices:["Sommelier","Pâtissier","Barista","Maître d'hôtel"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Quel pays est mondialement célèbre pour ses cafés italiens ?", choices:["Espagne","Italie","Grèce","Portugal"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quelle boisson chaude a un fort goût amer et concentré ?", choices:["Latte","Espresso","Chocolat chaud","Thé vert"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Toutes les combien d'heures le Quiz du jour redevient disponible ?", choices:["1 h","3 h","5 h","24 h"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Quel mini-jeu fait tourner une grande roue dans CookiMiner ?", choices:["Roue de la chance","Machine à sous","Quiz","Memory"], answer:0, reward:20, difficulty:'Facile' },
  { q:"Quel ingrédient incontournable pour un cookie maison ?", choices:["Levure","Beurre","Curry","Sirop d'agave"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quel emoji représente une tasse de café fumante ?", choices:["🍵","🍫","☕","🥤"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Le café se boit le plus souvent à quel moment de la journée ?", choices:["Au coucher","Le matin","À 22 h","Avant un sport intense"], answer:1, reward:20, difficulty:'Facile' },

  // MOYEN (reward: 35)
  { q:"Combien de variétés principales de café cultivées commercialement ?", choices:["1","2","3","5"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quel mini-jeu est débloqué au niveau 8 ?", choices:["Memory","Pile de Tasses","Machine à Sous","Réflexes"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Comment se nomme le succès final apex de CookiMiner ?", choices:["Maître Café","Légende Vivante","Empereur","Cookie Roi"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quelle ville est le berceau de la chaîne Starbucks ?", choices:["Seattle","New York","San Francisco","Chicago"], answer:0, reward:35, difficulty:'Moyen' },
  { q:"Quelle variété de café contient le plus de caféine ?", choices:["Arabica","Robusta","Liberica","Excelsa"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quel pays a inventé le cappuccino ?", choices:["France","Italie","Autriche","Suisse"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Combien de récompenses événements pour décrocher Légende Vivante ?", choices:["5","7","10","15"], answer:2, reward:35, difficulty:'Moyen' },
  { q:"À quel niveau débloque la Machine à Sous dans CookiMiner ?", choices:["10","12","13","15"], answer:2, reward:35, difficulty:'Moyen' },
  { q:"Quel pays est considéré comme le berceau du moka ?", choices:["Brésil","Colombie","Yémen","Éthiopie"], answer:2, reward:35, difficulty:'Moyen' },
  { q:"Quel mini-jeu est débloqué dès le niveau 1 ?", choices:["Pile de Tasses","Stop le café","Devine la commande","Machine à Sous"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quel ticker représente l'action de CookiMiner sur le marché ?", choices:["$CKM","$CKO","$CKC","$CMK"], answer:0, reward:35, difficulty:'Moyen' },
  { q:"Quel cookie classique américain a été inventé par Ruth Wakefield en 1938 ?", choices:["Cookie nature","Cookie aux pépites de chocolat","Brownie","Sablé"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Comment appelle-t-on un espresso allongé à l'eau chaude ?", choices:["Macchiato","Americano","Cortado","Lungo Royal"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"À quel niveau s'ouvre le marché $CKM dans CookiMiner ?", choices:["1","3","5","10"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Comment appelle-t-on l'infusion à froid du café (méthode longue) ?", choices:["Iced coffee","Cold brew","Frappé","Affogato"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quel breuvage italien combine espresso et chocolat ?", choices:["Cappuccino","Affogato","Mocaccino","Bicerin"], answer:2, reward:35, difficulty:'Moyen' },
  { q:"Quel terme désigne un café provenant d'une seule origine géographique ?", choices:["Blend","Single Origin","Mélange","Tradition"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"À quoi sert le « marc » du café après extraction ?", choices:["Engrais ou exfoliant","Pâte à tartiner","Sucre brut","Conservateur"], answer:0, reward:35, difficulty:'Moyen' },
  { q:"Quelle méthode douce verse l'eau goutte à goutte sur le café moulu ?", choices:["Espresso","Pour-over (V60)","Mokapot","Frappé"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quel cookie célèbre est fourré de crème blanche entre deux biscuits chocolat ?", choices:["Macaron","Oreo","Sablé breton","Stroopwafel"], answer:1, reward:35, difficulty:'Moyen' },

  // EXPERT (reward: 60)
  { q:"Quelle légende attribue la découverte du café à un berger ?", choices:["Pythagore","Kaldi","Marco Polo","Saladin"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quel ordre religieux a inspiré le nom 'cappuccino' ?", choices:["Bénédictins","Franciscains","Capucins","Jésuites"], answer:2, reward:60, difficulty:'Expert' },
  { q:"Quel pays a la plus haute consommation de café par habitant ?", choices:["Italie","Finlande","Brésil","France"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Combien de spins de roue maximum par jour dès le niveau 10 ?", choices:["10","20","30","50"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quel niveau CookiMiner s'appelle 'Phoenix du Café' ?", choices:["12","13","14","15"], answer:2, reward:60, difficulty:'Expert' },
  { q:"Quelle variété de café est la plus résistante aux maladies ?", choices:["Arabica","Robusta","Liberica","Geisha"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quel pourcentage approximatif de la production mondiale est de l'Arabica ?", choices:["30%","60%","80%","95%"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Combien de tours bonus donne le Jeton VIP +50 dans CookiMiner ?", choices:["20","30","50","100"], answer:2, reward:60, difficulty:'Expert' },
  { q:"Qui est le créateur de l'application CookiMiner ?", choices:["Cookithan","BaristaDev","CookieMaker","GrindMaster"], answer:0, reward:60, difficulty:'Expert' },
  { q:"Quelle est la température idéale d'extraction d'un espresso ?", choices:["60-70 °C","75-85 °C","90-96 °C","100-105 °C"], answer:2, reward:60, difficulty:'Expert' },
  { q:"Quel pays produit le célèbre café « Geisha » réputé pour ses arômes floraux ?", choices:["Éthiopie","Kenya","Panama","Costa Rica"], answer:2, reward:60, difficulty:'Expert' },
  { q:"Au-delà de quel pourcentage de variation en 5 min le circuit breaker du marché $CKM se déclenche-t-il ?", choices:["5 %","10 %","15 %","25 %"], answer:2, reward:60, difficulty:'Expert' },
  { q:"Combien d'actions $CKM existent en tout dans CookiMiner après la refonte du marché ?", choices:["1 000","5 000","10 000","100 000"], answer:2, reward:60, difficulty:'Expert' },
  { q:"Au bout de combien de temps de hold le bonus PnL atteint son maximum sur le marché ?", choices:["1 h","24 h","3 jours","7 jours"], answer:3, reward:60, difficulty:'Expert' },
  { q:"Quelle est la limite d'actions $CKM détenues par compte ?", choices:["100","250","500","1 000"], answer:2, reward:60, difficulty:'Expert' },
  { q:"À combien de bars de pression une machine espresso doit-elle extraire idéalement ?", choices:["3 bars","6 bars","9 bars","15 bars"], answer:2, reward:60, difficulty:'Expert' },
  { q:"Quel pays est le 2e plus grand producteur mondial de café ?", choices:["Colombie","Vietnam","Indonésie","Honduras"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quelle invention italienne de 1933 a démocratisé le café à domicile ?", choices:["Cafetière Moka (Bialetti)","Cafetière à piston","Machine espresso","Cafetière à filtre"], answer:0, reward:60, difficulty:'Expert' },
  { q:"Quel est le café le plus cher au monde, issu de fèves digérées par une civette ?", choices:["Black Ivory","Geisha Panama","Kopi Luwak","Jamaica Blue Mountain"], answer:2, reward:60, difficulty:'Expert' },
  { q:"De quelle région éthiopienne provient le célèbre café Yirgacheffe ?", choices:["Sidamo","Yirgacheffe (Gedeo)","Harar","Limu"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Combien d'actions $CKM maximum peut-on échanger en UNE seule transaction ?", choices:["15","30","50","Pas de limite"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quel bonus permanent gagne chaque niveau de Prestige dans CookiMiner ?", choices:["+5 % sur tous les gains","+10 % sur tous les gains","+25 % XP","+1 ☕ / jour"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Combien d'XP faut-il pour atteindre le niveau 16 « Ascendant Caféiné » ?", choices:["10 000","15 000","20 000","30 000"], answer:2, reward:60, difficulty:'Expert' },
  { q:"Quelle ville italienne, port franc historique, est surnommée la capitale du café ?", choices:["Naples","Trieste","Milan","Turin"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quelle altitude minimum définit un café « Strictly High Grown » ?", choices:["500 m","1 000 m","1 500 m","2 500 m"], answer:2, reward:60, difficulty:'Expert' },

  /* ─── +30 questions ajoutées 13/05/2026 (10 Facile · 10 Moyen · 10 Expert) ─── */
  // FACILE
  { q:"Quel arbre produit le cacao ?", choices:["Cocotier","Cacaoyer","Caféier","Vanillier"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quelle est la couleur d'un grain de café APRÈS torréfaction ?", choices:["Vert","Jaune","Brun foncé","Rouge"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Comment dit-on « café » en italien ?", choices:["Café","Caffè","Kafe","Kaffe"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quel emoji représente un donut ?", choices:["🍩","🥯","🧁","🍰"], answer:0, reward:20, difficulty:'Facile' },
  { q:"Le matcha provient de quelle plante ?", choices:["Café","Thé","Cacao","Menthe"], answer:1, reward:20, difficulty:'Facile' },
  { q:"De quel pays vient le croissant moderne ?", choices:["Italie","France","Autriche","Espagne"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quel ingrédient fait gonfler un cookie au four ?", choices:["Levure chimique","Sel","Cacao","Eau"], answer:0, reward:20, difficulty:'Facile' },
  { q:"Quel cookie classique a des pépites de chocolat ?", choices:["Chip cookie","Snickerdoodle","Macaron","Sablé"], answer:0, reward:20, difficulty:'Facile' },
  { q:"Comment s'appelle un croissant fourré au chocolat ?", choices:["Brioche","Pain au chocolat","Chausson","Mille-feuille"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quelle saveur caractérise le caramel beurre salé ?", choices:["Acide","Amère","Sucré-salé","Épicé"], answer:2, reward:20, difficulty:'Facile' },

  // MOYEN
  { q:"Quel ingrédient typique parfume le chai latte indien ?", choices:["Vanille","Cardamome","Cacao","Anis étoilé"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quel café est popularisé par l'Australie : espresso + lait micro-moussé ?", choices:["Cortado","Flat White","Latte","Macchiato"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quelle texture caractérise un sablé breton ?", choices:["Friable","Élastique","Aérée","Filandreuse"], answer:0, reward:35, difficulty:'Moyen' },
  { q:"Quel pays a inventé le tiramisu ?", choices:["Italie","France","Espagne","Grèce"], answer:0, reward:35, difficulty:'Moyen' },
  { q:"Quel dessert français porte le nom d'une course cycliste ?", choices:["Paris-Brest","Tour de France","Grenoble","Bordeaux"], answer:0, reward:35, difficulty:'Moyen' },
  { q:"Quel grain est généralement mélangé avec l'Arabica pour ajouter du corps ?", choices:["Liberica","Robusta","Geisha","Catimor"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quelle pâtisserie autrichienne contient pommes et pâte filo ?", choices:["Strudel","Sachertorte","Linzer","Krapfen"], answer:0, reward:35, difficulty:'Moyen' },
  { q:"Quel mini-jeu permet de gagner des cafés ☕ avec des tuyaux espresso ?", choices:["Cookie Click","Flappy Cookies","Roue","Quiz"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quelle pâtisserie portugaise est caramélisée au four à la crème ?", choices:["Pastel de nata","Bolo do caco","Bola","Queijada"], answer:0, reward:35, difficulty:'Moyen' },

  // EXPERT
  { q:"Quel pays produit le café Blue Mountain renommé ?", choices:["Cuba","Jamaïque","Haïti","Costa Rica"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quel rapport approximatif Robusta / Arabica en caféine ?", choices:["≈ égal","×1.5","×2","×3"], answer:2, reward:60, difficulty:'Expert' },
  { q:"Quel pourcentage maximum d'écart top 1 vs top 2 au classement cookies ?", choices:["10 %","15 %","20 %","25 %"], answer:2, reward:60, difficulty:'Expert' },
  { q:"Quel est le cooldown entre 2 achats $CKM consécutifs (en secondes) ?", choices:["5 s","15 s","30 s","60 s"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Comment se nomme la machine espresso à crema inventée par Achille Gaggia ?", choices:["Cafetière Bialetti","Espresso à crema","Cold drip","French press"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quelle température idéale du lait pour le latte art ?", choices:["50-55 °C","60-65 °C","70-75 °C","80-85 °C"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quelle méthode italienne utilise la pression de la vapeur pour extraire (cafetière maison) ?", choices:["Aeropress","Moka pot","Chemex","V60"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quel décay quotidien sur les actions $CKM après 7 j de hold sans activité ?", choices:["0.1 %","0.5 %","1 %","2 %"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quel pourcentage maximum d'impact prix sur une seule transaction $CKM ?", choices:["5 %","10 %","15 %","20 %"], answer:1, reward:60, difficulty:'Expert' },
];

/* Quiz : 1 disponible toutes les 5h */
export const QUIZ_COOLDOWN_MS = 5 * 60 * 60 * 1000;

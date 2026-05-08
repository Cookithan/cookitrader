/* ════════════════════════════════════════════════════
   CONSTANTES GAMEPLAY
   - LEVEL_NAMES : titre de chaque palier (1..15)
   - xpRequired  : XP nécessaire pour passer au niveau suivant
                    · 1..5  → level*100+50  (linéaire, montée rapide)
                    · 6..9  → level²*50     (palier durci pour le end-game)
   - SEGMENTS    : 11 segments de la roue (valeur, label, weight, color)
   - DAILY_REWARDS : check-in J1..J7 (J7 = jackpot hebdo)
   - REWARDS     : tous les items boutique (Badge / Titre / Thème / Avatar / Skin / Roue / Premium)
   - ACHIEVEMENTS: succès (avec un caché : master_succes)
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
  'Cookie Originel',            // 15 — niveau max, endgame XP→☕ démarre ici
];

/* XP requise dans le niveau `level` pour passer à `level+1`.
   Discontinuité volontaire entre 5 et 6 : passage en mode "end-game"
   où chaque palier débloque +1 ☕ (au lieu de cookies). */
export function xpRequired(level){
  if(level <= 5) return level * 100 + 50;
  return level * level * 50;
}

/* Tarif du changement de prénom — le 1er (onboarding) est gratuit,
   ensuite le compteur démarre à 0 et le prix grimpe à chaque modif.
   Plafonné à 1000 🍪 dès le 4e changement. */
export const NAME_CHANGE_PRICES = [100, 250, 500, 1000];
export function getNameChangePrice(count){
  return NAME_CHANGE_PRICES[Math.min(count, NAME_CHANGE_PRICES.length - 1)];
}

/* Roue 100% cookie & café : pertes = sombres (espresso/mocha), gains = clairs (caramel/miel/or)
   9 segments — -25 et +300 retirés le 09/05/2026 (équilibrage demandé par user). */
export const SEGMENTS = [
  { value:  10, label:'+10',  weight:12, color:'#C17F3C' },  // caramel
  { value: 200, label:'+200', weight: 2, color:'#F5DC8A' },  // or crème (jackpot)
  { value: -10, label:'-10',  weight:14, color:'#5A3520' },  // café au lait foncé
  { value:  20, label:'+20',  weight:10, color:'#D4A017' },  // caramel doré
  { value:  -5, label:'-5',   weight:14, color:'#6B4530' },  // moka clair
  { value:  50, label:'+50',  weight: 8, color:'#E5B040' },  // ambre
  { value: -15, label:'-15',  weight:17, color:'#4A2A14' },  // moka foncé
  { value: 100, label:'+100', weight: 7, color:'#F0C050' },  // miel
  { value:-100, label:'-100', weight: 2, color:'#2A1606' },  // espresso brûlé (catastrophe)
];

/* Récompenses check-in : index = jour dans la semaine (0..6). Jour 7 = jackpot. */
export const DAILY_REWARDS = [15, 20, 30, 40, 55, 75, 200];

export const REWARDS = [
  // BADGES
  { id:'badge_debutant', name:'Badge Débutant', desc:'Premier pas dans CookiMiner', cost:30,   type:'Badge', emoji:'🌱', levelRequired:1 },
  { id:'badge_barista',  name:'Badge Barista',  desc:'Maîtrise de base du café',    cost:120,  type:'Badge', emoji:'☕', levelRequired:2 },
  { id:'badge_chef',     name:'Badge Chef',     desc:'Pour les acharnés du cookie', cost:500,  type:'Badge', emoji:'👨‍🍳', levelRequired:5 },
  { id:'badge_legende',  name:'Badge Légende',  desc:'Le summum de CookiMiner',     cost:1000, type:'Badge', emoji:'👑', levelRequired:6 },
  { id:'badge_connaisseur', name:'Badge Connaisseur', desc:'Tu maîtrises l\'art du café',  cost:600,  type:'Badge', emoji:'🎓', levelRequired:7 },
  { id:'badge_mythique',    name:'Badge Mythique',    desc:'Sur le seuil de l\'éternité',  cost:1500, type:'Badge', emoji:'🔱', levelRequired:9 },
  { id:'badge_eternel',   name:'Badge Éternel',   desc:'Au-delà de la Légende',         cost:2500, type:'Badge', emoji:'🌟', levelRequired:10 },
  { id:'badge_empereur',  name:'Badge Empereur',  desc:'Règne du café absolu',          cost:1800, type:'Badge', emoji:'👑', levelRequired:11 },
  { id:'badge_gardien',   name:'Badge Gardien',   desc:'Protecteur des saveurs',        cost:2000, type:'Badge', emoji:'🛡️', levelRequired:13 },
  { id:'badge_originel',  name:'Badge Originel',  desc:'Incarnation du premier cookie', cost:4000, type:'Badge', emoji:'🌌', levelRequired:15 },
  // TITRES
  // THÈMES
  { id:'theme_creme',      name:'Thème Cappuccino Mousseux', desc:'Fond rosé crème chaud',     cost:80,   type:'Thème', emoji:'☁️', levelRequired:1 },
  { id:'theme_espresso',   name:'Thème Nuit Espresso',       desc:'Fond sombre café',          cost:300,  type:'Thème', emoji:'🌙', levelRequired:2 },
  { id:'theme_caramel',    name:'Thème Caramel Sunrise',     desc:'Dégradé chaud animé',       cost:450,  type:'Thème', emoji:'🌅', levelRequired:3 },
  { id:'theme_legendaire', name:'Thème Légendaire',          desc:'Fond doré avec particules', cost:1200, type:'Thème', emoji:'💫', levelRequired:6 },
  { id:'theme_mocha_cosmique', name:'Thème Mocha Cosmique',  desc:'Volutes café et étoiles',   cost:900, type:'Thème', emoji:'🪐', levelRequired:8 },
  { id:'theme_aurore',     name:'Thème Aurore Boréale',      desc:'Voiles cosmiques chatoyants', cost:4000, type:'Thème', emoji:'🌌', levelRequired:10 },
  { id:'theme_elixir',     name:'Thème Élixir Doré',         desc:'Or liquide en fusion',        cost:1500, type:'Thème', emoji:'🧪', levelRequired:12 },
  { id:'theme_renaissance', name:'Thème Renaissance',         desc:'Flammes de phénix orangées',  cost:2500, type:'Thème', emoji:'🔥', levelRequired:14 },
  /* Thèmes ÉDITION LIMITÉE (PHASE 6E) — débloqués via événements
     spéciaux uniquement. cost:0, flag `limited:true` + `event:<id>`.
     La boutique les masque tant qu'ils ne sont pas dans `unlocked` ;
     une fois débloqués, ils apparaissent avec un badge "Édition limitée"
     et sont déjà marqués comme possédés. */
  { id:'theme_or_limite', name:'Thème Or Massif Limité', desc:'Édition limitée — Tour Spécial Roue', cost:0, type:'Thème', emoji:'🥇', levelRequired:4, limited:true, event:'event_jackpot'     },
  { id:'theme_trader',    name:'Thème Trader Avisé',     desc:'Édition limitée — Marché en Folie',   cost:0, type:'Thème', emoji:'📈', levelRequired:4, limited:true, event:'event_market_pro'  },
  { id:'theme_flamme',    name:'Thème Flamme Vivante',   desc:'Édition limitée — Série de Feu',      cost:0, type:'Thème', emoji:'🔥', levelRequired:4, limited:true, event:'event_streak'      },

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
  { id:'avatar_dragon',  name:'Avatar Dragon Espresso', desc:'Dragon qui crache de la vapeur', cost:800,  type:'Avatar', emoji:'🐲',   levelRequired:5 },
  { id:'avatar_or',      name:'Avatar Or Massif',       desc:'Visage doré scintillant',        cost:1500, type:'Avatar', emoji:'✨',   levelRequired:6 },
  { id:'avatar_legende', name:'Avatar Légende',         desc:'Couronne + cookie magique',      cost:2500, type:'Avatar', emoji:'👑',   levelRequired:6 },
  { id:'avatar_sage',    name:'Avatar Sage du Café',    desc:'Vieil homme barbu et serein',    cost:800,  type:'Avatar', emoji:'🧙',   levelRequired:8 },
  { id:'avatar_eternel', name:'Avatar Éternel',         desc:'Halo infini scintillant',        cost:4500, type:'Avatar', emoji:'♾️',   levelRequired:10 },
  // MUSIQUES (BRIEF_AUDIO) — débloquent les musiques d'ambiance ; mapping
  // id:'music_<key>' → MUSICS.<key> côté src/lib/audio.js
  { id:'music_bossa',  name:'Musique Bossa Nova',   desc:'Soleil brésilien',          cost:1500, type:'Musique', emoji:'🇧🇷', levelRequired:5 },
  { id:'music_royale', name:'Symphonie Royale',     desc:'Musique classique baroque', cost:2000, type:'Musique', emoji:'💎', levelRequired:5 },
  // PREMIUM — Collection Cosmos (payés en cafés ☕)
  /* Jetons VIP — items premium CONSOMMABLES (pas d'ajout à unlocked).
     À l'achat, ajoute des tours bonus à la roue pour la journée en
     cours. Le bonus reset à minuit en même temps que le compteur normal. */
  { id:'spin_pass_20',   currency:'cafe', applyAs:'spin_pass', spinPassAmount:20, name:'Jeton VIP +20 tours', desc:'+20 tours de roue aujourd\'hui',   cost:4, type:'Premium', emoji:'🎟️', levelRequired:1 },
  { id:'spin_pass_50',   currency:'cafe', applyAs:'spin_pass', spinPassAmount:50, name:'Jeton VIP +50 tours', desc:'+50 tours de roue aujourd\'hui',   cost:9, type:'Premium', emoji:'🎫', levelRequired:1 },

  { id:'theme_cosmos',   currency:'cafe', applyAs:'theme',       name:'Thème Cosmos',          desc:'Fond galactique exclusif',     cost:5,  type:'Premium', emoji:'🌌', levelRequired:1 },
  { id:'reveal_master',  currency:'cafe', applyAs:'achievement', name:'Révéler le Succès Café',  desc:'Débloque la visibilité du succès secret',      cost:7,  type:'Premium', emoji:'🔮', levelRequired:1 },
  { id:'banner_cookies', currency:'cafe', applyAs:'banner',      name:'Bannière Cookies',      desc:'Décor 🍪 sur ta carte niveau', cost:3,  type:'Premium', emoji:'🍪', levelRequired:1 },
  { id:'music_lofi',     currency:'cafe', applyAs:'music',       name:'Musique Lofi Hip-Hop', desc:'Ambiance étudiant chill',      cost:3,  type:'Premium', emoji:'🎵', levelRequired:1 },
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
  { id:'level_10',       name:'Éternel !',          desc:'Tu as atteint le niveau 10 — Éternel',     emoji:'♾️', bonus:200, cafesBonus:5 },
  { id:'level_15',       name:'Cookie Originel !',  desc:'Tu as atteint le niveau maximum',          emoji:'🌌', bonus:500, cafesBonus:10 },
  { id:'trader',         name:'Trader !',           desc:'Tu as investi 500 cookies en $CKM',        emoji:'💹', bonus:40  },
  /* Caché : ne s'affiche que si l'utilisateur a acheté "Révéler le Succès Café" en boutique premium */
  { id:'master_succes',  name:'Succès Café',        desc:'Tu as tout débloqué',                       emoji:'🎖️', bonus:200, cafesBonus:10, hidden:true },
  /* Apex final : niveau 15 atteint + tous les autres succès visibles débloqués.
     Si l'utilisateur a acheté reveal_master, il doit aussi avoir master_succes. */
  { id:'end_game',       name:'Légende Vivante !',  desc:'Niveau max + tous les autres succès',      emoji:'🏆', bonus:1000, cafesBonus:25 },
];

/* Pool Quiz du jour — culture générale fun. 32 questions tirées au
   sort 3 par session (cf QUIZ_QUESTIONS_PER_SESSION dans QuizGame).
   3 niveaux : Facile (20 🍪), Moyen (35 🍪), Expert (60 🍪). */
export const QUESTIONS = [
  // FACILE (reward: 20)
  { q:"Combien de pattes a une araignée ?", choices:["6","8","10","12"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quelle planète est surnommée 'la planète rouge' ?", choices:["Vénus","Mars","Jupiter","Saturne"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quelle est la capitale de l'Australie ?", choices:["Sydney","Melbourne","Canberra","Perth"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Combien de minutes y a-t-il dans une journée ?", choices:["1 200","1 440","1 800","2 400"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quel animal est le symbole national du Canada ?", choices:["L'élan","Le castor","L'ours polaire","L'aigle"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quelle couleur obtient-on en mélangeant bleu et jaune ?", choices:["Violet","Vert","Orange","Marron"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quel est le plus grand océan du monde ?", choices:["Atlantique","Indien","Arctique","Pacifique"], answer:3, reward:20, difficulty:'Facile' },
  { q:"Combien de continents y a-t-il ?", choices:["5","6","7","8"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Quelle langue est la plus parlée au monde (en natifs) ?", choices:["Anglais","Mandarin","Espagnol","Hindi"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quel fruit a la peau jaune et un cœur acide ?", choices:["Orange","Ananas","Citron","Pamplemousse"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Combien de joueurs dans une équipe de foot sur le terrain ?", choices:["9","10","11","12"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Quel élément chimique a pour symbole 'O' ?", choices:["Or","Oxygène","Osmium","Olive"], answer:1, reward:20, difficulty:'Facile' },

  // MOYEN (reward: 35)
  { q:"En quelle année est tombé le mur de Berlin ?", choices:["1987","1989","1991","1993"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quel est le plus long fleuve du monde ?", choices:["Amazone","Nil","Mississippi","Yangtsé"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Qui a peint la Joconde ?", choices:["Michel-Ange","Léonard de Vinci","Raphaël","Botticelli"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Combien d'os a un humain adulte ?", choices:["186","206","226","256"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quelle est la monnaie du Japon ?", choices:["Le won","Le yen","Le baht","Le yuan"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quel pays a inventé les sushis ?", choices:["Chine","Corée","Japon","Vietnam"], answer:2, reward:35, difficulty:'Moyen' },
  { q:"Quel animal peut vivre sans tête pendant plusieurs jours ?", choices:["La fourmi","Le cafard","La grenouille","L'escargot"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Combien de cordes a une guitare classique standard ?", choices:["4","5","6","7"], answer:2, reward:35, difficulty:'Moyen' },
  { q:"Quelle est l'unité de mesure de la pression atmosphérique ?", choices:["Joule","Pascal","Watt","Newton"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Le miel ne se périme jamais : vrai ou faux ?", choices:["Vrai","Faux, il périme en 1 an","Faux, il périme en 5 ans","Faux, il périme en 50 ans"], answer:0, reward:35, difficulty:'Moyen' },
  { q:"Quel auteur a écrit 'Les Misérables' ?", choices:["Émile Zola","Victor Hugo","Gustave Flaubert","Honoré de Balzac"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quel est le plus petit pays du monde ?", choices:["Monaco","Saint-Marin","Vatican","Liechtenstein"], answer:2, reward:35, difficulty:'Moyen' },

  // EXPERT (reward: 60)
  { q:"En quelle année a eu lieu le premier vol des frères Wright ?", choices:["1899","1903","1908","1912"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quel est l'élément chimique le plus abondant dans l'univers ?", choices:["Hélium","Oxygène","Hydrogène","Carbone"], answer:2, reward:60, difficulty:'Expert' },
  { q:"Combien de temps met la lumière du Soleil à atteindre la Terre ?", choices:["8 secondes","8 minutes","8 heures","8 jours"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quel animal a le cœur le plus gros du règne animal ?", choices:["L'éléphant","Le rorqual bleu","La girafe","Le requin baleine"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quel philosophe a écrit 'Ainsi parlait Zarathoustra' ?", choices:["Kant","Schopenhauer","Nietzsche","Heidegger"], answer:2, reward:60, difficulty:'Expert' },
  { q:"Quelle est la vitesse approximative de la lumière dans le vide ?", choices:["100 000 km/s","300 000 km/s","500 000 km/s","1 000 000 km/s"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quel est le seul nombre premier pair ?", choices:["0","1","2","Aucun"], answer:2, reward:60, difficulty:'Expert' },
  { q:"En quelle année l'euro est-il devenu la monnaie officielle de la France ?", choices:["1999","2000","2001","2002"], answer:3, reward:60, difficulty:'Expert' },
];

/* Quiz : 1 disponible toutes les 5h */
export const QUIZ_COOLDOWN_MS = 5 * 60 * 60 * 1000;

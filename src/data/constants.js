/* ════════════════════════════════════════════════════
   CONSTANTES GAMEPLAY
   - LEVEL_NAMES : titre de chaque palier (1..6)
   - SEGMENTS    : 11 segments de la roue (valeur, label, weight, color)
   - DAILY_REWARDS : check-in J1..J7 (J7 = jackpot hebdo)
   - REWARDS     : tous les items boutique (Badge / Titre / Thème / Avatar / Skin / Roue / Premium)
   - ACHIEVEMENTS: succès (avec un caché : master_succes)
   - QUESTIONS   : pool quiz, chacune a difficulty + reward + 4 choices
   - QUIZ_COOLDOWN_MS : 5h entre deux quiz
════════════════════════════════════════════════════ */

export const LEVEL_NAMES = ['','Barista','Torréfacteur','Maître','Grand Barista','Chef Pâtissier','Légende'];

/* Roue 100% cookie & café : pertes = sombres (espresso/mocha), gains = clairs (caramel/miel/or) */
export const SEGMENTS = [
  { value: -25, label:'-25',  weight:12, color:'#3D1F0E' },  // brun foncé café
  { value:  10, label:'+10',  weight:12, color:'#C17F3C' },  // caramel
  { value: 200, label:'+200', weight: 2, color:'#F5DC8A' },  // or crème (jackpot) — éloigné du +300
  { value: -10, label:'-10',  weight:14, color:'#5A3520' },  // café au lait foncé
  { value:  20, label:'+20',  weight:10, color:'#D4A017' },  // caramel doré
  { value:  -5, label:'-5',   weight:14, color:'#6B4530' },  // moka clair
  { value:  50, label:'+50',  weight: 8, color:'#E5B040' },  // ambre
  { value: -15, label:'-15',  weight:17, color:'#4A2A14' },  // moka foncé
  { value: 100, label:'+100', weight: 7, color:'#F0C050' },  // miel
  { value:-100, label:'-100', weight: 2, color:'#2A1606' },  // espresso brûlé (catastrophe)
  { value: 300, label:'+300', weight: 2, color:'#FFE89A' },  // or pur (super jackpot)
];

/* Récompenses check-in : index = jour dans la semaine (0..6). Jour 7 = jackpot. */
export const DAILY_REWARDS = [15, 20, 30, 40, 55, 75, 200];

export const REWARDS = [
  // BADGES
  { id:'badge_debutant', name:'Badge Débutant', desc:'Premier pas dans CookiTrader', cost:30,   type:'Badge', emoji:'🌱', levelRequired:1 },
  { id:'badge_barista',  name:'Badge Barista',  desc:'Maîtrise de base du café',    cost:120,  type:'Badge', emoji:'☕', levelRequired:2 },
  { id:'badge_chef',     name:'Badge Chef',     desc:'Pour les acharnés du cookie', cost:500,  type:'Badge', emoji:'👨‍🍳', levelRequired:5 },
  { id:'badge_legende',  name:'Badge Légende',  desc:'Le summum de CookiTrader',     cost:1000, type:'Badge', emoji:'👑', levelRequired:6 },
  // TITRES
  { id:'titre_grand_cru', name:'Titre "Grand Cru"',         desc:'Affichez votre prestige', cost:200,  type:'Titre', emoji:'🏅', levelRequired:2 },
  { id:'titre_maestro',   name:'Titre "Maestro"',           desc:'Au sommet de l\'art',     cost:700,  type:'Titre', emoji:'🎯', levelRequired:5 },
  { id:'titre_legende',   name:'Titre "Légende du Cookie"', desc:'Le titre ultime',         cost:1500, type:'Titre', emoji:'✨', levelRequired:6 },
  // THÈMES
  { id:'theme_creme',      name:'Thème Cappuccino Mousseux', desc:'Fond rosé crème chaud',     cost:80,   type:'Thème', emoji:'☁️', levelRequired:1 },
  { id:'theme_espresso',   name:'Thème Nuit Espresso',       desc:'Fond sombre café',          cost:300,  type:'Thème', emoji:'🌙', levelRequired:2 },
  { id:'theme_caramel',    name:'Thème Caramel Sunrise',     desc:'Dégradé chaud animé',       cost:450,  type:'Thème', emoji:'🌅', levelRequired:3 },
  { id:'theme_legendaire', name:'Thème Légendaire',          desc:'Fond doré avec particules', cost:1200, type:'Thème', emoji:'💫', levelRequired:6 },
  // AVATARS
  { id:'avatar_cookie', name:'Avatar Cookie',   desc:'Tête de cookie dodue',     cost:100,  type:'Avatar', emoji:'🍪', levelRequired:1 },
  { id:'avatar_chef',   name:'Avatar Chef',     desc:'Toque du grand chef',      cost:400,  type:'Avatar', emoji:'👨‍🍳', levelRequired:4 },
  { id:'avatar_legend', name:'Avatar Légende',  desc:'Couronne dorée animée',    cost:1000, type:'Avatar', emoji:'👑', levelRequired:6 },
  // SKINS COOKIE
  { id:'skin_glace',   name:'Cookie Fraise',     desc:'Pépites de fraise gorgées',   cost:150,  type:'Skin', emoji:'🍓', levelRequired:2 },
  { id:'skin_dore',    name:'Cookie Doré',       desc:'Brillance animée',            cost:700,  type:'Skin', emoji:'⭐', levelRequired:5 },
  { id:'skin_legende', name:'Cookie Légendaire', desc:'Cookie qui pulse en caramel', cost:1500, type:'Skin', emoji:'💎', levelRequired:6 },
  // SKINS ROUE
  { id:'roue_chocolat', name:'Roue Chocolat',   desc:'Segments cacao et moka profond', cost:200,  type:'Roue', emoji:'🍫', levelRequired:2 },
  { id:'roue_caramel',  name:'Roue Caramel',    desc:'Tons dorés et ambrés chauds',    cost:350,  type:'Roue', emoji:'🍯', levelRequired:3 },
  { id:'roue_legende',  name:'Roue Légendaire', desc:'Or massif avec effet brillant',  cost:1000, type:'Roue', emoji:'👑', levelRequired:6 },
  // PREMIUM — Collection Cosmos (payés en cafés ☕)
  { id:'avatar_aurore', currency:'cafe', applyAs:'avatar',      name:'Avatar Cosmos',         desc:'Reflets galactiques',          cost:5,  type:'Premium', emoji:'🌌', levelRequired:1 },
  { id:'theme_cosmos',  currency:'cafe', applyAs:'theme',       name:'Thème Cosmos',          desc:'Fond galactique exclusif',     cost:9,  type:'Premium', emoji:'🌌', levelRequired:1 },
  { id:'skin_mystique', currency:'cafe', applyAs:'skin',        name:'Cookie Cosmos',         desc:'Cookie qui pulse en violet',   cost:4,  type:'Premium', emoji:'🌌', levelRequired:1 },
  { id:'reveal_master', currency:'cafe', applyAs:'achievement', name:'Dernier Succès Caché',  desc:'Révèle un succès secret',      cost:15, type:'Premium', emoji:'🔮', levelRequired:1 },
];

/* Achievements (succès surprises) */
export const ACHIEVEMENTS = [
  { id:'first_cookie',   name:'Premier Cookie !',   desc:'Tu as gagné ton premier cookie',           emoji:'🌱', bonus:5   },
  { id:'first_purchase', name:'Premier Achat !',    desc:'Tu as débloqué ton premier item boutique', emoji:'🛍️', bonus:10  },
  { id:'streak_3',       name:'En Route !',         desc:'3 jours de check-in consécutifs',          emoji:'🔥', bonus:15  },
  { id:'streak_7',       name:'En Feu !',           desc:'7 jours de check-in consécutifs',          emoji:'💥', bonus:30,  cafesBonus:1 },
  { id:'jackpot',        name:'Gros Lot !',         desc:'Tu as touché +200 à la roue',              emoji:'🎰', bonus:50,  cafesBonus:1 },
  { id:'level_3',        name:'En Progression !',   desc:'Tu as atteint le niveau 3',                emoji:'⭐', bonus:25  },
  { id:'level_6',        name:'Légende !',          desc:'Tu as atteint le niveau maximum',          emoji:'👑', bonus:100, cafesBonus:1 },
  { id:'trader',         name:'Trader !',           desc:'Tu as investi 500 cookies en $CKM',        emoji:'💹', bonus:40  },
  /* Caché : ne s'affiche que si l'utilisateur a acheté "Dernier Succès Caché" en boutique premium */
  { id:'master_succes',  name:'Maître Des Succès',  desc:'Tu as tout débloqué',                       emoji:'🎖️', bonus:200, cafesBonus:10, hidden:true },
];

export const QUESTIONS = [
  // FACILE (reward: 20)
  { q:"De quelle couleur est un espresso bien préparé ?", choices:["Noir avec une mousse dorée","Blanc","Marron clair","Bleu"], answer:0, reward:20, difficulty:'Facile' },
  { q:"Qu'est-ce qu'un cappuccino ?", choices:["Un café avec de la crème fouettée","Un café avec du lait moussé en parts égales","Un café glacé","Un café sans sucre"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quelle est la forme classique d'un cookie américain ?", choices:["Carré","Triangulaire","Rond et plat","En forme d'étoile"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Quel ingrédient donne son goût amer au café ?", choices:["Le sucre","La caféine","Le lait","La vanille"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Le café pousse sur quel type de plante ?", choices:["Un arbre fruitier","Un arbuste","Une liane","Un cactus"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quelle boisson contient du café et du lait chaud ?", choices:["Thé au lait","Café au lait","Chocolat chaud","Limonade"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quel est l'ingrédient principal d'un cookie classique ?", choices:["Farine, beurre, sucre","Lait, œufs, sel","Levure, eau, miel","Cacao, crème, fécule"], answer:0, reward:20, difficulty:'Facile' },
  { q:"À quelle température boit-on un café chaud idéalement ?", choices:["20-30°C","40-50°C","60-70°C","90-100°C"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Qu'est-ce qu'un décaféiné ?", choices:["Un café très fort","Un café dont la caféine a été retirée","Un café sucré","Un café froid"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Les pépites dans un cookie au chocolat sont faites de ?", choices:["Caramel durci","Chocolat","Noisettes","Sucre caramélisé"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Que signifie 'latte' en italien ?", choices:["Café","Lait","Crème","Sucre"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quel pays est le plus grand producteur de café au monde ?", choices:["Colombie","Éthiopie","Brésil","Vietnam"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Un cookie 'chewy' est un cookie ?", choices:["Très dur et croquant","Moelleux et fondant","Sans sucre","Salé"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Comment appelle-t-on la mousse crémeuse sur un espresso ?", choices:["Mousse","Crema","Écume","Latte"], answer:1, reward:20, difficulty:'Facile' },

  // FACILE — questions sur CookiTrader
  { q:"Quelle est la monnaie principale de CookiTrader ?", choices:["L'euro","Le café (CF)","Le cookie","La pièce d'or"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Combien y a-t-il de niveaux dans CookiTrader ?", choices:["3","6","10","Infini"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quel mini-jeu te demande de relâcher au bon moment ?", choices:["Quiz café","Roue de la fortune","Stop le café","Défi de clics"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Combien de cookies obtient-on pour 2 clics dans le défi de clics ?", choices:["0","1","2","5"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Comment s'appelle la monnaie premium (rare) du jeu ?", choices:["Le diamant","Le café (CF)","La gemme","Le pépite"], answer:1, reward:20, difficulty:'Facile' },
  { q:"À quel niveau s'ouvre le marché $CKM ?", choices:["Niveau 1","Niveau 3","Niveau 5","Niveau 6"], answer:1, reward:20, difficulty:'Facile' },
  { q:"Quel est le titre du niveau 1 dans CookiTrader ?", choices:["Légende","Maître","Barista","Chef Pâtissier"], answer:2, reward:20, difficulty:'Facile' },
  { q:"Comment gagne-t-on des CF (cafés) dans le jeu ?", choices:["En cliquant le cookie","Au level-up et aux succès","En achetant des skins","Toutes les heures"], answer:1, reward:20, difficulty:'Facile' },

  // MOYEN (reward: 35)
  { q:"Quelle est la différence entre un Arabica et un Robusta ?", choices:["L'Arabica est plus amer et fort","L'Arabica est plus doux et aromatique","Le Robusta est plus cher","Il n'y a aucune différence"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Le 'cold brew' se prépare comment ?", choices:["Café versé sur des glaçons","Infusion à froid pendant 12-24h","Espresso refroidi au réfrigérateur","Café mixé avec de la glace"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quel est le rôle du beurre dans un cookie ?", choices:["Donner du croquant uniquement","Apporter du moelleux, du goût et lier les ingrédients","Remplacer les œufs","Faire lever la pâte"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"D'où vient originellement le mot 'cookie' ?", choices:["De l'anglais 'cook'","Du néerlandais 'koekje' (petit gâteau)","Du français 'coquille'","De l'italien 'cucina'"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Qu'est-ce qu'un 'flat white' ?", choices:["Un café allongé à l'eau","Un espresso avec peu de lait micro-moussé","Un café froid avec crème","Un café sans mousse"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Pourquoi met-on du sel dans les cookies ?", choices:["Pour les conserver plus longtemps","Pour équilibrer et rehausser le goût sucré","Pour les rendre croustillants","C'est une erreur de recette"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Le café Kopi Luwak est célèbre pour quoi ?", choices:["C'est le café le moins cher du monde","Il est produit à partir de grains digérés par une civette","Il contient 3x plus de caféine","Il pousse uniquement en France"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quelle farine est généralement utilisée pour les cookies ?", choices:["Farine de riz","Farine de blé tout usage","Farine de maïs","Farine de seigle"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Qu'est-ce que le 'latte art' ?", choices:["Une marque de café","Des dessins créés dans la mousse de lait","Un type de café glacé","La décoration du café en boutique"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Un cookie 'snickerdoodle' est parfumé à quoi ?", choices:["Chocolat et noisette","Cannelle et sucre","Citron et pavot","Vanille et noix de coco"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Combien de grammes de caféine contient un espresso moyen ?", choices:["5-10 mg","60-80 mg","150-200 mg","300 mg"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Qu'est-ce que le 'bloom' lors de la préparation d'un café filtre ?", choices:["La couleur du café dans la tasse","Un pré-mouillage du café pour libérer le CO2","Le bruit de la machine","L'écume qui se forme"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quel sucre donne un goût de caramel et d'humidité aux cookies ?", choices:["Sucre blanc","Sucre roux (cassonade)","Sucre glace","Sirop d'érable"], answer:1, reward:35, difficulty:'Moyen' },

  // MOYEN — questions sur CookiTrader
  { q:"Combien de cookies coûte le défi de clics ?", choices:["3","5","10","20"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Combien de questions sont posées par session de quiz ?", choices:["1","3","5","10"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Combien de temps entre deux quiz café ?", choices:["1 heure","5 heures","12 heures","24 heures"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quel mini-jeu coûte 20 cookies pour jouer ?", choices:["Quiz café","Roue de la fortune","Stop le café","Défi de clics"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Combien de mini-jeux différents existent dans CookiTrader ?", choices:["3","5","8","10"], answer:1, reward:35, difficulty:'Moyen' },
  { q:"Quel niveau requis pour débloquer le titre Maestro ?", choices:["Niveau 2","Niveau 3","Niveau 5","Niveau 6"], answer:2, reward:35, difficulty:'Moyen' },

  // EXPERT (reward: 60)
  { q:"Qu'est-ce que la 'troisième vague' du café ?", choices:["La 3e tasse de la journée","Un mouvement qui traite le café comme un produit artisanal de terroir","Une technique d'extraction à la vague","Le 3e pays producteur mondial"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Que signifie 'single origin' sur un sac de café ?", choices:["Le café vient d'une seule plantation ou région","Le café n'a qu'une seule torréfaction","Il y a un seul grain par tasse","C'est un café bio certifié"], answer:0, reward:60, difficulty:'Expert' },
  { q:"Pourquoi réfrigérer la pâte à cookies avant cuisson ?", choices:["Pour accélérer la cuisson","Pour solidifier le beurre et développer les arômes","Pour éviter que ça colle","C'est une légende, ça ne change rien"], answer:1, reward:60, difficulty:'Expert' },
  { q:"La réaction de Maillard dans un cookie, c'est quoi ?", choices:["La fonte du chocolat à haute température","La réaction entre sucres et protéines qui crée la couleur dorée","La levée de la pâte au four","La cristallisation du sucre en refroidissant"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Pourquoi utilise-t-on levure chimique ET bicarbonate dans certains cookies ?", choices:["Pour doubler la levée","Bicarbonate pour l'étalement/dorure, levure pour la hauteur","C'est redondant","Pour neutraliser l'acidité du cacao"], answer:1, reward:60, difficulty:'Expert' },

  // EXPERT — questions sur CookiTrader
  { q:"Quelle est la valeur de référence du marché $CKM ?", choices:["50","100","200","500"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quel pourcentage max de tes cookies peux-tu investir d'un coup ?", choices:["50 %","60 %","80 %","100 %"], answer:2, reward:60, difficulty:'Expert' },
  { q:"Combien de cookies rapporte un level-up (formule) ?", choices:["Toujours 50","10 × le nouveau niveau","100","Variable"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quel est le prix maximum atteignable sur le marché $CKM ?", choices:["200","350","500","1000"], answer:2, reward:60, difficulty:'Expert' },
  { q:"Combien de cafés (CF) coûte le Thème Cosmos ?", choices:["3","5","8","12"], answer:1, reward:60, difficulty:'Expert' },
  { q:"Quelle est la pénalité si le café déborde dans 'Stop le café' ?", choices:["0 cookies","−2 cookies","−5 cookies","−10 cookies"], answer:2, reward:60, difficulty:'Expert' },
];

/* Quiz : 1 disponible toutes les 5h */
export const QUIZ_COOLDOWN_MS = 5 * 60 * 60 * 1000;

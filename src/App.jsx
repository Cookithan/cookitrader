import { useState, useEffect, useRef, useCallback } from "react";
import { Cookie, ShoppingBag, Gamepad2, Home, Gift, Star, CircleDot, MousePointerClick, ChevronLeft, Check, Lock, Moon, Sun, Trophy, Flame, Zap, Settings, AlertTriangle, TrendingUp, ArrowUpRight, ArrowDownRight, Coffee, User } from "lucide-react";

/* ════════════════════════════════════════════════════
   DATA
════════════════════════════════════════════════════ */
const LEVEL_NAMES = ['','Barista','Torréfacteur','Maître','Grand Barista','Chef Pâtissier','Légende'];

/* Roue 100% cookie & café : pertes = sombres (espresso/mocha), gains = clairs (caramel/miel/or) */
const SEGMENTS = [
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

/* Palettes de roue — appliquées via prop activeRoue dans SpinGame.
   Index = position dans SEGMENTS (11 segments). */
const ROUE_PALETTES = {
  '': SEGMENTS.map(s => s.color),
  roue_chocolat: ['#1A0A00','#5C2E0A','#3D1C02','#7A4818','#2D1200','#8B5520','#4A1E06','#6B3A10','#0F0600','#000000','#A07832'],
  roue_caramel:  ['#A07830','#E5B040','#FFE4A0','#C8960C','#B88010','#F0C050','#D4A017','#A87010','#8B6914','#705810','#FFF0C0'],
  roue_legende:  ['#6B5010','#D4A017','#FFE4A0','#A07820','#8B6914','#F0C050','#FFD050','#705810','#C8960C','#4A3008','#FFF8C8'],
};
const ROUE_GLOWS = { roue_legende:'rgba(255,228,160,.55)' };

const REWARDS = [
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
const ACHIEVEMENTS = [
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

/* Récompenses check-in : index = jour dans la semaine (0..6). Jour 7 = jackpot. */
const DAILY_REWARDS = [15, 20, 30, 40, 55, 75, 200];

const QUESTIONS = [
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
const QUIZ_COOLDOWN_MS = 5 * 60 * 60 * 1000;

/* ─ Spin geometry ─ */
const TW    = SEGMENTS.reduce((s,sg)=>s+sg.weight,0);
const SEG_A = SEGMENTS.map(sg=>(sg.weight/TW)*360);
const SEG_C = (()=>{ let c=0; return SEG_A.map(a=>{ const v=c; c+=a; return v; }); })();
function wRandom(){ let r=Math.random()*TW; for(let i=0;i<SEGMENTS.length;i++){r-=SEGMENTS[i].weight;if(r<=0)return i;} return SEGMENTS.length-1; }

/* ─ Themes ─ */
const DK = { bg:'#0F0804', card:'#1E100A', card2:'#2A1508', text:'#F0E6D3', muted:'#6A5040', border:'#3D2015' };
const LT = { bg:'#F5EFE6', card:'#FDFAF6', card2:'#F0E8DC', text:'#2C1810', muted:'#8B6A5A', border:'#E8DDD0' };

const THEMES = {
  theme_creme:     { dark:false, bg:'#F8E5D5', card:'#FFF1E4', card2:'#F0D8C0', text:'#3A2818', muted:'#9C7860', border:'#E5CDB6' },
  theme_espresso:  { dark:true,  bg:'#0F0804', card:'#1E100A', card2:'#2A1508', text:'#F0E6D3', muted:'#6A5040', border:'#3D2015' },
  theme_caramel:   { dark:false, bg:'linear-gradient(160deg,#F5DEB3 0%,#E8A045 100%)', card:'#FFE9CC', card2:'#F8D89C', text:'#3D2010', muted:'#8B5A2A', border:'#E8B873' },
  theme_chocolat:  { dark:true,  bg:'#1A0F08', card:'#2D1A0E', card2:'#3D2614', text:'#F0E6D3', muted:'#A08068', border:'#5A3520' },
  theme_legendaire:{ dark:true,  bg:'#1A1200', card:'#2A1E00', card2:'#3D2C0A', text:'#F5E8B5', muted:'#A0884A', border:'#5A4520', sparkles:true },
  /* Cosmos : ambiance galactique sombre — indigo nuit + violet profond + étoiles.
     Les accents café (or, espresso, gold) restent intacts. */
  theme_cosmos:    { dark:true, bg:'linear-gradient(160deg,#070220 0%,#160838 35%,#2A1058 65%,#0F0428 100%)', card:'#1F0F3A', card2:'#2D1854', text:'#F0E0FF', muted:'#9A85C8', border:'#4A2D7A', sparkles:true },
};

const GOLD     = 'linear-gradient(135deg,#D4A017,#C17F3C)';
const ESPRESSO = 'linear-gradient(140deg,#4A2C17,#7D4E1F)';

/* ════════════════════════════════════════════════════
   PERSISTENCE
════════════════════════════════════════════════════ */
const LS_PREFIX = 'cookiminer:';
function useLocalStorage(key, initial){
  const fullKey = LS_PREFIX + key;
  const [value, setValue] = useState(()=>{
    try{ const raw = window.localStorage.getItem(fullKey); return raw!==null ? JSON.parse(raw) : initial; }
    catch{ return initial; }
  });
  useEffect(()=>{
    try{ window.localStorage.setItem(fullKey, JSON.stringify(value)); }catch{}
  },[fullKey, value]);
  return [value, setValue];
}

/* ════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════ */
export default function CookiMiner() {
  const [coins,       setCoins]       = useLocalStorage('coins',       0);
  const [cafes,       setCafes]       = useLocalStorage('cafes',       0);
  const [totalEarned, setTotalEarned] = useLocalStorage('totalEarned', 0);
  const [level,       setLevel]       = useLocalStorage('level',       1);
  const [xp,          setXp]          = useLocalStorage('xp',          0);
  const [streak,      setStreak]      = useLocalStorage('streak',      0);
  const [clickRecord, setClickRecord] = useLocalStorage('clickRecord', 0);
  const [unlocked,    setUnlocked]    = useLocalStorage('unlocked',    []);
  const [lastCheckin, setLastCheckin] = useLocalStorage('lastCheckin', null);
  const [lastQuiz,    setLastQuiz]    = useLocalStorage('lastQuiz',    null);
  const [dark,        setDark]        = useLocalStorage('dark',        false);
  const [currentPrice, setCurrentPrice] = useLocalStorage('ckmPrice',    100);
  const [priceHistory, setPriceHistory] = useLocalStorage('ckmHistory',  [100]);
  const [ckmShares,    setCkmShares]    = useLocalStorage('ckmShares',   0);
  const [ckmCostBasis, setCkmCostBasis] = useLocalStorage('ckmBasis',    0);
  const [marketTrades,   setMarketTrades]   = useLocalStorage('marketTrades',   0);
  const [marketRealized, setMarketRealized] = useLocalStorage('marketRealized', 0);
  const [marketHistory,  setMarketHistory]  = useLocalStorage('marketHistory',  []);
  const [leaderboard,    setLeaderboard]    = useLocalStorage('leaderboard',    null);
  const [leaderboardLastBoost, setLeaderboardLastBoost] = useLocalStorage('leaderboardLastBoost', '');
  const [leaderboardLastHourly, setLeaderboardLastHourly] = useLocalStorage('leaderboardLastHourly', 0);
  const [marketEvent,      setMarketEvent]      = useState(null);
  const [marketEventTicks, setMarketEventTicks] = useState(0);
  const [marketBigMoveAt,  setMarketBigMoveAt]  = useState(0);
  const [userName,    setUserName]    = useLocalStorage('userName',   '');
  const [userAvatar,  setUserAvatar]  = useLocalStorage('userAvatar', null);
  const [joinDate,    setJoinDate]    = useLocalStorage('joinDate',   '');
  const [earnedAchievements, setEarnedAchievements] = useLocalStorage('achievements', []);
  const [totalInvested,      setTotalInvested]      = useLocalStorage('totalInvested', 0);
  const [pendingAchievement, setPendingAchievement] = useState(null);
  const [activeTheme, setActiveTheme] = useLocalStorage('activeTheme', '');
  const [activeSkin,  setActiveSkin]  = useLocalStorage('activeSkin',  '');
  const [activeRoue,  setActiveRoue]  = useLocalStorage('activeRoue',  '');
  const [pendingLvUp,  setPendingLvUp]  = useState(null);
  const [tab,          setTab]          = useState('accueil');
  const [gameView,     setGameView]     = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);
  const [showLevels,   setShowLevels]   = useState(false);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [boutiqueMode, setBoutiqueMode] = useState('shop'); // 'shop' | 'premium'
  const [cafeToast,    setCafeToast]    = useState(null);   // { amount, key } | null
  const cafeToastTimerRef = useRef(null);

  /* Génère le leaderboard fictif au premier accès, après reset, ou si schéma obsolète */
  useEffect(()=>{
    const stale = !leaderboard
      || !Array.isArray(leaderboard)
      || leaderboard.length === 0
      || leaderboard[0].__schema !== LEADERBOARD_SCHEMA;
    if(stale) setLeaderboard(generateLeaderboard());
  },[leaderboard, setLeaderboard]);

  /* Concurrence : chaque jour, le bot top 1 (cookies) gagne +300.
     Pas le joueur — il n'est pas dans la liste des bots de toute façon.
     Cap à 30 jours pour éviter l'explosion si l'app est ouverte après une longue pause. */
  useEffect(()=>{
    if(!leaderboard || !Array.isArray(leaderboard) || leaderboard.length === 0) return;
    const today = new Date().toDateString();
    if(leaderboardLastBoost === today) return;

    let daysToBoost = 1;
    if(leaderboardLastBoost){
      const last = new Date(leaderboardLastBoost);
      const now  = new Date();
      last.setHours(0,0,0,0); now.setHours(0,0,0,0);
      const diff = Math.round((now - last) / (1000*60*60*24));
      daysToBoost = Math.max(1, Math.min(30, diff));
    }

    const next = leaderboard.map(p => ({ ...p }));
    for(let d=0; d<daysToBoost; d++){
      let topIdx = 0;
      let topVal = -Infinity;
      for(let i=0; i<next.length; i++){
        if(next[i].totalEarned > topVal){ topVal = next[i].totalEarned; topIdx = i; }
      }
      next[topIdx].totalEarned += 300;
    }
    setLeaderboard(next);
    setLeaderboardLastBoost(today);
  },[leaderboard, leaderboardLastBoost, setLeaderboard, setLeaderboardLastBoost]);

  /* Tick horaire : chaque bot gagne 1 à 10 cookies par heure, en faveur de ceux du bas.
     Le rang est recalculé à chaque heure → effet de rattrapage (les derniers grimpent plus vite).
     Pas le joueur. Capé à 48h. Vérifié au mount + chaque minute. */
  useEffect(()=>{
    if(!leaderboard || !Array.isArray(leaderboard) || leaderboard.length === 0) return;
    const HOUR = 3600 * 1000;
    const tick = () => {
      const now = Date.now();
      const last = leaderboardLastHourly || 0;
      if(!last){ setLeaderboardLastHourly(now); return; }
      const hoursElapsed = Math.floor((now - last) / HOUR);
      if(hoursElapsed <= 0) return;
      const hoursToApply = Math.min(48, hoursElapsed);
      const next = leaderboard.map(p => ({ ...p }));
      for(let h=0; h<hoursToApply; h++){
        /* Tri à chaque heure → rang dynamique */
        const sorted = [...next].sort((a,b) => b.totalEarned - a.totalEarned);
        const total = sorted.length;
        sorted.forEach((p, rank) => {
          /* ratio 0 (top) → 1 (dernier). Plus tu es bas, plus le max est élevé. */
          const ratio = total > 1 ? (total - 1 - rank) / (total - 1) : 0;
          const max = 1 + Math.round(ratio * 9); // 1 (top) à 10 (dernier)
          p.totalEarned += Math.floor(Math.random() * max) + 1;
        });
      }
      setLeaderboard(next);
      setLeaderboardLastHourly(last + hoursToApply * HOUR);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  },[leaderboard, leaderboardLastHourly, setLeaderboard, setLeaderboardLastHourly]);

  const addCafes = useCallback((amount) => {
    if(!amount || amount <= 0) return;
    setCafes(c => c + amount);
    setCafeToast({ amount, key: Date.now() });
    if(cafeToastTimerRef.current) clearTimeout(cafeToastTimerRef.current);
    cafeToastTimerRef.current = setTimeout(()=>setCafeToast(null), 2200);
  },[]);
  const [showOnboarding, setShowOnboarding] = useState(!userName);

  const lvRef = useRef(level); lvRef.current = level;
  const xpRef = useRef(xp);    xpRef.current = xp;

  const themePalette = activeTheme && THEMES[activeTheme] ? THEMES[activeTheme] : null;
  const inBoutiquePremium = tab === 'boutique' && boutiqueMode === 'premium';
  /* Aperçu Cosmos plus foncé, appliqué temporairement quand on est sur l'onglet Premium */
  const PREMIUM_PALETTE = {
    dark: true,
    bg:    'linear-gradient(160deg,#040014 0%,#0A0224 35%,#1A0840 65%,#06001E 100%)',
    card:  '#140828',
    card2: '#1F0E40',
    text:  '#E8D5FF',
    muted: '#8770B0',
    border:'#3A2068',
  };
  const C        = inBoutiquePremium ? PREMIUM_PALETTE : (themePalette ? themePalette : ((dark && unlocked.includes('theme_espresso')) ? DK : LT));
  const isDark   = inBoutiquePremium ? true : (themePalette ? !!themePalette.dark : (dark && unlocked.includes('theme_espresso')));
  const themeSparkles = inBoutiquePremium || (themePalette && themePalette.sparkles);

  /* Quand on quitte l'onglet boutique, reset auto le mode */
  useEffect(()=>{
    if(tab !== 'boutique' && boutiqueMode === 'premium') setBoutiqueMode('shop');
  },[tab, boutiqueMode]);
  const xpReq    = level * 100;
  const xpPct    = Math.min((xp/xpReq)*100, 100);
  const canCheckin = lastCheckin !== new Date().toDateString();
  /* lastQuiz est désormais un timestamp ; on tolère l'ancien format string (legacy) en l'ignorant */
  const lastQuizMs = typeof lastQuiz === 'number' ? lastQuiz : 0;
  const quizMsLeft = Math.max(0, QUIZ_COOLDOWN_MS - (Date.now() - lastQuizMs));
  const canQuiz    = quizMsLeft === 0;
  const badges     = REWARDS.filter(r=>r.type==='Badge' && unlocked.includes(r.id));

  /* actions */
  const addCoins = useCallback((amount)=>{
    if(amount<=0){ setCoins(c=>Math.max(0,c+amount)); return; }
    setCoins(c=>c+amount);
    setTotalEarned(t=>t+amount);

    const lv  = lvRef.current;
    const cur = xpRef.current;

    /* Niveau max OU sous le seuil → pas de level up, XP avance normalement */
    if(lv>=6 || cur+amount < lv*100){
      const next = cur+amount;
      setXp(next); xpRef.current = next;
      return;
    }

    /* Sinon, exactement UN niveau gagné. L'XP excédentaire est perdue
       (cap volontaire pour éviter les sauts type +200 → 2 niveaux d'un coup). */
    const nl = lv+1, bonus = 10*nl;
    setLevel(nl);   lvRef.current = nl;
    setXp(0);       xpRef.current = 0;
    setPendingLvUp(nl);
    setTimeout(()=>{ setCoins(c=>c+bonus); setTotalEarned(t=>t+bonus); }, 700);
  },[]);

  const spendCoins   = useCallback((a)=>setCoins(c=>Math.max(0,c-a)),[]);

  /* === Tick global du marché — tourne en arrière-plan dès le niveau 3 === */
  const eventRefGlobal = useRef(null);
  const eventTicksRefGlobal = useRef(0);
  const lastEventIdRef = useRef(null);
  const priceRef = useRef(currentPrice);
  eventRefGlobal.current = marketEvent;
  eventTicksRefGlobal.current = marketEventTicks;
  priceRef.current = currentPrice;

  useEffect(()=>{
    if(level < 3) return;
    const BIG_BEARS = BIG_EVENTS.filter(e => e.biasPct < 0);
    const BIG_BULLS = BIG_EVENTS.filter(e => e.biasPct > 0);
    const pickFrom = (pool) => {
      if(!pool || pool.length === 0) return null;
      if(pool.length === 1) return pool[0];
      const filtered = pool.filter(e => e.id !== lastEventIdRef.current);
      return (filtered.length ? filtered : pool)[Math.floor(Math.random()*(filtered.length || pool.length))];
    };
    const id = setInterval(()=>{
      let ev = eventRefGlobal.current;
      let ticksRemaining = eventTicksRefGlobal.current;
      if(ev){
        ticksRemaining -= 1;
        if(ticksRemaining <= 0){ lastEventIdRef.current = ev.id; setMarketEvent(null); setMarketEventTicks(0); ev = null; }
        else setMarketEventTicks(ticksRemaining);
      } else {
        /* Correction d'extrêmes : si le prix est très éloigné de 100, on force une big news
           dans le sens opposé pour ramener le marché vers sa valeur de base. */
        const p = priceRef.current;
        if(p > 200 && Math.random() < 0.10){
          ev = pickFrom(BIG_BEARS);
        } else if(p < 50 && Math.random() < 0.10){
          ev = pickFrom(BIG_BULLS);
        } else {
          /* Tirage normal : ~1 news par minute (40 ticks à 1.5s)
             0.2% mega · 0.4% big · 2% small → ~2.6%/tick total */
          const r = Math.random();
          if(r < 0.002)            ev = pickFrom(MEGA_EVENTS);
          else if(r < 0.006)       ev = pickFrom(BIG_EVENTS);
          else if(r < 0.026)       ev = pickFrom(SMALL_EVENTS);
        }
        if(ev){ setMarketEvent(ev); setMarketEventTicks(ev.ticks); }
      }
      const bias = ev ? ev.biasPct : 0;
      setCurrentPrice(prev => {
        const np = nextPrice(prev, bias);
        const deltaPct = Math.abs((np - prev) / prev * 100);
        if(deltaPct >= BIG_MOVE_PCT) setMarketBigMoveAt(Date.now());
        setPriceHistory(h => {
          const next = [...h, np];
          return next.length > HISTORY_N ? next.slice(next.length - HISTORY_N) : next;
        });
        return np;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [level]);
  const checkinReward = DAILY_REWARDS[streak % 7];
  const resetProgress = () => {
    setCoins(0); setCafes(0); setTotalEarned(0); setLevel(1); setXp(0);
    setStreak(0); setClickRecord(0); setUnlocked([]);
    setLastCheckin(null); setLastQuiz(null); setDark(false);
    setCurrentPrice(100); setPriceHistory([100]);
    setCkmShares(0); setCkmCostBasis(0);
    setMarketTrades(0); setMarketRealized(0); setMarketHistory([]);
    setMarketEvent(null); setMarketEventTicks(0); setMarketBigMoveAt(0);
    setLeaderboard(null); setLeaderboardLastBoost(''); setLeaderboardLastHourly(0);
    setUserName(''); setUserAvatar(null); setJoinDate('');
    setEarnedAchievements([]); setTotalInvested(0); setPendingAchievement(null);
    setActiveTheme(''); setActiveSkin(''); setActiveRoue('');
    setPendingLvUp(null); setGameView(null); setTab('accueil');
    setShowOnboarding(true);
  };
  const doCheckin    = ()=>{ addCoins(checkinReward); setStreak(s=>s+1); setLastCheckin(new Date().toDateString()); };
  const unlockReward = (id)=>{
    const r=REWARDS.find(x=>x.id===id);
    if(!r||unlocked.includes(id)) return;
    if(r.currency==='cafe'){
      if(cafes < r.cost) return;
      setCafes(c=>Math.max(0, c - r.cost));
    } else {
      if(coins < r.cost) return;
      spendCoins(r.cost);
    }
    setUnlocked(u=>[...u,id]);
  };

  /* Achievements detection */
  const earnedRef = useRef(earnedAchievements); earnedRef.current = earnedAchievements;
  const triggerAchievement = useCallback((id)=>{
    if(earnedRef.current.includes(id)) return;
    const a = ACHIEVEMENTS.find(x=>x.id===id);
    if(!a) return;
    earnedRef.current = [...earnedRef.current, id];
    setEarnedAchievements(earnedRef.current);
    setPendingAchievement(prev => prev || a);
  },[]);

  const masterRevealed = unlocked.includes('reveal_master');

  useEffect(()=>{
    if(showOnboarding) return;
    /* "master_succes" : caché tant que reveal_master n'est pas acheté.
       Se déclenche si TOUS les autres succès sont gagnés. */
    const otherIds = ACHIEVEMENTS.filter(a => a.id !== 'master_succes').map(a => a.id);
    const allOthersDone = otherIds.every(id => earnedAchievements.includes(id));
    const checks = [
      ['first_cookie',   totalEarned >= 1],
      ['first_purchase', unlocked.length >= 1],
      ['streak_3',       streak >= 3],
      ['streak_7',       streak >= 7],
      ['level_3',        level >= 3],
      ['level_6',        level >= 6],
      ['trader',         totalInvested >= 500],
      ['master_succes',  masterRevealed && allOthersDone],
    ];
    for(const [id,ok] of checks){
      if(ok && !earnedAchievements.includes(id)){ triggerAchievement(id); break; }
    }
  },[totalEarned, streak, clickRecord, unlocked, level, coins, totalInvested, showOnboarding, earnedAchievements, triggerAchievement, masterRevealed]);

  const collectAchievement = ()=>{
    const a = pendingAchievement;
    if(!a) return;
    addCoins(a.bonus);
    if(a.cafesBonus) addCafes(a.cafesBonus);
    setPendingAchievement(null);
  };

  const GAMES = [
    { id:'checkin', Icon:Gift,              title:'Check-in quotidien',  desc:'Plus tu reviens, plus tu gagnes', reward:`+${checkinReward} 🍪 aujourd'hui`, avail:canCheckin, color:'#C17F3C' },
    { id:'quiz',    Icon:Star,              title:'Quiz café',            desc:'Toutes les 5h', reward:'20 à 60 cookies', avail:canQuiz, color:'#D4A017' },
    { id:'spin',    Icon:CircleDot,         title:'Roue de la fortune',   desc:'Tentez votre chance',       reward:'Variable (coût 20🍪)',avail:coins>=20,   color:'#4A2C17' },
    { id:'click',   Icon:MousePointerClick, title:'Défi de clics',        desc:'Tapotez le cookie !',       reward:'1 cookie / 2 clics',  avail:coins>=5,    color:'#7D4E1F' },
    { id:'pour',    Icon:Coffee,            title:'Stop le café',         desc:'Relâche au bon moment',     reward:'0 à 15 cookies',      avail:true,        color:'#5A3520' },
  ];

  const s = {
    pill:(active)=>({ padding:'10px 12px', borderRadius:18, flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, transition:'all .2s', background:active?ESPRESSO:'transparent', color:active?'#fff':C.muted }),
    card:{ borderRadius:18, background:C.card, border:`1px solid ${C.border}`, boxShadow:'0 2px 8px rgba(0,0,0,.05)' },
    goldBtn:(disabled)=>({ padding:'13px 36px', borderRadius:20, fontSize:14, fontWeight:700, background:disabled?C.card:GOLD, color:disabled?C.muted:'#fff', border:`2px solid ${disabled?C.border:'transparent'}`, boxShadow:disabled?'none':'0 4px 16px rgba(212,160,23,.4)', cursor:disabled?'not-allowed':'pointer' }),
  };

  return (
    <div style={{
      minHeight:'100svh', background:C.bg,
      display:'flex', flexDirection:'column', maxWidth:430, margin:'0 auto',
      fontFamily:'system-ui,-apple-system,sans-serif', color:C.text,
      transition:'background .4s, color .4s',
      position:'relative', overflow:'hidden'
    }}>
      {themeSparkles && (
        <div aria-hidden style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0 }}>
          {[
            { top:'6%',  left:'14%', delay:0,   size:14, char:'✦', col:'#E8D5FF' },
            { top:'18%', left:'80%', delay:1.4, size:12, char:'✦', col:'#FFE89A' },
            { top:'32%', left:'24%', delay:.5,  size:10, char:'✦', col:'#A8D5FF' },
            { top:'48%', left:'8%',  delay:.7,  size:14, char:'✦', col:'#E8D5FF' },
            { top:'58%', left:'72%', delay:2.4, size:11, char:'✦', col:'#FFE89A' },
            { top:'72%', left:'88%', delay:2.1, size:14, char:'✦', col:'#A8D5FF' },
            { top:'86%', left:'18%', delay:1.0, size:12, char:'✦', col:'#E8D5FF' },
            { top:'90%', left:'62%', delay:1.7, size:10, char:'✦', col:'#FFE89A' },
          ].map((p,i)=>(
            <span
              key={i}
              className="float-anim"
              style={{
                position:'absolute', top:p.top, left:p.left,
                fontSize:p.size, animationDelay:`${p.delay}s`,
                color:p.col, opacity:.85,
                filter:`drop-shadow(0 0 6px ${p.col})`,
                fontWeight:900, lineHeight:1
              }}
            >{p.char}</span>
          ))}
        </div>
      )}

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        button{cursor:pointer;border:none;background:none;font-family:inherit;color:inherit;-webkit-tap-highlight-color:transparent;transition:transform .12s ease}
        button:active{transform:scale(.96)}

        @keyframes slideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounceIn{0%{opacity:0;transform:scale(.35)}55%{transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
        @keyframes floatUp{0%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(-50%,-70px) scale(.7)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        @keyframes wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-10deg)}75%{transform:rotate(10deg)}}
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
        @keyframes premiumIntro{0%{opacity:0;transform:scale(.92)}18%{opacity:1;transform:scale(1)}72%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.04)}}
        @keyframes premiumRay{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
        @keyframes steam1{0%,100%{transform:translateY(0) scaleX(1) rotate(-3deg);opacity:.7}50%{transform:translateY(-18px) scaleX(1.3) rotate(3deg);opacity:0}}
        @keyframes steam2{0%,100%{transform:translateY(0) scaleX(1) rotate(4deg);opacity:.5}50%{transform:translateY(-22px) scaleX(1.4) rotate(-4deg);opacity:0}}
        @keyframes steam3{0%,100%{transform:translateY(0) scaleX(1) rotate(-2deg);opacity:.6}50%{transform:translateY(-16px) scaleX(1.2) rotate(2deg);opacity:0}}
        @keyframes pulseHold{0%,100%{box-shadow:0 0 0 0 rgba(212,160,23,.5)}50%{box-shadow:0 0 0 12px rgba(212,160,23,0)}}
        @keyframes popIn{0%{transform:scale(0) translateY(20px);opacity:0}60%{transform:scale(1.15) translateY(-4px)}100%{transform:scale(1) translateY(0);opacity:1}}
        @keyframes floatUpFb{0%{opacity:1;transform:translateX(-50%) translateY(0)}100%{opacity:0;transform:translateX(-50%) translateY(-40px)}}
        @keyframes glowRing{0%,100%{box-shadow:0 0 16px rgba(212,160,23,.4)}50%{box-shadow:0 0 32px rgba(212,160,23,.9)}}
        @keyframes perfectPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
        @keyframes idle{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-8px) rotate(2deg)}}
        @keyframes cafeToastIn{0%{opacity:0;transform:translateX(-50%) translateY(-22px) scale(.8)}60%{opacity:1;transform:translateX(-50%) translateY(0) scale(1.08)}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
        @keyframes cafeToastOut{0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}100%{opacity:0;transform:translateX(-50%) translateY(-12px) scale(.92)}}
        @keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(212,160,23,.5)}50%{box-shadow:0 0 0 14px rgba(212,160,23,0)}}
        @keyframes floatUpClick{0%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(calc(-50% + var(--tx,0)),-80px) scale(.6)}}
        @keyframes shake{0%,100%{transform:translate(0,0) rotate(0)}25%{transform:translate(-2px,1px) rotate(-1deg)}75%{transform:translate(2px,-1px) rotate(1deg)}}
        @keyframes ringExpand{0%{transform:scale(.5);opacity:.8}100%{transform:scale(2);opacity:0}}
        @keyframes countdown{0%{transform:scale(2);opacity:0}30%{transform:scale(1);opacity:1}80%{transform:scale(1);opacity:1}100%{transform:scale(.5);opacity:0}}
        @keyframes recordPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes pulseRing{0%{box-shadow:0 0 0 0 rgba(212,160,23,.55)}70%{box-shadow:0 0 0 8px rgba(212,160,23,0)}100%{box-shadow:0 0 0 0 rgba(212,160,23,0)}}
        @keyframes coinPop{0%{transform:scale(.5)}45%{transform:scale(1.35)}100%{transform:scale(1)}}
        @keyframes glow{0%,100%{box-shadow:0 0 16px rgba(212,160,23,.35),0 4px 16px rgba(212,160,23,.4)}50%{box-shadow:0 0 32px rgba(212,160,23,.75),0 4px 16px rgba(212,160,23,.6)}}
        @keyframes cookieIdle{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-7px) rotate(2deg)}}
        @keyframes sparkle{0%,100%{opacity:0;transform:scale(0) rotate(0)}50%{opacity:1;transform:scale(1) rotate(180deg)}}
        @keyframes confetti{0%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(var(--tx,0),var(--ty,80px)) rotate(720deg);opacity:0}}
        @keyframes fillBar{from{width:0}to{width:var(--w)}}
        @keyframes pop{0%{transform:scale(1)}50%{transform:scale(1.06)}100%{transform:scale(1)}}
        @keyframes gradientShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes ringRotate{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes livePulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.35)}}
        @keyframes marketTickIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cupShake{0%,100%{transform:translateX(0) rotate(0)}15%{transform:translateX(-6px) rotate(-3deg)}30%{transform:translateX(6px) rotate(3deg)}45%{transform:translateX(-5px) rotate(-2deg)}60%{transform:translateX(5px) rotate(2deg)}75%{transform:translateX(-2px) rotate(-1deg)}}
        @keyframes steamRise{0%{opacity:0;transform:translateY(0) scaleX(1)}30%{opacity:.55}100%{opacity:0;transform:translateY(-26px) scaleX(1.6)}}

        .su{animation:slideUp .35s ease-out both}
        .bi{animation:bounceIn .55s cubic-bezier(.36,.07,.19,.97) both}
        .fu{animation:floatUp .85s ease-out forwards;position:absolute;pointer-events:none;font-size:17px;font-weight:800;color:#D4A017;white-space:nowrap;z-index:10;text-shadow:0 1px 4px rgba(74,44,23,.4);left:50%;top:0}
        .float-anim{animation:float 3s ease-in-out infinite}
        .wiggle-anim{animation:wiggle .55s ease-in-out}
        .coin-pop{display:inline-block;animation:coinPop .42s cubic-bezier(.36,.07,.19,.97)}
        .cookie-idle{animation:cookieIdle 2.6s ease-in-out infinite}
        .glow-anim{animation:glow 2s ease-in-out infinite}
        .pulse-ring{animation:pulseRing 1.6s ease-in-out infinite}
        .live-pulse{animation:livePulse 1.8s ease-in-out infinite}
        .market-tick{animation:marketTickIn .4s ease-out both}
        .cup-shake{animation:cupShake .55s ease-in-out}
        .steam-rise{animation:steamRise 1.2s ease-out infinite}
        .sparkle-anim{animation:sparkle 1.8s ease-in-out infinite}
        .pop-anim{animation:pop .25s ease-out}
        .shimmer-bar{position:absolute;top:0;left:0;height:100%;width:50%;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.65) 50%,transparent 100%);animation:shimmer 2.6s ease-in-out infinite}
        .gradient-anim{background-size:200% 200%;animation:gradientShift 3.5s ease infinite}
        .stagger-1{animation-delay:.05s}.stagger-2{animation-delay:.1s}.stagger-3{animation-delay:.15s}.stagger-4{animation-delay:.2s}
        .confetti-piece{position:absolute;font-size:20px;pointer-events:none;animation:confetti 1.4s ease-out forwards}
        ::-webkit-scrollbar{width:0}
      `}</style>

      {/* HEADER */}
      <header style={{ padding:'18px 20px 10px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
          {userName && userAvatar !== null && (
            <button onClick={()=>setShowProfile(true)} aria-label="Profil" style={{ padding:0, background:'transparent', border:'none' }}>
              <AvatarFigure value={userAvatar} size={42} />
            </button>
          )}
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:3, marginBottom:1 }}>{userName ? `BONJOUR ${userName.toUpperCase()}` : 'BIENVENUE'}</div>
            <div style={{ fontSize:22, fontWeight:900, color:C.text, fontStyle:'italic', letterSpacing:'-0.5px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>Cooki<span style={{ color:'#C17F3C' }}>Trader</span></div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={()=>setShowSettings(true)} aria-label="Paramètres" style={{ width:34, height:34, borderRadius:11, background:C.card, border:`1px solid ${C.border}`, color:C.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Settings size={15} />
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:5, background:ESPRESSO, borderRadius:20, padding:'8px 12px', border:'1.5px solid rgba(212,160,23,.5)', boxShadow:'0 4px 12px rgba(74,44,23,.4)' }}>
            <Coffee size={14} color="#F0C050" />
            <span key={cafes} className="coin-pop" style={{ fontWeight:800, fontSize:15, color:'#F0C050', display:'inline-block', minWidth:10, textAlign:'center' }}>{cafes}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, background:GOLD, borderRadius:20, padding:'8px 14px', boxShadow:'0 4px 12px rgba(212,160,23,.35)' }} className="gradient-anim">
            <Cookie size={16} color="#fff" />
            <span key={coins} className="coin-pop" style={{ fontWeight:800, fontSize:18, color:'#fff', display:'inline-block', minWidth:14, textAlign:'center' }}>{coins}</span>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 16px', paddingBottom:104 }}>

        {/* ── ACCUEIL ── */}
        {tab==='accueil' && (
          <div className="su">
            {/* Level card */}
            <button onClick={()=>setShowLevels(true)} style={{ width:'100%', textAlign:'left', display:'block', borderRadius:24, padding:20, marginBottom:14, background:ESPRESSO, boxShadow:'0 8px 24px rgba(74,44,23,.35)', position:'relative', overflow:'hidden', cursor:'pointer' }}>
              <div style={{ position:'absolute', top:-25, right:-25, width:88, height:88, borderRadius:'50%', background:'rgba(255,255,255,.05)' }} />
              <div style={{ position:'absolute', top:14, right:16, fontSize:10, color:'rgba(255,255,255,.45)', display:'flex', alignItems:'center', gap:3, fontWeight:600 }}>
                Voir tous <ChevronLeft size={11} style={{ transform:'rotate(180deg)' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12, marginTop:14 }}>
                <div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:2, marginBottom:2 }}>NIVEAU {level}</div>
                  <div style={{ fontSize:21, fontWeight:800, color:'#fff' }}>{LEVEL_NAMES[level]}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.6)' }}>Total gagné</div>
                  <div style={{ fontSize:20, fontWeight:800, color:'#fff' }}>{totalEarned} 🍪</div>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,.6)', marginBottom:5 }}>
                <span>Expérience</span><span>{xp}/{xpReq}</span>
              </div>
              <div style={{ height:8, borderRadius:4, background:'rgba(255,255,255,.18)', overflow:'hidden', position:'relative' }}>
                <div style={{ height:'100%', borderRadius:4, width:`${xpPct}%`, background:'rgba(255,255,255,.85)', transition:'width .8s cubic-bezier(.36,.07,.19,.97)', position:'relative', overflow:'hidden' }}>
                  <div className="shimmer-bar" />
                </div>
              </div>
              {badges.length>0 && (
                <div style={{ display:'flex', gap:8, marginTop:10 }}>
                  {badges.map(b=><span key={b.id} title={b.name} style={{ fontSize:20 }}>{b.emoji}</span>)}
                </div>
              )}
            </button>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              {[
                { Icon:Flame, label:'Série',        value:streak,      sub:`jour${streak>1?'s':''} consécutif${streak>1?'s':''}`, col:'#E07040' },
                { Icon:Zap,   label:'Record clics', value:clickRecord, sub:'en 10 secondes',                                       col:'#D4A017' },
              ].map(({Icon,label,value,sub,col})=>(
                <div key={label} style={{ ...s.card, padding:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                    <Icon size={14} color={col} />
                    <span style={{ fontSize:11, color:C.muted, fontWeight:700 }}>{label}</span>
                  </div>
                  <div style={{ fontSize:28, fontWeight:800, color:C.text }}>{value}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Games */}
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>TON CAFÉ DU JOUR</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {GAMES.filter(g => g.id === 'checkin' || g.id === 'quiz').map((g,i)=>(
                <button key={g.id} onClick={()=>setGameView(g.id)} className={`su stagger-${i+1}`} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', ...s.card, textAlign:'left' }}>
                  <div className={g.avail?'float-anim':''} style={{ width:46, height:46, borderRadius:13, background:g.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:g.avail?'0 4px 12px rgba(0,0,0,.15)':'none' }}>
                    <g.Icon size={22} color="#fff" />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                      <span style={{ fontWeight:700, fontSize:14 }}>{g.title}</span>
                      {g.avail && <span className="pulse-ring" style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:GOLD, color:'#fff' }}>Dispo</span>}
                    </div>
                    <div style={{ fontSize:11, color:C.muted }}>{g.desc} · {g.reward}</div>
                  </div>
                  <ChevronLeft size={16} color={C.muted} style={{ transform:'rotate(180deg)' }} />
                </button>
              ))}
            </div>

            {/* Achievements (filtre les hidden non révélés) */}
            {(() => {
              const visibleAchievements = ACHIEVEMENTS.filter(a => !a.hidden || masterRevealed);
              const half = Math.ceil(visibleAchievements.length/2);
              const list = showAllAchievements ? visibleAchievements : visibleAchievements.slice(0, half);
              return (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:22, marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>MES SUCCÈS 🏆</div>
                    <div style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{earnedAchievements.length} / {visibleAchievements.length}</div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {list.map(a=>{
                      const got = earnedAchievements.includes(a.id);
                      return (
                        <div key={a.id} style={{ ...s.card, padding:'12px 12px', display:'flex', alignItems:'center', gap:10, opacity:got?1:.55, position:'relative', border:a.id==='master_succes' ? '1.5px solid rgba(212,160,23,.55)' : undefined }}>
                          <div style={{ fontSize:24, flexShrink:0, filter: got?'none':'grayscale(.7)' }}>{got?a.emoji:'🔒'}</div>
                          <div style={{ minWidth:0, flex:1 }}>
                            <div style={{ fontSize:11, fontWeight:800, color:C.text, lineHeight:1.2, marginBottom:2 }}>{a.name}</div>
                            <div style={{ fontSize:10, color:C.muted, lineHeight:1.3 }}>{a.desc}</div>
                            <div style={{ fontSize:10, color:'#D4A017', fontWeight:700, marginTop:3 }}>+{a.bonus} 🍪</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {visibleAchievements.length > half && (
                    <button
                      onClick={()=>setShowAllAchievements(v=>!v)}
                      style={{ width:'100%', marginTop:10, padding:'10px', borderRadius:12, background:'transparent', border:`1px dashed ${C.border}`, color:C.muted, fontSize:12, fontWeight:700, letterSpacing:.3 }}
                    >
                      {showAllAchievements ? 'Voir moins ↑' : `Voir plus (${visibleAchievements.length - half}) ↓`}
                    </button>
                  )}
                </>
              );
            })()}

          </div>
        )}

        {/* ── JEUX ── */}
        {tab==='jeux' && (
          <div className="su">
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:12, paddingTop:4 }}>CHOISIR UN JEU</div>
            {GAMES.filter(g => g.id !== 'checkin' && g.id !== 'quiz').map(g=>(
              <button key={g.id} onClick={()=>setGameView(g.id)} style={{ width:'100%', borderRadius:20, overflow:'hidden', boxShadow:'0 4px 16px rgba(0,0,0,.1)', marginBottom:12, textAlign:'left', display:'block' }}>
                <div style={{ padding:18, background:g.color, display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:54, height:54, borderRadius:16, background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <g.Icon size={26} color="#fff" />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:17, fontWeight:800, color:'#fff' }}>{g.title}</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', marginTop:2 }}>{g.desc}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,.6)' }}>Récompense</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{g.reward}</div>
                  </div>
                </div>
                <div style={{ padding:'10px 18px', background:C.card, borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:g.avail?'space-between':'flex-end', alignItems:'center' }}>
                  {g.avail && <span style={{ fontSize:12, fontWeight:700, color:'#D4A017', display:'flex', alignItems:'center', gap:5 }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#D4A017', display:'inline-block' }} />Disponible</span>}
                  <span style={{ fontSize:12, color:C.muted, fontWeight:600 }}>Jouer →</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── CLASSEMENT ── */}
        {tab==='classement' && (
          <ClassementTab
            leaderboard={leaderboard || []}
            user={{ name:userName, avatar:userAvatar, level, streak, totalEarned, clickRecord, marketRealized, cafes }}
            onOpenProfile={()=>setShowProfile(true)}
            C={C}
          />
        )}

        {/* ── MARCHÉ ── */}
        {tab==='marche' && (
          level >= 3 ? (
            <MarketTab
              coins={coins}
              currentPrice={currentPrice}
              priceHistory={priceHistory}
              ckmShares={ckmShares} setCkmShares={setCkmShares}
              ckmCostBasis={ckmCostBasis} setCkmCostBasis={setCkmCostBasis}
              marketTrades={marketTrades} setMarketTrades={setMarketTrades}
              marketRealized={marketRealized} setMarketRealized={setMarketRealized}
              marketHistory={marketHistory} setMarketHistory={setMarketHistory}
              event={marketEvent} eventTicks={marketEventTicks} bigMoveAt={marketBigMoveAt}
              onSpend={spendCoins} onEarn={addCoins} onAddCafe={addCafes}
              onInvest={(amount)=>setTotalInvested(t=>t+amount)}
              C={C}
            />
          ) : (
            <MarketLocked level={level} xp={xp} xpReq={xpReq} C={C} />
          )
        )}

        {/* ── BOUTIQUE ── */}
        {tab==='boutique' && (
          <BoutiqueTab
            coins={coins} cafes={cafes} unlocked={unlocked} level={level} onUnlock={unlockReward}
            mode={boutiqueMode} setMode={setBoutiqueMode}
            activeTheme={activeTheme} setActiveTheme={setActiveTheme}
            activeSkin={activeSkin}   setActiveSkin={setActiveSkin}
            activeRoue={activeRoue}   setActiveRoue={setActiveRoue}
            userAvatar={userAvatar}   setUserAvatar={setUserAvatar}
            C={C}
          />
        )}
      </div>

      {/* NAV */}
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, padding:'0 16px 16px', zIndex:40 }}>
        <div style={{ background:isDark?'rgba(30,16,10,.95)':'rgba(253,250,246,.95)', backdropFilter:'blur(12px)', borderRadius:24, border:`1px solid ${C.border}`, boxShadow:'0 8px 32px rgba(0,0,0,.12)', display:'flex', padding:8 }}>
          {[{id:'accueil',Icon:Home,label:'Accueil'},{id:'jeux',Icon:Gamepad2,label:'Jeux'},{id:'classement',Icon:Trophy,label:'Classement'},{id:'marche',Icon:TrendingUp,label:'Marché'},{id:'boutique',Icon:ShoppingBag,label:'Boutique'}].map(item=>{
            const showDot = item.id==='accueil' && (canCheckin || canQuiz);
            return (
              <button key={item.id} onClick={()=>setTab(item.id)} style={s.pill(tab===item.id)}>
                <span style={{ position:'relative', display:'inline-flex', lineHeight:0 }}>
                  <item.Icon size={20} />
                  {showDot && (
                    <span className="pulse-ring" style={{ position:'absolute', top:-3, right:-4, width:8, height:8, borderRadius:'50%', background:'#D4A017', boxShadow:'0 0 0 2px '+(isDark?'rgba(30,16,10,.95)':'rgba(253,250,246,.95)') }} />
                  )}
                </span>
                <span style={{ fontSize:11, fontWeight:700 }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* GAME OVERLAY */}
      {gameView && (
        <GameOverlay
          gameView={gameView} onClose={()=>setGameView(null)}
          coins={coins} streak={streak} canCheckin={canCheckin} canQuiz={canQuiz} clickRecord={clickRecord}
          onCheckin={doCheckin} checkinReward={checkinReward}
          onQuizEarn={addCoins} onQuizDone={()=>setLastQuiz(Date.now())} quizMsLeft={quizMsLeft}
          onSpinEarn={addCoins} onSpend={spendCoins}
          onClickEarn={addCoins} onUpdateRecord={s=>setClickRecord(r=>Math.max(r,s))}
          onJackpot={()=>{ triggerAchievement('jackpot'); }}
          activeSkin={activeSkin} activeRoue={activeRoue}
          C={C}
        />
      )}

      {/* SETTINGS OVERLAY */}
      {showSettings && (
        <SettingsOverlay
          onClose={()=>setShowSettings(false)}
          unlocked={unlocked}
          activeTheme={activeTheme} setActiveTheme={setActiveTheme}
          activeSkin={activeSkin}   setActiveSkin={setActiveSkin}
          activeRoue={activeRoue}   setActiveRoue={setActiveRoue}
          onReset={()=>{ resetProgress(); setShowSettings(false); }}
          C={C}
        />
      )}

      {/* PROFILE OVERLAY */}
      {showProfile && (
        <ProfileOverlay
          onClose={()=>setShowProfile(false)}
          onOpenLevels={()=>{ setShowProfile(false); setShowLevels(true); }}
          onOpenSettings={()=>{ setShowProfile(false); setShowSettings(true); }}
          userName={userName} setUserName={setUserName}
          userAvatar={userAvatar} setUserAvatar={setUserAvatar}
          joinDate={joinDate}
          level={level} xp={xp} xpReq={xpReq}
          totalEarned={totalEarned} streak={streak} unlocked={unlocked}
          earnedAchievements={earnedAchievements} achievementsTotal={ACHIEVEMENTS.filter(a => !a.hidden || masterRevealed).length}
          activeTheme={activeTheme} activeSkin={activeSkin} activeRoue={activeRoue}
          C={C}
        />
      )}

      {/* LEVELS MODAL */}
      {showLevels && <LevelsModal currentLevel={level} xp={xp} xpReq={xpReq} onClose={()=>setShowLevels(false)} C={C} />}

      {/* LEVEL UP MODAL */}
      {pendingLvUp && <LevelUpModal level={pendingLvUp} onCollect={()=>setPendingLvUp(null)} />}

      {/* ACHIEVEMENT MODAL */}
      {pendingAchievement && !pendingLvUp && (
        <AchievementModal achievement={pendingAchievement} onCollect={collectAchievement} />
      )}

      {/* CAFÉ TOAST — popup gain de CF */}
      {cafeToast && (
        <div
          key={cafeToast.key}
          aria-live="polite"
          style={{
            position:'fixed', top:88, left:'50%', zIndex:120,
            transform:'translateX(-50%)',
            display:'flex', alignItems:'center', gap:10,
            padding:'12px 22px', borderRadius:22,
            background:'linear-gradient(135deg,#1A0830 0%,#3D1A6B 50%,#5B2A9C 100%)',
            border:'2px solid rgba(212,160,23,.65)',
            boxShadow:'0 8px 28px rgba(74,44,23,.4), 0 0 24px rgba(212,160,23,.5)',
            color:'#F0E0FF', pointerEvents:'none',
            animation:'cafeToastIn .45s cubic-bezier(.36,.07,.19,.97) both'
          }}
        >
          <span style={{ fontSize:24 }}>☕</span>
          <div>
            <div style={{ fontSize:9, fontWeight:800, color:'#F0C050', letterSpacing:2, textTransform:'uppercase' }}>Nouveau gain</div>
            <div style={{ fontSize:18, fontWeight:900, color:'#FFE89A', lineHeight:1, marginTop:2 }}>
              +{cafeToast.amount} <span style={{ fontSize:13, color:'rgba(255,232,154,.85)' }}>CF</span>
            </div>
          </div>
          <span className="sparkle-anim" style={{ fontSize:14, color:'#F0C050', filter:'drop-shadow(0 0 6px rgba(212,160,23,.7))' }}>✨</span>
        </div>
      )}

      {/* ONBOARDING MODAL */}
      {showOnboarding && (
        <OnboardingModal
          C={C}
          onComplete={(name, avatarIndex)=>{
            setUserName(name);
            setUserAvatar(avatarIndex);
            if(!joinDate) setJoinDate(new Date().toLocaleDateString('fr-FR'));
            /* 🔑 Code dev — bonus de test si prénom == "cookithan" */
            if(name.trim().toLowerCase() === 'cookithan'){
              setCoins(c => c + 1000);
              setTotalEarned(t => t + 1000);
              addCafes(30);
              /* Niveau max sans bonus de level-up qui s'enchaîne */
              setLevel(6);
              setXp(0);
              /* Débloque aussi la révélation du succès caché et le marque gagné */
              setUnlocked(u => u.includes('reveal_master') ? u : [...u, 'reveal_master']);
              /* Tous les succès marqués comme déjà gagnés → pas de modale en cascade */
              setEarnedAchievements(ACHIEVEMENTS.map(a => a.id));
              setPendingAchievement(null);
            }
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   LEVELS MODAL — révèle les paliers au fur et à mesure
════════════════════════════════════════════════════ */
function LevelsModal({ currentLevel, xp, xpReq, onClose, C }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.78)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:80, backdropFilter:'blur(6px)', padding:18 }}>
      <div onClick={e=>e.stopPropagation()} className="bi" style={{ background:C.card, borderRadius:24, padding:'22px 18px 18px', width:'100%', maxWidth:380, maxHeight:'85vh', overflowY:'auto', border:`1px solid ${C.border}`, boxShadow:'0 24px 64px rgba(0,0,0,.45)' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>PROGRESSION</div>
            <div style={{ fontSize:18, fontWeight:800, color:C.text, marginTop:2 }}>Les 6 niveaux</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ width:32, height:32, borderRadius:11, background:C.card2, color:C.text, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ChevronLeft size={18} style={{ transform:'rotate(180deg)' }} />
          </button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3,4,5,6].map(n => {
            const passed   = n < currentLevel;
            const isCurrent = n === currentLevel;
            const locked   = n > currentLevel;
            const req      = n * 100;

            return (
              <div key={n} className={isCurrent ? 'pulse-ring' : ''} style={{
                display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:16,
                background: passed ? 'rgba(212,160,23,.08)' : isCurrent ? ESPRESSO : C.card2,
                border: `2px solid ${isCurrent ? '#D4A017' : passed ? 'rgba(212,160,23,.3)' : C.border}`,
                opacity: locked ? .65 : 1,
                transition:'all .25s'
              }}>
                <div style={{
                  width:42, height:42, borderRadius:13, flexShrink:0,
                  background: passed ? GOLD : isCurrent ? 'rgba(212,160,23,.25)' : C.card,
                  border: passed ? 'none' : `2px solid ${isCurrent ? '#D4A017' : C.border}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:800, fontSize:16,
                  color: passed ? '#fff' : isCurrent ? '#D4A017' : C.muted,
                }}>
                  {locked ? <Lock size={16} /> : n}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', color: isCurrent ? 'rgba(255,255,255,.6)' : C.muted, marginBottom:2 }}>
                    Niveau {n}
                  </div>
                  <div style={{ fontSize:15, fontWeight:800, color: isCurrent ? '#fff' : passed ? C.text : locked ? C.muted : C.text, letterSpacing: locked ? 4 : 0 }}>
                    {locked ? '? ? ?' : LEVEL_NAMES[n]}
                  </div>
                  {isCurrent && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,.6)', marginBottom:3 }}>
                        <span>XP</span><span>{xp}/{xpReq}</span>
                      </div>
                      <div style={{ height:5, borderRadius:3, background:'rgba(255,255,255,.18)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:3, width:`${Math.min((xp/xpReq)*100,100)}%`, background:'#D4A017', transition:'width .6s' }} />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ flexShrink:0, textAlign:'right' }}>
                  {passed && <span style={{ fontSize:11, fontWeight:700, color:'#D4A017', display:'flex', alignItems:'center', gap:3 }}><Check size={11} color="#D4A017" /> Atteint</span>}
                  {isCurrent && <span style={{ fontSize:11, fontWeight:700, color:'#D4A017', background:'rgba(212,160,23,.2)', padding:'3px 8px', borderRadius:8 }}>En cours</span>}
                  {locked && <span style={{ fontSize:10, color:C.muted, fontWeight:600 }}>{req} XP</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop:14, padding:'10px 12px', borderRadius:12, background:C.card2, fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center' }}>
          Atteins chaque niveau pour révéler son nom et débloquer un bonus de cookies.
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   SETTINGS OVERLAY
════════════════════════════════════════════════════ */
function SettingsOverlay({ onClose, unlocked, activeTheme, setActiveTheme, activeSkin, setActiveSkin, activeRoue, setActiveRoue, onReset, C }) {
  const [confirming, setConfirming] = useState(false);
  const [appearanceTab, setAppearanceTab] = useState('themes'); // 'themes' | 'skins' | 'roues'

  const unlockedThemes = REWARDS.filter(r => unlocked.includes(r.id) && (r.type==='Thème' || (r.type==='Premium' && r.applyAs==='theme')));
  const unlockedSkins  = REWARDS.filter(r => unlocked.includes(r.id) && (r.type==='Skin'  || (r.type==='Premium' && r.applyAs==='skin')));
  const unlockedRoues  = REWARDS.filter(r => unlocked.includes(r.id) && r.type==='Roue');

  const renderItem = (item, isActive, onToggle, swatch) => (
    <button
      key={item.id}
      onClick={onToggle}
      style={{
        display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:12,
        background: isActive ? 'rgba(212,160,23,.12)' : 'transparent',
        border: `1.5px solid ${isActive ? '#D4A017' : C.border}`,
        cursor:'pointer', textAlign:'left', width:'100%'
      }}
    >
      {swatch}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{item.name.replace(/^(Thème|Cookie|Roue)\s+/, '')}</div>
        <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{item.desc}</div>
      </div>
      {isActive && <Check size={16} color="#D4A017" />}
    </button>
  );

  const defaultRow = (label, sub, isActive, onClick) => (
    <button
      onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:12,
        background: isActive ? 'rgba(212,160,23,.12)' : 'transparent',
        border: `1.5px solid ${isActive ? '#D4A017' : C.border}`,
        cursor:'pointer', textAlign:'left', width:'100%'
      }}
    >
      <div style={{ width:36, height:36, borderRadius:10, background:LT.bg, border:`1px solid ${LT.border}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:C.muted }}>—</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{label}</div>
        <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{sub}</div>
      </div>
      {isActive && <Check size={16} color="#D4A017" />}
    </button>
  );

  const themeSwatch = (id) => {
    const palette = THEMES[id];
    const swatchBg = palette ? palette.bg : LT.bg;
    const filter = palette && palette.hueRotate ? `hue-rotate(${palette.hueRotate}deg) saturate(${palette.saturate||1})` : 'none';
    return <div style={{ width:36, height:36, borderRadius:10, background:swatchBg, border:`1px solid ${palette?palette.border:C.border}`, flexShrink:0, filter }} />;
  };
  const skinSwatch = (item) => {
    const cfg = COOKIE_SKINS[item.id];
    const bg = cfg ? `radial-gradient(circle at 35% 30%, ${cfg.body[0].c}, ${cfg.body[cfg.body.length-1].c})` : 'linear-gradient(135deg,#E8B57A,#6B3812)';
    return <div style={{ width:36, height:36, borderRadius:'50%', background:bg, border:`1.5px solid ${cfg?cfg.ring:'#3D2010'}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{item.emoji}</div>;
  };
  const roueSwatch = (item) => (
    <div style={{ width:36, height:36, borderRadius:'50%', background:'conic-gradient(#4A2C17, #C17F3C, #D4A017, #6B3D20, #4A2C17)', border:`1.5px solid #3D2010`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{item.emoji}</div>
  );

  const TABS = [
    { id:'themes', label:'Thèmes',       icon:'🎨', count:unlockedThemes.length },
    { id:'skins',  label:'Skins cookie', icon:'🍪', count:unlockedSkins.length  },
    { id:'roues',  label:'Skins roue',   icon:'🎯', count:unlockedRoues.length  },
  ];

  return (
    <div style={{ position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, bottom:0, background:C.bg, zIndex:60, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:`1px solid ${C.border}`, background:C.card, flexShrink:0 }}>
        <button onClick={onClose} style={{ width:36, height:36, borderRadius:12, background:C.card2, display:'flex', alignItems:'center', justifyContent:'center', color:C.text }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontSize:17, fontWeight:700, color:C.text, flex:1 }}>Paramètres</span>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:18 }}>

        {/* Apparence */}
        <section>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>APPARENCE</div>

          {/* Onglets segmentés */}
          <div style={{ display:'flex', gap:6, padding:4, borderRadius:14, background:C.card2, marginBottom:10 }}>
            {TABS.map(t => {
              const active = appearanceTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={()=>setAppearanceTab(t.id)}
                  style={{
                    flex:1, padding:'8px 4px', borderRadius:10,
                    fontSize:11, fontWeight:800, letterSpacing:.3,
                    background: active ? GOLD : 'transparent',
                    color: active ? '#fff' : C.text,
                    boxShadow: active ? '0 4px 10px rgba(212,160,23,.35)' : 'none',
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5
                  }}
                >
                  <span style={{ fontSize:13 }}>{t.icon}</span>
                  <span>{t.label}</span>
                  <span style={{ fontSize:10, opacity:.85 }}>({t.count})</span>
                </button>
              );
            })}
          </div>

          {/* Contenu de l'onglet actif */}
          <div style={{ borderRadius:16, background:C.card, border:`1px solid ${C.border}`, padding:14, display:'flex', flexDirection:'column', gap:10 }}>

            {appearanceTab === 'themes' && (
              <>
                {defaultRow('Défaut', 'Crème classique', activeTheme==='', ()=>setActiveTheme(''))}
                {unlockedThemes.length === 0 ? (
                  <div style={{ display:'flex', alignItems:'center', gap:10, color:C.muted, fontSize:12, padding:'8px 4px', fontStyle:'italic' }}>
                    <Lock size={14} /> Débloque des thèmes en boutique pour les activer ici.
                  </div>
                ) : (
                  unlockedThemes.map(t => renderItem(
                    t, activeTheme === t.id,
                    ()=>setActiveTheme(activeTheme === t.id ? '' : t.id),
                    themeSwatch(t.id)
                  ))
                )}
              </>
            )}

            {appearanceTab === 'skins' && (
              <>
                {defaultRow('Cookie classique', 'Skin par défaut', activeSkin==='', ()=>setActiveSkin(''))}
                {unlockedSkins.length === 0 ? (
                  <div style={{ display:'flex', alignItems:'center', gap:10, color:C.muted, fontSize:12, padding:'8px 4px', fontStyle:'italic' }}>
                    <Lock size={14} /> Débloque des skins en boutique pour les activer ici.
                  </div>
                ) : (
                  unlockedSkins.map(s => renderItem(
                    s, activeSkin === s.id,
                    ()=>setActiveSkin(activeSkin === s.id ? '' : s.id),
                    skinSwatch(s)
                  ))
                )}
              </>
            )}

            {appearanceTab === 'roues' && (
              <>
                {defaultRow('Roue classique', 'Apparence par défaut', activeRoue==='', ()=>setActiveRoue(''))}
                {unlockedRoues.length === 0 ? (
                  <div style={{ display:'flex', alignItems:'center', gap:10, color:C.muted, fontSize:12, padding:'8px 4px', fontStyle:'italic' }}>
                    <Lock size={14} /> Débloque des skins de roue en boutique pour les activer ici.
                  </div>
                ) : (
                  unlockedRoues.map(r => renderItem(
                    r, activeRoue === r.id,
                    ()=>setActiveRoue(activeRoue === r.id ? '' : r.id),
                    roueSwatch(r)
                  ))
                )}
              </>
            )}

          </div>
        </section>

        {/* Données */}
        <section>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>DONNÉES</div>
          <div style={{ borderRadius:16, background:C.card, border:`1px solid ${C.border}`, padding:16 }}>
            <div style={{ fontSize:13, color:C.text, marginBottom:4 }}>Sauvegarde locale</div>
            <div style={{ fontSize:11, color:C.muted, lineHeight:1.5 }}>
              Ta progression est enregistrée automatiquement dans ce navigateur. Elle est conservée même après fermeture, mais ne suit pas entre appareils.
            </div>
          </div>
        </section>

        {/* Zone à risque — repoussée tout en bas, palette espresso, double validation */}
        <section style={{ marginTop:'auto', paddingTop:14, borderTop:`1px dashed ${C.border}` }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
            <AlertTriangle size={11} /> ZONE SENSIBLE
          </div>

          {!confirming ? (
            <button onClick={()=>setConfirming(true)} style={{ width:'100%', padding:11, borderRadius:12, background:'transparent', border:`1px dashed ${C.border}`, color:C.muted, fontWeight:500, fontSize:12, letterSpacing:.2 }}>
              Réinitialiser ma progression
            </button>
          ) : (
            <div style={{ borderRadius:14, padding:14, background:'linear-gradient(135deg,#3D2010,#2A1508)', border:'1px solid #4A2C17' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#F0E0C0', marginBottom:6 }}>Tout effacer ?</div>
              <div style={{ fontSize:11, color:'rgba(240,224,192,.7)', lineHeight:1.5, marginBottom:14 }}>
                Cookies, niveau, série, record, récompenses débloquées et thème seront définitivement perdus. Cette action est irréversible.
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>setConfirming(false)} style={{ flex:1, padding:10, borderRadius:11, background:'rgba(240,224,192,.1)', color:'#F0E0C0', fontWeight:700, fontSize:12, border:'1px solid rgba(240,224,192,.2)' }}>
                  Annuler
                </button>
                <button onClick={onReset} style={{ flex:1, padding:10, borderRadius:11, background:'#1A0E08', color:'#A88060', fontWeight:700, fontSize:12, border:'1px solid #3D2010' }}>
                  Tout effacer
                </button>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PROFILE OVERLAY
════════════════════════════════════════════════════ */
function ProfileOverlay({
  onClose, onOpenLevels, onOpenSettings,
  userName, setUserName, userAvatar, setUserAvatar, joinDate,
  level, xp, xpReq, totalEarned, streak, unlocked,
  earnedAchievements, achievementsTotal,
  activeTheme, activeSkin, activeRoue,
  C
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editAvatar, setEditAvatar] = useState(userAvatar);

  const xpPct = Math.min((xp/xpReq)*100, 100);
  const badges = REWARDS.filter(r => r.type==='Badge'  && unlocked.includes(r.id));
  const titres = REWARDS.filter(r => r.type==='Titre'  && unlocked.includes(r.id));
  const ownedAvatars = REWARDS.filter(r => (r.type==='Avatar' || (r.type==='Premium' && r.applyAs==='avatar')) && unlocked.includes(r.id));

  /* Liste de tous les choix d'avatar : 4 base + premium débloqués */
  const avatarChoices = [
    ...ONBOARDING_AVATARS.map((a,i)=>({ value:i, ...a })),
    ...ownedAvatars.map(r => ({ value:r.id, ...AVATAR_PREMIUM[r.id] })),
  ];

  const equipment = [
    { label:'Avatar', kind:'avatar', value:userAvatar },
    { label:'Thème',  kind:'item',   id:activeTheme, item: activeTheme ? REWARDS.find(r=>r.id===activeTheme) : null },
    { label:'Skin',   kind:'item',   id:activeSkin,  item: activeSkin  ? REWARDS.find(r=>r.id===activeSkin)  : null },
    { label:'Roue',   kind:'item',   id:activeRoue,  item: activeRoue  ? REWARDS.find(r=>r.id===activeRoue)  : null },
  ];

  const saveEdit = () => {
    const trimmed = editName.trim();
    if(!trimmed || editAvatar===null) return;
    setUserName(trimmed);
    setUserAvatar(editAvatar);
    setEditing(false);
  };

  return (
    <div style={{ position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, bottom:0, background:C.bg, zIndex:60, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:`1px solid ${C.border}`, background:C.card, flexShrink:0 }}>
        <button onClick={onClose} style={{ width:36, height:36, borderRadius:12, background:C.card2, display:'flex', alignItems:'center', justifyContent:'center', color:C.text }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontSize:17, fontWeight:700, color:C.text, flex:1 }}>{editing ? 'Modifier mon profil' : 'Mon profil'}</span>
        {!editing && (
          <button onClick={onOpenSettings} aria-label="Paramètres" style={{ width:34, height:34, borderRadius:11, background:C.card2, color:C.muted, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Settings size={15} />
          </button>
        )}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'18px 18px 28px', display:'flex', flexDirection:'column', gap:18 }}>

        {editing ? (
          <>
            <section>
              <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:8 }}>PRÉNOM</div>
              <input
                value={editName}
                onChange={e=>setEditName(e.target.value)}
                maxLength={20}
                style={{ width:'100%', padding:'14px 16px', borderRadius:14, border:`2px solid ${C.border}`, background:C.card, color:C.text, fontSize:15, fontWeight:600, outline:'none', fontFamily:'inherit' }}
              />
            </section>
            <section>
              <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:8 }}>AVATAR</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10 }}>
                {avatarChoices.map(a => {
                  const sel = editAvatar===a.value;
                  return (
                    <button key={String(a.value)} onClick={()=>setEditAvatar(a.value)} className={sel?'pulse-ring':''} style={{ aspectRatio:'1', borderRadius:'50%', background:a.bg, border:`3px solid ${sel?'#D4A017':'transparent'}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:sel?'0 4px 16px rgba(212,160,23,.45)':'0 2px 6px rgba(0,0,0,.15)', transition:'all .2s' }}>
                      {a.kind==='emoji'
                        ? <span style={{ fontSize:28, lineHeight:1 }}>{a.emoji}</span>
                        : <User size={32} color={a.stroke} strokeWidth={2.2} />}
                    </button>
                  );
                })}
              </div>
              {avatarChoices.length === 4 && (
                <div style={{ fontSize:11, color:C.muted, marginTop:10, fontStyle:'italic', textAlign:'center' }}>
                  Débloque plus d'avatars dans la boutique ✨
                </div>
              )}
            </section>
            <div style={{ display:'flex', gap:10, marginTop:'auto' }}>
              <button onClick={()=>{ setEditing(false); setEditName(userName); setEditAvatar(userAvatar); }} style={{ flex:1, padding:'13px 0', borderRadius:14, background:'transparent', border:`1.5px solid ${C.border}`, color:C.muted, fontSize:14, fontWeight:700 }}>
                Annuler
              </button>
              <button onClick={saveEdit} disabled={!editName.trim() || editAvatar===null} style={{ flex:1, padding:'13px 0', borderRadius:14, background: (!editName.trim()||editAvatar===null) ? C.card2 : GOLD, color: (!editName.trim()||editAvatar===null) ? C.muted : '#fff', border:'none', fontSize:14, fontWeight:800, cursor:(!editName.trim()||editAvatar===null)?'not-allowed':'pointer' }}>
                Enregistrer
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Identité */}
            <section style={{ textAlign:'center', paddingTop:6 }}>
              <div style={{ margin:'0 auto 14px', display:'inline-flex' }}>
                <AvatarFigure value={userAvatar} size={108} />
              </div>
              <div style={{ fontSize:24, fontWeight:900, color:C.text, marginBottom:4 }}>{userName || 'Joueur'}</div>
              {joinDate && (
                <div style={{ fontSize:11, color:C.muted }}>Membre depuis le {joinDate}</div>
              )}
              <div style={{ marginTop:10, display:'inline-block', padding:'5px 14px', borderRadius:14, background:'rgba(212,160,23,.12)', border:'1px solid rgba(212,160,23,.45)' }}>
                <span style={{ fontSize:12, fontWeight:800, color:'#D4A017', letterSpacing:.5 }}>{LEVEL_NAMES[level]}</span>
              </div>
            </section>

            {/* Niveau */}
            <section>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>NIVEAU {level}</div>
                <div style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{xp} / {xpReq} XP</div>
              </div>
              <div style={{ height:8, borderRadius:4, background:C.card2, overflow:'hidden', marginBottom:10 }}>
                <div style={{ height:'100%', width:`${xpPct}%`, background:GOLD, transition:'width .8s cubic-bezier(.36,.07,.19,.97)' }} />
              </div>
              <button onClick={onOpenLevels} style={{ width:'100%', padding:'10px', borderRadius:12, background:'transparent', border:`1.5px solid ${C.border}`, color:C.text, fontSize:12, fontWeight:700 }}>
                Voir les niveaux →
              </button>
            </section>

            {/* Stats */}
            <section>
              <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>STATISTIQUES</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { label:'Total gagné', value:totalEarned, sub:'cookies', col:'#D4A017' },
                  { label:'Série',        value:streak,      sub:`jour${streak>1?'s':''}`, col:'#E07040' },
                  { label:'Succès',       value:`${earnedAchievements.length}/${achievementsTotal}`, sub:'débloqués', col:'#C17F3C' },
                  { label:'Items',        value:`${unlocked.length}/${REWARDS.length}`, sub:'possédés', col:'#7D4E1F' },
                ].map(st => (
                  <div key={st.label} style={{ borderRadius:14, background:C.card, border:`1px solid ${C.border}`, padding:'12px 14px' }}>
                    <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:4 }}>{st.label}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:st.col, lineHeight:1.1 }}>{st.value}</div>
                    <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{st.sub}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Équipement */}
            <section>
              <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>ÉQUIPEMENT</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
                {equipment.map(e => (
                  <div key={e.label} style={{ borderRadius:12, background:C.card, border:`1px solid ${C.border}`, padding:'10px 6px', textAlign:'center', minHeight:72, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}>
                    {e.kind === 'avatar'
                      ? <AvatarFigure value={e.value} size={32} />
                      : <div style={{ fontSize:22 }}>{e.item ? e.item.emoji : '–'}</div>
                    }
                    <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:.5, textTransform:'uppercase' }}>{e.label}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Titres débloqués */}
            {titres.length > 0 && (
              <section>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>MES TITRES</div>
                  <div style={{ fontSize:11, color:C.muted }}>{titres.length}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {titres.map(t => (
                    <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:C.card, border:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:18 }}>{t.emoji}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{t.name.replace(/^Titre\s+"?|"$/g, '').replace(/"$/, '')}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Badges */}
            <section>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>MES BADGES</div>
                <div style={{ fontSize:11, color:C.muted }}>{badges.length}</div>
              </div>
              {badges.length === 0 ? (
                <div style={{ fontSize:12, color:C.muted, fontStyle:'italic', padding:'10px 4px' }}>Aucun badge encore — direction la boutique !</div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
                  {badges.map(b => (
                    <div key={b.id} style={{ borderRadius:12, background:C.card, border:'1px solid rgba(212,160,23,.4)', padding:'10px 4px', textAlign:'center' }}>
                      <div style={{ fontSize:24, marginBottom:4 }}>{b.emoji}</div>
                      <div style={{ fontSize:9, fontWeight:700, color:C.text, lineHeight:1.2 }}>{b.name.replace(/^Badge\s+/, '')}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <button onClick={()=>setEditing(true)} style={{ width:'100%', padding:'13px 0', borderRadius:14, background:'transparent', border:`1.5px solid ${C.border}`, color:C.text, fontSize:13, fontWeight:700, marginTop:6 }}>
              Modifier mon profil
            </button>
          </>
        )}

      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   BOUTIQUE TAB
════════════════════════════════════════════════════ */
function BoutiqueTab({ coins, cafes, unlocked, level, onUnlock, mode, setMode, activeTheme, activeSkin, activeRoue, userAvatar, setActiveTheme, setActiveSkin, setActiveRoue, setUserAvatar, C }) {
  const [filter, setFilter] = useState('Tous');
  /* Snapshot des items déjà achetés au mount : on les cache de la boutique
     (l'utilisateur les retrouve dans Profil ou Paramètres). Achats faits
     pendant cette session restent visibles jusqu'au prochain mount. */
  const [initialUnlocked] = useState(unlocked);
  const FILTERS = ['Tous','Badge','Titre','Thème','Avatar','Skin','Roue'];

  const ACTIVATABLE = {
    'Thème' :[activeTheme, setActiveTheme],
    'Skin'  :[activeSkin,  setActiveSkin],
    'Roue'  :[activeRoue,  setActiveRoue],
    /* Avatar : pas de désactivation possible, juste switch (gère plus bas) */
    'Avatar':[userAvatar,  setUserAvatar],
  };

  /* Révèle un niveau de plus uniquement quand tout celui en cours est acheté
     (n'inclut PAS les items premium) */
  let revealedLevel = 1;
  for(let n=1; n<=level; n++){
    const itemsAtN = REWARDS.filter(r => r.levelRequired === n && r.currency !== 'cafe');
    revealedLevel = n;
    if(!itemsAtN.every(it => unlocked.includes(it.id))) break;
  }

  let visible;
  if(mode === 'premium'){
    visible = REWARDS.filter(r => r.currency === 'cafe' && !initialUnlocked.includes(r.id));
  } else {
    visible = REWARDS.filter(r => r.currency !== 'cafe' && !initialUnlocked.includes(r.id) && r.levelRequired <= revealedLevel);
  }
  const filtered = mode === 'premium' || filter==='Tous' ? visible : visible.filter(r=>r.type===filter);
  const shown = [...filtered].sort((a,b)=>{
    const ua = unlocked.includes(a.id), ub = unlocked.includes(b.id);
    if(ua !== ub) return ua ? -1 : 1;
    if(a.levelRequired !== b.levelRequired) return a.levelRequired - b.levelRequired;
    return a.cost - b.cost;
  });

  return (
    <div className="su" style={{ position:'relative' }}>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, paddingTop:4 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>BOUTIQUE</div>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, fontWeight:700, color:C.text }}>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}><Coffee size={13} color="#F0C050" /> {cafes}</span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}><Cookie size={14} color="#D4A017" /> {coins}</span>
        </div>
      </div>

      {/* Toggle Boutique / Premium */}
      <div style={{ display:'flex', gap:6, padding:4, borderRadius:14, background:C.card2, marginBottom:14 }}>
        <button
          onClick={()=>setMode('shop')}
          style={{
            flex:1, padding:'10px 0', borderRadius:10, fontSize:13, fontWeight:800, letterSpacing:.4,
            background: mode==='shop' ? GOLD : 'transparent',
            color: mode==='shop' ? '#fff' : C.text,
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            boxShadow: mode==='shop' ? '0 4px 12px rgba(212,160,23,.4)' : 'none', cursor:'pointer'
          }}
        >
          <Cookie size={14} color={mode==='shop' ? '#fff' : C.muted} />
          BOUTIQUE
        </button>
        <button
          onClick={()=>setMode('premium')}
          style={{
            flex:1, padding:'10px 0', borderRadius:10, fontSize:13, fontWeight:800, letterSpacing:.4,
            background: mode==='premium' ? ESPRESSO : 'transparent',
            color: mode==='premium' ? '#F0C050' : C.text,
            border: mode==='premium' ? '1.5px solid rgba(212,160,23,.55)' : '1.5px solid transparent',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            boxShadow: mode==='premium' ? '0 4px 14px rgba(74,44,23,.5)' : 'none', cursor:'pointer'
          }}
        >
          <Coffee size={14} color={mode==='premium' ? '#F0C050' : C.muted} />
          PREMIUM
        </button>
      </div>

      {/* Bandeau Premium (mode='premium' uniquement) */}
      {mode === 'premium' && (
        <div className="su" style={{
          padding:'14px 16px', borderRadius:16, marginBottom:14,
          background:ESPRESSO, border:'1.5px solid rgba(212,160,23,.45)',
          boxShadow:'0 0 20px rgba(212,160,23,.25)',
          display:'flex', alignItems:'center', gap:12
        }}>
          <Coffee size={28} color="#F0C050" />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'#F0C050', letterSpacing:1.5 }}>EXCLUSIF</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.85)', marginTop:2, lineHeight:1.4 }}>
              Items rares payés en cafés ☕. Gagne-en au level-up, achievements et jackpot.
            </div>
          </div>
        </div>
      )}

      {/* Pills (uniquement en mode shop) */}
      {mode === 'shop' && (
        <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:2 }}>
          {FILTERS.map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700, whiteSpace:'nowrap', background:filter===f?GOLD:C.card, color:filter===f?'#fff':C.muted, border:`1px solid ${filter===f?'transparent':C.border}`, transition:'all .2s' }}>{f}</button>
          ))}
        </div>
      )}
      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {shown.map((r,i)=>{
          const isPremium  = r.currency === 'cafe';
          const isUnlocked = unlocked.includes(r.id);
          const lvOK       = level >= r.levelRequired;
          const canAfford  = isPremium ? cafes >= r.cost : coins >= r.cost;
          const lvLocked   = !lvOK && !isUnlocked;
          /* Pour les premium : on regarde applyAs pour piocher le bon activator */
          const activeKey  = isPremium
            ? (r.applyAs==='theme'  ? 'Thème'
              : r.applyAs==='skin'  ? 'Skin'
              : r.applyAs==='avatar'? 'Avatar'
              : null)
            : r.type;
          const activatable = ACTIVATABLE[activeKey];
          const isActive    = activatable && activatable[0] === r.id;

          return (
            <div key={r.id} className={`su stagger-${(i%4)+1}`} style={{
              borderRadius:18, padding:16,
              background: isPremium ? `linear-gradient(160deg, ${C.card}, ${C.card2})` : C.card,
              border:`2px solid ${isUnlocked?'#D4A017': isPremium ? 'rgba(212,160,23,.55)' : C.border}`,
              boxShadow: isUnlocked
                ? '0 0 20px rgba(212,160,23,.25)'
                : isPremium ? '0 0 18px rgba(74,44,23,.18)' : '0 2px 8px rgba(0,0,0,.04)',
              transition:'all .3s', position:'relative', overflow:'hidden',
              opacity:lvLocked ? .55 : 1
            }}>
              {isPremium && !isUnlocked && (
                <span style={{ position:'absolute', top:8, right:10, fontSize:9, fontWeight:800, padding:'3px 7px', borderRadius:8, background:ESPRESSO, color:'#F0C050', letterSpacing:.5 }}>PREMIUM</span>
              )}
              {isUnlocked && <span className="sparkle-anim" style={{ position:'absolute', top:8, right:10, fontSize:14, animationDelay:`${i*0.3}s` }}>✨</span>}
              <div className={isUnlocked ? 'float-anim' : ''} style={{ fontSize:30, marginBottom:8, display:'inline-block', filter:lvLocked?'grayscale(.7)':'none' }}>{lvLocked ? '🔒' : r.emoji}</div>
              <div style={{ fontWeight:700, fontSize:13, color:C.text, marginBottom:3 }}>{r.name}</div>
              <div style={{ fontSize:11, color:C.muted, marginBottom:12 }}>{r.desc}</div>

              {isUnlocked ? (
                activatable ? (
                  <button
                    onClick={()=>{
                      const isAvatar = activeKey === 'Avatar';
                      if(isAvatar){ if(!isActive) activatable[1](r.id); }
                      else activatable[1](isActive ? '' : r.id);
                    }}
                    disabled={activeKey === 'Avatar' && isActive}
                    style={{
                      width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:700,
                      background: isActive ? GOLD : 'transparent',
                      color: isActive ? '#fff' : '#D4A017',
                      border: `1.5px solid ${isActive ? 'transparent' : '#D4A017'}`,
                      display:'flex', alignItems:'center', justifyContent:'center', gap:5, cursor: activeKey === 'Avatar' && isActive ? 'default' : 'pointer'
                    }}
                  >
                    {isActive ? <><Check size={12} color="#fff" /> {activeKey === 'Avatar' ? 'Porté' : 'Activé'}</> : 'Activer'}
                  </button>
                ) : (
                  <div style={{ fontSize:12, fontWeight:700, color:'#D4A017', display:'flex', alignItems:'center', gap:4 }}><Check size={12} color="#D4A017" /> Débloqué</div>
                )
              ) : lvLocked ? (
                <div style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:700, background:C.card2, color:'#D4A017', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                  <Lock size={11} color="#D4A017" /> Niveau {r.levelRequired} requis
                </div>
              ) : isPremium ? (
                <button onClick={()=>onUnlock(r.id)} className={canAfford ? 'pulse-ring' : ''} style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:800, background:canAfford?ESPRESSO:C.card2, color:canAfford?'#F0C050':C.muted, border:`1.5px solid ${canAfford?'rgba(212,160,23,.5)':C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:5, cursor:canAfford?'pointer':'not-allowed' }}>
                  {canAfford?<Coffee size={11} color="#F0C050"/>:<Lock size={11}/>} {r.cost} cafés
                </button>
              ) : (
                <button onClick={()=>onUnlock(r.id)} className={canAfford ? 'pulse-ring' : ''} style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:700, background:canAfford?GOLD:C.card2, color:canAfford?'#fff':C.muted, border:`1px solid ${canAfford?'transparent':C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:4, cursor:canAfford?'pointer':'not-allowed' }}>
                  {canAfford?<Cookie size={11} color="#fff"/>:<Lock size={11}/>} {r.cost} cookies
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state quand tout est déjà acheté */}
      {shown.length === 0 && (
        <div style={{ textAlign:'center', padding:'30px 20px', borderRadius:16, background:C.card, border:`1px dashed ${C.border}`, color:C.muted }}>
          <div style={{ fontSize:36, marginBottom:8 }}>{mode==='premium' ? '☕' : '🛍️'}</div>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>
            {mode==='premium' ? 'Aucun item premium dispo' : 'Rien de nouveau ici'}
          </div>
          <div style={{ fontSize:11, lineHeight:1.5, maxWidth:260, margin:'0 auto' }}>
            {mode==='premium'
              ? 'Tu as déjà tout débloqué côté premium.'
              : 'Tu as déjà tout débloqué pour ton niveau. Monte de niveau pour de nouvelles récompenses !'}
            <br/>
            Retrouve tes items dans <strong style={{ color:C.text }}>Profil</strong> ou <strong style={{ color:C.text }}>Paramètres</strong>.
          </div>
        </div>
      )}

      <div style={{ textAlign:'center', marginTop:24, fontSize:12, color:C.muted, fontStyle:'italic', paddingBottom:8 }}>
        {mode === 'premium'
          ? 'Plus de cafés bientôt — moyens de paiement à venir 💳'
          : 'Monte de niveau pour débloquer plus de récompenses ! ☕'}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   LEVEL UP MODAL
════════════════════════════════════════════════════ */
function LevelUpModal({ level, onCollect }) {
  const bonus = 10 * level;
  const newItems = REWARDS.filter(r => r.levelRequired === level).length;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.78)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(6px)' }}>
      <div className="bi" style={{ background:'linear-gradient(140deg,#4A2C17,#7D4E1F)', borderRadius:32, padding:'36px 28px', textAlign:'center', maxWidth:300, width:'90%', boxShadow:'0 24px 64px rgba(0,0,0,.5),0 0 60px rgba(212,160,23,.3)', border:'2px solid rgba(212,160,23,.4)', position:'relative', overflow:'hidden' }}>
        {/* Sparkles */}
        {[
          { top:'12%',  left:'10%', delay:0    },
          { top:'18%',  left:'85%', delay:.3   },
          { top:'68%',  left:'8%',  delay:.6   },
          { top:'78%',  left:'88%', delay:.9   },
          { top:'42%',  left:'92%', delay:1.2  },
          { top:'52%',  left:'5%',  delay:.45  },
        ].map((p,i)=>(
          <span key={i} className="sparkle-anim" style={{ position:'absolute', top:p.top, left:p.left, fontSize:18, animationDelay:`${p.delay}s`, pointerEvents:'none' }}>✨</span>
        ))}
        <div className="wiggle-anim" style={{ fontSize:54, marginBottom:10, display:'inline-block' }}>🎉</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.65)', textTransform:'uppercase', letterSpacing:3, marginBottom:6 }}>NIVEAU SUPÉRIEUR !</div>
        <div style={{ fontSize:32, fontWeight:900, color:'#fff', marginBottom:3 }}>Niveau {level}</div>
        <div style={{ fontSize:20, fontWeight:700, color:'#D4A017', marginBottom:20 }}>{LEVEL_NAMES[level]}</div>
        <div style={{ background:'rgba(212,160,23,.15)', borderRadius:16, padding:'12px 20px', marginBottom:14, border:'1px solid rgba(212,160,23,.3)' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', marginBottom:4 }}>Bonus offert</div>
          <div className="coin-pop" style={{ fontSize:26, fontWeight:800, color:'#D4A017' }}>+{bonus} 🍪</div>
        </div>
        {newItems > 0 && (
          <div className="su" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:18, padding:'10px 14px', borderRadius:14, background:'rgba(255,255,255,.08)', border:'1px dashed rgba(212,160,23,.4)' }}>
            <ShoppingBag size={15} color="#D4A017" />
            <span style={{ fontSize:12, color:'#fff', fontWeight:700 }}>
              {newItems} nouvel{newItems>1?'s':''} item{newItems>1?'s':''} en boutique !
            </span>
          </div>
        )}
        <button onClick={onCollect} className="glow-anim" style={{ width:'100%', padding:14, borderRadius:16, fontSize:15, fontWeight:800, background:GOLD, color:'#fff', cursor:'pointer', letterSpacing:.3 }}>
          Récupérer les cookies 🍪
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   ACHIEVEMENT MODAL — succès débloqué
════════════════════════════════════════════════════ */
function AchievementModal({ achievement, onCollect }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.78)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:90, backdropFilter:'blur(6px)' }}>
      <div className="bi" style={{ background:ESPRESSO, borderRadius:28, padding:'30px 24px', textAlign:'center', maxWidth:300, width:'90%', boxShadow:'0 24px 60px rgba(0,0,0,.5),0 0 50px rgba(212,160,23,.25)', border:'2px solid rgba(212,160,23,.35)' }}>
        <div className="wiggle-anim" style={{ fontSize:60, marginBottom:8, display:'inline-block' }}>{achievement.emoji}</div>
        <div style={{ fontSize:10, color:'#D4A017', textTransform:'uppercase', letterSpacing:3, marginBottom:6, fontWeight:800 }}>🏆 Succès débloqué !</div>
        <div style={{ fontSize:22, fontWeight:900, color:'#fff', marginBottom:6 }}>{achievement.name}</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', lineHeight:1.5, marginBottom:18, padding:'0 6px' }}>{achievement.desc}</div>
        <div style={{ background:'rgba(212,160,23,.15)', borderRadius:14, padding:'10px 18px', marginBottom:20, border:'1px solid rgba(212,160,23,.3)' }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', marginBottom:2 }}>Bonus offert</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#D4A017' }}>+{achievement.bonus} 🍪</div>
        </div>
        <button onClick={onCollect} className="glow-anim" style={{ width:'100%', padding:13, borderRadius:16, fontSize:15, fontWeight:800, background:GOLD, color:'#fff', cursor:'pointer', letterSpacing:.3 }}>
          Récupérer !
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   ONBOARDING MODAL — premier lancement
════════════════════════════════════════════════════ */
const ONBOARDING_AVATARS = [
  { kind:'base', bg:'#E8DCC8', stroke:'#4A2C17', label:'Crème'    },
  { kind:'base', bg:'#D4A017', stroke:'#fff',    label:'Or'       },
  { kind:'base', bg:'#C17F3C', stroke:'#fff',    label:'Caramel'  },
  { kind:'base', bg:'#4A2C17', stroke:'#F0E6D3', label:'Espresso' },
];

const AVATAR_PREMIUM = {
  avatar_cookie: { kind:'emoji', bg:'#C17F3C', emoji:'🍪', label:'Cookie' },
  avatar_chef:   { kind:'emoji', bg:'#E8DCC8', emoji:'👨‍🍳', label:'Chef' },
  avatar_legend: { kind:'emoji', bg:'#D4A017', emoji:'👑', label:'Légende', glow:true },
  avatar_aurore: { kind:'emoji', bg:'transparent', emoji:'🌌', label:'Cosmos', glow:true, full:true },
};

function getAvatar(value){
  if(typeof value === 'number') return ONBOARDING_AVATARS[value] || ONBOARDING_AVATARS[0];
  if(typeof value === 'string' && AVATAR_PREMIUM[value]) return AVATAR_PREMIUM[value];
  return ONBOARDING_AVATARS[0];
}

/* ─ Leaderboard ─ */
const LEADERBOARD_SCHEMA = 'v4';
const BOT_NAMES = [
  'Pixou42','LucasGameur','DarkLord99','ProGamer2010','Léa_22',
  'Mehdi_Dz','Emma17','Killua_x','KrlosFR','Sxnsei','LoulouLP',
  'ZeroFR','TomTom_x','Blue_K','nono.exe','Rayan04',
  'm4xim3','KingDavid','Tina_K','nylo_2009',
  'Gohu74','Mathilde_z','Kasandra','Loris_FR','Lyrra',
  'Solene4Ever','Madox','Sasuke59','TheoTheBoss'
];
/* Niveaux distribués : majorité de débutants/moyens pour qu'un nouveau joueur
   ne soit pas direct dernier. 29 bots → +1 user = 30 positions max. */
const BOT_LEVELS = [1,1,1,1,1,1,1,1,1, 2,2,2,2,2,2, 3,3,3,3, 4,4,4, 5,5,5, 6,6,6,6];
function generateLeaderboard(){
  const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
  return BOT_NAMES.map((name, i) => {
    const level = BOT_LEVELS[i] || 1;
    /* Stats croissantes mais accessibles au niveau bas (laisser une chance au fresh user) */
    const streak       = level <= 2 ? rand(0, level*2) : level <= 4 ? rand(0, level*3) : rand(2, level*4);
    const totalEarned  = level === 1 ? rand(0, 180)
                       : level === 2 ? rand(120, 700)
                       : level === 3 ? rand(600, 2400)
                       : level === 4 ? rand(2200, 6500)
                       : level === 5 ? rand(6000, 14000)
                       :               rand(13000, 28000);
    const clickRecord  = rand(level*4, level*level*5);
    const marketRealized = level >= 3 ? rand(-level*40, level*180) : 0;
    const cafes        = Math.max(0, rand(level - 1, level * 3));
    return { __schema:LEADERBOARD_SCHEMA, name, avatar:rand(0,3), level, streak, totalEarned, clickRecord, marketRealized, cafes };
  });
}
function leaderboardScore(p){
  return p.totalEarned + p.level*100 + p.streak*20 + p.clickRecord*5 + Math.max(0, p.marketRealized)*2;
}

function AvatarFigure({ value, size=40, ringColor=null, glow=false }){
  const a = getAvatar(value);
  const iconSize = Math.round(size * 0.5);
  const emojiSize = Math.round(size * (a.full ? 1.18 : 0.55));
  return (
    <div
      className={(a.glow || glow) ? 'glow-anim' : ''}
      style={{
        width:size, height:size, borderRadius:'50%',
        background:a.bg,
        border: ringColor ? `${Math.max(2, Math.round(size/22))}px solid ${ringColor}` : 'none',
        display:'flex', alignItems:'center', justifyContent:'center',
        flexShrink:0, boxShadow: a.full ? 'none' : '0 2px 8px rgba(0,0,0,.18)',
        overflow:'hidden'
      }}
    >
      {a.kind==='emoji'
        ? <span style={{
            fontSize:emojiSize,
            lineHeight: a.full ? 0.85 : 1,
            transform: a.full ? 'translateY(2%)' : 'none',
            filter: a.full ? 'drop-shadow(0 2px 6px rgba(0,0,0,.3))' : 'none'
          }}>{a.emoji}</span>
        : <User size={iconSize} color={a.stroke} strokeWidth={2.2} />}
    </div>
  );
}

function OnboardingModal({ onComplete, C }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [openTip, setOpenTip] = useState(null);

  const goldBtn = (disabled) => ({
    width:'100%', padding:'15px 22px', borderRadius:18, fontSize:15, fontWeight:800,
    background:disabled?C.card2:GOLD, color:disabled?C.muted:'#fff',
    border:`2px solid ${disabled?C.border:'transparent'}`,
    boxShadow:disabled?'none':'0 6px 20px rgba(212,160,23,.4)',
    cursor:disabled?'not-allowed':'pointer', letterSpacing:.3,
    transition:'all .25s'
  });

  const trimmed = name.trim();

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, backdropFilter:'blur(8px)', padding:18 }}>
      <div className="bi" style={{ width:'100%', maxWidth:380, background:C.card, borderRadius:28, padding:'28px 22px', boxShadow:'0 24px 64px rgba(0,0,0,.55)', border:`1px solid ${C.border}` }}>

        {/* Progress dots */}
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:22 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: i===step?22:8, height:8, borderRadius:4, background: i<=step?GOLD:C.card2, transition:'all .3s' }} />
          ))}
        </div>

        {step === 0 && (
          <div className="su" style={{ textAlign:'center' }}>
            <div className="float-anim" style={{ fontSize:64, marginBottom:14, display:'inline-block' }}>☕</div>
            <div style={{ fontSize:22, fontWeight:900, color:C.text, marginBottom:6 }}>Bienvenue dans CookiTrader !</div>
            <div style={{ fontSize:13, color:C.muted, marginBottom:22, lineHeight:1.5 }}>L'app qui récompense ta passion pour le café et les cookies</div>
            <div style={{ textAlign:'left', marginBottom:18 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5 }}>Comment t'appelles-tu ?</label>
              <input
                value={name}
                onChange={e=>setName(e.target.value)}
                placeholder="Ton prénom..."
                maxLength={20}
                autoFocus
                style={{
                  width:'100%', marginTop:8, padding:'14px 16px', borderRadius:14,
                  border:`2px solid ${C.border}`, background:C.card2, color:C.text,
                  fontSize:15, fontWeight:600, outline:'none',
                  fontFamily:'inherit'
                }}
                onKeyDown={e=>{ if(e.key==='Enter' && trimmed) setStep(1); }}
              />
            </div>
            <button onClick={()=>setStep(1)} disabled={!trimmed} style={goldBtn(!trimmed)}>
              Suivant →
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="su" style={{ textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:900, color:C.text, marginBottom:6 }}>Choisis ton avatar</div>
            <div style={{ fontSize:12, color:C.muted, marginBottom:18 }}>Tu pourras le changer plus tard</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:22 }}>
              {ONBOARDING_AVATARS.map((av, i) => {
                const selected = avatar === i;
                return (
                  <button
                    key={i}
                    onClick={()=>setAvatar(i)}
                    className={selected?'pulse-ring':''}
                    style={{
                      aspectRatio:'1', borderRadius:'50%',
                      background:av.bg,
                      border:`3px solid ${selected?'#D4A017':'transparent'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      cursor:'pointer',
                      boxShadow:selected?'0 4px 16px rgba(212,160,23,.45)':'0 2px 6px rgba(0,0,0,.15)',
                      transition:'all .2s'
                    }}
                    aria-label={`Avatar ${av.label}`}
                  >
                    <User size={32} color={av.stroke} strokeWidth={2.2} />
                  </button>
                );
              })}
            </div>
            <button
              onClick={()=>setStep(2)}
              disabled={avatar===null}
              style={avatar===null ? goldBtn(true) : {
                width:'100%', padding:'15px 22px', borderRadius:18, fontSize:15, fontWeight:800,
                background:ONBOARDING_AVATARS[avatar].bg,
                color:ONBOARDING_AVATARS[avatar].stroke,
                border:'2px solid transparent',
                boxShadow:`0 6px 20px ${ONBOARDING_AVATARS[avatar].bg}66`,
                cursor:'pointer', letterSpacing:.3,
                transition:'all .25s'
              }}
            >
              Suivant →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="su" style={{ textAlign:'center' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:18 }}>
              <div style={{ width:42, height:42, borderRadius:'50%', background:ONBOARDING_AVATARS[avatar].bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,.18)' }}>
                <User size={22} color={ONBOARDING_AVATARS[avatar].stroke} strokeWidth={2.2} />
              </div>
              <div style={{ fontSize:22, fontWeight:900, color:C.text }}>Bien joué, {trimmed} !</div>
            </div>
            <div style={{ fontSize:11, color:C.muted, marginBottom:10, fontStyle:'italic' }}>Tape une carte pour en savoir plus 👇</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:22, textAlign:'left' }}>
              {[
                { id:'play',   ico:'🎮', t:'Joue chaque jour',     d:'Check-in, Quiz, Roue, Défi de clics',                tip:'Le check-in se renouvelle chaque jour — la série de 7 jours débloque un jackpot. Le quiz revient toutes les 5h, et chaque difficulté a sa récompense.' },
                { id:'earn',   ico:'🍪', t:'Gagne des cookies',     d:'Et monte de niveau pour débloquer la boutique',      tip:'Chaque cookie gagné te donne aussi de l\'XP. À chaque palier, tu changes de titre (Barista → Légende) et tu débloques de nouveaux items dans la boutique.' },
                { id:'invest', ico:'📈', t:'Investis sur le marché', d:'Fais fructifier tes cookies en $CKM',                tip:'Le marché s\'ouvre au niveau 3. Le cours $CKM bouge en temps réel — achète bas, revends haut. Attention, il peut chuter aussi vite qu\'il monte.' },
              ].map(c=>{
                const open = openTip === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={()=>setOpenTip(open?null:c.id)}
                    style={{
                      width:'100%', display:'block', padding:'12px 14px', borderRadius:14,
                      background:C.card2, border:`1px solid ${open?'#D4A017':C.border}`,
                      textAlign:'left', cursor:'pointer',
                      transition:'border-color .2s'
                    }}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ fontSize:28, flexShrink:0 }}>{c.ico}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:2 }}>{c.t}</div>
                        <div style={{ fontSize:11, color:C.muted, lineHeight:1.4 }}>{c.d}</div>
                      </div>
                      <ChevronLeft size={16} color={C.muted} style={{ transform:`rotate(${open?90:-90}deg)`, transition:'transform .25s', flexShrink:0 }} />
                    </div>
                    {open && (
                      <div className="su" style={{ marginTop:10, paddingTop:10, borderTop:`1px dashed ${C.border}`, fontSize:12, color:C.text, lineHeight:1.5 }}>
                        💡 {c.tip}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <button onClick={()=>onComplete(trimmed, avatar)} className="glow-anim" style={goldBtn(false)}>
              C'est parti ! 🍪
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   GAME OVERLAY WRAPPER
════════════════════════════════════════════════════ */
function GameOverlay({ gameView,onClose,coins,streak,canCheckin,canQuiz,quizMsLeft,clickRecord,onCheckin,checkinReward,onQuizEarn,onQuizDone,onSpinEarn,onSpend,onClickEarn,onUpdateRecord,onJackpot,activeSkin,activeRoue,C }) {
  const TITLES = { checkin:'Check-in quotidien', quiz:'Quiz café', spin:'Roue de la fortune', click:'Défi de clics', pour:'Stop le café' };
  return (
    <div style={{ position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, bottom:0, background:C.bg, zIndex:50, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:`1px solid ${C.border}`, background:C.card, flexShrink:0 }}>
        <button onClick={onClose} style={{ width:36, height:36, borderRadius:12, background:C.card2, display:'flex', alignItems:'center', justifyContent:'center', color:C.text }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontSize:17, fontWeight:700, color:C.text, flex:1 }}>{TITLES[gameView]}</span>
        <div style={{ display:'flex', alignItems:'center', gap:5, background:GOLD, borderRadius:14, padding:'6px 12px' }}>
          <Cookie size={14} color="#fff" />
          <span style={{ fontWeight:700, fontSize:14, color:'#fff' }}>{coins}</span>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:20 }}>
        {gameView==='checkin' && <CheckinGame streak={streak} canCheckin={canCheckin} onCheckin={onCheckin} checkinReward={checkinReward} C={C} />}
        {gameView==='quiz'    && <QuizGame    canPlay={canQuiz}  msLeft={quizMsLeft} coins={coins} onEarn={onQuizEarn} onSpend={onSpend} onDone={onQuizDone} onClose={onClose} C={C} />}
        {gameView==='spin'    && <SpinGame    coins={coins} onEarn={onSpinEarn} onSpend={onSpend} onJackpot={onJackpot} activeRoue={activeRoue} C={C} />}
        {gameView==='click'   && <ClickGame   coins={coins} bestScore={clickRecord} onEarn={onClickEarn} onSpend={onSpend} onUpdateRecord={onUpdateRecord} activeSkin={activeSkin} C={C} />}
        {gameView==='pour'    && <PourGame    onEarn={onClickEarn} onSpend={onSpend} C={C} />}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   CHECK-IN GAME
════════════════════════════════════════════════════ */
function CheckinGame({ streak, canCheckin, onCheckin, checkinReward, C }) {
  const [done, setDone] = useState(false);
  const handle = () => { if(!canCheckin||done) return; onCheckin(); setDone(true); };
  const disabled = !canCheckin || done;

  /* Progress dans la semaine en cours (1..7 cellules cochées) */
  const completedInWeek = streak === 0 ? 0 : ((streak - 1) % 7) + 1;
  const todayIdx = (canCheckin && !done) ? streak % 7 : -1;
  const justEarned = streak > 0 ? DAILY_REWARDS[(streak - 1) % 7] : DAILY_REWARDS[0];

  return (
    <div style={{ textAlign:'center', paddingTop:24 }}>
      <div className={!disabled ? 'cookie-idle' : ''} style={{ fontSize:56, marginBottom:12, display:'inline-block' }}>☕</div>
      <div style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:4 }}>Série : {streak} jour{streak>1?'s':''}</div>
      <div style={{ fontSize:13, color:C.muted, marginBottom:22 }}>Plus tu reviens, plus tu gagnes</div>

      {/* Grille 7 jours avec récompenses progressives */}
      <div style={{ display:'flex', gap:5, justifyContent:'center', marginBottom:28, padding:'0 4px' }}>
        {DAILY_REWARDS.map((amt, i) => {
          const isDone     = i < completedInWeek;
          const isToday    = i === todayIdx;
          const isJackpot  = i === 6;

          const bg     = isDone ? GOLD : isJackpot ? 'linear-gradient(160deg,rgba(212,160,23,.18),rgba(212,160,23,.06))' : 'transparent';
          const border = isToday ? '#D4A017' : isDone ? 'transparent' : isJackpot ? 'rgba(212,160,23,.45)' : C.border;
          const valCol = isDone ? '#fff' : isJackpot ? '#D4A017' : C.text;
          const lblCol = isDone ? 'rgba(255,255,255,.85)' : C.muted;

          return (
            <div key={i} className={isToday ? 'pulse-ring' : ''} style={{ flex:1, minWidth:0, padding:'7px 2px', borderRadius:11, background:bg, border:`2px solid ${border}`, display:'flex', flexDirection:'column', alignItems:'center', gap:2, transition:'all .3s' }}>
              <div style={{ fontSize:9, fontWeight:700, color:lblCol, letterSpacing:.4 }}>{isJackpot?'🎁':`J${i+1}`}</div>
              <div style={{ fontSize:isJackpot?13:12, fontWeight:800, color:valCol, lineHeight:1.1 }}>{isDone ? <Check size={13} color="#fff" /> : `+${amt}`}</div>
            </div>
          );
        })}
      </div>

      {!disabled && (
        <div style={{ fontSize:11, color:C.muted, marginBottom:18 }}>
          {streak % 7 === 6 ? '🎁 Jackpot hebdomadaire en jeu !' : `Encore ${6 - (streak % 7)} jour${6-(streak%7)>1?'s':''} avant le jackpot 🎁 +${DAILY_REWARDS[6]}`}
        </div>
      )}

      <button onClick={handle} disabled={disabled} className={!disabled ? 'glow-anim' : ''} style={{ padding:'15px 38px', borderRadius:22, fontSize:15, fontWeight:800, background:disabled?C.card:GOLD, color:disabled?C.muted:'#fff', border:`2px solid ${disabled?C.border:'transparent'}`, cursor:disabled?'not-allowed':'pointer', letterSpacing:.3 }}>
        {done ? `✓ Récupéré ! +${justEarned} 🍪` : disabled ? 'Déjà récupéré aujourd\'hui' : `Récupérer +${checkinReward} 🍪`}
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   QUIZ GAME
════════════════════════════════════════════════════ */
const QUIZ_QUESTIONS_PER_SESSION = 3;
const QUIZ_HINT_COST = 10;
const QUIZ_HINT_DELAY_MS = 8000;

function QuizGame({ canPlay, msLeft, coins, onEarn, onSpend, onDone, onClose, C }) {
  const [chosenDifficulty, setChosenDifficulty] = useState(null);
  const [qIndices,         setQIndices]         = useState([]);

  const pickQuestions = (difficulty) => {
    const pool = QUESTIONS.map((_,i)=>i).filter(i => QUESTIONS[i].difficulty === difficulty);
    const picks = [];
    for (let n=0; n<QUIZ_QUESTIONS_PER_SESSION && pool.length; n++){
      picks.push(pool.splice(Math.floor(Math.random()*pool.length), 1)[0]);
    }
    setQIndices(picks);
    setChosenDifficulty(difficulty);
  };

  const [step,           setStep]           = useState(0);
  const [sel,            setSel]            = useState(null);
  const [hiddenChoices,  setHiddenChoices]  = useState([]);
  const [hintUsed,       setHintUsed]       = useState(false);
  const [hintAvailable,  setHintAvailable]  = useState(false);
  const [score,          setScore]          = useState(0);
  const [correctCount,   setCorrectCount]   = useState(0);
  const [allDone,        setAllDone]        = useState(false);

  const mountRef  = useRef(Date.now());
  const baseMsRef = useRef(msLeft);
  const [, setTick] = useState(0);

  /* timer du compte à rebours quand verrouillé */
  useEffect(() => {
    if(canPlay) return;
    const id = setInterval(() => setTick(t => t+1), 1000);
    return () => clearInterval(id);
  }, [canPlay]);

  /* timer d'apparition de l'aide à chaque nouvelle question */
  useEffect(() => {
    if(!canPlay || allDone || sel !== null) return;
    setHintAvailable(false);
    const id = setTimeout(() => setHintAvailable(true), QUIZ_HINT_DELAY_MS);
    return () => clearTimeout(id);
  }, [step, sel, canPlay, allDone]);

  if(!canPlay && step === 0 && sel === null && !allDone) {
    const elapsed = Date.now() - mountRef.current;
    const remaining = Math.max(0, baseMsRef.current - elapsed);
    const totalSec = Math.ceil(remaining/1000);
    const h = Math.floor(totalSec/3600);
    const m = Math.floor((totalSec%3600)/60);
    const sec = totalSec%60;
    const label = h>0 ? `${h}h ${m.toString().padStart(2,'0')}min` : m>0 ? `${m}min ${sec.toString().padStart(2,'0')}s` : `${sec}s`;
    return (
      <div style={{ textAlign:'center', paddingTop:60 }}>
        <div style={{ fontSize:48, marginBottom:14 }}>⏳</div>
        <div style={{ fontSize:20, fontWeight:800, color:C.text }}>Prochain quiz disponible dans</div>
        <div style={{ fontSize:30, fontWeight:900, color:'#D4A017', marginTop:10, fontVariantNumeric:'tabular-nums' }}>{label}</div>
        <div style={{ fontSize:13, color:C.muted, marginTop:14, lineHeight:1.55, maxWidth:280, margin:'14px auto 0' }}>
          Un nouveau quiz s'ouvre toutes les 5 heures. Reviens plus tard !
        </div>
      </div>
    );
  }

  if(allDone) return (
    <div className="su" style={{ textAlign:'center', paddingTop:50 }}>
      <div className="bi" style={{ fontSize:56, marginBottom:14 }}>{correctCount===QUIZ_QUESTIONS_PER_SESSION?'🏆':correctCount>0?'☕':'😢'}</div>
      <div style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:6 }}>
        {correctCount===QUIZ_QUESTIONS_PER_SESSION?'Sans-faute !':correctCount>0?`${correctCount} bonne${correctCount>1?'s':''} réponse${correctCount>1?'s':''}`:'Aucune bonne réponse'}
      </div>
      <div style={{ fontSize:14, color:C.muted, marginBottom:24 }}>{correctCount}/{QUIZ_QUESTIONS_PER_SESSION} questions</div>

      <button
        onClick={onClose}
        className={score>0 ? 'glow-anim' : ''}
        style={{
          display:'inline-flex', alignItems:'center', gap:10,
          padding:'14px 28px', borderRadius:20,
          background: score>0 ? GOLD : C.card,
          border:`2px solid ${score>0?'transparent':C.border}`,
          boxShadow: score>0?'0 6px 20px rgba(212,160,23,.4)':'none',
          cursor:'pointer'
        }}
      >
        <Cookie size={20} color={score>0?'#fff':C.muted} />
        <span style={{ fontSize:20, fontWeight:800, color:score>0?'#fff':C.muted }}>Récupérer +{score} 🍪</span>
      </button>

      <div style={{ fontSize:12, color:C.muted, marginTop:18 }}>Reviens dans 5h pour un nouveau quiz</div>
    </div>
  );

  if(chosenDifficulty === null) {
    const LEVELS = [
      { id:'Facile', emoji:'🌱', reward:20, bg:'#E5B040', desc:'Questions abordables' },
      { id:'Moyen',  emoji:'☕', reward:35, bg:'#C17F3C', desc:'Pour les amateurs avertis' },
      { id:'Expert', emoji:'🔥', reward:60, bg:'#4A2C17', desc:'Réservé aux puristes' },
    ];
    return (
      <div className="su" style={{ paddingTop:14 }}>
        <div style={{ textAlign:'center', marginBottom:22 }}>
          <div style={{ fontSize:44, marginBottom:8 }}>📚</div>
          <div style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:6 }}>Choisis ta difficulté</div>
          <div style={{ fontSize:13, color:C.muted, lineHeight:1.5, maxWidth:280, margin:'0 auto' }}>
            3 questions seront tirées. Plus c'est dur, plus tu gagnes.
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {LEVELS.map(lv => (
            <button
              key={lv.id}
              onClick={()=>pickQuestions(lv.id)}
              style={{
                display:'flex', alignItems:'center', gap:14,
                padding:'16px 18px', borderRadius:18,
                background:lv.bg, color:'#fff',
                border:'none', textAlign:'left', cursor:'pointer',
                boxShadow:'0 4px 14px rgba(0,0,0,.12)'
              }}
            >
              <div style={{ fontSize:32 }}>{lv.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:800, letterSpacing:.3 }}>{lv.id}</div>
                <div style={{ fontSize:12, opacity:.85, marginTop:2 }}>{lv.desc}</div>
              </div>
              <div style={{ fontSize:14, fontWeight:800, padding:'6px 12px', borderRadius:12, background:'rgba(255,255,255,.18)' }}>+{lv.reward} 🍪</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const q = QUESTIONS[qIndices[step]];

  const goNext = () => {
    if(step + 1 >= qIndices.length){
      setAllDone(true);
      onDone();
    } else {
      setStep(s=>s+1);
      setSel(null);
      setHiddenChoices([]);
      setHintUsed(false);
      setHintAvailable(false);
    }
  };

  const answer = (i) => {
    if(sel!==null) return;
    if(hiddenChoices.includes(i)) return;
    setSel(i);
    if(i===q.answer){
      onEarn(q.reward);
      setScore(s=>s+q.reward);
      setCorrectCount(c=>c+1);
    }
    setTimeout(goNext, 1500);
  };

  const useHint = () => {
    if(hintUsed || coins < QUIZ_HINT_COST || sel !== null) return;
    onSpend(QUIZ_HINT_COST);
    const wrong = [0,1,2,3].filter(i=>i!==q.answer);
    /* shuffle */
    for(let i=wrong.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [wrong[i],wrong[j]]=[wrong[j],wrong[i]];
    }
    setHiddenChoices(wrong.slice(0,2));
    setHintUsed(true);
  };

  const canAffordHint = coins >= QUIZ_HINT_COST;

  return (
    <div>
      {/* Progress 3 questions */}
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {qIndices.map((_,i)=>(
          <div key={i} style={{ flex:1, height:5, borderRadius:3, background: i<step ? GOLD : i===step ? 'rgba(212,160,23,.35)' : C.card2, transition:'background .3s' }} />
        ))}
      </div>

      <div style={{ borderRadius:20, padding:22, background:ESPRESSO, marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:2 }}>QUESTION {step+1}/{qIndices.length}</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, padding:'4px 10px', borderRadius:10, color:'#fff', background: q.difficulty==='Facile' ? '#E5B040' : q.difficulty==='Moyen' ? '#C17F3C' : '#4A2C17' }}>{q.difficulty}</span>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', fontWeight:700 }}>+{q.reward} 🍪</div>
          </div>
        </div>
        <div style={{ fontSize:17, fontWeight:700, color:'#fff', lineHeight:1.45 }}>{q.q}</div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
        {q.choices.map((ch,i)=>{
          const isHidden = hiddenChoices.includes(i);
          let bg=C.card, border=C.border, col=C.text, opacity=1;
          if(isHidden){ bg=C.card2; border=C.border; col=C.muted; opacity=.35; }
          else if(sel!==null){
            if(i===q.answer){ bg='#FBEFD4'; border='#D4A017'; col='#7D5A1E'; }
            else if(i===sel){ bg='#E8DCC8'; border='#6B3D20'; col='#3D2010'; }
          }
          return (
            <button key={i} onClick={()=>answer(i)} disabled={isHidden||sel!==null} style={{ padding:'14px 16px', borderRadius:14, border:`2px solid ${border}`, background:bg, color:col, fontWeight:600, fontSize:14, textAlign:'left', transition:'all .25s', display:'flex', alignItems:'center', gap:10, opacity, cursor:isHidden||sel!==null?'default':'pointer', textDecoration:isHidden?'line-through':'none' }}>
              <span style={{ display:'inline-flex', width:24, height:24, borderRadius:7, background:'rgba(0,0,0,.06)', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>{String.fromCharCode(65+i)}</span>
              {ch}
            </button>
          );
        })}
      </div>

      {/* Aide — apparaît après 8s d'inaction */}
      <div style={{ minHeight:48, display:'flex', justifyContent:'center', alignItems:'center' }}>
        {sel===null && hintAvailable && !hintUsed && (
          <button
            onClick={useHint}
            disabled={!canAffordHint}
            className="su"
            style={{
              padding:'10px 18px', borderRadius:14, fontSize:13, fontWeight:700,
              background: canAffordHint ? 'rgba(212,160,23,.12)' : C.card2,
              color: canAffordHint ? '#D4A017' : C.muted,
              border:`1.5px dashed ${canAffordHint?'rgba(212,160,23,.55)':C.border}`,
              display:'flex', alignItems:'center', gap:8,
              cursor: canAffordHint ? 'pointer' : 'not-allowed'
            }}
          >
            💡 Aide — éliminer 2 mauvaises réponses · −{QUIZ_HINT_COST} 🍪
          </button>
        )}
        {hintUsed && sel===null && (
          <div style={{ fontSize:12, color:C.muted, fontStyle:'italic' }}>Aide utilisée · {QUIZ_HINT_COST} 🍪 dépensés</div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   SPIN WHEEL GAME
════════════════════════════════════════════════════ */
function SpinGame({ coins, onEarn, onSpend, onJackpot, activeRoue, C }) {
  const canvasRef  = useRef(null);
  const angleRef   = useRef(0); // cumulative rotation in degrees
  const [spinning, setSpinning] = useState(false);
  const [result,   setResult]   = useState(null);
  const COST = 20;

  const palette = ROUE_PALETTES[activeRoue] || ROUE_PALETTES[''];
  const glowColor = ROUE_GLOWS[activeRoue];

  /* draw wheel */
  const draw = useCallback((deg) => {
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const sz=canvas.width, cx=sz/2, cy=sz/2, r=cx-6;
    ctx.clearRect(0,0,sz,sz);
    let startRad = (deg*Math.PI)/180;
    SEGMENTS.forEach((sg,i)=>{
      const sweep=(SEG_A[i]*Math.PI)/180;
      const segColor = palette[i] || sg.color;
      ctx.beginPath(); ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,r,startRad,startRad+sweep);
      ctx.closePath();
      if(glowColor){ ctx.shadowColor = glowColor; ctx.shadowBlur = 10; }
      ctx.fillStyle=segColor; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(startRad+sweep/2);
      ctx.textAlign='right'; ctx.fillStyle='#fff';
      ctx.font=`bold ${SEG_A[i]>28?13:10}px system-ui`;
      ctx.shadowColor='rgba(0,0,0,.55)'; ctx.shadowBlur=3;
      ctx.fillText(sg.label,r-12,4); ctx.restore();
      startRad+=sweep;
    });
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.strokeStyle='rgba(212,160,23,.7)'; ctx.lineWidth=4; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,16,0,Math.PI*2);
    ctx.fillStyle='#3A2010'; ctx.fill();
    ctx.strokeStyle='#D4A017'; ctx.lineWidth=2.5; ctx.stroke();
    ctx.fillStyle='#D4A017'; ctx.font='bold 10px system-ui';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('☕',cx,cy);
  },[palette, glowColor]);

  useEffect(()=>{ draw(angleRef.current); },[draw]);

  const spin = () => {
    if(spinning||coins<COST) return;
    onSpend(COST); setSpinning(true); setResult(null);
    const idx = wRandom();
    const mid  = SEG_C[idx] + SEG_A[idx]/2;
    /* target angle so segment mid lands at top (270°) */
    const target = (270 - mid + 36000) % 360;
    const curMod = angleRef.current % 360;
    let diff = (target - curMod + 360) % 360;
    if(diff < 45) diff += 360; // guarantee visible spin
    const final = angleRef.current + 5*360 + diff;
    const from  = angleRef.current;
    const dur   = 4500;
    const t0    = performance.now();
    const animate = (now) => {
      const t = Math.min((now-t0)/dur, 1);
      const e = 1-Math.pow(1-t,5); // ease-out quint
      draw(from + (final-from)*e);
      if(t<1){ requestAnimationFrame(animate); }
      else {
        angleRef.current=final; setSpinning(false); setResult(SEGMENTS[idx]);
        onEarn(SEGMENTS[idx].value);
        if(SEGMENTS[idx].value === 200 && onJackpot) onJackpot();
      }
    };
    requestAnimationFrame(animate);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20, position:'relative' }}>
      {/* Pointer + wheel */}
      <div style={{ position:'relative', borderRadius:'50%', lineHeight:0 }} className={!spinning && coins>=COST ? 'glow-anim' : ''}>
        <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', width:0, height:0, borderLeft:'11px solid transparent', borderRight:'11px solid transparent', borderTop:'18px solid #D4A017', zIndex:5, filter:'drop-shadow(0 2px 4px rgba(0,0,0,.3))' }} />
        <canvas ref={canvasRef} width={340} height={340} style={{ borderRadius:'50%', display:'block', filter:'drop-shadow(0 10px 24px rgba(74,44,23,.35))', maxWidth:'90vw', maxHeight:'90vw' }} />
      </div>

      {/* Confetti burst on big wins */}
      {result && result.value >= 50 && (
        <div style={{ position:'absolute', top:170, left:'50%', pointerEvents:'none', zIndex:20 }}>
          {[...Array(12)].map((_,i)=>{
            const ang = (i / 12) * Math.PI * 2;
            const dist = 80 + Math.random() * 50;
            const tx = Math.cos(ang) * dist + 'px';
            const ty = Math.sin(ang) * dist + 'px';
            return <span key={i} className="confetti-piece" style={{ '--tx':tx, '--ty':ty, animationDelay:`${i*0.02}s` }}>🍪</span>;
          })}
        </div>
      )}

      {result && (
        <div className="bi" style={{ padding:'12px 26px', borderRadius:18, fontSize:22, fontWeight:800, background:result.value>0?'linear-gradient(135deg,#FBEFD4,#F0C050)':'linear-gradient(135deg,#5D3A1F,#2D1810)', border:`2px solid ${result.value>0?'#D4A017':'#3D2010'}`, color:result.value>0?'#5D3A1F':'#F0E0C0', boxShadow:result.value>0?'0 6px 20px rgba(212,160,23,.4)':'0 6px 20px rgba(45,24,16,.4)', display:'flex', alignItems:'center', gap:8 }}>
          {result.value>0 ? <>🍪 +{result.value}</> : <>🍪 {result.value}</>}
        </div>
      )}

      <button onClick={spin} disabled={spinning||coins<COST} className={!spinning && coins>=COST ? 'glow-anim' : ''} style={{ padding:'14px 40px', borderRadius:22, fontSize:15, fontWeight:800, background:spinning||coins<COST?C.card:GOLD, color:spinning||coins<COST?C.muted:'#fff', border:`2px solid ${spinning||coins<COST?C.border:'transparent'}`, cursor:spinning||coins<COST?'not-allowed':'pointer', letterSpacing:.3 }}>
        {spinning?'En cours...':coins<COST?`Pas assez (min. ${COST} 🍪)`:`Tourner (${COST} 🍪)`}
      </button>

      {result && <div style={{ fontSize:13, color:C.muted }}>Relancez pour tenter à nouveau !</div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   CLICK CHALLENGE GAME
════════════════════════════════════════════════════ */
const COOKIE_SKINS = {
  '': {
    body:[{o:'0%',c:'#E8B57A'},{o:'55%',c:'#B86A28'},{o:'100%',c:'#6B3812'}],
    chip:[{o:'0%',c:'#5A2D14'},{o:'100%',c:'#1A0A04'}],
    ring:'#3D1F0A', cracks:'#5A2D10', glow:false, icing:false, shine:'rgba(255,240,210,.32)'
  },
  skin_glace: {
    body:[{o:'0%',c:'#E8B57A'},{o:'55%',c:'#B86A28'},{o:'100%',c:'#6B3812'}],
    chip:[{o:'0%',c:'#D43A4A'},{o:'100%',c:'#6B0F1A'}],
    ring:'#3D1F0A', cracks:'#5A2D10', glow:false, icing:false, shine:'rgba(255,210,210,.45)'
  },
  skin_chocolat: {
    body:[{o:'0%',c:'#6B3814'},{o:'55%',c:'#3D1C02'},{o:'100%',c:'#1A0A00'}],
    chip:[{o:'0%',c:'#0F0500'},{o:'100%',c:'#000000'}],
    ring:'#0A0400', cracks:'#1A0A00', glow:false, icing:false, shine:'rgba(180,120,60,.25)'
  },
  skin_dore: {
    body:[{o:'0%',c:'#F5DC8A'},{o:'55%',c:'#D4A017'},{o:'100%',c:'#8B6914'}],
    chip:[{o:'0%',c:'#7D4E1F'},{o:'100%',c:'#3D2010'}],
    ring:'#7D4E1F', cracks:'#8B5520', glow:true, icing:false, shine:'rgba(255,250,200,.55)'
  },
  skin_legende: {
    body:[{o:'0%',c:'#F5DC8A'},{o:'55%',c:'#D4A017'},{o:'100%',c:'#C17F3C'}],
    chip:[{o:'0%',c:'#8B5520'},{o:'100%',c:'#4A2C17'}],
    ring:'#8B5520', cracks:'#A07830', glow:true, icing:false, shine:'rgba(255,240,180,.6)', pulse:true
  },
  skin_mystique: {
    body:[{o:'0%',c:'#9E70D4'},{o:'55%',c:'#5A3A8E'},{o:'100%',c:'#2A1850'}],
    chip:[{o:'0%',c:'#1A0830'},{o:'100%',c:'#000000'}],
    ring:'#1A0830', cracks:'#7A5AB8', glow:true, icing:false, shine:'rgba(180,140,220,.45)', pulse:true
  },
};

const CLICK_DURATION = 5;
const CLICK_COST = 5;

function PremiumCookie() {
  return (
    <svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'100%', display:'block', filter:'drop-shadow(0 12px 22px rgba(74,44,23,.42))' }}>
      <defs>
        <radialGradient id="ck-grad" cx="38%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#F0BB7A"/>
          <stop offset="45%" stopColor="#C17F3C"/>
          <stop offset="100%" stopColor="#7D4E1F"/>
        </radialGradient>
        <radialGradient id="ck-chip" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#5C2C0A"/>
          <stop offset="100%" stopColor="#1A0A00"/>
        </radialGradient>
        <radialGradient id="ck-chip-sm" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#4A2008"/>
          <stop offset="100%" stopColor="#0F0500"/>
        </radialGradient>
      </defs>
      <ellipse cx="110" cy="208" rx="74" ry="9" fill="rgba(0,0,0,.18)"/>
      <circle cx="110" cy="113" r="98" fill="#7D4E1F"/>
      <circle cx="110" cy="110" r="100" fill="url(#ck-grad)"/>
      <path d="M 110 12 Q 132 16 148 24 Q 168 34 182 50 Q 198 70 204 94 Q 210 116 206 138 Q 200 162 184 180 Q 166 196 142 204 Q 116 210 92 206 Q 66 200 46 186 Q 24 168 14 144 Q 6 120 12 96 Q 20 72 36 54 Q 56 34 82 22 Q 96 16 110 12" stroke="#7D4E1F" strokeWidth="2" fill="none" opacity=".45"/>
      <circle cx="110" cy="110" r="100" fill="none" stroke="rgba(255,225,170,.35)" strokeWidth="1.5"/>
      <path d="M 70 70 Q 85 95 110 100 Q 130 105 150 88" stroke="#5C3317" strokeWidth="1.5" fill="none" opacity=".5"/>
      <path d="M 60 140 Q 90 145 115 155 Q 145 165 165 145" stroke="#5C3317" strokeWidth="1.5" fill="none" opacity=".4"/>
      <path d="M 145 50 Q 155 75 145 95" stroke="#5C3317" strokeWidth="1.2" fill="none" opacity=".35"/>
      <ellipse cx="78" cy="80" rx="14" ry="10" fill="#1F0E04" transform="rotate(-20 78 80)"/>
      <ellipse cx="78" cy="80" rx="12" ry="8" fill="url(#ck-chip)" transform="rotate(-20 78 80)"/>
      <ellipse cx="74" cy="76" rx="3.5" ry="2.5" fill="rgba(255,200,140,.4)" transform="rotate(-20 74 76)"/>
      <ellipse cx="138" cy="68" rx="12" ry="9" fill="#1F0E04" transform="rotate(15 138 68)"/>
      <ellipse cx="138" cy="68" rx="10" ry="7" fill="url(#ck-chip)" transform="rotate(15 138 68)"/>
      <ellipse cx="135" cy="65" rx="3" ry="2" fill="rgba(255,200,140,.4)" transform="rotate(15 135 65)"/>
      <ellipse cx="62" cy="128" rx="12" ry="9" fill="#1F0E04" transform="rotate(-10 62 128)"/>
      <ellipse cx="62" cy="128" rx="10" ry="7" fill="url(#ck-chip)" transform="rotate(-10 62 128)"/>
      <ellipse cx="59" cy="125" rx="3" ry="2" fill="rgba(255,200,140,.4)" transform="rotate(-10 59 125)"/>
      <ellipse cx="155" cy="125" rx="14" ry="10" fill="#1F0E04" transform="rotate(25 155 125)"/>
      <ellipse cx="155" cy="125" rx="12" ry="8" fill="url(#ck-chip)" transform="rotate(25 155 125)"/>
      <ellipse cx="151" cy="121" rx="3.5" ry="2.5" fill="rgba(255,200,140,.4)" transform="rotate(25 151 121)"/>
      <ellipse cx="105" cy="160" rx="13" ry="9" fill="#1F0E04" transform="rotate(-5 105 160)"/>
      <ellipse cx="105" cy="160" rx="11" ry="7" fill="url(#ck-chip)" transform="rotate(-5 105 160)"/>
      <ellipse cx="102" cy="156" rx="3" ry="2" fill="rgba(255,200,140,.4)" transform="rotate(-5 102 156)"/>
      <ellipse cx="158" cy="162" rx="10" ry="7" fill="#1F0E04" transform="rotate(10 158 162)"/>
      <ellipse cx="158" cy="162" rx="8" ry="5" fill="url(#ck-chip-sm)" transform="rotate(10 158 162)"/>
      <ellipse cx="50" cy="168" rx="10" ry="7" fill="#1F0E04" transform="rotate(-15 50 168)"/>
      <ellipse cx="50" cy="168" rx="8" ry="5" fill="url(#ck-chip-sm)" transform="rotate(-15 50 168)"/>
      <ellipse cx="115" cy="105" rx="9" ry="7" fill="#1F0E04" transform="rotate(5 115 105)"/>
      <ellipse cx="115" cy="105" rx="7" ry="5" fill="url(#ck-chip-sm)" transform="rotate(5 115 105)"/>
      <ellipse cx="76" cy="62" rx="32" ry="16" fill="rgba(255,235,200,.4)" transform="rotate(-30 76 62)"/>
      <ellipse cx="70" cy="56" rx="16" ry="7" fill="rgba(255,250,225,.55)" transform="rotate(-30 70 56)"/>
      <circle cx="158" cy="50" r="2" fill="rgba(255,235,180,.95)"/>
      <circle cx="172" cy="78" r="1.5" fill="rgba(255,235,180,.85)"/>
      <circle cx="48" cy="98" r="1.5" fill="rgba(255,235,180,.85)"/>
      <circle cx="180" cy="155" r="1.5" fill="rgba(255,235,180,.8)"/>
      <circle cx="35" cy="140" r="1.2" fill="rgba(255,235,180,.7)"/>
      <circle cx="95" cy="38" r="1.2" fill="rgba(255,235,180,.7)"/>
    </svg>
  );
}

function SkinnedCookie({ skin }){
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'100%', display:'block', filter:'drop-shadow(0 10px 18px rgba(74,44,23,.4))' }}>
      <defs>
        <radialGradient id="cookieBody" cx="40%" cy="35%" r="75%">
          {skin.body.map((s,i)=>(<stop key={i} offset={s.o} stopColor={s.c} />))}
        </radialGradient>
        <radialGradient id="chipShine" cx="35%" cy="30%" r="70%">
          {skin.chip.map((s,i)=>(<stop key={i} offset={s.o} stopColor={s.c} />))}
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="188" rx="72" ry="9" fill="rgba(0,0,0,.18)" />
      <circle cx="100" cy="100" r="90" fill="url(#cookieBody)" />
      <circle cx="100" cy="100" r="90" fill="none" stroke={skin.ring} strokeWidth="2.5" opacity=".55" />
      <path d="M58 55 Q78 44 100 60 Q122 76 117 98" stroke={skin.cracks} strokeWidth="2" fill="none" opacity=".55" />
      <path d="M142 58 Q132 78 122 88" stroke={skin.cracks} strokeWidth="2" fill="none" opacity=".5" />
      <path d="M68 132 Q88 144 112 132" stroke={skin.cracks} strokeWidth="2" fill="none" opacity=".5" />
      <g>
        <ellipse cx="73" cy="76" rx="10" ry="8" fill="url(#chipShine)" transform="rotate(-20 73 76)" />
        <ellipse cx="70" cy="73" rx="3" ry="2" fill="rgba(255,255,255,.35)" transform="rotate(-20 70 73)" />
      </g>
      <g>
        <ellipse cx="120" cy="66" rx="9" ry="7" fill="url(#chipShine)" transform="rotate(15 120 66)" />
        <ellipse cx="117" cy="63" rx="2.5" ry="1.8" fill="rgba(255,255,255,.3)" transform="rotate(15 117 63)" />
      </g>
      <ellipse cx="60" cy="115" rx="8.5" ry="7" fill="url(#chipShine)" transform="rotate(-10 60 115)" />
      <g>
        <ellipse cx="136" cy="108" rx="10" ry="8" fill="url(#chipShine)" transform="rotate(25 136 108)" />
        <ellipse cx="133" cy="105" rx="3" ry="2" fill="rgba(255,255,255,.3)" transform="rotate(25 133 105)" />
      </g>
      <ellipse cx="94" cy="142" rx="9" ry="7.5" fill="url(#chipShine)" transform="rotate(-5 94 142)" />
      <ellipse cx="148" cy="146" rx="8" ry="6.5" fill="url(#chipShine)" transform="rotate(10 148 146)" />
      <ellipse cx="50" cy="150" rx="8.5" ry="7" fill="url(#chipShine)" transform="rotate(-15 50 150)" />
      <g>
        <ellipse cx="100" cy="96" rx="8" ry="6.5" fill="url(#chipShine)" transform="rotate(5 100 96)" />
        <ellipse cx="98" cy="93" rx="2.5" ry="1.8" fill="rgba(255,255,255,.3)" transform="rotate(5 98 93)" />
      </g>
      <circle cx="155" cy="155" r="2.5" fill={skin.ring} opacity=".7" />
      <circle cx="42" cy="92" r="2" fill={skin.ring} opacity=".7" />
      <circle cx="115" cy="155" r="1.8" fill={skin.ring} opacity=".6" />
      <circle cx="85" cy="58" r="2" fill={skin.ring} opacity=".7" />
      {skin.icing && (
        <>
          {/* Glaçage couvrant la MOITIÉ HAUTE du cookie, bord inférieur ondulé (drips qui pendent) */}
          <path
            d="M 12,100 A 90,90 0 0 1 188,100 L 182,100 Q 178,116 172,116 Q 166,104 160,104 Q 154,120 148,120 Q 142,104 136,104 Q 130,124 122,124 Q 116,104 110,104 Q 104,126 96,126 Q 88,104 82,104 Q 76,122 70,122 Q 64,104 58,104 Q 52,118 46,118 Q 40,104 34,104 Q 28,114 22,114 Q 18,104 14,104 Z"
            fill="#FAFAFA" stroke="#E5E5E5" strokeWidth="1"
          />
          {/* Reflets brillants en haut */}
          <ellipse cx="76" cy="58" rx="36" ry="13" fill="rgba(255,255,255,0.85)" transform="rotate(-30 76 58)" />
          <ellipse cx="64" cy="48" rx="18" ry="6" fill="rgba(255,255,255,1)" transform="rotate(-30 64 48)" />
          {/* Sparkles givrés sur la moitié haute */}
          <circle cx="135" cy="50" r="1.6" fill="rgba(255,255,255,0.95)" />
          <circle cx="155" cy="80" r="1.3" fill="rgba(255,255,255,0.9)" />
          <circle cx="50"  cy="80" r="1.4" fill="rgba(255,255,255,0.95)" />
          <circle cx="105" cy="35" r="1.4" fill="rgba(255,255,255,0.95)" />
          <circle cx="125" cy="92" r="1.3" fill="rgba(255,255,255,0.9)" />
          <circle cx="80"  cy="92" r="1.2" fill="rgba(255,255,255,0.85)" />
        </>
      )}
      <ellipse cx="68" cy="62" rx="22" ry="11" fill={skin.shine} transform="rotate(-32 68 62)" />
      <ellipse cx="58" cy="55" rx="9" ry="4" fill="rgba(255,255,255,.55)" transform="rotate(-32 58 55)" />
    </svg>
  );
}

function ClickGame({ coins, bestScore, onEarn, onSpend, onUpdateRecord, activeSkin, C }) {
  const hasCustomSkin = !!(activeSkin && COOKIE_SKINS[activeSkin] && activeSkin !== '');
  const skin = COOKIE_SKINS[activeSkin] || COOKIE_SKINS[''];

  const [phase,         setPhase]         = useState('idle');     // idle | countdown | playing | done
  const [clicks,        setClicks]        = useState(0);
  const [timeLeft,      setTimeLeft]      = useState(CLICK_DURATION);
  const [countdownVal,  setCountdownVal]  = useState(null);       // 3, 2, 1, 'GO', null
  const [particles,     setParticles]     = useState([]);
  const [rings,         setRings]         = useState([]);
  const [combo,         setCombo]         = useState(null);       // { text, key }
  const [pressed,       setPressed]       = useState(false);
  const [showConfetti,  setShowConfetti]  = useState(false);
  const [recordHit,     setRecordHit]     = useState(false);

  const lastTapRef     = useRef(0);
  const comboCountRef  = useRef(0);
  const timerRef       = useRef(null);
  const countdownRef   = useRef(null);
  const clickRef       = useRef(0);

  /* Cleanup */
  useEffect(()=>()=>{
    if(timerRef.current) clearInterval(timerRef.current);
    if(countdownRef.current) clearInterval(countdownRef.current);
  },[]);

  /* Combo reset visuel */
  useEffect(()=>{
    if(!combo) return;
    const t = setTimeout(()=>setCombo(null), 1500);
    return () => clearTimeout(t);
  },[combo]);

  /* Record pulse reset */
  useEffect(()=>{
    if(!recordHit) return;
    const t = setTimeout(()=>setRecordHit(false), 1500);
    return () => clearTimeout(t);
  },[recordHit]);

  const endGame = () => {
    setPhase('done');
    const finalClicks = clickRef.current;
    const earned = Math.floor(finalClicks / 2);
    if(earned > 0) onEarn(earned);
    if(finalClicks > bestScore){
      onUpdateRecord(finalClicks);
      setRecordHit(true);
      setShowConfetti(true);
      setTimeout(()=>setShowConfetti(false), 1500);
    }
  };

  const startGame = () => {
    if(coins < CLICK_COST) return;
    onSpend(CLICK_COST);
    setPhase('countdown');
    setClicks(0); clickRef.current = 0;
    setTimeLeft(CLICK_DURATION);
    comboCountRef.current = 0;
    lastTapRef.current = 0;

    let n = 3;
    setCountdownVal(n);
    countdownRef.current = setInterval(()=>{
      n--;
      if(n > 0){
        setCountdownVal(n);
      } else if(n === 0){
        setCountdownVal('GO');
      } else {
        clearInterval(countdownRef.current);
        setCountdownVal(null);
        setPhase('playing');
        timerRef.current = setInterval(()=>{
          setTimeLeft(t=>{
            if(t <= 1){
              clearInterval(timerRef.current);
              endGame();
              return 0;
            }
            return t - 1;
          });
        }, 1000);
      }
    }, 800);
  };

  const replay = () => {
    setPhase('idle');
    setClicks(0); clickRef.current = 0;
    setTimeLeft(CLICK_DURATION);
    setCombo(null); setRings([]); setParticles([]);
    setRecordHit(false);
  };

  const handleTap = (e) => {
    if(phase !== 'playing') return;
    if(e && e.preventDefault) e.preventDefault();
    clickRef.current += 1;
    setClicks(c => c + 1);
    setPressed(true);
    setTimeout(()=>setPressed(false), 80);

    /* Particle */
    const id = Date.now() + Math.random();
    const tx = (Math.random() - 0.5) * 80;
    setParticles(p => [...p, { id, tx }]);
    setTimeout(()=>setParticles(p => p.filter(x => x.id !== id)), 800);

    /* Ring */
    setRings(r => [...r, id]);
    setTimeout(()=>setRings(r => r.filter(x => x !== id)), 550);

    /* Combo */
    const now = Date.now();
    if(now - lastTapRef.current < 250){
      comboCountRef.current++;
      if(comboCountRef.current === 5)  setCombo({ text:'x2 🔥', key: now });
      if(comboCountRef.current === 12) setCombo({ text:'x3 ⚡', key: now });
      if(comboCountRef.current === 20) setCombo({ text:'x4 💥', key: now });
    } else {
      comboCountRef.current = 1;
    }
    lastTapRef.current = now;
  };

  const urgentTime = phase === 'playing' && timeLeft <= 3;
  const timeColor  = urgentTime ? '#6B3D20' : C.text;

  /* Bouton central */
  const canPlay = coins >= CLICK_COST;
  const btnLabel =
    phase === 'idle'      ? `Commencer (${CLICK_COST} 🍪)`
  : phase === 'countdown' ? '...'
  : phase === 'playing'   ? '🍪 Tape !'
  :                         `Rejouer (${CLICK_COST} 🍪)`;

  /* Bannière de fin */
  const earnedFinal = Math.floor(clicks / 2);
  const cps = (clicks / CLICK_DURATION).toFixed(1);
  const banner = phase === 'done'
    ? (recordHit
        ? { bg:'linear-gradient(135deg,#F5DC8A,#D4A017)', col:'#5D3A1F', border:'#D4A017', title:'🏆 Nouveau record !' }
        : clicks === 0
          ? { bg:'linear-gradient(135deg,#5A3520,#3D2010)', col:'#F0E0C0', border:'#3D2010', title:'0 clic… réessaie ?' }
          : { bg:'linear-gradient(135deg,#FBEFD4,#F0C050)', col:'#5D3A1F', border:'#D4A017', title:`${clicks} clics !` }
      )
    : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, paddingTop:6, position:'relative' }}>

      {/* 3 cartes stats */}
      <div style={{ display:'flex', gap:8, width:'100%', maxWidth:360 }}>
        <div style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${phase==='playing'?'#D4A017':C.border}`, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,.04)', transition:'border-color .25s' }}>
          <div style={{ fontSize:11 }}>🍪</div>
          <div style={{ fontSize:22, fontWeight:900, color: phase==='playing'?'#D4A017':C.text, letterSpacing:'-.5px', lineHeight:1.1 }}>{clicks}</div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Clics</div>
        </div>
        <div
          style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${urgentTime?'#6B3D20':C.border}`, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,.04)', transition:'border-color .25s', animation: urgentTime ? 'shake .25s ease-in-out infinite' : 'none' }}
        >
          <div style={{ fontSize:11 }}>⏱️</div>
          <div style={{ fontSize:22, fontWeight:900, color: timeColor, letterSpacing:'-.5px', lineHeight:1.1 }}>{timeLeft}<span style={{ fontSize:13, color:C.muted, fontWeight:700 }}>s</span></div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Temps</div>
        </div>
        <div
          style={{ flex:1, padding:'10px 8px', borderRadius:14, background:C.card, border:`1.5px solid ${recordHit?'#D4A017':C.border}`, textAlign:'center', boxShadow: recordHit?'0 0 16px rgba(212,160,23,.5)':'0 2px 8px rgba(0,0,0,.04)', transition:'all .25s', animation: recordHit ? 'recordPulse 1s ease-in-out infinite' : 'none' }}
        >
          <div style={{ fontSize:11 }}>🏆</div>
          <div style={{ fontSize:22, fontWeight:900, color: recordHit?'#D4A017':C.text, letterSpacing:'-.5px', lineHeight:1.1 }}>{Math.max(bestScore, recordHit?clicks:0)}</div>
          <div style={{ fontSize:9, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Record</div>
        </div>
      </div>

      {/* Barre de temps */}
      <div style={{ width:'100%', maxWidth:360, height:6, borderRadius:3, background:C.card2, overflow:'hidden', border:`1px solid ${C.border}` }}>
        <div style={{
          height:'100%', borderRadius:3,
          width: `${(timeLeft / CLICK_DURATION) * 100}%`,
          background: urgentTime
            ? 'linear-gradient(90deg, #4A2C17, #6B3D20)'
            : 'linear-gradient(90deg, #C17F3C, #D4A017)',
          transition: 'width 1s linear, background .3s'
        }} />
      </div>

      {/* Zone cookie 280×280 */}
      <div
        style={{
          position:'relative', width:'min(72vw,280px)', height:'min(72vw,280px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          userSelect:'none', WebkitUserSelect:'none'
        }}
      >
        {/* Halo radial doré */}
        <div style={{
          position:'absolute', inset:-10, borderRadius:'50%',
          background: phase === 'playing'
            ? 'radial-gradient(circle, rgba(212,160,23,.55), transparent 65%)'
            : phase === 'done' || phase === 'countdown'
              ? 'radial-gradient(circle, rgba(212,160,23,.18), transparent 65%)'
              : 'radial-gradient(circle, rgba(212,160,23,.25), transparent 65%)',
          transition:'background .35s ease',
          pointerEvents:'none', zIndex:0
        }} />

        {/* Anneaux dorés au tap */}
        {rings.map(id => (
          <div
            key={id}
            style={{
              position:'absolute', inset:'15%', borderRadius:'50%',
              border:'3px solid rgba(212,160,23,.85)',
              animation:'ringExpand .55s ease-out forwards',
              pointerEvents:'none', zIndex:3
            }}
          />
        ))}

        {/* Cookie cliquable */}
        <div
          onPointerDown={handleTap}
          className={(phase==='idle' || phase==='done') ? 'cookie-anim-idle' : ''}
          style={{
            width:'88%', height:'88%', position:'relative', zIndex:2,
            cursor: phase==='playing' ? 'pointer' : 'default',
            touchAction:'manipulation',
            transform: pressed ? 'scale(.88) rotate(-3deg)' : 'scale(1)',
            transition: pressed ? 'transform .05s ease' : 'transform .15s cubic-bezier(.36,.07,.19,.97)',
            filter: phase === 'done' ? 'grayscale(.4) brightness(.85)' : 'none',
            willChange:'transform',
            animation: (phase==='idle' || phase==='done') ? 'idle 3s ease-in-out infinite' : 'none'
          }}
        >
          {hasCustomSkin
            ? <SkinnedCookie skin={skin} />
            : <PremiumCookie />}
        </div>

        {/* Particules +1 🍪 */}
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position:'absolute', top:'50%', left:'50%',
              fontSize:18, fontWeight:900, color:'#D4A017',
              pointerEvents:'none', zIndex:5,
              animation:'floatUpClick .8s ease-out forwards',
              textShadow:'0 1px 3px rgba(0,0,0,.25)',
              ['--tx']: `${p.tx}px`
            }}
          >+1 🍪</div>
        ))}

        {/* Overlay countdown */}
        {phase === 'countdown' && countdownVal !== null && (
          <div
            key={String(countdownVal)}
            style={{
              position:'absolute', inset:0, display:'flex',
              alignItems:'center', justifyContent:'center',
              fontSize: countdownVal === 'GO' ? 64 : 96,
              fontWeight:900,
              color: countdownVal === 'GO' ? '#C8960C' : '#D4A017',
              letterSpacing:'-2px', zIndex:6, pointerEvents:'none',
              animation:'countdown .8s ease-out forwards',
              textShadow:'0 4px 18px rgba(212,160,23,.5)'
            }}
          >
            {countdownVal === 'GO' ? 'GO !' : countdownVal}
          </div>
        )}

        {/* Badge combo en haut à droite */}
        {combo && (
          <div
            key={combo.key}
            style={{
              position:'absolute', top:8, right:8,
              padding:'6px 12px', borderRadius:14,
              background:'linear-gradient(135deg,#FFE89A,#D4A017)',
              color:'#5D3A1F', fontWeight:900, fontSize:14,
              boxShadow:'0 4px 14px rgba(212,160,23,.55)',
              zIndex:6, letterSpacing:.5,
              animation:'popIn .45s cubic-bezier(.36,.07,.19,.97) both'
            }}
          >{combo.text}</div>
        )}

        {/* Confettis si record */}
        {showConfetti && (
          <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:7 }}>
            {Array.from({ length:14 }).map((_,i)=>{
              const angle = (i / 14) * Math.PI * 2;
              const dist  = 120 + Math.random()*60;
              const tx = Math.cos(angle) * dist;
              const ty = Math.sin(angle) * dist;
              return (
                <span
                  key={i}
                  style={{
                    position:'absolute', top:'50%', left:'50%',
                    fontSize:20,
                    animation:'confetti 1.4s ease-out forwards',
                    animationDelay:`${i * 0.02}s`,
                    ['--tx']: `${tx}px`,
                    ['--ty']: `${ty}px`
                  }}
                >{i % 2 === 0 ? '🍪' : '✨'}</span>
              );
            })}
          </div>
        )}
      </div>

      {/* Texte d'instruction */}
      <div style={{ minHeight:18, fontSize:13, fontWeight:600, color: phase==='playing' ? '#D4A017' : C.muted, fontStyle: phase==='playing'?'normal':'italic', textAlign:'center' }}>
        {phase === 'idle'      && 'Prêt à tapoter le cookie ?'}
        {phase === 'countdown' && 'Prépare-toi…'}
        {phase === 'playing'   && 'Tape ! Tape ! Tape !'}
        {phase === 'done'      && 'Bien joué !'}
      </div>

      {/* Bannière résultat */}
      {banner && (
        <div style={{
          padding:'14px 22px', borderRadius:18,
          background: banner.bg, color: banner.col,
          border:`2px solid ${banner.border}`,
          boxShadow:'0 6px 20px rgba(74,44,23,.25)',
          textAlign:'center', minWidth:280,
          animation:'popIn .5s cubic-bezier(.36,.07,.19,.97) both'
        }}>
          <div style={{ fontSize:18, fontWeight:900, marginBottom:10, letterSpacing:.3 }}>{banner.title}</div>
          <div style={{ display:'flex', gap:14, justifyContent:'center' }}>
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>{clicks}</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Clics</div>
            </div>
            <div style={{ width:1, background:'rgba(0,0,0,.15)' }} />
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>{cps}</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Clics/s</div>
            </div>
            <div style={{ width:1, background:'rgba(0,0,0,.15)' }} />
            <div>
              <div style={{ fontSize:18, fontWeight:900 }}>+{earnedFinal}</div>
              <div style={{ fontSize:9, opacity:.75, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Cookies</div>
            </div>
          </div>
        </div>
      )}

      {/* Bouton central */}
      <button
        onClick={phase === 'done' ? replay : phase === 'idle' ? startGame : undefined}
        disabled={phase === 'countdown' || phase === 'playing' || (!canPlay && phase !== 'done')}
        className={(phase === 'idle' || phase === 'done') && canPlay ? 'glow-anim' : ''}
        style={{
          width:200, padding:'15px 0', borderRadius:22, fontSize:15, fontWeight:900, letterSpacing:.4,
          background: (phase === 'idle' || phase === 'done') && canPlay ? GOLD : C.card,
          color: (phase === 'idle' || phase === 'done') && canPlay ? '#fff' : C.muted,
          border:`2px solid ${((phase === 'idle' || phase === 'done') && canPlay) ? 'transparent' : C.border}`,
          boxShadow: (phase === 'idle' || phase === 'done') && canPlay ? '0 6px 20px rgba(212,160,23,.4)' : 'none',
          cursor: (phase === 'idle' || phase === 'done') && canPlay ? 'pointer' : 'not-allowed',
          touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
          transition:'transform .12s, background .25s'
        }}
      >
        {btnLabel}
      </button>

      {/* Tip card */}
      <div style={{ width:'100%', maxWidth:360, padding:'10px 14px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center' }}>
        💡 <strong style={{ color:'#D4A017' }}>1 🍪 = 2 clics</strong> · Plus tu tapes vite, plus tu déclenches des combos
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   POUR GAME — maintiens, relâche au bon moment
════════════════════════════════════════════════════ */
const FILL_RATE = 38;     // % par seconde
const GOLD_MIN  = 90;
const PERFECT   = 100;
const OVERFLOW  = 105;

function PourGame({ onEarn, onSpend, C }) {
  const [fillPct,     setFillPct]     = useState(0);
  const [holding,     setHolding]     = useState(false);
  const [gameOver,    setGameOver]    = useState(false);
  const [parfaits,    setParfaits]    = useState(0);
  const [totalPlayed, setTotalPlayed] = useState(0);
  const [result,      setResult]      = useState(null);   // { type:'win'|'perfect'|'lose', title, sub }
  const [feedback,    setFeedback]    = useState(null);   // { text, color, key }

  const holdingRef  = useRef(false);
  const gameOverRef = useRef(false);
  const rafRef      = useRef(null);
  const lastTimeRef = useRef(null);

  useEffect(()=>{ holdingRef.current  = holding;  }, [holding]);
  useEffect(()=>{ gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(()=>()=>{ if(rafRef.current) cancelAnimationFrame(rafRef.current); },[]);

  const showFeedback = (text, color) => {
    setFeedback({ text, color, key: Date.now() });
    setTimeout(()=>setFeedback(null), 900);
  };

  const reset = () => {
    setFillPct(0);
    setGameOver(false);
    setResult(null);
    lastTimeRef.current = null;
  };

  const resolveGame = (pct) => {
    if(gameOverRef.current) return;
    setGameOver(true); gameOverRef.current = true;
    setHolding(false); holdingRef.current = false;
    if(rafRef.current) cancelAnimationFrame(rafRef.current);

    setTotalPlayed(t => t + 1);

    if(pct > OVERFLOW){
      setParfaits(0);
      onSpend && onSpend(5);
      setResult({ type:'lose', title:'💧 Ça déborde !', sub:'-5 🍪 perdus' });
      showFeedback('-5 🍪', '#6B3D20');
    } else if(pct >= PERFECT){
      setParfaits(p => p + 1);
      onEarn(15);
      setResult({ type:'perfect', title:'⭐ Parfait absolu !', sub:'+15 🍪 gagnés' });
      showFeedback('+15 🍪', '#C8960C');
    } else if(pct >= GOLD_MIN){
      setParfaits(p => p + 1);
      onEarn(6);
      setResult({ type:'win', title:'✦ Zone dorée !', sub:'+6 🍪 gagnés' });
      showFeedback('+6 🍪', '#D4A017');
    } else {
      setParfaits(0);
      setResult({ type:'lose', title:'Trop tôt...', sub:'Vise entre 90% et 100%' });
    }

    setTimeout(reset, 2200);
  };

  const tick = (ts) => {
    if(!lastTimeRef.current) lastTimeRef.current = ts;
    const dt = (ts - lastTimeRef.current) / 1000;
    lastTimeRef.current = ts;

    setFillPct(prev => {
      const next = Math.min(prev + FILL_RATE * dt, 108);
      if(next >= OVERFLOW){
        resolveGame(next);
        return next;
      }
      return next;
    });

    if(holdingRef.current && !gameOverRef.current){
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const startHold = () => {
    if(gameOverRef.current || holdingRef.current) return;
    setHolding(true); holdingRef.current = true;
    lastTimeRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopHold = () => {
    if(!holdingRef.current || gameOverRef.current) return;
    setHolding(false); holdingRef.current = false;
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    setFillPct(currentPct => {
      resolveGame(currentPct);
      return currentPct;
    });
  };

  /* zone & label (priorité débordement) */
  const getZone = (pct) => {
    if(pct > OVERFLOW) return 'overflow';
    if(pct >= PERFECT) return 'perfect';
    if(pct >= GOLD_MIN) return 'gold';
    return 'idle';
  };
  const getLabel = (pct) => {
    if(pct > OVERFLOW) return '💧 Ça déborde !';
    if(pct >= PERFECT)  return '★ Parfait ! Lâche maintenant !';
    if(pct >= GOLD_MIN) return '✦ Zone dorée — encore un peu...';
    return 'Maintiens pour verser le café';
  };
  const zone  = getZone(fillPct);
  const label = getLabel(fillPct);

  const zoneRingColor =
    zone === 'overflow' ? '#3D2010'
  : zone === 'perfect'  ? '#D4A017'
  : zone === 'gold'     ? '#C17F3C'
  :                       'transparent';
  const pctColor =
    zone === 'overflow' ? '#6B3D20'
  : zone === 'perfect'  ? '#C8960C'
  : zone === 'gold'     ? '#D4A017'
  :                       C.text;

  /* SVG : remplissage du café */
  const VB = 180;
  const maxH = 95;
  const h = (Math.min(fillPct, 105) / 105) * maxH;
  const y = 155 - h;

  /* Couleurs banner résultat */
  const bannerBg =
    result?.type === 'perfect' ? 'linear-gradient(135deg, #F5DC8A, #D4A017)'
  : result?.type === 'win'     ? 'linear-gradient(135deg, #FBEFD4, #F0C050)'
  : result?.type === 'lose'    ? 'linear-gradient(135deg, #5D3A1F, #2D1810)'
  :                              'transparent';
  const bannerCol =
    result?.type === 'lose' ? '#F0E0C0' : '#5D3A1F';
  const bannerBorder =
    result?.type === 'perfect' ? '#D4A017'
  : result?.type === 'win'     ? '#D4A017'
  : result?.type === 'lose'    ? '#3D2010'
  :                              'transparent';

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:18, paddingTop:6, position:'relative' }}>
      {/* Stats — 2 cartes côte à côte */}
      <div style={{ display:'flex', gap:10, width:'100%', maxWidth:340 }}>
        <div style={{ flex:1, padding:'12px 14px', borderRadius:14, background:C.card, border:`1.5px solid ${C.border}`, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ fontSize:24, fontWeight:900, color: pctColor, letterSpacing:'-.5px', transition:'color .25s' }}>
            {Math.round(fillPct)}<span style={{ fontSize:14, color:C.muted, fontWeight:700 }}>%</span>
          </div>
          <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginTop:2 }}>Niveau</div>
        </div>
        <div style={{ flex:1, padding:'12px 14px', borderRadius:14, background:C.card, border:`1.5px solid ${C.border}`, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:24, fontWeight:900, color: parfaits>0 ? '#D4A017' : C.text, letterSpacing:'-.5px' }}>
            {parfaits>0 && <span style={{ fontSize:18 }}>⭐</span>}{parfaits}
          </div>
          <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginTop:2 }}>Parfaits d'affilée</div>
        </div>
      </div>

      {/* Tasse SVG centrée 180×180 */}
      <div
        className={zone === 'perfect' ? 'perfect-pulse' : ''}
        style={{
          position:'relative', width:180, height:180,
          display:'flex', alignItems:'center', justifyContent:'center'
        }}
      >
        {/* Glow radial derrière la tasse */}
        <div style={{
          position:'absolute', inset:-20, borderRadius:'50%',
          background: zone === 'perfect'
            ? 'radial-gradient(circle, rgba(245,220,138,.55), transparent 70%)'
            : zone === 'gold'
              ? 'radial-gradient(circle, rgba(212,160,23,.35), transparent 70%)'
              : 'transparent',
          transition:'background .3s ease',
          pointerEvents:'none', zIndex:0,
          animation: zone==='perfect' ? 'glowRing 1.2s ease-in-out infinite' : 'none'
        }} />

        {/* Anneau coloré autour de la tasse */}
        <div style={{
          position:'absolute', inset:0, borderRadius:'50%',
          border: zone==='idle' ? `2px solid transparent` : `3px solid ${zoneRingColor}`,
          transition:'border-color .2s, border-width .2s',
          pointerEvents:'none', zIndex:1,
          boxShadow: zone === 'perfect' ? '0 0 24px rgba(212,160,23,.6) inset' : 'none'
        }} />

        {/* Sparkles "perfect" */}
        {zone === 'perfect' && (
          <>
            {[
              { top:-6,  left:'12%', d:0   },
              { top:8,   left:'88%', d:.2 },
              { top:80,  left:-6,    d:.4 },
              { top:120, left:'90%', d:.55 },
            ].map((p,i)=>(
              <span key={i} className="sparkle-anim" style={{ position:'absolute', top:p.top, left:p.left, fontSize:16, animationDelay:`${p.d}s`, pointerEvents:'none', zIndex:5, filter:'drop-shadow(0 0 6px rgba(212,160,23,.7))' }}>✨</span>
            ))}
          </>
        )}

        <svg viewBox={`0 0 ${VB} ${VB}`} width="180" height="180" style={{ overflow:'visible', position:'relative', zIndex:2 }}>
          <defs>
            <clipPath id="cup-clip">
              {/* Forme intérieure de la tasse */}
              <path d="M 56,60 L 56,150 Q 56,158 64,158 L 122,158 Q 130,158 130,150 L 130,60 Z" />
            </clipPath>
            <linearGradient id="coffee-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#7A4220" />
              <stop offset="50%" stopColor="#5C3317" />
              <stop offset="100%" stopColor="#2D1810" />
            </linearGradient>
            <linearGradient id="cup-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"  stopColor="#D8C8A8" />
              <stop offset="40%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#C8B898" />
            </linearGradient>
          </defs>

          {/* Soucoupe */}
          <ellipse cx="90" cy="170" rx="68" ry="6" fill="#A0784E" opacity=".4" />
          <ellipse cx="90" cy="167" rx="64" ry="5" fill="#F0E4D0" stroke="#3D2010" strokeWidth="1.4" />
          <ellipse cx="90" cy="166" rx="40" ry="2" fill="none" stroke="#C17F3C" strokeWidth=".8" opacity=".5" />

          {/* Anse droite — couches extérieure puis intérieure */}
          <path d="M 130,75 Q 158,80 158,108 Q 158,138 130,143"
                stroke="#F0E4D0" strokeWidth="14" fill="none" strokeLinecap="round" />
          <path d="M 130,75 Q 158,80 158,108 Q 158,138 130,143"
                stroke="#3D2010" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".7" />
          <path d="M 132,86 Q 148,90 148,108 Q 148,130 132,134"
                stroke="#F0E4D0" strokeWidth="5" fill="none" strokeLinecap="round" />

          {/* Corps de la tasse */}
          <path d="M 50,55 L 50,150 Q 50,162 62,162 L 124,162 Q 136,162 136,150 L 136,55 Z"
                fill="url(#cup-grad)" stroke="#3D2010" strokeWidth="2" />

          {/* Reflet blanc gauche */}
          <path d="M 56,68 Q 56,120 56,140"
                stroke="rgba(255,255,255,0.6)" strokeWidth="3" fill="none" strokeLinecap="round" />

          {/* Café (clipé, monte selon fillPct) */}
          <g clipPath="url(#cup-clip)">
            <rect
              id="coffee-fill"
              x="50" y={y} width="86" height={h + 5}
              fill="url(#coffee-grad)"
              style={{ transition: holding ? 'none' : 'y .25s ease, height .25s ease' }}
            />
            {/* Mousse au-dessus */}
            {fillPct > 1 && (
              <ellipse
                id="foam"
                cx="93" cy={y + 2} rx="38" ry="3.5"
                fill="#C8A878"
                opacity={Math.min(fillPct/30, 0.85)}
              />
            )}
            {/* Bulles */}
            {holding && fillPct > 5 && (
              <>
                <circle cx="78" cy={y + 12} r="1.4" fill="rgba(240,224,192,.6)">
                  <animate attributeName="cy" values={`${y+15};${y+4}`} dur="1.1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;.8;0" dur="1.1s" repeatCount="indefinite" />
                </circle>
                <circle cx="104" cy={y + 14} r="1.2" fill="rgba(240,224,192,.5)">
                  <animate attributeName="cy" values={`${y+16};${y+5}`} dur=".9s" begin=".25s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;.7;0" dur=".9s" begin=".25s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </g>

          {/* Vapeur — 3 traînées qui s'arrêtent quand on lâche */}
          {holding && (
            <g style={{ transformOrigin:'93px 50px' }}>
              <ellipse cx="80" cy="48" rx="3.5" ry="8" fill="rgba(240,224,192,.55)" style={{ filter:'blur(2px)', animation:'steam1 1.6s ease-in-out infinite' }} />
              <ellipse cx="93" cy="44" rx="4" ry="9" fill="rgba(240,224,192,.55)" style={{ filter:'blur(2px)', animation:'steam2 1.8s ease-in-out infinite', animationDelay:'.3s' }} />
              <ellipse cx="106" cy="48" rx="3.5" ry="8" fill="rgba(240,224,192,.55)" style={{ filter:'blur(2px)', animation:'steam3 1.5s ease-in-out infinite', animationDelay:'.6s' }} />
            </g>
          )}

          {/* Bord supérieur (rim) */}
          <ellipse cx="93" cy="55" rx="43" ry="5" fill="#3D2010" opacity=".55" />
          <ellipse cx="93" cy="54" rx="42" ry="3.8" fill="url(#cup-grad)" stroke="#3D2010" strokeWidth="1.2" />
        </svg>

        {/* Feedback float */}
        {feedback && (
          <div key={feedback.key} style={{
            position:'absolute', bottom:8, left:'50%',
            fontSize:18, fontWeight:900, color:feedback.color,
            pointerEvents:'none', zIndex:6,
            animation:'floatUpFb .9s ease-out forwards',
            textShadow:'0 1px 3px rgba(0,0,0,.2)'
          }}>{feedback.text}</div>
        )}
      </div>

      {/* % de remplissage en gros */}
      <div style={{ textAlign:'center', marginTop:-4 }}>
        <div style={{
          fontSize:52, fontWeight:900, color: pctColor,
          letterSpacing:'-2px', lineHeight:1, transition:'color .25s'
        }}>
          {Math.round(fillPct)}<span style={{ fontSize:24, color:C.muted, fontWeight:700, marginLeft:2 }}>%</span>
        </div>
        <div style={{
          fontSize:13, fontWeight:600, color: pctColor,
          marginTop:4, minHeight:18, transition:'color .25s'
        }}>
          {label}
        </div>
      </div>

      {/* Bannière de résultat */}
      {result && (
        <div style={{
          padding:'12px 22px', borderRadius:16,
          background: bannerBg, color: bannerCol,
          border:`2px solid ${bannerBorder}`,
          boxShadow:'0 6px 18px rgba(74,44,23,.25)',
          textAlign:'center',
          animation:'popIn .5s cubic-bezier(.36,.07,.19,.97) both',
          minWidth:240
        }}>
          <div style={{ fontSize:17, fontWeight:900, letterSpacing:.3 }}>{result.title}</div>
          <div style={{ fontSize:12, fontWeight:600, marginTop:2, opacity:.85 }}>{result.sub}</div>
        </div>
      )}

      {/* Bouton ☕ Maintenir */}
      <button
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        disabled={gameOver}
        className={holding ? 'pulse-hold' : ''}
        style={{
          width:200, height:64, borderRadius:28, fontSize:16, fontWeight:900, letterSpacing:.4,
          background: gameOver ? C.card : GOLD,
          color: gameOver ? C.muted : '#fff',
          border:`2px solid ${gameOver?C.border:'transparent'}`,
          boxShadow: holding ? '0 0 0 8px rgba(212,160,23,.25), 0 6px 20px rgba(212,160,23,.5)' : gameOver ? 'none' : '0 6px 20px rgba(212,160,23,.4)',
          cursor: gameOver ? 'not-allowed' : 'pointer',
          touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
          transform: holding ? 'scale(.96)' : 'scale(1)',
          transition:'transform .12s, background .25s, box-shadow .25s',
          animation: holding ? 'pulseHold 1.2s ease-in-out infinite' : 'none'
        }}
      >
        {holding ? '🫖 Tu verses...' : gameOver ? '...' : '☕ Maintenir'}
      </button>

      {/* 3 cartes tips en bas */}
      <div style={{ display:'flex', gap:8, width:'100%', maxWidth:340, marginTop:4 }}>
        <div style={{ flex:1, padding:'10px 6px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, textAlign:'center' }}>
          <div style={{ fontSize:14 }}>✦</div>
          <div style={{ fontSize:10, fontWeight:800, color:'#C17F3C', marginTop:2 }}>90-99%</div>
          <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>+6 🍪</div>
        </div>
        <div style={{ flex:1, padding:'10px 6px', borderRadius:12, background:C.card, border:`1px solid #D4A017`, textAlign:'center', boxShadow:'0 0 12px rgba(212,160,23,.2)' }}>
          <div style={{ fontSize:14 }}>⭐</div>
          <div style={{ fontSize:10, fontWeight:800, color:'#D4A017', marginTop:2 }}>100-105%</div>
          <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>+15 🍪</div>
        </div>
        <div style={{ flex:1, padding:'10px 6px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, textAlign:'center' }}>
          <div style={{ fontSize:14 }}>💧</div>
          <div style={{ fontSize:10, fontWeight:800, color:'#6B3D20', marginTop:2 }}>{`>105%`}</div>
          <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>−5 🍪</div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MARKET — investir des cookies dans le $CKM
════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════
   CLASSEMENT TAB
════════════════════════════════════════════════════ */
function ClassementTab({ leaderboard, user, onOpenProfile, C }){
  const [filter, setFilter] = useState('coins');
  const [showAll, setShowAll] = useState(false);
  const FILTERS = [
    { id:'coins',  label:'Cookies',   metric:'totalEarned',    unit:'🍪'   },
    { id:'score',  label:'Score',     metric:'score',          unit:''     },
    { id:'cafes',  label:'Cafés',     metric:'cafes',          unit:'☕'   },
    { id:'level',  label:'Niveau',    metric:'level',          unit:''     },
    { id:'streak', label:'Série',     metric:'streak',         unit:'j'    },
    { id:'click',  label:'Clics',     metric:'clickRecord',    unit:''     },
  ];
  const current = FILTERS.find(f => f.id === filter) || FILTERS[0];

  const userEntry = {
    name: user.name || 'Toi',
    avatar: user.avatar !== null && user.avatar !== undefined ? user.avatar : 0,
    level: user.level || 1,
    streak: user.streak || 0,
    totalEarned: user.totalEarned || 0,
    clickRecord: user.clickRecord || 0,
    marketRealized: user.marketRealized || 0,
    cafes: user.cafes || 0,
    isUser: true
  };

  const getMetric = (p) => current.metric === 'score' ? leaderboardScore(p) : (p[current.metric] || 0);

  const all = [...leaderboard, userEntry].sort((a,b) => getMetric(b) - getMetric(a));
  const userPos = all.findIndex(p => p.isUser) + 1;
  const totalPlayers = all.length;
  const top3 = all.slice(0, 3);

  const podiumColors = ['#D4A017','#C0B0A0','#C17F3C'];
  const podiumEmojis = ['🥇','🥈','🥉'];

  return (
    <div className="su" style={{ paddingTop:4, paddingBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>CLASSEMENT</div>
        <div style={{ fontSize:11, fontWeight:600, color:C.muted }}>{totalPlayers} joueurs</div>
      </div>

      {/* Carte position du joueur */}
      <button
        onClick={onOpenProfile}
        style={{
          width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
          borderRadius:18, marginBottom:14, background:ESPRESSO,
          border:'2px solid #D4A017',
          boxShadow:'0 6px 20px rgba(212,160,23,.35)',
          textAlign:'left', cursor:'pointer'
        }}
      >
        <div style={{ fontSize:32, fontWeight:900, color:'#F0C050', minWidth:54, textAlign:'center', letterSpacing:'-1px' }}>
          #{userPos}
        </div>
        <AvatarFigure value={userEntry.avatar} size={42} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:800, color:'#fff' }}>{userEntry.name}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.7)' }}>
            Ta position en <strong style={{ color:'#F0C050' }}>{current.label.toLowerCase()}</strong>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:16, fontWeight:900, color:'#F0C050' }}>{getMetric(userEntry).toLocaleString('fr-FR')}</div>
          {current.unit && <div style={{ fontSize:10, color:'rgba(255,255,255,.6)' }}>{current.unit}</div>}
        </div>
      </button>

      {/* Filtres pills */}
      <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto', paddingBottom:2 }}>
        {FILTERS.map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)} style={{
            padding:'6px 12px', borderRadius:18, fontSize:11, fontWeight:700, whiteSpace:'nowrap',
            background:filter===f.id?GOLD:C.card, color:filter===f.id?'#fff':C.muted,
            border:`1px solid ${filter===f.id?'transparent':C.border}`, cursor:'pointer', transition:'all .2s'
          }}>{f.label}</button>
        ))}
      </div>

      {/* Podium top 3 */}
      <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'flex-end' }}>
        {[1,0,2].map(i => {
          const p = top3[i];
          if(!p) return <div key={i} style={{ flex:1 }} />;
          const isUser = p.isUser;
          const heights = [96, 78, 70];
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <div style={{ position:'relative' }}>
                <AvatarFigure value={p.avatar} size={40} ringColor={isUser?'#D4A017':podiumColors[i]} />
                <div style={{ position:'absolute', top:-8, right:-8, fontSize:18 }}>{podiumEmojis[i]}</div>
              </div>
              <div style={{
                width:'100%', borderRadius:'12px 12px 0 0', height:heights[i],
                background: isUser
                  ? 'linear-gradient(180deg, rgba(212,160,23,.3), rgba(212,160,23,.1))'
                  : i===0 ? 'linear-gradient(180deg, rgba(212,160,23,.22), rgba(212,160,23,.05))'
                  : i===1 ? 'linear-gradient(180deg, rgba(192,176,160,.22), rgba(192,176,160,.05))'
                  :         'linear-gradient(180deg, rgba(193,127,60,.22), rgba(193,127,60,.05))',
                border: `1.5px solid ${isUser ? '#D4A017' : podiumColors[i]}`,
                borderBottom:'none',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start',
                padding:'8px 4px'
              }}>
                <div style={{ fontSize:11, fontWeight:800, color:C.text, textAlign:'center', lineHeight:1.2, maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                <div style={{ fontSize:13, fontWeight:900, color: isUser?'#D4A017':podiumColors[i], marginTop:4 }}>
                  {getMetric(p).toLocaleString('fr-FR')}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Liste rang 4+ (top 10 par défaut, voir plus pour le reste) */}
      {(() => {
        const rest = all.slice(3);
        const visibleCount = showAll ? rest.length : Math.min(7, rest.length); // 4-10 par défaut
        const visible = rest.slice(0, visibleCount);
        const userInHidden = !showAll && rest.findIndex(p => p.isUser) >= 7;
        return (
          <>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {visible.map((p, idx) => {
                const rank = idx + 4;
                const isUser = p.isUser;
                return (
                  <div
                    key={`${p.name}-${rank}`}
                    onClick={isUser ? onOpenProfile : undefined}
                    style={{
                      display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:12,
                      background: isUser ? 'rgba(212,160,23,.14)' : C.card,
                      border:`1.5px solid ${isUser ? '#D4A017' : C.border}`,
                      cursor: isUser ? 'pointer' : 'default'
                    }}
                  >
                    <div style={{ fontSize:13, fontWeight:800, color: isUser?'#D4A017':C.muted, minWidth:30 }}>#{rank}</div>
                    <AvatarFigure value={p.avatar} size={32} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:isUser?900:700, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {p.name}{isUser && <span style={{ fontSize:10, marginLeft:6, padding:'2px 6px', borderRadius:6, background:GOLD, color:'#fff', fontWeight:800 }}>TOI</span>}
                      </div>
                      <div style={{ fontSize:10, color:C.muted }}>Niv {p.level} · 🔥 {p.streak} · ☕ {p.cafes || 0}</div>
                    </div>
                    <div style={{ fontSize:14, fontWeight:900, color:isUser?'#D4A017':C.text, textAlign:'right' }}>
                      {getMetric(p).toLocaleString('fr-FR')}
                      {current.unit && <span style={{ fontSize:9, color:C.muted, marginLeft:3 }}>{current.unit}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {rest.length > 7 && (
              <button
                onClick={()=>setShowAll(v => !v)}
                style={{
                  width:'100%', marginTop:10, padding:'10px',
                  borderRadius:12, background:'transparent',
                  border:`1px dashed ${userInHidden ? '#D4A017' : C.border}`,
                  color: userInHidden ? '#D4A017' : C.muted,
                  fontSize:12, fontWeight:700, letterSpacing:.3, cursor:'pointer'
                }}
              >
                {showAll
                  ? 'Voir moins ↑'
                  : `Voir plus (${rest.length - 7})${userInHidden ? ' — tu y es !' : ''} ↓`}
              </button>
            )}
          </>
        );
      })()}

      {/* Message bas */}
      <div style={{ textAlign:'center', marginTop:18, fontSize:12, color:C.muted, fontStyle:'italic' }}>
        {userPos === 1 ? '👑 Tu domines tous les baristas du monde !'
          : userPos <= 3 ? '🏆 Tu es sur le podium — encore un effort !'
          : userPos <= 10 ? '🔥 Top 10 — continue à grimper !'
          : 'Joue plus pour grimper dans le classement ☕'}
      </div>
    </div>
  );
}

function MarketLocked({ level, xp, xpReq, C }) {
  const TARGET_LEVEL = 3;
  const xpDone   = 100 * ((level-1)*level)/2 + xp;
  const xpTarget = 100 * ((TARGET_LEVEL-1)*TARGET_LEVEL)/2;
  const pct      = Math.min((xpDone/xpTarget)*100, 100);
  const xpLeft   = Math.max(0, xpTarget - xpDone);
  return (
    <div className="su" style={{ paddingTop:30, textAlign:'center' }}>
      <div style={{ width:88, height:88, borderRadius:'50%', margin:'0 auto 18px', background:ESPRESSO, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 10px 28px rgba(74,44,23,.4)' }}>
        <Lock size={36} color="#D4A017" />
      </div>
      <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:6 }}>MARCHÉ $CKM</div>
      <div style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:8 }}>Marché indisponible pour le moment</div>
      <div style={{ fontSize:13, color:C.muted, lineHeight:1.55, maxWidth:300, margin:'0 auto 22px' }}>
        Pour ouvrir une position sur le $CKM, il te faut atteindre le <strong style={{ color:C.text }}>niveau 3</strong>.
        Continue à jouer pour accumuler de l'XP.
      </div>

      <div style={{ borderRadius:18, padding:16, background:C.card, border:`1px solid ${C.border}`, maxWidth:340, margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:C.muted, marginBottom:8 }}>
          <span>Niveau {level} · {LEVEL_NAMES[level]}</span>
          <span>{xpDone} / {xpTarget} XP</span>
        </div>
        <div style={{ height:8, borderRadius:4, background:C.card2, overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:4, width:`${pct}%`, background:GOLD, transition:'width .8s cubic-bezier(.36,.07,.19,.97)' }} />
        </div>
        <div style={{ marginTop:10, fontSize:11, color:C.muted }}>
          Encore {xpLeft} XP avant le niveau 3.
        </div>
      </div>

      <div style={{ marginTop:22, fontSize:11, color:C.muted, fontStyle:'italic' }}>
        💡 Le quiz et la roue sont les moyens les plus rapides de gagner de l'XP.
      </div>
    </div>
  );
}


const PRICE_MIN  = 30;
const PRICE_MAX  = 500;
const PRICE_REF  = 100;
const HISTORY_N  = 100;
const TICK_MS    = 1500;
const BIG_MOVE_PCT = 8;

/* Événements de marché — règle simple : bonne nouvelle = hausse, mauvaise = baisse.
   biasPct = pression %/tick, ticks = durée. kind: 'small' fréquent / 'big' rare et violent */
const MARKET_EVENTS = [
  /* SMALL — petits mouvements, fréquents */
  // — positifs
  { id:'salon_paris',    kind:'small', label:'Salon du café à Paris',  emoji:'🥐', biasPct:+1.0, ticks:7, desc:'Engouement parisien — flux acheteur léger' },
  { id:'foire_milan',    kind:'small', label:'Foire de Milan',         emoji:'🎪', biasPct:+1.2, ticks:6, desc:'Hype italienne — petite poussée' },
  { id:'tweet_viral',    kind:'small', label:"Tweet d'un influenceur", emoji:'📱', biasPct:+0.9, ticks:5, desc:'Le café fait le buzz — micro-rally' },
  { id:'meteo_colombie', kind:'small', label:'Météo idéale en Colombie',emoji:'☀️', biasPct:+0.8, ticks:7, desc:'Conditions parfaites — confiance en hausse' },
  // — négatifs
  { id:'pluies_bogota',  kind:'small', label:'Pluies abondantes à Bogota', emoji:'🌧️', biasPct:-0.9, ticks:6, desc:'Récolte abîmée — petit fléchissement' },
  { id:'greve_baristas', kind:'small', label:'Grève des baristas',         emoji:'☕', biasPct:-1.0, ticks:6, desc:'Demande en pause — petit creux' },
  { id:'promo_super',    kind:'small', label:'Promo en supermarché',       emoji:'🛒', biasPct:-0.7, ticks:8, desc:'Soldes marque blanche — flux vendeur' },
  { id:'rapport_sante',  kind:'small', label:'Rapport santé moins flatteur', emoji:'📰', biasPct:-1.0, ticks:7, desc:'Article négatif — méfiance légère' },

  /* BIG — événements rares, peuvent retourner le marché */
  // — positifs
  { id:'concours_or',  kind:'big', label:'Médaille d\'or au Concours mondial', emoji:'🏆', biasPct:+5.0, ticks:8,  desc:'Le café star du moment — boom acheteur' },
  { id:'boom_tech',    kind:'big', label:'Boom du café dans la tech',          emoji:'🚀', biasPct:+4.5, ticks:9,  desc:'Les startups en raffolent — flambée' },
  { id:'star_endorse', kind:'big', label:'Une star adore les cookies',         emoji:'🌟', biasPct:+4.0, ticks:7,  desc:'Ruée mondiale sur le produit' },
  // — négatifs
  { id:'frost_ethiopia', kind:'big', label:'Gel destructeur en Éthiopie',    emoji:'❄️', biasPct:-5.0, ticks:8,  desc:'Récolte anéantie — panique vendeuse' },
  { id:'maladie_caf',    kind:'big', label:'Maladie du caféier en Asie',     emoji:'🦠', biasPct:-4.0, ticks:9,  desc:'Plantations infectées — défiance massive' },
  { id:'krach_commod',   kind:'big', label:'Krach des matières premières',   emoji:'📉', biasPct:-5.0, ticks:8,  desc:'Panique générale — vague vendeuse' },
  { id:'regul_surprise', kind:'big', label:'Régulation surprise',            emoji:'🏛️', biasPct:-3.5, ticks:10, desc:'Nouvelle taxe — cours plombé durablement' },

  /* MEGA — événements bouleversants, ultra-rares. Capables de tout effacer ou de tout faire bondir. */
  // — bearish
  { id:'mega_crash',      kind:'mega', label:'Effondrement total du marché',  emoji:'💀', biasPct:-9.0, ticks:11, desc:'Liquidation mondiale — fuis ou perds tout' },
  { id:'apocalypse_caf',  kind:'mega', label:'Apocalypse café',               emoji:'🌋', biasPct:-8.0, ticks:13, desc:"La filière s'écroule — chaos boursier total" },
  // — bullish
  { id:'cafe_revolution', kind:'mega', label:'Révolution du café artisanal',  emoji:'🚀', biasPct:+9.0, ticks:11, desc:'Le monde entier en redemande — explosion historique' },
  { id:'cookie_mania',    kind:'mega', label:'Cookie-mania mondiale',         emoji:'🌟', biasPct:+8.0, ticks:13, desc:"Frénésie planétaire — flux acheteur record" },
];

const SMALL_EVENTS = MARKET_EVENTS.filter(e => e.kind === 'small');
const BIG_EVENTS   = MARKET_EVENTS.filter(e => e.kind === 'big');
const MEGA_EVENTS  = MARKET_EVENTS.filter(e => e.kind === 'mega');

function nextPrice(p, bias=0){
  /* mean reversion vers 100 — asymétrique : rebond renforcé sous 70, atténuée sinon */
  const dev = (p - PRICE_REF) / PRICE_REF;            // -0.9 .. +4
  const reversionK = dev < -0.3 ? 0.85 : 0.30;        // grosse force de rappel après crash
  const reversion = -reversionK * dev;                // pull % vers 100
  const drift = dev < -0.3 ? 0.40 : 0.18;             // drift renforcé en zone basse
  /* tirage de la catégorie */
  const r = Math.random();
  let pct;
  if(r < 0.01)      pct = (20 + Math.random()*10);    // crash/moonshot 1%
  else if(r < 0.06) pct = (8  + Math.random()*7);     // spike 5%
  else              pct = (2  + Math.random()*2);     // base 94%
  /* sens du pct : légèrement biaisé positif (52/48) */
  pct *= (Math.random() < 0.52) ? 1 : -1;
  /* combine */
  let next = p * (1 + (pct/100) + (reversion/100) + (drift/100) + (bias/100));
  /* bornes */
  if(next < PRICE_MIN) next = PRICE_MIN;
  if(next > PRICE_MAX) next = PRICE_MAX;
  return Math.round(next * 100) / 100;
}

function fmt(n, d=2){ return n.toLocaleString('fr-FR', { minimumFractionDigits:d, maximumFractionDigits:d }); }

function MarketTab({ coins, currentPrice, priceHistory, ckmShares, setCkmShares, ckmCostBasis, setCkmCostBasis, marketTrades, setMarketTrades, marketRealized, setMarketRealized, marketHistory, setMarketHistory, event, eventTicks, bigMoveAt, onSpend, onEarn, onAddCafe, onInvest, C }) {
  const [trade, setTrade] = useState(null);            // 'buy' | 'sell' | null
  const [chartRange, setChartRange] = useState('1min'); // '15s' | '1min' | '5min'
  const openPriceRef = useRef(currentPrice);

  const RANGES = [
    { id:'15s',  label:'15s',  ticks: 5  },
    { id:'1min', label:'1 min', ticks: 20 },
    { id:'5min', label:'5 min', ticks: 100 },
  ];
  const currentRange = RANGES.find(r => r.id === chartRange) || RANGES[1];
  const visibleHistory = priceHistory.slice(-currentRange.ticks);

  const lastTickUp = priceHistory.length >= 2
    ? priceHistory[priceHistory.length - 1] >= priceHistory[priceHistory.length - 2]
    : true;

  const sessionDelta = currentPrice - openPriceRef.current;
  const sessionPct   = (sessionDelta / openPriceRef.current) * 100;

  const portfolioValue = ckmShares * currentPrice;
  const pl       = portfolioValue - ckmCostBasis;
  const plPct    = ckmCostBasis > 0 ? (pl / ckmCostBasis) * 100 : 0;
  const hasShares = ckmShares > 1e-9;

  const buyMax = Math.floor(coins * 0.8);
  const canBuy = buyMax >= 1;

  const bigMoveActive = Date.now() - bigMoveAt < 3500;

  const pushHistory = (entry) => {
    setMarketHistory(h => {
      const next = [{ ...entry, ts: Date.now(), id: Date.now() + Math.random() }, ...(h || [])];
      return next.slice(0, 50);
    });
  };

  /* commit achat */
  const doBuy = (cookiesIn) => {
    const amount = Math.min(cookiesIn, buyMax);
    if(amount <= 0) return;
    const parts = amount / currentPrice;
    onSpend(amount);
    setCkmShares(s => s + parts);
    setCkmCostBasis(b => b + amount);
    setMarketTrades(t => t + 1);
    if(onInvest) onInvest(amount);
    pushHistory({ type:'buy', cost:amount, parts, price:currentPrice });
    setTrade(null);
  };
  /* commit vente */
  const doSell = (partsOut) => {
    const parts = Math.min(partsOut, ckmShares);
    if(parts <= 1e-9) return;
    const proceeds = Math.floor(parts * currentPrice);
    /* coût de base proportionnel retiré */
    const fraction = parts / ckmShares;
    const basisOut = ckmCostBasis * fraction;
    const newShares = ckmShares - parts;
    const newBasis  = newShares < 1e-9 ? 0 : ckmCostBasis - basisOut;
    setCkmShares(newShares);
    setCkmCostBasis(newBasis);
    setMarketTrades(t => t + 1);
    const pnl = proceeds - Math.round(basisOut);
    setMarketRealized(r => r + pnl);
    onEarn(proceeds);
    pushHistory({ type:'sell', proceeds, parts, price:currentPrice, pnl });
    setTrade(null);
  };

  return (
    <div className="su">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, paddingTop:4 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>MARCHÉ $CKM</div>
        <div style={{ fontSize:11, color:C.muted, display:'flex', alignItems:'center', gap:6 }}>
          <span className="live-pulse" style={{ width:7, height:7, borderRadius:'50%', background:'#D4A017', display:'inline-block' }} />
          en direct
        </div>
      </div>

      {/* Bandeau événement */}
      {event && (() => {
        const isMega = event.kind === 'mega';
        const isBig  = event.kind === 'big';
        const isUp   = event.biasPct >= 0;
        const big    = isBig || isMega;

        const padding = isMega ? '16px 14px' : isBig ? '14px 14px' : '12px 14px';
        const bg = isMega
          ? (isUp
              ? 'linear-gradient(135deg, #F5DC8A 0%, #D4A017 50%, #C17F3C 100%)'
              : 'linear-gradient(135deg, #1A0A04 0%, #2A1508 50%, #1A0A04 100%)')
          : isBig
            ? (isUp ? 'linear-gradient(135deg, #D4A017, #C17F3C)' : 'linear-gradient(135deg, #2A1508, #0F0804)')
            : (isUp ? 'linear-gradient(135deg, rgba(212,160,23,.18), rgba(193,127,60,.12))' : 'linear-gradient(135deg, rgba(74,44,23,.92), rgba(45,24,12,.82))');
        const borderColor = isMega ? (isUp ? '#FFE4A0' : '#D4A017') : isBig ? '#D4A017' : (isUp ? '#D4A017' : '#5A3520');
        const borderWidth = isMega ? 3 : isBig ? 2.5 : 1.5;
        const txtColor = isMega ? (isUp ? '#3D2010' : '#F0C050') : big ? (isUp ? '#fff' : '#F0E0C0') : (isUp ? C.text : '#F0E0C0');
        const shadow = isMega
          ? (isUp
              ? '0 0 40px rgba(212,160,23,.85), inset 0 0 0 6px rgba(255,255,255,.25)'
              : '0 0 36px rgba(212,160,23,.7), inset 0 0 0 6px rgba(0,0,0,.35)')
          : isBig ? '0 0 24px rgba(212,160,23,.55)' : 'none';

        return (
          <div className={`bi ${big ? 'pulse-ring' : ''}`} style={{
            display:'flex', alignItems:'center', gap:12,
            padding, borderRadius:16, marginBottom:12,
            background:bg,
            border:`${borderWidth}px solid ${borderColor}`,
            color:txtColor,
            boxShadow:shadow,
            position:'relative', overflow:'hidden'
          }}>
            <div className={isMega ? 'wiggle-anim' : ''} style={{ fontSize: isMega?40:isBig?32:26, flexShrink:0 }}>{event.emoji}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2, flexWrap:'wrap' }}>
                <span style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:isMega?2.5:1.5, color: isMega ? (isUp ? '#3D2010' : '#D4A017') : (big ? (isUp ? '#fff' : '#D4A017') : '#D4A017') }}>
                  {isMega ? (isUp ? '🚀 ÉVÉNEMENT MAJEUR' : '🚨 ALERTE MAJEURE') : isBig ? '🔥 BIG NEWS' : 'News'}
                </span>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:8, background: isMega ? (isUp ? 'rgba(61,32,16,.25)' : 'rgba(212,160,23,.3)') : (big ? 'rgba(255,255,255,.22)' : 'rgba(212,160,23,.22)'), color: isMega ? (isUp ? '#3D2010' : '#F5DC8A') : (big ? '#fff' : '#D4A017') }}>
                  {isUp ? '+' : ''}{event.biasPct}%/tick
                </span>
              </div>
              <div style={{ fontSize: isMega?15:isBig?14:13, fontWeight:900, lineHeight:1.2 }}>{event.label}</div>
              <div style={{ fontSize:11, opacity:.9, marginTop:2 }}>{event.desc}</div>
            </div>
            <div style={{ fontSize:11, fontWeight:700, opacity:.8, flexShrink:0 }}>{eventTicks} t</div>
          </div>
        );
      })()}

      {/* Carte prix */}
      <div style={{ borderRadius:22, padding:18, background:ESPRESSO, marginBottom:12, position:'relative', overflow:'hidden', boxShadow:'0 8px 24px rgba(74,44,23,.35)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:2, marginBottom:4 }}>PRIX ACTUEL</div>
            <div key={currentPrice} className="market-tick" style={{ fontSize:34, fontWeight:900, color:'#fff', lineHeight:1, letterSpacing:'-1px' }}>
              {fmt(currentPrice)} <span style={{ fontSize:18, color:'rgba(255,255,255,.65)' }}>🍪</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:8, fontSize:13, fontWeight:700, color: sessionDelta>=0?'#F0C050':'#A88060' }}>
              {sessionDelta>=0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
              {sessionDelta>=0?'+':''}{fmt(sessionPct)}% <span style={{ color:'rgba(255,255,255,.45)', fontWeight:500, marginLeft:4 }}>(session)</span>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:2, marginBottom:4 }}>1 $CKM =</div>
            <div style={{ fontSize:14, fontWeight:700, color:'#F0C050' }}>{fmt(currentPrice)} 🍪</div>
          </div>
        </div>

        {/* Range selector */}
        <div style={{ display:'flex', gap:6, marginBottom:8, justifyContent:'flex-end' }}>
          {RANGES.map(r => {
            const active = r.id === chartRange;
            return (
              <button
                key={r.id}
                onClick={()=>setChartRange(r.id)}
                style={{
                  padding:'4px 12px', borderRadius:10, fontSize:11, fontWeight:700, letterSpacing:.3,
                  background: active ? 'rgba(212,160,23,.25)' : 'rgba(255,255,255,.06)',
                  color: active ? '#F0C050' : 'rgba(255,255,255,.6)',
                  border: `1px solid ${active ? 'rgba(212,160,23,.5)' : 'rgba(255,255,255,.1)'}`,
                  cursor:'pointer', transition:'all .2s'
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Sparkline SVG */}
        <Sparkline history={visibleHistory} up={lastTickUp} />
      </div>

      {/* Portefeuille */}
      <div style={{ borderRadius:18, padding:16, background:C.card, border:`1px solid ${C.border}`, marginBottom:12 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>PORTEFEUILLE</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <div>
            <div style={{ fontSize:11, color:C.muted, marginBottom:2 }}>Parts détenues</div>
            <div style={{ fontSize:18, fontWeight:800, color:C.text }}>{fmt(ckmShares, 3)} <span style={{ fontSize:11, color:C.muted, fontWeight:700 }}>$CKM</span></div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:2 }}>Valeur</div>
            <div style={{ fontSize:18, fontWeight:800, color:C.text }}>{fmt(portfolioValue)} <span style={{ fontSize:11, color:C.muted, fontWeight:700 }}>🍪</span></div>
          </div>
        </div>
        {hasShares ? (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 12px', borderRadius:11, background: pl>=0 ? 'rgba(212,160,23,.1)' : 'rgba(74,44,23,.12)', border:`1px solid ${pl>=0?'rgba(212,160,23,.3)':'rgba(74,44,23,.3)'}` }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>Plus / moins-value</span>
            <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:14, fontWeight:800, color: pl>=0?'#D4A017':'#7D4E1F' }}>
              {pl>=0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {pl>=0?'+':''}{fmt(pl)} 🍪 <span style={{ fontSize:11, fontWeight:700, opacity:.75 }}>({pl>=0?'+':''}{fmt(plPct)}%)</span>
            </span>
          </div>
        ) : (
          <div style={{ fontSize:12, color:C.muted, fontStyle:'italic', textAlign:'center', padding:'4px 0' }}>
            Investis tes cookies pour suivre ta P&L ici
          </div>
        )}
      </div>

      {/* Boutons trade */}
      <div style={{ display:'flex', gap:10 }}>
        <button
          onClick={()=>setTrade('buy')}
          disabled={!canBuy}
          className={canBuy && bigMoveActive ? 'pulse-ring' : ''}
          style={{ flex:1, padding:'14px 0', borderRadius:16, fontSize:14, fontWeight:800, background: canBuy?GOLD:C.card, color: canBuy?'#fff':C.muted, border:`2px solid ${canBuy?'transparent':C.border}`, boxShadow: canBuy?'0 4px 14px rgba(212,160,23,.35)':'none', letterSpacing:.3, cursor:canBuy?'pointer':'not-allowed' }}
        >
          Acheter
        </button>
        <button
          onClick={()=>setTrade('sell')}
          disabled={!hasShares}
          style={{ flex:1, padding:'14px 0', borderRadius:16, fontSize:14, fontWeight:800, background: hasShares?ESPRESSO:C.card, color: hasShares?'#fff':C.muted, border:`2px solid ${hasShares?'transparent':C.border}`, letterSpacing:.3, cursor:hasShares?'pointer':'not-allowed' }}
        >
          Vendre
        </button>
      </div>

      {/* Tout vendre — liquide la position en un clic */}
      {hasShares && (
        <button
          onClick={()=>doSell(ckmShares)}
          style={{
            width:'100%', marginTop:8, padding:'12px 0', borderRadius:14,
            fontSize:13, fontWeight:800, letterSpacing:.3,
            background:'transparent', color:'#D4A017',
            border:'1.5px solid #D4A017',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            cursor:'pointer'
          }}
        >
          ⚡ Tout vendre maintenant ({Math.floor(ckmShares * currentPrice)} 🍪)
        </button>
      )}

      {!canBuy && !hasShares && (
        <div style={{ marginTop:12, fontSize:11, color:C.muted, textAlign:'center', lineHeight:1.5 }}>
          Tu as besoin d'au moins quelques cookies pour investir.
        </div>
      )}

      {/* Stats trades */}
      {marketTrades > 0 && (
        <div style={{ marginTop:14, padding:'12px 14px', borderRadius:14, background:C.card, border:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
          <div>
            <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5 }}>Mes trades</div>
            <div style={{ fontSize:18, fontWeight:800, color:C.text, marginTop:2 }}>{marketTrades}</div>
          </div>
          <div style={{ width:1, alignSelf:'stretch', background:C.border }} />
          <div style={{ flex:1, textAlign:'right' }}>
            <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5 }}>Réalisé</div>
            <div style={{ fontSize:18, fontWeight:800, color: marketRealized > 0 ? '#D4A017' : marketRealized < 0 ? '#7D4E1F' : C.text, marginTop:2 }}>
              {marketRealized >= 0 ? '+' : ''}{marketRealized} 🍪
            </div>
          </div>
        </div>
      )}

      {/* Historique des trades */}
      {Array.isArray(marketHistory) && marketHistory.length > 0 && (
        <details style={{ marginTop:10, borderRadius:14, background:C.card, border:`1px solid ${C.border}`, overflow:'hidden' }}>
          <summary style={{
            padding:'12px 14px', cursor:'pointer', listStyle:'none',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            fontSize:12, fontWeight:800, color:C.text, letterSpacing:.3
          }}>
            <span style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:14 }}>📜</span>
              Historique ({marketHistory.length})
            </span>
            <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>Voir →</span>
          </summary>
          <div style={{ maxHeight:280, overflowY:'auto', borderTop:`1px solid ${C.border}` }}>
            {marketHistory.map(t => {
              const d = new Date(t.ts);
              const today = new Date();
              const isToday = d.toDateString() === today.toDateString();
              const yesterday = new Date(); yesterday.setDate(today.getDate()-1);
              const isYesterday = d.toDateString() === yesterday.toDateString();
              const dateLabel = isToday ? `Aujourd'hui ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
                : isYesterday ? `Hier ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
                : `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
              const isBuy = t.type === 'buy';
              return (
                <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:`1px solid ${C.border}`, fontSize:12 }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{isBuy ? '🛒' : '💰'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                      <span style={{ fontWeight:800, color: isBuy ? '#C17F3C' : '#D4A017' }}>
                        {isBuy ? 'Achat' : 'Vente'} · {fmt(t.parts, 3)} $CKM
                      </span>
                      <span style={{ fontWeight:700, color:C.text, whiteSpace:'nowrap' }}>
                        {isBuy ? `−${t.cost}` : `+${t.proceeds}`} 🍪
                      </span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginTop:2, fontSize:10, color:C.muted }}>
                      <span>@ {fmt(t.price)} 🍪 · {dateLabel}</span>
                      {!isBuy && (
                        <span style={{ fontWeight:700, color: t.pnl > 0 ? '#D4A017' : t.pnl < 0 ? '#7D4E1F' : C.muted }}>
                          {t.pnl >= 0 ? '+' : ''}{t.pnl} 🍪
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* Convertisseur Cookies → CF */}
      <div style={{ marginTop:14, padding:'14px 14px', borderRadius:14, background:'linear-gradient(135deg, rgba(74,44,23,.95), rgba(45,24,12,.85))', border:'1.5px solid rgba(212,160,23,.4)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#F0C050', textTransform:'uppercase', letterSpacing:1.5, marginBottom:2 }}>Convertir</div>
          <div style={{ fontSize:13, fontWeight:800, color:'#fff', lineHeight:1.3 }}>1 000 🍪 → 1 ☕</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:2 }}>Échange rare et coûteux</div>
        </div>
        <button
          onClick={()=>{
            if(coins < 1000) return;
            onSpend(1000);
            if(onAddCafe) onAddCafe(1);
          }}
          disabled={coins < 1000}
          style={{
            padding:'10px 18px', borderRadius:14, fontSize:13, fontWeight:900, letterSpacing:.4,
            background: coins >= 1000 ? GOLD : 'rgba(255,255,255,.08)',
            color: coins >= 1000 ? '#fff' : 'rgba(255,255,255,.45)',
            border:`1.5px solid ${coins >= 1000 ? 'transparent' : 'rgba(255,255,255,.15)'}`,
            boxShadow: coins >= 1000 ? '0 4px 14px rgba(212,160,23,.45)' : 'none',
            cursor: coins >= 1000 ? 'pointer' : 'not-allowed', flexShrink:0
          }}
        >
          Convertir
        </button>
      </div>

      {/* Légende compacte */}
      <div style={{ marginTop:14, padding:'10px 12px', borderRadius:12, background:C.card, border:`1px solid ${C.border}`, fontSize:11, color:C.muted, lineHeight:1.5 }}>
        Le $CKM est volatil — variations ±2 à ±30% toutes les {TICK_MS/1000}s. Les <strong style={{ color:C.text }}>News</strong> font bouger le cours pendant ~20-30s. Investis max 80% de tes cookies actifs.
      </div>

      {trade && (
        <TradeModal
          mode={trade}
          onClose={()=>setTrade(null)}
          coins={coins}
          buyMax={buyMax}
          shares={ckmShares}
          price={currentPrice}
          onBuy={doBuy}
          onSell={doSell}
          C={C}
        />
      )}
    </div>
  );
}

/* ─ Sparkline SVG (60 derniers prix) ─ */
function Sparkline({ history, up }) {
  const W = 300, H = 80, PAD = 4;
  const pts = history.length >= 2 ? history : [history[0] ?? PRICE_REF, history[0] ?? PRICE_REF];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = (max - min) || 1;
  const stepX = pts.length > 1 ? (W - PAD*2) / (pts.length - 1) : 0;
  const yOf = (v) => PAD + (1 - (v - min) / span) * (H - PAD*2);
  const coords = pts.map((v,i) => [PAD + i*stepX, yOf(v)]);
  const linePath = coords.map(([x,y],i) => (i===0?`M${x.toFixed(1)} ${y.toFixed(1)}`:`L${x.toFixed(1)} ${y.toFixed(1)}`)).join(' ');
  const areaPath = `${linePath} L${(PAD + (pts.length-1)*stepX).toFixed(1)} ${H-PAD} L${PAD} ${H-PAD} Z`;
  const stroke = up ? '#D4A017' : '#4A2C17';
  const gradId = up ? 'sparkUp' : 'sparkDown';
  const gradColor = up ? '#D4A017' : '#7D4E1F';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width:'100%', height:80, display:'block', overflow:'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={gradColor} stopOpacity=".55" />
          <stop offset="100%" stopColor={gradColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} style={{ transition:'d .25s ease' }} />
      <path d={linePath}  fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" style={{ transition:'d .25s ease, stroke .25s ease', filter:'drop-shadow(0 1px 2px rgba(0,0,0,.25))' }} />
      {coords.length > 0 && (
        <circle cx={coords[coords.length-1][0]} cy={coords[coords.length-1][1]} r="3.2" fill="#fff" stroke={stroke} strokeWidth="2" style={{ transition:'cx .25s ease, cy .25s ease' }} />
      )}
    </svg>
  );
}

/* ─ Trade modal (achat / vente) ─ */
function TradeModal({ mode, onClose, coins, buyMax, shares, price, onBuy, onSell, C }) {
  const [currentMode, setCurrentMode] = useState(mode);
  const isBuy = currentMode === 'buy';
  const max   = isBuy ? buyMax : shares;
  const [amount, setAmount] = useState(0);

  const clamp = (v) => Math.max(0, Math.min(v, max));
  const setPct = (p) => setAmount(isBuy ? Math.floor(max * p) : Math.round(max * p * 1000) / 1000);
  const onInput = (e) => {
    const raw = e.target.value.replace(',', '.');
    if(raw === '' || raw === '.') { setAmount(0); return; }
    const v = parseFloat(raw);
    if(isNaN(v)) return;
    setAmount(clamp(v));
  };
  const step = isBuy ? Math.max(1, Math.round(buyMax / 50)) : Math.max(0.001, Math.round((shares/50)*1000)/1000);
  const inc = () => setAmount(a => clamp((isBuy ? Math.floor(a) : a) + step));
  const dec = () => setAmount(a => clamp((isBuy ? Math.floor(a) : a) - step));

  /* Slider */
  const sliderPct = max > 0 ? (amount / max) * 100 : 0;
  const onSlider = (e) => {
    const pct = Number(e.target.value);
    setAmount(isBuy ? Math.floor(max * pct/100) : Math.round((max * pct/100) * 1000) / 1000);
  };

  /* Reset l'amount quand on switch buy/sell */
  const switchTo = (m) => {
    if(m === currentMode) return;
    setCurrentMode(m);
    setAmount(0);
  };

  const previewParts    = isBuy ? (price > 0 ? amount / price : 0) : amount;
  const previewProceeds = isBuy ? null : Math.floor(amount * price);
  const valid = isBuy ? (amount >= 1 && amount <= buyMax) : (amount > 1e-6 && amount <= shares);
  const canSwitchSell = shares > 1e-9;
  const canSwitchBuy  = buyMax >= 1;

  const confirm = () => {
    if(!valid) return;
    if(isBuy) onBuy(amount); else onSell(amount);
  };

  const tabBg = (active, isBuyTab) => active
    ? (isBuyTab ? GOLD : ESPRESSO)
    : 'transparent';

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.78)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:80, backdropFilter:'blur(6px)' }}>
      <div onClick={e=>e.stopPropagation()} className="bi" style={{ background:C.card, borderTopLeftRadius:24, borderTopRightRadius:24, padding:'18px 18px 22px', width:'100%', maxWidth:430, border:`1px solid ${C.border}`, boxShadow:'0 -10px 32px rgba(0,0,0,.35)' }}>

        {/* Petite poignée */}
        <div style={{ width:40, height:4, borderRadius:2, background:C.border, margin:'0 auto 14px' }} />

        {/* Toggle Buy / Sell */}
        <div style={{ display:'flex', gap:6, padding:4, borderRadius:14, background:C.card2, marginBottom:14 }}>
          <button
            onClick={()=>canSwitchBuy && switchTo('buy')}
            disabled={!canSwitchBuy}
            style={{
              flex:1, padding:'10px 0', borderRadius:10, fontSize:13, fontWeight:800, letterSpacing:.4,
              background: tabBg(isBuy, true),
              color: isBuy ? '#fff' : (canSwitchBuy ? C.text : C.muted),
              cursor: canSwitchBuy ? 'pointer' : 'not-allowed',
              boxShadow: isBuy ? '0 4px 12px rgba(212,160,23,.4)' : 'none'
            }}
          >
            ACHETER
          </button>
          <button
            onClick={()=>canSwitchSell && switchTo('sell')}
            disabled={!canSwitchSell}
            style={{
              flex:1, padding:'10px 0', borderRadius:10, fontSize:13, fontWeight:800, letterSpacing:.4,
              background: tabBg(!isBuy, false),
              color: !isBuy ? '#fff' : (canSwitchSell ? C.text : C.muted),
              cursor: canSwitchSell ? 'pointer' : 'not-allowed',
              boxShadow: !isBuy ? '0 4px 12px rgba(74,44,23,.4)' : 'none'
            }}
          >
            VENDRE
          </button>
        </div>

        {/* Prix actuel + max */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, fontSize:11 }}>
          <span style={{ color:C.muted }}>$CKM @ <strong style={{ color:C.text }}>{fmt(price)} 🍪</strong></span>
          <span style={{ color:C.muted }}>Max : <strong style={{ color:C.text }}>{isBuy ? `${buyMax} 🍪` : `${fmt(shares,3)} $CKM`}</strong></span>
        </div>

        {/* Stepper + input */}
        <div style={{ display:'flex', alignItems:'stretch', gap:8, marginBottom:10 }}>
          <button onClick={dec} disabled={amount<=0} style={{ width:46, borderRadius:14, background:C.card2, border:`1.5px solid ${C.border}`, fontSize:24, fontWeight:800, color:amount<=0?C.muted:C.text, cursor:amount<=0?'not-allowed':'pointer' }}>−</button>
          <div style={{ flex:1, position:'relative' }}>
            <input
              type="text" inputMode="decimal"
              value={amount === 0 ? '' : (isBuy ? String(Math.floor(amount)) : fmt(amount, 3))}
              onChange={onInput}
              placeholder="0"
              style={{ width:'100%', padding:'14px 14px 14px 14px', fontSize:24, fontWeight:800, background:C.card2, border:`2px solid ${valid?'#D4A017':C.border}`, borderRadius:14, color:C.text, outline:'none', textAlign:'center', transition:'border-color .2s' }}
            />
            <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', fontSize:11, color:C.muted, fontWeight:700, pointerEvents:'none' }}>
              {isBuy ? '🍪' : '$CKM'}
            </span>
          </div>
          <button onClick={inc} disabled={amount>=max} style={{ width:46, borderRadius:14, background:C.card2, border:`1.5px solid ${C.border}`, fontSize:24, fontWeight:800, color:amount>=max?C.muted:C.text, cursor:amount>=max?'not-allowed':'pointer' }}>+</button>
        </div>

        {/* Slider */}
        <div style={{ padding:'4px 4px 6px' }}>
          <input
            type="range"
            min={0} max={100} step={1}
            value={Math.round(sliderPct)}
            onChange={onSlider}
            style={{
              width:'100%', height:6, borderRadius:3, appearance:'none', cursor:'pointer',
              background:`linear-gradient(to right, ${isBuy?'#D4A017':'#7D4E1F'} 0%, ${isBuy?'#D4A017':'#7D4E1F'} ${sliderPct}%, ${C.card2} ${sliderPct}%, ${C.card2} 100%)`
            }}
          />
        </div>

        {/* Pills % */}
        <div style={{ display:'flex', gap:6, marginBottom:14 }}>
          {[0.25, 0.5, 0.75, 1].map(p => {
            const isMax = p === 1;
            return (
              <button
                key={p}
                onClick={()=>setPct(p)}
                style={{
                  flex:1, padding:'9px 0', borderRadius:10, fontSize:11, fontWeight:800, letterSpacing:.3,
                  background: isMax ? (isBuy?GOLD:ESPRESSO) : C.card2,
                  color: isMax ? '#fff' : C.text,
                  border: `1px solid ${isMax ? 'transparent' : C.border}`,
                  cursor:'pointer',
                  boxShadow: isMax ? '0 3px 10px rgba(74,44,23,.25)' : 'none'
                }}
              >
                {isMax ? 'MAX' : `${p*100}%`}
              </button>
            );
          })}
        </div>

        {/* Preview compacte */}
        <div style={{ borderRadius:14, padding:'12px 14px', background:C.card2, border:`1px solid ${C.border}`, marginBottom:14, fontSize:13 }}>
          {isBuy ? (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ color:C.muted }}>Tu obtiens</span>
                <span style={{ fontWeight:800, color:'#D4A017' }}>{fmt(previewParts, 3)} $CKM</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:C.muted }}>Cookies restants</span>
                <span style={{ fontWeight:700, color:C.text }}>{coins - Math.floor(amount)} 🍪</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ color:C.muted }}>Tu reçois</span>
                <span style={{ fontWeight:800, color:'#D4A017' }}>{previewProceeds} 🍪</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:C.muted }}>Parts restantes</span>
                <span style={{ fontWeight:700, color:C.text }}>{fmt(Math.max(0, shares-amount), 3)} $CKM</span>
              </div>
            </>
          )}
        </div>

        {/* Bouton confirmation */}
        <button
          onClick={confirm} disabled={!valid}
          className={valid ? 'pulse-ring' : ''}
          style={{ width:'100%', padding:16, borderRadius:16, fontSize:16, fontWeight:900, background: valid ? (isBuy?GOLD:ESPRESSO) : C.card2, color: valid?'#fff':C.muted, border:`2px solid ${valid?'transparent':C.border}`, boxShadow: valid?'0 8px 22px rgba(74,44,23,.35)':'none', letterSpacing:.5, cursor:valid?'pointer':'not-allowed' }}
        >
          {isBuy
            ? `Acheter pour ${Math.floor(amount)} 🍪`
            : `Vendre pour ${previewProceeds || 0} 🍪`}
        </button>
      </div>
    </div>
  );
}

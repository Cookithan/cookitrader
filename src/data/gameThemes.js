/* ════════════════════════════════════════════════════
   GAME THEMES — skins & variantes de mini-jeux
   ────────────────────────────────────────────────────
   Catalogue des thèmes thématisables. Un thème = un id + un `data`
   appliqué par le jeu. Deux types :
     - 'skin'    : purement cosmétique (couleurs, bg, emojis)
     - 'variant' : modifie la mécanique (gravité, règles…) +
                   éventuellement le cosmétique

   Chaque jeu thématisable a un thème "default" gratuit (free:true),
   les autres sont achetables (cost + currency 'cookie' | 'cafe').

   Activation : un mapping { gameId → themeId } est stocké en LS via
   useLocalStorage('gameThemes', {}). Vide = default partout. Un thème
   doit être unlocked (cf. `unlocked` array) pour être sélectionnable.

   Architecture :
     - GAME_THEMES        : liste plate (utilisée pour la boutique aussi)
     - DEFAULT_THEME_IDS  : map gameId → defaultId (fallback)
     - THEMABLE_GAMES     : liste des gameIds thématisables (UI lookup)
     - getThemeById(id)
     - getThemesForGame(gameId)
     - getActiveTheme(gameId, themeMap) : combine LS + fallback default
     - isThemeUnlocked(theme, unlocked) : check accès
═══════════════════════════════════════════════════════ */

/* Liste des jeux thématisables (ordre d'affichage dans Settings → Apparence → Jeux). */
export const THEMABLE_GAMES = ['catcher', 'flappy', 'guess', 'memory'];

/* Fallback default par jeu — si themeMap[gameId] est absent ou invalide. */
export const DEFAULT_THEME_IDS = {
  catcher: 'catcher_default',
  flappy:  'flappy_default',
  guess:   'guess_default',
  memory:  'memory_default',
};

/* ════════════════════════════════════════════════════
   CATALOGUE
   ────────────────────────────────────────────────────
   Conventions :
   - `name` (FR) + `name_en` ; idem `description`
   - `cost` est en 🍪 si `currency:'cookie'`, en ☕ si 'cafe'
   - `free:true` → toujours débloqué (les defaults)
   - `data` est consommé par le jeu — sa shape varie selon gameId
   - `preview` : emoji/couleur d'aperçu pour la boutique & le sélecteur
═══════════════════════════════════════════════════════ */
export const GAME_THEMES = [
  /* ── COOKIE CATCHER ───────────────────────────────────────────── */
  {
    id:'catcher_default', gameId:'catcher', type:'skin', free:true,
    name:'Comptoir café',                name_en:'Coffee counter',
    description:'L\'ambiance classique',  description_en:'The classic vibe',
    preview:'☕',
    data:{
      bg:'linear-gradient(180deg, #F5E6D3 0%, #E8D5BB 60%, #C8945A 100%)',
      tasseEmoji:'☕',
      itemEmojis:{ cookie:'🍪', cafe:'☕', glacon:'🧊' },
      glowColor:'rgba(212,160,23,.7)',
      /* Le thème default réagit à la "température" du café :
         glaçons → fond plus clair/bleuté, cafés/cookies → plus sombre. */
      temperatureReactive: true,
    },
  },
  {
    id:'catcher_nuit', gameId:'catcher', type:'skin',
    cost:200, currency:'cookie', levelRequired:4,
    name:'Nuit étoilée',                  name_en:'Starry night',
    description:'Ciel sombre et étoiles', description_en:'Dark sky with stars',
    preview:'🌙',
    data:{
      bg:'radial-gradient(circle at 30% 20%, #2A1747 0%, #1A0830 60%, #0D041C 100%)',
      bgStars:true,
      tasseEmoji:'☕',
      itemEmojis:{ cookie:'🍪', cafe:'☕', glacon:'🧊' },
      glowColor:'rgba(255,232,154,.8)',
      darkArena:true,
    },
  },
  {
    id:'catcher_champ', gameId:'catcher', type:'skin',
    cost:250, currency:'cookie', levelRequired:5,
    name:'Champ de cookies',              name_en:'Cookie field',
    description:'Verdure et soleil doux', description_en:'Greenery and soft sun',
    preview:'🌾',
    data:{
      bg:'linear-gradient(180deg, #FFE8A8 0%, #E8C572 50%, #B5793E 100%)',
      tasseEmoji:'🧺',
      itemEmojis:{ cookie:'🍪', cafe:'🥐', glacon:'🧊' },
      glowColor:'rgba(255,196,0,.7)',
    },
  },
  {
    id:'catcher_inverse', gameId:'catcher', type:'variant',
    cost:5, currency:'cafe', levelRequired:7,
    name:'Mode Inversé',                  name_en:'Inverted mode',
    description:'Gravité inversée — les items remontent, tasse en haut',
    description_en:'Reversed gravity — items rise, cup is on top',
    preview:'🔄',
    data:{
      bg:'linear-gradient(0deg, #F5E6D3 0%, #E8D5BB 60%, #C8945A 100%)',
      tasseEmoji:'☕',
      tasseAtTop:true,            /* tasse en haut, items remontent */
      itemsRiseUp:true,
      itemEmojis:{ cookie:'🍪', cafe:'☕', glacon:'🧊' },
      glowColor:'rgba(212,160,23,.7)',
    },
  },

  /* ── FLAPPY COOKIE ────────────────────────────────────────────── */
  {
    /* Le ciel était BLEU (#a8d5ff) au-dessus de tuyaux bruns : la seule
       surface de l'app à sortir de la palette café, et le contraste
       faisait ressortir les tuyaux comme des corps étrangers.

       Il devient un dégradé mousse de lait → café au lait, dans lequel
       les tuyaux se lisent comme du café torréfié plutôt que comme des
       poteaux posés sur un ciel d'été. (09/09/2026) */
    id:'flappy_default', gameId:'flappy', type:'skin', free:true,
    name:'Café au lait',                  name_en:'Café au lait',
    description:'Mousse de lait et caramel', description_en:'Milk foam and caramel',
    preview:'☕',
    data:{
      skyTop:'#FBEEDA', skyBottom:'#C9925C',
      pipeColor:'#7A4320',
      cookieTint:null,
    },
  },
  {
    id:'flappy_terrasse', gameId:'flappy', type:'skin',
    cost:150, currency:'cookie', levelRequired:12,
    name:'Terrasse parisienne',           name_en:'Parisian terrace',
    description:'Coucher de soleil rosé', description_en:'Pinkish sunset',
    preview:'🗼',
    data:{
      skyTop:'#F8B8C0', skyBottom:'#FFD9A0',
      pipeColor:'#5A2C0A',
      cookieTint:'#D4A017',
    },
  },

  /* ── DEVINE LA COMMANDE ───────────────────────────────────────── */
  {
    id:'guess_default', gameId:'guess', type:'skin', free:true,
    name:'Comptoir français',             name_en:'French counter',
    description:'Bistrot et tasses blanches',
    description_en:'Bistro and white cups',
    preview:'🥐',
    data:{
      accentColor:'#C17F3C',
      bgGradient:null,
    },
  },
  {
    id:'guess_italien', gameId:'guess', type:'skin',
    cost:120, currency:'cookie', levelRequired:6,
    name:'Café italien',                  name_en:'Italian café',
    description:'Espresso et terracotta', description_en:'Espresso and terracotta',
    preview:'🇮🇹',
    data:{
      accentColor:'#A0522D',
      bgGradient:'linear-gradient(160deg, #F8E0C0 0%, #E8B68A 100%)',
    },
  },

  /* ── MEMORY CAFÉ ──────────────────────────────────────────────── */
  {
    id:'memory_default', gameId:'memory', type:'skin', free:true,
    name:'Cartes café',                   name_en:'Coffee cards',
    description:'Le set d\'origine',       description_en:'The original set',
    preview:'🃏',
    data:{
      cardBack:'linear-gradient(135deg, #C17F3C 0%, #7A4320 100%)',
      accentColor:'#D4A017',
    },
  },
  {
    id:'memory_saveurs', gameId:'memory', type:'skin',
    cost:180, currency:'cookie', levelRequired:3,
    name:'Saveurs gourmandes',            name_en:'Sweet flavors',
    description:'Caramel, vanille, cacao', description_en:'Caramel, vanilla, cocoa',
    preview:'🍮',
    data:{
      cardBack:'linear-gradient(135deg, #F8C078 0%, #B5793E 100%)',
      accentColor:'#F0C050',
    },
  },
];

/* ────────────────────────────────────────────────────
   HELPERS
   ──────────────────────────────────────────────────── */

export function getThemeById(themeId){
  if(!themeId) return null;
  return GAME_THEMES.find(t => t.id === themeId) || null;
}

export function getThemesForGame(gameId){
  return GAME_THEMES.filter(t => t.gameId === gameId);
}

/* Retourne le thème actif pour `gameId` : lit `themeMap[gameId]` (mapping
   joueur), fallback sur DEFAULT_THEME_IDS si manquant ou si le thème
   stocké n'existe plus (sécurité contre LS périmé). */
export function getActiveTheme(gameId, themeMap){
  const wantedId = themeMap?.[gameId];
  const wanted   = getThemeById(wantedId);
  if(wanted) return wanted;
  return getThemeById(DEFAULT_THEME_IDS[gameId]);
}

/* Un thème est accessible si gratuit (free:true) ou présent dans le
   array `unlocked` du joueur. Les defaults sont toujours débloqués. */
export function isThemeUnlocked(theme, unlocked){
  if(!theme) return false;
  if(theme.free) return true;
  return Array.isArray(unlocked) && unlocked.includes(theme.id);
}

/* Préfixe par jeu pour distinguer les skins dans la boutique
   (ex: "Catcher · Nuit étoilée"). Mappé sur t('games_list.<id>_title')
   serait idéal mais ici on est dans data/ — on garde un mapping local. */
const GAME_LABEL_FR = { catcher:'Catcher', flappy:'Flappy', guess:'Devine', memory:'Memory' };
const GAME_LABEL_EN = { catcher:'Catcher', flappy:'Flappy', guess:'Guess',  memory:'Memory' };

/* Convertit les thèmes non-gratuits en entrées REWARDS-compatibles pour
   alimenter la boutique. Le système d'achat existant (App.unlockReward)
   les traite comme des items normaux : débit cookies/cafés + ajout à
   `unlocked` → ils deviennent automatiquement sélectionnables dans
   Settings → Apparence → Jeux. */
export const GAME_THEME_REWARDS = GAME_THEMES
  .filter(t => !t.free)
  .map(t => ({
    id:            t.id,
    name:          `${GAME_LABEL_FR[t.gameId] || t.gameId} · ${t.name}`,
    name_en:       `${GAME_LABEL_EN[t.gameId] || t.gameId} · ${t.name_en || t.name}`,
    desc:          t.description       || '',
    desc_en:       t.description_en    || t.description || '',
    cost:          t.cost,
    currency:      t.currency || 'cookie',
    type:          'Jeux',
    emoji:         t.preview || '🎨',
    levelRequired: t.levelRequired || 1,
    /* Marqueur consommé par isCountable() dans BoutiqueTab : ces skins
       ne bloquent PAS la progression niveau-par-niveau (il faut acheter
       tout l'actuel pour révéler le suivant). Restent optionnels. */
    applyAs:       'game_theme',
    gameId:        t.gameId,
  }));



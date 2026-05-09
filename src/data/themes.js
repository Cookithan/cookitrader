/* ════════════════════════════════════════════════════
   THÈMES & PALETTES
   - DK / LT  : palettes par défaut (sombre / clair)
   - THEMES   : palettes nommées débloquables (theme_creme, _espresso, _caramel, _chocolat, _legendaire, _cosmos)
   - GOLD / ESPRESSO : gradients hardcodés réutilisés partout
   - ROUE_PALETTES   : couleurs des 11 segments par skin de roue
   - ROUE_GLOWS      : halo lumineux par skin
   - COOKIE_SKINS    : palette body/chip/ring/cracks par skin de cookie
   Toute couleur reste dans la palette café/cookie/caramel/or — pas de rouge ni de vert.
════════════════════════════════════════════════════ */

export const DK = { bg:'#0F0804', card:'#1E100A', card2:'#2A1508', text:'#F0E6D3', muted:'#6A5040', border:'#3D2015' };
export const LT = { bg:'#F5EFE6', card:'#FDFAF6', card2:'#F0E8DC', text:'#2C1810', muted:'#8B6A5A', border:'#E8DDD0' };

export const THEMES = {
  theme_creme:     { dark:false, bg:'#F8E5D5', card:'#FFF1E4', card2:'#F0D8C0', text:'#3A2818', muted:'#9C7860', border:'#E5CDB6' },
  theme_espresso:  { dark:true,  bg:'#0F0804', card:'#1E100A', card2:'#2A1508', text:'#F0E6D3', muted:'#6A5040', border:'#3D2015' },
  theme_caramel:   { dark:false, bg:'linear-gradient(160deg,#F5DEB3 0%,#E8A045 100%)', card:'#FFE9CC', card2:'#F8D89C', text:'#3D2010', muted:'#8B5A2A', border:'#E8B873' },
  theme_chocolat:  { dark:true,  bg:'#1A0F08', card:'#2D1A0E', card2:'#3D2614', text:'#F0E6D3', muted:'#A08068', border:'#5A3520' },
  theme_legendaire:{ dark:true,  bg:'#1A1200', card:'#2A1E00', card2:'#3D2C0A', text:'#F5E8B5', muted:'#A0884A', border:'#5A4520', sparkles:true },
  /* Cosmos : ambiance galactique sombre — indigo nuit + violet profond + étoiles.
     Les accents café (or, espresso, gold) restent intacts. */
  theme_cosmos:    { dark:true, bg:'linear-gradient(160deg,#070220 0%,#160838 35%,#2A1058 65%,#0F0428 100%)', card:'#1F0F3A', card2:'#2D1854', text:'#F0E0FF', muted:'#9A85C8', border:'#4A2D7A', sparkles:true },

  /* Thèmes ÉDITION LIMITÉE (PHASE 6E) — débloqués via événements spéciaux,
     impossibles à acheter. Visibles dans la boutique uniquement une fois
     gagnés, avec un badge "Édition limitée". */
  theme_or_limite:       { dark:true, bg:'linear-gradient(140deg,#3D2810,#8B6914)', card:'#5C4014', card2:'#8B6914', text:'#FFE4A0', muted:'#C8A878', border:'#5C4014', sparkles:true },
  /* Trader Avisé — sombre cuivré, ambiance bourse luxueuse (event_market_pro) */
  theme_trader:          { dark:true, bg:'linear-gradient(140deg,#1A0F08 0%,#3D2010 50%,#5C3317 100%)', card:'#2D1A0E', card2:'#3D2614', text:'#F5DCB8', muted:'#B89878', border:'#5C3317' },

  /* Niv 9 — Cappuccino Velours : palette douce crème mousseuse +
     accents caramel chaud. Mode clair, ambiance cosy. */
  theme_velours:         { dark:false, bg:'linear-gradient(160deg,#FFEED8 0%,#F0DBC0 50%,#D8B894 100%)', card:'#FFF8EC', card2:'#F5E6D2', text:'#3D2010', muted:'#8B6A50', border:'#D8B894' },

  /* Niv 11 — Cuir & Espresso : cuir foncé tabac + accents or vif.
     Mode sombre racé, ambiance bibliothèque-club anglais. */
  theme_cuir:            { dark:true, bg:'linear-gradient(160deg,#1A0E08 0%,#2D1A12 40%,#3D2418 70%,#1A0E08 100%)', card:'#2A180E', card2:'#3D2418', text:'#F0E0C0', muted:'#A88060', border:'#5C3614' },

  /* Niv 12 — Élixir Doré : or liquide en fusion. Sombre chaud, dégradé
     ambré profond avec accents miel. Accents or sur fond bordeaux café. */
  theme_elixir:          { dark:true, bg:'linear-gradient(160deg,#1A0E04 0%,#3D2410 30%,#8B5A14 60%,#5C3614 100%)', card:'#2D1A0A', card2:'#3D2614', text:'#FFE5A8', muted:'#C8A05A', border:'#5C3614', sparkles:true },

  /* Niv 14 — Renaissance : flammes de phénix orangées, dégradé chaud
     avec touches dorées qui montent. Café profond → ambre → orange feu. */
  theme_renaissance:     { dark:true, bg:'linear-gradient(160deg,#1A0804 0%,#3D1808 25%,#7D2E0E 55%,#C85820 85%,#E88840 100%)', card:'#2D1408', card2:'#4A1E0C', text:'#FFE0B8', muted:'#D49060', border:'#7D2E0E', sparkles:true },
};

export const GOLD     = 'linear-gradient(135deg,#D4A017,#C17F3C)';
export const ESPRESSO = 'linear-gradient(140deg,#4A2C17,#7D4E1F)';

/* Aperçu Cosmos plus foncé, appliqué temporairement quand on est sur l'onglet Premium */
export const PREMIUM_PALETTE = {
  dark: true,
  bg:    'linear-gradient(160deg,#040014 0%,#0A0224 35%,#1A0840 65%,#06001E 100%)',
  card:  '#140828',
  card2: '#1F0E40',
  text:  '#E8D5FF',
  muted: '#8770B0',
  border:'#3A2068',
};

/* Palettes de roue / skins cookie — vidées (catégories supprimées du jeu).
   On garde l'entrée vide '' comme fallback pour les composants qui
   font [key] || [''] (SpinGame, SkinnedCookie, ClickGame). */
export const ROUE_PALETTES = { '': null };
export const ROUE_GLOWS    = {};

export const COOKIE_SKINS = {
  /* Skin par défaut (pas d'achat) — cookie classique caramel/café */
  '': {
    body:[{o:'0%',c:'#E8B57A'},{o:'55%',c:'#B86A28'},{o:'100%',c:'#6B3812'}],
    chip:[{o:'0%',c:'#5A2D14'},{o:'100%',c:'#1A0A04'}],
    ring:'#3D1F0A', cracks:'#5A2D10', icing:false, shine:'rgba(255,240,210,.32)'
  },
  /* Niv 2 — Caramel : ambré miel très chaud, chips chocolat très foncés
     (contraste max avec le body clair → pépites bien lisibles). */
  skin_caramel: {
    body:[{o:'0%',c:'#FFEBC7'},{o:'50%',c:'#F0AB5A'},{o:'100%',c:'#9B5418'}],
    chip:[{o:'0%',c:'#5C2C0A'},{o:'100%',c:'#1A0A02'}],
    ring:'#7D4818', cracks:'#9B5418', icing:false, shine:'rgba(255,240,210,.5)'
  },
  /* Niv 4 — Noisette : brun roux profond, chips presque noires (pépites cacao). */
  skin_noisette: {
    body:[{o:'0%',c:'#D49060'},{o:'55%',c:'#7A4520'},{o:'100%',c:'#3D1F08'}],
    chip:[{o:'0%',c:'#1F0E04'},{o:'100%',c:'#000000'}],
    ring:'#2D1606', cracks:'#3D1F0A', icing:false, shine:'rgba(255,220,180,.35)'
  },
  /* Niv 8 — Onyx : cacao très très foncé, pépites or vif (contraste ultime).
     Halo doré chaud — la signature visuelle "premium" du cookie. */
  skin_onyx: {
    body:[{o:'0%',c:'#3D2818'},{o:'55%',c:'#1A0E04'},{o:'100%',c:'#000000'}],
    chip:[{o:'0%',c:'#FFD24D'},{o:'100%',c:'#A07021'}],
    ring:'#000000', cracks:'#1F0E04', icing:false, shine:'rgba(212,160,23,.55)',
    glowColor:'rgba(212,160,23,.55)'
  },
  /* Niv 9 — Émeraude : vrai vert émeraude (exception à la charte café-only,
     décision user). Jade clair → émeraude profond → vert très foncé.
     Chips or pour rappeler le côté joyau précieux. */
  skin_emeraude: {
    body:[{o:'0%',c:'#B8EFC4'},{o:'55%',c:'#2E8B5F'},{o:'100%',c:'#0F3D26'}],
    chip:[{o:'0%',c:'#D4A017'},{o:'100%',c:'#7D4F18'}],
    ring:'#1F5E3D', cracks:'#0F3D26', icing:false, shine:'rgba(200,255,220,.55)',
    glowColor:'rgba(64,200,120,.55)'
  },
  /* Niv 10 — Doré : or pur massif, body éclatant, halo intense.
     Le skin "trophée" — saturation max, contraste fort sur les chips foncés. */
  skin_dore: {
    body:[{o:'0%',c:'#FFF0B0'},{o:'40%',c:'#FFD24D'},{o:'80%',c:'#C99607'},{o:'100%',c:'#7D5A0E'}],
    chip:[{o:'0%',c:'#3D1F0A'},{o:'100%',c:'#0A0402'}],
    ring:'#A07B0E', cracks:'#5C3614', icing:false, shine:'rgba(255,240,200,.65)',
    glowColor:'rgba(255,215,90,.7)'
  },
  /* Niv 11 — Cuir : tabac chaleureux profond, pépites or vif (cuir & espresso). */
  skin_cuir: {
    body:[{o:'0%',c:'#9F6B4A'},{o:'55%',c:'#5C3614'},{o:'100%',c:'#1F1006'}],
    chip:[{o:'0%',c:'#E8B81B'},{o:'100%',c:'#8B5A14'}],
    ring:'#3D2418', cracks:'#5C3614', icing:false, shine:'rgba(232,184,90,.45)'
  },
  /* Niv 13 — Mythique : marbre nacré rosé/crème, veines or vibrantes,
     pas de glaçage blanc (le donut faisait moche), halo crème, sparkles.
     Esthétique antique précieuse, pas pâtisserie. */
  skin_mythique: {
    body:[{o:'0%',c:'#FFE8DC'},{o:'40%',c:'#E8C4A8'},{o:'80%',c:'#A07060'},{o:'100%',c:'#3D2A1E'}],
    chip:[{o:'0%',c:'#FFD24D'},{o:'100%',c:'#9B7014'}],
    ring:'#C99607', cracks:'#A07014', icing:false, shine:'rgba(255,235,210,.7)',
    glowColor:'rgba(255,200,140,.6)',
    pattern:'sparkles'
  },
  /* Niv 14 — Phoenix : ambre → orange → rouge profond, flammes animées
     en overlay. Saturation maximale sur les ambres (palette café étendue). */
  skin_phoenix: {
    body:[{o:'0%',c:'#FFE08A'},{o:'40%',c:'#FF8800'},{o:'80%',c:'#A02000'},{o:'100%',c:'#3D0808'}],
    chip:[{o:'0%',c:'#5C0808'},{o:'100%',c:'#1A0000'}],
    ring:'#7D2E0E', cracks:'#A03808', icing:false, shine:'rgba(255,224,168,.65)',
    glowColor:'rgba(255,140,40,.7)',
    pattern:'flames'
  },
  /* Niv 15 — Originel : cookie cosmique or → indigo, étoiles cosmos animées,
     glaçage. Le skin ultime — contraste maximum (chaud doré → froid violet). */
  skin_originel: {
    body:[{o:'0%',c:'#FFE5A0'},{o:'30%',c:'#D4A017'},{o:'65%',c:'#5C2480'},{o:'100%',c:'#0A0224'}],
    chip:[{o:'0%',c:'#FFE5A0'},{o:'100%',c:'#9A85C8'}],
    ring:'#9A85C8', cracks:'#5C2480', icing:true, shine:'rgba(255,232,160,.75)',
    glowColor:'rgba(180,120,255,.6)',
    pattern:'stars'
  },
};

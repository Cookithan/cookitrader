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
  theme_chocolat_festif: { dark:true, bg:'linear-gradient(140deg,#3D1A0E,#7D3919)', card:'#5C2614', card2:'#7D3919', text:'#F5DCC8', muted:'#B89878', border:'#5C2614' },
  theme_or_limite:       { dark:true, bg:'linear-gradient(140deg,#3D2810,#8B6914)', card:'#5C4014', card2:'#8B6914', text:'#FFE4A0', muted:'#C8A878', border:'#5C4014', sparkles:true },
  theme_vitesse:         { dark:true, bg:'linear-gradient(140deg,#1A1F30,#3D4A6A)', card:'#2A3050', card2:'#3D4A6A', text:'#E0E8FF', muted:'#9CB0D8', border:'#2A3050' },
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

/* Palettes de roue — index = position dans SEGMENTS (11 segments). */
export const ROUE_PALETTES = {
  '': null, // utilise la couleur d'origine de chaque segment (voir SpinGame)
  roue_chocolat: ['#1A0A00','#5C2E0A','#3D1C02','#7A4818','#2D1200','#8B5520','#4A1E06','#6B3A10','#0F0600','#000000','#A07832'],
  roue_caramel:  ['#A07830','#E5B040','#FFE4A0','#C8960C','#B88010','#F0C050','#D4A017','#A87010','#8B6914','#705810','#FFF0C0'],
  roue_legende:  ['#6B5010','#D4A017','#FFE4A0','#A07820','#8B6914','#F0C050','#FFD050','#705810','#C8960C','#4A3008','#FFF8C8'],
};
export const ROUE_GLOWS = { roue_legende:'rgba(255,228,160,.55)' };

/* Skins de cookie — body/chip = stops de gradient SVG, ring = bord, cracks = fissures */
export const COOKIE_SKINS = {
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

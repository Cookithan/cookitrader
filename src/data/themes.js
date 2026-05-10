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
  /* Niv 1 — Cappuccino Mousseux : VRAI effet cappuccino — mousse blanche
     en haut, latte chaud en bas (gradient vertical 180°). Distinct du
     LT par défaut (qui est crème uniforme pâle). Cards crème pour
     contraster avec le bas du gradient. */
  theme_creme:     { dark:false, bg:'linear-gradient(180deg,#FFFAF0 0%,#F0DCB8 35%,#C89860 75%,#A07840 100%)', card:'#FFF8E8', card2:'#F0DCB8', text:'#3D2010', muted:'#8B5A2A', border:'#D4A878' },
  /* Niv 2 — Nuit Espresso : café concentré ultra-foncé + gradient subtil
     pour le relief (au lieu d'un aplat noir). Reste sobre — c'est le
     mode dark "neutre" de référence du jeu. */
  theme_espresso:  { dark:true,  bg:'linear-gradient(160deg,#0A0402 0%,#1F0E04 50%,#1A0A02 100%)', card:'#2A1408', card2:'#3D1E0E', text:'#F0E6D3', muted:'#7A6048', border:'#3D2015' },
  /* Niv 3 — Caramel Sunrise : caramel coulant orange éclatant saturé.
     Distinct de creme (crème pur) et velours (rose). Comme un sirop chaud. */
  theme_caramel:   { dark:false, bg:'linear-gradient(160deg,#FFE5B0 0%,#FFB860 50%,#C87020 100%)', card:'#FFEEC8', card2:'#FFD89A', text:'#4A2010', muted:'#8B5A2A', border:'#E8A045' },
  /* Chocolat (legacy, non vendu en boutique mais garde la palette
     pour compat profils existants qui l'auraient activé). */
  theme_chocolat:  { dark:true,  bg:'#1A0F08', card:'#2D1A0E', card2:'#3D2614', text:'#F0E6D3', muted:'#A08068', border:'#5A3520' },
  /* Niv 6 — Légendaire : OR ANTIQUE — sombre brûlé profond → or saturé →
     ré-assombri (effet trésor enfoui qui scintille). Distinct de elixir
     (jaune fluo en fusion) et or_limite (violet+or royal). Sparkles. */
  theme_legendaire:{ dark:true,  bg:'linear-gradient(160deg,#1A1200 0%,#4A2C00 30%,#9B6A14 60%,#4A2400 100%)', card:'#2A1E00', card2:'#3D2C0A', text:'#F5E8B5', muted:'#B89860', border:'#7D5A20', sparkles:true },
  /* Cosmos (PREMIUM ☕) — galaxie profonde 6 stops : noir spatial → violet
     nébuleuse → rose stellaire → noir. Vraie immersion spatiale. Distinct
     de or_limite (violet+or royal) — ici palette froide cosmique pure
     sans or. Sparkles. */
  theme_cosmos:    { dark:true, bg:'linear-gradient(140deg,#02000F 0%,#0A0228 22%,#2A0860 45%,#7820B0 60%,#3A0A78 78%,#02000F 100%)', card:'#0F0828', card2:'#1F0840', text:'#F0E0FF', muted:'#B098D8', border:'#5C2890', sparkles:true },

  /* Thèmes ÉDITION LIMITÉE (PHASE 6E) — débloqués via événements spéciaux,
     impossibles à acheter. Visibles dans la boutique uniquement une fois
     gagnés, avec un badge "Édition limitée". */
  /* Or Limité — VIOLET ROYAL + OR. Couronnement, joaillerie, cathédrale.
     Distinct de theme_legendaire (or pur jaune) et theme_cosmos (indigo froid).
     Le violet impérial chaud + or massif = trône royal. */
  theme_or_limite:       { dark:true, bg:'linear-gradient(140deg,#2A0F4A 0%,#4A1880 45%,#8B6914 100%)', card:'#1F0A38', card2:'#3D1864', text:'#FFE4A0', muted:'#B89AC8', border:'#5C2890', sparkles:true },
  /* Trader Avisé — VERT BOURSE + OR FINANCIER. Wall Street la nuit,
     marbre vert profond, accents or. Couleur unique : aucun autre thème
     n'a de vert (cohérent avec skin_emeraude). Sobre, pas de sparkles. */
  theme_trader:          { dark:true, bg:'linear-gradient(140deg,#0A1A0E 0%,#1A3D24 55%,#2D6040 100%)', card:'#0F2814', card2:'#1F3D24', text:'#F0E8C0', muted:'#88B098', border:'#1F5E3D' },

  /* Niv 9 — Cappuccino Velours : ROSE LATTE chaud (rose poudré +
     terracotta). Distinct de theme_creme (rosé pâle) — ici plus saturé,
     plus chaud, ambiance "pink drink" cosy. */
  theme_velours:         { dark:false, bg:'linear-gradient(160deg,#FFE3DD 0%,#F5C5BD 50%,#D89D95 100%)', card:'#FFF0EC', card2:'#F5D4CC', text:'#4A2018', muted:'#9B6055', border:'#D89D95' },

  /* Niv 11 — Cuir & Espresso : COGNAC ROUGE BRIQUE vieilli. Distinct
     de theme_chocolat (brun pur) — ici accents rougeâtres marqués
     comme un fauteuil cuir patiné de bibliothèque-club. */
  theme_cuir:            { dark:true, bg:'linear-gradient(160deg,#2D1408 0%,#4A2010 50%,#6B2814 100%)', card:'#3D1A0E', card2:'#5C2814', text:'#F5D8B0', muted:'#B8907A', border:'#7D3818' },

  /* Niv 12 — Élixir Doré : OR LIQUIDE EN FUSION ambre vif. 5 stops pour
     l'effet "métal en fusion" coulant du sombre vers l'or. Distinct de
     theme_legendaire (qui est plus jaune statique). Sparkles intenses. */
  theme_elixir:          { dark:true, bg:'linear-gradient(160deg,#1A0A00 0%,#4A2400 25%,#8B5C00 55%,#D49000 80%,#5C3000 100%)', card:'#2D1404', card2:'#4A2408', text:'#FFE8A0', muted:'#C8A040', border:'#8B5C00', sparkles:true },

  /* Niv 14 — Renaissance : BRAISE ROUGE CARDINAL. Charbon noir → braise
     rouge → orange feu. Plus rouge que ambre (distinct de elixir/caramel).
     Ambiance forge, phénix qui renaît. Sparkles oranges. */
  theme_renaissance:     { dark:true, bg:'linear-gradient(160deg,#1A0404 0%,#4A0808 25%,#8B1808 55%,#C84020 80%,#FF6020 100%)', card:'#2D0808', card2:'#4A1408', text:'#FFD8B8', muted:'#D88060', border:'#8B1808', sparkles:true },

  /* Édition limitée — Code promo BLACK : N&B EXTRÊME, le moins de gris
     possible. Pas de gradient — fond noir absolu uniforme. Cards très
     sombres (presque indistinguables du bg), texte blanc pur. Sera
     combiné avec filter:grayscale(1) contrast(1.2) côté CSS pour
     écraser les éventuels mid-greys hardcodés (boutons GOLD, etc.). */
  theme_noir:            { dark:true, bg:'#000000', card:'#080808', card2:'#101010', text:'#FFFFFF', muted:'#D8D8D8', border:'#1A1A1A' },

  /* Édition limitée — Code promo BARISTA05 (drop 0.5% via barista
     légendaire dans Devine la commande). COOKIE & ESPRESSO : gradient
     vertical 180° — pâte de biscuit beurré crème en haut → caramel
     doré → torréfaction brun → espresso noir profond en bas. C'est le
     thème "biscuit qui trempe dans le café". 5 stops pour la transition
     douce. dark:true (les cards/text se calent sur la moitié basse, plus
     dense). Distinct de theme_creme (crème uniforme rosé) et de
     theme_espresso (noir pur sans transition). */
  theme_grains:          { dark:true, bg:'linear-gradient(180deg,#FAEAD0 0%,#E8B57A 22%,#A05820 45%,#3D1808 70%,#0A0402 100%)', card:'#2A1408', card2:'#3D1E0E', text:'#F5D8A8', muted:'#B8906A', border:'#7D4818' },
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
  /* Galactique — sink premium ULTRA (15 ☕, mai 2026). Variante du cosmos :
     bleu-nuit profond → violet → halo doré, étoiles partout. Plus froid
     que skin_originel (qui glisse vers le doré chaud), plus saturé en violet. */
  skin_galactique: {
    body:[{o:'0%',c:'#E8D5FF'},{o:'30%',c:'#7848B8'},{o:'70%',c:'#2A1450'},{o:'100%',c:'#050118'}],
    chip:[{o:'0%',c:'#FFE89A'},{o:'100%',c:'#A07014'}],
    ring:'#5C2480', cracks:'#3D1A6B', icing:false, shine:'rgba(232,213,255,.7)',
    glowColor:'rgba(120,72,184,.7)',
    pattern:'stars'
  },
};

/* ════════════════════════════════════════════════════
   titles.js — TITRES COULEUR (effet shimmer sur le pseudo)
   ────────────────────────────────────────────────────
   Items débloqués en boutique (type:'Titre' dans REWARDS). Une fois
   acheté, l'utilisateur peut activer un titre depuis le Profil ; le
   shimmer s'applique alors à son pseudo partout (header, profil,
   classement, etc.) via getNameStyle(name, achievements, activeTitle).

   Priorité dans getNameStyle :
     Créateur (Cookithan) > Légende Vivante > Titre choisi
   Ainsi un Cookithan ou Légende garde son style signature même si un
   titre est sélectionné.

   ⚠ Sync cross-device : la colonne `active_title` (users) est sync
   via upsertProfile, donc le titre actif d'un autre joueur s'affiche
   dans le classement / profil ami / liste d'amis.

   ── DESIGN DES TITRES ──────────────────────────────
   Chaque titre a une SIGNATURE distinctive (direction, animation,
   palette, halo) pour être lisible d'un coup d'œil et pas se
   confondre avec le voisin :

   - direction : '90deg' (horizontal) | '180deg' (vertical) | '135deg'
                 (diagonal) | '45deg' (anti-diagonal)
   - bgSize    : taille du gradient pour les anims (200%, 300%)
   - animation : 'latteShimmer' (déplacement gradient) | 'titlePulse'
                 (halo qui pulse) | 'titleFlicker' (vacille comme
                 une flamme) | 'titleSpin' (gradient qui tourne) | null
   - duration  : durée de l'anim
   - shadow    : couleur du drop-shadow halo
═══════════════════════════════════════════════════════ */

export const TITLE_STYLES = {
  /* Niv 3 — Mousse : mousse de lait écumeuse, gradient VERTICAL crème.
     Anim latteShimmer lente — effet bulles qui montent. Halo blanc doux. */
  title_mousse: {
    name: 'Mousse',
    bg:   'linear-gradient(180deg, #FFFFF0 0%, #F0E8D0 50%, #C8B898 100%)',
    color:'#A89870',
    shadow:'rgba(255,250,230,.7)',
    animation: 'latteShimmer',
    bgSize: '200% 200%',
    duration: 4.5,
  },
  /* Niv 7 — Caramel : caramel coulant brillant, gradient HORIZONTAL
     ambré roux saturé. Anim shimmer rapide. Halo orangé chaud. */
  title_caramel: {
    name: 'Caramel',
    bg:   'linear-gradient(90deg, #E8A045 0%, #8B5A2B 25%, #FFB860 50%, #8B5A2B 75%, #E8A045 100%)',
    color:'#C17F3C',
    shadow:'rgba(255,140,40,.65)',
    animation: 'latteShimmer',
    bgSize: '300% 200%',
    duration: 2.8,
  },
  /* Niv 8 — Cuivre : cuivre rouge martelé, gradient ANTI-DIAGONAL 45°.
     Tons rougeâtres bronze. Anim lente, halo cuivre marqué. */
  title_cuivre: {
    name: 'Cuivre',
    bg:   'linear-gradient(45deg, #B0563E 0%, #6B2814 35%, #D87F50 65%, #6B2814 100%)',
    color:'#A04020',
    shadow:'rgba(176,86,62,.75)',
    animation: 'latteShimmer',
    bgSize: '200% 200%',
    duration: 4,
  },
  /* Niv 9 — Velours : velours brun-rose profond, STATIQUE (pas d'anim
     pour évoquer le côté tissu noble figé). Halo rose poudré marqué.
     Couleur unie sophistiquée — distinct des shimmers animés. */
  title_velours: {
    name: 'Velours',
    bg:   'linear-gradient(135deg, #C89090 0%, #6B3848 50%, #4A1828 100%)',
    color:'#8B4858',
    shadow:'rgba(139,72,88,.8)',
    animation: null,
    bgSize: '100% 100%',
    duration: 0,
  },
  /* Niv 10 — Or : OR PUR MASSIF. Anim titlePulse (halo qui pulse,
     pas le gradient qui défile) — effet "trésor qui scintille".
     Halo doré très intense. */
  title_or: {
    name: 'Or',
    bg:   'linear-gradient(135deg, #FFE5A0 0%, #D4A017 50%, #FFE5A0 100%)',
    color:'#D4A017',
    shadow:'rgba(212,160,23,.85)',
    animation: 'titlePulse',
    bgSize: '100% 100%',
    duration: 2,
  },
  /* Niv 12 — Élixir : ambre miel doré liquide en fusion. Gradient
     diagonal avec stops contrastés. Anim titleSpin pour effet "métal
     en mouvement". Halo ambré. */
  title_elixir: {
    name: 'Élixir',
    bg:   'linear-gradient(135deg, #FFE8A0 0%, #C99607 30%, #FFD24D 60%, #8B5A14 90%, #FFE8A0 100%)',
    color:'#C99607',
    shadow:'rgba(255,180,30,.8)',
    animation: 'titleSpin',
    bgSize: '300% 100%',
    duration: 5,
  },
  /* Niv 13 — Saveur : multi-tons épicé (paprika, cannelle, café,
     caramel). 4 couleurs distinctes en cascade rapide. */
  title_saveur: {
    name: 'Saveur',
    bg:   'linear-gradient(90deg, #C84020 0%, #D08850 25%, #5C2E0E 50%, #E8A045 75%, #C84020 100%)',
    color:'#A04020',
    shadow:'rgba(200,80,40,.7)',
    animation: 'latteShimmer',
    bgSize: '400% 200%',
    duration: 2.5,
  },
  /* Niv 14 — Phénix : FLAMMES VIVES qui vacillent. Anim titleFlicker
     (le halo vacille comme une vraie flamme) + gradient feu rouge-orange.
     Le titre le plus "vivant". */
  title_phenix: {
    name: 'Phénix',
    bg:   'linear-gradient(135deg, #FFE040 0%, #FF8800 30%, #C82010 60%, #FF8800 100%)',
    color:'#C84020',
    shadow:'rgba(255,140,40,.9)',
    animation: 'titleFlicker',
    bgSize: '200% 200%',
    duration: 1.4,
  },
  /* Niv 15 — Cosmique : galaxie qui TOURNE. Anim titleSpin lente avec
     gradient long (300% bg-size). Couleurs cosmos : violet, doré, rose
     stellaire, bleu nuit. Le titre apex, le plus rare. */
  title_cosmique: {
    name: 'Cosmique',
    bg:   'linear-gradient(90deg, #B098FF 0%, #FFD24D 20%, #E84090 40%, #5C2480 60%, #FFE5A0 80%, #B098FF 100%)',
    color:'#9A85C8',
    shadow:'rgba(180,120,255,.85)',
    animation: 'titleSpin',
    bgSize: '300% 100%',
    duration: 8,
  },
};

/* Helper qui produit le style React à étaler sur un <span>.
   Retourne null si l'id ne matche aucun titre connu (titre inactif).

   Construit dynamiquement le filter (drop-shadow + ombre café) et
   l'animation selon les props du titre. Les titres sans animation
   (velours statique) reçoivent juste le shadow + l'ombre fixe. */
export function getTitleStyle(titleId){
  if(!titleId) return null;
  const t = TITLE_STYLES[titleId];
  if(!t) return null;
  /* Le filter inclut TOUJOURS l'ombre café 1px pour la lisibilité
     sur fond clair. Le titleFlicker fait varier le drop-shadow lui-même
     donc dans ce cas on ne le pose pas en statique (sinon conflit). */
  const baseFilter = t.animation === 'titleFlicker'
    ? 'drop-shadow(0 1px 2px rgba(74,44,23,.5))'
    : `drop-shadow(0 0 6px ${t.shadow}) drop-shadow(0 1px 2px rgba(74,44,23,.5))`;
  return {
    background: t.bg,
    backgroundSize: t.bgSize || '200% 200%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: t.color,
    fontWeight: 900,
    letterSpacing: .4,
    filter: baseFilter,
    animation: t.animation
      ? `${t.animation} ${t.duration}s ease-in-out infinite`
      : 'none',
  };
}

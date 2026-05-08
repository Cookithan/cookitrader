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

   Tous les styles utilisent la keyframe `latteShimmer` (déjà dans
   globalStyles) — gradient qui défile horizontalement, durée 3-4s.
═══════════════════════════════════════════════════════ */

export const TITLE_STYLES = {
  title_mousse: {
    name: 'Mousse',
    bg:   'linear-gradient(135deg, #C8A878 0%, #8B6A50 50%, #C8A878 100%)',
    color:'#8B6A50',
    shadow:'rgba(139,106,80,.55)',
    duration: 4,
  },
  title_caramel: {
    name: 'Caramel',
    bg:   'linear-gradient(135deg, #E8A045 0%, #8B5A2B 50%, #E8A045 100%)',
    color:'#C17F3C',
    shadow:'rgba(193,127,60,.6)',
    duration: 3.5,
  },
  title_cuivre: {
    name: 'Cuivre',
    bg:   'linear-gradient(135deg, #C66E2C 0%, #6B3812 50%, #C66E2C 100%)',
    color:'#8B4513',
    shadow:'rgba(139,69,19,.6)',
    duration: 3.5,
  },
  title_velours: {
    name: 'Velours',
    bg:   'linear-gradient(135deg, #B89878 0%, #5C3614 50%, #B89878 100%)',
    color:'#8B6A50',
    shadow:'rgba(92,54,20,.55)',
    duration: 4,
  },
  title_or: {
    name: 'Or',
    bg:   'linear-gradient(135deg, #FFE5A0 0%, #D4A017 50%, #FFE5A0 100%)',
    color:'#D4A017',
    shadow:'rgba(212,160,23,.65)',
    duration: 3,
  },
  title_elixir: {
    name: 'Élixir',
    bg:   'linear-gradient(135deg, #F5E8B5 0%, #8B5A14 50%, #F5E8B5 100%)',
    color:'#C8A85A',
    shadow:'rgba(200,168,90,.6)',
    duration: 3,
  },
  title_saveur: {
    name: 'Saveur',
    bg:   'linear-gradient(135deg, #D08850 0%, #5C2E0E 33%, #D08850 66%, #5C2E0E 100%)',
    color:'#8B4513',
    shadow:'rgba(139,69,19,.65)',
    duration: 3,
  },
  title_phenix: {
    name: 'Phénix',
    bg:   'linear-gradient(135deg, #FFE0A0 0%, #C85820 35%, #E88840 70%, #FFE0A0 100%)',
    color:'#C85820',
    shadow:'rgba(232,136,64,.65)',
    duration: 2.8,
  },
  title_cosmique: {
    name: 'Cosmique',
    bg:   'linear-gradient(135deg, #E8D5FF 0%, #D4A017 33%, #9A85C8 66%, #FFE5A0 100%)',
    color:'#9A85C8',
    shadow:'rgba(154,133,200,.7)',
    duration: 4,
  },
};

/* Helper qui produit le style React à étaler sur un <span>.
   Retourne null si l'id ne matche aucun titre connu (titre inactif). */
export function getTitleStyle(titleId){
  if(!titleId) return null;
  const t = TITLE_STYLES[titleId];
  if(!t) return null;
  return {
    background: t.bg,
    backgroundSize: '200% 200%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: t.color,
    fontWeight: 900,
    letterSpacing: .4,
    filter: `drop-shadow(0 0 5px ${t.shadow}) drop-shadow(0 1px 2px rgba(74,44,23,.4))`,
    animation: `latteShimmer ${t.duration}s ease-in-out infinite`,
  };
}

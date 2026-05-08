/* ════════════════════════════════════════════════════
   legend.js — utilitaires "Titre Légendaire"
   ────────────────────────────────────────────────────
   Le succès apex `end_game` (Légende Vivante) déclenche un effet
   visuel sur le pseudo du joueur — texte en or shiny — visible dans
   les classements, profils et son propre header. Helpers à utiliser
   partout où on affiche un nom susceptible de bénéficier de cet effet.

   Source de l'info :
     · Mon propre pseudo  → state local `earnedAchievements` (array)
     · Pseudo d'un autre  → colonne Supabase `earned_achievements`
                            (text comma-separated, cf. upsertProfile)
═══════════════════════════════════════════════════════ */

export const LEGEND_ACHIEVEMENT_ID = 'end_game';

/* Retourne true si l'utilisateur a décroché Légende Vivante.
   Accepte les 3 formats possibles :
     - array d'IDs (state local React)
     - string comma-separated (lecture directe Supabase)
     - undefined / null → false */
export function hasLegendTitle(achievements){
  if(!achievements) return false;
  if(Array.isArray(achievements)){
    return achievements.includes(LEGEND_ACHIEVEMENT_ID);
  }
  if(typeof achievements === 'string'){
    return achievements
      .split(',')
      .map(s => s.trim())
      .includes(LEGEND_ACHIEVEMENT_ID);
  }
  return false;
}

/* Style à étaler sur un pseudo de Légende — texte en or shiny via
   background-clip. Fonctionne sur fond clair ET sombre.

   Usage : <span style={{ ...baseStyle, ...(isLegend ? LEGEND_NAME_STYLE : {}) }} />
   Compatible mobile (iOS Safari + Chrome Android). Si le navigateur ne
   supporte pas, le fallback `color` reste lisible (or). */
export const LEGEND_NAME_STYLE = {
  background: 'linear-gradient(135deg, #FFE5A0 0%, #D4A017 50%, #FFE5A0 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: '#D4A017',
  textShadow: '0 0 6px rgba(212,160,23,.45)',
  fontWeight: 900,
};

/* ════════════════════════════════════════════════════
   TITRE CRÉATEUR — exclusif au pseudo "Cookithan"
   ────────────────────────────────────────────────────
   Mode "latte shimmer" : gradient crème → caramel → crème qui défile
   en continu (anim latteShimmer 3s) avec halo or + ombre café. Effet
   très distinctif, signature du créateur de l'app. Priorité sur
   Légende Vivante quand les 2 matchent.
═══════════════════════════════════════════════════════ */

export const CREATOR_NAME = 'cookithan';

/* Test case-insensitive du pseudo créateur. */
export function isCreator(name){
  return (name || '').trim().toLowerCase() === CREATOR_NAME;
}

/* Style latte shimmer pour le créateur — gradient crème/caramel large
   (200% × 200%) qui défile via animation `latteShimmer` (cf. globalStyles).
   Halo or + ombre café via drop-shadow pour ressortir sur fond clair ET
   sombre. Compatible mobile (iOS Safari + Chrome Android). */
export const CREATOR_NAME_STYLE = {
  background: 'linear-gradient(135deg, #FFF1DA 0%, #E8C896 25%, #C17F3C 50%, #E8C896 75%, #FFF1DA 100%)',
  backgroundSize: '200% 200%',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: '#C17F3C',
  fontWeight: 900,
  letterSpacing: .5,
  filter: 'drop-shadow(0 0 6px rgba(212,160,23,.55)) drop-shadow(0 1px 2px rgba(93,58,31,.4))',
  animation: 'latteShimmer 3s ease-in-out infinite',
};

/* Helper combiné : retourne le style à appliquer (créateur > légende > rien).
   `name` est le pseudo, `achievements` les succès gagnés (array ou CSV). */
export function getNameStyle(name, achievements){
  if(isCreator(name)) return CREATOR_NAME_STYLE;
  if(hasLegendTitle(achievements)) return LEGEND_NAME_STYLE;
  return null;
}

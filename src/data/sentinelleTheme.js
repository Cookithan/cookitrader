/* ════════════════════════════════════════════════════
   sentinelleTheme.js — la peau de la Sentinelle
   ────────────────────────────────────────────────────
   L'écran de la Sentinelle ne prend PAS le thème du joueur. Il a le
   sien, et un seul : bleu acier et blanc. On y lit des alertes et on y
   sanctionne des comptes — le voir changer de peau selon le thème
   équipé ajouterait une variable inutile à un moment où il vaut mieux
   n'en avoir aucune. Partagé entre la console (SentinelleOverlay) et
   la conversation (SentinelleChat).
═══════════════════════════════════════════════════════ */

export const MARINE = '#0B2E4D';   /* l'encre : titres graves, texte de danger */
export const ACIER  = '#1B5E8C';   /* l'accent : ce sur quoi on peut appuyer   */

export const THEME_SENTINELLE = {
  bg:     'linear-gradient(170deg,#F3F9FD 0%,#E4F0F9 55%,#DAECF7 100%)',
  card:   '#FFFFFF',
  card2:  '#EAF3FA',
  text:   '#0E3355',
  muted:  '#5A7E9B',
  border: '#CCE0EE',
};

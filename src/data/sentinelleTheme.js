/* ════════════════════════════════════════════════════
   sentinelleTheme.js — la peau de la Sentinelle
   ────────────────────────────────────────────────────
   L'écran de la Sentinelle ne prend PAS le thème du joueur. Il a le
   sien, et un seul : du bleu, du plus pâle au plus encré. On y lit des
   alertes et on y sanctionne des comptes — le voir changer de peau
   selon le thème équipé ajouterait une variable inutile à un moment où
   il vaut mieux n'en avoir aucune.

   UNE SEULE ÉCHELLE, POUR LES DEUX CÔTÉS
   ──────────────────────────────────────
   Ce fichier sert la console (SentinelleTableau), l'entonnoir des
   joueurs (SignalementOverlay) et l'accueil commun
   (SentinelleBienvenue). Il y avait deux copies de la même palette —
   une ici, une dans themes.js — et rien n'obligeait les deux à rester
   d'accord. themes.js réexporte maintenant celle-ci : il n'y a plus
   qu'un endroit où changer une couleur.

   POURQUOI DIX MARCHES ET PAS TROIS
   ─────────────────────────────────
   Avec deux bleus, tout ce qui n'est pas un titre finit dans le même
   gris-bleu, et l'écran devient plat : on ne distingue plus le bord
   d'une carte, ni un chiffre important d'une légende. Les marches
   servent à ça — chacune a un emploi, écrit en face.

   CONTRASTE — VÉRIFIÉ, PAS ESTIMÉ
   ───────────────────────────────
   `muted` portait #5A7E9B, soit 4,3:1 sur blanc — sous le seuil AA
   (4,5:1), et c'est justement la couleur des textes de 10 et 11 px.
   Sur un téléphone, dehors, ça ne se lit pas. Elle est descendue à
   #456C8B : 5,6:1 sur blanc, 4,9:1 sur `card2`.

   `border` a le problème inverse : #CCE0EE sur blanc, c'est 1,2:1 —
   un trait qu'on ne voit pas. D'où DEUX traits, parce qu'ils ne font
   pas le même travail : `border` dessine le CONTOUR d'une carte (il
   doit se voir), `trait` sépare deux blocs DEDANS (il doit se
   deviner).
═══════════════════════════════════════════════════════ */

/* ── L'échelle ──────────────────────────────────────────────────
   50/100  fonds et voiles
   200/300 traits et contours
   400     ce qui est éteint, désactivé, décoratif
   500     l'accent vif (le haut du dégradé)
   600     ACIER : ce sur quoi on peut appuyer
   700     le bas du dégradé
   800     le texte courant
   900     MARINE : l'encre, les titres, ce qui est grave           */
export const BLEU = {
  50:  '#F4FAFE',
  100: '#E9F2FA',
  200: '#D2E5F4',
  300: '#AFD0E7',
  400: '#7FADD2',
  500: '#2E86BF',
  600: '#1B5E8C',
  700: '#14496D',
  800: '#0E3355',
  900: '#0B2E4D',
};

export const MARINE = BLEU[900];   /* l'encre : titres graves, texte de danger */
export const ACIER  = BLEU[600];   /* l'accent : ce sur quoi on peut appuyer   */

export const THEME_SENTINELLE = {
  bg:     'linear-gradient(170deg,#F3F9FD 0%,#E4F0F9 55%,#DAECF7 100%)',
  card:   '#FFFFFF',
  card2:  BLEU[100],
  text:   BLEU[800],
  muted:  '#456C8B',   /* 5,6:1 sur blanc — lisible à 10 px */
  border: BLEU[300],   /* le contour d'une carte : il doit se voir */
  trait:  BLEU[200],   /* une séparation dedans : elle doit se deviner */
};

/* ── Surfaces communes aux deux écrans ──────────────────────────
   Le fond n'est pas une couleur mais une lumière : un blanc qui vient
   d'en haut et se refroidit en descendant. C'est ce qui remplace la
   feuille blanche sans rien coûter au rendu. */
export const FOND  = 'radial-gradient(130% 90% at 50% -10%, #FFFFFF 0%, #EDF6FD 34%, #D8EAF8 68%, #C6DFF3 100%)';
export const VERRE = 'rgba(255,255,255,.86)';

/* Les ombres sont BLEUES, jamais noires : une ombre neutre sur un fond
   bleu pâle donne le gris sale qu'on voit sur les interfaces bâclées. */
export const OMBRE      = '0 10px 34px rgba(14,51,85,.11), 0 2px 6px rgba(14,51,85,.05)';
export const OMBRE_VIVE = '0 14px 42px rgba(27,94,140,.24), 0 2px 8px rgba(27,94,140,.14)';

export const DEGRADE  = `linear-gradient(135deg, ${BLEU[500]} 0%, ${BLEU[600]} 55%, ${BLEU[700]} 100%)`;
export const BANNIERE = 'linear-gradient(140deg, #E6F3FC, #B3D9F2)';

/* ── iOS et le zoom des champs ──────────────────────────────────
   Safari agrandit toute la page quand on tape dans un champ dont le
   texte fait moins de 16 px — et il n'en revient pas tout seul : on se
   retrouve avec un écran zoomé qui défile de travers. `user-scalable=no`
   dans le viewport n'y change rien, iOS l'ignore depuis la version 10.
   Le seul remède est la taille du texte, donc tout champ de saisie de
   la Sentinelle passe par ici. En prime, ça se lit mieux. */
export const CHAMP = 16;

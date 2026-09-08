/* ════════════════════════════════════════════════════
   signalements.js — l'entonnoir de signalement
   ────────────────────────────────────────────────────
   L'arbre de choix que voit un joueur quand il ouvre la Sentinelle en
   invité. Données pures : aucune logique, aucun état. Le parcours et
   l'envoi vivent dans components/overlays/SignalementOverlay.jsx.

   POURQUOI UN ENTONNOIR PLUTÔT QU'UN CHAMP LIBRE
   ──────────────────────────────────────────────
   Un champ vide avec « décris ton problème » donne « ça marche pas ».
   Chaque clic, lui, apporte une information exploitable AVANT même que
   le joueur écrive : la catégorie, l'écran, le jeu concerné. Le texte
   libre ne sert plus qu'à raconter le détail, et c'est justement là
   qu'il est utile.

   FORME D'UN NŒUD
   ───────────────
     id       — unique dans sa fratrie ; sert à construire le chemin
     emoji    — facultatif, seulement à la racine (le reste serait du bruit)
     label    — FR ; `label_en` fournit l'anglais (cf. localizedField)
     tKey     — alternative à label : une clé i18n existante. Sert aux
                mini-jeux, dont les noms vivent déjà dans games_list.*
                — les recopier ici, c'est se condamner à les voir
                diverger le jour où l'un est renommé.
     enfants  — la question suivante ; absent = on est arrivé au bout
     demande  — un champ de saisie en plus, posé À CE NIVEAU
     exemple  — le placeholder du message final, pour montrer ce qu'on
                attend au lieu de le réclamer

   Les feuilles d'un même sous-arbre peuvent partager le même tableau
   d'enfants (cf. SOUCIS_JEU) : le chemin est une chaîne de choix, pas
   une adresse absolue, donc rien n'exige que les id soient uniques
   d'une branche à l'autre.
═══════════════════════════════════════════════════════ */

/* Les mêmes six questions pour n'importe quel mini-jeu. Écrites une
   fois, référencées douze fois. */
const SOUCIS_JEU = [
  { id:'score',      label:"Mon score n'a pas été compté",              label_en:"My score wasn't counted",
    exemple:"J'ai fini avec 340 points et je n'ai rien reçu." },
  { id:'injouable',  label:'Le jeu bugge pendant la partie',            label_en:'The game glitches mid-run',
    exemple:"À partir de la 3e vague, les cookies se téléportent." },
  { id:'lance_pas',  label:'Le jeu ne se lance pas',                    label_en:"The game won't start",
    exemple:"J'appuie sur Jouer, l'écran reste noir et rien ne se passe." },
  { id:'recompense', label:'La récompense ne correspond pas',           label_en:"The reward doesn't match",
    exemple:"L'écran annonçait 120 🍪, j'en ai reçu 12." },
  { id:'equilibre',  label:"C'est trop dur, ou trop facile",            label_en:"It's too hard, or too easy",
    exemple:"Impossible de dépasser 50 points, même en jouant bien." },
  { id:'autre',      label:'Autre chose sur ce jeu',                    label_en:'Something else about this game',
    exemple:'Raconte ce que tu as vu.' },
];

/* Les douze mini-jeux, nommés par leur clé i18n : un jeu renommé se
   renomme ici tout seul. */
const JEUX = [
  'checkin', 'quiz', 'spin', 'click', 'pour', 'memory',
  'guess', 'reflex', 'pyramid', 'slot', 'flappy', 'catcher',
].map(id => ({ id, tKey:`games_list.${id}_title`, enfants: SOUCIS_JEU }));

export const ARBRE = [
  {
    id:'bug', emoji:'🐛',
    label:'Quelque chose ne marche pas', label_en:'Something is broken',
    enfants:[
      { id:'ferme',     label:"L'app s'est fermée toute seule, ou l'écran est resté blanc", label_en:'The app closed by itself, or the screen went blank',
        exemple:"C'est arrivé juste après avoir ouvert la boutique." },
      { id:'bouton',    label:'Un bouton ne répond pas',                     label_en:'A button does nothing',
        exemple:"Le bouton Valider de la roue : j'appuie, rien ne se passe." },
      { id:'affichage', label:'Un texte dépasse, une image manque',          label_en:'Text overflows, an image is missing',
        exemple:"Dans le classement, mon pseudo passe par-dessus le score." },
      { id:'lent',      label:'Ça rame, ça saccade',                         label_en:"It's slow or stuttering",
        exemple:'Depuis la dernière mise à jour, la page Jeux met 5 secondes à répondre.' },
      { id:'bloque',    label:'Je suis bloqué, je ne peux pas continuer',    label_en:"I'm stuck and can't continue",
        exemple:"L'écran de fin de partie ne se ferme plus, je dois relancer l'app." },
      { id:'autre',     label:'Un autre bug',                                label_en:'Another bug',
        exemple:'Raconte ce que tu faisais, et ce qui est arrivé.' },
    ],
  },
  {
    id:'economie', emoji:'🍪',
    label:'Un problème de cookies, cafés ou actions', label_en:'A problem with cookies, coffees or shares',
    enfants:[
      { id:'perte',   label:'J\'ai perdu des cookies sans raison',       label_en:'I lost cookies for no reason',
        exemple:"J'en avais 12 000 hier soir, 8 000 ce matin, sans rien acheter." },
      { id:'manque',  label:"Une récompense n'est jamais arrivée",       label_en:'A reward never arrived',
        exemple:"J'ai fini le succès En Feu, le café n'est pas venu." },
      { id:'achat',   label:"Un achat en boutique n'a rien donné",       label_en:'A shop purchase gave me nothing',
        exemple:"J'ai payé le thème Caramel, il n'est pas dans ma collection." },
      { id:'promo',   label:'Un code promo ne marche pas',               label_en:"A promo code doesn't work",
        demande:{ cle:'code', label:'Le code que tu as tapé', label_en:'The code you typed' },
        exemple:'Il me dit « code invalide » alors que je le tape bien.' },
      { id:'marche',  label:'Le marché : prix ou portefeuille faux',     label_en:'The market: wrong price or portfolio',
        exemple:"J'ai acheté 3 actions, mon portefeuille en affiche 1." },
      { id:'autre',   label:'Autre chose',                               label_en:'Something else',
        exemple:'Dis-moi ce qui ne colle pas, avec les montants si tu les as.' },
    ],
  },
  {
    id:'jeu', emoji:'🎮',
    label:'Un mini-jeu', label_en:'A mini-game',
    enfants: JEUX,
  },
  {
    id:'joueur', emoji:'👤',
    label:'Un autre joueur', label_en:'Another player',
    demande:{ cle:'joueur', label:'Son pseudo, ou son code si tu l\'as', label_en:'Their name, or their code if you have it' },
    enfants:[
      { id:'triche',   label:'Il triche : sa progression est impossible', label_en:"They're cheating: impossible progress",
        exemple:"Il est passé de 5 000 à 400 000 cookies en une nuit." },
      { id:'pseudo',   label:'Son pseudo est insultant',                  label_en:'Their name is offensive',
        exemple:'Recopie le pseudo si tu peux.' },
      { id:'harcele',  label:'Il me harcèle',                             label_en:"They're harassing me",
        exemple:'Dis-moi où : demandes d\'ami, messages, duels…' },
      { id:'autre',    label:'Autre chose',                               label_en:'Something else',
        exemple:'Raconte.' },
    ],
  },
  {
    id:'idee', emoji:'💡',
    label:'Une idée pour le jeu', label_en:'An idea for the game',
    enfants:[
      { id:'minijeu',    label:'Un nouveau mini-jeu',                   label_en:'A new mini-game',
        exemple:'Décris-le : on y fait quoi, on gagne quoi ?' },
      { id:'boutique',   label:'Quelque chose à ajouter en boutique',   label_en:'Something to add to the shop',
        exemple:'Un skin, un thème, un avatar…' },
      { id:'marche',     label:'Le marché',                             label_en:'The market',
        exemple:'Ce que tu changerais, et pourquoi.' },
      { id:'classement', label:'Le classement ou les récompenses',      label_en:'The leaderboard or rewards',
        exemple:'Ce qui te semble injuste ou trop lent.' },
      { id:'autre',      label:'Autre idée',                            label_en:'Another idea',
        exemple:'Vas-y, dis tout.' },
    ],
  },
  {
    id:'autre', emoji:'❓',
    label:'Autre chose', label_en:'Something else',
    exemple:'Dis-moi tout, même si tu ne sais pas dans quelle case le ranger.',
  },
];

/* Ce que la console affiche en tête d'un signalement. Les mêmes mots
   que dans TONS côté Sentinelle : un statut dit ce qu'il reste à faire,
   pas seulement où on en est. */
export const STATUTS = {
  nouveau:    { label:'Nouveau',      emoji:'📮' },
  vu:         { label:'Lu',           emoji:'👁️' },
  traite:     { label:'Traité',       emoji:'✅' },
  sans_suite: { label:'Sans suite',   emoji:'🗄️' },
};

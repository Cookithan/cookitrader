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

   TOUJOURS DEMANDER *OÙ*
   ──────────────────────
   Première version : les mini-jeux étaient les seuls à avoir droit à
   « lequel ? ». Un bug dans la boutique arrivait donc étiqueté « un
   bouton ne répond pas », sans dire lequel ni sur quel écran — soit
   exactement l'information manquante. Un signalement qui n'indique pas
   l'endroit oblige à tout rouvrir pour chercher, et c'est ce qui fait
   qu'on ne le traite jamais.

   D'où ZONES, la liste des endroits de l'app, réutilisée partout où la
   question a un sens : les bugs et les idées. Les noms viennent des
   clés de navigation existantes quand elles existent — les recopier,
   c'est se condamner à les voir diverger le jour d'un renommage.

   TOUT SE TRADUIT, LES EXEMPLES COMPRIS
   ─────────────────────────────────────
   Cet écran est le SEUL de la Sentinelle ouvert à tous les joueurs :
   c'est donc le seul qui doive vivre en deux langues. La console admin,
   elle, reste en français.

   Chaque champ visible a son doublon `_en`, y compris `exemple` —
   c'est le texte gris du champ de message, et il fait la moitié du
   travail : il montre ce qu'on attend au lieu de le réclamer. Le
   laisser en français dans une app en anglais, c'est le rendre muet
   pour ceux qui en avaient le plus besoin.

   FORME D'UN NŒUD
   ───────────────
     id       — unique dans sa fratrie ; sert à construire le chemin
     emoji    — facultatif, seulement à la racine (le reste serait du bruit)
     label    — FR ; `label_en` fournit l'anglais (cf. localizedField)
     tKey     — alternative à label : une clé i18n existante (nav.*,
                games_list.*), pour que les noms suivent l'app
     enfants  — la question suivante ; absent = on est arrivé au bout
     demande  — un champ de saisie en plus, posé À CE NIVEAU
     exemple  — le placeholder du message final ; `exemple_en` idem

   Les nœuds d'un même sous-arbre peuvent partager le même tableau
   d'enfants (SYMPTOMES, SOUCIS_JEU, ZONES) : le chemin est une chaîne
   de choix, pas une adresse absolue, donc rien n'exige que les id
   soient uniques d'une branche à l'autre.
═══════════════════════════════════════════════════════ */

/* ── Ce qui cloche, quand on sait déjà OÙ ─────────────
   Volontairement écrit du point de vue de ce que le joueur VOIT, pas
   de ce que le code fait : « un bouton ne répond pas », pas « échec du
   handler ». C'est lui qui remplit ce formulaire. */
const SYMPTOMES = [
  { id:'ferme',
    label:"L'app s'est fermée, ou l'écran est resté blanc",  label_en:'The app closed, or the screen went blank',
    exemple:"C'est arrivé juste en ouvrant l'écran.",        exemple_en:'It happened right as the screen opened.' },
  { id:'bouton',
    label:'Un bouton ne répond pas',                         label_en:'A button does nothing',
    exemple:"Dis lequel : j'appuie, et rien ne se passe.",   exemple_en:'Say which one: I tap it, and nothing happens.' },
  { id:'affichage',
    label:'Un texte dépasse, une image manque',              label_en:'Text overflows, an image is missing',
    exemple:'Décris ce qui est mal placé, et à quel endroit de la page.',
    exemple_en:'Describe what looks wrong, and where on the page.' },
  { id:'chiffre',
    label:'Un chiffre est faux',                             label_en:'A number is wrong',
    exemple:"L'écran affiche 12, alors que j'en ai 120.",    exemple_en:'The screen says 12, but I have 120.' },
  { id:'lent',
    label:'Ça rame, ça saccade',                             label_en:"It's slow or stuttering",
    exemple:"Depuis la dernière mise à jour, l'écran met 5 secondes à répondre.",
    exemple_en:'Since the last update, the screen takes 5 seconds to respond.' },
  { id:'bloque',
    label:'Je suis bloqué, je ne peux pas continuer',        label_en:"I'm stuck and can't continue",
    exemple:"La fenêtre ne se ferme plus, je dois relancer l'app.",
    exemple_en:"The window won't close, I have to restart the app." },
  { id:'vide',
    label:'Rien ne se charge, la page reste vide',           label_en:'Nothing loads, the page stays empty',
    exemple:'Ça tourne dans le vide, ou ça affiche une erreur.',
    exemple_en:'It spins forever, or shows an error.' },
  { id:'autre',
    label:'Autre chose sur cet écran',                       label_en:'Something else on this screen',
    exemple:'Raconte ce que tu faisais, et ce qui est arrivé.',
    exemple_en:'Tell us what you were doing, and what happened.' },
];

/* ── Les mêmes six questions pour n'importe quel mini-jeu ──
   Écrites une fois, référencées douze fois. */
const SOUCIS_JEU = [
  { id:'score',
    label:"Mon score n'a pas été compté",                    label_en:"My score wasn't counted",
    exemple:"J'ai fini avec 340 points et je n'ai rien reçu.",
    exemple_en:'I finished with 340 points and got nothing.' },
  { id:'injouable',
    label:'Le jeu bugge pendant la partie',                  label_en:'The game glitches mid-run',
    exemple:"À partir de la 3e vague, les cookies se téléportent.",
    exemple_en:'From wave 3 on, the cookies teleport around.' },
  { id:'lance_pas',
    label:'Le jeu ne se lance pas',                          label_en:"The game won't start",
    exemple:"J'appuie sur Jouer, l'écran reste noir et rien ne se passe.",
    exemple_en:'I tap Play, the screen stays black and nothing happens.' },
  { id:'recompense',
    label:'La récompense ne correspond pas',                 label_en:"The reward doesn't match",
    exemple:"L'écran annonçait 120 🍪, j'en ai reçu 12.",    exemple_en:'The screen promised 120 🍪, I got 12.' },
  { id:'equilibre',
    label:"C'est trop dur, ou trop facile",                  label_en:"It's too hard, or too easy",
    exemple:'Impossible de dépasser 50 points, même en jouant bien.',
    exemple_en:"I can't get past 50 points, even playing well." },
  { id:'autre',
    label:'Autre chose sur ce jeu',                          label_en:'Something else about this game',
    exemple:'Raconte ce que tu as vu.',                      exemple_en:'Tell us what you saw.' },
];

/* Les douze mini-jeux, nommés par leur clé i18n : un jeu renommé se
   renomme ici tout seul, dans les deux langues. */
const JEUX = [
  'checkin', 'quiz', 'spin', 'click', 'pour', 'memory',
  'guess', 'reflex', 'pyramid', 'slot', 'flappy', 'catcher',
].map(id => ({ id, tKey:`games_list.${id}_title`, enfants: SOUCIS_JEU }));

/* ── Les endroits de l'app ────────────────────────────
   Les six premiers sont les onglets ; viennent ensuite les écrans qui
   s'ouvrent par-dessus. `Un mini-jeu` renvoie vers la liste des jeux —
   un joueur qui part de « ça bugge » ne pense pas forcément à revenir
   en arrière pour trouver la bonne racine.

   `enfants` est ajouté plus bas par zonesAvec() : la même liste sert à
   deux questions différentes (un bug a une suite, une idée non). */
const ZONES = [
  { id:'accueil',    tKey:'nav.home' },
  { id:'jeux',       tKey:'nav.games' },
  { id:'collection', tKey:'nav.collection' },
  { id:'classement', tKey:'nav.leaderboard' },
  { id:'marche',     tKey:'nav.market' },
  { id:'boutique',   tKey:'nav.shop' },
  { id:'profil',     label:'Mon profil',                     label_en:'My profile' },
  { id:'amis',       label:'Les amis',                       label_en:'Friends' },
  { id:'messages',   label:'Mes messages reçus',             label_en:'My inbox' },
  { id:'duels',      label:'Les duels',                      label_en:'Duels' },
  { id:'boss',       label:"L'événement communautaire",      label_en:'The community event' },
  { id:'coffres',    label:'Les coffres et les récompenses', label_en:'Chests and rewards' },
  { id:'succes',     label:'Les succès',                     label_en:'Achievements' },
  { id:'reglages',   label:'Les réglages',                   label_en:'Settings' },
  { id:'tutoriel',   label:'Le tutoriel',                    label_en:'The tutorial' },
  { id:'connexion',  label:'La création de compte, la récupération', label_en:'Account creation or recovery' },
];

/* Les zones, plus la porte vers les mini-jeux et la case « je ne sais
   pas ». `suite` décide de ce qui vient après : les symptômes pour un
   bug, rien du tout pour une idée (on écrit directement). */
function zonesAvec(suite, fin = {}) {
  const feuille = (z) => (suite
    ? { ...z, enfants: suite }
    : { ...z, exemple: fin.fr, exemple_en: fin.en });

  /* Les deux dernières cases changent de nature selon la question. Pour
     un BUG, « un mini-jeu » doit mener aux soucis de partie — pas aux
     symptômes d'écran, qui n'ont rien à voir. Pour une IDÉE, elle reste
     une feuille : on ne va pas demander à quelqu'un qui propose une
     amélioration si son score a été compté. */
  const dernieres = suite
    ? [
        { id:'minijeu', label:'Un mini-jeu',                   label_en:'A mini-game',
          enfants: JEUX },
        { id:'partout', label:'Partout, ou je ne sais pas où', label_en:"Everywhere, or I'm not sure",
          enfants: suite },
      ]
    : [
        { id:'minijeu', label:'Un mini-jeu qui existe déjà',   label_en:'An existing mini-game',
          exemple: fin.fr, exemple_en: fin.en },
        { id:'autre',   label:'Autre chose',                   label_en:'Something else',
          exemple: fin.fr, exemple_en: fin.en },
      ];

  return [...ZONES.map(feuille), ...dernieres];
}

export const ARBRE = [
  {
    id:'bug', emoji:'🐛',
    label:'Quelque chose ne marche pas', label_en:'Something is broken',
    enfants: zonesAvec(SYMPTOMES),
  },
  {
    id:'economie', emoji:'🍪',
    label:'Un problème de cookies, cafés ou actions', label_en:'A problem with cookies, coffees or shares',
    enfants:[
      { id:'perte',
        label:"J'ai perdu des cookies sans raison",           label_en:'I lost cookies for no reason',
        exemple:"J'en avais 12 000 hier soir, 8 000 ce matin, sans rien acheter.",
        exemple_en:'I had 12,000 last night, 8,000 this morning, and bought nothing.' },
      { id:'manque',
        label:"Une récompense n'est jamais arrivée",          label_en:'A reward never arrived',
        exemple:"J'ai fini le succès En Feu, le café n'est pas venu.",
        exemple_en:'I completed the On Fire achievement, the coffee never came.' },
      { id:'achat',
        label:"Un achat en boutique n'a rien donné",          label_en:'A shop purchase gave me nothing',
        exemple:"J'ai payé le thème Caramel, il n'est pas dans ma collection.",
        exemple_en:"I paid for the Caramel theme, it's not in my collection." },
      { id:'promo',
        label:'Un code promo ne marche pas',                  label_en:"A promo code doesn't work",
        demande:{ cle:'code', label:'Le code que tu as tapé', label_en:'The code you typed' },
        exemple:'Il me dit « code invalide » alors que je le tape bien.',
        exemple_en:'It says "invalid code" even though I type it correctly.' },
      { id:'marche',
        label:'Le marché : prix ou portefeuille faux',        label_en:'The market: wrong price or portfolio',
        exemple:"J'ai acheté 3 actions, mon portefeuille en affiche 1.",
        exemple_en:'I bought 3 shares, my portfolio shows 1.' },
      { id:'cafe',
        label:'Un café dépensé pour rien',                    label_en:'A coffee spent for nothing',
        exemple:"J'ai payé la relance, la partie ne s'est pas relancée.",
        exemple_en:"I paid for the continue, the run didn't restart." },
      { id:'autre',
        label:'Autre chose',                                  label_en:'Something else',
        exemple:'Dis-moi ce qui ne colle pas, avec les montants si tu les as.',
        exemple_en:"Tell us what doesn't add up, with the amounts if you have them." },
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
    demande:{ cle:'joueur', label:"Son pseudo, ou son code si tu l'as", label_en:'Their name, or their code if you have it' },
    enfants:[
      { id:'triche',
        label:'Il triche : sa progression est impossible',    label_en:"They're cheating: impossible progress",
        exemple:"Il est passé de 5 000 à 400 000 cookies en une nuit.",
        exemple_en:'They went from 5,000 to 400,000 cookies overnight.' },
      { id:'pseudo',
        label:'Son pseudo est insultant',                     label_en:'Their name is offensive',
        exemple:'Recopie le pseudo si tu peux.',              exemple_en:'Copy the name out if you can.' },
      { id:'harcele',
        label:'Il me harcèle',                                label_en:"They're harassing me",
        exemple:"Dis-moi où : demandes d'ami, messages, duels…",
        exemple_en:'Tell us where: friend requests, messages, duels…' },
      { id:'autre',
        label:'Autre chose',                                  label_en:'Something else',
        exemple:'Raconte.',                                   exemple_en:'Tell us about it.' },
    ],
  },
  {
    id:'idee', emoji:'💡',
    label:'Une idée pour le jeu', label_en:'An idea for the game',
    enfants:[
      { id:'nouveau_jeu',
        label:'Un tout nouveau mini-jeu',                     label_en:'A brand-new mini-game',
        exemple:'Décris-le : on y fait quoi, on gagne quoi ?',
        exemple_en:'Describe it: what do you do, what do you win?' },
      ...zonesAvec(null, {
        fr:'Dis ce que tu changerais, et pourquoi.',
        en:'Say what you would change, and why.',
      }),
    ],
  },
  {
    id:'autre', emoji:'❓',
    label:'Autre chose', label_en:'Something else',
    exemple:'Dis-moi tout, même si tu ne sais pas dans quelle case le ranger.',
    exemple_en:"Tell us everything, even if you don't know which box it fits in.",
  },
];

/* Ce que la console affiche en tête d'un signalement. Un statut doit
   dire ce qu'il reste à faire, pas seulement où on en est.

   Pas de version anglaise : la console est réservée à Régis. Le seul
   écran bilingue est celui des joueurs. */
export const STATUTS = {
  nouveau:    { label:'Nouveau',    emoji:'📮' },
  vu:         { label:'Lu',         emoji:'👁️' },
  traite:     { label:'Traité',     emoji:'✅' },
  sans_suite: { label:'Sans suite', emoji:'🗄️' },
};

/* ════════════════════════════════════════════════════
   sentinelleActions.js — le catalogue des actions
   ────────────────────────────────────────────────────
   Description DÉCLARATIVE de ce que la sentinelle sait faire. L'écran
   fabrique les formulaires à partir d'ici : ajouter une action, c'est
   ajouter une entrée ici et une branche dans la fonction Postgres
   `action_sentinelle` (cf. SENTINELLE_ACTIONS.sql). Aucune UI à écrire.

   ⚠️ CE FICHIER PART CHEZ TOUS LES JOUEURS. Il ne contient donc que
   des NOMS d'actions et des libellés — jamais le droit de les
   exécuter. Ce droit tient à la phrase de passe, qui n'existe que dans
   la base et dans la tête de Régis. Lire ce fichier apprend ce que la
   console sait faire ; ça ne permet pas de s'en servir.

   `danger` marque les actions qui touchent à l'économie d'un joueur ou
   à l'état du jeu pour tout le monde : l'écran demande alors une
   confirmation en deux temps, et les affiche en teinte espresso — la
   convention du projet pour tout ce qui fait mal (jamais de rouge).
═══════════════════════════════════════════════════════ */

/* Les trois familles. Neuf actions à plat, c'est une liste qu'on relit
   à chaque fois ; rangées par ce sur quoi elles agissent, on va droit
   au bon endroit. L'ordre compte : un joueur d'abord (le cas le plus
   fréquent), l'app en dernier (le plus rare et le plus lourd). */
export const GROUPES = [
  { id: 'joueur', titre: 'Un joueur',       emoji: '👤', resume: 'sanctionner, lever, compenser' },
  { id: 'marche', titre: 'Le marché $CKM',  emoji: '📈', resume: 'cours, ouverture, portefeuilles' },
  { id: 'app',    titre: "L'application",   emoji: '📱', resume: 'mise à jour, maintenance' },
];

/* Quel geste répond à quel constat. C'est ce qui relie les deux onglets :
   quand une ronde signale un portefeuille orphelin, le bouton qui le
   nettoie est PROPOSÉ SOUS LE CONSTAT, déjà prêt. Sans ça, il faut lire
   l'alerte, retenir le code du joueur, changer d'onglet, retrouver la
   bonne action — quatre occasions d'abandonner. */
export const ACTIONS_PAR_CONSTAT = {
  'versions':   ['forcer_maj'],
  'marché':     ['corriger_cours', 'nettoyer_portefeuille'],
  'triche':     ['sanctionner'],
  'classement': ['sanctionner'],
  'bugs':       ['maintenance'],
};

/* Deux actions ne figurent PAS dans ce catalogue et c'est volontaire :
   `classer_sans_suite` et `reprendre_constat`. Elles existent côté base
   (cf. SENTINELLE_ACTIONS.sql) mais ne s'atteignent que depuis le
   constat concerné, dans l'onglet État — les mettre dans une liste
   d'actions obligerait à recopier une signature à la main, alors que
   le bouton la connaît déjà. Elles apparaissent en revanche dans le
   registre, comme tout le reste. */

export const ACTIONS_SENTINELLE = [
  {
    id: 'sanctionner',
    groupe: 'joueur',
    titre: 'Sanctionner un compte',
    resume: "Remet un compte aux valeurs indiquées et le place sous surveillance",
    aide: "Le compteur d'adoption est incrémenté : tous les appareils du joueur prendront ces valeurs, y compris celui qui a servi à les remonter. Le mur empêchera ensuite son téléphone de refaire le geste.",
    danger: true,
    champs: [
      { nom:'user_code',    label:'Code du joueur',   type:'text',   requis:true, exemple:'AZL-C8T' },
      { nom:'level',        label:'Niveau',           type:'nombre', exemple:'15' },
      { nom:'total_earned', label:'Cumul (classement)', type:'nombre', exemple:'67000' },
      { nom:'cookies',      label:'Solde de cookies', type:'nombre', exemple:'10800' },
      { nom:'cafes',        label:'Cafés',            type:'nombre', exemple:'14' },
      { nom:'motif',        label:'Motif (pour le journal)', type:'text', exemple:'exploit Memory' },
    ],
  },
  {
    id: 'lever_sanction',
    groupe: 'joueur',
    titre: 'Lever une surveillance',
    resume: "Rend un compte à la vie normale",
    aide: "Retire le compte du mur. Ses chiffres actuels sont conservés : lever la surveillance ne lui rend pas ce qui a été retiré.",
    champs: [
      { nom:'user_code', label:'Code du joueur', type:'text', requis:true, exemple:'AZL-C8T' },
    ],
  },
  {
    id: 'compenser',
    groupe: 'joueur',
    titre: 'Compenser un joueur',
    resume: "Ajoute des cookies ou des cafés à un compte",
    aide: "Uniquement à la hausse. Pour retirer, passe par « Sanctionner » — qui laisse une trace explicite dans le journal.",
    danger: true,
    champs: [
      { nom:'user_code', label:'Code du joueur',    type:'text',   requis:true, exemple:'XN2-Z7M' },
      { nom:'cookies',   label:'Cookies à ajouter', type:'nombre', exemple:'500' },
      { nom:'cafes',     label:'Cafés à ajouter',   type:'nombre', exemple:'1' },
    ],
  },
  {
    id: 'corriger_cours',
    groupe: 'marche',
    titre: 'Corriger le cours',
    resume: "Force le prix de l'action $CKM",
    aide: "La garde du prix est désarmée le temps de l'écriture, puis réarmée. Le nouveau prix est borné entre 100 et 2500, et un point est posé sur la courbe.",
    danger: true,
    champs: [
      { nom:'prix', label:'Nouveau cours', type:'nombre', requis:true, exemple:'500' },
    ],
  },
  {
    id: 'fermer_marche',
    groupe: 'marche',
    titre: 'Fermer le marché',
    resume: "Suspend les échanges pendant quelques heures",
    aide: "Passe par le circuit breaker, seul levier de fermeture qui vive en base. Le vrai drapeau CLOSED est dans le code : le rouvrir pour de bon demande un déploiement.",
    danger: true,
    champs: [
      { nom:'heures', label:'Pendant combien d\'heures', type:'nombre', exemple:'12' },
    ],
  },
  {
    id: 'ouvrir_marche',
    groupe: 'marche',
    titre: 'Rouvrir le marché',
    resume: "Lève la fermeture posée ci-dessus",
    champs: [],
  },
  {
    id: 'creer_code_promo',
    groupe: 'app',
    titre: 'Créer un code promo',
    resume: "Un nouveau code utilisable tout de suite, sans redéploiement",
    aide: "Actif dès que tu valides, sans redéploiement. Chaque joueur ne peut l'utiliser qu'une fois. Retaper un code qui existe déjà — les 24 historiques compris — en modifie les récompenses, et le remet en service s'il avait été supprimé.",
    danger: true,
    champs: [
      { nom:'code',   label:'Le code (majuscules automatiques)', type:'text',   requis:true, exemple:'RENTREE25' },
      { nom:'coins',  label:'Cookies offerts',  type:'nombre', exemple:'500' },
      { nom:'cafes',  label:'Cafés offerts',    type:'nombre', exemple:'1' },
      { nom:'shares', label:'Actions offertes', type:'nombre', exemple:'0' },
      { nom:'label',  label:'Ce que le joueur lira', type:'text', exemple:'Bonne rentrée ! +500 🍪' },
    ],
  },
  {
    id: 'desactiver_code_promo',
    groupe: 'app',
    titre: 'Supprimer un code promo',
    resume: "Le code cesse de marcher et sort de la liste",
    aide: "Il sort de « les codes promo » et cesse de marcher — les 24 historiques compris. Ceux qui l'ont déjà utilisé gardent leur récompense, on ne reprend rien. La ligne reste en base, marquée supprimée : c'est précisément elle qui empêche l'app de retomber sur sa copie écrite en dur. Pour le remettre en service, recrée-le avec le même nom.",
    champs: [
      { nom:'code', label:'Le code à désactiver', type:'text', requis:true, exemple:'RENTREE25' },
    ],
  },
  {
    id: 'forcer_maj',
    groupe: 'app',
    titre: 'Forcer la mise à jour',
    resume: "Affiche « Mise à jour disponible » à qui n'est pas sur cette version",
    aide: "C'est le remède quand la sentinelle signale des versions périmées. ⚠️ L'effet n'est PAS immédiat : ça pose un drapeau que le joueur ne verra qu'en rouvrant son app, parfois des jours plus tard. Le constat restera donc affiché — mais rangé dans « traité, en attente d'effet ». Laisser vide pour annuler.",
    champs: [
      { nom:'version', label:'Version à imposer', type:'text', exemple:'1.30.0', effacable:true },
    ],
  },
  {
    id: 'maintenance',
    groupe: 'app',
    titre: 'Maintenance',
    resume: "Coupe l'app pour tout le monde, ou la rallume",
    aide: "L'écran de maintenance remplace toute l'application. À n'utiliser que le temps d'une correction, sinon les joueurs partent. Les deux textes partent de ce qui est déjà en base : les vider et valider les efface pour de bon.",
    danger: true,
    champs: [
      { nom:'actif',      label:'Activer (oui/non)', type:'oui_non', requis:true },
      { nom:'titre',      label:'Titre affiché',     type:'text', exemple:'Maintenance en cours', effacable:true },
      { nom:'sous_titre', label:'Sous-titre',        type:'text', exemple:'On répare, reviens dans 10 min', effacable:true },
    ],
  },
  {
    id: 'nettoyer_portefeuille',
    groupe: 'marche',
    titre: 'Nettoyer un portefeuille orphelin',
    resume: "Retire les actions d'un compte qui n'existe plus",
    aide: "Retire la ligne ET décrémente la circulation du même nombre : faire l'un sans l'autre créerait un écart que le contrôle suivant signalerait.",
    danger: true,
    champs: [
      { nom:'user_code', label:'Code du portefeuille', type:'text', requis:true, exemple:'KKD-BER' },
    ],
  },
];

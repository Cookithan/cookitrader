/* ════════════════════════════════════════════════════
   schemaAttendu.js — ce que l'app attend de la base
   ────────────────────────────────────────────────────
   Le 09/09/2026, la console de sanction a refusé d'écrire parce qu'une
   colonne manquait en production. Le dépôt savait ce qu'il fallait, la
   base ne l'avait pas, et rien ne comparait les deux. Ce fichier est la
   moitié « ce qu'il faut » de cette comparaison ; la fonction
   `sentinelle_schema` (sql/SENTINELLE_SCHEMA.sql) est la moitié « ce qu'il
   y a ».

   AJOUTER UN CONTRÔLE = ajouter une entrée ici. Aucun SQL à repasser :
   la fonction Postgres est générique, elle répond à des noms.

   ⚠️ CE FICHIER PART CHEZ TOUS LES JOUEURS.
   Il ne contient donc QUE des noms d'objets et des explications — jamais
   le SQL correctif lui-même. C'est délibéré : le contenu de LE_MUR
   décrit exactement comment le mur anti-triche décide, et l'expédier
   dans le bundle de chaque joueur reviendrait à publier le mode d'emploi
   pour le contourner. La console nomme le fichier ; le fichier vit dans
   le dépôt, entre les mains de Cookithan.

   `gravite` : 'bloquant' = quelque chose ne marche plus, ou pire, une
   protection ne protège plus. 'utile' = une fonctionnalité dort, sans
   danger. La console trie là-dessus.
═══════════════════════════════════════════════════════ */

export const SCHEMA_ATTENDU = [
  {
    id: 'mur_plafonds',
    table: 'comptes_sous_surveillance',
    colonne: 'plafond_earned',
    gravite: 'bloquant',
    quoi: 'Les plafonds de repli du mur anti-restauration',
    casse: "La console de sanction échoue à écrire — mais surtout, le mur tourne encore sans « security definer » : il ne voit pas la liste de surveillance, donc il ne bloque personne. Un compte sanctionné peut remonter ses valeurs depuis son téléphone.",
    fichier: 'sql/LE_MUR_CORRECTIF.sql',
  },
  {
    id: 'surveillance',
    table: 'comptes_sous_surveillance',
    gravite: 'bloquant',
    quoi: 'La liste des comptes sous surveillance',
    casse: "Sanctionner devient impossible et le mur n'a plus rien à consulter.",
    fichier: 'sql/LE_MUR.sql',
  },
  {
    id: 'actions',
    fonction: 'action_sentinelle',
    gravite: 'bloquant',
    quoi: 'Le moteur des actions de la console',
    casse: 'Aucun bouton de l\'onglet Agir ne fonctionne.',
    fichier: 'sql/SENTINELLE_ACTIONS.sql',
  },
  {
    id: 'modifier',
    fonction: 'sentinelle_modifier_joueur',
    gravite: 'utile',
    quoi: 'La main directe sur un compte',
    casse: "La Sentinelle ne peut plus rien changer sur un compte quand Cookithan le lui demande de vive voix.",
    fichier: 'sql/SENTINELLE_MODIFIER.sql',
  },
  {
    id: 'horloge_portes',
    fonction: 'sentinelle_pourquoi_pas',
    gravite: 'bloquant',
    quoi: 'Les portes devant ses rondes',
    casse: "Sans elles, l'horloge appelle le modele toutes les heures sans condition : la nuit, quand rien n'a bouge, et sans plafond journalier. C'est le budget API qui se vide.",
    fichier: 'sql/SENTINELLE_ECONOMIE.sql',
  },
  {
    id: 'mode',
    fonction: 'sentinelle_changer_mode',
    gravite: 'bloquant',
    quoi: "L'interrupteur d'autonomie",
    casse: "Impossible de couper ses rondes depuis la console : le seul frein a la depense passerait par l'editeur SQL.",
    fichier: 'sql/SENTINELLE_ECONOMIE.sql',
  },
  {
    id: 'annonce',
    fonction: 'sentinelle_annoncer',
    gravite: 'utile',
    quoi: 'Ses annonces aux joueurs',
    casse: "Elle ne peut plus prevenir les joueurs d'un marche rouvert ou d'une panne finie.",
    fichier: 'sql/SENTINELLE_ANNONCE.sql',
  },
  {
    id: 'registre_gestes',
    table: 'sentinelle_gestes',
    gravite: 'bloquant',
    quoi: 'Le registre annulable de ses gestes autonomes',
    casse: "Le mode full autonome n'a plus de filet : elle agit sans que rien ne garde l'etat d'avant, donc plus rien ne se defait. NE PAS activer le mode full tant que ce registre manque.",
    fichier: 'sql/SENTINELLE_AUTONOMIE.sql',
  },
  {
    id: 'annuler',
    fonction: 'sentinelle_annuler_geste',
    gravite: 'bloquant',
    quoi: "Le bouton qui defait ce qu'elle a fait",
    casse: "L'ecran de retour montre ce qu'elle a fait mais ne peut plus le defaire.",
    fichier: 'sql/SENTINELLE_AUTONOMIE.sql',
  },
  {
    id: 'surveille',
    fonction: 'suis_je_surveille',
    gravite: 'utile',
    quoi: "Le splash Sentinelle d'un compte surveille",
    casse: "Un compte sanctionne garde le splash normal : il ne saura pas qu'il est surveille. Rien d'autre ne casse.",
    fichier: 'sql/SUIS_JE_SURVEILLE.sql',
  },
  {
    id: 'phrase',
    fonction: 'sentinelle_phrase_ok',
    gravite: 'bloquant',
    quoi: 'La vérification de la phrase de passe',
    casse: 'La console ne se déverrouille plus du tout.',
    fichier: 'sql/SIGNALEMENTS.sql',
  },
  {
    id: 'garde_prix',
    fonction: 'market_price_guard',
    gravite: 'bloquant',
    quoi: 'La garde sur le cours du $CKM',
    casse: "Un saut de prix aberrant n'est plus refusé : le marché peut être écrit à n'importe quelle valeur.",
    fichier: 'sql/PROTEGER_LE_PRIX.sql',
  },
  {
    id: 'signalements',
    fonction: 'envoyer_signalement',
    gravite: 'utile',
    quoi: 'L\'envoi des signalements de joueurs',
    casse: 'Les joueurs ne peuvent plus rien signaler ; le formulaire échoue en silence.',
    fichier: 'sql/SIGNALEMENTS.sql',
  },
  {
    id: 'signalements_langue',
    table: 'signalements',
    colonne: 'langue',
    gravite: 'utile',
    quoi: 'La langue d\'un signalement',
    casse: "Les signalements arrivent sans savoir en quelle langue répondre.",
    fichier: 'sql/SIGNALEMENTS_LANGUE.sql',
  },
];

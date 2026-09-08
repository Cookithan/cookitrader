/* ════════════════════════════════════════════════════
   accountNotices.js — messages de compte one-shot (v1.29)
   ────────────────────────────────────────────────────
   Suite de l'exploit du mini-jeu Memory, resté neuf semaines en ligne
   (2026-07-03 → 2026-09-07). Deux comptes en ont vécu, la communauté a
   payé l'addition : podium hebdomadaire faussé, classement cumulé
   faussé, 96 % du marché $CKM détenu avec des cookies fabriqués.

   Trois familles de messages, une modale unique :
     · SANCTIONS     — ce qui a été retiré, et pourquoi
     · COMPENSATIONS — ce qui a été rendu, et pourquoi
     · REGROUPEMENT  — le passage de l'action à 500 (08/09/2026), qui
                       divise le nombre d'actions par 5 sans toucher à
                       leur valeur. Sans message, ça ressemble à un vol.

   ⚠️ CES MESSAGES N'APPLIQUENT AUCUN EFFET. Ils ne débitent ni ne
   créditent rien : les corrections sont faites en SQL, une fois pour
   toutes (SANCTION_EXPLOIT_MEMORY.sql et RESTAURER_ACTIONS_CKM.sql).
   C'est délibéré. Les anciennes sanctions de mai 2026 appliquaient
   leur débit côté client avec un verrou en localStorage, donc PAR
   APPAREIL : un joueur rouvrant l'app sur un téléphone neuf se faisait
   débiter une seconde fois (cf. le commentaire « double-refund » dans
   App.jsx). En séparant l'effet du message, ce piège disparaît.

   AFFICHAGE UNIQUE, ET SEULEMENT À PARTIR DE LA MISE À JOUR :
   la modale passe par applyPatchOnce(), qui garde la trace côté
   Supabase — donc une seule fois par COMPTE, pas par appareil. Et comme
   ce fichier n'existe qu'à partir de la v1.29, personne ne peut le voir
   avant d'avoir la mise à jour.

   Pour retirer un message une fois qu'il a fait son office : supprimer
   l'entrée. Ne jamais réutiliser une clé `patch` déjà consommée, sinon
   le message ne réapparaîtra pas.
═══════════════════════════════════════════════════════ */

/* Le préfixe garde son nom d'origine (V130) : le système a été écrit
   pour la 1.30 puis sorti en urgence en 1.29. Le renommer maintenant
   ferait réapparaître le message chez tout le monde au moment de la
   fusion de la branche 1.30 — la clé du patch EST le verrou. */
export const NOTICE_PATCH_PREFIX = 'noticeV130_';

/* ── Comptes sanctionnés ──────────────────────────────
   `removed` : ce que le joueur a réellement perdu, dans l'ordre où il
   le remarquera en ouvrant l'app. Être précis est le seul moyen qu'il
   comprenne au lieu de croire à un bug. */
export const SANCTION_NOTICES = {
  'AZL-C8T': {
    name: 'Fedider',
    title: 'Ton compte a été remis à plat',
    reason: "Un bug du mini-jeu Memory versait des milliers de cookies par partie. Ton compte en a largement profité — 63 % de tout ce que la communauté a gagné la semaine dernière.",
    removed: [
      'Niveau 25 → 15',
      '176 938 → 67 000 cookies au classement cumulé',
      '49 763 → 10 800 cookies de solde',
      '29 → 14 cafés',
      '461 actions $CKM retirées',
      '23 objets retirés (au-delà de ce que ton niveau et ton budget réels permettaient)',
      'Badges de champion des semaines gagnées avec ces scores',
    ],
    /* Il a signalé le bug de lui-même : ça mérite d'être dit. Mais une
       pénalité s'ajoute à la remise à plat (10 cafés et 8 000 cookies),
       parce qu'il en a profité des semaines avant de le signaler — le
       message doit le dire, sinon il ne comprendra pas l'écart entre
       les chiffres annoncés et le simple rééquilibrage. */
    footer: "Merci d'avoir signalé le bug toi-même : c'est ce qui a permis de le corriger. Une pénalité de 10 cafés et 8 000 cookies s'ajoute quand même à la remise à plat, parce que tu en as profité plusieurs semaines avant de le dire. Le reste n'est qu'un retour à ce que ton temps de jeu justifie.",
  },
  'FPJ-LJK': {
    name: 'Le vrai Cooki',
    title: 'Ton compte a été remis à plat',
    reason: "Un bug du mini-jeu Memory versait des milliers de cookies par partie. Ton compte l'a exploité dès la première semaine où c'était possible, en juillet, et jusqu'à aujourd'hui.",
    removed: [
      'Niveau 18 → 11',
      '108 416 → 19 000 cookies au classement cumulé',
      '3 832 → 700 cookies de solde',
      '306 actions $CKM retirées',
      '16 objets retirés (au-delà de ce que ton niveau et ton budget réels permettaient)',
      'Badges de champion des semaines gagnées avec ces scores',
    ],
    footer: "Le bug est corrigé. Tu peux continuer à jouer normalement, à partir d'une base honnête.",
  },
};

/* ── Comptes compensés ────────────────────────────────
   Les actions $CKM effacées lors de la remise à zéro du marché sont
   rendues. Miagguy reçoit en plus les 2 cafés du podium qui lui
   revenaient : il était le vrai vainqueur de la semaine du 28 août. */
const ACTIONS_RENDUES = {
  '83F-LV2': ['Regislegoat', 327],
  'FXF-9CK': ['LXP', 221],
  'AUY-KJ9': ['Mustang46', 142],
  '7Z4-977': ['dokiller', 90],
  'XN2-Z7M': ['Miagguy', 76],
  'L7X-RDP': ['Régis (le vrai)', 46],
  'X6G-4ZL': ['150000Cookiaaronxbox', 42],
  '2VR-SFT': ['Bebou', 37],
  '5H5-ZA6': ['ZeTroXx', 34],
  'VEF-Q98': ['Meno', 29],
  'TRC-XZS': ['Noa', 8],
  '4EF-WR8': ['Slyzerx', 8],
  'WAN-9KT': ['Aka', 8],
  'H5X-X9Y': ['RyuuNoKamii', 2],
  '43F-RB3': ['Razox', 1],
  '9US-FXX': ['Epikseo', 1],
};

/* Bonus au cas par cas, en plus des actions rendues.

   Podium refait de la semaine du 28 août : les deux premières places
   étaient tenues par des scores fabriqués, donc tout le monde remonte
   de deux rangs. Cafés du podium : 1er +3, 2e +2, 3e +1 — Miagguy
   avait déjà touché 1 café en tant que 3e, d'où +2 et non +3.
   Cf. SANCTION_EXPLOIT_MEMORY.sql pour la reconstruction des rangs. */
const BONUS = {
  'XN2-Z7M': ['2 cafés — tu passes 1er du classement de la semaine du 28 août, la place t\'avait été prise'],
  'X6G-4ZL': ['2 cafés — tu passes 2e du classement de la semaine du 28 août'],
  'FXF-9CK': ['1 café — tu passes 3e du classement de la semaine du 28 août'],
};

export const REWARD_NOTICES = Object.fromEntries(
  Object.entries(ACTIONS_RENDUES).map(([code, [name, shares]]) => [code, {
    name,
    title: 'On t\'a rendu ce qui te revenait',
    reason: "Le marché $CKM a été remis à zéro pour repartir sur une base saine, après qu'un bug ait permis à deux comptes d'acheter des actions avec des cookies fabriqués. Tes actions à toi étaient légitimes : elles te sont rendues.",
    gained: [
      `${shares} action${shares > 1 ? 's' : ''} $CKM rendue${shares > 1 ? 's' : ''}`,
      ...(BONUS[code] || []),
    ],
    footer: 'Merci de faire tourner le café honnêtement ☕',
  }])
);

/* ── Regroupement d'actions du 08/09/2026 ─────────────
   L'action passe de 100 à 500 🍪. Pour que la valeur des portefeuilles
   ne bouge pas, 5 anciennes actions deviennent 1 nouvelle (cf.
   SPLIT_MARCHE_500.sql). Un porteur qui rouvre l'app sans explication
   voit ses 327 actions devenues 66 : il croit à une confiscation.

   Les quantités sont dérivées d'ACTIONS_RENDUES — c'est la même table
   que celle rendue en 1.29, et le marché est resté fermé depuis, donc
   personne n'a pu bouger d'une action entre les deux. Si le marché
   rouvre avant que ce message ne soit distribué, cette dérivation
   devient fausse : figer les chiffres en dur à ce moment-là.

   CEIL, comme dans le SQL : l'arrondi va toujours dans le sens du
   joueur, pour que la ligne « valeur » ne soit jamais une perte. */
const SPLIT_RATIO = 5;
const NEW_PRICE   = 500;

export const SPLIT_NOTICES = Object.fromEntries(
  Object.entries(ACTIONS_RENDUES).map(([code, [name, shares]]) => {
    const after = Math.ceil(shares / SPLIT_RATIO);
    return [code, {
      name,
      title: 'Tes actions ont changé d\'échelle',
      reason: "Le marché $CKM rouvre avec une action à 500 🍪 au lieu de 100. Pour que ça ne crée pas de cookies à partir de rien, 5 anciennes actions valent désormais 1 nouvelle action. Tu en as donc moins — mais elles valent cinq fois plus.",
      gained: [
        `${shares} action${shares > 1 ? 's' : ''} → ${after} action${after > 1 ? 's' : ''}`,
        `Ton portefeuille pèse ${(after * NEW_PRICE).toLocaleString('fr-FR')} 🍪 (contre ${(shares * 100).toLocaleString('fr-FR')} 🍪 avant — l'arrondi t'a été laissé)`,
      ],
      footer: "Le cours ne bougera plus tout seul : il ne monte que si des joueurs achètent, il ne descend que si des joueurs vendent. À toi de jouer ☕",
    }];
  })
);

/* Retourne LES messages qui concernent ce compte, du plus ancien au
   plus récent, sous forme de liste. C'est l'appelant (App.jsx) qui
   affiche le premier dont le patch n'a pas encore été consommé.

   ⚠️ Pourquoi une liste et plus un seul message : les 16 porteurs
   d'actions ont déjà reçu leur message de compensation en 1.29. Avec
   un `return` au premier match, ils n'auraient JAMAIS vu celui du
   regroupement — la fonction aurait rendu la compensation, déjà
   consommée, et l'affichage se serait arrêté là.

   `kind` vaut 'sanction' ou 'reward' — la modale change de ton.
   `forceServerAdoption` : réservé aux messages dont la correction
   touche la table users (cookies, cafés, niveau). Le regroupement
   d'actions, lui, ne touche que market_portfolio : forcer l'adoption
   des valeurs serveur ferait courir au joueur le risque de perdre la
   progression gagnée depuis son dernier envoi, pour rien. */
export function getAccountNotices(userCode){
  if(!userCode) return [];
  const code = userCode.toUpperCase();
  const out = [];
  if(SANCTION_NOTICES[code]) out.push({ kind: 'sanction', patch: NOTICE_PATCH_PREFIX + 'sanction', forceServerAdoption: true,  ...SANCTION_NOTICES[code] });
  if(REWARD_NOTICES[code])   out.push({ kind: 'reward',   patch: NOTICE_PATCH_PREFIX + 'reward',   forceServerAdoption: true,  ...REWARD_NOTICES[code] });
  /* requiresMarketPrice : le message décrit un regroupement fait en SQL.
     Tant que le SQL n'a pas tourné, le joueur a encore ses 327 actions
     et le message lui mentirait — pire, il aurait consommé son verrou
     one-shot pour rien. On attend donc de voir le prix à 500 en base.
     C'est ce qui rend l'ordre « déploiement d'abord, SQL ensuite »
     inoffensif, au lieu d'être une fenêtre de tir de quelques heures. */
  if(SPLIT_NOTICES[code])    out.push({ kind: 'reward',   patch: NOTICE_PATCH_PREFIX + 'split500', forceServerAdoption: false, requiresMarketPrice: NEW_PRICE, ...SPLIT_NOTICES[code] });
  return out;
}

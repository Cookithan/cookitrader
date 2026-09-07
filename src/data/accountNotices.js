/* ════════════════════════════════════════════════════
   accountNotices.js — messages de compte one-shot (v1.30)
   ────────────────────────────────────────────────────
   Suite de l'exploit du mini-jeu Memory, resté neuf semaines en ligne
   (2026-07-03 → 2026-09-07). Deux comptes en ont vécu, la communauté a
   payé l'addition : podium hebdomadaire faussé, classement cumulé
   faussé, 96 % du marché $CKM détenu avec des cookies fabriqués.

   Deux familles de messages, une modale unique :
     · SANCTIONS    — ce qui a été retiré, et pourquoi
     · COMPENSATIONS — ce qui a été rendu, et pourquoi

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
   ce fichier n'existe qu'à partir de la v1.30, personne ne peut le voir
   avant d'avoir la mise à jour.

   Pour retirer un message une fois qu'il a fait son office : supprimer
   l'entrée. Ne jamais réutiliser une clé `patch` déjà consommée, sinon
   le message ne réapparaîtra pas.
═══════════════════════════════════════════════════════ */

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

/* Bonus au cas par cas, en plus des actions rendues. */
const BONUS = {
  'XN2-Z7M': ['2 cafés — tu étais le vrai vainqueur du classement de la semaine du 28 août, le podium t\'avait été pris'],
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

/* Retourne le message qui concerne ce compte, ou null.
   `kind` vaut 'sanction' ou 'reward' — la modale change de ton. */
export function getAccountNotice(userCode){
  if(!userCode) return null;
  const code = userCode.toUpperCase();
  if(SANCTION_NOTICES[code]) return { kind: 'sanction', patch: NOTICE_PATCH_PREFIX + 'sanction', ...SANCTION_NOTICES[code] };
  if(REWARD_NOTICES[code])   return { kind: 'reward',   patch: NOTICE_PATCH_PREFIX + 'reward',   ...REWARD_NOTICES[code] };
  return null;
}

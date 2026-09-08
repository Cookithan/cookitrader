import { supabase, isSupabaseEnabled } from './supabase';
import { MARKET_CONFIG } from './market.js';
import { APP_INFO } from './appInfo.js';
import { isAdminName } from '../utils/admin.js';
import { versionsParJoueur } from './sentinelle.js';

/* ════════════════════════════════════════════════════
   sentinelleQuestions.js — poser une question à la vigie
   ────────────────────────────────────────────────────
   Régis voulait « parler » à la sentinelle, pas seulement l'inspecter.
   Choix assumé : PAS d'intelligence artificielle. Une IA aurait
   demandé une clé d'API, un coût par message, et un serveur relais —
   pour répondre à des questions qui sont, au fond, des lectures de
   base de données.

   Ce fichier comprend donc un JEU DE QUESTIONS ÉCRITES À L'AVANCE. Il
   ne devine rien : il reconnaît des mots. En échange, il est gratuit,
   instantané, et il ne raconte jamais n'importe quoi — ce qui compte
   davantage sur un écran d'où l'on sanctionne de vrais comptes.

   ⚠️ Sa limite est réelle et il faut l'assumer : hors du cadre prévu,
   il répond « je ne sais pas » et propose ce qu'il sait faire. Mieux
   vaut un outil qui connaît ses bornes qu'un outil qui invente.

   POUR AJOUTER UNE QUESTION : une entrée dans QUESTIONS. Chacune
   déclare les mots qui la déclenchent, et une fonction qui va chercher
   la réponse. Rien d'autre à câbler.
═══════════════════════════════════════════════════════ */

const num = (v) => Number(v) || 0;
const fmt = (n) => Math.round(num(n)).toLocaleString('fr-FR');

/* Comparaison tolérante : sans accents, sans casse, sans ponctuation.
   « Comment va le marché ? » et « marche » doivent tomber pareil. */
function nettoyer(txt) {
  return String(txt || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const q = async (table, select, extra = '') => {
  if (!isSupabaseEnabled()) return [];
  try {
    let req = supabase.from(table).select(select);
    if (extra === 'market') req = req.eq('id', 1);
    const { data } = await req;
    return data || [];
  } catch {
    return [];
  }
};

/* ── LA LISTE DES JOUEURS ─────────────────────────────
   Sert au tableau ET aux réponses. Un seul appel, réutilisé. */
export async function tousLesJoueurs() {
  if (!isSupabaseEnabled()) return [];
  try {
    /* La version tournant chez chaque joueur voyage avec sa fiche : quand
       on cherche quelqu'un pour agir sur son compte, savoir qu'il est
       resté sur une vieille version change l'interprétation de tout le
       reste — c'est ce qui expliquait le cours à 300 le 08/09. */
    const [reponse, versions] = await Promise.all([
      supabase
        .from('users')
        .select('user_name, user_code, level, total_earned, cookies, cafes, total_play_time, last_active, prestige_level')
        .order('total_earned', { ascending: false })
        .limit(500),
      versionsParJoueur(),
    ]);
    return (reponse.data || []).map(u => ({ ...u, ...(versions.get(u.user_code) || {}) }));
  } catch {
    return [];
  }
}

/* Cherche un joueur par pseudo approchant ou par code exact. C'est ce
   qui permet de taper « miag » et d'obtenir Miagguy. */
export function chercherJoueur(joueurs, texte) {
  const t = nettoyer(texte);
  if (!t) return null;
  const parCode = joueurs.find(j => nettoyer(j.user_code) === t);
  if (parCode) return parCode;
  const exact = joueurs.find(j => nettoyer(j.user_name) === t);
  if (exact) return exact;
  return joueurs.find(j => nettoyer(j.user_name).includes(t)) || null;
}

function ficheJoueur(j) {
  const minutes = num(j.total_play_time) / 60;
  const rendement = minutes >= 10 ? Math.round(num(j.total_earned) / minutes) : null;
  return {
    titre: j.user_name,
    code: j.user_code,
    lignes: [
      `Code du compte : ${j.user_code}`,
      `Niveau ${j.level}${num(j.prestige_level) ? ` · prestige ${j.prestige_level}` : ''}`,
      `${fmt(j.total_earned)} 🍪 au classement cumulé`,
      `${fmt(j.cookies)} 🍪 en poche · ${num(j.cafes)} ☕`,
      `${Math.round(minutes)} min de jeu${rendement ? ` · ${rendement} 🍪/min` : ''}`,
      j.last_active ? `Vu pour la dernière fois le ${new Date(j.last_active).toLocaleString('fr-FR')}` : null,
      j.version
        ? `Application en version ${j.version}${j.version !== APP_INFO.version ? ' ⚠️ périmée' : ''}`
        : "Version inconnue — ce compte n'a pas ouvert l'app depuis que la vigie écoute",
    ].filter(Boolean),
  };
}

/* ── LES QUESTIONS RECONNUES ──────────────────────────
   `mots` : il suffit qu'UN mot corresponde. `repondre` reçoit la liste
   des joueurs (déjà chargée) et rend { titre, lignes }. */
const QUESTIONS = [
  {
    id: 'marche',
    mots: ['marche', 'cours', 'prix', 'action', 'ckm', 'bourse'],
    exemple: 'le cours du marché',
    async repondre() {
      const [etat] = await q('market_state', '*', 'market');
      if (!etat) return { titre: 'Marché', lignes: ['Aucun état de marché en base.'] };
      const prix = num(etat.current_price);
      const circ = num(etat.shares_in_circulation);
      const total = num(etat.total_shares_supply);
      const cb = etat.circuit_breaker_until && new Date(etat.circuit_breaker_until) > new Date();
      return {
        titre: `L'action vaut ${fmt(prix)} 🍪`,
        lignes: [
          `${fmt(circ)} actions détenues par les joueurs sur ${fmt(total)}`,
          `Soit ${fmt(prix * circ)} 🍪 de valeur entre leurs mains`,
          `Bornes du jeu : ${MARKET_CONFIG.PRICE_MIN} à ${MARKET_CONFIG.PRICE_MAX} 🍪`,
          cb ? `⛔ Marché FERMÉ (circuit breaker) jusqu'au ${new Date(etat.circuit_breaker_until).toLocaleString('fr-FR')}`
             : MARKET_CONFIG.CLOSED ? '⛔ Marché fermé dans le code (MARKET_CONFIG.CLOSED)'
             : '✅ Marché ouvert',
        ],
      };
    },
  },
  {
    id: 'triche',
    mots: ['triche', 'tricheur', 'suspect', 'rendement', 'exploit', 'cheat'],
    exemple: 'qui a un rendement suspect',
    async repondre(joueurs) {
      const actifs = joueurs
        .filter(j => !isAdminName(j.user_name) && num(j.total_play_time) >= 600)
        .map(j => ({ j, r: Math.round(num(j.total_earned) / (num(j.total_play_time) / 60)) }))
        .filter(x => x.r > 200)
        .sort((a, b) => b.r - a.r);
      if (!actifs.length) return { titre: 'Aucun rendement suspect', lignes: ['Personne au-dessus de 200 🍪/min chez les joueurs actifs.'] };
      return {
        titre: `${actifs.length} compte(s) au-dessus de 200 🍪/min`,
        lignes: actifs.map(x => `${x.j.user_name} (${x.j.user_code}) — ${x.r} 🍪/min · niveau ${x.j.level}`)
          .concat(['Au-delà de 400/min tenus dans la durée, aucune chance ne l\'explique.']),
      };
    },
  },
  {
    id: 'classement',
    mots: ['classement', 'top', 'meilleur', 'premier', 'leader', 'podium'],
    exemple: 'le classement',
    async repondre(joueurs) {
      const liste = joueurs.filter(j => !isAdminName(j.user_name)).slice(0, 8);
      return {
        titre: 'Classement cumulé',
        lignes: liste.map((j, i) => `${i + 1}. ${j.user_name} — ${fmt(j.total_earned)} 🍪 · niveau ${j.level}`),
      };
    },
  },
  {
    id: 'actifs',
    mots: ['actif', 'joueurs', 'monde', 'combien', 'connecte'],
    exemple: 'combien de joueurs actifs',
    async repondre(joueurs) {
      const jours = (iso) => iso ? (Date.now() - new Date(iso).getTime()) / 86_400_000 : 999;
      const j1 = joueurs.filter(j => jours(j.last_active) <= 1).length;
      const j7 = joueurs.filter(j => jours(j.last_active) <= 7).length;
      return {
        titre: `${joueurs.length} comptes au total`,
        lignes: [
          `${j1} joueur(s) vu(s) dans les dernières 24 h`,
          `${j7} sur les 7 derniers jours`,
          `${joueurs.filter(j => isAdminName(j.user_name)).length} compte(s) admin (hors classement)`,
        ],
      };
    },
  },
  {
    id: 'versions',
    mots: ['version', 'maj', 'mise a jour', 'update'],
    exemple: 'quelles versions tournent',
    /* Le décompte part de TOUS les comptes, jamais des rapports reçus :
       ne compter que ceux qui se manifestent donnerait un « tout le
       monde est à jour » faux, alors que les clients dangereux sont
       précisément ceux qui n'ouvrent pas souvent l'app. */
    async repondre(joueurs) {
      const versions = await versionsParJoueur();
      const jours = (iso) => iso ? (Date.now() - new Date(iso).getTime()) / 86_400_000 : 9999;

      const par = {};
      const sansVersion = { j30: 0, j60: 0, plus: 0 };
      for (const j of joueurs) {
        const info = versions.get(j.user_code);
        if (info) { par[info.version] = (par[info.version] || 0) + 1; continue; }
        const d = jours(j.last_active);
        if (d <= 30) sansVersion.j30++;
        else if (d <= 60) sansVersion.j60++;
        else sansVersion.plus++;
      }

      const lignes = Object.entries(par)
        .sort((a, b) => b[1] - a[1])
        .map(([v, n]) => `${v === APP_INFO.version ? '✅' : '⚠️'} ${v} — ${n} joueur(s)`);

      if (sansVersion.j30)  lignes.push(`❔ pas encore estampillée — ${sansVersion.j30} joueur(s) actif(s) ce mois-ci`);
      if (sansVersion.j60)  lignes.push(`❔ pas encore estampillée — ${sansVersion.j60} joueur(s) vu(s) il y a 1 à 2 mois`);
      if (sansVersion.plus) lignes.push(`💤 ${sansVersion.plus} compte(s) inactif(s) depuis plus de 2 mois`);
      lignes.push(`Total : ${joueurs.length} compte(s)`);

      const connues = Object.values(par).reduce((a, n) => a + n, 0);
      if (!connues) {
        lignes.push("La version s'inscrit à la première ouverture de l'app : ce tableau se remplira tout seul.");
        lignes.push("Un compte qui ne revient jamais gardera une version inconnue — et c'est sans risque : il n'écrit rien.");
      }

      return {
        titre: connues ? `${connues} joueur(s) sur ${joueurs.length} ont une version connue` : 'Aucune version estampillée pour le moment',
        lignes,
      };
    },
  },
  {
    id: 'bugs',
    mots: ['bug', 'crash', 'plante', 'erreur', 'probleme'],
    exemple: 'les derniers crashs',
    async repondre() {
      const rows = await q('app_health', 'kind, detail, app_version, created_at, user_name');
      const crashs = rows
        .filter(r => r.kind === 'crash')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);
      if (!crashs.length) return { titre: 'Aucun crash rapporté', lignes: ['Rien n\'est remonté depuis que la sentinelle écoute.'] };
      return {
        titre: `${crashs.length} crash(s) rapporté(s)`,
        lignes: crashs.map(c => `${new Date(c.created_at).toLocaleString('fr-FR')} · ${c.app_version || '?'} — ${c.detail || 'sans message'}`),
      };
    },
  },
  {
    id: 'promo',
    mots: ['promo', 'code promo', 'codes'],
    exemple: 'les codes promo',
    async repondre() {
      const rows = await q('promo_codes', '*');
      if (!rows.length) return {
        titre: 'Aucun code créé depuis la console',
        lignes: ['Les codes écrits en dur dans l\'app restent actifs, ils ne sont simplement pas listés ici.'],
      };
      return {
        titre: `${rows.length} code(s) créé(s) depuis la console`,
        lignes: rows.map(c => `${c.code} — ${c.label || 'sans libellé'}${c.actif === false ? ' (désactivé)' : ''}`),
      };
    },
  },
];

/* ── LA RÉPONSE ───────────────────────────────────────
   Un joueur d'abord (le cas le plus fréquent : « on me demande le code
   de X »), une question ensuite. */
export async function demander(texte, joueurs) {
  const t = nettoyer(texte);
  if (!t) return null;

  const joueur = chercherJoueur(joueurs, texte);
  if (joueur) return { type: 'joueur', ...ficheJoueur(joueur) };

  for (const question of QUESTIONS) {
    if (question.mots.some(m => t.includes(m))) {
      const rep = await question.repondre(joueurs);
      return { type: 'question', ...rep };
    }
  }

  return {
    type: 'inconnu',
    titre: 'Je ne sais pas répondre à ça',
    lignes: [
      'Je reconnais un pseudo, un code de compte, ou une de ces questions :',
      ...QUESTIONS.map(x => `• ${x.exemple}`),
    ],
  };
}

/* Les exemples, pour les proposer sous le champ.

   `mots` voyage avec : sans lui, l'écran ne pouvait filtrer que sur le
   LIBELLÉ, et taper « triche » ne proposait rien — parce que la question
   s'appelle « qui a un rendement suspect ». On cherche avec les mots
   qu'on a en tête, pas avec la formulation exacte de la réponse. */
export const EXEMPLES = QUESTIONS.map(x => ({ id: x.id, texte: x.exemple, mots: x.mots }));

/* Est-ce que ce texte évoque cette question ? Tolérant dans les deux
   sens : « triche » trouve la question, et « je cherche des tricheurs »
   aussi. */
export function correspondQuestion(exemple, texte) {
  const t = nettoyer(texte);
  if (!t) return false;
  if (nettoyer(exemple.texte).includes(t)) return true;
  return (exemple.mots || []).some(m => m.includes(t) || t.includes(m));
}

import { supabase, isSupabaseEnabled } from './supabase';
import { MARKET_CONFIG } from './market.js';
import { APP_INFO } from './appInfo.js';
import { xpRequired } from '../data/constants.js';
import { isAdminName } from '../utils/admin.js';
import { CODES_CONCERNES_129 } from '../data/accountNotices.js';

/* ════════════════════════════════════════════════════
   sentinelle.js — la vigie qui tourne toute seule
   ────────────────────────────────────────────────────
   POURQUOI ELLE EXISTE

   Deux fois de suite, un problème grave est resté invisible jusqu'à ce
   qu'un humain le remarque : l'exploit du Memory a tenu NEUF SEMAINES
   (découvert parce qu'un joueur l'a signalé), et le 08/09/2026 le cours
   du marché est tombé à 300 sans que rien ne sonne — il a fallu le
   déduire après coup d'un chiffre trop rond.

   `npm run audit` faisait déjà ces contrôles, mais il fallait un PC,
   une ligne de commande et quelqu'un pour la taper. La sentinelle fait
   le même travail SANS personne : chaque client qui ouvre l'app peut
   lancer une ronde, et le premier qui arrive après l'intervalle la
   lance pour tout le monde.

   ─── LES DEUX MOITIÉS ───────────────────────────────

   1. LA COLLECTE (continue, passive)
      Chaque client dépose ce qu'il sait dans `app_health` :
        · à l'ouverture   → sa VERSION (c'est ce qui manquait le 08/09 :
                            on aurait vu « 3 joueurs encore en 1.27 »)
        · à un crash React → le message, via window.cookiOnError que
                            l'ErrorBoundary appelle déjà
        · anti-triche      → le signal qui s'est déclenché

   2. LES RONDES (périodiques, actives)
      Contrôles recoupant les chiffres du SERVEUR — les seuls qu'un
      client ne peut pas maquiller : rendements impossibles, cohérence
      du marché, concentration du classement, versions en circulation,
      crashs, signaux de triche. Verdicts écrits dans
      `sentinelle_rapports` : ok / voir / alerte.

   ─── CE QU'ELLE NE FAIT PAS ─────────────────────────
   Elle ne corrige rien, jamais. Elle constate et elle range. Décider
   d'une sanction ou d'un correctif reste un geste humain — c'est
   exactement la leçon de la 1.29, où une correction automatique aurait
   été réécrasée par le client du joueur dans les cinq secondes.

   Elle ne remplace pas non plus une preuve : un client malveillant peut
   mentir sur SON rapport (`app_health`). Les rondes, elles, lisent les
   tables de jeu — c'est ce qui fait foi.

   ⚠️ Nécessite MIGRATION_SENTINELLE.sql. Sans les tables, tout
   no-ope en silence : l'app ne doit jamais casser parce que la vigie
   est absente.
═══════════════════════════════════════════════════════ */

/* Intervalle entre deux rondes. 60 min : assez pour ne pas marteler la
   base avec 20 clients ouverts, assez court pour qu'une anomalie ne
   passe pas la nuit. */
const INTERVALLE_RONDE_MS = 60 * 60 * 1000;

/* Seuils repris de scripts/audit.mjs — même barème pour que la vigie et
   la ligne de commande ne se contredisent jamais.

   RENDEMENT_ELEVE relevé de 150 à 200 le 08/09/2026 (demande Régis) :
   le seuil ne tenait compte que du grind régulier, alors que la ROUE
   (jusqu'à +200 d'un coup) et le JACKPOT de la machine à sous (jusqu'à
   +500) font légitimement bondir le ratio d'un joueur chanceux. À 150,
   la vigie signalait des joueurs honnêtes qui avaient simplement eu de
   la chance — et une alerte qui se trompe est une alerte qu'on cesse de
   lire.

   Le plafond de l'IMPOSSIBLE ne bouge pas : Café Express, le meilleur
   rendement régulier de l'app, plafonne à ~300 cookies pour 60-180 s.
   Au-delà de 400/min tenus dans la durée, aucune chance ne l'explique. */
const RENDEMENT_IMPOSSIBLE = 400;
const RENDEMENT_ELEVE      = 200;
const PART_HEBDO_MAX       = 0.40;   // un joueur au-delà de 40 % du total de la semaine
const JOURS_ACTIF          = 14;
const TEMPS_JEU_MIN_S      = 600;    // sous 10 min jouées, le ratio ne veut rien dire

const num = (v) => Number(v) || 0;
const jours = (iso) => iso ? (Date.now() - new Date(iso).getTime()) / 86_400_000 : 999;

/* ── Détection de plateforme ──────────────────────────
   Sert à distinguer « PWA installée » (qui garde son code en cache
   plus longtemps, donc plus susceptible d'être en retard de version)
   d'un simple onglet navigateur. */
function plateforme() {
  try {
    const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches
      || window.navigator?.standalone === true;
    const ua = navigator.userAgent || '';
    const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : 'Bureau';
    return `${os} · ${standalone ? 'PWA' : 'navigateur'}`;
  } catch {
    return 'inconnu';
  }
}

/* ════════════════════════════════════════════════════
   1. LA COLLECTE
═══════════════════════════════════════════════════════ */

/* Un seul rapport d'ouverture par session : sans ce garde-fou, un
   rechargement en boucle inonderait la table. */
let ouvertureEnvoyee = false;

/* L'identité du joueur courant, retenue au premier rapport. Évite de
   faire traverser userCode et userName à toute la chaîne de props pour
   qu'un mini-jeu enfoui puisse signaler un incident : le seul appelant
   qui la connaît la donne une fois, tout le monde en profite. */
let identite = { userCode: null, userName: null };

async function rapporter(kind, { userCode, userName, detail } = {}) {
  if (!isSupabaseEnabled()) return;
  try {
    await supabase.from('app_health').insert({
      kind,
      user_code:   userCode || null,
      user_name:   userName || null,
      app_version: APP_INFO.version,
      plateforme:  plateforme(),
      detail:      detail ? String(detail).slice(0, 500) : null,
    });
  } catch {
    /* Table absente ou réseau coupé : la vigie se tait, l'app continue. */
  }
}

/* À appeler une fois par session, au démarrage. C'est CE rapport qui
   donne la répartition des versions — le chiffre qui aurait identifié
   la panne du 08/09 en dix secondes au lieu d'une enquête. */
export function signalerOuverture(userCode, userName) {
  identite = { userCode, userName };
  if (ouvertureEnvoyee) return;
  ouvertureEnvoyee = true;
  rapporter('ouverture', { userCode, userName });
}

export function signalerCrash(message, ou) {
  rapporter('crash', { ...identite, detail: `${ou ? ou + ' — ' : ''}${message}` });
}

export function signalerTriche(motif) {
  rapporter('triche', { ...identite, detail: motif });
}

/* Branche l'ErrorBoundary sur la sentinelle. Le point d'accroche
   window.cookiOnError existait déjà, prévu « pour une télémétrie
   future » — la voici. */
export function brancherRapportDeCrash() {
  if (typeof window === 'undefined') return;
  window.cookiOnError = (error, errorInfo) => {
    const ligne = String(errorInfo?.componentStack || '').trim().split('\n')[0] || '';
    signalerCrash(error?.message || String(error), ligne.slice(0, 120));
  };
}

/* ════════════════════════════════════════════════════
   2. LES RONDES
═══════════════════════════════════════════════════════ */

function faire(verdict, categorie, titre, detail = []) {
  return { verdict, categorie, titre, detail: detail.filter(Boolean).slice(0, 25) };
}

/* ── Rendement : cookies gagnés par minute de jeu ───── */
function controleRendement(users) {
  const suspects = users
    .filter(u => !isAdminName(u.user_name)
              && num(u.total_play_time) >= TEMPS_JEU_MIN_S
              && jours(u.last_active) <= JOURS_ACTIF)
    .map(u => ({ u, r: Math.round(num(u.total_earned) / (num(u.total_play_time) / 60)) }))
    .filter(x => x.r > RENDEMENT_ELEVE)
    .sort((a, b) => b.r - a.r);

  const graves = suspects.filter(x => x.r > RENDEMENT_IMPOSSIBLE);
  const detail = suspects.map(x =>
    `${x.r > RENDEMENT_IMPOSSIBLE ? '!! ' : '   '}${x.u.user_name} — ${x.r} cookies/min · ${Math.round(num(x.u.total_play_time) / 60)} min jouées · niv ${x.u.level}`);

  if (graves.length) return faire('alerte', 'triche', `${graves.length} compte(s) au rendement IMPOSSIBLE (plus de ${RENDEMENT_IMPOSSIBLE} cookies/min)`, detail);
  if (suspects.length) return faire('voir', 'triche', `${suspects.length} compte(s) au rendement élevé (${RENDEMENT_ELEVE} à ${RENDEMENT_IMPOSSIBLE} cookies/min)`, detail);
  return faire('ok', 'triche', 'Aucun rendement anormal chez les joueurs actifs');
}

/* ── Concentration du classement hebdomadaire ─────────
   ⚠️ Corrigé le 08/09/2026, dès la PREMIÈRE ronde : le seuil de 40 %
   venait de scripts/audit.mjs, calibré pour une communauté nombreuse.
   Avec sept joueurs actifs, celui qui joue le plus prend naturellement
   la moitié de la semaine — la vigie criait donc à l'alerte sur un
   comportement parfaitement normal (« aaronxbox — 61 % »).

   Une alerte qui se déclenche tous les jours n'est plus une alerte :
   on apprend à l'ignorer, et le jour où elle a raison, personne ne la
   lit. Donc la domination seule ne vaut plus qu'un « à voir ». Elle ne
   devient une ALERTE que si le joueur dominant affiche EN PLUS un
   rendement suspect — dominer la semaine en jouant beaucoup est
   normal, la dominer en gagnant trop vite ne l'est pas. */
function controleConcentration(users) {
  const semaine = users.map(u => u.weekly_week_id).filter(Boolean).sort().pop();
  if (!semaine) return faire('ok', 'classement', 'Aucun gain hebdomadaire enregistré');

  const liste = users.filter(u => u.weekly_week_id === semaine && !isAdminName(u.user_name) && num(u.weekly_earned) > 0);
  const total = liste.reduce((a, u) => a + num(u.weekly_earned), 0);
  if (!total) return faire('ok', 'classement', 'Semaine en cours encore vide');

  const rendement = (u) => num(u.total_play_time) >= TEMPS_JEU_MIN_S
    ? Math.round(num(u.total_earned) / (num(u.total_play_time) / 60))
    : 0;

  const gros = liste.filter(u => num(u.weekly_earned) / total > PART_HEBDO_MAX);
  const grosDouteux = gros.filter(u => rendement(u) > RENDEMENT_ELEVE);

  const detail = liste
    .sort((a, b) => num(b.weekly_earned) - num(a.weekly_earned))
    .slice(0, 5)
    .map(u => {
      const r = rendement(u);
      return `${u.user_name} — ${Math.round(num(u.weekly_earned) / total * 100)} % de la semaine${r ? ` · ${r} 🍪/min` : ''}`;
    });

  if (grosDouteux.length) {
    return faire('alerte', 'classement', `${grosDouteux.length} joueur(s) domine(nt) la semaine AVEC un rendement suspect`, [
      ...detail,
      `Dominer en jouant beaucoup est normal ; au-delà de ${RENDEMENT_ELEVE} 🍪/min, c'est le rendement qui pose question.`,
    ]);
  }
  if (gros.length) {
    return faire('voir', 'classement', `${gros.length} joueur(s) pèse(nt) plus de ${Math.round(PART_HEBDO_MAX * 100)} % de la semaine`, [
      ...detail,
      `Avec ${liste.length} joueur(s) actif(s), c'est attendu : le plus assidu prend une grosse part.`,
    ]);
  }
  return faire('ok', 'classement', `Semaine équilibrée — ${liste.length} joueur(s), ${total} 🍪`, detail);
}

/* ── Niveau incohérent avec les gains affichés ────────
   LE contrôle qui a démasqué l'exploit de septembre, et il manquait
   ici. Le cap anti-écart d'addCoins fige le total_earned du leader
   pendant que son niveau continue de monter : un tricheur en tête du
   classement passe donc inaperçu si on ne regarde que le total. Un
   compte dont le niveau réclame bien plus de gains qu'il n'en affiche
   a été soit plafonné (légitime), soit gonflé (pas légitime).

   La courbe d'XP est IMPORTÉE de data/constants.js, jamais recopiée :
   une copie finit toujours par diverger de la vraie règle du jeu. */
function gainsPourNiveau(L) {
  let total = 0;
  /* Le malus d'XP de −20 % à partir du niveau 10 (cf. addCoins) veut
     dire qu'il faut gagner PLUS de cookies pour la même XP. */
  for (let l = 1; l < L; l++) total += l >= 10 ? xpRequired(l) / 0.8 : xpRequired(l);
  return Math.round(total);
}

function controleCoherenceNiveau(users) {
  const ecarts = users
    .filter(u => !isAdminName(u.user_name) && num(u.level) >= 10 && !num(u.prestige_level))
    .map(u => ({ u, requis: gainsPourNiveau(num(u.level)), affiche: num(u.total_earned) }))
    .filter(x => x.requis > 0 && x.affiche < x.requis * 0.75)
    .sort((a, b) => (a.affiche / a.requis) - (b.affiche / b.requis));

  if (!ecarts.length) return faire('ok', 'triche', 'Niveaux cohérents avec les gains affichés');
  return faire('voir', 'triche', `${ecarts.length} compte(s) dont le niveau n'est pas justifié par le total`,
    ecarts.map(x => `${x.u.user_name} — niveau ${x.u.level} réclame ~${x.requis} 🍪, en affiche ${x.affiche}`)
      .concat(['Deux explications possibles : le cap anti-écart du leader, ou un total gonflé puis corrigé.']));
}

/* ── Soldes impossibles ───────────────────────────────
   Un joueur ne peut pas détenir plus de cookies qu'il n'en a jamais
   gagné : le solde est un sous-ensemble du cumul. Quand ce n'est plus
   vrai, des cookies sont apparus sans passer par le jeu. Contrôle
   volontairement bête et sans faux positif possible. */
function controleSoldes(users) {
  const impossibles = users
    .filter(u => !isAdminName(u.user_name))
    .filter(u => num(u.cookies) > num(u.total_earned) + 100 || num(u.cookies) < 0 || num(u.cafes) < 0)
    .sort((a, b) => num(b.cookies) - num(a.cookies));

  if (!impossibles.length) return faire('ok', 'triche', 'Aucun solde impossible');
  return faire('alerte', 'triche', `${impossibles.length} compte(s) au solde impossible`,
    impossibles.map(u => `${u.user_name} — ${num(u.cookies)} 🍪 en poche pour ${num(u.total_earned)} 🍪 gagnés au total`));
}

/* ── Marché : bornes, cohérence, immobilité ──────────
   Les bornes sont lues dans MARKET_CONFIG, jamais recopiées : le jour
   où l'échelle des prix rechange, la vigie suit toute seule au lieu de
   hurler à tort (c'est exactement le piège dans lequel scripts/audit.mjs
   était tombé, resté sur 10-300 après le passage à 500). */
function controleMarche(state, portefeuilles, users) {
  const rapports = [];
  if (!state) return [faire('alerte', 'marché', 'Aucun état de marché en base (market_state vide)')];

  const prix = num(state.current_price);
  const { PRICE_MIN, PRICE_MAX } = MARKET_CONFIG;
  if (prix < PRICE_MIN || prix > PRICE_MAX) {
    rapports.push(faire('alerte', 'marché', `Cours hors bornes — ${prix.toFixed(1)} (attendu entre ${PRICE_MIN} et ${PRICE_MAX})`, [
      'Un client resté sur une ancienne version peut écrire le prix.',
      'Vérifier que PROTEGER_LE_PRIX.sql est bien passé.',
    ]));
  } else {
    rapports.push(faire('ok', 'marché', `Cours à ${prix.toFixed(0)} 🍪, dans les bornes`));
  }

  const circulation = num(state.shares_in_circulation);
  const detenu = portefeuilles.reduce((a, p) => a + num(p.shares), 0);
  if (Math.abs(circulation - detenu) > 0) {
    rapports.push(faire('alerte', 'marché', `Incohérence : ${detenu} actions détenues, l'état en annonce ${circulation}`, [
      'Un écart signifie qu\'une écriture a été perdue ou doublée.',
    ]));
  } else {
    rapports.push(faire('ok', 'marché', `Portefeuilles et état cohérents (${detenu} actions détenues)`));
  }

  /* Portefeuille sans joueur : il reste dans la circulation et fausse
     les comptes, alors que plus personne ne peut vendre ces actions.
     Cas vu le 08/09 — un compte supprimé a laissé une action derrière. */
  const codes = new Set(users.map(u => u.user_code));
  const orphelins = portefeuilles.filter(p => num(p.shares) > 0 && !codes.has(p.user_code));
  if (orphelins.length) {
    rapports.push(faire('voir', 'marché', `${orphelins.length} portefeuille(s) sans joueur`,
      orphelins.map(p => `${p.user_code} — ${num(p.shares)} action(s) que plus personne ne peut vendre`)
        .concat(["Retirer la ligne ET décrémenter shares_in_circulation du même nombre, sinon l'écart apparaîtra au contrôle suivant."])));
  }

  const negatifs = portefeuilles.filter(p => num(p.shares) < 0 || num(p.total_invested) < 0);
  if (negatifs.length) {
    rapports.push(faire('alerte', 'marché', `${negatifs.length} portefeuille(s) à solde négatif`, negatifs.map(p => p.user_code)));
  }

  if (circulation > num(state.total_shares_supply)) {
    rapports.push(faire('alerte', 'marché', `${circulation} actions en circulation pour un flottant de ${num(state.total_shares_supply)}`));
  }

  return rapports;
}

/* ── Versions en circulation ─────────────────────────
   LE contrôle né de la panne du 08/09. Une version ancienne encore
   active n'est pas un détail cosmétique : son code continue d'écrire
   dans les mêmes tables que le nôtre, avec ses anciennes règles.

   ⚠️ LE DÉCOMPTE COUVRE TOUS LES COMPTES, pas seulement ceux qui se
   sont manifestés. Un joueur qu'on n'a jamais vu depuis l'installation
   de la vigie apparaît en « jamais vue » — et c'est la ligne la plus
   importante du lot, parce que c'est là que se cachent les clients
   périmés. Ne compter que ceux qui se signalent donnerait un joli
   « tout le monde est à jour » parfaitement faux. */
export function controleVersions(users, versions) {
  const total = users.length;
  if (!total) return faire('voir', 'versions', 'Aucun compte en base');

  const actifs = users.filter(u => jours(u.last_active) <= 60);
  const parVersion = {};
  const perimesCertains = [];
  const inconnus = [];

  for (const u of actifs) {
    const info = versions.get(u.user_code);
    if (info) {
      const cle = info.minimum ? `${info.version} ou plus` : info.version;
      (parVersion[cle] = parVersion[cle] || []).push(u.user_name);
      continue;
    }
    /* Concerné par un message de la 1.29 et jamais appliqué : preuve
       qu'il n'a jamais lancé la 1.29. */
    if (CODES_CONCERNES_129.includes(u.user_code)) perimesCertains.push(u.user_name);
    else inconnus.push(u.user_name);
  }

  const lignes = Object.entries(parVersion)
    .sort((a, b) => rangVersion(b[0]) - rangVersion(a[0]))
    .map(([v, noms]) => `${v.startsWith(APP_INFO.version) ? '✅' : '⚠️'} ${v} — ${noms.length} : ${noms.slice(0, 6).join(', ')}`);

  if (perimesCertains.length) {
    lignes.push(`⛔ jamais lancé la 1.29 — ${perimesCertains.length} : ${perimesCertains.join(', ')}`);
  }
  if (inconnus.length) {
    lignes.push(`❔ aucune trace — ${inconnus.length} : ${inconnus.join(', ')}`);
  }
  lignes.push(`${actifs.length} joueur(s) vus depuis 2 mois · ${total} comptes en base`);

  /* Un client dont on sait qu'il n'a jamais lancé la 1.29 est le cas du
     08/09 : il écrit dans les mêmes tables avec les règles de juillet. */
  if (perimesCertains.length) {
    return faire('alerte', 'versions', `${perimesCertains.length} joueur(s) actif(s) sur un client d'avant la 1.29`, [
      ...lignes,
      "Preuve : ces comptes devaient recevoir un message en lançant la 1.29, et ne l'ont jamais appliqué.",
      "Remède : forcer la mise à jour (onglet Agir → L'application).",
    ]);
  }

  const aJour = (parVersion[APP_INFO.version] || []).length;
  if (inconnus.length) {
    return faire('voir', 'versions', `${aJour} joueur(s) à jour, ${inconnus.length} sans trace`, lignes);
  }
  return faire('ok', 'versions', `Les ${actifs.length} joueurs actifs ont une version connue`, lignes);
}

/* ── Crashs et signaux de triche remontés par les clients ── */
function controleIncidents(sante) {
  const rapports = [];

  const crashs = sante.filter(h => h.kind === 'crash' && jours(h.created_at) <= 2);
  if (crashs.length) {
    const parMessage = {};
    for (const c of crashs) parMessage[c.detail || 'sans message'] = (parMessage[c.detail || 'sans message'] || 0) + 1;
    const detail = Object.entries(parMessage)
      .sort((a, b) => b[1] - a[1])
      .map(([m, n]) => `${n}× — ${m}`);
    rapports.push(faire(crashs.length >= 3 ? 'alerte' : 'voir', 'bugs', `${crashs.length} crash(s) rapporté(s) en 48 h`, detail));
  } else {
    rapports.push(faire('ok', 'bugs', 'Aucun crash rapporté depuis 48 h'));
  }

  const triches = sante.filter(h => h.kind === 'triche' && jours(h.created_at) <= 7);
  if (triches.length) {
    const detail = triches.slice(0, 10).map(t => `${t.user_name || t.user_code || '?'} — ${t.detail || 'signal'}`);
    rapports.push(faire('voir', 'triche', `${triches.length} signal(aux) anti-triche en 7 jours`, detail));
  }

  return rapports;
}

/* ════════════════════════════════════════════════════
   LA RONDE
═══════════════════════════════════════════════════════ */

/* Exécute tous les contrôles et renvoie la liste des verdicts.
   `enregistrer` = false permet à l'écran admin de relancer une ronde
   pour REGARDER sans polluer l'historique. */
export async function faireUneRonde({ enregistrer = true } = {}) {
  if (!isSupabaseEnabled()) return [];

  const [users, state, portefeuilles, sante, versions] = await Promise.all([
    supabase.from('users').select('user_name, user_code, level, total_earned, weekly_earned, weekly_week_id, total_play_time, last_active, prestige_level, cookies, cafes').limit(2000).then(r => r.data || []),
    supabase.from('market_state').select('*').eq('id', 1).maybeSingle().then(r => r.data),
    supabase.from('market_portfolio').select('user_code, shares, total_invested').limit(2000).then(r => r.data || []),
    supabase.from('app_health').select('kind, user_code, user_name, app_version, detail, created_at, id').order('created_at', { ascending: false }).limit(500).then(r => r.data || []),
    versionsParJoueur(),
  ]);

  const rapports = [
    controleRendement(users),
    controleCoherenceNiveau(users),
    controleSoldes(users),
    controleConcentration(users),
    ...controleMarche(state, portefeuilles, users),
    controleVersions(users, versions),
    ...controleIncidents(sante),
  ];

  if (enregistrer) {
    try {
      await supabase.from('sentinelle_rapports').insert(
        rapports.map(r => ({ verdict: r.verdict, categorie: r.categorie, titre: r.titre, detail: r.detail }))
      );
    } catch { /* tables absentes : on rend quand même les verdicts à l'écran */ }
  }

  return rapports;
}

/* Enregistre une ronde SEULEMENT si elle raconte autre chose que la
   précédente.

   Sans ça, deux mauvais choix s'offraient : tout enregistrer et noyer
   l'historique sous des copies identiques, ou ne rien enregistrer — ce
   qu'on faisait — et laisser l'écran ressortir les vieux problèmes déjà
   réglés dès qu'on le rouvrait. Comparer avant d'écrire règle les deux :
   l'historique ne garde que les CHANGEMENTS, et l'état enregistré colle
   toujours à la réalité.

   Retourne true si quelque chose a été écrit. */
export async function enregistrerSiDifferent(rapports) {
  if (!isSupabaseEnabled() || !rapports?.length) return false;
  try {
    const empreinte = (liste) => liste
      .filter(r => r.verdict !== 'ok')
      .map(r => `${r.categorie}|${r.verdict}|${r.titre}`)
      .sort()
      .join('||');

    const precedents = await derniersRapports(60);
    const rondes = grouperParRonde(precedents);
    if (rondes.length && empreinte(rondes[0].verdicts) === empreinte(rapports)) return false;

    await supabase.from('sentinelle_rapports').insert(
      rapports.map(r => ({ verdict: r.verdict, categorie: r.categorie, titre: r.titre, detail: r.detail }))
    );
    return true;
  } catch {
    return false;
  }
}

/* Lance une ronde SI l'intervalle est écoulé. Appelée par n'importe
   quel client au démarrage : le premier arrivé pose l'heure et fait le
   travail, les autres repartent aussitôt.

   L'heure est posée AVANT la ronde, jamais après : deux clients qui
   démarrent dans la même seconde verraient sinon tous les deux une
   horloge périmée et feraient le travail en double. */
export async function rondeSiNecessaire() {
  if (!isSupabaseEnabled()) return null;
  try {
    const { data: etat } = await supabase
      .from('sentinelle_etat').select('derniere_ronde').eq('id', 1).maybeSingle();
    if (!etat) return null;

    const derniere = etat.derniere_ronde ? new Date(etat.derniere_ronde).getTime() : 0;
    if (Date.now() - derniere < INTERVALLE_RONDE_MS) return null;

    await supabase.from('sentinelle_etat')
      .update({ derniere_ronde: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', 1);

    return await faireUneRonde({ enregistrer: true });
  } catch {
    return null;
  }
}

/* Derniers verdicts enregistrés — ce que l'écran Sentinelle affiche
   sans rien recalculer. */
export async function derniersRapports(limite = 40) {
  if (!isSupabaseEnabled()) return [];
  try {
    const { data } = await supabase
      .from('sentinelle_rapports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite);
    return data || [];
  } catch {
    return [];
  }
}

/* Combien d'alertes à la dernière ronde ? Sert à poser une pastille
   sur l'icône des réglages : une vigie qu'il faut penser à consulter
   ne sert qu'aux jours où on y pense. */
export async function alertesEnCours() {
  const rapports = await derniersRapports(20);
  if (!rapports.length) return 0;
  const derniereRonde = rapports[0].created_at;
  return rapports.filter(r => r.created_at === derniereRonde && r.verdict === 'alerte').length;
}

/* Regroupe l'historique par ronde, de la plus récente à la plus
   ancienne. Une ronde = tous les verdicts partageant le même instant. */
export function grouperParRonde(rapports) {
  const rondes = [];
  for (const r of rapports) {
    const derniere = rondes[rondes.length - 1];
    if (derniere && derniere.instant === r.created_at) derniere.verdicts.push(r);
    else rondes.push({ instant: r.created_at, verdicts: [r] });
  }
  return rondes;
}

/* Depuis combien de rondes ce verdict dure-t-il ?

   C'est l'information qui manque le plus à la lecture : une alerte
   APPARUE à l'instant et une alerte présente depuis trois jours ne
   demandent pas la même chose. La première dit qu'il vient de se
   passer quelque chose ; la seconde, qu'on a décidé de vivre avec (ou
   qu'on l'ignore, ce qui est pire).

   On compare par catégorie ET par verdict, pas par titre : les titres
   contiennent des compteurs qui bougent d'une ronde à l'autre. */
export function anciennete(rondes, verdict) {
  if (!rondes.length) return { rondes: 1, depuis: null };
  let compte = 0;
  let depuis = rondes[0].instant;
  for (const ronde of rondes) {
    const meme = ronde.verdicts.find(v => v.categorie === verdict.categorie && v.verdict === verdict.verdict);
    if (!meme) break;
    compte++;
    depuis = ronde.instant;
  }
  return { rondes: Math.max(compte, 1), depuis };
}

/* ════════════════════════════════════════════════════
   3. AGIR
   ────────────────────────────────────────────────────
   Tout passe par une seule fonction Postgres, `action_sentinelle`,
   qui vérifie la phrase de passe avant d'exécuter quoi que ce soit
   (cf. SENTINELLE_ACTIONS.sql).

   La phrase ne transite QUE dans cet appel. Elle n'est jamais gardée
   en localStorage, jamais dans un state persistant, jamais écrite dans
   un journal côté client : la retenir quelque part reviendrait à la
   remettre dans le téléphone, c'est-à-dire à l'endroit exact qu'on
   voulait éviter.
═══════════════════════════════════════════════════════ */

export async function agir(phrase, action, params = {}) {
  if (!isSupabaseEnabled()) return { ok: false, message: 'Hors ligne' };
  if (!phrase) return { ok: false, message: 'Phrase de passe requise' };
  try {
    const { data, error } = await supabase.rpc('action_sentinelle', { phrase, action, params });
    if (error) {
      /* Fonction absente = SENTINELLE_ACTIONS.sql pas encore passé. On
         le dit clairement plutôt que de laisser un échec muet. */
      const manquante = /function|does not exist|schema cache/i.test(error.message || '');
      return { ok: false, message: manquante
        ? "La console n'est pas installée en base (SENTINELLE_ACTIONS.sql)."
        : `Erreur : ${error.message}` };
    }
    return data || { ok: false, message: 'Réponse vide' };
  } catch (e) {
    return { ok: false, message: `Erreur réseau : ${e?.message || e}` };
  }
}

/* Vérifie la phrase SANS rien exécuter. C'est ce qui permet une vraie
   serrure à l'écran : on tape, on appuie, la base répond — au lieu de
   faire semblant de s'ouvrir dès la première lettre.

   Le repli sur « action inconnue » couvre le cas où la fonction en base
   date d'avant l'ajout de `verifier` : elle contrôle la phrase AVANT de
   regarder le nom de l'action, donc ce message-là prouve justement que
   la phrase est bonne. Ça évite d'imposer un nouveau collage de SQL
   pour pouvoir se connecter. */
export async function verifierPhrase(phrase) {
  const r = await agir(phrase, 'verifier', {});
  if (r?.ok) return { ok: true };
  if (/action inconnue/i.test(r?.message || '')) return { ok: true };
  return { ok: false, message: r?.message || 'Phrase incorrecte' };
}

/* ── Ce qu'un patch prouve ────────────────────────────
   Chaque patch n'existe qu'à partir d'une version donnée. L'avoir
   appliqué PROUVE qu'on a fait tourner au moins celle-là — une preuve
   rétroactive, disponible pour des comptes qui n'ont jamais rien
   rapporté à la vigie.

   ⚠️ Et l'ABSENCE d'un patch ne prouve rien... sauf pour un compte qui
   était CONCERNÉ par lui. Les messages de la 1.29 ne visaient que 18
   comptes : un joueur hors liste n'avait rien à appliquer, son silence
   est normal. Un joueur de la liste, actif, qui ne l'a pas appliqué n'a
   jamais exécuté la 1.29 — c'est un client périmé, certain. */
const VERSION_DU_PATCH = {
  'noticeV130_split500':     '1.30.0',
  'noticeV130_sanction':     '1.29.0',
  'noticeV130_reward':       '1.29.0',
  'marketRebalance10pct_v1': '1.20',
  'marketRefund_2026_05_10': '1.15',
};

/* Compare deux numéros de version : 1.9 doit passer AVANT 1.30. */
function rangVersion(v) {
  return String(v || '0').split('.').slice(0, 3)
    .map(n => String(parseInt(n, 10) || 0).padStart(3, '0')).join('');
}

/* ── Qui tourne sur quelle version ────────────────────
   Rend une Map user_code → { version, vueLe } en ne gardant que le
   DERNIER rapport d'ouverture de chaque joueur. Un joueur qui a mis à
   jour hier ne doit pas rester compté sur son ancienne version à cause
   d'un rapport plus vieux.

   Utilisée à deux endroits : le contrôle des versions (pour couvrir
   TOUS les comptes, y compris ceux qu'on n'a jamais vus) et la fiche
   d'un joueur dans la recherche. */
export async function versionsParJoueur() {
  const carte = new Map();
  if (!isSupabaseEnabled()) return carte;

  /* SOURCE PRINCIPALE : la colonne users.app_version, estampillée à
     chaque synchronisation. Elle couvre TOUT joueur qui ouvre l'app,
     pas seulement ceux qui ont rapporté une ouverture à la vigie. */
  try {
    const { data } = await supabase
      .from('users')
      .select('user_code, app_version, last_active')
      .limit(2000);
    for (const u of data || []) {
      if (!u.user_code || !u.app_version) continue;
      carte.set(u.user_code, { version: u.app_version, vueLe: u.last_active, source: 'sync' });
    }
  } catch { /* colonne pas encore créée : on se rabat sur app_health */ }

  /* TROISIÈME SOURCE : les patchs appliqués. Rétroactive, elle couvre
     des comptes qui n'ont jamais rien rapporté — mais elle ne donne
     qu'un MINIMUM (« au moins la 1.29 »), pas la version exacte. */
  try {
    const { data } = await supabase
      .from('applied_patches')
      .select('user_code, patch_key, applied_at')
      .limit(5000);
    for (const r of data || []) {
      const v = VERSION_DU_PATCH[r.patch_key];
      if (!v || !r.user_code) continue;
      const deja = carte.get(r.user_code);
      if (deja && (deja.source !== 'patch' || rangVersion(deja.version) >= rangVersion(v))) continue;
      carte.set(r.user_code, { version: v, vueLe: r.applied_at, source: 'patch', minimum: true });
    }
  } catch { /* table absente : on se passe de cette source */ }

  /* SOURCE DE SECOURS : les rapports d'ouverture. Utile tant que la
     colonne n'existe pas, et pour les joueurs qui ont rapporté une
     ouverture sans avoir resynchronisé leur profil depuis. */
  try {
    const { data } = await supabase
      .from('app_health')
      .select('user_code, app_version, created_at')
      .eq('kind', 'ouverture')
      .order('created_at', { ascending: false })
      .limit(3000);
    for (const r of data || []) {
      if (!r.user_code || carte.has(r.user_code)) continue;   /* le premier vu est le plus récent */
      carte.set(r.user_code, { version: r.app_version || 'inconnue', vueLe: r.created_at, source: 'rapport' });
    }
  } catch { /* table absente : tant pis, on fait avec ce qu'on a */ }

  return carte;
}

/* ── Ce que la base sait déjà ─────────────────────────
   Remplir « niveau, cumul, cookies, cafés » à la main quand la base
   connaît ces valeurs par coeur, c'est du travail qu'on impose à
   l'humain pour rien — et une occasion de se tromper d'un chiffre sur
   un compte réel. Ces deux lectures servent à pré-remplir les
   formulaires avec la situation ACTUELLE : on ne tape plus que ce
   qu'on veut CHANGER. */
export async function infosJoueur(userCode) {
  if (!isSupabaseEnabled() || !userCode) return null;
  try {
    const { data } = await supabase
      .from('users')
      .select('user_name, user_code, level, total_earned, cookies, cafes, total_play_time, last_active')
      .eq('user_code', userCode.trim().toUpperCase())
      .maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}

export async function prixMarche() {
  if (!isSupabaseEnabled()) return null;
  try {
    const { data } = await supabase
      .from('market_state').select('current_price').eq('id', 1).maybeSingle();
    return data ? Math.round(Number(data.current_price)) : null;
  } catch {
    return null;
  }
}

/* ── Constats classés sans suite ──────────────────────
   La signature contient le titre : dès qu'un chiffre bouge dedans, le
   constat réapparaît. On classe une SITUATION, pas une catégorie — sans
   ça on finirait par se rendre aveugle à toute une famille de
   problèmes, ce qui est pire que de ne pas surveiller du tout. */
export function signatureConstat(r) {
  return `${r.categorie}|${r.verdict}|${r.titre}`;
}

export async function listerIgnores() {
  if (!isSupabaseEnabled()) return [];
  try {
    const { data } = await supabase
      .from('sentinelle_ignores')
      .select('*')
      .order('cree_le', { ascending: false });
    return data || [];
  } catch {
    return [];
  }
}

/* Les codes promo en base — les 24 historiques recopiés par
   CODES_HISTORIQUES_EN_BASE.sql comme ceux créés depuis la console. Lus
   par la modale de saisie. Silencieux si la table n'existe pas : le
   joueur ne doit jamais voir une erreur parce qu'une fonctionnalité
   d'administration n'est pas installée.

   On lit AUSSI les codes désactivés, et c'est volontaire : c'est le
   client qui applique la suppression, et il ne peut le faire que s'il
   voit la ligne morte. Filtrer sur `actif` ici reviendrait à masquer la
   preuve de la suppression, donc à laisser le code écrit dans l'app
   reprendre la main — exactement ce qu'on veut empêcher. Le tri se fait
   dans lookupPromoCode. */
export async function codesPromoEnBase() {
  if (!isSupabaseEnabled()) return [];
  try {
    const { data } = await supabase.from('promo_codes').select('*');
    return data || [];
  } catch {
    return [];
  }
}

/* Le registre de ce qui a été fait — refus compris. C'est ce qui rend
   la console vérifiable : on peut toujours savoir qui a fait quoi,
   quand, et si ça a marché. */
export async function journal(limite = 30) {
  if (!isSupabaseEnabled()) return [];
  try {
    const { data } = await supabase
      .from('sentinelle_journal')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite);
    return data || [];
  } catch {
    return [];
  }
}

/* ════════════════════════════════════════════════════
   LA BOÎTE AUX LETTRES
   ────────────────────────────────────────────────────
   Jusqu'ici la Sentinelle ne parlait qu'à son propriétaire. Ces quatre
   fonctions ouvrent le sens inverse : n'importe quel joueur peut lui
   signaler quelque chose, et elle le range.

   Rien ne passe par la table directement — elle est fermée, même en
   lecture. Tout passe par les fonctions security definer de
   SIGNALEMENTS.sql, qui comptent, freinent et vérifient. Un signalement
   est nominatif (celui qui écrit, et souvent celui qu'il accuse) : le
   rendre lisible avec la clé publique reviendrait à publier les
   dénonciations.
═══════════════════════════════════════════════════════ */

/* Message rendu quand la migration n'a pas encore été collée. Dit quoi
   faire, plutôt que de laisser un échec muet. */
function manquePeutEtre(error, quoi) {
  const absente = /function|does not exist|schema cache/i.test(error?.message || '');
  return absente
    ? `La boîte aux lettres n'est pas installée en base (SIGNALEMENTS.sql).`
    : `Erreur ${quoi} : ${error?.message || 'inconnue'}`;
}

/* Envoyer — ouvert à tout le monde. Les freins (une minute entre deux,
   huit par jour, trois cents par heure) vivent en base : les mettre ici
   ne protégerait de rien, le client est réécrivable. */
export async function envoyerSignalement({ userCode, userName, categorie, chemin, message, contexte }) {
  if (!isSupabaseEnabled()) {
    return { ok: false, message: "Pas de connexion : le signalement ne peut pas partir. Réessaie une fois en ligne." };
  }
  try {
    const { data, error } = await supabase.rpc('envoyer_signalement', {
      p_user_code:   userCode   || null,
      p_user_name:   userName   || null,
      p_app_version: APP_INFO.version,
      p_categorie:   categorie,
      p_chemin:      chemin,
      p_message:     message,
      p_contexte:    contexte || {},
    });
    if (error) return { ok: false, message: manquePeutEtre(error, "d'envoi") };
    return data || { ok: false, message: 'Réponse vide' };
  } catch (e) {
    return { ok: false, message: `Erreur : ${e.message}` };
  }
}

/* Le compteur, sans la phrase : un entier, rien d'autre. De quoi
   allumer une pastille sur la bannière sans rien laisser fuiter. */
export async function signalementsOuverts() {
  if (!isSupabaseEnabled()) return 0;
  try {
    const { data, error } = await supabase.rpc('signalements_ouverts');
    if (error) return 0;
    return Number(data) || 0;
  } catch {
    return 0;
  }
}

/* Lire — exige la phrase. `statut` à null renvoie ce qui reste ouvert
   (nouveau + lu), c'est-à-dire ce qu'il reste à traiter. */
export async function listerSignalements(phrase, statut = null, limite = 60) {
  if (!isSupabaseEnabled()) return { ok: false, message: 'Hors ligne', lignes: [] };
  if (!phrase) return { ok: false, message: 'Phrase de passe requise', lignes: [] };
  try {
    const { data, error } = await supabase.rpc('signalements_lister', {
      p_phrase: phrase, p_statut: statut, p_limite: limite,
    });
    if (error) return { ok: false, message: manquePeutEtre(error, 'de lecture'), lignes: [] };
    return { ok: !!data?.ok, message: data?.message, lignes: data?.lignes || [] };
  } catch (e) {
    return { ok: false, message: `Erreur : ${e.message}`, lignes: [] };
  }
}

/* Classer — exige la phrase, et laisse une trace au registre. */
export async function traiterSignalement(phrase, id, statut, note = null) {
  if (!isSupabaseEnabled()) return { ok: false, message: 'Hors ligne' };
  if (!phrase) return { ok: false, message: 'Phrase de passe requise' };
  try {
    const { data, error } = await supabase.rpc('signalements_traiter', {
      p_phrase: phrase, p_id: id, p_statut: statut, p_note: note,
    });
    if (error) return { ok: false, message: manquePeutEtre(error, 'de mise à jour') };
    return data || { ok: false, message: 'Réponse vide' };
  } catch (e) {
    return { ok: false, message: `Erreur : ${e.message}` };
  }
}

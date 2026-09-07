/* ════════════════════════════════════════════════════
   audit.mjs — bilan de santé de CookiMiner en une commande
   ────────────────────────────────────────────────────
       npm run audit

   Né de l'exploit Memory (septembre 2026), resté NEUF SEMAINES en
   production sans que rien ne le signale. Il n'a été découvert que
   parce qu'un joueur l'a dit. Ce script existe pour que la prochaine
   anomalie se voie AVANT qu'on la raconte.

   Lit la base en LECTURE SEULE via la clé anon de .env.local (la même
   que le classement côté client). N'écrit jamais rien, ne supprime
   jamais rien : on peut le lancer les yeux fermés, aussi souvent qu'on
   veut, y compris pendant que des joueurs jouent.

   Chaque contrôle rend un verdict :
     OK      tout va bien
     VOIR    à regarder, pas forcément grave
     ALERTE  anomalie franche, il faut agir

   Pour ajouter un contrôle : une fonction qui pousse dans `verdicts`
   via ok() / voir() / alerte(). Rien d'autre à câbler.
═══════════════════════════════════════════════════════ */

import fs from 'node:fs';

/* ── Connexion ────────────────────────────────────── */
const env  = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const BASE = (env.match(/VITE_SUPABASE_URL=(.*)/) || [])[1]?.trim();
const KEY  = (env.match(/VITE_SUPABASE_ANON_KEY=(.*)/) || [])[1]?.trim();
if (!BASE || !KEY) {
  console.error('.env.local : VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants');
  process.exit(1);
}
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

async function q(path) {
  const r = await fetch(BASE + '/rest/v1/' + path, { headers: H });
  if (!r.ok) throw new Error(path.split('?')[0] + ' → HTTP ' + r.status + ' ' + (await r.text()).slice(0, 120));
  return r.json();
}

/* ── Courbe d'XP — miroir de src/data/constants.js ────
   Dupliquée volontairement : ce script doit tourner sans charger le
   bundle de l'app. Si la courbe bouge là-bas, la corriger ici aussi. */
const SMOOTH = { 6:1100, 7:1500, 8:2000, 9:2700, 10:3600, 11:4800, 12:6500, 13:9000, 14:12000 };
const xpReq = l => l <= 2 ? l * 100 + 50
  : l <= 5  ? Math.round((l * 100 + 50) * 1.5)
  : l === 25 ? 60000
  : SMOOTH[l] ?? Math.round(l * l * 50 * 1.5);
/* Gains cumulés nécessaires pour atteindre le niveau L (malus XP de
   -20 % appliqué à partir du niveau 10, cf. addCoins dans App.jsx). */
const gainsPourNiveau = L => {
  let t = 0;
  for (let l = 1; l < L; l++) t += l >= 10 ? xpReq(l) / 0.8 : xpReq(l);
  return Math.round(t);
};

/* ── Verdicts ─────────────────────────────────────── */
const verdicts = [];
const ok     = (t, d) => verdicts.push({ n: 'OK',     t, d });
const voir   = (t, d) => verdicts.push({ n: 'VOIR',   t, d });
const alerte = (t, d) => verdicts.push({ n: 'ALERTE', t, d });

const ADMINS = ['admin123', 'admin558'];
const num   = v => Number(v) || 0;
const jours = iso => iso ? (Date.now() - new Date(iso).getTime()) / 86400000 : Infinity;
const fmt   = n => num(n).toLocaleString('fr-FR');
const gras  = s => '\n\x1b[1m' + s + '\x1b[0m';

/* ── Empreinte d'une exécution ─────────────────────
   Chaque passage écrit .audit-snapshot.json (hors git). Le passage
   SUIVANT compare : c'est ce qui permet de détecter une anomalie dont
   on ignore encore la nature, au lieu de ne chercher que ce qu'on sait
   déjà chercher. Un seul point est conservé, le plus récent. */
const FICHIER_SNAPSHOT = new URL('../.audit-snapshot.json', import.meta.url);

function lireSnapshot() {
  try { return JSON.parse(fs.readFileSync(FICHIER_SNAPSHOT, 'utf8')); }
  catch { return null; }
}
function ecrireSnapshot(users, state) {
  const s = state[0] || {};
  fs.writeFileSync(FICHIER_SNAPSHOT, JSON.stringify({
    at: Date.now(),
    prix: Number(s.current_price) || 0,
    users: users.map(u => ({
      c: u.user_code, n: u.user_name,
      e: num(u.total_earned), l: num(u.level),
      f: num(u.cafes), t: num(u.total_play_time),
    })),
  }));
}

/* ════════ CONTRÔLES ════════ */

/* 1. Rendement : cookies gagnés par minute de jeu.
   Repère : Café Express, le meilleur rendement de l'app, plafonne à
   ~300 cookies pour 60-180 s de partie. Au-delà de 400/min, impossible.
   Restreint aux comptes ACTIFS : total_play_time n'existe que depuis le
   2026-05-12, les comptes plus anciens ont un ratio faussé vers le haut
   sans avoir triché. */
function rendement(users) {
  const susp = users
    .filter(u => !ADMINS.includes(String(u.user_name).toLowerCase())
              && num(u.total_play_time) >= 600 && jours(u.last_active) <= 14)
    .map(u => ({ u, r: Math.round(num(u.total_earned) / (num(u.total_play_time) / 60)) }))
    .filter(x => x.r > 150)
    .sort((a, b) => b.r - a.r);
  const graves = susp.filter(x => x.r > 400);
  /* Marque les impossibles : la liste affiche tous les suspects (>150),
     le compte du verdict ne retient que les impossibles (>400). Sans ce
     repère, on ne sait pas lesquels sont lesquels. */
  const detail = susp.map(x =>
    `${x.r > 400 ? "!! " : "   "}${x.u.user_name} (${x.u.user_code}) — ${x.r} cookies/min · ${Math.round(num(x.u.total_play_time) / 60)} min jouées · niv ${x.u.level}`);
  if (graves.length)     alerte(`${graves.length} compte(s) au rendement IMPOSSIBLE (plus de 400 cookies/min)`, detail);
  else if (susp.length)  voir(`${susp.length} compte(s) au rendement élevé (150 à 400 cookies/min)`, detail);
  else                   ok('Aucun rendement anormal chez les joueurs actifs');
}

/* 2. Niveau incohérent avec le total affiché.
   C'est LE contrôle qui a démasqué l'exploit de septembre. Le cap
   anti-écart (addCoins) fige le total_earned du leader pendant que son
   niveau continue de monter : un tricheur en tête du classement passe
   donc inaperçu si on ne regarde que total_earned. Un compte dont le
   niveau réclame bien plus de gains qu'il n'en affiche a été soit
   plafonné (légitime), soit gonflé (pas légitime). */
function coherenceNiveau(users) {
  const ecarts = users
    .filter(u => !ADMINS.includes(String(u.user_name).toLowerCase())
              && num(u.level) >= 10 && !num(u.prestige_level))
    .map(u => ({ u, requis: gainsPourNiveau(num(u.level)), affiche: num(u.total_earned) }))
    .filter(x => x.affiche < x.requis * 0.75)
    .sort((a, b) => (a.affiche / a.requis) - (b.affiche / b.requis));
  if (!ecarts.length) return ok('Niveaux cohérents avec les gains affichés');
  voir(`${ecarts.length} compte(s) dont le niveau n'est pas justifié par le total affiché`,
    ecarts.map(x => `${x.u.user_name} (${x.u.user_code}) — niv ${x.u.level} réclame ~${fmt(x.requis)}, affiche ${fmt(x.affiche)}   [cap leader, ou exploit]`));
}

/* 3. Concentration de la semaine en cours. Un joueur qui pèse plus de
   40 % de tout ce que la communauté a gagné, ce n'est pas du talent. */
function concentrationHebdo(users) {
  const parSemaine = {};
  users
    .filter(u => !ADMINS.includes(String(u.user_name).toLowerCase()) && num(u.weekly_earned) > 0)
    .forEach(u => { (parSemaine[u.weekly_week_id] ??= []).push(u); });
  const semaine = Object.keys(parSemaine).sort().pop();
  if (!semaine) return ok('Aucun gain hebdomadaire enregistré');
  const list  = parSemaine[semaine].sort((a, b) => num(b.weekly_earned) - num(a.weekly_earned));
  const total = list.reduce((s, u) => s + num(u.weekly_earned), 0);
  const gros  = list.filter(u => num(u.weekly_earned) / total > 0.40);
  const detail = list.slice(0, 6).map(u =>
    `${u.user_name} — ${fmt(u.weekly_earned)} cookies (${Math.round(num(u.weekly_earned) / total * 100)} % de la semaine)`);
  if (gros.length) alerte(`Semaine ${semaine} : ${gros.length} joueur(s) pèse(nt) plus de 40 % du total (${fmt(total)} cookies)`, detail);
  else             ok(`Semaine ${semaine} équilibrée — ${fmt(total)} cookies répartis sur ${list.length} joueur(s)`, detail);
}

/* 4. Podiums hebdo. Les semaines saines se gagnent en CENTAINES ; un
   vainqueur à 5 chiffres signe un exploit qui tournait — et les cafés
   du podium, eux, sont déjà versés. */
function podiums(rows) {
  const gros = rows.filter(w => num(w.top1_earned) >= 10000);
  const detail = rows.slice(0, 6).map(w => `${w.week_id} — ${w.top1_name || '(personne)'} : ${fmt(w.top1_earned)} cookies`);
  if (gros.length) alerte(`${gros.length} semaine(s) gagnée(s) avec un score à 5 chiffres`,
    gros.map(w => `${w.week_id} — ${w.top1_name} : ${fmt(w.top1_earned)} cookies   ⚠️ podium café déjà versé`));
  else ok('Aucun podium hebdo aberrant', detail);
}

/* 6. ÉVOLUTION DEPUIS LA DERNIÈRE EXÉCUTION.
   Le contrôle le plus utile du lot, et le seul qui ne suppose pas de
   savoir ce qu'on cherche : il compare l'état actuel à l'empreinte du
   passage précédent. Tout gain anormal apparu entre les deux ressort,
   quelle que soit sa cause — un exploit qu'on n'a pas encore imaginé
   comme un cadeau mal calibré.

   Sa force : le ratio est calculé sur le TEMPS DE JEU DE LA PÉRIODE
   (delta de total_play_time), pas sur le cumul historique. L'angle mort
   des comptes antérieurs au 2026-05-12 disparaît complètement ici.

   Il ne sert à rien au premier lancement — c'est normal, il se met en
   place tout seul dès le deuxième. */
function evolution(users, snap) {
  if (!snap) {
    return voir('Évolution : première exécution, empreinte enregistrée', [
      'Aucun point de comparaison pour l\'instant.',
      'Le prochain « npm run audit » signalera tout gain anormal survenu entre les deux.',
    ]);
  }
  const heures = (Date.now() - snap.at) / 3600000;
  const avant  = new Map(snap.users.map(u => [u.c, u]));
  const faits  = [];

  for (const u of users) {
    if (ADMINS.includes(String(u.user_name).toLowerCase())) continue;
    const a = avant.get(u.user_code);
    if (!a) { faits.push({ grave: false, l: `${u.user_name} — nouveau compte depuis la dernière fois` }); continue; }

    const dGains   = num(u.total_earned)    - a.e;
    const dMinutes = (num(u.total_play_time) - a.t) / 60;
    const dNiveaux = num(u.level)           - a.l;
    const dCafes   = num(u.cafes)           - a.f;
    if (dGains <= 0 && dNiveaux <= 0 && dCafes <= 0) continue;

    /* Gains sans temps de jeu : le signal le plus net qui soit. */
    if (dGains > 500 && dMinutes < 1) {
      faits.push({ grave: true, l: `${u.user_name} (${u.user_code}) — +${fmt(dGains)} cookies pour MOINS D'UNE MINUTE de jeu` });
    } else if (dMinutes >= 1) {
      const taux = Math.round(dGains / dMinutes);
      if (taux > 400) faits.push({ grave: true,  l: `${u.user_name} (${u.user_code}) — ${taux} cookies/min sur la période (+${fmt(dGains)} en ${Math.round(dMinutes)} min)` });
      else if (taux > 150) faits.push({ grave: false, l: `${u.user_name} (${u.user_code}) — ${taux} cookies/min sur la période` });
    }

    /* Le total_earned du leader est plafonné : ses gains réels
       n'apparaissent que dans le niveau. 4 paliers d'un coup, ce n'est
       pas une bonne soirée. */
    if (dNiveaux >= 4) faits.push({ grave: true, l: `${u.user_name} (${u.user_code}) — +${dNiveaux} niveaux en ${Math.round(heures)} h` });

    /* Le café est la monnaie rare de l'app : ses sources sont comptées.
       En gagner beaucoup d'un coup mérite toujours un regard. */
    if (dCafes >= 6) faits.push({ grave: true,  l: `${u.user_name} (${u.user_code}) — +${dCafes} cafés en ${Math.round(heures)} h` });
    else if (dCafes >= 3) faits.push({ grave: false, l: `${u.user_name} (${u.user_code}) — +${dCafes} cafés en ${Math.round(heures)} h` });
  }

  const entete = `Évolution sur ${heures < 1 ? Math.round(heures * 60) + ' min' : Math.round(heures) + ' h'}`;
  const graves = faits.filter(f => f.grave);
  if (graves.length)     alerte(`${entete} : ${graves.length} anomalie(s)`, faits.map(f => (f.grave ? '!! ' : '   ') + f.l));
  else if (faits.length) voir(`${entete} : ${faits.length} point(s) à regarder`, faits.map(f => '   ' + f.l));
  else                   ok(`${entete} : rien d'anormal`);
}

/* 5. Marché $CKM — état, cohérence des actions, activité. */
function marche(state, txs, portefeuilles) {
  const s = state[0];
  if (!s) return alerte('Marché : aucun état en base (table market_state vide)');

  const prix = num(s.current_price);
  if (prix < 10 || prix > 300) alerte(`Marché : prix hors bornes — ${prix.toFixed(1)} (attendu entre 10 et 300)`);
  else ok(`Marché : prix à ${prix.toFixed(1)}, dans les bornes`);

  const heures = jours(s.last_updated) * 24;
  if (heures > 24) alerte(`Marché FIGÉ — dernier tick il y a ${Math.round(heures)} h`, [
    "Le tick de maintenance ne tourne que lorsqu'un joueur a l'onglet Marché ouvert.",
    "Plus de 24 h sans tick : soit plus personne n'y va, soit maintenanceTick est cassé.",
  ]);
  else if (heures > 2) voir(`Marché : dernier tick il y a ${Math.round(heures)} h`);
  else ok(`Marché : tick à jour (il y a ${Math.round(heures * 60)} min)`);

  if (s.circuit_breaker_until && new Date(s.circuit_breaker_until) > new Date())
    voir('Marché : circuit breaker ACTIF jusqu\'à ' + s.circuit_breaker_until);

  const circ = num(s.shares_in_circulation), supply = num(s.total_shares_supply);
  if (circ > supply) alerte(`Marché : ${fmt(circ)} actions en circulation pour une réserve de ${fmt(supply)}`);
  else ok(`Marché : ${fmt(circ)} / ${fmt(supply)} actions en circulation`);

  /* Les portefeuilles doivent totaliser ce que l'état annonce. Un écart
     = des actions créées ou perdues hors transaction. */
  const detenu = portefeuilles.reduce((t, p) => t + num(p.shares), 0);
  if (Math.abs(detenu - circ) > Math.max(5, circ * 0.02))
    alerte(`Marché : les portefeuilles totalisent ${fmt(detenu)} actions, l'état en annonce ${fmt(circ)}`,
      ['Écart = actions créées ou perdues hors transaction. Pistes : creditFreeShares, packs $CKM, rollback partiel.']);
  else ok(`Marché : portefeuilles et état cohérents (${fmt(detenu)} actions détenues)`);

  const negatifs = portefeuilles.filter(p => num(p.shares) < 0);
  if (negatifs.length) alerte(`Marché : ${negatifs.length} portefeuille(s) à solde négatif`,
    negatifs.map(p => `${p.user_code} — ${p.shares} actions`));

  const recentes = txs.filter(t => jours(t.created_at) <= 1);
  const parJoueur = {};
  recentes.forEach(t => {
    parJoueur[t.user_code] ??= { n: 0, sh: 0 };
    parJoueur[t.user_code].n++;
    parJoueur[t.user_code].sh += num(t.shares);
  });
  const spam = Object.entries(parJoueur).filter(([, v]) => v.n > 40);
  if (spam.length) voir(`Marché : ${spam.length} joueur(s) à plus de 40 transactions en 24 h`,
    spam.map(([c, v]) => `${c} — ${v.n} transactions, ${fmt(v.sh)} actions échangées`));
  else ok(`Marché : ${recentes.length} transaction(s) sur 24 h, rien d'anormal`);
}

/* ════════ EXÉCUTION ════════ */
(async () => {
  console.log('\x1b[1m\nBILAN DE SANTÉ COOKIMINER\x1b[0m  ' + new Date().toLocaleString('fr-FR'));
  console.log('lecture seule · ' + BASE.replace('https://', ''));

  let users, winners, state, txs, portefeuilles;
  try {
    [users, winners, state, txs, portefeuilles] = await Promise.all([
      q('users?select=user_name,user_code,level,xp,total_earned,weekly_earned,weekly_week_id,cookies,cafes,total_play_time,prestige_level,last_active&limit=2000'),
      q('weekly_winners?select=week_id,top1_name,top1_code,top1_earned&order=week_id.desc&limit=12'),
      q('market_state?select=*&limit=1'),
      q('market_transactions?select=user_code,type,shares,total_amount,created_at&order=created_at.desc&limit=500'),
      q('market_portfolio?select=user_code,shares&limit=2000'),
    ]);
  } catch (e) {
    console.error('\nÉchec de lecture : ' + e.message);
    process.exit(1);
  }

  const actifs = users.filter(u => jours(u.last_active) <= 14).length;
  console.log(`${users.length} comptes · ${actifs} actifs sur 14 jours`);

  rendement(users);
  coherenceNiveau(users);
  concentrationHebdo(users);
  podiums(winners);
  marche(state, txs, portefeuilles);
  evolution(users, lireSnapshot());
  ecrireSnapshot(users, state);

  const couleur = { OK: '\x1b[32m', VOIR: '\x1b[33m', ALERTE: '\x1b[31m' };
  const puce    = { OK: '  OK  ', VOIR: ' VOIR ', ALERTE: 'ALERTE' };
  console.log(gras('RÉSULTATS'));
  for (const v of verdicts) {
    console.log(`${couleur[v.n]}[${puce[v.n]}]\x1b[0m ${v.t}`);
    if (v.d && v.n !== 'OK') v.d.forEach(l => console.log('          ' + l));
  }

  const nbAlertes = verdicts.filter(v => v.n === 'ALERTE').length;
  const nbVoir    = verdicts.filter(v => v.n === 'VOIR').length;
  console.log(gras('CONCLUSION'));
  if (nbAlertes)   console.log(`\x1b[31m${nbAlertes} alerte(s)\x1b[0m et ${nbVoir} point(s) à voir — il y a quelque chose à corriger.`);
  else if (nbVoir) console.log(`\x1b[33mAucune alerte, ${nbVoir} point(s) à voir.\x1b[0m`);
  else             console.log('\x1b[32mTout est sain.\x1b[0m');
  console.log('');
  /* Code de sortie 1 s'il y a une alerte : utilisable dans un cron ou
     une CI qui préviendrait tout seul. */
  process.exit(nbAlertes ? 1 : 0);
})();

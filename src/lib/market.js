import { supabase, isSupabaseEnabled } from './supabase';
import { isAdminName, notAdmin } from '../utils/admin.js';

/* ════════════════════════════════════════════════════
   market.js — logique du marché $CKM en ligne (Supabase)
   ────────────────────────────────────────────────────
   Expose :
   - MARKET_CONFIG / MAX_SHARES_PER_USER : constantes
   - getMarketState()      : prix courant + stock + dérivé available_shares
   - getMarketHistory()    : snapshots des dernières 24h
   - getDailyVolume()      : achats / ventes / total sur 24h (récupéré mais
                              non affiché par défaut — UX simplifiée)
   - getUserPortfolio(uc)  : portfolio d'un utilisateur (ou {0,0} par défaut)
   - buyShares(uc, n)      : achat — retourne { success, type, cost, ... }
   - sellShares(uc, n)     : vente — retourne { success, type, gained, profit, ... }
   - maintenanceTick()     : circuit breaker + snapshot historique
                              (ne touche PLUS au prix — cf. ci-dessous)

   ⚠️ REFONTE DU 08/09/2026 — LE PRIX NE BOUGE QUE PAR LES JOUEURS.
   Toutes les forces automatiques ont été retirées : plus d'inflation
   quotidienne, plus de retour vers 100, plus de plafond doux, plus de
   mean reversion. Le cours est désormais le produit exact des achats et
   des ventes : prix = 500 × Π(1 ± IMPACT_PER_SHARE × n). Entre deux
   transactions il ne se passe rien, et c'est voulu (décision Régis) —
   une courbe plate est le prix à payer pour une courbe honnête.
   Conséquence à connaître : rien ne ramène le prix vers une valeur de
   confort. S'il monte, c'est que des joueurs ont acheté ; s'il s'effondre,
   c'est que des joueurs ont vendu. La seule limite reste PRICE_MIN /
   PRICE_MAX, et la masse de cookies en circulation dans le jeu.

   Toutes les fonctions sont safe en mode dégradé (Supabase off → return null
   ou {error:'Hors ligne'}). RLS permissive : la sécurité passe par le client.
═══════════════════════════════════════════════════════ */

export const MARKET_CONFIG = {
  /* Échelle du 08/09/2026 : l'action vaut 500 de base (avant : 100).
     Les bornes suivent la même multiplication — un plafond resté à 300
     aurait rendu le prix de base impossible à atteindre. */
  PRICE_MIN: 100,                 // Plancher — 1/5 du prix de base. En dessous, l'action ne vaudrait plus rien et le marché n'aurait plus d'enjeu.
  PRICE_MAX: 2500,                // Plafond — 5× le prix de base. Inatteignable en pratique (il faudrait ~1 600 actions achetées, soit 800 000 🍪, quand le jeu entier en contient 275 000), mais garde un garde-fou dur.
  PRICE_INITIAL: 500,
  /* ⚠️ MAINTENANCE — quand true, le marché est fermé en permanence
     (au-delà des horaires habituels). Affiche "Marché en maintenance"
     côté UI + bloque buyShares/sellShares avec message d'erreur clair.
     Repasser à false dès que les déséquilibres sont corrigés. */
  MAINTENANCE_MODE: false,
  /* ⚠️ FERMETURE OFFICIELLE (v1.29 — 07/09/2026)
     Distincte de MAINTENANCE_MODE : ici le marché est fermé DÉLIBÉRÉMENT
     et pour une durée indéterminée, le temps de refondre l'économie en
     1.30. Raison : l'exploit du Memory (cf. accountNotices.js) avait
     permis d'acheter 767 des 797 actions en circulation — 96 % du
     flottant sur deux comptes. Rouvrir avant d'avoir corrigé la source
     des cookies aurait juste rejoué le même scénario.

     Le prix, l'historique et les portefeuilles sont CONSERVÉS : à la
     réouverture, chacun retrouve ses actions. Seuls les échanges sont
     suspendus.

     Repasser à false pour rouvrir — rien d'autre à toucher. */
  CLOSED: true,
  /* Profondeur ramenée à l'échelle réelle du jeu (08/09/2026) : à 500 🍪
     l'action, les 275 000 🍪 que possèdent TOUS les comptes réunis ne
     peuvent en acheter que ~550. Un flottant de 10 000 affichait « 9 785
     actions disponibles » — un chiffre qui ne voulait plus rien dire.
     ⚠️ market_state.total_shares_supply doit valoir la même chose en base
     (c'est LUI qui alimente available_shares) — cf. SPLIT_MARCHE_500.sql. */
  TOTAL_SHARES: 2000,             // Cap PCT 0.05 = 100 actions max/user, soit 50 000 🍪 — une limite qui mord enfin pour les gros portefeuilles.
  IMPACT_PER_SHARE: 0.001,        // +0.1 % par action. Relevé (0.0003 → 0.001) parce que plus rien d'autre ne bouge la courbe : il faut qu'un ordre se VOIE. 30 actions/tx = 3 %, 100 actions = 10,5 %. Toutes les actions du flottant achetées = ×7,4 (borné par PRICE_MAX).
  MAX_PRICE_IMPACT_PCT: 0.10,     // Cap : aucune transaction unique ne peut bouger le prix de plus de 10 % (évite les chutes/pumps catastrophiques quand un whale liquide tout via un pass premium)
  /* Circuit breaker auto : si le prix bouge de plus de
     CIRCUIT_BREAKER_THRESHOLD en CIRCUIT_BREAKER_WINDOW_MS, le marché
     se ferme automatiquement pendant CIRCUIT_BREAKER_PAUSE_MS.
     Stocké via market_state.circuit_breaker_until (timestamptz, SQL).
     Seuil relevé et pause raccourcie le 08/09/2026 : avec un impact à
     0,1 %/action, 150 actions échangées en 5 min suffisaient à déclencher
     l'ancien seuil de 15 %, et punir 1 h une journée animée à 7 traders
     actifs, c'était fermer le marché pour l'avoir utilisé. */
  CIRCUIT_BREAKER_THRESHOLD:    0.20,           // 20 % de variation
  CIRCUIT_BREAKER_WINDOW_MS:    5 * 60 * 1000,  // sur 5 min
  CIRCUIT_BREAKER_PAUSE_MS:     30 * 60 * 1000, // pause 30 min
  /* ⚠️ BONUS DE HOLD RETIRÉ le 08/09/2026 (demande Régis). Il multipliait
     la plus-value positive par 1,1 / 1,3 / 2 selon la durée de détention
     — donc il fabriquait des cookies par-dessus le marché, en dehors de
     tout mouvement de prix. Vendre au même cours qu'à l'achat pouvait
     rapporter. Dans un marché dont le cours n'obéit plus qu'à l'offre et
     à la demande, le gain doit venir du cours et de rien d'autre.
     `weighted_buy_at` reste écrit et sert toujours : il affiche la durée
     de détention et alimente les frais de garde. */
  MAX_SHARES_PER_USER_PCT: 0.05,  // 5 % du flottant = 100 actions max par user, soit 50 000 🍪 : personne ne peut à lui seul faire la pluie et le beau temps
  MAX_SHARES_PER_TX:       30,    // Max 30 actions par tx (bypass possible via item premium "tout-acheter/vendre"). 30 actions = 3 % d'impact prix, et 15 000 🍪 à l'achat.
  MAX_DAILY_VOLUME:        200,   // Volume cumulé (achats + ventes) sur 24 h et par joueur — 200 actions = 100 000 🍪, ramené à l'échelle du nouveau prix
  /* Cooldowns distincts par sens — anti-exploit pump-and-dump conservé,
     mais on assouplit l'achat-pur pour que le joueur puisse réagir au
     marché (DCA, ajout après une baisse) sans attendre 1 minute. */
  BUY_COOLDOWN_MS:  15_000,       // 15 s entre 2 achats consécutifs (assoupli — slippage symétrique + caps tx/jour suffisent à protéger)
  SELL_COOLDOWN_MS: 60_000,       // 60 s entre un achat et la prochaine vente, ET entre 2 ventes (anti day trading agressif — combiné au slippage symétrique, suffit à bloquer le pump-and-dump)
  HISTORY_HOURS: 24,
  SNAPSHOT_SECONDS: 1800,         // Battement de coeur : 1 point / 30 min (avant 5 s). Le prix ne bougeant plus tout seul, un point par minute ne faisait que gonfler market_history — 43 000 lignes pour une fenêtre d'un mois, rapatriées à chaque rafraîchissement. Les ordres posent leur propre point, et getMarketHistory ajoute une ancre à gauche et une queue à droite : la courbe reste juste avec très peu de relevés.
  /* Horaires d'ouverture (heure locale du joueur). Ouvert quand
     openHour ≤ heure < closeHour. closeHour = 24 → ferme à minuit pile. */
  HOURS: { openHour: 6, closeHour: 24 },
};

/* ── Ouverture forcée pour la mise au point (08/09/2026) ──────
   Le marché reste FERMÉ pour les joueurs (MARKET_CONFIG.CLOSED), mais
   on a besoin de l'ouvrir chez nous pour éprouver la nouvelle échelle
   sur la vraie base : c'est le seul endroit où le prix, la profondeur
   et le fil d'activité sont réels.

   DEUX VERROUS, les deux obligatoires :
     1. import.meta.env.DEV       → jamais dans un build de production,
                                    donc jamais chez un joueur
     2. VITE_MARKET_FORCE_OPEN=1  → dans .env.local, qui n'est pas
                                    versionné (cf. .gitignore)
   Autrement dit : impossible d'ouvrir le marché aux joueurs par
   accident en oubliant de retirer une ligne avant de déployer. Pour
   les rouvrir pour de bon, il faudra passer CLOSED à false, et c'est
   un geste délibéré.

   ⚠️ Ce que ça implique : les ordres passés ainsi sont de VRAIS ordres.
   Ils bougent le vrai cours, consomment le vrai flottant et laissent
   des lignes dans market_transactions. Nettoyer avec
   RESET_APRES_ESSAIS.sql avant la réouverture. */
const DEV_FORCE_OPEN = (() => {
  try { return !!import.meta.env?.DEV && import.meta.env?.VITE_MARKET_FORCE_OPEN === '1'; }
  catch { return false; }
})();

/* Statut du marché (ouvert / fermé) basé sur l'heure LOCALE du client.
   Retourne { open, nextChange, maintenance, circuitBreaker } où
   nextChange est la prochaine bascule. Le flag `maintenance` couvre
   les 2 cas : MAINTENANCE_MODE manuel ET circuit breaker auto.
   `circuitBreakerUntil` (optionnel) : timestamp de réouverture si CB actif. */
export function getMarketStatus(now = new Date(), serverState = null) {
  /* Fermeture officielle : passe AVANT le circuit breaker, sinon un CB
     résiduel en base (il en traînait un jusqu'en 2126 suite à un UPDATE
     manuel raté) afficherait "réouverture à …" avec une date absurde. */
  if (MARKET_CONFIG.CLOSED && !DEV_FORCE_OPEN) {
    return { open: false, nextChange: null, maintenance: true, closed: true };
  }
  if (MARKET_CONFIG.MAINTENANCE_MODE) {
    return { open: false, nextChange: null, maintenance: true };
  }
  /* Circuit breaker auto : si market_state.circuit_breaker_until > now,
     le marché est fermé jusqu'à expiration. Le serveur (maintenanceTick)
     met à jour ce champ quand il détecte un mouvement >15 % en 5 min. */
  if (serverState?.circuit_breaker_until) {
    const cbUntil = new Date(serverState.circuit_breaker_until).getTime();
    if (cbUntil > now.getTime()) {
      return {
        open: false,
        nextChange: new Date(cbUntil),
        maintenance: true,
        circuitBreaker: true,
      };
    }
  }
  const { openHour, closeHour } = MARKET_CONFIG.HOURS;
  const hour = now.getHours();
  const open = hour >= openHour && hour < closeHour;

  const nextChange = new Date(now);
  nextChange.setMinutes(0, 0, 0);
  if (open) {
    /* prochaine bascule = fermeture (closeHour aujourd'hui, ou minuit si 24) */
    if (closeHour >= 24) {
      nextChange.setHours(0);
      nextChange.setDate(nextChange.getDate() + 1);
    } else {
      nextChange.setHours(closeHour);
    }
  } else {
    /* prochaine bascule = réouverture (openHour aujourd'hui ou demain) */
    if (hour < openHour) {
      nextChange.setHours(openHour);
    } else {
      nextChange.setHours(openHour);
      nextChange.setDate(nextChange.getDate() + 1);
    }
  }
  return { open, nextChange };
}

function formatHour(date) {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}h${m}`;
}

export const MAX_SHARES_PER_USER = Math.floor(
  MARKET_CONFIG.TOTAL_SHARES * MARKET_CONFIG.MAX_SHARES_PER_USER_PCT
);

// ═══════════════════════════════════════════
// LECTURE
// ═══════════════════════════════════════════

export async function getMarketState() {
  if (!isSupabaseEnabled()) return null;
  const { data, error } = await supabase
    .from('market_state')
    .select('*')
    .eq('id', 1)
    .single();
  if (error) {
    console.warn('getMarketState error:', error);
    return null;
  }
  return {
    ...data,
    current_price: parseFloat(data.current_price),
    available_shares: data.total_shares_supply - data.shares_in_circulation,
  };
}

/* rangeMinutes : fenêtre de remontée (1, 5, 60, 1440…). Permet au chart de
   demander seulement la plage affichée — pas besoin de charger 24h pour
   afficher les 5 dernières minutes. */
export async function getMarketHistory(rangeMinutes = MARKET_CONFIG.HISTORY_HOURS * 60) {
  if (!isSupabaseEnabled()) return [];
  const since = new Date(Date.now() - rangeMinutes * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('market_history')
    .select('price, recorded_at')
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });

  const rows = (data || []).map(d => ({ ...d, price: parseFloat(d.price) }));

  /* Point d'ancrage (08/09/2026) : le dernier relevé AVANT la fenêtre.
     Depuis que le prix ne bouge plus tout seul, une journée sans le
     moindre ordre ne laisse presque aucun point — la vue « 1 h » d'un
     marché calme se retrouvait vide, et affichait « aucune donnée »
     alors que le cours existe et n'a simplement pas bougé. On repêche
     donc la dernière valeur connue pour que la courbe démarre au bord
     gauche, à plat. Sans lui, plus la fenêtre est large, plus le vide
     est probable — c'est l'inverse de ce qu'on attend. */
  if (rows.length < 2) {
    const { data: before } = await supabase
      .from('market_history')
      .select('price, recorded_at')
      .lt('recorded_at', since)
      .order('recorded_at', { ascending: false })
      .limit(1);
    const anchor = (before || [])[0];
    if (anchor) {
      rows.unshift({
        price: parseFloat(anchor.price),
        /* On le date au bord de la fenêtre, pas à sa vraie date : sinon
           un point vieux de trois semaines écraserait toute l'échelle
           de temps d'une vue « 1 h ». */
        recorded_at: since,
      });
    }
  }

  /* Point de queue : la courbe doit toucher le bord droit. Le battement
     de coeur ne tombe qu'une fois par demi-heure, donc sans ça la ligne
     s'arrêtait jusqu'à 30 minutes avant « maintenant » et donnait
     l'impression d'un marché figé ou d'un bug. Le prix affiché est le
     dernier connu — et c'est exactement la vérité : rien ne l'a bougé
     depuis, sinon un ordre aurait posé son propre point. */
  const lastRow = rows[rows.length - 1];
  if (lastRow) {
    const ageMs = Date.now() - new Date(lastRow.recorded_at).getTime();
    if (ageMs > 60_000) {
      rows.push({ price: lastRow.price, recorded_at: new Date().toISOString() });
    }
  }

  return rows;
}

export async function getDailyVolume() {
  if (!isSupabaseEnabled()) return { buy: 0, sell: 0, total: 0 };
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from('market_transactions')
    .select('type, shares')
    .gte('created_at', since);
  const result = { buy: 0, sell: 0, total: 0 };
  data?.forEach(t => {
    if (t.type === 'buy') result.buy += t.shares;
    else result.sell += t.shares;
    result.total += t.shares;
  });
  return result;
}

/* Durée de détention, en millisecondes, depuis le timestamp pondéré par
   les achats successifs. Purement informatif depuis le retrait du bonus
   de hold : sert à afficher « détenu depuis 3 j » dans le portefeuille.
   Retourne 0 si le portefeuille est antérieur à la colonne SQL. */
export function getHoldDuration(weightedBuyAt) {
  if (!weightedBuyAt) return 0;
  return Math.max(0, Date.now() - new Date(weightedBuyAt).getTime());
}

/* Volume quotidien (24 h) d'UN user — pour le cap MAX_DAILY_VOLUME.
   Cumul achats + ventes. Permet de bloquer le day trading agressif. */
export async function getUserDailyVolume(userCode) {
  if (!isSupabaseEnabled() || !userCode) return 0;
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from('market_transactions')
    .select('shares')
    .eq('user_code', userCode)
    .gte('created_at', since);
  return (data || []).reduce((sum, t) => sum + Number(t.shares || 0), 0);
}

export async function getUserPortfolio(userCode) {
  if (!isSupabaseEnabled() || !userCode) return null;
  const { data } = await supabase
    .from('market_portfolio')
    .select('*')
    .eq('user_code', userCode)
    .maybeSingle();
  if (!data) return { user_code: userCode, shares: 0, total_invested: 0 };
  return {
    ...data,
    total_invested: parseFloat(data.total_invested),
  };
}

/* Classement marché — top N joueurs par nombre d'actions détenues
   (shares décroissant). Admin (case-insensitive) exclu pour cohérence
   avec getLeaderboard. Retourne pour chaque joueur : user_code,
   user_name, user_avatar, level, shares, value (= shares × prix
   courant, calculé côté client à partir de getMarketState).

   2 requêtes : (1) portefeuilles non vides triés par shares,
   (2) profils correspondants pour avatar/nom/level. On ne fait pas un
   JOIN SQL pour rester compatible avec la RLS actuelle (lectures
   séparées sur 2 tables permissives). */
export async function getMarketLeaderboard(limit = 50) {
  if (!isSupabaseEnabled()) return [];
  try {
    const { data: portfolios, error: pErr } = await supabase
      .from('market_portfolio')
      .select('user_code, shares, total_invested')
      .gt('shares', 0)
      .order('shares', { ascending: false })
      .limit(limit);
    if (pErr || !portfolios || portfolios.length === 0) return [];

    const codes = portfolios.map(p => p.user_code);
    /* Marché : on n'exclut QUE les admins, pas les NON_RANKED_NAMES.
       Un joueur retiré du classement Cookies (concurrence niveau)
       reste valide en trader (aaronxbox p. ex.). */
    const { data: profiles, error: uErr } = await notAdmin(
      supabase
        .from('users')
        .select('user_code, user_name, user_avatar, level, earned_achievements, active_title')
        .in('user_code', codes)
    );
    if (uErr) return [];

    const profileMap = {};
    (profiles || []).forEach(u => { profileMap[u.user_code] = u; });

    /* On garde l'ordre de portfolios (déjà trié par shares desc), on
       jette les entrées sans profil (admin filtré, ou user supprimé). */
    return portfolios
      .map(p => {
        const u = profileMap[p.user_code];
        if (!u) return null;
        return {
          user_code: p.user_code,
          user_name: u.user_name,
          user_avatar: u.user_avatar,
          level: u.level,
          earned_achievements: u.earned_achievements,
          active_title: u.active_title,
          shares: p.shares,
          total_invested: parseFloat(p.total_invested),
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/* Rang du joueur dans le classement marché (1-based). Compte les
   portefeuilles ayant strictement plus d'actions que le sien, +1.
   Retourne null si l'utilisateur n'a pas de portefeuille ou 0 action,
   ou s'il est admin. */
export async function getMyMarketRank(userCode) {
  if (!isSupabaseEnabled() || !userCode) return null;
  try {
    /* Admin → hors classement (cohérent avec getMyRank cookies) */
    const { data: me } = await supabase
      .from('users').select('user_name').eq('user_code', userCode).maybeSingle();
    if (me && isAdminName(me.user_name)) return null;

    const { data: portfolio } = await supabase
      .from('market_portfolio')
      .select('shares')
      .eq('user_code', userCode)
      .maybeSingle();
    if (!portfolio || !portfolio.shares || portfolio.shares < 1) return null;

    const { count } = await supabase
      .from('market_portfolio')
      .select('*', { count: 'exact', head: true })
      .gt('shares', portfolio.shares);
    return (count ?? 0) + 1;
  } catch {
    return null;
  }
}

/* ════════════════════════════════════════════════════
   getMarketActivity — N dernières transactions du marché, enrichies
   ────────────────────────────────────────────────────
   Lit market_transactions trié par created_at desc, puis JOIN client-side
   sur users pour récupérer nom + avatar. Admin filtrés via notAdmin().

   Retour : tableau d'items { user_code, user_name, user_avatar, type,
   shares, price_per_share, created_at, timestampMs }, prêt pour le feed.
   Mode dégradé / Supabase off → []. */
export async function getMarketActivity(limit = 15) {
  if (!isSupabaseEnabled()) return [];
  try {
    /* Fenêtre de 7 jours (08/09/2026) : le feed dit « ce qui vient de se
       passer ». Sans borne, il ressortait les ordres d'il y a des semaines
       — et après le passage à 500, il aurait affiché « a acheté 5 actions
       à 100 » juste sous un cours à 500. Un feed vide est plus honnête
       qu'un feed périmé. Les transactions restent en base (npm run audit
       s'en sert), on ne fait que ne plus les afficher. */
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: txs } = await supabase
      .from('market_transactions')
      .select('user_code, type, shares, price_per_share, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!txs || txs.length === 0) return [];

    const codes = [...new Set(txs.map(t => t.user_code).filter(Boolean))];
    if (codes.length === 0) return [];

    const { data: profiles } = await notAdmin(
      supabase
        .from('users')
        .select('user_code, user_name, user_avatar')
        .in('user_code', codes)
    );
    const profileMap = {};
    (profiles || []).forEach(u => { profileMap[u.user_code] = u; });

    /* On garde l'ordre desc des transactions, on jette celles dont le user
       est admin (absent du profileMap) ou supprimé. */
    return txs
      .map(t => {
        const u = profileMap[t.user_code];
        if (!u) return null;
        return {
          user_code: t.user_code,
          user_name: u.user_name,
          user_avatar: u.user_avatar,
          type: t.type,
          shares: t.shares,
          price_per_share: parseFloat(t.price_per_share),
          created_at: t.created_at,
          timestampMs: new Date(t.created_at).getTime(),
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/* ════════════════════════════════════════════════════
   applyMarketRebalance10pct — Rebalance one-shot : retire 10 % des actions
   ────────────────────────────────────────────────────
   Mécanisme one-shot (déclenché via flag LS dans App.jsx) pour
   décongestionner un marché bloqué loin de la moyenne quand trop
   d'actions sont thésaurisées : on retire 10 % des shares de l'user
   (PUR RETRAIT — sans compensation cookies, c'est le choix UX assumé)
   et on les réinjecte dans le pool disponible (shares_in_circulation--).

   total_invested est réduit proportionnellement (sinon le prix d'achat
   moyen serait artificiellement gonflé et fausserait la PnL future).

   Retour : { sharesRemoved, sharesBefore, sharesAfter } ou null si rien
   à faire (user sans portefeuille / 0 action / < 10 actions = négligeable). */
export async function applyMarketRebalance10pct(userCode) {
  if (!isSupabaseEnabled() || !userCode) return null;
  try {
    const { data: portfolio } = await supabase
      .from('market_portfolio')
      .select('shares, total_invested')
      .eq('user_code', userCode)
      .maybeSingle();
    if (!portfolio || !portfolio.shares || portfolio.shares < 10) return null;

    /* Math.ceil : on retire au moins 1 si shares >= 10 (10 % de 10 = 1). */
    const sharesRemoved = Math.ceil(portfolio.shares * 0.10);
    const sharesAfter = portfolio.shares - sharesRemoved;
    const investedAfter = sharesAfter === 0
      ? 0
      : Math.floor((Number(portfolio.total_invested) || 0) * sharesAfter / portfolio.shares);

    const { error: pErr } = await supabase
      .from('market_portfolio')
      .update({
        shares: sharesAfter,
        total_invested: investedAfter,
        updated_at: new Date().toISOString(),
      })
      .eq('user_code', userCode);
    if (pErr) return null;

    /* Réinjecte dans le pool dispo (shares_in_circulation -= removed). */
    const { data: state } = await supabase
      .from('market_state')
      .select('shares_in_circulation')
      .eq('id', 1)
      .maybeSingle();
    if (state) {
      await supabase
        .from('market_state')
        .update({
          shares_in_circulation: Math.max(0, (Number(state.shares_in_circulation) || 0) - sharesRemoved),
        })
        .eq('id', 1);
    }

    return { sharesRemoved, sharesBefore: portfolio.shares, sharesAfter };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[market] applyMarketRebalance10pct error:', e);
    return null;
  }
}


/* ════════════════════════════════════════════════════
   getMarketPulse — Snapshot communautaire du marché sur 24 h
   ────────────────────────────────────────────────────
   1 seule query market_transactions, on dérive 3 chiffres côté client :
   - activeTraders : DISTINCT user_code (joueurs ayant tradé)
   - buyVolume / sellVolume : actions cumulées par sens
   - totalVolume = buy + sell

   Admin compté (cohérent avec getMarketTraderCount, pas de JOIN coûteux).
   Limite 5000 rows par sécurité — largement au-delà du volume réel
   journalier (cap actuel : 200 actions / 24 h / user × ~quelques dizaines
   de traders). */
export async function getMarketPulse() {
  if (!isSupabaseEnabled()) return null;
  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data } = await supabase
      .from('market_transactions')
      .select('user_code, type, shares')
      .gte('created_at', since)
      .limit(5000);
    if (!data) return null;
    const traders = new Set();
    let buy = 0, sell = 0;
    data.forEach(t => {
      if (t.user_code) traders.add(t.user_code);
      if (t.type === 'buy') buy += Number(t.shares) || 0;
      else                  sell += Number(t.shares) || 0;
    });
    return {
      activeTraders: traders.size,
      buyVolume: buy,
      sellVolume: sell,
      totalVolume: buy + sell,
    };
  } catch {
    return null;
  }
}

/* Nombre total de joueurs avec au moins 1 action (admin compté ici car
   on ne croise pas users — coût raisonnable pour rester simple). */
export async function getMarketTraderCount() {
  if (!isSupabaseEnabled()) return null;
  try {
    const { count } = await supabase
      .from('market_portfolio')
      .select('*', { count: 'exact', head: true })
      .gt('shares', 0);
    return count ?? 0;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════
// ACHAT
// ═══════════════════════════════════════════
export async function buyShares(userCode, shares, options = {}) {
  if (!isSupabaseEnabled()) return { error: 'Hors ligne' };
  if (!shares || shares < 1) return { error: 'Quantité invalide' };

  /* Cap par transaction : force à splitter les gros trades. Couplé au
     cooldown 60 s entre 2 ventes, ça impose un délai de 4 min minimum
     pour dumper 100 actions (au lieu de pouvoir le faire en 1 sec).
     Bypass possible via item premium 'bulk_trade_pass'. */
  if (!options.bypassTxCap && shares > MARKET_CONFIG.MAX_SHARES_PER_TX) {
    return { error: `Max ${MARKET_CONFIG.MAX_SHARES_PER_TX} actions par transaction. Splitte ton ordre en plusieurs.` };
  }

  /* Volume quotidien max (cumul achats + ventes sur 24 h). Bloque
     le day trading agressif. */
  const dailyVolume = await getUserDailyVolume(userCode);
  if (dailyVolume + shares > MARKET_CONFIG.MAX_DAILY_VOLUME) {
    const remaining = Math.max(0, MARKET_CONFIG.MAX_DAILY_VOLUME - dailyVolume);
    return { error: `Volume quotidien plafonné à ${MARKET_CONFIG.MAX_DAILY_VOLUME} actions. Reste ${remaining} pour aujourd'hui.` };
  }

  const state = await getMarketState();
  if (!state) return { error: 'Marché indisponible' };

  const status = getMarketStatus(new Date(), state);
  if (!status.open) {
    if (status.closed) {
      return { error: '🔒 Le marché $CKM est fermé — tes actions sont conservées' };
    }
    if (status.circuitBreaker) {
      return { error: `⚡ Circuit breaker — variation trop forte. Réouverture à ${formatHour(status.nextChange)}` };
    }
    if (status.maintenance) {
      return { error: '🛠️ Marché en maintenance — réouverture bientôt' };
    }
    return { error: `Marché fermé. Réouverture à ${formatHour(status.nextChange)}` };
  }

  if (shares > state.available_shares) {
    return { error: `Seulement ${state.available_shares} action(s) disponible(s)` };
  }

  const portfolio = await getUserPortfolio(userCode);
  if (portfolio.shares + shares > MAX_SHARES_PER_USER) {
    const remaining = MAX_SHARES_PER_USER - portfolio.shares;
    return {
      error: `Limite max ${MAX_SHARES_PER_USER} actions par utilisateur. Tu peux en acheter ${Math.max(0, remaining)} de plus`
    };
  }

  /* Cooldown court entre 2 achats — empêche le spam mais reste fluide
     (BUY_COOLDOWN_MS = 15 s vs 60 s pour les ventes). Le slippage
     symétrique et le cap MAX_SHARES_PER_TX protègent suffisamment. */
  if (portfolio.last_buy_at) {
    const elapsed = Date.now() - new Date(portfolio.last_buy_at).getTime();
    if (elapsed < MARKET_CONFIG.BUY_COOLDOWN_MS) {
      const wait = Math.ceil((MARKET_CONFIG.BUY_COOLDOWN_MS - elapsed) / 1000);
      return { error: `Cooldown achat — patiente ${wait} s avant le prochain achat` };
    }
  }

  const currentPrice = state.current_price;

  /* Slippage symétrique anti-exploit : on calcule d'abord le prix POST-impact
     (le prix qui sera affiché APRÈS l'achat) et on facture l'utilisateur à
     CE prix-là. Sinon un aller-retour instantané ferait gagner gratuitement
     l'impact (acheté à 100, prix monte à 105, revendu à 105 = +5% gratuit).
     Cap MAX_PRICE_IMPACT_PCT (10 %) pour éviter les pumps violents
     quand un whale achète d'un coup. */
  const rawImpact     = MARKET_CONFIG.IMPACT_PER_SHARE * shares;
  const cappedImpact  = Math.min(rawImpact, MARKET_CONFIG.MAX_PRICE_IMPACT_PCT);
  let newPrice = currentPrice * (1 + cappedImpact);
  newPrice = Math.min(MARKET_CONFIG.PRICE_MAX, newPrice);

  const totalCost = Math.ceil(newPrice * shares);

  /* Validation serveur du solde. Le garde-fou client (computeMaxBuyable)
     peut être désynchronisé (prop `coins` périmée, 2 devices, race) ; sans
     ce check l'achat réussissait côté serveur et le sur-débit était masqué
     localement par Math.max(0, …) → actions quasi-gratuites. L'appelant
     transmet le solde courant via options.availableCoins. */
  if (options.availableCoins != null && totalCost > options.availableCoins) {
    return { error: `Solde insuffisant — il te faut ${totalCost} 🍪 pour ${shares} action(s).` };
  }

  const { error: updateErr } = await supabase
    .from('market_state')
    .update({
      current_price: newPrice,
      shares_in_circulation: state.shares_in_circulation + shares,
      last_updated: new Date().toISOString(),
    })
    .eq('id', 1);

  if (updateErr) return { error: 'Erreur de mise à jour du marché' };

  /* Point d'historique immédiat (08/09/2026) : depuis que le tick ne
     touche plus au prix, un ordre est le SEUL événement qui bouge la
     courbe. Sans ce snapshot, la marche d'escalier n'apparaîtrait qu'au
     prochain battement de coeur — le joueur ne verrait pas son propre
     achat pousser le cours. */
  await supabase.from('market_history').insert({
    price: newPrice,
    shares_circulating: state.shares_in_circulation + shares,
  });

  await supabase.from('market_transactions').insert({
    user_code: userCode,
    type: 'buy',
    shares,
    price_per_share: newPrice,
    total_amount: totalCost,
  });

  /* Timestamp pondéré pour le bonus de hold : (existing_weighted *
     existing_shares + now * new_shares) / total_shares. Si portfolio
     vide, weighted_buy_at = now. Récompense les hold longs sans
     pénaliser les achats successifs (perte proportionnelle).
     Nécessite SQL : alter table market_portfolio add column if not
     exists weighted_buy_at timestamptz; */
  const nowMs = Date.now();
  const oldWeightedMs = portfolio.weighted_buy_at
    ? new Date(portfolio.weighted_buy_at).getTime()
    : nowMs;
  const newWeightedMs = portfolio.shares > 0
    ? Math.round((oldWeightedMs * portfolio.shares + nowMs * shares) / (portfolio.shares + shares))
    : nowMs;

  await supabase.from('market_portfolio').upsert({
    user_code: userCode,
    shares: portfolio.shares + shares,
    total_invested: portfolio.total_invested + totalCost,
    updated_at: new Date().toISOString(),
    /* Anti pump-and-dump : on stocke l'instant du dernier achat pour
       imposer un cooldown avant la prochaine vente (cf. sellShares).
       Nécessite : alter table market_portfolio add column if not exists
       last_buy_at timestamptz; */
    last_buy_at: new Date().toISOString(),
    weighted_buy_at: new Date(newWeightedMs).toISOString(),
  }, { onConflict: 'user_code' });

  return {
    success: true,
    type: 'buy',
    cost: totalCost,
    pricePaid: newPrice,
    newPrice,
    sharesNow: portfolio.shares + shares,
  };
}

/* ════════════════════════════════════════════════════
   creditFreeShares — crédite N actions sans débiter cookies (codes promo)
   ────────────────────────────────────────────────────
   Utilisé par les codes promo (ex: BARMAN). On ajoute les shares au
   portfolio + on incrémente shares_in_circulation pour rester cohérent
   avec la mécanique offre/demande. Pas d'impact sur le prix (pas de
   slippage appliqué). Pas d'enregistrement dans market_transactions
   (ce n'est pas un achat).

   options.investedTotal : cookies réellement dépensés par le joueur pour
   ces actions (packs boutique). Omis = cadeau → le prix de revient est
   inscrit à la valeur de marché du jour. Voir le bloc ⚠️ plus bas :
   sans base de coût, un cadeau devient une plus-value fantôme.
═══════════════════════════════════════════════════════ */
export async function creditFreeShares(userCode, sharesToAdd, options = {}) {
  if (!isSupabaseEnabled()) return { success: false, error: 'Hors ligne' };
  if (!userCode || !sharesToAdd || sharesToAdd <= 0) return { success: false };

  try {
    /* Portfolio actuel */
    const { data: portfolio } = await supabase
      .from('market_portfolio')
      .select('shares, total_invested')
      .eq('user_code', userCode)
      .maybeSingle();

    const currentShares = Number(portfolio?.shares) || 0;
    const newShares     = currentShares + sharesToAdd;
    const cap           = MARKET_CONFIG.TOTAL_SHARES * MARKET_CONFIG.MAX_SHARES_PER_USER_PCT;
    if (newShares > cap) {
      return { success: false, error: `Cap max ${cap} actions` };
    }

    /* Incrémente shares_in_circulation pour cohérence */
    const { data: state } = await supabase
      .from('market_state')
      .select('shares_in_circulation, current_price')
      .eq('id', 1)
      .maybeSingle();
    if (state) {
      await supabase
        .from('market_state')
        .update({ shares_in_circulation: (Number(state.shares_in_circulation) || 0) + sharesToAdd })
        .eq('id', 1);
    }

    /* ⚠️ PRIX DE REVIENT (corrigé le 08/09/2026) — avant, ces actions
       arrivaient avec un total_invested inchangé, donc un prix de revient
       de 0. Conséquence : les revendre comptait pour 100 % de plus-value,
       et le bonus de hold (qui DOUBLE la plus-value au bout d'une semaine)
       transformait un cadeau de 5 actions en deux fois sa valeur. C'est
       ce qui a mis 214 400 🍪 de gains fantômes sous la réouverture du
       marché, pour 107 200 🍪 d'actions rendues.

       Désormais on inscrit toujours une base : le coût réel quand le
       joueur a payé (options.investedTotal, cas des packs boutique), la
       valeur de marché du jour sinon (cadeau, restitution, code promo).
       Le joueur garde exactement la valeur qu'on lui donne — elle cesse
       simplement d'être comptée comme un bénéfice qu'il aurait réalisé. */
    const priceNow = Number(state?.current_price) || MARKET_CONFIG.PRICE_INITIAL;
    const addedBasis = options.investedTotal != null
      ? Math.max(0, Math.round(options.investedTotal))
      : Math.round(priceNow * sharesToAdd);

    /* weighted_buy_at = now : ces actions démarrent leur horloge de hold
       aujourd'hui. */
    await supabase.from('market_portfolio').upsert({
      user_code: userCode,
      shares: newShares,
      total_invested: (Number(portfolio?.total_invested) || 0) + addedBasis,
      updated_at: new Date().toISOString(),
      weighted_buy_at: new Date().toISOString(),
    }, { onConflict: 'user_code' });

    return { success: true, sharesAdded: sharesToAdd, sharesNow: newShares };
  } catch (e) {
    console.warn('[market] creditFreeShares error:', e);
    return { success: false, error: 'Erreur réseau' };
  }
}

/* ════════════════════════════════════════════════════
   adminDebitShares — débit administratif d'actions (sanction)
   ────────────────────────────────────────────────────
   Retire jusqu'à `sharesToRemove` actions du portefeuille d'un user.
   Si l'user a moins de shares que demandé, on retire tout ce qu'il a
   (pas d'erreur). total_invested est réduit proportionnellement pour
   éviter de fausser l'avg buy price restant. shares_in_circulation
   est décrémenté du montant réellement retiré pour cohérence offre/
   demande.

   Utilisé par App.jsx (PACK_EXPLOIT_SANCTIONS) — appelé une fois
   par device via flag LS. Pas de log dans market_transactions (ce
   n'est pas une vente). Retourne { removed, success } ou { error }. */
export async function adminDebitShares(userCode, sharesToRemove) {
  if (!isSupabaseEnabled()) return { error: 'Hors ligne' };
  if (!userCode || !sharesToRemove || sharesToRemove <= 0) return { error: 'Args invalides' };
  try {
    const { data: portfolio } = await supabase
      .from('market_portfolio')
      .select('shares, total_invested')
      .eq('user_code', userCode)
      .maybeSingle();
    if (!portfolio) return { removed: 0, success: true };
    const currentShares = Number(portfolio.shares) || 0;
    const removed       = Math.min(currentShares, Math.floor(sharesToRemove));
    if (removed <= 0) return { removed: 0, success: true };
    const newShares = currentShares - removed;
    const newInvested = newShares === 0
      ? 0
      : Math.floor((Number(portfolio.total_invested) || 0) * newShares / currentShares);
    await supabase
      .from('market_portfolio')
      .update({
        shares: newShares,
        total_invested: newInvested,
        updated_at: new Date().toISOString(),
      })
      .eq('user_code', userCode);
    /* Décrémente shares_in_circulation pour cohérence (les shares
       sortent du marché, ils n'ont jamais existé légitimement). */
    const { data: state } = await supabase
      .from('market_state')
      .select('shares_in_circulation')
      .eq('id', 1)
      .maybeSingle();
    if (state) {
      await supabase
        .from('market_state')
        .update({
          shares_in_circulation: Math.max(0, (Number(state.shares_in_circulation) || 0) - removed),
        })
        .eq('id', 1);
    }
    return { removed, success: true };
  } catch (e) {
    console.warn('[market] adminDebitShares error:', e);
    return { error: 'Erreur réseau' };
  }
}

// ═══════════════════════════════════════════
// VENTE
// ═══════════════════════════════════════════
export async function sellShares(userCode, shares, options = {}) {
  if (!isSupabaseEnabled()) return { error: 'Hors ligne' };
  if (!shares || shares < 1) return { error: 'Quantité invalide' };

  /* Mêmes caps que buyShares : par transaction + volume quotidien.
     Bypass possible via item premium 'bulk_trade_pass'. */
  if (!options.bypassTxCap && shares > MARKET_CONFIG.MAX_SHARES_PER_TX) {
    return { error: `Max ${MARKET_CONFIG.MAX_SHARES_PER_TX} actions par transaction. Splitte ton ordre en plusieurs.` };
  }
  const dailyVolume = await getUserDailyVolume(userCode);
  if (dailyVolume + shares > MARKET_CONFIG.MAX_DAILY_VOLUME) {
    const remaining = Math.max(0, MARKET_CONFIG.MAX_DAILY_VOLUME - dailyVolume);
    return { error: `Volume quotidien plafonné à ${MARKET_CONFIG.MAX_DAILY_VOLUME} actions. Reste ${remaining} pour aujourd'hui.` };
  }

  const stateForStatus = await getMarketState();
  if (!stateForStatus) return { error: 'Marché indisponible' };

  const status = getMarketStatus(new Date(), stateForStatus);
  if (!status.open) {
    if (status.closed) {
      return { error: '🔒 Le marché $CKM est fermé — tes actions sont conservées' };
    }
    if (status.circuitBreaker) {
      return { error: `⚡ Circuit breaker — variation trop forte. Réouverture à ${formatHour(status.nextChange)}` };
    }
    if (status.maintenance) {
      return { error: '🛠️ Marché en maintenance — réouverture bientôt' };
    }
    return { error: `Marché fermé. Réouverture à ${formatHour(status.nextChange)}` };
  }

  const portfolio = await getUserPortfolio(userCode);
  if (portfolio.shares < shares) {
    return { error: `Tu n'as que ${portfolio.shares} action(s)` };
  }

  /* Anti pump-and-dump : cooldown 60 s entre un achat et la prochaine
     vente, ET cooldown 60 s entre 2 ventes consécutives. Bloque le
     day trading agressif (achat/vente en boucle rapide) ET le dump en
     chaîne (même sans achat récent). Si les colonnes sont absentes
     (pas encore migrées Supabase) ou null, on laisse passer. */
  const now = Date.now();
  if (portfolio.last_buy_at) {
    const elapsed = now - new Date(portfolio.last_buy_at).getTime();
    if (elapsed < MARKET_CONFIG.SELL_COOLDOWN_MS) {
      const wait = Math.ceil((MARKET_CONFIG.SELL_COOLDOWN_MS - elapsed) / 1000);
      return { error: `Cooldown anti spéculation — patiente ${wait} s avant de vendre` };
    }
  }
  if (portfolio.last_sell_at) {
    const elapsed = now - new Date(portfolio.last_sell_at).getTime();
    if (elapsed < MARKET_CONFIG.SELL_COOLDOWN_MS) {
      const wait = Math.ceil((MARKET_CONFIG.SELL_COOLDOWN_MS - elapsed) / 1000);
      return { error: `Cooldown vente — patiente ${wait} s entre 2 ventes` };
    }
  }

  /* Réutiliser stateForStatus déjà récupéré au début pour éviter un
     2e round-trip Supabase. */
  const state = stateForStatus;

  const currentPrice = state.current_price;

  /* Slippage symétrique anti-exploit (cf. buyShares) : on vend au prix
     POST-impact (plus bas), pas au prix avant impact. Sinon revendre
     immédiatement après avoir acheté capturerait l'impact de son propre
     achat.
     Cap MAX_PRICE_IMPACT_PCT (10 %) pour éviter les chutes violentes
     quand un whale liquide tout d'un coup (cas signalé : prix tombé
     de 129 à 87 en quelques minutes). */
  const rawImpact     = MARKET_CONFIG.IMPACT_PER_SHARE * shares;
  const cappedImpact  = Math.min(rawImpact, MARKET_CONFIG.MAX_PRICE_IMPACT_PCT);
  let newPrice = currentPrice * (1 - cappedImpact);
  newPrice = Math.max(MARKET_CONFIG.PRICE_MIN, newPrice);

  const totalGainedRaw = Math.floor(newPrice * shares);

  /* Coût de base proportionnel libéré : sert au calcul du profit */
  const ratio = shares / portfolio.shares;
  const investedReleased = portfolio.total_invested * ratio;

  /* Le produit de la vente, c'est le cours et rien d'autre (08/09/2026).
     Le bonus de hold qui majorait ici la plus-value de 10 à 100 % a été
     retiré : il créait des cookies sans qu'aucun prix n'ait bougé. */
  const totalGained = totalGainedRaw;

  await supabase
    .from('market_state')
    .update({
      current_price: newPrice,
      shares_in_circulation: state.shares_in_circulation - shares,
      last_updated: new Date().toISOString(),
    })
    .eq('id', 1);

  /* Point d'historique immédiat — cf. buyShares : une vente est un des
     deux seuls événements capables de faire bouger la courbe. */
  await supabase.from('market_history').insert({
    price: newPrice,
    shares_circulating: state.shares_in_circulation - shares,
  });

  await supabase.from('market_transactions').insert({
    user_code: userCode,
    type: 'sell',
    shares,
    price_per_share: newPrice,
    total_amount: totalGained,
  });

  const newShares = portfolio.shares - shares;
  await supabase.from('market_portfolio').upsert({
    user_code: userCode,
    shares: newShares,
    total_invested: newShares === 0 ? 0 : portfolio.total_invested - investedReleased,
    updated_at: new Date().toISOString(),
    /* Tracking dernière vente pour le cooldown sell→sell. Nécessite SQL :
       alter table market_portfolio add column if not exists last_sell_at timestamptz; */
    last_sell_at: new Date().toISOString(),
  }, { onConflict: 'user_code' });

  return {
    success: true,
    type: 'sell',
    gained: totalGained,
    pricePaid: newPrice,
    newPrice,
    sharesNow: newShares,
    profit: totalGained - investedReleased,
  };
}

// ═══════════════════════════════════════════
// MAINTENANCE — appelée fréquemment côté client (~15s)
// Throttle global via market_state.last_inflation_at : un seul snapshot
// est inséré par fenêtre de SNAPSHOT_SECONDS, peu importe combien de
// clients sont connectés.
//
// ⚠️ Depuis le 08/09/2026 ce tick NE TOUCHE PLUS AU PRIX. Il ne reste
// que deux missions : surveiller le circuit breaker, et poser le
// battement de coeur de la courbe (un point d'historique régulier, pour
// que le graphe 1 h / 24 h ait une ligne à tracer même quand personne ne
// trade). Le prix, lui, ne change que dans buyShares / sellShares.
// La colonne last_inflation_at garde son nom pour ne pas casser le
// schéma : elle signifie désormais « dernier snapshot ».
// ═══════════════════════════════════════════
let bootstrapChecked = false;  /* cache module-level — évite un count par tick */

export async function maintenanceTick() {
  if (!isSupabaseEnabled()) return;

  const state = await getMarketState();
  if (!state) return;

  /* Bootstrap : si aucun historique n'existe encore, on insère un
     premier snapshot (autorisé même en heures fermées — initialisation). */
  if (!bootstrapChecked) {
    const { count: historyCount } = await supabase
      .from('market_history')
      .select('*', { count: 'exact', head: true });
    if ((historyCount ?? 0) === 0) {
      await supabase.from('market_history').insert({
        price: state.current_price,
        shares_circulating: state.shares_in_circulation,
      });
      bootstrapChecked = true;
      return;
    }
    bootstrapChecked = true;
  }

  /* Circuit breaker auto : on regarde le prix d'il y a 5 min dans l'historique.
     Si la variation a dépassé CIRCUIT_BREAKER_THRESHOLD, on déclenche une
     pause de CIRCUIT_BREAKER_PAUSE_MS en mettant à jour market_state.
     Cette détection tourne MÊME quand le marché est en maintenance manuelle
     (sans effet en plus, mais ne plante pas). */
  try {
    const cbWindowMin = MARKET_CONFIG.CIRCUIT_BREAKER_WINDOW_MS / 60_000;
    const since = new Date(Date.now() - MARKET_CONFIG.CIRCUIT_BREAKER_WINDOW_MS).toISOString();
    const { data: oldSnap } = await supabase
      .from('market_history')
      .select('price')
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (oldSnap?.price) {
      const oldPrice = parseFloat(oldSnap.price);
      const variation = Math.abs(state.current_price - oldPrice) / oldPrice;
      if (variation > MARKET_CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
        const cbUntil = new Date(Date.now() + MARKET_CONFIG.CIRCUIT_BREAKER_PAUSE_MS).toISOString();
        const alreadyTriggered = state.circuit_breaker_until && new Date(state.circuit_breaker_until).getTime() > Date.now();
        if (!alreadyTriggered) {
          await supabase
            .from('market_state')
            .update({ circuit_breaker_until: cbUntil })
            .eq('id', 1);
          // eslint-disable-next-line no-console
          console.log(`[market] Circuit breaker triggered: ${(variation*100).toFixed(1)} % in ${cbWindowMin} min → pause until ${cbUntil}`);
        }
      }
    }
  } catch (e) {
    /* Si la colonne circuit_breaker_until n'existe pas encore (SQL pas
       passé), on log et on continue — le circuit breaker reste désactivé
       en silence jusqu'à la migration. */
    // eslint-disable-next-line no-console
    if (!e?.message?.includes('circuit_breaker_until')) {
      console.warn('[market] CB check error:', e?.message);
    }
  }

  /* Marché fermé → on ne pousse plus de snapshot. Le prix reste figé sur
     la dernière valeur jusqu'à la réouverture. */
  if (!getMarketStatus(new Date(), state).open) return;

  const now = Date.now();
  const lastInflation = new Date(state.last_inflation_at).getTime();
  const secondsSince = (now - lastInflation) / 1000;

  if (secondsSince < MARKET_CONFIG.SNAPSHOT_SECONDS) return;

  /* Battement de coeur : on réinscrit le prix ACTUEL, inchangé. Aucune
     force automatique n'existe plus — inflation, plafond doux, retour
     vers 100 et mean reversion ont été retirés le 08/09/2026. Ce point
     ne sert qu'à donner au graphe une ligne continue entre deux ordres :
     sans lui, une journée sans transaction n'aurait aucun point à
     tracer et la courbe apparaîtrait vide. */
  const price = state.current_price;

  await supabase
    .from('market_state')
    .update({ last_inflation_at: new Date().toISOString() })
    .eq('id', 1);

  await supabase.from('market_history').insert({
    price,
    shares_circulating: state.shares_in_circulation,
  });
}

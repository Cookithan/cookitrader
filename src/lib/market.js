import { supabase, isSupabaseEnabled } from './supabase';
import { isAdminName, ADMIN_ILIKE_PATTERN } from '../utils/admin.js';

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
   - maintenanceTick()     : inflation horaire + régression vers la moyenne
                              + snapshot historique (idempotent : skip si <1h)

   Toutes les fonctions sont safe en mode dégradé (Supabase off → return null
   ou {error:'Hors ligne'}). RLS permissive : la sécurité passe par le client.
═══════════════════════════════════════════════════════ */

export const MARKET_CONFIG = {
  PRICE_MIN: 10,
  PRICE_MAX: 1000,
  PRICE_INITIAL: 100,
  TOTAL_SHARES: 1000,             // calibré pour une petite base de joueurs (passer à 10000+ quand l'app décolle)
  IMPACT_PER_SHARE: 0.001,        // +0.1% par action — calibré pour un faible nombre de traders
  DAILY_INFLATION: 0.001,         // +0.1% par jour
  MEAN_REVERSION_LOW: 30,
  MEAN_REVERSION_HIGH: 700,
  MEAN_REVERSION_RATE: 0.0008,
  MAX_SHARES_PER_USER_PCT: 0.10,  // 10% du total = 1000 actions max par user
  HISTORY_HOURS: 24,
  SNAPSHOT_SECONDS: 5,            // un snapshot toutes les 5s (max — partagé entre clients)
  /* Horaires d'ouverture (heure locale du joueur). Ouvert quand
     openHour ≤ heure < closeHour. closeHour = 24 → ferme à minuit pile. */
  HOURS: { openHour: 6, closeHour: 24 },
};

/* Statut du marché (ouvert / fermé) basé sur l'heure LOCALE du client.
   Retourne { open, nextChange } où nextChange est la prochaine bascule
   (date de fermeture si ouvert, date de réouverture si fermé). */
export function getMarketStatus(now = new Date()) {
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
  return (data || []).map(d => ({ ...d, price: parseFloat(d.price) }));
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
    const { data: profiles, error: uErr } = await supabase
      .from('users')
      .select('user_code, user_name, user_avatar, level, earned_achievements, active_title')
      .in('user_code', codes)
      .not('user_name', 'ilike', ADMIN_ILIKE_PATTERN);
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
export async function buyShares(userCode, shares) {
  if (!isSupabaseEnabled()) return { error: 'Hors ligne' };
  if (!shares || shares < 1) return { error: 'Quantité invalide' };

  const status = getMarketStatus();
  if (!status.open) {
    return { error: `Marché fermé. Réouverture à ${formatHour(status.nextChange)}` };
  }

  const state = await getMarketState();
  if (!state) return { error: 'Marché indisponible' };

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

  const currentPrice = state.current_price;

  /* Slippage symétrique anti-exploit : on calcule d'abord le prix POST-impact
     (le prix qui sera affiché APRÈS l'achat) et on facture l'utilisateur à
     CE prix-là. Sinon un aller-retour instantané ferait gagner gratuitement
     l'impact (acheté à 100, prix monte à 105, revendu à 105 = +5% gratuit). */
  const priceImpact = MARKET_CONFIG.IMPACT_PER_SHARE * shares;
  let newPrice = currentPrice * (1 + priceImpact);
  newPrice = Math.min(MARKET_CONFIG.PRICE_MAX, newPrice);

  const totalCost = Math.ceil(newPrice * shares);

  const { error: updateErr } = await supabase
    .from('market_state')
    .update({
      current_price: newPrice,
      shares_in_circulation: state.shares_in_circulation + shares,
      last_updated: new Date().toISOString(),
    })
    .eq('id', 1);

  if (updateErr) return { error: 'Erreur de mise à jour du marché' };

  await supabase.from('market_transactions').insert({
    user_code: userCode,
    type: 'buy',
    shares,
    price_per_share: newPrice,
    total_amount: totalCost,
  });

  await supabase.from('market_portfolio').upsert({
    user_code: userCode,
    shares: portfolio.shares + shares,
    total_invested: portfolio.total_invested + totalCost,
    updated_at: new Date().toISOString(),
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
═══════════════════════════════════════════════════════ */
export async function creditFreeShares(userCode, sharesToAdd) {
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
      .select('shares_in_circulation')
      .eq('id', 1)
      .maybeSingle();
    if (state) {
      await supabase
        .from('market_state')
        .update({ shares_in_circulation: (Number(state.shares_in_circulation) || 0) + sharesToAdd })
        .eq('id', 1);
    }

    /* Upsert le portfolio (le total_invested reste inchangé puisque
       l'utilisateur n'a rien dépensé pour ces actions). */
    await supabase.from('market_portfolio').upsert({
      user_code: userCode,
      shares: newShares,
      total_invested: Number(portfolio?.total_invested) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_code' });

    return { success: true, sharesAdded: sharesToAdd, sharesNow: newShares };
  } catch (e) {
    console.warn('[market] creditFreeShares error:', e);
    return { success: false, error: 'Erreur réseau' };
  }
}

// ═══════════════════════════════════════════
// VENTE
// ═══════════════════════════════════════════
export async function sellShares(userCode, shares) {
  if (!isSupabaseEnabled()) return { error: 'Hors ligne' };
  if (!shares || shares < 1) return { error: 'Quantité invalide' };

  const status = getMarketStatus();
  if (!status.open) {
    return { error: `Marché fermé. Réouverture à ${formatHour(status.nextChange)}` };
  }

  const portfolio = await getUserPortfolio(userCode);
  if (portfolio.shares < shares) {
    return { error: `Tu n'as que ${portfolio.shares} action(s)` };
  }

  const state = await getMarketState();
  if (!state) return { error: 'Marché indisponible' };

  const currentPrice = state.current_price;

  /* Slippage symétrique anti-exploit (cf. buyShares) : on vend au prix
     POST-impact (plus bas), pas au prix avant impact. Sinon revendre
     immédiatement après avoir acheté capturerait l'impact de son propre
     achat. */
  const priceImpact = MARKET_CONFIG.IMPACT_PER_SHARE * shares;
  let newPrice = currentPrice * (1 - priceImpact);
  newPrice = Math.max(MARKET_CONFIG.PRICE_MIN, newPrice);

  const totalGained = Math.floor(newPrice * shares);

  /* Coût de base proportionnel libéré : sert au calcul du profit */
  const ratio = shares / portfolio.shares;
  const investedReleased = portfolio.total_invested * ratio;

  await supabase
    .from('market_state')
    .update({
      current_price: newPrice,
      shares_in_circulation: state.shares_in_circulation - shares,
      last_updated: new Date().toISOString(),
    })
    .eq('id', 1);

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
// clients sont connectés. Inflation + régression vers la moyenne en
// même temps que le snapshot, proportionnelles au temps écoulé.
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

  /* Marché fermé → on ne pousse plus de snapshot. Le prix reste figé sur
     la dernière valeur jusqu'à la réouverture. */
  if (!getMarketStatus().open) return;

  const now = Date.now();
  const lastInflation = new Date(state.last_inflation_at).getTime();
  const secondsSince = (now - lastInflation) / 1000;

  if (secondsSince < MARKET_CONFIG.SNAPSHOT_SECONDS) return;
  const hoursSince = secondsSince / 3600;

  let newPrice = state.current_price;

  /* 1. Inflation par jour (proportionnelle au temps écoulé) */
  const daysSince = hoursSince / 24;
  newPrice = newPrice * (1 + MARKET_CONFIG.DAILY_INFLATION * daysSince);

  /* 2. Régression vers la moyenne (si trop bas ou trop haut) */
  if (newPrice < MARKET_CONFIG.MEAN_REVERSION_LOW) {
    const distance = MARKET_CONFIG.MEAN_REVERSION_LOW - newPrice;
    newPrice += distance * MARKET_CONFIG.MEAN_REVERSION_RATE * hoursSince;
  } else if (newPrice > MARKET_CONFIG.MEAN_REVERSION_HIGH) {
    const distance = newPrice - MARKET_CONFIG.MEAN_REVERSION_HIGH;
    newPrice -= distance * MARKET_CONFIG.MEAN_REVERSION_RATE * hoursSince;
  }

  newPrice = Math.max(MARKET_CONFIG.PRICE_MIN, Math.min(MARKET_CONFIG.PRICE_MAX, newPrice));

  await supabase
    .from('market_state')
    .update({
      current_price: newPrice,
      last_inflation_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    })
    .eq('id', 1);

  /* 3. Snapshot historique */
  await supabase.from('market_history').insert({
    price: newPrice,
    shares_circulating: state.shares_in_circulation,
  });
}

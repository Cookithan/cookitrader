/* Simulation read-only du rebalance 10 % — n'écrit RIEN, juste affiche.
   Usage : node scripts/sim-rebalance.mjs */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

/* Parse .env.local manuellement (pas de dotenv dépendance). */
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const { data: state } = await supabase
  .from('market_state').select('*').eq('id', 1).single();

const { data: portfolios } = await supabase
  .from('market_portfolio')
  .select('user_code, shares, total_invested, weighted_buy_at, updated_at')
  .gt('shares', 0);

const total_shares_circulating = state.shares_in_circulation;
const total_shares_supply      = state.total_shares_supply;
const available_before         = total_shares_supply - total_shares_circulating;
const price                    = parseFloat(state.current_price);

let total_removed = 0;
let eligible_count = 0;
let ineligible_count = 0;
let ineligible_shares = 0;
let total_shares_held = 0;
const removalsByUser = [];

for (const p of portfolios) {
  total_shares_held += p.shares;
  if (p.shares < 10) {
    ineligible_count++;
    ineligible_shares += p.shares;
    continue;
  }
  const removed = Math.ceil(p.shares * 0.10);
  total_removed += removed;
  eligible_count++;
  removalsByUser.push({ user_code: p.user_code, shares: p.shares, removed, after: p.shares - removed });
}

removalsByUser.sort((a, b) => b.shares - a.shares);

console.log('═══ ÉTAT ACTUEL ═══');
console.log(`Prix courant       : ${price.toFixed(2)} 🍪`);
console.log(`Stock total supply : ${total_shares_supply}`);
console.log(`En circulation     : ${total_shares_circulating}`);
console.log(`Dispo (pool)       : ${available_before}`);
console.log(`Joueurs avec ≥1    : ${portfolios.length}`);
console.log(`Total shares chez joueurs : ${total_shares_held}`);
console.log('');
console.log('═══ SIMULATION REBALANCE 10 % ═══');
console.log(`Joueurs éligibles (≥10)    : ${eligible_count}`);
console.log(`Joueurs ignorés (<10)      : ${ineligible_count}  (${ineligible_shares} actions intouchées)`);
console.log(`Actions retirées au total  : ${total_removed}`);
console.log('');
console.log('═══ APRÈS REBALANCE ═══');
console.log(`En circulation : ${total_shares_circulating - total_removed}  (${total_shares_circulating} → ${total_shares_circulating - total_removed})`);
console.log(`Dispo (pool)   : ${available_before + total_removed}  (${available_before} → ${available_before + total_removed})`);
console.log(`Prix courant   : ${price.toFixed(2)} 🍪  (INCHANGÉ — le rebalance ne touche pas current_price)`);
console.log('');
console.log('═══ TOP 10 IMPACTS PAR JOUEUR ═══');
console.log(removalsByUser.slice(0, 10).map(r =>
  `${r.user_code}  ${r.shares.toString().padStart(4)} → ${r.after.toString().padStart(4)}  (-${r.removed})`
).join('\n'));
console.log('');
console.log('💡 Note : le prix ne change qu\'avec les TRADES qui suivent. Avec un');
console.log('   pool dispo plus large + mean reversion permanente (target 100),');
console.log('   le prix devrait converger plus vite vers ~100 si les achats');
console.log('   compensent moins les ventes.');

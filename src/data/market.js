/* ════════════════════════════════════════════════════
   MARCHÉ $CKM
   - PRICE_MIN / PRICE_MAX / PRICE_REF : bornes & valeur de référence (100)
   - HISTORY_N      : nombre de ticks conservés
   - TICK_MS        : période (ms) entre 2 mouvements de cours
   - BIG_MOVE_PCT   : seuil (%) au-delà duquel un tick déclenche le glow "big move"
   - MARKET_EVENTS  : news qui biaisent le prix pendant N ticks
                      kind: 'small' (fréquent) | 'big' (rare, retourne le marché)
                            | 'mega' (ultra-rare, peut tout effacer)
   - SMALL_EVENTS / BIG_EVENTS / MEGA_EVENTS : pré-filtrés par kind
   - nextPrice(p, bias) : modèle mean-reversion vers PRICE_REF + tirage de spike
   - fmt(n, d=2)        : formatage fr-FR avec d décimales
════════════════════════════════════════════════════ */

export const PRICE_MIN  = 30;
export const PRICE_MAX  = 500;
export const PRICE_REF  = 100;
export const HISTORY_N  = 100;
export const TICK_MS    = 1500;
export const BIG_MOVE_PCT = 8;

/* Événements de marché — règle simple : bonne nouvelle = hausse, mauvaise = baisse.
   biasPct = pression %/tick, ticks = durée. kind: 'small' fréquent / 'big' rare et violent */
export const MARKET_EVENTS = [
  /* SMALL — petits mouvements, fréquents */
  // — positifs
  { id:'salon_paris',    kind:'small', label:'Salon du café à Paris',  emoji:'🥐', biasPct:+1.0, ticks:7, desc:'Engouement parisien — flux acheteur léger' },
  { id:'foire_milan',    kind:'small', label:'Foire de Milan',         emoji:'🎪', biasPct:+1.2, ticks:6, desc:'Hype italienne — petite poussée' },
  { id:'tweet_viral',    kind:'small', label:"Tweet d'un influenceur", emoji:'📱', biasPct:+0.9, ticks:5, desc:'Le café fait le buzz — micro-rally' },
  { id:'meteo_colombie', kind:'small', label:'Météo idéale en Colombie',emoji:'☀️', biasPct:+0.8, ticks:7, desc:'Conditions parfaites — confiance en hausse' },
  // — négatifs
  { id:'pluies_bogota',  kind:'small', label:'Pluies abondantes à Bogota', emoji:'🌧️', biasPct:-0.9, ticks:6, desc:'Récolte abîmée — petit fléchissement' },
  { id:'greve_baristas', kind:'small', label:'Grève des baristas',         emoji:'☕', biasPct:-1.0, ticks:6, desc:'Demande en pause — petit creux' },
  { id:'promo_super',    kind:'small', label:'Promo en supermarché',       emoji:'🛒', biasPct:-0.7, ticks:8, desc:'Soldes marque blanche — flux vendeur' },
  { id:'rapport_sante',  kind:'small', label:'Rapport santé moins flatteur', emoji:'📰', biasPct:-1.0, ticks:7, desc:'Article négatif — méfiance légère' },

  /* BIG — événements rares, peuvent retourner le marché */
  // — positifs
  { id:'concours_or',  kind:'big', label:'Médaille d\'or au Concours mondial', emoji:'🏆', biasPct:+5.0, ticks:8,  desc:'Le café star du moment — boom acheteur' },
  { id:'boom_tech',    kind:'big', label:'Boom du café dans la tech',          emoji:'🚀', biasPct:+4.5, ticks:9,  desc:'Les startups en raffolent — flambée' },
  { id:'star_endorse', kind:'big', label:'Une star adore les cookies',         emoji:'🌟', biasPct:+4.0, ticks:7,  desc:'Ruée mondiale sur le produit' },
  // — négatifs
  { id:'frost_ethiopia', kind:'big', label:'Gel destructeur en Éthiopie',    emoji:'❄️', biasPct:-5.0, ticks:8,  desc:'Récolte anéantie — panique vendeuse' },
  { id:'maladie_caf',    kind:'big', label:'Maladie du caféier en Asie',     emoji:'🦠', biasPct:-4.0, ticks:9,  desc:'Plantations infectées — défiance massive' },
  { id:'krach_commod',   kind:'big', label:'Krach des matières premières',   emoji:'📉', biasPct:-5.0, ticks:8,  desc:'Panique générale — vague vendeuse' },
  { id:'regul_surprise', kind:'big', label:'Régulation surprise',            emoji:'🏛️', biasPct:-3.5, ticks:10, desc:'Nouvelle taxe — cours plombé durablement' },

  /* MEGA — événements bouleversants, ultra-rares. Capables de tout effacer ou de tout faire bondir. */
  // — bearish
  { id:'mega_crash',      kind:'mega', label:'Effondrement total du marché',  emoji:'💀', biasPct:-9.0, ticks:11, desc:'Liquidation mondiale — fuis ou perds tout' },
  { id:'apocalypse_caf',  kind:'mega', label:'Apocalypse café',               emoji:'🌋', biasPct:-8.0, ticks:13, desc:"La filière s'écroule — chaos boursier total" },
  // — bullish
  { id:'cafe_revolution', kind:'mega', label:'Révolution du café artisanal',  emoji:'🚀', biasPct:+9.0, ticks:11, desc:'Le monde entier en redemande — explosion historique' },
  { id:'cookie_mania',    kind:'mega', label:'Cookie-mania mondiale',         emoji:'🌟', biasPct:+8.0, ticks:13, desc:"Frénésie planétaire — flux acheteur record" },
];

export const SMALL_EVENTS = MARKET_EVENTS.filter(e => e.kind === 'small');
export const BIG_EVENTS   = MARKET_EVENTS.filter(e => e.kind === 'big');
export const MEGA_EVENTS  = MARKET_EVENTS.filter(e => e.kind === 'mega');

export function nextPrice(p, bias=0){
  /* mean reversion vers 100 — asymétrique : rebond renforcé sous 70, atténuée sinon */
  const dev = (p - PRICE_REF) / PRICE_REF;            // -0.9 .. +4
  const reversionK = dev < -0.3 ? 0.85 : 0.30;        // grosse force de rappel après crash
  const reversion = -reversionK * dev;                // pull % vers 100
  const drift = dev < -0.3 ? 0.40 : 0.18;             // drift renforcé en zone basse
  /* tirage de la catégorie */
  const r = Math.random();
  let pct;
  if(r < 0.01)      pct = (20 + Math.random()*10);    // crash/moonshot 1%
  else if(r < 0.06) pct = (8  + Math.random()*7);     // spike 5%
  else              pct = (2  + Math.random()*2);     // base 94%
  /* sens du pct : légèrement biaisé positif (52/48) */
  pct *= (Math.random() < 0.52) ? 1 : -1;
  /* combine */
  let next = p * (1 + (pct/100) + (reversion/100) + (drift/100) + (bias/100));
  /* bornes */
  if(next < PRICE_MIN) next = PRICE_MIN;
  if(next > PRICE_MAX) next = PRICE_MAX;
  return Math.round(next * 100) / 100;
}

export function fmt(n, d=2){ return n.toLocaleString('fr-FR', { minimumFractionDigits:d, maximumFractionDigits:d }); }

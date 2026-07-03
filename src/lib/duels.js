import { supabase, isSupabaseEnabled } from './supabase';
import { BOT_NAMES } from '../data/leaderboard.js';

/* ════════════════════════════════════════════════════
   duels — Duels 1v1 asynchrones (défis ouverts)
   ────────────────────────────────────────────────────
   Couche client au-dessus de la table `duels` + fonctions
   SECURITY DEFINER (cf. MIGRATION_duels.sql). Modèle de confiance
   identique au boss : la monnaie reste client-authoritative, ces
   fonctions ne coordonnent que l'état du duel. Le SERVEUR tranche
   qui gagne ; le versement du pot au gagnant se fera côté client
   via l'inbox + applyPatchOnce (clé = duel.id) — Phase 2.

   Toutes les fonctions Supabase sont SAFE en mode dégradé :
   retour null / [] / {error} si !isSupabaseEnabled().

   ⚠️ DUEL_CONFIG.MAX_STAKE_* DOIVENT rester synchro avec les
      constantes serveur de create_duel (MIGRATION_duels.sql).

   PHASE 1 = data layer pur (pas d'UI, pas de crédit/débit d'éco).
   Le débit de mise (escrow) et le versement du pot sont câblés en
   Phase 2 côté App.jsx (déduction locale + inbox), jamais ici.
═══════════════════════════════════════════════════════ */

/* Jeux duelables — score comparable, skill only (pas de hasard).
   `higherWins` = sens de comparaison, porté par CHAQUE duel (le
   serveur reste générique). Sens VÉRIFIÉS dans le vrai code des jeux
   (Phase 2) : Memory est le SEUL « moins = mieux » (score = nb de
   coups) ; Pyramide est « plus = mieux » (tasses empilées).
   `icon` = emoji café-only pour l'UI.
   `metric` = ce que le jeu remonte via onDuelScore (doc). */
export const DUELABLE_GAMES = [
  { key:'catcher', label:'Café Express', label_en:'Café Express', icon:'☕', higherWins:true,  metric:'points',  rules:'Attrape les cafés, évite les glaçons.',       botBand:[70,160], dur:60 },
  { key:'flappy',  label:'Flappy',       label_en:'Flappy',       icon:'🥐', higherWins:true,  metric:'tuyaux',  rules:'Passe entre un max de viennoiseries.',        botBand:[6,24],   dur:30 },
  { key:'click',   label:'Clic',         label_en:'Click',        icon:'🍪', higherWins:true,  metric:'clics',   rules:'Clique le cookie le plus vite possible.',     botBand:[22,55],  dur:5  },
  { key:'reflex',  label:'Réflexe',      label_en:'Reflex',       icon:'⚡', higherWins:true,  metric:'cookies', rules:'Tape les cookies dès qu\'ils apparaissent.',  botBand:[6,22],   dur:15 },
  { key:'memory',  label:'Memory',       label_en:'Memory',       icon:'🧠', higherWins:false, metric:'coups',   rules:'Retrouve les paires en un min. de coups.',    botBand:[8,16],   dur:25 }, // moins = mieux
  { key:'pyramid', label:'Pyramide',     label_en:'Pyramid',      icon:'🔺', higherWins:true,  metric:'tasses',  rules:'Empile les tasses le plus haut possible.',    botBand:[7,26],   dur:30 },
  { key:'guess',   label:'Devine',       label_en:'Guess',        icon:'❓', higherWins:true,  metric:'bonnes réponses', rules:'Devine la commande du client.',       botBand:[2,5],    dur:18 },
];

/* Un jeu duelable au hasard (matchmaking « à l'aveugle »).
   TANT QUE le split-screen n'est pas dispo sur tous les jeux, on ne tire
   QUE les jeux `autoPlay` (Phase 1 : Clic + Réflexe) → chaque duel est
   testable en split. Quand les 7 seront autoPlay, ce filtre les reprend
   tous automatiquement. */
export function pickRandomDuelGame(){
  const pool = DUELABLE_GAMES.filter(g => g.autoPlay);
  const src  = pool.length ? pool : DUELABLE_GAMES;
  return src[Math.floor(Math.random() * src.length)];
}

/* Cible de score absolue du bot pour ce jeu (fixée AU matchmaking, avant
   que tu joues → tu as une cible claire à battre, comme un high-score).
   Tirée dans la plage `botBand` du jeu. La barre de course simule la
   montée vers cette cible ; le résultat final compare ton score réel à
   cette valeur fixe. */
export function rollBotTarget(game){
  const g = typeof game === 'string' ? getDuelGame(game) : game;
  const [a, b] = g?.botBand || [10, 20];
  return a + Math.floor(Math.random() * (b - a + 1));
}

export function getDuelGame(gameKey){
  return DUELABLE_GAMES.find(g => g.key === gameKey) || null;
}

export const DUEL_CONFIG = {
  TTL_HOURS:            48,     // durée de vie d'un défi ouvert
  PLAY_WINDOW_MIN:      30,     // fenêtre du preneur pour poser son score (sinon forfait)
  MIN_STAKE_COOKIES:    50,
  MAX_STAKE_COOKIES:    5000,   // == serveur (create_duel)
  MAX_STAKE_CAFES:      5,      // == serveur (create_duel)
  // Bonus « ça compte au classement » + anti-collusion — appliqués
  // côté App.jsx en Phase 4, définis ici pour centraliser les valeurs.
  VICTORY_BONUS_COOKIES:   100, // petit bonus designé au total_earned (pas le pot)
  DAILY_VICTORY_BONUS_CAP: 500, // plafond de bonus classement par jour
  SAME_OPPONENT_DECAY:     0.5, // rendement décroissant contre le même adversaire
  MAX_DUELS_PER_DAY:       20,
};

/* Pot en jeu = mises additionnées des deux joueurs. */
export function duelPot(duel){
  return {
    cookies: (duel?.stakeCookies || 0) * 2,
    cafes:   (duel?.stakeCafes   || 0) * 2,
  };
}

/* ════ CŒUR ÉCONOMIQUE (pur, testable) ════
   Ce que MOI (myCode) dois recevoir d'un duel donné, à créditer UNE SEULE
   fois via applyPatchOnce (clé = duel.id). Renvoie { cookies, cafes, kind }
   avec kind ∈ 'win' | 'lose' | 'draw' | 'refund' | 'none'.
   Rappel escrow : ma mise a DÉJÀ été débitée à la création/acceptation.
     · gagnant  → +pot (2× la mise) = je récupère ma mise + celle de l'adverse
     · égalité  → +ma mise (remboursement, personne ne gagne)
     · expiré/annulé (défi jamais relevé) → +ma mise (remboursement)
     · perdant / forfait → 0 (ma mise reste perdue)
   Transfert pur → NE compte PAS au classement (le bonus Ligue, lui, est
   séparé et plafonné, appliqué à part). */
export function settlementFor(duel, myCode){
  if(!duel || !myCode) return { cookies:0, cafes:0, kind:'none' };
  const iAmChallenger = duel.challengerCode === myCode;
  const iAmOpponent   = duel.opponentCode   === myCode;
  if(!iAmChallenger && !iAmOpponent) return { cookies:0, cafes:0, kind:'none' };

  const stakeC = Math.max(0, duel.stakeCookies || 0);
  const stakeK = Math.max(0, duel.stakeCafes   || 0);

  if(duel.status === 'resolved'){
    if(duel.winnerCode == null)        return { cookies:stakeC,     cafes:stakeK,     kind:'draw' };   // égalité → remboursement
    if(duel.winnerCode === myCode)     return { cookies:stakeC * 2, cafes:stakeK * 2, kind:'win'  };   // pot
    return { cookies:0, cafes:0, kind:'lose' };
  }
  // Défi jamais relevé (expiré) ou retiré (annulé) → le challenger récupère sa mise
  if((duel.status === 'expired' || duel.status === 'cancelled') && iAmChallenger){
    return { cookies:stakeC, cafes:stakeK, kind:'refund' };
  }
  return { cookies:0, cafes:0, kind:'none' };   // 'open'/'pending' → pas encore réglé
}

/* Bilan duels de MOI (pour la Ligue) à partir de listMyDuels (desc). */
export function computeDuelStats(duels, myCode){
  const stats = { wins:0, losses:0, draws:0, played:0, streak:0, bestStreak:0 };
  if(!Array.isArray(duels) || !myCode) return stats;
  const resolved = duels.filter(d => d.status === 'resolved' && (d.challengerCode === myCode || d.opponentCode === myCode));
  let curLocked = false, run = 0;
  for(const d of resolved){                     // desc : le plus récent d'abord
    stats.played++;
    const win = d.winnerCode === myCode;
    if(win) stats.wins++;
    else if(d.winnerCode == null) stats.draws++;
    else stats.losses++;
    if(win && !curLocked) stats.streak++;        // série courante = victoires consécutives récentes
    else curLocked = true;
  }
  for(const d of resolved){                      // meilleure série (plus long run de victoires)
    if(d.winnerCode === myCode){ run++; if(run > stats.bestStreak) stats.bestStreak = run; }
    else run = 0;
  }
  return stats;
}

/* Résolution PURE (miroir exact de submit_duel_score côté SQL).
   Renvoie 'challenger' | 'opponent' | 'draw'. Sert aussi au bot. */
export function resolveDuelScores(higherWins, challengerScore, opponentScore){
  if(opponentScore === challengerScore) return 'draw';
  if(higherWins){
    return opponentScore > challengerScore ? 'opponent' : 'challenger';
  }
  return opponentScore < challengerScore ? 'opponent' : 'challenger';
}

/* snake_case (Supabase) → camelCase (app). Renvoie null si pas de row. */
function normalizeDuelRow(row){
  if(!row) return null;
  return {
    id:              row.id,
    gameKey:         row.game_key,
    higherWins:      row.higher_wins,
    stakeCookies:    Number(row.stake_cookies) || 0,
    stakeCafes:      Number(row.stake_cafes)   || 0,
    challengerCode:  row.challenger_code,
    challengerName:  row.challenger_name,
    challengerScore: Number(row.challenger_score) || 0,
    opponentCode:    row.opponent_code,
    opponentName:    row.opponent_name,
    opponentScore:   row.opponent_score == null ? null : Number(row.opponent_score),
    status:          row.status,
    winnerCode:      row.winner_code,
    createdAt:       row.created_at,
    acceptedAt:      row.accepted_at,
    expiresAt:       row.expires_at,
    resolvedAt:      row.resolved_at,
  };
}

function rpcRow(data){
  return normalizeDuelRow(Array.isArray(data) ? data[0] : data);
}

/* ── Écritures (RPC SECURITY DEFINER) ─────────────────────────── */

/* Pose un défi ouvert. Le challenger a déjà joué : challengerScore figé.
   Renvoie la row normalisée, ou { error } si KO. Le caller (App.jsx)
   débite la mise localement APRÈS un retour sans error. */
export async function createOpenDuel({ gameKey, higherWins = true, stakeCookies = 0, stakeCafes = 0, challengerCode, challengerName, challengerScore }){
  if(!isSupabaseEnabled()) return { error:'Hors ligne' };
  if(!challengerCode || challengerScore == null) return { error:'Paramètres manquants' };
  if(!getDuelGame(gameKey)) return { error:'Jeu non duelable' };
  try{
    const { data, error } = await supabase.rpc('create_duel', {
      p_game_key:         gameKey,
      p_higher_wins:      !!higherWins,
      p_stake_cookies:    Math.max(0, Math.floor(stakeCookies) || 0),
      p_stake_cafes:      Math.max(0, Math.floor(stakeCafes)   || 0),
      p_challenger_code:  challengerCode,
      p_challenger_name:  challengerName || null,
      p_challenger_score: Math.max(0, Math.floor(challengerScore) || 0),
      p_ttl_hours:        DUEL_CONFIG.TTL_HOURS,
    });
    if(error){ console.warn('[duels] createOpenDuel:', error.message); return { error:'Création impossible' }; }
    return { duel: rpcRow(data) };
  }catch{ return { error:'Erreur réseau' }; }
}

/* Un preneur engage sa mise sur un défi ouvert (open → pending).
   Renvoie { duel } ou { error }. Le caller débite la mise localement
   après un retour OK ; puis lance le jeu et appellera submitDuelScore. */
export async function acceptDuel({ id, opponentCode, opponentName }){
  if(!isSupabaseEnabled()) return { error:'Hors ligne' };
  if(!id || !opponentCode) return { error:'Paramètres manquants' };
  try{
    const { data, error } = await supabase.rpc('accept_duel', {
      p_id: id, p_opponent_code: opponentCode, p_opponent_name: opponentName || null,
    });
    if(error){ console.warn('[duels] acceptDuel:', error.message); return { error: mapAcceptError(error.message) }; }
    return { duel: rpcRow(data) };
  }catch{ return { error:'Erreur réseau' }; }
}

function mapAcceptError(msg = ''){
  if(msg.includes('expiré'))            return 'Défi expiré';
  if(msg.includes('déjà pris'))         return 'Défi déjà relevé';
  if(msg.includes('propre défi'))       return 'Pas ton propre défi';
  return 'Impossible de relever';
}

/* Le preneur pose son score → résolution atomique côté serveur.
   Renvoie { duel } (avec winnerCode tranché, null = égalité) ou { error }. */
export async function submitDuelScore({ id, opponentCode, opponentScore }){
  if(!isSupabaseEnabled()) return { error:'Hors ligne' };
  if(!id || !opponentCode || opponentScore == null) return { error:'Paramètres manquants' };
  try{
    const { data, error } = await supabase.rpc('submit_duel_score', {
      p_id: id, p_opponent_code: opponentCode,
      p_opponent_score: Math.max(0, Math.floor(opponentScore) || 0),
    });
    if(error){ console.warn('[duels] submitDuelScore:', error.message); return { error:'Score non enregistré' }; }
    return { duel: rpcRow(data) };
  }catch{ return { error:'Erreur réseau' }; }
}

/* Le challenger retire son défi tant qu'il est encore ouvert. */
export async function cancelDuel({ id, challengerCode }){
  if(!isSupabaseEnabled()) return { error:'Hors ligne' };
  if(!id || !challengerCode) return { error:'Paramètres manquants' };
  try{
    const { data, error } = await supabase.rpc('cancel_duel', {
      p_id: id, p_challenger_code: challengerCode,
    });
    if(error){ console.warn('[duels] cancelDuel:', error.message); return { error:'Annulation impossible' }; }
    return { duel: rpcRow(data) };
  }catch{ return { error:'Erreur réseau' }; }
}

/* Ménage best-effort (à appeler à l'ouverture de l'onglet Duels).
   Expire les défis ouverts périmés + forfait les preneurs AWOL.
   Renvoie le nombre de duels traités (0 en mode dégradé). */
export async function expireDuels(){
  if(!isSupabaseEnabled()) return 0;
  try{
    const { data, error } = await supabase.rpc('expire_duels', {
      p_play_window_min: DUEL_CONFIG.PLAY_WINDOW_MIN,
    });
    if(error){ console.warn('[duels] expireDuels:', error.message); return 0; }
    return Number(data) || 0;
  }catch{ return 0; }
}

/* ── Lectures ─────────────────────────────────────────────────── */

/* Défis ouverts relevables par moi (les miens exclus, non expirés). */
export async function listOpenDuels(myCode, limit = 30){
  if(!isSupabaseEnabled()) return [];
  try{
    let q = supabase
      .from('duels')
      .select('*')
      .eq('status', 'open')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending:false })
      .limit(limit);
    if(myCode) q = q.neq('challenger_code', myCode);
    const { data, error } = await q;
    if(error){ console.warn('[duels] listOpenDuels:', error.message); return []; }
    return (data || []).map(normalizeDuelRow);
  }catch{ return []; }
}

/* Mes duels (créés OU relevés), du plus récent au plus ancien. */
export async function listMyDuels(myCode, limit = 50){
  if(!isSupabaseEnabled() || !myCode) return [];
  try{
    const { data, error } = await supabase
      .from('duels')
      .select('*')
      .or(`challenger_code.eq.${myCode},opponent_code.eq.${myCode}`)
      .order('created_at', { ascending:false })
      .limit(limit);
    if(error){ console.warn('[duels] listMyDuels:', error.message); return []; }
    return (data || []).map(normalizeDuelRow);
  }catch{ return []; }
}

/* Un duel précis (pour la vue résultat / le realtime). */
export async function getDuel(id){
  if(!isSupabaseEnabled() || !id) return null;
  try{
    const { data, error } = await supabase
      .from('duels').select('*').eq('id', id).maybeSingle();
    if(error){ console.warn('[duels] getDuel:', error.message); return null; }
    return normalizeDuelRow(data);
  }catch{ return null; }
}

/* ── Bot d'entraînement (100 % local, sans enjeu, sans Supabase) ──
   Pour découvrir la mécanique quand personne n'est dispo. Le score
   cible est calculé À PARTIR du score du joueur pour rester
   compétitif (parfois on gagne, parfois on perd) — jamais impossible. */
export function makeBotName(){
  return BOT_NAMES?.length ? BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] : 'Barista';
}

/* Avatar du bot = le Robot Barista (un bot a une tête de bot).
   Valeur AvatarFigure = id premium 'avatar_robot'. */
export function makeBotAvatar(){
  return 'avatar_robot';
}

/* Score cible d'un bot autour du score joueur (higherWins : viser un peu
   au-dessus/en-dessous de manière serrée). Renvoie un entier ≥ 0. */
export function botTargetScore(myScore, higherWins = true){
  const s = Math.max(0, Math.floor(myScore) || 0);
  // ±25 % autour du score joueur → duel serré, issue incertaine
  const factor = 0.75 + Math.random() * 0.5;
  let target = Math.round(s * factor);
  if(higherWins && s === 0) target = Math.floor(Math.random() * 3); // évite 0 vs 0 systématique
  return Math.max(0, target);
}

/* Duel bot complet : le joueur a joué (myScore), on génère l'adversaire
   et on tranche. Renvoie { botName, botScore, outcome } où outcome ∈
   'win' | 'lose' | 'draw' (du point de vue du joueur). Sans enjeu. */
export function playBotDuel(myScore, higherWins = true){
  const botName = makeBotName();
  const botScore = botTargetScore(myScore, higherWins);
  // Ici le joueur est le "challenger", le bot est "l'opponent"
  const r = resolveDuelScores(higherWins, myScore, botScore);
  const outcome = r === 'draw' ? 'draw' : (r === 'challenger' ? 'win' : 'lose');
  return { botName, botScore, outcome };
}

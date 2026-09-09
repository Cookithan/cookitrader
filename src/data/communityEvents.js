/* ════════════════════════════════════════════════════
   communityEvents — Le Gâteau Géant (boss communautaire)
   ────────────────────────────────────────────────────
   Constantes du seul événement communautaire v1. Isolé exprès
   pour pouvoir brancher une ROTATION d'événements plus tard
   (cf. plan : "1 événement propre d'abord").

   ⚠️ Les valeurs marquées (SQL) DOIVENT rester synchro avec
   sql/MIGRATION_boss_communautaire.sql — elles y sont ré-imposées
   côté serveur (source de vérité anti-triche). Côté client elles
   ne servent qu'à l'UI (prédire le coût/dégâts, afficher le cooldown).

   Récompense (jamais de ☕ CF — vecteur de triche éco interdit) :
     · badge_fournee  (cosmétique, limited, cost:0)  si participation
       significative (myDamage ≥ REWARD_MIN_DAMAGE)
     · 🍪 plafonné selon le palier de contribution (REWARD_TIERS)
═══════════════════════════════════════════════════════ */

/* Seuil UNIQUE : UN SEUL boss, une seule fois, quand le cumul
   communautaire (somme users.total_earned) atteint 700 000.
   Pas récurrent — une fois créé il ne réapparaît jamais.
   (Nom MILESTONE_STEP conservé pour ne pas tout renommer ;
   c'est en réalité un seuil, pas un pas.) */
export const MILESTONE_STEP = 700_000;

/* Délai d'annonce : au passage du palier, un pop-up prévient
   "un boss arrive dans l'heure" — le boss n'est attaquable
   qu'après ANNOUNCE_LEAD_MS. (SQL) starts_at = now()+1h. */
export const ANNOUNCE_LEAD_MS = 60 * 60 * 1000;

/* Niveau mini pour VOIR/affronter le boss (cohérent avec le
   marché ouvert au niv 3). L'event se crée quand même côté
   serveur ; c'est juste la bannière/overlay qui est gatée. */
export const BOSS_LEVEL_MIN = 3;

/* PV de départ — (SQL) v_hp dans create_boss_event ET valeur du boss
   relancé manuellement (cf. sql/LAUNCH_BOSS_50K.sql). Constante de référence :
   l'UI lit en réalité boss_max_hp renvoyé par le serveur. 50 000 = relance
   plus courte que les 100 000 d'origine (tension assumée). */
export const BOSS_BASE_HP = 50_000;

/* Durée de combat — 3 jours (à partir de starts_at).
   (SQL) ends_at = starts_at + 72h. */
export const EVENT_DURATION_MS = 72 * 3600 * 1000;

/* ── Attaque "mixte" ──────────────────────────────────
   Tap gratuit limité par cooldown + boost payant en 🍪 pour
   un gros coup. Le serveur clamp un coup à MAX_DMG_PER_ATTACK
   (SQL c_max_dmg_per_attack=250) et cumule au plus
   MAX_DMG_PER_USER (SQL c_max_dmg_per_user=4000) par joueur. */
export const ATTACK_COOLDOWN_MS   = 2000;   // (SQL) c_cooldown = 2s
export const FREE_DMG             = 25;     // dégâts d'un tap gratuit
export const BOOST_COST_COOKIES   = 100;    // coût 🍪 du "Gros coup"
export const BOOST_DMG            = 150;    // dégâts du "Gros coup"
/* Plus de plafond serveur (anti-triche par-joueur retiré, demande
   Cookithan). Conservés pour info/UI éventuelle, non imposés côté SQL. */
export const MAX_DMG_PER_ATTACK   = 100000;
export const MAX_DMG_PER_USER     = 100000000;

/* ── Coup critique (premium) ──────────────────────────
   Coûte 1 ☕ CF. Gros dégâts (800) + EFFET : le gâteau est mis
   au sol ~5 s (cf. BossEventOverlay).
   ⚠️ C'est un COÛT en CF (sink), pas une source — conforme à la
   règle "jamais gagner de CF via le boss". */
export const SUPER_COST_CF = 1;
export const SUPER_DMG     = 1000;
export const SUPER_DOWN_MS = 5000;                // durée "à terre"

/* ── Récompense ───────────────────────────────────────
   UNIQUEMENT le SKIN EXCLUSIF "Cookie Mangeur" (cosmétique, non
   exploitable) débloqué dès qu'on a participé à une VICTOIRE.
   AUCUN cookie, AUCUN bonus, JAMAIS de ☕ CF (demande Cookithan :
   "ne donne pas de cookies, juste le skin"). */
export const REWARD_MIN_DAMAGE = 100;          // seuil "j'ai participé"
export const REWARD_SKIN_ID    = 'skin_mangeur';

/* Renvoie { skinId } si participation suffisante, sinon null. */
export function bossRewardFor(myDamage){
  const d = Number(myDamage) || 0;
  if(d < REWARD_MIN_DAMAGE) return null;
  return { skinId: REWARD_SKIN_ID };
}

/* Dégâts de l'attaque ADMIN (one-shot de test) — énorme, le serveur
   n'a plus de plafond donc les PV tombent direct à 0. */
export const ADMIN_DMG = 1_000_000_000;

/* Numéro de fournée lisible : palier / 100k (300000 → "Fournée #3"). */
export const fourneeNumber = (milestone) =>
  Math.max(1, Math.round((Number(milestone) || 0) / MILESTONE_STEP));

/* Clé applyPatchOnce d'auto-crédit (idempotent cross-device).
   Inclut startedAt (en secondes) → 1 claim PAR INSTANCE de boss :
   en prod les paliers ne se répètent jamais ; en dev, recréer le
   même palier (DELETE + create) donne un nouveau started_at donc
   un boss re-claimable (sinon le 2e test ne crédite jamais). */
export const bossClaimPatchKey = (milestone, startedAt = 0) =>
  `boss_defeated_${milestone}_${Math.floor((Number(startedAt) || 0) / 1000)}_v1`;

/* Pénalité d'échec : si le boss N'EST PAS vaincu à la fin du chrono,
   chaque joueur ayant participé ≥1 fois perd 1000 🍪 (puis sur le
   total_earned si solde insuffisant). 1 fois par instance de boss. */
export const FAIL_PENALTY_COOKIES = 1000;
export const bossFailPatchKey = (milestone, startedAt = 0) =>
  `boss_failed_${milestone}_${Math.floor((Number(startedAt) || 0) / 1000)}_v1`;

/* Récompense Top 1 du classement des coups : débloque la musique
   "boss" en permanence (id MUSICS = 'boss' → unlocked 'music_boss').
   Octroyée à la résolution (vaincu OU échoué) au plus gros tapeur. */
export const REWARD_MUSIC_ID = 'music_boss';
export const bossMusicPatchKey = (milestone, startedAt = 0) =>
  `boss_top1music_${milestone}_${Math.floor((Number(startedAt) || 0) / 1000)}_v1`;

/* Format compact d'un temps restant : "Xh", "Xh YYmin", "YYmin",
   "<1min". Stable pour les bannières. */
export function formatBossTimeLeft(ms){
  if(ms <= 0) return 'terminé';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if(h >= 1) return m > 0 ? `${h}h ${String(m).padStart(2,'0')}min` : `${h}h`;
  if(m >= 1) return `${m}min`;
  return '<1min';
}

-- ════════════════════════════════════════════════════
-- DETECT_SOLDES_ABERRANTS.sql — repérer les comptes gonflés par un exploit
-- ────────────────────────────────────────────────────
-- Contexte : l'exploit du mini-jeu Memory (corrigé en v1.30, commit
-- 4772bbd) versait la récompense en boucle pendant ~600 ms à la dernière
-- paire trouvée. Des milliers de cookies par partie, au lieu de 60 max.
--
-- Ce que l'exploit a gonflé :
--   · total_earned   (classement « Depuis le début »)
--   · weekly_earned  (classement hebdo → podium ☕)
--   · xp / level     (addCoins donne aussi de l'XP)
--   · cookies        (le solde dépensable)
-- Ce qu'il n'a PAS gonflé :
--   · total_play_time — incrémenté 1 fois par seconde d'onglet visible.
--     C'est le dénominateur honnête, et le cœur de la requête 1.
--
-- ⚠️ AUCUNE de ces requêtes ne modifie quoi que ce soit. Les corrections
--    sont en fin de fichier, commentées, à dégeler à la main.
--
-- À exécuter dans le SQL editor Supabase, requête par requête.
-- ════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────
-- 1. LE SIGNAL PRINCIPAL — cookies gagnés par minute de jeu
-- ─────────────────────────────────────────────────────
-- Repère : le meilleur jeu de l'app (Café Express) plafonne à ~300 🍪
-- pour 60 à 180 s de partie, soit ~100 à 300 🍪/min en enchaînant sans
-- jamais souffler. Les autres sont plafonnés (Flappy 200, Roue 200,
-- Machine à Sous 750 mais quota quotidien, Memory 60).
--   au-delà de  400 /min  → physiquement impossible
--   entre 150 et 400 /min → à regarder de près
--
-- ⚠️ ANGLE MORT À CONNAÎTRE : la colonne total_play_time a été ajoutée
--    APRÈS le lancement (cf. MIGRATION_total_play_time.sql). Les comptes
--    créés avant n'ont du temps comptabilisé que depuis cette migration :
--    leur ratio est mécaniquement surévalué SANS qu'ils aient triché.
--    Croiser systématiquement avec la requête 2 avant de conclure.
SELECT
  user_name,
  user_code,
  level,
  total_earned,
  cookies                                        AS solde_actuel,
  cafes,
  ROUND(total_play_time / 60.0)::int             AS minutes_jouees,
  ROUND(total_earned / (total_play_time / 60.0))::int AS cookies_par_minute,
  CASE
    WHEN total_earned / (total_play_time / 60.0) > 400 THEN 'IMPOSSIBLE'
    WHEN total_earned / (total_play_time / 60.0) > 150 THEN 'a verifier'
    ELSE 'plausible'
  END                                            AS verdict,
  join_date,
  last_active
FROM public.users
WHERE COALESCE(total_play_time, 0) >= 600          -- au moins 10 min de jeu
  AND COALESCE(total_earned, 0) > 0
ORDER BY cookies_par_minute DESC
LIMIT 40;


-- ─────────────────────────────────────────────────────
-- 2. L'ÉCART AU RESTE DES JOUEURS (sans dépendre du temps de jeu)
-- ─────────────────────────────────────────────────────
-- Contourne l'angle mort de la requête 1. Un exploit se voit à ce qu'il
-- décroche du peloton : x10 la médiane est déjà énorme, x50 ne s'explique
-- pas par du talent.
WITH reference AS (
  SELECT
    PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY total_earned) AS mediane,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_earned) AS p95
  FROM public.users
  WHERE COALESCE(total_earned, 0) > 0
    AND LOWER(user_name) NOT IN ('admin123', 'admin558')
)
SELECT
  u.user_name,
  u.user_code,
  u.level,
  u.total_earned,
  ROUND(r.mediane)::int                                   AS mediane_joueurs,
  ROUND(u.total_earned / NULLIF(r.mediane, 0), 1)         AS x_la_mediane,
  ROUND(u.total_earned / NULLIF(r.p95, 0), 1)             AS x_le_p95,
  u.last_active
FROM public.users u, reference r
WHERE COALESCE(u.total_earned, 0) > 0
  AND LOWER(u.user_name) NOT IN ('admin123', 'admin558')
ORDER BY u.total_earned DESC
LIMIT 25;


-- ─────────────────────────────────────────────────────
-- 3. LA SEMAINE EN COURS — attrape un abus récent
-- ─────────────────────────────────────────────────────
-- total_earned dilue un exploit dans l'historique d'un vétéran.
-- weekly_earned, remis à zéro chaque vendredi 18 h UTC, ne dilue rien :
-- c'est là qu'un abus des derniers jours saute aux yeux. C'est aussi ce
-- classement qui verse les ☕ du podium — donc celui qui compte.
SELECT
  user_name,
  user_code,
  level,
  weekly_earned,
  weekly_week_id,
  ROUND(total_play_time / 60.0)::int AS minutes_jouees_total,
  last_active
FROM public.users
WHERE COALESCE(weekly_earned, 0) > 0
  AND LOWER(user_name) NOT IN ('admin123', 'admin558')
ORDER BY weekly_earned DESC
LIMIT 25;


-- ─────────────────────────────────────────────────────
-- 4. LE CAS SIGNALÉ — Fedider
-- ─────────────────────────────────────────────────────
-- Il a signalé le bug lui-même : la fiche sert à mesurer l'écart, pas à
-- instruire un procès. Note son user_code, il sera nécessaire plus bas.
SELECT
  user_name, user_code, level, xp,
  total_earned, weekly_earned, cookies AS solde_actuel, cafes,
  ROUND(total_play_time / 60.0)::int   AS minutes_jouees,
  CASE WHEN total_play_time >= 60
       THEN ROUND(total_earned / (total_play_time / 60.0))::int END AS cookies_par_minute,
  join_date, last_active
FROM public.users
WHERE LOWER(user_name) LIKE '%fedider%';


-- ════════════════════════════════════════════════════
-- CORRECTIONS — TOUT CE QUI SUIT MODIFIE LA BASE
-- Rien ne s'exécute tant que les blocs sont commentés.
-- Toujours relancer la requête 4 AVANT et APRÈS.
-- ════════════════════════════════════════════════════

-- 5a. Ramener un compte à une valeur plausible.
--     Remplacer <CODE>, et les montants par ce que les requêtes ci-dessus
--     ont donné pour un joueur comparable en temps de jeu.
--     total_earned pilote le classement cumulé ; weekly_earned le podium
--     hebdo (et donc les ☕) ; cookies le solde dépensable.
--
-- UPDATE public.users
--    SET total_earned  = 12000,
--        weekly_earned = 0,
--        cookies       = 2000
--  WHERE user_code = '<CODE>';

-- 5b. Neutraliser seulement la semaine en cours (le podium ☕), en
--     laissant l'historique tranquille. C'est la correction la plus
--     douce : elle protège les autres joueurs sans punir le signaleur.
--
-- UPDATE public.users
--    SET weekly_earned = 0
--  WHERE user_code = '<CODE>';

-- 5c. Étiquette de sanction — À NE PAS UTILISER pour un joueur qui a
--     signalé le bug de lui-même. Elle ne se pose pas en SQL : ajouter
--     une entrée dans src/data/sanctions.js (SANCTIONED_USERS), qui
--     affiche un bandeau visible UNIQUEMENT par le compte concerné.


-- ─────────────────────────────────────────────────────
-- 6. SURVEILLANCE — à relancer une semaine après le déploiement du fix
-- ─────────────────────────────────────────────────────
-- Si plus personne ne dépasse 400 🍪/min, l'exploit est bien clos.
SELECT COUNT(*) AS comptes_encore_impossibles
FROM public.users
WHERE COALESCE(total_play_time, 0) >= 600
  AND total_earned / (total_play_time / 60.0) > 400;

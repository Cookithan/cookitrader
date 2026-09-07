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
-- RÉSULTATS DE L'ANALYSE — 2026-09-07 (33 comptes lus, 30 hors admins)
-- ────────────────────────────────────────────────────
-- Référence de rendement HONNÊTE : Miagguy, 918 minutes tracées (le plus
-- gros temps de jeu de la base) → 143 🍪/min. On retient 150 🍪/min comme
-- plafond plausible, volontairement au-dessus de lui.
--
-- L'angle mort de total_play_time est LEVÉ : la colonne a été ajoutée le
-- 2026-05-12 (commit v1.18.0). Tous les comptes signalés ci-dessous ont
-- au plus 1 jour de jeu non comptabilisé — insuffisant pour expliquer
-- l'écart. Les gros ratios de comptes inactifs depuis mai/juin
-- (Mustang46 820/min, Regislegoat 744, dokiller 373, LXP 354) SONT
-- l'angle mort, pas de la triche : peu de minutes tracées, dernière
-- connexion il y a des mois, hebdo à zéro. Ne pas y toucher.
--
-- ⚠️ DEUX comptes concernés, pas un.
--
--   Fedider (AZL-C8T) — niveau 25
--     447 min tracées · total_earned 176 938 → 396 🍪/min
--     plausible à 150/min : ~67 000  → environ 62 % de surplus
--     hebdo 53 072 = 63 % de TOUT ce que les joueurs ont gagné cette
--     semaine. A signalé le bug lui-même.
--
--   Le vrai Cooki (FPJ-LJK) — niveau 18
--     126 min tracées · total_earned 108 416 → 857 🍪/min, le pire ratio
--     de la base. Inscrit le 2026-07-03, DONC APRÈS la migration : son
--     temps de jeu est intégralement tracé, aucune excuse possible.
--     plausible à 150/min : ~19 000  → environ 82 % de surplus
--     hebdo 21 489 = 25 % de la semaine. N'a rien signalé.
--
--   À eux deux : 88 % des cookies gagnés par toute la communauté cette
--   semaine (84 280 au total). Les joueurs honnêtes de la semaine sont
--   150000Cookiaaronxbox (6 158) et Miagguy (3 561).
-- ════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════
-- CORRECTIONS — TOUT CE QUI SUIT MODIFIE LA BASE
-- Rien ne s'exécute tant que les blocs sont commentés.
-- Relancer la requête 4 AVANT et APRÈS.
-- ════════════════════════════════════════════════════

-- ─── A. LE MINIMUM VITAL : protéger le podium ☕ de la semaine ───────
-- Sans ça, Fedider et Le vrai Cooki raflent les 3 ☕ et 2 ☕ du podium
-- de vendredi 18 h UTC, aux dépens d'Aaron et Miagguy qui ont joué
-- normalement. C'est la seule correction qui lèse quelqu'un si on ne la
-- fait pas. Ne touche NI l'historique NI les soldes.
--
-- UPDATE public.users SET weekly_earned = 0
--  WHERE user_code IN ('AZL-C8T', 'FPJ-LJK');


-- ─── B. REMISE À PLAT COMPLÈTE (au cas par cas) ─────────────────────
-- Valeurs calculées au plafond généreux de 150 🍪/min, solde ramené
-- proportionnellement pour que le pouvoir d'achat suive.
--
-- Fedider — il a signalé le bug lui-même. Le rebalancer entièrement
-- revient à punir la seule personne qui a joué franc jeu en le disant.
-- Recommandation : s'en tenir au bloc A pour lui.
--
-- UPDATE public.users
--    SET total_earned = 67000, cookies = 18800, weekly_earned = 0
--  WHERE user_code = 'AZL-C8T';
--
-- Le vrai Cooki — pire ratio de la base, temps de jeu intégralement
-- tracé, n'a rien signalé. C'est ici que la remise à plat se justifie.
--
-- UPDATE public.users
--    SET total_earned = 19000, cookies = 700, weekly_earned = 0
--  WHERE user_code = 'FPJ-LJK';


-- ─── C. ÉTIQUETTE DE SANCTION ───────────────────────────────────────
-- Ne se pose pas en SQL : ajouter une entrée dans src/data/sanctions.js
-- (SANCTIONED_USERS), bandeau visible UNIQUEMENT par le compte concerné.
-- À NE PAS poser sur Fedider : il a signalé le bug.


-- ─────────────────────────────────────────────────────
-- 6. SURVEILLANCE — à relancer une semaine après le déploiement du fix
-- ─────────────────────────────────────────────────────
-- Si plus aucun compte ACTIF ne dépasse 400 🍪/min, l'exploit est clos.
-- (Les comptes inactifs depuis mai/juin resteront au-dessus : angle mort
--  de total_play_time, cf. en-tête. Filtrer sur last_active.)
SELECT user_name, user_code,
       ROUND(total_earned / (total_play_time / 60.0))::int AS cookies_par_minute,
       last_active
FROM public.users
WHERE COALESCE(total_play_time, 0) >= 600
  AND total_earned / (total_play_time / 60.0) > 400
  AND last_active > NOW() - INTERVAL '14 days'
ORDER BY cookies_par_minute DESC;

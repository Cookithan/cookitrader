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
-- RÉSULTATS DE L'ANALYSE — 2026-09-07 (33 comptes, 30 hors admins)
-- ════════════════════════════════════════════════════
--
-- ⚠️ TROIS DÉCOUVERTES QUI CHANGENT LE DIAGNOSTIC INITIAL
--
-- 1) LE BUG N'A PAS 2 SEMAINES, IL EN A NEUF.
--    L'exploit est né avec les Duels : commit ad8b331 du 2026-07-03,
--    déployé le jour même, qui a ajouté onDuelScore (fonction non
--    mémoïsée) aux dépendances de l'effet de fin de partie du Memory.
--    Preuve dans les podiums : Le vrai Cooki gagne la semaine du
--    2026-07-03 avec 13 341 cookies — contre 225 la semaine d'avant.
--    Il exploitait DES la première semaine où c'était possible.
--
-- 2) total_earned MENT — ET IL MINIMISE.
--    addCoins applique un cap anti-écart au leader (App.jsx ~1747) :
--      setTotalEarned(t => Math.min(cap, t + xpDelta))   cap = top2 x 1.20
--    Le classement cumulé est donc FIGÉ pour le n°1, pendant que ses
--    XP et son niveau continuent de monter normalement. C'est pour ça
--    que Fedider affiche 176 938 (seulement 1,15x le n°2) alors qu'il
--    est niveau 25 : atteindre le niveau 25 réclame ~418 800 cookies
--    de gains cumulés. Le vrai chiffre est là, pas dans total_earned.
--
--    -> Les signaux honnêtes sont le NIVEAU et weekly_earned
--       (ce dernier n'est pas plafonné).
--
-- 3) UN PODIUM A DÉJÀ ÉTÉ PAYÉ.
--    Semaine 2026-08-28, clôturée le 2026-09-04 (table weekly_winners) :
--       1. Fedider ......... 262 131  -> 3 cafés versés
--       2. Le vrai Cooki .... 70 982  -> 2 cafés versés
--       3. Miagguy .......... 16 758  -> 1 café versé
--    Pour mémoire, les vainqueurs des semaines normales : 570, 152,
--    1 457, 112, 106, 225… Les gagnants scorent en CENTAINES.
--    262 131, c'est 460x le vainqueur de la semaine précédente.
--    Miagguy aurait dû être 1er (3 cafés) et n'a eu que 1 café.
--
-- ────────────────────────────────────────────────────
-- LES DEUX COMPTES
-- ────────────────────────────────────────────────────
-- Référence honnête : Miagguy, 918 min tracées (le plus gros temps de
-- jeu de la base), niveau 18 -> 143 cookies/min. Plafond retenu : 150.
--
--   Fedider (AZL-C8T) — niveau 25, xp 60000 (plafond), 29 cafés
--     447 min tracées · 396 cookies/min affichés (sous-estimé, cf. 2)
--     hebdo en cours 53 072 = 63 % de TOUT ce que la communauté a gagné
--     cette semaine. A signalé le bug lui-même.
--     Niveau plausible pour 447 min a 150/min (~67 000) : NIVEAU 15
--
--   Le vrai Cooki (FPJ-LJK) — niveau 18, xp 2925, 0 café
--     126 min tracées · 857 cookies/min — le pire ratio de la base.
--     Inscrit le 2026-07-03, soit APRES la migration total_play_time
--     (2026-05-12) : son temps de jeu est intégralement tracé, aucune
--     excuse possible. Hebdo en cours 21 489 = 25 % de la semaine.
--     N'a rien signalé, et exploite depuis juillet.
--     Niveau plausible pour 126 min (~19 000) : NIVEAU 11
--     Pour comparaison : Miagguy est niveau 18 avec 918 min de jeu.
--
--   A eux deux : 88 % des cookies de la semaine en cours (84 280).
--   Aucun des deux n'a le succès end_game (+12 cafés) — vérifié.
--
-- ────────────────────────────────────────────────────
-- CE QUE LES AUTRES GROS RATIOS NE SONT PAS
-- ────────────────────────────────────────────────────
-- Mustang46 (820/min), Regislegoat (744), dokiller (373), LXP (354) :
-- ce n'est PAS de la triche. Peu de minutes tracées, hebdo à zéro,
-- dernière connexion en mai/juin. C'est l'angle mort de la colonne
-- total_play_time, ajoutée le 2026-05-12 alors qu'ils jouaient déjà.
-- NE PAS Y TOUCHER.


-- ════════════════════════════════════════════════════
-- CORRECTIONS — TOUT CE QUI SUIT MODIFIE LA BASE
-- Rien ne s'exécute tant que les blocs sont commentés.
-- Relancer la requête 4 AVANT et APRES.
-- ════════════════════════════════════════════════════

-- ─── A. URGENT : protéger le podium cafés de VENDREDI ───────────────
-- Sans ça, les deux mêmes raflent 3 et 2 cafés une SECONDE semaine
-- d'affilée, aux dépens d'Aaron (6 158) et Miagguy (3 561) qui jouent
-- normalement. Seule inaction qui lèse réellement quelqu'un.
-- Ne touche ni les niveaux ni l'historique.
--
-- UPDATE public.users SET weekly_earned = 0
--  WHERE user_code IN ('AZL-C8T', 'FPJ-LJK');


-- ─── B. LE NIVEAU — indispensable, et c'est le plus visible ─────────
-- Rebalancer total_earned NE SUFFIT PAS : le niveau est ce qui
-- déverrouille les mini-jeux, les paliers de boutique et les cafés de
-- palier. Les laisser à 25 et 18, c'est leur laisser tout le bénéfice.
-- xp remis à 0 = début du nouveau palier.
--
-- Fedider : 25 -> 15
-- UPDATE public.users
--    SET level = 15, xp = 0, total_earned = 67000, cookies = 18800,
--        weekly_earned = 0, cafes = 24
--  WHERE user_code = 'AZL-C8T';
--   (cafes 29 -> 24 : retire les 3 du podium volé + les 2 des paliers
--    20 et 25 jamais atteints légitimement. Les cafés des succès
--    level_6/10/15 lui restent, il les mérite au niveau 15.)
--
-- Le vrai Cooki : 18 -> 11
-- UPDATE public.users
--    SET level = 11, xp = 0, total_earned = 19000, cookies = 700,
--        weekly_earned = 0
--  WHERE user_code = 'FPJ-LJK';
--   (cafes déjà à 0 — les 2 du podium volé ont été dépensés, on ne peut
--    pas les reprendre sans retirer un objet acheté. Perte sèche.)


-- ─── C. RÉPARER LE PODIUM DÉJA PAYÉ (semaine 2026-08-28) ────────────
-- Miagguy (XN2-Z7M) était le vrai vainqueur : 1 café reçu au lieu de 3.
--
-- UPDATE public.users SET cafes = cafes + 2 WHERE user_code = 'XN2-Z7M';
--
-- Et corriger la trace du podium pour l'historique :
-- UPDATE public.weekly_winners
--    SET top1_code='XN2-Z7M', top1_name='Miagguy', top1_earned=16758,
--        top2_code=NULL, top2_name=NULL, top2_earned=0,
--        top3_code=NULL, top3_name=NULL, top3_earned=0
--  WHERE week_id = '2026-08-28';


-- ─── D. ÉTIQUETTE DE SANCTION ───────────────────────────────────────
-- Ne se pose pas en SQL : entrée dans src/data/sanctions.js, bandeau
-- visible UNIQUEMENT par le compte concerné.
--   · Fedider : A NE PAS SANCTIONNER. Il a signalé le bug lui-même.
--   · Le vrai Cooki : exploite depuis juillet sans rien dire, et a pris
--     un podium au passage. Seul cas où l'étiquette se défend.


-- ─────────────────────────────────────────────────────
-- 6. SURVEILLANCE — a relancer une semaine apres le fix
-- ─────────────────────────────────────────────────────
SELECT user_name, user_code, level,
       ROUND(total_earned / (total_play_time / 60.0))::int AS cookies_par_minute,
       weekly_earned, last_active
FROM public.users
WHERE COALESCE(total_play_time, 0) >= 600
  AND total_earned / (total_play_time / 60.0) > 400
  AND last_active > NOW() - INTERVAL '14 days'
ORDER BY cookies_par_minute DESC;

-- Le controle le plus parlant : un vainqueur hebdo a 5 chiffres est
-- anormal. Les semaines saines se gagnent en centaines.
SELECT week_id, top1_name, top1_earned
FROM public.weekly_winners
ORDER BY week_id DESC LIMIT 6;

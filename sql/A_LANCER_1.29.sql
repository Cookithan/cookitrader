-- ═════════════════════════════════════════════════════
--  A LANCER — correctifs v1.29  (Supabase → SQL Editor)
-- ═════════════════════════════════════════════════════
--
--  Colle CE fichier en entier et exécute. Tout est actif : les
--  autres fichiers (SANCTION_..., RESTAURER_...) sont volontairement
--  en commentaires, ils servent à comprendre le pourquoi. Celui-ci
--  sert à faire.
--
--  L annulation, c est les 3 tables de sauvegarde créées en étape 1 :
--    UPDATE public.users u SET level=s.level, total_earned=s.total_earned,
--           cookies=s.cookies, cafes=s.cafes, weekly_earned=s.weekly_earned,
--           unlocked=s.unlocked, active_theme=s.active_theme, active_title=s.active_title
--      FROM users_avant_129 s WHERE u.user_code = s.user_code;
--
--  ⚠️ ORDRE : ce SQL D ABORD, le déploiement ENSUITE. Déployer avant
--     montrerait les messages de sanction à des comptes encore intacts.

-- ─────────────────────────────────────────────────────
-- 1. SAUVEGARDE — à ne pas sauter
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users_avant_129   AS SELECT * FROM public.users;
CREATE TABLE IF NOT EXISTS pf_avant_129      AS SELECT * FROM public.market_portfolio;
CREATE TABLE IF NOT EXISTS winners_avant_129 AS SELECT * FROM public.weekly_winners;

-- ─────────────────────────────────────────────────────
-- 2. SANCTION — Fedider (AZL-C8T)
-- ─────────────────────────────────────────────────────
--    niv 25→15 · total 176938→67000 · hebdo 53072→0
--    cookies 49763→10800 (−8000 de pénalité) · cafés 29→14 (−10)
--    461 actions retirées · 23 objets retirés
UPDATE public.users SET
       level = 15, xp = 0,
       total_earned = 67000,
       cookies = 10800,
       cafes = 14,
       weekly_earned = 0,
       active_theme = '',
       active_title = '',
       unlocked = 'music_matin,theme_grains,theme_creme,badge_debutant,theme_espresso,badge_barista,avatar_chef,skin_caramel,avatar_robot,badge_tirelire,badge_aigle,badge_erudit,badge_cerveau,theme_or_limite,badge_tireur,badge_architecte,badge_sprinter,theme_trader,badge_investisseur,title_mousse,memory_saveurs,avatar_chat,theme_caramel,skin_noisette,catcher_nuit,avatar_renard,avatar_panda,catcher_champ,badge_chef,music_bossa,music_royale,avatar_loup,as_badge_whale,theme_legendaire,guess_italien,badge_legende,as_theme_lingot,avatar_legende,avatar_or,badge_connaisseur,title_caramel,pack_shares_5,avatar_sage,skin_onyx,title_cuivre,music_velvet,skin_emeraude,title_velours,theme_velours,skin_dore,title_or,badge_eternel,avatar_eternel,music_empereur,skin_cuir,theme_cuir,flappy_terrasse,pack_shares_10,theme_elixir,title_elixir,title_saveur,music_veillee,music_cosmique,as_theme_parquet,box_starter'
 WHERE user_code = 'AZL-C8T';
UPDATE public.market_portfolio SET shares = 0, total_invested = 0 WHERE user_code = 'AZL-C8T';

-- ─────────────────────────────────────────────────────
-- 3. SANCTION — Le vrai Cooki (FPJ-LJK)
-- ─────────────────────────────────────────────────────
--    niv 18→11 · total 108416→19000 · hebdo 21489→0
--    cookies 3832→700 · 306 actions retirées · 16 objets retirés
UPDATE public.users SET
       level = 11, xp = 0,
       total_earned = 19000,
       cookies = 700,
       cafes = 0,
       weekly_earned = 0,
       unlocked = 'theme_creme,chest_bronze,theme_caramel,as_badge_whale,skin_caramel,badge_noctambule,music_matin,badge_debutant,theme_espresso,box_starter,badge_barista,avatar_chef,memory_saveurs,avatar_robot,title_mousse,avatar_chat,catcher_nuit,skin_noisette,avatar_renard,avatar_panda,badge_chef,music_royale,catcher_champ,music_bossa,avatar_loup,badge_legende,avatar_or,guess_italien,theme_legendaire,avatar_legende,badge_connaisseur,title_caramel,avatar_sage,pack_shares_5,pack_shares_5'
 WHERE user_code = 'FPJ-LJK';
UPDATE public.market_portfolio SET shares = 0, total_invested = 0 WHERE user_code = 'FPJ-LJK';

-- ─────────────────────────────────────────────────────
-- 4. ACTIONS RENDUES — 16 joueurs
-- ─────────────────────────────────────────────────────
-- INSERT ... ON CONFLICT plutôt que 16 UPDATE : si une ligne a
-- disparu au reset du marché, un UPDATE ne toucherait rien en
-- silence. Ici elle est recréée. Relançable sans dégât.
INSERT INTO public.market_portfolio (user_code, shares, total_invested)
VALUES ('83F-LV2',327,0), ('FXF-9CK',221,0), ('AUY-KJ9',142,0),
       ('7Z4-977',90,0),  ('XN2-Z7M',76,0),  ('L7X-RDP',46,0),
       ('X6G-4ZL',42,0),  ('2VR-SFT',37,0),  ('5H5-ZA6',34,0),
       ('VEF-Q98',29,0),  ('TRC-XZS',8,0),   ('4EF-WR8',8,0),
       ('WAN-9KT',8,0),   ('H5X-X9Y',2,0),   ('43F-RB3',1,0),
       ('9US-FXX',1,0)
ON CONFLICT (user_code) DO UPDATE SET shares = EXCLUDED.shares;;

-- ─────────────────────────────────────────────────────
-- 5. PODIUM DE LA SEMAINE 2026-08-28
-- ─────────────────────────────────────────────────────
-- Les 2 premières places étaient fabriquées : tout le monde remonte.
--   1.Miagguy 16758   2.aaronxbox (n.c.)   3.LXP 64
-- Cafés : Miagguy avait déjà touché 1 en tant que 3e, d où +2 et non +3.
-- ⚠️ npm run audit trouve aaronxbox (221 cookies/min) et LXP (354/min)
--    au-dessus du plausible sans être sanctionnés. Si tu ne veux pas
--    leur verser ces cafés : saute leurs 2 lignes ici, et retire leur
--    bonus dans src/data/accountNotices.js AVANT de déployer.
UPDATE public.users SET cafes = cafes + 2 WHERE user_code = 'XN2-Z7M';  -- Miagguy  1er
UPDATE public.users SET cafes = cafes + 2 WHERE user_code = 'X6G-4ZL';  -- aaronxbox 2e
UPDATE public.users SET cafes = cafes + 1 WHERE user_code = 'FXF-9CK';  -- LXP       3e
UPDATE public.weekly_winners
   SET top1_code='XN2-Z7M', top1_name='Miagguy',              top1_earned=16758,
       top2_code='X6G-4ZL', top2_name='150000Cookiaaronxbox', top2_earned=0,
       top3_code='FXF-9CK', top3_name='LXP',                  top3_earned=64
 WHERE week_id = '2026-08-28';

-- ─────────────────────────────────────────────────────
-- 6. ÉTAT DU MARCHÉ
-- ─────────────────────────────────────────────────────
-- Recalculé, jamais en dur : reste juste même si tu as sauté une ligne.
UPDATE public.market_state
   SET shares_in_circulation = (SELECT COALESCE(SUM(shares),0) FROM public.market_portfolio)
 WHERE id = 1;

-- Le circuit breaker était posé jusqu en 2126 (2126 tapé pour 2026 —
-- le code n écrit jamais que now + 1 h). La v1.29 ferme le marché
-- proprement côté app, donc on nettoie le blocage accidentel.
UPDATE public.market_state SET circuit_breaker_until = NULL WHERE id = 1;

-- ─────────────────────────────────────────────────────
-- 7. VÉRIFICATION — doit correspondre aux chiffres annoncés
-- ─────────────────────────────────────────────────────
SELECT user_name, user_code, level, total_earned, weekly_earned, cookies, cafes
  FROM public.users WHERE user_code IN ('AZL-C8T','FPJ-LJK','XN2-Z7M','X6G-4ZL','FXF-9CK')
  ORDER BY total_earned DESC;

SELECT * FROM public.weekly_winners WHERE week_id = '2026-08-28';

SELECT (SELECT COALESCE(SUM(shares),0) FROM public.market_portfolio) AS somme_portefeuilles,
       (SELECT shares_in_circulation FROM public.market_state WHERE id=1) AS etat_marche;
-- les 2 colonnes doivent être égales (1072 attendu)

SELECT user_name, user_code, level, total_earned FROM public.users
  WHERE user_name NOT LIKE 'admin%' ORDER BY total_earned DESC LIMIT 6;
-- classement 'depuis le début' attendu : aaronxbox, Miagguy, dokiller, Vexed, LXP, Fedider

-- Puis, côté projet : merge + push, et pour finir  npm run audit

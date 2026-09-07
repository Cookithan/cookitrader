-- ════════════════════════════════════════════════════
-- RESTAURER_ACTIONS_CKM.sql — rendre les actions effacées au reset
-- ────────────────────────────────────────────────────
-- Régis a vidé les portefeuilles $CKM pour repartir de zéro sur le
-- marché. Les actions détenues à ce moment-là sont connues par la
-- capture du classement des traders (2026-09-07, 19 h 25) — reportées
-- ci-dessous, appariées aux user_code de la base.
--
-- ⚠️ TOUT EST COMMENTÉ. Décommenter après avoir tranché les 2 points
--    marqués À ARBITRER plus bas.
-- ⚠️ IRRÉVERSIBLE. Sauvegarder d'abord :
--    CREATE TABLE pf_avant_restauration AS SELECT * FROM public.market_portfolio;
--
-- NOTE SUR LES NOMS : « aaronxbox_288 #1 » de la capture correspond au
-- compte X6G-4ZL, aujourd'hui renommé « 150000Cookiaaronxbox ». Même
-- compte, vérifié via l'historique des podiums hebdo.
-- ════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────
-- À ARBITRER n°1 — Le vrai Cooki (FPJ-LJK), 500 actions
-- ─────────────────────────────────────────────────────
-- Tu as dit « à tous les joueurs sauf Fedider ». Or Le vrai Cooki est
-- le SECOND compte qui a exploité le bug du Memory — 857 cookies/min,
-- le pire rendement de toute la base, et 25 % des gains de la semaine
-- en cours. Lui rendre 500 actions (≈ 51 434 cookies de valeur, le plus
-- gros portefeuille du classement) annulerait la sanction préparée dans
-- SANCTION_EXPLOIT_MEMORY.sql, où on lui retire justement ses actions.
--
-- Les deux ne peuvent pas coexister. Choisir UNE ligne :
--
--   (a) il est traité comme Fedider — ne rien lui rendre :
--       ne décommenter aucune ligne le concernant.
--
--   (b) tu veux quand même le servir :
--       UPDATE public.market_portfolio SET shares = 500 WHERE user_code = 'FPJ-LJK';
--       ... et alors retirer la ligne « market_portfolio » de son bloc
--       dans SANCTION_EXPLOIT_MEMORY.sql, sinon l'une défait l'autre.


-- ─────────────────────────────────────────────────────
-- À ARBITRER n°2 — dokiller (7Z4-977), 90 actions
-- ─────────────────────────────────────────────────────
-- C'est le seul compte DÉJÀ sanctionné de l'app : src/data/sanctions.js
-- le liste pour « manipulation du marché $CKM (pump-and-dump) », le
-- 2026-05-10 — des achats/ventes massifs qui ont fait chuter le prix de
-- 123 à 80 cookies en 5 minutes, aux dépens des autres investisseurs.
-- Lui rendre ses actions de marché est une décision, pas une évidence.
-- Sa ligne est plus bas, commentée comme les autres : à toi de voir.


-- ─────────────────────────────────────────────────────
-- RESTAURATION — tous les autres joueurs
-- ─────────────────────────────────────────────────────
-- Fedider (AZL-C8T, 100 actions dans la capture) est EXCLU comme
-- demandé. Il détient aujourd'hui 461 actions rachetées après le reset
-- avec des cookies fabriqués : c'est le bloc sanction qui les remet à 0.

-- UPDATE public.market_portfolio SET shares = 327 WHERE user_code = '83F-LV2';  -- Regislegoat
-- UPDATE public.market_portfolio SET shares = 221 WHERE user_code = 'FXF-9CK';  -- LXP
-- UPDATE public.market_portfolio SET shares = 142 WHERE user_code = 'AUY-KJ9';  -- Mustang46
-- UPDATE public.market_portfolio SET shares =  90 WHERE user_code = '7Z4-977';  -- dokiller   ⚠️ cf. arbitrage n°2
-- UPDATE public.market_portfolio SET shares =  76 WHERE user_code = 'XN2-Z7M';  -- Miagguy
-- UPDATE public.market_portfolio SET shares =  46 WHERE user_code = 'L7X-RDP';  -- Régis (le vrai)
-- UPDATE public.market_portfolio SET shares =  42 WHERE user_code = 'X6G-4ZL';  -- 150000Cookiaaronxbox
-- UPDATE public.market_portfolio SET shares =  37 WHERE user_code = '2VR-SFT';  -- Bebou
-- UPDATE public.market_portfolio SET shares =  34 WHERE user_code = '5H5-ZA6';  -- ZeTroXx
-- UPDATE public.market_portfolio SET shares =  29 WHERE user_code = 'VEF-Q98';  -- Meno
-- UPDATE public.market_portfolio SET shares =   8 WHERE user_code = 'TRC-XZS';  -- Noa
-- UPDATE public.market_portfolio SET shares =   8 WHERE user_code = '4EF-WR8';  -- Slyzerx
-- UPDATE public.market_portfolio SET shares =   8 WHERE user_code = 'WAN-9KT';  -- Aka
-- UPDATE public.market_portfolio SET shares =   2 WHERE user_code = 'H5X-X9Y';  -- RyuuNoKamii
-- UPDATE public.market_portfolio SET shares =   1 WHERE user_code = '43F-RB3';  -- Razox
-- UPDATE public.market_portfolio SET shares =   1 WHERE user_code = '9US-FXX';  -- Epikseo

-- Certains de ces comptes n'ont plus de ligne en portefeuille (elle a pu
-- disparaître au reset). Cette version crée la ligne si besoin, et ne
-- casse rien si elle existe déjà — à préférer aux UPDATE ci-dessus si
-- une vérification montre des lignes manquantes.
--
-- INSERT INTO public.market_portfolio (user_code, shares, total_invested)
-- VALUES ('83F-LV2',327,0), ('FXF-9CK',221,0), ('AUY-KJ9',142,0),
--        ('7Z4-977',90,0),  ('XN2-Z7M',76,0),  ('L7X-RDP',46,0),
--        ('X6G-4ZL',42,0),  ('2VR-SFT',37,0),  ('5H5-ZA6',34,0),
--        ('VEF-Q98',29,0),  ('TRC-XZS',8,0),   ('4EF-WR8',8,0),
--        ('WAN-9KT',8,0),   ('H5X-X9Y',2,0),   ('43F-RB3',1,0),
--        ('9US-FXX',1,0)
-- ON CONFLICT (user_code) DO UPDATE SET shares = EXCLUDED.shares;


-- ─────────────────────────────────────────────────────
-- COHÉRENCE DU MARCHÉ — obligatoire après la restauration
-- ─────────────────────────────────────────────────────
-- market_state.shares_in_circulation doit égaler la somme des
-- portefeuilles, sinon le contrôle 5 de « npm run audit » lèvera une
-- alerte au prochain passage. Cette requête recalcule au lieu de coder
-- un total en dur : elle reste juste quel que soit l'arbitrage retenu.
--
-- UPDATE public.market_state
--    SET shares_in_circulation = (SELECT COALESCE(SUM(shares),0) FROM public.market_portfolio)
--  WHERE id = 1;

-- Rappel : le marché est aussi bloqué jusqu'en 2126 (2126 tapé pour
-- 2026 dans un UPDATE manuel — le code n'écrit jamais que now + 1 h).
-- Tant qu'il l'est, personne ne peut trader, restauration ou pas.
--
-- UPDATE public.market_state SET circuit_breaker_until = NULL WHERE id = 1;


-- ─────────────────────────────────────────────────────
-- VÉRIFICATION
-- ─────────────────────────────────────────────────────
SELECT p.user_code, u.user_name, p.shares
FROM public.market_portfolio p
LEFT JOIN public.users u ON u.user_code = p.user_code
ORDER BY p.shares DESC;

SELECT current_price, shares_in_circulation, total_shares_supply, circuit_breaker_until
FROM public.market_state;

-- La somme des portefeuilles doit correspondre à shares_in_circulation :
SELECT (SELECT COALESCE(SUM(shares),0) FROM public.market_portfolio) AS somme_portefeuilles,
       (SELECT shares_in_circulation FROM public.market_state WHERE id = 1) AS etat_marche;

-- Puis, côté projet :  npm run audit

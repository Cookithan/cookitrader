-- ════════════════════════════════════════════════════
-- RESTAURER_ACTIONS_CKM.sql — rendre les actions effacées au reset
-- ────────────────────────────────────────────────────
-- Cookithan a vidé les portefeuilles $CKM pour repartir de zéro sur le
-- marché. Les actions détenues à ce moment-là sont connues par la
-- capture du classement des traders (2026-09-07, 19 h 25) — reportées
-- ci-dessous, appariées aux user_code de la base.
--
-- ⚠️ TOUT EST COMMENTÉ. Les deux arbitrages sont tranchés : décommenter
--    les blocs dans l'ordre.
-- ⚠️ IRRÉVERSIBLE. Sauvegarder d'abord :
--    CREATE TABLE pf_avant_restauration AS SELECT * FROM public.market_portfolio;
--
-- NOTE SUR LES NOMS : « aaronxbox_288 #1 » de la capture correspond au
-- compte X6G-4ZL, aujourd'hui renommé « 150000Cookiaaronxbox ». Même
-- compte, vérifié via l'historique des podiums hebdo.
-- ⚠️⚠️ ORDRE OBLIGATOIRE : SQL D'ABORD, DÉPLOIEMENT ENSUITE.
--   L'économie est pilotée par le CLIENT. Au démarrage, l'app n'adopte
--   les valeurs du serveur que s'il est EN AVANCE (App.jsx, serverAhead
--   = total_earned ou cafes supérieurs). Une sanction fait BAISSER ces
--   valeurs : le joueur garde donc son localStorage gonflé et son upsert
--   automatique le repousse en base dans les 5 secondes. La correction
--   SQL serait effacée par le joueur lui-même, en silence.
--
--   La v1.30 règle ça : le message de compte (data/accountNotices.js)
--   force l'adoption des valeurs serveur, UNE SEULE FOIS par compte.
--   Mais ce mécanisme se consomme au premier passage — donc :
--     1. exécuter ce SQL
--     2. déployer la v1.30
--     3. vérifier avec npm run audit
--   Dans l'autre sens, le joueur ouvre l'app avant la correction, brûle
--   son message pour rien, et repousse ses anciennes valeurs.
-- ════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────
-- TRANCHÉ — Le vrai Cooki (FPJ-LJK) : RIEN NE LUI EST RENDU
-- ─────────────────────────────────────────────────────
-- Décision de Cookithan (2026-09-07) : il rejoint Fedider du côté des
-- comptes sanctionnés. Ses 500 actions de la capture ne sont donc PAS
-- restaurées, et le bloc de SANCTION_EXPLOIT_MEMORY.sql qui remet son
-- portefeuille à 0 reste valable. Les deux fichiers sont cohérents.
--
-- Rappel du motif : 857 cookies/min, le pire rendement de toute la
-- base, et 25 % des gains de la communauté sur la semaine en cours.

-- ─────────────────────────────────────────────────────
-- TRANCHÉ — dokiller (7Z4-977) : ses 90 actions lui sont RENDUES
-- ─────────────────────────────────────────────────────
-- Décision de Cookithan (2026-09-07). Sa sanction de mai 2026 portait sur
-- la manipulation du prix, pas sur l'origine de ses actions : celles-ci
-- ont été acquises normalement, et effacées par la remise à zéro du
-- marché comme celles de tout le monde. Sa ligne est donc à décommenter
-- avec les autres.

-- ─────────────────────────────────────────────────────
-- RESTAURATION — tous les autres joueurs
-- ─────────────────────────────────────────────────────
-- Fedider (AZL-C8T, 100 actions dans la capture) est EXCLU comme
-- demandé. Il détient aujourd'hui 461 actions rachetées après le reset
-- avec des cookies fabriqués : c'est le bloc sanction qui les remet à 0.

-- UPDATE public.market_portfolio SET shares = 327 WHERE user_code = '83F-LV2';  -- Regislegoat
-- UPDATE public.market_portfolio SET shares = 221 WHERE user_code = 'FXF-9CK';  -- LXP
-- UPDATE public.market_portfolio SET shares = 142 WHERE user_code = 'AUY-KJ9';  -- Mustang46
-- UPDATE public.market_portfolio SET shares =  90 WHERE user_code = '7Z4-977';  -- dokiller
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

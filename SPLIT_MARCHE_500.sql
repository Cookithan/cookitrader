/* ══════════════════════════════════════════════════════════════════
   SPLIT_MARCHE_500.sql — passage du marché $CKM à l'échelle 500
   ──────────────────────────────────────────────────────────────────
   À COLLER DANS L'ÉDITEUR SQL SUPABASE, EN UNE FOIS, APRÈS AVOIR
   DÉPLOYÉ LE CODE DE LA 1.30. (Leçon de la 1.29 : le déploiement
   d'abord, le SQL ensuite.)

   CE QUE ÇA FAIT
   ──────────────
   Le prix de l'action passe de 100 à 500. Pour que personne ne gagne
   ni ne perde un cookie au passage, les portefeuilles subissent un
   regroupement d'actions de 5 pour 1 : 5 anciennes actions à 100
   deviennent 1 nouvelle action à 500.

     Regislegoat : 327 actions × 100 = 32 700 🍪
                 →  66 actions × 500 = 33 000 🍪   (arrondi à son avantage)

   Sans ce regroupement, les 1 072 actions en circulation passeraient
   de 107 200 à 536 000 🍪 de valeur — soit près du DOUBLE de tous les
   cookies que possèdent les 33 comptes du jeu réunis (275 300 🍪),
   créés à partir de rien. Deux jours après avoir sanctionné deux
   comptes pour exactement ça.

   LE PRIX DE REVIENT, AUSSI
   ─────────────────────────
   La restitution de la 1.29 (creditFreeShares) a rendu les actions
   sans leur prix d'achat : 15 porteurs sur 16 ont un total_invested
   à 0. Conséquence, revendre leur rapportait 100 % de « plus-value »
   — et le bonus de hold, qui DOUBLE la plus-value au bout d'une
   semaine, aurait transformé 107 200 🍪 d'actions en 214 400 🍪.
   Une mine sous la réouverture, indépendante du changement d'échelle.

   On répare : quand le prix de revient est absent, on l'inscrit à la
   valeur des actions au moment du don (nouvelles actions × 500). Le
   joueur retrouve exactement sa valeur, mais elle cesse d'être
   comptée comme un profit. Quand le prix de revient existe (un seul
   compte, 150000Cookiaaronxbox, 3 027 🍪), on n'y touche pas : sa
   plus-value latente est réelle et lui reste acquise.

   IDEMPOTENT ? NON.
   ─────────────────
   Ce script divise les actions par 5. Le lancer deux fois les divise
   par 25. Le garde-fou est en tête : il refuse de tourner si le prix
   est déjà à 500. Ne pas le contourner.
══════════════════════════════════════════════════════════════════ */

/* ── 0. Photo AVANT (à garder sous les yeux) ─────────────────── */
select 'AVANT' as moment,
       (select current_price          from market_state where id = 1) as prix,
       (select shares_in_circulation  from market_state where id = 1) as circulation,
       (select total_shares_supply    from market_state where id = 1) as flottant,
       (select count(*)               from market_portfolio where shares > 0) as porteurs,
       (select coalesce(sum(shares),0) from market_portfolio where shares > 0) as actions_detenues;

/* ── 1. Garde-fou anti double exécution ──────────────────────── */
do $$
begin
  if (select current_price from market_state where id = 1) >= 400 then
    raise exception
      'SPLIT DÉJÀ APPLIQUÉ — le prix est à %. Ne pas relancer ce script : il diviserait encore les actions par 5.',
      (select current_price from market_state where id = 1);
  end if;
end $$;

/* ── 2. Le regroupement 5 pour 1 ─────────────────────────────── */
/* CEIL et non ROUND : l'arrondi va TOUJOURS dans le sens du joueur.
   327 actions donneraient 65,4 → on en donne 66, soit 33 000 🍪 pour
   32 700 🍪 auparavant. Personne ne peut ouvrir l'app et constater
   qu'il y a perdu quelque chose, ce qui vaut largement les ~2 %
   d'actions supplémentaires que ça coûte (222 au lieu de 215).
   CEIL règle aussi le cas des porteurs de 1 et 2 actions, qui
   tomberaient à zéro avec un arrondi mathématique.                  */
update market_portfolio
set
  shares = ceil(shares / 5.0)::int,
  total_invested = case
    /* prix de revient absent (actions rendues en 1.29) → on l'inscrit
       à la valeur du jour : plus de faux profit, plus de bonus de hold
       sur du vide */
    when coalesce(total_invested, 0) = 0
      then ceil(shares / 5.0)::int * 500
    /* prix de revient réel → inchangé : il est déjà exprimé en cookies
       dépensés, et la valeur du portefeuille ne bouge pas non plus.
       La plus-value latente est donc préservée à l'identique. */
    else total_invested
  end,
  /* On remet les deux horloges à zéro : le bonus de hold repart de la
     réouverture (personne n'a pu trader pendant la fermeture), et les
     frais de garde ne peuvent donc pas tomber dans les 8 jours. */
  weighted_buy_at = now(),
  updated_at      = now()
where shares > 0;

/* ── 3. L'état du marché ─────────────────────────────────────── */
update market_state
set
  current_price         = 500,
  shares_in_circulation = (select coalesce(sum(shares), 0) from market_portfolio where shares > 0),
  /* Flottant ramené à l'échelle du jeu : à 500 🍪 l'action, les
     275 300 🍪 de tous les comptes réunis n'en achètent que ~550.
     Afficher « 9 785 actions disponibles » ne voulait plus rien dire.
     ⚠️ Doit rester égal à MARKET_CONFIG.TOTAL_SHARES (lib/market.js). */
  total_shares_supply   = 2000,
  circuit_breaker_until = null,
  last_inflation_at     = now(),
  last_updated          = now()
where id = 1;

/* ── 3b. Photo d'après-split, pour pouvoir revenir ───────────── */
/* On va éprouver le marché en conditions réelles avant de le rouvrir
   aux joueurs (ouverture forcée en dev uniquement, cf.
   VITE_MARKET_FORCE_OPEN). Ces ordres-là sont de VRAIS ordres : ils
   bougent le cours et consomment le flottant. Cette table garde donc
   l'état exact du marché juste après le regroupement, pour que
   RESET_APRES_ESSAIS.sql puisse tout remettre d'aplomb avant la
   réouverture. Elle ne sert à rien d'autre et peut être supprimée
   une fois le marché rouvert. */
drop table if exists market_apres_split;

create table market_apres_split as
select user_code,
       shares,
       total_invested,
       weighted_buy_at,
       now() as snapshot_at
from market_portfolio
where shares > 0;

/* ── 4. La courbe ────────────────────────────────────────────── */
/* L'historique est tout entier à l'échelle 100 : le garder ferait
   apparaître un mur vertical de 100 à 500 sur le graphe 24 h, que
   personne n'a provoqué. On le vide et on repose un point de départ
   propre à 500. (market_transactions n'est PAS touchée : npm run audit
   s'en sert — le feed, lui, ne regarde plus que les 7 derniers jours.) */
delete from market_history;

insert into market_history (price, shares_circulating)
values (500, (select shares_in_circulation from market_state where id = 1));

/* ── 5. Photo APRÈS ──────────────────────────────────────────── */
select 'APRÈS' as moment,
       (select current_price          from market_state where id = 1) as prix,
       (select shares_in_circulation  from market_state where id = 1) as circulation,
       (select total_shares_supply    from market_state where id = 1) as flottant,
       (select count(*)               from market_portfolio where shares > 0) as porteurs,
       (select coalesce(sum(shares),0) from market_portfolio where shares > 0) as actions_detenues;

/* Détail par joueur — la colonne `valeur` doit être égale ou très
   légèrement supérieure à l'ancienne (actions_avant × 100). Aucun
   joueur ne doit y perdre : si c'est le cas, le script n'a pas
   tourné avec CEIL. Si un joueur voit sa valeur divisée par 5,
   le script a été lancé deux fois. */
select u.user_name,
       p.shares                        as actions,
       p.shares * 500                  as valeur,
       p.total_invested                as prix_de_revient,
       p.shares * 500 - p.total_invested as plus_value_latente
from market_portfolio p
left join users u on u.user_code = p.user_code
where p.shares > 0
order by p.shares desc;

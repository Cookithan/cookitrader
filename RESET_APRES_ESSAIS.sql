/* ══════════════════════════════════════════════════════════════════
   RESET_APRES_ESSAIS.sql — efface nos essais, garde le marché neuf
   ──────────────────────────────────────────────────────────────────
   À LANCER JUSTE AVANT DE ROUVRIR LE MARCHÉ AUX JOUEURS.

   Pendant la mise au point de la 1.30, le marché est ouvert chez nous
   (VITE_MARKET_FORCE_OPEN dans .env.local) et fermé pour tout le monde
   d'autre (MARKET_CONFIG.CLOSED). Nos ordres d'essai sont donc de VRAIS
   ordres : ils déplacent le cours, consomment le flottant, remplissent
   le fil d'activité et la courbe.

   Ce script remet tout dans l'état de la photo prise juste après
   SPLIT_MARCHE_500.sql. Les joueurs retrouvent exactement le marché
   qu'ils auraient eu si on n'y avait jamais touché : le cours à 500,
   leurs actions intactes, une courbe vierge, aucun ordre fantôme dans
   le fil.

   IDEMPOTENT : oui. On peut le relancer autant de fois qu'on veut,
   entre deux séances d'essais comme à la fin.

   ⚠️ Il ne rend PAS les cookies dépensés en essais : l'économie du
   joueur est pilotée par son appareil (cf. la leçon de la 1.29), une
   correction SQL sur `users` serait réécrasée en cinq secondes. Le
   remède, c'est de revendre ses actions d'essai avant de lancer ce
   script — l'aller-retour ne coûte que le slippage, quelques pour cent.
══════════════════════════════════════════════════════════════════ */

/* ── 0. Garde-fou : la photo doit exister ET ne pas être vide ── */
/* Le second contrôle n'est pas une politesse. Plus bas, tout
   portefeuille ABSENT de la photo est remis à zéro — c'est ce qui
   efface les comptes de test. Si la photo était vide, cette règle
   viderait les portefeuilles de TOUS LES JOUEURS d'un coup. Mieux vaut
   un script qui refuse de tourner qu'un script qui ruine seize
   personnes en silence. */
do $$
declare n int;
begin
  if to_regclass('public.market_apres_split') is null then
    raise exception
      'Photo introuvable — market_apres_split n''existe pas. Lance SPLIT_MARCHE_500.sql d''abord : sans elle, impossible de savoir à quoi ressemblait le marché avant les essais.';
  end if;
  select count(*) into n from market_apres_split;
  if n = 0 then
    raise exception
      'Photo VIDE — market_apres_split ne contient aucune ligne. Ne pas continuer : le script remettrait à zéro tous les portefeuilles. Refaire la photo à la main : create table market_apres_split as select user_code, shares, total_invested, weighted_buy_at, now() as snapshot_at from market_portfolio where shares > 0;';
  end if;
end $$;

/* ── 1. Photo AVANT nettoyage ────────────────────────────────── */
select 'AVANT nettoyage' as moment,
       (select current_price         from market_state where id = 1) as prix,
       (select shares_in_circulation from market_state where id = 1) as circulation,
       (select count(*) from market_transactions
         where created_at >= (select min(snapshot_at) from market_apres_split)) as ordres_d_essai,
       (select count(*) from market_history
         where recorded_at >= (select min(snapshot_at) from market_apres_split)) as points_d_essai;

/* ── 2. Les portefeuilles reviennent à l'après-split ─────────── */
update market_portfolio p
set shares          = s.shares,
    total_invested  = s.total_invested,
    weighted_buy_at = s.weighted_buy_at,
    /* On remet les horloges de cooldown à zéro : sans ça, un joueur
       pourrait se voir refuser sa première vente à la réouverture à
       cause d'un de NOS achats d'essai. */
    last_buy_at     = null,
    last_sell_at    = null,
    updated_at      = now()
from market_apres_split s
where s.user_code = p.user_code;

/* Portefeuilles apparus PENDANT les essais (comptes de test, ou joueur
   qui n'avait aucune action avant) : remis à zéro, ces actions-là
   n'ont jamais existé pour de vrai. */
update market_portfolio
set shares = 0, total_invested = 0, last_buy_at = null, last_sell_at = null, updated_at = now()
where user_code not in (select user_code from market_apres_split);

/* ── 3. Les ordres et la courbe d'essai disparaissent ────────── */
delete from market_transactions
where created_at >= (select min(snapshot_at) from market_apres_split);

delete from market_history
where recorded_at >= (select min(snapshot_at) from market_apres_split);

/* ── 4. L'état du marché ─────────────────────────────────────── */
update market_state
set current_price         = 500,
    shares_in_circulation = (select coalesce(sum(shares), 0) from market_portfolio where shares > 0),
    total_shares_supply   = 2000,
    /* Un circuit breaker déclenché pendant nos essais fermerait le
       marché à la figure des joueurs le jour de la réouverture. */
    circuit_breaker_until = null,
    last_inflation_at     = now(),
    last_updated          = now()
where id = 1;

/* Un point de départ propre pour la courbe. */
insert into market_history (price, shares_circulating)
values (500, (select shares_in_circulation from market_state where id = 1));

/* ── 5. Photo APRÈS ──────────────────────────────────────────── */
select 'APRÈS nettoyage' as moment,
       (select current_price          from market_state where id = 1) as prix,
       (select shares_in_circulation  from market_state where id = 1) as circulation,
       (select count(*)               from market_transactions) as ordres_restants,
       (select count(*)               from market_history) as points_restants,
       (select count(*) from market_portfolio where shares > 0) as porteurs;

/* Le prix doit valoir 500, la circulation doit être égale à la somme
   de la photo, et il ne doit rester qu'UN point de courbe. Si la
   circulation diffère, c'est qu'un portefeuille a été créé ou vidé
   en dehors des essais — regarder le détail ci-dessous. */
select u.user_name, p.shares as actions_maintenant, s.shares as actions_photo
from market_portfolio p
left join market_apres_split s on s.user_code = p.user_code
left join users u on u.user_code = p.user_code
where coalesce(p.shares, 0) <> coalesce(s.shares, 0)
order by p.shares desc;

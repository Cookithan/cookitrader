/* ══════════════════════════════════════════════════════════════════
   PROTEGER_LE_PRIX.sql — le cours ne peut plus être saboté
   ──────────────────────────────────────────────────────────────────
   À COLLER EN UNE FOIS DANS L'ÉDITEUR SQL SUPABASE.

   CE QUI S'EST PASSÉ LE 08/09/2026 À 08h08
   ────────────────────────────────────────
   Le cours est tombé de 505 à EXACTEMENT 300, sans le moindre ordre
   d'achat ou de vente. 300, c'est l'ancien PRICE_MAX — celui de la
   1.27, la version que les joueurs avaient encore sur leur téléphone.

   Dans cette version, maintenanceTick écrivait le prix toutes les
   quelques secondes et le bornait par Math.min(PRICE_MAX, prix). Un
   seul joueur qui n'avait pas rechargé l'app suffisait donc à raboter
   le marché à 300 en boucle. Le code déployé aujourd'hui, lui, ne
   touche plus jamais au prix en dehors d'un achat ou d'une vente.

   D'où les deux verrous ci-dessous. Le premier vaut pour toujours, le
   second nettoie la situation actuelle.

   ⚠️ POURQUOI CÔTÉ BASE ET PAS CÔTÉ APP : l'économie est pilotée par
   le client (RLS permissive), donc n'importe quelle version installée
   peut écrire dans market_state. Corriger le code ne protège que ceux
   qui l'ont téléchargé. Cette garde-là s'applique à tout le monde,
   y compris aux versions qu'on ne contrôle plus.
══════════════════════════════════════════════════════════════════ */

/* ── VERROU 1 : une garde en base sur le prix ─────────────────
   Toute écriture qui sort des bornes du jeu, ou qui déplace le cours
   de plus de 15 % d'un coup, est ignorée : on conserve l'ancien prix
   au lieu de refuser la transaction. Refuser ferait échouer tout
   l'UPDATE, et le joueur verrait une erreur pour un ordre légitime.

   15 %, parce qu'aucun ordre honnête ne peut faire mieux : le code
   plafonne l'impact d'une transaction à 10 % (MAX_PRICE_IMPACT_PCT).
   Le rabotage à 300 depuis 505, lui, fait −40 % : rejeté.

   ⚠️ Les bornes doivent rester égales à MARKET_CONFIG.PRICE_MIN et
   PRICE_MAX dans src/lib/market.js. Si tu changes l'échelle des prix
   un jour, change les deux, sinon plus personne ne pourra trader.  */

create or replace function public.market_price_guard()
returns trigger
language plpgsql
as $$
declare
  borne_basse constant numeric := 100;    -- MARKET_CONFIG.PRICE_MIN
  borne_haute constant numeric := 2500;   -- MARKET_CONFIG.PRICE_MAX
  saut_max    constant numeric := 0.15;   -- 15 % en une seule écriture
begin
  /* Trappe de secours : pour une correction manuelle légitime (c'est
     exactement ce qu'il a fallu faire ce matin pour remonter de 300 à
     500), désarmer la garde le temps d'une session :

       select set_config('app.market_guard_off', '1', false);
       update market_state set current_price = 500 where id = 1;
       select set_config('app.market_guard_off', '0', false);          */
  if coalesce(current_setting('app.market_guard_off', true), '0') = '1' then
    return new;
  end if;

  if new.current_price is null or old.current_price is null then
    return new;
  end if;

  /* Hors des bornes du jeu → on garde l'ancien prix. */
  if new.current_price < borne_basse or new.current_price > borne_haute then
    new.current_price := old.current_price;
    return new;
  end if;

  /* Saut trop violent pour être un ordre honnête → on garde l'ancien. */
  if old.current_price > 0
     and abs(new.current_price - old.current_price) / old.current_price > saut_max then
    new.current_price := old.current_price;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_market_price_guard on public.market_state;

create trigger trg_market_price_guard
  before update on public.market_state
  for each row
  execute function public.market_price_guard();

/* ── VERROU 2 : évincer les clients restés sur l'ancien code ──
   force_version fait apparaître la modale « Mise à jour disponible »
   chez tous ceux dont la version installée n'est pas 1.30.0, et les
   fait recharger. C'est ce qui tarit la source du problème : tant
   qu'un seul téléphone tourne en 1.27, il réécrit le prix.

   À remettre à NULL une fois que tout le monde est passé, sinon la
   modale rebondira à la prochaine version.                          */
update public.system_status
set force_version = '1.30.0',
    updated_at    = now()
where id = 1;

/* ── VÉRIFICATION ─────────────────────────────────────────────── */
select 'garde installée' as verrou,
       tgname            as trigger,
       (select force_version from public.system_status where id = 1) as version_forcee,
       (select current_price from public.market_state where id = 1)  as prix_actuel
from pg_trigger
where tgname = 'trg_market_price_guard';

/* ── ESSAI À BLANC ─ la garde bloque-t-elle vraiment ? ────────
   On tente l'écriture exacte qui a cassé le marché ce matin (300), puis
   on regarde si elle a pris. Si par malheur elle passait, le bloc
   restaure immédiatement le prix d'origine — cet essai ne peut donc pas
   casser quoi que ce soit, même si la garde est mal installée.        */
do $$
declare
  avant numeric;
  apres numeric;
begin
  select current_price into avant from public.market_state where id = 1;

  update public.market_state set current_price = 300 where id = 1;

  select current_price into apres from public.market_state where id = 1;

  if apres is distinct from avant then
    perform set_config('app.market_guard_off', '1', false);
    update public.market_state set current_price = avant where id = 1;
    perform set_config('app.market_guard_off', '0', false);
    raise warning 'ECHEC : la garde n a pas bloque le sabotage. Prix restaure a %. Ne pas quitter sans comprendre pourquoi.', avant;
  else
    raise notice 'OK : la tentative de sabotage a 300 a ete ignoree, le cours est reste a %.', avant;
  end if;
end $$;

/* Le prix doit être celui d'avant l'essai (567 au moment où ce script
   a été écrit), surtout pas 300. */
select current_price as prix_apres_essai,
       shares_in_circulation as actions_detenues
from public.market_state
where id = 1;

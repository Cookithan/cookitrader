/* ══════════════════════════════════════════════════════════════════
   A_LANCER_MAINTENANT.sql — les deux chantiers du 08/09/2026 au soir
   ──────────────────────────────────────────────────────────────────
   UN SEUL FICHIER, À COLLER TEL QUEL DANS L'ÉDITEUR SQL SUPABASE.
   Idempotent : le relancer ne casse rien.

   Il contient, dans cet ordre :

     1. LA GARDE DU PRIX — pour que le cours ne puisse plus être
        ramené à 300 par un client resté sur l'ancienne version, plus
        force_version pour évincer ces clients.

     2. LES TABLES DE LA SENTINELLE — la vigie qui surveille l'app
        toute seule et rapporte versions, crashs, triche et marché.

     3. LA GARDE DES SANCTIONS — pour qu'une correction faite à la main
        ne puisse plus être effacée par un vieil appareil, et la remise à
        la sanction de Fedider.

     4. LE MUR EN BASE — pour qu'un compte qui refait le geste EXPRÈS ne
        puisse plus remonter ses chiffres, quelle que soit sa version.

   Les deux sont indépendants : si l'un échoue, relancer le fichier
   n'abîme pas ce qui est déjà passé.
══════════════════════════════════════════════════════════════════ */


/* ══════════════════════════════════════════════════════════════════
   PARTIE 1 — LA GARDE DU PRIX
══════════════════════════════════════════════════════════════════ */

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



/* ══════════════════════════════════════════════════════════════════
   PARTIE 2 — LA SENTINELLE
══════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════
   MIGRATION_SENTINELLE.sql — les tables de la sentinelle
   ──────────────────────────────────────────────────────────────────
   À EXÉCUTER UNE SEULE FOIS dans l'éditeur SQL Supabase. Idempotent :
   le relancer ne casse rien.

   POURQUOI
   ────────
   Le 08/09/2026, le cours du marché est tombé à 300 parce qu'un joueur
   tournait encore sur une version de juillet. Personne ne l'a vu venir,
   et il a fallu deviner la cause après coup. Avant ça, l'exploit du
   Memory est resté neuf semaines en ligne sans qu'aucun signal ne
   parte — il a été découvert parce qu'un joueur l'a dit.

   La sentinelle existe pour que la prochaine anomalie se signale
   d'elle-même. Elle tourne sans PC, sans ligne de commande, et sans
   personne pour la lancer : chaque client qui ouvre l'app y contribue.

   TROIS TABLES
   ────────────
   · app_health          — ce que les clients rapportent en continu :
                           quelle version ils font tourner, quand ils
                           plantent, quand l'anti-triche se déclenche.
   · sentinelle_rapports — les verdicts des rondes (ok / voir / alerte).
   · sentinelle_etat     — l'horloge partagée, pour qu'une ronde ne soit
                           pas rejouée par chaque client à la seconde.

   RLS : les clients doivent pouvoir ÉCRIRE dans app_health (sinon rien
   ne remonte) et LIRE les rapports. Ils ne peuvent rien effacer. C'est
   volontairement permissif, comme le reste du projet — un client
   malveillant peut donc mentir sur son propre rapport. La sentinelle
   est un tableau de bord de santé, pas une preuve opposable : ce qui
   fait foi reste les chiffres du serveur (cookies, actions, classement),
   que les rondes recoupent justement.
══════════════════════════════════════════════════════════════════ */

/* ── 1. Ce que les clients rapportent ─────────────────────────── */
create table if not exists public.app_health (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  /* 'ouverture' | 'crash' | 'triche' */
  kind         text        not null,
  user_code    text,
  user_name    text,
  app_version  text,
  plateforme   text,
  detail       text
);

create index if not exists app_health_created_idx on public.app_health (created_at desc);
create index if not exists app_health_kind_idx    on public.app_health (kind, created_at desc);

/* ── 2. Les verdicts des rondes ───────────────────────────────── */
create table if not exists public.sentinelle_rapports (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  /* 'ok' | 'voir' | 'alerte' */
  verdict     text        not null,
  categorie   text        not null,
  titre       text        not null,
  detail      text[]
);

create index if not exists sentinelle_rapports_idx on public.sentinelle_rapports (created_at desc);

/* ── 3. L'horloge partagée ────────────────────────────────────── */
/* Sans elle, les dix clients ouverts en même temps lanceraient dix
   rondes identiques par minute. Le premier qui arrive pose l'heure,
   les autres voient que c'est déjà fait et passent leur chemin. */
create table if not exists public.sentinelle_etat (
  id              int primary key default 1 check (id = 1),
  derniere_ronde  timestamptz,
  updated_at      timestamptz not null default now()
);

insert into public.sentinelle_etat (id, derniere_ronde)
values (1, null)
on conflict (id) do nothing;

/* ── 4. RLS ───────────────────────────────────────────────────── */
alter table public.app_health          enable row level security;
alter table public.sentinelle_rapports enable row level security;
alter table public.sentinelle_etat     enable row level security;

do $$
begin
  /* app_health : chacun écrit son rapport, tout le monde peut lire
     (l'écran Sentinelle en a besoin), personne n'efface. */
  if not exists (select 1 from pg_policies where tablename = 'app_health' and policyname = 'app_health_lecture') then
    create policy app_health_lecture on public.app_health for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'app_health' and policyname = 'app_health_ecriture') then
    create policy app_health_ecriture on public.app_health for insert with check (true);
  end if;

  /* sentinelle_rapports : mêmes règles — une ronde est lancée par un
     client, donc il faut qu'il puisse écrire ses verdicts. */
  if not exists (select 1 from pg_policies where tablename = 'sentinelle_rapports' and policyname = 'rapports_lecture') then
    create policy rapports_lecture on public.sentinelle_rapports for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'sentinelle_rapports' and policyname = 'rapports_ecriture') then
    create policy rapports_ecriture on public.sentinelle_rapports for insert with check (true);
  end if;

  /* sentinelle_etat : lecture + mise à jour de l'horloge. */
  if not exists (select 1 from pg_policies where tablename = 'sentinelle_etat' and policyname = 'etat_lecture') then
    create policy etat_lecture on public.sentinelle_etat for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'sentinelle_etat' and policyname = 'etat_maj') then
    create policy etat_maj on public.sentinelle_etat for update using (true) with check (true);
  end if;
end $$;

/* ── 5. Vérification ──────────────────────────────────────────── */
select table_name as table_creee
from information_schema.tables
where table_schema = 'public'
  and table_name in ('app_health', 'sentinelle_rapports', 'sentinelle_etat')
order by table_name;

select 'horloge' as objet, derniere_ronde from public.sentinelle_etat where id = 1;



/* ══════════════════════════════════════════════════════════════════
   PARTIE 3 — QU'UNE SANCTION NE PUISSE PLUS ÊTRE EFFACÉE
══════════════════════════════════════════════════════════════════ */

/* CE QUI S'EST PASSÉ
   ─────────────────
   La sanction de Fedider du 07/09 a été intégralement annulée : il est
   revenu à son état d'avant (niveau 25, 178 194 cumulés, 50 563 cookies,
   32 cafés) et il est de nouveau premier du classement.

   Ce n'est pas forcément un nouvel exploit. L'économie est pilotée par
   le client : à l'ouverture, l'app n'accepte les valeurs du serveur que
   s'il est EN AVANCE. Une sanction fait BAISSER, donc le téléphone garde
   son localStorage gonflé et le repousse en base dans les cinq secondes.

   La 1.29 contournait ça par une adoption forcée — mais via
   applyPatchOnce, donc UNE FOIS PAR COMPTE. Le verrou a été consommé sur
   un premier appareil ; un second, resté sur les anciennes valeurs, a
   suffi à tout remettre.

   LE REMÈDE : un compteur d'adoption porté par le COMPTE, que chaque
   APPAREIL compare au sien. Tant que le serveur a un numéro supérieur,
   l'appareil prend ses valeurs telles quelles, même plus basses — et il
   le fait autant de fois qu'il y a d'appareils.

   ⚠️⚠️ ORDRE OBLIGATOIRE : LE CODE D'ABORD, CE SQL ENSUITE.
   Le client ne sait lire force_adopt_version qu'à partir de la version
   déployée ce soir. Lancer ce SQL avant le déploiement rejouerait
   exactement la même histoire.                                        */

alter table public.users
  add column if not exists force_adopt_version int not null default 0;

/* ── Fedider (AZL-C8T) — remise à la sanction du 07/09 ───────────
   Mêmes chiffres qu'annoncés au joueur dans son message de compte :
   niveau 25→15, cumul 178 194→67 000, cookies 50 563→10 800,
   cafés 32→14, hebdo remis à zéro, et la liste d'objets de la sanction
   d'origine reprise mot pour mot.

   force_adopt_version passe à 1 : tous ses appareils adopteront ces
   valeurs à leur prochaine ouverture, celui qui a servi hier compris. */
update public.users set
       level = 15, xp = 0,
       total_earned  = 67000,
       cookies       = 10800,
       cafes         = 14,
       weekly_earned = 0,
       active_theme  = '',
       active_title  = '',
       unlocked = 'music_matin,theme_grains,theme_creme,badge_debutant,theme_espresso,badge_barista,avatar_chef,skin_caramel,avatar_robot,badge_tirelire,badge_aigle,badge_erudit,badge_cerveau,theme_or_limite,badge_tireur,badge_architecte,badge_sprinter,theme_trader,badge_investisseur,title_mousse,memory_saveurs,avatar_chat,theme_caramel,skin_noisette,catcher_nuit,avatar_renard,avatar_panda,catcher_champ,badge_chef,music_bossa,music_royale,avatar_loup,as_badge_whale,theme_legendaire,guess_italien,badge_legende,as_theme_lingot,avatar_legende,avatar_or,badge_connaisseur,title_caramel,pack_shares_5,avatar_sage,skin_onyx,title_cuivre,music_velvet,skin_emeraude,title_velours,theme_velours,skin_dore,title_or,badge_eternel,avatar_eternel,music_empereur,skin_cuir,theme_cuir,flappy_terrasse,pack_shares_10,theme_elixir,title_elixir,title_saveur,music_veillee,music_cosmique,as_theme_parquet,box_starter',
       force_adopt_version = force_adopt_version + 1
 where user_code = 'AZL-C8T';

/* ── Vérification ───────────────────────────────────────────────
   Les quatre chiffres doivent être ceux de la colonne « sanction ».
   force_adopt doit valoir au moins 1. */
select user_name,
       level         as niveau,
       total_earned  as cumul,
       cookies,
       cafes,
       weekly_earned as hebdo,
       force_adopt_version as force_adopt
  from public.users
 where user_code = 'AZL-C8T';

/* Pour une future correction manuelle sur n'importe quel compte, il
   suffira d'incrémenter ce compteur en même temps que les valeurs :

     update public.users
        set cookies = 1234,
            force_adopt_version = force_adopt_version + 1
      where user_code = 'XXX-XXX';

   Sans l'incrément, la correction sera écrasée par le joueur. AVEC, elle
   tient sur tous ses appareils.                                        */



/* ══════════════════════════════════════════════════════════════════
   PARTIE 4 — LE MUR : UNE SANCTION QUE LE CLIENT NE PEUT PLUS DÉFAIRE
══════════════════════════════════════════════════════════════════ */

/* POURQUOI UNE QUATRIÈME PARTIE
   ────────────────────────────
   La partie 3 fait adopter les valeurs du serveur par CHAQUE appareil.
   C'est le bon réflexe pour une correction subie — un vieux téléphone
   qui se resynchronise sans que son propriétaire y soit pour rien.

   Mais quand le joueur refait le geste EXPRÈS, à répétition, tout ce qui
   vit dans son téléphone finit par être contourné : rester sur une
   ancienne version, refuser la mise à jour, remettre le compteur
   d'adoption à la main. Un garde-fou côté client protège d'un accident,
   jamais d'une intention.

   D'où ce mur, en base, où le joueur n'a pas la main.

   LE PRINCIPE
   ───────────
   Dans ce jeu, on ne gagne des cookies qu'en JOUANT. Le serveur connaît
   le temps de jeu (total_play_time), donc il peut calculer ce qu'un
   gain a de plausible. Le repère est celui de l'audit : le meilleur
   mini-jeu de l'app plafonne à ~300 cookies pour 60 à 180 secondes, donc
   au-delà de 400 cookies par minute JOUÉE, c'est impossible.

   Quand une écriture dépasse ce plafond, on ne refuse pas la
   transaction — on IGNORE le bond, en gardant les valeurs déjà en base.
   Le client croit avoir écrit, l'app ne casse pas, et la sanction tient.

   ⚠️ CE MUR NE S'APPLIQUE QU'AUX COMPTES INSCRITS dans la table
   ci-dessous. Aucun autre joueur n'est concerné, aucun risque de
   faux positif sur la communauté.

   ⚠️ EFFET DE BORD ASSUMÉ pour un compte sous surveillance : une grosse
   plus-value de marché encaissée sans avoir joué (vendre des actions ne
   consomme pas de temps de jeu) sera elle aussi ignorée. C'est le prix
   d'un mur simple et incontournable ; il lui reste à la regagner en
   jouant. Retirer la ligne de la table rend le compte à la vie normale. */

create table if not exists public.comptes_sous_surveillance (
  user_code   text primary key,
  motif       text,
  /* Marge forfaitaire tolérée à chaque écriture, en plus du plafond
     calculé sur le temps de jeu. Absorbe les arrondis et les petits
     gains hors mini-jeu (cadeaux, codes promo). */
  marge       int  not null default 2000,
  ajoute_le   timestamptz not null default now()
);

insert into public.comptes_sous_surveillance (user_code, motif)
values ('AZL-C8T', 'Exploit Memory 09/2026 — sanction effacée à répétition depuis son appareil')
on conflict (user_code) do nothing;

create or replace function public.mur_anti_restauration()
returns trigger
language plpgsql
as $$
declare
  surveille   boolean;
  marge_cpte  int;
  minutes     numeric;
  plafond     numeric;
begin
  select true, c.marge into surveille, marge_cpte
    from public.comptes_sous_surveillance c
   where c.user_code = new.user_code;

  if not coalesce(surveille, false) then
    return new;             -- 99 % des joueurs : on ne touche à rien
  end if;

  /* Temps de jeu gagné depuis la dernière écriture, en minutes. */
  minutes := greatest(coalesce(new.total_play_time, 0) - coalesce(old.total_play_time, 0), 0) / 60.0;
  plafond := 400 * minutes + marge_cpte;

  if coalesce(new.total_earned, 0) - coalesce(old.total_earned, 0) > plafond then
    /* Bond impossible : on garde tout ce qui est déjà en base. Le niveau
       et les cafés suivent, sinon on obtiendrait un compte niveau 25
       avec le total d'un niveau 15 — exactement l'incohérence que la
       sentinelle signale. */
    new.total_earned  := old.total_earned;
    new.cookies       := old.cookies;
    new.cafes         := least(coalesce(new.cafes, 0), coalesce(old.cafes, 0));
    new.level         := old.level;
    new.xp            := old.xp;
    new.weekly_earned := old.weekly_earned;
    new.unlocked      := old.unlocked;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_mur_anti_restauration on public.users;

create trigger trg_mur_anti_restauration
  before update on public.users
  for each row
  execute function public.mur_anti_restauration();

/* ── Vérification ───────────────────────────────────────────────
   L'essai simule ce que fait son téléphone : réécrire 178 194 sans
   avoir joué. Le total doit rester à 67 000. */
do $$
declare avant numeric; apres numeric;
begin
  select total_earned into avant from public.users where user_code = 'AZL-C8T';
  update public.users set total_earned = 178194 where user_code = 'AZL-C8T';
  select total_earned into apres from public.users where user_code = 'AZL-C8T';
  if apres = avant then
    raise notice 'MUR OK : la restauration a ete ignoree, le total reste a %.', avant;
  else
    raise warning 'MUR INACTIF : le total est passe a %. Verifier que le trigger existe.', apres;
  end if;
end $$;

select user_name,
       level        as niveau,
       total_earned as cumul,
       cookies,
       cafes,
       force_adopt_version as force_adopt,
       (select count(*) from public.comptes_sous_surveillance c where c.user_code = u.user_code) as sous_surveillance
  from public.users u
 where user_code = 'AZL-C8T';

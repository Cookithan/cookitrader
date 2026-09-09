/* ══════════════════════════════════════════════════════════════════
   SENTINELLE_HORLOGE.sql — elle existe enfin sans personne
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL. Idempotent : relançable autant de fois qu'on veut.
   Prérequis : LE_MUR_CORRECTIF.sql et SENTINELLE_ACTIONS.sql déjà passés.

   LE PROBLÈME QU'ON RÈGLE
   ───────────────────────
   Jusqu'ici la Sentinelle n'avait pas d'horloge. Elle ne tournait que
   quand un joueur ouvrait l'app : « le premier client arrivé après
   l'intervalle lance la ronde pour tout le monde ». Personne ne joue,
   personne ne surveille.

   Ce n'était pas un détail. Le 09/09, l'audit a relevé « dernier tick
   marché il y a 3 h » — pas une panne : simplement personne pour le
   faire tiquer. Et le compte sanctionné avait repris 111 194 cookies
   pendant que rien ne regardait.

   CE QUE FAIT CETTE HORLOGE
   ─────────────────────────
   Deux tâches planifiées dans Postgres, qui tournent que l'app soit
   ouverte ou non :

     · toutes les 2 min  — le battement du marché (coupe-circuit +
                           relevé de prix)
     · toutes les 10 min — la ronde autonome : elle contrôle, elle AGIT
                           sur ce qui protège, et elle écrit ce qu'elle
                           a fait

   CE QU'ELLE S'AUTORISE À FAIRE SEULE, ET LA LIGNE
   ────────────────────────────────────────────────
   Elle agit sur deux choses, et deux seulement :

     · fermer le marché s'il sort de ses bornes ou s'il décroche de
       plus de 20 % en 5 minutes ;
     · faire respecter une sanction QUE TU AS DÉJÀ PRONONCÉE, en
       ramenant un compte surveillé sous le plafond que tu lui as fixé.

   La ligne est là : elle applique tes décisions, elle n'en prend pas.
   Elle ne sanctionnera jamais personne de sa propre initiative — le
   contrôle qui repère un gain impossible écrit une alerte et s'arrête,
   parce que l'audit lui-même ne sait pas trancher entre « plafond du
   leader » et « exploit », et qu'un joueur honnête puni ne revient pas.

   ⚠️ CONSTANTES RECOPIÉES DE src/lib/market.js
   Les seuils ci-dessous (20 % sur 5 min, pause 30 min, relevé toutes
   les 30 min, bornes 100–2500) existent aussi dans MARKET_CONFIG. Si
   tu changes l'un, change l'autre : rien ne le vérifie automatiquement.
══════════════════════════════════════════════════════════════════ */

/* ── 0. L'extension qui donne l'heure ─────────────────────────── */
create extension if not exists pg_cron;

/* ── 1. Un battement de coeur SÉPARÉ de celui des clients ──────
   `sentinelle_etat.derniere_ronde` sert aux clients à savoir si une
   ronde est déjà faite. Si l'horloge écrivait dedans, elle réputerait
   la ronde faite en permanence et AUCUN client ne lancerait plus jamais
   la sienne — qui est bien plus riche que ce que le SQL sait faire.
   D'où une colonne à elle. */
alter table public.sentinelle_etat
  add column if not exists derniere_ronde_serveur timestamptz,
  add column if not exists dernier_geste_serveur  text;

/* ── 2. Le battement du marché ─────────────────────────────────
   Reprend exactement ce que faisait maintenanceTick() côté client, mais
   sans dépendre d'un téléphone allumé. */
create or replace function public.sentinelle_battement_marche()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  etat        record;
  prix_avant  numeric;
  variation   numeric;
  dernier     timestamptz;
begin
  select * into etat from public.market_state where id = 1;
  if not found then return; end if;

  /* ── Coupe-circuit : plus de 20 % de variation en 5 minutes ──
     On le teste MÊME marché fermé : sans effet de plus, mais ça évite
     une branche de code qui ne sert qu'à ne rien faire. */
  select price into prix_avant
    from public.market_history
   where recorded_at >= now() - interval '5 minutes'
   order by recorded_at asc
   limit 1;

  if prix_avant is not null and prix_avant > 0 then
    variation := abs(etat.current_price - prix_avant) / prix_avant;
    if variation > 0.20
       and (etat.circuit_breaker_until is null or etat.circuit_breaker_until <= now())
    then
      update public.market_state
         set circuit_breaker_until = now() + interval '30 minutes'
       where id = 1;

      insert into public.sentinelle_rapports (verdict, categorie, titre, detail)
      values ('alerte', 'marché',
              'Coupe-circuit déclenché — marché fermé 30 min',
              array[
                format('Le cours a bougé de %s %% en 5 minutes (%s → %s).',
                       round(variation * 100, 1), round(prix_avant, 2), round(etat.current_price, 2)),
                'Fermeture automatique : c''est une protection, pas une décision sur un joueur.',
                'Rouvrir depuis la console si le mouvement était légitime.'
              ]);

      update public.sentinelle_etat
         set dernier_geste_serveur = 'coupe-circuit : marché fermé 30 min'
       where id = 1;
    end if;
  end if;

  /* ── Le relevé de prix ──
     Marché fermé : on ne relève plus, le prix reste figé. */
  if etat.circuit_breaker_until is not null and etat.circuit_breaker_until > now() then
    return;
  end if;

  /* Un point toutes les 30 min. Le prix ne bougeant plus tout seul
     depuis la refonte du 08/09, ce point ne sert qu'à donner au graphe
     une ligne continue entre deux ordres. */
  select max(recorded_at) into dernier from public.market_history;
  if dernier is null or dernier < now() - interval '30 minutes' then
    insert into public.market_history (price, shares_circulating)
    values (etat.current_price, etat.shares_in_circulation);

    update public.market_state
       set last_inflation_at = now()
     where id = 1;
  end if;
end;
$$;

/* ── 3. La ronde autonome ──────────────────────────────────────
   Elle ne double PAS les contrôles du client — elle fait ce que seul le
   serveur peut faire : tourner quand personne ne joue. */
create or replace function public.sentinelle_ronde_auto()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c            record;
  nb_remis     int := 0;
  remis        text[] := array[]::text[];
  etat         record;
  gros         record;
  suspects     text[] := array[]::text[];
  geste        text := null;
begin
  /* ── A. Faire respecter les sanctions déjà prononcées ──
     Le mur bloque les remontées à l'écriture. Mais si une seule passe —
     un chemin oublié, une colonne non couverte, un compte recréé — rien
     ne la rattrapait ensuite. Ici on RAMÈNE le compte sous le plafond
     que Régis lui a fixé.

     Ce n'est pas une sanction automatique : c'est l'exécution d'une
     sanction humaine. La nuance est toute la différence. */
  for c in
    select s.user_code, s.plafond_earned, s.plafond_cookies, s.plafond_cafes, s.plafond_level,
           u.user_name, u.total_earned, u.cookies, u.cafes, u.level
      from public.comptes_sous_surveillance s
      join public.users u on u.user_code = s.user_code
     where (s.plafond_earned  is not null and u.total_earned > s.plafond_earned)
        or (s.plafond_cookies is not null and u.cookies      > s.plafond_cookies)
        or (s.plafond_cafes   is not null and u.cafes        > s.plafond_cafes)
        or (s.plafond_level   is not null and u.level        > s.plafond_level)
  loop
    update public.users
       set total_earned = least(total_earned, coalesce(c.plafond_earned,  total_earned)),
           cookies      = least(cookies,      coalesce(c.plafond_cookies, cookies)),
           cafes        = least(cafes,        coalesce(c.plafond_cafes,   cafes)),
           level        = least(level,        coalesce(c.plafond_level,   level)),
           /* Sans ça, l'appareil qui vient de remonter les valeurs les
              réécrira dans les cinq secondes (leçon du 08/09). */
           force_adopt_version = coalesce(force_adopt_version, 0) + 1
     where user_code = c.user_code;

    nb_remis := nb_remis + 1;
    remis := remis || format('%s (%s) — repassé au-dessus de son plafond, ramené',
                             coalesce(c.user_name, '?'), c.user_code);

    insert into public.sentinelle_journal (action, cible, details, resultat, message)
    values ('appliquer_plafond', c.user_code,
            jsonb_build_object('avant', jsonb_build_object(
              'total_earned', c.total_earned, 'cookies', c.cookies,
              'cafes', c.cafes, 'level', c.level)),
            'ok', 'Plafond de surveillance réappliqué par l''horloge');
  end loop;

  if nb_remis > 0 then
    geste := format('%s compte(s) ramené(s) sous leur plafond', nb_remis);
    insert into public.sentinelle_rapports (verdict, categorie, titre, detail)
    values ('alerte', 'triche',
            format('%s compte(s) sanctionné(s) avaient remonté — remis d''office', nb_remis),
            remis || array[
              'Le mur aurait dû l''empêcher à l''écriture : vérifier qu''il est bien en security definer.',
              'Les valeurs ont été ramenées et le compteur d''adoption incrémenté.'
            ]);
  end if;

  /* ── B. Le marché hors de ses bornes ──
     Là aussi on agit : fermer protège tout le monde et se défait d'un
     bouton. On ne touche PAS au prix — corriger un cours est une
     décision humaine, elle vit dans la console. */
  select * into etat from public.market_state where id = 1;
  if found and (etat.current_price < 100 or etat.current_price > 2500) then
    if etat.circuit_breaker_until is null or etat.circuit_breaker_until <= now() then
      update public.market_state
         set circuit_breaker_until = now() + interval '12 hours'
       where id = 1;
      geste := coalesce(geste || ' · ', '') || 'marché fermé (cours hors bornes)';

      insert into public.sentinelle_rapports (verdict, categorie, titre, detail)
      values ('alerte', 'marché', 'Cours hors des bornes — marché fermé',
              array[
                format('Cours à %s, hors de l''intervalle 100–2500.', round(etat.current_price, 2)),
                'Fermé 12 h le temps que tu regardes. Corriger le cours reste ta décision.'
              ]);
    end if;
  end if;

  /* ── C. Les gains impossibles — CONSTAT SEULEMENT ──
     Repère de l'audit : au-delà de 400 cookies par minute jouée, c'est
     hors d'atteinte. Mais on n'agit pas : ce même signal se déclenche
     sur un joueur plafonné par la règle du leader, et l'audit lui-même
     écrit « cap leader, OU exploit » sans savoir trancher. Une sanction
     automatique là-dessus, c'est un joueur honnête perdu. */
  for gros in
    select u.user_name, u.user_code, u.total_earned, u.total_play_time
      from public.users u
      left join public.comptes_sous_surveillance s on s.user_code = u.user_code
     where s.user_code is null
       and u.last_active > now() - interval '2 hours'
       and coalesce(u.total_play_time, 0) > 0
       and u.total_earned > 400 * (coalesce(u.total_play_time, 0) / 60.0) + 20000
     order by u.total_earned desc
     limit 5
  loop
    suspects := suspects || format('%s (%s) — %s cumulés pour %s min de jeu',
                                   coalesce(gros.user_name, '?'), gros.user_code,
                                   gros.total_earned, round(coalesce(gros.total_play_time,0) / 60.0));
  end loop;

  if array_length(suspects, 1) > 0 then
    /* On ne réécrit pas la même alerte toutes les dix minutes : sans ce
       garde-fou elle devient du bruit et on arrête de la lire. */
    if not exists (
      select 1 from public.sentinelle_rapports
       where categorie = 'triche'
         and titre like 'Gain hors d%'
         and created_at > now() - interval '6 hours'
    ) then
      insert into public.sentinelle_rapports (verdict, categorie, titre, detail)
      values ('voir', 'triche',
              format('Gain hors d''atteinte sur %s compte(s)', array_length(suspects, 1)),
              suspects || array[
                'Constat seulement : je ne sanctionne pas seule.',
                'Ce signal se déclenche aussi sur un joueur plafonné par la règle du leader — à toi de trancher.'
              ]);
    end if;
  end if;

  /* ── D. Le battement ── */
  update public.sentinelle_etat
     set derniere_ronde_serveur = now(),
         dernier_geste_serveur  = coalesce(geste, dernier_geste_serveur)
   where id = 1;
end;
$$;

/* ── 4. On planifie ───────────────────────────────────────────── */
do $$
begin
  perform cron.unschedule('sentinelle_marche');
exception when others then null;
end $$;

do $$
begin
  perform cron.unschedule('sentinelle_ronde');
exception when others then null;
end $$;

select cron.schedule('sentinelle_marche', '*/2 * * * *',
                     $$ select public.sentinelle_battement_marche(); $$);

select cron.schedule('sentinelle_ronde',  '*/10 * * * *',
                     $$ select public.sentinelle_ronde_auto(); $$);

/* ── 5. Vérification ──────────────────────────────────────────── */
select jobname, schedule, active from cron.job where jobname like 'sentinelle%';

/* Un premier tour tout de suite, pour ne pas attendre dix minutes. */
select public.sentinelle_battement_marche();
select public.sentinelle_ronde_auto();

select derniere_ronde_serveur, dernier_geste_serveur
  from public.sentinelle_etat where id = 1;

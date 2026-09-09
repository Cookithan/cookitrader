/* ══════════════════════════════════════════════════════════════════
   SENTINELLE_ACTIONS.sql — donner à la sentinelle le droit d'agir
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL. Idempotent.

   ⚠️ AVANT DE COLLER : remplace la phrase de passe à la ligne marquée
   « CHANGE-MOI ». Choisis-en une longue, que tu retiens, et que tu ne
   tapes nulle part ailleurs.

   POURQUOI PAS UN BOUTON DANS L'APP
   ─────────────────────────────────
   La clé Supabase de l'app est publique : elle part dans le code que
   reçoit chaque joueur. Et « être admin », aujourd'hui, c'est
   s'appeler admin123 — un pseudo. Tant que la sentinelle regarde, ça
   va ; dès qu'elle peut réécrire un solde, ce serait la clé du coffre
   posée sur la table.

   L'autorisation repose donc sur quelque chose qui n'est PAS dans
   l'application : une phrase que tu tapes au moment d'agir. Le code
   envoyé aux joueurs ne contient que le nom des actions, jamais le
   droit de les exécuter.

   TOUT PASSE PAR UNE SEULE PORTE
   ──────────────────────────────
   Une fonction, `action_sentinelle`, en security definer. Elle vérifie
   la phrase, exécute, et JOURNALISE. Le journal est lisible depuis
   l'app : la sentinelle sait donc dire ce qui a été fait, quand, et
   avec quel résultat — y compris les tentatives refusées.

   SUR LE STOCKAGE DE LA PHRASE
   ────────────────────────────
   Elle est gardée en clair dans une table que le rôle anonyme ne peut
   pas lire (RLS active, aucune politique, droits révoqués). Seule la
   fonction, qui s'exécute avec les droits de son propriétaire, y
   accède. Un hachage bcrypt serait plus élégant, mais il dépend d'une
   extension dont le schéma varie selon les projets Supabase : la
   dépendance apporterait ici plus de fragilité que de sécurité, car
   quiconque peut lire cette table possède déjà la base entière.
══════════════════════════════════════════════════════════════════ */

/* ── 1. Le secret ─────────────────────────────────────────────── */
create table if not exists public.sentinelle_secret (
  id     int primary key default 1 check (id = 1),
  phrase text not null,
  maj_le timestamptz not null default now()
);

insert into public.sentinelle_secret (id, phrase)
values (1, 'CHANGE-MOI-en-une-phrase-longue-que-toi-seul-connais')
on conflict (id) do nothing;

/* Verrouillage : personne d'autre que le propriétaire de la fonction
   ne doit pouvoir lire cette table. */
alter table public.sentinelle_secret enable row level security;
revoke all on public.sentinelle_secret from anon, authenticated;

/* ── 2. Le journal ────────────────────────────────────────────── */
/* Lisible par l'app (la sentinelle affiche l'historique), mais écrit
   uniquement par la fonction : on ne peut pas maquiller le registre. */
create table if not exists public.sentinelle_journal (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  action     text not null,
  cible      text,
  details    jsonb,
  resultat   text not null,          -- 'ok' | 'refus' | 'erreur'
  message    text
);

create index if not exists sentinelle_journal_idx on public.sentinelle_journal (created_at desc);

alter table public.sentinelle_journal enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'sentinelle_journal' and policyname = 'journal_lecture') then
    create policy journal_lecture on public.sentinelle_journal for select using (true);
  end if;
end $$;

/* ── 2 bis. Les constats classés sans suite ───────────────────
   Tous les signalements ne demandent pas une correction. « Deux comptes
   au rendement élevé » peut être parfaitement normal quand on connaît
   les joueurs concernés. Sans moyen de dire « c'est normal », ces
   lignes reviennent à chaque ronde, on s'habitue à les ignorer, et le
   jour où une VRAIE alerte apparaît au milieu, personne ne la voit.

   La signature contient le TITRE : dès que le titre change — un compte
   de plus, un chiffre qui bouge — le constat réapparaît. On classe une
   situation, pas une catégorie entière. C'est ce qui empêche de se
   rendre aveugle pour de bon.

   Lecture publique (l'écran doit filtrer), écriture réservée à la
   fonction : sans ça, le joueur signalé ferait taire l'alerte qui le
   concerne. */
create table if not exists public.sentinelle_ignores (
  signature  text primary key,
  categorie  text,
  titre      text,
  motif      text,
  cree_le    timestamptz not null default now()
);

alter table public.sentinelle_ignores enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'sentinelle_ignores' and policyname = 'ignores_lecture') then
    create policy ignores_lecture on public.sentinelle_ignores for select using (true);
  end if;
end $$;

/* ── 2 ter. Les codes promo ───────────────────────────────────
   Cette table sert d'abord aux codes que Cookithan crée DEPUIS SON
   TÉLÉPHONE, avec les trois récompenses courantes : cookies, cafés,
   actions.

   ⚠️ Depuis CODES_HISTORIQUES_EN_BASE.sql, elle accueille AUSSI les 24
   codes historiques, avec les colonnes nécessaires à leurs mécaniques
   riches (débloquer un thème, ouvrir un mini-jeu, rester secret). Colle
   ce fichier-là après celui-ci : sans lui, les historiques continuent
   de marcher mais restent invisibles et insupprimables depuis la
   console.

   Lecture publique — il le faut, c'est le client qui vérifie le code
   saisi. Écriture réservée à la fonction : sinon n'importe qui
   s'inventerait un code à 100 000 cookies. */
create table if not exists public.promo_codes (
  code       text primary key,
  coins      bigint not null default 0,
  cafes      int    not null default 0,
  shares     int    not null default 0,
  label      text,
  actif      boolean not null default true,
  cree_le    timestamptz not null default now()
);

alter table public.promo_codes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'promo_codes' and policyname = 'promo_lecture') then
    create policy promo_lecture on public.promo_codes for select using (true);
  end if;
end $$;

/* ── 3. La porte unique ───────────────────────────────────────── */
create or replace function public.action_sentinelle(
  phrase  text,
  action  text,
  params  jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  attendu    text;
  refus_15m  int;
  cible      text := params->>'user_code';
  msg        text;
  n          int;
begin
  /* ── Frein anti-force brute ────────────────────────────────
     Dix refus en quinze minutes et la porte se ferme un moment. Sans
     ça, la phrase serait devinable à la machine — la fonction est
     appelable par n'importe qui avec la clé publique. */
  select count(*) into refus_15m
    from public.sentinelle_journal
   where resultat = 'refus' and created_at > now() - interval '15 minutes';

  if refus_15m >= 10 then
    insert into public.sentinelle_journal (action, cible, resultat, message)
    values (action, cible, 'refus', 'trop de tentatives — porte fermée 15 min');
    return jsonb_build_object('ok', false, 'message', 'Trop de tentatives. Réessaie dans 15 minutes.');
  end if;

  select s.phrase into attendu from public.sentinelle_secret s where s.id = 1;

  /* ── Refus si la phrase par défaut n'a pas été changée ─────
     Ce fichier est versionné, donc sa phrase d'exemple est publique.
     Oublier de la remplacer donnerait la console au premier lecteur du
     dépôt. Plutôt que de compter sur la vigilance, on rend l'oubli
     inoffensif : tant que la phrase est celle d'origine, RIEN ne
     s'exécute. */
  if attendu like 'CHANGE-MOI%' then
    insert into public.sentinelle_journal (action, cible, resultat, message)
    values (action, cible, 'refus', 'phrase par défaut encore en place');
    return jsonb_build_object('ok', false, 'message',
      'La phrase par défaut est encore en place — la console reste fermée. Change-la : update sentinelle_secret set phrase = ''ta phrase'' where id = 1;');
  end if;

  if attendu is null or phrase is null or phrase <> attendu then
    insert into public.sentinelle_journal (action, cible, resultat, message)
    values (action, cible, 'refus', 'phrase incorrecte');
    return jsonb_build_object('ok', false, 'message', 'Phrase de passe incorrecte.');
  end if;

  /* ── Vérifier la phrase, sans rien faire ───────────────────
     L'écran s'en sert pour déverrouiller : on tape, on appuie sur
     « Vérifier », et la base répond. Sans cette action, l'écran ne
     pouvait que faire SEMBLANT de se déverrouiller — une serrure qui
     s'ouvre à la première lettre n'est pas une serrure.

     Volontairement PAS journalisée : entrer chez soi n'est pas une
     action. Les échecs, eux, le sont déjà par le contrôle au-dessus —
     c'est ce qui alimente le frein anti-force brute. */
  if action = 'verifier' then
    return jsonb_build_object('ok', true, 'message', 'Phrase reconnue.');
  end if;

  /* ── Les actions ───────────────────────────────────────────
     Chacune finit par écrire au journal. force_adopt_version est
     incrémenté partout où l'on touche à l'économie d'un compte : sans
     ça, le téléphone du joueur réécrit ses anciennes valeurs dans les
     cinq secondes (leçon du 08/09/2026). */

  if action = 'sanctionner' then
    update public.users set
      level        = coalesce((params->>'level')::int, level),
      xp           = 0,
      total_earned = coalesce((params->>'total_earned')::bigint, total_earned),
      cookies      = coalesce((params->>'cookies')::bigint, cookies),
      cafes        = coalesce((params->>'cafes')::int, cafes),
      weekly_earned = 0,
      force_adopt_version = force_adopt_version + 1
    where user_code = cible;
    get diagnostics n = row_count;
    if n = 0 then
      insert into public.sentinelle_journal (action, cible, details, resultat, message)
      values (action, cible, params, 'erreur', 'compte introuvable');
      return jsonb_build_object('ok', false, 'message', 'Aucun compte avec ce code.');
    end if;

    /* Sous surveillance : le mur empêchera désormais son téléphone de
       remonter les chiffres sans avoir joué. */
    insert into public.comptes_sous_surveillance (user_code, motif, plafond_earned, plafond_cookies, plafond_cafes, plafond_level)
    values (cible, coalesce(params->>'motif', 'sanction via sentinelle'),
            (params->>'total_earned')::bigint, (params->>'cookies')::bigint,
            (params->>'cafes')::int, (params->>'level')::int)
    on conflict (user_code) do update set
      motif = excluded.motif,
      plafond_earned = excluded.plafond_earned,
      plafond_cookies = excluded.plafond_cookies,
      plafond_cafes = excluded.plafond_cafes,
      plafond_level = excluded.plafond_level;

    msg := 'Compte sanctionné et placé sous surveillance.';

  elsif action = 'lever_sanction' then
    delete from public.comptes_sous_surveillance where user_code = cible;
    update public.users set force_adopt_version = force_adopt_version + 1 where user_code = cible;
    msg := 'Surveillance levée. Le compte reprend une vie normale.';

  elsif action = 'compenser' then
    /* Uniquement à la hausse : une compensation ne retire rien. Pour
       retirer, c'est « sanctionner », qui laisse une trace explicite. */
    update public.users set
      cookies = cookies + greatest(coalesce((params->>'cookies')::bigint, 0), 0),
      cafes   = cafes   + greatest(coalesce((params->>'cafes')::int, 0), 0),
      force_adopt_version = force_adopt_version + 1
    where user_code = cible;
    get diagnostics n = row_count;
    if n = 0 then
      insert into public.sentinelle_journal (action, cible, details, resultat, message)
      values (action, cible, params, 'erreur', 'compte introuvable');
      return jsonb_build_object('ok', false, 'message', 'Aucun compte avec ce code.');
    end if;
    msg := 'Compensation versée.';

  elsif action = 'corriger_cours' then
    /* La garde du prix refuserait un saut de plus de 15 % : on la
       désarme le temps de l'écriture, puis on la rearme aussitôt. */
    perform set_config('app.market_guard_off', '1', false);
    update public.market_state
       set current_price = greatest(100, least(2500, (params->>'prix')::numeric)),
           last_updated = now()
     where id = 1;
    perform set_config('app.market_guard_off', '0', false);
    insert into public.market_history (price, shares_circulating)
    select current_price, shares_in_circulation from public.market_state where id = 1;
    msg := 'Cours corrigé.';

  elsif action = 'fermer_marche' then
    /* On passe par le circuit breaker : c'est le seul levier de
       fermeture qui vive en BASE. Le drapeau CLOSED, lui, est dans le
       code — donc hors de portée sans déploiement. */
    update public.market_state
       set circuit_breaker_until = now() + make_interval(hours => coalesce((params->>'heures')::int, 12))
     where id = 1;
    msg := 'Marché fermé (circuit breaker).';

  elsif action = 'ouvrir_marche' then
    update public.market_state set circuit_breaker_until = null where id = 1;
    msg := 'Marché rouvert.';

  elsif action = 'forcer_maj' then
    update public.system_status
       set force_version = nullif(params->>'version', ''), updated_at = now()
     where id = 1;
    msg := 'Mise à jour forcée pour les clients qui ne sont pas sur cette version.';

  elsif action = 'maintenance' then
    -- `coalesce(params->>'titre', maintenance_title)` gardait l'ancien
    -- texte pour un champ vidé : les textes de maintenance étaient
    -- inscriptibles mais pas effaçables, et « Test Pour Fedi » a dormi
    -- en base jusqu'à ce qu'un contrôle le voie. On distingue donc le
    -- champ ABSENT (on garde) du champ VIDE (on efface).
    update public.system_status set
      maintenance_mode     = coalesce((params->>'actif')::boolean, false),
      maintenance_title    = case when params ? 'titre'
                                  then nullif(params->>'titre', '')
                                  else maintenance_title end,
      maintenance_subtitle = case when params ? 'sous_titre'
                                  then nullif(params->>'sous_titre', '')
                                  else maintenance_subtitle end,
      updated_at = now()
    where id = 1;
    msg := case when coalesce((params->>'actif')::boolean, false)
                then 'Maintenance ACTIVÉE pour tout le monde.'
                else 'Maintenance levée.' end;

  elsif action = 'creer_code_promo' then
    /* Le code est normalisé en majuscules : le joueur le tape comme il
       veut, il tombera juste. */
    insert into public.promo_codes (code, coins, cafes, shares, label)
    values (upper(trim(params->>'code')),
            coalesce((params->>'coins')::bigint, 0),
            coalesce((params->>'cafes')::int, 0),
            coalesce((params->>'shares')::int, 0),
            params->>'label')
    on conflict (code) do update set
      coins = excluded.coins, cafes = excluded.cafes,
      shares = excluded.shares, label = excluded.label, actif = true;
    cible := upper(trim(params->>'code'));
    msg := 'Code promo créé. Il est utilisable immédiatement, sans redéploiement.';

  elsif action = 'desactiver_code_promo' then
    update public.promo_codes set actif = false where code = upper(trim(params->>'code'));
    cible := upper(trim(params->>'code'));
    msg := 'Code désactivé. Ceux qui l''ont déjà utilisé gardent leur récompense.';

  elsif action = 'classer_sans_suite' then
    insert into public.sentinelle_ignores (signature, categorie, titre, motif)
    values (params->>'signature', params->>'categorie', params->>'titre',
            coalesce(params->>'motif', 'classé sans suite'))
    on conflict (signature) do update set
      motif = excluded.motif, cree_le = now();
    cible := params->>'categorie';
    msg := 'Constat classé sans suite. Il réapparaîtra si la situation change.';

  elsif action = 'reprendre_constat' then
    delete from public.sentinelle_ignores where signature = params->>'signature';
    cible := params->>'categorie';
    msg := 'Constat repris en compte.';

  elsif action = 'nettoyer_portefeuille' then
    /* Retirer la ligne SANS décrémenter la circulation créerait un
       écart que le contrôle suivant signalerait. Les deux ou rien. */
    select shares into n from public.market_portfolio where user_code = cible;
    if n is null then
      insert into public.sentinelle_journal (action, cible, details, resultat, message)
      values (action, cible, params, 'erreur', 'portefeuille introuvable');
      return jsonb_build_object('ok', false, 'message', 'Aucun portefeuille avec ce code.');
    end if;
    delete from public.market_portfolio where user_code = cible;
    update public.market_state
       set shares_in_circulation = greatest(0, shares_in_circulation - n)
     where id = 1;
    msg := n || ' action(s) retirée(s) de la circulation.';

  else
    insert into public.sentinelle_journal (action, cible, details, resultat, message)
    values (action, cible, params, 'erreur', 'action inconnue');
    return jsonb_build_object('ok', false, 'message', 'Action inconnue : ' || coalesce(action, '(vide)'));
  end if;

  insert into public.sentinelle_journal (action, cible, details, resultat, message)
  values (action, cible, params, 'ok', msg);

  return jsonb_build_object('ok', true, 'message', msg);

exception when others then
  insert into public.sentinelle_journal (action, cible, details, resultat, message)
  values (action, cible, params, 'erreur', SQLERRM);
  return jsonb_build_object('ok', false, 'message', 'Erreur : ' || SQLERRM);
end;
$$;

/* L'app appelle la fonction avec la clé publique : il faut donc
   l'autoriser explicitement. C'est la phrase de passe qui protège,
   pas le droit d'appel. */
grant execute on function public.action_sentinelle(text, text, jsonb) to anon, authenticated;

/* ── 4. érification ────────────────────────────────────────────
   ⚠️ ON NE VÉRIFIE PLUS EN APPELANT AVEC UNE FAUSSE PHRASE.
   `sentinelle_phrase_ok` journalise chaque refus, et dix refus en quinze
   minutes ferment la porte pour un quart d'heure : coller plusieurs
   fichiers d'affilée pouvait donc verrouiller la console à l'instant
   précis où on venait de l'installer.

   Et ça prouvait moins qu'il n'y paraissait : dans l'éditeur SQL on est
   `postgres`, pas `anon` — le refus obtenu ne disait rien du droit
   d'appel réel de l'app.

   On vérifie donc ce qui casse VRAIMENT : la fonction existe-t-elle, et
   `anon` a-t-il le droit de l'appeler. Une ligne manquante ou un
   `anon_peut_appeler` à false, c'est l'app en panne ; une fausse phrase
   refusée, c'était un test qui se testait lui-même. */
select p.proname                                    as fonction,
       pg_get_function_identity_arguments(p.oid)    as arguments,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_peut_appeler
  from pg_proc p
  join pg_namespace ns on ns.oid = p.pronamespace
 where ns.nspname = 'public'
   and p.proname in ('action_sentinelle')
 order by p.proname;


select action, cible, resultat, message, created_at
  from public.sentinelle_journal
 order by created_at desc
 limit 3;

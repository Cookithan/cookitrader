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

  if attendu is null or phrase is null or phrase <> attendu then
    insert into public.sentinelle_journal (action, cible, resultat, message)
    values (action, cible, 'refus', 'phrase incorrecte');
    return jsonb_build_object('ok', false, 'message', 'Phrase de passe incorrecte.');
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
    update public.system_status set
      maintenance_mode     = coalesce((params->>'actif')::boolean, false),
      maintenance_title    = coalesce(params->>'titre', maintenance_title),
      maintenance_subtitle = coalesce(params->>'sous_titre', maintenance_subtitle),
      updated_at = now()
    where id = 1;
    msg := case when coalesce((params->>'actif')::boolean, false)
                then 'Maintenance ACTIVÉE pour tout le monde.'
                else 'Maintenance levée.' end;

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

/* ── 4. Vérification ──────────────────────────────────────────
   Une phrase volontairement fausse : doit être refusée ET journalisée. */
select public.action_sentinelle('phrase-volontairement-fausse', 'lever_sanction', '{"user_code":"ZZZ-ZZZ"}'::jsonb) as essai_refus;

select action, cible, resultat, message, created_at
  from public.sentinelle_journal
 order by created_at desc
 limit 3;

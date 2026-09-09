/* ══════════════════════════════════════════════════════════════════
   SENTINELLE_AUTONOMIE.sql — le socle annulable
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL. Idempotent. Aucun placeholder.
   Prérequis : SIGNALEMENTS.sql, SENTINELLE_ACTIONS.sql,
   SENTINELLE_ECONOMIE.sql.

   Cookithan a choisi « tout est annulable » comme filet de sécurité du
   mode autonome, plutôt que des plafonds serrés ou une fenêtre de veto
   (impossible, faute de notifications push). C'est ce fichier qui rend
   cette promesse tenable — et RIEN du mode autonome ne doit exister
   avant lui.

   ⚠️ IL CORRIGE AUSSI UN RISQUE DÉJÀ EN PRODUCTION
   `nettoyer_portefeuille` n'est pas dans les gestes à confirmer : elle
   peut déjà vider un portefeuille toute seule, chaque heure, et la ligne
   est SUPPRIMÉE — `total_invested` est perdu pour de bon. Ce n'est pas
   l'autonomie qui crée ce trou, il est là depuis le 09/09. Ici on garde
   l'avant, et on ajoute un retrait PARTIEL : sanctionner un tricheur qui
   a tout converti en $CKM ne doit pas obliger à tout lui prendre.

   POURQUOI L'AVANT EST CAPTURÉ CÔTÉ FONCTION EDGE, PAS ICI
   ────────────────────────────────────────────────────────
   Instrumenter les onze gestes d'action_sentinelle demanderait de
   réécrire ce gros fichier et de risquer chacun d'eux. La fonction edge,
   elle, lit déjà la base avec la clé de service : elle relève l'état
   d'avant, exécute, puis dépose la ligne ici. Le SQL ne porte donc que
   ce qu'il est seul à pouvoir faire — le stockage et la restauration.

   CE QUI N'EST PAS ANNULABLE, ET QU'IL FAUT DIRE
   ──────────────────────────────────────────────
   · un message DÉJÀ LU par le joueur (on peut supprimer la ligne tant
     qu'il ne l'a pas ouverte, pas après)
   · une annonce : un pop-up vu est vu
   · le temps passé pendant une fermeture de marché
   L'écran de retour doit le dire au lieu de proposer un bouton qui
   mentirait.
══════════════════════════════════════════════════════════════════ */

/* ── 1. Le registre des gestes autonomes ─────────────────────── */
create table if not exists public.sentinelle_gestes (
  id         bigserial primary key,
  cree_le    timestamptz not null default now(),
  action     text not null,
  cible      text,
  params     jsonb,
  /* L'état d'avant, au champ près. C'est LUI qui rend l'annulation
     possible : sans lui, le journal dit ce qui s'est passé, il ne le
     défait pas. */
  avant      jsonb,
  message    text,
  statut     text not null default 'en_attente',   -- en_attente | garde | annule
  decide_le  timestamptz,
  expire_le  timestamptz not null default now() + interval '7 days'
);

create index if not exists sentinelle_gestes_idx
  on public.sentinelle_gestes (cree_le desc) where statut = 'en_attente';

alter table public.sentinelle_gestes enable row level security;
revoke all on public.sentinelle_gestes from anon, authenticated;
revoke all on sequence public.sentinelle_gestes_id_seq from anon, authenticated;

/* ── 2. Retirer des actions, en partie ───────────────────────
   `nettoyer_portefeuille` vide tout. Pour une sanction proportionnée il
   faut pouvoir en retirer 40 sur 120 : le tricheur qui a converti ses
   cookies en $CKM ne doit pas s'en tirer parce que le seul geste
   disponible serait trop brutal.

   La circulation suit toujours le portefeuille — les deux ou rien,
   sinon le contrôle de cohérence du marché sonnerait le lendemain. Le
   cours n'est PAS touché : on retire du butin, on ne simule pas une
   vente, donc le joueur n'est pas remboursé. */
create or replace function public.sentinelle_retirer_actions(
  p_phrase text,
  p_cible  text,
  p_combien int default null       -- null = tout
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  avait int;
  pris  int;
begin
  if not public.sentinelle_phrase_ok(p_phrase) then
    return jsonb_build_object('ok', false, 'message', 'Phrase de passe incorrecte.');
  end if;

  select shares into avait from public.market_portfolio where user_code = p_cible;
  if avait is null then
    return jsonb_build_object('ok', false, 'message', 'Aucun portefeuille avec ce code.');
  end if;

  pris := least(coalesce(p_combien, avait), avait);
  if pris <= 0 then
    return jsonb_build_object('ok', false, 'message', 'Rien a retirer.');
  end if;

  if pris >= avait then
    delete from public.market_portfolio where user_code = p_cible;
  else
    update public.market_portfolio
       set shares = shares - pris
     where user_code = p_cible;
  end if;

  update public.market_state
     set shares_in_circulation = greatest(0, shares_in_circulation - pris)
   where id = 1;

  insert into public.sentinelle_journal (action, cible, details, resultat, message)
  values ('retirer_actions', p_cible, jsonb_build_object('combien', pris, 'avait', avait),
          'ok', format('%s action(s) retiree(s) sur %s', pris, avait));

  return jsonb_build_object('ok', true, 'retire', pris, 'restant', avait - pris,
    'message', format('%s action(s) retiree(s), il lui en reste %s.', pris, avait - pris));
end;
$fn$;

/* ── 3. Ce qu'elle a le droit de dépenser sur 24 h ───────────
   Compté depuis le registre, pas depuis un compteur tenu à part : un
   compteur se désynchronise, une somme ne ment pas. */
create or replace function public.sentinelle_budget()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  d24 timestamptz := now() - interval '24 hours';
  ck  bigint;  cf int;  ac int;  sa int;  an int;
begin
  select
    coalesce(sum( (coalesce(params->>'cookies','0'))::bigint ), 0),
    coalesce(sum( (coalesce(params->>'cafes','0'))::int ), 0)
  into ck, cf
  from public.sentinelle_gestes
  where cree_le > d24 and statut <> 'annule'
    and action in ('compenser', 'modifier_joueur', 'sanctionner');

  select coalesce(sum( (coalesce(params->>'combien','0'))::int ), 0) into ac
    from public.sentinelle_gestes
   where cree_le > d24 and statut <> 'annule' and action = 'retirer_actions';

  select count(*) into sa from public.sentinelle_gestes
   where cree_le > d24 and statut <> 'annule' and action = 'sanctionner';

  select count(*) into an from public.sentinelle_journal
   where created_at > d24 and resultat = 'ok' and action = 'annoncer';

  return jsonb_build_object(
    'cookies', jsonb_build_object('utilise', ck, 'plafond', 40000),
    'cafes',   jsonb_build_object('utilise', cf, 'plafond', 100),
    'actions', jsonb_build_object('utilise', ac, 'plafond', 100),
    'sanctions', jsonb_build_object('utilise', sa, 'plafond', 10),
    'annonces',  jsonb_build_object('utilise', an, 'plafond', 10),
    'epuise', (ck >= 40000 or cf >= 100 or ac >= 100 or sa >= 10)
  );
end;
$fn$;

/* ── 4. Annuler ──────────────────────────────────────────────
   Le cœur du filet. On relit `avant` et on remet en l'état, geste par
   geste. Tout ce qui touche un compte incrémente le compteur
   d'adoption : sans ça, le téléphone du joueur réécrirait ses valeurs
   dans les cinq secondes et l'annulation serait une illusion. */
create or replace function public.sentinelle_annuler_geste(p_phrase text, p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  g    record;
  a    jsonb;
  n    int := 0;
  quoi text;
begin
  if not public.sentinelle_phrase_ok(p_phrase) then
    return jsonb_build_object('ok', false, 'message', 'Phrase de passe incorrecte.');
  end if;

  select * into g from public.sentinelle_gestes where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Geste introuvable.');
  end if;
  if g.statut = 'annule' then
    return jsonb_build_object('ok', true, 'deja', true, 'message', 'Deja annule.');
  end if;
  a := coalesce(g.avant, '{}'::jsonb);

  if g.action in ('sanctionner', 'modifier_joueur', 'compenser') then
    update public.users set
      level          = coalesce((a->>'level')::int,           level),
      xp             = coalesce((a->>'xp')::int,              xp),
      cookies        = coalesce((a->>'cookies')::bigint,      cookies),
      cafes          = coalesce((a->>'cafes')::int,           cafes),
      total_earned   = coalesce((a->>'total_earned')::bigint, total_earned),
      weekly_earned  = coalesce((a->>'weekly_earned')::bigint, weekly_earned),
      prestige_level = coalesce((a->>'prestige_level')::int,  prestige_level),
      streak         = coalesce((a->>'streak')::int,          streak),
      active_theme   = coalesce(a->>'active_theme',           active_theme),
      active_title   = coalesce(a->>'active_title',           active_title),
      user_bio       = coalesce(a->>'user_bio',               user_bio),
      unlocked       = coalesce(a->>'unlocked',               unlocked),
      force_adopt_version = coalesce(force_adopt_version, 0) + 1
    where user_code = g.cible;
    get diagnostics n = row_count;
    quoi := 'compte remis en l etat';

  elsif g.action in ('retirer_actions', 'nettoyer_portefeuille') then
    /* On rend les actions ET on les remet en circulation : les deux ou
       rien, comme au retrait. */
    insert into public.market_portfolio (user_code, shares, total_invested)
    values (g.cible, (a->>'shares')::int, coalesce((a->>'total_invested')::numeric, 0))
    on conflict (user_code) do update
      set shares = excluded.shares, total_invested = excluded.total_invested;
    update public.market_state
       set shares_in_circulation = shares_in_circulation + coalesce((g.params->>'combien')::int, (a->>'shares')::int, 0)
     where id = 1;
    n := 1;
    quoi := 'actions rendues';

  elsif g.action = 'traiter_signalement' then
    update public.signalements set statut = coalesce(a->>'statut', 'nouveau')
     where id = (g.params->>'id')::bigint;
    get diagnostics n = row_count;
    quoi := 'signalement rouvert';

  elsif g.action = 'ecrire_au_joueur' then
    /* Tant qu il ne l a pas lu, le message se reprend. Apres, il est
       parti : on le dit au lieu de faire semblant. */
    delete from public.inbox_messages
     where id = (a->>'message_id')::bigint and is_read = false;
    get diagnostics n = row_count;
    if n = 0 then
      update public.sentinelle_gestes set statut = 'garde', decide_le = now() where id = p_id;
      return jsonb_build_object('ok', false, 'message',
        'Le joueur a deja lu ce message : il ne peut plus etre repris.');
    end if;
    quoi := 'message repris avant lecture';

  elsif g.action = 'fermer_marche' then
    update public.market_state
       set circuit_breaker_until = nullif(a->>'circuit_breaker_until', '')::timestamptz
     where id = 1;
    n := 1;
    quoi := 'marche rouvert';

  else
    return jsonb_build_object('ok', false, 'message',
      format('« %s » ne s annule pas.', g.action));
  end if;

  update public.sentinelle_gestes
     set statut = 'annule', decide_le = now()
   where id = p_id;

  insert into public.sentinelle_journal (action, cible, details, resultat, message)
  values ('annuler', g.cible, jsonb_build_object('geste', p_id, 'quoi', g.action), 'ok', quoi);

  return jsonb_build_object('ok', true, 'lignes', n, 'message', 'Annule : ' || quoi || '.');
end;
$fn$;

/* ── 5. Garder un geste (le contraire d annuler) ─────────────── */
create or replace function public.sentinelle_garder_geste(p_phrase text, p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.sentinelle_phrase_ok(p_phrase) then
    return jsonb_build_object('ok', false, 'message', 'Phrase de passe incorrecte.');
  end if;
  update public.sentinelle_gestes
     set statut = 'garde', decide_le = now()
   where id = p_id and statut = 'en_attente';
  return jsonb_build_object('ok', true, 'message', 'Garde.');
end;
$fn$;

/* ── 6. L ecran de retour : ce qui attend encore ta decision ──
   Sept jours, puis un geste non conteste est repute accepte et sort de
   l ecran. Il reste au journal — on ne perd pas l histoire, on arrete
   juste de demander. */
create or replace function public.sentinelle_gestes_en_attente(p_phrase text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  lignes jsonb;
begin
  if not public.sentinelle_phrase_ok(p_phrase) then
    return jsonb_build_object('ok', false, 'message', 'Phrase de passe incorrecte.', 'lignes', '[]'::jsonb);
  end if;

  update public.sentinelle_gestes
     set statut = 'garde', decide_le = now()
   where statut = 'en_attente' and expire_le < now();

  select coalesce(jsonb_agg(to_jsonb(x) order by x.cree_le desc), '[]'::jsonb) into lignes
    from (
      select id, cree_le, action, cible, params, avant, message, expire_le
        from public.sentinelle_gestes
       where statut = 'en_attente'
       order by cree_le desc
       limit 60
    ) x;

  return jsonb_build_object('ok', true, 'lignes', lignes);
end;
$fn$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.sentinelle_retirer_actions(text, text, int)',
    'public.sentinelle_budget()',
    'public.sentinelle_annuler_geste(text, bigint)',
    'public.sentinelle_garder_geste(text, bigint)',
    'public.sentinelle_gestes_en_attente(text)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;

/* ── 7. Verification ─────────────────────────────────────────── */
select public.sentinelle_budget() as budget_du_jour;
select public.sentinelle_gestes_en_attente('phrase-volontairement-fausse') as doit_refuser;

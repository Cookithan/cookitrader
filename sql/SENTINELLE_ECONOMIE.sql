/* ══════════════════════════════════════════════════════════════════
   SENTINELLE_ECONOMIE.sql — la porte devant ses rondes
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL. Idempotent. Aucun placeholder à remplacer.

   Cookithan, le 09/09 : « je suis déjà à 4,50 € alors que j'étais à 5 »
   sur une clé API de 5 €.

   CE QUI A ÉTÉ MESURÉ AVANT D'ÉCRIRE CECI
   ────────────────────────────────────────
   Seules TROIS rondes IA avaient tourné. L'horloge n'était donc presque
   pour rien dans la dépense : elle venait de la console, qui appelait le
   modèle à chaque ouverture (corrigé le même soir) et des essais de la
   journée. Ce fichier borne quand même l'horloge, parce qu'elle tournera
   tous les jours, elle, et qu'une fuite lente vide un budget de 5 €.

   POURQUOI UNE PORTE, ET NON UNE RÉÉCRITURE DE sentinelle_reveil()
   ────────────────────────────────────────────────────────────────
   `sentinelle_reveil()` contient l'URL du projet et la clé anon, que
   Cookithan a substituées à la main dans SENTINELLE_RONDE_IA.sql. La
   réécrire l'obligerait à refaire cette substitution, avec le risque
   d'une clé collée de travers. On la laisse tranquille : le cron
   n'appelle plus `sentinelle_reveil()` directement mais
   `sentinelle_horloge_ia()`, qui décide et l'appelle si besoin.

   LES CINQ PORTES, DANS L'ORDRE
   ─────────────────────────────
   1. LE MODE. 'non' = aucune ronde, zéro euro. 'semi' = ce qu'elle fait
      aujourd'hui. 'full' = le mode autonome (lot 3).
   2. LE PLAFOND DU JOUR. 12 rondes maximum par 24 h, quoi qu'il arrive.
      C'est la seule garantie dure sur la facture : toutes les autres
      portes dépendent de ce qui se passe dans l'app, celle-ci non.
   3. LE PLANCHER. Jamais deux rondes à moins d'une heure d'écart, même
      sous une alerte qui se répète.
   4. LA NUIT (22 h – 6 h, heure de Paris). Elle dort, SAUF si la vigie
      déterministe a levé une ALERTE depuis sa dernière ronde. La vigie,
      elle, continue de tourner toutes les 10 minutes : c'est du SQL, ça
      ne coûte rien, et le coupe-circuit du marché reste donc armé toute
      la nuit.
      ⚠️ L'heure est calculée avec timezone('Europe/Paris', now()) et non
      en UTC en dur : coder « 20 h – 4 h UTC » marcherait jusqu'au
      passage à l'heure d'hiver, puis le couvre-feu se décalerait d'une
      heure sans que personne ne s'en aperçoive.
   5. LA CADENCE ET LE CHANGEMENT. Au repos, une ronde toutes les 3 h —
      et seulement s'il s'est passé quelque chose depuis la dernière :
      un signalement, un crash, un geste au journal, un constat de la
      vigie, un ordre sur le marché. À six joueurs actifs, la plupart des
      rondes ne trouvaient rien : les faire quand même, c'est payer pour
      s'entendre dire qu'il n'y a rien.
      Une ALERTE fraîche court-circuite la cadence (pas le plancher).

   Le cron tourne toutes les 30 minutes, mais un passage bloqué ne coûte
   RIEN : les portes sont du SQL pur, et l'appel au modèle n'a lieu qu'au
   bout. Cette fréquence sert à réagir vite à une alerte de nuit, pas à
   tourner souvent.
══════════════════════════════════════════════════════════════════ */

/* ── 1. Ce qu'il faut retenir entre deux rondes ──────────────── */
alter table public.sentinelle_etat
  add column if not exists mode_autonomie   text not null default 'semi',
  add column if not exists derniere_ronde_ia timestamptz,
  add column if not exists rondes_ia_jour   int  not null default 0,
  add column if not exists rondes_ia_date   date,
  add column if not exists derniere_raison_saut text;

/* Une valeur inconnue vaudrait 'semi' par surprise. On la borne. */
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sentinelle_mode_connu') then
    alter table public.sentinelle_etat
      add constraint sentinelle_mode_connu check (mode_autonomie in ('non', 'semi', 'full'));
  end if;
end $$;

/* ── 2. La décision, isolée pour être lisible ET testable ─────
   Renvoie la raison du refus, ou NULL si elle peut tourner. Rendre la
   RAISON plutôt qu'un booléen permet de l'écrire dans l'état : sans ça,
   une Sentinelle muette pendant deux jours est indistinguable d'une
   Sentinelle en panne. */
create or replace function public.sentinelle_pourquoi_pas()
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  e         record;
  heure     int;
  alerte    boolean;
  attend    boolean;
  bouge     boolean;
  depuis    timestamptz;
begin
  select * into e from public.sentinelle_etat where id = 1;
  if not found then return 'etat introuvable'; end if;

  -- 1. le mode
  if e.mode_autonomie = 'non' then return 'mode non-autonome'; end if;

  -- 2. le plafond du jour
  if e.rondes_ia_date = current_date and e.rondes_ia_jour >= 12 then
    return 'plafond du jour atteint (12 rondes)';
  end if;

  -- 3. le plancher d une heure
  if e.derniere_ronde_ia is not null and e.derniere_ronde_ia > now() - interval '1 hour' then
    return 'moins d une heure depuis la derniere ronde';
  end if;

  depuis := coalesce(e.derniere_ronde_ia, now() - interval '24 hours');

  -- une ALERTE de la vigie deterministe depuis la derniere ronde ?
  select exists (
    select 1 from public.sentinelle_rapports
     where verdict = 'alerte' and created_at > depuis
  ) into alerte;

  -- 4. la nuit : elle dort, sauf alerte
  heure := extract(hour from timezone('Europe/Paris', now()))::int;
  if (heure >= 22 or heure < 6) and not alerte then
    return 'nuit (22h-6h Paris), rien d urgent';
  end if;

  /* Un joueur qui attend passe devant la cadence.
     Sans ca, quelqu un qui ecrit a 10 h 05 pouvait attendre jusqu a 13 h
     avant d avoir une reponse : on croirait la Sentinelle en panne, et le
     joueur, lui, croirait qu on l ignore. Le plancher d une heure borne
     quand meme le rythme, donc au pire il patiente une heure.
     La NUIT ne bouge pas : un signalement n est pas une urgence, et il
     sera rattrape a 6 h. */
  select exists (
    select 1 from public.signalements where statut in ('nouveau', 'vu')   -- les statuts reels : nouveau | vu | traite | sans_suite
  ) into attend;

  -- 5. la cadence de 3 h, court-circuitee par une alerte ou une attente
  if not alerte and not attend and e.derniere_ronde_ia is not null
     and e.derniere_ronde_ia > now() - interval '3 hours' then
    return 'moins de 3 h depuis la derniere ronde, et rien n attend';
  end if;

  -- 5 bis. s est-il passe quelque chose ?
  select
    exists (select 1 from public.signalements        where cree_le    > depuis) or
    exists (select 1 from public.app_health          where created_at > depuis) or
    exists (select 1 from public.sentinelle_journal  where created_at > depuis and action <> 'ronde_ia') or
    exists (select 1 from public.sentinelle_rapports where created_at > depuis and verdict <> 'ok') or
    exists (select 1 from public.market_transactions where created_at > depuis)
  into bouge;

  if not bouge and not attend then return 'rien de nouveau depuis la derniere ronde'; end if;

  return null;   -- elle peut tourner
end;
$fn$;

/* ── 3. L horloge : elle decide, puis delegue ─────────────────
   `sentinelle_reveil()` n est pas touchee : elle garde l URL et la cle
   que Cookithan y a substituees. */
create or replace function public.sentinelle_horloge_ia()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  refus text;
begin
  refus := public.sentinelle_pourquoi_pas();

  if refus is not null then
    /* On note POURQUOI elle n a pas tourne. Muette et en panne se
       ressemblent trop pour qu on laisse la question ouverte. */
    update public.sentinelle_etat set derniere_raison_saut = refus where id = 1;
    return;
  end if;

  /* Le compteur AVANT l appel : si la fonction edge echoue, le tour est
     quand meme compte. Mieux vaut une ronde perdue qu une boucle qui
     rappelle en echec jusqu a vider le budget. */
  update public.sentinelle_etat
     set derniere_ronde_ia    = now(),
         rondes_ia_jour       = case when rondes_ia_date = current_date then rondes_ia_jour + 1 else 1 end,
         rondes_ia_date       = current_date,
         derniere_raison_saut = null
   where id = 1;

  perform public.sentinelle_reveil();
end;
$fn$;

/* ── 4. Le cron : toutes les 30 min, mais les portes decident ── */
do $$
begin
  perform cron.unschedule('sentinelle_reveil');
exception when others then null;
end $$;
do $$
begin
  perform cron.unschedule('sentinelle_horloge_ia');
exception when others then null;
end $$;

select cron.schedule('sentinelle_horloge_ia', '*/30 * * * *',
  $$ select public.sentinelle_horloge_ia(); $$);

/* ── 5. Changer de mode depuis la console ────────────────────
   `sentinelle_etat` est lisible par la cle publique (l ecran a besoin de
   savoir dans quel mode elle est), mais pas inscriptible : basculer le
   mode revient a ouvrir ou fermer le robinet a euros, donc ca passe par
   la phrase de passe, comme un geste lourd. */
create or replace function public.sentinelle_changer_mode(p_phrase text, p_mode text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  avant text;
begin
  if not public.sentinelle_phrase_ok(p_phrase) then
    return jsonb_build_object('ok', false, 'message', 'Phrase de passe incorrecte.');
  end if;
  if p_mode not in ('non', 'semi', 'full') then
    return jsonb_build_object('ok', false, 'message', 'Mode inconnu.');
  end if;

  select mode_autonomie into avant from public.sentinelle_etat where id = 1;
  update public.sentinelle_etat set mode_autonomie = p_mode where id = 1;

  insert into public.sentinelle_journal (action, cible, details, resultat, message)
  values ('changer_mode', null, jsonb_build_object('avant', avant, 'apres', p_mode), 'ok',
          format('mode %s -> %s', coalesce(avant, '?'), p_mode));

  return jsonb_build_object('ok', true, 'mode', p_mode,
    'message', case p_mode
      when 'non'  then 'Elle ne tournera plus seule. Zero appel, zero euro.'
      when 'semi' then 'Elle ronde et prepare, tu decides.'
      else 'Elle agit seule dans ses limites.' end);
end;
$fn$;

revoke all on function public.sentinelle_changer_mode(text, text) from public;
grant execute on function public.sentinelle_changer_mode(text, text) to anon, authenticated;

/* ── 6. Verification ─────────────────────────────────────────── */
select jobname, schedule, active from cron.job where jobname like 'sentinelle%';
select mode_autonomie,
       derniere_ronde_ia,
       rondes_ia_jour,
       public.sentinelle_pourquoi_pas() as pourquoi_elle_ne_tourne_pas_la
  from public.sentinelle_etat where id = 1;

/* ══════════════════════════════════════════════════════════════════
   SIGNALEMENTS.sql — la boîte aux lettres de la Sentinelle
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL dans l'éditeur SQL Supabase. Idempotent.

   PRÉREQUIS : SENTINELLE_ACTIONS.sql doit avoir été collé avant — on
   réutilise sa table `sentinelle_secret` (la phrase de passe) et son
   `sentinelle_journal` (le registre).

   CE QUE ÇA OUVRE
   ───────────────
   Jusqu'ici la Sentinelle ne parlait qu'à Cookithan. Les joueurs, eux,
   n'avaient aucun moyen de dire « ça ne marche pas » : au mieux un
   message Discord, au pire rien du tout — et un bug qu'on ne raconte
   jamais n'est jamais corrigé.

   Tout le monde voit désormais la bannière dans les Réglages, mais en
   INVITÉ : on ne peut qu'envoyer un signalement, jamais lire ceux des
   autres, jamais agir.

   POURQUOI PERSONNE N'ÉCRIT DIRECTEMENT DANS LA TABLE
   ──────────────────────────────────────────────────
   La clé Supabase de l'app est publique. Ouvrir la table en écriture au
   rôle anonyme, c'est accepter que quelqu'un y déverse cent mille
   lignes en une nuit — et noie le seul signalement qui comptait.

   La table est donc FERMÉE (RLS active, aucune politique, droits
   révoqués). Tout passe par des fonctions `security definer` qui
   comptent, vérifient, et refusent :

     · envoyer_signalement()   — ouvert à tous, mais freiné
     · signalements_ouverts()  — ouvert à tous, ne renvoie qu'un NOMBRE
     · signalements_lister()   — exige la phrase de passe
     · signalements_traiter()  — exige la phrase de passe

   Le compteur public ne renvoie qu'un entier : de quoi afficher une
   pastille « 3 en attente » sur la bannière sans laisser fuiter une
   seule ligne de contenu.

   POURQUOI LA LECTURE EXIGE LA PHRASE
   ───────────────────────────────────
   Un signalement contient le pseudo et le code de celui qui l'écrit, et
   souvent celui d'un joueur accusé de tricher. C'est nominatif. Le
   rendre lisible avec la clé publique reviendrait à publier les
   dénonciations — la première personne à le découvrir irait se venger.
══════════════════════════════════════════════════════════════════ */

/* ── 1. La boîte ──────────────────────────────────────────────── */
create table if not exists public.signalements (
  id          bigserial primary key,
  cree_le     timestamptz not null default now(),
  user_code   text,
  user_name   text,
  app_version text,
  categorie   text not null,
  chemin      text not null,            -- le fil des choix, lisible
  message     text not null,
  contexte    jsonb,                    -- niveau, langue, plateforme…
  statut      text not null default 'nouveau',   -- nouveau | vu | traite | sans_suite
  note        text,                     -- ce que Cookithan en a fait
  traite_le   timestamptz
);

create index if not exists signalements_statut_idx on public.signalements (statut, cree_le desc);
create index if not exists signalements_code_idx   on public.signalements (user_code, cree_le desc);

/* Fermée à double tour : RLS active et AUCUNE politique. Même en
   lecture — cf. l'en-tête, c'est nominatif. */
alter table public.signalements enable row level security;
revoke all on public.signalements from anon, authenticated;
revoke all on sequence public.signalements_id_seq from anon, authenticated;

/* ── 2. La phrase de passe, en un seul endroit ────────────────
   Même contrat que dans action_sentinelle : dix refus en quinze
   minutes et la porte se ferme, sinon la phrase est devinable à la
   machine puisque la fonction est appelable avec la clé publique. */
create or replace function public.sentinelle_phrase_ok(p_phrase text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  attendu   text;
  refus_15m int;
begin
  select count(*) into refus_15m
    from public.sentinelle_journal
   where resultat = 'refus' and created_at > now() - interval '15 minutes';

  if refus_15m >= 10 then
    insert into public.sentinelle_journal (action, resultat, message)
    values ('signalements', 'refus', 'trop de tentatives — porte fermée 15 min');
    return false;
  end if;

  select s.phrase into attendu from public.sentinelle_secret s where s.id = 1;

  if attendu is null or attendu like 'CHANGE-MOI%' or p_phrase is null or p_phrase <> attendu then
    insert into public.sentinelle_journal (action, resultat, message)
    values ('signalements', 'refus', 'phrase incorrecte');
    return false;
  end if;

  return true;
end;
$$;

/* ── 3. Envoyer — ouvert à tous, mais freiné ──────────────────
   Trois freins, du plus serré au plus large :
     · une minute entre deux envois du même compte  (le double-clic)
     · huit par jour et par compte                  (le joueur agacé)
     · trois cents par heure, tous comptes confondus (l'attaque)

   Le dernier est le seul qui protège vraiment : les deux premiers se
   contournent en changeant de code. Il vaut mieux perdre quelques
   signalements pendant une heure que perdre la boîte entière. */
create or replace function public.envoyer_signalement(
  p_user_code   text,
  p_user_name   text,
  p_app_version text,
  p_categorie   text,
  p_chemin      text,
  p_message     text,
  p_contexte    jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  msg     text := btrim(coalesce(p_message, ''));
  code    text := nullif(btrim(coalesce(p_user_code, '')), '');
  recent  int;
  nouveau bigint;
begin
  if length(msg) < 5 then
    return jsonb_build_object('ok', false, 'message', 'Écris au moins une phrase : sans description, personne ne pourra reproduire le problème.');
  end if;
  if length(msg) > 1200 then
    return jsonb_build_object('ok', false, 'message', 'Message trop long (1200 caractères maximum).');
  end if;
  if coalesce(btrim(p_categorie), '') = '' or coalesce(btrim(p_chemin), '') = '' then
    return jsonb_build_object('ok', false, 'message', 'Signalement incomplet.');
  end if;

  select count(*) into recent from public.signalements
   where cree_le > now() - interval '1 hour';
  if recent >= 300 then
    return jsonb_build_object('ok', false, 'message', 'La boîte reçoit trop de messages en ce moment. Réessaie dans un moment.');
  end if;

  if code is not null then
    select count(*) into recent from public.signalements
     where user_code = code and cree_le > now() - interval '1 minute';
    if recent >= 1 then
      return jsonb_build_object('ok', false, 'message', 'Attends une minute entre deux signalements.');
    end if;

    select count(*) into recent from public.signalements
     where user_code = code and cree_le > now() - interval '24 hours';
    if recent >= 8 then
      return jsonb_build_object('ok', false, 'message', 'Tu as déjà envoyé 8 signalements aujourd''hui. Reviens demain.');
    end if;
  end if;

  insert into public.signalements (user_code, user_name, app_version, categorie, chemin, message, contexte)
  values (code,
          left(btrim(coalesce(p_user_name, '')), 40),
          left(btrim(coalesce(p_app_version, '')), 20),
          left(btrim(p_categorie), 40),
          left(btrim(p_chemin), 300),
          msg,
          coalesce(p_contexte, '{}'::jsonb))
  returning id into nouveau;

  return jsonb_build_object('ok', true, 'id', nouveau,
    'message', 'Signalement envoyé. Merci — la Sentinelle le transmet à Cookithan.');
end;
$$;

/* ── 4. Le compteur public ───────────────────────────────────
   Un entier, rien d'autre : de quoi allumer une pastille sur la
   bannière sans laisser lire une ligne. */
create or replace function public.signalements_ouverts()
returns int
language sql
security definer
set search_path = public
as $$
  select count(*)::int from public.signalements where statut = 'nouveau';
$$;

/* ── 5. Lire — réservé à la phrase ───────────────────────────── */
create or replace function public.signalements_lister(
  p_phrase text,
  p_statut text default null,     -- null = tout ce qui n'est pas classé
  p_limite int  default 60
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resultat jsonb;
begin
  if not public.sentinelle_phrase_ok(p_phrase) then
    return jsonb_build_object('ok', false, 'message', 'Phrase de passe incorrecte.');
  end if;

  select coalesce(jsonb_agg(to_jsonb(s) order by s.cree_le desc), '[]'::jsonb)
    into resultat
    from (
      select * from public.signalements
       where (p_statut is not null and statut = p_statut)
          or (p_statut is null and statut in ('nouveau', 'vu'))
       order by cree_le desc
       limit greatest(1, least(coalesce(p_limite, 60), 200))
    ) s;

  return jsonb_build_object('ok', true, 'lignes', resultat);
end;
$$;

/* ── 6. Traiter — réservé à la phrase ─────────────────────────
   Journalisé comme toute action de la console : on doit pouvoir
   savoir plus tard ce qui a été fait d'un signalement, et quand. */
create or replace function public.signalements_traiter(
  p_phrase text,
  p_id     bigint,
  p_statut text,
  p_note   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not public.sentinelle_phrase_ok(p_phrase) then
    return jsonb_build_object('ok', false, 'message', 'Phrase de passe incorrecte.');
  end if;

  if p_statut not in ('nouveau', 'vu', 'traite', 'sans_suite') then
    return jsonb_build_object('ok', false, 'message', 'Statut inconnu.');
  end if;

  update public.signalements
     set statut    = p_statut,
         note      = coalesce(nullif(btrim(coalesce(p_note, '')), ''), note),
         traite_le = case when p_statut in ('traite', 'sans_suite') then now() else traite_le end
   where id = p_id;
  get diagnostics n = row_count;

  if n = 0 then
    return jsonb_build_object('ok', false, 'message', 'Signalement introuvable.');
  end if;

  insert into public.sentinelle_journal (action, cible, details, resultat, message)
  values ('signalement_' || p_statut, p_id::text,
          jsonb_build_object('id', p_id, 'statut', p_statut, 'note', p_note),
          'ok', 'Signalement ' || p_id || ' → ' || p_statut);

  return jsonb_build_object('ok', true, 'message', 'Signalement mis à jour.');
end;
$$;

/* ── 7. Les droits d'appel ────────────────────────────────────
   L'app appelle avec la clé publique : il faut autoriser explicitement.
   Ce sont la phrase de passe et les freins qui protègent, pas le droit
   d'appel. `sentinelle_phrase_ok` n'est PAS exposée : elle ne sert que
   depuis les fonctions ci-dessus, l'exposer offrirait un oracle à
   phrase sans limite de débit. */
grant execute on function public.envoyer_signalement(text, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.signalements_ouverts()                                        to anon, authenticated;
grant execute on function public.signalements_lister(text, text, int)                          to anon, authenticated;
grant execute on function public.signalements_traiter(text, bigint, text, text)                to anon, authenticated;
revoke execute on function public.sentinelle_phrase_ok(text) from anon, authenticated;

/* ── 8. Vérification ──────────────────────────────────────────
   Attendu, dans l'ordre :
     1. un envoi accepté   → ok = true
     2. le même tout de suite → refusé (une minute entre deux)
     3. une lecture avec une fausse phrase → refusée
     4. le compteur public → au moins 1
   Le signalement d'essai est supprimé à la fin. */
select public.envoyer_signalement('TEST-SQL', 'essai', '0.0.0', 'bug', 'Essai depuis l''éditeur SQL',
       'Ceci est un signalement de test, il va être supprimé.', '{"essai":true}'::jsonb) as essai_1_accepte;

select public.envoyer_signalement('TEST-SQL', 'essai', '0.0.0', 'bug', 'Essai depuis l''éditeur SQL',
       'Deuxième essai immédiat, doit être refusé.', '{"essai":true}'::jsonb) as essai_2_refuse;

/* L'essai 3 lisait avec une fausse phrase : chaque refus alimente le
   compteur anti-force-brute (dix en quinze minutes et la porte se ferme),
   donc installer verrouillait un peu la console. On vérifie plutôt que
   `anon` a le droit d'appeler la lecture — c'est ce qui casse l'app. */
select p.proname                                    as fonction,
       pg_get_function_identity_arguments(p.oid)    as arguments,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_peut_appeler
  from pg_proc p
  join pg_namespace ns on ns.oid = p.pronamespace
 where ns.nspname = 'public' and p.proname = 'signalements_lister';

select public.signalements_ouverts() as essai_4_compteur;

delete from public.signalements where user_code = 'TEST-SQL';

select count(*) as doit_etre_zero from public.signalements where user_code = 'TEST-SQL';

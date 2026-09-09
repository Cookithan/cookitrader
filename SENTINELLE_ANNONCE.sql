/* ══════════════════════════════════════════════════════════════════
   SENTINELLE_ANNONCE.sql — elle parle aux joueurs
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL. Idempotent. Aucun placeholder.
   Prérequis : SIGNALEMENTS.sql (la phrase) et SENTINELLE_ACTIONS.sql
   (le journal).

   Cookithan, le 09/09 : « quand elle souhaite écrire un message à un
   joueur en particulier ou à ceux en ligne, qu'elle puisse le faire,
   mais que ça apparaisse comme un pop-up puis retrouvable dans la
   messagerie du joueur ».

   DEUX PORTÉES, DEUX MÉCANIQUES DIFFÉRENTES
   ─────────────────────────────────────────
   · 'maintenant' — ceux qui ont l'app OUVERTE (actifs dans le quart
     d'heure). On ne touche PAS au bandeau : on dépose un message chez
     chacun d'eux, et l'app le relève à son battement de 30 s, ce qui le
     fait apparaître en pop-up bleu. Celui qui ouvrira demain ne verra
     rien — c'était un message pour l'instant présent (« le marché
     rouvre », « le bug est corrigé »).
   · 'tous' — le bandeau system_status, que l'app affiche déjà et qui
     part en Realtime : instantané pour ceux qui sont là, et vu une fois
     par ceux qui ouvriront plus tard. On dépose EN PLUS une copie chez
     les joueurs des sept derniers jours, sinon l'annonce s'évaporerait
     sans laisser de trace dans aucune messagerie.

   POURQUOI UNE FONCTION À PART
   ────────────────────────────
   Comme sentinelle_modifier_joueur : greffer une branche dans
   action_sentinelle obligerait à recoller les onze gestes existants, et
   à les risquer. Même porte (la phrase), même journal.

   ⚠️ DIX PAR JOUR, ET C'EST BEAUCOUP
   Le plafond est de dix annonces par 24 h. Vu du téléphone d'un joueur,
   dix pop-ups, c'est un toutes les heures et demie : c'est un plafond,
   pas un objectif. Le vrai frein est ailleurs, dans son savoir — elle
   n'annonce que ce qu'elle a CONSTATÉ dans les données, jamais une
   opinion ni une promotion. Un plafond haut ne protège que sur le
   papier ; c'est la consigne qui protège vraiment.

   ⚠️ CE GESTE NE S'ANNULE PAS. Un pop-up vu est vu. C'est le seul de sa
   panoplie qui touche tout le monde ET qui est irréversible.
══════════════════════════════════════════════════════════════════ */

create or replace function public.sentinelle_annoncer(
  p_phrase text,
  p_titre  text,
  p_corps  text,
  p_portee text default 'maintenant'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  deja    int;
  touches int := 0;
  fenetre timestamptz;
  titre   text := btrim(coalesce(p_titre, ''));
  corps   text := btrim(coalesce(p_corps, ''));
begin
  if not public.sentinelle_phrase_ok(p_phrase) then
    return jsonb_build_object('ok', false, 'message', 'Phrase de passe incorrecte.');
  end if;
  if titre = '' or corps = '' then
    return jsonb_build_object('ok', false, 'message', 'Un titre et un corps sont requis.');
  end if;
  if p_portee not in ('maintenant', 'tous') then
    return jsonb_build_object('ok', false, 'message', 'Portee inconnue : maintenant ou tous.');
  end if;

  /* Le plafond se compte au journal : pas de compteur a tenir a jour,
     donc rien qui puisse se desynchroniser. */
  select count(*) into deja
    from public.sentinelle_journal
   where action = 'annoncer' and resultat = 'ok'
     and created_at > now() - interval '24 hours';
  if deja >= 10 then
    insert into public.sentinelle_journal (action, cible, resultat, message)
    values ('annoncer', p_portee, 'refus', 'plafond de 10 annonces sur 24 h atteint');
    return jsonb_build_object('ok', false, 'message', 'Plafond de 10 annonces par 24 h atteint.');
  end if;

  if p_portee = 'tous' then
    /* Le bandeau : l app l affiche deja, et system_status est en
       Realtime — donc instantane pour qui a l app ouverte. La premiere
       ligne sert de titre cote modale, d ou le saut de ligne. */
    update public.system_status
       set banner_message  = titre || E'\n' || corps,
           banner_severity = 'sentinelle'
     where id = 1;
    fenetre := now() - interval '7 days';
  else
    fenetre := now() - interval '15 minutes';
  end if;

  /* La copie dans les messageries : c est ce qui rend l annonce
     RETROUVABLE. Un bandeau se ferme et disparait a jamais. */
  insert into public.inbox_messages (user_code, type, title, body, payload)
  select u.user_code, 'sentinelle', left(titre, 80), left(corps, 800), null
    from public.users u
   where u.last_active > fenetre
     and u.user_code is not null;
  get diagnostics touches = row_count;

  insert into public.sentinelle_journal (action, cible, details, resultat, message)
  values ('annoncer', p_portee,
          jsonb_build_object('titre', titre, 'portee', p_portee, 'joueurs', touches),
          'ok', format('%s -> %s joueur(s)', titre, touches));

  return jsonb_build_object('ok', true, 'joueurs', touches, 'restant', 9 - deja,
    'message', format('Annonce deposee chez %s joueur(s).%s', touches,
      case when p_portee = 'tous' then ' Le bandeau est pose pour tout le monde.' else '' end));
end;
$fn$;

revoke all on function public.sentinelle_annoncer(text, text, text, text) from public;
grant execute on function public.sentinelle_annoncer(text, text, text, text) to anon, authenticated;

/* ── Effacer le bandeau ──────────────────────────────────────
   Une annonce 'tous' reste affichee jusqu a ce qu on la retire. Sans
   ce geste, la seule facon de l enlever serait de passer par l editeur
   SQL — donc en pratique, elle resterait. */
create or replace function public.sentinelle_taire_annonce(p_phrase text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.sentinelle_phrase_ok(p_phrase) then
    return jsonb_build_object('ok', false, 'message', 'Phrase de passe incorrecte.');
  end if;
  update public.system_status set banner_message = null where id = 1;
  insert into public.sentinelle_journal (action, resultat, message)
  values ('taire_annonce', 'ok', 'bandeau retire');
  return jsonb_build_object('ok', true, 'message', 'Bandeau retire.');
end;
$fn$;

revoke all on function public.sentinelle_taire_annonce(text) from public;
grant execute on function public.sentinelle_taire_annonce(text) to anon, authenticated;

/* ── Vérification ────────────────────────────────────────────
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
   and p.proname in ('sentinelle_annoncer', 'sentinelle_taire_annonce')
 order by p.proname;


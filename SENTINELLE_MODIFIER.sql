/* ══════════════════════════════════════════════════════════════════
   SENTINELLE_MODIFIER.sql — une vraie main sur un compte
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL dans l'éditeur SQL Supabase. Idempotent.
   Prérequis : SIGNALEMENTS.sql (la phrase de passe) et
   SENTINELLE_ACTIONS.sql (le journal).

   Cookithan : « si je lui demande de faire ci ou ça, elle doit être
   capable de le faire directement — exemple : donne accès à tous les
   jeux à le vrai cooki ».

   Ses onze gestes savaient sanctionner, compenser, fermer le marché.
   Aucun ne savait simplement CHANGER quelque chose sur un compte. D'où
   celui-ci : il écrit un ou plusieurs champs d'un coup, et incrémente le
   compteur d'adoption pour que le téléphone du joueur PRENNE la valeur
   au lieu de la réécrire cinq secondes plus tard.

   POURQUOI UNE FONCTION À PART, ET NON UNE DOUZIÈME BRANCHE
   ─────────────────────────────────────────────────────────
   Première tentative : greffer la branche dans action_sentinelle en la
   recomposant depuis son propre code source, pour ne pas dupliquer ici
   les onze gestes existants. Il fallait alors écrire du SQL contenant du
   SQL contenant des guillemets échappés — et Postgres a refusé la
   concaténation. Une fonction indépendante fait exactement la même
   chose, se relit, et ne peut pas casser les onze gestes en essayant de
   les préserver.

   Elle vérifie la phrase de passe elle-même : c'est la MÊME porte que la
   console, pas une seconde clé. Sans la phrase, elle refuse.

   CE QU'ELLE PEUT TOUCHER, ET RIEN D'AUTRE
   ────────────────────────────────────────
   level, xp, cookies, cafes, total_earned, weekly_earned, prestige_level,
   streak, active_theme, active_title, user_bio, et la liste `unlocked`
   (ajout ou retrait). Liste blanche : un champ absent d'ici ne peut pas
   être écrit, quoi que demande l'appelant. Ce qui n'est pas fourni ne
   bouge pas — changer le seul niveau ne touche à rien d'autre.

   Volontairement HORS de portée : user_code (l'identité), restore_pin
   (la clé de restauration du joueur), et le portefeuille $CKM, qui a ses
   propres gestes et sa garde de prix.

   ⚠️ CE QU'ELLE NE POURRA PAS FAIRE, ET QU'IL FAUT DIRE
   L'ACCÈS AUX MINI-JEUX ne se donne pas à distance : le déverrouillage
   par code promo vit dans le téléphone (localStorage) et ne remonte
   jamais en base — vérifié, il n'est pas dans les champs synchronisés.
   Mais les jeux s'ouvrent AUSSI par le niveau, et le niveau est en base.
   Le palier le plus haut livré est Flappy (12), donc passer un compte au
   NIVEAU 12 lui ouvre tous les mini-jeux. C'est le chemin réel, et c'est
   celui que la Sentinelle doit proposer au lieu de promettre l'impossible.
══════════════════════════════════════════════════════════════════ */

create or replace function public.sentinelle_modifier_joueur(
  p_phrase text,
  p_cible  text,
  p_params jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  u        record;
  liste    text[];
  ajout    text[];
  retrait  text[];
  changes  text[] := array[]::text[];
  n        int;
  touche   boolean;
begin
  if not public.sentinelle_phrase_ok(p_phrase) then
    return jsonb_build_object('ok', false, 'message', 'Phrase de passe incorrecte.');
  end if;

  select * into u from public.users where user_code = p_cible;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Aucun compte avec ce code.');
  end if;

  /* -- La liste des objets debloques : ajout et retrait --
     Cote app c est une chaine separee par des virgules. On la decoupe,
     on applique, on recolle, sans jamais creer de doublon. */
  liste := case
             when coalesce(u.unlocked, '') = '' then array[]::text[]
             else string_to_array(u.unlocked, ',')
           end;
  liste := array(select distinct btrim(x) from unnest(liste) as x where btrim(x) <> '');

  if p_params ? 'ajouter_unlocked' then
    select array_agg(btrim(value)) into ajout
      from jsonb_array_elements_text(p_params->'ajouter_unlocked')
     where btrim(value) <> '';
    if ajout is not null then
      liste := array(select distinct x from unnest(liste || ajout) as x);
      changes := changes || format('%s objet(s) ajoute(s)', array_length(ajout, 1));
    end if;
  end if;

  if p_params ? 'retirer_unlocked' then
    select array_agg(btrim(value)) into retrait
      from jsonb_array_elements_text(p_params->'retirer_unlocked')
     where btrim(value) <> '';
    if retrait is not null then
      liste := array(select x from unnest(liste) as x where not (x = any(retrait)));
      changes := changes || format('%s objet(s) retire(s)', array_length(retrait, 1));
    end if;
  end if;

  touche := (p_params ? 'ajouter_unlocked') or (p_params ? 'retirer_unlocked');

  /* -- L ecriture : liste blanche, coalesce sur l existant --
     Ce qui n est pas fourni garde sa valeur. C est ce qui permet de ne
     changer QUE le niveau sans toucher au reste du compte. */
  update public.users set
    level          = coalesce((p_params->>'level')::int,            level),
    xp             = coalesce((p_params->>'xp')::int,               xp),
    cookies        = coalesce((p_params->>'cookies')::bigint,       cookies),
    cafes          = coalesce((p_params->>'cafes')::int,            cafes),
    total_earned   = coalesce((p_params->>'total_earned')::bigint,  total_earned),
    weekly_earned  = coalesce((p_params->>'weekly_earned')::bigint, weekly_earned),
    prestige_level = coalesce((p_params->>'prestige_level')::int,   prestige_level),
    streak         = coalesce((p_params->>'streak')::int,           streak),
    active_theme   = coalesce(p_params->>'active_theme',            active_theme),
    active_title   = coalesce(p_params->>'active_title',            active_title),
    user_bio       = coalesce(p_params->>'user_bio',                user_bio),
    unlocked       = case when touche then array_to_string(liste, ',') else unlocked end,
    /* Sans ca, le telephone reecrit ses anciennes valeurs dans les cinq
       secondes. Lecon du 08/09 : elle vaut pour TOUTE ecriture serveur. */
    force_adopt_version = coalesce(force_adopt_version, 0) + 1
  where user_code = p_cible;
  get diagnostics n = row_count;

  if p_params ? 'level'          then changes := changes || format('niveau %s', p_params->>'level'); end if;
  if p_params ? 'xp'             then changes := changes || format('xp %s', p_params->>'xp'); end if;
  if p_params ? 'cookies'        then changes := changes || format('%s cookies', p_params->>'cookies'); end if;
  if p_params ? 'cafes'          then changes := changes || format('%s cafes', p_params->>'cafes'); end if;
  if p_params ? 'total_earned'   then changes := changes || format('cumul %s', p_params->>'total_earned'); end if;
  if p_params ? 'weekly_earned'  then changes := changes || format('semaine %s', p_params->>'weekly_earned'); end if;
  if p_params ? 'prestige_level' then changes := changes || format('prestige %s', p_params->>'prestige_level'); end if;
  if p_params ? 'streak'         then changes := changes || format('serie %s', p_params->>'streak'); end if;
  if p_params ? 'active_theme'   then changes := changes || 'theme equipe'; end if;
  if p_params ? 'active_title'   then changes := changes || 'titre equipe'; end if;
  if p_params ? 'user_bio'       then changes := changes || 'bio'; end if;

  insert into public.sentinelle_journal (action, cible, details, resultat, message)
  values ('modifier_joueur', p_cible, p_params,
          case when n > 0 then 'ok' else 'erreur' end,
          coalesce(array_to_string(changes, ', '), 'rien'));

  return jsonb_build_object(
    'ok', n > 0,
    'message', case when array_length(changes, 1) is null
                    then 'Rien a changer.'
                    else 'Compte modifie : ' || array_to_string(changes, ', ') || '.' end
  );
end;
$fn$;

revoke all on function public.sentinelle_modifier_joueur(text, text, jsonb) from public;
grant execute on function public.sentinelle_modifier_joueur(text, text, jsonb) to anon, authenticated;

/* -- Verification : sans la bonne phrase, elle doit refuser -- */
select public.sentinelle_modifier_joueur('phrase-volontairement-fausse', 'AAA-000', '{}'::jsonb) as doit_refuser;

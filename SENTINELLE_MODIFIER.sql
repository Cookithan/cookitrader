/* ══════════════════════════════════════════════════════════════════
   SENTINELLE_MODIFIER.sql — une vraie main sur un compte
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL. Idempotent.
   Prérequis : SENTINELLE_ACTIONS.sql.

   Régis : « si je lui demande de faire ci ou ça, elle doit être capable
   de le faire directement — exemple : donne accès à tous les jeux à
   le vrai cooki ».

   Ses onze gestes savaient sanctionner, compenser, fermer le marché.
   Aucun ne savait simplement CHANGER quelque chose sur un compte. D'où
   cette action : modifier_joueur, qui écrit un ou plusieurs champs
   d'un compte, d'un coup, et incrémente le compteur d'adoption pour que
   le téléphone du joueur prenne la valeur au lieu de la réécrire.

   CE QU'ELLE PEUT TOUCHER, ET RIEN D'AUTRE
   ────────────────────────────────────────
   niveau, xp, cookies, cafés, cumul, gains de la semaine, prestige,
   série, thème et titre équipés, bio, et la liste des objets débloqués
   (ajout ou retrait). La liste est blanche : un champ absent d'ici ne
   peut pas être écrit, quoi que demande l'appelant.

   Volontairement HORS de portée : user_code (l'identité), restore_pin
   (la clé de restauration du joueur), force_adopt_version (géré ici),
   et tout ce qui touche au marché — il a ses propres gestes et sa garde
   de prix.

   ⚠️ CE QU'ELLE NE POURRA PAS FAIRE, ET POURQUOI
   L'ACCÈS AUX MINI-JEUX ne se donne pas à distance : `unlockedGames`
   vit dans le téléphone (localStorage), il n'est jamais synchronisé.
   Aucune écriture en base ne peut le changer.
   Mais les jeux se déverrouillent AUSSI par le niveau, et le niveau est
   en base : passer un joueur au niveau 13 lui ouvre tous les mini-jeux
   livrés (le plus haut palier livré est Flappy, 12). C'est le
   chemin réel, et c'est celui que la Sentinelle doit proposer.
══════════════════════════════════════════════════════════════════ */

create or replace function public.sentinelle_modifier_joueur(cible text, params jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  u          record;
  liste      text[];
  ajout      text[];
  retrait    text[];
  changes    text[] := array[]::text[];
  n          int;
begin
  select * into u from public.users where user_code = cible;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Aucun compte avec ce code.');
  end if;

  /* ── Les objets débloqués : ajout et retrait sur une liste ──
     `unlocked` est une chaîne séparée par des virgules côté app. On la
     découpe, on applique, on recolle — sans jamais créer de doublon. */
  liste := case
             when coalesce(u.unlocked, '') = '' then array[]::text[]
             else string_to_array(u.unlocked, ',')
           end;
  liste := array(select distinct btrim(x) from unnest(liste) as x where btrim(x) <> '');

  if params ? 'ajouter_unlocked' then
    select array_agg(btrim(value)) into ajout
      from jsonb_array_elements_text(params->'ajouter_unlocked')
     where btrim(value) <> '';
    if ajout is not null then
      liste := array(select distinct x from unnest(liste || ajout) as x);
      changes := changes || format('objets +%s', array_length(ajout, 1));
    end if;
  end if;

  if params ? 'retirer_unlocked' then
    select array_agg(btrim(value)) into retrait
      from jsonb_array_elements_text(params->'retirer_unlocked')
     where btrim(value) <> '';
    if retrait is not null then
      liste := array(select x from unnest(liste) as x where not (x = any(retrait)));
      changes := changes || format('objets -%s', array_length(retrait, 1));
    end if;
  end if;

  /* ── L écriture, champ par champ, liste blanche ──
     coalesce sur la valeur existante : ce qui n est pas fourni ne bouge
     pas. C est ce qui permet de ne changer QUE le niveau sans toucher
     au reste. */
  update public.users set
    level          = coalesce((params->>'level')::int,          level),
    xp             = coalesce((params->>'xp')::int,             xp),
    cookies        = coalesce((params->>'cookies')::bigint,     cookies),
    cafes          = coalesce((params->>'cafes')::int,          cafes),
    total_earned   = coalesce((params->>'total_earned')::bigint, total_earned),
    weekly_earned  = coalesce((params->>'weekly_earned')::bigint, weekly_earned),
    prestige_level = coalesce((params->>'prestige_level')::int, prestige_level),
    streak         = coalesce((params->>'streak')::int,         streak),
    active_theme   = coalesce(params->>'active_theme',          active_theme),
    active_title   = coalesce(params->>'active_title',          active_title),
    user_bio       = coalesce(params->>'user_bio',              user_bio),
    unlocked       = case when (params ? 'ajouter_unlocked') or (params ? 'retirer_unlocked')
                          then array_to_string(liste, ',')
                          else unlocked end,
    /* Sans ça, le téléphone réécrit ses anciennes valeurs dans les cinq
       secondes. Leçon du 08/09, elle vaut pour TOUTE écriture. */
    force_adopt_version = coalesce(force_adopt_version, 0) + 1
  where user_code = cible;
  get diagnostics n = row_count;

  if params ? 'level'          then changes := changes || format('niveau %s', params->>'level'); end if;
  if params ? 'cookies'        then changes := changes || format('%s cookies', params->>'cookies'); end if;
  if params ? 'cafes'          then changes := changes || format('%s cafes', params->>'cafes'); end if;
  if params ? 'total_earned'   then changes := changes || format('cumul %s', params->>'total_earned'); end if;
  if params ? 'weekly_earned'  then changes := changes || format('semaine %s', params->>'weekly_earned'); end if;
  if params ? 'prestige_level' then changes := changes || format('prestige %s', params->>'prestige_level'); end if;
  if params ? 'streak'         then changes := changes || format('serie %s', params->>'streak'); end if;
  if params ? 'active_theme'   then changes := changes || 'theme equipe'; end if;
  if params ? 'active_title'   then changes := changes || 'titre equipe'; end if;
  if params ? 'user_bio'       then changes := changes || 'bio'; end if;

  return jsonb_build_object(
    'ok', n > 0,
    'message', case when array_length(changes, 1) is null
                    then 'Rien a changer.'
                    else 'Compte modifie : ' || array_to_string(changes, ', ') || '.' end
  );
end;
$$;

/* ── La brancher dans la console ──────────────────────────────
   On insère une branche avant le « else » final de action_sentinelle,
   sans réécrire la fonction : on la recompose depuis son propre code
   source, ce qui évite de dupliquer ici les onze gestes existants et
   de les voir diverger. */
do $$
declare
  src text;
  nouveau text;
begin
  select pg_get_functiondef(p.oid) into src
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.proname = 'action_sentinelle'
   limit 1;

  if src is null then
    raise notice 'action_sentinelle introuvable — passer SENTINELLE_ACTIONS.sql d abord.';
    return;
  end if;

  if position('modifier_joueur' in src) > 0 then
    raise notice 'modifier_joueur deja branche — rien a faire.';
    return;
  end if;

  nouveau := replace(
    src,
    E'  elsif action = \'nettoyer_portefeuille\' then',
    E'  elsif action = \'modifier_joueur\' then\n'
    '    /* Une main directe sur un compte, pour ce que Regis demande de\n'
    '       vive voix. Liste blanche de champs, compteur d adoption\n'
    '       incremente, tout au journal. */\n'
    '    declare r jsonb; begin\n'
    '      r := public.sentinelle_modifier_joueur(cible, params);\n'
    '      if not (r->>''ok'')::boolean then\n'
    '        insert into public.sentinelle_journal (action, cible, details, resultat, message)\n'
    '        values (action, cible, params, ''erreur'', r->>''message'');\n'
    '        return r;\n'
    '      end if;\n'
    '      msg := r->>''message'';\n'
    '    end;\n\n'
    E'  elsif action = \'nettoyer_portefeuille\' then'
  );

  if nouveau = src then
    raise notice 'point d insertion introuvable — la branche n a pas ete ajoutee.';
    return;
  end if;

  execute nouveau;
  raise notice 'modifier_joueur branche dans action_sentinelle.';
end $$;

/* ── Vérification ────────────────────────────────────────────── */
select position('modifier_joueur' in pg_get_functiondef(p.oid)) > 0 as branche
  from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
 where ns.nspname = 'public' and p.proname = 'action_sentinelle';

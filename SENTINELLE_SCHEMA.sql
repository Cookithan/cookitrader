/* ══════════════════════════════════════════════════════════════════
   SENTINELLE_SCHEMA.sql — la vigie regarde enfin sa propre base
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL, UNE SEULE FOIS. Idempotent. Lecture seule.

   POURQUOI
   ────────
   Le 09/09/2026, la console de sanction a refusé d'écrire : « column
   plafond_earned does not exist ». LE_MUR_CORRECTIF.sql n'était jamais
   passé en base. Le formulaire cassé n'était que le symptôme visible —
   la vraie conséquence, c'est que le mur anti-restauration tournait
   encore sans `security definer`, donc sans voir la liste de
   surveillance, donc sans bloquer quoi que ce soit. Le compte
   sanctionné avait repris 111 194 cookies sans que rien ne sonne.

   Le trou n'était pas dans le code : il était entre le code et la base.
   Le dépôt savait ce qu'il fallait, la base ne l'avait pas, et RIEN ne
   comparait les deux. Cette fonction est ce comparateur.

   CE QU'ELLE FAIT
   ───────────────
   On lui donne une liste d'objets attendus (une table, une colonne, une
   fonction) et elle répond, pour chacun, présent ou absent. C'est tout.
   La liste vit dans l'app (`src/data/schemaAttendu.js`) : ajouter un
   contrôle plus tard ne demandera JAMAIS de repasser du SQL.

   CE QU'ELLE NE FAIT PAS, ET POURQUOI
   ───────────────────────────────────
   Elle n'exécute rien. Pas d'ALTER, pas de CREATE, aucune correction
   automatique. L'app ne se connecte qu'avec la clé anonyme, celle qui
   part dans le bundle de tous les joueurs : lui donner le droit de
   modifier le schéma reviendrait à le donner à n'importe qui, et une
   phrase de passe ne rattraperait pas ça. La console dit ce qui manque
   et quel fichier le règle ; le geste reste humain, dans l'éditeur SQL.

   Elle ne révèle rien non plus : elle ne LISTE pas le schéma, elle
   répond oui/non à des noms qu'on lui soumet — et ces noms sont déjà
   dans le bundle de l'app. Aucune information nouvelle ne sort.
══════════════════════════════════════════════════════════════════ */

create or replace function public.sentinelle_schema(objets jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  o        jsonb;
  present  boolean;
  resultat jsonb := '[]'::jsonb;
begin
  if objets is null or jsonb_typeof(objets) <> 'array' then
    return '[]'::jsonb;
  end if;

  /* Garde-fou : une liste démesurée ne doit pas servir à balayer le
     schéma entier objet par objet. Cinquante suffit très largement. */
  if jsonb_array_length(objets) > 50 then
    return '[]'::jsonb;
  end if;

  for o in select * from jsonb_array_elements(objets)
  loop
    if coalesce(o->>'colonne', '') <> '' then
      select exists (
        select 1 from information_schema.columns
         where table_schema = 'public'
           and table_name   = o->>'table'
           and column_name  = o->>'colonne'
      ) into present;

    elsif coalesce(o->>'fonction', '') <> '' then
      select exists (
        select 1 from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname = o->>'fonction'
      ) into present;

    elsif coalesce(o->>'table', '') <> '' then
      select exists (
        select 1 from information_schema.tables
         where table_schema = 'public'
           and table_name   = o->>'table'
      ) into present;

    else
      present := null;
    end if;

    resultat := resultat || jsonb_build_object('id', o->>'id', 'present', present);
  end loop;

  return resultat;
end;
$$;

/* La vigie tourne chez n'importe quel client, donc la clé anonyme doit
   pouvoir appeler la fonction. C'est sans danger : elle est en lecture
   seule et ne répond qu'à des noms qu'on lui donne. */
revoke all on function public.sentinelle_schema(jsonb) from public;
grant execute on function public.sentinelle_schema(jsonb) to anon, authenticated;

/* ── Vérification ────────────────────────────────────────────────
   Doit répondre : plafond_earned présent (après LE_MUR_CORRECTIF),
   et une colonne inventée absente. */
select public.sentinelle_schema('[
  {"id":"mur",     "table":"comptes_sous_surveillance", "colonne":"plafond_earned"},
  {"id":"bidon",   "table":"comptes_sous_surveillance", "colonne":"colonne_qui_nexiste_pas"},
  {"id":"actions", "fonction":"action_sentinelle"}
]'::jsonb) as etat_du_schema;

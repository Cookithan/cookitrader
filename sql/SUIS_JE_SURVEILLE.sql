/* ══════════════════════════════════════════════════════════════════
   SUIS_JE_SURVEILLE.sql — un compte peut savoir qu'il est surveillé
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL. Idempotent. Aucun placeholder.
   Prérequis : LE_MUR.sql (la table comptes_sous_surveillance).

   Cookithan, le 10/09 : « si un joueur est surveillé par un mur, alors
   son splash devient un splash Sentinelle ».

   POURQUOI UNE FONCTION, ET PAS UNE LECTURE DIRECTE
   ─────────────────────────────────────────────────
   `comptes_sous_surveillance` est fermée à la clé publique, et doit le
   rester : la liste complète des comptes sanctionnés n'a rien à faire
   dans un bundle qui part chez tout le monde. Cette fonction ne répond
   que sur UN code à la fois, et ne renvoie qu'un booléen — pas les
   plafonds, pas le motif, pas la date.

   CE QU'ELLE PERMET DE DEVINER, ET POURQUOI C'EST ACCEPTABLE
   ──────────────────────────────────────────────────────────
   Quelqu'un qui essaierait des codes au hasard pourrait apprendre qu'un
   compte donné est sanctionné. Le format AAA-000 fait ~17 millions de
   combinaisons, et l'information obtenue est de peu de valeur : elle ne
   donne aucun accès, ne révèle ni chiffres ni motif. Le compte concerné,
   lui, le sait déjà — ses valeurs ont été remises à plat sous ses yeux.

   ⚠️ CECI CONTREDIT UNE CONSIGNE DONNÉE À LA SENTINELLE
   Son savoir lui dit : « tu ne dis jamais à un joueur qu'il est surveillé
   ou soupçonné. » Ce splash, lui, le dit. Ce n'est pas une incohérence
   mais une répartition : ELLE ne l'annonce pas au détour d'une
   conversation, où ça ressemblerait à une accusation ; l'app l'affiche
   franchement, une fois, à quelqu'un qui a déjà été sanctionné. La
   consigne reste valable pour elle.
══════════════════════════════════════════════════════════════════ */

create or replace function public.suis_je_surveille(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $fn$
begin
  if p_code is null or btrim(p_code) = '' then
    return false;
  end if;
  return exists (
    select 1 from public.comptes_sous_surveillance
     where user_code = btrim(p_code)
  );
end;
$fn$;

revoke all on function public.suis_je_surveille(text) from public;
grant execute on function public.suis_je_surveille(text) to anon, authenticated;

/* ── Vérification ────────────────────────────────────────────
   L'objet existe-t-il, et `anon` peut-il l'appeler ? (cf. règle 12 du
   CLAUDE.md : on ne teste plus avec une fausse phrase de passe.) */
select p.proname                                    as fonction,
       pg_get_function_identity_arguments(p.oid)    as arguments,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_peut_appeler
  from pg_proc p
  join pg_namespace ns on ns.oid = p.pronamespace
 where ns.nspname = 'public' and p.proname = 'suis_je_surveille';

/* Combien de comptes sont concernés aujourd'hui (vu depuis l'éditeur,
   donc en tant que postgres — un joueur, lui, ne verra jamais cette
   liste). */
select count(*) as comptes_sous_surveillance from public.comptes_sous_surveillance;

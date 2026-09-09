/* ══════════════════════════════════════════════════════════════════
   INBOX_TYPE_SENTINELLE.sql — autoriser le type « sentinelle »
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL. Idempotent. Aucun placeholder.

   LE BUG QU'IL CORRIGE
   ────────────────────
   Le 09/09 au soir, `ecrire_au_joueur` est passé du type 'system' au type
   'sentinelle' pour que l'app puisse faire remonter ses réponses en
   pop-up bleu. Sauf que `inbox_messages.type` porte une contrainte CHECK
   qui ne connaît pas cette valeur : chaque réponse partait en violation
   de contrainte, et **elle ne pouvait plus répondre à personne**.

   Elle l'a diagnostiqué elle-même, à 20 h 59 :
     manque · « envoi de message au joueur échoue sur constraint »
   C'est sa mémoire des manques qui a servi, pour de vrai, le premier
   soir. Mais un signalement a été marqué « traité » sans que le joueur
   reçoive quoi que ce soit — la réponse est perdue, pas différée.

   POURQUOI ON ÉTEND AU LIEU DE RÉÉCRIRE
   ─────────────────────────────────────
   La table a été créée à la main : sa définition n'est nulle part dans le
   dépôt. Recomposer la contrainte de mémoire, c'est risquer d'oublier une
   valeur — 'tournament_reward' et 'referral_reward' existent dans le code
   mais n'ont jamais servi, donc aucune ligne en base ne les porte et rien
   ne me les rappellerait. Casser les cadeaux ou les demandes d'ami pour
   réparer un pop-up serait un très mauvais marché.

   On lit donc la contrainte EXISTANTE avec pg_get_constraintdef, et on y
   injecte la seule valeur qui manque. Si la forme n'est pas celle qu'on
   attend, on ne touche à rien et on le dit : mieux vaut un pop-up qui
   reste gris qu'une messagerie cassée.
══════════════════════════════════════════════════════════════════ */

do $$
declare
  c        record;
  nouvelle text;
begin
  select conname, pg_get_constraintdef(oid) as def
    into c
    from pg_constraint
   where conrelid = 'public.inbox_messages'::regclass
     and contype  = 'c'
     and pg_get_constraintdef(oid) ilike '%type%'
   limit 1;

  if not found then
    raise notice 'Aucune contrainte CHECK sur inbox_messages.type — rien a faire, le type sentinelle passe deja.';
    return;
  end if;

  raise notice 'Contrainte trouvee : % => %', c.conname, c.def;

  if c.def ilike '%sentinelle%' then
    raise notice 'Le type sentinelle est deja autorise. Rien a faire.';
    return;
  end if;

  /* Forme attendue : CHECK ((type = ANY (ARRAY['system'::text, ...])))
     On injecte en TETE de la liste, sans toucher au reste. */
  nouvelle := replace(c.def, 'ARRAY[', 'ARRAY[''sentinelle''::text, ');

  if nouvelle = c.def then
    raise notice 'Forme de contrainte inattendue : on ne touche a RIEN. Ajouter la valeur a la main, ou laisser tel quel (elle repondra en type system).';
    return;
  end if;

  execute format('alter table public.inbox_messages drop constraint %I', c.conname);
  execute format('alter table public.inbox_messages add constraint %I %s', c.conname, nouvelle);
  raise notice 'Type sentinelle autorise.';
end $$;

/* ── Vérification ────────────────────────────────────────────
   La contrainte telle qu'elle est MAINTENANT. On doit y lire
   'sentinelle' parmi les valeurs acceptées. */
select con.conname                        as contrainte,
       pg_get_constraintdef(con.oid)      as definition,
       pg_get_constraintdef(con.oid) ilike '%sentinelle%' as sentinelle_autorisee
  from pg_constraint con
 where con.conrelid = 'public.inbox_messages'::regclass
   and con.contype  = 'c';

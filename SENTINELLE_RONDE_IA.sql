/* ══════════════════════════════════════════════════════════════════
   SENTINELLE_RONDE_IA.sql — l'horloge la réveille, elle, pas juste le SQL
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL. Idempotent.
   Prérequis : SENTINELLE_HORLOGE.sql, SENTINELLE_NOTES.sql,
   SENTINELLE_DOSSIERS.sql, et la fonction serveur déployée.

   Régis : « elle gère autant l'application que moi, c'est le but final ».
   Jusqu'ici le modèle ne se réveillait que quand il ouvrait la Sentinelle.
   Ici, toutes les heures, l'horloge appelle la fonction serveur en mode
   « ronde » : elle regarde tout AVEC SA TÊTE, fait ce qu'elle a le droit
   de faire seule — répondre aux joueurs, compenser dans les plafonds,
   marquer, fermer un marché qui déraille, noter — et laisse dans la pile
   uniquement ce que Régis est le seul à pouvoir décider.

   COMMENT ELLE S'AUTHENTIFIE SANS CONNAÎTRE LA PHRASE
   ───────────────────────────────────────────────────
   Le cron ne doit pas connaître la phrase de passe. Il présente un JETON,
   tiré au hasard ici et rangé dans sentinelle_secret ; la fonction
   compare, puis va chercher la phrase elle-même avec la clé de service.
   Deux lectures de la même ligne, aucun secret dans ce fichier ni dans
   le code. La clé « anon » ci-dessous est publique : elle est déjà dans
   le bundle de chaque joueur, elle n'ouvre rien sans le jeton.

   COÛT
   ────
   Une ronde par heure, 24 par jour, à claude-haiku-4-5. Pour l'arrêter :
   select cron.unschedule('sentinelle_reveil');
══════════════════════════════════════════════════════════════════ */

create extension if not exists pg_net;

/* ── 1. Le jeton, et les colonnes du tableau ─────────────────── */
alter table public.sentinelle_secret
  add column if not exists jeton_cron text;

update public.sentinelle_secret
   set jeton_cron = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
 where id = 1 and jeton_cron is null;

alter table public.sentinelle_etat
  add column if not exists dernieres_bandes jsonb,
  add column if not exists derniere_frise   jsonb;

/* ── 2. Le réveil ────────────────────────────────────────────── */
create or replace function public.sentinelle_reveil()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  j text;
begin
  select jeton_cron into j from public.sentinelle_secret where id = 1;
  if j is null then return; end if;

  /* Une ronde peut prendre une minute : on laisse le temps. La réponse
     n'est pas attendue ici — la fonction écrit elle-même au journal. */
  perform net.http_post(
    url     := '<<URL>>/functions/v1/sentinelle',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'apikey',        '<<CLE_ANON>>',
      'Authorization', 'Bearer <<CLE_ANON>>'
    ),
    body    := jsonb_build_object('mode', 'ronde', 'jeton', j),
    timeout_milliseconds := 120000
  );
end;
$$;

/* ── 3. Toutes les heures, à la 7e minute ────────────────────── */
do $$
begin
  perform cron.unschedule('sentinelle_reveil');
exception when others then null;
end $$;

select cron.schedule('sentinelle_reveil', '7 * * * *', $$ select public.sentinelle_reveil(); $$);

/* ── 4. Vérification, et un premier réveil tout de suite ─────── */
select jobname, schedule, active from cron.job where jobname = 'sentinelle_reveil';
select public.sentinelle_reveil();

/* Dans une minute, ceci doit montrer une ligne « ronde_ia » : */
select created_at, action, resultat, message
  from public.sentinelle_journal
 where action = 'ronde_ia'
 order by created_at desc
 limit 3;

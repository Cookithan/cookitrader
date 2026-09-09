/* ══════════════════════════════════════════════════════════════════
   SENTINELLE_DOSSIERS.sql — la pile de dossiers
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL. Idempotent.

   Régis, le 09/09 : « quand on va sur la Sentinelle, d'abord les choses
   à traiter — mais simplifié, avec la Sentinelle qui est là autrement,
   pas un chat à part ». Un associé ne t'attend pas dans une fenêtre :
   il a déjà trié, et il te tend les dossiers.

   Un dossier = une chose qui demande TA décision (ou un joueur qui
   attend), rédigée par elle, avec le geste qu'elle propose déjà rempli.
   Ce qu'elle peut faire seule, elle le fait et n'en fait pas un dossier.

   La `cle` est stable (ex. « triche:AZL-C8T », « signalement:12 ») :
   un dossier classé ne revient pas sous un autre titre à la ronde
   suivante. C'est ce qui empêche la pile de se remplir des mêmes choses.

   Lue et écrite par la clé de service seulement.
══════════════════════════════════════════════════════════════════ */

create table if not exists public.sentinelle_dossiers (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  cle          text not null unique,
  /* 'triche' | 'marche' | 'signalement' | 'joueur' | 'app' | 'info' */
  genre        text not null,
  /* 'haute' | 'moyenne' | 'basse' */
  gravite      text not null default 'moyenne',
  titre        text not null,            -- sa phrase : ce qu'il y a, en clair
  analyse      text,                     -- ce qu'elle a regardé, et pourquoi elle pense ça
  proposition  text,                     -- le libellé du bouton (ex. « Sanctionner à 70 194 »)
  actions      jsonb,                    -- [{outil, entree}] : le geste, déjà rempli
  /* 'ouvert' | 'classe' | 'fait' */
  statut       text not null default 'ouvert',
  decision     text,                     -- ce que Régis a décidé, ou ce qui a été exécuté
  decision_le  timestamptz,
  resultats    jsonb,                    -- ce que les gestes ont renvoyé
  /* La conversation collée au dossier : [{qui:'regis'|'sentinelle', texte, quand}] */
  echanges     jsonb not null default '[]'::jsonb
);

create index if not exists sentinelle_dossiers_ouverts_idx
  on public.sentinelle_dossiers (gravite, created_at desc) where statut = 'ouvert';

alter table public.sentinelle_dossiers enable row level security;
revoke all on public.sentinelle_dossiers from anon, authenticated;

/* Le mot du jour et l'heure de la dernière rédaction : elle ne réécrit
   pas la pile à chaque ouverture, seulement si ça date. */
alter table public.sentinelle_etat
  add column if not exists dernier_mot         text,
  add column if not exists derniere_seule      text,
  add column if not exists dossiers_rediges_le timestamptz;

select count(*) filter (where statut = 'ouvert') as dossiers_ouverts,
       count(*) as dossiers_total
  from public.sentinelle_dossiers;

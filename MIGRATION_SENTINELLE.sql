/* ══════════════════════════════════════════════════════════════════
   MIGRATION_SENTINELLE.sql — les tables de la sentinelle
   ──────────────────────────────────────────────────────────────────
   À EXÉCUTER UNE SEULE FOIS dans l'éditeur SQL Supabase. Idempotent :
   le relancer ne casse rien.

   POURQUOI
   ────────
   Le 08/09/2026, le cours du marché est tombé à 300 parce qu'un joueur
   tournait encore sur une version de juillet. Personne ne l'a vu venir,
   et il a fallu deviner la cause après coup. Avant ça, l'exploit du
   Memory est resté neuf semaines en ligne sans qu'aucun signal ne
   parte — il a été découvert parce qu'un joueur l'a dit.

   La sentinelle existe pour que la prochaine anomalie se signale
   d'elle-même. Elle tourne sans PC, sans ligne de commande, et sans
   personne pour la lancer : chaque client qui ouvre l'app y contribue.

   TROIS TABLES
   ────────────
   · app_health          — ce que les clients rapportent en continu :
                           quelle version ils font tourner, quand ils
                           plantent, quand l'anti-triche se déclenche.
   · sentinelle_rapports — les verdicts des rondes (ok / voir / alerte).
   · sentinelle_etat     — l'horloge partagée, pour qu'une ronde ne soit
                           pas rejouée par chaque client à la seconde.

   RLS : les clients doivent pouvoir ÉCRIRE dans app_health (sinon rien
   ne remonte) et LIRE les rapports. Ils ne peuvent rien effacer. C'est
   volontairement permissif, comme le reste du projet — un client
   malveillant peut donc mentir sur son propre rapport. La sentinelle
   est un tableau de bord de santé, pas une preuve opposable : ce qui
   fait foi reste les chiffres du serveur (cookies, actions, classement),
   que les rondes recoupent justement.
══════════════════════════════════════════════════════════════════ */

/* ── 1. Ce que les clients rapportent ─────────────────────────── */
create table if not exists public.app_health (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  /* 'ouverture' | 'crash' | 'triche' */
  kind         text        not null,
  user_code    text,
  user_name    text,
  app_version  text,
  plateforme   text,
  detail       text
);

create index if not exists app_health_created_idx on public.app_health (created_at desc);
create index if not exists app_health_kind_idx    on public.app_health (kind, created_at desc);

/* ── 2. Les verdicts des rondes ───────────────────────────────── */
create table if not exists public.sentinelle_rapports (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  /* 'ok' | 'voir' | 'alerte' */
  verdict     text        not null,
  categorie   text        not null,
  titre       text        not null,
  detail      text[]
);

create index if not exists sentinelle_rapports_idx on public.sentinelle_rapports (created_at desc);

/* ── 3. L'horloge partagée ────────────────────────────────────── */
/* Sans elle, les dix clients ouverts en même temps lanceraient dix
   rondes identiques par minute. Le premier qui arrive pose l'heure,
   les autres voient que c'est déjà fait et passent leur chemin. */
create table if not exists public.sentinelle_etat (
  id              int primary key default 1 check (id = 1),
  derniere_ronde  timestamptz,
  updated_at      timestamptz not null default now()
);

insert into public.sentinelle_etat (id, derniere_ronde)
values (1, null)
on conflict (id) do nothing;

/* ── 4. RLS ───────────────────────────────────────────────────── */
alter table public.app_health          enable row level security;
alter table public.sentinelle_rapports enable row level security;
alter table public.sentinelle_etat     enable row level security;

do $$
begin
  /* app_health : chacun écrit son rapport, tout le monde peut lire
     (l'écran Sentinelle en a besoin), personne n'efface. */
  if not exists (select 1 from pg_policies where tablename = 'app_health' and policyname = 'app_health_lecture') then
    create policy app_health_lecture on public.app_health for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'app_health' and policyname = 'app_health_ecriture') then
    create policy app_health_ecriture on public.app_health for insert with check (true);
  end if;

  /* sentinelle_rapports : mêmes règles — une ronde est lancée par un
     client, donc il faut qu'il puisse écrire ses verdicts. */
  if not exists (select 1 from pg_policies where tablename = 'sentinelle_rapports' and policyname = 'rapports_lecture') then
    create policy rapports_lecture on public.sentinelle_rapports for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'sentinelle_rapports' and policyname = 'rapports_ecriture') then
    create policy rapports_ecriture on public.sentinelle_rapports for insert with check (true);
  end if;

  /* sentinelle_etat : lecture + mise à jour de l'horloge. */
  if not exists (select 1 from pg_policies where tablename = 'sentinelle_etat' and policyname = 'etat_lecture') then
    create policy etat_lecture on public.sentinelle_etat for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'sentinelle_etat' and policyname = 'etat_maj') then
    create policy etat_maj on public.sentinelle_etat for update using (true) with check (true);
  end if;
end $$;

/* ── 5. Vérification ──────────────────────────────────────────── */
select table_name as table_creee
from information_schema.tables
where table_schema = 'public'
  and table_name in ('app_health', 'sentinelle_rapports', 'sentinelle_etat')
order by table_name;

select 'horloge' as objet, derniere_ronde from public.sentinelle_etat where id = 1;

/* ══════════════════════════════════════════════════════════════════
   SENTINELLE_NOTES.sql — ce qu'elle apprend et retient
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL. Idempotent.

   La conversation est sa mémoire à court terme. Ceci est sa mémoire
   longue : les décisions que Cookithan prend (« Miagguy est réglo, ne me
   le ressors plus »), les faits qu'elle établit (« le signalement #12
   est le même bug que #9 »), les choses à ne pas oublier. Elle y écrit
   avec l'outil `retenir`, et relit ses trente dernières notes à chaque
   tour. C'est ce qui fait qu'un associé ne repose pas deux fois la même
   question.

   Lue et écrite par la clé de service seulement.
══════════════════════════════════════════════════════════════════ */

create table if not exists public.sentinelle_notes (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  note        text not null,
  /* 'sentinelle' quand c'est elle qui décide de retenir · 'regis' quand
     il lui a demandé explicitement de noter quelque chose */
  source      text not null default 'sentinelle',
  /* Une note peut être retirée sans être effacée : on garde l'histoire. */
  retiree     boolean not null default false
);

create index if not exists sentinelle_notes_idx on public.sentinelle_notes (created_at desc) where not retiree;

alter table public.sentinelle_notes enable row level security;
revoke all on public.sentinelle_notes from anon, authenticated;

select count(*) as notes_en_memoire from public.sentinelle_notes;

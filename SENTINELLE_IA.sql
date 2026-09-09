/* ══════════════════════════════════════════════════════════════════
   SENTINELLE_IA.sql — la mémoire de la conversation
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL. Idempotent.

   La Sentinelle devient une conversation : elle t'accueille en disant ce
   qui s'est passé, tu lui parles, elle agit. Pour que ce soit un associé
   et pas un répondeur, il lui faut se souvenir — de ce qu'elle t'a déjà
   dit, de ce que tu as décidé, de ce qui reste ouvert. Sans mémoire elle
   te ressert les mêmes trois alertes à chaque ouverture et tu cesses de
   la lire en deux jours.

   Cette table est lue et écrite UNIQUEMENT par la fonction serveur
   (clé de service). La clé anonyme de l'app n'y a aucun droit : la
   conversation contient des codes de joueurs et tes décisions.
══════════════════════════════════════════════════════════════════ */

create table if not exists public.sentinelle_conversation (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  /* 'user' = Cookithan · 'assistant' = la Sentinelle */
  role        text not null check (role in ('user', 'assistant')),
  contenu     text not null,
  /* Ce qu'elle a fait pendant ce tour : [{outil, entree, resultat}] */
  actions     jsonb
);

create index if not exists sentinelle_conversation_idx
  on public.sentinelle_conversation (created_at desc);

alter table public.sentinelle_conversation enable row level security;
/* Aucune policy : personne ne passe par la clé anonyme. La clé de service
   ignore la RLS, c'est elle que la fonction utilise. */

revoke all on public.sentinelle_conversation from anon, authenticated;

select count(*) as messages_en_memoire from public.sentinelle_conversation;

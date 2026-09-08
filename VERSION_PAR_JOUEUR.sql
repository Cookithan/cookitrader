/* ══════════════════════════════════════════════════════════════════
   VERSION_PAR_JOUEUR.sql — connaître la version de CHAQUE joueur
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL dans l'éditeur SQL Supabase. Une ligne utile, le
   reste est de la vérification. Idempotent.

   POURQUOI ON NE PEUT PAS LA DÉDUIRE DE LA DATE
   ─────────────────────────────────────────────
   L'idée paraît solide : regarder la dernière connexion d'un joueur et
   en déduire la version déployée à cette date. Elle est fausse, et on
   en a la preuve datée.

   Le 08/09/2026 à 08h08, le joueur qui a fait tomber le cours du marché
   à 300 était actif à la seconde près. La version déployée à cet
   instant était la 1.30.0. Lui exécutait la 1.27, celle de juillet.

   Une application installée garde son code en cache : la date de
   connexion dit QUAND il s'est synchronisé, jamais QUEL CODE tourne
   chez lui. Déduire l'un de l'autre donnerait exactement le faux
   réconfort qui a coûté la matinée.

   CE QU'ON FAIT À LA PLACE
   ────────────────────────
   L'app estampille sa version à chaque synchronisation de profil.
   Comme tout joueur qui ouvre l'app synchronise, la colonne se remplit
   d'elle-même, pour tout le monde, sans rien demander à personne.

   ET L'EFFET DE BORD QUI VAUT DE L'OR : un client ANCIEN ne connaît pas
   cette colonne, donc il ne l'écrit pas. Une colonne restée VIDE chez un
   joueur ACTIF est donc la signature d'un client périmé — précisément
   ceux qu'on cherche, et qu'aucune date n'aurait révélés.
══════════════════════════════════════════════════════════════════ */

alter table public.users
  add column if not exists app_version text;

/* ── Vérification ─────────────────────────────────────────────
   Juste après le collage, la colonne est vide partout : c'est normal,
   elle se remplira au fur et à mesure que les joueurs ouvrent l'app.
   Relance cette requête demain pour voir le tableau se peupler. */
select coalesce(app_version, '(pas encore estampillée)') as version,
       count(*)                                          as joueurs,
       count(*) filter (where last_active > now() - interval '7 days') as dont_actifs_7j
  from public.users
 group by 1
 order by joueurs desc;

/* Les comptes à surveiller : actifs, mais sans version estampillée.
   Vide au début, puis ne devrait contenir que des clients périmés. */
select user_name,
       user_code,
       last_active
  from public.users
 where app_version is null
   and last_active > now() - interval '7 days'
 order by last_active desc;

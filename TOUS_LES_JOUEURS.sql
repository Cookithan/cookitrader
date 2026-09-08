/* ══════════════════════════════════════════════════════════════════
   TOUS_LES_JOUEURS.sql — le tableau complet, sans filtre de temps
   ──────────────────────────────────────────────────────────────────
   À COLLER dans l'éditeur SQL Supabase. Ne modifie RIEN : que des
   lectures, relançable à volonté.

   La requête de VERSION_PAR_JOUEUR.sql ne listait que les comptes
   actifs des 7 derniers jours — d'où les 8. Celle-ci prend les 32.
══════════════════════════════════════════════════════════════════ */

/* ── 1. Le tableau complet ────────────────────────────────────── */
select user_name                                   as pseudo,
       user_code                                   as code,
       coalesce(app_version, '— jamais estampillée') as version,
       level                                       as niveau,
       total_earned                                as cumul,
       last_active,
       case
         when last_active is null                        then 'jamais vu'
         when last_active > now() - interval '7 days'     then 'actif cette semaine'
         when last_active > now() - interval '30 days'    then 'actif ce mois-ci'
         when last_active > now() - interval '60 days'    then 'vu il y a 1 à 2 mois'
         else 'inactif depuis plus de 2 mois'
       end                                          as activite
  from public.users
 order by last_active desc nulls last;

/* ── 2. Le résumé par version ─────────────────────────────────── */
select coalesce(app_version, '— jamais estampillée') as version,
       count(*)                                      as joueurs,
       count(*) filter (where last_active > now() - interval '30 days') as dont_actifs_30j,
       count(*) filter (where last_active > now() - interval '60 days') as dont_actifs_60j
  from public.users
 group by 1
 order by joueurs desc;

/* ── 3. Ce qu'il faut comprendre du résultat ──────────────────
   Juste après l'ajout de la colonne, TOUT est « jamais estampillée ».
   Elle se remplit à la première ouverture de l'app de chaque joueur —
   donc le tableau se peuple de lui-même, dans l'ordre où les gens
   reviennent jouer.

   ⚠️ Un compte qui ne revient JAMAIS gardera une version inconnue pour
   toujours. Ce n'est pas un trou dans l'outil : c'est la réalité. Un
   téléphone éteint depuis trois mois n'exécute aucun code, donc il
   n'écrit rien, donc il ne peut rien casser. Les seuls comptes dont la
   version compte vraiment sont ceux qui reviennent — et ceux-là
   s'estampillent en revenant.                                       */

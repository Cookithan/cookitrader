/* ══════════════════════════════════════════════════════════════════
   EFFACER_TEXTES_MAINTENANCE.sql
   ──────────────────────────────────────────────────────────────────
   À coller dans l'éditeur SQL Supabase, une fois. Sans danger : ça ne
   touche qu'aux deux textes de l'écran de maintenance, et la
   maintenance est éteinte.

   POURQUOI
   `system_status.maintenance_subtitle` contenait encore « Test Pour
   Fedi ». Invisible tant que la maintenance dort — mais c'est ce que
   TOUS les joueurs auraient lu le jour où on la déclenche en urgence,
   et ce jour-là on ne relit pas les textes.

   Le geste prévu (Sentinelle → Agir → L'application → Maintenance) ne
   pouvait pas l'enlever : le formulaire n'envoyait jamais un champ
   vide, et le SQL faisait `coalesce(params->>'titre', ancien)`. Les
   textes étaient inscriptibles, jamais effaçables. Corrigé côté app et
   dans SENTINELLE_ACTIONS.sql — mais il faut bien nettoyer une fois ce
   qui dort déjà en base.

   ⚠️ Penser aussi à recoller SENTINELLE_ACTIONS.sql en entier (le
   fichier est idempotent, il ne réinitialise PAS la phrase de passe) :
   sans ça, la prochaine fois, le vide ne passera toujours pas.
══════════════════════════════════════════════════════════════════ */

update public.system_status
   set maintenance_title    = null,
       maintenance_subtitle = null,
       updated_at           = now()
 where id = 1;

/* Contrôle : les deux colonnes doivent être vides, et
   maintenance_mode rester à false. */
select maintenance_mode, maintenance_title, maintenance_subtitle, force_version
  from public.system_status
 where id = 1;

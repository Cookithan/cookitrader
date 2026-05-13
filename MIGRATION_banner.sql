-- ════════════════════════════════════════════════════
-- BANNER ANNONCE — extension de system_status
-- ════════════════════════════════════════════════════
-- Ajoute 2 colonnes pour afficher un bandeau d'annonce en haut
-- de l'écran de tous les joueurs (mise à jour à venir, maintenance
-- bientôt, événement, etc.).
--
-- Propagation : Realtime déjà actif sur system_status → tous les
-- clients ouverts reçoivent le changement en <1 s (cf. l'existant
-- subscribeSystemStatus).
--
-- Si banner_message est NULL → pas de bandeau affiché.
-- banner_severity ∈ {'info', 'warning', 'success'} → couleur du fond.
-- ════════════════════════════════════════════════════

alter table public.system_status
  add column if not exists banner_message  text,
  add column if not exists banner_severity text default 'info'
    check (banner_severity in ('info', 'warning', 'success'));

-- ─────────────────────────────────────────────────────
-- EXEMPLES D'UTILISATION (copier-coller au besoin)
-- ─────────────────────────────────────────────────────

-- Annonce d'info simple (palette cream/moka — défaut)
update public.system_status
set banner_message  = '✨ Nouvelle version disponible — recharge la page',
    banner_severity = 'info'
where id = 1;

-- Avertissement (palette caramel/or — attire l'œil)
update public.system_status
set banner_message  = '⚠️ Maintenance prévue à 21 h — sauvegarde ta partie',
    banner_severity = 'warning'
where id = 1;

-- Annonce festive / succès (palette or vif)
update public.system_status
set banner_message  = '🎉 Nouvelle saison lancée — bonus XP × 2 jusqu''à dimanche !',
    banner_severity = 'success'
where id = 1;

-- Désactiver le bandeau (NULL → pas d'affichage)
update public.system_status
set banner_message = null
where id = 1;

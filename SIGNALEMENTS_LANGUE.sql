/* ══════════════════════════════════════════════════════════════════
   SIGNALEMENTS_LANGUE.sql — que les refus se traduisent aussi
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL, après SIGNALEMENTS.sql. Idempotent, court, et
   sans aucun test qui écrive : il ne remplace qu'une fonction.

   LE PROBLÈME
   ───────────
   L'écran de signalement est le seul de la Sentinelle ouvert à TOUS les
   joueurs — donc le seul qui doive vivre en deux langues. Tout y est
   traduit… sauf ce que répond la base.

   Un joueur en anglais qui envoie deux signalements coup sur coup
   recevait « Attends une minute entre deux signalements. » Et un refus
   qu'on ne comprend pas, c'est un joueur qui croit l'app cassée et qui
   n'essaie plus.

   LA CORRECTION
   ─────────────
   La base ne connaît pas la langue du joueur, et lui envoyer serait
   une mauvaise idée : il faudrait maintenir les traductions à deux
   endroits, et elles divergeraient. Elle renvoie donc un CODE — un mot
   stable, jamais affiché — et c'est l'app qui choisit la phrase.

   Le message français reste dans la réponse : si un jour un code
   n'était pas prévu côté app, elle l'afficherait plutôt que de laisser
   l'utilisateur devant un écran muet.
══════════════════════════════════════════════════════════════════ */

create or replace function public.envoyer_signalement(
  p_user_code   text,
  p_user_name   text,
  p_app_version text,
  p_categorie   text,
  p_chemin      text,
  p_message     text,
  p_contexte    jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  msg     text := btrim(coalesce(p_message, ''));
  code    text := nullif(btrim(coalesce(p_user_code, '')), '');
  recent  int;
  nouveau bigint;
begin
  if length(msg) < 5 then
    return jsonb_build_object('ok', false, 'code', 'trop_court',
      'message', 'Écris au moins une phrase : sans description, personne ne pourra reproduire le problème.');
  end if;
  if length(msg) > 1200 then
    return jsonb_build_object('ok', false, 'code', 'trop_long',
      'message', 'Message trop long (1200 caractères maximum).');
  end if;
  if coalesce(btrim(p_categorie), '') = '' or coalesce(btrim(p_chemin), '') = '' then
    return jsonb_build_object('ok', false, 'code', 'incomplet',
      'message', 'Signalement incomplet.');
  end if;

  select count(*) into recent from public.signalements
   where cree_le > now() - interval '1 hour';
  if recent >= 300 then
    return jsonb_build_object('ok', false, 'code', 'sature',
      'message', 'La boîte reçoit trop de messages en ce moment. Réessaie dans un moment.');
  end if;

  if code is not null then
    select count(*) into recent from public.signalements
     where user_code = code and cree_le > now() - interval '1 minute';
    if recent >= 1 then
      return jsonb_build_object('ok', false, 'code', 'trop_vite',
        'message', 'Attends une minute entre deux signalements.');
    end if;

    select count(*) into recent from public.signalements
     where user_code = code and cree_le > now() - interval '24 hours';
    if recent >= 8 then
      return jsonb_build_object('ok', false, 'code', 'quota_jour',
        'message', 'Tu as déjà envoyé 8 signalements aujourd''hui. Reviens demain.');
    end if;
  end if;

  insert into public.signalements (user_code, user_name, app_version, categorie, chemin, message, contexte)
  values (code,
          left(btrim(coalesce(p_user_name, '')), 40),
          left(btrim(coalesce(p_app_version, '')), 20),
          left(btrim(p_categorie), 40),
          left(btrim(p_chemin), 300),
          msg,
          coalesce(p_contexte, '{}'::jsonb))
  returning id into nouveau;

  return jsonb_build_object('ok', true, 'code', 'envoye', 'id', nouveau,
    'message', 'Signalement envoyé. Merci — la Sentinelle le transmet à Cookithan.');
end;
$$;

grant execute on function public.envoyer_signalement(text, text, text, text, text, text, jsonb) to anon, authenticated;

/* ── Vérification — n'écrit rien ──────────────────────────────
   Un message de deux lettres est refusé AVANT toute insertion : de quoi
   vérifier que le code arrive, sans laisser de ligne d'essai derrière.
   Attendu : ok = false, code = "trop_court". */
select public.envoyer_signalement(
  'VERIF', 'verif', '0.0.0', 'bug', 'verif', 'ok', '{}'::jsonb
) as doit_dire_trop_court;

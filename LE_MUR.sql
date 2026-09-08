/* ══════════════════════════════════════════════════════════════════
   LE_MUR.sql — la seule partie qu'il reste à passer
   ──────────────────────────────────────────────────────────────────
   Les parties 1, 2 et 3 de A_LANCER_MAINTENANT.sql sont DÉJÀ passées
   (vérifié en base le 08/09/2026 au soir) : la garde du prix est en
   place, force_version vaut 1.30.0, les tables de la sentinelle
   existent, la colonne force_adopt_version aussi, et Fedider est
   revenu à sa sanction (niveau 15, 67 000, 10 800 cookies, 14 cafés).

   Reste ce mur, écrit APRÈS ton collage : celui qui empêche un compte
   de remonter ses chiffres sans avoir joué, quelle que soit sa version
   et quel que soit son appareil.

   À COLLER TEL QUEL. Idempotent.
══════════════════════════════════════════════════════════════════ */


/* ══════════════════════════════════════════════════════════════════
   PARTIE 4 — LE MUR : UNE SANCTION QUE LE CLIENT NE PEUT PLUS DÉFAIRE
══════════════════════════════════════════════════════════════════ */

/* POURQUOI UNE QUATRIÈME PARTIE
   ────────────────────────────
   La partie 3 fait adopter les valeurs du serveur par CHAQUE appareil.
   C'est le bon réflexe pour une correction subie — un vieux téléphone
   qui se resynchronise sans que son propriétaire y soit pour rien.

   Mais quand le joueur refait le geste EXPRÈS, à répétition, tout ce qui
   vit dans son téléphone finit par être contourné : rester sur une
   ancienne version, refuser la mise à jour, remettre le compteur
   d'adoption à la main. Un garde-fou côté client protège d'un accident,
   jamais d'une intention.

   D'où ce mur, en base, où le joueur n'a pas la main.

   LE PRINCIPE
   ───────────
   Dans ce jeu, on ne gagne des cookies qu'en JOUANT. Le serveur connaît
   le temps de jeu (total_play_time), donc il peut calculer ce qu'un
   gain a de plausible. Le repère est celui de l'audit : le meilleur
   mini-jeu de l'app plafonne à ~300 cookies pour 60 à 180 secondes, donc
   au-delà de 400 cookies par minute JOUÉE, c'est impossible.

   Quand une écriture dépasse ce plafond, on ne refuse pas la
   transaction — on IGNORE le bond, en gardant les valeurs déjà en base.
   Le client croit avoir écrit, l'app ne casse pas, et la sanction tient.

   ⚠️ CE MUR NE S'APPLIQUE QU'AUX COMPTES INSCRITS dans la table
   ci-dessous. Aucun autre joueur n'est concerné, aucun risque de
   faux positif sur la communauté.

   ⚠️ EFFET DE BORD ASSUMÉ pour un compte sous surveillance : une grosse
   plus-value de marché encaissée sans avoir joué (vendre des actions ne
   consomme pas de temps de jeu) sera elle aussi ignorée. C'est le prix
   d'un mur simple et incontournable ; il lui reste à la regagner en
   jouant. Retirer la ligne de la table rend le compte à la vie normale. */

create table if not exists public.comptes_sous_surveillance (
  user_code   text primary key,
  motif       text,
  /* Marge forfaitaire tolérée à chaque écriture, en plus du plafond
     calculé sur le temps de jeu. Absorbe les arrondis et les petits
     gains hors mini-jeu (cadeaux, codes promo). */
  marge       int  not null default 2000,
  ajoute_le   timestamptz not null default now()
);

insert into public.comptes_sous_surveillance (user_code, motif)
values ('AZL-C8T', 'Exploit Memory 09/2026 — sanction effacée à répétition depuis son appareil')
on conflict (user_code) do nothing;

create or replace function public.mur_anti_restauration()
returns trigger
language plpgsql
as $$
declare
  surveille   boolean;
  marge_cpte  int;
  minutes     numeric;
  plafond     numeric;
begin
  select true, c.marge into surveille, marge_cpte
    from public.comptes_sous_surveillance c
   where c.user_code = new.user_code;

  if not coalesce(surveille, false) then
    return new;             -- 99 % des joueurs : on ne touche à rien
  end if;

  /* Temps de jeu gagné depuis la dernière écriture, en minutes. */
  minutes := greatest(coalesce(new.total_play_time, 0) - coalesce(old.total_play_time, 0), 0) / 60.0;
  plafond := 400 * minutes + marge_cpte;

  if coalesce(new.total_earned, 0) - coalesce(old.total_earned, 0) > plafond then
    /* Bond impossible : on garde tout ce qui est déjà en base. Le niveau
       et les cafés suivent, sinon on obtiendrait un compte niveau 25
       avec le total d'un niveau 15 — exactement l'incohérence que la
       sentinelle signale. */
    new.total_earned  := old.total_earned;
    new.cookies       := old.cookies;
    new.cafes         := least(coalesce(new.cafes, 0), coalesce(old.cafes, 0));
    new.level         := old.level;
    new.xp            := old.xp;
    new.weekly_earned := old.weekly_earned;
    new.unlocked      := old.unlocked;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_mur_anti_restauration on public.users;

create trigger trg_mur_anti_restauration
  before update on public.users
  for each row
  execute function public.mur_anti_restauration();

/* ── Vérification ───────────────────────────────────────────────
   L'essai simule ce que fait son téléphone : réécrire 178 194 sans
   avoir joué. Le total doit rester à 67 000. */
do $$
declare avant numeric; apres numeric;
begin
  select total_earned into avant from public.users where user_code = 'AZL-C8T';
  update public.users set total_earned = 178194 where user_code = 'AZL-C8T';
  select total_earned into apres from public.users where user_code = 'AZL-C8T';
  if apres = avant then
    raise notice 'MUR OK : la restauration a ete ignoree, le total reste a %.', avant;
  else
    raise warning 'MUR INACTIF : le total est passe a %. Verifier que le trigger existe.', apres;
  end if;
end $$;

select user_name,
       level        as niveau,
       total_earned as cumul,
       cookies,
       cafes,
       force_adopt_version as force_adopt,
       (select count(*) from public.comptes_sous_surveillance c where c.user_code = u.user_code) as sous_surveillance
  from public.users u
 where user_code = 'AZL-C8T';

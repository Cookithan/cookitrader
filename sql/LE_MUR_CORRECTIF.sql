/* ══════════════════════════════════════════════════════════════════
   LE_MUR_CORRECTIF.sql — le mur ne tenait que dans l'éditeur SQL
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL. Idempotent. Remplace la fonction du mur, le
   trigger reste en place.

   CE QUI N'ALLAIT PAS
   ───────────────────
   Le test de LE_MUR.sql tournait dans l'éditeur SQL, donc en tant que
   `postgres`, qui ignore la sécurité par ligne. Le mur semblait tenir.

   Rejoué par le VRAI chemin — la clé anonyme de l'app, celle que tous
   les téléphones utilisent — l'écriture passait : `total_earned` est
   remonté à 178 194 sans résistance. (Vérifié, puis restauré aussitôt.)

   La raison : la fonction cherchait le compte dans
   `comptes_sous_surveillance`, mais cette table n'est pas lisible par
   le rôle anonyme. La fonction ne trouvait donc AUCUN compte surveillé
   et laissait tout passer, en silence.

   C'est le piège classique du trigger de sécurité : il doit s'exécuter
   avec les droits de son PROPRIÉTAIRE, pas avec ceux de l'appelant.
   D'où `security definer` ci-dessous — sans quoi celui qu'on veut
   contrôler décide lui-même s'il est contrôlé.

   CE QUE LE CORRECTIF AJOUTE AUSSI
   ────────────────────────────────
   · `security definer` + search_path figé (obligatoire avec definer,
     sinon on ouvre une porte à l'injection par le chemin de schéma).
   · Des garde-fous par CHAMP. L'ancienne version ne réagissait qu'à un
     bond de total_earned : en gardant son total juste sous le plafond,
     on pouvait faire monter cookies, cafés et niveau tranquillement.
   · Le cas du compte SUPPRIMÉ puis recréé : l'upsert du client fait
     alors un INSERT, que l'ancien mur ne regardait pas du tout.
══════════════════════════════════════════════════════════════════ */

/* ── 1. Plafonds de repli, pour le cas du compte recréé ───────── */
alter table public.comptes_sous_surveillance
  add column if not exists plafond_earned  bigint,
  add column if not exists plafond_cookies bigint,
  add column if not exists plafond_cafes   int,
  add column if not exists plafond_level   int;

/* Les chiffres de la sanction du 07/09, ceux annoncés au joueur. */
update public.comptes_sous_surveillance
   set plafond_earned  = 67000,
       plafond_cookies = 10800,
       plafond_cafes   = 14,
       plafond_level   = 15
 where user_code = 'AZL-C8T';

/* ── 2. La fonction, cette fois avec les bons droits ──────────── */
create or replace function public.mur_anti_restauration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c           record;
  minutes     numeric;
  plafond     numeric;
begin
  select * into c
    from public.comptes_sous_surveillance
   where user_code = new.user_code;

  if not found then
    return new;             -- 99 % des joueurs : on ne touche à rien
  end if;

  /* ── Compte recréé après suppression ──────────────────────
     L'upsert du client devient un INSERT, et il n'y a pas d'ancienne
     ligne à comparer. On applique alors les plafonds de la sanction :
     effacer son compte ne doit pas être un moyen de la contourner. */
  if TG_OP = 'INSERT' then
    new.total_earned := least(coalesce(new.total_earned, 0), coalesce(c.plafond_earned,  new.total_earned));
    new.cookies      := least(coalesce(new.cookies, 0),      coalesce(c.plafond_cookies, new.cookies));
    new.cafes        := least(coalesce(new.cafes, 0),        coalesce(c.plafond_cafes,   new.cafes));
    new.level        := least(coalesce(new.level, 1),        coalesce(c.plafond_level,   new.level));
    return new;
  end if;

  /* ── Ce qu'un gain a de plausible ─────────────────────────
     On ne gagne des cookies qu'en jouant : le temps de jeu gagné depuis
     la dernière écriture donne le plafond. Repère de l'audit : au-delà
     de 400 cookies par minute jouée, c'est impossible. */
  minutes := greatest(coalesce(new.total_play_time, 0) - coalesce(old.total_play_time, 0), 0) / 60.0;
  plafond := 400 * minutes + coalesce(c.marge, 2000);

  /* Bond de gains impossible → on garde tout ce qui est déjà en base. */
  if coalesce(new.total_earned, 0) - coalesce(old.total_earned, 0) > plafond then
    new.total_earned  := old.total_earned;
    new.cookies       := old.cookies;
    new.cafes         := least(coalesce(new.cafes, 0), coalesce(old.cafes, 0));
    new.level         := old.level;
    new.xp            := old.xp;
    new.weekly_earned := old.weekly_earned;
    new.unlocked      := old.unlocked;
    return new;
  end if;

  /* ── Garde-fous par champ ─────────────────────────────────
     Sans eux, il suffisait de garder total_earned juste sous le plafond
     pour faire remonter le reste sans jamais déclencher le contrôle. */

  /* Le solde ne peut pas enfler plus vite que les gains. Il peut
     BAISSER librement : dépenser est toujours permis. */
  if coalesce(new.cookies, 0) - coalesce(old.cookies, 0) > plafond then
    new.cookies := old.cookies;
  end if;

  /* Les niveaux se passent un par un dans ce jeu, jamais dix d'un coup
     (cf. addCoins : l'XP excédentaire est perdue, c'est volontaire). */
  if coalesce(new.level, 0) > coalesce(old.level, 0) + 1 then
    new.level := old.level;
    new.xp    := old.xp;
  end if;

  /* Le café est rare par construction. Trois d'un coup, c'est déjà le
     maximum de ce que verse un palier. */
  if coalesce(new.cafes, 0) > coalesce(old.cafes, 0) + 3 then
    new.cafes := old.cafes;
  end if;

  return new;
end;
$$;

/* ── 3. Le trigger couvre aussi l'INSERT désormais ───────────── */
drop trigger if exists trg_mur_anti_restauration on public.users;

create trigger trg_mur_anti_restauration
  before insert or update on public.users
  for each row
  execute function public.mur_anti_restauration();

/* ── 4. Vérification ─────────────────────────────────────────
   ⚠️ Ce test-ci passe encore en tant que postgres : il ne prouve donc
   PAS que le mur tient face à un téléphone. C'est exactement l'erreur
   d'hier. Le vrai test se fait avec la clé anonyme, et je le relance
   de mon côté juste après ton collage. */
do $$
declare avant numeric; apres numeric;
begin
  select total_earned into avant from public.users where user_code = 'AZL-C8T';
  update public.users set total_earned = 178194 where user_code = 'AZL-C8T';
  select total_earned into apres from public.users where user_code = 'AZL-C8T';
  if apres = avant then
    raise notice 'Mur OK cote postgres : total toujours a %. Reste a verifier par la cle anonyme.', avant;
  else
    raise warning 'Mur inactif meme cote postgres : total passe a %.', apres;
  end if;
end $$;

select user_name,
       level        as niveau,
       total_earned as cumul,
       cookies,
       cafes,
       force_adopt_version as force_adopt
  from public.users
 where user_code = 'AZL-C8T';

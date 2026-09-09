/* ══════════════════════════════════════════════════════════════════
   CODES_HISTORIQUES_EN_BASE.sql — les 24 codes de l'app passent en base
   ──────────────────────────────────────────────────────────────────
   À COLLER TEL QUEL dans l'éditeur SQL Supabase. Idempotent : relançable
   sans rien casser (les lignes déjà présentes sont laissées telles
   quelles, y compris si tu les as modifiées depuis la console).

   PRÉREQUIS : SENTINELLE_ACTIONS.sql doit avoir été collé avant — c'est
   lui qui crée la table promo_codes.

   POURQUOI CE N'EST PAS QU'UNE RECOPIE
   ────────────────────────────────────
   La table ne savait stocker que trois récompenses : cookies, cafés,
   actions. Or la moitié des codes historiques font autre chose — BLACK
   débloque un thème, STARTER ouvre Flappy Cookie, ASCENSION pousse le
   classement cumulé sans donner un seul cookie dépensable, BARISTA05
   n'existe que pour qui a croisé le barista légendaire.

   Les recopier sans ces mécaniques les aurait transformés en coquilles
   vides : le joueur tape BLACK, reçoit « rien », et le thème ne vient
   jamais. On ajoute donc les colonnes qui manquaient AVANT de recopier.

   CE QUI CHANGE CÔTÉ APP (déployé en même temps que ce fichier)
   ────────────────────────────────────────────────────────────
   Jusqu'ici l'app regardait son propre code d'abord, la base ensuite.
   Désormais c'est l'inverse : la base fait foi.

     · une ligne active en base    → c'est elle qui décide
     · une ligne marquée supprimée → le code est mort, POINT
     · aucune ligne                → l'app retombe sur son code écrit

   Ce troisième cas est le filet : tant que tu n'as pas collé ce fichier,
   tout marche exactement comme avant. Et si Supabase tombe, les codes
   historiques répondent quand même.

   Le deuxième cas est celui qui compte pour toi. Sans lui, « supprimer
   BLACK » depuis ton téléphone n'aurait rien supprimé du tout : l'app
   serait retombée sur sa copie écrite en dur et le code aurait continué
   de marcher, en te faisant croire l'inverse. C'est pour ça que la
   suppression laisse une ligne MORTE en base plutôt que d'effacer la
   ligne — c'est cette trace qui interdit le retour en arrière.
══════════════════════════════════════════════════════════════════ */

/* ── 1. Les colonnes qui manquaient ───────────────────────────── */
alter table public.promo_codes add column if not exists unlock             text;
alter table public.promo_codes add column if not exists unlock_game        text;
alter table public.promo_codes add column if not exists secret             boolean not null default false;
alter table public.promo_codes add column if not exists no_xp              boolean not null default false;
alter table public.promo_codes add column if not exists niveau             int;
alter table public.promo_codes add column if not exists total_earned_only  bigint;
alter table public.promo_codes add column if not exists total_earned_floor bigint;
alter table public.promo_codes add column if not exists origine            text not null default 'console';

comment on column public.promo_codes.origine is
  'app = code historique recopie depuis src/data/promoCodes.js | console = cree depuis la Sentinelle';

/* ── 2. Les 24 codes ──────────────────────────────────────────── */
insert into public.promo_codes
  (code, coins, cafes, shares, label, unlock, unlock_game, secret, no_xp, total_earned_only, origine)
values
  ('BIENVENUE',  100, 0, 0, 'Bienvenue !',                      null, null, false, false, null, 'app'),
  ('TOP1',        50, 0, 0, 'Top 1 du classement',              null, null, false, false, null, 'app'),
  ('COOKIMINER', 123, 0, 0, '123 🍪 offerts',                   null, null, false, false, null, 'app'),
  ('LATTE',        0, 1, 0, '1 ☕ offert',                      null, null, false, false, null, 'app'),
  ('CMK1',         0, 0, 1, '1 action $CKM offerte',            null, null, false, false, null, 'app'),
  ('3TROIS',       0, 0, 3, '3 actions $CKM offertes',          null, null, false, false, null, 'app'),
  ('BLACK',        0, 0, 0, 'Thème Noir & Blanc débloqué',      'theme_noir',           null, false, false, null, 'app'),
  ('PINK',         0, 0, 0, '🌸 Cookie Rose débloqué',          'skin_pink',            null, false, false, null, 'app'),
  ('GRAIN16',      0, 0, 0, '☕ Grain Légendaire débloqué',     'avatar_grain_legende', null, false, false, null, 'app'),
  ('BARISTA05',    0, 0, 0, 'Thème Cookie & Espresso débloqué', 'theme_grains',         null, true,  false, null, 'app'),
  ('ESPRESSO',    50, 0, 0, '☕ Espresso — 50 🍪',              null, null, false, false, null, 'app'),
  ('CAPPUCCINO',  80, 1, 0, '☕ Cappuccino — 80 🍪 + 1 ☕',     null, null, false, false, null, 'app'),
  ('MACCHIATO',   60, 0, 0, '☕ Macchiato — 60 🍪',             null, null, false, false, null, 'app'),
  ('MOKKA',      100, 0, 0, '🍫 Mokka — 100 🍪',                null, null, false, false, null, 'app'),
  ('ARABICA',     75, 0, 1, '🌱 Arabica — 75 🍪 + 1 action',    null, null, false, false, null, 'app'),
  ('RISTRETTO',   40, 0, 0, '☕ Ristretto — 40 🍪 (petit mais costaud)', null, null, false, false, null, 'app'),
  ('BARISTA',      0, 2, 0, '👨‍🍳 Barista — 2 ☕',              null, null, false, false, null, 'app'),
  ('CREMA',       90, 0, 0, '🤎 Crema — 90 🍪',                 null, null, false, false, null, 'app'),
  ('GRINDER',     50, 0, 0, '⚙️ Grinder — 50 🍪',               null, null, false, false, null, 'app'),
  ('ROAST',      120, 0, 0, '🔥 Roast — 120 🍪',                null, null, false, false, null, 'app'),
  ('DIO456',       0, 4, 0, '☕ 4 cafés offerts',               null, null, false, false, null, 'app'),
  ('BETA',         0, 3, 0, '🧪 Bêta — 3 ☕ offerts',           null, null, false, false, null, 'app'),
  ('ASCENSION',    0, 0, 0, '📈 +7000 🍪 au classement cumulé', null, null, false, false, 7000, 'app'),
  ('STARTER',    500, 3, 0, '🎁 Starter Pack — 500 🍪 + 3 ☕ + Flappy Cookie', null, 'flappy', false, true, null, 'app')
on conflict (code) do nothing;

/* ── 3. Vérification ──────────────────────────────────────────── */
/* Attendu : une ligne « app », 24 codes, 24 actifs, 0 supprimé. */
select origine,
       count(*)                          as codes,
       count(*) filter (where actif)     as actifs,
       count(*) filter (where not actif) as supprimes
  from public.promo_codes
 group by origine
 order by origine;

select code,
       coins, cafes, shares,
       coalesce(unlock, unlock_game, '') as debloque,
       secret,
       coalesce(total_earned_only, 0)    as classement_seul,
       actif,
       origine
  from public.promo_codes
 order by origine, code;

/* ── 4. Pour remettre un jour les 24 à leur valeur d'origine ───
   (après les avoir modifiés depuis la console, par exemple) :

     delete from public.promo_codes where origine = 'app';

   puis recolle ce fichier. Les codes que TU as créés depuis la console
   ne sont pas touchés : ils sont en origine 'console'.
   ────────────────────────────────────────────────────────────── */

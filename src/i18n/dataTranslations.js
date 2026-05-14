/* ════════════════════════════════════════════════════
   dataTranslations.js — traductions EN pour les data
   ────────────────────────────────────────────────────
   Pour ne pas polluer src/data/constants.js avec des champs `_en`
   sur chaque item, on centralise ici les traductions des champs
   textuels. Le hook `localizedField` de i18n/index.js consulte ce
   mapping en priorité (si lang === 'en') et fallback sinon sur le
   champ FR original.

   Structure :
     REWARDS_EN[id] = { name, desc }
     QUESTIONS_EN[index] = { q, choices }
     ACHIEVEMENTS_EN[id] = { name, desc }
     LEVEL_NAMES_EN[index] = string
     CHANGELOG_EN[version] = { title, changes }
═══════════════════════════════════════════════════════ */

/* ── REWARDS (constants.js → REWARDS) ──────────────── */
export const REWARDS_EN = {
  // Badges
  badge_debutant:    { name: 'Beginner Badge',     desc: 'First steps in CookiMiner' },
  badge_barista:     { name: 'Barista Badge',      desc: 'Basic coffee mastery' },
  badge_chef:        { name: 'Chef Badge',         desc: 'For the cookie addicts' },
  badge_legende:     { name: 'Legend Badge',       desc: 'The pinnacle of CookiMiner' },
  badge_connaisseur: { name: 'Connoisseur Badge',  desc: "You've mastered the art of coffee" },
  badge_eternel:     { name: 'Eternal Badge',      desc: 'Beyond Legendary' },
  badge_originel:    { name: 'Primordial Badge',   desc: 'Incarnation of the first cookie' },
  badge_ascendant:   { name: 'Ascendant Badge',    desc: 'You have transcended the cookie' },
  badge_sage:        { name: 'Sage Badge',         desc: 'Your caffeinated wisdom shines' },
  badge_oracle:      { name: 'Oracle Badge',       desc: 'You see beyond the visible' },
  badge_avatar:      { name: 'Avatar Badge',       desc: 'Incarnation of absolute coffee' },
  badge_origine:     { name: 'Origin Badge',       desc: 'The first cookie in person' },

  // Thèmes
  theme_creme:       { name: 'Frothy Cappuccino Theme', desc: 'Warm rosy cream background' },
  theme_espresso:    { name: 'Espresso Night Theme',    desc: 'Dark coffee background' },
  theme_caramel:     { name: 'Caramel Sunrise Theme',   desc: 'Animated warm gradient' },
  theme_legendaire:  { name: 'Legendary Theme',         desc: 'Golden background with particles' },
  theme_velours:     { name: 'Velvet Cappuccino Theme', desc: 'Soft frothy cream' },
  theme_cuir:        { name: 'Leather & Espresso Theme',desc: 'Dark leather + gold accents' },
  theme_elixir:      { name: 'Golden Elixir Theme',     desc: 'Liquid molten gold' },
  theme_renaissance: { name: 'Renaissance Theme',       desc: 'Orange phoenix flames' },
  theme_visionnaire: { name: 'Visionary Theme',         desc: 'Pale soothing celestial dawn' },
  theme_demiurge:    { name: 'Demiurge Theme',          desc: 'Solid gold + creator violet' },
  theme_or_limite:   { name: 'Limited Massive Gold Theme', desc: 'Limited edition — Wheel Special Spin' },
  theme_trader:      { name: 'Savvy Trader Theme',      desc: 'Limited edition — Market Frenzy' },
  theme_noir:        { name: 'Black & White Theme',     desc: 'Limited edition — BLACK promo code' },
  theme_grains:      { name: 'Cookie & Espresso Theme', desc: 'Limited edition — Legendary barista rare drop' },
  skin_pink:         { name: 'Pink Cookie',             desc: 'Limited edition — PINK promo code' },
  avatar_grain_legende:{ name: 'Legendary Bean',        desc: 'Limited edition — GRAIN16 promo code' },

  // Badges événements
  badge_tireur:      { name: 'Marksman Badge',     desc: 'Limited edition — Perfect stop' },
  badge_cerveau:     { name: 'Brain Badge',        desc: 'Limited edition — Perfect quiz' },
  badge_erudit:      { name: 'Scholar Badge',      desc: 'Limited edition — Perfect guess' },
  badge_sprinter:    { name: 'Sprinter Badge',     desc: 'Limited edition — 60 clicks or more' },
  badge_architecte:  { name: 'Architect Badge',    desc: 'Limited edition — 15 cups stacked' },
  badge_tirelire:    { name: 'Piggybank Badge',    desc: 'Limited edition — Triple Slot' },
  badge_aigle:       { name: 'Eagle Badge',        desc: 'Limited edition — Reflexes 20+' },

  // Avatars
  avatar_chef:    { name: 'Star Chef Avatar',      desc: 'Toque, mustache and a star' },
  avatar_robot:   { name: 'Robot Barista Avatar',  desc: 'Cute robot with gears' },
  avatar_chat:    { name: 'Coffee Cat Avatar',     desc: 'Caramel cat in a cup' },
  avatar_renard:  { name: 'Fox Avatar',            desc: 'Fox with whiskers' },
  avatar_panda:   { name: 'Coffee Panda Avatar',   desc: 'Panda with a tiny cup' },
  avatar_loup:    { name: 'Mocha Wolf Avatar',     desc: 'Intense-looking wolf, mocha fur' },
  avatar_or:      { name: 'Solid Gold Avatar',     desc: 'Sparkling golden face' },
  avatar_legende: { name: 'Legend Avatar',         desc: 'Crown + magic cookie' },
  avatar_sage:    { name: 'Coffee Sage Avatar',    desc: 'Old bearded and serene man' },
  avatar_eternel: { name: 'Eternal Avatar',        desc: 'Infinite sparkling halo' },

  // Musiques
  music_matin:    { name: 'Morning Coffee',        desc: 'Early morning coffee jazz' },
  music_bossa:    { name: 'Bossa Nova Music',      desc: 'Brazilian sun' },
  music_royale:   { name: 'Royal Symphony',        desc: 'Baroque classical music' },
  music_velvet:   { name: 'Velvet Smoke',          desc: 'Velvety smoky slow jazz' },
  music_empereur: { name: "Emperor's Beat",        desc: 'Powerful urban drill' },
  music_veillee:  { name: 'Lofi Vigil',            desc: 'Calm cinematic lofi' },
  music_cosmique: { name: 'Cosmic Night',          desc: 'Stellar nocturnal lofi' },
  music_lofi:     { name: 'Lofi Hip-Hop Music',    desc: 'Chill student vibe' },

  // Skins
  skin_caramel:   { name: 'Caramel Cookie',        desc: 'Warm amber dough' },
  skin_noisette:  { name: 'Hazelnut Cookie',       desc: 'Reddish-brown hazelnut' },
  skin_onyx:      { name: 'Onyx Cookie',           desc: 'Black cocoa + gold chips' },
  skin_emeraude:  { name: 'Emerald Cookie',        desc: 'Warm golden halo' },
  skin_dore:      { name: 'Golden Cookie',         desc: 'Sparkling solid gold' },
  skin_cuir:      { name: 'Leather Cookie',        desc: 'Dark tobacco + gold' },
  skin_mythique:  { name: 'Mythical Cookie',       desc: 'Icing + mythical halo' },
  skin_phoenix:   { name: 'Phoenix Cookie',        desc: 'Vivid amber flames' },
  skin_originel:  { name: 'Primordial Cookie',     desc: 'Cosmic gold + violet' },
  skin_oracle:    { name: 'Oracle Cookie',         desc: 'Iridescent mystical multicolor' },
  skin_origine:   { name: 'Origin Cookie',         desc: 'Primordial · gold-violet-cyan' },
  skin_galactique:{ name: 'Galactic Cookie Skin',  desc: 'Stellar violet halo + golden chips' },

  // Titres
  title_mousse:   { name: 'Foam Title',            desc: 'Frothy cream sheen' },
  title_caramel:  { name: 'Caramel Title',         desc: 'Amber caramel shimmer' },
  title_cuivre:   { name: 'Copper Title',          desc: 'Metallic copper sheen' },
  title_velours:  { name: 'Velvet Title',          desc: 'Velvety coffee texture' },
  title_or:       { name: 'Gold Title',            desc: 'Solid gold brilliance' },
  title_elixir:   { name: 'Elixir Title',          desc: 'Liquid gold glow' },
  title_saveur:   { name: 'Flavor Title',          desc: 'Coffee-spices gradient' },
  title_phenix:   { name: 'Phoenix Title',         desc: 'Burning flames' },
  title_cosmique: { name: 'Cosmic Title',          desc: 'Violet stellar glow' },
  title_visionnaire:     { name: 'Visionary Title', desc: 'Pale celestial dawn' },
  title_mystique:        { name: 'Mystic Title',    desc: 'Mysterious flickering violet' },
  title_souverain:       { name: 'Sovereign Title', desc: 'Royal solid gold' },
  title_cosmique_vivant: { name: 'Living Cosmic Title', desc: 'Ultimate multi-color star' },

  // Packs $CKM
  pack_shares_5:  { name: '5 $CKM Shares Pack',    desc: '+5 shares to your portfolio' },
  pack_shares_10: { name: '10 $CKM Shares Pack',   desc: '+10 shares to your portfolio' },

  // Coffres / Boîtes
  box_starter:       { name: 'Mystery Box',        desc: 'Open it to discover a coffee surprise!' },
  chest_bronze:      { name: 'Bronze Chest',       desc: '3 cosmetics to discover' },
  chest_gold:        { name: 'Gold Chest',         desc: '3 rare cosmetics to discover' },
  chest_legendary:   { name: 'Legendary Chest',    desc: '3 epic cosmetics to discover' },

  // Premium ☕
  avatar_cosmonaute: { name: 'Caffeinated Astronaut Avatar', desc: 'Golden helmet, mocha visor, cosmic halo' },
  theme_cosmos:      { name: 'Cosmos Theme',       desc: 'Exclusive galactic background' },
  banner_cookies:    { name: 'Cookies Banner',     desc: '🍪 decor on your level card' },
  pack_share_premium:{ name: '1 $CKM Share',       desc: '+1 share to your portfolio' },
  quiz_skip:         { name: 'Quiz Skip',          desc: 'Instantly resets the quiz cooldown' },
  next_game_doubler: { name: 'Double next gain',   desc: 'Your next mini-game 🍪 gain is doubled' },
  boost_x2_1h:       { name: 'Boost +30% (1 h)',   desc: '🍪 gains increased by 30% for 1 hour' },
  boost_x2_24h:      { name: 'Boost +30% (24 h)',  desc: '🍪 gains increased by 30% for 24 hours' },
  free_recharges_24h:{ name: 'Free Recharges (24 h)', desc: 'Wheel, Slot and Stack recharge free for 24 h' },
  streak_save:       { name: 'Streak Save',        desc: "Save your check-in streak if you miss a day" },
  theme_forge:       { name: 'Caffeinated Forge Theme', desc: 'Dark volcanic palette · burnt burgundy + saturated gold' },
  bulk_trade_pass:   { name: 'Express Trade $CKM', desc: '1 charge: buy or sell your entire portfolio in one go, no quantity cap' },
};

/* ── LEVEL_NAMES (index 0 = unused, 1-25) ──────────── */
export const LEVEL_NAMES_EN = [
  '',
  'Barista',                    // 1
  'Roaster',                    // 2
  'Master',                     // 3
  'Grand Barista',              // 4
  'Pastry Chef',                // 5
  'Legend',                     // 6
  'Coffee Connoisseur',         // 7
  'Coffee Virtuoso',            // 8
  'Mythical Master',            // 9
  'Cookie Eternal',             // 10
  'Caffeinated Emperor',        // 11
  'Cookie Alchemist',           // 12
  'Flavor Guardian',            // 13
  'Phoenix of Coffee',          // 14
  'Primordial Cookie',          // 15
  'Caffeinated Ascendant',      // 16
  'Coffee Visionary',           // 17
  'Cookie Sage',                // 18
  'Caffeinated Mystic',         // 19
  'Coffee Oracle',              // 20
  'Cookie Sovereign',           // 21
  'Coffee Avatar',              // 22
  'Caffeinated Demiurge',       // 23
  'Cosmic Legend',              // 24
  'Cookie Origin',              // 25
];

/* ── ACHIEVEMENTS — par id (cf. data/constants.js → ACHIEVEMENTS) ── */
export const ACHIEVEMENTS_EN = {
  first_click:   { name: 'First click!',      desc: 'You clicked your first cookie' },
  level_3:       { name: 'On the way!',       desc: 'You reached level 3' },
  level_6:       { name: 'Legendary!',        desc: 'You reached level 6 — Legend' },
  level_10:      { name: 'Eternal!',          desc: 'You reached level 10 — Eternal' },
  level_15:      { name: 'Primordial Cookie!',desc: 'You reached the maximum level' },
  trader:        { name: 'Trader!',           desc: 'You invested 500 cookies in $CKM' },
  end_game:      { name: 'Living Legend!',    desc: 'Max level + all other achievements' },
};

/* ── QUESTIONS quiz (indexed array, same order as constants.js) ───── */
export { QUESTIONS_EN } from './questionsEn.js';

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# CookiMiner / CookiTrader 🍪☕

App **mobile-first** React de récompenses sur le thème café & cookie. Mini-jeux quotidiens, marché spéculatif $CKM online, classement hebdo + cumulé, système d'amis, boutique cosmétique + premium, achievements (visibles + cachés), événements communautaires (boss). PWA installable, déployée sur Vercel (repo `Cookithan/cookitrader`).

> Le nom du package reste `cookiminer` (et le préfixe localStorage aussi : `cookiminer:`) — c'est volontaire, pour ne pas casser les saves quand le rename UI a été fait. **Dans l'UI**, l'app s'appelle **CookiTrader**.

---

## Commandes

```bash
npm install
npm run dev              # vite (http://localhost:5173)
npm run dev -- --host    # accessible depuis le téléphone (même Wi-Fi)
npm run build            # build prod (Vite + vite-plugin-pwa)
npm run preview          # serve dist/
npm run lint             # eslint .
```

Pas de suite de tests : la validation se fait visuellement (relancer `npm run dev` après une modif et tester au doigt).

### Variables d'environnement

`.env.local` à la racine pour le développement, ou variables Vercel en prod :

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Si les deux sont absentes, l'app continue en **mode dégradé silencieux** : `isSupabaseEnabled()` renvoie false, toutes les fonctions Supabase no-op (le marché, le classement online, les amis, l'inbox, le boss communautaire sont désactivés mais l'app ne crashe pas).

---

## Stack

- **React 19** + Vite 8 (HMR, `@vitejs/plugin-react`)
- **`@supabase/supabase-js`** pour le backend (users, market, friendships, inbox, boss events, system_status…)
- **`lucide-react`** pour les icônes
- **`stripe`** pour les achats ☕ (côté serveur — l'app web utilise les checkout sessions via Supabase Edge Functions)
- **`vite-plugin-pwa`** : SW autoUpdate, skipWaiting, clientsClaim → les utilisateurs ne restent jamais coincés sur une vieille version
- **Aucun framework CSS** — tout est en styles inline + un seul bloc `<style>` global (`src/styles/globalStyles.js`)
- **Pas de TypeScript** — JSX pur

---

## Architecture — big picture

### Le composant racine est gigantesque par dessein

`src/App.jsx` fait **~4600 lignes** et contient l'unique composant `CookiMiner`. C'est volontaire — l'orchestration (~80 states persistés via `useLocalStorage`, ticks globaux, sync Supabase debouncée, achievements watchers, navigation 5 onglets, gestion du boss communautaire, prestige…) est centralisée. Les sous-composants vivent dans `src/components/` mais ne sont **pas** des features autonomes : ils reçoivent tout en props depuis App.jsx.

**Conséquence concrète** : pour ajouter un état persistant ou une mécanique de gameplay, c'est presque toujours dans `App.jsx` que ça se passe, puis on plombe les nouveaux helpers/states aux sous-composants via props. Ne pas chercher à "découper" App.jsx — la doc d'évolution antérieure a déjà fait ce travail là où c'était utile (modals, overlays, mini-jeux, tabs).

### Découpage des dossiers

```
src/
├── App.jsx                  — composant racine (CookiMiner) — TOUT le state global
├── main.jsx                 — bootstrap React + ErrorBoundary
├── data/                    — constantes gameplay pures (pas de logique)
│   ├── constants.js         — LEVEL_NAMES (25 paliers), xpRequired, SEGMENTS roue, REWARDS, ACHIEVEMENTS, QUESTIONS, DAILY_REWARDS
│   ├── themes.js            — DK, LT, THEMES, GOLD, ESPRESSO, PREMIUM_PALETTE, COOKIE_SKINS, ROUE_PALETTES…
│   ├── avatars.js           — onboarding + premium + getAvatar()
│   ├── leaderboard.js       — BOT_NAMES, BOT_LEVELS, generateLeaderboard (fallback local quand Supabase off)
│   ├── events.js            — événements aléatoires (cycle waiting → active)
│   ├── communityEvents.js   — boss communautaire (constantes + helpers)
│   ├── chests.js            — coffres mystères (CHEST_TIERS, rollChest)
│   ├── secretBadges.js      — badges cachés (déclenchés par actions précises in-game)
│   ├── titles.js            — titres colorés affichés sur le pseudo
│   ├── sanctions.js         — toolkit anti-triche côté serveur (appliqué via Supabase Edge)
│   ├── promoCodes.js        — codes promo (verrouillés cross-device via patches Supabase)
│   ├── commandes.js         — base "Devine la commande" (mini-jeu)
│   └── maintenance.js       — MAINTENANCE_MODE flag + whitelist par userCode
│
├── lib/                     — couche externe (Supabase, audio, anti-cheat, etc.)
│   ├── supabase.js          — client unique + isSupabaseEnabled()
│   ├── supabaseSync.js      — TOUTES les fonctions table users + friendships + inbox + boss (~1800 lignes)
│   ├── market.js            — marché $CKM online — MARKET_CONFIG, getMarketState, buyShares, sellShares, maintenanceTick, circuit breaker, hold bonus, cooldowns achat/vente
│   ├── audio.js             — sons via WebAudio (autoplay-policy safe), musique boss scoppée à l'onglet
│   ├── inbox.js             — messagerie in-app (cadeaux, événements)
│   ├── antiCheat.js         — détection comportements suspects (toujours actif sauf boss)
│   ├── weeklyCycle.js       — semaine ISO (vendredi 18h UTC), MANUAL_RESET_WEEK_ID, getCurrentWeekId
│   ├── slotMachine.js       — RNG + table de gains de la machine à sous
│   ├── appInfo.js           — APP_INFO.version + CHANGELOG (modale "À propos")
│   ├── retry.js, supabaseError.js, marketFeed.js
│
├── hooks/                   — useLocalStorage (préfixe 'cookiminer:'), useCommunityBoss, useInstallPrompt, useSwipe, useBackToClose
├── i18n/                    — système maison léger (FR/EN, fallback FR), useTranslation() force-rerender via useSyncExternalStore
├── styles/globalStyles.js   — chaîne CSS exportée, injectée 1× dans <style> par App.jsx — TOUS les keyframes vivent ici
├── utils/                   — helpers purs (admin.js, userCode.js, spin.js, badgeOrigin.js, lazyWithDelay.js…)
│
└── components/
    ├── ErrorBoundary, SplashScreen, Toaster, NetworkErrorToast, EventBanner, BossCake, …
    ├── games/        — 13 mini-jeux : Checkin, Quiz, Spin, Click, Pour, Memory, Flappy, Guess, Pyramid, Reflex, Slot, CafeScene, SingleCup
    ├── modals/       — ~35 modales (LevelUp, Achievement, Onboarding, Inbox, UserProfile, ChestOpen, CommunityMilestone, ForceUpdate…)
    ├── overlays/     — SettingsOverlay, ProfileOverlay, GameOverlay, BossEventOverlay, MaintenanceScreen
    ├── tabs/         — BoutiqueTab, ClassementTab, MarketTab (+ MarketLocked), ActionsShopView
    ├── market/       — MarketChart, MarketFeed, TradePanel, PortfolioCard, MarketStateCard, MarketPulse, MarketWelcomeModal
    ├── cookies/      — PremiumCookie, SkinnedCookie (cookies cliquables réutilisés partout)
    ├── tutorial/     — TutorialOverlay (6 étapes), ContextHint (bulles), WelcomeTour, SpotlightOverlay
    ├── avatars/      — AvatarArtwork (rendu SVG des avatars premium)
    └── profile/      — FriendsSection, ResetProgressButton
```

Chaque fichier non trivial a un bandeau d'en-tête `══════` qui décrit son rôle, ses props et les invariants. **Lis-le avant de modifier.**

### Flux de données

- **Persistance locale** : `useLocalStorage(key, initial)` wrap auto sur tout state qui doit survivre au refresh. Clés préfixées `cookiminer:`. Pour ajouter un nouveau state persistant, le déclarer ici ET dans `resetProgress()` pour qu'il soit bien remis à zéro.
- **Sync Supabase** : `upsertProfile()` debouncé à 5s pousse les champs persistés vers `public.users` (gated par `isSupabaseEnabled()` + `userName` non vide). Lecture cross-device via `pullProfile()` à l'ouverture.
- **Patches idempotents cross-device** : tout effet "à appliquer une seule fois" (récompense de boss, cadeau de palier communautaire, restauration d'erreur marché, etc.) passe par `applyPatchOnce(key, fn)` → `is_patch_applied` côté Supabase. Le pattern garantit qu'on ne double-applique pas si l'utilisateur se connecte sur 2 devices.
- **Realtime** : `subscribeSystemStatus`, `community_boss_events`, marché — Supabase Realtime active pour pousser les changements aux clients.
- **Mode dégradé** : toutes les fonctions de `lib/supabaseSync.js` et `lib/market.js` retournent `null` / `[]` / `{error:'Hors ligne'}` si Supabase off — l'UI doit **toujours** être safe contre une réponse vide.

### Le hook clé : `addCoins(amount, gainAmount = amount)`

`App.jsx` ligne ~1417. Applique dans l'ordre :
1. Multiplicateurs sur gains positifs : prestige (+10 %/niveau), boost ×1.3 si actif, doubler ×2 one-shot
2. Niveau 10+ : malus XP de −20 % (étire la fin de jeu)
3. Cap anti-écart top 1 : si je suis leader et que totalEarned dépasse top2×1.20, totalEarned se fige (coins/XP/niveau continuent normalement)
4. Compteur hebdo `weeklyEarned` (auto-reset vendredi 18h UTC)
5. Niveau 25 (Origine du Cookie) = palier final, XP cap à 60000 → prestige proposé

Les passages de niveau se font **un par un** (jamais 2 paliers d'un coup, même sur gros gain — XP excédentaire perdue, c'est volontaire). Le niveau et l'XP courants sont lus depuis `lvRef.current` / `xpRef.current` dans le handler — **ne pas** nester de side-effects dans un updater `setXp(prev=>...)` (rejoué en mode strict React).

---

## Gameplay — invariants à connaître

- **2 monnaies** :
  - 🍪 **Cookie** — gagnée partout, dépensée en boutique et roue
  - ☕ **Café (CF)** — premium, sources volontairement limitées. Liste **réelle** des sources actuelles (vérifiée dans le code, mai 2026) :
    - **Achievements** (`cafesBonus` dans `data/constants.js`) : En Feu (+1), Gros Lot (+1), Légende/niv 6 (+1), Éternel/niv 10 (+2), Cookie Originel/niv 15 (+3), Légende Vivante/`end_game` (+12)
    - **Level-up** : +1 ☕ aux paliers 6, 10, 15, 20, 25 (`addCoins`, App.jsx ~1537)
    - **Check-in** : J7 = +2, J14 = +3 (`DAILY_CAFES`, `data/constants.js`)
    - **Café Express (Catcher)** : +1 si score ≥ 280 (seuil scalé ×durée/60)
    - **Flappy** : pièce dorée +1, probabilité 5/10/15 % selon le mode
    - **Événements aléatoires** : 5 des événements versent +1 (`events.js`, champ `cafeBonus`)
    - **Classement hebdo** : Top1 +3 / Top2 +2 / Top3 +1 (App.jsx ~2492)
    - **Paliers communautaires** : 500k (+1), 700k (+1)
    - **Boîte Mystère** : item `box_starter`, 1000 🍪 → +3 ☕ (`open_box`)
    - **Inbox** : cadeaux entre joueurs, récompenses tournoi, parrainage (montants côté serveur)
    - **Codes promo** : certains versent du ☕ (`data/promoCodes.js`)
    - **Achats Stripe** in-app (réconciliation serveur)
    - ⚠️ La conversion 1000 🍪 → 1 ☕ « depuis le marché » listée dans l'ancienne doc **n'existe pas dans le code** (jamais implémentée).
  - **Ne JAMAIS ajouter une NOUVELLE source de CF sans confirmation explicite.** Pas de CF par défaut sur les nouveaux achievements.

- **25 niveaux** (cf. `LEVEL_NAMES`). Courbe d'XP rééquilibrée (cf. SMOOTH_XP `data/constants.js`). Niveau 10 débloque la machine à sous (⚠️ la doc disait 13 : c'était faux, `GAMES` dans App.jsx fait foi — l'erreur s'était propagée jusqu'au savoir de la Sentinelle), 15 débloque le café loop, 25 = endgame → prestige.

- **Prestige** : reset niveau→1, XP→0, cookies→0 **et `total_earned`→0** (vérifié dans `doPrestige`), en échange de +10 % de gains permanent. Items, achievements, cafés, $CKM, amis et série préservés. ⚠️ Le cumul remis à zéro fait ressembler un compte prestigé à un compte trafiqué : tout contrôle de cohérence niveau/cumul doit exclure `prestige_level > 0`. Affiché par couronne(s) sur le pseudo.

- **Achievement apex caché `end_game` ("Légende Vivante !")** : se déclenche **automatiquement** (watcher App.jsx ~3409) quand TOUT est complété — niveau ≥ 16, tous les autres succès visibles gagnés, boutique 100 % (items 🍪 hors limited), les 3 badges secrets, et les 10 récompenses événements. Donne +12 ☕. ⚠️ Aucun achat ni « révélation » : le mécanisme `reveal_master` / item « Dernier Succès Caché » (15 ☕) décrit dans d'anciennes notes **n'existe pas dans le code**. **Ne jamais le mentionner dans les questions du quiz.**

- **Pseudo "cookithan"** (créateur) : reçoit le titre CRÉATEUR (`utils/legend.js`, `CREATOR_NAME`), est whitelisté maintenance (userCode `PJ3-56A`), et subit un recalibrage one-shot −4000 🍪 (`App.jsx` ~1797, patché idempotent). ⚠️ L'ancien grant d'onboarding (+1000 🍪 / +30 ☕ / niveau 6 / tous succès / `reveal_master`) **n'existe plus** dans le code — le seul grant d'onboarding actuel est admin-only (cf. ci-dessous).

- **Admins** : `admin123` et `admin558` (via `isAdminName()` de `utils/admin.js`). Sortis du classement, accès aux boutons admin. À l'onboarding, un pseudo admin reçoit une dotation de test (App.jsx ~4660 : 50000 🍪, 100 ☕, niveau 15, tous les thèmes, tous les succès marqués gagnés).

- **Mode maintenance** : `data/maintenance.js` → `MAINTENANCE_MODE=true` remplace toute l'app par `<MaintenanceScreen />` sauf pour les userCodes whitelistés. Short-circuit AVANT tout hook React (early return).

- **Marché $CKM (online, Supabase)** : ouvert dès niveau 3. Prix 10–300, initial 100. Tick maintenance ~5s (snapshot 24h). Mean reversion **désactivée** depuis 14/05/2026 ; plafond doux −1/jour au-dessus de 170 (ajouté 22/05/2026). Circuit breaker auto si ±15 % en 5 min → pause 1h. Hold bonus +10/+30/+100 % sur PnL positive (1h/24h/7j). Cooldowns : 15s achat, 60s vente. Cap 30 actions/tx (bypass via `bulkTradePasses`).

- **Boss communautaire** : déclenché 1× quand `getCommunityCookieTotal() ≥ 700_000` (sans Supabase ou sans migration : feature dormante, mode dégradé silencieux). Récompense = **uniquement** le skin `skin_mangeur`, jamais de CF combat. Top 1 attacks → débloque `music_boss`. Échec → −1000 🍪 (1×/instance via patch).

- **Classement hebdomadaire** : reset vendredi 18h UTC (`weeklyCycle.js`). Existe en parallèle d'un classement cumulé (total_earned de toujours). 29 bots fictifs + joueurs réels. Top 1 hebdo bot gagne +300 🍪/jour.

---

## Conventions visuelles non négociables

- **Palette café-only** — aucun rouge ni vert dans l'UI, **même** pour succès/erreur. Pertes/échecs = tons sombres (espresso/moka). Gains/succès = tons clairs (caramel/miel/or). Règle ferme.
- **Mobile-first**, largeur max 430px, centrée sur desktop. `touchAction: manipulation`, `userSelect: none`, `onPointerDown` (plutôt qu'`onClick`) sur les zones tactiles.
- **Animations ≤ 700 ms.** Tous les keyframes vivent dans `styles/globalStyles.js` — **ne jamais** créer un nouveau bloc `<style>`.
- **Styles inline** systématiquement. Pas de classes CSS sauf pour les animations (`.su`, `.bi`, `.fu`, `.glow-anim`, etc.) déjà définies dans globalStyles.
- Invariants `GOLD` / `ESPRESSO` (`data/themes.js`). Thèmes au format objet `C` (light/dark) avec clés `bg/card/card2/text/muted/border`.

---

## Glossaire

- **Cookie** = monnaie (jamais "pièce", jamais "coin" en français)
- **CF / ☕** = café (monnaie premium)
- **$CKM** = "action" du marché
- **Récompenses** = `Badge` / `Titre` / `Thème` / `Avatar` / `Skin` / `Roue` / `Premium` (7 catégories ; Premium = `currency:'cafe'`)
- **Fournée** = numérotation des cycles boss communautaire

---

## Règles pour Claude Code

1. **Avant de modifier**, lis la section concernée du fichier (bandeau `══════` en haut). Ne pars pas de mémoire.
2. **Une feature non triviale = une branche git** `feat/nom-de-la-feature`. L'utilisateur veut explicitement ce workflow.
3. **Préserve les conventions** : styles inline, pas de TypeScript, palette café-only, animations dans globalStyles.
4. **Teste visuellement** après chaque modif — `npm run dev` puis essayer au doigt. Le type-checking et le lint ne valident pas le ressenti UX.
5. **Le code est déjà découpé** côté sous-composants. Pour un nouveau mini-jeu / overlay / tab non trivial, crée un fichier dédié dans le bon sous-dossier ; ne ré-empile pas tout dans `App.jsx`. À l'inverse, ne tente PAS de découper le composant `CookiMiner` lui-même.
6. **Si tu ajoutes une dépendance npm**, justifie et propose une alternative sans dépendance d'abord.
7. **Quand l'utilisateur dit "j'ai une idée"**, propose un plan court (3-5 puces) avant de coder, et attends sa validation.
8. **Toute fonction Supabase doit être safe en mode dégradé** : `isSupabaseEnabled()` check en tête, retour neutre sinon.
9. **i18n** : tout nouveau texte UI doit passer par `t('clé')` (FR/EN). Les data dynamiques (REWARDS, QUESTIONS…) utilisent `localizedField(item, 'name')` qui lit `item.name_en` ou fallback sur `item.name`.
10. **CHANGELOG** : à chaque release notable, mettre à jour `src/lib/appInfo.js` (version + entrée en tête de `CHANGELOG`, max 5-6 entrées). Inclure `title_en` et `changes_en`.
11. **Les fichiers SQL vivent dans `sql/`**, jamais a la racine, et jamais dans `supabase/migrations/` (la CLI essaierait de les rejouer). Ce ne sont pas des migrations : on les colle a la main dans l'editeur Supabase, et ils sont idempotents. `sql/README.md` dit lesquels forment le socle vivant et lesquels sont de l'histoire deja passee.

12. **Bloc de vérification d'un fichier SQL — NE JAMAIS appeler une fonction avec une fausse phrase de passe.** `sentinelle_phrase_ok` journalise chaque refus, et **dix refus en quinze minutes ferment la console pour un quart d'heure** : coller deux ou trois fichiers d'affilée verrouillait l'écran à l'instant précis où on venait de l'installer. Ça prouvait d'ailleurs moins qu'il n'y paraissait — dans l'éditeur SQL on est `postgres`, pas `anon`, donc le refus obtenu ne disait rien du droit d'appel réel de l'app.

    Un fichier SQL se termine par une vérification qui teste ce qui **casse vraiment** : l'objet existe-t-il, et `anon` peut-il l'appeler.

    ```sql
    select p.proname                                    as fonction,
           pg_get_function_identity_arguments(p.oid)    as arguments,
           has_function_privilege('anon', p.oid, 'EXECUTE') as anon_peut_appeler
      from pg_proc p
      join pg_namespace ns on ns.oid = p.pronamespace
     where ns.nspname = 'public'
       and p.proname in ('ma_fonction', 'mon_autre_fonction')
     order by p.proname;
    ```

    Toujours la forme `pg_proc` et jamais `has_function_privilege('anon', 'public.f(text,int)', …)` : la forme textuelle exige de deviner les types au caractère près, et une erreur de signature fait échouer le fichier **en plein milieu**, ce qui est pire que le défaut qu'on corrige.

    Corollaire : un fichier SQL ne doit **rien écrire** dont un compteur de sécurité tienne le compte. Avant d'ajouter une ligne d'essai, se demander ce qu'elle laisse derrière elle.

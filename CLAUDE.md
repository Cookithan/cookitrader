# CookiMiner 🍪☕

App mobile React de récompenses sur le thème café & cookie. L'utilisateur joue à des mini-jeux quotidiens, accumule des cookies (la monnaie), monte de niveau et débloque des récompenses cosmétiques (badges, titres, thèmes, cadres) dans une boutique.

L'app est volontairement **mobile-first** (largeur max 430px, centrée sur desktop) et **addictive** — animations, retours tactiles, feedback visuel sur chaque action, anticipation avant les récompenses.

---

## Stack technique

- **React 18** avec hooks (useState, useEffect, useRef, useCallback)
- **Vite** comme bundler
- **lucide-react** pour les icônes (seule dépendance externe en plus de React)
- **Aucun framework CSS** — tout est en styles inline + un bloc `<style>` global pour les keyframes
- **Persistance via `localStorage`** (préfixe `cookiminer:`) — sauvegarde automatique des states clés (coins, niveau, xp, série, record clic, unlocked, lastCheckin/Quiz, thème). Bouton "Réinitialiser ma progression" sur l'accueil. Pas de backend.

## Comment lancer

```bash
npm install
npm run dev
```

L'app se lance sur `http://localhost:5173`.

Pour tester depuis un téléphone sur le même Wi-Fi : `npm run dev -- --host`, puis ouvrir l'IP affichée.

---

## Architecture des fichiers

Le code a été découpé depuis `App.jsx` (qui faisait > 4000 lignes) en modules thématiques. Le fichier `src/App.jsx` ne garde plus que le composant principal `CookiMiner` (~760 lignes : états, ticks globaux, render des onglets, nav).

```
src/
├── App.jsx                       — CookiMiner (orchestration, états persistés, tick marché global, layout)
├── data/
│   ├── constants.js              — LEVEL_NAMES, SEGMENTS, REWARDS, ACHIEVEMENTS, QUESTIONS, DAILY_REWARDS, QUIZ_COOLDOWN_MS
│   ├── themes.js                 — DK, LT, THEMES, GOLD, ESPRESSO, PREMIUM_PALETTE, ROUE_PALETTES, ROUE_GLOWS, COOKIE_SKINS
│   ├── avatars.js                — ONBOARDING_AVATARS, AVATAR_PREMIUM, getAvatar()
│   ├── leaderboard.js            — LEADERBOARD_SCHEMA, BOT_NAMES, BOT_LEVELS, generateLeaderboard, leaderboardScore
│   └── market.js                 — PRICE_*, TICK_MS, BIG_MOVE_PCT, HISTORY_N, MARKET_EVENTS, nextPrice, fmt
├── hooks/useLocalStorage.js      — wrap localStorage (préfixe 'cookiminer:')
├── utils/spin.js                 — TW, SEG_A, SEG_C, wRandom (géométrie roue)
├── styles/globalStyles.js        — chaîne CSS exportée (keyframes + classes utilitaires)
└── components/
    ├── AvatarFigure.jsx · Sparkline.jsx
    ├── cookies/PremiumCookie.jsx · SkinnedCookie.jsx
    ├── modals/LevelsModal · LevelUpModal · AchievementModal · OnboardingModal · TradeModal
    ├── overlays/SettingsOverlay · ProfileOverlay · GameOverlay
    ├── games/CheckinGame · QuizGame · SpinGame · ClickGame · PourGame
    └── tabs/BoutiqueTab · ClassementTab · MarketTab · MarketLocked
```

Chaque fichier a un bandeau d'en-tête `══════` qui décrit son rôle, ses props et les invariants importants.

**Règles d'évolution** :
- Avant de modifier un composant, ouvre d'abord son fichier (pas la grande carte mentale dans App.jsx).
- Si tu ajoutes un nouveau jeu / overlay / tab, suis la même arborescence (`components/games/MonJeu.jsx`, etc.) et exporte un composant nommé.
- Les constantes "données" (REWARDS, QUESTIONS, MARKET_EVENTS…) vivent dans `data/`, pas dans le composant qui les consomme.
- Les keyframes vont **toujours** dans `styles/globalStyles.js`, jamais dans un nouveau bloc `<style>`.

---

## État global (dans `CookiMiner`)

| State | Type | Reset par défaut | Rôle |
|---|---|---|---|
| `coins` | number | `0` | Monnaie active (jamais négative) |
| `totalEarned` | number | `0` | Total cumulé (n'est jamais dépensé) — sert au stat affiché sur la carte niveau |
| `level` | number | `1` | Niveau actuel, max 6 |
| `xp` | number | `0` | XP dans le niveau courant. Seuil = `level * 100 + 50` (niv 1 → 150, niv 2 → 250, etc.) |
| `streak` | number | `0` | Jours consécutifs de check-in |
| `clickRecord` | number | `0` | Meilleur score au défi de clics |
| `unlocked` | string[] | `[]` | IDs des récompenses débloquées |
| `lastCheckin` | string \| null | `null` | `toDateString()` du dernier check-in |
| `lastQuiz` | string \| null | `null` | `toDateString()` du dernier quiz |
| `pendingLvUp` | number \| null | `null` | Si non null, déclenche `LevelUpModal` |
| `tab` | 'accueil' \| 'jeux' \| 'classement' \| 'marche' \| 'boutique' | `'accueil'` | Onglet actif |
| `gameView` | 'checkin' \| 'quiz' \| 'spin' \| 'click' \| 'pour' \| null | `null` | Mini-jeu ouvert en overlay |
| `dark` | boolean | `false` | Thème Nuit Espresso (nécessite `theme_espresso` débloqué) |

### Le hook clé : `addCoins(amount)`
- Si `amount <= 0` → décrémente sans toucher au total ni à l'XP
- Si `amount > 0` → incrémente `coins`, `totalEarned`, et `xp`
- Détecte le passage de niveau : si `xp+amount >= level*100 + 50`, **monte de UN seul niveau** (peu importe la taille du gain) et déclenche `pendingLvUp`. L'XP excédentaire est volontairement perdue pour éviter qu'un gros gain (ex : +200 à la roue) saute plusieurs paliers d'un coup.
- Bonus de level-up versé après 700ms : `10 * newLevel` cookies

`lvRef.current = level` et `xpRef.current = xp` sont mis à jour à chaque render — on lit le niveau et l'XP courants directement depuis ces refs dans le handler, **sans nester de side-effects dans un updater `setXp(prev=>...)`** (qui peut être rejoué en mode strict React et désynchroniser le state).

---

## Conventions de code

- **Styles inline systématiques** — pas de classes CSS sauf pour les animations (`.su`, `.bi`, `.fu`, `.glow-anim`, etc.)
- **Pas de TypeScript** — JSX pur, plus lisible pour itérer vite
- **Couleurs hardcodées** dans les gradients, mais palette unifiée via objets thème `C` (light/dark)
- **Aucun rouge ni vert dans l'UI** — seulement des tons café/cookie/caramel/or. Pertes = sombres (espresso/moka), gains = clairs (caramel/miel/or). Cette règle est non-négociable, même pour les feedbacks "succès/erreur".
- **Animations ≤ 700ms** — au-delà ça devient lourd
- **Mobile-first** — `touchAction: manipulation`, `userSelect: none` sur les zones tactiles, `onPointerDown` plutôt que `onClick` quand le tap doit être ultra-réactif
- **`localStorage` via `useLocalStorage(key, initial)`** — wrap n'importe quel state qui doit survivre au refresh. Clés préfixées `cookiminer:`. Pour ajouter un nouveau state persistant, ajoute-le aussi dans `resetProgress()` pour qu'il soit bien remis à zéro.

---

## Glossaire interne

- **Cookie** = monnaie (jamais "pièce", jamais "coin" en français)
- **Niveaux** : Barista (1) → Torréfacteur (2) → Maître (3) → Grand Barista (4) → Chef Pâtissier (5) → Légende (6)
- **Récompenses** sont des `Badge` / `Titre` / `Thème` / `Avatar` / `Skin` / `Roue` / `Premium` (7 catégories ; Premium = payé en cafés ☕ via `currency:'cafe'`)
- **Roue** = 11 segments pondérés. Pertes : -5, -10, -15, -25, -100. Gains : +10, +20, +50, +100, +200 (jackpot, poids 2), +300 (super jackpot, poids 2).
- **Café (CF / ☕)** = monnaie premium rare, gagnée via level-up, certains succès, jackpot, ou conversion 1000 🍪 → 1 ☕ depuis le marché.
- **$CKM** = "action" du marché (ouvert au niveau 3). Prix entre 30 et 500, valeur de référence 100. Tick toutes les 1.5s. News classées en small / big / mega.

---

## Idées / TODO (pour discussion)

À chaque nouvelle idée, créer une branche git `feat/nom-de-la-feature` avant de coder. Demander à l'utilisateur de prioriser si plusieurs idées arrivent en même temps.

Pistes ouvertes :
- Plus de quiz questions (catégoriser par difficulté)
- Nouveau mini-jeu : memory de tasses ? machine à sous cookie ?
- Achievements (différents des récompenses : tâches à accomplir → cookies bonus)
- Animation de "première arrivée" (onboarding)
- Sons (avec mute) — penser à l'autoplay policy mobile
- PWA pour installer sur l'écran d'accueil du téléphone
- Plus de niveaux (au-delà de 6)
- Système de défis hebdomadaires

---

## Règles pour Claude Code

1. **Avant de modifier**, lis la section concernée du fichier (ne pars pas de mémoire).
2. **Une feature = une branche git** quand c'est non-trivial.
3. **Préserve les conventions** : styles inline, pas de TypeScript, palette café-only.
4. **Teste en visuel** : après chaque modif, suggère à l'utilisateur de relancer `npm run dev` et de regarder.
5. **Le code est déjà découpé** (`src/data/`, `src/components/{games,modals,overlays,tabs,cookies}/`). Pour un nouveau composant non trivial, crée un fichier dédié dans le bon sous-dossier ; ne ré-empile pas tout dans `App.jsx`.
6. **Si tu ajoutes une dépendance npm**, explique pourquoi et propose une alternative sans dépendance d'abord.
7. **Garde le mobile-first en tête** : tout doit marcher au doigt, pas juste à la souris.
8. **Pour les animations**, ajoute le keyframe dans le bloc `<style>` existant, ne crée pas un nouveau bloc.
9. **Quand l'utilisateur dit "j'ai une idée"**, propose un plan court (3-5 puces) avant de coder, et attends sa validation.
10. **Pas de rouge / pas de vert** dans l'UI. Si tu as besoin d'un feedback positif/négatif, utilise les tons café (clairs pour positif, sombres pour négatif).

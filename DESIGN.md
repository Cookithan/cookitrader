# DESIGN.md — Source de vérité design (CookiMiner)

> Ce fichier est lu par **Claude Code** (intégration au code) et **Claude Design** (génération de propositions visuelles). Pour un nouveau cycle design, on met à jour la section **§3 Demande en cours**. Le reste est stable.

App mobile-first React (largeur max 430px), thème **café & cookie**, animations courtes et chaleureuses. Stack : React 18 + Vite, **styles inline uniquement**, pas de framework CSS, pas de TypeScript. Persistance via `localStorage`. Prod : https://cookitrader.vercel.app.

---

## 1. Contraintes non-négociables

1. **Pas de rouge. Pas de vert.** Y compris pour les feedbacks succès / erreur. Tons clairs (caramel, miel, or) = positif ; tons sombres (espresso, moka) = négatif.
2. **Palette café-only** : café (espresso, moka, cacao), cookie (beige, caramel, ambre), or (gold, miel, doré), crème (lait, vanille, ivoire). **Exception** : le thème *Cosmos* (indigo / violet profond) est l'accent "premium galactique" — seul écart toléré.
3. **Lisibilité ≥ AA** : `text` sur `card` ≥ 7:1, `muted` sur `card` ET `card2` ≥ 4.5:1.
4. **Cartes en aplat uniquement** : seul `bg` peut être un gradient. `card` et `card2` toujours en couleur unie (sinon ombres / bordures / textes deviennent illisibles).
5. **Format de thème figé** :
   ```js
   theme_xxx: {
     dark: true|false,
     bg:    '#hex' | 'linear-gradient(...)',
     card:  '#hex',   // aplat
     card2: '#hex',   // aplat, plus contrasté que card
     text:  '#hex',
     muted: '#hex',
     border:'#hex',
     sparkles: true,  // optionnel — étincelles d'or animées en fond
   }
   ```
   **Aucune autre clé** : si une nouvelle propriété est nécessaire, c'est un changement code à discuter d'abord.

---

## 2. Invariants (à ne pas toucher)

Ces éléments traversent tous les thèmes et gardent leur identité quoi qu'il arrive — toute proposition doit **cohabiter** avec eux, pas les remplacer.

- **Cookie central** : gradient brun → ambre fixe (`COOKIE_SKINS['']` dans `src/data/themes.js`).
- **`GOLD`** : `linear-gradient(135deg,#D4A017,#C17F3C)` — utilisé pour les CTA premium et les level-up.
- **`ESPRESSO`** : `linear-gradient(140deg,#4A2C17,#7D4E1F)` — utilisé pour les zones premium foncées.
- **`PREMIUM_PALETTE`** : aperçu Cosmos sur l'onglet Premium (override temporaire).
- **Niveaux** : Barista (1) → Torréfacteur (2) → Maître (3) → Grand Barista (4) → Chef Pâtissier (5) → Légende (6) → ... → Éternel (10). Tout naming visuel doit rester dans cette grammaire café.

**Pour l'état actuel** (palettes, composants, screenshots) → lire directement le repo :
- Thèmes : `src/data/themes.js`
- Avatars : `src/data/avatars.js`
- Composants : `src/components/{games,modals,overlays,tabs}/`
- Constantes (niveaux, segments roue, récompenses) : `src/data/constants.js`

---

## 3. Demande en cours — Refonte des 6 thèmes débloquables

**Cycle** : 2026-05 · **Statut** : ouvert

### Objectif

Donner à chaque thème débloquable une **identité visuelle propre** et corriger les redondances actuelles (cf. `src/data/themes.js`). Les 2 thèmes par défaut (`LT`, `DK`) ne sont **pas** dans le scope.

### Diagnostic des problèmes à corriger

| Thème | Problème |
|---|---|
| `theme_espresso` | Identique à `DK` — sans personnalité propre |
| `theme_creme` | Trop proche de `LT` |
| `theme_chocolat` | Sombre mais sans signature, ressemble à `theme_espresso` |
| `theme_legendaire` | Bonne idée (or sombre + sparkles) mais texte jaune sur fond jaune-noir, dur à lire |
| `theme_caramel` | **Référence de qualité** — à raffiner légèrement, pas refondre |
| `theme_cosmos` | Bon — à conserver, raffiner la profondeur si possible |

### Livrables attendus

**A. Refonte des 6 thèmes débloquables**, chacun avec :
- Direction (1-2 phrases : ambiance, ce qui change vs l'actuel)
- Palette complète au format §1
- Contrastes vérifiés : `text/card`, `muted/card`, `muted/card2`

**B. (Bonus) 1 thème inédit** qui élargit la palette sans casser les contraintes. Pistes au choix : Macchiato (bicolore lait/café), Mocha (café/chocolat), Cappuccino mousseux (clair lumineux), Tiramisu (couches alternées), Matin d'hiver (ivoire + cannelle). **Une seule** proposition, la plus distinctive.

### Format de réponse

Pour chaque thème :

```markdown
### theme_xxx — "Nom affichable"
**Direction** : ...
**Palette** :
\`\`\`js
theme_xxx: { dark: ..., bg: '...', card: '...', card2: '...', text: '...', muted: '...', border: '...' }
\`\`\`
**Contrastes** : text/card = X:1 · muted/card = X:1 · muted/card2 = X:1
```

Et à la fin : **bloc complet de l'objet `THEMES` réécrit**, prêt à coller dans `src/data/themes.js` (intégration côté Claude Code = copier-coller pur).

### Hors-périmètre

- Avatars, animations, structure des écrans, typo : pas dans ce cycle.
- Si tu vois des opportunités hors scope, liste-les en fin de réponse sous **"Suggestions pour cycles futurs"**.

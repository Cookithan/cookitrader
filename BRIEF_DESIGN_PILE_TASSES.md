# BRIEF DESIGN — Mini-jeu "Pile de Tasses"

> Brief autonome destiné à **Claude Design**. Lis aussi `DESIGN.md` à la racine pour les contraintes de palette et invariants. Tout le code du jeu existant est dans `src/components/games/PyramidGame.jsx`.

## Contexte produit

**CookiMiner** est une app mobile-first React (max-width 430px) sur le thème café & cookie. L'utilisateur enchaîne des mini-jeux quotidiens, accumule des cookies (la monnaie), monte de niveau (Barista → ... → Éternel du Cookie, 10 paliers) et débloque des récompenses cosmétiques. Prod : https://cookitrader.vercel.app.

**"Pile de Tasses"** est le mini-jeu débloqué au **niveau 8** (Virtuose Café). C'est l'un des derniers jeux que l'utilisateur découvre, donc il doit avoir un cachet visuel supérieur aux jeux d'introduction.

## Mécanique du jeu (à respecter)

C'est une variante **stack-tower** classique :

1. Une **tasse oscille horizontalement** en haut de l'écran.
2. **Tap** → la tasse tombe sur la pile.
3. La nouvelle tasse a la **largeur de l'overlap** avec la précédente (donc la pile rétrécit à chaque imprécision).
4. **Pas d'overlap** → game over, la dernière tasse tombe en chute libre, la pile s'écroule (cascade visuelle souhaitable).
5. **Coût** : 10 🍪 par partie. **Gain** : 5 🍪 par tasse posée. **Cap** : 100 🍪.
6. La vitesse d'oscillation augmente avec le nombre de tasses posées.

**Ne pas changer la mécanique.** Tout le périmètre est visuel et animations.

## État actuel — diagnostic

L'utilisateur a explicitement dit : *"le design du jeu est pas ouf du tout"*. Ce qui ne va pas :

- **Tasses trop génériques** : silhouette trapézoïdale crème, anse en demi-cercle, café en surface = ellipse marron. Visuellement plat, peu reconnaissable de loin, pas de matière.
- **Fond fade** : gradient nuit espresso → caramel + quelques étoiles dorées + 3 grains de café flottants en opacity .18. Aucune narration spatiale (ni comptoir, ni étagère, ni horizon, ni ambiance lumineuse).
- **Animations pauvres** : mouvement linéaire de la tasse mobile, drop sec, flash blanc 0.55s à l'atterrissage. Pas de feedback haptique visuel, pas de squash/stretch sur le drop, pas de particules de mousse, pas de vibration de la pile.
- **Game-over peu spectaculaire** : la dernière tasse fait juste un translateY(140) avec une petite rotation. La pile en dessous reste figée — irréaliste et anticlimatique.
- **Hiérarchie visuelle** : 2 cartes stats (Tasses / Gagné) + aire de jeu + bouton + tip card. C'est lisible mais sans personnalité — pourrait être une app banking.

## Contraintes non négociables

1. **Palette café-only** (cf. `DESIGN.md` §1) : café, cookie, caramel, or, crème. **Pas de rouge, pas de vert.** Si tu introduis un accent, il doit être un ton de la palette.
2. **Mobile-first** : aire de jeu en aspect-ratio fixe (actuellement 100×140, max-width 340 px côté CSS). Toute proposition doit rester lisible et tappable au doigt.
3. **SVG only** : pas de PNG, pas de canvas (l'animation tourne déjà via React + RAF + transforms inline). La tasse mobile est repositionnée à chaque frame via `setMoverX` (transform translate). Reste compatible.
4. **Performance** : ce jeu peut tourner 5+ minutes en boucle si l'utilisateur enchaîne. Évite les filtres SVG coûteux ou animations CSS qui repaint tout le SVG. Préfère `transform`/`opacity`.
5. **Cohérence avec l'app** : les invariants `GOLD` et `ESPRESSO` (cf. `DESIGN.md` §2) doivent rester cohérents — si tu utilises un CTA ou un highlight, c'est de l'or.

## Livrables attendus

### A. Refonte de la tasse (composant `Cup`)

Une silhouette de tasse à café qui dégage de la **matière** : porcelaine, brillance, profondeur. Garde les contraintes mécaniques :
- Largeur paramétrable (de 4 à 50 unités viewBox)
- Anse à droite OU à gauche (alterne par parité d'étage)
- Café visible en surface (ellipse ou détail)
- Soucoupe **uniquement** sur la base de la pile

Mode "active" pour la tasse mobile (couleur dorée + vapeur). Préviens si tu veux ajouter un état "sweet spot" (overlap parfait) avec un highlight spécifique.

### B. Fond / décor

Le jeu se passe **dans un café**. Propose un décor qui raconte ça :
- Étagères floues en arrière-plan ?
- Comptoir en bas avec reflets ?
- Lumière chaude tamisée ?
- Vapeur ascendante diffuse ?
- Affiches café en silhouette ?

Le décor doit rester **secondaire** : la pile de tasses domine l'attention. Pense parallax léger ou flou (via blur SVG si peu coûteux, sinon par contraste).

### C. Animations clés

Donne des spécifications précises (durée, easing, propriétés) pour :

1. **Drop réussi** : la tasse arrive sur la pile. Comment elle se "pose" ? Squash & stretch ? Petite onde sonore visuelle (cercle qui s'étale) ? Particules ?
2. **Drop parfait** (overlap proche de 100%) : feedback supérieur — pétales d'or, scintillement, vibration de toute la pile ?
3. **Game over** : la pile entière s'écroule. Cascade par étage avec délais ? Rotation aléatoire ? Tasses qui se brisent en éclats crème ?
4. **Cap atteint** (joueur fait 20 tasses = 100 🍪) : un flash de victoire, halo doré complet, pile qui s'illumine ?

### D. (Bonus) Cohérence sonore

Si tu vois une opportunité d'ajouter 1 ou 2 sons (drop, succès, game-over) qui s'intégreraient au système audio existant (`src/lib/audio.js` — UI_SOUNDS), liste-les en suggestion.

## Format de réponse

Sépare clairement chaque livrable :

```markdown
## A. Refonte de la tasse Cup

**Direction** : [1-2 phrases qui résument l'identité visuelle]

**SVG du composant `Cup`** :
\`\`\`jsx
function Cup({ x, y, width, height, active, handleSide, showSaucer, showSteam }) {
  return (
    <g>
      {/* ... ton SVG ... */}
    </g>
  );
}
\`\`\`

**Notes d'intégration** : [edge cases, params manquants, défauts à appliquer côté Claude Code]
```

Idem pour B (fond), C (animations — donne du pseudocode ou JSX réel), D (suggestions).

À la fin : **un fichier `PyramidGame.jsx` complet réécrit**, prêt à coller. Si certaines parties (logique RAF, gestion state) sont trop volumineuses pour être réécrites entièrement, indique clairement quelles lignes garder de l'original et quelles parties remplacer.

## Hors-périmètre

- Mécanique de jeu (vitesse, coût, gains) — déjà calibrée
- UI globale (cartes stats, bouton "Commencer", tip card) — peut rester en l'état, sauf si tu identifies une amélioration en cohérence
- Autres mini-jeux (Quiz, Roue, Click...) — pas dans ce cycle

Si tu vois des opportunités hors scope, liste-les sous **"Suggestions pour cycles futurs"** à la fin.

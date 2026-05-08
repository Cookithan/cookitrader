# Brief — Mini-jeu "Pile de Tasses" 🥞☕

Lis bien le CLAUDE.md avant de commencer.
**Procède UNE phase à la fois et attends ma validation visuelle entre chaque phase.**

⚠️ **IMPORTANT POUR LE DESIGN** : ce brief contient le SVG **EXACT** à utiliser pour les tasses. **Ne pas réinventer**, ne pas simplifier, ne pas remplacer par des emojis. Coller TEL QUEL et adapter dynamiquement avec React.

---

## 🎯 Concept du jeu

**Pile de Tasses** est un nouveau mini-jeu inspiré du jeu mobile **Stack** (300M+ téléchargements). Le joueur doit empiler des tasses de café qui glissent horizontalement, en tapant au bon moment pour les poser. Si la tasse n'est pas parfaitement alignée avec la précédente, **la partie qui dépasse est coupée** (la tasse rétrécit). Quand la tasse devient trop petite, c'est Game Over.

## ⚙️ Règles précises

| Élément | Valeur |
|---|---|
| Coût pour jouer | **10 cookies** |
| Niveau requis | **10** |
| Mode gratuit | ❌ Non, toujours 10 🍪 |
| Récompense | **+5 🍪 par tasse posée** |
| Cap récompense | **100 🍪 max par partie** |
| Bonus combo | **+50 🍪 si > 30 tasses posées** |
| Vitesse | Exponentielle douce (lente au début, plus rapide après 10-15 tasses) |
| Direction | Tasse glisse horizontalement gauche-droite |
| Game Over | Quand la tasse à poser devient < 25% de la largeur initiale |

---

# ══════════════════════════════════════════════
# PHASE 1 — Vérifier les prérequis
# ══════════════════════════════════════════════

## À vérifier avant de coder

1. ☑ Le système de mini-jeux existe (Memory, Réflexes, etc.)
2. ☑ Le système de niveaux fonctionne (le jeu sera débloqué au niveau 10)
3. ☑ La fonction `addCoins(amount)` existe pour donner des cookies
4. ☑ La fonction `spendCoins(amount)` existe pour en dépenser
5. ☑ Le système anti-cheat (BRIEF_ANTICHEAT) peut être réutilisé si déjà appliqué (on copiera la logique de `ClickTracker` adaptée)

## Action utilisateur

Confirmer que ces prérequis sont OK avant que tu commences. Si pas, on adapte.

---

# ══════════════════════════════════════════════
# PHASE 2 — Composant `<CupStackGame>` — Structure
# ══════════════════════════════════════════════

Créer le fichier `src/components/CupStackGame.jsx`.

## États React nécessaires

```jsx
import { useState, useEffect, useRef, useCallback } from 'react';

function CupStackGame({ onClose, coins, addCoins, spendCoins, level }) {
  // ÉTAPES
  const [phase, setPhase] = useState('intro'); // 'intro' | 'playing' | 'gameover'

  // STATS PARTIE
  const [stackedCups, setStackedCups] = useState([]); // Liste des tasses posées : [{ x: 0, width: 100 }, ...]
  const [movingCup, setMovingCup] = useState(null);   // Tasse en mouvement : { x: 0, width: 100, direction: 1 }
  const [score, setScore] = useState(0);              // Nombre de tasses posées
  const [reward, setReward] = useState(0);            // Cookies gagnés cette partie
  const [comboBonus, setComboBonus] = useState(false); // True si > 30 tasses

  // ANIMATIONS
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [showPerfectGlow, setShowPerfectGlow] = useState(false);

  // RÉFÉRENCES
  const animationFrameRef = useRef(null);
  const lastTimeRef = useRef(0);

  // CONFIG
  const GAME_AREA_WIDTH = 320;       // largeur zone de jeu en px
  const INITIAL_CUP_WIDTH = 100;     // largeur tasse initiale
  const MIN_CUP_WIDTH = 25;          // < 25 = game over
  const INITIAL_SPEED = 120;         // px/seconde
  const REWARD_PER_CUP = 5;
  const REWARD_CAP = 100;
  const COMBO_THRESHOLD = 30;
  const COMBO_BONUS = 50;
  const COST_TO_PLAY = 10;
  const REQUIRED_LEVEL = 10;
}
```

## Logique principale (à compléter ensuite phases 3-6)

- `phase === 'intro'` → écran d'accueil avec règles + bouton "Commencer (10 🍪)"
- `phase === 'playing'` → jeu actif avec tasse qui glisse, on tap pour poser
- `phase === 'gameover'` → écran final avec score + bouton rejouer/quitter

## Vérifications phase 2
- ☑ Fichier `CupStackGame.jsx` créé avec la structure ci-dessus
- ☑ Aucune erreur de syntaxe
- ☑ États tous définis

---

# ══════════════════════════════════════════════
# PHASE 3 — Écran d'intro (phase === 'intro')
# ══════════════════════════════════════════════

⚠️ **IMPORTANT** : Respecter EXACTEMENT les couleurs et tailles ci-dessous. Pas d'autre couleur que celles listées.

## Code complet à coller

```jsx
function IntroScreen({ onStart, coins, level, requiredLevel, costToPlay }) {
  const canPlay = level >= requiredLevel && coins >= costToPlay;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#2C1810',
      display: 'flex', flexDirection: 'column',
      padding: 16, paddingBottom: 24,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12,
      }}>
        <button onClick={onClose} style={{
          background: 'rgba(245, 239, 230, 0.12)',
          border: 'none', borderRadius: '50%',
          width: 36, height: 36, color: '#F5EFE6',
          fontSize: 18, cursor: 'pointer',
        }}>‹</button>
        <div style={{
          fontSize: 17, fontWeight: 800, flex: 1, textAlign: 'center',
          marginLeft: -36, color: '#F5EFE6',
        }}>Pile de Tasses</div>
        <div style={{
          background: '#D4A017', borderRadius: 100,
          padding: '6px 12px', fontWeight: 800, fontSize: 13, color: '#2C1810',
        }}>🍪 {coins.toLocaleString()}</div>
      </div>

      {/* Card centrale avec illustration */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(180deg, #3D2010 0%, #4A2C17 100%)',
        borderRadius: 20,
        border: '1.5px solid rgba(212, 160, 23, 0.15)',
        padding: 24,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', gap: 18,
      }}>
        {/* Illustration : une tasse SVG (utilise SingleCup ci-dessous) */}
        <SingleCup width={120} />

        <h2 style={{
          fontSize: 22, fontWeight: 900, color: '#D4A017',
          margin: 0, lineHeight: 1.2,
        }}>Pile de Tasses</h2>

        <p style={{
          color: 'rgba(245, 239, 230, 0.85)', fontSize: 13,
          margin: 0, lineHeight: 1.5, maxWidth: 280,
        }}>
          Empile les tasses pile sur la précédente.
          <br/>
          Si tu rates, ta tasse rétrécit.
        </p>

        <div style={{
          background: 'rgba(212, 160, 23, 0.15)',
          border: '1px solid rgba(212, 160, 23, 0.4)',
          borderRadius: 12,
          padding: '8px 14px',
          fontSize: 12, color: '#D4A017', fontWeight: 700,
        }}>
          +5 🍪 par tasse · max 100 🍪 · bonus 50 🍪 si {'>'}30 tasses
        </div>

        {/* Bouton */}
        <button
          onClick={onStart}
          disabled={!canPlay}
          style={{
            background: canPlay ? '#D4A017' : 'rgba(212, 160, 23, 0.3)',
            color: canPlay ? '#2C1810' : 'rgba(245, 239, 230, 0.5)',
            border: 'none',
            borderRadius: 14,
            padding: '14px 32px',
            fontSize: 15, fontWeight: 800,
            cursor: canPlay ? 'pointer' : 'not-allowed',
            transition: 'transform 0.1s',
          }}
          onMouseDown={e => canPlay && (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={e => canPlay && (e.currentTarget.style.transform = 'scale(1)')}
        >
          {level < requiredLevel
            ? `🔒 Niveau ${requiredLevel} requis`
            : coins < costToPlay
              ? '🔒 Pas assez de cookies'
              : `Commencer (${costToPlay} 🍪)`
          }
        </button>
      </div>
    </div>
  );
}
```

## Vérifications phase 3
- ☑ Écran d'intro avec une tasse SVG centrée
- ☑ Titre "Pile de Tasses" en doré
- ☑ Règles affichées clairement
- ☑ Bouton actif si niveau ≥ 10 ET cookies ≥ 10
- ☑ Bouton grisé sinon avec message explicatif

---

# ══════════════════════════════════════════════
# PHASE 4 — Composant `<SingleCup>` (le SVG d'une tasse)
# ══════════════════════════════════════════════

⚠️ **CRITIQUE** : ce composant est la **base visuelle du jeu**. À mettre dans `src/components/SingleCup.jsx`.

**Le SVG doit être copié EXACTEMENT comme ci-dessous**, c'est le résultat d'itérations design avec l'utilisateur. Pas de modification, pas d'ajout d'emoji, pas de simplification.

```jsx
/**
 * Une tasse à café avec son anse.
 * Couleurs : tasse blanche (#F5EFE6), anse blanche cernée de moka (#5C3317).
 *
 * Props :
 * - width : largeur en pixels (la hauteur s'adapte automatiquement)
 * - showCoffeeInside : true pour afficher le café à l'intérieur (tasse en mouvement / sommet de pile)
 * - withSteam : true pour afficher la vapeur au-dessus (tasse en mouvement)
 */
export default function SingleCup({ width = 100, showCoffeeInside = true, withSteam = false }) {
  // La tasse a un ratio fixe : largeur tasse 100, anse extra 30 = total 130
  // Hauteur tasse 42
  // Échelle proportionnelle
  const scale = width / 100;
  const totalWidth = 130 * scale;
  const cupHeight = 42 * scale;
  const totalHeight = cupHeight + (withSteam ? 50 * scale : 0);
  const yOffset = withSteam ? 50 * scale : 0;

  return (
    <div style={{ position: 'relative', width: totalWidth, height: totalHeight }}>
      {/* Vapeur (optionnelle) */}
      {withSteam && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 30 * scale,
          width: 40 * scale,
          height: 40 * scale,
          pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 8 * scale,
            width: 4 * scale, height: 32 * scale,
            background: 'linear-gradient(to top, rgba(245, 239, 230, 0.5), transparent)',
            borderRadius: '50%', filter: 'blur(2px)',
            animation: 'cupGameSteamRise 2.4s ease-out infinite',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 18 * scale,
            width: 4 * scale, height: 26 * scale,
            background: 'linear-gradient(to top, rgba(245, 239, 230, 0.5), transparent)',
            borderRadius: '50%', filter: 'blur(2px)',
            animation: 'cupGameSteamRise 2.4s ease-out 0.6s infinite',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 28 * scale,
            width: 4 * scale, height: 30 * scale,
            background: 'linear-gradient(to top, rgba(245, 239, 230, 0.5), transparent)',
            borderRadius: '50%', filter: 'blur(2px)',
            animation: 'cupGameSteamRise 2.4s ease-out 1.2s infinite',
          }} />
        </div>
      )}

      {/* SVG tasse */}
      <svg
        width={totalWidth}
        height={cupHeight}
        viewBox="0 0 130 42"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', top: yOffset, left: 0 }}
      >
        {/* Corps de la tasse blanche avec contour foncé */}
        <rect
          x="0" y="0" width="100" height="42" rx="3"
          fill="#F5EFE6"
          stroke="#5C3317"
          strokeWidth="1.5"
        />

        {/* Anse : forme C complètement à droite, contour foncé extérieur + blanc intérieur */}
        <path
          d="M 100 10 Q 121 10 121 21 Q 121 32 100 32"
          fill="none" stroke="#5C3317" strokeWidth="8" strokeLinecap="round"
        />
        <path
          d="M 100 10 Q 116 10 116 21 Q 116 32 100 32"
          fill="none" stroke="#F5EFE6" strokeWidth="5" strokeLinecap="round"
        />

        {/* Café à l'intérieur (si demandé) */}
        {showCoffeeInside && (
          <>
            <ellipse cx="50" cy="0" rx="50" ry="5" fill="#3D2010"/>
            <ellipse cx="50" cy="0" rx="46" ry="3.5" fill="#A57021"/>
            <ellipse cx="50" cy="0" rx="38" ry="2.5" fill="#D4A017" opacity="0.4"/>
          </>
        )}

        {/* Reflet vertical brillant à gauche */}
        <rect x="8" y="8" width="3" height="30" rx="1.5" fill="white" opacity="0.55"/>
        <rect x="14" y="10" width="1.5" height="22" rx="0.5" fill="white" opacity="0.3"/>
      </svg>
    </div>
  );
}
```

## CSS global à ajouter dans `index.css` ou équivalent

```css
@keyframes cupGameSteamRise {
  0% { transform: translateY(8px) scale(0.7); opacity: 0; }
  30% { opacity: 1; }
  100% { transform: translateY(-26px) scale(1.3); opacity: 0; }
}
```

## Vérifications phase 4
- ☑ Composant `<SingleCup width={100} />` rend une tasse blanche avec anse à droite
- ☑ L'anse est ENTIÈREMENT visible à l'extérieur de la tasse
- ☑ Contour foncé moka autour de l'anse pour la distinguer
- ☑ Avec `withSteam={true}`, 3 traits de vapeur animent au-dessus
- ☑ Avec `showCoffeeInside={true}`, on voit le café au sommet
- ☑ Échelle proportionnelle quand on change `width`

---

# ══════════════════════════════════════════════
# PHASE 5 — Écran de jeu (phase === 'playing')
# ══════════════════════════════════════════════

⚠️ Cette phase est la plus complexe. Procéder doucement, valider chaque sous-étape.

## 5A — Layout de l'écran de jeu

```jsx
function GameScreen({ stackedCups, movingCup, score, reward, onTap, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#2C1810',
      display: 'flex', flexDirection: 'column',
      padding: 16,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12,
      }}>
        <button onClick={onClose} style={{ /* style back btn comme intro */ }}>‹</button>
        <div style={{ /* style game title comme intro */ }}>Pile de Tasses</div>
        <div style={{ /* style coins pill comme intro */ }}>🍪 {coins.toLocaleString()}</div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        marginBottom: 14,
      }}>
        <StatCard value={score} label="Tasses posées" />
        <StatCard value={reward} label="🍪 Gagnés" />
      </div>

      {/* Game area */}
      <div
        onClick={onTap}
        onTouchStart={(e) => { e.preventDefault(); onTap(); }}
        style={{
          flex: 1, position: 'relative',
          background: 'linear-gradient(180deg, #3D2010 0%, #4A2C17 100%)',
          borderRadius: 20,
          border: '1.5px solid rgba(212, 160, 23, 0.15)',
          overflow: 'hidden',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Indicateur niveau */}
        <div style={{
          position: 'absolute', top: 14, left: 14,
          background: 'rgba(212, 160, 23, 0.18)',
          border: '1px solid rgba(212, 160, 23, 0.4)',
          color: '#D4A017', borderRadius: 10,
          padding: '5px 10px', fontSize: 11, fontWeight: 800, zIndex: 5,
        }}>Niveau {score}</div>

        {/* Tasse en mouvement (positionnée dynamiquement) */}
        {movingCup && (
          <div style={{
            position: 'absolute',
            bottom: getMovingCupBottomPosition(stackedCups), // calcule la hauteur en fonction des tasses posées
            left: `calc(50% + ${movingCup.x}px - ${movingCup.width / 2}px)`,
            transition: 'none', // l'animation est gérée par requestAnimationFrame
            zIndex: 4,
          }}>
            <SingleCup width={movingCup.width} showCoffeeInside={true} withSteam={true} />
          </div>
        )}

        {/* Pile des tasses posées */}
        <div style={{
          position: 'absolute', bottom: 26,
          left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column-reverse',
          alignItems: 'center', zIndex: 2,
        }}>
          {/* Soucoupe */}
          <Saucer />
          {/* Toutes les tasses posées (de la plus basse à la plus haute) */}
          {stackedCups.map((cup, i) => (
            <div key={i} style={{
              transform: `translateX(${cup.x}px)`,
              marginTop: -4, // chevauchement léger pour éviter les gaps
            }}>
              <SingleCup width={cup.width} showCoffeeInside={false} withSteam={false} />
            </div>
          ))}
        </div>

        {/* Tap zone */}
        <div style={{
          position: 'absolute', bottom: 12,
          left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(212, 160, 23, 0.18)',
          border: '2px dashed #D4A017',
          borderRadius: 14, padding: '10px 22px',
          color: '#D4A017', fontSize: 12, fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: 2,
          animation: 'cupGameTapPulse 1.4s ease-in-out infinite',
          pointerEvents: 'none', zIndex: 5,
        }}>TAP pour poser</div>
      </div>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div style={{
      background: 'rgba(245, 239, 230, 0.06)',
      border: '1.5px solid rgba(212, 160, 23, 0.18)',
      borderRadius: 14, padding: '10px 12px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#D4A017', lineHeight: 1 }}>{value}</div>
      <div style={{
        fontSize: 10, color: 'rgba(245, 239, 230, 0.6)',
        textTransform: 'uppercase', letterSpacing: 1.5,
        marginTop: 6, fontWeight: 700,
      }}>{label}</div>
    </div>
  );
}

function Saucer() {
  return (
    <div style={{ position: 'relative', width: 160, height: 14, marginTop: 0 }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, #5C3317 0%, #2C1810 100%)',
        borderRadius: '50%',
        border: '1px solid rgba(245, 239, 230, 0.15)',
        boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.5)',
      }} />
    </div>
  );
}
```

## CSS global

```css
@keyframes cupGameTapPulse {
  0%, 100% { opacity: 0.75; transform: translateX(-50%) scale(1); }
  50% { opacity: 1; transform: translateX(-50%) scale(1.04); }
}

@keyframes cupGameRewardFloat {
  0% { transform: translate(-50%, 30px); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: translate(-50%, -80px); opacity: 0; }
}

@keyframes cupGameGlowPulse {
  0%, 100% { opacity: 0.4; transform: translateX(-50%) scale(0.95); }
  50% { opacity: 0.8; transform: translateX(-50%) scale(1.05); }
}
```

## 5B — Logique de mouvement (animation de la tasse qui glisse)

```jsx
useEffect(() => {
  if (phase !== 'playing' || !movingCup) return;

  const animate = (currentTime) => {
    if (!lastTimeRef.current) lastTimeRef.current = currentTime;
    const delta = (currentTime - lastTimeRef.current) / 1000; // en secondes
    lastTimeRef.current = currentTime;

    setMovingCup(prev => {
      if (!prev) return prev;

      // Calculer la vitesse en fonction du niveau (exponentielle douce)
      const baseSpeed = INITIAL_SPEED;
      const speed = baseSpeed * (1 + Math.pow(score / 15, 1.3) * 0.4);

      let newX = prev.x + prev.direction * speed * delta;

      // Limites de la zone de jeu
      const maxX = (GAME_AREA_WIDTH / 2) - prev.width / 2 - 8;
      const minX = -maxX;

      let newDirection = prev.direction;
      if (newX > maxX) {
        newX = maxX;
        newDirection = -1;
      } else if (newX < minX) {
        newX = minX;
        newDirection = 1;
      }

      return { ...prev, x: newX, direction: newDirection };
    });

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  animationFrameRef.current = requestAnimationFrame(animate);

  return () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    lastTimeRef.current = 0;
  };
}, [phase, movingCup, score]);
```

## 5C — Logique du tap (poser une tasse)

```jsx
const handleTap = useCallback(() => {
  if (phase !== 'playing' || !movingCup) return;

  // Récupérer la tasse de référence (la dernière posée, ou tasse virtuelle initiale au centre)
  const lastCup = stackedCups.length > 0
    ? stackedCups[stackedCups.length - 1]
    : { x: 0, width: INITIAL_CUP_WIDTH };

  // Calculer la zone de chevauchement
  const movingLeft = movingCup.x - movingCup.width / 2;
  const movingRight = movingCup.x + movingCup.width / 2;
  const lastLeft = lastCup.x - lastCup.width / 2;
  const lastRight = lastCup.x + lastCup.width / 2;

  const overlapLeft = Math.max(movingLeft, lastLeft);
  const overlapRight = Math.min(movingRight, lastRight);
  const overlapWidth = overlapRight - overlapLeft;

  if (overlapWidth <= 0) {
    // Aucun chevauchement → game over instantané
    handleGameOver();
    return;
  }

  // Vérifier si la tasse est devenue trop petite
  if (overlapWidth < MIN_CUP_WIDTH) {
    handleGameOver();
    return;
  }

  // Centre de la nouvelle tasse = centre du chevauchement
  const newX = (overlapLeft + overlapRight) / 2;

  // Détecter "tasse parfaitement centrée" (tolérance 3px)
  const isPerfect = Math.abs(movingCup.x - lastCup.x) < 3;

  // Ajouter à la pile
  setStackedCups(prev => [...prev, { x: newX, width: overlapWidth }]);
  setScore(prev => prev + 1);

  // Récompense (cap à 100 🍪)
  const newReward = Math.min(reward + REWARD_PER_CUP, REWARD_CAP);
  setReward(newReward);

  // Halo doré si parfait
  if (isPerfect) {
    setShowPerfectGlow(true);
    setTimeout(() => setShowPerfectGlow(false), 800);
  }

  // Pop-up "+5 🍪"
  setShowRewardPopup(true);
  setTimeout(() => setShowRewardPopup(false), 1000);

  // Vérifier le bonus combo
  if (score + 1 === COMBO_THRESHOLD) {
    setComboBonus(true);
  }

  // Préparer la tasse suivante (largeur = celle de la tasse posée, position aléatoire ±maxX)
  const sideToStart = Math.random() > 0.5 ? -1 : 1;
  const startX = sideToStart * (GAME_AREA_WIDTH / 2 - overlapWidth / 2 - 8);
  setMovingCup({
    x: startX,
    width: overlapWidth,
    direction: sideToStart === -1 ? 1 : -1,
  });
}, [phase, movingCup, stackedCups, score, reward]);
```

## 5D — Lancer le jeu

```jsx
const handleStart = () => {
  if (coins < COST_TO_PLAY) return;
  if (level < REQUIRED_LEVEL) return;

  // Débit
  spendCoins(COST_TO_PLAY);

  // Reset
  setStackedCups([]);
  setScore(0);
  setReward(0);
  setComboBonus(false);

  // Première tasse en mouvement
  setMovingCup({
    x: -100,
    width: INITIAL_CUP_WIDTH,
    direction: 1,
  });

  setPhase('playing');
};
```

## 5E — Affichage du pop-up "+5 🍪" et halo doré

À placer **dans l'écran de jeu**, juste avant la tap zone :

```jsx
{showRewardPopup && (
  <div style={{
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#D4A017',
    color: '#2C1810',
    padding: '6px 14px',
    borderRadius: 100,
    fontWeight: 800, fontSize: 14,
    animation: 'cupGameRewardFloat 1s ease-out',
    zIndex: 6, pointerEvents: 'none',
  }}>+5 🍪</div>
)}

{showPerfectGlow && (
  <div style={{
    position: 'absolute',
    bottom: getMovingCupBottomPosition(stackedCups) - 5,
    left: '50%', transform: 'translateX(-50%)',
    width: 180, height: 30, borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(212, 160, 23, 0.5) 0%, transparent 70%)',
    pointerEvents: 'none',
    animation: 'cupGameGlowPulse 0.8s ease-in-out',
    zIndex: 1,
  }} />
)}
```

## 5F — Helper position verticale

```jsx
function getMovingCupBottomPosition(stackedCups) {
  const SAUCER_HEIGHT = 14;
  const CUP_HEIGHT = 42;
  const STACK_OVERLAP = 4;
  // 26px = padding bottom de la pile, + soucoupe, + (tasses posées * (hauteur - chevauchement))
  return 26 + SAUCER_HEIGHT + (stackedCups.length * (CUP_HEIGHT - STACK_OVERLAP));
}
```

## Vérifications phase 5
- ☑ La tasse glisse de gauche à droite (animation fluide)
- ☑ Tap → la tasse se pose, et une nouvelle tasse arrive
- ☑ Si bien alignée, garde toute sa largeur
- ☑ Si pas alignée, la tasse rétrécit (la partie qui dépasse est coupée)
- ☑ Pop-up "+5 🍪" à chaque tasse posée
- ☑ Halo doré pulse si tasse parfaitement centrée (±3px)
- ☑ Le compteur "Tasses posées" et "Cookies gagnés" se mettent à jour
- ☑ La vitesse augmente subtilement à chaque tasse
- ☑ Si tasse devient trop petite (< 25 px) → Game Over
- ☑ Si aucun chevauchement → Game Over

---

# ══════════════════════════════════════════════
# PHASE 6 — Écran Game Over
# ══════════════════════════════════════════════

```jsx
function GameOverScreen({ score, reward, comboBonus, onRetry, onClose, addCoins }) {
  // Crédit des cookies une seule fois au mount
  useEffect(() => {
    const totalReward = reward + (comboBonus ? 50 : 0);
    if (totalReward > 0) {
      addCoins(totalReward);
    }
  }, []);

  const totalReward = reward + (comboBonus ? 50 : 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#2C1810',
      display: 'flex', flexDirection: 'column',
      padding: 16,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ /* idem header intro */ }}>
        <button onClick={onClose}>‹</button>
        <div>Pile de Tasses</div>
        <div>🍪 {coins.toLocaleString()}</div>
      </div>

      {/* Card centrale */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(180deg, #3D2010 0%, #4A2C17 100%)',
        borderRadius: 20,
        border: '1.5px solid rgba(212, 160, 23, 0.15)',
        padding: 24,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', gap: 18,
      }}>
        <div style={{ fontSize: 48 }}>🥞</div>

        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#D4A017', margin: 0 }}>
          Partie terminée !
        </h2>

        <div style={{
          background: 'rgba(245, 239, 230, 0.06)',
          border: '1.5px solid rgba(212, 160, 23, 0.18)',
          borderRadius: 14,
          padding: 20,
          width: '100%', maxWidth: 280,
        }}>
          <div style={{ fontSize: 11, color: 'rgba(245, 239, 230, 0.6)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
            Ton score
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: '#D4A017', lineHeight: 1 }}>
            {score}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(245, 239, 230, 0.6)', marginTop: 4 }}>
            tasses posées
          </div>
        </div>

        <div style={{
          background: '#D4A017',
          borderRadius: 12,
          padding: '10px 20px',
          fontSize: 16, fontWeight: 800, color: '#2C1810',
        }}>
          +{totalReward} 🍪
        </div>

        {comboBonus && (
          <div style={{
            background: 'rgba(212, 160, 23, 0.2)',
            border: '1px solid #D4A017',
            borderRadius: 10,
            padding: '6px 12px',
            fontSize: 12, color: '#D4A017', fontWeight: 800,
          }}>
            🔥 Bonus combo +50 🍪
          </div>
        )}

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 280, marginTop: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px',
              background: 'rgba(245, 239, 230, 0.1)',
              border: '1.5px solid rgba(245, 239, 230, 0.2)',
              color: '#F5EFE6',
              borderRadius: 12,
              fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Quitter
          </button>
          <button
            onClick={onRetry}
            disabled={coins < COST_TO_PLAY}
            style={{
              flex: 1, padding: '12px',
              background: coins >= COST_TO_PLAY ? '#D4A017' : 'rgba(212, 160, 23, 0.3)',
              color: '#2C1810',
              border: 'none', borderRadius: 12,
              fontSize: 13, fontWeight: 800,
              cursor: coins >= COST_TO_PLAY ? 'pointer' : 'not-allowed',
            }}
          >
            Rejouer (10 🍪)
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Logique de Game Over

```jsx
const handleGameOver = () => {
  if (animationFrameRef.current) {
    cancelAnimationFrame(animationFrameRef.current);
  }
  setMovingCup(null);
  setPhase('gameover');
};
```

## Vérifications phase 6
- ☑ Écran Game Over avec score final
- ☑ Cookies gagnés crédités une seule fois
- ☑ Bonus combo affiché si > 30 tasses
- ☑ Bouton "Rejouer (10 🍪)" relance directement
- ☑ Bouton "Quitter" retourne au menu

---

# ══════════════════════════════════════════════
# PHASE 7 — Intégration dans le menu des jeux
# ══════════════════════════════════════════════

Trouver l'endroit où sont listés les mini-jeux (probablement `GamesTab.jsx` ou similaire).

Ajouter une carte **Pile de Tasses** :

```jsx
{
  id: 'cup_stack',
  name: 'Pile de Tasses',
  emoji: '🥞',
  description: 'Empile des tasses sans rater',
  cost: 10,
  level: 10,
  component: CupStackGame,
}
```

⚠️ Adapter au format des autres jeux existants. Si le format n'utilise pas de `component`, on appelle `<CupStackGame />` au clic.

## Vérifications phase 7
- ☑ "Pile de Tasses" visible dans la liste des jeux
- ☑ Verrouillé si niveau < 10 (cadenas affiché)
- ☑ Coût 10 🍪 affiché
- ☑ Tap → ouvre l'écran d'intro

---

# ══════════════════════════════════════════════
# PHASE 8 — Tracking stats (optionnel, si BRIEF_STATS_PERSO appliqué)
# ══════════════════════════════════════════════

Si le brief Stats perso est appliqué, ajouter le tracking :

```js
trackGamePlayed(userCode, 'cup_stack');
trackCookiesEarned(userCode, totalReward); // ce qu'il a gagné
```

À placer dans `handleGameOver` juste après le crédit des cookies.

## Vérifications phase 8
- ☑ Le jeu apparaît dans les stats hebdo si appliqué
- ☑ Si pas appliqué, ignorer cette phase

---

# ══════════════════════════════════════════════
# PHASE 9 — Tests complets
# ══════════════════════════════════════════════

## Scénarios

1. **Niveau insuffisant** : utilisateur niveau 5 → bouton grisé "🔒 Niveau 10 requis"
2. **Pas assez de cookies** : utilisateur a 5 🍪 → bouton "🔒 Pas assez de cookies"
3. **Lancement normal** : niveau 10 + 50 🍪 → tap "Commencer" → -10 🍪 → écran de jeu
4. **Tasse parfaitement alignée** : tap au bon moment → halo doré + tasse même taille
5. **Tasse mal alignée** : tap décalé → tasse rétrécit
6. **20 tasses** : récompense max atteinte (100 🍪)
7. **30 tasses** : bonus combo +50 🍪 affiché
8. **Game Over par mauvais alignement** : tasse trop petite → écran final
9. **Game Over par 0 chevauchement** : tasse posée totalement à côté → écran final
10. **Rejouer** : tap "Rejouer" → nouvelle partie démarre, -10 🍪

## Vérifications globales
- ☑ Pas de rouge ni de vert (uniquement palette café)
- ☑ Mobile-friendly (testé sur 390px)
- ☑ Animations fluides (60 FPS)
- ☑ Vapeur visible au-dessus de la tasse en mouvement
- ☑ Halo doré pulse uniquement sur tasse parfaite
- ☑ Soucoupe visible en bas de la pile
- ☑ Anses bien visibles (contour foncé moka, anse blanche par-dessus)
- ☑ Pas de fuite mémoire (animationFrame bien cleanup)

---

# ══════════════════════════════════════════════
# 💡 NOTES IMPORTANTES POUR CLAUDE CODE
# ══════════════════════════════════════════════

## ⚠️ Règles strictes

1. **NE PAS REMPLACER** le SVG de la tasse par un emoji (`🍵`, `☕`). Le SVG est validé et précis.

2. **NE PAS SIMPLIFIER** l'anse. Elle DOIT avoir :
   - Un contour foncé `#5C3317` épaisseur 8
   - Un trait blanc `#F5EFE6` épaisseur 5 PAR DESSUS
   - Forme de C complète à droite de la tasse (pas derrière)

3. **NE PAS CHANGER** les couleurs. Les seules autorisées :
   - `#2C1810` (espresso, fond)
   - `#3D2010` (café foncé, gradient)
   - `#4A2C17` (café, gradient)
   - `#5C3317` (moka, contours)
   - `#7D4E1F` (moka clair, ?)
   - `#A57021` (caramel foncé, café liquide)
   - `#C17F3C` (caramel)
   - `#D4A017` (doré principal, accents)
   - `#F5EFE6` (lait beige, tasses)
   - `rgba(255,255,255,0.55)` (reflets)

4. **NE PAS UTILISER** de rouge ni de vert (sauf gris pour fond).

## 🔧 Performance

- **`requestAnimationFrame`** pour l'animation de la tasse, **PAS** `setInterval`
- **`cancelAnimationFrame`** dans le cleanup du useEffect
- Pas de re-render inutile : utiliser `useCallback` pour les handlers

## 📱 Mobile

- `onTouchStart` avec `e.preventDefault()` pour éviter le double-tap zoom
- Tester que `cursor: pointer` ne casse pas le tap mobile
- `userSelect: 'none'` sur la game area pour éviter de sélectionner du texte

## 🎯 Anti-cheat (rappel)

Si BRIEF_ANTICHEAT est appliqué, **on n'utilise PAS** le ClickTracker pour ce jeu — la mécanique est différente du Défi de clics. Le score est limité naturellement par la mécanique (rétrécissement = game over rapide). Pas besoin d'anti-cheat additionnel.

## 📋 Ordre d'application recommandé

1. Phase 1 (vérif prérequis)
2. Phase 4 (composant SingleCup) — IMPORTANT, base visuelle
3. Phase 2 (structure CupStackGame)
4. Phase 3 (intro screen)
5. Phase 5 (jeu) — la plus longue, faire en sous-étapes 5A → 5F
6. Phase 6 (game over)
7. Phase 7 (intégration menu)
8. Phase 8 (stats si applicable)
9. Phase 9 (tests)

Bon dev ! ☕🥞

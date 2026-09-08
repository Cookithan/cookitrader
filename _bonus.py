# -*- coding: utf-8 -*-
"""Le bonus de niveau suit enfin l'effort.

Constat de Régis, vérifié : le palier 2 coûte 150 XP et rapporte 20 🍪
(133 🍪 pour 1000 XP) ; le palier 24 coûte 39 675 XP et rapporte 290 🍪
(7 🍪 pour 1000 XP). Le rendement était divisé par DIX-HUIT — les gains
grandissaient linéairement (50 + 10 × niveau) pendant que l'XP demandée
était multipliée par 36.

Plafond fixé par Régis : 2000 🍪 au niveau 25. Le diviseur s'en déduit
au lieu d'être écrit en dur, pour que la calibration suive si la courbe
d'XP rebouge un jour.

Deux garde-fous :
  · `Math.max` avec l'ancienne formule — aucun palier ne rapporte moins
    qu'avant, les premiers niveaux ne bougent pas d'un cookie ;
  · `Math.min` avec le plafond — le niveau 25 s'arrête pile à 2000.

Les paliers à café (6, 10, 15, 20, 25) versaient 1 ☕ et ZÉRO cookie :
franchir un grand palier ne rapportait rien de dépensable. Ils versent
désormais les deux — c'est ce qu'implique « le max au niveau 25 c'est
2000 cookies », le 25 étant justement un palier à café.

La formule vivait en DEUX exemplaires : addCoins et LevelUpModal la
recalculaient chacun de leur côté. La modale aurait annoncé un montant
et l'app en aurait versé un autre. Elle est désormais dans constants.js,
appelée par les deux.
"""
import io

# ── 1. constants.js : la formule, une seule fois ─────────────────
p = 'src/data/constants.js'
s = io.open(p, encoding='utf-8').read()
assert 'export function bonusNiveau' not in s

s += """

/* ════════════════════════════════════════════════════
   BONUS DE PASSAGE DE NIVEAU
   ────────────────────────────────────────────────────
   Ce que le joueur touche en franchissant un palier. Une seule
   définition, appelée par addCoins (App.jsx) ET par LevelUpModal : la
   formule a vécu en deux exemplaires, et le jour où l'une a changé,
   l'écran annonçait un montant que l'app ne versait pas.

   POURQUOI ELLE A CHANGÉ (09/09/2026)
   Les gains montaient linéairement — 50 + 10 × niveau — pendant que
   l'XP demandée était multipliée par 36 sur la même distance. Le palier
   2 rapportait 133 🍪 pour 1000 XP, le palier 24 en rapportait 7 : le
   rendement était divisé par dix-huit, et monter devenait une punition.

   Le bonus suit maintenant l'effort réellement fourni, borné à
   BONUS_NIVEAU_MAX au dernier palier. Le diviseur se DÉDUIT de ce
   plafond plutôt que d'être écrit en dur : si la courbe d'XP rebouge,
   la calibration suit toute seule.
═══════════════════════════════════════════════════════ */

/* Plafond au niveau 25, fixé par Régis. */
export const BONUS_NIVEAU_MAX = 2000;

/* Paliers qui versent AUSSI un café. Ils ne versaient QUE ça avant —
   franchir un grand palier ne rapportait rien de dépensable. */
export const CAFE_MILESTONES_NIVEAUX = [6, 10, 15, 20, 25];

const BONUS_NIVEAU_DIV = xpRequired(24) / BONUS_NIVEAU_MAX;

export function bonusNiveau(niveau){
  const n = Number(niveau) || 1;
  /* L'ancienne formule sert de plancher : aucun palier ne peut
     rapporter moins qu'avant ce correctif. */
  const plancher = n >= 6 ? 50 + 10 * n : 10 * n;
  const effort   = Math.round(xpRequired(n - 1) / BONUS_NIVEAU_DIV);
  return Math.min(BONUS_NIVEAU_MAX, Math.max(plancher, effort));
}
"""
io.open(p, 'w', encoding='utf-8').write(s)
print('ok constants.js — bonusNiveau exporte')

# ── 2. App.jsx : appeler la formule commune ──────────────────────
p = 'src/App.jsx'
s = io.open(p, encoding='utf-8').read()

def one(old, new, quoi):
    global s
    assert s.count(old) == 1, (quoi, s.count(old))
    s = s.replace(old, new)

one('import { LEVEL_NAMES, REWARDS, ACHIEVEMENTS, getCheckinReward, QUIZ_COOLDOWN_MS, xpRequired } from "./data/constants.js";',
    'import { LEVEL_NAMES, REWARDS, ACHIEVEMENTS, getCheckinReward, QUIZ_COOLDOWN_MS, xpRequired, bonusNiveau, CAFE_MILESTONES_NIVEAUX } from "./data/constants.js";',
    'import')

one("""    /* Bonus de level-up :
       - Paliers majeurs (6, 10, 15, 20, 25) → +1 ☕ (les "milestones")
       - Autres paliers post-6 → cookies bonus 50+10*nl
       - Niv 1-5 → cookies bonus 10*nl (inchangé)
       Cuts -45% sur la production de café (rareté demandée). */
    const isCafeMilestone = (nl === 6 || nl === 10 || nl === 15 || nl === 20 || nl === 25);
    if(isCafeMilestone){
      setTimeout(()=>{ setCafes(c=>c+1); }, 700);
    } else if(nl >= 6){
      const bonus = 50 + 10 * nl;
      setTimeout(()=>{ setCoins(c=>c+bonus); setTotalEarned(t=>t+bonus); }, 700);
    } else {
      const bonus = 10*nl;
      setTimeout(()=>{ setCoins(c=>c+bonus); setTotalEarned(t=>t+bonus); }, 700);
    }""",
    """    /* Bonus de level-up — formule unique dans constants.js, partagée
       avec LevelUpModal pour que l'écran annonce exactement ce que l'app
       verse. Les paliers majeurs ajoutent 1 ☕ PAR-DESSUS les cookies :
       avant, ils ne versaient que le café, et franchir un grand palier
       ne rapportait rien de dépensable. */
    const bonus = bonusNiveau(nl);
    if(CAFE_MILESTONES_NIVEAUX.includes(nl)){
      setTimeout(()=>{ setCafes(c=>c+1); }, 700);
    }
    setTimeout(()=>{ setCoins(c=>c+bonus); setTotalEarned(t=>t+bonus); }, 700);""",
    'bonus addCoins')

io.open(p, 'w', encoding='utf-8').write(s)
print('ok App.jsx')

# ── 3. LevelUpModal : la meme formule, et les deux gains ─────────
p = 'src/components/modals/LevelUpModal.jsx'
s = io.open(p, encoding='utf-8').read()

one("  const coinBonus       = level >= 6 ? 50 + 10 * level : 10 * level;",
    "  const coinBonus       = bonusNiveau(level);",
    'formule modale')

one("            {isCafeMilestone ? '+1 ☕' : `+${coinBonus} 🍪`}",
    "            {isCafeMilestone ? `+${coinBonus} 🍪 + 1 ☕` : `+${coinBonus} 🍪`}",
    'affichage modale')

one("""     ⚠️ LE BONUS AFFICHÉ DOIT REFLÉTER addCoins() (App.jsx, ~1798).
   Règle réelle :
     · paliers 6 / 10 / 15 / 20 / 25 → +1 ☕
     · autres niveaux ≥ 6            → 50 + 10 × niveau cookies
     · niveaux 1-5                   → 10 × niveau cookies""",
    """     LE BONUS N'EST PLUS RECALCULÉ ICI. Il vient de bonusNiveau()
   (data/constants.js), la même fonction qu'appelle addCoins : c'est le
   seul moyen d'être certain que l'écran annonce ce que l'app verse.
   Règle réelle :
     · le bonus suit l'XP demandée par le palier, borné à 2000 🍪 au 25
     · paliers 6 / 10 / 15 / 20 / 25 → les cookies ET +1 ☕""",
    'entete modale')

io.open(p, 'w', encoding='utf-8').write(s)
print('ok LevelUpModal.jsx')

# Brief — Boss Communautaire "Le Gâteau Géant" 🎂👹

Lis bien le CLAUDE.md avant de commencer.
**Procède UNE phase à la fois et attends ma validation visuelle entre chaque phase.**

⚠️ **IMPORTANT POUR LE DESIGN** : ce brief contient le SVG **EXACT** du gâteau à utiliser. **Ne pas réinventer**, ne pas remplacer par un emoji 🎂, ne pas simplifier. Coller TEL QUEL et adapter dynamiquement avec React.

---

## 🎯 Concept

Le **Gâteau Géant** est un **boss communautaire** : tous les joueurs de CookiMiner tapent ensemble sur le même gâteau pour faire descendre sa barre de PV avant la fin du timer. Si la communauté gagne, **tout le monde** gagne 120 🍪 + badge spécial.

C'est une **feature sociale et virale** : encourage les joueurs à se connecter régulièrement et à inviter leurs amis pour taper plus vite.

## ⚙️ Règles précises

| Élément | Valeur |
|---|---|
| **Durée d'un boss** | 24h |
| **PV total du boss** | 60 000 PV (ajustable selon nombre de joueurs) |
| **Dégât tap simple** | -50 PV |
| **Coût tap simple** | Gratuit |
| **Dégât boost** | -200 PV |
| **Coût boost** | 50 🍪 |
| **Cooldown tap** | 1s (anti-spam) |
| **Niveau requis** | 5 |
| **Limite quotidienne** | 100 taps gratuits + boosts illimités |

## 🏆 Récompenses

| Si... | Tous gagnent |
|---|---|
| **Communauté gagne** (PV à 0 avant timer) | 🏆 Badge "Renfort solide" + 120 🍪 |
| **Communauté perd** (PV > 0 à 24h) | 🎀 Badge consolation "Vaillant" + 20 🍪 |
| **Top 3 attaquants** | Bonus supplémentaire : 1er = 500 🍪 / 2e = 300 🍪 / 3e = 100 🍪 |

---

# ══════════════════════════════════════════════
# PHASE 1 — Vérifier les prérequis
# ══════════════════════════════════════════════

## À vérifier

1. ☑ Supabase fonctionnel (table `utilisateurs` existante)
2. ☑ Système de badges existant (pour les récompenses)
3. ☑ Système d'inbox existant (pour notifier les récompenses)
4. ☑ Fonction `addCoins(amount)` disponible
5. ☑ Fonction `spendCoins(amount)` disponible

## Action utilisateur

Confirmer que ces prérequis sont OK avant de commencer.

---

# ══════════════════════════════════════════════
# PHASE 2 — Tables SQL Supabase
# ══════════════════════════════════════════════

⚠️ **À faire par l'utilisateur** dans Supabase SQL Editor.

```sql
-- Table des boss communautaires (1 ligne par fournée)
create table public.boss_fournees (
  id uuid default gen_random_uuid() primary key,
  numero_fournee int not null,
  pv_max int not null default 60000,
  pv_actuels int not null default 60000,
  status text not null default 'active' check (status in ('active', 'gagne', 'perdu', 'recompenses_distribuees')),
  commence_a timestamptz not null default now(),
  termine_a timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_boss_status on public.boss_fournees(status);
create index idx_boss_termine_a on public.boss_fournees(termine_a);

-- Table des attaques individuelles (1 ligne par tap/boost)
create table public.boss_attaques (
  id uuid default gen_random_uuid() primary key,
  boss_id uuid references public.boss_fournees(id) on delete cascade,
  user_code text not null,
  user_name text not null,
  type_attaque text not null check (type_attaque in ('tap', 'boost')),
  degats int not null,
  created_at timestamptz not null default now()
);

create index idx_attaques_boss on public.boss_attaques(boss_id, created_at desc);
create index idx_attaques_user on public.boss_attaques(boss_id, user_code);

-- Activer RLS
alter table public.boss_fournees enable row level security;
alter table public.boss_attaques enable row level security;

-- Policies (tout le monde peut lire, tout le monde peut attaquer)
create policy "Anyone can read boss" on public.boss_fournees for select using (true);
create policy "Anyone can insert boss" on public.boss_fournees for insert with check (true);
create policy "Anyone can update boss" on public.boss_fournees for update using (true) with check (true);
create policy "Anyone can read attacks" on public.boss_attaques for select using (true);
create policy "Anyone can insert attacks" on public.boss_attaques for insert with check (true);
```

## Vérifications phase 2
- ☑ Table `boss_fournees` créée
- ☑ Table `boss_attaques` créée
- ☑ RLS activé sur les 2 tables

---

# ══════════════════════════════════════════════
# PHASE 3 — Module logique (`src/lib/bossCommunautaire.js`)
# ══════════════════════════════════════════════

Créer le fichier `src/lib/bossCommunautaire.js` :

```js
import { supabase, isSupabaseEnabled } from './supabase';

export const BOSS_CONFIG = {
  PV_MAX: 60000,
  DUREE_HEURES: 24,
  TAP_DEGATS: 50,
  TAP_GRATUITS_PAR_JOUR: 100,
  BOOST_DEGATS: 200,
  BOOST_COUT: 50,
  COOLDOWN_MS: 1000,
  NIVEAU_REQUIS: 5,
  RECOMPENSE_VICTOIRE: { cookies: 120, badge: 'renfort_solide' },
  RECOMPENSE_DEFAITE: { cookies: 20, badge: 'vaillant' },
  TOP_BONUS: [500, 300, 100],
};

/**
 * Récupère le boss actuel actif (ou null s'il n'y en a pas).
 */
export async function getBossActif() {
  if (!isSupabaseEnabled()) return null;

  const { data } = await supabase
    .from('boss_fournees')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

/**
 * Crée un nouveau boss si pas déjà un actif.
 */
export async function creerBossSiNecessaire() {
  if (!isSupabaseEnabled()) return null;

  const actuel = await getBossActif();
  if (actuel) {
    // Vérifier si expiré
    const maintenant = new Date();
    const fin = new Date(actuel.termine_a);
    if (maintenant < fin) return actuel;
    // Sinon clôturer le boss et en créer un nouveau
    await cloturerBoss(actuel.id);
  }

  // Récupérer le dernier numéro de fournée
  const { data: dernier } = await supabase
    .from('boss_fournees')
    .select('numero_fournee')
    .order('numero_fournee', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nouveauNumero = (dernier?.numero_fournee ?? 0) + 1;

  const termineA = new Date();
  termineA.setHours(termineA.getHours() + BOSS_CONFIG.DUREE_HEURES);

  const { data: nouveau } = await supabase
    .from('boss_fournees')
    .insert({
      numero_fournee: nouveauNumero,
      pv_max: BOSS_CONFIG.PV_MAX,
      pv_actuels: BOSS_CONFIG.PV_MAX,
      status: 'active',
      termine_a: termineA.toISOString(),
    })
    .select()
    .single();

  return nouveau;
}

/**
 * Attaque le boss. Décrémente les PV et insère une ligne d'attaque.
 */
export async function attaquerBoss(bossId, userCode, userName, typeAttaque) {
  if (!isSupabaseEnabled()) return { error: 'Hors ligne' };

  const degats = typeAttaque === 'boost' ? BOSS_CONFIG.BOOST_DEGATS : BOSS_CONFIG.TAP_DEGATS;

  // Récupérer le boss actuel pour vérifier ses PV
  const { data: boss } = await supabase
    .from('boss_fournees')
    .select('pv_actuels, status, termine_a')
    .eq('id', bossId)
    .maybeSingle();

  if (!boss) return { error: 'Boss introuvable' };
  if (boss.status !== 'active') return { error: 'Boss inactif' };

  const maintenant = new Date();
  if (new Date(boss.termine_a) <= maintenant) {
    return { error: 'Boss expiré' };
  }

  // Calculer nouveaux PV (clampés à 0 minimum)
  const nouveauxPV = Math.max(0, boss.pv_actuels - degats);

  // Update PV
  await supabase
    .from('boss_fournees')
    .update({ pv_actuels: nouveauxPV })
    .eq('id', bossId);

  // Insérer l'attaque
  await supabase.from('boss_attaques').insert({
    boss_id: bossId,
    user_code: userCode,
    user_name: userName,
    type_attaque: typeAttaque,
    degats: degats,
  });

  // Si on a tué le boss, marquer comme gagné
  if (nouveauxPV === 0) {
    await supabase
      .from('boss_fournees')
      .update({ status: 'gagne' })
      .eq('id', bossId);
  }

  return { success: true, degats, nouveauxPV };
}

/**
 * Récupère le top des plus gros attaquants pour le boss actuel.
 */
export async function getTopAttaquants(bossId, limit = 10) {
  if (!isSupabaseEnabled()) return [];

  const { data } = await supabase
    .from('boss_attaques')
    .select('user_code, user_name, degats')
    .eq('boss_id', bossId);

  if (!data) return [];

  // Agréger par user_code
  const agregat = {};
  data.forEach(a => {
    if (!agregat[a.user_code]) {
      agregat[a.user_code] = { user_code: a.user_code, user_name: a.user_name, total: 0, attaques: 0 };
    }
    agregat[a.user_code].total += a.degats;
    agregat[a.user_code].attaques++;
  });

  return Object.values(agregat)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/**
 * Récupère les attaques récentes (pour l'activité).
 */
export async function getAttaquesRecentes(bossId, limit = 10) {
  if (!isSupabaseEnabled()) return [];

  const { data } = await supabase
    .from('boss_attaques')
    .select('user_code, user_name, type_attaque, degats, created_at')
    .eq('boss_id', bossId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data ?? [];
}

/**
 * Récupère les stats de l'utilisateur sur ce boss.
 */
export async function getMesStatsBoss(bossId, userCode) {
  if (!isSupabaseEnabled() || !userCode) return { total: 0, attaques: 0 };

  const { data } = await supabase
    .from('boss_attaques')
    .select('degats, type_attaque')
    .eq('boss_id', bossId)
    .eq('user_code', userCode);

  if (!data) return { total: 0, attaques: 0 };

  return {
    total: data.reduce((sum, a) => sum + a.degats, 0),
    attaques: data.length,
  };
}

/**
 * Clôture un boss expiré.
 */
export async function cloturerBoss(bossId) {
  if (!isSupabaseEnabled()) return;

  const { data: boss } = await supabase
    .from('boss_fournees')
    .select('*')
    .eq('id', bossId)
    .maybeSingle();

  if (!boss || boss.status !== 'active') return;

  // Si PV à 0 = gagné, sinon perdu
  const status = boss.pv_actuels === 0 ? 'gagne' : 'perdu';

  await supabase
    .from('boss_fournees')
    .update({ status })
    .eq('id', bossId);
}

/**
 * Compte les taps gratuits faits aujourd'hui par l'utilisateur (cap 100/jour).
 */
export async function getTapsGratuitsAujourdhui(userCode) {
  if (!isSupabaseEnabled() || !userCode) return 0;

  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('boss_attaques')
    .select('*', { count: 'exact', head: true })
    .eq('user_code', userCode)
    .eq('type_attaque', 'tap')
    .gte('created_at', debutJour.toISOString());

  return count ?? 0;
}
```

## Vérifications phase 3
- ☑ Fichier `src/lib/bossCommunautaire.js` créé
- ☑ Toutes les fonctions exportées
- ☑ Pas d'erreur de syntaxe

---

# ══════════════════════════════════════════════
# PHASE 4 — Composant `<BossCake>` — Le SVG du boss
# ══════════════════════════════════════════════

⚠️ **CRITIQUE** : ce composant est la **base visuelle du boss**. À mettre dans `src/components/BossCake.jsx`.

**Le SVG doit être copié EXACTEMENT comme ci-dessous.** C'est le résultat d'itérations design avec l'utilisateur. **NE PAS remplacer par emoji 🎂, NE PAS simplifier.**

```jsx
/**
 * Le boss Gâteau Géant — kawaii furieux.
 * Style : 1 étage massif avec visage expressif (yeux énormes, sourcils colériques, dents pointues).
 *
 * Props :
 * - attacked : true pendant l'animation d'attaque (transitoire ~400ms)
 * - hpPercent : 0 à 100 (pour afficher fissures progressives)
 */
export default function BossCake({ attacked = false, hpPercent = 100 }) {
  const showCrack1 = hpPercent < 60;
  const showCrack2 = hpPercent < 30;

  return (
    <div
      style={{
        position: 'relative',
        cursor: 'pointer',
        animation: 'bossIdle 2.5s ease-in-out infinite',
        transformOrigin: 'center bottom',
        zIndex: 2,
      }}
      className={attacked ? 'boss-attacked' : ''}
    >
      <svg width="240" height="270" viewBox="0 0 240 270" xmlns="http://www.w3.org/2000/svg">

        {/* BOUGIE GAUCHE allumée */}
        <rect x="78" y="14" width="7" height="22" fill="#F5EFE6" rx="1.5"/>
        <rect x="78" y="14" width="7" height="3" fill="#E8DDD0" rx="1.5"/>
        <path d="M 81.5 14 Q 79 8 81.5 4 Q 84 8 81.5 14" fill="#FFD75A"/>
        <path d="M 81.5 12 Q 80 9 81.5 6 Q 83 9 81.5 12" fill="#FFFFFF"/>

        {/* BOUGIE DROITE allumée */}
        <rect x="155" y="14" width="7" height="22" fill="#F5EFE6" rx="1.5"/>
        <rect x="155" y="14" width="7" height="3" fill="#E8DDD0" rx="1.5"/>
        <path d="M 158.5 14 Q 156 8 158.5 4 Q 161 8 158.5 14" fill="#FFD75A"/>
        <path d="M 158.5 12 Q 157 9 158.5 6 Q 160 9 158.5 12" fill="#FFFFFF"/>

        {/* OMBRE SOL */}
        <ellipse cx="120" cy="246" rx="80" ry="6" fill="rgba(0,0,0,0.4)"/>

        {/* CORPS DU GÂTEAU - 1 étage massif */}
        <ellipse cx="120" cy="36" rx="78" ry="10" fill="#3D2010"/>
        <rect x="42" y="36" width="156" height="180" rx="6" fill="#5C3317"/>

        {/* GLAÇAGE DÉGOULINANT (caramel) */}
        <path d="M 42 50 Q 50 70 45 90 Q 60 70 62 90 Q 78 65 82 92 Q 98 68 102 90 Q 120 65 124 92 Q 140 65 144 90 Q 160 68 164 92 Q 180 70 184 88 Q 195 70 198 50 L 42 50" fill="#A57021"/>

        {/* TOP du gâteau (ellipse profondeur) */}
        <ellipse cx="120" cy="42" rx="78" ry="8" fill="#7D4E1F"/>

        {/* Pépites de chocolat */}
        <circle cx="62" cy="70" r="3" fill="#3D2010"/>
        <circle cx="90" cy="80" r="3" fill="#3D2010"/>
        <circle cx="125" cy="74" r="3" fill="#3D2010"/>
        <circle cx="155" cy="82" r="3" fill="#3D2010"/>
        <circle cx="180" cy="70" r="3" fill="#3D2010"/>

        {/* JOUES ROSES (blush) */}
        <ellipse cx="62" cy="160" rx="14" ry="8" fill="rgba(193, 127, 60, 0.7)"/>
        <ellipse cx="178" cy="160" rx="14" ry="8" fill="rgba(193, 127, 60, 0.7)"/>

        {/* SOURCILS FURIEUX (V renversé) */}
        <path d="M 70 115 L 100 105 L 105 118"
              stroke="#2C1810" strokeWidth="7" fill="none"
              strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M 170 115 L 140 105 L 135 118"
              stroke="#2C1810" strokeWidth="7" fill="none"
              strokeLinecap="round" strokeLinejoin="round"/>

        {/* YEUX KAWAII - blancs énormes */}
        <circle cx="88" cy="140" r="18" fill="#F5EFE6"/>
        <circle cx="152" cy="140" r="18" fill="#F5EFE6"/>

        {/* Iris noires décalées vers le bas (regard méchant) */}
        <circle cx="90" cy="146" r="11" fill="#2C1810"/>
        <circle cx="150" cy="146" r="11" fill="#2C1810"/>

        {/* Reflets brillants kawaii */}
        <circle cx="94" cy="142" r="4" fill="white"/>
        <circle cx="86" cy="150" r="2" fill="white"/>
        <circle cx="154" cy="142" r="4" fill="white"/>
        <circle cx="146" cy="150" r="2" fill="white"/>

        {/* BOUCHE ouverte avec dents pointues */}
        <ellipse cx="120" cy="190" rx="28" ry="18" fill="#2C1810"/>

        {/* Dents pointues du haut (3) */}
        <path d="M 100 178 L 105 188 L 110 178 Z" fill="#F5EFE6"/>
        <path d="M 113 175 L 120 188 L 127 175 Z" fill="#F5EFE6"/>
        <path d="M 130 178 L 135 188 L 140 178 Z" fill="#F5EFE6"/>

        {/* Dents pointues du bas (2) */}
        <path d="M 108 200 L 113 192 L 118 200 Z" fill="#F5EFE6"/>
        <path d="M 122 200 L 127 192 L 132 200 Z" fill="#F5EFE6"/>

        {/* Langue rouge bordeaux */}
        <ellipse cx="120" cy="198" rx="10" ry="4" fill="#7D4E1F"/>

        {/* FISSURE 1 (apparaît si PV < 60%) */}
        {showCrack1 && (
          <path d="M 100 70 L 95 100 L 102 130 L 92 165 L 100 200"
                stroke="#2C1810" strokeWidth="2.5" fill="none" opacity="0.9"/>
        )}

        {/* FISSURE 2 (apparaît si PV < 30%) */}
        {showCrack2 && (
          <path d="M 180 90 L 175 120 L 182 150"
                stroke="#2C1810" strokeWidth="2" fill="none" opacity="0.9"/>
        )}

        {/* Highlight côté gauche */}
        <rect x="50" y="60" width="3" height="140" rx="1.5" fill="rgba(255,255,255,0.15)"/>
      </svg>
    </div>
  );
}
```

## CSS global à ajouter dans `index.css`

```css
/* ════════════════════════════════════════════
   ANIMATIONS BOSS GÂTEAU GÉANT
   ════════════════════════════════════════════ */

@keyframes bossIdle {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-6px) scale(1.03); }
}

@keyframes bossAttack {
  0% { transform: translate(0, 0) scale(1) rotate(0deg); }
  15% { transform: translate(-7px, 2px) scale(1.12, 0.88) rotate(-4deg); filter: brightness(2.5); }
  30% { transform: translate(7px, -2px) scale(0.92, 1.08) rotate(4deg); filter: brightness(1.5); }
  50% { transform: translate(-5px, 1px) scale(1.06, 0.94) rotate(-2deg); }
  70% { transform: translate(3px, -1px) scale(1, 1) rotate(1deg); }
  100% { transform: translate(0, 0) scale(1) rotate(0deg); }
}

.boss-attacked {
  animation: bossAttack 0.4s ease-in-out !important;
}

@keyframes bossAuraPulse {
  0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); }
}

@keyframes bossFlash {
  0% { opacity: 0; }
  20% { opacity: 0.4; }
  100% { opacity: 0; }
}

@keyframes bossCrumbFly {
  0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
  100% { opacity: 0; transform: var(--end-transform); }
}

@keyframes bossDamageFloat {
  0% { opacity: 0; transform: translate(-50%, 0) scale(0.5); }
  20% { opacity: 1; transform: translate(-50%, -10px) scale(1.4); }
  100% { opacity: 0; transform: translate(-50%, -90px) scale(1); }
}

@keyframes bossHpShimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes bossActivitySlide {
  from { transform: translateX(-10px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

## Vérifications phase 4
- ☑ Composant `<BossCake />` affiche le gâteau kawaii furieux
- ☑ 2 bougies allumées sur le dessus
- ☑ Glaçage caramel qui dégouline
- ☑ Joues roses
- ☑ Sourcils furieux en V
- ☑ Gros yeux ronds avec reflets brillants
- ☑ Bouche ouverte avec 5 dents pointues
- ☑ Animation idle (le boss respire)
- ☑ Quand `attacked={true}` → animation d'attaque
- ☑ Quand `hpPercent < 60` → fissure 1 visible
- ☑ Quand `hpPercent < 30` → fissure 2 visible

---

# ══════════════════════════════════════════════
# PHASE 5 — Composant principal `<BossPage>`
# ══════════════════════════════════════════════

Créer `src/components/BossPage.jsx` :

```jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import BossCake from './BossCake';
import {
  BOSS_CONFIG,
  getBossActif,
  creerBossSiNecessaire,
  attaquerBoss,
  getTopAttaquants,
  getAttaquesRecentes,
  getMesStatsBoss,
  getTapsGratuitsAujourdhui,
} from '../lib/bossCommunautaire';

export default function BossPage({ onClose, userCode, userName, coins, addCoins, spendCoins, level }) {
  const [boss, setBoss] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAttacking, setIsAttacking] = useState(false);
  const [tempsRestant, setTempsRestant] = useState('');
  const [tapsAujourdhui, setTapsAujourdhui] = useState(0);
  const [mesStats, setMesStats] = useState({ total: 0, attaques: 0 });
  const [topAttaquants, setTopAttaquants] = useState([]);
  const [attaquesRecentes, setAttaquesRecentes] = useState([]);

  // Animations
  const [crumbs, setCrumbs] = useState([]); // [{ id, color, transform, delay }]
  const [damagePopups, setDamagePopups] = useState([]); // [{ id, amount, left }]
  const [machineEffect, setMachineEffect] = useState(null); // null | 'flash'
  const [bossAttacked, setBossAttacked] = useState(false);
  const lastAttackAt = useRef(0);

  // ═══ INIT ═══

  useEffect(() => {
    if (!userCode) return;
    (async () => {
      setLoading(true);
      const bossActif = await creerBossSiNecessaire();
      setBoss(bossActif);
      if (bossActif) await refreshData(bossActif.id);
      setLoading(false);
    })();
  }, [userCode]);

  // ═══ REFRESH PÉRIODIQUE (toutes les 10s pour voir l'activité live) ═══

  useEffect(() => {
    if (!boss) return;
    const interval = setInterval(() => refreshData(boss.id), 10000);
    return () => clearInterval(interval);
  }, [boss]);

  // ═══ TIMER ═══

  useEffect(() => {
    if (!boss) return;
    const updateTimer = () => {
      const fin = new Date(boss.termine_a);
      const diff = fin - new Date();
      if (diff <= 0) {
        setTempsRestant('Terminé');
        return;
      }
      const heures = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setTempsRestant(`${heures}h ${minutes}m`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, [boss]);

  // ═══ FETCH DATA ═══

  const refreshData = async (bossId) => {
    const [top, recentes, mes, taps, bossUpdate] = await Promise.all([
      getTopAttaquants(bossId, 10),
      getAttaquesRecentes(bossId, 8),
      getMesStatsBoss(bossId, userCode),
      getTapsGratuitsAujourdhui(userCode),
      getBossActif(),
    ]);
    setTopAttaquants(top);
    setAttaquesRecentes(recentes);
    setMesStats(mes);
    setTapsAujourdhui(taps);
    if (bossUpdate) setBoss(bossUpdate);
  };

  // ═══ ATTAQUER ═══

  const handleAttack = useCallback(async (isBoost = false) => {
    if (!boss || isAttacking) return;

    // Cooldown
    if (Date.now() - lastAttackAt.current < BOSS_CONFIG.COOLDOWN_MS) return;
    lastAttackAt.current = Date.now();

    // Vérifications
    if (level < BOSS_CONFIG.NIVEAU_REQUIS) {
      alert(`Niveau ${BOSS_CONFIG.NIVEAU_REQUIS} requis`);
      return;
    }
    if (!isBoost && tapsAujourdhui >= BOSS_CONFIG.TAP_GRATUITS_PAR_JOUR) {
      alert('Limite quotidienne de taps atteinte. Utilise le boost !');
      return;
    }
    if (isBoost && coins < BOSS_CONFIG.BOOST_COUT) {
      alert(`Pas assez de cookies (besoin de ${BOSS_CONFIG.BOOST_COUT})`);
      return;
    }

    setIsAttacking(true);

    // Débit cookies si boost
    if (isBoost) {
      spendCoins(BOSS_CONFIG.BOOST_COUT);
    }

    // Animations
    setBossAttacked(true);
    setTimeout(() => setBossAttacked(false), 400);

    setMachineEffect('flash');
    setTimeout(() => setMachineEffect(null), 300);

    const degats = isBoost ? BOSS_CONFIG.BOOST_DEGATS : BOSS_CONFIG.TAP_DEGATS;

    spawnCrumbs();
    spawnDamage(degats);

    // Update local pv (optimistic UI)
    setBoss(prev => prev ? { ...prev, pv_actuels: Math.max(0, prev.pv_actuels - degats) } : prev);

    // Envoi serveur
    await attaquerBoss(boss.id, userCode, userName, isBoost ? 'boost' : 'tap');

    // Refresh data
    await refreshData(boss.id);

    setIsAttacking(false);
  }, [boss, isAttacking, coins, level, tapsAujourdhui, userCode, userName, spendCoins]);

  const spawnCrumbs = () => {
    const newCrumbs = [];
    const colors = ['#5C3317', '#7D4E1F', '#A57021', '#4A2C17'];
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 80;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance + 30;
      const rot = Math.random() * 720 - 360;
      newCrumbs.push({
        id: Date.now() + '-' + i,
        color: colors[i % 4],
        transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
        delay: Math.random() * 0.1,
      });
    }
    setCrumbs(c => [...c, ...newCrumbs]);
    setTimeout(() => setCrumbs(c => c.slice(newCrumbs.length)), 900);
  };

  const spawnDamage = (amount) => {
    const id = Date.now();
    const popup = {
      id,
      amount,
      left: 40 + Math.random() * 30,
    };
    setDamagePopups(p => [...p, popup]);
    setTimeout(() => setDamagePopups(p => p.filter(x => x.id !== id)), 1000);
  };

  // ═══ RENDER ═══

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#F5EFE6', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#8B6A5A', fontSize: 14,
      }}>
        Chargement du boss...
      </div>
    );
  }

  if (!boss) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#F5EFE6', zIndex: 100, padding: 20 }}>
        <button onClick={onClose} style={{ background: 'rgba(45,22,8,0.08)', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 18, cursor: 'pointer' }}>‹</button>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48 }}>😴</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#2C1810', marginTop: 8 }}>Pas de boss actif</div>
          <div style={{ fontSize: 12, color: '#8B6A5A', marginTop: 4 }}>Reviens plus tard !</div>
        </div>
      </div>
    );
  }

  const pvPercent = (boss.pv_actuels / boss.pv_max) * 100;
  const couleurBarre = pvPercent > 66 ? 'linear-gradient(90deg, #D4A017, #C17F3C)'
                     : pvPercent > 33 ? 'linear-gradient(90deg, #C17F3C, #A57021)'
                     : 'linear-gradient(90deg, #A57021, #7D4E1F)';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#F5EFE6', zIndex: 100,
      overflowY: 'auto', padding: 16, paddingBottom: 24,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onClose} style={{
          background: 'rgba(45, 22, 8, 0.08)', border: 'none', borderRadius: '50%',
          width: 36, height: 36, color: '#2C1810', fontSize: 18, fontWeight: 800, cursor: 'pointer',
        }}>‹</button>
        <div style={{
          fontSize: 17, fontWeight: 800, color: '#2C1810',
          flex: 1, textAlign: 'center', marginLeft: -36,
        }}>Le Gâteau Géant</div>
        <div style={{
          background: '#D4A017', borderRadius: 100,
          padding: '6px 12px', fontWeight: 800, fontSize: 13, color: '#2C1810',
        }}>🍪 {coins.toLocaleString()}</div>
      </div>

      {/* ═══ BOSS ZONE ═══ */}
      <div style={{
        background: 'linear-gradient(180deg, #3D2010 0%, #5C3317 100%)',
        borderRadius: 20, padding: 16, position: 'relative',
        overflow: 'hidden',
        border: '2px solid rgba(212, 160, 23, 0.3)',
      }}>
        {/* Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #7D4E1F, #5C3317)',
          borderRadius: 100, padding: '4px 14px', display: 'inline-block',
          marginBottom: 8, fontSize: 10, fontWeight: 800,
          letterSpacing: 1.5, textTransform: 'uppercase',
          color: '#F5EFE6', border: '1px solid rgba(212, 160, 23, 0.4)',
        }}>⚔️ Boss communautaire · Fournée #{boss.numero_fournee}</div>

        {/* Titre + desc */}
        <div style={{
          fontSize: 28, fontWeight: 900, color: '#F5EFE6',
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4,
        }}>Le Gâteau Géant</div>
        <div style={{
          fontSize: 11, color: 'rgba(245, 239, 230, 0.7)',
          fontStyle: 'italic', marginBottom: 14,
        }}>Toute la communauté tape le même gâteau. Faites tomber sa barre, ensemble.</div>

        {/* Stage */}
        <div style={{
          position: 'relative', height: 280,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 12,
        }}>
          {/* Aura */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 280, height: 280, borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(212, 160, 23, 0.25) 0%, transparent 60%)',
            animation: 'bossAuraPulse 2.5s ease-in-out infinite',
            pointerEvents: 'none',
          }} />

          {/* Flash */}
          {machineEffect === 'flash' && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'white', borderRadius: 20,
              animation: 'bossFlash 0.3s ease-out',
              pointerEvents: 'none', zIndex: 10,
            }} />
          )}

          {/* Le boss */}
          <div onClick={() => handleAttack(false)}>
            <BossCake attacked={bossAttacked} hpPercent={pvPercent} />
          </div>

          {/* Miettes */}
          {crumbs.map(c => (
            <div key={c.id} style={{
              position: 'absolute', left: '50%', top: '50%',
              width: 8, height: 8, borderRadius: '30%',
              background: c.color, pointerEvents: 'none',
              animation: 'bossCrumbFly 0.8s ease-out forwards',
              animationDelay: c.delay + 's',
              '--end-transform': c.transform,
            }} />
          ))}

          {/* Dégâts qui flottent */}
          {damagePopups.map(d => (
            <div key={d.id} style={{
              position: 'absolute',
              left: d.left + '%', top: '40%',
              fontSize: 26, fontWeight: 900,
              color: '#D4A017',
              textShadow: '2px 2px 0 #2C1810, -1px -1px 0 #2C1810, 1px -1px 0 #2C1810, -1px 1px 0 #2C1810',
              pointerEvents: 'none',
              animation: 'bossDamageFloat 1s ease-out forwards',
              transform: 'translate(-50%, 0)',
            }}>-{d.amount}</div>
          ))}
        </div>

        {/* BARRE DE PV */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: 12, padding: '8px 14px', marginBottom: 10,
          border: '1px solid rgba(212, 160, 23, 0.3)',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 6,
            fontSize: 12, fontWeight: 800, color: '#F5EFE6',
          }}>
            <span>❤️ Points de vie</span>
            <span style={{ color: '#D4A017' }}>
              {boss.pv_actuels.toLocaleString()} / {boss.pv_max.toLocaleString()} PV
            </span>
          </div>
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)', borderRadius: 100,
            height: 14, overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              height: '100%', borderRadius: 100,
              width: pvPercent + '%',
              background: couleurBarre,
              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background 0.8s ease',
              position: 'relative',
              boxShadow: 'inset 0 -2px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
                animation: 'bossHpShimmer 2s ease-in-out infinite',
              }} />
            </div>
          </div>
        </div>

        {/* STATS */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          background: 'rgba(0, 0, 0, 0.2)', borderRadius: 10,
          padding: '8px 12px', marginBottom: 12,
          border: '1px solid rgba(212, 160, 23, 0.2)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(245, 239, 230, 0.85)' }}>
            ⏰ <span style={{ color: '#D4A017', fontWeight: 900 }}>{tempsRestant}</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(245, 239, 230, 0.85)' }}>
            👥 <span style={{ color: '#D4A017', fontWeight: 900 }}>{topAttaquants.length}</span> baristas
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(245, 239, 230, 0.85)' }}>
            🍴 toi <span style={{ color: '#D4A017', fontWeight: 900 }}>{mesStats.total}</span>
          </div>
        </div>

        {/* BOUTONS */}
        <button
          onClick={() => handleAttack(false)}
          disabled={isAttacking || tapsAujourdhui >= BOSS_CONFIG.TAP_GRATUITS_PAR_JOUR}
          style={{
            display: 'block', width: '100%',
            background: 'linear-gradient(180deg, #D4A017 0%, #B58A0E 100%)',
            color: '#2C1810', border: 'none', borderRadius: 14,
            padding: 18, fontSize: 18, fontWeight: 900,
            cursor: isAttacking ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase', letterSpacing: 1.5,
            marginBottom: 8,
            boxShadow: '0 4px 0 #8C6800, 0 8px 16px rgba(212, 160, 23, 0.4)',
          }}
        >
          🍴 ENFOURNER ({tapsAujourdhui}/{BOSS_CONFIG.TAP_GRATUITS_PAR_JOUR})
        </button>

        <button
          onClick={() => handleAttack(true)}
          disabled={isAttacking || coins < BOSS_CONFIG.BOOST_COUT}
          style={{
            display: 'block', width: '100%',
            background: 'linear-gradient(180deg, #7D4E1F 0%, #5C3317 100%)',
            color: '#F5EFE6', borderRadius: 14,
            border: '1px solid rgba(212, 160, 23, 0.4)',
            padding: 14, fontSize: 13, fontWeight: 900,
            cursor: isAttacking || coins < BOSS_CONFIG.BOOST_COUT ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase', letterSpacing: 1.5,
            boxShadow: '0 4px 0 #3D2010',
          }}
        >
          🔥 BOOST — {BOSS_CONFIG.BOOST_COUT} 🍪 · -{BOSS_CONFIG.BOOST_DEGATS} PV
        </button>
      </div>

      {/* INFO COMMUNAUTÉ */}
      <div style={{
        background: 'rgba(212, 160, 23, 0.1)',
        border: '1px solid rgba(212, 160, 23, 0.3)',
        borderRadius: 12, padding: '10px 14px',
        marginTop: 14, fontSize: 11, color: '#7D4E1F',
        textAlign: 'center', lineHeight: 1.5,
      }}>
        Si la communauté gagne : <strong style={{ color: '#D4A017' }}>🏆 Badge + {BOSS_CONFIG.RECOMPENSE_VICTOIRE.cookies} 🍪</strong> (Renfort solide)
      </div>

      {/* PODIUM TOP 3 */}
      <div style={{ marginTop: 14 }}>
        <div style={{
          textAlign: 'center', fontSize: 11, fontWeight: 800,
          color: '#8B6A5A', letterSpacing: 2, textTransform: 'uppercase',
          marginBottom: 14,
        }}>🏆 Plus gros pâtissiers</div>

        {topAttaquants.length === 0 ? (
          <div style={{
            background: 'white', padding: 16, borderRadius: 12,
            border: '1.5px solid #E8DDD0', textAlign: 'center',
            fontSize: 12, color: '#8B6A5A',
          }}>
            Sois le premier à attaquer !
          </div>
        ) : (
          <Podium top={topAttaquants.slice(0, 3)} />
        )}

        {topAttaquants.length > 3 && (
          <div style={{
            background: 'white', borderRadius: 12, padding: 8,
            border: '1.5px solid #E8DDD0', marginTop: 12,
          }}>
            {topAttaquants.slice(3, 10).map((u, i) => (
              <div key={u.user_code} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px',
                borderBottom: i < topAttaquants.slice(3, 10).length - 1 ? '1px dashed #E8DDD0' : 'none',
              }}>
                <span style={{ fontSize: 11, color: '#8B6A5A', fontWeight: 700, minWidth: 22 }}>#{i + 4}</span>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F5EFE6', border: '1px solid #E8DDD0', flexShrink: 0 }} />
                <span style={{ flex: 1, fontWeight: 700, fontSize: 11, color: '#2C1810' }}>{u.user_name}</span>
                <span style={{ color: '#D4A017', fontWeight: 800, fontSize: 11 }}>{u.total} PV</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ACTIVITÉ RÉCENTE */}
      {attaquesRecentes.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{
            textAlign: 'center', fontSize: 11, fontWeight: 800,
            color: '#8B6A5A', letterSpacing: 2, textTransform: 'uppercase',
            marginBottom: 8,
          }}>⚡ Activité récente</div>

          <div style={{
            background: 'white', borderRadius: 12, padding: 4,
            border: '1.5px solid #E8DDD0', maxHeight: 200, overflowY: 'auto',
          }}>
            {attaquesRecentes.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', fontSize: 11,
                animation: 'bossActivitySlide 0.4s ease-out',
                borderBottom: i < attaquesRecentes.length - 1 ? '1px dashed #E8DDD0' : 'none',
              }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F5EFE6', border: '1px solid #E8DDD0', flexShrink: 0 }} />
                <div style={{ flex: 1, color: '#5C3317' }}>
                  <strong style={{ color: '#2C1810' }}>{a.user_name}</strong> a {a.type_attaque === 'boost' ? 'boosté' : 'enfourné'} <span style={{ color: '#D4A017', fontWeight: 900 }}>-{a.degats} PV</span>
                </div>
                <div style={{ color: '#A0784E', fontSize: 10 }}>{formatTimeAgo(a.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ COMPOSANT PODIUM ═══

function Podium({ top }) {
  const positions = ['podium-2', 'podium-1', 'podium-3']; // ordre : 2e, 1er, 3e
  const orderedTop = [top[1], top[0], top[2]].filter(Boolean);
  const medals = ['🥈', '🥇', '🥉'];
  const colors = ['#A0784E', '#D4A017', '#C17F3C'];

  return (
    <div style={{
      display: 'flex', justifyContent: 'center',
      alignItems: 'flex-end', gap: 4,
    }}>
      {orderedTop.map((user, i) => {
        const isFirst = i === 1;
        const color = colors[i];
        return (
          <div key={user.user_code} style={{
            flex: 1,
            background: 'white',
            borderRadius: '12px 12px 6px 6px',
            padding: isFirst ? '14px 6px' : '10px 6px 8px',
            textAlign: 'center',
            border: `1.5px solid ${color}`,
            boxShadow: `0 4px 0 ${color}`,
            transform: isFirst ? 'translateY(-8px)' : i === 0 ? 'translateY(-2px)' : 'translateY(2px)',
          }}>
            <div style={{ fontSize: 24, marginBottom: 2 }}>{medals[i]}</div>
            <div style={{
              width: isFirst ? 42 : 36, height: isFirst ? 42 : 36,
              borderRadius: '50%', background: '#F5EFE6',
              margin: '0 auto 4px',
              border: `2px solid ${color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 14, color: '#5C3317',
            }}>{user.user_name.charAt(0).toUpperCase()}</div>
            <div style={{
              fontSize: 10, fontWeight: 800, color: '#2C1810',
              marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{user.user_name}</div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#D4A017' }}>{user.total}</div>
          </div>
        );
      })}
    </div>
  );
}

// ═══ HELPER ═══

function formatTimeAgo(dateStr) {
  const diff = (new Date() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return Math.floor(diff / 60) + ' min';
  if (diff < 86400) return Math.floor(diff / 3600) + ' h';
  return Math.floor(diff / 86400) + ' j';
}
```

## Vérifications phase 5
- ☑ Page boss visible avec header + boss + stats + boutons
- ☑ Aura dorée pulsante autour du boss
- ☑ Boss kawaii furieux centré (composant BossCake)
- ☑ Tap sur "ENFOURNER" → animation + dégâts + miettes + barre HP qui descend
- ☑ Tap sur "BOOST" → -50 🍪 et -200 PV
- ☑ Podium top 3 avec or au centre
- ☑ Liste top 4-10 en dessous
- ☑ Activité récente live (refresh toutes les 10s)
- ☑ Timer qui se met à jour

---

# ══════════════════════════════════════════════
# PHASE 6 — Intégration dans la nav
# ══════════════════════════════════════════════

Ajouter une carte/bouton **"Boss communautaire"** dans la page principale, accessible facilement.

```jsx
<button onClick={() => setShowBoss(true)} style={{
  width: '100%',
  background: 'linear-gradient(135deg, #7D4E1F, #5C3317)',
  color: '#F5EFE6',
  border: '2px solid #D4A017',
  borderRadius: 14,
  padding: 14,
  fontWeight: 800,
  cursor: 'pointer',
  fontSize: 14,
}}>
  ⚔️ Boss communautaire en cours !
</button>

{showBoss && (
  <BossPage
    onClose={() => setShowBoss(false)}
    userCode={userCode}
    userName={userName}
    coins={coins}
    addCoins={addCoins}
    spendCoins={spendCoins}
    level={level}
  />
)}
```

## Vérifications phase 6
- ☑ Bouton visible dans la nav principale
- ☑ Tap → ouvre la page boss
- ☑ Bouton "‹" retour fonctionne

---

# ══════════════════════════════════════════════
# PHASE 7 — Distribution des récompenses
# ══════════════════════════════════════════════

Quand un boss se termine (PV à 0 OU timer expiré), distribuer les récompenses à tous les attaquants.

À ajouter dans `bossCommunautaire.js` :

```js
/**
 * Distribue les récompenses aux participants d'un boss terminé.
 * À appeler depuis App.jsx au lancement (vérifie s'il y a des boss à clôturer).
 */
export async function distribuerRecompensesBoss(bossId, userCode) {
  if (!isSupabaseEnabled() || !userCode) return null;

  const { data: boss } = await supabase
    .from('boss_fournees')
    .select('*')
    .eq('id', bossId)
    .maybeSingle();

  if (!boss || boss.status === 'recompenses_distribuees' || boss.status === 'active') return null;

  // Vérifier si user a participé
  const { count } = await supabase
    .from('boss_attaques')
    .select('*', { count: 'exact', head: true })
    .eq('boss_id', bossId)
    .eq('user_code', userCode);

  if (!count || count === 0) return null;

  // Récupérer la récompense
  let recompense;
  if (boss.status === 'gagne') {
    recompense = BOSS_CONFIG.RECOMPENSE_VICTOIRE;
  } else {
    recompense = BOSS_CONFIG.RECOMPENSE_DEFAITE;
  }

  // Vérifier si user est dans le top 3
  const topAttaquants = await getTopAttaquants(bossId, 3);
  const rang = topAttaquants.findIndex(u => u.user_code === userCode);
  const bonusTop = rang >= 0 ? BOSS_CONFIG.TOP_BONUS[rang] : 0;

  const totalCookies = recompense.cookies + bonusTop;

  // Insérer dans l'inbox
  await supabase.from('inbox_messages').insert({
    user_code: userCode,
    type: 'boss_reward',
    title: boss.status === 'gagne'
      ? `🏆 Boss vaincu ! +${totalCookies} 🍪`
      : `🎀 Boss terminé : +${totalCookies} 🍪`,
    body: rang >= 0
      ? `Tu es #${rang + 1} ! Récompense : ${recompense.cookies} 🍪 + bonus top ${rang + 1}: ${bonusTop} 🍪`
      : recompense.cookies + ' 🍪 reçus pour ta participation',
    payload: JSON.stringify({ cookies: totalCookies, badge: recompense.badge }),
  });

  return { cookies: totalCookies, badge: recompense.badge };
}
```

À appeler au lancement de l'app :

```js
useEffect(() => {
  if (!userCode) return;
  (async () => {
    // Trouver les boss clôturés non encore distribués pour l'utilisateur
    const { data: bossClotures } = await supabase
      .from('boss_fournees')
      .select('id')
      .in('status', ['gagne', 'perdu'])
      .limit(5);

    for (const b of bossClotures || []) {
      await distribuerRecompensesBoss(b.id, userCode);
    }
  })();
}, [userCode]);
```

## Vérifications phase 7
- ☑ Quand un boss expire/meurt, les participants reçoivent leur récompense via inbox
- ☑ Top 3 reçoit le bonus supplémentaire
- ☑ Pas de double crédit (status `recompenses_distribuees` empêche)

---

# ══════════════════════════════════════════════
# PHASE 8 — Tests
# ══════════════════════════════════════════════

## Scénarios

1. **Premier accès** → un nouveau boss est créé (fournée #1)
2. **Tap ENFOURNER** → -50 PV, animation, miette, dégâts qui flottent
3. **Tap BOOST** → -200 PV, -50 🍪, même animation
4. **Cooldown** → impossible de tap 2x en 1s
5. **Limite tap** → après 100 taps, bouton désactivé
6. **PV à 60%** → fissure 1 visible
7. **PV à 30%** → fissure 2 visible
8. **PV à 0** → boss marqué comme "gagne"
9. **Activité récente** → s'update toutes les 10s
10. **Podium** → top 3 visible avec or au centre
11. **Reload** → tout est persistent (Supabase)

## Vérifications globales
- ☑ Boss visible et imposant (240×270 SVG)
- ☑ Yeux énormes avec reflets brillants
- ☑ Sourcils furieux en V
- ☑ Joues roses
- ☑ Bouche avec 5 dents pointues
- ☑ Animation d'attaque qui claque
- ☑ Miettes qui partent en éventail
- ☑ Barre HP qui descend fluidement
- ☑ Pas de rouge ni de vert (uniquement palette café)

---

# ══════════════════════════════════════════════
# 💡 NOTES IMPORTANTES POUR CLAUDE CODE
# ══════════════════════════════════════════════

## ⚠️ Règles strictes

1. **NE PAS REMPLACER** le SVG du gâteau par un emoji 🎂. Le SVG est validé par l'utilisateur et précis.

2. **NE PAS SIMPLIFIER** :
   - Les sourcils DOIVENT être en V renversé (path en angle)
   - Les yeux DOIVENT être énormes (r=18) avec 2 reflets brillants chacun
   - Les joues roses DOIVENT être présentes
   - La bouche DOIT avoir exactement 5 dents pointues (3 haut + 2 bas)
   - Les fissures s'affichent progressivement (60% et 30%)

3. **NE PAS CHANGER** les couleurs :
   - Corps gâteau : `#5C3317`
   - Glaçage : `#A57021`
   - Top : `#7D4E1F`
   - Pépites : `#3D2010`
   - Joues : `rgba(193, 127, 60, 0.7)`
   - Yeux blancs : `#F5EFE6`
   - Iris : `#2C1810`
   - Sourcils : `#2C1810`
   - Langue : `#7D4E1F`

4. **NE PAS UTILISER** de rouge ni de vert (sauf gris pour fond).

## 🔧 Performance

- **Refresh data toutes les 10s** seulement (pas plus, pour pas spammer Supabase)
- **Optimistic UI** : on update la barre HP localement AVANT la réponse serveur
- Cleanup des timers/intervals dans `useEffect` return

## 🎯 Anti-cheat (futur)

Pour cette première version, **pas d'anti-cheat** côté serveur. Si les joueurs trichent, on ajoutera plus tard :
- Validation côté Supabase via une fonction Edge
- Limite stricte de X taps par minute par IP
- Détection de patterns suspects (1000 taps en 1 minute = bot)

## 📋 Ordre d'application

1. Phase 1 (vérif prérequis)
2. Phase 2 (SQL Supabase) — IMPORTANT, faire avant le code
3. Phase 3 (module logique)
4. Phase 4 (composant BossCake) — IMPORTANT, valider visuellement avant la suite
5. Phase 5 (page principale)
6. Phase 6 (intégration nav)
7. Phase 7 (distribution récompenses)
8. Phase 8 (tests)

Bon dev ! ☕🎂👹

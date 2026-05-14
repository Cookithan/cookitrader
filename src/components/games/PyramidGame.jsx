import { useState, useEffect, useRef, useCallback } from "react";
import { GOLD } from "../../data/themes.js";
import { playSound } from "../../lib/audio.js";
import { SingleCup } from "./SingleCup.jsx";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   PyramidGame — "Pile de Tasses" (refonte diversification mai 2026)
   ────────────────────────────────────────────────────
   Mini-jeu Stack-like : empile des tasses qui glissent horizontalement,
   tap pour les poser. Si pas alignée, la tasse rétrécit. Si trop petite
   (< 25 % de la largeur initiale) → game over.

   Diversification :
   - 3 MODES sélectionnables avant chaque partie :
     · Normal    — vitesse + reward standard
     · Rapide    — vitesse ×2, reward ×2 (cap inchangé → cap atteint + vite)
     · Précision — bonus +2 🍪 si parfait, malus -1 si raté
   - 3 SKINS visuels (classic / caramel / espresso) tirés au hasard par tasse
   - 2 TASSES SPÉCIALES (apparition aléatoire à partir du score 5) :
     · Golden  (5 %) — +10 🍪 si bien centrée (overlap > 80 %)
     · Fragile (4 %) — game over si overlap < 50 %, mais +5 🍪 si bien posée
     (Large retirée le 11/05/2026 — comportement reset-width buggué.)

   Économie inchangée (pas de nerf demandé) :
   - COÛT = 10 🍪 par partie · niveau requis 10
   - +3 🍪 par tasse posée · cap 100 🍪 (mode normal)
   - Bonus combo +10 🍪 si > 30 tasses
═══════════════════════════════════════════════════════ */

const GAME_AREA_WIDTH    = 320;
const INITIAL_CUP_WIDTH  = 160;
const MIN_CUP_WIDTH      = 38;
const INITIAL_SPEED      = 120;        // px/seconde
const REWARD_PER_CUP     = 3;
/* Le cap de récompense est défini par mode (MODES[mode].rewardCap)
   pour équilibrer risque/récompense — voir bloc MODES ci-dessous. */
const COMBO_THRESHOLD    = 30;
const COMBO_BONUS_AMOUNT = 10;
const COST_TO_PLAY       = 10;

/* Modes de jeu (sélection avant partie). Les multiplicateurs s'appliquent
   au temps réel (vitesse) et au reward by-the-cup. Le `rewardCap` par
   mode équilibre le risque/récompense. `maxCups` (optionnel) termine
   automatiquement la partie au seuil donné (utile pour Rapide qui irait
   sinon trop loin grâce à la vitesse ×2). */
const MODES = {
  normal:    { label:'Normal',    emoji:'☕', desc:'Vitesse + reward standard · cap 80 🍪',         speedMul:1.0, rewardMul:1.0, perfectBonus:0, missPenalty:0, rewardCap:80, maxCups:null },
  rapide:    { label:'Rapide',    emoji:'⚡', desc:'×2 vitesse, ×2 cookies · cap 60 🍪 · fin auto au cap', speedMul:2.0, rewardMul:2.0, perfectBonus:0, missPenalty:0, rewardCap:60, maxCups:50 },
  precision: { label:'Précision', emoji:'🎯', desc:'+2 🍪 parfait, -1 raté · cap 80 🍪',           speedMul:1.0, rewardMul:1.0, perfectBonus:2, missPenalty:1, rewardCap:80, maxCups:null },
};

/* Skins visuels (esthétique pure, pas d'impact gameplay) — tirés au
   hasard pour chaque tasse mobile. */
const SKINS = ['classic', 'caramel', 'espresso'];

/* Tasses spéciales — chance et seuil de score minimum pour apparition.
   On laisse le joueur warm-up (score >= 5) avant d'introduire la
   variabilité, sinon la 1re tasse spéciale peut clore une partie sans
   reward (frustration). */
const SPECIAL_MIN_SCORE = 5;
const SPECIAL_SPAWN = [
  { type:'golden',  chance:0.05, bonus:10, alignThreshold:0.80, label:'Tasse dorée — +10 🍪 si bien centrée' },
  { type:'fragile', chance:0.04, bonus:5,  alignThreshold:0.50, label:'Tasse fragile — casse si <50 %, +5 🍪 sinon' },
];

function pickSpecial(score){
  if(score < SPECIAL_MIN_SCORE) return null;
  const r = Math.random();
  let acc = 0;
  for(const s of SPECIAL_SPAWN){
    acc += s.chance;
    if(r < acc) return s.type;
  }
  return null;
}
function pickSkin(){ return SKINS[Math.floor(Math.random() * SKINS.length)]; }

/* La tasse SVG totale fait width × 1.3 (anse à droite). Le centre visuel
   de la tasse est donc à -15 % de la largeur depuis le centre du div.
   Cet offset doit être compensé pour empiler les tasses bien alignées. */
const HANDLE_OFFSET_RATIO = 0.15;

/* Hauteurs pile / tasse en CSS px (dépend du SVG SingleCup) */
const SAUCER_HEIGHT  = 14;
const STACK_BOTTOM   = 26;
const CUP_HEIGHT_RATIO = 0.42;         // hauteur tasse / largeur tasse (42/100)
const STACK_OVERLAP  = 0;              // 4 → 0 (pas de traversée)

/* Hauteur cumulée de la pile en CSS px (chaque tasse a sa hauteur
   selon sa largeur via le ratio fixe 42:100). +60 d'espace pour
   que la tasse mobile + sa vapeur soient bien au-dessus. */
function getMovingCupBottomPosition(stackedCups){
  let h = 0;
  for(const c of stackedCups) h += c.width * CUP_HEIGHT_RATIO - STACK_OVERLAP;
  return STACK_BOTTOM + SAUCER_HEIGHT + h + 60;
}

export function PyramidGame({ coins, onEarn, onSpend, onEventChallenge, pyramidPlaysLeft = 0, pyramidGamesCap = 100, consumePyramidGame, pyramidRechargeCost = 1, cafes = 0, onRechargePyramid, C }){
  const { t } = useTranslation();
  const [phase,           setPhase]           = useState('intro');     // intro | playing | gameover
  const [mode,            setMode]            = useState('normal');    // sélectionné dans l'intro, lock pendant playing
  const [stackedCups,     setStackedCups]     = useState([]);
  const [movingCup,       setMovingCup]       = useState(null);
  const [score,           setScore]           = useState(0);
  const [reward,          setReward]          = useState(0);
  const [comboBonus,      setComboBonus]      = useState(false);
  const [showRewardPopup, setShowRewardPopup] = useState(0);    // amount last popup (signed)
  const [showPerfectGlow, setShowPerfectGlow] = useState(false);
  const [showSpecialFx,   setShowSpecialFx]   = useState(null); // 'golden'|'fragile'|'large' burst
  /* Flag injecté par la pose d'une tasse `large` : la prochaine tasse
     mobile spawn à pleine largeur INITIAL_CUP_WIDTH au lieu de overlap. */
  const [pendingResetWidth, setPendingResetWidth] = useState(false);
  /* Particules grains de café qui jaillissent au tap d'une tasse posée
     (5 grains éphémères avec angle/distance aléatoires). Cleanup auto
     après 700 ms. */
  const [tapParticles,    setTapParticles]    = useState([]);

  const rafRef     = useRef(null);
  const lastTRef   = useRef(0);
  const phaseRef   = useRef('intro');
  const movingRef  = useRef(null);
  const stackedRef = useRef([]);
  const scoreRef   = useRef(0);
  const modeRef    = useRef('normal');
  const pendingResetWidthRef = useRef(false);

  useEffect(()=>{ phaseRef.current  = phase;       }, [phase]);
  useEffect(()=>{ movingRef.current = movingCup;   }, [movingCup]);
  useEffect(()=>{ stackedRef.current = stackedCups;}, [stackedCups]);
  useEffect(()=>{ scoreRef.current  = score;       }, [score]);
  useEffect(()=>{ modeRef.current   = mode;        }, [mode]);
  useEffect(()=>{ pendingResetWidthRef.current = pendingResetWidth; }, [pendingResetWidth]);

  /* Cleanup au unmount — annule l'animation si en cours */
  useEffect(() => () => {
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  /* ── Animation gauche-droite avec rebond ────────── */
  useEffect(() => {
    if(phase !== 'playing') return;

    const animate = (currentTime) => {
      if(phaseRef.current !== 'playing'){ rafRef.current = null; return; }
      if(!lastTRef.current) lastTRef.current = currentTime;
      const delta = (currentTime - lastTRef.current) / 1000;
      lastTRef.current = currentTime;

      setMovingCup(prev => {
        if(!prev) return prev;
        /* Vitesse exponentielle douce + multiplicateur du mode actif. */
        const speedMul = MODES[modeRef.current]?.speedMul ?? 1;
        const speed = INITIAL_SPEED * (1 + Math.pow(scoreRef.current / 15, 1.3) * 0.4) * speedMul;
        const maxX  = GAME_AREA_WIDTH / 2 - prev.width / 2 - 8;
        const minX  = -maxX;
        let nx = prev.x + prev.direction * speed * delta;
        let ndir = prev.direction;
        if(nx > maxX){ nx = maxX; ndir = -1; }
        else if(nx < minX){ nx = minX; ndir = 1; }
        return { ...prev, x: nx, direction: ndir };
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if(rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTRef.current = 0;
    };
  }, [phase]);

  /* ── Démarrer une partie ───────────────────────── */
  const handleStart = () => {
    if(coins < COST_TO_PLAY) return;
    if(pyramidPlaysLeft <= 0) return;   /* quota épuisé → bouton recharge à la place */
    playSound('modal');
    onSpend(COST_TO_PLAY);
    consumePyramidGame?.();

    /* Base de départ : une tasse posée au centre comme repère visuel.
       Skin par défaut, pas de spécial pour la base. Elle ne compte
       PAS dans le score (qui représente les tasses posées par le joueur). */
    const baseCup = { x: 0, width: INITIAL_CUP_WIDTH, skin: 'classic', special: null };
    setStackedCups([baseCup]);
    stackedRef.current = [baseCup];
    setScore(0); scoreRef.current = 0;
    setReward(0);
    setComboBonus(false);
    setPendingResetWidth(false); pendingResetWidthRef.current = false;
    setMovingCup({
      x: -GAME_AREA_WIDTH / 2 + INITIAL_CUP_WIDTH / 2 + 8,
      width: INITIAL_CUP_WIDTH,
      direction: 1,
      skin: pickSkin(),
      special: null,
    });
    setPhase('playing');
    phaseRef.current = 'playing';
    lastTRef.current = 0;
  };

  /* ── Tap : poser la tasse ──────────────────────── */
  const handleTap = useCallback(() => {
    if(phaseRef.current !== 'playing') return;
    const moving = movingRef.current;
    if(!moving) return;

    const lastCup = stackedRef.current.length > 0
      ? stackedRef.current[stackedRef.current.length - 1]
      : { x: 0, width: INITIAL_CUP_WIDTH, skin:'classic', special:null };

    const movingLeft  = moving.x  - moving.width  / 2;
    const movingRight = moving.x  + moving.width  / 2;
    const lastLeft    = lastCup.x - lastCup.width / 2;
    const lastRight   = lastCup.x + lastCup.width / 2;

    const overlapLeft  = Math.max(movingLeft,  lastLeft);
    const overlapRight = Math.min(movingRight, lastRight);
    const overlapWidth = overlapRight - overlapLeft;

    /* Aucun chevauchement OU tasse devenue trop petite → game over */
    if(overlapWidth <= 0 || overlapWidth < MIN_CUP_WIDTH){
      handleGameOver();
      return;
    }

    /* Ratio d'alignement (1.0 = parfait centrage, 0 = bord à bord). */
    const alignRatio = overlapWidth / moving.width;
    const isPerfect  = Math.abs(moving.x - lastCup.x) < 3;

    /* Tasse fragile : seuil 50 % obligatoire sinon game over. Si OK,
       bonus +5 🍪 (avant multiplicateur de mode). */
    if(moving.special === 'fragile' && alignRatio < 0.50){
      setShowSpecialFx('fragile-broken');
      setTimeout(() => setShowSpecialFx(null), 500);
      handleGameOver();
      return;
    }

    const newX = (overlapLeft + overlapRight) / 2;
    const newCup = { x: newX, width: overlapWidth, skin: moving.skin, special: moving.special };
    const newStack = [...stackedRef.current, newCup];
    stackedRef.current = newStack;
    setStackedCups(newStack);

    const newScore = scoreRef.current + 1;
    scoreRef.current = newScore;
    setScore(newScore);

    /* Reward de base + multiplicateur de mode. */
    const modeCfg = MODES[modeRef.current] || MODES.normal;
    let delta = REWARD_PER_CUP * modeCfg.rewardMul;

    /* Mode Précision : bonus parfait, malus rate. */
    if(modeCfg.perfectBonus && isPerfect) delta += modeCfg.perfectBonus;
    if(modeCfg.missPenalty && !isPerfect)  delta -= modeCfg.missPenalty;

    /* Bonus spéciaux. Tasse dorée : si alignment > 80 %, gros bonus. */
    if(moving.special === 'golden' && alignRatio >= 0.80){
      delta += 10;
      setShowSpecialFx('golden-bonus');
      setTimeout(() => setShowSpecialFx(null), 700);
    }
    /* Tasse fragile bien posée (alignment >= 0.50) → petit bonus. */
    if(moving.special === 'fragile'){
      delta += 5;
      setShowSpecialFx('fragile-saved');
      setTimeout(() => setShowSpecialFx(null), 600);
    }
    /* Tasse large posée → flag pour reset la prochaine width. */
    if(moving.special === 'large'){
      setPendingResetWidth(true); pendingResetWidthRef.current = true;
      setShowSpecialFx('large-applied');
      setTimeout(() => setShowSpecialFx(null), 600);
    }

    const newReward = Math.max(0, Math.min(reward + delta, modeCfg.rewardCap));
    setReward(newReward);
    setShowRewardPopup(delta);
    setTimeout(() => setShowRewardPopup(0), 1000);

    /* Fin auto quand le cap de récompense est atteint (mode Rapide
       principalement — cap 60, on n'incite plus à empiler des tasses
       qui ne rapportent rien). */
    if(newReward >= modeCfg.rewardCap){
      handleGameOver();
      return;
    }

    if(isPerfect){
      setShowPerfectGlow(true);
      setTimeout(() => setShowPerfectGlow(false), 800);
    }

    /* Spawn de 5 grains de café éphémères au point de pose. Angle
       réparti en cercle, distance et rotation aléatoires pour un effet
       feu d'artifice naturel. Auto-cleanup après 700ms via setTimeout. */
    const burstId = Date.now();
    const burst = Array.from({ length: 5 }, (_, i) => {
      const angle = (i / 5) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist  = 45 + Math.random() * 35;
      return {
        id: `${burstId}-${i}`,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 10,
        rot: (Math.random() - 0.5) * 540,
      };
    });
    setTapParticles(prev => [...prev, ...burst]);
    setTimeout(() => {
      setTapParticles(prev => prev.filter(p => !p.id.startsWith(`${burstId}-`)));
    }, 700);

    if(newScore === COMBO_THRESHOLD){
      setComboBonus(true);
    }

    /* Limite maxCups du mode (Rapide : 50 tasses) → fin auto.
       On stoppe ici avant de spawn la prochaine tasse mobile. */
    if(modeCfg.maxCups && newScore >= modeCfg.maxCups){
      handleGameOver();
      return;
    }

    /* Prépare la tasse suivante. Width = overlap (normal) OU
       INITIAL_CUP_WIDTH si une `large` vient d'être posée (effet reset
       full). On consomme le flag immédiatement après. */
    const useReset = pendingResetWidthRef.current;
    if(useReset){
      setPendingResetWidth(false); pendingResetWidthRef.current = false;
    }
    const nextWidth = useReset ? INITIAL_CUP_WIDTH : overlapWidth;
    /* Roll special pour la prochaine mobile (gated à score >= 5). */
    const nextSpecial = pickSpecial(newScore);
    const nextSkin    = pickSkin();
    const sideToStart = Math.random() > 0.5 ? -1 : 1;
    const startX = sideToStart * (GAME_AREA_WIDTH / 2 - nextWidth / 2 - 8);
    const next = {
      x: startX,
      width: nextWidth,
      direction: sideToStart === -1 ? 1 : -1,
      skin: nextSkin,
      special: nextSpecial,
    };
    movingRef.current = next;
    setMovingCup(next);

    playSound(isPerfect ? 'success' : 'tap');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reward]);

  /* ── Game over ─────────────────────────────────── */
  const handleGameOver = useCallback(() => {
    if(rafRef.current){ cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setMovingCup(null);
    setPhase('gameover');
    phaseRef.current = 'gameover';
    playSound('error');
  }, []);

  /* Crédit cookies au mount du gameover (UNE SEULE FOIS) */
  useEffect(() => {
    if(phase !== 'gameover') return;
    const total = reward + (comboBonus ? COMBO_BONUS_AMOUNT : 0);
    if(total > 0) onEarn?.(total);
    /* Event modéré : 'pyramid_floors' (succès si >= 15) */
    onEventChallenge?.('pyramid_floors', score);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ════════ INTRO ════════ */
  if(phase === 'intro'){
    const outOfPlays = pyramidPlaysLeft <= 0;
    const canAfford  = coins >= COST_TO_PLAY;
    const canRecharge = cafes >= pyramidRechargeCost;
    const canPlay = canAfford && !outOfPlays;
    return (
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        gap:14, paddingTop:6, minHeight:'70vh', justifyContent:'center',
      }}>
        <div style={{
          width:'100%', maxWidth:340,
          background:'linear-gradient(180deg, #3D2010 0%, #4A2C17 100%)',
          borderRadius:20, border:'1.5px solid rgba(212, 160, 23, 0.15)',
          padding:24,
          display:'flex', flexDirection:'column', alignItems:'center', gap:18,
          textAlign:'center',
        }}>
          {/* Illustration : une tasse au centre */}
          <SingleCup width={120} showCoffeeInside={true} withSteam={true} />

          <h2 style={{
            fontSize:22, fontWeight:900, color:'#D4A017',
            margin:0, lineHeight:1.2,
          }}>Pile de Tasses</h2>

          <p style={{
            color:'rgba(245, 239, 230, 0.85)', fontSize:13,
            margin:0, lineHeight:1.5, maxWidth:280,
          }}>
            Empile les tasses pile sur la précédente.
            <br/>
            Si tu rates, ta tasse rétrécit.
          </p>

          <div style={{
            background:'rgba(212, 160, 23, 0.15)',
            border:'1px solid rgba(212, 160, 23, 0.4)',
            borderRadius:12, padding:'8px 14px',
            fontSize:11, color:'#D4A017', fontWeight:700, letterSpacing:.2,
          }}>
            +{REWARD_PER_CUP} 🍪 par tasse · max {MODES[mode].rewardCap} 🍪 · combo +{COMBO_BONUS_AMOUNT} 🍪 si {'>'}{COMBO_THRESHOLD} tasses
          </div>

          {/* Compteur essais quotidiens — pastille discrète */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'5px 12px', borderRadius:10,
            background: outOfPlays ? 'rgba(125,72,24,.35)' : 'rgba(245,239,230,.07)',
            border: outOfPlays ? '1px solid rgba(193,127,60,.7)' : '1px solid rgba(212,160,23,.18)',
            fontSize:11, fontWeight:700,
            color: outOfPlays ? '#FFB060' : 'rgba(245,239,230,.7)',
          }}>
            🎮 {pyramidPlaysLeft} / {pyramidGamesCap} essai{pyramidPlaysLeft > 1 ? 's' : ''} restant{pyramidPlaysLeft > 1 ? 's' : ''}
          </div>

          {/* Mode selector — 3 segments (Normal / Rapide / Précision) */}
          <div style={{ width:'100%', maxWidth:280 }}>
            <div style={{
              fontSize:10, fontWeight:700, color:'rgba(245,239,230,.55)',
              textTransform:'uppercase', letterSpacing:1.5,
              textAlign:'left', marginBottom:6,
            }}>
              Mode
            </div>
            <div style={{
              display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6,
              padding:4, borderRadius:12,
              background:'rgba(0,0,0,.25)',
              border:'1px solid rgba(212,160,23,.18)',
            }}>
              {Object.entries(MODES).map(([key, cfg]) => {
                const active = mode === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setMode(key); playSound('toggle'); }}
                    style={{
                      padding:'8px 4px', borderRadius:9, border:'none',
                      background: active ? GOLD : 'transparent',
                      color: active ? '#fff' : 'rgba(245,239,230,.7)',
                      fontSize:11, fontWeight:800, letterSpacing:.3,
                      cursor:'pointer', transition:'background .15s, color .15s',
                      touchAction:'manipulation', userSelect:'none',
                    }}
                  >
                    {cfg.emoji} {cfg.label}
                  </button>
                );
              })}
            </div>
            <div style={{
              fontSize:10.5, color:'rgba(245,239,230,.55)',
              marginTop:6, textAlign:'center', fontStyle:'italic', lineHeight:1.4,
            }}>
              {MODES[mode].desc}
            </div>
          </div>

          {/* Aperçu tasses spéciales — pédagogie */}
          <div style={{
            width:'100%', maxWidth:280,
            fontSize:10, color:'rgba(245,239,230,.55)',
            lineHeight:1.5, textAlign:'left',
          }}>
            <div style={{
              fontWeight:700, color:'rgba(245,239,230,.65)',
              textTransform:'uppercase', letterSpacing:1.5, marginBottom:4,
            }}>
              Tasses spéciales (dès 5 tasses)
            </div>
            <div>✨ <strong style={{ color:'#FFE066' }}>Dorée</strong> : +10 🍪 si bien centrée</div>
            <div>💎 <strong style={{ color:'#D8E8F0' }}>Fragile</strong> : casse si {'<'} 50 %, sinon +5 🍪</div>
          </div>

          {/* Bouton principal : Commencer OU Recharger (selon quota) */}
          {outOfPlays ? (
            <>
              <button
                onClick={() => { onRechargePyramid?.(); }}
                disabled={!canRecharge}
                style={{
                  background: canRecharge ? 'linear-gradient(135deg,#FFD24D,#C99607)' : 'rgba(212, 160, 23, 0.25)',
                  color: canRecharge ? '#3D2010' : 'rgba(245, 239, 230, 0.5)',
                  border:'none', borderRadius:14,
                  padding:'14px 32px',
                  fontSize:15, fontWeight:900, letterSpacing:.4,
                  cursor: canRecharge ? 'pointer' : 'not-allowed',
                  boxShadow: canRecharge ? '0 6px 20px rgba(212,160,23,.45)' : 'none',
                  touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
                  width:'100%', maxWidth:280,
                }}
              >
                {canRecharge
                  ? t('games.recharge_attempts_btn', { cap: pyramidGamesCap, cost: pyramidRechargeCost })
                  : t('games.not_enough_cafe', { cost: pyramidRechargeCost })}
              </button>
              <div style={{ fontSize:10.5, color:'rgba(245,239,230,.55)', textAlign:'center', fontStyle:'italic', marginTop:-4 }}>
                {t('games.quota_reset_midnight')}
              </div>
            </>
          ) : (
            <button
              onClick={handleStart}
              disabled={!canPlay}
              className={canPlay ? 'glow-anim' : ''}
              style={{
                background: canPlay ? GOLD : 'rgba(212, 160, 23, 0.3)',
                color: canPlay ? '#fff' : 'rgba(245, 239, 230, 0.5)',
                border:'none', borderRadius:14,
                padding:'14px 32px',
                fontSize:15, fontWeight:800, letterSpacing:.3,
                cursor: canPlay ? 'pointer' : 'not-allowed',
                boxShadow: canPlay ? '0 6px 20px rgba(212,160,23,.4)' : 'none',
                touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
              }}
            >
              {canAfford ? t('games.start_btn', { cost: COST_TO_PLAY }) : t('games.not_enough', { cost: COST_TO_PLAY })}
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ════════ GAME OVER ════════ */
  if(phase === 'gameover'){
    const totalReward = reward + (comboBonus ? COMBO_BONUS_AMOUNT : 0);
    return (
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        gap:14, paddingTop:6, minHeight:'70vh', justifyContent:'center',
      }}>
        <div className="bi" style={{
          width:'100%', maxWidth:340,
          background:'linear-gradient(180deg, #3D2010 0%, #4A2C17 100%)',
          borderRadius:20, border:'1.5px solid rgba(212, 160, 23, 0.15)',
          padding:24,
          display:'flex', flexDirection:'column', alignItems:'center', gap:14,
          textAlign:'center',
        }}>
          <div style={{ fontSize:48, lineHeight:1 }}>🥞</div>
          <h2 style={{ fontSize:22, fontWeight:900, color:'#D4A017', margin:0 }}>
            Partie terminée !
          </h2>

          <div style={{
            background:'rgba(245, 239, 230, 0.06)',
            border:'1.5px solid rgba(212, 160, 23, 0.18)',
            borderRadius:14, padding:18,
            width:'100%', maxWidth:260,
          }}>
            <div style={{
              fontSize:11, color:'rgba(245, 239, 230, 0.6)',
              textTransform:'uppercase', letterSpacing:1.5, marginBottom:8,
            }}>
              Ton score
            </div>
            <div style={{ fontSize:40, fontWeight:900, color:'#D4A017', lineHeight:1 }}>
              {score}
            </div>
            <div style={{ fontSize:11, color:'rgba(245, 239, 230, 0.6)', marginTop:4 }}>
              tasses posées
            </div>
          </div>

          <div style={{
            background:GOLD, borderRadius:12,
            padding:'10px 20px', fontSize:16, fontWeight:800, color:'#fff',
            boxShadow:'0 4px 14px rgba(212,160,23,.4)',
          }}>
            +{totalReward} 🍪
          </div>

          {comboBonus && (
            <div style={{
              background:'rgba(212, 160, 23, 0.2)',
              border:'1px solid #D4A017', borderRadius:10,
              padding:'6px 12px',
              fontSize:12, color:'#D4A017', fontWeight:800,
            }}>
              🔥 Bonus combo +{COMBO_BONUS_AMOUNT} 🍪
            </div>
          )}

          <div style={{ display:'flex', gap:8, width:'100%', maxWidth:260, marginTop:6 }}>
            <button
              onClick={() => { playSound('toggle'); setPhase('intro'); }}
              style={{
                flex:1, padding:'12px',
                background:'rgba(245, 239, 230, 0.1)',
                border:'1.5px solid rgba(245, 239, 230, 0.2)',
                color:'#F5EFE6', borderRadius:12,
                fontSize:13, fontWeight:700, cursor:'pointer',
              }}
            >
              Quitter
            </button>
            <button
              onClick={() => {
                if(pyramidPlaysLeft <= 0){ setPhase('intro'); return; }   /* retour intro pour recharger */
                handleStart();
              }}
              disabled={coins < COST_TO_PLAY}
              style={{
                flex:1, padding:'12px',
                background: (coins >= COST_TO_PLAY && pyramidPlaysLeft > 0) ? GOLD : 'rgba(212, 160, 23, 0.3)',
                color:'#fff', border:'none', borderRadius:12,
                fontSize:13, fontWeight:800,
                cursor: coins >= COST_TO_PLAY ? 'pointer' : 'not-allowed',
                boxShadow: (coins >= COST_TO_PLAY && pyramidPlaysLeft > 0) ? '0 4px 14px rgba(212,160,23,.4)' : 'none',
              }}
            >
              {pyramidPlaysLeft > 0 ? t('games.replay_btn', { cost: COST_TO_PLAY }) : t('games.recharge_simple', { cost: pyramidRechargeCost })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════ PLAYING ════════ */
  const movingBottom = movingCup ? getMovingCupBottomPosition(stackedCups) : 0;

  /* Scale + suivi caméra de la game area : quand la pile (+ tasse mobile
     + vapeur) dépasse la zone visible, on dézoome de manière LIMITÉE
     (min 0.65 pour rester lisible même à 30+ tasses) PUIS on translate
     la pile vers le bas (la base sort par le bas, cachée par overflow)
     pour garder le sommet et la tasse mobile toujours visibles.
     transformOrigin: bottom center → scale n'altère pas la position
     de la base avant translate. */
  const movingTopHeight = movingCup
    ? movingCup.width * CUP_HEIGHT_RATIO + 50 * (movingCup.width / 100) + 20
    : 0;
  const totalContentHeight = movingBottom + movingTopHeight;
  const SAFE_VISIBLE_HEIGHT = 460;   // game area 520 - tap zone (~60)
  const MIN_STACK_SCALE = 0.65;      // dézoom max (sinon les tasses deviennent illisibles)
  const naturalScale = totalContentHeight > SAFE_VISIBLE_HEIGHT
    ? SAFE_VISIBLE_HEIGHT / totalContentHeight
    : 1;
  const stackScale = Math.max(MIN_STACK_SCALE, naturalScale);
  /* Si après scale on dépasse encore la zone visible (donc on est limité
     par MIN_STACK_SCALE), on décale la pile vers le bas — le sommet
     reste à hauteur lisible, la base disparaît hors écran. */
  const scaledHeight = totalContentHeight * stackScale;
  const cameraY = Math.max(0, scaledHeight - SAFE_VISIBLE_HEIGHT);

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, paddingTop:6 }}>
      {/* 2 cartes stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, width:'100%', maxWidth:340 }}>
        <StatCard value={score}  label={t('game_pyramid.cups_placed')} />
        <StatCard value={reward} label={t('game_pyramid.earned')} highlight={reward >= (MODES[mode]?.rewardCap || 80)} />
      </div>

      {/* Game area */}
      <div
        onPointerDown={(e) => { e.preventDefault(); handleTap(); }}
        style={{
          position:'relative',
          width:'100%', maxWidth:GAME_AREA_WIDTH,
          height:520,
          background:'linear-gradient(180deg, #2A1408 0%, #3D2010 50%, #4A2C17 100%)',
          borderRadius:20,
          border:'1.5px solid rgba(212, 160, 23, 0.2)',
          overflow:'hidden',
          cursor:'pointer',
          touchAction:'manipulation',
          userSelect:'none', WebkitUserSelect:'none',
          boxShadow:'inset 0 0 60px rgba(0,0,0,.4)',
        }}
      >
        {/* Lumière d'ambiance — halo radial doré centré, donne un côté
            "spot lumineux d'un café feutré". */}
        <div style={{
          position:'absolute', inset:0,
          background:'radial-gradient(ellipse at 50% 35%, rgba(212,160,23,.18) 0%, transparent 60%)',
          pointerEvents:'none', zIndex:0,
        }}/>

        {/* Grains de café flottants en arrière-plan (6 grains, animation
            float décalée). Pure déco, pointer-events:none pour pas
            bouffer les taps. */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
          {[
            { top:'10%',  left:'8%',  size:18, rot:-25, delay:0    },
            { top:'70%',  left:'88%', size:16, rot:18,  delay:1.2  },
            { top:'42%',  left:'4%',  size:14, rot:35,  delay:.6   },
            { top:'85%',  left:'14%', size:15, rot:-18, delay:2.1  },
            { top:'18%',  left:'85%', size:17, rot:8,   delay:1.6  },
            { top:'58%',  left:'72%', size:13, rot:-30, delay:.3   },
          ].map((g, i) => (
            <CoffeeBean
              key={i}
              size={g.size}
              style={{
                position:'absolute', top:g.top, left:g.left,
                transform:`rotate(${g.rot}deg)`,
                opacity:.16,
                animation:`pyramidBeanFloat 6s ease-in-out ${g.delay}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Indicateur niveau */}
        <div style={{
          position:'absolute', top:14, left:14,
          background:'rgba(212, 160, 23, 0.18)',
          border:'1px solid rgba(212, 160, 23, 0.4)',
          color:'#D4A017', borderRadius:10,
          padding:'5px 10px', fontSize:11, fontWeight:800, zIndex:5,
        }}>
          Niveau {score}
        </div>

        {/* Wrapper qui dézoome (limité) + suit le sommet quand la pile
            devient trop haute. translateY déplace la pile vers le bas
            pour que le sommet reste visible même avec 30+ tasses. */}
        <div style={{
          position:'absolute', inset:0,
          transform: `translateY(${cameraY}px) scale(${stackScale})`,
          transformOrigin: 'bottom center',
          transition: 'transform .35s ease-out',
          pointerEvents:'none',
        }}>
          {/* Halo doré sur tasse parfaitement centrée */}
          {showPerfectGlow && (
            <div style={{
              position:'absolute',
              bottom: movingBottom - 5,
              left:'50%',
              width:180, height:30, borderRadius:'50%',
              background:'radial-gradient(ellipse, rgba(212,160,23,0.5) 0%, transparent 70%)',
              pointerEvents:'none',
              animation:'cupGameGlowPulse .8s ease-in-out',
              zIndex:1,
            }}/>
          )}

          {/* Tasse en mouvement — skin + spécial propagés */}
          {movingCup && (
            <div style={{
              position:'absolute',
              bottom: movingBottom,
              left:`calc(50% + ${movingCup.x}px - ${movingCup.width / 2}px)`,
              transition:'none',
              zIndex:4,
              pointerEvents:'none',
              filter: movingCup.special === 'golden' ? 'drop-shadow(0 0 10px rgba(212,160,23,.7))'
                    : movingCup.special === 'large'  ? 'drop-shadow(0 0 8px rgba(136,184,232,.6))'
                    : 'none',
            }}>
              <SingleCup width={movingCup.width} showCoffeeInside={true} withSteam={true} skin={movingCup.skin} special={movingCup.special} />
            </div>
          )}

          {/* Pile de tasses + soucoupe */}
          <div style={{
            position:'absolute', bottom:STACK_BOTTOM,
            left:'50%', transform:'translateX(-50%)',
            display:'flex', flexDirection:'column-reverse', alignItems:'center',
            zIndex:2,
          }}>
            <Saucer />
            {stackedCups.map((cup, i) => (
              <div key={i} style={{
                /* +HANDLE_OFFSET_RATIO × width pour compenser l'anse à droite :
                   le centre du div SingleCup est décalé de 15 % vers la droite
                   par rapport au centre de la TASSE elle-même. */
                transform:`translateX(${cup.x + cup.width * HANDLE_OFFSET_RATIO}px)`,
                marginTop: STACK_OVERLAP === 0 ? 0 : -STACK_OVERLAP,
              }}>
                <SingleCup
                  width={cup.width}
                  showCoffeeInside={i === stackedCups.length - 1}
                  withSteam={false}
                  skin={cup.skin || 'classic'}
                  special={cup.special}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Particules grains au tap — jaillissent depuis le centre de
            la pile, biais vers le haut, rotation aléatoire. Pure déco. */}
        {tapParticles.length > 0 && (
          <div style={{
            position:'absolute',
            bottom: movingBottom * stackScale,
            left:'50%',
            pointerEvents:'none', zIndex:7,
            width:0, height:0,
          }}>
            {tapParticles.map(p => (
              <div
                key={p.id}
                style={{
                  position:'absolute', top:0, left:0,
                  width:8, height:6,
                  marginLeft:-4, marginTop:-3,
                  background:'#3D2010',
                  borderRadius:'50% / 60%',
                  border:'1px solid #5C3317',
                  '--ptx': `${p.tx}px`,
                  '--pty': `${p.ty}px`,
                  '--prot': `${p.rot}deg`,
                  animation:'pyramidBeanFly .7s ease-out forwards',
                }}
              />
            ))}
          </div>
        )}

        {/* Pop-up reward (montant variable selon mode + spéciales) */}
        {showRewardPopup !== 0 && (
          <div style={{
            position:'absolute',
            top:'50%', left:'50%',
            transform:'translate(-50%, -50%)',
            background: showRewardPopup > 0 ? GOLD : 'linear-gradient(135deg,#5C3317,#3D2010)',
            color:'#fff',
            padding:'6px 14px', borderRadius:100,
            fontWeight:800, fontSize:14, letterSpacing:.3,
            animation:'cupGameRewardFloat 1s ease-out',
            zIndex:6, pointerEvents:'none',
            boxShadow: showRewardPopup > 0 ? '0 4px 12px rgba(212,160,23,.35)' : '0 4px 12px rgba(74,44,23,.4)',
          }}>{showRewardPopup > 0 ? '+' : ''}{showRewardPopup} 🍪</div>
        )}

        {/* Pop-up effet spécial — feedback visuel grand sur évènement
            (golden bonus, fragile saved/broken, large applied). */}
        {showSpecialFx && (
          <div style={{
            position:'absolute',
            top:'42%', left:'50%',
            transform:'translate(-50%, -50%)',
            padding:'10px 18px', borderRadius:14,
            fontWeight:900, fontSize:15, letterSpacing:.4,
            animation:'cupGameRewardFloat .9s ease-out',
            zIndex:8, pointerEvents:'none',
            color:'#fff',
            background:
              showSpecialFx === 'golden-bonus'   ? 'linear-gradient(135deg,#FFD24D,#C99607)' :
              showSpecialFx === 'fragile-saved'  ? 'linear-gradient(135deg,#88B8E8,#3E72B0)' :
              showSpecialFx === 'fragile-broken' ? 'linear-gradient(135deg,#7D4818,#3D2010)' :
              showSpecialFx === 'large-applied'  ? 'linear-gradient(135deg,#88B8E8,#1F4880)' : GOLD,
            boxShadow:'0 6px 20px rgba(0,0,0,.4)',
          }}>
            {showSpecialFx === 'golden-bonus'   && '✨ Dorée +10 🍪'}
            {showSpecialFx === 'fragile-saved'  && '💎 Fragile +5 🍪'}
            {showSpecialFx === 'fragile-broken' && '💥 Tasse brisée !'}
            {showSpecialFx === 'large-applied'  && '➕ Reset pleine taille'}
          </div>
        )}

        {/* Tap zone */}
        <div style={{
          position:'absolute', bottom:12,
          left:'50%', transform:'translateX(-50%)',
          background:'rgba(212, 160, 23, 0.18)',
          border:'2px dashed #D4A017',
          borderRadius:14, padding:'10px 22px',
          color:'#D4A017', fontSize:12, fontWeight:800,
          textTransform:'uppercase', letterSpacing:2,
          animation:'cupGameTapPulse 1.4s ease-in-out infinite',
          pointerEvents:'none', zIndex:5,
          whiteSpace:'nowrap',
        }}>TAP pour poser</div>
      </div>

      {/* Tip */}
      <div style={{
        width:'100%', maxWidth:340,
        padding:'10px 14px', borderRadius:12,
        background:C.card, border:`1px solid ${C.border}`,
        fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center',
      }}>
        💡 Plus la pile monte, plus la tasse va vite. <strong style={{ color:'#D4A017' }}>Reste précis.</strong>
      </div>
    </div>
  );
}

function StatCard({ value, label, highlight = false }){
  return (
    <div style={{
      background:'rgba(245, 239, 230, 0.06)',
      border:`1.5px solid ${highlight ? '#D4A017' : 'rgba(212, 160, 23, 0.18)'}`,
      borderRadius:14, padding:'10px 12px', textAlign:'center',
      boxShadow: highlight ? '0 0 14px rgba(212,160,23,.4)' : 'none',
      transition:'all .25s',
    }}>
      <div style={{
        fontSize:22, fontWeight:900, color:'#D4A017', lineHeight:1,
      }}>{value}</div>
      <div style={{
        fontSize:10, color:'rgba(245, 239, 230, 0.65)',
        textTransform:'uppercase', letterSpacing:1.5,
        marginTop:6, fontWeight:700,
      }}>{label}</div>
    </div>
  );
}

function Saucer(){
  return (
    <div style={{ position:'relative', width:160, height:14, marginTop:0 }}>
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse at center, #5C3317 0%, #2C1810 100%)',
        borderRadius:'50%',
        border:'1px solid rgba(245, 239, 230, 0.15)',
        boxShadow:'inset 0 -2px 4px rgba(0,0,0,0.5)',
      }}/>
    </div>
  );
}

/* CoffeeBean — petit grain de café SVG décoratif. Forme ovoïde brun
   foncé avec rainure centrale, utilisé en arrière-plan flottant et
   en particule éphémère au tap. */
function CoffeeBean({ size = 16, style = {} }){
  return (
    <svg
      width={size} height={size * 1.3}
      viewBox="0 0 16 21"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      {/* Corps du grain */}
      <ellipse cx="8" cy="10.5" rx="6.5" ry="9.5" fill="#3D2010" stroke="#5C3317" strokeWidth=".8"/>
      {/* Rainure centrale */}
      <path d="M 8 2 Q 6 10.5 8 19" stroke="#1A0A04" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      {/* Highlight subtil */}
      <ellipse cx="6" cy="6" rx="1.5" ry="2.5" fill="rgba(255,200,140,.15)"/>
    </svg>
  );
}

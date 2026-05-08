import { useEffect, useRef, useState } from "react";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { playSound } from "../../lib/audio.js";

/* ════════════════════════════════════════════════════
   SlotGame — Machine à Sous Cookie (débloquée niveau 13)
   ────────────────────────────────────────────────────
   3 rouleaux indépendants, 5 symboles équiprobables :
     🍪 cookie · ☕ café · 🥐 croissant · 🍰 gâteau · 7️⃣ jackpot
   Coût : 30 🍪 par lancer

   Combos :
     · 3 × 7️⃣ → +750 🍪 (jackpot, 0.8 % de proba)
     · 3 × 🍰 → +250
     · 3 × 🥐 → +150
     · 3 × ☕ → +80
     · 3 × 🍪 → +50
     · 2 identiques → +25 (consolation)
     · tous différents → 0

   Animation : les 3 rouleaux défilent rapidement, puis chacun s'arrête
   en cascade (1.4s, 2.0s, 2.7s) — suspense progressif. Animation gérée
   via interval qui randomise les symboles non encore stoppés ; les
   `stoppedRef` lockent les rouleaux finalisés contre les rerenders.

   Palette café-only — fond ESPRESSO + accents or, pas de rouge ni vert.
═══════════════════════════════════════════════════════ */

const SYMBOLS = [
  { id:'cookie',    icon:'🍪', payout:50  },
  { id:'coffee',    icon:'☕', payout:80  },
  { id:'croissant', icon:'🥐', payout:150 },
  { id:'cake',      icon:'🍰', payout:250 },
  { id:'seven',     icon:'7️⃣', payout:750 },
];

const COST          = 30;
const PAIR_PAYOUT   = 25;
const REEL_TICK_MS  = 75;
const LOCK_DELAYS   = [1400, 2000, 2700];

function randomSymbolId(){
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].id;
}
function symIcon(id){
  return SYMBOLS.find(s => s.id === id)?.icon ?? '?';
}

export function SlotGame({ coins, onEarn, onSpend, onEventChallenge, C }){
  const [reels,    setReels]    = useState(['🍪', '☕', '🥐']);
  const [stopped,  setStopped]  = useState([true, true, true]);
  const [spinning, setSpinning] = useState(false);
  const [result,   setResult]   = useState(null);  // 'jackpot' | 'big' | 'small' | 'pair' | 'lose'
  const [payout,   setPayout]   = useState(0);

  /* Refs pour éviter les races avec le state pendant l'animation. */
  const stoppedRef  = useRef([true, true, true]);
  const finalsRef   = useRef([]);
  const intervalRef = useRef(null);
  const timeoutsRef = useRef([]);

  /* Cleanup au unmount */
  useEffect(() => () => {
    if(intervalRef.current) clearInterval(intervalRef.current);
    timeoutsRef.current.forEach(clearTimeout);
  }, []);

  const spin = () => {
    if(spinning || coins < COST) return;

    onSpend(COST);
    playSound('tap');
    setResult(null);
    setPayout(0);
    setSpinning(true);

    /* Pré-tirage des 3 résultats finaux */
    finalsRef.current = [randomSymbolId(), randomSymbolId(), randomSymbolId()];
    stoppedRef.current = [false, false, false];
    setStopped([false, false, false]);

    /* Boucle d'animation : randomise les rouleaux non-lockés. */
    intervalRef.current = setInterval(() => {
      setReels(prev => prev.map((id, i) =>
        stoppedRef.current[i] ? id : randomSymbolId()
      ));
    }, REEL_TICK_MS);

    /* Stop staggéré de chaque rouleau */
    LOCK_DELAYS.forEach((delay, i) => {
      const t = setTimeout(() => {
        stoppedRef.current[i] = true;
        setReels(prev => {
          const next = [...prev];
          next[i] = finalsRef.current[i];
          return next;
        });
        setStopped(s => {
          const next = [...s];
          next[i] = true;
          return next;
        });
        playSound('tap');
      }, delay);
      timeoutsRef.current.push(t);
    });

    /* Scoring final juste après le dernier lock */
    const tEnd = setTimeout(() => {
      if(intervalRef.current){ clearInterval(intervalRef.current); intervalRef.current = null; }

      const finals = finalsRef.current;
      const counts = {};
      finals.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
      const maxCount = Math.max(...Object.values(counts));

      let pay = 0;
      let resultType = 'lose';

      if(maxCount === 3){
        const id  = Object.keys(counts).find(k => counts[k] === 3);
        const sym = SYMBOLS.find(s => s.id === id);
        pay = sym.payout;
        if(sym.id === 'seven')        resultType = 'jackpot';
        else if(sym.payout >= 150)    resultType = 'big';
        else                          resultType = 'small';
      } else if(maxCount === 2){
        pay = PAIR_PAYOUT;
        resultType = 'pair';
      }

      setPayout(pay);
      setResult(resultType);
      setSpinning(false);
      if(pay > 0){
        onEarn(pay);
        playSound('success');
      } else {
        playSound('error');
      }
      /* Event 'slot_three' : succès si combo 3-same (n'importe quel symbole) */
      if(maxCount === 3) onEventChallenge?.('slot_three', 1);
    }, LOCK_DELAYS[2] + 100);
    timeoutsRef.current.push(tEnd);
  };

  const canSpin = !spinning && coins >= COST;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:18 }}>
      {/* Bandeau titre fun */}
      <div style={{
        fontSize:11, fontWeight:800, color:'#D4A017',
        letterSpacing:3, textTransform:'uppercase',
      }}>
        🎰 Tente ta chance
      </div>

      {/* Frame des 3 rouleaux */}
      <div
        className={result === 'jackpot' ? 'bi' : ''}
        style={{
          display:'flex', gap:10,
          padding:'18px 16px', borderRadius:22,
          background: ESPRESSO,
          border:'3px solid #D4A017',
          boxShadow:'0 12px 30px rgba(74,44,23,.5), inset 0 2px 0 rgba(255,255,255,.1)',
          position:'relative',
        }}
      >
        {/* Lampes décoratives haut-gauche / haut-droit */}
        <div style={{ position:'absolute', top:-4, left:-4, width:10, height:10, borderRadius:'50%', background:'#F0C050', boxShadow:'0 0 8px rgba(240,192,80,.7)' }} />
        <div style={{ position:'absolute', top:-4, right:-4, width:10, height:10, borderRadius:'50%', background:'#F0C050', boxShadow:'0 0 8px rgba(240,192,80,.7)' }} />

        {reels.map((id, i) => (
          <div
            key={i}
            style={{
              width:78, height:96,
              display:'flex', alignItems:'center', justifyContent:'center',
              borderRadius:12,
              background: stopped[i]
                ? 'linear-gradient(140deg,#FFE5A0,#F0C050)'
                : 'linear-gradient(140deg,#F0E6D3,#D4B898)',
              border: stopped[i] ? '2.5px solid #D4A017' : '2px solid #A88060',
              fontSize:46, lineHeight:1,
              transition: 'background .25s, border-color .25s',
              boxShadow: stopped[i] ? 'inset 0 2px 6px rgba(212,160,23,.3)' : 'inset 0 2px 6px rgba(74,44,23,.3)',
              filter: stopped[i] ? 'none' : 'blur(.4px)',
            }}
          >
            {symIcon(id)}
          </div>
        ))}
      </div>

      {/* Résultat */}
      {result && (
        <div
          className="bi"
          style={{
            padding:'12px 22px', borderRadius:18,
            fontSize: result === 'jackpot' ? 20 : 16,
            fontWeight:900,
            background: payout > 0
              ? 'linear-gradient(135deg,#FBEFD4,#F0C050)'
              : 'linear-gradient(135deg,#5D3A1F,#2D1810)',
            border: `2px solid ${payout > 0 ? '#D4A017' : '#3D2010'}`,
            color: payout > 0 ? '#5D3A1F' : '#F0E0C0',
            boxShadow: payout > 0
              ? '0 6px 20px rgba(212,160,23,.4)'
              : '0 6px 20px rgba(45,24,16,.4)',
            textAlign:'center', minWidth:200, letterSpacing:.3,
          }}
        >
          {result === 'jackpot' && <>🎰 JACKPOT ! +{payout} 🍪</>}
          {result === 'big'     && <>✨ Gros lot ! +{payout} 🍪</>}
          {result === 'small'   && <>🎉 Triple ! +{payout} 🍪</>}
          {result === 'pair'    && <>👍 Paire ! +{payout} 🍪</>}
          {result === 'lose'    && <>😴 Pas cette fois…</>}
        </div>
      )}

      {/* Bouton lancer */}
      <button
        onClick={spin}
        disabled={!canSpin}
        className={canSpin ? 'glow-anim' : ''}
        style={{
          padding:'14px 40px', borderRadius:22,
          fontSize:15, fontWeight:800, letterSpacing:.3,
          background: canSpin ? GOLD : C.card,
          color:      canSpin ? '#fff' : C.muted,
          border:`2px solid ${canSpin ? 'transparent' : C.border}`,
          cursor: canSpin ? 'pointer' : 'not-allowed',
        }}
      >
        {spinning
          ? 'En cours…'
          : coins < COST
            ? `Pas assez (${COST} 🍪)`
            : `Lancer (${COST} 🍪)`}
      </button>

      {/* Barème */}
      <div style={{
        background:C.card, border:`1px solid ${C.border}`,
        borderRadius:14, padding:'12px 16px',
        fontSize:11.5, color:C.muted, lineHeight:1.7,
        marginTop:6, width:'100%', maxWidth:300,
      }}>
        <div style={{
          fontWeight:800, color:C.text, marginBottom:8, textAlign:'center',
          fontSize:11, letterSpacing:1, textTransform:'uppercase',
        }}>
          Combinaisons
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>3 × 7️⃣ jackpot</span>
          <strong style={{ color:'#D4A017' }}>+750 🍪</strong>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>3 × 🍰</span>
          <strong style={{ color:'#D4A017' }}>+250 🍪</strong>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>3 × 🥐</span>
          <strong style={{ color:'#D4A017' }}>+150 🍪</strong>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>3 × ☕</span>
          <strong style={{ color:'#D4A017' }}>+80 🍪</strong>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>3 × 🍪</span>
          <strong style={{ color:'#D4A017' }}>+50 🍪</strong>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, paddingTop:4, borderTop:`1px dashed ${C.border}` }}>
          <span>2 identiques</span>
          <strong style={{ color:'#D4A017' }}>+25 🍪</strong>
        </div>
      </div>
    </div>
  );
}

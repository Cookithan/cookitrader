import { useEffect, useRef, useState, useCallback } from "react";
import { SEGMENTS } from "../../data/constants.js";
import { ROUE_PALETTES, ROUE_GLOWS, GOLD } from "../../data/themes.js";
import { SEG_A, SEG_C, wRandom } from "../../utils/spin.js";
import { playSound } from "../../lib/audio.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   SpinGame — roue canvas avec 11 segments pondérés
   - COST = 10 🍪 jusqu'au niveau 7, 20 🍪 à partir du niveau 8
     (la roue rapporte plus à haut niveau, le coût compense)
   - Animation : angle cumulatif (jamais reset), rotation de 5 tours + diff
                 vers la cible (centre du segment) avec ease-out quint sur 4.5s
   - Palette par activeRoue (ROUE_PALETTES). Glow optionnel (ROUE_GLOWS)
   - onJackpot() est appelé si le résultat = +200 (déclenche succès 'jackpot')
═══════════════════════════════════════════════════════ */

export function SpinGame({ coins, onEarn, onSpend, onJackpot, onEventChallenge, activeRoue, level = 1, spinsLeft = Infinity, spinsCap = Infinity, consumeSpin, spinRechargeCost = 1, cafes = 0, onRechargeSpin, C }) {
  const { t } = useTranslation();
  const canvasRef  = useRef(null);
  const angleRef   = useRef(0); // cumulative rotation in degrees
  const [spinning, setSpinning] = useState(false);
  const [result,   setResult]   = useState(null);
  /* superJackpot : stocke la valeur (+200 ou +500 easter egg) du jackpot
     pendant 2.5s — déclenche confettis dorés + flash plein écran. Null
     quand inactif. */
  const [superJackpot, setSuperJackpot] = useState(null);
  const COST = level >= 8 ? 20 : 10;

  /* 🥚 EASTER EGG : 0.3% par spin → segment caché "+500 🍪". L'aiguille
     atterrit visuellement sur le +200 (jackpot natif) mais le popup et
     le crédit cookies sont à +500. Surprise pour les chanceux. */
  const EASTER_EGG_500_CHANCE = 0.003;

  const palette = ROUE_PALETTES[activeRoue] || null;
  const glowColor = ROUE_GLOWS[activeRoue];

  /* draw wheel */
  const draw = useCallback((deg) => {
    const canvas = canvasRef.current; if(!canvas) return;
    /* HiDPI : ajuste la résolution interne au devicePixelRatio pour éviter
       le flou sur mobile (Retina iOS, écrans Android haute densité). On
       laisse le CSS gérer l'affichage (maxWidth:90vw inline) — le browser
       downscale depuis la résolution interne sans perte. */
    const dpr = window.devicePixelRatio || 1;
    const cssSize = 340;
    const intSize = Math.round(cssSize * dpr);
    if(canvas.width !== intSize){
      canvas.width  = intSize;
      canvas.height = intSize;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sz = cssSize, cx = sz/2, cy = sz/2, r = cx - 6;
    ctx.clearRect(0, 0, sz, sz);
    let startRad = (deg*Math.PI)/180;
    SEGMENTS.forEach((sg,i)=>{
      const sweep=(SEG_A[i]*Math.PI)/180;
      const segColor = (palette && palette[i]) || sg.color;
      ctx.beginPath(); ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,r,startRad,startRad+sweep);
      ctx.closePath();
      if(glowColor){ ctx.shadowColor = glowColor; ctx.shadowBlur = 10; }
      ctx.fillStyle=segColor; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(startRad+sweep/2);
      ctx.textAlign='right'; ctx.fillStyle='#fff';
      ctx.font=`bold ${SEG_A[i]>28?13:10}px system-ui`;
      ctx.shadowColor='rgba(0,0,0,.55)'; ctx.shadowBlur=3;
      ctx.fillText(sg.label,r-12,4); ctx.restore();
      startRad+=sweep;
    });
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.strokeStyle='rgba(212,160,23,.7)'; ctx.lineWidth=4; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,16,0,Math.PI*2);
    ctx.fillStyle='#3A2010'; ctx.fill();
    ctx.strokeStyle='#D4A017'; ctx.lineWidth=2.5; ctx.stroke();
    ctx.fillStyle='#D4A017'; ctx.font='bold 10px system-ui';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('☕',cx,cy);
  },[palette, glowColor]);

  useEffect(()=>{ draw(angleRef.current); },[draw]);

  const spin = () => {
    if(spinning || coins < COST) return;
    if(spinsLeft <= 0) return;       // cap quotidien atteint
    consumeSpin?.();                 // décrément quotidien (App.jsx)
    onSpend(COST); setSpinning(true); setResult(null);
    /* Son one-shot du wheel-spin-click (slowdown intégré dans le MP3,
       ~1-2s) — pas en loop pour éviter la répétition robotique. */
    playSound('wheel');
    /* Easter egg roll AVANT le tirage normal. Si trigger, on force
       idx vers le segment +200 (visuel jackpot) — la valeur réelle
       sera overridée à 500 plus bas. */
    const easterEgg500 = Math.random() < EASTER_EGG_500_CHANCE;
    let idx;
    if(easterEgg500){
      idx = SEGMENTS.findIndex(s => s.value === 200);
      if(idx === -1) idx = wRandom();
    } else {
      idx = wRandom();
    }
    const mid  = SEG_C[idx] + SEG_A[idx]/2;
    /* target angle so segment mid lands at top (270°) */
    const target = (270 - mid + 36000) % 360;
    const curMod = angleRef.current % 360;
    let diff = (target - curMod + 360) % 360;
    if(diff < 45) diff += 360; // guarantee visible spin
    const final = angleRef.current + 5*360 + diff;
    const from  = angleRef.current;
    const dur   = 4500;
    const t0    = performance.now();
    const animate = (now) => {
      const t = Math.min((now-t0)/dur, 1);
      const e = 1-Math.pow(1-t,5); // ease-out quint
      draw(from + (final-from)*e);
      if(t<1){ requestAnimationFrame(animate); }
      else {
        angleRef.current=final; setSpinning(false);
        const baseValue  = SEGMENTS[idx].value;
        const finalValue = easterEgg500 ? 500 : baseValue;
        setResult({ ...SEGMENTS[idx], value: finalValue });
        /* Son adapté : jackpot pour +200 (et easter egg +500), success
           pour gains, error pour pertes. */
        if(baseValue === 200) playSound('jackpot');
        else if(baseValue > 0) playSound('success');
        else playSound('error');
        onEarn(finalValue);
        if(baseValue === 200){
          if(onJackpot) onJackpot();
          setSuperJackpot(finalValue);  /* stocke 200 ou 500 */
          setTimeout(() => setSuperJackpot(null), 2500);
        }
        /* PHASE 6E — challenge spin_jackpot : tomber sur +200 */
        onEventChallenge?.('spin_jackpot', baseValue);
      }
    };
    requestAnimationFrame(animate);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20, position:'relative' }}>
      {/* SUPER JACKPOT — overlay plein écran qd value=500. Confettis denses
          + flash doré + texte géant. Disparait après 2.5s. */}
      {superJackpot && (
        <div style={{
          position:'fixed', inset:0, zIndex:9000,
          pointerEvents:'none',
          background:'radial-gradient(circle, rgba(255,215,0,.35) 0%, rgba(0,0,0,0) 70%)',
          animation:'inboxOverlayIn .3s ease-out both',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {/* 24 confettis dorés en explosion radiale */}
          {[...Array(24)].map((_, i) => {
            const ang = (i / 24) * Math.PI * 2;
            const dist = 180 + Math.random() * 140;
            const tx = Math.cos(ang) * dist + 'px';
            const ty = Math.sin(ang) * dist + 'px';
            const emoji = i % 3 === 0 ? '⭐' : i % 3 === 1 ? '✨' : '🍪';
            return (
              <span key={i} className="confetti-piece" style={{
                '--tx':tx, '--ty':ty,
                animationDelay:`${i*0.018}s`,
                animationDuration:'1.6s',
                fontSize: 26,
                filter:'drop-shadow(0 0 8px rgba(255,215,0,.8))',
              }}>{emoji}</span>
            );
          })}
          {/* Texte géant SUPER JACKPOT */}
          <div style={{
            position:'absolute', top:'42%', left:'50%',
            transform:'translate(-50%, -50%)',
            fontSize:'clamp(36px, 11vw, 56px)',
            fontWeight:900, letterSpacing:2,
            color:'transparent',
            background:'linear-gradient(180deg, #FFE89A 0%, #FFD700 40%, #C8960C 100%)',
            WebkitBackgroundClip:'text', backgroundClip:'text',
            textShadow:'0 0 40px rgba(255,215,0,.8)',
            animation:'popIn .6s cubic-bezier(.36,.07,.19,.97) both',
            whiteSpace:'nowrap',
          }}>
            🎉 +{superJackpot} 🍪 🎉
          </div>
          <div style={{
            position:'absolute', top:'58%', left:'50%',
            transform:'translate(-50%, -50%)',
            fontSize: superJackpot === 500 ? 16 : 14,
            fontWeight:800, letterSpacing: superJackpot === 500 ? 4 : 6,
            color:'#FFE89A',
            textShadow:'0 2px 8px rgba(0,0,0,.6)',
            animation:'popIn .8s cubic-bezier(.36,.07,.19,.97) both',
            whiteSpace:'nowrap',
          }}>
            {superJackpot === 500 ? t('game_spin.secret_jackpot') : t('game_spin.jackpot')}
          </div>
        </div>
      )}

      {/* Pointer + wheel */}
      <div style={{ position:'relative', borderRadius:'50%', lineHeight:0 }} className={!spinning && coins>=COST ? 'glow-anim' : ''}>
        <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', width:0, height:0, borderLeft:'11px solid transparent', borderRight:'11px solid transparent', borderTop:'18px solid #D4A017', zIndex:5, filter:'drop-shadow(0 2px 4px rgba(0,0,0,.3))' }} />
        <canvas ref={canvasRef} width={340} height={340} style={{ borderRadius:'50%', display:'block', filter:'drop-shadow(0 10px 24px rgba(74,44,23,.35))', maxWidth:'90vw', maxHeight:'90vw' }} />
      </div>

      {/* Confetti burst on big wins */}
      {result && result.value >= 50 && (
        <div style={{ position:'absolute', top:170, left:'50%', pointerEvents:'none', zIndex:20 }}>
          {[...Array(12)].map((_,i)=>{
            const ang = (i / 12) * Math.PI * 2;
            const dist = 80 + Math.random() * 50;
            const tx = Math.cos(ang) * dist + 'px';
            const ty = Math.sin(ang) * dist + 'px';
            return <span key={i} className="confetti-piece" style={{ '--tx':tx, '--ty':ty, animationDelay:`${i*0.02}s` }}>🍪</span>;
          })}
        </div>
      )}

      {result && (
        <div className="bi" style={{ padding:'12px 26px', borderRadius:18, fontSize:22, fontWeight:800, background:result.value>0?'linear-gradient(135deg,#FBEFD4,#F0C050)':'linear-gradient(135deg,#5D3A1F,#2D1810)', border:`2px solid ${result.value>0?'#D4A017':'#3D2010'}`, color:result.value>0?'#5D3A1F':'#F0E0C0', boxShadow:result.value>0?'0 6px 20px rgba(212,160,23,.4)':'0 6px 20px rgba(45,24,16,.4)', display:'flex', alignItems:'center', gap:8 }}>
          {result.value>0 ? <>🍪 +{result.value}</> : <>🍪 {result.value}</>}
        </div>
      )}

      {(() => {
        const noBalance = coins < COST;
        const noQuota   = spinsLeft <= 0;
        const blocked   = spinning || noBalance || noQuota;
        const label =
          spinning  ? t('games.ongoing') :
          noQuota   ? t('games.quota_full') :
          noBalance ? t('games.not_enough', { cost: COST }) :
                      t('game_spin.spin_btn', { cost: COST });
        return (
          <button
            onClick={spin}
            disabled={blocked}
            className={!blocked ? 'glow-anim' : ''}
            style={{
              padding:'14px 40px', borderRadius:22, fontSize:15, fontWeight:800,
              background: blocked ? C.card : GOLD,
              color: blocked ? C.muted : '#fff',
              border:`2px solid ${blocked ? C.border : 'transparent'}`,
              cursor: blocked ? 'not-allowed' : 'pointer',
              letterSpacing:.3,
            }}
          >
            {label}
          </button>
        );
      })()}

      {/* Compteur quotidien — caché si cap == Infinity (legacy / fallback) */}
      {Number.isFinite(spinsCap) && (
        <div style={{
          fontSize:11.5, color: spinsLeft <= 0 ? '#7D4E1F' : C.muted,
          fontWeight: spinsLeft <= 0 ? 800 : 600,
          textAlign:'center',
        }}>
          {spinsLeft > 0
            ? <>🎡 <strong style={{ color:'#D4A017' }}>{spinsLeft}</strong>/{spinsCap} {t('game_spin.spins_remaining_today')}</>
            : <>{t('game_spin.spins_exhausted')}</>}
        </div>
      )}

      {/* Bouton recharge in-game si quota épuisé — remplace les anciens
          passes premium spin_pass_50/20. Sinon caché. */}
      {Number.isFinite(spinsCap) && spinsLeft <= 0 && onRechargeSpin && (() => {
        const canRecharge = cafes >= spinRechargeCost;
        return (
          <button
            onClick={() => { if(canRecharge) onRechargeSpin(); }}
            disabled={!canRecharge}
            style={{
              padding:'12px 28px', borderRadius:18, fontSize:13.5, fontWeight:900, letterSpacing:.3,
              background: canRecharge ? 'linear-gradient(135deg,#FFD24D,#C99607)' : C.card,
              color: canRecharge ? '#3D2010' : C.muted,
              border:`1.5px solid ${canRecharge ? 'transparent' : C.border}`,
              boxShadow: canRecharge ? '0 6px 18px rgba(212,160,23,.4)' : 'none',
              cursor: canRecharge ? 'pointer' : 'not-allowed',
              touchAction:'manipulation', userSelect:'none',
            }}
          >
            {canRecharge
              ? t('games.recharge_btn', { cap: spinsCap, cost: spinRechargeCost })
              : t('games.not_enough_cafe', { cost: spinRechargeCost })}
          </button>
        );
      })()}

      {result && spinsLeft > 0 && <div style={{ fontSize:13, color:C.muted }}>{t('games.relaunch')}</div>}
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import { SEGMENTS } from "../../data/constants.js";
import { ROUE_PALETTES, ROUE_GLOWS, GOLD } from "../../data/themes.js";
import { SEG_A, SEG_C, wRandom } from "../../utils/spin.js";
import { playSound } from "../../lib/audio.js";

/* ════════════════════════════════════════════════════
   SpinGame — roue canvas avec 11 segments pondérés
   - COST = 20 cookies
   - Animation : angle cumulatif (jamais reset), rotation de 5 tours + diff
                 vers la cible (centre du segment) avec ease-out quint sur 4.5s
   - Palette par activeRoue (ROUE_PALETTES). Glow optionnel (ROUE_GLOWS)
   - onJackpot() est appelé si le résultat = +200 (déclenche succès 'jackpot')
═══════════════════════════════════════════════════════ */

export function SpinGame({ coins, onEarn, onSpend, onJackpot, onEventChallenge, activeRoue, C }) {
  const canvasRef  = useRef(null);
  const angleRef   = useRef(0); // cumulative rotation in degrees
  const [spinning, setSpinning] = useState(false);
  const [result,   setResult]   = useState(null);
  const COST = 20;

  const palette = ROUE_PALETTES[activeRoue] || null;
  const glowColor = ROUE_GLOWS[activeRoue];

  /* draw wheel */
  const draw = useCallback((deg) => {
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const sz=canvas.width, cx=sz/2, cy=sz/2, r=cx-6;
    ctx.clearRect(0,0,sz,sz);
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
    if(spinning||coins<COST) return;
    onSpend(COST); setSpinning(true); setResult(null);
    const idx = wRandom();
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
        angleRef.current=final; setSpinning(false); setResult(SEGMENTS[idx]);
        const value = SEGMENTS[idx].value;
        playSound(value > 0 ? 'success' : 'error');
        onEarn(value);
        if(value === 200 && onJackpot) onJackpot();
        /* PHASE 6E — challenge spin_jackpot : tomber sur +200 */
        onEventChallenge?.('spin_jackpot', value);
      }
    };
    requestAnimationFrame(animate);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20, position:'relative' }}>
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

      <button onClick={spin} disabled={spinning||coins<COST} className={!spinning && coins>=COST ? 'glow-anim' : ''} style={{ padding:'14px 40px', borderRadius:22, fontSize:15, fontWeight:800, background:spinning||coins<COST?C.card:GOLD, color:spinning||coins<COST?C.muted:'#fff', border:`2px solid ${spinning||coins<COST?C.border:'transparent'}`, cursor:spinning||coins<COST?'not-allowed':'pointer', letterSpacing:.3 }}>
        {spinning?'En cours...':coins<COST?`Pas assez (min. ${COST} 🍪)`:`Tourner (${COST} 🍪)`}
      </button>

      {result && <div style={{ fontSize:13, color:C.muted }}>Relancez pour tenter à nouveau !</div>}
    </div>
  );
}

import { useEffect, useState } from "react";

/* ════════════════════════════════════════════════════
   AppSplash — écran d'accueil custom au montage de l'app
   ────────────────────────────────────────────────────
   Affiché en plein écran pendant 800ms après le mount, avec un fade
   out de 350ms. Prend le relais visuel après le splash système Android
   (l'icône statique sur fond marron) pour une transition fluide vers
   l'UI principale.

   Gradient ESPRESSO + cookie qui pulse + "Cooki<Miner>" en italique
   doré (cohérent avec le header de l'app).

   Pas de prop : timing fixe.
═══════════════════════════════════════════════════════ */

export function AppSplash(){
  const [phase, setPhase] = useState('shown'); // 'shown' | 'fading' | 'done'

  useEffect(()=>{
    const t1 = setTimeout(()=>setPhase('fading'), 800);
    const t2 = setTimeout(()=>setPhase('done'),   1150);
    return ()=>{ clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if(phase === 'done') return null;

  return (
    <div
      aria-hidden
      style={{
        position:'fixed', inset:0, zIndex:9999,
        background:'linear-gradient(140deg,#3D2010 0%,#5A3520 50%,#7D4E1F 100%)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        opacity: phase === 'fading' ? 0 : 1,
        transition: 'opacity .35s ease-in',
        pointerEvents: phase === 'fading' ? 'none' : 'auto',
      }}
    >
      {/* Halo doré derrière le cookie */}
      <div style={{
        position:'absolute', inset:'25% 30%',
        background:'radial-gradient(circle, rgba(212,160,23,.35) 0%, transparent 65%)',
        pointerEvents:'none',
      }} />

      <div
        style={{
          fontSize:96, lineHeight:1,
          animation:'splashBob 1.4s ease-in-out infinite',
          filter:'drop-shadow(0 8px 18px rgba(0,0,0,.4))',
          position:'relative', zIndex:1,
        }}
      >
        🍪
      </div>

      <div
        style={{
          marginTop:20,
          fontSize:30, fontWeight:900, fontStyle:'italic',
          letterSpacing:'-.5px', color:'#F5DC8A',
          textShadow:'0 2px 8px rgba(0,0,0,.4)',
          position:'relative', zIndex:1,
          animation:'splashFadeIn .6s ease-out both',
        }}
      >
        Cooki<span style={{ color:'#D4A017' }}>Miner</span>
      </div>

      <div
        style={{
          marginTop:6, fontSize:11, fontWeight:700,
          color:'rgba(245,220,138,.65)',
          letterSpacing:3, textTransform:'uppercase',
          position:'relative', zIndex:1,
          animation:'splashFadeIn .8s ease-out .2s both',
        }}
      >
        🍪 ☕
      </div>
    </div>
  );
}

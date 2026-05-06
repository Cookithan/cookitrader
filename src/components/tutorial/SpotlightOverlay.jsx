import { useEffect, useState } from "react";

/* ════════════════════════════════════════════════════
   SpotlightOverlay — voile sombre + cercle découpé (TUTORIEL)
   ────────────────────────────────────────────────────
   SVG plein écran avec un mask : tout est sombre, sauf un cercle
   transparent autour de l'élément ciblé par son `id`.
   Anneau doré pulsant (keyframe spotlightPulse) pour attirer l'œil.

   - Recalcule la position au resize / scroll (l'élément peut bouger
     pendant l'animation d'ouverture)
   - pointerEvents:none → la cible reste cliquable à travers le voile

   Props :
   - target : id HTML de l'élément à mettre en lumière
═══════════════════════════════════════════════════════ */
export function SpotlightOverlay({ target }){
  const [bounds, setBounds] = useState(null);

  useEffect(()=>{
    const el = document.getElementById(target);
    if(!el) return;
    const update = () => setBounds(el.getBoundingClientRect());
    update();
    /* Re-mesure périodiquement pendant 1s (les animations CSS peuvent
       déplacer l'élément après le mount initial) */
    const id = setInterval(update, 100);
    setTimeout(()=>clearInterval(id), 1200);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return ()=>{
      clearInterval(id);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [target]);

  if(!bounds) return null;

  const padding = 12;
  const cx = bounds.left + bounds.width  / 2;
  const cy = bounds.top  + bounds.height / 2;
  const r  = Math.max(bounds.width, bounds.height) / 2 + padding;

  return (
    <svg
      style={{
        position:'fixed', inset:0, width:'100%', height:'100%',
        zIndex:200, pointerEvents:'none',
      }}
      aria-hidden
    >
      <defs>
        <mask id="spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          <circle cx={cx} cy={cy} r={r} fill="black" />
        </mask>
      </defs>
      <rect
        width="100%" height="100%"
        fill="rgba(15,8,4,0.78)"
        mask="url(#spotlight-mask)"
        style={{ transition:'all .3s ease' }}
      />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke="#D4A017" strokeWidth="3" opacity="0.7"
        style={{
          filter:'drop-shadow(0 0 8px rgba(212,160,23,0.6))',
          animation:'spotlightPulse 1.8s ease-in-out infinite',
        }}
      />
    </svg>
  );
}

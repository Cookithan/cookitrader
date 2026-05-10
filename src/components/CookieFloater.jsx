import { useMemo } from "react";

/* ════════════════════════════════════════════════════
   CookieFloater — décor du Thème Pâte de Cookie
   ────────────────────────────────────────────────────
   Spawne 14 emojis 🍪 répartis aléatoirement à l'écran qui font une
   anim "scale petit → gros + rotation 360°" en boucle (cookieSpin
   défini dans globalStyles.js).

   Positions / délais / durées calculés UNE FOIS au mount via useMemo
   pour éviter les re-randoms à chaque render parent (sinon les anims
   redémarreraient à chaque tick marché / level-up).

   pointer-events:none + z-index:0 → décoratif uniquement, ne bloque
   aucune interaction. À monter conditionnellement quand
   activeTheme === 'theme_cookies'.
═══════════════════════════════════════════════════════ */

const COOKIE_COUNT = 14;

export function CookieFloater(){
  const cookies = useMemo(() => {
    return Array.from({ length: COOKIE_COUNT }).map((_, i) => {
      /* Répartition pseudo-uniforme : grille 4×4 resserrée vers le centre
         (20-80% horizontal, 18-82% vertical) avec jitter modéré pour éviter
         les chevauchements évidents. Le keyframe cookieSpin centre les
         cookies sur leur position via translate(-50%,-50%) — donc 20% / 80%
         laissent ~20% de marge de chaque côté pour le scale max (1.2). */
      const col = i % 4;
      const row = Math.floor(i / 4);
      const baseLeft = 20 + col * 20;             // 20, 40, 60, 80 %
      const baseTop  = 18 + row * 22;             // 18, 40, 62, 84 %
      const jitterX = (Math.random() - 0.5) * 10;
      const jitterY = (Math.random() - 0.5) * 10;
      return {
        id: i,
        left: `${Math.max(15, Math.min(85, baseLeft + jitterX))}%`,
        top:  `${Math.max(15, Math.min(85, baseTop  + jitterY))}%`,
        delay: `${(Math.random() * 12).toFixed(2)}s`,        // décalage 0-12s
        duration: `${(14 + Math.random() * 8).toFixed(2)}s`, // 14-22s (rotation lente, hypnotique)
        size: `${40 + Math.round(Math.random() * 32)}px`,    // 40-72px (plus gros, restent dans la zone safe au scale 1.2)
      };
    });
  }, []);

  return (
    <div aria-hidden style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
      {cookies.map(c => (
        <span
          key={c.id}
          className="cookie-floater"
          style={{
            left: c.left,
            top:  c.top,
            fontSize: c.size,
            animationDelay: c.delay,
            animationDuration: c.duration,
          }}
        >
          🍪
        </span>
      ))}
    </div>
  );
}

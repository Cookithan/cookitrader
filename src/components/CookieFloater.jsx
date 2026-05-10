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
      /* Répartition pseudo-uniforme : grille 4×4 avec jitter pour
         éviter les chevauchements trop évidents. */
      const col = i % 4;
      const row = Math.floor(i / 4);
      const baseLeft = (col + 0.5) * 25;          // 12.5%, 37.5%, 62.5%, 87.5%
      const baseTop  = (row + 0.5) * 22 + 8;      // ~19, 41, 63, 85 %
      const jitterX = (Math.random() - 0.5) * 16;
      const jitterY = (Math.random() - 0.5) * 14;
      return {
        id: i,
        left: `${Math.max(2, Math.min(98, baseLeft + jitterX))}%`,
        top:  `${Math.max(4, Math.min(94, baseTop  + jitterY))}%`,
        delay: `${(Math.random() * 8).toFixed(2)}s`,        // décalage 0-8s
        duration: `${(7 + Math.random() * 5).toFixed(2)}s`, // 7-12s
        size: `${28 + Math.round(Math.random() * 28)}px`,   // 28-56px
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

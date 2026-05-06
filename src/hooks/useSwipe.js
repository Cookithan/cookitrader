import { useRef } from "react";

/* ════════════════════════════════════════════════════
   useSwipe — détection de swipe horizontal au pouce (mobile)
   ────────────────────────────────────────────────────
   Retourne un objet { onTouchStart, onTouchEnd } à spread sur le div
   qui doit capter les swipes.

   Heuristiques :
   - Distance min `threshold` (60px par défaut) pour confirmer un swipe
   - Ratio horizontal/vertical : on ignore les gestes plus verticaux
     que horizontaux (le scroll vertical garde la priorité)
   - Durée max `maxMs` (800ms) — un geste trop lent n'est pas un swipe
   - Si `enabled` est false (overlay/modal ouvert), on n'écoute rien

   Props :
   - onLeft       : callback swipe vers la gauche (deltaX négatif)
   - onRight      : callback swipe vers la droite (deltaX positif)
   - threshold    : distance min en px (default 60)
   - maxMs        : durée max du geste (default 800)
   - enabled      : (boolean) active/désactive l'écoute
═══════════════════════════════════════════════════════ */

export function useSwipe({ onLeft, onRight, threshold = 60, maxMs = 800, enabled = true } = {}){
  const startRef = useRef(null);

  const onTouchStart = (e) => {
    if(!enabled) return;
    const t = e.touches[0];
    if(!t) return;
    startRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  };

  const onTouchEnd = (e) => {
    if(!enabled || !startRef.current) return;
    const t = e.changedTouches[0];
    if(!t){ startRef.current = null; return; }
    const dx = t.clientX - startRef.current.x;
    const dy = t.clientY - startRef.current.y;
    const dt = Date.now() - startRef.current.time;
    startRef.current = null;
    if(dt > maxMs) return;
    if(Math.abs(dx) < threshold) return;
    if(Math.abs(dx) < Math.abs(dy) * 1.3) return; // gesture trop vertical
    if(dx > 0) onRight?.();
    else       onLeft?.();
  };

  return { onTouchStart, onTouchEnd };
}

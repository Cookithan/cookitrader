import { useRef } from "react";

/* ════════════════════════════════════════════════════
   useSwipe — swipe horizontal avec suivi du doigt en temps réel
   ────────────────────────────────────────────────────
   Retourne { ref, handlers } à appliquer sur le conteneur :
   - ref : à brancher comme ref du div, on l'utilise pour translater le
     contenu en CSS pendant le drag (sans re-render React → fluide).
   - handlers : { onTouchStart, onTouchMove, onTouchEnd } à spread sur
     le même div.

   Comportement :
   - Au touchstart : on mémorise la position et on attend.
   - Au touchmove : on détermine l'axe dominant (horizontal vs vertical)
     une fois pour toutes (lock). Si vertical → on laisse le scroll
     natif. Si horizontal → on translate le contenu via DOM direct.
   - Au touchend :
     · Geste vertical ou trop court → snap retour à 0 (animé .25s)
     · Geste horizontal valide (≥ threshold) → snap final hors écran
       (animé) puis appel onLeft/onRight + reset transform.

   Props :
   - onLeft  : callback si swipe vers la gauche (deltaX négatif)
   - onRight : callback si swipe vers la droite (deltaX positif)
   - threshold : distance min (default 60px)
   - enabled : (boolean) désactive complètement (overlay/modal)
═══════════════════════════════════════════════════════ */

export function useSwipe({ onLeft, onRight, threshold = 60, enabled = true } = {}){
  const ref      = useRef(null);
  const startRef = useRef(null);

  const setTx = (px, animated = false) => {
    const el = ref.current;
    if(!el) return;
    el.style.transition = animated ? 'transform .25s ease-out' : 'none';
    el.style.transform  = px === 0 ? '' : `translateX(${px}px)`;
  };

  const onTouchStart = (e) => {
    if(!enabled) return;
    const t = e.touches[0];
    if(!t) return;
    startRef.current = { x: t.clientX, y: t.clientY, lock: null };
  };

  const onTouchMove = (e) => {
    if(!startRef.current) return;
    const t = e.touches[0];
    if(!t) return;
    const dx = t.clientX - startRef.current.x;
    const dy = t.clientY - startRef.current.y;

    /* Lock l'axe une fois qu'on a bougé ≥ 12px : empêche le scroll
       vertical de devenir un faux swipe horizontal et inversement. */
    if(!startRef.current.lock){
      if(Math.abs(dx) > 12 || Math.abs(dy) > 12){
        startRef.current.lock = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      } else return;
    }
    if(startRef.current.lock !== 'h') return;

    setTx(dx);
  };

  const onTouchEnd = (e) => {
    const start = startRef.current;
    startRef.current = null;
    if(!start){ setTx(0, true); return; }

    const t = e.changedTouches[0];
    const dx = t ? (t.clientX - start.x) : 0;
    if(start.lock !== 'h'){ setTx(0); return; }

    if(Math.abs(dx) < threshold){
      setTx(0, true);
      return;
    }

    /* Geste validé : on reset immédiatement le transform et on déclenche
       le changement de tab. La nouvelle page rentre via son animation
       CSS (tab-slide-in-right/left), ce qui produit une seule transition
       continue plutôt qu'un "sort puis rentre" en 2 temps. */
    setTx(0);
    if(dx > 0) onRight?.();
    else       onLeft?.();
  };

  return { ref, handlers: { onTouchStart, onTouchMove, onTouchEnd } };
}

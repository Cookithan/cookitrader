import { useEffect, useRef, useState } from 'react';

/* ════════════════════════════════════════════════════
   SplashScreen — écran d'accueil custom au lancement (BRIEF_SPLASH)
   ────────────────────────────────────────────────────
   Plein écran zIndex 9999, gradient ESPRESSO sombre. "CookiMiner"
   s'écrit lettre par lettre, puis sous-titre + 3 dots.

   Mode normal (1re ouverture, navigation, PWA cold start) :
     - lettres : step 170ms · fade out 2.0s · démontage 2.5s
   Mode fast (refresh F5 — détecté via Performance API) :
     - lettres : step 80ms  · fade out 1.0s · démontage 1.3s
     - sous-titre + dots : delays divisés ~par 2 via .fast en CSS

   ⚠️ onFinish est isolé dans un ref pour que les timers ne se
   réarment pas si le parent re-render et passe une nouvelle
   référence (le tick market re-rend toutes les 1.5s, sinon le
   splash ne se ferme jamais). Le useEffect a [] en deps : armé
   une seule fois au mount.

   Tous les styles sont dans globalStyles.js (.splash-screen + variantes
   .fast + 4 keyframes).

   Props :
   - onFinish : appelé à fadeOut + 500ms pour démonter le composant
   - fast     : si true, durées et délais raccourcis (refresh)
═══════════════════════════════════════════════════════ */

export default function SplashScreen({ onFinish, fast = false }){
  const [fadingOut, setFadingOut] = useState(false);
  const onFinishRef = useRef(onFinish);
  useEffect(()=>{ onFinishRef.current = onFinish; }, [onFinish]);

  const fadeAt    = fast ? 1000 : 2000;
  const removeAt  = fast ? 1300 : 2500;
  const letterStep = fast ? 0.08 : 0.17;

  useEffect(()=>{
    const fadeTimer   = setTimeout(()=>setFadingOut(true),     fadeAt);
    const removeTimer = setTimeout(()=>onFinishRef.current?.(), removeAt);
    return ()=>{
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [fadeAt, removeAt]);

  const letters = 'CookiMiner'.split('');

  return (
    <div className={`splash-screen ${fast ? 'fast' : ''} ${fadingOut ? 'fade-out' : ''}`}>
      <div className="splash-blob splash-blob-1" />
      <div className="splash-blob splash-blob-2" />

      <div className="splash-title">
        {letters.map((letter, i) => (
          <span
            key={i}
            className="splash-letter"
            style={{
              animationDelay: `${0.05 + i * letterStep}s`,
              /* "Miner" (5 dernières lettres) en caramel plus foncé,
                 cohérent avec le header. Reste plus clair que le fond. */
              ...(i >= 5 ? { color: '#C17F3C' } : null),
            }}
          >
            {letter}
          </span>
        ))}
      </div>

      <div className="splash-subtitle">Café · Cookies · Mining</div>

      <div className="splash-dots">
        <div className="splash-dot" />
        <div className="splash-dot" />
        <div className="splash-dot" />
      </div>

      <div className="splash-credit">
        Réalisé par <strong>Ethan Cuomo</strong>
      </div>
    </div>
  );
}

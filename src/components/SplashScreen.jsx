import { useEffect, useRef, useState } from 'react';

/* ════════════════════════════════════════════════════
   SplashScreen — écran d'accueil custom au lancement (BRIEF_SPLASH)
   ────────────────────────────────────────────────────
   Plein écran zIndex 9999, gradient ESPRESSO sombre. "CookiMiner"
   s'écrit lettre par lettre (~1.7s), puis sous-titre + 3 dots qui
   pulsent. Fade out à 2.0s, démontage à 2.5s.

   Affiché une fois par session (sessionStorage 'splashShown') —
   une simple mise en arrière-plan ne le redéclenche pas.

   ⚠️ onFinish est isolé dans un ref pour que les timers ne se
   réarment pas si le parent re-render et passe une nouvelle
   référence (le tick market re-rend toutes les 1.5s, sinon le
   splash ne se ferme jamais). Le useEffect a [] en deps : armé
   une seule fois au mount.

   Tous les styles sont dans globalStyles.js (.splash-screen + descendants
   + 4 keyframes).

   Props :
   - onFinish : appelé à 2.5s pour démonter le composant côté App.jsx
═══════════════════════════════════════════════════════ */

export default function SplashScreen({ onFinish }){
  const [fadingOut, setFadingOut] = useState(false);
  const onFinishRef = useRef(onFinish);
  useEffect(()=>{ onFinishRef.current = onFinish; }, [onFinish]);

  useEffect(()=>{
    const fadeTimer   = setTimeout(()=>setFadingOut(true),     2000);
    const removeTimer = setTimeout(()=>onFinishRef.current?.(), 2500);
    return ()=>{
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  const letters = 'CookiMiner'.split('');

  return (
    <div className={`splash-screen ${fadingOut ? 'fade-out' : ''}`}>
      <div className="splash-blob splash-blob-1" />
      <div className="splash-blob splash-blob-2" />

      <div className="splash-title">
        {letters.map((letter, i) => (
          <span
            key={i}
            className="splash-letter"
            style={{
              animationDelay: `${0.05 + i * 0.17}s`,
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
    </div>
  );
}

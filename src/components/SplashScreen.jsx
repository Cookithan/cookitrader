import { useEffect, useRef, useState } from 'react';
import { APP_INFO } from '../lib/appInfo.js';

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

  /* ── LE SPLASH DE LA SENTINELLE ──
     Un compte sous surveillance ouvre l'app sur du bleu et un bouclier,
     pas sur le logo café.

     POURQUOI LE STATUT VIENT DU localStorage ET NON DU RÉSEAU
     Le splash s'affiche AVANT toute requête : attendre une réponse le
     ferait clignoter, ou pire, retarderait le lancement pour tout le
     monde. Le statut est donc relevé APRÈS coup (App.jsx, au moment de
     la synchronisation) et rangé ici — il sert au lancement SUIVANT.
     Conséquence assumée : le premier lancement après une sanction montre
     encore le splash normal. Un décalage d'une ouverture, contre un
     démarrage qui ne dépend jamais du réseau : le marché est bon. */
  let surveille = false;
  try { surveille = window.localStorage.getItem('cookiminer:sousSurveillance') === '1'; }
  catch { /* mode privé : on retombe sur le splash normal, jamais d'erreur */ }

  if (surveille) {
    return (
      <div className={`splash-screen splash-sentinelle ${fast ? 'fast' : ''} ${fadingOut ? 'fade-out' : ''}`}>
        <div className="splash-blob splash-blob-1" />
        <div className="splash-blob splash-blob-2" />

        <div className="splash-bouclier">🛡️</div>

        <div className="splash-title" style={{ fontSize: 26, letterSpacing: -.5 }}>
          <span className="splash-letter" style={{ animationDelay: '.05s' }}>La Sentinelle</span>
        </div>

        <div className="splash-subtitle" style={{ maxWidth: 260, lineHeight: 1.5 }}>
          Ce compte est sous surveillance.<br />Tes gains sont vérifiés à chaque partie.
        </div>

        <div className="splash-dots">
          <div className="splash-dot" />
          <div className="splash-dot" />
          <div className="splash-dot" />
        </div>

        <div className="splash-credit">
          Joue normalement, il n'y a rien à faire de plus.
          <span style={{ opacity: .55, marginLeft: 7 }}>v{APP_INFO.version}</span>
        </div>
      </div>
    );
  }

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
        Réalisé par <strong>Cookithan</strong>
        {/* La version vient d'APP_INFO : la recopier ici, c'est se
            garantir qu'elle sera fausse à la prochaine livraison. */}
        <span style={{ opacity: .6, marginLeft: 7 }}>v{APP_INFO.version}</span>
      </div>
    </div>
  );
}

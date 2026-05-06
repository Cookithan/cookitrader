import { useEffect, useState } from "react";

/* ════════════════════════════════════════════════════
   TutorialBubble — bulle d'aide (TUTORIEL)
   ────────────────────────────────────────────────────
   Bulle gradient ESPRESSO qui flotte au-dessus ou en-dessous de la
   zone éclairée par SpotlightOverlay. Affiche le compteur d'étape,
   le texte, et soit un bouton "Suivant", soit l'instruction "Clique
   pour continuer" (si actionRequired). Le bouton "Passer" n'est
   passé que pour la 1re étape (skip strict).

   Léger délai d'apparition (.4s) pour laisser le voile s'installer
   visuellement avant que la bulle pop.

   Props :
   - text, position ('top'|'bottom'), actionRequired
   - onNext, onSkip (null hors étape 1)
   - stepCount, totalSteps
═══════════════════════════════════════════════════════ */

export function TutorialBubble({ text, position, actionRequired, onNext, onSkip, stepCount, totalSteps }){
  const [shouldShow, setShouldShow] = useState(false);

  /* Reset à chaque changement de texte → l'animation pop se rejoue */
  useEffect(()=>{
    setShouldShow(false);
    const t = setTimeout(()=>setShouldShow(true), 400);
    return ()=>clearTimeout(t);
  }, [text]);

  if(!shouldShow) return null;

  return (
    <div
      className="bi"
      style={{
        position:'fixed',
        top:    position === 'bottom' ? '60%' : 'auto',
        bottom: position === 'bottom' ? 'auto' : 100,
        left:'50%', transform:'translateX(-50%)',
        background:'linear-gradient(140deg,#4A2C17,#7D4E1F)',
        color:'#fff',
        borderRadius:18, padding:'16px 20px',
        maxWidth:320, width:'calc(100% - 40px)',
        boxShadow:'0 12px 32px rgba(0,0,0,.4), 0 0 24px rgba(212,160,23,.3)',
        border:'2px solid rgba(212,160,23,.4)',
        zIndex:210,
      }}
    >
      <div style={{
        fontSize:10, color:'rgba(255,255,255,.6)',
        textTransform:'uppercase', letterSpacing:2, marginBottom:6,
      }}>
        Étape {stepCount} / {totalSteps}
      </div>

      <div style={{ fontSize:14, fontWeight:600, lineHeight:1.45, marginBottom:14 }}>
        {text}
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
        {onSkip ? (
          <button
            onClick={onSkip}
            style={{
              fontSize:12, color:'rgba(255,255,255,.5)',
              background:'transparent', border:'none', cursor:'pointer',
              textDecoration:'underline', padding:0,
            }}
          >
            Passer le tutoriel
          </button>
        ) : <div />}

        {!actionRequired ? (
          <button
            onClick={onNext}
            style={{
              padding:'8px 18px', borderRadius:14,
              fontSize:13, fontWeight:800,
              background:'linear-gradient(135deg,#D4A017,#C17F3C)',
              color:'#fff', border:'none', cursor:'pointer',
              boxShadow:'0 4px 12px rgba(212,160,23,.4)',
            }}
          >
            Suivant →
          </button>
        ) : (
          <div style={{ fontSize:11, color:'#D4A017', fontWeight:700, letterSpacing:.3 }}>
            👇 Clique pour continuer
          </div>
        )}
      </div>
    </div>
  );
}

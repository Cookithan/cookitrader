import { useEffect, useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import { GOLD, ESPRESSO } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   WelcomeTour — tour guidé pour nouveau joueur
   ────────────────────────────────────────────────────
   Visite séquentielle des grandes sections de l'app. À chaque étape,
   on appelle `onNavigate` (qui change le tab actif ou ouvre un overlay)
   puis on affiche une carte fixée en bas avec la description + Suivant.

   Étapes définies plus haut dans App.jsx (TOUR_STEPS) — ce composant
   se contente de rendre l'UI + déclencher la navigation à chaque step.

   Props :
   - steps      : [{ id, target, title, desc }]
   - stepIndex  : 0..steps.length-1
   - onNext     : passe à l'étape suivante
   - onSkip     : ferme le tour
   - onNavigate : (target:string) → setTab / open overlay
   - C          : palette
═══════════════════════════════════════════════════════ */

export function WelcomeTour({ steps, stepIndex, onNext, onSkip, onNavigate, C }){
  const step = steps[stepIndex];

  /* À chaque changement d'étape, on déclenche la navigation. */
  useEffect(() => {
    if(!step) return;
    onNavigate?.(step.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  if(!step) return null;

  const total   = steps.length;
  const isFirst = stepIndex === 0;
  const isLast  = stepIndex === total - 1;
  const pct     = ((stepIndex + 1) / total) * 100;

  return (
    <>
      {/* Voile semi-transparent en haut, bandeau d'info en bas plein-écran.
          Le voile est cliquable mais bloque l'interaction avec le tab visible. */}
      <div
        style={{
          position:'fixed', inset:0, zIndex:88,
          background:'rgba(15,8,4,.45)', backdropFilter:'blur(2px)',
          pointerEvents:'auto',
        }}
      />

      {/* Carte d'info ancrée en bas, au-dessus de la nav */}
      <div
        className="su"
        style={{
          position:'fixed', left:'50%', bottom:84,
          transform:'translateX(-50%)',
          width:'calc(100% - 28px)', maxWidth:380,
          background:C.card, borderRadius:22,
          border:`2px solid ${GOLD}`,
          boxShadow:'0 24px 60px rgba(0,0,0,.55), 0 0 28px rgba(212,160,23,.4)',
          zIndex:89, overflow:'hidden',
        }}
      >
        {/* Header avec progression + skip */}
        <div style={{
          background:ESPRESSO, color:'#F0C050',
          padding:'10px 14px',
          display:'flex', alignItems:'center', gap:10,
        }}>
          <div style={{
            fontSize:9, fontWeight:900, letterSpacing:2.5,
            textTransform:'uppercase', flex:1,
          }}>
            🎓 Tour guidé · {stepIndex + 1}/{total}
          </div>
          <button
            onClick={onSkip}
            aria-label="Passer le tour"
            style={{
              width:24, height:24, borderRadius:8,
              background:'rgba(255,255,255,.12)', color:'#F0C050',
              display:'flex', alignItems:'center', justifyContent:'center',
              border:'none', cursor:'pointer', padding:0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Barre de progression */}
        <div style={{ height:3, background:C.card2 }}>
          <div style={{
            height:'100%', width:`${pct}%`,
            background:GOLD, transition:'width .35s ease',
          }} />
        </div>

        {/* Contenu */}
        <div style={{ padding:'16px 18px 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <span style={{ fontSize:28 }}>{step.emoji || '✨'}</span>
            <div style={{ fontSize:16, fontWeight:900, color:C.text, lineHeight:1.2 }}>
              {step.title}
            </div>
          </div>
          <div style={{ fontSize:13, color:C.muted, lineHeight:1.55, marginBottom:14 }}>
            {step.desc}
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button
              onClick={onNext}
              className={isLast ? 'glow-anim' : ''}
              style={{
                flex:1, padding:'12px 0', borderRadius:12,
                background:GOLD, color:'#fff',
                fontSize:13.5, fontWeight:900, letterSpacing:.4,
                border:'none', cursor:'pointer',
                boxShadow:'0 6px 18px rgba(212,160,23,.4)',
                display:'flex', alignItems:'center', justifyContent:'center', gap:5,
              }}
            >
              {isLast ? "C'est parti ! 🚀" : (
                <>Suivant <ChevronLeft size={14} style={{ transform:'rotate(180deg)' }} /></>
              )}
            </button>
          </div>
          {!isFirst && (
            <button
              onClick={onSkip}
              style={{
                width:'100%', marginTop:8, padding:'8px 0',
                background:'transparent', border:'none',
                color:C.muted, fontSize:11, fontWeight:700,
                cursor:'pointer', textDecoration:'underline',
              }}
            >
              Passer le tour
            </button>
          )}
        </div>
      </div>
    </>
  );
}

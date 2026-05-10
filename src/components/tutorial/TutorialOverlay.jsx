import { useEffect } from "react";
import { SpotlightOverlay } from "./SpotlightOverlay.jsx";
import { TutorialBubble } from "./TutorialBubble.jsx";

/* ════════════════════════════════════════════════════
   TutorialOverlay — orchestrateur du tutoriel guidé
   ────────────────────────────────────────────────────
   5 étapes pré-définies (TUTORIAL_STEPS). Chaque étape pointe vers
   un id HTML, affiche un texte, et l'utilisateur clique "Suivant"
   pour avancer. Le bouton "Passer" n'est rendu qu'à l'étape 1.

   Une étape peut avoir { autoNext: ms } pour avancer automatiquement
   sans interaction (non utilisé actuellement).

   Props :
   - step       : 1..N (0 = tuto fermé, géré par App.jsx)
   - onNext     : passe à l'étape suivante (App.jsx incrémente)
   - onSkip     : ouvre la modale de confirmation (App.jsx)
═══════════════════════════════════════════════════════ */

/* Tuto SIMPLE — spotlight rond sur la cible + bulle centrée à l'écran.
   Textes courts (1 phrase). Couvre toutes les sections principales.
   `goToTab` (optionnel) navigue automatiquement vers le tab — l'user
   voit ainsi le contenu réel de la page pendant qu'il lit la bulle. */
export const TUTORIAL_STEPS = [
  { target:'card-niveau',    goToTab:'accueil',    text:'Ton niveau et ta progression. Joue pour monter ! 🚀',         actionRequired:false },
  { target:'cookie-counter', goToTab:'accueil',    text:'Les cookies 🍪 — ta monnaie principale.',                     actionRequired:false },
  { target:'card-checkin',   goToTab:'accueil',    text:'Ton bonus quotidien à récupérer chaque jour. ☕',             actionRequired:false },
  { target:'nav-jeux',       goToTab:'jeux',       text:"Les mini-jeux pour gagner des cookies. 🎮",                   actionRequired:false },
  { target:'nav-classement', goToTab:'classement', text:'Le classement face aux autres joueurs. 🏆',                   actionRequired:false },
  { target:'nav-marche',     goToTab:'marche',     text:'Le marché $CKM — achète/revends pour faire fructifier (niv 3+). 📈', actionRequired:false },
  { target:'nav-boutique',   goToTab:'boutique',   text:'La boutique pour débloquer thèmes, badges, items premium ☕.', actionRequired:false },
];

export function TutorialOverlay({ step, onNext, onSkip, onNavigate }){
  const config = TUTORIAL_STEPS[step - 1];

  /* Auto-avance pour les étapes flaguées avec autoNext */
  useEffect(()=>{
    if(!config?.autoNext) return;
    const t = setTimeout(()=>onNext(), config.autoNext);
    return ()=>clearTimeout(t);
  }, [step, config, onNext]);

  /* Navigation auto vers le tab demandé par l'étape */
  useEffect(()=>{
    if(config?.goToTab) onNavigate?.(config.goToTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if(step === 0 || !config) return null;

  return (
    <>
      <SpotlightOverlay target={config.target} />
      <TutorialBubble
        text={config.text}
        actionRequired={config.actionRequired}
        onNext={onNext}
        onSkip={step === 1 ? onSkip : null}
        stepCount={step}
        totalSteps={TUTORIAL_STEPS.length}
      />
    </>
  );
}

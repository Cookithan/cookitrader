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

export const TUTORIAL_STEPS = [
  { target:'card-niveau',    text:'Voici ton niveau de Barista. Joue pour monter !',         position:'bottom', actionRequired:false },
  { target:'cookie-counter', text:'Les cookies 🍪 sont ta monnaie principale.',               position:'bottom', actionRequired:false },
  { target:'card-checkin',   text:'Récupère ton bonus quotidien ici quand tu veux.',         position:'top',    actionRequired:false },
  { target:'nav-jeux',       text:"D'autres mini-jeux t'attendent ici !",                    position:'top',    actionRequired:false },
  { target:'nav-boutique',   text:'Et dépense tes cookies pour personnaliser ton profil.',   position:'top',    actionRequired:false },
];

export function TutorialOverlay({ step, onNext, onSkip }){
  const config = TUTORIAL_STEPS[step - 1];

  /* Auto-avance pour les étapes flaguées avec autoNext */
  useEffect(()=>{
    if(!config?.autoNext) return;
    const t = setTimeout(()=>onNext(), config.autoNext);
    return ()=>clearTimeout(t);
  }, [step, config, onNext]);

  if(step === 0 || !config) return null;

  return (
    <>
      <SpotlightOverlay target={config.target} />
      <TutorialBubble
        text={config.text}
        position={config.position}
        actionRequired={config.actionRequired}
        onNext={onNext}
        onSkip={step === 1 ? onSkip : null}
        stepCount={step}
        totalSteps={TUTORIAL_STEPS.length}
      />
    </>
  );
}

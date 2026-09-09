import { GOLD } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   RiderMount — la carrosserie de Cooki Rider
   ────────────────────────────────────────────────────
   Un gobelet de café monté sur deux roues en cookie. Ce fichier ne
   dessine QUE le gobelet et son essieu : les roues sont les vrais
   cookies (SkinnedCookie / PremiumCookie), posés par RiderGame, pour que
   les skins de la boutique restent ceux qu'on voit rouler.

   La version précédente ajoutait un cadre, un guidon et un bras tendu.
   Trop de traits : à 25 px à l'écran ça faisait une tache, pas un
   véhicule. Ici il ne reste que ce qui se lit à cette taille — une
   silhouette claire sur fond sombre, un couvercle en haut, un manchon
   doré au milieu.

   Et c'est toujours le gobelet qui dit si l'atterrissage est bon :
   couvercle large en haut, culot étroit en bas. À l'envers ça se voit
   sans y penser, sans jauge ni indicateur à l'écran.

   Repère : (0, 0) est le centre du châssis, l'essieu est à y = +9 et le
   sol à y = +20 — c'est le rayon que la physique utilise (R). Le
   composant ne tourne pas lui-même, il vit dans le calque que RiderGame
   fait pivoter.
═══════════════════════════════════════════════════════ */

const ESPRESSO  = '#2A1810';
const CREME     = '#FBF1E0';
const COUVERCLE = '#6B4423';

export function RiderMount(){
  return (
    <svg
      viewBox="-22 -38 44 62"
      style={{
        position:'absolute', left:'50%', top:'50%',
        width:44, height:62, marginLeft:-22, marginTop:-38,
        overflow:'visible', pointerEvents:'none',
      }}
    >
      {/* Essieu : la barre qui relie les deux roues. Sans elle, le
          gobelet a l'air posé sur deux biscuits par hasard. */}
      <rect x="-13" y="4" width="26" height="6" rx="3" fill={ESPRESSO} />

      {/* Le gobelet — culot étroit, épaules larges. La forme reste
          lisible même retournée, et c'est tout l'intérêt. */}
      <path
        d="M -6.5 4 L -9.5 -26 L 9.5 -26 L 6.5 4 Z"
        fill={CREME} stroke={ESPRESSO} strokeWidth="2.4" strokeLinejoin="round"
      />

      {/* Manchon doré : la seule couleur vive de l'attelage. Sur fond
          sombre c'est elle qu'on suit des yeux quand ça tourne. */}
      <path
        d="M -8.2 -12 L 8.2 -12 L 7.4 -19 L -7.4 -19 Z"
        fill={GOLD} stroke={ESPRESSO} strokeWidth="1.8" strokeLinejoin="round"
      />

      {/* Couvercle : large, sombre, débordant. C'est lui qu'on cherche
          des yeux pour savoir si la tasse est à l'endroit. */}
      <rect
        x="-11.5" y="-32" width="23" height="6.5" rx="2.6"
        fill={COUVERCLE} stroke={ESPRESSO} strokeWidth="2"
      />
    </svg>
  );
}

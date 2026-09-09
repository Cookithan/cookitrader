import { GOLD } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   RiderMount — l'attelage de Cooki Rider
   ────────────────────────────────────────────────────
   Ce qui roule, c'est le cookie (SkinnedCookie / PremiumCookie, donc les
   skins de la boutique marchent). Ce composant dessine ce qu'il y a
   AUTOUR : un cadre monoroue et un gobelet de café à son guidon.

   Pourquoi ce dessin et pas un emoji ☕ posé dessus, comme avant : un
   emoji ne fait pas un véhicule, il fait un cookie avec un chapeau. Il
   faut trois choses pour qu'on lise « pilote » au premier coup d'œil —
   un cadre qui relie visiblement le gobelet à l'axe de la roue, un bras
   tendu vers un guidon, et une silhouette dissymétrique (le gobelet est
   décalé en arrière) pour qu'on sache tout de suite dans quel sens on
   avance.

   Et surtout : c'est LE GOBELET qui dit si l'atterrissage est bon. Son
   couvercle sombre en haut, son culot étroit en bas — la même règle
   qu'une vraie tasse. À l'envers, ça se voit sans y penser, sans jauge
   ni indicateur à l'écran.

   Repère : (0, 0) est le CENTRE DE LA ROUE, rayon 20. Tout ce qui est
   au-dessus est en y négatif. Le composant ne tourne pas lui-même — il
   vit dans le calque que RiderGame fait pivoter.
═══════════════════════════════════════════════════════ */

const ESPRESSO = '#3A2113';
const CREME    = '#FBF1E0';
const COUVERCLE = '#5A3520';

export function RiderMount(){
  return (
    <svg
      viewBox="-30 -52 60 72"
      style={{
        position:'absolute', left:'50%', top:'50%',
        width:60, height:72, marginLeft:-30, marginTop:-52 + 20,
        overflow:'visible', pointerEvents:'none',
      }}
    >
      {/* Cadre — deux montants qui partent de l'axe de la roue. C'est
          cette liaison visible qui transforme « cookie + tasse » en
          « véhicule ». */}
      <path
        d="M 0 0 L -7 -19 M 0 0 L 11 -13"
        stroke={ESPRESSO} strokeWidth="3.4" strokeLinecap="round" fill="none"
      />
      {/* Selle */}
      <path
        d="M -12 -20 L 4 -17"
        stroke={ESPRESSO} strokeWidth="4.6" strokeLinecap="round" fill="none"
      />
      {/* Colonne + guidon, penchés vers l'avant */}
      <path
        d="M 11 -13 L 16 -26"
        stroke={ESPRESSO} strokeWidth="3" strokeLinecap="round" fill="none"
      />
      <path
        d="M 11 -28 L 20 -25"
        stroke={ESPRESSO} strokeWidth="3.4" strokeLinecap="round" fill="none"
      />

      {/* Le gobelet — le pilote, et l'indicateur d'assiette.
          Culot étroit, épaules larges : la forme reste lisible même
          retournée, et c'est tout l'intérêt. */}
      <path
        d="M -13 -24 L -16 -45 L -1 -45 L -4 -24 Z"
        fill={CREME} stroke={ESPRESSO} strokeWidth="2.2" strokeLinejoin="round"
      />
      {/* Manchon doré : la seule touche de couleur, elle attrape l'œil
          sur la silhouette qui tourne. */}
      <path
        d="M -14.4 -33 L -2.6 -33 L -3.4 -38 L -15.2 -38 Z"
        fill={GOLD} stroke={ESPRESSO} strokeWidth="1.6" strokeLinejoin="round"
      />
      {/* Couvercle — le haut, sombre et débordant. C'est lui qu'on
          cherche des yeux pour savoir si la tasse est à l'endroit. */}
      <rect
        x="-18" y="-50" width="19" height="6" rx="2.4"
        fill={COUVERCLE} stroke={ESPRESSO} strokeWidth="2"
      />

      {/* Bras tendu du gobelet vers le guidon : sans lui, la tasse est
          posée là par hasard ; avec lui, elle conduit. */}
      <path
        d="M -4 -37 L 13 -28"
        stroke={ESPRESSO} strokeWidth="3" strokeLinecap="round" fill="none"
      />
    </svg>
  );
}

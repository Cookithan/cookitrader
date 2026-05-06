import { SEGMENTS } from "../data/constants.js";

/* ════════════════════════════════════════════════════
   GÉOMÉTRIE & TIRAGE PONDÉRÉ DE LA ROUE
   - TW    : poids total des segments
   - SEG_A : angle (en degrés) de chaque segment
   - SEG_C : angle cumulé de début de chaque segment
   - wRandom() : tire un index au prorata du weight
════════════════════════════════════════════════════ */

export const TW    = SEGMENTS.reduce((s,sg)=>s+sg.weight,0);
export const SEG_A = SEGMENTS.map(sg=>(sg.weight/TW)*360);
export const SEG_C = (()=>{ let c=0; return SEG_A.map(a=>{ const v=c; c+=a; return v; }); })();

export function wRandom(){
  let r=Math.random()*TW;
  for(let i=0;i<SEGMENTS.length;i++){ r-=SEGMENTS[i].weight; if(r<=0) return i; }
  return SEGMENTS.length-1;
}

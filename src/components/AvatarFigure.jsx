import { getAvatar } from "../data/avatars.js";
import { AvatarArtwork } from "./avatars/AvatarArtwork.jsx";

/* ════════════════════════════════════════════════════
   AvatarFigure — pastille ronde unifiée (PHASE 4)
   Accepte en `value` :
    - un nombre 0..11 (ONBOARDING_AVATARS, 12 avatars de base)
    - un id string ('avatar_chef', 'avatar_robot', …) pour les premium
   getAvatar() résout vers { id, art, name, bg, glow?, full? }.
   - Le rendu est : un fond gradient `bg` + le SVG illustré (AvatarArtwork)
   - glow         → halo doré (.glow-anim)
   - ringColor    → bordure colorée optionnelle (utilisé pour le podium)
═══════════════════════════════════════════════════════ */
export function AvatarFigure({ value, size=40, ringColor=null, glow=false }){
  const a = getAvatar(value);
  return (
    <div
      className={(a.glow || glow) ? 'glow-anim' : ''}
      style={{
        width:size, height:size, borderRadius:'50%',
        background:a.bg,
        border: ringColor ? `${Math.max(2, Math.round(size/22))}px solid ${ringColor}` : 'none',
        flexShrink:0, boxShadow: a.full ? 'none' : '0 2px 8px rgba(0,0,0,.18)',
        overflow:'hidden', position:'relative'
      }}
    >
      <AvatarArtwork art={a.art} />
    </div>
  );
}

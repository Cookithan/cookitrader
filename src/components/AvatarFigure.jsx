import { getAvatar } from "../data/avatars.js";
import { AvatarArtwork } from "./avatars/AvatarArtwork.jsx";

/* ════════════════════════════════════════════════════
   AvatarFigure — pastille ronde unifiée
   Accepte en `value` :
    - un nombre 0..11 (ONBOARDING_AVATARS, 12 avatars de base)
    - un id string ('avatar_chef', 'avatar_robot', …) pour les premium
   getAvatar() résout vers { id, art, name, bg, glow?, full? }.
   - Le rendu est : un fond gradient `bg` + le SVG illustré (AvatarArtwork)
   - glow         → halo doré (.glow-anim) + bordure dorée massive (#D4A017,
                    épaisseur ~size/12) pour signaler les avatars légendaires
                    (Or Massif / Légende / Éternel)
   - ringColor    → bordure colorée optionnelle (utilisé pour le podium)
                    prend le pas sur la bordure dorée glow si fourni
═══════════════════════════════════════════════════════ */
export function AvatarFigure({ value, size=40, ringColor=null, glow=false }){
  const a = getAvatar(value);
  const isGlow = a.glow || glow;
  /* Bordure dorée massive pour les 3 avatars premium top.
     Épaisseur scalée à la taille (min 2 px) pour rester visible
     même sur les vignettes 24 px du leaderboard. */
  const glowBorder = isGlow
    ? `${Math.max(2, Math.round(size/12))}px solid #D4A017`
    : null;
  return (
    <div
      className={isGlow ? 'glow-anim' : ''}
      style={{
        width:size, height:size, borderRadius:'50%',
        background:a.bg,
        border: ringColor
          ? `${Math.max(2, Math.round(size/22))}px solid ${ringColor}`
          : (glowBorder || 'none'),
        flexShrink:0,
        boxShadow: a.full
          ? 'none'
          : isGlow
            ? '0 0 14px rgba(212,160,23,.55), 0 2px 8px rgba(0,0,0,.18)'
            : '0 2px 8px rgba(0,0,0,.18)',
        overflow:'hidden', position:'relative'
      }}
    >
      <AvatarArtwork art={a.art} />
    </div>
  );
}

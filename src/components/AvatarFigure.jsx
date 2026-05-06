import { User } from "lucide-react";
import { getAvatar } from "../data/avatars.js";

/* ════════════════════════════════════════════════════
   AvatarFigure — pastille ronde unifiée
   Accepte en `value` :
    - un nombre 0..3 (ONBOARDING_AVATARS)
    - un id string ('avatar_cookie', 'avatar_legend', 'avatar_aurore'…)
   getAvatar() résout vers { kind, bg, stroke / emoji, glow, full }.
   - kind 'base'  → icône User Lucide colorée
   - kind 'emoji' → emoji centré (taille = 0.55 ou 1.18 si full)
   - glow         → halo doré (.glow-anim)
   - ringColor    → bordure colorée optionnelle (utilisé pour le podium classement)
════════════════════════════════════════════════════ */

export function AvatarFigure({ value, size=40, ringColor=null, glow=false }){
  const a = getAvatar(value);
  const iconSize = Math.round(size * 0.5);
  const emojiSize = Math.round(size * (a.full ? 1.18 : 0.55));
  return (
    <div
      className={(a.glow || glow) ? 'glow-anim' : ''}
      style={{
        width:size, height:size, borderRadius:'50%',
        background:a.bg,
        border: ringColor ? `${Math.max(2, Math.round(size/22))}px solid ${ringColor}` : 'none',
        display:'flex', alignItems:'center', justifyContent:'center',
        flexShrink:0, boxShadow: a.full ? 'none' : '0 2px 8px rgba(0,0,0,.18)',
        overflow:'hidden'
      }}
    >
      {a.kind==='emoji'
        ? <span style={{
            fontSize:emojiSize,
            lineHeight: a.full ? 0.85 : 1,
            transform: a.full ? 'translateY(2%)' : 'none',
            filter: a.full ? 'drop-shadow(0 2px 6px rgba(0,0,0,.3))' : 'none'
          }}>{a.emoji}</span>
        : <User size={iconSize} color={a.stroke} strokeWidth={2.2} />}
    </div>
  );
}

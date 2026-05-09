/* ════════════════════════════════════════════════════
   SkinnedCookie — SVG paramétrable par un objet skin
   - Reçoit un skin (issu de COOKIE_SKINS dans data/themes.js) avec
     body[], chip[], ring, cracks, shine, icing, glow, pulse
   - Les arrays body[]/chip[] alimentent les <stop> des linearGradient SVG
   - icing : ajoute le glaçage haut + sparkles (skin Cookie Glacé)

   ⚠ IDs SVG préfixés par useId() : un sélecteur de skins (ProfileOverlay)
   peut rendre plusieurs SkinnedCookie en même temps. Sans préfixe, tous
   les `<radialGradient id="cookieBody">` collisionnent dans le DOM et
   tous les cookies prennent le rendu du PREMIER (collision SVG defs).
═══════════════════════════════════════════════════════ */
import { useId } from "react";

export function SkinnedCookie({ skin }){
  const uid = useId().replace(/:/g, '');
  const bodyId = `cookieBody-${uid}`;
  const chipId = `chipShine-${uid}`;
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'100%', display:'block', filter:'drop-shadow(0 10px 18px rgba(74,44,23,.4))' }}>
      <defs>
        <radialGradient id={bodyId} cx="40%" cy="35%" r="75%">
          {skin.body.map((s,i)=>(<stop key={i} offset={s.o} stopColor={s.c} />))}
        </radialGradient>
        <radialGradient id={chipId} cx="35%" cy="30%" r="70%">
          {skin.chip.map((s,i)=>(<stop key={i} offset={s.o} stopColor={s.c} />))}
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="188" rx="72" ry="9" fill="rgba(0,0,0,.18)" />
      <circle cx="100" cy="100" r="90" fill={`url(#${bodyId})`} />
      <circle cx="100" cy="100" r="90" fill="none" stroke={skin.ring} strokeWidth="2.5" opacity=".55" />
      <path d="M58 55 Q78 44 100 60 Q122 76 117 98" stroke={skin.cracks} strokeWidth="2" fill="none" opacity=".55" />
      <path d="M142 58 Q132 78 122 88" stroke={skin.cracks} strokeWidth="2" fill="none" opacity=".5" />
      <path d="M68 132 Q88 144 112 132" stroke={skin.cracks} strokeWidth="2" fill="none" opacity=".5" />
      <g>
        <ellipse cx="73" cy="76" rx="10" ry="8" fill={`url(#${chipId})`} transform="rotate(-20 73 76)" />
        <ellipse cx="70" cy="73" rx="3" ry="2" fill="rgba(255,255,255,.35)" transform="rotate(-20 70 73)" />
      </g>
      <g>
        <ellipse cx="120" cy="66" rx="9" ry="7" fill={`url(#${chipId})`} transform="rotate(15 120 66)" />
        <ellipse cx="117" cy="63" rx="2.5" ry="1.8" fill="rgba(255,255,255,.3)" transform="rotate(15 117 63)" />
      </g>
      <ellipse cx="60" cy="115" rx="8.5" ry="7" fill={`url(#${chipId})`} transform="rotate(-10 60 115)" />
      <g>
        <ellipse cx="136" cy="108" rx="10" ry="8" fill={`url(#${chipId})`} transform="rotate(25 136 108)" />
        <ellipse cx="133" cy="105" rx="3" ry="2" fill="rgba(255,255,255,.3)" transform="rotate(25 133 105)" />
      </g>
      <ellipse cx="94" cy="142" rx="9" ry="7.5" fill={`url(#${chipId})`} transform="rotate(-5 94 142)" />
      <ellipse cx="148" cy="146" rx="8" ry="6.5" fill={`url(#${chipId})`} transform="rotate(10 148 146)" />
      <ellipse cx="50" cy="150" rx="8.5" ry="7" fill={`url(#${chipId})`} transform="rotate(-15 50 150)" />
      <g>
        <ellipse cx="100" cy="96" rx="8" ry="6.5" fill={`url(#${chipId})`} transform="rotate(5 100 96)" />
        <ellipse cx="98" cy="93" rx="2.5" ry="1.8" fill="rgba(255,255,255,.3)" transform="rotate(5 98 93)" />
      </g>
      <circle cx="155" cy="155" r="2.5" fill={skin.ring} opacity=".7" />
      <circle cx="42" cy="92" r="2" fill={skin.ring} opacity=".7" />
      <circle cx="115" cy="155" r="1.8" fill={skin.ring} opacity=".6" />
      <circle cx="85" cy="58" r="2" fill={skin.ring} opacity=".7" />
      {skin.icing && (
        <>
          {/* Glaçage couvrant la MOITIÉ HAUTE du cookie, bord inférieur ondulé (drips qui pendent) */}
          <path
            d="M 12,100 A 90,90 0 0 1 188,100 L 182,100 Q 178,116 172,116 Q 166,104 160,104 Q 154,120 148,120 Q 142,104 136,104 Q 130,124 122,124 Q 116,104 110,104 Q 104,126 96,126 Q 88,104 82,104 Q 76,122 70,122 Q 64,104 58,104 Q 52,118 46,118 Q 40,104 34,104 Q 28,114 22,114 Q 18,104 14,104 Z"
            fill="#FAFAFA" stroke="#E5E5E5" strokeWidth="1"
          />
          {/* Reflets brillants en haut */}
          <ellipse cx="76" cy="58" rx="36" ry="13" fill="rgba(255,255,255,0.85)" transform="rotate(-30 76 58)" />
          <ellipse cx="64" cy="48" rx="18" ry="6" fill="rgba(255,255,255,1)" transform="rotate(-30 64 48)" />
          {/* Sparkles givrés sur la moitié haute */}
          <circle cx="135" cy="50" r="1.6" fill="rgba(255,255,255,0.95)" />
          <circle cx="155" cy="80" r="1.3" fill="rgba(255,255,255,0.9)" />
          <circle cx="50"  cy="80" r="1.4" fill="rgba(255,255,255,0.95)" />
          <circle cx="105" cy="35" r="1.4" fill="rgba(255,255,255,0.95)" />
          <circle cx="125" cy="92" r="1.3" fill="rgba(255,255,255,0.9)" />
          <circle cx="80"  cy="92" r="1.2" fill="rgba(255,255,255,0.85)" />
        </>
      )}
      <ellipse cx="68" cy="62" rx="22" ry="11" fill={skin.shine} transform="rotate(-32 68 62)" />
      <ellipse cx="58" cy="55" rx="9" ry="4" fill="rgba(255,255,255,.55)" transform="rotate(-32 58 55)" />
    </svg>
  );
}

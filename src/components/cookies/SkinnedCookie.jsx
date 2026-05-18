/* ════════════════════════════════════════════════════
   SkinnedCookie — SVG paramétrable par un objet skin
   ────────────────────────────────────────────────────
   Reçoit un skin (issu de COOKIE_SKINS dans data/themes.js) avec :
     · body[]      — stops du gradient principal du cookie
     · chip[]      — stops du gradient des pépites
     · ring        — couleur du contour
     · cracks      — couleur des fissures
     · shine       — couleur du reflet spéculaire (rgba)
     · icing       — bool : ajoute un glaçage couvrant la moitié haute
     · glow        — bool legacy (préférer glowColor pour skins premium)
     · glowColor   — couleur RGBA du halo lumineux autour du cookie
                     (rendu via filter drop-shadow CSS, ajout net)
     · pattern     — overlay SVG signature : 'sparkles' | 'flames' | 'stars'
                     (mythique = sparkles dorés, phoenix = pétales de
                      flamme, originel = étoiles 4 branches cosmos)
     · eyes        — bool : 2 yeux qui clignent (ouverts 1s / fermés 1s)
                     — skin "Cookie Mangeur" (rappelle le boss gâteau)

   ⚠ IDs SVG préfixés par useId() : le sélecteur de skins (ProfileOverlay)
   peut rendre plusieurs SkinnedCookie en même temps. Sans préfixe,
   tous les `<radialGradient id="cookieBody">` collisionnent dans le
   DOM et tous les cookies prennent le rendu du PREMIER (collision SVG defs).
═══════════════════════════════════════════════════════ */
import { useId } from "react";

export function SkinnedCookie({ skin, noShadow = false }){
  const uid = useId().replace(/:/g, '');
  const bodyId = `cookieBody-${uid}`;
  const chipId = `chipShine-${uid}`;

  /* Halo lumineux : empilage de drop-shadows. Le 1er garde l'ombre
     portée café (relief sur fond), le 2e ajoute le glow coloré
     (signature des skins premium). Si noShadow, on garde seulement
     le glow coloré (utile en Flappy où l'ombre encombre). */
  const halo = noShadow
    ? (skin.glowColor ? `drop-shadow(0 0 12px ${skin.glowColor})` : 'none')
    : (skin.glowColor
        ? `drop-shadow(0 10px 18px rgba(74,44,23,.4)) drop-shadow(0 0 12px ${skin.glowColor})`
        : 'drop-shadow(0 10px 18px rgba(74,44,23,.4))');

  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'100%', display:'block', filter: halo }}>
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

      {/* ── PATTERN OVERLAYS — signatures visuelles distinctives ── */}

      {/* Sparkles (mythique) — points scintillants dorés répartis */}
      {skin.pattern === 'sparkles' && (
        <g>
          <circle cx="56" cy="44" r="2.2" fill="#FFF8DC">
            <animate attributeName="opacity" values=".4;1;.4" dur="2s"   repeatCount="indefinite" />
            <animate attributeName="r"       values="1.4;2.6;1.4" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="144" cy="56" r="1.8" fill="#FFE8A0">
            <animate attributeName="opacity" values=".4;.95;.4" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="r"       values="1;2;1"     dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="166" cy="118" r="2" fill="#FFD24D">
            <animate attributeName="opacity" values=".5;1;.5" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="38" cy="124" r="1.6" fill="#FFE8A0">
            <animate attributeName="opacity" values=".3;.95;.3" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="100" cy="166" r="1.5" fill="#FFD24D">
            <animate attributeName="opacity" values=".4;1;.4" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="78" cy="32" r="1.3" fill="#FFF8DC">
            <animate attributeName="opacity" values=".3;.9;.3" dur="1.4s" repeatCount="indefinite" />
          </circle>
        </g>
      )}

      {/* Flames (phoenix) — pétales orangés autour du haut + côtés du cookie */}
      {skin.pattern === 'flames' && (
        <g>
          {/* Flamme principale au sommet */}
          <path d="M 100,8 Q 92,22 95,38 Q 100,30 100,42 Q 105,32 105,42 Q 108,22 100,8 Z"
                fill="#FF8830" opacity=".82">
            <animate attributeName="opacity" values=".55;.95;.55" dur="1.2s" repeatCount="indefinite" />
          </path>
          <path d="M 100,12 Q 96,24 99,36 Q 101,30 101,40 Q 103,30 104,38 Q 106,24 100,12 Z"
                fill="#FFE060" opacity=".75">
            <animate attributeName="opacity" values=".4;.85;.4" dur="1s" repeatCount="indefinite" />
          </path>
          {/* Flammes secondaires gauche/droite haut */}
          <path d="M 70,18 Q 65,30 72,40 Q 75,32 76,40 Q 80,28 70,18 Z" fill="#FFA040" opacity=".75">
            <animate attributeName="opacity" values=".4;.85;.4" dur="1.5s" repeatCount="indefinite" />
          </path>
          <path d="M 130,18 Q 135,30 128,40 Q 125,32 124,40 Q 120,28 130,18 Z" fill="#FFA040" opacity=".75">
            <animate attributeName="opacity" values=".4;.85;.4" dur="1.7s" repeatCount="indefinite" />
          </path>
          {/* Petites flammes basses sur les côtés */}
          <path d="M 16,90 Q 8,100 16,110 Q 20,100 22,108 Q 24,98 16,90 Z" fill="#FF7820" opacity=".7">
            <animate attributeName="opacity" values=".35;.8;.35" dur="1.3s" repeatCount="indefinite" />
          </path>
          <path d="M 184,90 Q 192,100 184,110 Q 180,100 178,108 Q 176,98 184,90 Z" fill="#FF7820" opacity=".7">
            <animate attributeName="opacity" values=".35;.8;.35" dur="1.6s" repeatCount="indefinite" />
          </path>
        </g>
      )}

      {/* Stars (originel) — étoiles 4 branches cosmos + poussière stellaire */}
      {skin.pattern === 'stars' && (
        <g>
          <g transform="translate(50 46)">
            <path d="M 0,-7 L 1.6,-1.6 L 7,0 L 1.6,1.6 L 0,7 L -1.6,1.6 L -7,0 L -1.6,-1.6 Z" fill="#FFE5A0">
              <animate attributeName="opacity" values=".5;1;.5" dur="2.2s" repeatCount="indefinite" />
            </path>
          </g>
          <g transform="translate(154 64)">
            <path d="M 0,-5.5 L 1.3,-1.3 L 5.5,0 L 1.3,1.3 L 0,5.5 L -1.3,1.3 L -5.5,0 L -1.3,-1.3 Z" fill="#D4A017">
              <animate attributeName="opacity" values=".5;1;.5" dur="1.8s" repeatCount="indefinite" />
            </path>
          </g>
          <g transform="translate(170 130)">
            <path d="M 0,-4 L 1,-1 L 4,0 L 1,1 L 0,4 L -1,1 L -4,0 L -1,-1 Z" fill="#B8A0FF">
              <animate attributeName="opacity" values=".5;1;.5" dur="2.4s" repeatCount="indefinite" />
            </path>
          </g>
          <g transform="translate(36 132)">
            <path d="M 0,-5 L 1.2,-1.2 L 5,0 L 1.2,1.2 L 0,5 L -1.2,1.2 L -5,0 L -1.2,-1.2 Z" fill="#FFE5A0">
              <animate attributeName="opacity" values=".4;1;.4" dur="2s" repeatCount="indefinite" />
            </path>
          </g>
          {/* Poussière cosmique (petits points) */}
          <circle cx="98" cy="32" r="1.3" fill="#FFE5A0" opacity=".75" />
          <circle cx="118" cy="166" r="1" fill="#B8A0FF" opacity=".7" />
          <circle cx="76" cy="172" r="1.2" fill="#FFE5A0" opacity=".75" />
          <circle cx="186" cy="100" r=".9" fill="#D4A017" opacity=".7" />
        </g>
      )}

      {/* Yeux clignotants (skin "Cookie Mangeur") — ouverts ~2.5s,
          fermés ~2.5s (clignement lent), légèrement transparents
          pour se fondre dans le cookie. Rappelle le boss gâteau. */}
      {skin.eyes && (
        <g opacity="0.82">
          {/* Yeux OUVERTS — mêmes yeux kawaii que le boss gâteau
              (gros blancs + iris décalée + 2 reflets) */}
          <g>
            <circle cx="72" cy="90" r="16" fill="#F5EFE6" />
            <circle cx="128" cy="90" r="16" fill="#F5EFE6" />
            <circle cx="74" cy="95" r="10" fill="#2C1810" />
            <circle cx="126" cy="95" r="10" fill="#2C1810" />
            <circle cx="77" cy="91" r="3.5" fill="#fff" />
            <circle cx="70" cy="98" r="1.8" fill="#fff" />
            <circle cx="129" cy="91" r="3.5" fill="#fff" />
            <circle cx="122" cy="98" r="1.8" fill="#fff" />
            <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="5s" repeatCount="indefinite" />
          </g>
          {/* Yeux FERMÉS (clignement) — arcs comme le boss KO */}
          <g>
            <path d="M 58 90 Q 72 102 86 90" stroke="#2C1810" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M 114 90 Q 128 102 142 90" stroke="#2C1810" strokeWidth="5" fill="none" strokeLinecap="round" />
            <animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.5;0.5;1" dur="5s" repeatCount="indefinite" />
          </g>
        </g>
      )}
    </svg>
  );
}

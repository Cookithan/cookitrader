/* ════════════════════════════════════════════════════
   SingleCup — tasse à café SVG (Pile de Tasses)
   ────────────────────────────────────────────────────
   Une tasse blanche-crème (#F5EFE6) avec son anse en C à droite,
   contour foncé moka (#5C3317) + trait clair par-dessus pour le relief.

   Variantes visuelles (mai 2026, diversification) :
   - skin='classic'  (default) : crème ivoire — la tasse historique
   - skin='caramel'  : body teinté caramel chaud
   - skin='espresso' : body verre fumé presque noir + reflets froids

   Tasses spéciales (gameplay) :
   - special='golden'   : body or éclatant + halo + ring scintillant
   - special='fragile'  : body verre translucide + fissure visible
   - special='large'    : body bleu cristal + symbole expansion

   Le SVG garde un ratio fixe : largeur tasse 100, anse extra 30 = total 130.
   Hauteur 42. La prop `width` redimensionne proportionnellement.

   Props :
   - width             : largeur en pixels (hauteur auto)
   - showCoffeeInside  : true → café visible en haut
   - withSteam         : true → vapeur au-dessus
   - skin              : 'classic'|'caramel'|'espresso' (esthétique pure)
   - special           : null|'golden'|'fragile'|'large' (override visuel)
═══════════════════════════════════════════════════════ */
import { useId } from "react";

const SKIN_STOPS = {
  classic:  { top:'#FFFAF0', mid:'#F5EFE6', bot:'#E8DFD0', stroke:'#5C3317', highlight:'rgba(255,255,255,.6)' },
  caramel:  { top:'#F8DAB0', mid:'#E8B57A', bot:'#C18748', stroke:'#5C3317', highlight:'rgba(255,255,255,.5)' },
  espresso: { top:'#3D2818', mid:'#1F0E04', bot:'#0A0402', stroke:'#000000', highlight:'rgba(212,160,23,.45)' },
};

const SPECIAL_STOPS = {
  golden:  { top:'#FFF0B0', mid:'#FFD24D', bot:'#C99607', stroke:'#7D5A0E', highlight:'rgba(255,240,200,.7)' },
  fragile: { top:'#F0F8FF', mid:'#D8E8F0', bot:'#A8C0D0', stroke:'#7D8898', highlight:'rgba(255,255,255,.7)' },
  large:   { top:'#D0E8FA', mid:'#88B8E8', bot:'#3E72B0', stroke:'#1F4880', highlight:'rgba(255,255,255,.65)' },
};

export function SingleCup({ width = 100, showCoffeeInside = true, withSteam = false, skin = 'classic', special = null }) {
  const uid = useId().replace(/:/g, '');
  const bodyId  = `sc-body-${uid}`;
  const foamId  = `sc-foam-${uid}`;
  /* Spéciale override skin. Sinon on prend le skin demandé. */
  const palette = (special && SPECIAL_STOPS[special]) || SKIN_STOPS[skin] || SKIN_STOPS.classic;

  const scale       = width / 100;
  const totalWidth  = 130 * scale;
  const cupHeight   = 42  * scale;
  const totalHeight = cupHeight + (withSteam ? 50 * scale : 0);
  const yOffset     = withSteam ? 50 * scale : 0;
  /* La mousse animée n'est visible que si la tasse est assez grande
     pour qu'on distingue les bulles (sinon c'est juste du bruit visuel). */
  const showFoam    = showCoffeeInside && width >= 60;

  return (
    <div style={{ position:'relative', width:totalWidth, height:totalHeight, lineHeight:0 }}>
      {/* Vapeur (optionnelle) — 4 traits décalés pour plus de réalisme */}
      {withSteam && (
        <div style={{
          position:'absolute', top:0, left: 28 * scale,
          width: 44 * scale, height: 44 * scale,
          pointerEvents:'none',
        }}>
          <div style={{
            position:'absolute', bottom:0, left: 4 * scale,
            width: 4 * scale, height: 32 * scale,
            background:'linear-gradient(to top, rgba(245, 239, 230, 0.55), transparent)',
            borderRadius:'50%', filter:'blur(2px)',
            animation:'cupGameSteamRise 2.4s ease-out infinite',
          }}/>
          <div style={{
            position:'absolute', bottom:0, left: 14 * scale,
            width: 4 * scale, height: 28 * scale,
            background:'linear-gradient(to top, rgba(245, 239, 230, 0.55), transparent)',
            borderRadius:'50%', filter:'blur(2px)',
            animation:'cupGameSteamRise 2.4s ease-out 0.6s infinite',
          }}/>
          <div style={{
            position:'absolute', bottom:0, left: 24 * scale,
            width: 4 * scale, height: 30 * scale,
            background:'linear-gradient(to top, rgba(245, 239, 230, 0.55), transparent)',
            borderRadius:'50%', filter:'blur(2px)',
            animation:'cupGameSteamRise 2.4s ease-out 1.2s infinite',
          }}/>
          <div style={{
            position:'absolute', bottom:0, left: 34 * scale,
            width: 3 * scale, height: 24 * scale,
            background:'linear-gradient(to top, rgba(245, 239, 230, 0.45), transparent)',
            borderRadius:'50%', filter:'blur(2px)',
            animation:'cupGameSteamRise 2.4s ease-out 1.8s infinite',
          }}/>
        </div>
      )}

      {/* SVG tasse */}
      <svg
        width={totalWidth}
        height={cupHeight}
        viewBox="0 0 130 42"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position:'absolute', top:yOffset, left:0 }}
      >
        <defs>
          {/* Gradient body — palette injectée selon skin/special. */}
          <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={palette.top}/>
            <stop offset="50%"  stopColor={palette.mid}/>
            <stop offset="100%" stopColor={palette.bot}/>
          </linearGradient>
          {/* Gradient mousse café : crème mousseux qui flotte en surface */}
          <radialGradient id={foamId} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FFF8E8"/>
            <stop offset="60%"  stopColor="#E8D0A0"/>
            <stop offset="100%" stopColor="#A57021"/>
          </radialGradient>
        </defs>

        {/* Corps de la tasse — body gradient + contour palette */}
        <rect x="0" y="0" width="100" height="42" rx="4"
              fill={`url(#${bodyId})`} stroke={palette.stroke} strokeWidth="1.5"
              opacity={special === 'fragile' ? 0.7 : 1}/>

        {/* Ombre interne en bas pour la profondeur */}
        <rect x="2" y="34" width="96" height="6" rx="2"
              fill={palette.stroke} opacity="0.12"/>

        {/* Anse : forme C à droite. Contour palette épaisseur 8, puis trait
            highlight par-dessus épaisseur 5 → effet relief. */}
        <path d="M 100 10 Q 121 10 121 21 Q 121 32 100 32"
              fill="none" stroke={palette.stroke} strokeWidth="8" strokeLinecap="round"/>
        <path d="M 100 10 Q 116 10 116 21 Q 116 32 100 32"
              fill="none" stroke={palette.mid} strokeWidth="5" strokeLinecap="round"/>
        {/* Petit reflet sur le côté gauche de l'anse */}
        <path d="M 102 14 Q 113 14 113 21"
              fill="none" stroke={palette.highlight} strokeWidth="1.5" strokeLinecap="round"/>

        {/* Marqueurs spéciaux par-dessus (overlay) */}
        {special === 'golden' && (
          <>
            {/* Sparkles dorés */}
            <circle cx="20" cy="14" r="1.5" fill="#FFE066">
              <animate attributeName="opacity" values="0;1;0" dur="1.4s" repeatCount="indefinite"/>
            </circle>
            <circle cx="78" cy="24" r="1.2" fill="#FFE066">
              <animate attributeName="opacity" values="1;0;1" dur="1.4s" repeatCount="indefinite"/>
            </circle>
            <circle cx="48" cy="32" r="1.4" fill="#FFE066">
              <animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite"/>
            </circle>
          </>
        )}
        {special === 'fragile' && (
          <>
            {/* Fissure diagonale subtile */}
            <path d="M 25 8 L 32 18 L 28 26 L 38 36"
                  stroke="rgba(70,60,80,.55)" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
            <path d="M 60 12 L 66 22 L 62 30"
                  stroke="rgba(70,60,80,.45)" strokeWidth="0.7" fill="none" strokeLinecap="round"/>
          </>
        )}
        {special === 'large' && (
          <>
            {/* Double-flèche horizontale (symbole expansion) */}
            <path d="M 20 21 L 14 21 M 14 21 L 18 17 M 14 21 L 18 25"
                  stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
            <path d="M 80 21 L 86 21 M 86 21 L 82 17 M 86 21 L 82 25"
                  stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
          </>
        )}

        {/* Café à l'intérieur (vue du dessus, en haut de la tasse) */}
        {showCoffeeInside && (
          <>
            <ellipse cx="50" cy="0" rx="50" ry="5"   fill="#3D2010"/>
            <ellipse cx="50" cy="0" rx="46" ry="3.5" fill="#A57021"/>
            {/* Mousse animée : 3 bulles crème éphémères qui apparaissent
                et disparaissent à des intervalles différents — donne vie
                au café sans devenir distrayant. */}
            {showFoam && (
              <>
                <circle cx="34" cy="0" r="1.5" fill={`url(#${foamId})`} opacity="0.85">
                  <animate attributeName="r"       values="0.5;1.8;0.5" dur="2.8s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values=".4;.95;.4"   dur="2.8s" repeatCount="indefinite"/>
                </circle>
                <circle cx="50" cy="0" r="1.2" fill={`url(#${foamId})`} opacity="0.85">
                  <animate attributeName="r"       values="0.5;1.6;0.5" dur="2.2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values=".4;.9;.4"    dur="2.2s" repeatCount="indefinite"/>
                </circle>
                <circle cx="66" cy="0" r="1.4" fill={`url(#${foamId})`} opacity="0.85">
                  <animate attributeName="r"       values="0.5;1.7;0.5" dur="3.2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values=".4;.95;.4"   dur="3.2s" repeatCount="indefinite"/>
                </circle>
              </>
            )}
            {/* Highlight doré subtil au centre du café */}
            <ellipse cx="50" cy="0" rx="38" ry="2.5" fill="#D4A017" opacity="0.35"/>
          </>
        )}

        {/* Reflets verticaux brillants à gauche — relief et brillance */}
        <rect x="8"  y="8"  width="3"   height="30" rx="1.5" fill="white" opacity="0.6"/>
        <rect x="14" y="10" width="1.5" height="22" rx="0.5" fill="white" opacity="0.35"/>
        {/* Highlight horizontal en haut pour suggérer la lumière */}
        <rect x="3" y="2" width="94" height="1.5" rx="0.5" fill="white" opacity="0.45"/>
      </svg>
    </div>
  );
}

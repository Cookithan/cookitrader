/* ════════════════════════════════════════════════════
   SingleCup — tasse à café SVG (Pile de Tasses)
   ────────────────────────────────────────────────────
   Une tasse blanche-crème (#F5EFE6) avec son anse en C à droite,
   contour foncé moka (#5C3317) + trait clair par-dessus pour le relief.

   Refonte design (mai 2026) :
   - Body avec gradient subtil (crème en haut → légèrement ivoire en bas)
     + ombre interne pour donner de la profondeur
   - Mousse café animée (3 bulles éphémères) si showCoffeeInside ET
     largeur >= 60 (sinon trop petit pour bien voir)
   - Highlights/reflets renforcés sur le bord gauche et le bord supérieur
   - Vapeur 4 traits au lieu de 3, animation décalée pour le réalisme

   Le SVG a un ratio fixe : largeur tasse 100, anse extra 30 = total 130.
   Hauteur 42. La prop `width` redimensionne proportionnellement.

   Props :
   - width             : largeur en pixels (la hauteur s'adapte automatiquement)
   - showCoffeeInside  : true pour afficher le café à l'intérieur
                         (tasse en mouvement / sommet de pile)
   - withSteam         : true pour afficher la vapeur au-dessus
                         (tasse en mouvement)
═══════════════════════════════════════════════════════ */
import { useId } from "react";

export function SingleCup({ width = 100, showCoffeeInside = true, withSteam = false }) {
  const uid = useId().replace(/:/g, '');
  const bodyId  = `sc-body-${uid}`;
  const foamId  = `sc-foam-${uid}`;

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
          {/* Gradient body : crème en haut → ivoire chaud en bas pour
              donner du volume sans changer la couleur dominante. */}
          <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#FFFAF0"/>
            <stop offset="50%"  stopColor="#F5EFE6"/>
            <stop offset="100%" stopColor="#E8DFD0"/>
          </linearGradient>
          {/* Gradient mousse café : crème mousseux qui flotte en surface */}
          <radialGradient id={foamId} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FFF8E8"/>
            <stop offset="60%"  stopColor="#E8D0A0"/>
            <stop offset="100%" stopColor="#A57021"/>
          </radialGradient>
        </defs>

        {/* Corps de la tasse — gradient body + contour moka */}
        <rect x="0" y="0" width="100" height="42" rx="4"
              fill={`url(#${bodyId})`} stroke="#5C3317" strokeWidth="1.5"/>

        {/* Ombre interne en bas pour la profondeur */}
        <rect x="2" y="34" width="96" height="6" rx="2"
              fill="#5C3317" opacity="0.12"/>

        {/* Anse : forme C à droite. Contour moka épaisseur 8, puis trait
            crème par-dessus épaisseur 5 → effet relief. Forme courbée
            harmonieuse avec une légère asymétrie haut/bas. */}
        <path d="M 100 10 Q 121 10 121 21 Q 121 32 100 32"
              fill="none" stroke="#5C3317" strokeWidth="8" strokeLinecap="round"/>
        <path d="M 100 10 Q 116 10 116 21 Q 116 32 100 32"
              fill="none" stroke="#F5EFE6" strokeWidth="5" strokeLinecap="round"/>
        {/* Petit reflet sur le côté gauche de l'anse */}
        <path d="M 102 14 Q 113 14 113 21"
              fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>

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

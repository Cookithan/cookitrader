/* ════════════════════════════════════════════════════
   SingleCup — tasse à café SVG (BRIEF Pile de Tasses)
   ────────────────────────────────────────────────────
   Une tasse blanche (#F5EFE6) avec son anse en C à droite, contour
   foncé moka (#5C3317) + trait blanc par dessus pour le relief.

   Le SVG a un ratio fixe : largeur tasse 100, anse extra 30 = total 130.
   Hauteur 42. La prop `width` redimensionne proportionnellement.

   Props :
   - width             : largeur en pixels (la hauteur s'adapte automatiquement)
   - showCoffeeInside  : true pour afficher le café à l'intérieur
                         (tasse en mouvement / sommet de pile)
   - withSteam         : true pour afficher la vapeur au-dessus
                         (tasse en mouvement)
═══════════════════════════════════════════════════════ */

export function SingleCup({ width = 100, showCoffeeInside = true, withSteam = false }) {
  const scale       = width / 100;
  const totalWidth  = 130 * scale;
  const cupHeight   = 42  * scale;
  const totalHeight = cupHeight + (withSteam ? 50 * scale : 0);
  const yOffset     = withSteam ? 50 * scale : 0;

  return (
    <div style={{ position:'relative', width:totalWidth, height:totalHeight, lineHeight:0 }}>
      {/* Vapeur (optionnelle) */}
      {withSteam && (
        <div style={{
          position:'absolute', top:0, left: 30 * scale,
          width: 40 * scale, height: 40 * scale,
          pointerEvents:'none',
        }}>
          <div style={{
            position:'absolute', bottom:0, left: 8 * scale,
            width: 4 * scale, height: 32 * scale,
            background:'linear-gradient(to top, rgba(245, 239, 230, 0.5), transparent)',
            borderRadius:'50%', filter:'blur(2px)',
            animation:'cupGameSteamRise 2.4s ease-out infinite',
          }}/>
          <div style={{
            position:'absolute', bottom:0, left: 18 * scale,
            width: 4 * scale, height: 26 * scale,
            background:'linear-gradient(to top, rgba(245, 239, 230, 0.5), transparent)',
            borderRadius:'50%', filter:'blur(2px)',
            animation:'cupGameSteamRise 2.4s ease-out 0.6s infinite',
          }}/>
          <div style={{
            position:'absolute', bottom:0, left: 28 * scale,
            width: 4 * scale, height: 30 * scale,
            background:'linear-gradient(to top, rgba(245, 239, 230, 0.5), transparent)',
            borderRadius:'50%', filter:'blur(2px)',
            animation:'cupGameSteamRise 2.4s ease-out 1.2s infinite',
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
        {/* Corps de la tasse blanche avec contour foncé */}
        <rect x="0" y="0" width="100" height="42" rx="3"
              fill="#F5EFE6" stroke="#5C3317" strokeWidth="1.5"/>

        {/* Anse : forme C à droite. Contour foncé épaisseur 8, puis trait
            blanc par dessus épaisseur 5 → effet relief. */}
        <path d="M 100 10 Q 121 10 121 21 Q 121 32 100 32"
              fill="none" stroke="#5C3317" strokeWidth="8" strokeLinecap="round"/>
        <path d="M 100 10 Q 116 10 116 21 Q 116 32 100 32"
              fill="none" stroke="#F5EFE6" strokeWidth="5" strokeLinecap="round"/>

        {/* Café à l'intérieur (vue du dessus, en haut de la tasse) */}
        {showCoffeeInside && (
          <>
            <ellipse cx="50" cy="0" rx="50" ry="5"   fill="#3D2010"/>
            <ellipse cx="50" cy="0" rx="46" ry="3.5" fill="#A57021"/>
            <ellipse cx="50" cy="0" rx="38" ry="2.5" fill="#D4A017" opacity="0.4"/>
          </>
        )}

        {/* Reflets verticaux brillants à gauche */}
        <rect x="8"  y="8"  width="3"   height="30" rx="1.5" fill="white" opacity="0.55"/>
        <rect x="14" y="10" width="1.5" height="22" rx="0.5" fill="white" opacity="0.3"/>
      </svg>
    </div>
  );
}

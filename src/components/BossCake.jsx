/**
 * Le boss Gâteau Géant — kawaii furieux.
 * Style : 1 étage massif avec visage expressif (yeux énormes, sourcils colériques, dents pointues).
 *
 * ⚠️ SVG copié EXACTEMENT depuis BRIEF_BOSS_COMMUNAUTAIRE.md (phase 4).
 * Ne pas simplifier / ne pas remplacer par un emoji / couleurs strictes.
 * Keyframes (bossIdle, bossAttack/.boss-attacked) dans styles/globalStyles.js
 * — pas d'index.css dans ce projet (CLAUDE.md règle #8).
 *
 * Props :
 * - attacked : true pendant l'animation d'attaque (transitoire ~400ms)
 * - hpPercent : 0 à 100 (pour afficher fissures progressives)
 */
export default function BossCake({ attacked = false, hpPercent = 100, frozen = false, ko = false }) {
  const showCrack1 = hpPercent < 60;
  const showCrack2 = hpPercent < 30;

  return (
    <div
      style={{
        position: 'relative',
        cursor: 'pointer',
        animation: ko ? 'none' : frozen ? 'bossStun 0.14s linear infinite' : 'bossIdle 3s ease-in-out infinite',
        transformOrigin: 'center bottom',
        zIndex: 2,
      }}
      className={attacked ? 'boss-attacked' : ''}
    >
      <svg width="240" height="270" viewBox="0 0 240 270" xmlns="http://www.w3.org/2000/svg">

        {/* BOUGIE GAUCHE allumée */}
        <rect x="78" y="14" width="7" height="22" fill="#F5EFE6" rx="1.5"/>
        <rect x="78" y="14" width="7" height="3" fill="#E8DDD0" rx="1.5"/>
        <path d="M 81.5 14 Q 79 8 81.5 4 Q 84 8 81.5 14" fill="#FFD75A"/>
        <path d="M 81.5 12 Q 80 9 81.5 6 Q 83 9 81.5 12" fill="#FFFFFF"/>

        {/* BOUGIE DROITE allumée */}
        <rect x="155" y="14" width="7" height="22" fill="#F5EFE6" rx="1.5"/>
        <rect x="155" y="14" width="7" height="3" fill="#E8DDD0" rx="1.5"/>
        <path d="M 158.5 14 Q 156 8 158.5 4 Q 161 8 158.5 14" fill="#FFD75A"/>
        <path d="M 158.5 12 Q 157 9 158.5 6 Q 160 9 158.5 12" fill="#FFFFFF"/>

        {/* BOUGIE EXT. GAUCHE allumée */}
        <rect x="58" y="14" width="7" height="22" fill="#F5EFE6" rx="1.5"/>
        <rect x="58" y="14" width="7" height="3" fill="#E8DDD0" rx="1.5"/>
        <path d="M 61.5 14 Q 59 8 61.5 4 Q 64 8 61.5 14" fill="#FFD75A"/>
        <path d="M 61.5 12 Q 60 9 61.5 6 Q 63 9 61.5 12" fill="#FFFFFF"/>

        {/* BOUGIE CENTRALE allumée */}
        <rect x="116" y="14" width="7" height="22" fill="#F5EFE6" rx="1.5"/>
        <rect x="116" y="14" width="7" height="3" fill="#E8DDD0" rx="1.5"/>
        <path d="M 119.5 14 Q 117 8 119.5 4 Q 122 8 119.5 14" fill="#FFD75A"/>
        <path d="M 119.5 12 Q 118 9 119.5 6 Q 121 9 119.5 12" fill="#FFFFFF"/>

        {/* BOUGIE EXT. DROITE allumée */}
        <rect x="178" y="14" width="7" height="22" fill="#F5EFE6" rx="1.5"/>
        <rect x="178" y="14" width="7" height="3" fill="#E8DDD0" rx="1.5"/>
        <path d="M 181.5 14 Q 179 8 181.5 4 Q 184 8 181.5 14" fill="#FFD75A"/>
        <path d="M 181.5 12 Q 180 9 181.5 6 Q 183 9 181.5 12" fill="#FFFFFF"/>

        {/* OMBRE SOL */}
        <ellipse cx="120" cy="246" rx="80" ry="6" fill="rgba(0,0,0,0.4)"/>

        {/* CORPS DU GÂTEAU - 1 étage massif */}
        <ellipse cx="120" cy="36" rx="78" ry="10" fill="#3D2010"/>
        <rect x="42" y="36" width="156" height="180" rx="6" fill="#5C3317"/>

        {/* GLAÇAGE DÉGOULINANT (caramel) */}
        <path d="M 42 50 Q 50 70 45 90 Q 60 70 62 90 Q 78 65 82 92 Q 98 68 102 90 Q 120 65 124 92 Q 140 65 144 90 Q 160 68 164 92 Q 180 70 184 88 Q 195 70 198 50 L 42 50" fill="#A57021"/>

        {/* TOP du gâteau (ellipse profondeur) */}
        <ellipse cx="120" cy="42" rx="78" ry="8" fill="#7D4E1F"/>

        {/* Pépites de chocolat */}
        <circle cx="62" cy="70" r="3" fill="#3D2010"/>
        <circle cx="90" cy="80" r="3" fill="#3D2010"/>
        <circle cx="125" cy="74" r="3" fill="#3D2010"/>
        <circle cx="155" cy="82" r="3" fill="#3D2010"/>
        <circle cx="180" cy="70" r="3" fill="#3D2010"/>

        {/* JOUES ROSES (blush) */}
        <ellipse cx="62" cy="160" rx="14" ry="8" fill="rgba(193, 127, 60, 0.7)"/>
        <ellipse cx="178" cy="160" rx="14" ry="8" fill="rgba(193, 127, 60, 0.7)"/>

        {/* SOURCILS FURIEUX (V renversé) */}
        <path d="M 70 115 L 100 105 L 105 118"
              stroke="#2C1810" strokeWidth="7" fill="none"
              strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M 170 115 L 140 105 L 135 118"
              stroke="#2C1810" strokeWidth="7" fill="none"
              strokeLinecap="round" strokeLinejoin="round"/>

        {(ko || frozen) ? (
          /* YEUX FERMÉS — KO (critique) ou gros coup encaissé */
          <g>
            <path d="M 74 140 Q 88 154 102 140" stroke="#2C1810" strokeWidth="6"
                  fill="none" strokeLinecap="round"/>
            <path d="M 138 140 Q 152 154 166 140" stroke="#2C1810" strokeWidth="6"
                  fill="none" strokeLinecap="round"/>
          </g>
        ) : (
          <g>
            {/* YEUX KAWAII - blancs énormes */}
            <circle cx="88" cy="140" r="18" fill="#F5EFE6"/>
            <circle cx="152" cy="140" r="18" fill="#F5EFE6"/>

            {/* Iris noires décalées vers le bas (regard méchant) */}
            <circle cx="90" cy="146" r="11" fill="#2C1810"/>
            <circle cx="150" cy="146" r="11" fill="#2C1810"/>

            {/* Reflets brillants kawaii */}
            <circle cx="94" cy="142" r="4" fill="white"/>
            <circle cx="86" cy="150" r="2" fill="white"/>
            <circle cx="154" cy="142" r="4" fill="white"/>
            <circle cx="146" cy="150" r="2" fill="white"/>
          </g>
        )}

        {ko ? (
          /* BOUCHE FERMÉE (KO) — arc inversé (∩) : air méchant */
          <path d="M 102 198 Q 120 186 138 198" stroke="#2C1810" strokeWidth="5"
                fill="none" strokeLinecap="round"/>
        ) : (
          <g>
            {/* BOUCHE ouverte avec dents pointues */}
            <ellipse cx="120" cy="190" rx="28" ry="18" fill="#2C1810"/>

            {/* Dents pointues du haut (3) */}
            <path d="M 100 178 L 105 188 L 110 178 Z" fill="#F5EFE6"/>
            <path d="M 113 175 L 120 188 L 127 175 Z" fill="#F5EFE6"/>
            <path d="M 130 178 L 135 188 L 140 178 Z" fill="#F5EFE6"/>

            {/* Dents pointues du bas (2) */}
            <path d="M 108 200 L 113 192 L 118 200 Z" fill="#F5EFE6"/>
            <path d="M 122 200 L 127 192 L 132 200 Z" fill="#F5EFE6"/>

            {/* Langue rouge bordeaux */}
            <ellipse cx="120" cy="198" rx="10" ry="4" fill="#7D4E1F"/>
          </g>
        )}

        {/* FISSURE 1 (apparaît si PV < 60%) */}
        {showCrack1 && (
          <path d="M 100 70 L 95 100 L 102 130 L 92 165 L 100 200"
                stroke="#2C1810" strokeWidth="2.5" fill="none" opacity="0.9"/>
        )}

        {/* FISSURE 2 (apparaît si PV < 30%) */}
        {showCrack2 && (
          <path d="M 180 90 L 175 120 L 182 150"
                stroke="#2C1810" strokeWidth="2" fill="none" opacity="0.9"/>
        )}

        {/* Highlight côté gauche */}
        <rect x="50" y="60" width="3" height="140" rx="1.5" fill="rgba(255,255,255,0.15)"/>
      </svg>
    </div>
  );
}

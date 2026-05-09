/* ════════════════════════════════════════════════════
   CafeScene — décor du jeu Devine la commande
   ────────────────────────────────────────────────────
   Scène 3D-illusion d'un café POV barista. Mur en haut, sol en
   perspective, comptoir qui occupe la moitié inférieure (top en
   perspective + façade en planches). Sur le comptoir : machine
   expresso métallique avec vapeur, vitrine pâtisseries, caisse.
   Décor mur : cadre photo, lampe suspendue à halo doré, étagère de
   mini-tasses. En profondeur : plante (gauche) et table avec chaises
   (droite). Le client se tient au centre, derrière le comptoir-front,
   et "marche" depuis la droite via l'animation csCustomerWalkIn.

   Banque de 8 clients (CUSTOMERS) + 1 barista légendaire séparé
   (LEGENDARY_BARISTA, drop 0.5% par partie via GuessGame). Tous
   dessinés en SVG 110×120 dans ce fichier. À chaque partie, GuessGame
   tire des indices distincts dans CUSTOMERS et les passe ici via la
   prop `customer`. Le légendaire est injecté hors pool.

   Props :
   - customer    : { id, svg } — l'un des CUSTOMERS
   - dialogText  : texte courant (vient du `typed` progressif)
   - subPhase    : 'entering' | 'speaking' | 'leaving' (la bulle ne
                   pop qu'en 'speaking', via animation-delay CSS)

   Tous les styles vivent dans globalStyles.js (préfixe .cs-* +
   keyframes csCustomerWalkIn/csBubblePop/csSteamFloat).
═══════════════════════════════════════════════════════ */

export const CUSTOMERS = [
  /* 1 — Jeune homme, cheveux bruns, chemise bleue */
  {
    id: 'jeune_homme',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'auto', display:'block' }}>
        <path d="M 18 120 L 18 88 Q 18 70 34 64 L 76 64 Q 92 70 92 88 L 92 120 Z" fill="#5C7A9E"/>
        <path d="M 42 65 L 55 76 L 68 65 L 68 58 L 42 58 Z" fill="#3D5775"/>
        <ellipse cx="55" cy="58" rx="10" ry="7" fill="#E5B894"/>
        <circle cx="55" cy="36" r="22" fill="#F0C490"/>
        <path d="M 33 32 Q 31 18 40 12 Q 50 7 60 9 Q 72 12 75 24 Q 76 30 74 34 L 72 28 Q 67 24 60 25 L 50 25 Q 42 26 35 32 Z" fill="#5C3317"/>
        <ellipse cx="47" cy="37" rx="2.5" ry="3" fill="#2C1810"/>
        <ellipse cx="63" cy="37" rx="2.5" ry="3" fill="#2C1810"/>
        <path d="M 55 41 L 53 47 L 57 47 Z" fill="#D4A07C" opacity="0.4"/>
        <path d="M 50 51 Q 55 54 60 51" stroke="#2C1810" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <ellipse cx="40" cy="44" rx="3" ry="2.5" fill="#E59080" opacity="0.4"/>
        <ellipse cx="70" cy="44" rx="3" ry="2.5" fill="#E59080" opacity="0.4"/>
      </svg>
    ),
  },
  /* 2 — Femme rousse, chignon, pull brique */
  {
    id: 'femme_rousse',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'auto', display:'block' }}>
        <path d="M 16 120 L 16 86 Q 16 68 34 62 L 76 62 Q 94 68 94 86 L 94 120 Z" fill="#A85040"/>
        <path d="M 38 64 Q 55 72 72 64 L 72 56 Q 55 60 38 56 Z" fill="#7D3525"/>
        <ellipse cx="55" cy="58" rx="9" ry="6" fill="#F0C490"/>
        <circle cx="55" cy="34" r="22" fill="#F5D0A0"/>
        <ellipse cx="55" cy="14" rx="14" ry="10" fill="#C45828"/>
        <path d="M 33 30 Q 32 22 40 18 L 70 18 Q 78 22 77 30 Q 75 26 70 26 L 40 26 Q 35 26 33 30 Z" fill="#C45828"/>
        <ellipse cx="55" cy="10" rx="8" ry="6" fill="#A04020"/>
        <ellipse cx="46" cy="35" rx="2.5" ry="3" fill="#2C1810"/>
        <ellipse cx="64" cy="35" rx="2.5" ry="3" fill="#2C1810"/>
        <path d="M 53 39 L 51 44 L 55 44 Z" fill="#D4A07C" opacity="0.5"/>
        <path d="M 49 49 Q 55 52 61 49" stroke="#A0405C" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <ellipse cx="38" cy="42" rx="3" ry="2.5" fill="#E59080" opacity="0.5"/>
        <ellipse cx="72" cy="42" rx="3" ry="2.5" fill="#E59080" opacity="0.5"/>
        <ellipse cx="42" cy="60" rx="2" ry="3" fill="#D4A017"/>
      </svg>
    ),
  },
  /* 3 — Homme âgé, chapeau, moustache, costume vert sombre */
  {
    id: 'homme_age',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'auto', display:'block' }}>
        <path d="M 18 120 L 18 88 Q 18 72 34 66 L 76 66 Q 92 72 92 88 L 92 120 Z" fill="#3D5040"/>
        <path d="M 42 67 L 55 76 L 68 67 L 68 62 L 42 62 Z" fill="#2A3528"/>
        <ellipse cx="55" cy="60" rx="9" ry="6" fill="#D4A07C"/>
        <circle cx="55" cy="38" r="22" fill="#E5B894"/>
        <path d="M 30 26 Q 28 22 30 18 L 80 18 Q 82 22 80 26 Z" fill="#3D2010"/>
        <ellipse cx="55" cy="20" rx="28" ry="6" fill="#5C3317"/>
        <ellipse cx="55" cy="22" rx="26" ry="3" fill="#3D2010"/>
        <ellipse cx="46" cy="40" rx="2.5" ry="3" fill="#2C1810"/>
        <ellipse cx="64" cy="40" rx="2.5" ry="3" fill="#2C1810"/>
        <path d="M 41 38 L 51 38 M 59 38 L 69 38" stroke="#5C3317" strokeWidth="2"/>
        <path d="M 55 44 L 53 50 L 57 50 Z" fill="#A0784E" opacity="0.6"/>
        <path d="M 48 56 Q 55 53 62 56" stroke="#2C1810" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M 40 58 Q 45 60 48 58" fill="#9D9D9D"/>
        <path d="M 62 58 Q 65 60 70 58" fill="#9D9D9D"/>
        <ellipse cx="40" cy="48" rx="2" ry="1.5" fill="#E59080" opacity="0.4"/>
        <ellipse cx="70" cy="48" rx="2" ry="1.5" fill="#E59080" opacity="0.4"/>
      </svg>
    ),
  },
  /* 4 — Jeune femme blonde, pull rose */
  {
    id: 'femme_blonde',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'auto', display:'block' }}>
        <path d="M 16 120 L 16 86 Q 16 68 32 62 L 78 62 Q 94 68 94 86 L 94 120 Z" fill="#D85580"/>
        <path d="M 38 64 Q 55 72 72 64 L 72 56 Q 55 60 38 56 Z" fill="#A8345C"/>
        <ellipse cx="55" cy="58" rx="9" ry="6" fill="#F5D0A0"/>
        <circle cx="55" cy="34" r="22" fill="#FCE0B8"/>
        <path d="M 28 36 Q 26 16 42 8 Q 55 4 68 8 Q 84 16 82 36 Q 80 32 78 28 L 75 22 L 70 26 L 65 18 L 58 24 L 50 16 L 42 24 L 36 18 L 32 26 L 28 30 Z" fill="#F5D478"/>
        <path d="M 30 38 Q 26 50 28 70 Q 30 60 32 50 Z" fill="#F5D478"/>
        <path d="M 80 38 Q 84 50 82 70 Q 80 60 78 50 Z" fill="#F5D478"/>
        <ellipse cx="46" cy="35" rx="2.5" ry="3" fill="#2C1810"/>
        <ellipse cx="64" cy="35" rx="2.5" ry="3" fill="#2C1810"/>
        <ellipse cx="46" cy="34" rx="0.8" ry="1" fill="white"/>
        <ellipse cx="64" cy="34" rx="0.8" ry="1" fill="white"/>
        <path d="M 53 39 L 51 44 L 55 44 Z" fill="#D4A07C" opacity="0.5"/>
        <path d="M 48 49 Q 55 53 62 49" stroke="#C04060" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="37" cy="42" rx="3.5" ry="3" fill="#E59080" opacity="0.55"/>
        <ellipse cx="73" cy="42" rx="3.5" ry="3" fill="#E59080" opacity="0.55"/>
      </svg>
    ),
  },
  /* 5 — Hipster, barbe, pull marron */
  {
    id: 'hipster',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'auto', display:'block' }}>
        <path d="M 18 120 L 18 88 Q 18 70 34 64 L 76 64 Q 92 70 92 88 L 92 120 Z" fill="#7D4520"/>
        <path d="M 42 66 L 55 78 L 68 66 L 68 60 L 42 60 Z" fill="#5C3015"/>
        <ellipse cx="55" cy="60" rx="9" ry="6" fill="#E5B894"/>
        <circle cx="55" cy="36" r="22" fill="#F0C490"/>
        <path d="M 32 30 Q 28 18 38 10 Q 48 5 58 7 Q 70 10 76 22 Q 78 30 76 38 L 74 30 Q 70 28 64 28 Q 60 26 56 26 Q 50 26 44 28 Q 38 30 35 36 Z" fill="#3D2010"/>
        <ellipse cx="55" cy="14" rx="14" ry="6" fill="#3D2010"/>
        <ellipse cx="46" cy="37" rx="2.5" ry="3" fill="#2C1810"/>
        <ellipse cx="64" cy="37" rx="2.5" ry="3" fill="#2C1810"/>
        <path d="M 41 33 L 51 33 M 59 33 L 69 33" stroke="#3D2010" strokeWidth="2.5"/>
        <path d="M 55 41 L 53 47 L 57 47 Z" fill="#D4A07C" opacity="0.5"/>
        <path d="M 47 52 Q 55 50 63 52 Q 62 58 55 60 Q 48 58 47 52 Z" fill="#3D2010"/>
        <path d="M 50 56 Q 55 58 60 56" stroke="#2C1810" strokeWidth="1" fill="none"/>
      </svg>
    ),
  },
  /* 6 — Femme d'affaires, blazer bleu marine, queue de cheval */
  {
    id: 'femme_affaires',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'auto', display:'block' }}>
        <path d="M 16 120 L 16 86 Q 16 68 32 62 L 78 62 Q 94 68 94 86 L 94 120 Z" fill="#1F2D4A"/>
        <path d="M 50 64 L 55 80 L 60 64 L 60 60 L 50 60 Z" fill="#FFFFFF"/>
        <path d="M 55 80 L 50 100 L 60 100 Z" fill="#A04050"/>
        <ellipse cx="55" cy="58" rx="9" ry="6" fill="#F5D0A0"/>
        <circle cx="55" cy="34" r="22" fill="#FCE0B8"/>
        <path d="M 33 28 Q 32 20 42 16 L 68 16 Q 78 20 77 28 L 77 24 L 73 26 L 38 26 L 33 24 Z" fill="#3D2010"/>
        <path d="M 78 32 L 92 50 Q 86 56 82 50 L 82 36 Z" fill="#3D2010"/>
        <ellipse cx="46" cy="35" rx="2.5" ry="3" fill="#2C1810"/>
        <ellipse cx="64" cy="35" rx="2.5" ry="3" fill="#2C1810"/>
        <path d="M 53 39 L 51 44 L 55 44 Z" fill="#D4A07C" opacity="0.5"/>
        <path d="M 49 49 Q 55 51 61 49" stroke="#A04050" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="38" cy="42" rx="3" ry="2.5" fill="#E59080" opacity="0.5"/>
        <ellipse cx="72" cy="42" rx="3" ry="2.5" fill="#E59080" opacity="0.5"/>
      </svg>
    ),
  },
  /* 7 — Enfant, casquette rouge, t-shirt jaune */
  {
    id: 'enfant',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'auto', display:'block' }}>
        <path d="M 22 120 L 22 92 Q 22 76 36 70 L 74 70 Q 88 76 88 92 L 88 120 Z" fill="#E5B040"/>
        <ellipse cx="55" cy="65" rx="8" ry="5" fill="#F5D0A0"/>
        <circle cx="55" cy="44" r="18" fill="#FCE0B8"/>
        <path d="M 34 36 Q 30 28 36 24 L 74 24 Q 80 28 76 36 L 76 30 Q 72 30 38 30 Q 34 30 34 36 Z" fill="#C42030"/>
        <path d="M 76 32 L 84 30 L 84 36 L 76 38 Z" fill="#C42030"/>
        <ellipse cx="55" cy="22" rx="22" ry="8" fill="#A01828"/>
        <ellipse cx="48" cy="44" rx="2.5" ry="3" fill="#2C1810"/>
        <ellipse cx="62" cy="44" rx="2.5" ry="3" fill="#2C1810"/>
        <ellipse cx="48" cy="43" rx="0.8" ry="1" fill="white"/>
        <ellipse cx="62" cy="43" rx="0.8" ry="1" fill="white"/>
        <path d="M 53 48 L 51 52 L 55 52 Z" fill="#D4A07C" opacity="0.5"/>
        <path d="M 48 56 Q 55 60 62 56" stroke="#A04050" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="40" cy="50" rx="3.5" ry="3" fill="#E59080" opacity="0.6"/>
        <ellipse cx="70" cy="50" rx="3.5" ry="3" fill="#E59080" opacity="0.6"/>
      </svg>
    ),
  },
  /* 8 — Dame âgée, lunettes, châle violet pâle, cheveux gris */
  {
    id: 'dame_agee',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'auto', display:'block' }}>
        <path d="M 14 120 L 14 86 Q 14 66 32 60 L 78 60 Q 96 66 96 86 L 96 120 Z" fill="#9878A8"/>
        <path d="M 14 86 Q 22 80 30 86 L 30 95 Q 22 90 14 95 Z" fill="#7D5C8E"/>
        <path d="M 96 86 Q 88 80 80 86 L 80 95 Q 88 90 96 95 Z" fill="#7D5C8E"/>
        <ellipse cx="55" cy="58" rx="9" ry="6" fill="#E5B894"/>
        <circle cx="55" cy="36" r="22" fill="#F0CCA0"/>
        <path d="M 30 30 Q 28 14 50 10 Q 60 8 70 12 Q 84 18 82 32 Q 78 26 72 26 L 38 26 Q 32 26 30 30 Z" fill="#C8C8C8"/>
        <ellipse cx="55" cy="12" rx="20" ry="6" fill="#B8B8B8"/>
        <circle cx="46" cy="36" r="5" fill="none" stroke="#3D2010" strokeWidth="1.5"/>
        <circle cx="64" cy="36" r="5" fill="none" stroke="#3D2010" strokeWidth="1.5"/>
        <path d="M 51 36 L 59 36" stroke="#3D2010" strokeWidth="1.5"/>
        <ellipse cx="46" cy="36" rx="2" ry="2.5" fill="#2C1810"/>
        <ellipse cx="64" cy="36" rx="2" ry="2.5" fill="#2C1810"/>
        <path d="M 53 42 L 51 47 L 55 47 Z" fill="#D4A07C" opacity="0.5"/>
        <path d="M 49 53 Q 55 56 61 53" stroke="#A8506C" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </svg>
    ),
  },
];

/* Barista Légendaire — drop ULTRA RARE (1 % par partie, one-shot par
   compte cf. legendaryBaristaSeen). Sa bulle contient le code promo
   BARISTA05 → débloque theme_cookies. 5 variantes visuelles, toutes
   dorées avec halo + sparkles. GuessGame en pioche une au hasard
   pour le drop. Pas dans CUSTOMERS — injecté manuellement. */
export const LEGENDARY_BARISTAS = [
  /* 1 — Barista Légendaire (original) : toque + couronne + tablier or */
  {
    id: 'legendary_barista',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'auto', display:'block' }}>
        <circle cx="55" cy="36" r="34" fill="#F5DC8A" opacity="0.45"/>
        <circle cx="55" cy="36" r="28" fill="#F0C050" opacity="0.35"/>
        <path d="M 18 120 L 18 88 Q 18 70 34 64 L 76 64 Q 92 70 92 88 L 92 120 Z" fill="#D4A017"/>
        <path d="M 42 66 L 55 80 L 68 66 L 68 60 L 42 60 Z" fill="#FFFFFF"/>
        <path d="M 55 80 L 52 100 L 58 100 Z" fill="#8B5A2B"/>
        <ellipse cx="55" cy="60" rx="9" ry="6" fill="#F5D0A0"/>
        <circle cx="55" cy="36" r="22" fill="#FCE0B8"/>
        <path d="M 32 30 Q 30 12 50 8 Q 60 6 70 8 Q 84 14 82 30 Q 78 24 72 24 L 38 24 Q 34 24 32 30 Z" fill="#E8B040"/>
        <ellipse cx="55" cy="10" rx="22" ry="6" fill="#D49018"/>
        <path d="M 35 14 L 38 4 L 45 10 L 55 0 L 65 10 L 72 4 L 75 14 Z" fill="#F5DC8A" stroke="#D4A017" strokeWidth="1"/>
        <circle cx="55" cy="6" r="2.5" fill="#FFFFFF"/>
        <ellipse cx="46" cy="36" rx="2.5" ry="3" fill="#5C3015"/>
        <ellipse cx="64" cy="36" rx="2.5" ry="3" fill="#5C3015"/>
        <ellipse cx="46" cy="35" rx="1" ry="1.2" fill="#FFFFFF"/>
        <ellipse cx="64" cy="35" rx="1" ry="1.2" fill="#FFFFFF"/>
        <path d="M 53 41 L 51 46 L 55 46 Z" fill="#D4A07C" opacity="0.5"/>
        <path d="M 47 50 Q 55 56 63 50" stroke="#8B5A2B" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="38" cy="44" rx="3.5" ry="3" fill="#F5C070" opacity="0.6"/>
        <ellipse cx="72" cy="44" rx="3.5" ry="3" fill="#F5C070" opacity="0.6"/>
        <circle cx="20" cy="20" r="2" fill="#FFE066"/>
        <circle cx="92" cy="24" r="1.5" fill="#FFE066"/>
        <circle cx="14" cy="55" r="1.8" fill="#FFE066"/>
        <circle cx="98" cy="50" r="1.2" fill="#FFE066"/>
        <circle cx="8" cy="38" r="1" fill="#FFE066"/>
        <circle cx="100" cy="38" r="1.6" fill="#FFE066"/>
      </svg>
    ),
  },
  /* 2 — La Sirène du Café : longs cheveux dorés flottants, étoiles */
  {
    id: 'legendary_sirene',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'auto', display:'block' }}>
        <circle cx="55" cy="36" r="34" fill="#F5DC8A" opacity="0.45"/>
        <circle cx="55" cy="36" r="28" fill="#F0C050" opacity="0.35"/>
        {/* Cheveux longs flottants doré (derrière le corps) */}
        <path d="M 6 80 Q 10 60 18 50 Q 14 70 16 90 Q 6 100 6 80 Z" fill="#F0C050"/>
        <path d="M 104 80 Q 100 60 92 50 Q 96 70 94 90 Q 104 100 104 80 Z" fill="#F0C050"/>
        {/* Corps : robe perle/dorée */}
        <path d="M 18 120 L 18 88 Q 18 68 34 62 L 76 62 Q 92 68 92 88 L 92 120 Z" fill="#F5DC8A"/>
        <path d="M 35 64 Q 55 78 75 64 L 75 60 Q 55 64 35 60 Z" fill="#D4A017"/>
        <ellipse cx="55" cy="58" rx="9" ry="6" fill="#FCE0B8"/>
        <circle cx="55" cy="34" r="22" fill="#FCE0B8"/>
        {/* Longs cheveux dorés cascadant */}
        <path d="M 30 32 Q 26 60 22 90 Q 30 70 34 50 Z" fill="#F0C050"/>
        <path d="M 80 32 Q 84 60 88 90 Q 80 70 76 50 Z" fill="#F0C050"/>
        <path d="M 30 24 Q 28 8 50 4 Q 60 2 70 4 Q 82 8 80 24 Q 76 18 72 18 L 38 18 Q 34 18 30 24 Z" fill="#F0C050"/>
        {/* Diadème étoile */}
        <path d="M 55 4 L 58 12 L 66 12 L 60 17 L 62 24 L 55 20 L 48 24 L 50 17 L 44 12 L 52 12 Z" fill="#FFFFFF" stroke="#D4A017" strokeWidth=".8"/>
        <ellipse cx="46" cy="34" rx="2.5" ry="3" fill="#5C3015"/>
        <ellipse cx="64" cy="34" rx="2.5" ry="3" fill="#5C3015"/>
        <ellipse cx="46" cy="33" rx="1" ry="1.2" fill="#FFFFFF"/>
        <ellipse cx="64" cy="33" rx="1" ry="1.2" fill="#FFFFFF"/>
        <path d="M 53 39 L 51 44 L 55 44 Z" fill="#D4A07C" opacity="0.5"/>
        <path d="M 49 49 Q 55 52 61 49" stroke="#A04050" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        <ellipse cx="38" cy="42" rx="3.5" ry="3" fill="#F5B080" opacity="0.55"/>
        <ellipse cx="72" cy="42" rx="3.5" ry="3" fill="#F5B080" opacity="0.55"/>
        {/* Sparkles + mini-étoiles */}
        <text x="14" y="22" fill="#FFE066" fontSize="10">✦</text>
        <text x="92" y="20" fill="#FFE066" fontSize="8">✦</text>
        <text x="6" y="48" fill="#FFE066" fontSize="7">✦</text>
        <text x="98" y="52" fill="#FFE066" fontSize="9">✦</text>
      </svg>
    ),
  },
  /* 3 — Le Vieux Sage : barbe blanche scintillante, robe dorée, capuchon */
  {
    id: 'legendary_sage',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'auto', display:'block' }}>
        <circle cx="55" cy="36" r="34" fill="#F5DC8A" opacity="0.45"/>
        <circle cx="55" cy="36" r="28" fill="#F0C050" opacity="0.35"/>
        {/* Robe dorée */}
        <path d="M 14 120 L 14 86 Q 14 64 34 58 L 76 58 Q 96 64 96 86 L 96 120 Z" fill="#C8901C"/>
        <path d="M 50 60 L 55 100 L 60 60 L 60 56 L 50 56 Z" fill="#F5DC8A"/>
        {/* Capuchon */}
        <path d="M 28 26 Q 26 -2 55 -2 Q 84 -2 82 26 L 80 22 Q 75 18 70 18 L 40 18 Q 35 18 30 22 Z" fill="#A87510"/>
        <ellipse cx="55" cy="58" rx="9" ry="6" fill="#E5B894"/>
        <circle cx="55" cy="36" r="22" fill="#F0CCA0"/>
        {/* Cheveux/sourcils blancs */}
        <ellipse cx="55" cy="14" rx="22" ry="6" fill="#F0EFE5"/>
        <path d="M 41 32 L 51 32 M 59 32 L 69 32" stroke="#F0EFE5" strokeWidth="2.5"/>
        <ellipse cx="46" cy="36" rx="2.5" ry="3" fill="#3D2010"/>
        <ellipse cx="64" cy="36" rx="2.5" ry="3" fill="#3D2010"/>
        <ellipse cx="46" cy="35" rx="1" ry="1.2" fill="#FFFFFF"/>
        <ellipse cx="64" cy="35" rx="1" ry="1.2" fill="#FFFFFF"/>
        <path d="M 53 41 L 51 46 L 55 46 Z" fill="#D4A07C" opacity="0.6"/>
        {/* Barbe longue blanche */}
        <path d="M 36 48 Q 40 70 55 78 Q 70 70 74 48 Q 70 54 64 54 L 46 54 Q 40 54 36 48 Z" fill="#F0EFE5"/>
        <path d="M 42 56 Q 48 76 55 80 Q 62 76 68 56" stroke="#D8D0BC" strokeWidth="1" fill="none"/>
        <circle cx="14" cy="20" r="1.6" fill="#FFE066"/>
        <circle cx="92" cy="22" r="1.4" fill="#FFE066"/>
        <circle cx="6" cy="48" r="1.2" fill="#FFE066"/>
        <circle cx="100" cy="46" r="1.8" fill="#FFE066"/>
      </svg>
    ),
  },
  /* 4 — Le Robot Doré : tête métallique, antenne, yeux LED */
  {
    id: 'legendary_robot',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'auto', display:'block' }}>
        <circle cx="55" cy="36" r="34" fill="#F5DC8A" opacity="0.45"/>
        <circle cx="55" cy="36" r="28" fill="#F0C050" opacity="0.35"/>
        {/* Corps métallique */}
        <path d="M 18 120 L 18 88 Q 18 70 34 64 L 76 64 Q 92 70 92 88 L 92 120 Z" fill="#D4A017"/>
        <rect x="42" y="68" width="26" height="14" rx="2" fill="#3D2010"/>
        <circle cx="48" cy="75" r="2" fill="#FFE066"/>
        <circle cx="55" cy="75" r="2" fill="#FFE066"/>
        <circle cx="62" cy="75" r="2" fill="#FFE066"/>
        {/* Cou métallique */}
        <rect x="48" y="56" width="14" height="10" fill="#A87510"/>
        <rect x="48" y="58" width="14" height="2" fill="#5C3015"/>
        <rect x="48" y="62" width="14" height="2" fill="#5C3015"/>
        {/* Tête (rectangle arrondi) */}
        <rect x="32" y="14" width="46" height="42" rx="6" fill="#F5DC8A" stroke="#D4A017" strokeWidth="2"/>
        <rect x="32" y="14" width="46" height="6" fill="#D4A017"/>
        {/* Antenne */}
        <line x1="55" y1="14" x2="55" y2="2" stroke="#D4A017" strokeWidth="2"/>
        <circle cx="55" cy="2" r="3" fill="#FFE066"/>
        {/* Yeux LED carrés */}
        <rect x="40" y="30" width="10" height="8" rx="1" fill="#5C3015"/>
        <rect x="60" y="30" width="10" height="8" rx="1" fill="#5C3015"/>
        <circle cx="45" cy="34" r="2.5" fill="#FFE066"/>
        <circle cx="65" cy="34" r="2.5" fill="#FFE066"/>
        <circle cx="44" cy="33" r="1" fill="#FFFFFF"/>
        <circle cx="64" cy="33" r="1" fill="#FFFFFF"/>
        {/* Bouche (grille parleur) */}
        <rect x="45" y="44" width="20" height="6" rx="1" fill="#5C3015"/>
        <line x1="48" y1="44" x2="48" y2="50" stroke="#3D2010" strokeWidth="1"/>
        <line x1="52" y1="44" x2="52" y2="50" stroke="#3D2010" strokeWidth="1"/>
        <line x1="56" y1="44" x2="56" y2="50" stroke="#3D2010" strokeWidth="1"/>
        <line x1="60" y1="44" x2="60" y2="50" stroke="#3D2010" strokeWidth="1"/>
        <circle cx="14" cy="22" r="1.6" fill="#FFE066"/>
        <circle cx="96" cy="20" r="1.8" fill="#FFE066"/>
        <circle cx="6" cy="50" r="1.4" fill="#FFE066"/>
        <circle cx="102" cy="48" r="1.2" fill="#FFE066"/>
      </svg>
    ),
  },
  /* 5 — Le Roi du Cookie : couronne royale extravagante, sceptre cookie */
  {
    id: 'legendary_roi',
    svg: (
      <svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'auto', display:'block' }}>
        <circle cx="55" cy="36" r="34" fill="#F5DC8A" opacity="0.45"/>
        <circle cx="55" cy="36" r="28" fill="#F0C050" opacity="0.35"/>
        {/* Manteau royal pourpre + or */}
        <path d="M 14 120 L 14 86 Q 14 66 34 60 L 76 60 Q 96 66 96 86 L 96 120 Z" fill="#5A2080"/>
        <path d="M 14 86 Q 24 80 34 88 L 34 100 Q 24 92 14 100 Z" fill="#3D1458"/>
        <path d="M 96 86 Q 86 80 76 88 L 76 100 Q 86 92 96 100 Z" fill="#3D1458"/>
        <path d="M 36 62 L 55 96 L 74 62 L 74 58 L 36 58 Z" fill="#F5DC8A"/>
        <path d="M 36 62 L 55 96 L 74 62" stroke="#D4A017" strokeWidth="1.5" fill="none"/>
        <ellipse cx="55" cy="58" rx="9" ry="6" fill="#F5D0A0"/>
        <circle cx="55" cy="34" r="22" fill="#FCE0B8"/>
        {/* Cheveux dorés courts */}
        <path d="M 32 28 Q 30 14 50 10 Q 60 8 70 10 Q 82 14 80 28 Q 76 22 72 22 L 38 22 Q 34 22 32 28 Z" fill="#D49018"/>
        {/* Couronne royale extravagante */}
        <path d="M 30 16 L 33 2 L 40 10 L 47 0 L 55 8 L 63 0 L 70 10 L 77 2 L 80 16 Z" fill="#F5DC8A" stroke="#D4A017" strokeWidth="1.5"/>
        <circle cx="33" cy="6" r="2" fill="#FF6080"/>
        <circle cx="55" cy="2" r="2.5" fill="#80E0FF"/>
        <circle cx="77" cy="6" r="2" fill="#FF6080"/>
        <rect x="30" y="14" width="50" height="3" fill="#D4A017"/>
        <ellipse cx="46" cy="36" rx="2.5" ry="3" fill="#5C3015"/>
        <ellipse cx="64" cy="36" rx="2.5" ry="3" fill="#5C3015"/>
        <ellipse cx="46" cy="35" rx="1" ry="1.2" fill="#FFFFFF"/>
        <ellipse cx="64" cy="35" rx="1" ry="1.2" fill="#FFFFFF"/>
        <path d="M 53 41 L 51 46 L 55 46 Z" fill="#D4A07C" opacity="0.5"/>
        {/* Sourire royal */}
        <path d="M 47 50 Q 55 54 63 50" stroke="#5C2090" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        {/* Moustache royale */}
        <path d="M 44 49 Q 50 47 53 49 M 67 49 Q 61 47 58 49" stroke="#A87510" strokeWidth="2" fill="none" strokeLinecap="round"/>
        {/* Sparkles royaux */}
        <text x="12" y="22" fill="#FFE066" fontSize="9">✦</text>
        <text x="94" y="22" fill="#FFE066" fontSize="9">✦</text>
        <circle cx="6" cy="48" r="1.5" fill="#FFE066"/>
        <circle cx="102" cy="48" r="1.6" fill="#FFE066"/>
      </svg>
    ),
  },
];

/* Compat — quelques imports historiques attendent encore le single
   `LEGENDARY_BARISTA`. Pointer sur le 1er = comportement inchangé. */
export const LEGENDARY_BARISTA = LEGENDARY_BARISTAS[0];

export function CafeScene({ customer, dialogText, subPhase }){
  const showBubble = subPhase === 'speaking';

  return (
    <div className="cafe-scene">
      {/* Mur de fond */}
      <div className="cs-wall" />

      {/* Sol en perspective */}
      <div className="cs-floor" />

      {/* Cadre photo (mur, gauche haut) */}
      <div className="cs-picture">☕</div>

      {/* Lampe suspendue */}
      <div className="cs-lamp" />

      {/* Étagère de mini-tasses (mur, droite haut) */}
      <div className="cs-shelf">
        <div className="cs-cup-mini" />
        <div className="cs-cup-mini" />
        <div className="cs-cup-mini" />
        <div className="cs-cup-mini" />
      </div>

      {/* Plante en pot (gauche, derrière le client) */}
      <div className="cs-plant">
        <svg viewBox="0 0 35 50" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%' }}>
          <path d="M 7 35 L 28 35 L 26 48 L 9 48 Z" fill="#7D4E1F"/>
          <ellipse cx="17.5" cy="35" rx="11" ry="2" fill="#5C3317"/>
          <ellipse cx="10" cy="22" rx="6" ry="14" fill="#4A6B3A" transform="rotate(-15 10 22)"/>
          <ellipse cx="25" cy="20" rx="5" ry="12" fill="#5A7B4A" transform="rotate(20 25 20)"/>
          <ellipse cx="17" cy="14" rx="6" ry="14" fill="#3A5B2A"/>
          <ellipse cx="13" cy="28" rx="4" ry="9" fill="#4A6B3A" transform="rotate(-25 13 28)"/>
          <ellipse cx="22" cy="28" rx="4" ry="9" fill="#5A7B4A" transform="rotate(25 22 28)"/>
        </svg>
      </div>

      {/* Petite table en arrière-plan (droite) */}
      <div className="cs-table-bg">
        <svg viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%' }}>
          <rect x="6" y="20" width="14" height="20" rx="2" fill="#5C3317"/>
          <rect x="30" y="20" width="14" height="20" rx="2" fill="#5C3317"/>
          <ellipse cx="25" cy="42" rx="20" ry="6" fill="#7D4E1F"/>
          <ellipse cx="25" cy="40" rx="20" ry="6" fill="#A0784E"/>
          <ellipse cx="25" cy="40" rx="18" ry="4" fill="#C8A878" opacity="0.6"/>
          <rect x="22" y="42" width="6" height="14" fill="#5C3317"/>
          <ellipse cx="20" cy="38" rx="3" ry="1" fill="#F0E4D0"/>
          <rect x="17" y="35" width="6" height="3" rx="1" fill="#F0E4D0"/>
        </svg>
      </div>

      {/* Le client (key change → l'animation walk-in se rejoue) */}
      <div className="cs-customer" key={customer.id}>
        {customer.svg}
        {showBubble && (
          <div className="cs-bubble">{dialogText}</div>
        )}
      </div>

      {/* Vapeur depuis la machine */}
      <div className="cs-steam" />
      <div className="cs-steam s2" />

      {/* Items posés sur le comptoir */}
      <div className="cs-counter-items">
        {/* Machine expresso */}
        <div className="cs-machine">
          <svg viewBox="0 0 56 64" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%' }}>
            <defs>
              <linearGradient id="machGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#E5E5E5"/>
                <stop offset="0.5" stopColor="#A8A8A8"/>
                <stop offset="1" stopColor="#707070"/>
              </linearGradient>
            </defs>
            <rect x="4" y="2" width="48" height="9" rx="2" fill="#3D2010"/>
            <rect x="6" y="4" width="44" height="2" fill="#5C3317"/>
            <rect x="6" y="10" width="44" height="42" rx="3" fill="url(#machGrad)"/>
            <rect x="14" y="16" width="28" height="9" rx="1" fill="#2C1810"/>
            <text x="28" y="22.5" fontSize="6" fill="#D4A017" textAnchor="middle" fontWeight="bold">CAFE</text>
            <circle cx="14" cy="36" r="5" fill="#1A1A1A"/>
            <circle cx="14" cy="36" r="3.5" fill="#F5EFE6"/>
            <line x1="14" y1="36" x2="16" y2="33" stroke="#2C1810" strokeWidth="1"/>
            <circle cx="28" cy="36" r="3" fill="#D4A017"/>
            <circle cx="38" cy="36" r="3" fill="#8B6A5A"/>
            <rect x="20" y="44" width="16" height="6" rx="1" fill="#3D2010"/>
            <rect x="24" y="50" width="3" height="4" fill="#1A1A1A"/>
            <rect x="29" y="50" width="3" height="4" fill="#1A1A1A"/>
            <line x1="50" y1="14" x2="54" y2="22" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="54" cy="22" r="1.5" fill="#707070"/>
          </svg>
        </div>

        {/* Vitrine pâtisseries */}
        <div className="cs-pastry">
          <svg viewBox="0 0 36 30" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%' }}>
            <rect x="2" y="22" width="32" height="6" rx="1" fill="#5C3317"/>
            <rect x="3" y="23" width="30" height="2" fill="#7D4E1F"/>
            <path d="M 5 22 Q 5 6 18 4 Q 31 6 31 22 Z" fill="rgba(220,230,240,0.5)" stroke="#A0A0A0" strokeWidth="1"/>
            <path d="M 8 20 Q 8 10 14 7" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none"/>
            <circle cx="13" cy="20" r="3" fill="#D4A017"/>
            <circle cx="13" cy="19" r="1" fill="#5C3317"/>
            <circle cx="22" cy="20" r="3" fill="#C17F3C"/>
            <circle cx="21" cy="19" r="0.8" fill="#3D2010"/>
            <circle cx="23" cy="19" r="0.8" fill="#3D2010"/>
          </svg>
        </div>

        {/* Caisse enregistreuse */}
        <div className="cs-register">
          <svg viewBox="0 0 42 38" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%' }}>
            <rect x="2" y="20" width="38" height="16" rx="2" fill="#3D2010"/>
            <rect x="2" y="20" width="38" height="3" fill="#5C3317"/>
            <rect x="6" y="6" width="30" height="16" rx="2" fill="#5C3317"/>
            <rect x="9" y="9" width="24" height="6" rx="1" fill="#1A1A1A"/>
            <rect x="11" y="11" width="20" height="2" fill="#D4A017"/>
            <rect x="9" y="17" width="3" height="3" rx="0.5" fill="#A0A0A0"/>
            <rect x="14" y="17" width="3" height="3" rx="0.5" fill="#A0A0A0"/>
            <rect x="19" y="17" width="3" height="3" rx="0.5" fill="#A0A0A0"/>
            <rect x="24" y="17" width="3" height="3" rx="0.5" fill="#A0A0A0"/>
            <rect x="29" y="17" width="3" height="3" rx="0.5" fill="#D4A017"/>
          </svg>
        </div>
      </div>

      {/* Comptoir 3D : top en perspective + façade */}
      <div className="cs-counter">
        <div className="cs-counter-top" />
        <div className="cs-counter-front" />
      </div>
    </div>
  );
}

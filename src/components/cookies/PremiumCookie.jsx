/* ════════════════════════════════════════════════════
   PremiumCookie — SVG par défaut (cookie classique)
   - Affiché dans ClickGame quand activeSkin est vide ou non débloqué
   - Le rendu est plus élaboré que SkinnedCookie : crackelures, sparkles intégrés,
     cercle multi-couches, gradient hardcodé. Pas de prop : forme fixe.
════════════════════════════════════════════════════ */

export function PremiumCookie({ noShadow = false } = {}) {
  return (
    <svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%', height:'100%', display:'block', filter: noShadow ? 'none' : 'drop-shadow(0 12px 22px rgba(74,44,23,.42))' }}>
      <defs>
        <radialGradient id="ck-grad" cx="38%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#F0BB7A"/>
          <stop offset="45%" stopColor="#C17F3C"/>
          <stop offset="100%" stopColor="#7D4E1F"/>
        </radialGradient>
        <radialGradient id="ck-chip" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#5C2C0A"/>
          <stop offset="100%" stopColor="#1A0A00"/>
        </radialGradient>
        <radialGradient id="ck-chip-sm" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#4A2008"/>
          <stop offset="100%" stopColor="#0F0500"/>
        </radialGradient>
      </defs>
      <ellipse cx="110" cy="208" rx="74" ry="9" fill="rgba(0,0,0,.18)"/>
      <circle cx="110" cy="113" r="98" fill="#7D4E1F"/>
      <circle cx="110" cy="110" r="100" fill="url(#ck-grad)"/>
      <path d="M 110 12 Q 132 16 148 24 Q 168 34 182 50 Q 198 70 204 94 Q 210 116 206 138 Q 200 162 184 180 Q 166 196 142 204 Q 116 210 92 206 Q 66 200 46 186 Q 24 168 14 144 Q 6 120 12 96 Q 20 72 36 54 Q 56 34 82 22 Q 96 16 110 12" stroke="#7D4E1F" strokeWidth="2" fill="none" opacity=".45"/>
      <circle cx="110" cy="110" r="100" fill="none" stroke="rgba(255,225,170,.35)" strokeWidth="1.5"/>
      <path d="M 70 70 Q 85 95 110 100 Q 130 105 150 88" stroke="#5C3317" strokeWidth="1.5" fill="none" opacity=".5"/>
      <path d="M 60 140 Q 90 145 115 155 Q 145 165 165 145" stroke="#5C3317" strokeWidth="1.5" fill="none" opacity=".4"/>
      <path d="M 145 50 Q 155 75 145 95" stroke="#5C3317" strokeWidth="1.2" fill="none" opacity=".35"/>
      <ellipse cx="78" cy="80" rx="14" ry="10" fill="#1F0E04" transform="rotate(-20 78 80)"/>
      <ellipse cx="78" cy="80" rx="12" ry="8" fill="url(#ck-chip)" transform="rotate(-20 78 80)"/>
      <ellipse cx="74" cy="76" rx="3.5" ry="2.5" fill="rgba(255,200,140,.4)" transform="rotate(-20 74 76)"/>
      <ellipse cx="138" cy="68" rx="12" ry="9" fill="#1F0E04" transform="rotate(15 138 68)"/>
      <ellipse cx="138" cy="68" rx="10" ry="7" fill="url(#ck-chip)" transform="rotate(15 138 68)"/>
      <ellipse cx="135" cy="65" rx="3" ry="2" fill="rgba(255,200,140,.4)" transform="rotate(15 135 65)"/>
      <ellipse cx="62" cy="128" rx="12" ry="9" fill="#1F0E04" transform="rotate(-10 62 128)"/>
      <ellipse cx="62" cy="128" rx="10" ry="7" fill="url(#ck-chip)" transform="rotate(-10 62 128)"/>
      <ellipse cx="59" cy="125" rx="3" ry="2" fill="rgba(255,200,140,.4)" transform="rotate(-10 59 125)"/>
      <ellipse cx="155" cy="125" rx="14" ry="10" fill="#1F0E04" transform="rotate(25 155 125)"/>
      <ellipse cx="155" cy="125" rx="12" ry="8" fill="url(#ck-chip)" transform="rotate(25 155 125)"/>
      <ellipse cx="151" cy="121" rx="3.5" ry="2.5" fill="rgba(255,200,140,.4)" transform="rotate(25 151 121)"/>
      <ellipse cx="105" cy="160" rx="13" ry="9" fill="#1F0E04" transform="rotate(-5 105 160)"/>
      <ellipse cx="105" cy="160" rx="11" ry="7" fill="url(#ck-chip)" transform="rotate(-5 105 160)"/>
      <ellipse cx="102" cy="156" rx="3" ry="2" fill="rgba(255,200,140,.4)" transform="rotate(-5 102 156)"/>
      <ellipse cx="158" cy="162" rx="10" ry="7" fill="#1F0E04" transform="rotate(10 158 162)"/>
      <ellipse cx="158" cy="162" rx="8" ry="5" fill="url(#ck-chip-sm)" transform="rotate(10 158 162)"/>
      <ellipse cx="50" cy="168" rx="10" ry="7" fill="#1F0E04" transform="rotate(-15 50 168)"/>
      <ellipse cx="50" cy="168" rx="8" ry="5" fill="url(#ck-chip-sm)" transform="rotate(-15 50 168)"/>
      <ellipse cx="115" cy="105" rx="9" ry="7" fill="#1F0E04" transform="rotate(5 115 105)"/>
      <ellipse cx="115" cy="105" rx="7" ry="5" fill="url(#ck-chip-sm)" transform="rotate(5 115 105)"/>
      <ellipse cx="76" cy="62" rx="32" ry="16" fill="rgba(255,235,200,.4)" transform="rotate(-30 76 62)"/>
      <ellipse cx="70" cy="56" rx="16" ry="7" fill="rgba(255,250,225,.55)" transform="rotate(-30 70 56)"/>
      <circle cx="158" cy="50" r="2" fill="rgba(255,235,180,.95)"/>
      <circle cx="172" cy="78" r="1.5" fill="rgba(255,235,180,.85)"/>
      <circle cx="48" cy="98" r="1.5" fill="rgba(255,235,180,.85)"/>
      <circle cx="180" cy="155" r="1.5" fill="rgba(255,235,180,.8)"/>
      <circle cx="35" cy="140" r="1.2" fill="rgba(255,235,180,.7)"/>
      <circle cx="95" cy="38" r="1.2" fill="rgba(255,235,180,.7)"/>
    </svg>
  );
}

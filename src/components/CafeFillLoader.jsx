/* ════════════════════════════════════════════════════
   CafeFillLoader — loader thématique "tasse de café qui se remplit"
   ────────────────────────────────────────────────────
   Utilisé comme fallback Suspense quand un chunk lazy (tab, jeu,
   modale) est en cours de fetch. Animation pure CSS via les
   keyframes `cafeFill` + `cafeSteam` définies dans globalStyles.js.

   Layout : flex horizontal (corps + anse) → la bounding box englobe
   bien l'anse, donc un parent `justifyContent:center` centre
   visuellement l'ensemble. Vapeur en absolu au-dessus du corps
   uniquement (pas au-dessus de l'anse).

   Props :
     size   — largeur du corps de tasse en px (défaut 96)
     color  — couleur de la tasse + handle (défaut espresso #5A3520)
     liquid — gradient du café (défaut chocolat → espresso)

   Boucle 3.2s : 0-45% remplissage, 45-55% plein, 55-100% vidange.
═══════════════════════════════════════════════════════ */

export default function CafeFillLoader({
  size = 96,
  color = '#5A3520',
  liquid = 'linear-gradient(180deg,#C8945A 0%,#8B5A2A 50%,#5A3520 100%)',
}){
  const cupW    = size;
  const cupH    = Math.round(size * 1.05);
  const borderW = Math.max(3, Math.round(size / 18));
  const handleW = Math.round(size * 0.32);
  const handleH = Math.round(size * 0.55);
  const steamSz = Math.round(size * 0.32);
  const steamGap = Math.round(size * 0.12);

  return (
    <div style={{
      display:'inline-flex',
      alignItems:'flex-end',
      pointerEvents:'none',
      userSelect:'none',
    }}>
      {/* ─── Corps de tasse (avec la vapeur en overlay au-dessus) ─── */}
      <div style={{
        position:'relative',
        width: cupW,
        height: cupH + 26,
      }}>
        {/* Vapeur : 3 volutes décalées au-dessus du corps */}
        <div aria-hidden style={{
          position:'absolute',
          top:0, left:0,
          width: cupW, height: 22,
          display:'flex',
          alignItems:'flex-end',
          justifyContent:'center',
          gap: steamGap,
        }}>
          {[0, .25, .5].map((delay, i) => (
            <span
              key={i}
              style={{
                display:'inline-block',
                fontSize: steamSz,
                lineHeight:1,
                color,
                opacity:0,
                animation:`cafeSteam 1.4s ${delay}s ease-out infinite`,
                fontWeight:900,
                letterSpacing:-1,
              }}
            >∿</span>
          ))}
        </div>

        {/* Tasse en bas */}
        <div style={{
          position:'absolute',
          bottom:0, left:0,
          width: cupW, height: cupH,
          border: `${borderW}px solid ${color}`,
          borderTop: 'none',
          borderRadius: `0 0 ${Math.round(cupW/4)}px ${Math.round(cupW/4)}px`,
          background: 'rgba(255,232,168,.08)',
          overflow: 'hidden',
          boxShadow: 'inset 0 -6px 12px rgba(0,0,0,.18)',
        }}>
          {/* Liquide qui monte (cycle court 1.4s pour rester visible
              même si le loader n'apparaît que 400-500ms). */}
          <div style={{
            position:'absolute',
            bottom:0, left:0, right:0,
            background: liquid,
            animation: 'cafeFill 1.4s ease-in-out infinite',
            boxShadow: 'inset 0 4px 10px rgba(255,232,168,.18)',
          }} />
        </div>
      </div>

      {/* ─── Anse (handle) ─── flex sibling à droite */}
      <div style={{
        width: handleW,
        height: handleH,
        border: `${borderW}px solid ${color}`,
        borderLeft: 'none',
        borderRadius: `0 ${Math.round(handleW/2)}px ${Math.round(handleW/2)}px 0`,
        marginLeft: -borderW,
        marginBottom: Math.round(cupH * 0.20),
      }} />
    </div>
  );
}

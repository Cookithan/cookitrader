/* ════════════════════════════════════════════════════
   SkeletonRow — placeholder "shimmer" pour le classement pendant
   le fetch initial Supabase
   ────────────────────────────────────────────────────
   Mimique la forme d'un CookiesRow (rank | avatar | name+title |
   score) avec des blocs animés. Donne l'impression que le contenu
   arrive plutôt qu'un texte "Chargement…" statique.

   Props :
     count — nombre de lignes à afficher (défaut 6)
     C     — palette
═══════════════════════════════════════════════════════ */

export default function SkeletonRow({ count = 6, C }){
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display:'flex', alignItems:'center', gap:12,
            padding:'12px 14px', borderRadius:14,
            background: C.card,
            border: `1px solid ${C.border}`,
            opacity: 1 - (i * 0.08),  // fade les rangs du bas pour effet de profondeur
          }}
        >
          {/* Rang */}
          <div className="skeleton-block" style={{ width:18, height:14, flexShrink:0 }} />
          {/* Avatar */}
          <div className="skeleton-block" style={{ width:36, height:36, borderRadius:'50%', flexShrink:0 }} />
          {/* Nom + titre */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
            <div className="skeleton-block" style={{ width: `${60 - i * 5}%`, height:11 }} />
            <div className="skeleton-block" style={{ width: `${35 - i * 3}%`, height:9 }} />
          </div>
          {/* Score */}
          <div className="skeleton-block" style={{ width:54, height:14, flexShrink:0 }} />
        </div>
      ))}
    </div>
  );
}

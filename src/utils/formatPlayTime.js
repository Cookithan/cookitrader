/* ════════════════════════════════════════════════════
   formatPlayTime — formatage du temps de jeu cumulé
   ────────────────────────────────────────────────────
   Prend un nombre de secondes et retourne une string lisible :
     < 60 s    → "X s"          (ex: "45 s")
     < 1 h     → "X min"        (ex: "23 min")
     < 24 h    → "X h Y min"    (ex: "3 h 27 min", "2 h" si Y=0)
     < 7 j    → "X j Y h"      (ex: "5 j 12 h", "2 j" si Y=0)
     >= 7 j   → "X j"           (ex: "12 j")

   Affichage compact, sans "0 min" / "0 h" inutiles.
═══════════════════════════════════════════════════════ */

export function formatPlayTime(seconds){
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  if(s < 60) return `${s} s`;

  const totalMin = Math.floor(s / 60);
  if(totalMin < 60) return `${totalMin} min`;

  const totalH = Math.floor(totalMin / 60);
  const remMin = totalMin % 60;
  if(totalH < 24){
    return remMin > 0 ? `${totalH} h ${remMin} min` : `${totalH} h`;
  }

  const totalD = Math.floor(totalH / 24);
  const remH = totalH % 24;
  if(totalD < 7){
    return remH > 0 ? `${totalD} j ${remH} h` : `${totalD} j`;
  }

  return `${totalD} j`;
}

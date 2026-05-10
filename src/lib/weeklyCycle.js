/* ════════════════════════════════════════════════════
   weeklyCycle.js — utilitaires du classement hebdomadaire
   ────────────────────────────────────────────────────
   Le classement Cookies tourne en cycles d'1 semaine. Le cycle
   commence chaque VENDREDI à 18 h UTC et se termine le vendredi
   suivant à 17 h 59 UTC. À la fin, les top 3 reçoivent cafés + badge
   exclusif et les compteurs `weekly_earned` reset à 0.

   week_id = date du début de la semaine au format "YYYY-MM-DD"
            (= date du dernier vendredi 18 h UTC).
            Stable même si l'user change de fuseau horaire local.

   Exemple : si on est mercredi 13/05 à 14 h, le week_id est
            "2026-05-08" (vendredi précédent à 18 h).
═══════════════════════════════════════════════════════ */

/* Retourne le week_id de la semaine courante (dernier vendredi 18 h UTC). */
export function getCurrentWeekId(now = new Date()){
  const d = new Date(now);
  const day = d.getUTCDay();              // 0 = dim, 5 = ven
  const hour = d.getUTCHours();
  /* Combien de jours en arrière jusqu'au dernier vendredi 18 h ? */
  let daysBack;
  if(day === 5){
    daysBack = hour >= 18 ? 0 : 7;        // vendredi : 0 si après 18 h, sinon -7
  } else if(day === 6){
    daysBack = 1;                          // samedi → vendredi -1 jour
  } else {
    daysBack = day + 2;                    // dim=2, lun=3, mar=4, mer=5, jeu=6
  }
  d.setUTCDate(d.getUTCDate() - daysBack);
  d.setUTCHours(18, 0, 0, 0);
  return d.toISOString().slice(0, 10);     // "2026-05-08"
}

/* Retourne le timestamp (Date) du prochain reset (= vendredi 18 h UTC suivant). */
export function getNextResetAt(now = new Date()){
  const d = new Date(now);
  const day = d.getUTCDay();
  const hour = d.getUTCHours();
  let daysForward;
  if(day === 5){
    daysForward = hour < 18 ? 0 : 7;       // vendredi avant 18 h = aujourd'hui, sinon dans 7 jours
  } else if(day < 5){
    daysForward = 5 - day;                 // dim..jeu → x jours jusqu'à ven
  } else {
    daysForward = 6;                        // samedi → +6 jours = vendredi prochain
  }
  d.setUTCDate(d.getUTCDate() + daysForward);
  d.setUTCHours(18, 0, 0, 0);
  return d;
}

/* Format compact "Xj Yh Zmin" pour countdown UI. */
export function formatTimeUntil(targetDate, now = new Date()){
  const ms = targetDate.getTime() - now.getTime();
  if(ms <= 0) return 'reset imminent';
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (24 * 60));
  const hours = Math.floor((totalMin % (24 * 60)) / 60);
  const mins = totalMin % 60;
  if(days >= 1) return `${days}j ${hours}h`;
  if(hours >= 1) return `${hours}h ${String(mins).padStart(2, '0')}min`;
  return `${mins}min`;
}

/* Numéro de la semaine pour l'affichage du badge "Champion S<XX>".
   On utilise la semaine ISO classique pour rester lisible. */
export function getWeekNumberDisplay(weekId){
  const d = new Date(weekId);
  /* ISO week number — algo standard. */
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if(target.getUTCDay() !== 4){
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

import { useState } from "react";
import { Check } from "lucide-react";
import { DAILY_REWARDS, DAILY_CAFES } from "../../data/constants.js";
import { GOLD } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   CheckinGame — récompense quotidienne progressive (2 semaines)
   - Semaine 1 (streak 0→6)  : 15, 20, 30, 40, 55, 75, jackpot 2 ☕
   - Semaine 2 (streak 7→13) : 80, 100, 130, 160, 180, 200, jackpot 3 ☕
   - Streak ≥ 14            : palier max — +200 🍪/jour, grille S2 pleine

   `checkinReward` est un OBJET (cf. getCheckinReward dans data/constants.js) :
     { coins, cafes, weekIdx, dayIdx, isJackpot, maxTier }
   Le bouton claim verse coins ET/OU cafes via doCheckin côté App.jsx.

   La grille reste à 7 cellules pour rester lisible sur mobile (430 px).
   En semaine 2, un badge "🌟 Semaine 2" indique le cycle actif et le
   jackpot affiche ☕ au lieu de 🍪.
═══════════════════════════════════════════════════════ */

export function CheckinGame({ streak, canCheckin, onCheckin, checkinReward, C }) {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);
  const handle = () => { if(!canCheckin||done) return; onCheckin(); setDone(true); };
  const disabled = !canCheckin || done;

  /* Semaine active à afficher dans la grille — suit weekIdx de getCheckinReward
     (max-tier reste en S2 visuellement). */
  const week        = checkinReward.maxTier ? 1 : checkinReward.weekIdx;
  const weekCoins   = DAILY_REWARDS[week];
  const weekCafes   = DAILY_CAFES[week];
  const jackpotCf   = weekCafes[6];   // 2 (S1) ou 3 (S2)

  /* Cellules cochées dans la semaine active :
     - S1 (streak 0-6)  : cellsDone = streak
     - S2 (streak 7-13) : cellsDone = streak - 7
     - max-tier         : cellsDone = 7 (S2 pleine) */
  const cellsDone = checkinReward.maxTier ? 7 : (week === 0 ? streak : streak - 7);

  /* Cellule à pulser aujourd'hui — pas de pulse en max-tier */
  const todayIdx       = (canCheckin && !done && !checkinReward.maxTier) ? (streak % 7) : -1;
  const daysToJackpot  = 6 - (streak % 7);

  /* Affichage du gain qu'on vient de claim (post-claim ou rappel du dernier). */
  const justClaimedCoins = done ? checkinReward.coins : null;
  const justClaimedCafes = done ? checkinReward.cafes : null;

  /* Texte du bouton — bascule 🍪/☕ selon que le claim du jour est un jackpot CF. */
  const btnLabel = done
    ? (checkinReward.isJackpot
        ? t('game_checkin.claimed_amount_cf', { n: justClaimedCafes })
        : t('game_checkin.claimed_amount',    { n: justClaimedCoins }))
    : disabled
      ? t('game_checkin.already_today')
      : (checkinReward.isJackpot
          ? t('game_checkin.claim_amount_cf', { n: checkinReward.cafes })
          : t('game_checkin.claim_amount',    { n: checkinReward.coins }));

  return (
    <div style={{ textAlign:'center', paddingTop:24 }}>
      <div className={!disabled ? 'cookie-idle' : ''} style={{ fontSize:56, marginBottom:12, display:'inline-block' }}>☕</div>
      <div style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:4 }}>{t('game_checkin.streak_n', { n: streak, s: streak > 1 ? 's' : '' })}</div>

      {/* Badge "Semaine 2" — visible quand on est entré en S2 (streak >= 7) */}
      {week === 1 && (
        <div style={{ display:'inline-block', padding:'4px 12px', borderRadius:999, background:'linear-gradient(135deg,rgba(212,160,23,.18),rgba(193,127,60,.14))', border:'1.5px solid rgba(212,160,23,.55)', fontSize:11, fontWeight:800, color:'#D4A017', letterSpacing:.3, marginBottom:6 }}>
          {t('game_checkin.week2_badge')}
        </div>
      )}

      <div style={{ fontSize:13, color:C.muted, marginBottom:22 }}>
        {checkinReward.maxTier
          ? t('game_checkin.maxtier_kept')
          : week === 1
            ? t('game_checkin.week2_subtitle')
            : t('game_checkin.subtitle')}
      </div>

      {/* Grille 7 jours — semaine active (S1 ou S2). Les valeurs cookies/CF
          changent selon `week`. Le jackpot (i===6) affiche ☕ au lieu de 🍪. */}
      <div style={{ display:'flex', gap:5, justifyContent:'center', marginBottom:28, padding:'0 4px' }}>
        {weekCoins.map((amt, i) => {
          const isDone     = i < cellsDone;
          const isToday    = i === todayIdx;
          const isJackpot  = i === 6;

          const bg     = isDone ? GOLD : isJackpot ? 'linear-gradient(160deg,rgba(212,160,23,.18),rgba(212,160,23,.06))' : 'transparent';
          const border = isToday ? '#D4A017' : isDone ? 'transparent' : isJackpot ? 'rgba(212,160,23,.45)' : C.border;
          const valCol = isDone ? '#fff' : isJackpot ? '#D4A017' : C.text;
          const lblCol = isDone ? 'rgba(255,255,255,.85)' : C.muted;

          /* Label de jour : J1..J7 (S1) ou J8..J14 (S2) */
          const dayNum = week === 0 ? (i + 1) : (i + 8);
          /* Valeur affichée — ☕ uniquement sur le jackpot (i===6). Sinon 🍪. */
          const cellValue = isJackpot
            ? <span style={{ fontSize:13, fontWeight:800 }}>+{weekCafes[6]}<span style={{ fontSize:11, marginLeft:1 }}>☕</span></span>
            : `+${amt}`;

          return (
            <div key={i} className={isToday ? 'pulse-ring' : ''} style={{ flex:1, minWidth:0, padding:'7px 2px', borderRadius:11, background:bg, border:`2px solid ${border}`, display:'flex', flexDirection:'column', alignItems:'center', gap:2, transition:'all .3s' }}>
              <div style={{ fontSize:9, fontWeight:700, color:lblCol, letterSpacing:.4 }}>{isJackpot?'🎁':`J${dayNum}`}</div>
              <div style={{ fontSize:12, fontWeight:800, color:valCol, lineHeight:1.1 }}>{isDone ? <Check size={13} color="#fff" /> : cellValue}</div>
            </div>
          );
        })}
      </div>

      {/* Message d'anticipation — masqué en max-tier (plus de jackpot à venir). */}
      {!disabled && !checkinReward.maxTier && (
        <div style={{ fontSize:11, color:C.muted, marginBottom:18 }}>
          {streak % 7 === 6
            ? t('game_checkin.jackpot_ready')
            : t('game_checkin.jackpot_in', { n: daysToJackpot, s: daysToJackpot > 1 ? 's' : '', jackpot: jackpotCf })}
        </div>
      )}

      <button onClick={handle} disabled={disabled} className={!disabled ? 'glow-anim' : ''} style={{ padding:'15px 38px', borderRadius:22, fontSize:15, fontWeight:800, background:disabled?C.card:GOLD, color:disabled?C.muted:'#fff', border:`2px solid ${disabled?C.border:'transparent'}`, cursor:disabled?'not-allowed':'pointer', letterSpacing:.3 }}>
        {btnLabel}
      </button>
    </div>
  );
}

import { useState } from "react";
import { Check } from "lucide-react";
import { DAILY_REWARDS } from "../../data/constants.js";
import { GOLD } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   CheckinGame — récompense quotidienne progressive
   - 7 cellules : J1..J6 (récompense croissante) + J7 = jackpot 🎁
   - completedInWeek : nombre de jours déjà cochés CETTE semaine
                       (basé sur streak modulo 7 — 0 si streak vide)
   - todayIdx : cellule à pulser aujourd'hui (si canCheckin et pas déjà fait)
   - À l'inscription du jour : addCoins(checkinReward) + setStreak +1 + setLastCheckin
═══════════════════════════════════════════════════════ */

export function CheckinGame({ streak, canCheckin, onCheckin, checkinReward, C }) {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);
  const handle = () => { if(!canCheckin||done) return; onCheckin(); setDone(true); };
  const disabled = !canCheckin || done;

  /* Progress dans la semaine en cours (1..7 cellules cochées) */
  const completedInWeek = streak === 0 ? 0 : ((streak - 1) % 7) + 1;
  const todayIdx = (canCheckin && !done) ? streak % 7 : -1;
  const justEarned = streak > 0 ? DAILY_REWARDS[(streak - 1) % 7] : DAILY_REWARDS[0];
  const daysToJackpot = 6 - (streak % 7);

  return (
    <div style={{ textAlign:'center', paddingTop:24 }}>
      <div className={!disabled ? 'cookie-idle' : ''} style={{ fontSize:56, marginBottom:12, display:'inline-block' }}>☕</div>
      <div style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:4 }}>{t('game_checkin.streak_n', { n: streak, s: streak > 1 ? 's' : '' })}</div>
      <div style={{ fontSize:13, color:C.muted, marginBottom:22 }}>{t('game_checkin.subtitle')}</div>

      {/* Grille 7 jours avec récompenses progressives */}
      <div style={{ display:'flex', gap:5, justifyContent:'center', marginBottom:28, padding:'0 4px' }}>
        {DAILY_REWARDS.map((amt, i) => {
          const isDone     = i < completedInWeek;
          const isToday    = i === todayIdx;
          const isJackpot  = i === 6;

          const bg     = isDone ? GOLD : isJackpot ? 'linear-gradient(160deg,rgba(212,160,23,.18),rgba(212,160,23,.06))' : 'transparent';
          const border = isToday ? '#D4A017' : isDone ? 'transparent' : isJackpot ? 'rgba(212,160,23,.45)' : C.border;
          const valCol = isDone ? '#fff' : isJackpot ? '#D4A017' : C.text;
          const lblCol = isDone ? 'rgba(255,255,255,.85)' : C.muted;

          return (
            <div key={i} className={isToday ? 'pulse-ring' : ''} style={{ flex:1, minWidth:0, padding:'7px 2px', borderRadius:11, background:bg, border:`2px solid ${border}`, display:'flex', flexDirection:'column', alignItems:'center', gap:2, transition:'all .3s' }}>
              <div style={{ fontSize:9, fontWeight:700, color:lblCol, letterSpacing:.4 }}>{isJackpot?'🎁':`J${i+1}`}</div>
              <div style={{ fontSize:isJackpot?13:12, fontWeight:800, color:valCol, lineHeight:1.1 }}>{isDone ? <Check size={13} color="#fff" /> : `+${amt}`}</div>
            </div>
          );
        })}
      </div>

      {!disabled && (
        <div style={{ fontSize:11, color:C.muted, marginBottom:18 }}>
          {streak % 7 === 6
            ? t('game_checkin.jackpot_ready')
            : t('game_checkin.jackpot_in', { n: daysToJackpot, s: daysToJackpot > 1 ? 's' : '', jackpot: DAILY_REWARDS[6] })}
        </div>
      )}

      <button onClick={handle} disabled={disabled} className={!disabled ? 'glow-anim' : ''} style={{ padding:'15px 38px', borderRadius:22, fontSize:15, fontWeight:800, background:disabled?C.card:GOLD, color:disabled?C.muted:'#fff', border:`2px solid ${disabled?C.border:'transparent'}`, cursor:disabled?'not-allowed':'pointer', letterSpacing:.3 }}>
        {done
          ? t('game_checkin.claimed_amount', { n: justEarned })
          : disabled
            ? t('game_checkin.already_today')
            : t('game_checkin.claim_amount', { n: checkinReward })}
      </button>
    </div>
  );
}

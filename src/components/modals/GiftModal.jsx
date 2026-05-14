import { useEffect, useState } from "react";
import { GOLD } from "../../data/themes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { GIFT_CONFIG, GIFT_TYPES, getGiftsSentToday } from "../../lib/supabaseSync.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   GiftModal — offrir un cadeau à un ami (BRIEF_CADEAUX_AMIS)
   ────────────────────────────────────────────────────
   Choix entre 50 🍪 et 1 ☕. Le sender paye, le destinataire reçoit
   via inbox (le crédit est appliqué à l'ouverture du message côté
   destinataire — voir handleApplyReward dans App.jsx).

   Props :
     friend          : { user_code, user_name, user_avatar, level }
     myUserCode      : pour requêter le compteur quotidien
     coins, cafes    : soldes courants (pour activer/désactiver chaque option)
     onClose
     onSend(giftType) : async, retourne { error?, success? }
                        — fait par App.jsx (sendGift + débit local + toast)

   Pas de rouge / vert : succès = or, erreur = espresso (palette café-only).
═══════════════════════════════════════════════════════ */
export function GiftModal({ friend, myUserCode, coins = 0, cafes = 0, onClose, onSend, C }){
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState(null);
  const [sending,      setSending]      = useState(false);
  const [feedback,     setFeedback]     = useState(null);  // { type:'ok'|'err', msg }
  const [todayCount,   setTodayCount]   = useState(null);  // null = en chargement

  /* Compteur quotidien (3/jour max) — load au mount */
  useEffect(() => {
    let alive = true;
    getGiftsSentToday(myUserCode).then(n => { if(alive) setTodayCount(n); });
    return () => { alive = false; };
  }, [myUserCode]);

  const remaining = todayCount == null ? null : Math.max(0, GIFT_CONFIG.MAX_PER_DAY - todayCount);
  const canSendCookies = coins >= GIFT_TYPES.cookies.amount && (remaining ?? 0) > 0;
  const canSendCf      = cafes >= GIFT_TYPES.cf.amount      && (remaining ?? 0) > 0;

  const handleSend = async () => {
    if(!selectedType || sending) return;
    setSending(true);
    const res = await onSend(selectedType);
    setSending(false);

    if(res?.error){
      setFeedback({ type:'err', msg: res.error });
      return;
    }
    setFeedback({ type:'ok', msg: t('gift.sent_to', { name: friend.user_name || t('gift.your_friend') }) });
    /* Decrement local count (on garde la modale 1.4s pour montrer le succès) */
    setTodayCount(n => (n ?? 0) + 1);
    setTimeout(onClose, 1400);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0,
        background:'rgba(15,8,4,.78)',
        display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:95, backdropFilter:'blur(6px)', padding:16,
      }}
    >
      <div
        onClick={(e)=>e.stopPropagation()}
        className="bi"
        style={{
          background:C.card, borderRadius:24, padding:'24px 22px 22px',
          maxWidth:360, width:'100%',
          boxShadow:'0 24px 60px rgba(0,0,0,.45)',
          border:`1.5px solid ${C.border}`,
          position:'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          style={{
            position:'absolute', top:12, right:12,
            width:30, height:30, borderRadius:9,
            background:'transparent', border:`1px solid ${C.border}`,
            color:C.muted, fontSize:14, fontWeight:700, cursor:'pointer',
          }}
        >✕</button>

        {/* Header — avatar + nom de l'ami */}
        <div style={{ textAlign:'center', marginBottom:14 }}>
          <div style={{ fontSize:38, marginBottom:4 }}>🎁</div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:8 }}>
            {t('gift.give_a_gift')}
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            <AvatarFigure value={friend?.user_avatar} size={36} />
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:15, fontWeight:800, color:C.text, lineHeight:1.2 }}>
                {friend?.user_name || t('gift.friend')}
              </div>
              <div style={{ fontSize:11, color:C.muted, fontWeight:600 }}>
                {t('modal.level_n', { n: friend?.level ?? 1 })}
              </div>
            </div>
          </div>
        </div>

        {/* Compteur quotidien */}
        <div style={{
          background:'rgba(212,160,23,.1)',
          border:'1px solid rgba(212,160,23,.25)',
          borderRadius:11, padding:'7px 12px',
          fontSize:11, color:'#8B6A5A', fontWeight:600,
          textAlign:'center', marginBottom:14,
        }}>
          {remaining == null
            ? t('common.loading')
            : `🎁 ${t('gift.remaining_today', { n: remaining, cap: GIFT_CONFIG.MAX_PER_DAY })}`}
        </div>

        {/* Choix 2 options */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <GiftOption
            icon="🍪"
            amount={t('gift.50_cookies')}
            cost={t('gift.you_have_cookies', { n: coins })}
            selected={selectedType === 'cookies'}
            disabled={!canSendCookies}
            onClick={() => canSendCookies && setSelectedType('cookies')}
            C={C}
          />
          <GiftOption
            icon="☕"
            amount={t('gift.1_coffee')}
            cost={t('gift.you_have_cafes', { n: cafes })}
            selected={selectedType === 'cf'}
            disabled={!canSendCf}
            onClick={() => canSendCf && setSelectedType('cf')}
            C={C}
          />
        </div>

        {/* Feedback */}
        {feedback && (
          <div style={{
            marginTop:14,
            padding:'9px 12px', borderRadius:11,
            fontSize:12, fontWeight:700, textAlign:'center',
            background: feedback.type === 'ok' ? 'rgba(212,160,23,.15)' : 'rgba(125,78,31,.15)',
            color:      feedback.type === 'ok' ? '#C8960C' : '#7D4E1F',
          }}>
            {feedback.msg}
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:10, marginTop:14 }}>
          <button
            onClick={onClose}
            style={{
              flex:1, padding:'13px 0', borderRadius:14,
              background:'transparent', border:`1.5px solid ${C.border}`,
              color:C.muted, fontSize:13, fontWeight:700, cursor:'pointer',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSend}
            disabled={!selectedType || sending || feedback?.type === 'ok'}
            style={{
              flex:1.5, padding:'13px 0', borderRadius:14,
              background: selectedType && !sending && feedback?.type !== 'ok' ? GOLD : C.card2,
              color:      selectedType && !sending && feedback?.type !== 'ok' ? '#fff' : C.muted,
              border:'none', fontSize:13, fontWeight:800, letterSpacing:.3,
              cursor: selectedType && !sending && feedback?.type !== 'ok' ? 'pointer' : 'not-allowed',
              boxShadow: selectedType && !sending && feedback?.type !== 'ok' ? '0 6px 18px rgba(212,160,23,.35)' : 'none',
            }}
          >
            {sending ? '…' : t('gift.send_gift')}
          </button>
        </div>
      </div>
    </div>
  );
}

function GiftOption({ icon, amount, cost, selected, disabled, onClick, C }){
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: selected ? 'linear-gradient(135deg, rgba(212,160,23,.18), rgba(193,127,60,.15))' : C.bg,
        border: selected ? '2px solid #D4A017' : `1.5px solid ${C.border}`,
        borderRadius:14, padding:'14px 8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        textAlign:'center',
        transition:'all .2s',
      }}
    >
      <div style={{ fontSize:30, lineHeight:1 }}>{icon}</div>
      <div style={{ fontSize:13, fontWeight:800, color:C.text, marginTop:6 }}>{amount}</div>
      <div style={{ fontSize:10, color:C.muted, marginTop:3, fontWeight:600 }}>{cost}</div>
    </button>
  );
}

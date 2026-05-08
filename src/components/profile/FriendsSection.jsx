import { useCallback, useEffect, useState } from "react";
import { ESPRESSO } from "../../data/themes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { isSupabaseEnabled } from "../../lib/supabase.js";
import {
  getFriends,
  removeFriend,
  sendFriendRequest,
  getReceivedFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
} from "../../lib/supabaseSync.js";
import { GiftModal } from "../modals/GiftModal.jsx";
import { getNameStyle } from "../../utils/legend.js";

/* ════════════════════════════════════════════════════
   FriendsSection — section "Mes Amis" du Profil
   ────────────────────────────────────────────────────
   Système bilatéral (BRIEF_DEMANDES_AMIS) :
     - mon code ami + bouton Copier
     - input + bouton "Envoyer la demande" (sendFriendRequest)
     - 📬 Demandes reçues (N) — cachée si 0, cartes Accepter/Refuser
     - 👥 Mes amis (N) — uniquement les amitiés status='accepted'

   Pas de rouge ni de vert : Accepter = gradient or, Refuser = beige neutre.

   Si Supabase est off, placeholder "Hors ligne".

   Props :
     userCode             — mon code "XXX-XXX"
     myCoins              — solde courant (comparaison)
     C                    — palette
     onRequestsCountChange (n) — optionnel, sync l'app si elle veut afficher
                                  un badge global au-delà de l'inbox (non utilisé
                                  pour le moment, mais permet de hook plus tard)
═══════════════════════════════════════════════════════ */

const CODE_RE = /^[A-Z0-9]{3}-[A-Z0-9]{3}$/;

function timeAgo(iso){
  if(!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if(ms < 60_000) return "à l'instant";
  const min = Math.floor(ms / 60_000);
  if(min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if(h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if(d === 1) return 'hier';
  return `il y a ${d} j`;
}

export function FriendsSection({ userCode, myCoins = 0, myCafes = 0, onRequestsCountChange, onOpenProfile, onSendGift, C }){
  const [copied,    setCopied]    = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [sending,   setSending]   = useState(false);
  const [feedback,  setFeedback]  = useState(null); // { type:'ok'|'err', msg }
  const [friends,   setFriends]   = useState([]);
  const [requests,  setRequests]  = useState([]);   // demandes reçues pending
  const [loading,   setLoading]   = useState(false);
  const [giftTarget, setGiftTarget] = useState(null); // { user_code, user_name, ... } | null

  const enabled = isSupabaseEnabled();

  /* Reload combiné amis + demandes reçues */
  const reloadAll = useCallback(async () => {
    if(!enabled || !userCode) return;
    const [list, reqs] = await Promise.all([
      getFriends(userCode),
      getReceivedFriendRequests(userCode),
    ]);
    setFriends(list);
    setRequests(reqs);
    if(onRequestsCountChange) onRequestsCountChange(reqs.length);
  }, [enabled, userCode, onRequestsCountChange]);

  useEffect(() => {
    if(!enabled || !userCode) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const [list, reqs] = await Promise.all([
        getFriends(userCode),
        getReceivedFriendRequests(userCode),
      ]);
      if(!alive) return;
      setFriends(list);
      setRequests(reqs);
      setLoading(false);
      if(onRequestsCountChange) onRequestsCountChange(reqs.length);
    })();
    return () => { alive = false; };
  }, [enabled, userCode, onRequestsCountChange]);

  /* Auto-clear feedback après 4s */
  useEffect(() => {
    if(!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const copyCode = async () => {
    if(!userCode) return;
    try{
      await navigator.clipboard.writeText(userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }catch{}
  };

  const handleSend = async () => {
    const code = inputCode.trim().toUpperCase();
    if(!CODE_RE.test(code)){
      setFeedback({ type:'err', msg:'Format invalide (ex : B4R-1ST)' });
      return;
    }
    setSending(true);
    const res = await sendFriendRequest(userCode, code);
    setSending(false);
    if(res.error){
      setFeedback({ type:'err', msg: res.error });
      return;
    }
    setFeedback({ type:'ok', msg:`📬 Demande envoyée à ${res.friend?.user_name || code}` });
    setInputCode('');
  };

  const handleAccept = async (requestId) => {
    /* Optimistic : on retire de la liste tout de suite */
    setRequests(rs => rs.filter(r => r.request_id !== requestId));
    const res = await acceptFriendRequest(userCode, requestId);
    if(res.error){
      /* Rollback : on recharge pour rétablir l'état réel */
      setFeedback({ type:'err', msg: res.error });
      reloadAll();
      return;
    }
    setFeedback({ type:'ok', msg:`✓ ${res.friendName || 'Ami'} ajouté !` });
    /* Recharge les amis pour intégrer le nouveau */
    const list = await getFriends(userCode);
    setFriends(list);
    if(onRequestsCountChange) onRequestsCountChange(requests.length - 1);
  };

  const handleDecline = async (requestId) => {
    setRequests(rs => rs.filter(r => r.request_id !== requestId));
    const res = await declineFriendRequest(userCode, requestId);
    if(res.error){
      setFeedback({ type:'err', msg: res.error });
      reloadAll();
      return;
    }
    if(onRequestsCountChange) onRequestsCountChange(requests.length - 1);
  };

  const handleRemove = async (friendCode) => {
    if(!confirm('Retirer cet ami de ta liste ?')) return;
    const ok = await removeFriend(userCode, friendCode);
    if(ok){
      const list = await getFriends(userCode);
      setFriends(list);
    }
  };

  return (
    <section>
      <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>MES AMIS</div>

      {/* Carte code ami */}
      <div style={{ background:ESPRESSO, borderRadius:16, padding:'16px 18px', border:'1px solid rgba(212,160,23,.35)', boxShadow:'0 6px 18px rgba(74,44,23,.25)' }}>
        <div style={{ fontSize:9, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:2, fontWeight:700, marginBottom:6 }}>MON CODE AMI</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <span style={{
            fontSize:21, fontWeight:900, color:'#F0C050',
            letterSpacing:3, whiteSpace:'nowrap',
            fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
            flex:'0 1 auto', minWidth:0
          }}>
            {userCode || '—'}
          </span>
          <button
            onClick={copyCode}
            disabled={!userCode}
            style={{
              flexShrink:0,
              padding:'8px 14px', borderRadius:11,
              background: copied ? 'rgba(212,160,23,.25)' : 'rgba(255,255,255,.08)',
              border:`1px solid ${copied ? 'rgba(212,160,23,.65)' : 'rgba(255,255,255,.18)'}`,
              color: copied ? '#F0C050' : '#F5E8D0',
              fontSize:12, fontWeight:700, cursor: userCode ? 'pointer' : 'default',
              transition:'all .25s', whiteSpace:'nowrap'
            }}
          >
            {copied ? '✓ Copié' : '📋 Copier'}
          </button>
        </div>
        <div style={{ fontSize:10.5, color:'rgba(255,255,255,.55)', marginTop:10, lineHeight:1.45 }}>
          Partage ce code à un ami pour qu'il t'envoie une demande.
        </div>
      </div>

      {!enabled ? (
        /* Mode dégradé : Supabase off (vars manquantes) */
        <div style={{
          background:'rgba(193,127,60,0.08)',
          border:'2px dashed rgba(193,127,60,0.3)',
          borderRadius:16, padding:24, textAlign:'center', marginTop:12,
        }}>
          <div style={{ fontSize:34, marginBottom:6 }}>🔌</div>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>Hors ligne</div>
          <div style={{ fontSize:11, color:C.muted, lineHeight:1.45 }}>
            Le système d'amis nécessite une connexion réseau. Réessaie plus tard.
          </div>
        </div>
      ) : (
        <>
          {/* Envoyer une demande */}
          <div style={{ marginTop:12, padding:'12px 14px', borderRadius:14, background:C.card, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:8 }}>
              Ajouter un ami
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input
                type="text"
                value={inputCode}
                onChange={e=>setInputCode(e.target.value.toUpperCase().slice(0, 7))}
                placeholder="B4R-1ST"
                maxLength={7}
                style={{
                  flex:1, minWidth:0,
                  padding:'10px 12px', borderRadius:11,
                  border:`1.5px solid ${C.border}`,
                  background:C.bg, color:C.text,
                  fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
                  fontSize:14, fontWeight:700, letterSpacing:2,
                  outline:'none', textAlign:'center',
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !inputCode}
                style={{
                  padding:'10px 16px', borderRadius:11,
                  background: sending || !inputCode ? C.card2 : 'linear-gradient(135deg,#D4A017,#C17F3C)',
                  color: sending || !inputCode ? C.muted : '#fff',
                  border:'none', fontSize:13, fontWeight:800,
                  cursor: sending || !inputCode ? 'not-allowed' : 'pointer',
                  whiteSpace:'nowrap',
                }}
              >
                {sending ? '…' : 'Envoyer'}
              </button>
            </div>
            {feedback && (
              <div style={{
                fontSize:11, fontWeight:600, marginTop:8,
                color: feedback.type === 'ok' ? '#D4A017' : '#8B5A2B',
              }}>
                {feedback.msg}
              </div>
            )}
          </div>

          {/* Section : Demandes reçues — cachée si 0 */}
          {requests.length > 0 && (
            <div style={{ marginTop:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <span style={{ fontSize:11, fontWeight:800, color:C.text, textTransform:'uppercase', letterSpacing:1.5 }}>
                  📬 Demandes reçues
                </span>
                <span style={{
                  background:'linear-gradient(135deg,#D4A017,#C17F3C)',
                  color:'#fff', fontWeight:800, fontSize:11,
                  padding:'2px 9px', borderRadius:100,
                  minWidth:22, textAlign:'center', letterSpacing:.3,
                }}>
                  {requests.length}
                </span>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {requests.map(req => (
                  <div
                    key={req.request_id}
                    style={{
                      background:C.card,
                      borderRadius:14,
                      padding:12,
                      border:'2px solid #D4A017',
                      boxShadow:'0 4px 12px rgba(212,160,23,.18)',
                    }}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                      <AvatarFigure value={req.user_avatar} size={42} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {req.user_name || 'Joueur'}
                        </div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>
                          Niveau {req.level ?? 1} · veut être ton ami
                        </div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button
                        onClick={()=>handleAccept(req.request_id)}
                        style={{
                          flex:1, padding:'10px 0',
                          background:'linear-gradient(135deg,#D4A017,#C17F3C)',
                          color:'#fff', border:'none', borderRadius:10,
                          fontWeight:800, fontSize:13, cursor:'pointer',
                        }}
                      >
                        ✓ Accepter
                      </button>
                      <button
                        onClick={()=>handleDecline(req.request_id)}
                        style={{
                          flex:1, padding:'10px 0',
                          background:'#F5EFE6', color:'#5C3317',
                          border:'1.5px solid #E8DDD0', borderRadius:10,
                          fontWeight:700, fontSize:13, cursor:'pointer',
                        }}
                      >
                        ✗ Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Liste d'amis */}
          <div style={{ marginTop:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ fontSize:11, fontWeight:800, color:C.text, textTransform:'uppercase', letterSpacing:1.5 }}>
                👥 Mes amis
              </span>
              {friends.length > 0 && (
                <span style={{ fontSize:11, color:C.muted, fontWeight:700 }}>
                  {friends.length}
                </span>
              )}
            </div>
            {loading ? (
              <div style={{ fontSize:12, color:C.muted, textAlign:'center', padding:18, fontStyle:'italic' }}>
                Chargement…
              </div>
            ) : friends.length === 0 ? (
              <div style={{
                background:C.card, border:`1px dashed ${C.border}`,
                borderRadius:14, padding:18, textAlign:'center', color:C.muted, fontSize:12,
              }}>
                Pas encore d'amis. Partage ton code pour qu'on t'envoie une demande !
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {friends.map(f => {
                  const myCoinsNum    = Number(myCoins) || 0;
                  const theirCoinsNum = Number(f.cookies) || 0;
                  const diff = theirCoinsNum - myCoinsNum;
                  const cmp =
                    diff > 0 ? { txt:`💪 +${diff} cookies par rapport à toi`, col:'#D4A017' } :
                    diff < 0 ? { txt:`🎯 ${diff} cookies par rapport à toi`, col:'#8B5A2B' } :
                               { txt:'🤝 Vous êtes à égalité', col:C.muted };
                  const clickable = !!onOpenProfile;
                  return (
                    <div
                      key={f.user_code}
                      onClick={clickable ? () => onOpenProfile(f.user_code) : undefined}
                      style={{
                        display:'flex', alignItems:'center', gap:12,
                        padding:'10px 12px', borderRadius:14,
                        background:C.card, border:`1px solid ${C.border}`,
                        cursor: clickable ? 'pointer' : 'default',
                      }}
                    >
                      <AvatarFigure value={f.user_avatar} size={42} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                          <span style={{
                            fontSize:13, fontWeight:800, color:C.text,
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                            ...(getNameStyle(f.user_name, f.earned_achievements) || {}),
                          }}>
                            {f.user_name}
                          </span>
                          <span style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:.5 }}>
                            Niv.{f.level}
                          </span>
                        </div>
                        <div style={{ fontSize:11, color: cmp.col, fontWeight:600, lineHeight:1.4 }}>
                          {cmp.txt}
                        </div>
                        {f.last_active && (
                          <div style={{ fontSize:10, color:C.muted, fontStyle:'italic' }}>
                            {timeAgo(f.last_active)}
                          </div>
                        )}
                      </div>
                      {clickable && (
                        <span aria-hidden style={{ fontSize:14, color:'#D4A017', opacity:.7, lineHeight:1 }}>
                          👁️
                        </span>
                      )}
                      {onSendGift && (
                        <button
                          onClick={(e)=>{ e.stopPropagation(); setGiftTarget(f); }}
                          aria-label="Offrir un cadeau"
                          title="Offrir un cadeau"
                          style={{
                            width:30, height:30, borderRadius:9,
                            background:'linear-gradient(135deg,#D4A017,#C17F3C)',
                            color:'#fff', border:'none',
                            fontSize:14, cursor:'pointer',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            boxShadow:'0 3px 8px rgba(212,160,23,.35)',
                          }}
                        >
                          🎁
                        </button>
                      )}
                      <button
                        onClick={(e)=>{ e.stopPropagation(); handleRemove(f.user_code); }}
                        aria-label="Retirer"
                        style={{
                          width:30, height:30, borderRadius:9,
                          background:'transparent', color:C.muted,
                          border:`1px solid ${C.border}`,
                          fontSize:14, cursor:'pointer',
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal d'envoi de cadeau */}
      {giftTarget && onSendGift && (
        <GiftModal
          friend={giftTarget}
          myUserCode={userCode}
          coins={myCoins}
          cafes={myCafes}
          onClose={() => setGiftTarget(null)}
          onSend={(giftType) => onSendGift(giftTarget.user_code, giftType)}
          C={C}
        />
      )}
    </section>
  );
}

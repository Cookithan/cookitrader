import { useEffect, useState } from "react";
import { ESPRESSO } from "../../data/themes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { isSupabaseEnabled } from "../../lib/supabase.js";
import { addFriend, getFriends, removeFriend } from "../../lib/supabaseSync.js";

/* ════════════════════════════════════════════════════
   FriendsSection — section "Mes Amis" du Profil (BRIEF_SUPABASE phase 4)
   ────────────────────────────────────────────────────
   - En haut : carte ESPRESSO avec mon code ami + bouton "Copier"
   - Au milieu : input pour ajouter un ami via son code (XXX-XXX),
     feedback success/error
   - En bas : liste des profils amis chargés depuis Supabase, avec
     comparaison du nombre de cookies et bouton ✕ pour retirer

   Si Supabase est off (pas de vars d'env), la section affiche un
   placeholder "Hors ligne — fonctionnalité indisponible".

   Props :
   - userCode : mon code "XXX-XXX" (généré dans App.jsx)
   - myCoins  : mon solde courant pour la comparaison
   - C        : palette
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

export function FriendsSection({ userCode, myCoins = 0, C }){
  const [copied,    setCopied]    = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [adding,    setAdding]    = useState(false);
  const [feedback,  setFeedback]  = useState(null); // { type:'ok'|'err', msg }
  const [friends,   setFriends]   = useState([]);
  const [loading,   setLoading]   = useState(false);

  const enabled = isSupabaseEnabled();

  /* Chargement initial + après chaque ajout/retrait. Annulé proprement
     si le composant se démonte pendant la requête. */
  useEffect(()=>{
    if(!enabled || !userCode) return;
    let alive = true;
    setLoading(true);
    (async ()=>{
      const list = await getFriends(userCode);
      if(alive){
        setFriends(list);
        setLoading(false);
      }
    })();
    return ()=>{ alive = false; };
  }, [enabled, userCode]);

  /* Auto-clear du feedback après 3.5s pour ne pas rester visible */
  useEffect(()=>{
    if(!feedback) return;
    const t = setTimeout(()=>setFeedback(null), 3500);
    return ()=>clearTimeout(t);
  }, [feedback]);

  const refreshList = async () => {
    if(!enabled || !userCode) return;
    const list = await getFriends(userCode);
    setFriends(list);
  };

  const copyCode = async () => {
    if(!userCode) return;
    try{
      await navigator.clipboard.writeText(userCode);
      setCopied(true);
      setTimeout(()=>setCopied(false), 1600);
    }catch{}
  };

  const handleAdd = async () => {
    const code = inputCode.trim().toUpperCase();
    if(!CODE_RE.test(code)){
      setFeedback({ type:'err', msg:'Format invalide (ex : B4R-1ST)' });
      return;
    }
    if(code === userCode){
      setFeedback({ type:'err', msg:'C\'est ton propre code 😄' });
      return;
    }
    setAdding(true);
    const res = await addFriend(userCode, code);
    setAdding(false);
    if(!res.ok){
      setFeedback({ type:'err', msg: res.error || 'Erreur' });
      return;
    }
    setFeedback({ type:'ok', msg: `✓ ${res.friend.user_name} ajouté !` });
    setInputCode('');
    refreshList();
  };

  const handleRemove = async (friendCode) => {
    if(!confirm('Retirer cet ami de ta liste ?')) return;
    const ok = await removeFriend(userCode, friendCode);
    if(ok) refreshList();
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
          Partage ce code à un ami pour qu'il t'ajoute.
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
          {/* Ajouter un ami */}
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
                onClick={handleAdd}
                disabled={adding || !inputCode}
                style={{
                  padding:'10px 16px', borderRadius:11,
                  background: adding || !inputCode ? C.card2 : 'linear-gradient(135deg,#D4A017,#C17F3C)',
                  color: adding || !inputCode ? C.muted : '#fff',
                  border:'none', fontSize:13, fontWeight:800,
                  cursor: adding || !inputCode ? 'not-allowed' : 'pointer',
                  whiteSpace:'nowrap',
                }}
              >
                {adding ? '…' : 'Ajouter'}
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

          {/* Liste d'amis */}
          <div style={{ marginTop:12 }}>
            {loading ? (
              <div style={{ fontSize:12, color:C.muted, textAlign:'center', padding:18, fontStyle:'italic' }}>
                Chargement…
              </div>
            ) : friends.length === 0 ? (
              <div style={{
                background:C.card, border:`1px dashed ${C.border}`,
                borderRadius:14, padding:18, textAlign:'center', color:C.muted, fontSize:12,
              }}>
                Pas encore d'amis. Partage ton code pour qu'on t'ajoute !
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
                  return (
                    <div key={f.user_code} style={{
                      display:'flex', alignItems:'center', gap:12,
                      padding:'10px 12px', borderRadius:14,
                      background:C.card, border:`1px solid ${C.border}`,
                    }}>
                      <AvatarFigure value={Number(f.user_avatar)} size={42} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                          <span style={{ fontSize:13, fontWeight:800, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
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
                      <button
                        onClick={()=>handleRemove(f.user_code)}
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
    </section>
  );
}

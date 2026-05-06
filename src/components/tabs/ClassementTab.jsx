import { useEffect, useRef, useState } from "react";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { isSupabaseEnabled } from "../../lib/supabase.js";
import { getLeaderboard, getMyRank, getTotalPlayers } from "../../lib/supabaseSync.js";

/* ════════════════════════════════════════════════════
   ClassementTab — vrai classement Supabase (BRIEF_SUPABASE phase 5)
   ────────────────────────────────────────────────────
   Plus aucun bot fictif. Le classement est une liste live des vrais
   joueurs ordonnés par total_earned décroissant.

   - Carte sticky en haut : mon rang #N sur M joueurs (mise en évidence
     gradient ESPRESSO + or)
   - Top 3 : style spécial avec gradient or/bronze/cuivre (palette café)
   - Mon profil dans la liste : bordure dorée + ✦
   - Refresh auto toutes les 30s
   - Cache via sessionStorage : la liste s'affiche instantanément à
     l'ouverture du tab même hors-ligne (phase 6)
   - Si Supabase off : placeholder "Hors ligne" sans bots fictifs

   Props :
   - userCode    : pour getMyRank et highlight
   - userName    : utilisé en fallback si profil pas encore sync serveur
   - userAvatar  : idem
   - onOpenProfile : tap sur ma carte sticky → ouvre l'overlay profil
═══════════════════════════════════════════════════════ */

const REFRESH_MS = 30_000;
const CACHE_KEY = 'leaderboard:cache';

function loadCache(){
  try{
    const raw = sessionStorage.getItem(CACHE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch{ return null; }
}
function saveCache(payload){
  try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload)); }catch{}
}

export function ClassementTab({ userCode, userName, userAvatar, onOpenProfile, C }){
  const enabled = isSupabaseEnabled();

  /* État initialisé depuis le cache pour un affichage instantané */
  const cached = loadCache();
  const [list,    setList]    = useState(cached?.list  ?? []);
  const [myRank,  setMyRank]  = useState(cached?.myRank ?? null);
  const [total,   setTotal]   = useState(cached?.total ?? null);
  const [loading, setLoading] = useState(!cached);
  const aliveRef = useRef(true);

  useEffect(()=>{
    aliveRef.current = true;
    if(!enabled){ setLoading(false); return; }

    const fetchAll = async () => {
      const [leaderboard, rank, count] = await Promise.all([
        getLeaderboard(50),
        userCode ? getMyRank(userCode) : Promise.resolve(null),
        getTotalPlayers(),
      ]);
      if(!aliveRef.current) return;
      setList(leaderboard);
      setMyRank(rank);
      setTotal(count);
      setLoading(false);
      saveCache({ list:leaderboard, myRank:rank, total:count });
    };

    fetchAll();
    const id = setInterval(fetchAll, REFRESH_MS);
    return ()=>{ aliveRef.current = false; clearInterval(id); };
  }, [enabled, userCode]);

  /* Cas Supabase off : placeholder, pas de bots fictifs */
  if(!enabled){
    return (
      <div className="su" style={{ paddingTop:4 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:14 }}>CLASSEMENT</div>
        <div style={{
          background:'rgba(193,127,60,.08)',
          border:`2px dashed ${C.border}`,
          borderRadius:18, padding:'30px 22px', textAlign:'center',
        }}>
          <div style={{ fontSize:42, marginBottom:8 }}>🔌</div>
          <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:6 }}>Hors ligne</div>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>
            Le classement nécessite une connexion réseau. Réessaie plus tard.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="su" style={{ paddingTop:4, paddingBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>CLASSEMENT</div>
        <div style={{ fontSize:11, fontWeight:600, color:C.muted }}>
          {total !== null ? `${total} joueur${total>1?'s':''}` : '…'}
        </div>
      </div>

      {/* Carte sticky : mon rang */}
      <button
        onClick={onOpenProfile}
        style={{
          width:'100%', display:'flex', alignItems:'center', gap:14,
          padding:'14px 16px', marginBottom:14,
          borderRadius:18, background:ESPRESSO,
          border:'1px solid rgba(212,160,23,.4)',
          boxShadow:'0 6px 20px rgba(74,44,23,.3)',
          color:'#fff', textAlign:'left', cursor:'pointer',
        }}
      >
        <AvatarFigure value={userAvatar ?? 0} size={48} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:2, fontWeight:700 }}>Ton rang</div>
          <div style={{ fontSize:15, fontWeight:800, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {userName || 'Joueur'}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:28, fontWeight:900, color:'#F0C050', lineHeight:1, letterSpacing:'-1px' }}>
            {myRank !== null ? `#${myRank}` : '—'}
          </div>
          {total !== null && myRank !== null && (
            <div style={{ fontSize:10, color:'rgba(255,255,255,.55)' }}>sur {total}</div>
          )}
        </div>
      </button>

      {/* Liste */}
      {loading && list.length === 0 ? (
        <div style={{ fontSize:12, color:C.muted, textAlign:'center', padding:24, fontStyle:'italic' }}>
          Chargement…
        </div>
      ) : list.length === 0 ? (
        <div style={{
          background:C.card, border:`1px dashed ${C.border}`,
          borderRadius:14, padding:20, textAlign:'center', color:C.muted, fontSize:12,
        }}>
          Pas encore de joueurs. Sois le premier !
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {list.map((p, i) => (
            <LeaderRow
              key={p.user_code}
              rank={i + 1}
              p={p}
              isMe={p.user_code === userCode}
              C={C}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* Une ligne du classement. Rang 1-3 : gradient médaille (or/bronze/
   cuivre, palette café). Rang 4+ : carte normale. Highlight de mon
   profil avec bordure dorée + ✦. */
function LeaderRow({ rank, p, isMe, C }){
  const medal = rank === 1
    ? { bg:'linear-gradient(135deg,#F0C050,#D4A017)', col:'#3D2010', emoji:'🥇' }
    : rank === 2
    ? { bg:'linear-gradient(135deg,#C8A878,#A0784E)', col:'#3D2010', emoji:'🥈' }
    : rank === 3
    ? { bg:'linear-gradient(135deg,#B07840,#7D4E1F)', col:'#F0E0C0', emoji:'🥉' }
    : null;

  const cardBg     = medal ? medal.bg : C.card;
  const textColor  = medal ? medal.col : C.text;
  const subColor   = medal ? `${medal.col}cc` : C.muted;
  const cookieColor = medal ? medal.col : '#D4A017';

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12,
      padding:'12px 14px', borderRadius:14,
      background: cardBg,
      border: isMe ? '2px solid #D4A017' : `1px solid ${medal ? 'transparent' : C.border}`,
      boxShadow: medal ? '0 6px 18px rgba(74,44,23,.25)' : isMe ? '0 0 0 4px rgba(212,160,23,.12)' : 'none',
      position:'relative',
    }}>
      <div style={{
        flexShrink:0, width:36, textAlign:'center',
        fontSize: rank <= 3 ? 22 : 13,
        fontWeight:900, color: textColor,
        lineHeight:1,
      }}>
        {medal ? medal.emoji : `#${rank}`}
      </div>
      <AvatarFigure value={Number(p.user_avatar) || 0} size={40} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
          <span style={{
            fontSize:13, fontWeight:800, color: textColor,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>
            {p.user_name}{isMe && ' ✦'}
          </span>
          <span style={{ fontSize:10, color: subColor, fontWeight:700, letterSpacing:.4 }}>
            Niv.{p.level}
          </span>
        </div>
        {p.streak > 0 && (
          <div style={{ fontSize:10, color: subColor, fontWeight:600 }}>
            🔥 {p.streak}j de série
          </div>
        )}
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:15, fontWeight:900, color: cookieColor, lineHeight:1 }}>
          {(p.total_earned ?? 0).toLocaleString('fr-FR')}
        </div>
        <div style={{ fontSize:9, color: subColor, fontWeight:700, letterSpacing:.5 }}>🍪 cumulés</div>
      </div>
    </div>
  );
}

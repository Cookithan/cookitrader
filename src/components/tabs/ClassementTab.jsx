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
  const isAdmin = (userName || '').trim().toLowerCase() === 'admin';

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
          {isAdmin ? (
            <>
              <div style={{ fontSize:14, fontWeight:900, color:'#F0C050', lineHeight:1.1 }}>Admin</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.55)' }}>hors classement</div>
            </>
          ) : (
            <>
              <div style={{ fontSize:28, fontWeight:900, color:'#F0C050', lineHeight:1, letterSpacing:'-1px' }}>
                {myRank !== null ? `#${myRank}` : '—'}
              </div>
              {total !== null && myRank !== null && (
                <div style={{ fontSize:10, color:'rgba(255,255,255,.55)' }}>sur {total}</div>
              )}
            </>
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

/* Une ligne du classement. Tous les rangs en #N (pas d'emojis médaille).
   Seul le 1er a une bannière distincte : gradient or doux + bordure
   dorée + petit pictogramme 🏆. Mon profil garde une bordure dorée
   et un ✦ après le nom. */
function LeaderRow({ rank, p, isMe, C }){
  const isFirst = rank === 1;

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12,
      padding:'12px 14px', borderRadius:14,
      background: isFirst ? 'linear-gradient(135deg,#FBEFD4,#F0C050)' : C.card,
      border: (isFirst || isMe) ? '2px solid #D4A017' : `1px solid ${C.border}`,
      boxShadow: isFirst ? '0 6px 18px rgba(212,160,23,.28)' : 'none',
      position:'relative',
    }}>
      {isFirst && (
        <span style={{
          position:'absolute', top:-9, right:12,
          padding:'2px 9px', borderRadius:8,
          background:'#3D2010', color:'#F0C050',
          fontSize:9, fontWeight:900, letterSpacing:1, textTransform:'uppercase',
          border:'1px solid rgba(212,160,23,.5)',
        }}>
          🏆 Champion
        </span>
      )}
      <div style={{
        flexShrink:0, width:32, textAlign:'center',
        fontSize:13, fontWeight:900,
        color: isFirst ? '#5D3A1F' : C.muted,
        lineHeight:1,
      }}>
        #{rank}
      </div>
      <AvatarFigure value={Number(p.user_avatar) || 0} size={40} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
          <span style={{
            fontSize:13, fontWeight:800,
            color: isFirst ? '#3D2010' : C.text,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>
            {p.user_name}{isMe && ' ✦'}
          </span>
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:.4, color: isFirst ? 'rgba(61,32,16,.7)' : C.muted }}>
            Niv.{p.level}
          </span>
        </div>
        {p.streak > 0 && (
          <div style={{ fontSize:10, fontWeight:600, color: isFirst ? 'rgba(61,32,16,.7)' : C.muted }}>
            🔥 {p.streak}j de série
          </div>
        )}
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:15, fontWeight:900, lineHeight:1, color: isFirst ? '#5D3A1F' : '#D4A017' }}>
          {(p.total_earned ?? 0).toLocaleString('fr-FR')}
        </div>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:.5, color: isFirst ? 'rgba(61,32,16,.65)' : C.muted }}>🍪 cumulés</div>
      </div>
    </div>
  );
}

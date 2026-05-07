import { useEffect, useRef, useState } from "react";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { isSupabaseEnabled } from "../../lib/supabase.js";
import { getLeaderboard, getMyRank, getTotalPlayers } from "../../lib/supabaseSync.js";

/* ════════════════════════════════════════════════════
   ClassementTab — vrai classement Supabase (BRIEF_SUPABASE phase 5)
   ────────────────────────────────────────────────────
   4 classements via un sélecteur d'onglets en haut :
   - Cookies     : total_earned (tri par défaut, classement principal)
   - Badges      : badges_count (le plus de badges débloqués)
   - Marché      : total_invested (le plus gros investisseur)
   - Série       : streak (la plus longue série de jours consécutifs)

   Plus aucun bot fictif. Le compte "Admin" est filtré côté serveur.
   - Carte sticky : mon rang #N selon le critère courant
   - Top 1 : carte distincte (gradient or doux + badge "🏆 Champion")
   - Mon profil : bordure dorée + ✦
   - Refresh auto 30s + cache sessionStorage par critère
   - Si Supabase off : placeholder "Hors ligne"
═══════════════════════════════════════════════════════ */

const REFRESH_MS = 30_000;
const CACHE_PREFIX = 'leaderboard:cache:';

const CRITERIA = [
  { id:'total_earned',   label:'Cookies', icon:'🍪', unitShort:'🍪 cumulés',  fmt:(v)=>(v ?? 0).toLocaleString('fr-FR') },
  { id:'badges_count',   label:'Badges',  icon:'🎖️', unitShort:'badge(s)',     fmt:(v)=>String(v ?? 0) },
  { id:'total_invested', label:'Marché',  icon:'📈', unitShort:'🍪 investis',  fmt:(v)=>(v ?? 0).toLocaleString('fr-FR') },
  { id:'streak',         label:'Série',   icon:'🔥', unitShort:'jour(s)',      fmt:(v)=>String(v ?? 0) },
];

function loadCache(criterion){
  try{
    const raw = sessionStorage.getItem(CACHE_PREFIX + criterion);
    return raw ? JSON.parse(raw) : null;
  }catch{ return null; }
}
function saveCache(criterion, payload){
  try{ sessionStorage.setItem(CACHE_PREFIX + criterion, JSON.stringify(payload)); }catch{}
}

export function ClassementTab({ userCode, userName, userAvatar, onOpenProfile, C }){
  const enabled = isSupabaseEnabled();
  const isAdmin = (userName || '').trim().toLowerCase() === 'admin';

  const [criterion, setCriterion] = useState('total_earned');
  const cur = CRITERIA.find(c => c.id === criterion) || CRITERIA[0];

  /* État initialisé depuis le cache du critère courant */
  const cached = loadCache(criterion);
  const [list,    setList]    = useState(cached?.list  ?? []);
  const [myRank,  setMyRank]  = useState(cached?.myRank ?? null);
  const [total,   setTotal]   = useState(cached?.total ?? null);
  const [loading, setLoading] = useState(!cached);
  const aliveRef = useRef(true);

  useEffect(()=>{
    aliveRef.current = true;
    /* À chaque changement de critère, on tente d'abord d'afficher le cache
       correspondant pour éviter le flash "Chargement…" */
    const c = loadCache(criterion);
    if(c){ setList(c.list); setMyRank(c.myRank); setTotal(c.total); setLoading(false); }
    else  { setLoading(true); }

    if(!enabled){ setLoading(false); return; }

    const fetchAll = async () => {
      const [leaderboard, rank, count] = await Promise.all([
        getLeaderboard(criterion, 50),
        userCode ? getMyRank(userCode, criterion) : Promise.resolve(null),
        getTotalPlayers(),
      ]);
      if(!aliveRef.current) return;
      setList(leaderboard);
      setMyRank(rank);
      setTotal(count);
      setLoading(false);
      saveCache(criterion, { list:leaderboard, myRank:rank, total:count });
    };

    fetchAll();
    const id = setInterval(fetchAll, REFRESH_MS);
    return ()=>{ aliveRef.current = false; clearInterval(id); };
  }, [enabled, userCode, criterion]);

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
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>CLASSEMENT</div>
        <div style={{ fontSize:11, fontWeight:600, color:C.muted }}>
          {total !== null ? `${total} joueur${total>1?'s':''}` : '…'}
        </div>
      </div>

      {/* Sélecteur de critère */}
      <div style={{ display:'flex', gap:6, padding:4, borderRadius:14, background:C.card2, marginBottom:12 }}>
        {CRITERIA.map(c => {
          const active = c.id === criterion;
          return (
            <button
              key={c.id}
              onClick={()=>setCriterion(c.id)}
              style={{
                flex:1, padding:'8px 4px', borderRadius:10,
                fontSize:11, fontWeight:800, letterSpacing:.3,
                background: active ? GOLD : 'transparent',
                color: active ? '#fff' : C.text,
                boxShadow: active ? '0 4px 10px rgba(212,160,23,.35)' : 'none',
                cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:4,
              }}
            >
              <span style={{ fontSize:13 }}>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          );
        })}
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
          <div style={{ fontSize:10, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:2, fontWeight:700 }}>
            Ton rang · {cur.label}
          </div>
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
          Pas encore de joueurs sur ce classement.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {list.map((p, i) => (
            <LeaderRow
              key={p.user_code}
              rank={i + 1}
              p={p}
              criterion={cur}
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
   dorée + petit pictogramme 🏆 CHAMPION. Mon profil garde une bordure
   dorée et un ✦ après le nom. */
function LeaderRow({ rank, p, criterion, isMe, C }){
  const isFirst = rank === 1;
  const value = p[criterion.id] ?? 0;

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
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:15, fontWeight:900, lineHeight:1, color: isFirst ? '#5D3A1F' : '#D4A017' }}>
          {criterion.fmt(value)}
        </div>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:.5, color: isFirst ? 'rgba(61,32,16,.65)' : C.muted }}>
          {criterion.unitShort}
        </div>
      </div>
    </div>
  );
}

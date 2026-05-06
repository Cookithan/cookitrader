import { useState } from "react";
import { leaderboardScore } from "../../data/leaderboard.js";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";

/* ════════════════════════════════════════════════════
   ClassementTab — leaderboard fictif (29 bots + le joueur)
   - Filtres : Cookies / Score / Cafés / Niveau / Série / Clics
   - Carte sticky-top : position du joueur dans le classement courant
   - Podium top 3 (ordre 2-1-3 visuel) + liste rang 4+
   - "Voir plus" si l'utilisateur est masqué hors top 10 → indication visuelle
═══════════════════════════════════════════════════════ */

export function ClassementTab({ leaderboard, user, onOpenProfile, C }){
  const [filter, setFilter] = useState('coins');
  const [showAll, setShowAll] = useState(false);
  const FILTERS = [
    { id:'coins',  label:'Cookies',   metric:'totalEarned',    unit:'🍪'   },
    { id:'score',  label:'Score',     metric:'score',          unit:''     },
    { id:'cafes',  label:'Cafés',     metric:'cafes',          unit:'☕'   },
    { id:'level',  label:'Niveau',    metric:'level',          unit:''     },
    { id:'streak', label:'Série',     metric:'streak',         unit:'j'    },
    { id:'click',  label:'Clics',     metric:'clickRecord',    unit:''     },
  ];
  const current = FILTERS.find(f => f.id === filter) || FILTERS[0];

  const userEntry = {
    name: user.name || 'Toi',
    avatar: user.avatar !== null && user.avatar !== undefined ? user.avatar : 0,
    level: user.level || 1,
    streak: user.streak || 0,
    totalEarned: user.totalEarned || 0,
    clickRecord: user.clickRecord || 0,
    marketRealized: user.marketRealized || 0,
    cafes: user.cafes || 0,
    isUser: true
  };

  const getMetric = (p) => current.metric === 'score' ? leaderboardScore(p) : (p[current.metric] || 0);

  const all = [...leaderboard, userEntry].sort((a,b) => getMetric(b) - getMetric(a));
  const userPos = all.findIndex(p => p.isUser) + 1;
  const totalPlayers = all.length;
  const top3 = all.slice(0, 3);

  const podiumColors = ['#D4A017','#C0B0A0','#C17F3C'];
  const podiumEmojis = ['🥇','🥈','🥉'];

  return (
    <div className="su" style={{ paddingTop:4, paddingBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>CLASSEMENT</div>
        <div style={{ fontSize:11, fontWeight:600, color:C.muted }}>{totalPlayers} joueurs</div>
      </div>

      {/* Carte position du joueur */}
      <button
        onClick={onOpenProfile}
        style={{
          width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
          borderRadius:18, marginBottom:14, background:ESPRESSO,
          border:'2px solid #D4A017',
          boxShadow:'0 6px 20px rgba(212,160,23,.35)',
          textAlign:'left', cursor:'pointer'
        }}
      >
        <div style={{ fontSize:32, fontWeight:900, color:'#F0C050', minWidth:54, textAlign:'center', letterSpacing:'-1px' }}>
          #{userPos}
        </div>
        <AvatarFigure value={userEntry.avatar} size={42} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:800, color:'#fff' }}>{userEntry.name}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.7)' }}>
            Ta position en <strong style={{ color:'#F0C050' }}>{current.label.toLowerCase()}</strong>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:16, fontWeight:900, color:'#F0C050' }}>{getMetric(userEntry).toLocaleString('fr-FR')}</div>
          {current.unit && <div style={{ fontSize:10, color:'rgba(255,255,255,.6)' }}>{current.unit}</div>}
        </div>
      </button>

      {/* Filtres pills */}
      <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto', paddingBottom:2 }}>
        {FILTERS.map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)} style={{
            padding:'6px 12px', borderRadius:18, fontSize:11, fontWeight:700, whiteSpace:'nowrap',
            background:filter===f.id?GOLD:C.card, color:filter===f.id?'#fff':C.muted,
            border:`1px solid ${filter===f.id?'transparent':C.border}`, cursor:'pointer', transition:'all .2s'
          }}>{f.label}</button>
        ))}
      </div>

      {/* Podium top 3 */}
      <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'flex-end' }}>
        {[1,0,2].map(i => {
          const p = top3[i];
          if(!p) return <div key={i} style={{ flex:1 }} />;
          const isUser = p.isUser;
          const heights = [96, 78, 70];
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <div style={{ position:'relative' }}>
                <AvatarFigure value={p.avatar} size={40} ringColor={isUser?'#D4A017':podiumColors[i]} />
                <div style={{ position:'absolute', top:-8, right:-8, fontSize:18 }}>{podiumEmojis[i]}</div>
              </div>
              <div style={{
                width:'100%', borderRadius:'12px 12px 0 0', height:heights[i],
                background: isUser
                  ? 'linear-gradient(180deg, rgba(212,160,23,.3), rgba(212,160,23,.1))'
                  : i===0 ? 'linear-gradient(180deg, rgba(212,160,23,.22), rgba(212,160,23,.05))'
                  : i===1 ? 'linear-gradient(180deg, rgba(192,176,160,.22), rgba(192,176,160,.05))'
                  :         'linear-gradient(180deg, rgba(193,127,60,.22), rgba(193,127,60,.05))',
                border: `1.5px solid ${isUser ? '#D4A017' : podiumColors[i]}`,
                borderBottom:'none',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start',
                padding:'8px 4px'
              }}>
                <div style={{ fontSize:11, fontWeight:800, color:C.text, textAlign:'center', lineHeight:1.2, maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                <div style={{ fontSize:13, fontWeight:900, color: isUser?'#D4A017':podiumColors[i], marginTop:4 }}>
                  {getMetric(p).toLocaleString('fr-FR')}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Liste rang 4+ (top 10 par défaut, voir plus pour le reste) */}
      {(() => {
        const rest = all.slice(3);
        const visibleCount = showAll ? rest.length : Math.min(7, rest.length); // 4-10 par défaut
        const visible = rest.slice(0, visibleCount);
        const userInHidden = !showAll && rest.findIndex(p => p.isUser) >= 7;
        return (
          <>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {visible.map((p, idx) => {
                const rank = idx + 4;
                const isUser = p.isUser;
                return (
                  <div
                    key={`${p.name}-${rank}`}
                    onClick={isUser ? onOpenProfile : undefined}
                    style={{
                      display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:12,
                      background: isUser ? 'rgba(212,160,23,.14)' : C.card,
                      border:`1.5px solid ${isUser ? '#D4A017' : C.border}`,
                      cursor: isUser ? 'pointer' : 'default'
                    }}
                  >
                    <div style={{ fontSize:13, fontWeight:800, color: isUser?'#D4A017':C.muted, minWidth:30 }}>#{rank}</div>
                    <AvatarFigure value={p.avatar} size={32} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:isUser?900:700, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {p.name}{isUser && <span style={{ fontSize:10, marginLeft:6, padding:'2px 6px', borderRadius:6, background:GOLD, color:'#fff', fontWeight:800 }}>TOI</span>}
                      </div>
                      <div style={{ fontSize:10, color:C.muted }}>Niv {p.level} · 🔥 {p.streak} · ☕ {p.cafes || 0}</div>
                    </div>
                    <div style={{ fontSize:14, fontWeight:900, color:isUser?'#D4A017':C.text, textAlign:'right' }}>
                      {getMetric(p).toLocaleString('fr-FR')}
                      {current.unit && <span style={{ fontSize:9, color:C.muted, marginLeft:3 }}>{current.unit}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {rest.length > 7 && (
              <button
                onClick={()=>setShowAll(v => !v)}
                style={{
                  width:'100%', marginTop:10, padding:'10px',
                  borderRadius:12, background:'transparent',
                  border:`1px dashed ${userInHidden ? '#D4A017' : C.border}`,
                  color: userInHidden ? '#D4A017' : C.muted,
                  fontSize:12, fontWeight:700, letterSpacing:.3, cursor:'pointer'
                }}
              >
                {showAll
                  ? 'Voir moins ↑'
                  : `Voir plus (${rest.length - 7})${userInHidden ? ' — tu y es !' : ''} ↓`}
              </button>
            )}
          </>
        );
      })()}

      {/* Message bas */}
      <div style={{ textAlign:'center', marginTop:18, fontSize:12, color:C.muted, fontStyle:'italic' }}>
        {userPos === 1 ? '👑 Tu domines tous les baristas du monde !'
          : userPos <= 3 ? '🏆 Tu es sur le podium — encore un effort !'
          : userPos <= 10 ? '🔥 Top 10 — continue à grimper !'
          : 'Joue plus pour grimper dans le classement ☕'}
      </div>
    </div>
  );
}

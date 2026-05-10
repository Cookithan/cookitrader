import { useEffect, useRef, useState } from "react";
import { ESPRESSO } from "../../data/themes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { isSupabaseEnabled } from "../../lib/supabase.js";
import { getLeaderboard, getMyRank, getTotalPlayers } from "../../lib/supabaseSync.js";
import {
  getMarketLeaderboard, getMyMarketRank, getMarketTraderCount, getMarketState,
} from "../../lib/market.js";
import { getNameStyle } from "../../utils/legend.js";
import { isAdminName } from "../../utils/admin.js";

/* ════════════════════════════════════════════════════
   ClassementTab — 2 classements en un seul onglet
   ────────────────────────────────────────────────────
   Toggle 🍪 Cookies / 📈 Marché en haut. Les 2 vues partagent
   la même structure : carte sticky "ton rang" + liste top N.

   Vue Cookies (existante) : tri par total_earned décroissant.
   Vue Marché (BRIEF_CLASSEMENT_MARCHE) : tri par nombre d'actions $CKM
   détenues. Affiche le nombre d'actions + leur valeur estimée au prix
   courant. Admin exclu des 2 vues.

   - Refresh auto toutes les 30s
   - Cache via sessionStorage (clés séparées par mode) — affichage
     instantané à l'ouverture, même hors-ligne
   - Si Supabase off : placeholder "Hors ligne"

   Props :
   - userCode    : pour getMyRank et highlight
   - userName    : utilisé en fallback si profil pas encore sync serveur
   - userAvatar  : idem
   - onOpenProfile      : tap sur ma carte sticky → ouvre MON ProfileOverlay
   - onOpenUserProfile  : tap sur la ligne du top 1 → ouvre la modale
                          UserProfileModal de cet autre joueur
═══════════════════════════════════════════════════════ */

const REFRESH_MS = 30_000;
const CACHE_KEY_COOKIES = 'leaderboard:cache';
const CACHE_KEY_MARKET  = 'leaderboard:market:cache';

function loadCache(key){
  try{
    const raw = sessionStorage.getItem(key);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch{ return null; }
}
function saveCache(key, payload){
  try{ sessionStorage.setItem(key, JSON.stringify(payload)); }catch{}
}

export function ClassementTab({ userCode, userName, userAvatar, earnedAchievements, activeTitle, onOpenProfile, onOpenUserProfile, C }){
  const enabled = isSupabaseEnabled();
  const isAdmin = isAdminName(userName);
  const [mode, setMode] = useState('cookies'); /* 'cookies' | 'market' */

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
      <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:12 }}>CLASSEMENT</div>

      {/* Toggle Cookies / Marché */}
      <ModeToggle mode={mode} setMode={setMode} C={C} />

      {mode === 'cookies' ? (
        <CookiesView
          userCode={userCode}
          userName={userName}
          userAvatar={userAvatar}
          earnedAchievements={earnedAchievements}
          activeTitle={activeTitle}
          isAdmin={isAdmin}
          onOpenProfile={onOpenProfile}
          onOpenUserProfile={onOpenUserProfile}
          C={C}
        />
      ) : (
        <MarketView
          userCode={userCode}
          userName={userName}
          userAvatar={userAvatar}
          earnedAchievements={earnedAchievements}
          activeTitle={activeTitle}
          isAdmin={isAdmin}
          onOpenProfile={onOpenProfile}
          onOpenUserProfile={onOpenUserProfile}
          C={C}
        />
      )}
    </div>
  );
}

/* Toggle pill 2 segments. Style assorti aux toggles boutique
   (fond carte, segment actif espresso/or). */
function ModeToggle({ mode, setMode, C }){
  const segs = [
    { id:'cookies', label:'🍪 Cookies' },
    { id:'market',  label:'📈 Marché'  },
  ];
  return (
    <div style={{
      display:'flex', gap:4, marginBottom:14,
      padding:4, borderRadius:14,
      background:C.card, border:`1px solid ${C.border}`,
    }}>
      {segs.map(s => {
        const active = mode === s.id;
        return (
          <button
            key={s.id}
            onClick={()=>setMode(s.id)}
            style={{
              flex:1, padding:'10px 8px', borderRadius:10,
              border:'none', cursor:'pointer',
              background: active ? ESPRESSO : 'transparent',
              color: active ? '#F0C050' : C.muted,
              fontSize:12, fontWeight:800, letterSpacing:.5,
              transition:'background .15s, color .15s',
              touchAction:'manipulation', userSelect:'none',
            }}>
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   Vue Cookies — total_earned (existante)
═══════════════════════════════════════════════════════ */
function CookiesView({ userCode, userName, userAvatar, earnedAchievements, activeTitle, isAdmin, onOpenProfile, onOpenUserProfile, C }){
  const cached = loadCache(CACHE_KEY_COOKIES);
  const [list,    setList]    = useState(cached?.list  ?? []);
  const [myRank,  setMyRank]  = useState(cached?.myRank ?? null);
  const [total,   setTotal]   = useState(cached?.total ?? null);
  const [loading, setLoading] = useState(!cached);
  const aliveRef = useRef(true);

  useEffect(()=>{
    aliveRef.current = true;

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
      saveCache(CACHE_KEY_COOKIES, { list:leaderboard, myRank:rank, total:count });
    };

    fetchAll();
    const id = setInterval(fetchAll, REFRESH_MS);
    return ()=>{ aliveRef.current = false; clearInterval(id); };
  }, [userCode]);

  return (
    <>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
        <div style={{ fontSize:11, fontWeight:600, color:C.muted }}>
          {total !== null ? `${total} joueur${total>1?'s':''}` : '…'}
        </div>
      </div>

      {/* Carte sticky : mon rang Cookies */}
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
          <div style={{
            fontSize:15, fontWeight:800, color:'#fff',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            /* null en 3e arg : on cache les titres color shimmer dans le
               classement (gardés réservés au profil). Seuls Créateur et
               Légende Vivante restent visibles ici (badges signature). */
            ...(getNameStyle(userName, earnedAchievements, null) || {}),
          }}>
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
            <CookiesRow
              key={p.user_code}
              rank={i + 1}
              p={p}
              isMe={p.user_code === userCode}
              onOpenUserProfile={onOpenUserProfile}
              C={C}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════
   Vue Marché — tri par shares (BRIEF_CLASSEMENT_MARCHE)
═══════════════════════════════════════════════════════ */
function MarketView({ userCode, userName, userAvatar, earnedAchievements, activeTitle, isAdmin, onOpenProfile, onOpenUserProfile, C }){
  const cached = loadCache(CACHE_KEY_MARKET);
  const [list,    setList]    = useState(cached?.list  ?? []);
  const [myRank,  setMyRank]  = useState(cached?.myRank ?? null);
  const [total,   setTotal]   = useState(cached?.total ?? null);
  const [myShares,setMyShares]= useState(cached?.myShares ?? 0);
  const [price,   setPrice]   = useState(cached?.price ?? 100);
  const [loading, setLoading] = useState(!cached);
  const aliveRef = useRef(true);

  useEffect(()=>{
    aliveRef.current = true;

    const fetchAll = async () => {
      const [leaderboard, rank, count, state] = await Promise.all([
        getMarketLeaderboard(50),
        userCode ? getMyMarketRank(userCode) : Promise.resolve(null),
        getMarketTraderCount(),
        getMarketState(),
      ]);
      if(!aliveRef.current) return;
      const currentPrice = state?.current_price ?? 100;
      /* Mes shares : trouvées dans le top, sinon 0 (ou hors top mais
         possède quand même → pas critique pour la carte sticky qui
         affiche surtout le rang). */
      const me = leaderboard.find(p => p.user_code === userCode);
      const mineShares = me?.shares ?? 0;

      setList(leaderboard);
      setMyRank(rank);
      setTotal(count);
      setMyShares(mineShares);
      setPrice(currentPrice);
      setLoading(false);
      saveCache(CACHE_KEY_MARKET, {
        list:leaderboard, myRank:rank, total:count,
        myShares:mineShares, price:currentPrice,
      });
    };

    fetchAll();
    const id = setInterval(fetchAll, REFRESH_MS);
    return ()=>{ aliveRef.current = false; clearInterval(id); };
  }, [userCode]);

  const myValue = Math.floor(myShares * price);

  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, letterSpacing:1 }}>
          $CKM · {price.toFixed(0)} 🍪
        </div>
        <div style={{ fontSize:11, fontWeight:600, color:C.muted }}>
          {total !== null ? `${total} trader${total>1?'s':''}` : '…'}
        </div>
      </div>

      {/* Carte sticky : mon rang Marché */}
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
          <div style={{ fontSize:10, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:2, fontWeight:700 }}>Ton rang trader</div>
          <div style={{
            fontSize:15, fontWeight:800, color:'#fff',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            /* null en 3e arg : on cache les titres color shimmer dans le
               classement (gardés réservés au profil). Seuls Créateur et
               Légende Vivante restent visibles ici (badges signature). */
            ...(getNameStyle(userName, earnedAchievements, null) || {}),
          }}>
            {userName || 'Joueur'}
          </div>
          {!isAdmin && myShares > 0 && (
            <div style={{ fontSize:10, color:'rgba(240,192,80,.85)', fontWeight:700, marginTop:2 }}>
              {myShares} action{myShares>1?'s':''} · {myValue.toLocaleString('fr-FR')} 🍪
            </div>
          )}
        </div>
        <div style={{ textAlign:'right' }}>
          {isAdmin ? (
            <>
              <div style={{ fontSize:14, fontWeight:900, color:'#F0C050', lineHeight:1.1 }}>Admin</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.55)' }}>hors classement</div>
            </>
          ) : myRank === null ? (
            <>
              <div style={{ fontSize:14, fontWeight:900, color:'#F0C050', lineHeight:1.1 }}>—</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.55)' }}>aucune action</div>
            </>
          ) : (
            <>
              <div style={{ fontSize:28, fontWeight:900, color:'#F0C050', lineHeight:1, letterSpacing:'-1px' }}>
                #{myRank}
              </div>
              {total !== null && (
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
          Aucun trader pour l'instant. <br/>
          <span style={{ fontSize:11, color:C.muted }}>Va dans l'onglet Marché et achète tes premières actions $CKM.</span>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {list.map((p, i) => (
            <MarketRow
              key={p.user_code}
              rank={i + 1}
              p={p}
              price={price}
              isMe={p.user_code === userCode}
              onOpenUserProfile={onOpenUserProfile}
              C={C}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* Une ligne du classement Cookies. Tous les rangs en #N (pas d'emojis
   médaille). Seul le 1er a une bannière distincte : gradient or doux +
   bordure dorée + petit pictogramme 🏆. Mon profil garde une bordure
   dorée et un ✦ après le nom. Top 1 (s'il n'est pas moi) → cliquable. */
function CookiesRow({ rank, p, isMe, onOpenUserProfile, C }){
  const isFirst = rank === 1;
  const clickable = isFirst && !isMe && !!onOpenUserProfile;

  return (
    <div
      onClick={clickable ? () => onOpenUserProfile(p.user_code) : undefined}
      style={{
        display:'flex', alignItems:'center', gap:12,
        padding:'12px 14px', borderRadius:14,
        background: isFirst ? 'linear-gradient(135deg,#FBEFD4,#F0C050)' : C.card,
        border: (isFirst || isMe) ? '2px solid #D4A017' : `1px solid ${C.border}`,
        boxShadow: isFirst ? '0 6px 18px rgba(212,160,23,.28)' : 'none',
        position:'relative',
        cursor: clickable ? 'pointer' : 'default',
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
      <AvatarFigure value={p.user_avatar} size={40} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
          <span style={{
            fontSize:13, fontWeight:800,
            color: isFirst ? '#3D2010' : C.text,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            ...(!isFirst ? (getNameStyle(p.user_name, p.earned_achievements, null) || {}) : {}),
          }}>
            {p.user_name}{isMe && ' ✦'}
          </span>
          {(p.prestige_level || 0) > 0 && (
            <span title={`Prestige ${p.prestige_level} · multiplicateur x${(1 + p.prestige_level * 0.1).toFixed(1)}`} style={{ fontSize:11, fontWeight:800, color:isFirst ? '#5C3614' : '#D4A017', letterSpacing:.3 }}>
              {p.prestige_level <= 5 ? '👑'.repeat(p.prestige_level) : `👑×${p.prestige_level}`}
            </span>
          )}
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
      {clickable && (
        <span aria-hidden style={{ fontSize:14, color:'#5D3A1F', opacity:.8, lineHeight:1, marginLeft:2 }}>
          👁️
        </span>
      )}
    </div>
  );
}

/* Une ligne du classement Marché. Même charte que CookiesRow : top 1
   doré (bandeau 📈 Top trader), mon profil bordure dorée + ✦. À droite :
   nombre d'actions + valeur estimée au prix courant en sous-titre. */
function MarketRow({ rank, p, price, isMe, onOpenUserProfile, C }){
  const isFirst = rank === 1;
  const clickable = isFirst && !isMe && !!onOpenUserProfile;
  const value = Math.floor(p.shares * price);

  return (
    <div
      onClick={clickable ? () => onOpenUserProfile(p.user_code) : undefined}
      style={{
        display:'flex', alignItems:'center', gap:12,
        padding:'12px 14px', borderRadius:14,
        background: isFirst ? 'linear-gradient(135deg,#FBEFD4,#F0C050)' : C.card,
        border: (isFirst || isMe) ? '2px solid #D4A017' : `1px solid ${C.border}`,
        boxShadow: isFirst ? '0 6px 18px rgba(212,160,23,.28)' : 'none',
        position:'relative',
        cursor: clickable ? 'pointer' : 'default',
      }}>
      {isFirst && (
        <span style={{
          position:'absolute', top:-9, right:12,
          padding:'2px 9px', borderRadius:8,
          background:'#3D2010', color:'#F0C050',
          fontSize:9, fontWeight:900, letterSpacing:1, textTransform:'uppercase',
          border:'1px solid rgba(212,160,23,.5)',
        }}>
          📈 Top trader
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
      <AvatarFigure value={p.user_avatar} size={40} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
          <span style={{
            fontSize:13, fontWeight:800,
            color: isFirst ? '#3D2010' : C.text,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            ...(!isFirst ? (getNameStyle(p.user_name, p.earned_achievements, null) || {}) : {}),
          }}>
            {p.user_name}{isMe && ' ✦'}
          </span>
          {(p.prestige_level || 0) > 0 && (
            <span title={`Prestige ${p.prestige_level} · multiplicateur x${(1 + p.prestige_level * 0.1).toFixed(1)}`} style={{ fontSize:11, fontWeight:800, color:isFirst ? '#5C3614' : '#D4A017', letterSpacing:.3 }}>
              {p.prestige_level <= 5 ? '👑'.repeat(p.prestige_level) : `👑×${p.prestige_level}`}
            </span>
          )}
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:.4, color: isFirst ? 'rgba(61,32,16,.7)' : C.muted }}>
            Niv.{p.level}
          </span>
        </div>
        <div style={{ fontSize:10, fontWeight:600, color: isFirst ? 'rgba(61,32,16,.7)' : C.muted }}>
          ≈ {value.toLocaleString('fr-FR')} 🍪
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:15, fontWeight:900, lineHeight:1, color: isFirst ? '#5D3A1F' : '#D4A017' }}>
          {p.shares.toLocaleString('fr-FR')}
        </div>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:.5, color: isFirst ? 'rgba(61,32,16,.65)' : C.muted }}>
          📈 action{p.shares>1?'s':''}
        </div>
      </div>
      {clickable && (
        <span aria-hidden style={{ fontSize:14, color:'#5D3A1F', opacity:.8, lineHeight:1, marginLeft:2 }}>
          👁️
        </span>
      )}
    </div>
  );
}

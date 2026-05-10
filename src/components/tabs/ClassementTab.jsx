import { useEffect, useRef, useState } from "react";
import { ESPRESSO } from "../../data/themes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { isSupabaseEnabled } from "../../lib/supabase.js";
import { getLeaderboard, getMyRank, getTotalPlayers, getOnlineCount, ONLINE_WINDOW_MS } from "../../lib/supabaseSync.js";
import { getCurrentWeekId, getNextResetAt, formatTimeUntil } from "../../lib/weeklyCycle.js";
import { isSanctionPublic } from "../../data/sanctions.js";
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
/* Bump v2 : on est revenu sur un classement par total_earned au lieu
   de weekly_earned. Le cache v1 contenait des `weekly_earned`/myRank
   weekly qui ne correspondent plus à ce qui est rendu — invalidation
   forcée en changeant la clé. */
const CACHE_KEY_COOKIES = 'leaderboard:cache:v2';
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
  const [online,  setOnline]  = useState(cached?.online ?? null);
  const [loading, setLoading] = useState(!cached);
  const aliveRef = useRef(true);

  useEffect(()=>{
    aliveRef.current = true;

    const fetchAll = async () => {
      const weekId = getCurrentWeekId();
      const [leaderboard, rank, count, onlineN] = await Promise.all([
        getLeaderboard(50, weekId),
        userCode ? getMyRank(userCode, weekId) : Promise.resolve(null),
        getTotalPlayers(),
        getOnlineCount(),
      ]);
      if(!aliveRef.current) return;
      setList(leaderboard);
      setMyRank(rank);
      setTotal(count);
      setOnline(onlineN);
      setLoading(false);
      saveCache(CACHE_KEY_COOKIES, { list:leaderboard, myRank:rank, total:count, online:onlineN });
    };

    fetchAll();
    const id = setInterval(fetchAll, REFRESH_MS);
    return ()=>{ aliveRef.current = false; clearInterval(id); };
  }, [userCode]);

  /* Countdown vers le prochain reset (vendredi 18 h UTC) — refresh /min */
  const [countdown, setCountdown] = useState(() => formatTimeUntil(getNextResetAt()));
  useEffect(() => {
    const id = setInterval(() => setCountdown(formatTimeUntil(getNextResetAt())), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{
          fontSize:10, fontWeight:800, color:C.muted, letterSpacing:1.5,
          textTransform:'uppercase',
        }}>
          📅 Cycle hebdo
        </div>
        <div style={{ fontSize:11, fontWeight:600, color:C.muted, display:'flex', alignItems:'center', gap:8 }}>
          {online != null && online > 0 && (
            <span title={`${online} joueur${online>1?'s':''} actif${online>1?'s':''} dans les 3 dernières minutes`} style={{
              display:'inline-flex', alignItems:'center', gap:4,
              padding:'2px 7px', borderRadius:9,
              background:'linear-gradient(135deg, rgba(212,160,23,.18), rgba(193,127,60,.18))',
              border:'1px solid rgba(212,160,23,.45)',
              color:'#D4A017', fontWeight:800, letterSpacing:.2,
            }}>
              <span style={{
                width:6, height:6, borderRadius:'50%',
                background:'#D4A017',
                boxShadow:'0 0 6px rgba(212,160,23,.7)',
                animation:'pulse-dot 1.6s ease-in-out infinite',
              }} />
              {online} en ligne
            </span>
          )}
          <span>{total !== null ? `${total} joueur${total>1?'s':''}` : '…'}</span>
        </div>
      </div>

      {/* Bandeau countdown vers le prochain reset (vendredi 18 h UTC) */}
      <div style={{
        background:'linear-gradient(135deg, rgba(212,160,23,.12), rgba(193,127,60,.18))',
        border:'1.5px solid rgba(212,160,23,.45)',
        borderRadius:12,
        padding:'10px 14px',
        marginBottom:14,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        gap:10,
      }}>
        <div style={{ fontSize:11, color:C.text, lineHeight:1.4 }}>
          <strong style={{ color:'#D4A017' }}>Reset dans {countdown}</strong>
          <div style={{ fontSize:9.5, color:C.muted, marginTop:1 }}>
            Top 3 → cafés ☕ + badge Champion
          </div>
        </div>
        <div style={{ fontSize:22, lineHeight:1 }}>🏆</div>
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

/* Style du bandeau podium (top 1-3) — palette espresso dégradée du
   plus foncé (1er) au plus clair (3e) avec bord doré → cuivre → caramel.
   Texte crème/or sur fond espresso pour lisibilité maximale.
   Retourne null si rang > 3 → ligne standard. */
function getRankBannerStyle(rank){
  if(rank === 1) return {
    bg:           'linear-gradient(135deg, #6B3D20 0%, #8B5A2B 50%, #6B3D20 100%)',
    border:       '2px solid #D4A017',
    boxShadow:    '0 6px 22px rgba(107,61,32,.4), 0 0 18px rgba(212,160,23,.4)',
    nameColor:    '#FFF5E0',
    metaColor:    'rgba(255,245,224,.85)',
    valueColor:   '#FFE5A0',
    rankColor:    '#FFE066',
    badgeBg:      '#4A2C17',
    badgeColor:   '#FFE066',
    badgeBorder:  'rgba(212,160,23,.7)',
  };
  if(rank === 2) return {
    bg:           'linear-gradient(135deg, #8B5A2B 0%, #A0784E 50%, #8B5A2B 100%)',
    border:       '2px solid #C17F3C',
    boxShadow:    '0 4px 16px rgba(139,90,43,.35)',
    nameColor:    '#FFF5E0',
    metaColor:    'rgba(255,245,224,.85)',
    valueColor:   '#FFE066',
    rankColor:    '#FFE066',
    badgeBg:      '#5C3317',
    badgeColor:   '#FFE066',
    badgeBorder:  'rgba(193,127,60,.7)',
  };
  if(rank === 3) return {
    bg:           'linear-gradient(135deg, #A0784E 0%, #C17F3C 50%, #A0784E 100%)',
    border:       '2px solid #D4A017',
    boxShadow:    '0 4px 14px rgba(160,120,78,.32)',
    nameColor:    '#FFF5E0',
    metaColor:    'rgba(255,245,224,.85)',
    valueColor:   '#FFE066',
    rankColor:    '#FFE5A0',
    badgeBg:      '#6B3D20',
    badgeColor:   '#FFE066',
    badgeBorder:  'rgba(212,160,23,.6)',
  };
  return null;
}

/* Une ligne du classement Cookies. Top 1-3 ont chacun leur bannière
   espresso distincte (cf getRankBannerStyle). Mon profil garde une
   bordure dorée et un ✦ après le nom. Top 1 (s'il n'est pas moi)
   → cliquable. */
function CookiesRow({ rank, p, isMe, onOpenUserProfile, C }){
  const isFirst = rank === 1;
  const banner  = getRankBannerStyle(rank);   // null si rank > 3
  const clickable = isFirst && !isMe && !!onOpenUserProfile;
  const badgeLabel = rank === 1 ? '🏆 Champion' : rank === 2 ? '🥈 Vice-champion' : rank === 3 ? '🥉 Podium' : null;

  return (
    <div
      onClick={clickable ? () => onOpenUserProfile(p.user_code) : undefined}
      style={{
        display:'flex', alignItems:'center', gap:12,
        padding:'12px 14px', borderRadius:14,
        background: banner ? banner.bg : C.card,
        border: banner ? banner.border : (isMe ? '2px solid #D4A017' : `1px solid ${C.border}`),
        boxShadow: banner ? banner.boxShadow : 'none',
        position:'relative',
        cursor: clickable ? 'pointer' : 'default',
      }}>
      {banner && badgeLabel && (
        <span style={{
          position:'absolute', top:-9, right:12,
          padding:'2px 9px', borderRadius:8,
          background: banner.badgeBg, color: banner.badgeColor,
          fontSize:9, fontWeight:900, letterSpacing:1, textTransform:'uppercase',
          border:`1px solid ${banner.badgeBorder}`,
        }}>
          {badgeLabel}
        </span>
      )}
      <div style={{
        flexShrink:0, width:32, textAlign:'center',
        fontSize:13, fontWeight:900,
        color: banner ? banner.rankColor : C.muted,
        lineHeight:1,
      }}>
        #{rank}
      </div>
      {(() => {
        /* Pastille en ligne — caramel pulse en bas-droite de l'avatar
           si last_active < ONLINE_WINDOW_MS. Affiché aussi pour soi. */
        const lastMs = p.last_active ? new Date(p.last_active).getTime() : 0;
        const isOnline = lastMs > 0 && (Date.now() - lastMs) < ONLINE_WINDOW_MS;
        return (
          <div style={{ position:'relative', flexShrink:0, lineHeight:0 }}>
            <AvatarFigure value={p.user_avatar} size={40} />
            {isOnline && (
              <span
                title="En ligne"
                style={{
                  position:'absolute', right:-2, bottom:0,
                  width:11, height:11, borderRadius:'50%',
                  background:'#D4A017',
                  border:'2px solid #2A1408',
                  boxShadow:'0 0 6px rgba(212,160,23,.85)',
                  animation:'pulse-dot 1.6s ease-in-out infinite',
                }}
              />
            )}
          </div>
        );
      })()}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
          <span style={{
            flex:'1 1 auto', minWidth:0,
            fontSize:13, fontWeight:800,
            color: banner ? banner.nameColor : C.text,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            ...(!banner ? (getNameStyle(p.user_name, p.earned_achievements, null) || {}) : {}),
          }}>
            {p.user_name}{isMe && ' ✦'}
          </span>
          {isSanctionPublic(p.user_code) && (
            <span
              title="Compte sanctionné — manipulation de marché"
              style={{ fontSize:12, lineHeight:1, flexShrink:0 }}
            >
              ⚠️
            </span>
          )}
          {(p.prestige_level || 0) > 0 && (
            <span title={`Prestige ${p.prestige_level} · multiplicateur x${(1 + p.prestige_level * 0.1).toFixed(1)}`} style={{ fontSize:11, fontWeight:800, color: banner ? banner.valueColor : '#D4A017', letterSpacing:.3, flexShrink:0 }}>
              {p.prestige_level <= 5 ? '👑'.repeat(p.prestige_level) : `👑×${p.prestige_level}`}
            </span>
          )}
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:.4, color: banner ? banner.metaColor : C.muted, flexShrink:0 }}>
            Niv.{p.level}
          </span>
        </div>
        {p.streak > 0 && (
          <div style={{ fontSize:10, fontWeight:600, color: banner ? banner.metaColor : C.muted }}>
            🔥 {p.streak}j de série
          </div>
        )}
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:15, fontWeight:900, lineHeight:1, color: banner ? banner.valueColor : '#D4A017' }}>
          {(p.total_earned ?? 0).toLocaleString('fr-FR')}
        </div>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:.5, color: banner ? banner.metaColor : C.muted }}>🍪 au total</div>
      </div>
      {clickable && (
        <span aria-hidden style={{ fontSize:14, color: banner?.valueColor || '#D4A017', opacity:.8, lineHeight:1, marginLeft:2 }}>
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
  const banner  = getRankBannerStyle(rank);
  const clickable = isFirst && !isMe && !!onOpenUserProfile;
  const value = Math.floor(p.shares * price);
  const badgeLabel = rank === 1 ? '📈 Top trader' : rank === 2 ? '📊 2e trader' : rank === 3 ? '📉 3e trader' : null;

  return (
    <div
      onClick={clickable ? () => onOpenUserProfile(p.user_code) : undefined}
      style={{
        display:'flex', alignItems:'center', gap:12,
        padding:'12px 14px', borderRadius:14,
        background: banner ? banner.bg : C.card,
        border: banner ? banner.border : (isMe ? '2px solid #D4A017' : `1px solid ${C.border}`),
        boxShadow: banner ? banner.boxShadow : 'none',
        position:'relative',
        cursor: clickable ? 'pointer' : 'default',
      }}>
      {banner && badgeLabel && (
        <span style={{
          position:'absolute', top:-9, right:12,
          padding:'2px 9px', borderRadius:8,
          background: banner.badgeBg, color: banner.badgeColor,
          fontSize:9, fontWeight:900, letterSpacing:1, textTransform:'uppercase',
          border:`1px solid ${banner.badgeBorder}`,
        }}>
          {badgeLabel}
        </span>
      )}
      <div style={{
        flexShrink:0, width:32, textAlign:'center',
        fontSize:13, fontWeight:900,
        color: banner ? banner.rankColor : C.muted,
        lineHeight:1,
      }}>
        #{rank}
      </div>
      {(() => {
        /* Pastille en ligne — caramel pulse en bas-droite de l'avatar
           si last_active < ONLINE_WINDOW_MS. Affiché aussi pour soi. */
        const lastMs = p.last_active ? new Date(p.last_active).getTime() : 0;
        const isOnline = lastMs > 0 && (Date.now() - lastMs) < ONLINE_WINDOW_MS;
        return (
          <div style={{ position:'relative', flexShrink:0, lineHeight:0 }}>
            <AvatarFigure value={p.user_avatar} size={40} />
            {isOnline && (
              <span
                title="En ligne"
                style={{
                  position:'absolute', right:-2, bottom:0,
                  width:11, height:11, borderRadius:'50%',
                  background:'#D4A017',
                  border:'2px solid #2A1408',
                  boxShadow:'0 0 6px rgba(212,160,23,.85)',
                  animation:'pulse-dot 1.6s ease-in-out infinite',
                }}
              />
            )}
          </div>
        );
      })()}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
          <span style={{
            flex:'1 1 auto', minWidth:0,
            fontSize:13, fontWeight:800,
            color: banner ? banner.nameColor : C.text,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            ...(!banner ? (getNameStyle(p.user_name, p.earned_achievements, null) || {}) : {}),
          }}>
            {p.user_name}{isMe && ' ✦'}
          </span>
          {isSanctionPublic(p.user_code) && (
            <span
              title="Compte sanctionné — manipulation de marché"
              style={{ fontSize:12, lineHeight:1, flexShrink:0 }}
            >
              ⚠️
            </span>
          )}
          {(p.prestige_level || 0) > 0 && (
            <span title={`Prestige ${p.prestige_level} · multiplicateur x${(1 + p.prestige_level * 0.1).toFixed(1)}`} style={{ fontSize:11, fontWeight:800, color: banner ? banner.valueColor : '#D4A017', letterSpacing:.3, flexShrink:0 }}>
              {p.prestige_level <= 5 ? '👑'.repeat(p.prestige_level) : `👑×${p.prestige_level}`}
            </span>
          )}
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:.4, color: banner ? banner.metaColor : C.muted, flexShrink:0 }}>
            Niv.{p.level}
          </span>
        </div>
        <div style={{ fontSize:10, fontWeight:600, color: banner ? banner.metaColor : C.muted }}>
          ≈ {value.toLocaleString('fr-FR')} 🍪
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:15, fontWeight:900, lineHeight:1, color: banner ? banner.valueColor : '#D4A017' }}>
          {p.shares.toLocaleString('fr-FR')}
        </div>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:.5, color: banner ? banner.metaColor : C.muted }}>
          📈 action{p.shares>1?'s':''}
        </div>
      </div>
      {clickable && (
        <span aria-hidden style={{ fontSize:14, color: banner?.valueColor || '#D4A017', opacity:.8, lineHeight:1, marginLeft:2 }}>
          👁️
        </span>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESPRESSO, GOLD } from "../../data/themes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { isSupabaseEnabled } from "../../lib/supabase.js";
import { getLeaderboard, getMyRank, getAllTimeLeaderboard, getMyAllTimeRank, getTotalPlayers, getOnlineCount, ONLINE_WINDOW_MS } from "../../lib/supabaseSync.js";
import { getCurrentWeekId, getNextResetAt, formatTimeUntil, MANUAL_RESET_WEEK_ID } from "../../lib/weeklyCycle.js";
import { WeeklyResetNoticeModal } from "../modals/WeeklyResetNoticeModal.jsx";
import { isSanctionPublic } from "../../data/sanctions.js";
import {
  getMarketLeaderboard, getMyMarketRank, getMarketTraderCount, getMarketState,
} from "../../lib/market.js";
import { getNameStyle } from "../../utils/legend.js";
import { isAdminName } from "../../utils/admin.js";
import SkeletonRow from "../SkeletonRow.jsx";
import { useTranslation } from "../../i18n/index.js";
import { useLocalStorage } from "../../hooks/useLocalStorage.js";

/* ════════════════════════════════════════════════════
   ClassementTab — 2 classements en un seul onglet
   ────────────────────────────────────────────────────
   Toggle 🍪 Cookies / 📈 Marché en haut. Les 2 vues partagent
   la même structure : carte sticky "ton rang" + liste top N.

   Vue Cookies (existante) : classement HEBDO — tri par weekly_earned
   décroissant, filtré sur le week_id courant (reset chaque vendredi).
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
/* Bump v5 (2026-05-25) : la vue weekly filtre strictement les joueurs
   ayant gagné > 0 cookies cette semaine (au lieu de les afficher à 0
   départagés par niveau). L'ancien cache contenait ces inactifs — il
   faut l'invalider pour ne pas montrer un état périmé pendant le 1er
   fetch après la mise à jour. */
const CACHE_KEY_COOKIES = 'leaderboard:cache:v5';
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
  const { t } = useTranslation();
  const enabled = isSupabaseEnabled();
  const isAdmin = isAdminName(userName);
  const [mode, setMode] = useState('cookies'); /* 'cookies' | 'market' */

  /* Cas Supabase off : placeholder, pas de bots fictifs */
  if(!enabled){
    return (
      <div className="su" style={{ paddingTop:4 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:14 }}>{t('leaderboard.title')}</div>
        <div style={{
          background:'rgba(193,127,60,.08)',
          border:`2px dashed ${C.border}`,
          borderRadius:18, padding:'30px 22px', textAlign:'center',
        }}>
          <div style={{ fontSize:42, marginBottom:8 }}>🔌</div>
          <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:6 }}>{t('leaderboard.offline')}</div>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>
            Le classement nécessite une connexion réseau. Réessaie plus tard.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="su" style={{ paddingTop:4, paddingBottom:8 }}>
      <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:12 }}>{t('leaderboard.title')}</div>

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

/* Sous-toggle de la vue Cookies : cumul (défaut) / hebdo. */
function CookiesSubToggle({ view, setView, C }){
  const segs = [
    { id:'alltime', label:'🏆 Depuis le début' },
    { id:'weekly',  label:'📅 Cette semaine'  },
  ];
  return (
    <div style={{
      display:'flex', gap:4, marginBottom:14,
      padding:4, borderRadius:14,
      background:C.card, border:`1px solid ${C.border}`,
    }}>
      {segs.map(s => {
        const active = view === s.id;
        return (
          <button
            key={s.id}
            onClick={()=>setView(s.id)}
            style={{
              flex:1, padding:'9px 8px', borderRadius:10,
              border:'none', cursor:'pointer',
              background: active ? ESPRESSO : 'transparent',
              color: active ? '#F0C050' : C.muted,
              fontSize:11.5, fontWeight:800, letterSpacing:.3,
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
   Vue Cookies — cumul (défaut) ou hebdo (weekly_earned)
═══════════════════════════════════════════════════════ */
function CookiesView({ userCode, userName, userAvatar, earnedAchievements, activeTitle, isAdmin, onOpenProfile, onOpenUserProfile, C }){
  const { t } = useTranslation();
  /* Sous-vue : 'alltime' (cumul depuis le début — DÉFAUT) ou
     'weekly' (classement hebdo + CF podium, inchangé). */
  const [view, setView] = useLocalStorage('classementCookiesView', 'alltime');
  const cacheKey = CACHE_KEY_COOKIES + ':' + view;
  const cached = loadCache(cacheKey);
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
      const allTime = view === 'alltime';
      const [leaderboard, rank, count, onlineN] = await Promise.all([
        allTime ? getAllTimeLeaderboard(50) : getLeaderboard(50, weekId),
        userCode
          ? (allTime ? getMyAllTimeRank(userCode) : getMyRank(userCode, weekId))
          : Promise.resolve(null),
        getTotalPlayers(),
        getOnlineCount(),
      ]);
      if(!aliveRef.current) return;
      if(allTime){
        /* Cumul : le serveur ordonne déjà par total_earned desc puis
           last_active. On garde tel quel (rang = position). */
        const ranked = (leaderboard || []).map(p => ({
          ...p, _wk: p.weekly_week_id === weekId ? Number(p.weekly_earned) || 0 : 0,
        }));
        const myIdx = userCode ? ranked.findIndex(p => p.user_code === userCode) : -1;
        const effectiveRank = myIdx >= 0 ? myIdx + 1 : rank;
        setList(ranked);
        setMyRank(effectiveRank);
        setTotal(count);
        setOnline(onlineN);
        setLoading(false);
        saveCache(cacheKey, { list:ranked, myRank:effectiveRank, total:count, online:onlineN });
        return;
      }
      /* Le serveur renvoie le top par weekly_earned brut. Côté client :
           1. on calcule `_wk` : weekly_earned si la row appartient à la
              semaine courante, 0 sinon (anciens scores neutralisés)
           2. on FILTRE pour ne garder que les joueurs ayant gagné > 0
              cookies cette semaine — un classement de la semaine doit
              refléter qui a joué CETTE semaine, pas qui était bien placé
              avant le reset
           3. tri : score hebdo desc → niveau (départage à égalité) →
              activité récente (stabilisateur). Surtout PAS total_earned
              qui reproduirait l'ancien classement all-time.
         Juste après un reset, la liste est vide jusqu'au 1er gain de la
         semaine — l'UI affiche le placeholder `no_players_this_week`. */
      const lastActiveMs = p => { const t = p.last_active ? new Date(p.last_active).getTime() : 0; return Number.isFinite(t) ? t : 0; };
      const ranked = (leaderboard || [])
        .map(p => ({
          ...p,
          _wk: p.weekly_week_id === weekId ? Number(p.weekly_earned) || 0 : 0,
        }))
        .filter(p => p._wk > 0)
        .sort((a, b) =>
          b._wk - a._wk
          || (Number(b.level) || 0) - (Number(a.level) || 0)
          || lastActiveMs(b) - lastActiveMs(a)
        );
      /* Carte "ton rang" cohérente avec ce tri : si je suis dans le top
         récupéré, mon rang = ma position dans la liste triée (donc basé
         sur le niveau quand tout le monde est à 0, et je grimpe dès mon
         1er cookie de la semaine). Sinon, fallback sur le rang serveur. */
      const myIdx = userCode ? ranked.findIndex(p => p.user_code === userCode) : -1;
      const effectiveRank = myIdx >= 0 ? myIdx + 1 : rank;
      setList(ranked);
      setMyRank(effectiveRank);
      setTotal(count);
      setOnline(onlineN);
      setLoading(false);
      saveCache(cacheKey, { list:ranked, myRank:effectiveRank, total:count, online:onlineN });
    };

    fetchAll();
    const id = setInterval(fetchAll, REFRESH_MS);
    return ()=>{ aliveRef.current = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCode, view]);

  /* Au changement de sous-vue : bascule instantanément sur le cache
     de cette vue (ou skeleton) — évite d'afficher les chiffres hebdo
     sous le libellé cumul (ou l'inverse) le temps du fetch. */
  useEffect(() => {
    const c = loadCache(cacheKey);
    setList(c?.list ?? []);
    setMyRank(c?.myRank ?? null);
    setLoading(!c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  /* Countdown vers le prochain reset (vendredi 18 h UTC) — refresh /min */
  const [countdown, setCountdown] = useState(() => formatTimeUntil(getNextResetAt()));
  useEffect(() => {
    const id = setInterval(() => setCountdown(formatTimeUntil(getNextResetAt())), 60_000);
    return () => clearInterval(id);
  }, []);

  /* Modale "détails récompenses hebdo" — ouverte uniquement au clic
     sur le bandeau countdown. */
  const [showWeeklyRewards, setShowWeeklyRewards] = useState(false);

  /* Popup d'annonce "classement remis à zéro" — affiché UNE seule fois
     par reset manuel. On mémorise en LS le dernier MANUAL_RESET_WEEK_ID
     acquitté : si un nouveau reset est posé plus tard (nouvelle date),
     le popup re-pop automatiquement pour tout le monde. */
  const [ackReset, setAckReset] = useLocalStorage('weeklyResetAck', '');
  const [showResetNotice, setShowResetNotice] = useState(ackReset !== MANUAL_RESET_WEEK_ID);

  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{
          fontSize:10, fontWeight:800, color:C.muted, letterSpacing:1.5,
          textTransform:'uppercase',
        }}>
          {view === 'alltime' ? '🏆 Depuis le début' : '📅 Cycle hebdo'}
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
              {t('leaderboard.online_n', { n: online })}
            </span>
          )}
          <span>{total !== null ? t(total > 1 ? 'leaderboard.players_plural' : 'leaderboard.players_singular', { n: total }) : '…'}</span>
        </div>
      </div>

      {/* Sous-toggle : Depuis le début (cumul, défaut) / Cette semaine */}
      <CookiesSubToggle view={view} setView={setView} C={C} />

      {view === 'alltime' && (
        <div style={{
          fontSize:10.5, color:C.muted, lineHeight:1.4,
          marginBottom:14, padding:'9px 12px', borderRadius:12,
          background:C.card, border:`1px solid ${C.border}`,
        }}>
          🍪 Classement <strong style={{ color:C.text }}>depuis le début</strong> (cookies cumulés). Les ☕ se gagnent sur le podium <strong style={{ color:C.text }}>hebdomadaire</strong> → onglet « Cette semaine ».
        </div>
      )}

      {/* Bandeau countdown HEBDO — cliquable, ouvre WeeklyRewardsModal.
          Affiché seulement en sous-vue 'weekly' (cycle + CF podium). */}
      {view === 'weekly' && (
      <button
        onClick={() => setShowWeeklyRewards(true)}
        style={{
          width:'100%',
          background:'linear-gradient(135deg, rgba(212,160,23,.22), rgba(193,127,60,.36))',
          border:'1.5px solid rgba(212,160,23,.55)',
          boxShadow:'0 4px 14px rgba(212,160,23,.18)',
          borderRadius:12,
          padding:'10px 14px',
          marginBottom:14,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          gap:10,
          color:'inherit', textAlign:'left',
          cursor:'pointer',
        }}
      >
        <div style={{ fontSize:11, color:C.text, lineHeight:1.4 }}>
          <strong style={{ color:'#D4A017' }}>{t('leaderboard.reset_in', { time: countdown })}</strong>
          <div style={{ fontSize:9.5, color:C.muted, marginTop:1 }}>
            {t('leaderboard.top3_reward')} · <span style={{ textDecoration:'underline' }}>{t('leaderboard.see_details')}</span>
          </div>
        </div>
        <div style={{ fontSize:22, lineHeight:1 }}>🏆</div>
      </button>
      )}

      {view === 'weekly' && showWeeklyRewards && (
        <WeeklyRewardsModal
          countdown={countdown}
          onClose={() => setShowWeeklyRewards(false)}
          C={C}
        />
      )}

      {view === 'weekly' && showResetNotice && (
        <WeeklyResetNoticeModal
          onClose={() => {
            setShowResetNotice(false);
            setAckReset(MANUAL_RESET_WEEK_ID);
          }}
          C={C}
        />
      )}

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
          <div style={{ fontSize:10, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:2, fontWeight:700 }}>{t('leaderboard.your_rank_label')}</div>
          <div style={{
            fontSize:15, fontWeight:800, color:'#fff',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            /* null en 3e arg : on cache les titres color shimmer dans le
               classement (gardés réservés au profil). Seuls Créateur et
               Légende Vivante restent visibles ici (badges signature). */
            ...(getNameStyle(userName, earnedAchievements, null) || {}),
          }}>
            {userName || t('leaderboard.player')}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          {isAdmin ? (
            <>
              <div style={{ fontSize:14, fontWeight:900, color:'#F0C050', lineHeight:1.1 }}>{t('leaderboard.admin_label')}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.55)' }}>{t('leaderboard.outside_ranking')}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize:28, fontWeight:900, color:'#F0C050', lineHeight:1, letterSpacing:'-1px' }}>
                {myRank !== null ? `#${myRank}` : '—'}
              </div>
              {total !== null && myRank !== null && (
                <div style={{ fontSize:10, color:'rgba(255,255,255,.55)' }}>{t('leaderboard.out_of', { n: total })}</div>
              )}
            </>
          )}
        </div>
      </button>

      {/* Liste */}
      {loading && list.length === 0 ? (
        <SkeletonRow count={6} C={C} />
      ) : list.length === 0 ? (
        <div style={{
          background:C.card, border:`1px dashed ${C.border}`,
          borderRadius:14, padding:20, textAlign:'center', color:C.muted, fontSize:12,
        }}>
          {t(view === 'weekly' ? 'leaderboard.no_players_this_week' : 'leaderboard.no_players_yet')}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {list.map((p, i) => (
            <CookiesRow
              key={p.user_code}
              rank={i + 1}
              p={p}
              isMe={p.user_code === userCode}
              mode={view}
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
  const { t } = useTranslation();
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
          <div style={{ fontSize:10, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:2, fontWeight:700 }}>{t('leaderboard.your_rank_trader')}</div>
          <div style={{
            fontSize:15, fontWeight:800, color:'#fff',
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            /* null en 3e arg : on cache les titres color shimmer dans le
               classement (gardés réservés au profil). Seuls Créateur et
               Légende Vivante restent visibles ici (badges signature). */
            ...(getNameStyle(userName, earnedAchievements, null) || {}),
          }}>
            {userName || t('leaderboard.player')}
          </div>
          {!isAdmin && myShares > 0 && (
            <div style={{ fontSize:10, color:'rgba(240,192,80,.85)', fontWeight:700, marginTop:2 }}>
              {myShares} {t(myShares > 1 ? 'leaderboard.shares_plural' : 'leaderboard.shares_singular')} · {myValue.toLocaleString('fr-FR')} 🍪
            </div>
          )}
        </div>
        <div style={{ textAlign:'right' }}>
          {isAdmin ? (
            <>
              <div style={{ fontSize:14, fontWeight:900, color:'#F0C050', lineHeight:1.1 }}>{t('leaderboard.admin_label')}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.55)' }}>{t('leaderboard.outside_ranking')}</div>
            </>
          ) : myRank === null ? (
            <>
              <div style={{ fontSize:14, fontWeight:900, color:'#F0C050', lineHeight:1.1 }}>—</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.55)' }}>{t('leaderboard.no_shares')}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize:28, fontWeight:900, color:'#F0C050', lineHeight:1, letterSpacing:'-1px' }}>
                #{myRank}
              </div>
              {total !== null && (
                <div style={{ fontSize:10, color:'rgba(255,255,255,.55)' }}>{t('leaderboard.out_of', { n: total })}</div>
              )}
            </>
          )}
        </div>
      </button>

      {/* Liste */}
      {loading && list.length === 0 ? (
        <SkeletonRow count={6} C={C} />
      ) : list.length === 0 ? (
        <div style={{
          background:C.card, border:`1px dashed ${C.border}`,
          borderRadius:14, padding:20, textAlign:'center', color:C.muted, fontSize:12,
        }}>
          {t('leaderboard.no_traders_yet')} <br/>
          <span style={{ fontSize:11, color:C.muted }}>{t('leaderboard.no_shares_hint')}</span>
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
function CookiesRow({ rank, p, isMe, mode = 'weekly', onOpenUserProfile, C }){
  const { t } = useTranslation();
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
        {mode === 'alltime' ? (
          <>
            {/* Cumul : total = score principal du classement */}
            <div style={{ fontSize:15, fontWeight:900, lineHeight:1, color: banner ? banner.valueColor : '#D4A017' }}>
              {(Number(p.total_earned) || 0).toLocaleString('fr-FR')}
            </div>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:.5, color: banner ? banner.metaColor : C.muted }}>{t('leaderboard.earned_total')}</div>
            <div style={{ fontSize:9, fontWeight:600, color: banner ? banner.metaColor : C.muted, opacity:.75, marginTop:3 }}>
              {(p._wk ?? p.weekly_earned ?? 0).toLocaleString('fr-FR')} {t('leaderboard.earned_week')}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize:15, fontWeight:900, lineHeight:1, color: banner ? banner.valueColor : '#D4A017' }}>
              {(p._wk ?? p.weekly_earned ?? 0).toLocaleString('fr-FR')}
            </div>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:.5, color: banner ? banner.metaColor : C.muted }}>{t('leaderboard.earned_week')}</div>
            {/* Total cumulé en sous-info : ne compte PAS pour le rang hebdo
                mais reste visible (le joueur garde tout). */}
            <div style={{ fontSize:9, fontWeight:600, color: banner ? banner.metaColor : C.muted, opacity:.75, marginTop:3 }}>
              {(Number(p.total_earned) || 0).toLocaleString('fr-FR')} {t('leaderboard.earned_total')}
            </div>
          </>
        )}
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


/* ════════════════════════════════════════════════════
   WeeklyRewardsModal — détails des récompenses du classement
   ────────────────────────────────────────────────────
   Modale centrée (bi bounce-in), rendue via createPortal dans
   document.body pour échapper à tout containing block créé par
   un ancêtre transform/filter/backdrop-filter — sinon le
   `position:fixed inset:0` devient page-relative au lieu de
   viewport-relative et la modale tombe en bas du scroll.
═══════════════════════════════════════════════════════ */
function WeeklyRewardsModal({ countdown, onClose, C }){
  const { t } = useTranslation();
  const [closing, setClosing] = useState(false);
  const handleClose = () => {
    if(closing) return;
    setClosing(true);
    setTimeout(onClose, 200);
  };
  const PODIUM = [
    { rank:1, cafes:3, color:"#FFD24D", label:t('weekly_rewards.r1'), note:t('weekly_rewards.note1') },
    { rank:2, cafes:2, color:"#C0C0C0", label:t('weekly_rewards.r2'), note:t('weekly_rewards.note2') },
    { rank:3, cafes:1, color:"#C17F3C", label:t('weekly_rewards.r3'), note:t('weekly_rewards.note3') },
  ];
  if(typeof document === 'undefined') return null;
  return createPortal((
    <div
      onClick={handleClose}
      role="dialog"
      style={{
        position:"fixed", top:0, left:0, right:0, bottom:0, zIndex:9999,
        background:"rgba(15,8,4,.78)",
        backdropFilter:"blur(6px)",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:18,
        opacity: closing ? 0 : 1,
        transition: "opacity .2s ease-out",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bi"
        style={{
          width:"100%", maxWidth:380,
          background:C.bg,
          borderRadius:24,
          maxHeight:"85vh", display:"flex", flexDirection:"column",
          boxShadow:"0 24px 64px rgba(0,0,0,.45)",
          overflow:"hidden",
        }}
      >
        <div style={{ background:ESPRESSO, padding:"18px 22px 16px", textAlign:"center", color:"#fff" }}>
          <div style={{ fontSize:38, lineHeight:1, marginBottom:6 }}>🏆</div>
          <div style={{ fontSize:10, fontWeight:900, letterSpacing:3, textTransform:"uppercase", opacity:.75, marginBottom:3 }}>
            {t('weekly_rewards.header')}
          </div>
          <div style={{ fontSize:18, fontWeight:900, color:"#F0C050" }}>
            {t('leaderboard.reset_in', { time: countdown })}
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.7)", marginTop:6, lineHeight:1.4 }}>
            {t('weekly_rewards.subtitle')}
          </div>
        </div>

        <div style={{ padding:"18px 22px 4px", flex:1, overflowY:"auto" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
            {PODIUM.map(p => (
              <div key={p.rank} style={{
                background:C.card, border:`1.5px solid ${C.border}`,
                borderRadius:14, padding:"14px 16px",
                display:"flex", alignItems:"center", gap:14,
              }}>
                <div style={{ fontSize:24, fontWeight:900, color:p.color, minWidth:54, textAlign:"center" }}>
                  {p.label}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:900, color:C.text }}>
                    +{p.cafes} ☕
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>
                    {p.note}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            background:"linear-gradient(135deg, rgba(212,160,23,.10), rgba(193,127,60,.14))",
            border:"1px solid rgba(212,160,23,.4)",
            borderRadius:12, padding:"11px 14px",
            fontSize:11.5, color:C.text, lineHeight:1.5, marginBottom:6,
          }}>
            🏅 <strong>{t('weekly_rewards.badge_strong')}</strong> {t('weekly_rewards.badge_rest')}
          </div>
          <div style={{ fontSize:10.5, color:C.muted, fontStyle:"italic", textAlign:"center", marginTop:12, padding:"0 10px", lineHeight:1.5 }}>
            {t('weekly_rewards.footnote')}
          </div>
        </div>

        <div style={{ padding:"14px 22px 20px", flexShrink:0 }}>
          <button
            onClick={handleClose}
            style={{
              width:"100%", padding:"12px 0", borderRadius:14,
              background:GOLD, color:"#fff", border:"none",
              fontSize:14, fontWeight:900, letterSpacing:.4,
              boxShadow:"0 4px 14px rgba(212,160,23,.35)",
              cursor:"pointer",
            }}
          >
            {t('weekly_rewards.cta')}
          </button>
        </div>
      </div>
    </div>
  ), document.body);
}

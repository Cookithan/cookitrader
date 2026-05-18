import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, Cookie } from "lucide-react";
import { GOLD } from "../../data/themes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import BossCake from "../BossCake.jsx";
import { playSound } from "../../lib/audio.js";
import {
  formatBossTimeLeft,
  fourneeNumber,
  bossRewardFor,
  BOOST_COST_COOKIES,
  FREE_DMG,
  BOOST_DMG,
  SUPER_COST_CF,
  SUPER_DMG,
  SUPER_DOWN_MS,
} from "../../data/communityEvents.js";

/* ════════════════════════════════════════════════════
   BossEventOverlay — Le Gâteau Géant (plein écran, z-index 55)
   ────────────────────────────────────────────────────
   Visuel = BRIEF_BOSS_COMMUNAUTAIRE.md (layout phase 5 / BossPage)
   appliqué sur la LOGIQUE EXISTANTE (hook useCommunityBoss, tables
   community_boss_events, claim App.jsx) — choix Régis : on garde
   l'archi en place, on ne reprend QUE le visuel du brief.

   Adaptations assumées vs brief :
     · cartes externes en couleurs de thème C (pas de blanc/texte
       sombre hardcodés → ne casse pas le thème nuit) ; le panneau
       boss reste le dégradé café sombre du brief.
     · pas de flash blanc plein écran (Régis l'a explicitement rejeté
       — feedback = recoil + miettes + chiffre + impact barre).
     · 🤎 au lieu de ❤️ (rouge interdit, CLAUDE.md #10).
     · podium = layout 3 colonnes surélevé du brief, mais avec les
       vrais avatars (AvatarFigure) au lieu des initiales.

   Props :
   - boss, myDamage, contributorCount, activity{top,recent}
   - attacking, cooldownLeftMs, coins
   - onAttack(boost), onClose, C  (C.muted = texte secondaire)
═══════════════════════════════════════════════════════ */

function relTime(ms){
  if(!ms) return '';
  const d = Math.max(0, Date.now() - ms);
  if(d < 8000)   return "à l'instant";
  if(d < 60000)  return `il y a ${Math.floor(d/1000)}s`;
  if(d < 3600000)return `il y a ${Math.floor(d/60000)} min`;
  return `il y a ${Math.floor(d/3600000)} h`;
}

const CRUMB_COLORS = ['#5C3317', '#7D4E1F', '#A57021', '#4A2C17'];

/* Hash déterministe → [0,1). Sert au "roam" : tous les clients
   calculent le MÊME déplacement (même boss + même heure murale)
   sans aucun aller-retour serveur. */
function seeded(n){
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
const ROAM_PERIOD = 22000;   // un cycle = 22 s
const ROAM_HOLD   = 10000;   // 10 s décalé à gauche/droite, le reste centré

export function BossEventOverlay({
  boss, myDamage, contributorCount, activity,
  attacking, cooldownLeftMs, coins, cafes, bossReward, bossPenalty, isAdmin, onAttack, onClose, C,
}){
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /* Feedback local d'attaque */
  const [hits, setHits]     = useState([]);   // chiffres de dégâts flottants
  const [crumbs, setCrumbs] = useState([]);   // miettes projetées (brief)
  const [hitKey, setHitKey] = useState(0);    // relance l'impact barre
  const [atk, setAtk]       = useState(false); // recoil léger (tap gratuit)
  const [stun, setStun]     = useState(false); // boost : figé + vibre sur place
  const [ghost, setGhost]   = useState(null); // segment PV perdu
  const [down, setDown]     = useState(null); // null|'falling'|'down'|'getup' (frappe ultime)
  const prevHpRef = useRef(boss?.bossHp ?? 0);
  const downRef   = useRef(false);
  const lastOwnTapRef = useRef(0);   // ts du dernier tap LOCAL (≠ autres joueurs)
  downRef.current = down != null;

  const { milestone, bossHp, bossMaxHp, status, endsAt, startsAt } = boss || {};
  const hpPct  = bossMaxHp > 0 ? Math.max(0, Math.min(1, bossHp / bossMaxHp)) : 0;
  const msLeft = Math.max(0, (endsAt || 0) - now);
  /* Phase d'annonce : boss créé mais pas encore attaquable
     (avant starts_at). On affiche un compte à rebours. */
  const announceLeft = Math.max(0, (startsAt || 0) - now);
  const announcing   = status === 'active' && announceLeft > 0;
  const reward = bossRewardFor(myDamage);
  const fNum   = fourneeNumber(milestone);
  const onCd   = cooldownLeftMs > 0;
  const canBoost = coins >= BOOST_COST_COOKIES;
  const canSuper = (cafes || 0) >= SUPER_COST_CF;
  const busy   = onCd || attacking || down != null;   // attaque indisponible
  const isActive = status === 'active' && msLeft > 0 && !announcing;
  const top    = activity?.top    || [];
  const recent = activity?.recent || [];

  useEffect(() => {
    if(bossMaxHp <= 0) return;
    const prev = prevHpRef.current;
    if(bossHp < prev){
      setGhost({
        key: Date.now(),
        fromPct: Math.min(1, prev / bossMaxHp) * 100,
        toPct:   Math.min(1, bossHp / bossMaxHp) * 100,
      });
      /* Baisse de PV non provoquée par MON tap (>1.5 s) → c'est un
         AUTRE joueur. On DEVINE le type de coup d'après l'ampleur
         de la baisse et on joue la bonne réaction (recoil / figé /
         KO) → le spectateur voit la même chose que l'attaquant.
         Pas pendant le KO local. */
      if(!downRef.current && Date.now() - lastOwnTapRef.current > 1500){
        const delta = prev - bossHp;
        const k = delta >= SUPER_DMG * 0.9 ? 'super'
                : delta >= BOOST_DMG * 0.9 ? 'boost'
                : 'tap';
        playReaction(k, delta, false);   // pas de chiffre "−X" chez le spectateur
      }
    }
    prevHpRef.current = bossHp;
  }, [bossHp, bossMaxHp]);

  /* "Balade" DÉTERMINISTE : cycle de 22 s (12 s centré, puis 10 s
     décalé à gauche/droite). Côté & amplitude tirés d'un hash de
     (milestone + n° de cycle) → TOUS les clients calculent le même
     mouvement, sans backend. Coupé pendant le KO et hors combat. */
  const roamPhase = Math.floor(now / ROAM_PERIOD);
  const roamX = (() => {
    if(!isActive || down != null) return 0;       // pas de mouvement en KO
    if((now % ROAM_PERIOD) < (ROAM_PERIOD - ROAM_HOLD)) return 0; // phase centrée
    const dir = seeded((milestone || 0) + roamPhase) < 0.5 ? -1 : 1;
    const mag = 34 + Math.floor(seeded(roamPhase * 2 + 7) * 26);  // ±34..60px
    return dir * mag;
  })();

  /* Miettes projetées en éventail (logique du brief : spawnCrumbs) */
  const spawnCrumbs = useCallback(() => {
    const batch = [];
    for(let i = 0; i < 8; i++){
      const angle = Math.random() * Math.PI * 2;
      const dist  = 50 + Math.random() * 80;
      const tx    = Math.cos(angle) * dist;
      const ty    = Math.sin(angle) * dist + 30;
      const rot   = Math.random() * 720 - 360;
      batch.push({
        id: Date.now() + '-' + i + '-' + Math.random(),
        color: CRUMB_COLORS[i % 4],
        end: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
        delay: Math.random() * 0.1,
      });
    }
    setCrumbs(c => [...c, ...batch]);
    setTimeout(() => setCrumbs(c => c.slice(batch.length)), 900);
  }, []);

  /* Réaction VISUELLE du gâteau selon le type de coup. Utilisée pour
     MON tap ET pour les coups des AUTRES joueurs (spectateur) → on
     voit la bonne anim (recoil / figé+vibre / KO) chez tout le monde. */
  const playReaction = useCallback((kind, val, showNumber = true) => {
    /* showNumber=false pour les coups des AUTRES joueurs : on garde
       la réaction du gâteau + le flash de barre, mais PAS le chiffre
       "−X" flottant (qui n'a de sens que pour TON propre coup). */
    if(showNumber){
      const id = Date.now() + Math.random();
      setHits(h => [...h, { id, val, kind, left: 40 + Math.random()*22 }]);
      setTimeout(() => setHits(h => h.filter(x => x.id !== id)), 1000);
    }
    setHitKey(k => k + 1);
    spawnCrumbs();
    if(kind === 'super' || kind === 'admin'){
      /* Effondrement : tombe → au sol SUPER_DOWN_MS → se relève. */
      setDown('falling');
      setTimeout(() => setDown('down'), 600);
      setTimeout(() => setDown('getup'), 600 + SUPER_DOWN_MS);
      setTimeout(() => setDown(null),  600 + SUPER_DOWN_MS + 550);
    } else if(kind === 'boost'){
      /* Boost : figé + vibre sur place ~0.9s. */
      setStun(true);
      setTimeout(() => setStun(false), 900);
    } else {
      setAtk(true);
      setTimeout(() => setAtk(false), 420);
    }
  }, [spawnCrumbs]);

  const tap = useCallback((kind = 'free') => {
    if(downRef.current) return;               // gâteau au sol → on attend
    lastOwnTapRef.current = Date.now();       // marque : ce coup est LOCAL
    const val = kind === 'admin' ? 0
      : kind === 'super' ? SUPER_DMG : kind === 'boost' ? BOOST_DMG : FREE_DMG;
    playSound((kind === 'super' || kind === 'admin' || kind === 'boost')
      ? 'punchHard' : 'punch');
    playReaction(kind, val);
    onAttack(kind);
  }, [onAttack, playReaction]);

  if(!boss) return null;

  const shell = (children) => (
    <div className="boss-pop" style={{ position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, bottom:0, background:C.bg, zIndex:55, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:`1px solid ${C.border}`, background:C.card, flexShrink:0 }}>
        <button onClick={onClose} aria-label="Fermer" style={{ width:36, height:36, borderRadius:12, background:C.card2, display:'flex', alignItems:'center', justifyContent:'center', color:C.text, border:'none' }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontSize:16, fontWeight:800, color:C.text, flex:1 }}>Le Gâteau Mangeur de Cookies</span>
        <div style={{ display:'flex', alignItems:'center', gap:5, background:GOLD, borderRadius:14, padding:'6px 12px' }}>
          <Cookie size={14} color="#fff" />
          <span style={{ fontWeight:700, fontSize:14, color:'#fff' }}>{coins}</span>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 26px', display:'flex', flexDirection:'column' }}>
        {children}
      </div>
    </div>
  );

  /* Le gâteau (SVG brief intouché) + affordances : on rend ÉVIDENT
     qu'on tape dessus (halo "Tape !" pulsé) et qu'il faut attendre
     (badge "Rechargement Xs"). Frappe ultime → classes de chute. */
  const downCls = down === 'falling' ? 'boss-fall'
                : down === 'down'    ? 'boss-down'
                : down === 'getup'   ? 'boss-getup' : '';
  const ready = isActive && !busy;
  const cakeEl = (dim = false) => {
    const showRing = isActive && !dim && ready;
    return (
      <div
        onClick={() => { if(ready) tap('free'); }}
        style={{ position:'relative', width:240, height:270, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'center', opacity: dim ? .55 : 1, cursor: ready ? 'pointer' : 'default', transform:`translateX(${roamX}px)`, transition:'transform 1.4s ease' }}
      >
        {showRing && (
          <div aria-hidden className="boss-ready-ring" style={{
            position:'absolute', top:'52%', left:'50%', width:210, height:210, borderRadius:'50%',
            border:'3px solid rgba(212,160,23,.6)', pointerEvents:'none',
          }} />
        )}
        <div className={downCls}>
          <BossCake attacked={atk} hpPercent={hpPct * 100} frozen={stun && !down} ko={down === 'falling' || down === 'down'} />
        </div>
        {down === 'down' && (
          <div aria-hidden style={{ position:'absolute', left:'58%', bottom:'34%', pointerEvents:'none' }}>
            {[0, 0.6, 1.2].map((d, i) => (
              <span key={i} className="boss-zzz" style={{
                position:'absolute', left:i*10, bottom:0,
                fontSize:16 + i*7, fontWeight:900, color:'#F0E0C0',
                textShadow:'0 1px 3px rgba(0,0,0,.55)', animationDelay:`${d}s`,
              }}>z</span>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* Barre de PV (design brief phase 5, palette café, 🤎) */
  const hpBarEl = () => {
    const pvP = hpPct * 100;
    const fillBg = pvP > 66 ? 'linear-gradient(90deg,#D4A017,#C17F3C)'
                 : pvP > 33 ? 'linear-gradient(90deg,#C17F3C,#A57021)'
                 :            'linear-gradient(90deg,#A57021,#7D4E1F)';
    return (
      <div style={{ position:'relative', zIndex:1, background:'rgba(0,0,0,.3)', borderRadius:12, padding:'8px 14px', marginBottom:10, border:'1px solid rgba(212,160,23,.3)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6, fontSize:12, fontWeight:800, color:'#F5EFE6' }}>
          <span>🤎 Points de vie</span>
          <span style={{ color:'#D4A017' }}>
            {bossHp.toLocaleString('fr-FR')} / {bossMaxHp.toLocaleString('fr-FR')} PV
          </span>
        </div>
        <div style={{ position:'relative', background:'rgba(0,0,0,.4)', borderRadius:100, height:14, overflow:'hidden' }}>
          {ghost && (
            <div key={ghost.key} className="boss-bar-flash"
              style={{ position:'absolute', top:0, bottom:0, left:`${ghost.toPct}%`, width:`${Math.max(0,ghost.fromPct-ghost.toPct)}%`, background:'rgba(255,232,160,.85)' }} />
          )}
          <div style={{
            height:'100%', borderRadius:100, width:`${pvP}%`, background:fillBg,
            transition:'width .6s cubic-bezier(.4,0,.2,1), background .8s ease',
            position:'relative', boxShadow:'inset 0 -2px 0 rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.2)',
          }}>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent 0%,rgba(255,255,255,.4) 50%,transparent 100%)', animation:'bossHpShimmer 2s ease-in-out infinite' }} />
          </div>
          {hitKey > 0 && (
            <div key={hitKey} className="boss-bar-hit"
              style={{ position:'absolute', inset:0, borderRadius:100, pointerEvents:'none', background:'linear-gradient(90deg,transparent 0%,rgba(255,236,180,.7) 50%,transparent 100%)' }} />
          )}
        </div>
      </div>
    );
  };

  /* Podium 3 colonnes surélevé (visuel brief) + liste 4-10 + activité */
  const podiumEl = (onDark = false) => {
    /* onDark : podium DANS le grand cadre marron → couleurs sombres
       translucides cohérentes (sinon couleurs de thème C). */
    const pCard = onDark ? 'rgba(0,0,0,.22)'        : C.card;
    const pTxt  = onDark ? '#F5EFE6'                 : C.text;
    const pMut  = onDark ? 'rgba(245,239,230,.62)'   : C.muted;
    const pBd   = onDark ? 'rgba(212,160,23,.3)'     : C.border;
    if(top.length === 0){
      return (
        <div style={{ marginTop:16 }}>
          <div style={{ textAlign:'center', fontSize:11, fontWeight:800, color:pMut, letterSpacing:2, textTransform:'uppercase', marginBottom:12 }}>🏆 Plus gros pâtissiers</div>
          <div style={{ background:pCard, padding:16, borderRadius:12, border:`1.5px solid ${pBd}`, textAlign:'center', fontSize:12, color:pMut }}>
            Sois le premier à attaquer !
          </div>
        </div>
      );
    }
    /* colonnes affichées 2e · 1er · 3e ; meta indexée par rang réel */
    const order = [top[1], top[0], top[2]];
    const rank  = [1, 0, 2];
    const META  = [
      { medal:'🥇', tint:'#D4A017', ped:'linear-gradient(180deg,#E8C25A,#B58A0E)', h:28, av:40 },
      { medal:'🥈', tint:'#B7956A', ped:'linear-gradient(180deg,#C7AC86,#8A6A48)', h:18, av:32 },
      { medal:'🥉', tint:'#C17F3C', ped:'linear-gradient(180deg,#CC8C4C,#7D4E1F)', h:12, av:32 },
    ];
    const rest = top.slice(3, 10);
    return (
      <div style={{ marginTop:16 }}>
        {/* Activité récente — AU-DESSUS du classement, 3 dernières */}
        {recent.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ textAlign:'center', fontSize:11, fontWeight:800, color:pMut, letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>⚡ Activité récente</div>
            <div style={{ background:pCard, borderRadius:12, padding:4, border:`1px solid ${pBd}` }}>
              {recent.slice(0,3).map((p,i) => (
                <div key={p._k || (p.userCode+String(p.lastAttackAt))} style={{
                  display:'flex', alignItems:'center', gap:8, padding:'6px 8px', fontSize:11.5,
                  animation:'bossActivitySlide .4s ease-out',
                  borderBottom: i < recent.slice(0,3).length-1 ? `1px dashed ${pBd}` : 'none',
                }}>
                  <AvatarFigure value={p.avatar} size={20} />
                  <div style={{ flex:1, color:pMut }}>
                    <strong style={{ color:pTxt }}>{p.name}</strong>{' '}
                    {p.kind === 'super' ? '💥 a assommé le gâteau !'
                      : p.kind === 'boost' ? '🔥 a mis un gros coup'
                      : '👊 a frappé le gâteau'}
                  </div>
                  <div style={{ color:pMut, fontSize:10 }}>{relTime(p.lastAttackAt)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Classement (compact) */}
        <div style={{ textAlign:'center', fontSize:11, fontWeight:800, color:pMut, letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>🏆 Plus gros pâtissiers</div>
        <div style={{ background:pCard, border:`1px solid ${pBd}`, borderRadius:14, padding:'12px 10px 0', display:'flex', justifyContent:'center', alignItems:'flex-end', gap:8 }}>
          {order.map((u,col) => {
            if(!u) return <div key={col} style={{ flex:1 }} />;
            const m = META[rank[col]];
            return (
              <div key={u.userCode} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ position:'relative', marginBottom:5 }}>
                  <AvatarFigure value={u.avatar} size={m.av} ringColor={m.tint} />
                  <div style={{
                    position:'absolute', top:-6, right:-6, fontSize:14,
                    filter:'drop-shadow(0 1px 2px rgba(0,0,0,.4))',
                  }}>{m.medal}</div>
                </div>
                <div style={{ fontSize:10, fontWeight:800, color:pTxt, marginBottom:1, maxWidth:'100%', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.name}</div>
                <div style={{ fontSize:10.5, fontWeight:900, color:'#E8B45F', marginBottom:6 }}>{u.damage.toLocaleString('fr-FR')}</div>
                <div style={{
                  width:'100%', height:m.h, background:m.ped,
                  borderRadius:'6px 6px 0 0',
                  boxShadow: rank[col]===0 ? '0 -2px 10px rgba(212,160,23,.4)' : 'none',
                  display:'flex', alignItems:'flex-start', justifyContent:'center',
                  fontSize:11, fontWeight:900, color:'#2C1810', paddingTop:3,
                }}>{rank[col]+1}</div>
              </div>
            );
          })}
        </div>

        {rest.length > 0 && (
          <div style={{ background:pCard, borderRadius:12, padding:6, border:`1px solid ${pBd}`, marginTop:10 }}>
            {rest.map((u,i) => (
              <div key={u.userCode} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', borderBottom: i < rest.length-1 ? `1px dashed ${pBd}` : 'none' }}>
                <span style={{ fontSize:10.5, color:pMut, fontWeight:700, minWidth:20 }}>#{i+4}</span>
                <AvatarFigure value={u.avatar} size={20} />
                <span style={{ flex:1, fontWeight:700, fontSize:11, color:pTxt, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.name}</span>
                <span style={{ color:'#E8B45F', fontWeight:800, fontSize:10.5 }}>{u.damage.toLocaleString('fr-FR')} PV</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* ── Victoire ─────────────────────────────────────────── */
  if(status === 'defeated'){
    return shell(
      <div className="su" style={{ textAlign:'center', width:'100%', maxWidth:380, margin:'0 auto' }}>
        {cakeEl()}
        <div style={{ fontSize:13, fontWeight:800, letterSpacing:1.5, textTransform:'uppercase', color:GOLD }}>
          Fournée #{fNum} sauvée
        </div>
        <h2 style={{ fontSize:23, fontWeight:900, color:C.text, margin:'8px 0 6px' }}>
          Le Gâteau Mangeur de Cookies est vaincu ! 🎉
        </h2>
        <p style={{ fontSize:14, color:C.muted, lineHeight:1.5, margin:'0 0 18px' }}>
          La communauté l'a eu ensemble. {reward
            ? 'Ta part arrive — regarde ton profil et tes cookies.'
            : "Tu n'as pas participé à cette fournée — la prochaine t'attend."}
        </p>
        {(bossReward || reward) && (
          <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:16, padding:'14px 16px', marginBottom:8 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.muted, marginBottom:6 }}>
              Ta récompense
            </div>
            <div style={{ fontSize:16, fontWeight:800, color:C.text }}>
              🍪 Skin exclusif « Cookie Mangeur »
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:C.muted, marginTop:5 }}>
              À équiper dans Paramètres → Apparence
            </div>
          </div>
        )}
        {podiumEl()}
        <button onClick={onClose} style={{ width:'100%', marginTop:18, padding:'15px', borderRadius:14, border:'none', background:GOLD, color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer' }}>
          Savourer ça
        </button>
      </div>
    );
  }

  /* ── Annonce — le boss arrive (compte à rebours, pas encore
        attaquable) ─────────────────────────────────────────── */
  if(announcing){
    const h = Math.floor(announceLeft / 3600000);
    const m = Math.floor((announceLeft % 3600000) / 60000);
    const s = Math.floor((announceLeft % 60000) / 1000);
    const cd = h >= 1 ? `${h}h ${String(m).padStart(2,'0')}min`
             : m >= 1 ? `${m}min ${String(s).padStart(2,'0')}s`
             : `${s}s`;
    return shell(
      <div className="su" style={{ textAlign:'center', width:'100%', maxWidth:380, margin:'0 auto' }}>
        <div style={{ opacity:.85 }}>{cakeEl()}</div>
        <div style={{ display:'inline-block', fontSize:11, fontWeight:900, letterSpacing:1.5, textTransform:'uppercase', color:'#fff', background:'linear-gradient(135deg,#7D4E1F,#5C3317)', padding:'4px 14px', borderRadius:999, marginTop:4 }}>
          ⚠️ Événement à venir · Fournée #{fNum}
        </div>
        <h2 style={{ fontSize:21, fontWeight:900, color:C.text, margin:'10px 0 6px' }}>
          Le Gâteau Mangeur de Cookies arrive !
        </h2>
        <p style={{ fontSize:14, color:C.muted, lineHeight:1.5, margin:'0 0 16px' }}>
          Il dévore les cookies de la communauté. Préparez-vous : il sera
          attaquable dans…
        </p>
        <div style={{ fontSize:30, fontWeight:900, color:GOLD, marginBottom:6 }}>{cd}</div>
        <p style={{ fontSize:12.5, color:C.muted, lineHeight:1.5, marginBottom:18 }}>
          Vous aurez ensuite <strong style={{ color:C.text }}>3 jours</strong> pour
          le terrasser tous ensemble · {(bossMaxHp||0).toLocaleString('fr-FR')} PV.
        </p>
        <button onClick={onClose} style={{ width:'100%', padding:'14px', borderRadius:14, border:`1px solid ${C.border}`, background:C.card2, color:C.text, fontSize:15, fontWeight:800, cursor:'pointer' }}>
          Compris, je reviens !
        </button>
      </div>
    );
  }

  /* ── Échec (sobre, espresso — jamais de rouge) ─────────── */
  if(status === 'failed' || !isActive){
    return shell(
      <div className="su" style={{ textAlign:'center', width:'100%', maxWidth:380, margin:'0 auto' }}>
        {cakeEl(true)}
        <div style={{ fontSize:13, fontWeight:800, letterSpacing:1.5, textTransform:'uppercase', color:C.muted }}>
          Fournée #{fNum}
        </div>
        <h2 style={{ fontSize:21, fontWeight:800, color:C.text, margin:'8px 0 6px' }}>
          La fournée a brûlé…
        </h2>
        <p style={{ fontSize:14, color:C.muted, lineHeight:1.5, margin:'0 0 14px' }}>
          La communauté n'a pas terrassé le Gâteau Mangeur de Cookies à temps.
          <strong style={{ color:C.text }}> Personne ne reçoit le skin.</strong>
        </p>
        {bossPenalty && (
          <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:16, padding:'14px 16px', marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.muted, marginBottom:5 }}>Pénalité (tu as participé)</div>
            <div style={{ fontSize:17, fontWeight:900, color:C.text }}>−{bossPenalty.lost} 🍪</div>
            {bossPenalty.fromEarned > 0 && (
              <div style={{ fontSize:12, fontWeight:700, color:C.muted, marginTop:4 }}>
                dont {bossPenalty.fromEarned} pris sur ton total gagné (solde insuffisant)
              </div>
            )}
          </div>
        )}
        {podiumEl()}
        <button onClick={onClose} style={{ width:'100%', marginTop:18, padding:'14px', borderRadius:14, border:`1px solid ${C.border}`, background:C.card2, color:C.text, fontSize:15, fontWeight:800, cursor:'pointer' }}>
          Compris
        </button>
      </div>
    );
  }

  /* ── Combat — panneau boss du brief ───────────────────── */
  return shell(
    <>
      <div style={{
        background:'linear-gradient(180deg,#3D2010 0%,#5C3317 100%)',
        borderRadius:20, padding:16, position:'relative',
        border:'2px solid rgba(212,160,23,.3)',
      }}>
        {/* RÉCOMPENSE — tout en haut, mise en avant */}
        <div style={{
          background:'linear-gradient(135deg,#D4A017,#C17F3C)',
          border:'2px solid #FFE08A', borderRadius:14,
          padding:'12px 14px', marginBottom:14, textAlign:'center',
          boxShadow:'0 4px 16px rgba(212,160,23,.45)',
        }}>
          <div style={{ fontSize:11, fontWeight:900, letterSpacing:1.5, textTransform:'uppercase', color:'#3A2208', marginBottom:4 }}>
            🎁 Si la communauté gagne, tu reçois
          </div>
          <div style={{ fontSize:17, fontWeight:900, color:'#2C1810', lineHeight:1.3 }}>
            {reward
              ? <>🍪 Le skin exclusif<br/>« Cookie Mangeur »</>
              : <span style={{ fontSize:14, fontWeight:800 }}>Participe pour débloquer le skin</span>}
          </div>
          <div style={{ fontSize:11, fontWeight:800, color:'#5C3317', marginTop:3 }}>
            Cosmétique collector — introuvable en boutique
          </div>
        </div>

        <div style={{
          display:'inline-block', background:'linear-gradient(135deg,#7D4E1F,#5C3317)',
          borderRadius:100, padding:'4px 14px', marginBottom:8,
          fontSize:10, fontWeight:800, letterSpacing:1.5, textTransform:'uppercase',
          color:'#F5EFE6', border:'1px solid rgba(212,160,23,.4)',
        }}>⚔️ Boss communautaire · Fournée #{fNum}</div>

        <div style={{ fontSize:24, fontWeight:900, color:'#F5EFE6', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>
          Le Gâteau Mangeur de Cookies
        </div>
        <div style={{ fontSize:11, color:'rgba(245,239,230,.72)', fontStyle:'italic', marginBottom:14 }}>
          Ce monstre dévore les cookies de toute la communauté 🍪. Tapez-le tous ensemble pour le terrasser avant qu'il ne s'échappe !
        </div>

        {/* Stage : aura + boss + miettes + chiffres — boîte CLIPPÉE
            (rien ne déborde sur la barre / le cadre) */}
        <div style={{ position:'relative', height:308, overflow:'hidden', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
          <div aria-hidden style={{
            position:'absolute', top:'50%', left:'50%', width:252, height:252, borderRadius:'50%',
            transform:'translate(-50%,-50%)',
            background:'radial-gradient(ellipse, rgba(212,160,23,.26) 0%, transparent 64%)',
            animation:'bossAuraPulse 2.5s ease-in-out infinite', pointerEvents:'none',
          }} />
          {cakeEl()}

          {crumbs.map(c => (
            <div key={c.id} aria-hidden style={{
              position:'absolute', left:'50%', top:'48%', width:8, height:8, borderRadius:'30%',
              background:c.color, pointerEvents:'none', zIndex:4,
              animation:'bossCrumbFly .8s ease-out forwards', animationDelay:`${c.delay}s`,
              ['--end-transform']: c.end,
            }} />
          ))}

          {hits.map(h => (
            <div key={h.id} aria-hidden style={{
              position:'absolute', left:`${h.left}%`, top:'40%',
              fontSize: h.kind === 'super' ? 38 : h.kind === 'boost' ? 30 : 24,
              fontWeight:900, color: h.kind === 'super' ? '#FFE08A' : '#D4A017',
              textShadow:'2px 2px 0 #2C1810, -1px -1px 0 #2C1810, 1px -1px 0 #2C1810, -1px 1px 0 #2C1810',
              pointerEvents:'none', transform:'translate(-50%,0)', zIndex:6,
              animation:'bossDamageFloat 1s ease-out forwards',
            }}>{h.kind === 'admin' ? '💀 ONE-SHOT'
                 : `${h.kind === 'super' ? '💥 ' : ''}−${h.val}`}</div>
          ))}
        </div>

        {hpBarEl()}

        <div style={{ marginBottom:12 }} />

        {/* Ligne d'état intégrée (plus de bulle pop-up) */}
        <div style={{
          textAlign:'center', fontSize:12.5, fontWeight:800, marginBottom:10,
          color: down != null ? '#F0C878' : onCd ? 'rgba(245,239,230,.6)' : '#F5EFE6',
        }}>
          {down != null ? '💤 Le gâteau est assommé — attends qu\'il se réveille'
            : onCd ? `⏳ Attends ${(cooldownLeftMs/1000).toFixed(1)}s avant de retaper`
            : '👆 Tape le gâteau pour lui enlever des points de vie'}
        </div>

        {/* Coût mis en avant à droite de chaque bouton (chip lisible) */}
        {(() => {
          const chip = (txt, ok) => (
            <span style={{
              flexShrink:0, fontSize:14, fontWeight:900, padding:'7px 12px', borderRadius:10,
              background: ok ? 'rgba(0,0,0,.28)' : 'rgba(0,0,0,.4)',
              color: ok ? '#FFF' : '#FFCF8A', border:'1px solid rgba(255,255,255,.25)',
              whiteSpace:'nowrap',
            }}>{txt}</span>
          );
          const row = { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, width:'100%' };
          const left = { textAlign:'left', minWidth:0 };
          return (
            <>
              {/* 1 — Taper (gratuit) */}
              <button onClick={() => { if(!busy) tap('free'); }} disabled={busy}
                style={{ ...row, background: busy ? 'rgba(0,0,0,.28)' : 'linear-gradient(180deg,#E8C25A 0%,#C99A12 100%)',
                  color: busy ? 'rgba(245,239,230,.55)' : '#2C1810', border:'none', borderRadius:14,
                  padding:'14px 14px', marginBottom:9, cursor: busy ? 'default' : 'pointer',
                  touchAction:'manipulation', userSelect:'none',
                  boxShadow: busy ? 'none' : '0 5px 0 #8C6800, 0 10px 18px rgba(212,160,23,.4)' }}>
                <span style={left}>
                  <span style={{ display:'block', fontSize:18, fontWeight:900, textTransform:'uppercase', letterSpacing:1 }}>👊 Taper</span>
                  <span style={{ display:'block', fontSize:12, fontWeight:800, opacity:.8 }}>enlève {FREE_DMG} PV</span>
                </span>
                {chip('GRATUIT', true)}
              </button>

              {/* 2 — Gros coup (cookies) */}
              <button onClick={() => { if(!busy && canBoost) tap('boost'); }} disabled={busy || !canBoost}
                style={{ ...row, background:'linear-gradient(180deg,#8A5A2A 0%,#5C3317 100%)', color:'#F5EFE6',
                  borderRadius:14, border:'1px solid rgba(212,160,23,.45)', padding:'14px',
                  marginBottom:9, opacity:(busy||!canBoost)?.55:1,
                  cursor:(busy||!canBoost)?'default':'pointer', touchAction:'manipulation',
                  userSelect:'none', boxShadow:'0 5px 0 #3D2010' }}>
                <span style={left}>
                  <span style={{ display:'block', fontSize:17, fontWeight:900, textTransform:'uppercase', letterSpacing:.5 }}>🔥 Gros coup</span>
                  <span style={{ display:'block', fontSize:12, fontWeight:800, opacity:.85 }}>enlève {BOOST_DMG} PV{canBoost?'':' · pas assez'}</span>
                </span>
                {chip(`${BOOST_COST_COOKIES} 🍪`, canBoost)}
              </button>

              {/* 3 — Coup critique (premium 1 ☕) */}
              <button onClick={() => { if(!busy && canSuper) tap('super'); }} disabled={busy || !canSuper}
                style={{ ...row, background:'linear-gradient(135deg,#5C2A8A 0%,#7D4E1F 45%,#D4A017 100%)',
                  color:'#FFF6DF', borderRadius:14, border:'2px solid #FFE08A', padding:'14px',
                  opacity:(busy||!canSuper)?.6:1, cursor:(busy||!canSuper)?'default':'pointer',
                  touchAction:'manipulation', userSelect:'none',
                  boxShadow:'0 5px 0 #3D2010, 0 0 18px rgba(212,160,23,.45)' }}>
                <span style={left}>
                  <span style={{ display:'block', fontSize:17, fontWeight:900, textTransform:'uppercase', letterSpacing:1 }}>💥 Coup critique</span>
                  <span style={{ display:'block', fontSize:12, fontWeight:800, opacity:.92 }}>enlève {SUPER_DMG} PV + assomme{canSuper?'':' · il te faut 1 café'}</span>
                </span>
                {chip('1 ☕', canSuper)}
              </button>

              {/* ADMIN — one-shot de test (visible compte admin only,
                  ignore le cooldown) */}
              {isAdmin && (
                <button onClick={() => { if(!attacking && down == null) tap('admin'); }}
                  disabled={attacking || down != null}
                  style={{ ...row, marginTop:9,
                    background:'linear-gradient(135deg,#1A0E04,#3D2010)',
                    color:'#FFCF8A', borderRadius:14, border:'2px dashed #C99A12',
                    padding:'12px 14px', opacity:(attacking||down!=null)?.6:1,
                    cursor:(attacking||down!=null)?'default':'pointer',
                    touchAction:'manipulation', userSelect:'none' }}>
                  <span style={left}>
                    <span style={{ display:'block', fontSize:15, fontWeight:900, textTransform:'uppercase', letterSpacing:1 }}>💀 One-shot</span>
                    <span style={{ display:'block', fontSize:11, fontWeight:800, opacity:.8 }}>admin · tue le boss instantanément</span>
                  </span>
                  {chip('ADMIN', true)}
                </button>
              )}
            </>
          );
        })()}
        {podiumEl(true)}
      </div>
    </>
  );
}

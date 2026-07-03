import { useState, useEffect, useRef } from "react";
import { GOLD } from "../../data/themes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";

/* ════════════════════════════════════════════════════
   MatchmakingOverlay — recherche de duel « façon Valorant »
   ────────────────────────────────────────────────────
   Séquence plein écran : Recherche d'un adversaire… → Adversaire
   trouvé (bot) → Épreuve révélée + règles → lancement (auto ou tap).
   Le jeu est ALÉATOIRE (tu ne sais pas sur quoi tu tombes).

   Le tirage (jeu + bot + cible) est fait côté App et passé via `match`
   pour rester la source de vérité ; l'overlay ne fait que l'animation
   puis appelle onLaunch(). Palette espresso, anims réutilisées de
   globalStyles (.spin-anim, .bi, .su).

   props : match = { game, botName, botTarget }, onLaunch(), onCancel(), C
═══════════════════════════════════════════════════════ */
export function MatchmakingOverlay({ match, onLaunch, onCancel, C }){ // eslint-disable-line no-unused-vars
  const isCreate = match?.kind === 'create';
  const isOnline = match?.kind === 'online';
  const [phase, setPhase] = useState(isCreate ? 'reveal' : 'search');   // create → direct à la révélation de l'épreuve
  const launchRef = useRef(onLaunch);
  launchRef.current = onLaunch;
  const game = match?.game;
  const botName = match?.botName || 'Barista';
  const stakeC = (isCreate ? match?.stakeCookies : match?.duel?.stakeCookies) || 0;
  const stakeK = (isCreate ? match?.stakeCafes   : match?.duel?.stakeCafes)   || 0;
  const target = match?.duel?.challengerScore;

  useEffect(() => {
    if(isCreate) return;   // poser un défi : on reste sur la révélation, lancement au tap
    /* Recherche plus longue (~5 s) avant de retomber sur un bot. */
    if(phase === 'search'){ const t = setTimeout(()=>setPhase('found'),  5000); return ()=>clearTimeout(t); }
    if(phase === 'found'){  const t = setTimeout(()=>setPhase('reveal'), 3200); return ()=>clearTimeout(t); }
    if(phase === 'reveal'){ const t = setTimeout(()=>launchRef.current?.(), 5200); return ()=>clearTimeout(t); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const dim = 'rgba(240,224,192,';

  return (
    <div style={{ position:'fixed', inset:0, zIndex:75, background:'linear-gradient(160deg,#2A1508,#160800)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, color:'#F0E0C0' }}>
      <button
        onClick={onCancel}
        style={{ position:'absolute', top:'calc(16px + env(safe-area-inset-top))', right:18, width:38, height:38, borderRadius:12, background:'rgba(255,255,255,.08)', color:'#F0E0C0', border:'none', fontSize:18, cursor:'pointer' }}
      >✕</button>

      {phase === 'search' && (
        <div style={{ textAlign:'center' }}>
          <div className="spin-anim" style={{ width:66, height:66, margin:'0 auto 26px', borderRadius:'50%', border:'4px solid rgba(212,160,23,.22)', borderTopColor:GOLD }} />
          <div style={{ fontSize:21, fontWeight:900 }}>Recherche d'un adversaire…</div>
          <div style={{ fontSize:12.5, color:dim+'.6)', marginTop:10, lineHeight:1.4 }}>Épreuve tirée au sort<br/>tu ne sais pas sur quoi tu vas tomber</div>
        </div>
      )}

      {phase === 'found' && (
        <div className="bi" style={{ textAlign:'center' }}>
          <div style={{ fontSize:12.5, fontWeight:800, color:dim+'.6)', textTransform:'uppercase', letterSpacing:2 }}>Adversaire trouvé</div>
          <div style={{ margin:'18px 0 10px', display:'flex', justifyContent:'center' }}>
            <AvatarFigure value={match?.botAvatar} size={96} />
          </div>
          <div style={{ fontSize:27, fontWeight:900, color:GOLD }}>{botName}</div>
          <div style={{ fontSize:12, color:dim+'.5)', marginTop:6 }}>{isOnline ? "Vrai joueur — un défi t'attend" : "Bot d'entraînement · sans enjeu"}</div>
        </div>
      )}

      {phase === 'reveal' && game && (
        <div className="su" style={{ textAlign:'center', width:'100%', maxWidth:340 }}>
          <div style={{ fontSize:12, fontWeight:800, color:dim+'.6)', textTransform:'uppercase', letterSpacing:2, marginBottom:14 }}>{isCreate ? 'Ton défi' : 'Épreuve'}</div>
          <div style={{ fontSize:66, lineHeight:1 }}>{game.icon}</div>
          <div style={{ fontSize:31, fontWeight:900, color:GOLD, marginTop:10 }}>{game.label}</div>
          <div style={{ fontSize:14, color:dim+'.85)', marginTop:12, lineHeight:1.45 }}>{game.rules}</div>
          <div style={{ fontSize:11.5, fontWeight:800, color:dim+'.55)', marginTop:8 }}>
            {game.higherWins ? '→ le plus haut score gagne' : '→ le moins de coups gagne'}
          </div>
          {isOnline && (
            <div style={{ marginTop:16, padding:'10px 12px', borderRadius:12, background:'rgba(212,160,23,.14)', border:`1px solid ${GOLD}` }}>
              <div style={{ fontSize:14, fontWeight:900, color:GOLD }}>🎯 Score à battre : {target}</div>
              <div style={{ fontSize:12.5, fontWeight:800, color:dim+'.85)', marginTop:3 }}>Mise : {stakeC} 🍪{stakeK ? ` + ${stakeK} ☕` : ''}</div>
            </div>
          )}
          {isCreate && (
            <div style={{ marginTop:16, padding:'10px 12px', borderRadius:12, background:'rgba(212,160,23,.14)', border:`1px solid ${GOLD}` }}>
              <div style={{ fontSize:13.5, fontWeight:900, color:GOLD }}>Ta mise : {stakeC} 🍪{stakeK ? ` + ${stakeK} ☕` : ''}</div>
              <div style={{ fontSize:12, fontWeight:700, color:dim+'.8)', marginTop:3 }}>Joue, pose ton score, et attends un adversaire.</div>
            </div>
          )}
          {!isCreate && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:16 }}>
              <AvatarFigure value={match?.botAvatar} size={30} />
              <span style={{ fontSize:12.5, fontWeight:800, color:dim+'.75)' }}>face à {botName}</span>
            </div>
          )}
          <button
            onClick={()=>launchRef.current?.()}
            style={{ marginTop:26, width:'100%', padding:'16px', borderRadius:16, background:GOLD, color:'#fff', fontWeight:900, fontSize:16, border:'none', cursor:'pointer' }}
          >
            {isCreate ? 'Jouer & poser mon défi 📢' : isOnline ? 'Relever le défi ⚔️' : 'Lancer le duel ⚔️'}
          </button>
          {!isCreate && <div style={{ fontSize:10.5, color:dim+'.45)', marginTop:12 }}>Ça démarre tout seul dans un instant…</div>}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { GOLD } from "../../data/themes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { getDuelGame } from "../../lib/duels.js";

/* ════════════════════════════════════════════════════
   MatchmakingOverlay — séquence de duel « façon Valorant »
   ────────────────────────────────────────────────────
   ÉTAPE A (vs bot réaliste) :
     search  → Recherche d'un adversaire… (~5 s, rallongé)
     found   → Adversaire trouvé (avatar + nom)
     gamepick→ Choisis ton épreuve parmi 3. L'adversaire choisit aussi.
               Résolution : même choix → ce jeu ; sinon départage aléatoire
               entre les 2 jeux choisis.
     reveal  → L'épreuve tranchée + règles
     count   → décompte 3·2·1 → onLaunch(gameKey)

   Le tirage (bot, 3 jeux proposés, choix du bot) vient d'App via `match` ;
   l'overlay pilote l'anim + la résolution puis appelle onLaunch(gameKey).
   Étape B (vrai live 2 joueurs) se branchera par-dessus ces mêmes phases.

   props : match = { kind, botName, botAvatar, offeredGames:[g], botGamePick },
           onLaunch(gameKey), onCancel(), C
═══════════════════════════════════════════════════════ */
export function MatchmakingOverlay({ match, onLaunch, onCancel, C }){
  const [phase, setPhase]       = useState('search');   // search → found → gamepick → reveal → count
  const [resolved, setResolved] = useState(null);       // { game, reason, myPick, botPick }
  const [count, setCount]       = useState(3);
  const launchRef = useRef(onLaunch);
  launchRef.current = onLaunch;

  const dim     = 'rgba(240,224,192,';
  const botName = match?.botName || 'Barista';
  const offered = match?.offeredGames || [];

  /* Transitions auto (search/found/reveal). gamepick attend le tap. */
  useEffect(() => {
    if(phase === 'search'){ const t = setTimeout(()=>setPhase('found'),    5000); return ()=>clearTimeout(t); }
    if(phase === 'found'){  const t = setTimeout(()=>setPhase('gamepick'), 2000); return ()=>clearTimeout(t); }
    if(phase === 'reveal'){ const t = setTimeout(()=>setPhase('count'),    2600); return ()=>clearTimeout(t); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* Décompte 3·2·1 → lancement. */
  useEffect(() => {
    if(phase !== 'count') return;
    setCount(3);
    let n = 3;
    const id = setInterval(() => {
      n -= 1;
      if(n <= 0){ clearInterval(id); launchRef.current?.(resolved?.game?.key); }
      else setCount(n);
    }, 800);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* Le joueur choisit → on tranche avec le choix du bot. */
  const pick = (g) => {
    if(phase !== 'gamepick') return;
    const botGame = getDuelGame(match?.botGamePick) || g;
    let game, reason;
    if(g.key === botGame.key){ game = g; reason = 'same'; }
    else { game = Math.random() < 0.5 ? g : botGame; reason = 'tie'; }
    setResolved({ game, reason, myPick: g, botPick: botGame });
    setPhase('reveal');
  };

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
          <div style={{ fontSize:12.5, color:dim+'.6)', marginTop:10, lineHeight:1.4 }}>On te trouve un joueur.<br/>Personne de dispo ? Un adversaire relèvera le défi.</div>
        </div>
      )}

      {phase === 'found' && (
        <div className="bi" style={{ textAlign:'center' }}>
          <div style={{ fontSize:12.5, fontWeight:800, color:dim+'.6)', textTransform:'uppercase', letterSpacing:2 }}>Adversaire trouvé</div>
          <div style={{ margin:'18px 0 10px', display:'flex', justifyContent:'center' }}>
            <AvatarFigure value={match?.botAvatar} size={96} />
          </div>
          <div style={{ fontSize:27, fontWeight:900, color:GOLD }}>{botName}</div>
        </div>
      )}

      {phase === 'gamepick' && (
        <div className="su" style={{ width:'100%', maxWidth:360, textAlign:'center' }}>
          <div style={{ fontSize:12, fontWeight:800, color:dim+'.6)', textTransform:'uppercase', letterSpacing:2 }}>Choisis ton épreuve</div>
          <div style={{ fontSize:12.5, color:dim+'.55)', marginTop:6 }}>{botName} choisit de son côté…</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:20 }}>
            {offered.map(g => (
              <button
                key={g.key}
                onClick={()=>pick(g)}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'16px 6px', borderRadius:16, background:'rgba(255,255,255,.06)', border:'1px solid rgba(212,160,23,.35)', color:'#F0E0C0', cursor:'pointer' }}
              >
                <span style={{ fontSize:30, lineHeight:1 }}>{g.icon}</span>
                <span style={{ fontSize:12, fontWeight:800 }}>{g.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'reveal' && resolved && (
        <div className="su" style={{ textAlign:'center', width:'100%', maxWidth:340 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14, marginBottom:16 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:28 }}>{resolved.myPick.icon}</div>
              <div style={{ fontSize:10, fontWeight:800, color:dim+'.6)', marginTop:2 }}>TOI</div>
            </div>
            <div style={{ fontSize:16, color:dim+'.5)' }}>vs</div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:28 }}>{resolved.botPick.icon}</div>
              <div style={{ fontSize:10, fontWeight:800, color:dim+'.6)', marginTop:2, maxWidth:70, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{botName}</div>
            </div>
          </div>
          <div style={{ fontSize:12.5, fontWeight:800, color:GOLD }}>
            {resolved.reason === 'same' ? '🎯 Même choix — c\'est parti !' : '🎲 Choix différents → départage !'}
          </div>
          <div style={{ fontSize:12, fontWeight:800, color:dim+'.6)', textTransform:'uppercase', letterSpacing:2, margin:'18px 0 6px' }}>Épreuve</div>
          <div style={{ fontSize:60, lineHeight:1 }}>{resolved.game.icon}</div>
          <div style={{ fontSize:30, fontWeight:900, color:GOLD, marginTop:8 }}>{resolved.game.label}</div>
          <div style={{ fontSize:13.5, color:dim+'.8)', marginTop:10, lineHeight:1.4 }}>{resolved.game.rules}</div>
          <div style={{ fontSize:11.5, fontWeight:800, color:dim+'.5)', marginTop:6 }}>
            {resolved.game.higherWins ? '→ le plus haut score gagne' : '→ le moins de coups gagne'}
          </div>
        </div>
      )}

      {phase === 'count' && (
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:14, fontWeight:800, color:dim+'.7)' }}>{resolved?.game?.label}</div>
          <div key={count} className="bi" style={{ fontSize:100, fontWeight:900, color:GOLD, lineHeight:1, marginTop:8 }}>{count}</div>
          <div style={{ fontSize:12, color:dim+'.5)', marginTop:8 }}>Prépare-toi…</div>
        </div>
      )}
    </div>
  );
}

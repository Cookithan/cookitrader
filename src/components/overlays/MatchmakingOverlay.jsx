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
  const [botRevealed, setBotRevealed] = useState(false);   // le choix du bot est révélé avant que tu choisisses
  const [myPickKey, setMyPickKey]     = useState(null);    // ton choix verrouillé (badge « TOI »)
  const [previewKey, setPreviewKey]   = useState(null);    // jeu tapé pour aperçu (démo + règles)
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

  /* Après ~1.5 s, on RÉVÈLE le choix de l'adversaire ; le joueur choisit
     ensuite (le même que lui → ce jeu, ou un autre → départage aléatoire). */
  useEffect(() => {
    if(phase !== 'gamepick'){ setBotRevealed(false); setMyPickKey(null); setPreviewKey(null); return; }
    const t = setTimeout(()=>setBotRevealed(true), 1500);
    return ()=>clearTimeout(t);
  }, [phase]);

  /* Le joueur valide → son choix se verrouille (même effet que le bot),
     on laisse voir les 2 badges ~1.3 s, puis on tranche → révélation. */
  const pick = (g) => {
    if(!botRevealed || myPickKey) return;
    setMyPickKey(g.key);
    setPreviewKey(null);
    const botGame = getDuelGame(match?.botGamePick) || g;
    let game, reason;
    if(g.key === botGame.key){ game = g; reason = 'same'; }
    else { game = Math.random() < 0.5 ? g : botGame; reason = 'tie'; }
    setTimeout(() => { setResolved({ game, reason, myPick: g, botPick: botGame }); setPhase('reveal'); }, 1300);
  };

  /* 1er tap sur une carte → aperçu (comment jouer + règles) ; 2e tap sur la
     MÊME carte (ou le bouton) → valide. Découverte : tous les jeux jouables
     en duel, même ceux pas encore débloqués. */
  const tapCard = (g) => {
    if(!botRevealed || myPickKey) return;
    if(previewKey === g.key) pick(g);
    else setPreviewKey(g.key);
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:75, background:'linear-gradient(160deg,#2A1508,#160800)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, color:'#F0E0C0' }}>
      <button
        onClick={onCancel}
        style={{ position:'absolute', top:'calc(16px + env(safe-area-inset-top))', right:18, width:38, height:38, borderRadius:12, background:'rgba(255,255,255,.08)', color:'#F0E0C0', border:'none', fontSize:18, cursor:'pointer' }}
      >✕</button>

      {phase === 'search' && (
        <>
          <div className="splash-blob splash-blob-1" />
          <div className="splash-blob splash-blob-2" />
          <div style={{ textAlign:'center', position:'relative', zIndex:2 }}>
            <div style={{ position:'relative', width:100, height:100, margin:'0 auto 24px' }}>
              <div className="spin-anim" style={{ position:'absolute', inset:0, borderRadius:'50%', border:'4px solid rgba(212,160,23,.20)', borderTopColor:GOLD }} />
              <div className="live-pulse" style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:42 }}>⚔️</div>
            </div>
            <div style={{ fontSize:23, fontWeight:900, color:'#E8C896', textShadow:'0 2px 8px rgba(212,160,23,.4), 0 0 24px rgba(212,160,23,.2)' }}>Recherche d'un adversaire</div>
            <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:14 }}>
              <div className="splash-dot" /><div className="splash-dot" /><div className="splash-dot" />
            </div>
            <div style={{ fontSize:12, color:dim+'.55)', marginTop:18, lineHeight:1.4 }}>On te cherche un joueur.<br/>Personne de dispo ? Un adversaire relève le défi.</div>
          </div>
        </>
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
          <div style={{ fontSize:12, fontWeight:800, color:dim+'.6)', textTransform:'uppercase', letterSpacing:2 }}>
            {botRevealed ? 'À ton tour — choisis' : `${botName} choisit…`}
          </div>
          <div style={{ fontSize:12.5, color:dim+'.55)', marginTop:6, minHeight:17 }}>
            {botRevealed ? 'Tape un jeu pour le découvrir · retape pour le choisir' : 'Il verrouille son épreuve…'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:20 }}>
            {offered.map((g, i) => {
              const isBot  = botRevealed && g.key === match?.botGamePick;
              const isMe   = g.key === myPickKey;
              const isPrev = previewKey === g.key;
              const hot    = isMe || isBot || isPrev;
              return (
                <button
                  key={g.key}
                  onClick={()=>tapCard(g)}
                  disabled={!botRevealed || !!myPickKey}
                  className={`su stagger-${i + 1}`}
                  style={{
                    position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                    padding:'16px 6px 12px', borderRadius:18,
                    background: isMe ? 'linear-gradient(160deg, rgba(212,160,23,.38), rgba(212,160,23,.12))'
                             : (isBot || isPrev) ? 'linear-gradient(160deg, rgba(212,160,23,.18), rgba(255,255,255,.04))'
                             :         'linear-gradient(160deg, rgba(255,255,255,.09), rgba(255,255,255,.03))',
                    border:`1.5px solid ${hot ? GOLD : 'rgba(212,160,23,.28)'}`,
                    boxShadow: hot ? '0 6px 20px rgba(212,160,23,.32)' : '0 2px 10px rgba(0,0,0,.2)',
                    color:'#F0E0C0', cursor: (botRevealed && !myPickKey) ? 'pointer' : 'default',
                    opacity: botRevealed ? 1 : .5, transition:'all .3s',
                  }}
                >
                  {isBot && <span className="bi" style={{ position:'absolute', top:-11, right:-7, fontSize:17 }}>🤖</span>}
                  {isMe  && <span className="bi" style={{ position:'absolute', top:-10, left:-7, fontSize:10, fontWeight:900, background:GOLD, color:'#fff', borderRadius:8, padding:'2px 6px', letterSpacing:.5 }}>TOI</span>}
                  <div style={{ width:46, height:46, borderRadius:14, background:'rgba(0,0,0,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>{g.icon}</div>
                  <span style={{ fontSize:11.5, fontWeight:800 }}>{g.label}</span>
                </button>
              );
            })}
          </div>

          {/* Aperçu (démo/règles) du jeu tapé + validation, sinon message découverte */}
          {botRevealed && !myPickKey && (() => {
            const g = offered.find(x => x.key === previewKey);
            if(!g) return (
              <div style={{ fontSize:11, color:dim+'.5)', marginTop:16, lineHeight:1.45 }}>
                🎁 En duel, <b>tous</b> les jeux sont jouables — même ceux pas encore débloqués. Tape-en un pour le découvrir !
              </div>
            );
            return (
              <div className="su" style={{ marginTop:16, padding:'13px 14px', borderRadius:16, background:'rgba(255,255,255,.06)', border:`1px solid ${GOLD}`, textAlign:'left' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:28 }}>{g.icon}</span>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:15, fontWeight:900, color:GOLD }}>{g.label}</div>
                    <div style={{ fontSize:10.5, fontWeight:800, color:dim+'.55)' }}>{g.higherWins ? 'plus = mieux' : 'moins = mieux'}</div>
                  </div>
                </div>
                <div style={{ fontSize:12.5, color:dim+'.85)', marginTop:10, lineHeight:1.45 }}>🎮 {g.how || g.rules}</div>
                <button onClick={()=>pick(g)} style={{ width:'100%', marginTop:12, padding:'12px', borderRadius:12, background:GOLD, color:'#fff', fontWeight:900, fontSize:14, border:'none', cursor:'pointer' }}>✓ Choisir ce jeu</button>
              </div>
            );
          })()}
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
        <>
          <div className="splash-blob splash-blob-1" />
          <div className="splash-blob splash-blob-2" />
          <div style={{ textAlign:'center', position:'relative', zIndex:2 }}>
            <div style={{ fontSize:12, fontWeight:800, color:dim+'.6)', textTransform:'uppercase', letterSpacing:2 }}>La partie commence</div>
            <div style={{ fontSize:46, lineHeight:1, marginTop:12 }}>{resolved?.game?.icon}</div>
            <div style={{ fontSize:17, fontWeight:900, color:GOLD, marginTop:6 }}>{resolved?.game?.label}</div>
            <div key={count} className="bi" style={{ fontSize:110, fontWeight:900, color:'#E8C896', lineHeight:1, marginTop:8, textShadow:'0 0 34px rgba(212,160,23,.55)' }}>{count}</div>
          </div>
        </>
      )}
    </div>
  );
}

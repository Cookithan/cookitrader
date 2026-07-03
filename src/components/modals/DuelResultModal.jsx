import { GOLD } from "../../data/themes.js";
import { getDuelGame } from "../../lib/duels.js";
import { AvatarFigure } from "../AvatarFigure.jsx";

/* ════════════════════════════════════════════════════
   DuelResultModal — écran de résultat d'un duel 1v1
   ────────────────────────────────────────────────────
   Réutilisable pour le duel bot (entraînement, sans enjeu) ET les
   duels en ligne (Phase 3). Affiche TOI vs adversaire, les scores,
   et l'issue (victoire / défaite / égalité).

   Palette café-only (règle du projet) : victoire = tons clairs (or/
   caramel), défaite = tons sombres (espresso), égalité = moka neutre.
   AUCUN rouge/vert, même pour l'issue.

   props :
     result   = { gameKey, myScore, oppName, oppScore, outcome, higherWins,
                  stake } — outcome ∈ 'win'|'lose'|'draw'
     onRematch()  — rejouer un duel sur le même jeu (optionnel)
     onClose()
     C            — thème courant
   i18n : textes FR en dur pour l'instant (Phase 4 : passage par t()).
═══════════════════════════════════════════════════════ */
export function DuelResultModal({ result, onRematch, onClose, C }){
  if(!result) return null;
  const { gameKey, myScore, myAvatar, oppName, oppAvatar, oppScore, outcome, higherWins } = result;
  const game = getDuelGame(gameKey);
  const metric = game?.metric || 'score';

  const V = {
    win:  { title:'Victoire !',  emoji:'🏆', accent:GOLD,      sub:"Tu l'emportes." },
    lose: { title:'Défaite',     emoji:'☕', accent:C.muted,   sub:'Ça se joue à peu.' },
    draw: { title:'Égalité',     emoji:'🤝', accent:C.text,    sub:'Personne ne cède.' },
  }[outcome] || {};

  const meWon  = outcome === 'win';
  const oppWon = outcome === 'lose';

  const scoreBox = (name, score, highlight, avatar) => (
    <div style={{
      flex:1, textAlign:'center', padding:'14px 8px', borderRadius:16,
      background: highlight ? GOLD : C.card2,
      border:`1px solid ${highlight ? GOLD : C.border}`,
      boxShadow: highlight ? '0 4px 16px rgba(212,160,23,.35)' : 'none',
    }}>
      <div style={{ display:'flex', justifyContent:'center', marginBottom:9 }}>
        <AvatarFigure value={avatar} size={46} ringColor={highlight ? '#fff' : null} />
      </div>
      <div style={{ fontSize:12, fontWeight:800, color: highlight ? '#fff' : C.muted, marginBottom:6, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
        {name}
      </div>
      <div style={{ fontSize:34, fontWeight:900, color: highlight ? '#fff' : C.text, lineHeight:1 }}>
        {score}
      </div>
      <div style={{ fontSize:10, fontWeight:700, color: highlight ? 'rgba(255,255,255,.85)' : C.muted, marginTop:4 }}>
        {metric}
      </div>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:70, background:'rgba(20,10,4,.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
    >
      <div
        onClick={e=>e.stopPropagation()}
        className="su"
        style={{ width:'100%', maxWidth:360, background:C.card, borderRadius:24, border:`1px solid ${C.border}`, padding:24, boxShadow:'0 20px 60px rgba(0,0,0,.4)' }}
      >
        {/* Bandeau issue */}
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:44, lineHeight:1 }}>{V.emoji}</div>
          <div style={{ fontSize:24, fontWeight:900, color:V.accent, marginTop:8 }}>{V.title}</div>
          <div style={{ fontSize:12.5, color:C.muted, marginTop:4 }}>{V.sub}</div>
        </div>

        {/* Scores TOI vs adversaire */}
        <div style={{ display:'flex', alignItems:'stretch', gap:10, marginBottom:6 }}>
          {scoreBox('Toi', myScore, meWon, myAvatar)}
          <div style={{ display:'flex', alignItems:'center', fontSize:14, fontWeight:900, color:C.muted }}>vs</div>
          {scoreBox(oppName || 'Adversaire', oppScore, oppWon, oppAvatar)}
        </div>
        {game?.higherWins === false && (
          <div style={{ textAlign:'center', fontSize:10.5, color:C.muted, marginTop:8 }}>
            ⓘ Sur ce jeu, <b>moins</b> = mieux
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:10, marginTop:22 }}>
          {onRematch && (
            <button
              onClick={onRematch}
              style={{ flex:1, padding:'14px', borderRadius:14, background:GOLD, color:'#fff', fontWeight:800, fontSize:14, border:'none', cursor:'pointer' }}
            >
              Rejouer
            </button>
          )}
          <button
            onClick={onClose}
            style={{ flex:1, padding:'14px', borderRadius:14, background:C.card2, color:C.text, fontWeight:800, fontSize:14, border:`1px solid ${C.border}`, cursor:'pointer' }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

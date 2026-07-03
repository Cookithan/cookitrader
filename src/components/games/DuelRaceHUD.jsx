import { useState, useEffect, useRef } from "react";
import { GOLD } from "../../data/themes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";

/* ════════════════════════════════════════════════════
   DuelRaceHUD — face-à-face « toi vs adversaire » en direct
   ────────────────────────────────────────────────────
   Bandeau bien visible en haut de la zone de jeu pendant un duel
   (rendu par GameOverlay en mode duel). Montre les deux avatars, les
   deux scores et deux barres en tug-of-war. Ton score arrive en
   direct via onDuelProgress ; le score du bot est SIMULÉ ici (montée
   vers sa cible fixe `botTarget` sur `dur` s). Le MENEUR s'illumine
   (halo or) → on voit d'un coup qui gagne. Le résultat final compare
   ton score réel à botTarget.

   Palette café-only. `Date.now` seulement dans l'intervalle (pas au
   render → pureté OK).

   props : myScore, myAvatar, botTarget, botAvatar, botName,
           higherWins, dur (s), gameLabel, metric, C
═══════════════════════════════════════════════════════ */
export function DuelRaceHUD({ myScoreRef = null, botScoreRef = null, myAvatar = null, botTarget = 0, botAvatar = 2, botName = 'Bot', higherWins = true, dur = 30, gameLabel = '', metric = 'score', C }){
  const [myScore, setMyScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const startRef = useRef(0);

  /* Poll unique (10 fps) : lit ton score + celui du bot depuis des REFS
     (mises à jour par les jeux SANS re-render de l'App → perf). Bot réel
     en split (botScoreRef), sinon simulé vers botTarget. React ignore un
     setState de valeur identique → pas de re-render inutile. */
  useEffect(() => {
    startRef.current = Date.now();
    const id = setInterval(() => {
      setMyScore(Math.max(0, Math.floor(myScoreRef?.current || 0)));
      if(botScoreRef){
        setBotScore(Math.max(0, Math.floor(botScoreRef.current || 0)));
      } else {
        const elapsed = (Date.now() - startRef.current) / 1000;
        const frac = dur > 0 ? Math.min(1, elapsed / dur) : 1;
        const eased = frac < 0.5 ? frac * 0.9 : 0.45 + (frac - 0.5) * 1.1;
        setBotScore(Math.round(botTarget * Math.min(1, eased)));
      }
    }, 100);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const max = Math.max(myScore, botTarget, botScore, 1);
  const meFrac = Math.min(1, myScore / max);
  const botFrac = Math.min(1, botScore / max);
  const gap = Math.abs(myScore - botScore);
  const close = botScore > 0 && gap <= Math.max(2, Math.round(max * 0.12));
  const leader = myScore === botScore ? 'tie'
    : higherWins ? (myScore > botScore ? 'me' : 'bot')
                 : (myScore < botScore ? 'me' : 'bot');

  const avatarWrap = (isLeader) => ({
    borderRadius:'50%', flexShrink:0,
    boxShadow: isLeader ? `0 0 0 3px ${GOLD}, 0 0 12px rgba(212,160,23,.55)` : 'none',
    transition:'box-shadow .2s',
  });

  return (
    <div style={{ background:C.card, borderBottom:`2px solid ${GOLD}`, padding:'5px 12px', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {/* TOI */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          <div style={avatarWrap(leader==='me')}><AvatarFigure value={myAvatar} size={28} /></div>
          <div style={{ fontSize:20, fontWeight:900, color: leader==='me' ? GOLD : C.text, lineHeight:1, minWidth:20, textAlign:'center' }}>{myScore}</div>
        </div>

        {/* Barres tug-of-war (se rejoignent au centre) */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:3, minWidth:0 }}>
          <div style={{ height:6, borderRadius:4, background:C.card2, overflow:'hidden', direction:'rtl' }}>
            <div style={{ width:`${meFrac*100}%`, height:'100%', background:GOLD, borderRadius:4, transition:'width .2s linear' }} />
          </div>
          <div style={{ height:6, borderRadius:4, background:C.card2, overflow:'hidden' }}>
            <div style={{ width:`${botFrac*100}%`, height:'100%', background:C.muted, borderRadius:4, transition:'width .2s linear' }} />
          </div>
        </div>

        {/* ADVERSAIRE */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          <div style={{ fontSize:20, fontWeight:900, color: leader==='bot' ? GOLD : C.text, lineHeight:1, minWidth:20, textAlign:'center' }}>{botScore}</div>
          <div style={avatarWrap(leader==='bot')}><AvatarFigure value={botAvatar} size={28} /></div>
        </div>
      </div>
    </div>
  );
}

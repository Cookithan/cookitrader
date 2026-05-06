/* ════════════════════════════════════════════════════
   STYLES GLOBAUX (keyframes + classes utilitaires)
   - Injecté UNE FOIS via <style>{GLOBAL_CSS}</style> dans App.jsx
   - Toute nouvelle animation doit être ajoutée ici, pas dans un nouveau bloc
   - Classes utilitaires : .su .bi .fu .float-anim .wiggle-anim .glow-anim
                            .pulse-ring .live-pulse .market-tick .cup-shake
                            .steam-rise .sparkle-anim .cookie-idle .pop-anim
                            .gradient-anim .stagger-1..4 .confetti-piece
                            .shimmer-bar .coin-pop
════════════════════════════════════════════════════ */

export const GLOBAL_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  button{cursor:pointer;border:none;background:none;font-family:inherit;color:inherit;-webkit-tap-highlight-color:transparent;transition:transform .12s ease}
  button:active{transform:scale(.96)}

  @keyframes slideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  @keyframes bounceIn{0%{opacity:0;transform:scale(.35)}55%{transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
  @keyframes floatUp{0%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(-50%,-70px) scale(.7)}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
  @keyframes wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-10deg)}75%{transform:rotate(10deg)}}
  @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
  @keyframes premiumIntro{0%{opacity:0;transform:scale(.92)}18%{opacity:1;transform:scale(1)}72%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.04)}}
  @keyframes premiumRay{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
  @keyframes steam1{0%,100%{transform:translateY(0) scaleX(1) rotate(-3deg);opacity:.7}50%{transform:translateY(-18px) scaleX(1.3) rotate(3deg);opacity:0}}
  @keyframes steam2{0%,100%{transform:translateY(0) scaleX(1) rotate(4deg);opacity:.5}50%{transform:translateY(-22px) scaleX(1.4) rotate(-4deg);opacity:0}}
  @keyframes steam3{0%,100%{transform:translateY(0) scaleX(1) rotate(-2deg);opacity:.6}50%{transform:translateY(-16px) scaleX(1.2) rotate(2deg);opacity:0}}
  @keyframes pulseHold{0%,100%{box-shadow:0 0 0 0 rgba(212,160,23,.5)}50%{box-shadow:0 0 0 12px rgba(212,160,23,0)}}
  @keyframes popIn{0%{transform:scale(0) translateY(20px);opacity:0}60%{transform:scale(1.15) translateY(-4px)}100%{transform:scale(1) translateY(0);opacity:1}}
  @keyframes floatUpFb{0%{opacity:1;transform:translateX(-50%) translateY(0)}100%{opacity:0;transform:translateX(-50%) translateY(-40px)}}
  @keyframes glowRing{0%,100%{box-shadow:0 0 16px rgba(212,160,23,.4)}50%{box-shadow:0 0 32px rgba(212,160,23,.9)}}
  @keyframes perfectPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
  @keyframes idle{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-8px) rotate(2deg)}}
  @keyframes cafeToastIn{0%{opacity:0;transform:translateX(-50%) translateY(-22px) scale(.8)}60%{opacity:1;transform:translateX(-50%) translateY(0) scale(1.08)}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
  @keyframes cafeToastOut{0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}100%{opacity:0;transform:translateX(-50%) translateY(-12px) scale(.92)}}
  @keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(212,160,23,.5)}50%{box-shadow:0 0 0 14px rgba(212,160,23,0)}}
  @keyframes floatUpClick{0%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(calc(-50% + var(--tx,0)),-80px) scale(.6)}}
  @keyframes shake{0%,100%{transform:translate(0,0) rotate(0)}25%{transform:translate(-2px,1px) rotate(-1deg)}75%{transform:translate(2px,-1px) rotate(1deg)}}
  @keyframes ringExpand{0%{transform:scale(.5);opacity:.8}100%{transform:scale(2);opacity:0}}
  @keyframes countdown{0%{transform:scale(2);opacity:0}30%{transform:scale(1);opacity:1}80%{transform:scale(1);opacity:1}100%{transform:scale(.5);opacity:0}}
  @keyframes recordPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
  @keyframes pulseRing{0%{box-shadow:0 0 0 0 rgba(212,160,23,.55)}70%{box-shadow:0 0 0 8px rgba(212,160,23,0)}100%{box-shadow:0 0 0 0 rgba(212,160,23,0)}}
  @keyframes coinPop{0%{transform:scale(.5)}45%{transform:scale(1.35)}100%{transform:scale(1)}}
  @keyframes glow{0%,100%{box-shadow:0 0 16px rgba(212,160,23,.35),0 4px 16px rgba(212,160,23,.4)}50%{box-shadow:0 0 32px rgba(212,160,23,.75),0 4px 16px rgba(212,160,23,.6)}}
  @keyframes cookieIdle{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-7px) rotate(2deg)}}
  @keyframes sparkle{0%,100%{opacity:0;transform:scale(0) rotate(0)}50%{opacity:1;transform:scale(1) rotate(180deg)}}
  @keyframes confetti{0%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(var(--tx,0),var(--ty,80px)) rotate(720deg);opacity:0}}
  @keyframes fillBar{from{width:0}to{width:var(--w)}}
  @keyframes pop{0%{transform:scale(1)}50%{transform:scale(1.06)}100%{transform:scale(1)}}
  @keyframes gradientShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
  @keyframes ringRotate{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes livePulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.35)}}
  @keyframes marketTickIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
  @keyframes cupShake{0%,100%{transform:translateX(0) rotate(0)}15%{transform:translateX(-6px) rotate(-3deg)}30%{transform:translateX(6px) rotate(3deg)}45%{transform:translateX(-5px) rotate(-2deg)}60%{transform:translateX(5px) rotate(2deg)}75%{transform:translateX(-2px) rotate(-1deg)}}
  @keyframes steamRise{0%{opacity:0;transform:translateY(0) scaleX(1)}30%{opacity:.55}100%{opacity:0;transform:translateY(-26px) scaleX(1.6)}}
  @keyframes cardMatch{0%{transform:scale(1);box-shadow:0 4px 12px rgba(0,0,0,.1)}35%{transform:scale(1.12);box-shadow:0 0 28px rgba(212,160,23,.85),0 4px 12px rgba(212,160,23,.5)}100%{transform:scale(.92);opacity:.35;box-shadow:0 0 0 rgba(0,0,0,0)}}

  .su{animation:slideUp .35s ease-out both}
  .bi{animation:bounceIn .55s cubic-bezier(.36,.07,.19,.97) both}
  .fu{animation:floatUp .85s ease-out forwards;position:absolute;pointer-events:none;font-size:17px;font-weight:800;color:#D4A017;white-space:nowrap;z-index:10;text-shadow:0 1px 4px rgba(74,44,23,.4);left:50%;top:0}
  .float-anim{animation:float 3s ease-in-out infinite}
  .wiggle-anim{animation:wiggle .55s ease-in-out}
  .coin-pop{display:inline-block;animation:coinPop .42s cubic-bezier(.36,.07,.19,.97)}
  .cookie-idle{animation:cookieIdle 2.6s ease-in-out infinite}
  .glow-anim{animation:glow 2s ease-in-out infinite}
  .pulse-ring{animation:pulseRing 1.6s ease-in-out infinite}
  .live-pulse{animation:livePulse 1.8s ease-in-out infinite}
  .market-tick{animation:marketTickIn .4s ease-out both}
  .cup-shake{animation:cupShake .55s ease-in-out}
  .steam-rise{animation:steamRise 1.2s ease-out infinite}
  .sparkle-anim{animation:sparkle 1.8s ease-in-out infinite}
  .pop-anim{animation:pop .25s ease-out}
  .shimmer-bar{position:absolute;top:0;left:0;height:100%;width:50%;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.65) 50%,transparent 100%);animation:shimmer 2.6s ease-in-out infinite}
  .gradient-anim{background-size:200% 200%;animation:gradientShift 3.5s ease infinite}
  .stagger-1{animation-delay:.05s}.stagger-2{animation-delay:.1s}.stagger-3{animation-delay:.15s}.stagger-4{animation-delay:.2s}
  .confetti-piece{position:absolute;font-size:20px;pointer-events:none;animation:confetti 1.4s ease-out forwards}
  ::-webkit-scrollbar{width:0}
`;

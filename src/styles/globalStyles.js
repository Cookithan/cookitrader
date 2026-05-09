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
  /* Mobile : désactive la sélection de texte et le menu contextuel
     (rectangle bleu / "Copier / Tout sélectionner") sur appui long.
     On réactive sur input/textarea pour la saisie/copie utile. */
  html,body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
  input,textarea,[contenteditable="true"]{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}
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
  @keyframes cheatWarning{0%{opacity:0;transform:translateX(-50%) translateY(-10px)}100%{opacity:1;transform:translateX(-50%) translateY(0)}}
  @keyframes pulseRing{0%{box-shadow:0 0 0 0 rgba(212,160,23,.55)}70%{box-shadow:0 0 0 8px rgba(212,160,23,0)}100%{box-shadow:0 0 0 0 rgba(212,160,23,0)}}
  @keyframes coinPop{0%{transform:scale(.5)}45%{transform:scale(1.35)}100%{transform:scale(1)}}
  @keyframes glow{0%,100%{box-shadow:0 0 16px rgba(212,160,23,.35),0 4px 16px rgba(212,160,23,.4)}50%{box-shadow:0 0 32px rgba(212,160,23,.75),0 4px 16px rgba(212,160,23,.6)}}
  @keyframes latteShimmer{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
  /* Titres couleur (data/titles.js) — variations animées pour distinguer */
  @keyframes titleSpin{0%{background-position:0% 50%}100%{background-position:300% 50%}}
  @keyframes titleFlicker{0%,100%{filter:drop-shadow(0 0 6px rgba(255,140,40,.8))}25%{filter:drop-shadow(0 0 12px rgba(255,180,60,.95))}50%{filter:drop-shadow(0 0 4px rgba(255,80,20,.7))}75%{filter:drop-shadow(0 0 14px rgba(255,200,80,1))}}
  @keyframes titlePulse{0%,100%{filter:drop-shadow(0 0 6px rgba(212,160,23,.55))}50%{filter:drop-shadow(0 0 16px rgba(255,215,90,.95))}}
  /* Pile de Tasses (BRIEF) — vapeur, pulse zone tap, +5 floating, halo perfect */
  @keyframes cupGameSteamRise{0%{transform:translateY(8px) scale(.7);opacity:0}30%{opacity:1}100%{transform:translateY(-26px) scale(1.3);opacity:0}}
  @keyframes cupGameTapPulse{0%,100%{opacity:.75;transform:translateX(-50%) scale(1)}50%{opacity:1;transform:translateX(-50%) scale(1.04)}}
  @keyframes cupGameRewardFloat{0%{transform:translate(-50%,30px);opacity:0}15%{opacity:1}100%{transform:translate(-50%,-80px);opacity:0}}
  @keyframes cupGameGlowPulse{0%,100%{opacity:.4;transform:translateX(-50%) scale(.95)}50%{opacity:.8;transform:translateX(-50%) scale(1.05)}}
  /* Pile de Tasses — refonte design : grains café flottants en BG +
     particules grains qui jaillissent au tap. */
  @keyframes pyramidBeanFloat{0%,100%{transform:translateY(0) rotate(var(--rot,0deg))}50%{transform:translateY(-8px) rotate(var(--rot,0deg))}}
  @keyframes pyramidBeanFly{0%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(var(--ptx,0),var(--pty,0)) rotate(var(--prot,360deg));opacity:0}}
  /* Machine à Sous (BRIEF) — rouleau qui défile, arrêt rebond, halo gagnants, jackpot */
  @keyframes slotReelSpin{0%{transform:translateY(-100%);opacity:.3}50%{transform:translateY(0);opacity:1}100%{transform:translateY(100%);opacity:.3}}
  @keyframes slotReelStop{0%{transform:translateY(-50px) scale(.8);opacity:0}60%{transform:translateY(5px) scale(1.1);opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}
  @keyframes slotReelWinner{from{transform:scale(1)}to{transform:scale(1.05)}}
  @keyframes slotReelJackpot{0%{transform:scale(1)}100%{transform:scale(1.12)}}
  @keyframes slotToastSlide{0%{opacity:0;transform:translateY(-20px) scale(.8)}15%{opacity:1;transform:translateY(0) scale(1)}85%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-10px) scale(.95)}}
  @keyframes slotMachineConfetti{0%{opacity:1;transform:translate(0,0) rotate(0deg)}100%{opacity:0;transform:var(--confetti-end)}}
  @keyframes slotJackpotFadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slotJackpotPop{0%{transform:scale(0) rotate(-12deg)}100%{transform:scale(1) rotate(0deg)}}
  @keyframes slotJackpotBounce{from{transform:scale(1) rotate(-3deg)}to{transform:scale(1.15) rotate(5deg)}}
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
  @keyframes clientWalkIn{0%{transform:translateX(180%) translateY(0)}20%{transform:translateX(140%) translateY(-3px)}40%{transform:translateX(95%) translateY(0)}60%{transform:translateX(55%) translateY(-3px)}80%{transform:translateX(20%) translateY(0)}100%{transform:translateX(0) translateY(0)}}
  @keyframes clientWalkOut{0%{transform:translateX(0) translateY(0)}25%{transform:translateX(-50%) translateY(-3px)}50%{transform:translateX(-100%) translateY(0)}75%{transform:translateX(-160%) translateY(-3px);opacity:.7}100%{transform:translateX(-220%) translateY(0);opacity:0}}
  @keyframes bubblePopIn{0%{transform:scale(.6) translateY(8px);opacity:0}55%{transform:scale(1.05) translateY(0);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}
  @keyframes spotlightPulse{0%,100%{stroke-width:3;opacity:.7}50%{stroke-width:5;opacity:1}}

  /* ── INBOX (BRIEF_INBOX) ───────────────────────────── */
  @keyframes inboxPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
  @keyframes inboxBadgePulse{0%,100%{box-shadow:0 0 0 0 rgba(212,160,23,.7)}50%{box-shadow:0 0 0 6px rgba(212,160,23,0)}}
  @keyframes inboxSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes inboxSlideDown{from{transform:translateY(0)}to{transform:translateY(100%)}}
  /* Anime background-color (pas opacity) pour ne pas cacher le panel
     intérieur qui slide en parallèle — sinon l'opacity 0→1 du parent
     masque le slide jusqu'à sa fin et le panel "saute" en place. */
  @keyframes inboxOverlayIn{from{background-color:rgba(15,8,4,0)}to{background-color:rgba(15,8,4,.55)}}
  @keyframes inboxOverlayOut{from{background-color:rgba(15,8,4,.55)}to{background-color:rgba(15,8,4,0)}}
  .inbox-pulse{animation:inboxPulse 1.6s ease-in-out infinite}
  .inbox-badge-pulse{animation:inboxBadgePulse 1.6s ease-in-out infinite}
  .inbox-slide-up{animation:inboxSlideUp .32s cubic-bezier(.36,.07,.19,.97) both}
  .inbox-slide-down{animation:inboxSlideDown .28s ease-in both}
  .inbox-overlay-in{animation:inboxOverlayIn .25s ease-out both}
  .inbox-overlay-out{animation:inboxOverlayOut .25s ease-in both}

  /* ── BADGES SECRETS (BRIEF_BADGES_SECRETS) ─────────── */
  @keyframes badgePop{0%{transform:scale(0) rotate(-180deg);opacity:0}60%{transform:scale(1.1) rotate(10deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes badgeIcon{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.12) rotate(5deg)}}
  .badge-pop{animation:badgePop .6s cubic-bezier(.34,1.56,.64,1) both}
  .badge-icon-bounce{animation:badgeIcon 1.6s ease-in-out infinite}

  /* ── TOASTER global (BRIEF_INBOX phase 2) ────────── */
  @keyframes toastIn{from{opacity:0;transform:translateY(-12px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes toastOut{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(-12px) scale(.94)}}
  .toast-in{animation:toastIn .25s cubic-bezier(.36,.07,.19,.97) both}
  .toast-out{animation:toastOut .25s ease-in both}

  /* ── SPLASH SCREEN ───────────────────────────────── */
  .splash-screen{position:fixed;inset:0;background:linear-gradient(135deg,#4A2C17 0%,#3D2010 50%,#2C1810 100%);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:24px;z-index:9999;transition:opacity .5s ease;overflow:hidden}
  .splash-screen.fade-out{opacity:0;pointer-events:none}
  .splash-blob{position:absolute;border-radius:50%;pointer-events:none;filter:blur(40px)}
  .splash-blob-1{top:10%;left:-20%;width:200px;height:200px;background:rgba(212,160,23,.15)}
  .splash-blob-2{bottom:10%;right:-15%;width:180px;height:180px;background:rgba(193,127,60,.12)}
  .splash-title{display:flex;gap:0;z-index:2}
  .splash-letter{font-size:44px;font-weight:900;color:#E8C896;text-shadow:0 2px 8px rgba(212,160,23,.4),0 0 24px rgba(212,160,23,.2);opacity:0;transform:translateY(20px) scale(.7);animation:splashLetterIn .4s cubic-bezier(.34,1.56,.64,1) forwards;letter-spacing:0}
  @keyframes splashLetterIn{0%{opacity:0;transform:translateY(20px) scale(.7)}60%{opacity:1;transform:translateY(-4px) scale(1.1)}100%{opacity:1;transform:translateY(0) scale(1)}}
  .splash-subtitle{color:#A0784E;font-size:13px;font-weight:600;letter-spacing:4px;text-transform:uppercase;opacity:0;animation:splashSubIn .5s ease 1.7s forwards;z-index:2}
  .splash-screen.fast .splash-subtitle{animation:splashSubIn .35s ease .8s forwards}
  @keyframes splashSubIn{from{opacity:0;transform:translateY(10px)}to{opacity:.9;transform:translateY(0)}}
  .splash-dots{display:flex;gap:8px;margin-top:12px;opacity:0;animation:splashDotsIn .4s ease 1.9s forwards;z-index:2}
  .splash-screen.fast .splash-dots{animation:splashDotsIn .3s ease .9s forwards}
  @keyframes splashDotsIn{from{opacity:0}to{opacity:1}}
  .splash-dot{width:7px;height:7px;border-radius:50%;background:#D4A017;animation:splashDotPulse 1.2s ease-in-out infinite}
  .splash-dot:nth-child(2){animation-delay:.15s}
  .splash-dot:nth-child(3){animation-delay:.3s}
  @keyframes splashDotPulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
  @keyframes tabSlideInRight{from{transform:translateX(60%);opacity:.4}to{transform:translateX(0);opacity:1}}
  @keyframes tabSlideInLeft{from{transform:translateX(-60%);opacity:.4}to{transform:translateX(0);opacity:1}}
  .tab-slide-in-right{animation:tabSlideInRight .28s cubic-bezier(.36,.07,.19,.97) both}
  .tab-slide-in-left{animation:tabSlideInLeft .28s cubic-bezier(.36,.07,.19,.97) both}

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

  /* ── CAFE SCENE (GuessGame) ─────────────────────── */
  .cafe-scene{width:100%;aspect-ratio:1;border-radius:18px;overflow:hidden;position:relative;margin-bottom:14px;box-shadow:0 12px 32px rgba(74,44,23,.25);border:2px solid #E8DDD0}
  .cs-wall{position:absolute;top:0;left:0;right:0;height:60%;background:linear-gradient(180deg,#F0D8B0 0%,#E5C088 50%,#D4A572 100%)}
  .cs-floor{position:absolute;bottom:0;left:-10%;right:-10%;height:50%;background:linear-gradient(180deg,#C8A878 0%,#B89868 30%,#A88858 60%,#987848 100%);transform:rotateX(60deg);transform-origin:bottom center;z-index:1}
  .cs-floor::before{content:'';position:absolute;inset:0;background-image:linear-gradient(90deg,transparent 24%,rgba(74,44,23,.25) 25%,transparent 26%),linear-gradient(90deg,transparent 49%,rgba(74,44,23,.25) 50%,transparent 51%),linear-gradient(90deg,transparent 74%,rgba(74,44,23,.25) 75%,transparent 76%),linear-gradient(180deg,transparent 33%,rgba(74,44,23,.2) 33.5%,transparent 34%),linear-gradient(180deg,transparent 66%,rgba(74,44,23,.15) 66.5%,transparent 67%)}
  .cs-picture{position:absolute;top:8%;left:8%;width:50px;height:38px;background:#2C1810;border:3px solid #5C3317;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 3px 8px rgba(0,0,0,.3);z-index:2}
  .cs-picture::after{content:'';position:absolute;top:100%;left:50%;width:1px;height:8px;background:#5C3317}
  .cs-lamp{position:absolute;top:0;left:50%;transform:translateX(-50%);width:2px;height:22%;background:#3D2010;z-index:2}
  .cs-lamp::after{content:'';position:absolute;bottom:-8px;left:-14px;width:30px;height:18px;background:linear-gradient(180deg,#D4A017,#8B6914);border-radius:0 0 16px 16px;box-shadow:0 0 24px rgba(255,200,100,.7);border:1.5px solid #5C3317}
  .cs-shelf{position:absolute;top:12%;right:5%;width:90px;height:28px;background:linear-gradient(180deg,#5C3317 0%,#3D2010 100%);border-radius:2px;box-shadow:0 4px 8px rgba(0,0,0,.3);display:flex;justify-content:space-around;align-items:flex-end;padding:0 4px 2px;z-index:2}
  .cs-cup-mini{width:14px;height:16px;background:linear-gradient(180deg,#F0E4D0 0%,#DCC8A8 100%);border-radius:2px 2px 4px 4px;border:1px solid #A0784E;position:relative}
  .cs-cup-mini::after{content:'';position:absolute;right:-3px;top:4px;width:4px;height:6px;border:1px solid #A0784E;border-left:none;border-radius:0 4px 4px 0}
  .cs-plant{position:absolute;bottom:38%;left:4%;width:35px;z-index:2}
  .cs-table-bg{position:absolute;bottom:36%;right:6%;width:50px;z-index:2;transform:scale(.85);opacity:.95}
  .cs-customer{position:absolute;bottom:22%;left:50%;transform:translateX(-50%);width:110px;z-index:3;animation:csCustomerWalkIn .8s ease-out;transform-origin:bottom center}
  @keyframes csCustomerWalkIn{from{transform:translateX(180%);opacity:0}to{transform:translateX(-50%);opacity:1}}
  .cs-bubble{position:absolute;bottom:105%;left:50%;transform:translateX(-25%);background:#FBF3E2;border:1.5px solid #C8A878;border-radius:14px;padding:9px 13px;font-size:11px;color:#2C1810;font-weight:600;line-height:1.35;box-shadow:0 6px 16px rgba(74,44,23,.3);width:165px;animation:csBubblePop .35s ease-out both;z-index:6}
  .cs-bubble::after{content:'';position:absolute;bottom:-8px;left:30%;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid #FBF3E2}
  @keyframes csBubblePop{0%{transform:translateX(-25%) scale(0);opacity:0}70%{transform:translateX(-25%) scale(1.05);opacity:1}100%{transform:translateX(-25%) scale(1);opacity:1}}
  .cs-steam{position:absolute;bottom:32%;left:18%;width:4px;height:14px;background:rgba(255,255,255,.7);border-radius:50%;filter:blur(2px);animation:csSteamFloat 1.8s ease-in-out infinite;z-index:7}
  .cs-steam.s2{left:22%;animation-delay:.4s}
  @keyframes csSteamFloat{0%{transform:translateY(0) scale(1);opacity:.8}100%{transform:translateY(-30px) scale(1.6);opacity:0}}
  .cs-counter-items{position:absolute;bottom:26%;left:0;right:0;z-index:6;pointer-events:none;height:64px}
  .cs-machine{position:absolute;bottom:0;left:8%;width:56px;height:64px}
  .cs-pastry{position:absolute;bottom:0;right:32%;width:36px;height:30px}
  .cs-register{position:absolute;bottom:2px;right:8%;width:42px;height:38px}
  .cs-counter{position:absolute;bottom:0;left:-5%;right:-5%;height:32%;z-index:5}
  .cs-counter-top{position:absolute;top:0;left:0;right:0;height:28px;background:linear-gradient(180deg,#E5C088 0%,#C8A878 25%,#8B6A4E 70%,#5C3317 100%);box-shadow:inset 0 2px 4px rgba(255,230,180,.6),inset 0 -2px 4px rgba(0,0,0,.3);transform:perspective(400px) rotateX(35deg);transform-origin:bottom;border-top:2px solid rgba(255,240,200,.7)}
  .cs-counter-top::before{content:'';position:absolute;top:4px;left:5%;right:5%;height:4px;background:linear-gradient(90deg,transparent 0%,rgba(255,245,220,.8) 30%,rgba(255,245,220,.8) 70%,transparent 100%);border-radius:50%;filter:blur(2px)}
  .cs-counter-front{position:absolute;top:24px;left:0;right:0;bottom:0;background:linear-gradient(180deg,#5C3317 0%,#3D2010 100%);background-image:linear-gradient(90deg,transparent 19%,rgba(0,0,0,.4) 20%,transparent 21%),linear-gradient(90deg,transparent 39%,rgba(0,0,0,.4) 40%,transparent 41%),linear-gradient(90deg,transparent 59%,rgba(0,0,0,.4) 60%,transparent 61%),linear-gradient(90deg,transparent 79%,rgba(0,0,0,.4) 80%,transparent 81%),linear-gradient(180deg,#5C3317 0%,#3D2010 100%);box-shadow:inset 0 6px 12px rgba(0,0,0,.4),inset 0 -2px 4px rgba(0,0,0,.5);border-top:1px solid rgba(0,0,0,.6)}
  .cs-counter-front::after{content:'';position:absolute;bottom:-6px;left:5%;right:5%;height:8px;background:rgba(0,0,0,.4);filter:blur(4px);border-radius:50%}

  /* ── RÉFLEXES CAFÉ (ReflexGame) ─────────────────── */
  .reflex-arena{width:100%;aspect-ratio:1;border-radius:18px;overflow:hidden;position:relative;margin-bottom:14px;box-shadow:0 12px 32px rgba(74,44,23,.3);border:2px solid #E8DDD0}
  .rx-arena-bg{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0px,transparent 38px,rgba(74,44,23,.4) 38px,rgba(74,44,23,.4) 40px,transparent 40px,transparent 78px,rgba(74,44,23,.3) 78px,rgba(74,44,23,.3) 80px),repeating-linear-gradient(0deg,rgba(193,127,60,.1) 0px,rgba(193,127,60,.1) 1px,transparent 1px,transparent 4px),linear-gradient(135deg,#B07E4F 0%,#8B5A2B 50%,#6B4220 100%)}
  .rx-arena-bg::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 30%,rgba(45,22,8,.5) 100%);pointer-events:none}
  .rx-knot{position:absolute;border-radius:50%;background:radial-gradient(circle at 30% 30%,#5C3317,#3D2010);box-shadow:0 0 4px rgba(0,0,0,.3);pointer-events:none;opacity:.6;z-index:1}
  .rx-k1{top:15%;left:12%;width:12px;height:8px}
  .rx-k2{top:70%;right:18%;width:10px;height:7px}
  .rx-k3{top:45%;left:78%;width:14px;height:9px}
  .rx-light-spot{position:absolute;inset:0;background:radial-gradient(ellipse 60% 50% at 50% 40%,rgba(255,220,150,.18),transparent 70%);pointer-events:none;z-index:1}
  .rx-combo-counter{position:absolute;top:12px;left:12px;background:rgba(45,22,8,.85);backdrop-filter:blur(8px);color:#D4A017;padding:6px 12px;border-radius:12px;font-size:11px;font-weight:800;z-index:5;border:1.5px solid rgba(212,160,23,.4);box-shadow:0 4px 12px rgba(0,0,0,.3)}
  .rx-combo-counter .num{font-size:16px}
  .rx-combo-badge{position:absolute;top:12px;right:12px;background:linear-gradient(135deg,#D4A017,#C17F3C);color:#fff;padding:6px 12px;border-radius:14px;font-size:13px;font-weight:900;z-index:5;box-shadow:0 4px 12px rgba(212,160,23,.5);animation:rxComboPop .3s ease}
  @keyframes rxComboPop{0%{transform:scale(0);opacity:0}70%{transform:scale(1.15);opacity:1}100%{transform:scale(1);opacity:1}}
  .rx-cookie{position:absolute;width:70px;height:70px;border-radius:50%;cursor:pointer;z-index:4;animation:rxCookieAppear .25s ease-out;transform-origin:center;transition:opacity .15s;background:transparent;border:none;padding:0}
  .rx-cookie.disappearing{animation:rxCookieDisappear .2s ease-out forwards;pointer-events:none}
  .rx-cookie.tapped{animation:rxCookieTapped .3s ease-out forwards;pointer-events:none}
  .rx-cookie::before{content:'';position:absolute;inset:-4px;border-radius:50%;border:2px solid rgba(212,160,23,.5);animation:rxCookiePulse .8s ease-in-out infinite;pointer-events:none}
  @keyframes rxCookieAppear{0%{transform:scale(0) rotate(-30deg);opacity:0}60%{transform:scale(1.15) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes rxCookieDisappear{0%{transform:scale(1) rotate(0);opacity:1}100%{transform:scale(0) rotate(40deg);opacity:0}}
  @keyframes rxCookieTapped{0%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.8}100%{transform:scale(0);opacity:0}}
  @keyframes rxCookiePulse{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.15);opacity:0}}
  .rx-particles-layer{position:absolute;inset:0;pointer-events:none;z-index:6}
  .rx-crumb{position:absolute;font-size:16px;animation:rxCrumbFly .7s ease-out forwards;pointer-events:none}
  @keyframes rxCrumbFly{0%{transform:translate(0,0) rotate(0) scale(1);opacity:1}100%{transform:translate(var(--tx),var(--ty)) rotate(var(--rot)) scale(.4);opacity:0}}
  .rx-plus-one{position:absolute;font-size:18px;font-weight:900;color:#D4A017;text-shadow:0 2px 4px rgba(0,0,0,.4);animation:rxPlusOneFloat .7s ease-out forwards;pointer-events:none}
  @keyframes rxPlusOneFloat{0%{transform:translate(-50%,0) scale(1);opacity:1}100%{transform:translate(-50%,-50px) scale(1.4);opacity:0}}

  /* Thème Noir & Blanc — désature TOUTE l'UI quand activé. La classe est
     toggle sur body par App.jsx selon activeTheme. Couvre les couleurs
     hardcodées (GOLD, ESPRESSO, gradients), les emojis et les overlays
     fixed (qui resteraient hors d'un filter sur le wrapper React).
     contrast() retiré car coûteux à chaque repaint (lag perceptible
     sur switch d'onglet / animations). On garde grayscale(1) seul, et
     la palette du thème est déjà tunée extrême noir/blanc pour
     compenser. */
  body.theme-noir-on{filter:grayscale(1)}
`;

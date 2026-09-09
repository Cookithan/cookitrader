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
  @keyframes priceFlashUp{0%{color:#D4A017;text-shadow:0 0 0 #F0C050}30%{color:#F0C050;text-shadow:0 0 14px #F0C050;transform:scale(1.05)}100%{color:#D4A017;text-shadow:0 0 0 #F0C050;transform:scale(1)}}
  @keyframes priceFlashDown{0%{color:#D4A017;text-shadow:0 0 0 #A88060}30%{color:#A88060;text-shadow:0 0 14px #7D4E1F;transform:scale(.97)}100%{color:#D4A017;text-shadow:0 0 0 #A88060;transform:scale(1)}}

  /* ── Boss communautaire (Le Gâteau Géant) ────────────── */
  /* bossIdle : balancement pendulaire gauche↔droite. 0% == 100%
     (boucle sans à-coup) + ease-in-out → mouvement continu, pas de
     "reset" visible. transformOrigin:center bottom (sur BossCake)
     → il se balance sur sa base comme un gâteau vivant. */
  @keyframes bossIdle{0%{transform:translateY(0) rotate(0deg) scale(1)}25%{transform:translateY(-5px) rotate(2.5deg) scale(1.02)}50%{transform:translateY(0) rotate(0deg) scale(1)}75%{transform:translateY(-5px) rotate(-2.5deg) scale(1.02)}100%{transform:translateY(0) rotate(0deg) scale(1)}}
  @keyframes bossHit{0%,100%{transform:translate(0,0) rotate(0) scale(1)}20%{transform:translate(-7px,2px) rotate(-3deg) scale(1.05)}45%{transform:translate(6px,-2px) rotate(3deg) scale(.97)}70%{transform:translate(-3px,1px) rotate(-1.5deg) scale(1.02)}}
  @keyframes bossSteam{0%{opacity:0;transform:translateY(4px) scaleX(.9)}35%{opacity:.75}100%{opacity:0;transform:translateY(-22px) scaleX(1.4)}}
  .boss-idle{animation:bossIdle 3.2s ease-in-out infinite}
  .boss-hit{animation:bossHit .42s ease-out}
  .boss-steam-a{animation:bossSteam 2.6s ease-in-out infinite;transform-origin:center}
  .boss-steam-b{animation:bossSteam 2.6s ease-in-out .5s infinite;transform-origin:center}
  .boss-steam-c{animation:bossSteam 2.6s ease-in-out 1s infinite;transform-origin:center}
  @keyframes bossAura{0%,100%{opacity:.35;transform:translate(-50%,-50%) scale(.92)}50%{opacity:.7;transform:translate(-50%,-50%) scale(1.08)}}
  @keyframes bossDmgFloat{0%{opacity:0;transform:translate(-50%,0) scale(.6)}18%{opacity:1;transform:translate(-50%,-14px) scale(1.15)}100%{opacity:0;transform:translate(-50%,-78px) scale(.9)}}
  @keyframes bossBarFlash{0%{opacity:.85}100%{opacity:0}}
  @keyframes bossBtnPulse{0%,100%{box-shadow:0 8px 22px rgba(212,160,23,.45),0 0 0 0 rgba(212,160,23,.5)}50%{box-shadow:0 8px 26px rgba(212,160,23,.6),0 0 0 10px rgba(212,160,23,0)}}
  @keyframes bossEyeGlow{0%,100%{opacity:.85}50%{opacity:1}}
  .boss-aura{animation:bossAura 2.8s ease-in-out infinite}
  .boss-dmg{animation:bossDmgFloat .7s ease-out forwards;will-change:transform,opacity}
  .boss-bar-flash{animation:bossBarFlash .55s ease-out forwards}
  .boss-btn-primary{animation:bossBtnPulse 2.2s ease-in-out infinite}
  .boss-btn-press{transform:scale(.95)!important;filter:brightness(1.08)}
  /* ── Animations BRIEF_BOSS_COMMUNAUTAIRE.md (copiées tel quel —
        adaptées de index.css vers globalStyles.js, CLAUDE.md #8) ── */
  /* bossAttack : recoil d'impact SANS flash (pas de filter:brightness).
     Le boss encaisse — squash/stretch + petit recul — puis revient.
     En !important il coupe le balancement le temps de réagir. */
  @keyframes bossAttack{0%{transform:translate(0,0) scale(1) rotate(0deg)}22%{transform:translate(0,4px) scale(1.1,0.9) rotate(0deg)}48%{transform:translate(-6px,0) scale(0.95,1.05) rotate(-3deg)}72%{transform:translate(4px,0) scale(1.02,0.98) rotate(2deg)}100%{transform:translate(0,0) scale(1) rotate(0deg)}}
  .boss-attacked{animation:bossAttack 0.42s ease-out !important}
  @keyframes bossAuraPulse{0%,100%{opacity:0.4;transform:translate(-50%, -50%) scale(1)}50%{opacity:0.8;transform:translate(-50%, -50%) scale(1.1)}}
  @keyframes bossFlash{0%{opacity:0}20%{opacity:0.4}100%{opacity:0}}
  @keyframes bossCrumbFly{0%{opacity:1;transform:translate(0, 0) rotate(0deg)}100%{opacity:0;transform:var(--end-transform)}}
  @keyframes bossDamageFloat{0%{opacity:0;transform:translate(-50%, 0) scale(0.5)}20%{opacity:1;transform:translate(-50%, -10px) scale(1.4)}100%{opacity:0;transform:translate(-50%, -90px) scale(1)}}
  @keyframes bossHpShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
  @keyframes bossActivitySlide{from{transform:translateX(-10px);opacity:0}to{transform:translateX(0);opacity:1}}
  /* Impact sur la barre à chaque coup (visible même si la largeur
     bouge à peine — 25 PV / 60000). Café-only, aucun rouge. */
  @keyframes bossBarHit{0%{opacity:0}30%{opacity:.85}100%{opacity:0}}
  .boss-bar-hit{animation:bossBarHit .4s ease-out forwards}
  /* Frappe ultime (1 ☕) : le gâteau s'effondre, reste au sol (état
     statique 5s tenu par le state), puis se relève. Chaque anim ≤700ms
     (esprit CLAUDE.md #8 : pas d'anim longue, le "à terre" est du state). */
  /* Coup critique : pivot au CENTRE + scale .85 → le gâteau couché
     reste entièrement visible dans la scène (plus de débordement /
     rognage par le cadre). */
  /* Pose couchée commune (bas de la scène : il est par terre) — fin
     de chute == état KO == début de relevée → aucun saut. KO = STATIQUE
     (il ne bouge plus pendant les 5 s, il est sonné). */
  @keyframes bossFall{0%{transform:translateY(0) rotate(0) scale(1)}55%{transform:translateY(74px) rotate(88deg) scale(.78)}74%{transform:translateY(66px) rotate(78deg) scale(.81)}100%{transform:translateY(70px) rotate(82deg) scale(.8)}}
  @keyframes bossGetUp{0%{transform:translateY(70px) rotate(82deg) scale(.8)}55%{transform:translateY(-4px) rotate(-8deg) scale(1.02)}100%{transform:translateY(0) rotate(0) scale(1)}}
  .boss-fall{animation:bossFall .6s cubic-bezier(.45,0,.55,1) forwards;transform-origin:center}
  /* Boost (100 🍪) : le gâteau se fige (plus de balancement) et vibre
     sur place — buzz rapide, court (~0.9s côté JS). */
  @keyframes bossStun{0%{transform:translate(0,0)}15%{transform:translate(-2px,1px)}30%{transform:translate(2px,-1px)}45%{transform:translate(-2px,-1px)}60%{transform:translate(2px,1px)}75%{transform:translate(-1px,1px)}100%{transform:translate(0,0)}}
  /* "zzz" quand le gâteau dort (KO) */
  @keyframes bossZzz{0%{opacity:0;transform:translate(0,0) scale(.5)}25%{opacity:1}100%{opacity:0;transform:translate(14px,-38px) scale(1.15)}}
  .boss-zzz{animation:bossZzz 1.8s ease-out infinite}
  /* Bannière boss accueil : pulse d'attention + press au clic */
  @keyframes bossBannerAttn{0%,100%{transform:scale(1);box-shadow:0 6px 18px rgba(122,74,40,.4)}50%{transform:scale(1.025);box-shadow:0 10px 26px rgba(212,160,23,.55)}}
  .boss-banner{animation:bossBannerAttn 1.6s ease-in-out infinite;transition:transform .12s ease}
  .boss-banner:active{transform:scale(.95)!important}
  /* Ouverture façon pop-up de l'overlay boss (au clic bannière) —
     garde translateX(-50%) pour rester centré pendant le zoom. */
  @keyframes bossPopIn{0%{opacity:.4;transform:translateX(-50%) translateY(100%)}100%{opacity:1;transform:translateX(-50%) translateY(0)}}
  .boss-pop{animation:bossPopIn .38s cubic-bezier(.22,1,.36,1) both}
  .boss-down{transform:translateY(70px) rotate(82deg) scale(.8);transform-origin:center}
  .boss-getup{animation:bossGetUp .55s ease-out forwards;transform-origin:center}
  /* Halo "tape le gâteau" quand une attaque est dispo */
  @keyframes bossReadyRing{0%{transform:translate(-50%,-50%) scale(.85);opacity:.55}70%{opacity:.12}100%{transform:translate(-50%,-50%) scale(1.25);opacity:0}}
  .boss-ready-ring{animation:bossReadyRing 1.6s ease-out infinite}
  @keyframes bossHintBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
  .boss-hint-bob{animation:bossHintBob 1.4s ease-in-out infinite}

  /* ── Animations Boîte Mystère (BRIEF_COFFRE) ─────────── */
  @keyframes boxIntro{0%{transform:scale(.6) translateY(20px);opacity:0;filter:drop-shadow(0 0 0 transparent)}60%{transform:scale(1.1) translateY(-4px);opacity:1}100%{transform:scale(1) translateY(0);filter:drop-shadow(0 8px 20px rgba(212,160,23,.4))}}
  @keyframes boxShake{0%,100%{transform:translateX(0) rotate(0)}10%{transform:translateX(-4px) rotate(-2deg)}20%{transform:translateX(5px) rotate(3deg)}30%{transform:translateX(-6px) rotate(-3deg)}40%{transform:translateX(6px) rotate(3deg)}50%{transform:translateX(-7px) rotate(-4deg)}60%{transform:translateX(7px) rotate(4deg)}70%{transform:translateX(-5px) rotate(-3deg)}80%{transform:translateX(5px) rotate(3deg)}90%{transform:translateX(-3px) rotate(-1deg)}}
  @keyframes boxBurst{0%{transform:scale(1);opacity:1;filter:brightness(1)}50%{transform:scale(1.3);opacity:1;filter:brightness(2)}100%{transform:scale(2);opacity:0;filter:brightness(3)}}
  @keyframes boxFlash{0%{background:rgba(255,255,255,0)}30%{background:rgba(255,224,154,.9)}60%{background:rgba(255,255,255,.7)}100%{background:rgba(255,255,255,0)}}
  @keyframes boxRewardReveal{0%{transform:scale(.3) translateY(40px);opacity:0;filter:drop-shadow(0 0 30px #FFE066)}50%{transform:scale(1.15) translateY(-6px);opacity:1}100%{transform:scale(1) translateY(0)}}
  @keyframes boxParticle{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--dx,0),var(--dy,-80px)) scale(.4);opacity:0}}
  /* Coffres premium (data/chests.js) — révélation séquentielle des 3 items
     avec glow couleur selon rareté. chestItemPop = entrée d'une carte item,
     chestItemGlow = pulse continu pour les rare/epic/legendary. */
  @keyframes chestItemPop{0%{transform:scale(.4) translateY(20px);opacity:0;filter:blur(4px)}55%{transform:scale(1.12) translateY(-4px);opacity:1;filter:blur(0)}100%{transform:scale(1) translateY(0)}}
  @keyframes chestItemGlow{0%,100%{box-shadow:0 0 12px var(--glow-soft,rgba(212,160,23,.3))}50%{box-shadow:0 0 24px var(--glow-soft,rgba(212,160,23,.6))}}
  @keyframes chestSparkleOrbit{0%{transform:rotate(0deg) translateX(var(--orbit,28px)) rotate(0deg);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:rotate(360deg) translateX(var(--orbit,28px)) rotate(-360deg);opacity:0}}
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

  /* ── BoostGainToast — pop bounce festif quand boost x2/doubler amplifie un gain ── */
  @keyframes boostPop{0%{opacity:0;transform:translateX(-50%) translateY(20px) scale(.7)}60%{opacity:1;transform:translateX(-50%) translateY(-4px) scale(1.06)}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
  .boost-pop{animation:boostPop .45s cubic-bezier(.5,1.6,.55,1) both}

  /* ── Pastille en ligne (présence) — pulse doux caramel/or ── */
  @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(.85)}}

  /* ── Coup de Grâce — cascade des emojis débloqués (apparition décalée) ── */
  @keyframes itemPop{0%{opacity:0;transform:scale(.3) rotate(-15deg)}60%{opacity:1;transform:scale(1.15) rotate(8deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
  .item-pop{animation:itemPop .5s cubic-bezier(.5,1.6,.55,1) both}

  /* ── Theme Pâte de Cookie — cookies décoratifs qui tournent et grandissent ──
     Le translate(-50%,-50%) dans CHAQUE keyframe centre le cookie sur sa
     position (left/top = centre du cookie). Sans ça, top/left = coin haut-gauche
     et les cookies positionnés près des bords sortent de l'écran au scale max. */

  /* ── SPLASH SCREEN ───────────────────────────────── */
  .splash-screen{position:fixed;inset:0;background:linear-gradient(135deg,#4A2C17 0%,#3D2010 50%,#2C1810 100%);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:24px;z-index:9999;transition:opacity .5s ease;overflow:hidden}
  .splash-screen.fade-out{opacity:0;pointer-events:none}

  /* ── Le splash d'un compte SOUS SURVEILLANCE (10/09) ──
     Cookithan : « si un joueur est surveillé par un mur, alors son splash
     devient un splash Sentinelle ».

     On ne redessine rien : on repeint. Les mêmes blocs, la même
     chorégraphie, seules les couleurs changent — bleu marine au lieu du
     moka, halos acier au lieu de l'or. Un joueur sanctionné ouvre son app
     et comprend AVANT de lire.

     Le texte reste factuel : « tes gains sont vérifiés », pas « tu es un
     tricheur ». Il a déjà vu ses valeurs remises à plat, l'humilier une
     seconde fois ne protège rien. */
  .splash-sentinelle{background:linear-gradient(135deg,#14496D 0%,#0E3355 50%,#0B2E4D 100%)}
  .splash-sentinelle .splash-blob-1{background:rgba(46,134,191,.22)}
  .splash-sentinelle .splash-blob-2{background:rgba(127,173,210,.14)}
  .splash-sentinelle .splash-letter{color:#DCEBF7;text-shadow:0 2px 8px rgba(46,134,191,.45),0 0 24px rgba(46,134,191,.25)}
  .splash-sentinelle .splash-subtitle{color:#9FC4DE;letter-spacing:1px;text-transform:none;font-size:12.5px;text-align:center}
  .splash-sentinelle .splash-dot{background:#7FADD2}
  .splash-sentinelle .splash-credit{color:rgba(220,235,247,.7)}

  /* Le bouclier respire, il ne clignote pas : c'est une surveillance
     tranquille, pas une alarme. */
  .splash-bouclier{font-size:56px;line-height:1;z-index:2;opacity:0;
    animation:splashBouclierIn .55s cubic-bezier(.34,1.56,.64,1) .1s forwards,
              sentinelleScrute 2.6s ease-in-out 1s infinite}
  @keyframes splashBouclierIn{from{opacity:0;transform:translateY(14px) scale(.7)}to{opacity:1;transform:none}}
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
  /* Crédit auteur — fade-in plus tardif et discret, positionné en pied
     de splash. Mode fast (refresh F5) : delay raccourci. */
  .splash-credit{position:absolute;bottom:32px;left:0;right:0;text-align:center;font-size:11px;font-weight:600;letter-spacing:1px;color:#A0784E;opacity:0;animation:splashCreditIn .5s ease 2.1s forwards;z-index:2}
  .splash-screen.fast .splash-credit{animation:splashCreditIn .35s ease 1.0s forwards}
  .splash-credit strong{color:#C17F3C;font-weight:800;letter-spacing:.5px}
  @keyframes splashCreditIn{from{opacity:0;transform:translateY(8px)}to{opacity:.75;transform:translateY(0)}}
  .splash-dot{width:7px;height:7px;border-radius:50%;background:#D4A017;animation:splashDotPulse 1.2s ease-in-out infinite}
  .splash-dot:nth-child(2){animation-delay:.15s}
  .splash-dot:nth-child(3){animation-delay:.3s}
  @keyframes splashDotPulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
  /* Transition tabs : slide-in du nouveau tab depuis le côté opposé
     au swipe. 200ms avec easing ultra-snappy (démarrage rapide, arrivée
     ferme) → sensation de fluidité maximale. translate3d + will-change
     pour activation GPU compositing. */
  @keyframes tabSlideInRight  { from{transform:translate3d(100%,0,0)}  to{transform:translate3d(0,0,0)} }
  @keyframes tabSlideInLeft   { from{transform:translate3d(-100%,0,0)} to{transform:translate3d(0,0,0)} }
  .tab-slide-in-right { animation:tabSlideInRight .2s cubic-bezier(.16,.84,.44,1) both; will-change:transform }
  .tab-slide-in-left  { animation:tabSlideInLeft  .2s cubic-bezier(.16,.84,.44,1) both; will-change:transform }

  /* ── Onglet Jeux (v1.30) ─────────────────────────────────────────
     .game-card   : retour tactile. Le doigt enfonce la carte, le ressort
                    du cubic-bezier la fait « popper » au relâchement.
                    Transform seul → composité GPU, aucun reflow.
     .game-emoji  : dérive lente du filigrane. La rotation est REPRISE
                    dans le keyframe, sinon l'animation écraserait le
                    rotate(-12deg) inline. Chaque carte reçoit un
                    animationDelay différent : synchronisées, les 10
                    cartes feraient mécanique, pas vivant.
     .game-overlay-in : entrée du jeu. Le translateX(-50%) de centrage
                    est repris dans le keyframe, même raison. */
  /* .tap-pop : le retour tactile générique de l'app — tout ce qui se
     tape peut le porter (cartes de jeu, boutons d'achat, pastilles).
     ⚠️ À ne JAMAIS poser sur un élément qui a déjà .su : son
     animation-fill-mode:both garde un transform appliqué par l'animation,
     qui l'emporte sur le :active et neutralise l'effet. Mettre .su sur
     un wrapper et .tap-pop sur l'élément tapable.
     ⚠️⚠️ AUCUN BACKTICK dans ce fichier, même en commentaire : tout le
     contenu est un template literal, un backtick le FERME. La syntaxe
     reste valide, le build passe, et l'app meurt au chargement. */
  .tap-pop,.game-card{transition:transform .16s cubic-bezier(.34,1.56,.64,1),box-shadow .16s ease;will-change:transform}
  .tap-pop:active,.game-card:active{transform:scale(.955)}
  /* Pop joué AVANT l'ouverture du jeu (200 ms, cf. launchGame).
     Il DÉMARRE à l'échelle enfoncée : sinon la carte redescendait une
     seconde fois au relâchement et on voyait deux rebonds au lieu d'un.
     Le doigt fait la descente, l'animation fait la remontée. */
  @keyframes gamePop{0%{transform:scale(.955)}55%{transform:scale(1.04)}100%{transform:scale(1)}}
  .game-pop{animation:gamePop .2s cubic-bezier(.34,1.56,.64,1) both}
  @keyframes gameEmojiDrift{0%,100%{transform:rotate(-12deg) translate3d(0,0,0)}50%{transform:rotate(-6deg) translate3d(0,-8px,0)}}
  .game-emoji{animation:gameEmojiDrift 4.8s ease-in-out infinite;will-change:transform}
  @keyframes gameOverlayIn{from{opacity:0;transform:translateX(-50%) scale(.94)}to{opacity:1;transform:translateX(-50%) scale(1)}}
  .game-overlay-in{animation:gameOverlayIn .26s cubic-bezier(.16,.84,.44,1) both}

  /* ── Carte niveau de l'Accueil (v1.30) ───────────────────────────
     Trois boucles d'ambiance, transform + opacity uniquement (composité
     GPU, aucun reflow). Ce sont des animations de FOND : elles dépassent
     les 700 ms de la convention, qui vise les transitions d'interface —
     même exception que float 3s, shimmer 2.6s ou glow 2s déjà en place.
     Déphasées entre elles (6s / 4.5s / 5.5s) pour que la carte respire
     au lieu de battre la mesure.
     AUCUN BACKTICK dans ce fichier, même en commentaire. */
  @keyframes levelSheen{0%{transform:translateX(-140%) skewX(-18deg)}42%{transform:translateX(320%) skewX(-18deg)}100%{transform:translateX(320%) skewX(-18deg)}}
  .level-sheen,.card-sheen{position:absolute;top:-30%;left:0;width:52%;height:170%;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(255,236,190,.26),rgba(255,255,255,.30),rgba(255,236,190,.26),transparent);animation:levelSheen 5s ease-in-out infinite;will-change:transform}
  /* Lueur chaude qui enfle et retombe dans le coin haut-gauche : la
     surface brune ne bouge pas, mais la lumiere qui tombe dessus si.
     Opacite seule -> composite, aucun repaint du degrade de fond. */
  @keyframes levelWarm{0%,100%{opacity:0}50%{opacity:.17}}
  .level-warm,.card-warm{position:absolute;inset:0;pointer-events:none;background:radial-gradient(130% 95% at 18% -10%, rgba(255,224,150,.95), transparent 62%);animation:levelWarm 7s ease-in-out infinite;will-change:opacity}
  /* Meme lumiere, mais froide et sur fond clair : la Sentinelle est
     bleue, pas brune. Une lueur ambree sur du bleu pale vire au sale ;
     on garde donc les memes keyframes et on ne change que la couleur. */
  .card-cool{position:absolute;inset:0;pointer-events:none;background:radial-gradient(130% 95% at 18% -10%, rgba(255,255,255,.95), transparent 62%);animation:levelWarm 7s ease-in-out infinite;will-change:opacity}
  /* ── L accueil de la Sentinelle ─────────────────────────────
     Elle se reveille quand on pousse la porte : le bouclier arrive en
     rebond, un halo se propage, la phrase monte derriere. Chaque piece
     reste sous 700 ms (regle du projet) ; c est le decalage entre elles
     qui donne l impression d une presence, pas leur duree. */
  @keyframes sentinelleWake{0%{opacity:0;transform:scale(.42) rotate(-14deg)}58%{opacity:1;transform:scale(1.14) rotate(5deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
  @keyframes sentinelleHalo{0%{opacity:.5;transform:scale(.55)}100%{opacity:0;transform:scale(2.1)}}
  @keyframes sentinelleLine{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
  @keyframes sentinelleOut{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.05)}}
  .s-wake{animation:sentinelleWake .62s cubic-bezier(.34,1.56,.64,1) both;will-change:transform,opacity}
  .s-halo{animation:sentinelleHalo .7s ease-out both;will-change:transform,opacity}
  .s-line{animation:sentinelleLine .45s ease-out both;will-change:transform,opacity}
  .s-out{animation:sentinelleOut .34s ease-in both;will-change:transform,opacity}
  .card-sheen-cool{position:absolute;top:-30%;left:0;width:52%;height:170%;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(255,255,255,.34),rgba(255,255,255,.62),rgba(255,255,255,.34),transparent);animation:levelSheen 5s ease-in-out infinite;will-change:transform}
  @keyframes levelGlint{0%{transform:translateX(-160%)}38%{transform:translateX(260%)}100%{transform:translateX(260%)}}
  /* L'eclat de la medaille de palier. Ce n'etait plus un <span> HTML
     mais un <rect> DANS le SVG depuis qu'on a retire le cercle autour du
     cookie : c'est le seul moyen de le faire s'arreter sur le bord
     bosselé du biscuit. Donc plus de position/background ici, ils ne
     veulent rien dire sur un rect — le degrade et la taille sont portes
     par le SVG lui-meme.
     transform-box:fill-box est obligatoire : sans lui, les pourcentages
     du keyframe se calculent sur le viewBox entier et l'eclat traverse
     trois fois trop loin. */
  .level-glint{pointer-events:none;transform-box:fill-box;animation:levelGlint 4.5s ease-in-out infinite;will-change:transform}
  @keyframes levelBubble{0%,100%{transform:scale(1);opacity:.05}50%{transform:scale(1.18);opacity:.1}}
  .level-bubble{animation:levelBubble 5.5s ease-in-out infinite;will-change:transform,opacity}

  .su{animation:slideUp .35s ease-out both}
  .bi{animation:bounceIn .55s cubic-bezier(.36,.07,.19,.97) both}
  /* Retour tactile generique : le bouton s enfonce sous le doigt.
     Pas d animation CSS ici, uniquement :active — une animation avec
     fill-mode both garderait son transform et mangerait le :active. */
  .tap-pop{transition:transform .12s ease}
  .tap-pop:active{transform:scale(.955)}
  .fu{animation:floatUp .85s ease-out forwards;position:absolute;pointer-events:none;font-size:17px;font-weight:800;color:#D4A017;white-space:nowrap;z-index:10;text-shadow:0 1px 4px rgba(74,44,23,.4);left:50%;top:0}
  .float-anim{animation:float 3s ease-in-out infinite}
  .wiggle-anim{animation:wiggle .55s ease-in-out}
  .coin-pop{display:inline-block;animation:coinPop .42s cubic-bezier(.36,.07,.19,.97)}
  .cookie-idle{animation:cookieIdle 2.6s ease-in-out infinite}
  .glow-anim{animation:glow 2s ease-in-out infinite}
  .pulse-ring{animation:pulseRing 1.6s ease-in-out infinite}
  .live-pulse{animation:livePulse 1.8s ease-in-out infinite}
  .market-tick{animation:marketTickIn .4s ease-out both}
  .price-flash-up{animation:priceFlashUp .7s ease-out;display:inline-block}
  .price-flash-down{animation:priceFlashDown .7s ease-out;display:inline-block}
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
     toggle sur body par App.jsx selon activeTheme.

     Implémentation via pseudo-element body::after avec backdrop-filter
     grayscale(1) — plutôt que filter:grayscale sur body lui-même qui
     créait un stacking context cassant les position:fixed (nav en bas,
     modales se retrouvaient ancrées au body au lieu du viewport).
     L'overlay agit sur le backdrop sans toucher au layout et couvre
     tout (z-index très haut, pointer-events:none laisse passer clics). */
  body.theme-noir-on::after{
    content:'';
    position:fixed;
    inset:0;
    pointer-events:none;
    z-index:9999;
    -webkit-backdrop-filter:grayscale(1);
    backdrop-filter:grayscale(1);
  }

  /* Spin pour les loaders (BuyCafesModal pendant fetch Stripe) */
  @keyframes spin360{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
  .spin-anim{animation:spin360 1s linear infinite}

  /* Ailes Flappy retirées 13/05/2026 (demande user). */

  /* Skeleton shimmer — barre de lumière qui balaye un bloc placeholder.
     Utilisé en background sur les rectangles "fake data" pendant un
     fetch. Le bloc parent doit avoir un background café-pâle + overflow
     hidden + position relative pour que le shimmer reste contenu. */
  @keyframes skeletonShimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
  }
  .skeleton-block{
    position:relative;
    overflow:hidden;
    background:rgba(139,90,42,.08);
    border-radius:6px;
  }
  .skeleton-block::after{
    content:'';
    position:absolute;
    inset:0;
    background:linear-gradient(90deg,transparent 0%,rgba(212,160,23,.18) 50%,transparent 100%);
    animation:skeletonShimmer 1.4s ease-in-out infinite;
    will-change:transform;
  }

  /* CafeFillLoader — tasse qui se remplit en boucle (Suspense fallback)
     - Cycle court (1.4s) pour qu'on voie le remplissage même si le
       loader n'est visible que ~500ms (chunk download rapide).
     - Remplissage concentré dans les 38 premiers % → l'œil voit la
       tasse SE REMPLIR dès l'apparition du loader.
     - Décalage 0/.25/.5s entre les 3 volutes de vapeur. */
  @keyframes cafeFill {
    0%   { height: 0%;   }
    38%  { height: 92%;  }
    55%  { height: 92%;  }
    100% { height: 0%;   }
  }
  @keyframes cafeSteam {
    0%   { opacity: 0;   transform: translateY(0)    scale(.55); }
    25%  { opacity: .6;  }
    100% { opacity: 0;   transform: translateY(-22px) scale(1.15); }
  }

  /* Cooki Rider — traits de vitesse. Ils ne servent pas à décorer : le
     maintien du doigt n'a aucun retour tactile sur un téléphone, donc
     c'est l'écran qui doit dire « tu accélères ». Le conteneur porte
     l'opacité (une seule écriture de style par image), les traits ne
     font que défiler. */
  @keyframes riderStreak {
    0%   { transform: translate3d(340px, 0, 0); }
    100% { transform: translate3d(-120px, 0, 0); }
  }
  /* Cooki Rider — la chaleur du café. Elle monte droit et lentement : ce
     n'est pas un effet de vitesse, c'est le rappel permanent qu'on porte
     une tasse pleine et chaude. */
  @keyframes riderChaleur {
    0%   { transform: translate3d(0, 0, 0) scale(.4);  opacity: 0;   }
    25%  {                                             opacity: .55; }
    100% { transform: translate3d(-6px, -21px, 0) scale(1.5); opacity: 0; }
  }
  /* L'échappement, lui, part vers l'arrière : couché par le déplacement,
     c'est ce qui donne la vitesse. */
  @keyframes riderEchappement {
    0%   { transform: translate3d(0, 0, 0) scale(.5); opacity: .5; }
    100% { transform: translate3d(-34px, -9px, 0) scale(1.9); opacity: 0; }
  }

  /* Cooki Rider — le petit mot après une figure. Il ne félicite pas, il
     constate : c'est ce ton-là qui donne envie de recommencer. */
  @keyframes riderTag {
    0%   { opacity: 0; transform: translateY(7px) scale(.96); }
    20%  { opacity: 1; transform: translateY(0)   scale(1);   }
    70%  { opacity: 1; }
    100% { opacity: 0; transform: translateY(-5px); }
  }
  .rider-tag { animation: riderTag .7s ease-out both; }

  /* Sentinelle — les pages et les stories (09/09).
     Une story arrive comme une carte qu'on pose : légère montée, fondu,
     rien de plus. La page glisse par transition CSS, pas par keyframe.
     Le mot de la Sentinelle s'écrit mot à mot depuis React ; le curseur
     seul est animé ici. */
  @keyframes sentinelleStory { from { opacity: 0; transform: translateY(14px) scale(.985); } to { opacity: 1; transform: none; } }
  .s-story { animation: sentinelleStory .32s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes sentinelleCurseur { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  .s-curseur { display: inline-block; width: 2px; height: .95em; background: currentColor; margin-left: 2px; vertical-align: -2px; animation: sentinelleCurseur .7s steps(1) infinite; }

  /* Sentinelle — la lumière de fond. Un halo qui respire très lentement
     derrière les cartes : c'est ce qui empêche l'écran d'être une feuille
     blanche. 9 s, imperceptible, mais l'oeil sait que ça vit. */
  @keyframes sentinelleSouffle {
    0%, 100% { opacity: .55; transform: translate3d(0, 0, 0) scale(1); }
    50%      { opacity: .85; transform: translate3d(0, -12px, 0) scale(1.08); }
  }
  .s-souffle { animation: sentinelleSouffle 9s ease-in-out infinite; will-change: transform, opacity; }

  /* Le bouton principal : un éclat qui traverse, une fois de temps en
     temps. Il dit « c'est ici qu'on appuie » sans clignoter. */
  @keyframes sentinelleEclat { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }
  .s-eclat::after {
    content: ''; position: absolute; inset: 0 auto 0 0; width: 40%;
    background: linear-gradient(100deg, transparent, rgba(255,255,255,.42), transparent);
    animation: sentinelleEclat 2.6s ease-in-out infinite; pointer-events: none;
  }

  /* La page qui arrive : le contenu monte d'un cran, décalé. */
  @keyframes sentinelleMonte { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
  .s-monte { animation: sentinelleMonte .4s cubic-bezier(.2,.8,.2,1) both; }

  /* Sentinelle — ELLE REGARDE (09/09).
     Son point prend une dizaine de secondes : elle lit la base, relit les
     signalements, prépare ses dossiers. Pendant ce temps il n'y avait
     qu'une ligne de texte qui pulsait, ce qui ressemble à une page qui a
     planté. Le bouclier respire et envoie des ondes, comme un radar : on
     comprend qu'elle BALAYE, pas qu'elle attend.

     Les ondes sont décalées (--onde) pour qu'il en parte une toutes les
     0,73 s au lieu de trois d'un coup. Boucle longue assumée : la règle
     des 700 ms vaut pour les transitions, pas pour une animation
     d'ambiance — comme .s-souffle (9 s) et .s-eclat (2,6 s). */
  @keyframes sentinelleOnde { 0% { opacity: .5; transform: scale(.55); } 100% { opacity: 0; transform: scale(2.3); } }
  .s-onde { animation: sentinelleOnde 2.2s ease-out infinite; animation-delay: var(--onde, 0s); will-change: transform, opacity; }
  @keyframes sentinelleScrute { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }
  .s-scrute { animation: sentinelleScrute 2.2s ease-in-out infinite; will-change: transform; }

  /* Sentinelle — elle écrit. Les trois points d'une conversation, mais en
     boucliers : c'est elle qui réfléchit, pas un serveur qui rame. Décalés
     de .16 s pour que la vague se lise. */
  @keyframes sentinelleRebond {
    0%, 62%, 100% { transform: translateY(0); opacity: .4; }
    31%           { transform: translateY(-6px); opacity: 1; }
  }
  .s-point { display: inline-block; animation: sentinelleRebond .95s ease-in-out infinite; animation-delay: var(--pt, 0s); }

  /* La feuille de conversation qui monte par-dessus les pages. */
  @keyframes sentinelleFeuille { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
  .s-feuille { animation: sentinelleFeuille .26s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes sentinelleBulle { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: none; } }
  .s-bulle { animation: sentinelleBulle .24s cubic-bezier(.2,.8,.2,1) both; }
`;
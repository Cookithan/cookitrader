/* ════════════════════════════════════════════════════
   audio.js — système son centralisé (BRIEF_AUDIO)
   ────────────────────────────────────────────────────
   Audio HTML5 (pas de Web Audio API — plus simple, compat partout).
   Tous les fichiers vivent dans `public/sounds/`.

   2 catégories :
     · UI_SOUNDS — courts (< 1s), volume 50% — joués sur les interactions
     · MUSICS    — boucle (~2-3 min), volume 25% — fond d'ambiance

   Réglages :
     · Settings persistées en LS via clé 'cookiminer:audioSettings' :
         { uiSoundEnabled, musicEnabled, currentMusicId }
     · Helpers exportés pour set/get + toggle

   Limitation autoplay mobile :
     · Le navigateur bloque la lecture audio tant que l'user n'a pas
       interagi. setupAudioOnFirstInteraction() écoute le 1er click/
       touchstart/keydown et lance la musique à ce moment.

   Catalogue ajusté du brief :
     · 6 sons UI : tap / success / error / modal / tab / toggle
     · 4 musiques : jazz (gratuit) · lofi (1000🍪) · bossa (1500🍪)
                    · royale (3☕ premium solo)
     (Café Parisien et Lounge Doré non inclus — fichiers absents.)
═══════════════════════════════════════════════════════ */

/* Catalogue des sons UI — courts (< 2s).
   Volume par défaut 50 %. Les sons en `loop` sont gérés via
   playSoundLoop / stopSoundLoop (cf. plus bas). */
const UI_SOUNDS = {
  /* tap : pas de MP3 dédié — on réutilise tab.mp3 (cliquetis court, 18 KB)
     pour les claps de cookies (ClickGame, ReflexGame, Pyramid, Slot stops). */
  tap:      '/sounds/tab.mp3',
  success:  '/sounds/success.mp3',
  error:    '/sounds/error.mp3',
  modal:    '/sounds/modal.mp3',
  tab:      '/sounds/tab.mp3',
  toggle:   '/sounds/toggle.mp3',
  /* Nouveaux sons (mai 2026) — assets Pixabay/Freesound CC0 */
  bubble:   '/sounds/bubble.mp3',    // bulle de dialogue (GuessGame)
  flip:     '/sounds/flip.mp3',      // retournement carte (Memory)
  slot:     '/sounds/slot.mp3',      // levier slot machine
  jackpot:  '/sounds/jackpot.mp3',   // gros gain festif
  purchase: '/sounds/purchase.mp3',  // achat boutique (caisse)
  coin:     '/sounds/coin.mp3',      // gain de cookies (cristallin)
  swipe:    '/sounds/swipe.mp3',     // swipe nav onglets
  levelup:  '/sounds/levelup.mp3',   // fanfare festive level-up (universfield CC0)
  wheel:    '/sounds/wheel-loop.mp3',// rotation roue (one-shot, slowdown intégré)
  /* Coups sur le boss (punching-ball). Déposer 2 fichiers CC0 dans
     public/sounds/ : punch.mp3 (coup léger) et punch-hard.mp3 (coup
     lourd). Tant qu'ils manquent, playSound est silencieux (404
     géré sans crash) — aucune régression. */
  punch:     '/sounds/punch.mp3',
  punchHard: '/sounds/punch-hard.mp3',
};

/* Sons en boucle (start/stop manuel) — typiquement le son du café qui
   coule pendant qu'on maintient le bouton dans PourGame, ou les sons
   de défilement pendant qu'un rouleau/roue tourne. Cache séparé du
   audioCache UI car le cycle de vie est différent (volume + loop). */
const LOOP_SOUNDS = {
  pour:  { src:'/sounds/pour.mp3',       volume:0.55 },
  slot:  { src:'/sounds/slot-loop.mp3',  volume:0.50 },  // rouleaux Machine à Sous
};
const loopAudioCache = {};

/* Catalogue des musiques. `free:true` = jouable sans achat (default).
   Les autres déverrouillent un id `music_<key>` côté boutique
   (ex: 'music_lofi' débloque la musique 'lofi').

   Tous les fichiers ci-dessous sont présents dans public/sounds/.
   Crédits assets (mai 2026) : Pixabay (CC0) — sleepvolume,
   magalystudio, kontraa, pulsebox. */
export const MUSICS = {
  jazz:    { id:'jazz',    name:'Jazz Café',          emoji:'🎷', file:'/sounds/music-jazz-cafe.mp3',         free:true },
  lofi:    { id:'lofi',    name:'Lofi Hip-Hop',       emoji:'🎵', file:'/sounds/music-lofi.mp3',              cost:1000, currency:'cookies' },
  bossa:   { id:'bossa',   name:'Bossa Nova',         emoji:'🇧🇷', file:'/sounds/music-bossa-nova.mp3',        cost:1500, currency:'cookies' },
  royale:  { id:'royale',  name:'Symphonie Royale',   emoji:'💎', file:'/sounds/music-symphonie-royale.mp3',  cost:3,    currency:'cf' },
  /* Nouvelles musiques niveaux 1-15 (mai 2026) — assets Pixabay CC0 */
  matin:    { id:'matin',    name:'Café du Matin',      emoji:'🌅', file:'/sounds/music-cafe-matin.mp3',       cost:100,  currency:'cookies' },
  velvet:   { id:'velvet',   name:'Velvet Smoke',       emoji:'🍷', file:'/sounds/music-velvet-smoke.mp3',     cost:1300, currency:'cookies' },
  empereur: { id:'empereur', name:'Beat de l\'Empereur',emoji:'👑', file:'/sounds/music-empereur.mp3',         cost:1500, currency:'cookies' },
  veillee:  { id:'veillee',  name:'Veillée Lofi',       emoji:'🌙', file:'/sounds/music-veillee.mp3',          cost:2500, currency:'cookies' },
  cosmique: { id:'cosmique', name:'Nuit Cosmique',      emoji:'🌌', file:'/sounds/music-nuit-cosmique.mp3',    cost:3000, currency:'cookies' },
  /* Musique du boss communautaire. Ni free ni cost → NON achetable
     en boutique : débloquée uniquement pour le Top 1 du classement
     des coups (unlocked contient 'music_boss'). Déposer le fichier
     CC0 dans public/sounds/music-boss.mp3 (silencieux si absent). */
  boss:     { id:'boss',     name:'Thème du Boss',      emoji:'👹', file:'/sounds/music-boss.mp3' },
};

/* Cache des Audio objects pour éviter de recharger un mp3 à chaque play
   (perf + évite glitches de chargement). */
const audioCache = {};

/* État interne — pas exposé directement ; lu/écrit via helpers. */
let currentMusicId = null;
let musicAudio = null;
let firstInteraction = false;

const SETTINGS_KEY = 'cookiminer:audioSettings';
const DEFAULT_SETTINGS = {
  uiSoundEnabled: true,
  musicEnabled:   true,
  currentMusicId: 'jazz',
};

function getSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    if(!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  }catch{
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s){
  try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }catch{}
}

export function getAudioSettings(){
  return getSettings();
}

export function setUiSoundEnabled(enabled){
  const s = getSettings();
  s.uiSoundEnabled = !!enabled;
  saveSettings(s);
}

export function setMusicEnabled(enabled){
  const s = getSettings();
  s.musicEnabled = !!enabled;
  saveSettings(s);
  if(enabled && firstInteraction){
    playMusic(s.currentMusicId);
  } else if(!enabled){
    stopMusic();
  }
}

/* ── SWIPE SYNTH — whoosh "vent" généré via Web Audio API ─────────
   Plutôt qu'un fichier mp3 (qui sonnait comme un "saut"), on synthétise
   un coup de vent court : bruit blanc filtré (bandpass 800 Hz, Q=0.8)
   + sweep de filtre 1200→400 Hz + enveloppe rapide (atk 25ms, decay 280ms).
   Résultat : whoosh aérien typique d'une transition. */
let synthCtx = null;
function ensureAudioContext(){
  if(synthCtx) return synthCtx;
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return null;
    synthCtx = new Ctx();
    return synthCtx;
  }catch{ return null; }
}

function playSwipeSynth(){
  const ctx = ensureAudioContext();
  if(!ctx) return;
  /* Buffer de bruit blanc — 0.35s suffit largement pour un whoosh */
  const dur = 0.35;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for(let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.8;
  /* Sweep 1200 Hz → 400 Hz pour donner l'impression d'un coup de vent
     qui passe à côté (effet Doppler). */
  filter.frequency.setValueAtTime(1200, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + dur);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.025);   // attack rapide
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur); // decay long

  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();
  src.stop(ctx.currentTime + dur);
}

/* ── MIETTE — la clochette de ramassage de Cooki Rider ───────────
   On l'entend des dizaines de fois par partie : c'est le son qu'il faut
   le plus soigner de tout le jeu. Trois choix pour qu'il ne fatigue pas.

   1. Une sinusoïde plus une harmonique douce, pas un « coin » d'arcade :
      le spectre reste pauvre, donc il se pose derrière la musique au
      lieu de la percer.
   2. La note MONTE quand on enchaîne — et elle monte sur une gamme
      pentatonique, la seule qui ne peut pas sonner faux quelle que soit
      la note qui suit. Ramasser une ligne entière joue une phrase.
   3. La série se remet à zéro après 0,9 s de silence, donc on
      redescend naturellement au lieu de plafonner au sommet.

   Volume 0,13 : c'est peu, et c'est voulu. */
let mietteT = 0;
let mietteN = 0;
const MIETTE_GAMME = [0, 2, 4, 7, 9, 12, 14];   // pentatonique majeure

export function playMiette(){
  if(!getSettings().uiSoundEnabled) return;
  const ctx = ensureAudioContext();
  if(!ctx) return;
  const now = ctx.currentTime;
  mietteN = (now - mietteT > 0.9) ? 0 : Math.min(MIETTE_GAMME.length - 1, mietteN + 1);
  mietteT = now;
  const f = 523.25 * Math.pow(2, MIETTE_GAMME[mietteN] / 12);
  try{
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    const harm = ctx.createOscillator();
    harm.type = 'triangle';
    harm.frequency.value = f * 2;
    const gh = ctx.createGain();
    gh.gain.value = 0.18;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.13, now + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3000;
    osc.connect(env);
    harm.connect(gh).connect(env);
    env.connect(lp).connect(ctx.destination);
    osc.start(now); harm.start(now);
    osc.stop(now + 0.45); harm.stop(now + 0.45);
  }catch{ /* contexte audio fermé par l'OS */ }
}

/* ── MOTEUR COOKI RIDER — bourdon continu piloté par la vitesse ───
   Le maintien du doigt est la commande entière de Cooki Rider, et un
   doigt posé sur une vitre ne renvoie rien : sans son, accélérer ne se
   sent pas. Un bourdon dont la hauteur suit la vitesse règle ça à lui
   seul, mieux que n'importe quelle animation.

   Trois précautions : volume bas (0.10) parce qu'il tient 40 s d'affilée,
   `setTargetAtTime` partout plutôt que des sauts de valeur (un saut de
   fréquence s'entend comme un clic), et le doigt levé BAISSE le gain au
   lieu de couper — un moteur qui s'arrête net sonne comme un bug. */
let engineNodes = null;

export function startRiderEngine(){
  if(!getSettings().uiSoundEnabled) return;
  const ctx = ensureAudioContext();
  if(!ctx || engineNodes) return;
  /* Un contexte créé hors geste utilisateur reste « suspended » et le
     bourdon serait muet sans le moindre message. Les autres synths sont
     des one-shots et s'en sortent ; un son continu, non. */
  if(ctx.state === 'suspended') ctx.resume().catch(() => {});
  try{
    /* Triangle et non plus dent-de-scie. La dent-de-scie porte tous les
       harmoniques impairs : elle « sonne moteur » tout de suite, mais au
       bout de quarante secondes elle scie l'oreille. Le triangle donne
       le même mouvement de hauteur sans la rugosité — un grondement
       qu'on sent plus qu'on ne l'entend, ce qui est le but. */
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 58;
    const sub = ctx.createOscillator();     // octave basse : donne le corps
    sub.type = 'sine';
    sub.frequency.value = 29;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    lp.Q.value = 0.4;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(lp); sub.connect(lp);
    lp.connect(gain).connect(ctx.destination);
    osc.start(); sub.start();
    engineNodes = { ctx, osc, sub, lp, gain };
  }catch{ engineNodes = null; }   /* WebAudio indisponible → jeu muet, pas de crash */
}

/* v01 : vitesse ramenée à 0..1 · gaz : doigt posé ou non */
export function setRiderEngine(v01, gaz){
  if(!engineNodes) return;
  const { ctx, osc, sub, lp, gain } = engineNodes;
  const t = ctx.currentTime;
  const v = Math.max(0, Math.min(1, v01));
  try{
    /* Plage de hauteur resserrée et filtre bas : on garde l'information
       « je vais vite » sans le sifflement qui fatigue. Volume divisé par
       deux — à ce niveau il porte l'effort, il ne couvre plus rien. */
    osc.frequency.setTargetAtTime(56 + 62 * v, t, 0.06);
    sub.frequency.setTargetAtTime(28 + 31 * v, t, 0.06);
    lp.frequency.setTargetAtTime(gaz ? 260 + 300 * v : 170, t, 0.12);
    gain.gain.setTargetAtTime(gaz ? 0.052 : 0.018, t, 0.09);
  }catch{ /* contexte fermé par l'OS en cours de partie */ }
}

export function stopRiderEngine(){
  if(!engineNodes) return;
  const { ctx, osc, sub, gain } = engineNodes;
  try{
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    osc.stop(ctx.currentTime + 0.3);
    sub.stop(ctx.currentTime + 0.3);
  }catch{ /* déjà arrêté */ }
  engineNodes = null;
}

/* ── FLAPPY JUMP SYNTH — "boop" cartoon montant ───────────────────
   Pour le saut du cookie : un blip court à pitch ascendant qui rappelle
   un saut de jeu d'arcade (Mario, Flappy Bird).
   - Oscillateur sine sweep de 280 Hz → 600 Hz (pitch up)
   - Triangle wave en back pour épaissir le son
   - Enveloppe ultra-rapide (atk 8 ms, decay 110 ms) → percussif
   - Volume modéré (.22) pour ne pas fatiguer en partie longue */
function playFlappyJumpSynth(){
  const ctx = ensureAudioContext();
  if(!ctx) return;
  const t0 = ctx.currentTime;
  const dur = 0.12;

  /* Oscillateur 1 : sine principale */
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(280, t0);
  osc1.frequency.exponentialRampToValueAtTime(600, t0 + dur * 0.6);

  /* Oscillateur 2 : triangle pour la couleur (1 octave en-dessous) */
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(140, t0);
  osc2.frequency.exponentialRampToValueAtTime(300, t0 + dur * 0.6);

  /* Mixer */
  const mix = ctx.createGain();
  mix.gain.value = 1;

  /* Enveloppe globale */
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(0.22, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  /* Low-pass doux pour adoucir le pic du début */
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2200;
  lp.Q.value = 0.6;

  osc1.connect(mix);
  osc2.connect(mix);
  mix.connect(lp).connect(env).connect(ctx.destination);

  osc1.start(t0);
  osc2.start(t0);
  osc1.stop(t0 + dur);
  osc2.stop(t0 + dur);
}

/* ── PLAY UI SOUND ──────────────────────────────── */
/* opts.volume (optional, 0..1) : override le volume par défaut (0.5).
   Utile pour atténuer un son joué dans un contexte particulier
   (ex: flappy 'coin' tuyau x2 → 0.18 pour pas spammer l'oreille). */
export function playSound(name, opts = {}){
  const s = getSettings();
  if(!s.uiSoundEnabled) return;
  /* Swipe : route vers le synth Web Audio (whoosh vent) au lieu du mp3. */
  if(name === 'swipe'){
    playSwipeSynth();
    return;
  }
  /* Saut Flappy : boop cartoon montant via synth (cf. playFlappyJumpSynth). */
  if(name === 'flappy_jump'){
    playFlappyJumpSynth();
    return;
  }
  if(!UI_SOUNDS[name]){
    // eslint-disable-next-line no-console
    console.warn('[audio] unknown sound:', name);
    return;
  }
  try{
    if(!audioCache[name]){
      audioCache[name] = new Audio(UI_SOUNDS[name]);
    }
    const a = audioCache[name];
    /* Set volume à chaque play : permet le override per-call sans
       toucher au cache (instance partagée mais volume re-set à chaque tir). */
    a.volume = typeof opts.volume === 'number' ? opts.volume : 0.5;
    a.currentTime = 0;
    a.play().catch(() => {});
  }catch{ /* mobile autoplay restrictions, etc. */ }
}

/* ── LOOP SOUNDS (start/stop manuel) ────────────────
   Pour les sons qui doivent durer pendant une action utilisateur
   (ex: maintien de doigt sur "Verser le café" → bruit de café qui
   coule). Respecte le toggle uiSoundEnabled.

   playSoundLoop(name) :
     - démarre si pas déjà actif (no-op sinon → évite le double play)
     - currentTime=0 à chaque (re)démarrage pour partir du début
   stopSoundLoop(name) :
     - pause + currentTime=0 (reset complet) */
export function playSoundLoop(name){
  const s = getSettings();
  if(!s.uiSoundEnabled) return;
  const cfg = LOOP_SOUNDS[name];
  if(!cfg) return;
  try{
    if(!loopAudioCache[name]){
      const a = new Audio(cfg.src);
      a.loop = true;
      a.volume = cfg.volume ?? 0.5;
      loopAudioCache[name] = a;
    }
    const a = loopAudioCache[name];
    if(!a.paused) return;  // déjà en lecture, ne pas relancer
    a.currentTime = 0;
    a.play().catch(() => {});
  }catch{ /* autoplay restrictions etc. */ }
}

export function stopSoundLoop(name){
  const a = loopAudioCache[name];
  if(!a) return;
  try{
    a.pause();
    a.currentTime = 0;
  }catch{}
}

/* ── PLAY MUSIC ─────────────────────────────────────
   Utilise UNE seule instance Audio réutilisée (change .src) — sinon
   le pause+null de l'ancienne Audio + new Audio() peut laisser les
   2 streams se chevaucher pendant un tick (bug observé). */
export function playMusic(musicId, { persist = true } = {}){
  const s = getSettings();
  if(!s.musicEnabled) return;

  const music = MUSICS[musicId];
  if(!music) return;

  /* Déjà la même musique en lecture → no-op (évite le hiccup) */
  if(currentMusicId === musicId && musicAudio && !musicAudio.paused) return;

  try{
    if(!musicAudio){
      musicAudio = new Audio();
      musicAudio.loop = true;
      musicAudio.volume = 0.25;
    }
    /* Pause AVANT de changer le src, sinon Chrome peut throw
       "AbortError: play() interrupted by new load request". */
    try{ musicAudio.pause(); }catch{}
    musicAudio.src = music.file;
    musicAudio.load();
    musicAudio.play().catch(() => {});
    currentMusicId = musicId;
    /* Persiste le choix pour que la prochaine session le restaure.
       persist=false pour les musiques TEMPORAIRES (boss) : on ne
       veut pas écraser la sélection du joueur. */
    if(persist){
      s.currentMusicId = musicId;
      saveSettings(s);
    }
  }catch{ /* autoplay etc. */ }
}

/* ── MUSIQUE BOSS — temporaire, scoppée à l'onglet boss ──────
   playBossMusic() : mémorise la musique en cours puis joue 'boss'
   SANS persister (la sélection du joueur reste intacte).
   endBossMusic()  : rejoue la musique d'avant (ou stop). */
let preBossMusicId = null;
export function playBossMusic(){
  if(currentMusicId === 'boss') return;
  preBossMusicId = getCurrentMusicId();      // sélection persistée du joueur
  playMusic('boss', { persist:false });
}
export function endBossMusic(){
  const back = preBossMusicId || getSettings().currentMusicId;
  preBossMusicId = null;
  if(currentMusicId !== 'boss') return;      // pas en mode boss → rien à faire
  if(back && MUSICS[back]) playMusic(back);   // restaure le menu
  else stopMusic();
}

export function stopMusic(){
  if(musicAudio){
    try{
      musicAudio.pause();
      musicAudio.currentTime = 0;
    }catch{}
  }
  currentMusicId = null;
}

export function getCurrentMusicId(){
  return currentMusicId || getSettings().currentMusicId;
}

/* ── PREMIER TAP (autoplay workaround mobile) ────────
   Le navigateur bloque l'autoplay tant qu'il n'y a pas eu
   d'interaction utilisateur. On attend le 1er événement et on
   lance la musique à ce moment. Idempotent : se débranche après
   la 1re activation. */
export function setupAudioOnFirstInteraction(){
  if(firstInteraction) return;
  const handler = () => {
    if(firstInteraction) return;
    firstInteraction = true;
    const s = getSettings();
    if(s.musicEnabled) playMusic(s.currentMusicId);
    document.removeEventListener('click', handler);
    document.removeEventListener('touchstart', handler);
    document.removeEventListener('keydown', handler);
  };
  document.addEventListener('click', handler);
  document.addEventListener('touchstart', handler);
  document.addEventListener('keydown', handler);
}

/* ── PAUSE/RESUME sur changement de visibilité ───────
   Sur mobile, quand l'app passe en arrière-plan (home, app switcher,
   verrouillage), `document.hidden` devient true. Sans listener, la
   musique continue à jouer en sourdine, mange la batterie, et
   bloque l'audio des autres apps (Spotify, podcasts).

   On pause à l'event `visibilitychange` ET au `pagehide` (Safari iOS,
   PWA installée). On reprend automatiquement au retour SI on est
   l'auteur de la pause (flag `pausedByVisibility`) ET si la musique
   était activée — ne pas relancer si l'user l'a coupée manuellement.

   Idempotent : safe à appeler plusieurs fois. */
let visibilityHandlerSet = false;
let pausedByVisibility = false;

export function setupVisibilityHandler(){
  if(visibilityHandlerSet || typeof document === 'undefined') return;
  visibilityHandlerSet = true;

  const onVisibilityChange = () => {
    if(document.hidden){
      if(musicAudio && !musicAudio.paused){
        try{ musicAudio.pause(); }catch{}
        pausedByVisibility = true;
      }
    } else {
      if(pausedByVisibility && musicAudio){
        const s = getSettings();
        if(s.musicEnabled){
          try{ musicAudio.play().catch(() => {}); }catch{}
        }
        pausedByVisibility = false;
      }
    }
  };

  /* pagehide : complément pour Safari iOS / PWA installées où
     visibilitychange peut tarder. On force le pause direct. */
  const onPageHide = () => {
    if(musicAudio && !musicAudio.paused){
      try{ musicAudio.pause(); }catch{}
      pausedByVisibility = true;
    }
  };

  /* ── Le pendant du blur ────────────────────────────
     `blur` met en pause, mais SEUL un retour de visibilité relançait.
     Or un blur n'implique pas que l'app soit passée en arrière-plan :
     l'ouverture du clavier, une boîte de dialogue système, un changement
     de focus suffisent. Dans ces cas-là, `visibilitychange` ne repasse
     jamais par « visible » — et la musique restait coupée jusqu'au
     prochain vrai passage en arrière-plan.

     C'est le symptôme rapporté par Régis : de la musique à l'accueil,
     plus rien dans certains mini-jeux. Le `focus` referme la boucle. */
  const onFocus = () => {
    if(!pausedByVisibility || document.hidden) return;
    const s = getSettings();
    if(s.musicEnabled && musicAudio){
      try{ musicAudio.play().catch(() => {}); }catch{}
    }
    pausedByVisibility = false;
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
  /* blur en backup (perte de focus, app switcher Android) */
  window.addEventListener('blur', onPageHide);
  window.addEventListener('focus', onFocus);
}

/* ── REPRENDRE SI LE SON EST TOMBÉ ───────────────────
   Filet de sécurité, appelé à l'ouverture d'un mini-jeu.

   Sur mobile, l'élément audio peut être arrêté par le système sans
   qu'aucun de nos événements ne le sache : appel entrant, autre app qui
   prend la sortie audio, onglet mis en veille par l'OS. Il ne repart
   alors jamais tout seul, et le joueur constate simplement que « ce
   jeu-là n'a pas de musique ».

   On ne force rien : si le joueur a coupé la musique, elle reste
   coupée ; si elle joue déjà, playMusic est un no-op. */
export function reprendreMusiqueSiCoupee(){
  const s = getSettings();
  if(!s.musicEnabled) return;
  if(musicAudio && !musicAudio.paused) return;
  const id = getCurrentMusicId();
  if(!id || !MUSICS[id]) return;
  pausedByVisibility = false;
  playMusic(id);
}

/* ── WRAPPER SONORE ──────────────────────────────────
   Décore un onClick existant pour qu'il joue un son avant son action.
   Usage : <button onClick={withSound(handleClick)}>OK</button>
           <button onClick={withSound(handleSave, 'success')}>Save</button> */
export function withSound(handler, soundName = 'tap'){
  return (...args) => {
    playSound(soundName);
    if(handler) return handler(...args);
  };
}

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
  tap:      '/sounds/tap.mp3',
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
};

/* Sons en boucle (start/stop manuel) — typiquement le son du café qui
   coule pendant qu'on maintient le bouton dans PourGame, ou les sons
   de défilement pendant qu'un rouleau/roue tourne. Cache séparé du
   audioCache UI car le cycle de vie est différent (volume + loop). */
const LOOP_SOUNDS = {
  pour:  { src:'/sounds/pour.mp3',       volume:0.55 },
  slot:  { src:'/sounds/slot-loop.mp3',  volume:0.50 },  // rouleaux Machine à Sous
  wheel: { src:'/sounds/wheel-loop.mp3', volume:0.50 },  // rotation de la Roue
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

/* ── PLAY UI SOUND ──────────────────────────────── */
export function playSound(name){
  const s = getSettings();
  if(!s.uiSoundEnabled) return;
  if(!UI_SOUNDS[name]){
    // eslint-disable-next-line no-console
    console.warn('[audio] unknown sound:', name);
    return;
  }
  try{
    if(!audioCache[name]){
      audioCache[name] = new Audio(UI_SOUNDS[name]);
      audioCache[name].volume = 0.5;
    }
    const a = audioCache[name];
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
export function playMusic(musicId){
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
    /* Persiste le choix pour que la prochaine session le restaure */
    s.currentMusicId = musicId;
    saveSettings(s);
  }catch{ /* autoplay etc. */ }
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

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
  /* blur en backup (perte de focus, app switcher Android) */
  window.addEventListener('blur', onPageHide);
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

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

/* Catalogue des sons UI */
const UI_SOUNDS = {
  tap:     '/sounds/tap.mp3',
  success: '/sounds/success.mp3',
  error:   '/sounds/error.mp3',
  modal:   '/sounds/modal.mp3',
  tab:     '/sounds/tab.mp3',
  toggle:  '/sounds/toggle.mp3',
};

/* Catalogue des musiques. `free:true` = jouable sans achat (default).
   Les autres déverrouillent un id `music_<key>` côté boutique
   (ex: 'music_lofi' débloque la musique 'lofi'). */
export const MUSICS = {
  jazz:   { id:'jazz',   name:'Jazz Café',        emoji:'🎷', file:'/sounds/music-jazz-cafe.mp3',        free:true },
  lofi:   { id:'lofi',   name:'Lofi Hip-Hop',     emoji:'🎵', file:'/sounds/music-lofi.mp3',             cost:1000, currency:'cookies' },
  bossa:  { id:'bossa',  name:'Bossa Nova',       emoji:'🇧🇷', file:'/sounds/music-bossa-nova.mp3',       cost:1500, currency:'cookies' },
  royale: { id:'royale', name:'Symphonie Royale', emoji:'💎', file:'/sounds/music-symphonie-royale.mp3', cost:3,    currency:'cf' },
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

/* ── PLAY MUSIC ─────────────────────────────────── */
export function playMusic(musicId){
  const s = getSettings();
  if(!s.musicEnabled) return;

  const music = MUSICS[musicId];
  if(!music) return;

  /* Déjà la même musique → no-op (évite le hiccup) */
  if(currentMusicId === musicId && musicAudio && !musicAudio.paused) return;

  stopMusic();

  try{
    musicAudio = new Audio(music.file);
    musicAudio.volume = 0.25;
    musicAudio.loop = true;
    musicAudio.play().catch(() => {});
    currentMusicId = musicId;
    /* Persiste le choix pour que la prochaine session le restaure */
    s.currentMusicId = musicId;
    saveSettings(s);
  }catch{ /* autoplay etc. */ }
}

export function stopMusic(){
  if(musicAudio){
    try{ musicAudio.pause(); }catch{}
    musicAudio = null;
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

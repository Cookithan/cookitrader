import { useSyncExternalStore } from 'react';
import { FR } from './fr.js';
import { EN } from './en.js';

/* ════════════════════════════════════════════════════
   i18n — système de traduction maison léger
   ────────────────────────────────────────────────────
   Pas de dépendance externe. Stocke la langue active dans LS
   (`cookiminer:lang`) et expose un hook `useTranslation()` qui force
   le re-render à chaque setLang().

   USAGE :
     import { useTranslation } from '../i18n';
     const { t, lang, setLang } = useTranslation();
     t('nav.home')                    → 'Accueil' (FR) / 'Home' (EN)
     t('game_click.start', {cost:5})  → 'Commencer (5 🍪)' / 'Start (5 🍪)'

   FALLBACK : si une clé n'existe pas dans EN, on retombe sur FR.
   Si elle n'existe pas dans FR non plus, on affiche la clé en mode
   debug (visible mais identifiable comme manquante).

   DATA dynamiques (REWARDS, QUESTIONS, etc.) → utiliser localizedField()
   qui lit `item[field_<lang>]` ou fallback sur `item[field]`.
═══════════════════════════════════════════════════════ */

const LS_KEY = 'cookiminer:lang';
const SUPPORTED = ['fr', 'en'];
const DEFAULT_LANG = 'fr';

/* ── Détection langue au 1er lancement ─────────────── */
function detectLang(){
  try{
    const saved = localStorage.getItem(LS_KEY);
    if(saved && SUPPORTED.includes(saved)) return saved;
  }catch{}
  /* navigator.language : 'fr-FR' → 'fr', 'en-US' → 'en'. Default 'fr'. */
  try{
    const navLang = (navigator.language || '').slice(0, 2).toLowerCase();
    if(SUPPORTED.includes(navLang)) return navLang;
  }catch{}
  return DEFAULT_LANG;
}

let currentLang = detectLang();
const listeners = new Set();

const DICTIONARIES = { fr: FR, en: EN };

/* ── Lookup avec fallback FR ───────────────────────── */
function lookup(key, lang){
  const dict = DICTIONARIES[lang] || DICTIONARIES.fr;
  const parts = key.split('.');
  let node = dict;
  for(const p of parts){
    if(node && typeof node === 'object' && p in node){
      node = node[p];
    } else {
      node = undefined; break;
    }
  }
  if(typeof node === 'string') return node;
  /* Fallback FR si EN incomplet */
  if(lang !== 'fr'){
    let frNode = DICTIONARIES.fr;
    for(const p of parts){
      if(frNode && typeof frNode === 'object' && p in frNode){
        frNode = frNode[p];
      } else {
        frNode = undefined; break;
      }
    }
    if(typeof frNode === 'string') return frNode;
  }
  /* Clé manquante : affiche la clé entre crochets en dev pour la repérer.
     En prod (minifié), on affiche juste la dernière partie pour pas
     casser visuellement. */
  return `[${key}]`;
}

/* ── Interpolation {var} ───────────────────────────── */
function interpolate(str, vars){
  if(!vars || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/* ── API publique ──────────────────────────────────── */
export function getLang(){ return currentLang; }

export function setLang(lang){
  if(!SUPPORTED.includes(lang)) return;
  if(lang === currentLang) return;
  currentLang = lang;
  try{ localStorage.setItem(LS_KEY, lang); }catch{}
  listeners.forEach(l => l());
}

export function t(key, vars){
  return interpolate(lookup(key, currentLang), vars);
}

/* Helper pour data dynamiques : retourne `item[field_<lang>]` ou
   fallback sur `item[field]` (FR par défaut). Utilisé pour REWARDS,
   QUESTIONS, ACHIEVEMENTS, LEVEL_NAMES, etc. */
export function localizedField(item, field){
  if(!item) return '';
  const key = `${field}_${currentLang}`;
  if(currentLang !== 'fr' && key in item && item[key] != null){
    return item[key];
  }
  return item[field] ?? '';
}

/* ── Hook React ─────────────────────────────────────
   useSyncExternalStore : re-rend tous les composants consommateurs
   quand setLang() est appelé. Pas besoin d'un Provider. */
function subscribe(callback){
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(){ return currentLang; }

export function useTranslation(){
  const lang = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    t: (key, vars) => interpolate(lookup(key, lang), vars),
    lang,
    setLang,
    localizedField: (item, field) => {
      if(!item) return '';
      const key = `${field}_${lang}`;
      if(lang !== 'fr' && key in item && item[key] != null) return item[key];
      return item[field] ?? '';
    },
  };
}

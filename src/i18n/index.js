import { useSyncExternalStore } from 'react';
import { FR } from './fr.js';
import { EN } from './en.js';
import { REWARDS_EN, LEVEL_NAMES_EN, ACHIEVEMENTS_EN } from './dataTranslations.js';

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

/* Mapping externe : data trad par id/index. Consulté en priorité par
   localizedField pour les types qui ont une table dédiée (REWARDS,
   ACHIEVEMENTS, etc.). Pour CHANGELOG et QUESTIONS, on lookup par
   indices/clés différentes (cf. plus bas). */
const EXTERNAL_EN_MAPS = {
  REWARDS: REWARDS_EN,
  ACHIEVEMENTS: ACHIEVEMENTS_EN,
};

/* Helper pour data dynamiques : retourne le champ traduit selon la
   langue active. Plusieurs sources de traduction tentées dans l'ordre :
     1. item[field_<lang>] inline (pour les ajouts simples sur les data)
     2. EXTERNAL_EN_MAPS[item.__source][item.id][field] (mapping centralisé)
     3. item[field] (FR fallback)

   Pour utiliser le mapping centralisé, le caller peut passer un 3e
   argument `source` : ex. localizedField(reward, 'name', 'REWARDS'). */
export function localizedField(item, field, source){
  if(!item) return '';
  if(currentLang !== 'fr'){
    /* 1. Champ inline _<lang> sur l'item lui-même */
    const inlineKey = `${field}_${currentLang}`;
    if(inlineKey in item && item[inlineKey] != null) return item[inlineKey];
    /* 2. Mapping externe par id */
    if(source && EXTERNAL_EN_MAPS[source] && item.id != null){
      const entry = EXTERNAL_EN_MAPS[source][item.id];
      if(entry && entry[field] != null) return entry[field];
    }
  }
  return item[field] ?? '';
}

/* Helper pour LEVEL_NAMES (lookup par index) — séparé car les niveaux
   ne sont pas des objets {id, name} mais un tableau plat de strings. */
export function localizedLevelName(index){
  if(currentLang === 'en' && LEVEL_NAMES_EN[index] != null) return LEVEL_NAMES_EN[index];
  return null; /* caller utilise LEVEL_NAMES[index] en fallback */
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
    /* localizedField hook-aware : utilise la même logique que la version
       module mais avec `lang` du hook (déjà à jour via useSyncExternalStore). */
    localizedField: (item, field, source) => {
      if(!item) return '';
      if(lang !== 'fr'){
        const inlineKey = `${field}_${lang}`;
        if(inlineKey in item && item[inlineKey] != null) return item[inlineKey];
        if(source && EXTERNAL_EN_MAPS[source] && item.id != null){
          const entry = EXTERNAL_EN_MAPS[source][item.id];
          if(entry && entry[field] != null) return entry[field];
        }
      }
      return item[field] ?? '';
    },
    localizedLevelName: (index) => {
      if(lang === 'en' && LEVEL_NAMES_EN[index] != null) return LEVEL_NAMES_EN[index];
      return null;
    },
  };
}

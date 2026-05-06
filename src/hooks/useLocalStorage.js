import { useState, useEffect } from "react";

/* ════════════════════════════════════════════════════
   useLocalStorage(key, initial)
   - Toutes les clés sont préfixées par 'cookiminer:' (legacy)
   - Lecture immédiate via initialiseur paresseux ; écriture sur chaque changement
   - try/catch silencieux : si quota plein ou storage indispo, on continue en mémoire
════════════════════════════════════════════════════ */

const LS_PREFIX = 'cookiminer:';

export function useLocalStorage(key, initial){
  const fullKey = LS_PREFIX + key;
  const [value, setValue] = useState(()=>{
    try{ const raw = window.localStorage.getItem(fullKey); return raw!==null ? JSON.parse(raw) : initial; }
    catch{ return initial; }
  });
  useEffect(()=>{
    try{ window.localStorage.setItem(fullKey, JSON.stringify(value)); }catch{}
  },[fullKey, value]);
  return [value, setValue];
}

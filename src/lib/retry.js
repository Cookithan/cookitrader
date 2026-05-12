/* ════════════════════════════════════════════════════
   retry.js — helper de retry exponentiel pour les opérations réseau
   ────────────────────────────────────────────────────
   À utiliser uniquement pour les LECTURES Supabase critiques au mount
   (pullProfile, getSystemStatus, etc.) où un échec transitoire bloque
   l'expérience joueur. NE PAS utiliser sur les WRITES sans idempotence
   (upsert, debit, refund) — risque de double-application.

   Backoff exponentiel par défaut : 200ms, 600ms, 1800ms.

   Usage :
     const profile = await withRetry(() => pullProfile(userCode), {
       maxAttempts: 3,
       initialDelayMs: 200,
       shouldRetry: (err) => isTransientError(err),
     });

   - maxAttempts (défaut 3) : tentatives totales
   - initialDelayMs (défaut 200) : délai après la 1re tentative, ×3 ensuite
   - shouldRetry (défaut isTransientError) : décide si on retente
   - onAttempt (optionnel) : callback (attempt, err) pour logger
═══════════════════════════════════════════════════════ */

/* Détecte les erreurs transitoires qui méritent un retry :
   - Network errors (TypeError 'Failed to fetch', AbortError, etc.)
   - HTTP 5xx (server-side)
   - Supabase code PGRST... avec status >= 500
   On NE retente PAS sur 4xx (auth, validation, not found). */
export function isTransientError(err){
  if(!err) return false;
  const msg = String(err.message || err || '').toLowerCase();
  if(msg.includes('failed to fetch')) return true;
  if(msg.includes('network')) return true;
  if(msg.includes('timeout')) return true;
  if(err.name === 'AbortError') return true;
  if(err.name === 'TypeError') return true;
  const status = err.status || err.statusCode || err?.response?.status;
  if(status && status >= 500 && status < 600) return true;
  return false;
}

export async function withRetry(asyncFn, opts = {}){
  const {
    maxAttempts = 3,
    initialDelayMs = 200,
    backoffFactor = 3,
    shouldRetry = isTransientError,
    onAttempt = null,
  } = opts;

  let lastError = null;
  let delay = initialDelayMs;

  for(let attempt = 1; attempt <= maxAttempts; attempt++){
    try{
      const result = await asyncFn();
      return result;
    }catch(err){
      lastError = err;
      const willRetry = attempt < maxAttempts && shouldRetry(err);
      if(typeof onAttempt === 'function'){
        try{ onAttempt(attempt, err, willRetry); }catch{}
      }
      if(!willRetry) throw err;
      await new Promise(r => setTimeout(r, delay));
      delay *= backoffFactor;
    }
  }
  throw lastError;
}

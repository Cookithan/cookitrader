/* ════════════════════════════════════════════════════
   haptic.js — feedback haptique léger via navigator.vibrate
   ────────────────────────────────────────────────────
   API simple, no-op silencieux si le device ne supporte pas (iOS
   Safari < 16, desktop, etc.). Ne nécessite aucune permission.

   IMPORTANT — règle d'usage :
   Utiliser AVEC PARCIMONIE. Trop de vibrations = utilisateur agacé.
   Sur Android le buzz peut aussi consommer de la batterie.
   → réservé aux moments forts : succès, refus, jackpot, level-up.
   → NE PAS spammer (ex. ne pas vibrer à chaque cookie tap).

   Bypass : si l'user a `cookiminer:haptic` = '0' en LS, on ne vibre
   pas. Permet à terme d'ajouter un toggle dans Settings.

   Patterns disponibles :
   - light   : tap léger (8ms) — change de tab, ouverture modal légère
   - medium  : action confirmée (15ms) — achat boutique
   - success : reward (3 pulses courts) — level up, unlock achievement
   - warning : refus (35ms) — pas assez de cookies, cap atteint
   - jackpot : événement majeur (5 pulses crescendo) — jackpot roue
═══════════════════════════════════════════════════════ */

const PATTERNS = {
  light:   8,
  medium:  15,
  success: [10, 35, 18],
  warning: 35,
  jackpot: [10, 30, 10, 30, 80],
};

function isEnabled(){
  try{
    if(typeof navigator === 'undefined' || !navigator.vibrate) return false;
    if(typeof window === 'undefined') return true;
    return window.localStorage.getItem('cookiminer:haptic') !== '0';
  }catch{
    return false;
  }
}

export function haptic(kind = 'light'){
  if(!isEnabled()) return;
  const pattern = PATTERNS[kind] ?? PATTERNS.light;
  try{
    navigator.vibrate(pattern);
  }catch{}
}

/* Helper : exécute fn() et vibre selon le résultat.
   Utile pour les actions où on ne sait qu'à la fin si c'est success ou
   warning (ex. acheter un item — succès ou pas assez de monnaie). */
export function hapticWrap(fn, { onResult } = {}){
  const result = fn?.();
  const kind = onResult ? onResult(result) : 'success';
  haptic(kind);
  return result;
}

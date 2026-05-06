/* ════════════════════════════════════════════════════
   userCode.js — génération du code ami unique
   ────────────────────────────────────────────────────
   Format : XXX-XXX (6 caractères, alphanumériques majuscules)
   Alphabet : A-Z et 2-9 (sans O, 0, I, 1 pour éviter la confusion).
   Servira plus tard pour identifier les joueurs côté backend.
═══════════════════════════════════════════════════════ */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateUserCode(){
  let code = '';
  for(let i = 0; i < 6; i++){
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code.slice(0, 3) + '-' + code.slice(3);
}

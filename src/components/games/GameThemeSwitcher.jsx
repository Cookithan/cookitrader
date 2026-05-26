import { playSound } from "../../lib/audio.js";
import { getActiveTheme, getThemesForGame, isThemeUnlocked } from "../../data/gameThemes.js";

/* ════════════════════════════════════════════════════
   GameThemeSwitcher — pastilles de switch in-game
   ────────────────────────────────────────────────────
   Affiche les thèmes débloqués pour `gameId` sous forme de pastilles
   rondes cliquables (preview emoji au centre). Tap = active immédiat
   via setGameThemes. Le default est toujours débloqué donc présent.

   Affichage masqué si :
     - setGameThemes pas fourni (mode read-only)
     - le joueur n'a débloqué que le default (1 seul thème dispo)

   Props :
     - gameId        : 'catcher' | 'flappy' | 'guess' | 'memory'
     - gameThemes    : map { gameId → themeId } (le state actuel)
     - setGameThemes : setter du LS map
     - unlocked      : array d'ids débloqués (achats joueur)
     - variant       : 'dark' (overlay café) | 'light' (carte normale)
                       Détermine fond/bordure des pastilles.
═══════════════════════════════════════════════════════ */
export function GameThemeSwitcher({ gameId, gameThemes, setGameThemes, unlocked = [], variant = 'light' }) {
  if(!setGameThemes) return null;
  const themes = getThemesForGame(gameId).filter(th => isThemeUnlocked(th, unlocked));
  if(themes.length <= 1) return null;
  const active = getActiveTheme(gameId, gameThemes || {});

  const isDark = variant === 'dark';
  const bgIdle    = isDark ? 'rgba(60,30,10,.65)'  : 'rgba(60,30,10,.08)';
  const bgActive  = isDark ? 'rgba(212,160,23,.25)' : 'rgba(212,160,23,.18)';
  const borderIdle = isDark ? '1.5px solid rgba(255,232,154,.3)' : '1.5px solid rgba(193,127,60,.3)';

  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center', maxWidth:280 }}>
      {themes.map(th => {
        const isActive = active?.id === th.id;
        return (
          <button
            key={th.id}
            onClick={() => {
              playSound('tap');
              setGameThemes({ ...(gameThemes || {}), [gameId]: th.id });
            }}
            title={th.name}
            style={{
              width:34, height:34, borderRadius:'50%',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:16,
              background: isActive ? bgActive : bgIdle,
              border: isActive ? '2px solid #FFE89A' : borderIdle,
              cursor:'pointer',
              boxShadow: isActive ? '0 0 10px rgba(212,160,23,.55)' : 'none',
              touchAction:'manipulation',
            }}
          >
            {th.preview || '🎨'}
          </button>
        );
      })}
    </div>
  );
}

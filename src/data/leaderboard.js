/* ════════════════════════════════════════════════════
   LEADERBOARD FICTIF
   - SCHEMA : versionne le format ; bump quand on change la shape
              (regen automatique au prochain mount si stale)
   - BOT_NAMES / BOT_LEVELS : 29 bots
   - generateLeaderboard()  : crée la liste initiale, stats croissantes par niveau
   - leaderboardScore(p)    : agrège totalEarned / level / streak / clickRecord / marketRealized
                              en un score unique (utilisé par le filtre 'score')
════════════════════════════════════════════════════ */

export const LEADERBOARD_SCHEMA = 'v4';

export const BOT_NAMES = [
  'Pixou42','LucasGameur','DarkLord99','ProGamer2010','Léa_22',
  'Mehdi_Dz','Emma17','Killua_x','KrlosFR','Sxnsei','LoulouLP',
  'ZeroFR','TomTom_x','Blue_K','nono.exe','Rayan04',
  'm4xim3','KingDavid','Tina_K','nylo_2009',
  'Gohu74','Mathilde_z','Kasandra','Loris_FR','Lyrra',
  'Solene4Ever','Madox','Sasuke59','TheoTheBoss'
];

/* Niveaux distribués : majorité de débutants/moyens pour qu'un nouveau joueur
   ne soit pas direct dernier. 29 bots → +1 user = 30 positions max. */
export const BOT_LEVELS = [1,1,1,1,1,1,1,1,1, 2,2,2,2,2,2, 3,3,3,3, 4,4,4, 5,5,5, 6,6,6,6];

export function generateLeaderboard(){
  const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
  return BOT_NAMES.map((name, i) => {
    const level = BOT_LEVELS[i] || 1;
    /* Stats croissantes mais accessibles au niveau bas (laisser une chance au fresh user) */
    const streak       = level <= 2 ? rand(0, level*2) : level <= 4 ? rand(0, level*3) : rand(2, level*4);
    const totalEarned  = level === 1 ? rand(0, 180)
                       : level === 2 ? rand(120, 700)
                       : level === 3 ? rand(600, 2400)
                       : level === 4 ? rand(2200, 6500)
                       : level === 5 ? rand(6000, 14000)
                       :               rand(13000, 28000);
    const clickRecord  = rand(level*4, level*level*5);
    const marketRealized = level >= 3 ? rand(-level*40, level*180) : 0;
    const cafes        = Math.max(0, rand(level - 1, level * 3));
    return { __schema:LEADERBOARD_SCHEMA, name, avatar:rand(0,3), level, streak, totalEarned, clickRecord, marketRealized, cafes };
  });
}

export function leaderboardScore(p){
  return p.totalEarned + p.level*100 + p.streak*20 + p.clickRecord*5 + Math.max(0, p.marketRealized)*2;
}

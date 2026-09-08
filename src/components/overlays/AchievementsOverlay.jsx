import { ChevronLeft } from "lucide-react";
import { ACHIEVEMENTS, REWARDS } from "../../data/constants.js";
import { SECRET_BADGES } from "../../data/secretBadges.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   AchievementsOverlay — « Mes Succès », plein écran z-index 60
   ────────────────────────────────────────────────────
   v1.30 : la grille des 22 succès occupait la moitié de l'Accueil, avec
   un « Voir plus » qui la doublait et la carte apex `end_game` (5 lignes
   de prérequis, sur 2 colonnes) plantée au milieu. L'Accueil est l'écran
   le plus vu de l'app : la grille vit maintenant ici, et l'Accueil n'en
   garde qu'une carte de progression d'une ligne.

   Tout est affiché d'un coup (plus de repli « Voir plus ») — on est dans
   un écran dédié, le scroll est attendu.

   `end_game` reste EN DERNIER dans ACHIEVEMENTS : c'est l'apex caché,
   on ne le remonte pas. Verrouillé, il détaille ce qu'il reste à faire.
═══════════════════════════════════════════════════════ */

export function AchievementsOverlay({ onClose, earnedAchievements = [], unlocked = [], level, C }) {
  const { t } = useTranslation();
  const total = ACHIEVEMENTS.length;
  const done  = earnedAchievements.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{
      position:'fixed', top:0, left:'50%', transform:'translateX(-50%)',
      width:'100%', maxWidth:430, bottom:0,
      background:C.bg, zIndex:60, display:'flex', flexDirection:'column',
    }}>
      <div style={{
        display:'flex', alignItems:'center', gap:12, padding:'14px 20px',
        borderBottom:`1px solid ${C.border}`, background:C.card, flexShrink:0,
      }}>
        <button
          onClick={onClose}
          aria-label={t('common.back')}
          style={{
            width:36, height:36, borderRadius:12, background:C.card2,
            display:'flex', alignItems:'center', justifyContent:'center', color:C.text,
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:17, fontWeight:800, color:C.text }}>{t('achievements.title')}</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>
            {t('achievements.progress', { done, total })}
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 18px 28px' }}>

        {/* Barre de progression globale */}
        <div style={{ height:6, background:C.card2, borderRadius:3, overflow:'hidden', marginBottom:18 }}>
          <div style={{
            width:`${pct}%`, height:'100%',
            background:'linear-gradient(90deg, #D4A017, #F0C050)',
            transition:'width .5s ease-out',
          }} />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {ACHIEVEMENTS.map(a => {
            const got       = earnedAchievements.includes(a.id);
            const isEndGame = a.id === 'end_game';

            /* Apex verrouillé : on détaille chaque condition pour que le
               joueur sache exactement ce qui lui manque. */
            let prereqs = null;
            if(isEndGame && !got){
              const succesList = ACHIEVEMENTS.filter(x => x.id !== 'end_game');
              const succesDone = succesList.filter(p => earnedAchievements.includes(p.id)).length;
              const shopList   = REWARDS.filter(r => r.currency !== 'cafe' && !r.limited);
              const shopDone   = shopList.filter(r => unlocked.includes(r.id)).length;
              const secretList = Object.values(SECRET_BADGES);
              const secretDone = secretList.filter(b => unlocked.includes(b.id)).length;
              const eventList  = REWARDS.filter(r => r.limited);
              const eventDone  = eventList.filter(r => unlocked.includes(r.id)).length;
              prereqs = {
                levelOk:   level >= 25,
                succesDone, succesTotal: succesList.length, succesOk: succesDone === succesList.length,
                shopDone,   shopTotal:   shopList.length,   shopOk:   shopDone   === shopList.length,
                secretDone, secretTotal: secretList.length, secretOk: secretDone === secretList.length,
                eventDone,  eventTotal:  eventList.length,  eventOk:  eventDone  === eventList.length,
              };
            }

            /* Style apex — obtenu : or éclatant + halo ; verrouillé :
               espresso sombre + cadenas. Dans les 2 cas span 2 colonnes. */
            const apexStyle = isEndGame
              ? (got
                  ? { background:'linear-gradient(135deg, #FFE5A0, #F0C050, #E8B040)', border:'2px solid #D4A017' }
                  : { background:'linear-gradient(135deg, #3D2010, #2C1810, #1F0E08)', border:'2px solid rgba(212,160,23,.55)' })
              : { background:C.card, border:`1px solid ${C.border}` };

            const titleColor   = isEndGame ? (got ? '#5D3A1F' : '#F0C050') : C.text;
            const descColor    = isEndGame ? (got ? '#7D4E1F' : '#C8A878') : C.muted;
            const bonusColor   = isEndGame ? (got ? '#5D3A1F' : '#F0C050') : '#D4A017';
            const boxBg        = isEndGame && !got ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.5)';
            const boxBorder    = isEndGame && !got ? '1px dashed rgba(212,160,23,.4)' : '1px dashed rgba(93,58,31,.45)';
            const checkColor   = isEndGame && !got ? '#F0C050' : '#5D3A1F';
            const uncheckColor = isEndGame && !got ? '#A88060' : '#A07854';

            return (
              <div
                key={a.id}
                className={isEndGame && got ? 'glow-anim' : ''}
                style={{
                  borderRadius:16, padding:'12px 12px',
                  display:'flex', alignItems:'flex-start', gap:10,
                  opacity: got ? 1 : (isEndGame ? 1 : .55),
                  position:'relative',
                  gridColumn: isEndGame ? 'span 2' : undefined,
                  ...apexStyle,
                }}
              >
                {isEndGame && !got && (
                  <div style={{
                    position:'absolute', top:8, right:8,
                    width:26, height:26, borderRadius:'50%',
                    background:'rgba(15,8,4,.7)',
                    border:'1.5px solid rgba(212,160,23,.6)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:13, lineHeight:1,
                    boxShadow:'0 2px 6px rgba(0,0,0,.4)',
                  }}>🔒</div>
                )}

                <div style={{
                  fontSize: isEndGame ? 30 : 24, flexShrink:0, lineHeight:1,
                  filter: got ? 'none' : (isEndGame ? 'grayscale(.4) brightness(.85)' : 'grayscale(.7)'),
                  opacity: isEndGame && !got ? .85 : 1,
                }}>
                  {got ? a.emoji : (isEndGame ? '🏆' : '🔒')}
                </div>

                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{
                    fontSize: isEndGame ? 13 : 11, fontWeight:900,
                    color:titleColor, lineHeight:1.2, marginBottom:2,
                    letterSpacing: isEndGame ? .3 : 0,
                  }}>
                    {a.name}
                  </div>
                  <div style={{
                    fontSize:10, color:descColor, lineHeight:1.3,
                    fontWeight: isEndGame ? 600 : 'normal',
                  }}>
                    {a.desc}
                  </div>

                  {prereqs && (
                    <div style={{
                      marginTop:6, padding:'7px 9px', borderRadius:8,
                      background:boxBg, border:boxBorder,
                      fontSize:10, lineHeight:1.65, fontWeight:700,
                    }}>
                      <div style={{ color: prereqs.levelOk ? checkColor : uncheckColor }}>
                        {prereqs.levelOk ? '✓' : '○'} Niveau {level}/25
                      </div>
                      <div style={{ color: prereqs.succesOk ? checkColor : uncheckColor }}>
                        {prereqs.succesOk ? '✓' : '○'} {prereqs.succesDone}/{prereqs.succesTotal} autres succès
                      </div>
                      <div style={{ color: prereqs.shopOk ? checkColor : uncheckColor }}>
                        {prereqs.shopOk ? '✓' : '○'} {prereqs.shopDone}/{prereqs.shopTotal} items boutique 🍪
                      </div>
                      <div style={{ color: prereqs.secretOk ? checkColor : uncheckColor }}>
                        {prereqs.secretOk ? '✓' : '○'} {prereqs.secretDone}/{prereqs.secretTotal} badges secrets
                      </div>
                      <div style={{ color: prereqs.eventOk ? checkColor : uncheckColor }}>
                        {prereqs.eventOk ? '✓' : '○'} {prereqs.eventDone}/{prereqs.eventTotal} récompenses événements
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize:10, color:bonusColor, fontWeight:800, marginTop:4 }}>
                    +{a.bonus} 🍪{a.cafesBonus ? ` · +${a.cafesBonus} ☕` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

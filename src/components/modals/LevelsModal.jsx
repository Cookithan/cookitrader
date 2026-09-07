import { ChevronLeft, Check, Lock } from "lucide-react";
import { LEVEL_NAMES, xpRequired } from "../../data/constants.js";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { levelUnlocks } from "../../utils/levelUnlocks.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   LevelsModal — popup "Voir les niveaux"
   ────────────────────────────────────────────────────
   Ouverte au clic sur la carte niveau (Accueil) ou depuis le profil.
   Les 25 paliers : passés en or, courant pulsé avec barre XP, futurs
   verrouillés. Niv 25 = apex, il propose le prestige.

   v1.30 — la liste ne disait QUE le nom et le coût en XP : monter de
   niveau n'annonçait jamais ce qu'on allait y gagner. Chaque palier
   affiche désormais ce qu'il débloque (mini-jeu, marché, ☕, cookies,
   récompenses de boutique, prestige) — cf. utils/levelUnlocks.js.

   Le NOM d'un palier verrouillé reste caché (« ? ? ? ») : c'est la
   surprise. Ce qu'il rapporte, lui, est montré — savoir ce qui attend
   donne envie d'y aller, connaître le titre à l'avance ne sert à rien.

   Un en-tête de progression globale (12/25 + barre) a été ajouté : on
   ouvrait une liste de 25 lignes sans jamais voir où on en était.
════════════════════════════════════════════════════ */

const TOTAL_LEVELS = 25;
const LEVELS = Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1);

export function LevelsModal({ currentLevel, xp, xpReq, games = [], onClose, C }) {
  const { t, localizedLevelName } = useTranslation();
  const globalPct = Math.round((currentLevel / TOTAL_LEVELS) * 100);

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.78)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:80, backdropFilter:'blur(6px)', padding:18 }}>
      <div onClick={e=>e.stopPropagation()} className="bi" style={{ background:C.card, borderRadius:24, padding:'22px 18px 18px', width:'100%', maxWidth:380, maxHeight:'85vh', overflowY:'auto', border:`1px solid ${C.border}`, boxShadow:'0 24px 64px rgba(0,0,0,.45)' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>{t('modal.progression')}</div>
            <div style={{ fontSize:18, fontWeight:800, color:C.text, marginTop:2 }}>{t('modal.the_25_levels')}</div>
          </div>
          <button onClick={onClose} aria-label={t('common.close')} style={{ width:32, height:32, borderRadius:11, background:C.card2, color:C.text, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ChevronLeft size={18} style={{ transform:'rotate(180deg)' }} />
          </button>
        </div>

        {/* Progression globale — on ouvrait 25 lignes sans repère d'ensemble. */}
        <div style={{ marginBottom:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>
              {t('levels.progress', { done: currentLevel, total: TOTAL_LEVELS })}
            </span>
            <span style={{ fontSize:11, fontWeight:800, color:'#D4A017' }}>{globalPct} %</span>
          </div>
          <div style={{ height:6, borderRadius:3, background:C.card2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${globalPct}%`, background:'linear-gradient(90deg,#D4A017,#F0C050)', transition:'width .6s ease-out' }} />
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {LEVELS.map(n => {
            const passed    = n < currentLevel;
            const isCurrent = n === currentLevel;
            const locked    = n > currentLevel;
            /* XP exacte à gagner DANS le niveau n-1 pour passer au n.
               Pour n=1, on affiche 0 (palier de départ). */
            const req       = n === 1 ? 0 : xpRequired(n - 1);
            const unlocks   = levelUnlocks(n, games, t);

            /* Couleur des pastilles selon l'état de la ligne : sur le
               palier courant le fond est espresso, il faut du clair. */
            const chipBg     = isCurrent ? 'rgba(255,255,255,.14)' : passed ? 'rgba(212,160,23,.14)' : C.card;
            const chipBorder = isCurrent ? 'rgba(255,255,255,.22)' : passed ? 'rgba(212,160,23,.3)' : C.border;
            const chipColor  = isCurrent ? 'rgba(255,255,255,.92)' : passed ? '#8B5A2B' : C.muted;

            return (
              <div key={n} className={isCurrent ? 'pulse-ring' : ''} style={{
                display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', borderRadius:16,
                background: passed ? 'rgba(212,160,23,.08)' : isCurrent ? ESPRESSO : C.card2,
                border: `2px solid ${isCurrent ? '#D4A017' : passed ? 'rgba(212,160,23,.3)' : C.border}`,
                opacity: locked ? .8 : 1,
                transition:'all .25s'
              }}>
                <div style={{
                  width:42, height:42, borderRadius:13, flexShrink:0,
                  background: passed ? GOLD : isCurrent ? 'rgba(212,160,23,.25)' : C.card,
                  border: passed ? 'none' : `2px solid ${isCurrent ? '#D4A017' : C.border}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:800, fontSize:16,
                  color: passed ? '#fff' : isCurrent ? '#D4A017' : C.muted,
                }}>
                  {locked ? <Lock size={16} /> : n}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8 }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', color: isCurrent ? 'rgba(255,255,255,.6)' : C.muted }}>
                      {t('modal.level_n', { n })}
                    </div>
                    <div style={{ flexShrink:0 }}>
                      {passed    && <span style={{ fontSize:11, fontWeight:700, color:'#D4A017', display:'flex', alignItems:'center', gap:3 }}><Check size={11} color="#D4A017" /> {t('levels.reached')}</span>}
                      {isCurrent && <span style={{ fontSize:10.5, fontWeight:700, color:'#D4A017', background:'rgba(212,160,23,.2)', padding:'3px 8px', borderRadius:8 }}>{t('levels.in_progress')}</span>}
                      {locked    && <span style={{ fontSize:10, color:C.muted, fontWeight:600 }}>{req} XP</span>}
                    </div>
                  </div>

                  <div style={{ fontSize:15, fontWeight:800, marginTop:2, color: isCurrent ? '#fff' : locked ? C.muted : C.text, letterSpacing: locked ? 4 : 0 }}>
                    {locked ? '? ? ?' : (localizedLevelName(n) || LEVEL_NAMES[n])}
                  </div>

                  {/* Ce que le palier apporte. Affiché même verrouillé : le
                      nom reste une surprise, la récompense est un moteur. */}
                  {unlocks.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:7 }}>
                      {unlocks.map((u, k) => (
                        <span key={k} style={{
                          display:'inline-flex', alignItems:'center', gap:4,
                          padding:'3px 8px', borderRadius:9,
                          background:chipBg, border:`1px solid ${chipBorder}`,
                          fontSize:10, fontWeight: u.strong ? 800 : 600,
                          color: u.strong && !isCurrent && !passed ? C.text : chipColor,
                          maxWidth:'100%',
                        }}>
                          <span style={{ fontSize:11, lineHeight:1 }}>{u.icon}</span>
                          <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.text}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {isCurrent && (
                    <div style={{ marginTop:9 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,.6)', marginBottom:3 }}>
                        <span>XP</span><span>{xp}/{xpReq}</span>
                      </div>
                      <div style={{ height:5, borderRadius:3, background:'rgba(255,255,255,.18)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:3, width:`${Math.min((xp/xpReq)*100,100)}%`, background:'#D4A017', transition:'width .6s' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop:14, padding:'10px 12px', borderRadius:12, background:C.card2, fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center' }}>
          {t('levels.footer_hint')}
        </div>
      </div>
    </div>
  );
}

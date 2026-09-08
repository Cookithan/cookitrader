import { ChevronLeft, Check, Lock } from "lucide-react";
import { LEVEL_NAMES, xpRequired } from "../../data/constants.js";
import { GOLD, ESPRESSO, levelTier } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";
import { LevelCookieMedal } from "../LevelCookieMedal.jsx";

/* ════════════════════════════════════════════════════
   LevelsModal — popup "Voir les niveaux"
   ────────────────────────────────────────────────────
   Ouverte au clic sur la carte niveau (Accueil) ou depuis le profil.
   Les 25 paliers : passés en or, courant pulsé avec barre XP, futurs
   verrouillés « ? ? ? ». Niv 25 = apex, il propose le prestige.

   v1.30 — chaque palier est une VRAIE bannière, plus une ligne de liste.
   Registre volontairement différent des cartes de mini-jeu (qui sont des
   aplats colorés à filigrane emoji) : ici c'est une plaque commémorative.
     · un ruban vertical à gauche, dans la teinte du palier
     · le NUMÉRO en géant, en filigrane à droite
     · une médaille ronde plutôt qu'une tuile carrée
     · un fond dégradé très pâle dans la teinte du palier

   TEINTES : la palette avance avec la progression — crème, caramel, moka,
   espresso, puis OR pour les 5 derniers. Faire défiler la liste doit se
   lire comme un parcours qui fonce et finit en or, pas comme 25 lignes
   identiques. Café-only, aucun rouge ni vert (cf. CLAUDE.md).
════════════════════════════════════════════════════ */

const TOTAL_LEVELS = 25;
const LEVELS = Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1);

export function LevelsModal({ currentLevel, xp, xpReq, onClose, C }) {
  const { t, localizedLevelName } = useTranslation();

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.78)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:80, backdropFilter:'blur(6px)', padding:18 }}>
      <div onClick={e=>e.stopPropagation()} className="bi" style={{ background:C.card, borderRadius:24, padding:'22px 18px 18px', width:'100%', maxWidth:380, maxHeight:'85vh', overflowY:'auto', border:`1px solid ${C.border}`, boxShadow:'0 24px 64px rgba(0,0,0,.45)' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>{t('modal.progression')}</div>
            <div style={{ fontSize:18, fontWeight:800, color:C.text, marginTop:2 }}>{t('modal.the_25_levels')}</div>
          </div>
          <button onClick={onClose} aria-label={t('common.close')} style={{ width:32, height:32, borderRadius:11, background:C.card2, color:C.text, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ChevronLeft size={18} style={{ transform:'rotate(180deg)' }} />
          </button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {LEVELS.map(n => {
            const passed    = n < currentLevel;
            const isCurrent = n === currentLevel;
            const locked    = n > currentLevel;
            /* XP exacte à gagner DANS le niveau n-1 pour passer au n.
               Pour n=1, on affiche 0 (palier de départ). */
            const req       = n === 1 ? 0 : xpRequired(n - 1);
            const tier      = levelTier(n);

            /* Le palier courant garde le fond espresso : c'est LUI qu'on
               doit trouver en ouvrant la modale. Les autres portent la
               teinte de leur tranche, très diluée. */
            const bg = isCurrent
              ? ESPRESSO
              : passed
                ? `linear-gradient(100deg, ${tier.soft}, transparent 70%)`
                : C.card2;

            return (
              <div key={n} className={isCurrent ? 'pulse-ring' : ''} style={{
                position:'relative', overflow:'hidden',
                display:'flex', alignItems:'center', gap:13,
                padding:'14px 16px 14px 19px', borderRadius:18,
                background: bg,
                border: `1.5px solid ${isCurrent ? '#D4A017' : passed ? tier.edge : C.border}`,
                boxShadow: isCurrent
                  ? '0 8px 22px rgba(74,44,23,.4)'
                  : passed ? '0 2px 10px rgba(0,0,0,.05)' : 'none',
                opacity: locked ? .78 : 1,
                transition:'all .25s',
              }}>
                {/* Ruban vertical — la teinte du palier, tranchée net. */}
                <div aria-hidden style={{
                  position:'absolute', left:0, top:0, bottom:0, width:5,
                  background: locked ? C.border : isCurrent ? GOLD : tier.base,
                }} />

                {/* Numéro géant en filigrane : la signature de ces
                    bannières, là où les cartes de jeu ont un emoji. */}
                <div aria-hidden style={{
                  position:'absolute', right:10, bottom:-20,
                  fontSize:72, fontWeight:900, lineHeight:1,
                  letterSpacing:'-4px', pointerEvents:'none',
                  color: isCurrent ? '#fff' : tier.base,
                  opacity: isCurrent ? .12 : locked ? .07 : .13,
                }}>{n}</div>

                {/* Médaille en cookie — les cartes de jeu ont une tuile
                    carrée, on change de forme ET de matière pour changer
                    de registre. Le biscuit est en retrait derrière le
                    numéro : c'est un support, pas un sujet. */}
                <LevelCookieMedal
                  size={44}
                  tier={tier}
                  variant={locked ? 'locked' : isCurrent ? 'active' : 'earned'}
                  C={C}
                >
                  {locked ? <Lock size={16} /> : n}
                </LevelCookieMedal>

                <div style={{ flex:1, minWidth:0, position:'relative' }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', color: isCurrent ? 'rgba(255,255,255,.6)' : C.muted, marginBottom:2 }}>
                    {t('modal.level_n', { n })}
                  </div>
                  <div style={{
                    fontSize:15, fontWeight:800,
                    color: isCurrent ? '#fff' : locked ? C.muted : C.text,
                    letterSpacing: locked ? 4 : 0,
                  }}>
                    {locked ? '? ? ?' : (localizedLevelName(n) || LEVEL_NAMES[n])}
                  </div>

                  {isCurrent && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,.6)', marginBottom:3 }}>
                        <span>XP</span><span>{xp}/{xpReq}</span>
                      </div>
                      <div style={{ height:5, borderRadius:3, background:'rgba(255,255,255,.18)', overflow:'hidden', position:'relative' }}>
                        <div style={{ height:'100%', borderRadius:3, width:`${Math.min((xp/xpReq)*100,100)}%`, background:'linear-gradient(90deg,#D4A017,#F0C050)', transition:'width .6s', position:'relative', overflow:'hidden' }}>
                          <div className="shimmer-bar" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ flexShrink:0, textAlign:'right', position:'relative' }}>
                  {passed && (
                    <span style={{
                      display:'inline-flex', alignItems:'center', gap:3,
                      fontSize:10.5, fontWeight:800, color:'#fff',
                      background:tier.base, padding:'3px 8px', borderRadius:9,
                      boxShadow:`0 2px 6px ${tier.soft}`,
                    }}>
                      <Check size={11} color="#fff" /> Atteint
                    </span>
                  )}
                  {isCurrent && (
                    <span style={{ fontSize:10.5, fontWeight:800, color:'#3D2010', background:'linear-gradient(135deg,#FFE89A,#D4A017)', padding:'3px 9px', borderRadius:9, boxShadow:'0 2px 8px rgba(212,160,23,.4)' }}>
                      En cours
                    </span>
                  )}
                  {locked && <span style={{ fontSize:10, color:C.muted, fontWeight:700 }}>{req} XP</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop:14, padding:'10px 12px', borderRadius:12, background:C.card2, fontSize:11, color:C.muted, lineHeight:1.5, textAlign:'center' }}>
          Atteins chaque niveau pour révéler son nom et débloquer un bonus de cookies.
        </div>
      </div>
    </div>
  );
}

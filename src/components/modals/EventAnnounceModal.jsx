import { useEffect, useState } from "react";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { formatTimeLeft, MAX_ATTEMPTS, SPECIAL_EVENTS } from "../../data/events.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   EventAnnounceModal — annonce d'événement spécial (PHASE 6E)
   ────────────────────────────────────────────────────
   Gère deux modes selon event.phase :

   - 'active' (révélé) :
       Emoji 🎉, titre, description, timer + essais restants,
       bouton "C'est parti ! 🚀" qui ferme.

   - 'waiting' (mystère) :
       Emoji ⏳, "PROCHAIN ÉVÉNEMENT", phrase teasing, timer,
       section "Trophées déjà gagnés" (liste des récompenses
       événementielles débloquées via completedEvents).

   Le timer countdown est rafraîchi chaque seconde.

   Props :
   - event            : activeEvent
   - completedEvents  : string[] des ids d'events déjà complétés
   - onClose          : ferme la modale
   - onGoToChallenge  : optionnel — appelé en mode 'active' au clic
                        "C'est parti", AVANT onClose. Sert à naviguer
                        vers la zone du défi (jeux/spin, marché, check-in…).
   - C                : palette
═══════════════════════════════════════════════════════ */

/* Tease générique fallback (utilisé si l'event n'a pas son propre champ
   `tease` — ne devrait plus arriver depuis 09/05/2026, tous en ont un). */
const FALLBACK_TEASES = [
  'Un événement spécial se prépare en coulisses…',
  'Quelque chose d\'inattendu approche…',
  'Reste à l\'écoute, ça va arriver bientôt…',
  'Le four tourne, la surprise mijote…',
];

function fallbackTease(seed){
  return FALLBACK_TEASES[Math.abs(seed | 0) % FALLBACK_TEASES.length];
}

export function EventAnnounceModal({ event, completedEvents = [], onClose, onGoToChallenge, C }){
  const { t, localizedField } = useTranslation();
  const [now, setNow] = useState(()=>Date.now());

  /* Tick de countdown chaque seconde — rafraîchit le timer uniquement
     pendant l'ouverture de la modale. */
  useEffect(()=>{
    const id = setInterval(()=>setNow(Date.now()), 1000);
    return ()=>clearInterval(id);
  }, []);

  if(!event) return null;
  const isWaiting = event.phase === 'waiting';
  const target    = isWaiting ? event.revealAt : event.expiresAt;
  const ms        = target - now;
  const expired   = ms <= 0;

  /* Trophées déjà gagnés (mode waiting uniquement) — on les retrouve
     en croisant completedEvents avec SPECIAL_EVENTS. */
  const wonTrophies = SPECIAL_EVENTS.filter(e => completedEvents.includes(e.id));
  /* Tease spécifique à l'event courant (énigmatique) — fallback générique
     si jamais ce champ manque. */
  const teaseText   = event.tease || fallbackTease(event.revealAt);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,8,4,.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:95, backdropFilter:'blur(6px)', padding:16 }}>
      <div className="bi" style={{
        background: ESPRESSO,
        borderRadius:24, padding:'28px 22px',
        maxWidth:360, width:'100%',
        boxShadow:'0 24px 60px rgba(0,0,0,.6), 0 0 0 1.5px rgba(212,160,23,.4)',
        textAlign:'center',
        position:'relative', overflow:'hidden',
      }}>
        {/* Halo doré derrière */}
        <div aria-hidden style={{
          position:'absolute', inset:-40,
          background:'radial-gradient(circle at 50% 30%, rgba(212,160,23,.35), transparent 60%)',
          pointerEvents:'none',
        }} />

        <div style={{ position:'relative' }}>
          <div style={{
            fontSize:46, marginBottom:6,
            animation: isWaiting ? 'float 3s ease-in-out infinite' : 'wiggle .9s ease-in-out infinite',
          }}>
            {isWaiting ? '⏳' : '🎉'}
          </div>

          <div style={{
            fontSize:11, fontWeight:900, color:'#D4A017',
            letterSpacing:3, textTransform:'uppercase', marginBottom:8,
          }}>
            {isWaiting ? t('event_announce.next_event') : t('event_announce.special_event')}
          </div>

          {isWaiting ? (
            <>
              <div style={{ fontSize:14, fontStyle:'italic', color:'rgba(240,224,192,.85)', marginBottom:8, lineHeight:1.5, padding:'0 6px' }}>
                « {teaseText} »
              </div>
              <div style={{
                fontSize:11, fontWeight:800, letterSpacing:1.2, textTransform:'uppercase',
                color:'#F5DC8A', marginBottom:16,
              }}>
                ✨ {t('event_announce.exclusive_reward')}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize:20, fontWeight:900, color:'#F0E0C0', marginBottom:10, lineHeight:1.25 }}>
                {localizedField(event, 'title')}
              </div>
              <div style={{ fontSize:13, color:'rgba(240,224,192,.85)', lineHeight:1.5, marginBottom:12, padding:'0 4px' }}>
                {localizedField(event, 'description')}
              </div>
              {event.reward?.cafeBonus > 0 && (
                <div style={{
                  display:'inline-block',
                  fontSize:11, fontWeight:900, letterSpacing:1, textTransform:'uppercase',
                  color:'#3D2010', background:'linear-gradient(135deg,#FBEFD4,#F0C050)',
                  padding:'5px 12px', borderRadius:11, marginBottom:18,
                  boxShadow:'0 3px 10px rgba(212,160,23,.35)',
                }}>
                  {t('event_announce.bonus_n_coffees', { n: event.reward.cafeBonus })}
                </div>
              )}
            </>
          )}

          <div style={{
            display:'flex', justifyContent:'center', flexWrap:'wrap',
            gap:8, marginBottom: isWaiting ? 18 : 20,
          }}>
            <span style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'8px 12px', borderRadius:12,
              background:'rgba(15,8,4,.55)', border:'1px solid rgba(212,160,23,.4)',
              color:'#F5DC8A', fontWeight:800, fontSize:12,
            }}>
              ⏱️ {expired ? '0 min' : formatTimeLeft(ms)}
            </span>
            {!isWaiting && (
              <span style={{
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'8px 12px', borderRadius:12,
                background:'rgba(15,8,4,.55)', border:'1px solid rgba(212,160,23,.4)',
                color:'#F5DC8A', fontWeight:800, fontSize:12,
              }}>
                🎯 {t('event_announce.unlimited_attempts')}
              </span>
            )}
          </div>

          {/* Trophées déjà gagnés (mode waiting uniquement) */}
          {isWaiting && (
            <div style={{
              borderTop:'1px solid rgba(212,160,23,.2)', paddingTop:14, marginBottom:18,
            }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:2, textTransform:'uppercase', color:'#D4A017', marginBottom:10 }}>
                🏆 {t('event_announce.trophies_won')}
              </div>
              {wonTrophies.length === 0 ? (
                <div style={{ fontSize:12, color:'rgba(240,224,192,.55)', fontStyle:'italic', padding:'4px 0' }}>
                  {t('event_announce.none_yet')}
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {/* Variable de boucle renommée en `ev` pour ne pas masquer
                      le hook t() de useTranslation. */}
                  {wonTrophies.map(ev => (
                    <div key={ev.id} style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'8px 12px', borderRadius:11,
                      background:'rgba(15,8,4,.45)',
                      border:'1px solid rgba(212,160,23,.25)',
                      textAlign:'left',
                    }}>
                      <span style={{ fontSize:18 }}>{ev.title.match(/\p{Emoji}/u)?.[0] ?? '🏆'}</span>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:800, color:'#F5DC8A', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {localizedField(ev.reward, 'name', 'REWARDS')}
                        </div>
                        <div style={{ fontSize:10, color:'rgba(240,224,192,.6)' }}>
                          {t('event_announce.via')} {localizedField(ev, 'title')}
                        </div>
                      </div>
                      <span style={{ fontSize:14, color:'#D4A017' }}>✓</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => {
              if(!isWaiting && onGoToChallenge) onGoToChallenge();
              onClose();
            }}
            className={isWaiting ? '' : 'glow-anim'}
            style={{
              width:'100%', padding:'14px 0', borderRadius:18,
              background: isWaiting ? 'rgba(240,224,192,.12)' : GOLD,
              color: isWaiting ? '#F5DC8A' : '#fff',
              fontSize:14, fontWeight:900, letterSpacing:.4,
              border: isWaiting ? '1.5px solid rgba(212,160,23,.4)' : 'none',
              boxShadow: isWaiting ? 'none' : '0 6px 20px rgba(212,160,23,.5)',
              cursor:'pointer',
            }}
          >
            {isWaiting ? t('common.close') : t('event_announce.lets_go')}
          </button>
        </div>
      </div>
    </div>
  );
}

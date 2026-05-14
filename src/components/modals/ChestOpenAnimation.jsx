import { useEffect, useState } from 'react';
import { RARITY_VISUAL } from '../../data/chests.js';

/* ════════════════════════════════════════════════════
   ChestOpenAnimation — coffre premium 3 tiers
   ────────────────────────────────────────────────────
   6 phases séquentielles :
     0 intro    : le coffre apparaît au centre (zoom + glow)        ~600 ms
     1 shake    : trembote de plus en plus fort                     ~1000 ms
     2 burst    : flash + explosion de particules dorées            ~500 ms
     3 reveal1  : premier item s'affiche                            ~600 ms
     4 reveal2  : deuxième item s'ajoute                            ~600 ms
     5 reveal3  : troisième item s'ajoute + bouton Récolter         — perma

   Props :
     - chest  : { name, emoji, glow, glowSoft, tier } (cf. CHEST_TIERS)
     - items  : [{ rarity, type, amount?, cosmeticId?, label, emoji }, ...]
                 (toujours 3 items, dans l'ordre de révélation)
     - onCollect : callback déclenché par le bouton Récolter
═══════════════════════════════════════════════════════ */

const PHASE_INTRO_MS   = 600;
const PHASE_SHAKE_MS   = 1000;
const PHASE_BURST_MS   = 500;
const PHASE_REVEAL_MS  = 600;

export function ChestOpenAnimation({ chest, items, onCollect }){
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    /* Enchaînement des 6 phases — la dernière (5) reste en place jusqu'au
       clic Récolter. */
    const ts = [
      PHASE_INTRO_MS,                                                       // → 1 shake
      PHASE_INTRO_MS + PHASE_SHAKE_MS,                                       // → 2 burst
      PHASE_INTRO_MS + PHASE_SHAKE_MS + PHASE_BURST_MS,                      // → 3 reveal1
      PHASE_INTRO_MS + PHASE_SHAKE_MS + PHASE_BURST_MS + PHASE_REVEAL_MS,    // → 4 reveal2
      PHASE_INTRO_MS + PHASE_SHAKE_MS + PHASE_BURST_MS + PHASE_REVEAL_MS*2,  // → 5 reveal3
    ];
    const timers = ts.map((t, i) => setTimeout(() => setPhase(i + 1), t));
    return () => timers.forEach(clearTimeout);
  }, []);

  /* Particules dorées au burst — même logique que BoxOpenAnimation. */
  const particles = phase === 2 ? Array.from({ length: 22 }, (_, i) => {
    const angle = (i / 22) * 2 * Math.PI;
    const dist  = 110 + (i % 3) * 32;
    return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, delay: (i % 4) * 40 };
  }) : [];

  const revealedCount = Math.max(0, phase - 2);  /* phase 3 → 1, 4 → 2, 5 → 3 */
  const allRevealed = phase >= 5;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position:'fixed', inset:0,
        background: phase === 2 ? 'rgba(15,8,4,.95)' : 'rgba(15,8,4,.85)',
        backdropFilter:'blur(8px)',
        WebkitBackdropFilter:'blur(8px)',
        display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:1400, padding:20,
        animation:'inboxOverlayIn .3s ease-out both',
        overflow:'hidden',
      }}
    >
      {/* Flash blanc au burst */}
      {phase === 2 && (
        <div aria-hidden style={{
          position:'absolute', inset:0,
          animation:`boxFlash ${PHASE_BURST_MS}ms ease-out both`,
          pointerEvents:'none', zIndex:1,
        }} />
      )}

      <div style={{
        position:'relative',
        display:'flex', flexDirection:'column', alignItems:'center',
        gap: phase < 3 ? 24 : 20,
        zIndex:2, maxWidth:'100%',
      }}>
        {/* Coffre central — visible phases 0-2 */}
        {phase < 3 && (
          <>
            <div
              style={{
                fontSize:130,
                animation:
                  phase === 0 ? `boxIntro ${PHASE_INTRO_MS}ms cubic-bezier(.36,.07,.19,.97) both` :
                  phase === 1 ? `boxShake ${PHASE_SHAKE_MS}ms ease-in-out` :
                  phase === 2 ? `boxBurst ${PHASE_BURST_MS}ms ease-out both` : 'none',
                filter: phase === 1
                  ? `drop-shadow(0 0 24px ${chest.glow})`
                  : `drop-shadow(0 8px 22px ${chest.glowSoft})`,
                lineHeight:1,
              }}
            >
              {chest.emoji}
            </div>
            <div style={{
              fontSize:11, fontWeight:900, color:chest.glow,
              textTransform:'uppercase', letterSpacing:3,
              textShadow:`0 0 12px ${chest.glowSoft}`,
            }}>
              {chest.name}
            </div>
          </>
        )}

        {/* Particules dorées au burst */}
        {phase === 2 && particles.map((p, i) => (
          <div key={i} aria-hidden style={{
            position:'absolute', top:'50%', left:'50%',
            fontSize:18, color: chest.glow,
            '--dx': `${p.dx}px`, '--dy': `${p.dy}px`,
            animation: `boxParticle 750ms ease-out ${p.delay}ms both`,
            pointerEvents:'none',
          }}>✨</div>
        ))}

        {/* Reveal des 3 items (phases 3-5) — row horizontal de 3 cartes */}
        {phase >= 3 && (
          <>
            <div style={{
              fontSize:11, fontWeight:900, color:chest.glow,
              textTransform:'uppercase', letterSpacing:3, marginBottom:2,
              textShadow:`0 0 12px ${chest.glowSoft}`,
              animation:'boxIntro 400ms ease-out',
            }}>
              {chest.name}
            </div>

            <div style={{
              display:'flex', gap:10, justifyContent:'center',
              flexWrap:'nowrap',
            }}>
              {items.map((it, i) => (
                <ItemCard
                  key={i}
                  item={it}
                  visible={i < revealedCount}
                />
              ))}
            </div>

            {allRevealed && (
              <button
                onClick={onCollect}
                className="glow-anim"
                style={{
                  marginTop:18,
                  padding:'14px 36px',
                  borderRadius:14,
                  background:'linear-gradient(135deg, #FFE066, #D4A017)',
                  color:'#3D2010',
                  fontSize:15, fontWeight:900, letterSpacing:.5,
                  border:'none',
                  boxShadow:'0 8px 24px rgba(212,160,23,.5)',
                  cursor:'pointer',
                  touchAction:'manipulation',
                  animation:'boxRewardReveal 700ms cubic-bezier(.36,.07,.19,.97) 200ms both',
                }}
              >
                Récolter 🎉
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Carte item ────────────────────────────────────────
   Affiche un item avec :
   - emoji centré (l'item lui-même)
   - label en dessous (ex: "+200 🍪", "Skin Cookie Caramel")
   - badge rareté en bas (Commun / Rare / Épique / Légendaire)
   - bordure & glow couleur selon rareté
   - sparkles orbitant pour rare/epic/legendary
   - placeholder vide si pas encore révélé (pour réserver la place) */
function ItemCard({ item, visible }){
  const vis = RARITY_VISUAL[item.rarity] || RARITY_VISUAL.common;
  const isHighRarity = item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary';
  const sparkleCount = item.rarity === 'legendary' ? 6 : item.rarity === 'epic' ? 4 : item.rarity === 'rare' ? 2 : 0;

  if(!visible){
    /* Placeholder pour réserver la place et garder les cartes alignées
       pendant la révélation séquentielle. */
    return (
      <div style={{
        width:96, height:130,
        borderRadius:14,
        background:'rgba(255,255,255,.04)',
        border:'1.5px dashed rgba(255,255,255,.12)',
      }} />
    );
  }

  return (
    <div
      style={{
        width:96,
        padding:'12px 8px 10px',
        borderRadius:14,
        background:`linear-gradient(160deg, rgba(61,32,16,.92), rgba(31,14,4,.92))`,
        border:`2px solid ${vis.glow}`,
        display:'flex', flexDirection:'column', alignItems:'center',
        gap:6, position:'relative',
        animation: `chestItemPop ${PHASE_REVEAL_MS}ms cubic-bezier(.36,.07,.19,.97) both${
          isHighRarity ? `, chestItemGlow 1.8s ease-in-out ${PHASE_REVEAL_MS}ms infinite` : ''
        }`,
        '--glow-soft': vis.soft,
      }}
    >
      {/* Sparkles en orbite pour les raretés élevées */}
      {sparkleCount > 0 && (
        <div style={{
          position:'absolute', top:'40%', left:'50%',
          width:0, height:0, pointerEvents:'none',
        }}>
          {Array.from({ length: sparkleCount }, (_, i) => (
            <div
              key={i}
              aria-hidden
              style={{
                position:'absolute', top:0, left:0,
                fontSize: item.rarity === 'legendary' ? 11 : 9,
                color: vis.glow,
                '--orbit': `${item.rarity === 'legendary' ? 42 : 32}px`,
                animation: `chestSparkleOrbit ${2.5 + i * 0.3}s linear infinite`,
                animationDelay: `${i * 0.15}s`,
              }}
            >✨</div>
          ))}
        </div>
      )}

      {/* Emoji central de l'item */}
      <div style={{
        fontSize:38,
        filter: `drop-shadow(0 0 14px ${vis.soft})`,
        lineHeight:1, marginTop:4,
      }}>
        {item.emoji}
      </div>

      {/* Label de l'item — tronqué si trop long pour tenir dans 96px */}
      <div style={{
        fontSize:10.5, fontWeight:800, color:'#FFE5A6',
        textAlign:'center', lineHeight:1.25,
        textShadow:'0 1px 4px rgba(0,0,0,.6)',
        wordBreak:'break-word',
        minHeight:26,
      }}>
        {item.label}
      </div>

      {/* Badge rareté en pied */}
      <div style={{
        fontSize:8.5, fontWeight:900,
        color: vis.glow,
        textTransform:'uppercase', letterSpacing:1.2,
        padding:'2px 7px', borderRadius:5,
        background:`${vis.soft}`,
        border:`1px solid ${vis.glow}`,
      }}>
        {vis.label}
      </div>
    </div>
  );
}

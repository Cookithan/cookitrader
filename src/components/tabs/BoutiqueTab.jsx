import { useState } from "react";
import { Cookie, Coffee, Check, Lock, ChevronRight } from "lucide-react";
import { REWARDS } from "../../data/constants.js";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { playSound } from "../../lib/audio.js";
import { BuyCafesModal } from "../modals/BuyCafesModal.jsx";
import { useTranslation } from "../../i18n/index.js";

/* Achat de cafés via Stripe — masqué tant qu'on est en mode test (pas de
   live keys, pas de mentions légales). Flip à `true` pour réafficher la
   carte d'entrée dans la vue Premium et le BuyCafesModal associé. */
const STRIPE_ENABLED = false;

/* ════════════════════════════════════════════════════
   BoutiqueTab — onglet boutique (mode 'shop' | 'premium')
   ────────────────────────────────────────────────────
   DÉGRAISSÉE en v1.30. Ce qui a sauté et pourquoi :
   - Les 16 pastilles de filtre (9 en 🍪, 7 en ☕). La boutique 🍪 ne montre
     que les items du palier en cours — soit une poignée. Neuf filtres pour
     quatre articles, c'était du bruit. Côté ☕ il y a 17 items en tout :
     des en-têtes de section suffisent.
   - Les deux SOUS-VUES premium ('jetons', 'chests') avec leurs cartes
     d'entrée, leur bouton retour et leur bandeau d'intro. Le premium tient
     désormais dans un seul défilement à trois sections.
   - Le rappel ☕/🍪 en tête d'onglet : l'en-tête de l'app les affiche déjà
     en permanence, deux lignes au-dessus.
   - La phrase de pied « Monte de niveau… », qui répétait le bandeau.

   SHOP : items en cookies du palier révélé. Un nouveau palier n'apparaît
   que si le précédent est entièrement acheté (cf. revealedLevel).
   PREMIUM : 3 sections — Cosmétiques · Boosts VIP · Coffres Mystères.

   Snapshot initialUnlocked : les items achetés AVANT ce montage sont
   masqués (on les retrouve dans l'onglet Collection) ; ceux achetés
   PENDANT la session restent visibles jusqu'au prochain montage.

   La boutique VEND, elle n'équipe pas : un item acheté renvoie vers
   l'onglet Ma Collection, seul écran d'équipement de l'app.
═══════════════════════════════════════════════════════ */

/* Consommables « Boosts VIP » — jetons de jeu + boosters café. */
const CONSUMABLE_APPLY_AS = ['spin_pass', 'slot_pass', 'quiz_skip', 'next_game_doubler', 'boost_x2_1h', 'boost_x2_24h', 'free_recharges_24h', 'streak_save'];
const isJeton     = (r) => CONSUMABLE_APPLY_AS.includes(r.applyAs);
/* Coffres mystères — Boîte Mystère + chests Bronze/Or/Légendaire. */
const isChestLike = (r) => r.applyAs === 'open_box' || r.applyAs === 'open_chest';

/* Ordre d'affichage des familles premium dans la section Cosmétiques. */
const PREMIUM_FAMILY_ORDER = ['avatar', 'skin', 'theme', 'music', 'banner', 'pack_shares', 'game_theme'];

export function BoutiqueTab({
  coins, cafes, unlocked, level, onUnlock, mode, setMode,
  spinsLeft = 0, slotPlaysLeft = 0, userCode = '', vipPurchasesToday = {},
  onOpenCollection, C,
}) {
  const { t, localizedField } = useTranslation();
  const [showBuyCafes, setShowBuyCafes] = useState(false);
  const [initialUnlocked] = useState(unlocked);

  /* Révèle un niveau de plus uniquement quand tout celui en cours est acheté.
     Ignore les items premium (☕), les items 'limited' (thèmes événements
     qui peuvent ne jamais être gagnés — sinon on bloque la progression) et
     les consommables (Pack actions $CKM, jamais ajoutés à unlocked). */
  const isCountable = (r) =>
    r.currency !== 'cafe' && !r.inPremium && !r.inActionsShop && !r.limited && r.applyAs !== 'pack_shares' && r.applyAs !== 'game_theme';
  let revealedLevel = 1;
  for(let n=1; n<=level; n++){
    const itemsAtN = REWARDS.filter(r => r.levelRequired === n && isCountable(r));
    revealedLevel = n;
    if(!itemsAtN.every(it => unlocked.includes(it.id))) break;
  }

  const itemsAtRevealed     = REWARDS.filter(r => r.levelRequired === revealedLevel && isCountable(r));
  const earnedAtRevealed    = itemsAtRevealed.filter(it => unlocked.includes(it.id)).length;
  const totalAtRevealed     = itemsAtRevealed.length;
  const remainingAtRevealed = totalAtRevealed - earnedAtRevealed;
  const shopProgressPct     = totalAtRevealed > 0 ? Math.round((earnedAtRevealed / totalAtRevealed) * 100) : 100;

  /* ── Sélection des items ─────────────────────────── */
  /* Items `limited` (éditions limitées gagnées via événements) : JAMAIS en
     boutique, on les retrouve dans Ma Collection.
     Packs $CKM : si `consumable` → rachetables à volonté (jamais dans
     `unlocked`). Sinon one-shot (anti-exploit, cf. App.unlockReward) : ils
     entrent dans `unlocked` et disparaissent comme un item normal via
     initialUnlocked — sinon ils restaient en carte morte « Débloqué » à vie. */
  const shopItems = REWARDS.filter(r => {
    if(r.currency === 'cafe') return false;
    if(r.inPremium)      return false;  /* coffre payée en 🍪 mais rangée en ☕ */
    if(r.inActionsShop)  return false;  /* ex-boutique $CKM, supprimée en v1.30 */
    if(r.limited)        return false;
    if(r.applyAs === 'pack_shares'){
      if(!r.consumable && initialUnlocked.includes(r.id)) return false;
      return r.levelRequired <= revealedLevel;
    }
    return !initialUnlocked.includes(r.id) && r.levelRequired <= revealedLevel;
  });

  /* Premium : `levelRequired` cache l'item sous le niveau (pas de cadenas,
     on garde la vue épurée) et `levelMax` le retire au-dessus. */
  const premiumPool = REWARDS.filter(r => {
    if(r.currency !== 'cafe' && !r.inPremium) return false;
    if(r.levelRequired && level < r.levelRequired) return false;
    if(r.levelMax && level > r.levelMax) return false;
    return true;
  });

  const byCostThenLevel = (a, b) => {
    const ua = unlocked.includes(a.id), ub = unlocked.includes(b.id);
    if(ua !== ub) return ua ? -1 : 1;
    if(a.levelRequired !== b.levelRequired) return a.levelRequired - b.levelRequired;
    return a.cost - b.cost;
  };
  const familyRank = (r) => {
    const i = PREMIUM_FAMILY_ORDER.indexOf(r.applyAs);
    return i === -1 ? 99 : i;
  };

  const premiumCosmetics = premiumPool
    .filter(r => !isJeton(r) && !isChestLike(r) && !initialUnlocked.includes(r.id))
    .sort((a, b) => (familyRank(a) - familyRank(b)) || byCostThenLevel(a, b));
  const premiumJetons = premiumPool.filter(isJeton).sort(byCostThenLevel);
  const premiumChests = premiumPool
    .filter(r => isChestLike(r) && !initialUnlocked.includes(r.id))
    .sort(byCostThenLevel);

  const shopShown = [...shopItems].sort(byCostThenLevel);

  /* ── Carte d'un item ─────────────────────────────── */
  const itemCard = (r, i) => {
    const isPremium  = r.currency === 'cafe';
    const isUnlocked = unlocked.includes(r.id);
    const lvOK       = level >= r.levelRequired;
    const canAfford  = isPremium ? cafes >= r.cost : coins >= r.cost;
    const lvLocked   = !lvOK && !isUnlocked;

    /* Jetons VIP : achetables seulement une fois le quota du jour épuisé,
       et 1 achat par jour et par item (cf. VIP_DAILY_CAP_IDS dans App.jsx). */
    const isSpinPass = r.applyAs === 'spin_pass';
    const isSlotPass = r.applyAs === 'slot_pass';
    const vipBoughtToday = !!vipPurchasesToday && vipPurchasesToday[r.id] === new Date().toDateString();
    const passLockedReason =
        vipBoughtToday                  ? 'Revient demain'
      : (isSpinPass && spinsLeft > 0)   ? `Reste ${spinsLeft} tour${spinsLeft > 1 ? 's' : ''}`
      : (isSlotPass && slotPlaysLeft > 0) ? `Reste ${slotPlaysLeft} partie${slotPlaysLeft > 1 ? 's' : ''}`
      : null;
    const passLocked = !!passLockedReason;

    /* Un item « équipable » renvoie vers Ma Collection une fois acheté.
       Les consommables (jetons, packs, coffres) n'ont rien à équiper. */
    const isEquippable = ['theme','avatar','skin','music','banner'].includes(r.applyAs)
      || ['Thème','Avatar','Skin','Titre','Musique'].includes(r.type);

    return (
      <div key={r.id} className={`su stagger-${(i % 4) + 1}`} style={{
        borderRadius:18, padding:16,
        background: isPremium ? `linear-gradient(160deg, ${C.card}, ${C.card2})` : C.card,
        border:`2px solid ${isUnlocked ? '#D4A017' : isPremium ? 'rgba(212,160,23,.55)' : C.border}`,
        boxShadow: isUnlocked
          ? '0 0 20px rgba(212,160,23,.25)'
          : isPremium ? '0 0 18px rgba(74,44,23,.18)' : '0 2px 8px rgba(0,0,0,.04)',
        transition:'all .3s', position:'relative', overflow:'hidden',
        opacity: lvLocked ? .55 : 1,
      }}>
        {r.limited && isUnlocked && (
          <span style={{ position:'absolute', top:8, right:10, fontSize:9, fontWeight:800, padding:'3px 7px', borderRadius:8, background:'linear-gradient(135deg,#D4A017,#C17F3C)', color:'#fff', letterSpacing:.5, boxShadow:'0 2px 6px rgba(212,160,23,.35)' }}>ÉDITION LIMITÉE</span>
        )}
        {isUnlocked && !r.limited && (
          <span className="sparkle-anim" style={{ position:'absolute', top:8, right:10, fontSize:14, animationDelay:`${i * 0.3}s` }}>✨</span>
        )}

        <div className={isUnlocked ? 'float-anim' : ''} style={{ fontSize:30, marginBottom:8, display:'inline-block', filter: lvLocked ? 'grayscale(.7)' : 'none' }}>
          {lvLocked ? '🔒' : r.emoji}
        </div>
        <div style={{ fontWeight:700, fontSize:13, color:C.text, marginBottom:3 }}>{localizedField(r, 'name', 'REWARDS')}</div>
        <div style={{ fontSize:11, color:C.muted, marginBottom: r.savingsLabel ? 6 : 12 }}>{localizedField(r, 'desc', 'REWARDS')}</div>

        {/* Badge « économies » — sur les packs, pour justifier le prix. */}
        {r.savingsLabel && !isUnlocked && (
          <div style={{
            display:'inline-block', fontSize:9.5, fontWeight:800, color:'#3D2010',
            background:'linear-gradient(135deg,#F5DC8A,#D4A017)',
            padding:'2px 7px', borderRadius:8, marginBottom:10, letterSpacing:.3,
            boxShadow:'0 2px 6px rgba(212,160,23,.3)',
          }}>✨ {r.savingsLabel}</div>
        )}

        {isUnlocked ? (
          isEquippable && onOpenCollection ? (
            <button
              onClick={onOpenCollection}
              style={{
                width:'100%', padding:'8px 0', borderRadius:12, fontSize:11.5, fontWeight:700,
                background:'transparent', color:'#D4A017', border:'1.5px solid #D4A017',
                display:'flex', alignItems:'center', justifyContent:'center', gap:5, cursor:'pointer',
              }}
            >
              <Check size={12} color="#D4A017" /> {t('shop.equip_in_collection')}
            </button>
          ) : (
            <div style={{ fontSize:12, fontWeight:700, color:'#D4A017', display:'flex', alignItems:'center', gap:4 }}>
              <Check size={12} color="#D4A017" /> {t('common.unlocked')}
            </div>
          )
        ) : lvLocked ? (
          <div style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:700, background:C.card2, color:'#D4A017', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <Lock size={11} color="#D4A017" /> Niveau {r.levelRequired} requis
          </div>
        ) : isPremium ? (
          passLocked ? (
            <div style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:11.5, fontWeight:700, background:C.card2, color:C.muted, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontStyle:'italic' }}>
              <Lock size={11} /> {passLockedReason}
            </div>
          ) : (
            <button onClick={() => onUnlock(r.id)} className={canAfford ? 'pulse-ring' : ''} style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:800, background: canAfford ? ESPRESSO : C.card2, color: canAfford ? '#F0C050' : C.muted, border:`1.5px solid ${canAfford ? 'rgba(212,160,23,.5)' : C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:5, cursor: canAfford ? 'pointer' : 'not-allowed' }}>
              {canAfford ? <Coffee size={11} color="#F0C050" /> : <Lock size={11} />} {r.cost} cafés
            </button>
          )
        ) : (
          <button onClick={() => onUnlock(r.id)} className={canAfford ? 'pulse-ring' : ''} style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:700, background: canAfford ? GOLD : C.card2, color: canAfford ? '#fff' : C.muted, border:`1px solid ${canAfford ? 'transparent' : C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:4, cursor: canAfford ? 'pointer' : 'not-allowed' }}>
            {canAfford ? <Cookie size={11} color="#fff" /> : <Lock size={11} />} {r.cost} cookies
          </button>
        )}
      </div>
    );
  };

  const grid = (items) => (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
      {items.map((r, i) => itemCard(r, i))}
    </div>
  );

  /* En-tête de section premium — même grammaire que Ma Collection. */
  const section = (icon, label, items, sub = null) => {
    if(items.length === 0) return null;
    return (
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1.6, marginBottom: sub ? 4 : 10 }}>
          {icon} {label} · {items.length}
        </div>
        {sub && <div style={{ fontSize:11, color:C.muted, lineHeight:1.45, marginBottom:10 }}>{sub}</div>}
        {grid(items)}
      </div>
    );
  };

  const tabButton = (id, Icon, label, activeBg, activeColor, shadow) => (
    <button
      onClick={() => { if(mode !== id){ playSound('tab'); setMode(id); } }}
      style={{
        flex:1, padding:'10px 0', borderRadius:10, fontSize:13, fontWeight:800, letterSpacing:.4,
        background: mode === id ? activeBg : 'transparent',
        color: mode === id ? activeColor : C.text,
        border: mode === id && id === 'premium' ? '1.5px solid rgba(212,160,23,.55)' : '1.5px solid transparent',
        display:'flex', alignItems:'center', justifyContent:'center', gap:6,
        boxShadow: mode === id ? shadow : 'none', cursor:'pointer',
      }}
    >
      <Icon size={14} color={mode === id ? activeColor : C.muted} />
      {label}
    </button>
  );

  return (
    <div className="su" style={{ position:'relative', paddingTop:8 }}>

      {/* Sélecteur 🍪 / ☕ — pas de rappel des soldes ici, l'en-tête de
          l'app les affiche déjà juste au-dessus. */}
      <div style={{ display:'flex', gap:6, padding:4, borderRadius:14, background:C.card2, marginBottom:16 }}>
        {tabButton('shop', Cookie, t('shop.tab_shop'), GOLD, '#fff', '0 4px 12px rgba(212,160,23,.4)')}
        {tabButton('premium', Coffee, t('shop.tab_premium'), ESPRESSO, '#F0C050', '0 4px 14px rgba(74,44,23,.5)')}
      </div>

      {mode === 'shop' && (<>
        {/* Palier boutique — une ligne + une barre. Le message explique la
            règle non évidente : un nouveau palier n'ouvre que si l'actuel
            est complet. */}
        <div style={{
          padding:'11px 14px', borderRadius:14, marginBottom:16,
          background:ESPRESSO, border:'1.5px solid rgba(212,160,23,.4)',
          boxShadow:'0 4px 14px rgba(74,44,23,.35)',
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:8 }}>
            <span style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,.8)', textTransform:'uppercase', letterSpacing:1.4 }}>
              🏪 Palier {revealedLevel}
            </span>
            <span style={{ fontSize:11, fontWeight:800, color:'#F0C050', fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' }}>
              {totalAtRevealed > 0 ? `${earnedAtRevealed}/${totalAtRevealed}` : '—'}
            </span>
          </div>
          <div style={{ height:5, background:'rgba(0,0,0,.3)', borderRadius:3, overflow:'hidden' }}>
            <div style={{
              width:`${shopProgressPct}%`, height:'100%',
              background:'linear-gradient(90deg, #D4A017, #F0C050)',
              transition:'width .4s ease-out',
            }} />
          </div>
          {remainingAtRevealed > 0 && totalAtRevealed > 0 && (
            <div style={{ fontSize:10.5, color:'rgba(255,255,255,.6)', marginTop:7, lineHeight:1.4 }}>
              Encore {remainingAtRevealed} pour ouvrir le palier {revealedLevel + 1}.
            </div>
          )}
        </div>

        {grid(shopShown)}

        {shopShown.length === 0 && (
          <div style={{ textAlign:'center', padding:'30px 20px', borderRadius:16, background:C.card, border:`1px dashed ${C.border}`, color:C.muted }}>
            <div style={{ fontSize:36, marginBottom:8 }}>🛍️</div>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>Rien de nouveau ici</div>
            <div style={{ fontSize:11, lineHeight:1.5, maxWidth:260, margin:'0 auto' }}>
              Tu as tout pris pour ton niveau. Monte d'un niveau pour ouvrir le palier suivant.
              <br/>
              {t('shop.empty_find_items')}
            </div>
          </div>
        )}
      </>)}

      {mode === 'premium' && (<>
        {/* Carte achat de cafés réels (Stripe) — gated, désactivé en test. */}
        {STRIPE_ENABLED && userCode && (
          <button
            onClick={() => { playSound('modal'); setShowBuyCafes(true); }}
            style={{
              width:'100%', display:'flex', alignItems:'center', gap:14,
              padding:'14px 16px', borderRadius:16, marginBottom:20,
              background:ESPRESSO, border:'1.5px solid rgba(212,160,23,.55)',
              boxShadow:'0 4px 16px rgba(74,44,23,.4)',
              cursor:'pointer', color:'#fff', textAlign:'left',
            }}
          >
            <div style={{ fontSize:32 }}>☕</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:900, color:'#F0C050', marginBottom:2, letterSpacing:.3 }}>Acheter des cafés</div>
              <div style={{ fontSize:11.5, color:'rgba(255,255,255,.75)', lineHeight:1.4 }}>15 / 50 / 200 ☕ — paiement sécurisé Stripe</div>
            </div>
            <ChevronRight size={18} color="#F0C050" />
          </button>
        )}

        {section('🎨', 'Cosmétiques', premiumCosmetics)}
        {section('🎫', 'Boosts VIP', premiumJetons)}
        {section('🎁', 'Coffres Mystères', premiumChests, t('shop.chests_view_intro', { once: t('shop.chests_view_once') }))}

        {premiumCosmetics.length + premiumJetons.length + premiumChests.length === 0 && (
          <div style={{ textAlign:'center', padding:'30px 20px', borderRadius:16, background:C.card, border:`1px dashed ${C.border}`, color:C.muted }}>
            <div style={{ fontSize:36, marginBottom:8 }}>☕</div>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>Aucun item premium dispo</div>
            <div style={{ fontSize:11, lineHeight:1.5, maxWidth:260, margin:'0 auto' }}>
              Tu as déjà tout débloqué côté premium.
              <br/>
              {t('shop.empty_find_items')}
            </div>
          </div>
        )}
      </>)}

      {STRIPE_ENABLED && showBuyCafes && (
        <BuyCafesModal userCode={userCode} onClose={() => setShowBuyCafes(false)} C={C} />
      )}
    </div>
  );
}

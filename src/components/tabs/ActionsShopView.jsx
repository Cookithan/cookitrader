import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { REWARDS } from "../../data/constants.js";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { getUserPortfolio, adminDebitShares } from "../../lib/market.js";
import { isSupabaseEnabled } from "../../lib/supabase.js";
import { playSound } from "../../lib/audio.js";
import { useTranslation } from "../../i18n/index.js";
import { useLocalStorage } from "../../hooks/useLocalStorage.js";

/* ════════════════════════════════════════════════════
   ActionsShopView — « Boutique Actions » ($CKM)
   ────────────────────────────────────────────────────
   Sous-vue de BoutiqueTab (mode 'actions'). Cosmétiques EXCLUSIFs
   payés en actions $CKM (REWARDS `inActionsShop:true`).

   RÈGLE (validée user) — « dépense + re-grind 500 » :
     - Accès uniquement si solde d'actions ≥ ACCESS_THRESHOLD (500).
     - 1 SEUL achat par cycle : à l'achat on débite les actions
       (serveur) puis la boutique se VERROUILLE.
     - Re-déverrouillage : le solde doit redescendre < 500 PUIS
       remonter ≥ 500 (regagner un nouveau palier). Le verrou est
       levé dès qu'on observe un solde < 500 (dip = cycle cassé),
       il faut ensuite re-atteindre 500.

   Verrou persité en LS (`actionsShopLocked`). Le débit d'actions
   est autoritaire côté serveur (adminDebitShares) → pas d'item
   gratuit ; le verrou LS n'est qu'un garde-fou de cadence (limite
   cross-device connue & assumée pour ce v1).

   Items : one-shot. Crédités via onGrantUnlock(id) (ajout à
   `unlocked`, synchronisé Supabase par App). Titres activables.

   Items : Badge (statique) · Thème/Avatar (équipables) · Café
           (consommable : échange actions → ☕, non "owned").

   Props : userCode, unlocked, onGrantUnlock, onGrantCafes,
           activeTheme, setActiveTheme, userAvatar, setUserAvatar, C
═══════════════════════════════════════════════════════ */

export const ACTIONS_ACCESS_THRESHOLD = 500;

export function ActionsShopView({ userCode, unlocked = [], onGrantUnlock, onGrantCafes, activeTheme, setActiveTheme, userAvatar, setUserAvatar, C }) {
  const { t, localizedField } = useTranslation();
  const enabled = isSupabaseEnabled() && !!userCode;

  const CATALOG = REWARDS
    .filter(r => r.inActionsShop)
    .sort((a, b) => a.cost - b.cost);

  const [shares,  setShares]  = useState(null);   // null = pas encore chargé
  const [loading, setLoading] = useState(enabled);
  const [buying,  setBuying]  = useState(null);   // id en cours d'achat
  const [notice,  setNotice]  = useState(null);   // message éphémère
  const [showClosed, setShowClosed] = useState(false); // popup "boutique refermée"
  const [justPurchased, setJustPurchased] = useState(false); // achat fait CE mount
  const [locked,  setLocked]  = useLocalStorage('actionsShopLocked', false);
  const aliveRef = useRef(true);

  const fetchShares = async () => {
    if(!enabled) return;
    const p = await getUserPortfolio(userCode);
    if(!aliveRef.current) return;
    setShares(Number(p?.shares) || 0);
    setLoading(false);
  };

  useEffect(() => {
    aliveRef.current = true;
    fetchShares();
    /* Refresh périodique : le solde bouge via le marché. */
    const id = setInterval(fetchShares, 20000);
    return () => { aliveRef.current = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCode]);

  /* Dip < 500 observé → on lève le verrou (cycle cassé). Il faudra
     re-atteindre 500 pour que la boutique redevienne dispo. */
  useEffect(() => {
    if(shares != null && shares < ACTIONS_ACCESS_THRESHOLD && locked){
      setLocked(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shares]);

  const hasAccess = shares != null && shares >= ACTIONS_ACCESS_THRESHOLD;
  const available = hasAccess && !locked;
  /* Catalogue visible si on peut acheter, OU si on vient d'acheter ce
     mount (pour voir/activer l'item avant que la boutique se ferme). */
  const showCatalog = available || justPurchased;

  const isCafeItem = (r) => r.applyAs === 'as_cafe';

  const buy = async (item) => {
    if(!available || buying) return;
    /* Café = consommable (échange actions→☕), jamais "owned".
       Le reste = one-shot (dans unlocked). */
    if(!isCafeItem(item) && unlocked.includes(item.id)) return;
    if((shares || 0) < item.cost){
      setNotice(t('actions_shop.not_enough', { n: item.cost }));
      return;
    }
    setBuying(item.id);
    playSound('modal');
    const res = await adminDebitShares(userCode, item.cost);
    if(!aliveRef.current) return;
    if(!res || !res.success){
      setBuying(null);
      setNotice(t('actions_shop.error'));
      return;
    }
    if(isCafeItem(item)){
      onGrantCafes?.(item.cafeReward || 0);
    } else {
      onGrantUnlock?.(item.id);
    }
    setLocked(true);                       // verrouille le cycle
    setShares(Number(res.sharesAfter) || Math.max(0, (shares || 0) - item.cost));
    setBuying(null);
    playSound('purchase');
    setNotice(isCafeItem(item)
      ? t('actions_shop.bought_cafe', { n: item.cafeReward || 0 })
      : t('actions_shop.bought', { name: localizedField(item, 'name', 'REWARDS') }));
    /* On garde le catalogue visible CETTE session (justPurchased) pour
       que le joueur VOIE son item passer en « Débloqué / Activer »
       (essentiel pour équiper un thème/avatar). La boutique ne
       « disparaît » réellement qu'au prochain accès (remount → secret
       /fermée). Le popup informe que le cycle est consommé. */
    setJustPurchased(true);
    setShowClosed(true);
  };

  /* ── Rendus d'état ───────────────────────────────── */
  if(!enabled){
    return (
      <div style={{ background:'rgba(193,127,60,.08)', border:`2px dashed ${C.border}`, borderRadius:18, padding:'30px 22px', textAlign:'center' }}>
        <div style={{ fontSize:42, marginBottom:8 }}>🔌</div>
        <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:6 }}>{t('actions_shop.offline')}</div>
        <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>{t('actions_shop.offline_desc')}</div>
      </div>
    );
  }

  const pct = Math.min(100, Math.round(((shares || 0) / ACTIONS_ACCESS_THRESHOLD) * 100));

  return (
    <div className="su">
      {/* Bandeau solde actions */}
      <div style={{
        background:'linear-gradient(135deg, rgba(201,154,46,.16), rgba(139,90,43,.20))',
        border:'1.5px solid rgba(201,154,46,.5)', borderRadius:16,
        padding:'14px 16px', marginBottom:14,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1.5 }}>
            🏦 {t('actions_shop.title')}
          </div>
          <div style={{ fontSize:14, fontWeight:900, color:'#C99A2E' }}>
            {loading ? '…' : `${(shares || 0).toLocaleString('fr-FR')} 📈`}
          </div>
        </div>
        {!hasAccess && (
          <>
            <div style={{ height:7, borderRadius:4, background:C.card2, marginTop:10, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#8B5A2B,#C99A2E)', borderRadius:4, transition:'width .4s' }} />
            </div>
            <div style={{ fontSize:11, color:C.text, marginTop:8, lineHeight:1.5 }}>
              {t('actions_shop.gate', { have: (shares || 0), need: ACTIONS_ACCESS_THRESHOLD })}
            </div>
          </>
        )}
        {hasAccess && locked && (
          <div style={{ fontSize:11.5, color:C.text, marginTop:8, lineHeight:1.5 }}>
            🔒 {t('actions_shop.locked')}
          </div>
        )}
        {available && (
          <div style={{ fontSize:11, color:C.muted, marginTop:8, lineHeight:1.5, fontStyle:'italic' }}>
            {t('actions_shop.one_per_cycle')}
          </div>
        )}
      </div>

      {notice && (
        <div style={{
          background:'linear-gradient(135deg,#FBEFD4,#F0C050)', color:'#5D3A1F',
          border:'1.5px solid #D4A017', borderRadius:12, padding:'10px 14px',
          fontSize:12.5, fontWeight:800, textAlign:'center', marginBottom:14,
        }}>
          {notice}
        </div>
      )}

      {/* Grille catalogue — visible UNIQUEMENT si la boutique est
          ouverte (≥500 actions ET pas déjà acheté ce cycle). Sinon
          elle "disparaît" et on affiche un panneau d'état fermé. */}
      {showCatalog ? (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {CATALOG.map((r, i) => {
          const isCafe   = r.applyAs === 'as_cafe';
          const isTheme  = r.applyAs === 'theme';
          const isAvatar = r.applyAs === 'avatar';
          const owned    = !isCafe && unlocked.includes(r.id);
          const isActive = (isTheme && activeTheme === r.id) || (isAvatar && userAvatar === r.id);
          const tooPoor  = (shares || 0) < r.cost;
          const canBuy   = available && !owned && !tooPoor && !buying;
          return (
            <div key={r.id} className={`su stagger-${(i%4)+1}`} style={{
              borderRadius:18, padding:16, background:C.card,
              border:`2px solid ${owned ? '#C99A2E' : C.border}`,
              boxShadow: owned ? '0 0 18px rgba(201,154,46,.22)' : '0 2px 8px rgba(0,0,0,.04)',
              position:'relative', overflow:'hidden',
            }}>
              {owned && <span className="sparkle-anim" style={{ position:'absolute', top:8, right:10, fontSize:14, animationDelay:`${i*0.3}s` }}>✨</span>}
              <div className={owned ? 'float-anim' : ''} style={{ fontSize:30, marginBottom:8, display:'inline-block' }}>{r.emoji}</div>
              <div style={{ fontWeight:700, fontSize:13, color:C.text, marginBottom:3 }}>{localizedField(r, 'name', 'REWARDS')}</div>
              <div style={{ fontSize:11, color:C.muted, marginBottom:12, lineHeight:1.4 }}>{localizedField(r, 'desc', 'REWARDS')}</div>

              {owned ? (
                (isTheme || isAvatar) ? (
                  <button
                    onClick={()=>{
                      if(isActive) return;            // avatar/thème : pas de "déséquiper" ici
                      playSound('toggle');
                      if(isTheme)  setActiveTheme?.(r.id);
                      if(isAvatar) setUserAvatar?.(r.id);
                    }}
                    disabled={isActive}
                    style={{
                      width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:700,
                      background: isActive ? GOLD : 'transparent',
                      color: isActive ? '#fff' : '#C99A2E',
                      border:`1.5px solid ${isActive ? 'transparent' : '#C99A2E'}`,
                      cursor: isActive ? 'default' : 'pointer',
                    }}
                  >
                    {isActive ? t('actions_shop.activated') : t('actions_shop.activate')}
                  </button>
                ) : (
                  <div style={{ fontSize:12, fontWeight:700, color:'#C99A2E', display:'flex', alignItems:'center', gap:4 }}>
                    ✓ {t('actions_shop.owned')}
                  </div>
                )
              ) : (
                <button
                  onClick={()=>buy(r)}
                  disabled={!canBuy}
                  className={canBuy ? 'pulse-ring' : ''}
                  style={{
                    width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:800,
                    background: canBuy ? 'linear-gradient(135deg,#C99A2E,#8B5A2B)' : C.card2,
                    color: canBuy ? '#fff' : C.muted,
                    border:`1.5px solid ${canBuy ? 'transparent' : C.border}`,
                    cursor: canBuy ? 'pointer' : 'not-allowed',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                  }}
                >
                  {buying === r.id ? '…' : (isCafe
                    ? <>+{r.cafeReward} ☕ · {r.cost.toLocaleString('fr-FR')} 📈</>
                    : <>📈 {r.cost.toLocaleString('fr-FR')}</>)}
                </button>
              )}
            </div>
          );
        })}
      </div>
      ) : (
        <div style={{
          background:C.card, border:`2px dashed ${C.border}`, borderRadius:18,
          padding:'34px 22px', textAlign:'center',
        }}>
          <div style={{ fontSize:44, marginBottom:10 }}>🔒</div>
          <div style={{ fontSize:15, fontWeight:900, color:C.text, marginBottom:8 }}>
            {t('actions_shop.closed_title')}
          </div>
          <div style={{ fontSize:12.5, color:C.muted, lineHeight:1.6, maxWidth:300, margin:'0 auto' }}>
            {hasAccess
              ? t('actions_shop.closed_locked')
              : t('actions_shop.closed_gate', { have: (shares || 0), need: ACTIONS_ACCESS_THRESHOLD })}
          </div>
        </div>
      )}

      <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:C.muted, fontStyle:'italic', lineHeight:1.5, paddingBottom:8 }}>
        {t('actions_shop.footnote')}
      </div>

      {/* Popup d'info quand la boutique se referme après un achat. */}
      {showClosed && typeof document !== 'undefined' && createPortal((
        <div
          onClick={()=>setShowClosed(false)}
          role="dialog"
          style={{
            position:'fixed', inset:0, zIndex:9999,
            background:'rgba(15,8,4,.78)', backdropFilter:'blur(6px)',
            display:'flex', alignItems:'center', justifyContent:'center', padding:18,
          }}
        >
          <div onClick={e=>e.stopPropagation()} className="bi" style={{
            width:'100%', maxWidth:360, background:C.bg, borderRadius:24,
            boxShadow:'0 24px 64px rgba(0,0,0,.45)', overflow:'hidden',
          }}>
            <div style={{ background:ESPRESSO, padding:'22px 22px 18px', textAlign:'center', color:'#fff' }}>
              <div style={{ fontSize:42, lineHeight:1, marginBottom:8 }}>🏦</div>
              <div style={{ fontSize:18, fontWeight:900, color:'#F0C050' }}>{t('actions_shop.closed_title')}</div>
            </div>
            <div style={{ padding:'18px 22px 6px' }}>
              <div style={{ fontSize:13, color:C.text, lineHeight:1.6, textAlign:'center' }}>
                {t('actions_shop.closed_popup', { need: ACTIONS_ACCESS_THRESHOLD })}
              </div>
            </div>
            <div style={{ padding:'16px 22px 20px' }}>
              <button onClick={()=>setShowClosed(false)} style={{
                width:'100%', padding:'13px 0', borderRadius:14, border:'none',
                background:GOLD, color:'#fff', fontSize:14, fontWeight:900,
                letterSpacing:.4, cursor:'pointer', boxShadow:'0 4px 14px rgba(212,160,23,.35)',
              }}>
                {t('actions_shop.closed_cta')}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}

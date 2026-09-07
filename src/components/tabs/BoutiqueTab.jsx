import { useState, useEffect } from "react";
import { Cookie, Coffee, Check, Lock, ChevronRight, ChevronLeft } from "lucide-react";
import { REWARDS } from "../../data/constants.js";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { playSound } from "../../lib/audio.js";
import { BuyCafesModal } from "../modals/BuyCafesModal.jsx";
import { ActionsShopView, ACTIONS_ACCESS_THRESHOLD } from "./ActionsShopView.jsx";
import { getUserPortfolio } from "../../lib/market.js";
import { isSupabaseEnabled } from "../../lib/supabase.js";
import { useTranslation } from "../../i18n/index.js";

/* Achat de cafés via Stripe — masqué tant qu'on est en mode test (pas de
   live keys, pas de mentions légales). Flip à `true` pour réafficher la
   carte d'entrée dans la vue Premium et le BuyCafesModal associé. */
const STRIPE_ENABLED = false;

/* ════════════════════════════════════════════════════
   BoutiqueTab — onglet boutique (mode 'shop' | 'premium')
   - SHOP : items en cookies, filtrés par type (Tous / Badge / Titre / Thème /
            Avatar / Skin / Roue), ne révèle un nouveau niveau que si tout l'actuel
            est acheté (paiement cookies uniquement, pas premium)
   - PREMIUM : items currency:'cafe' uniquement
   - Snapshot initialUnlocked : items achetés AVANT ce mount sont masqués
                                (l'utilisateur les retrouve dans Profil/Paramètres).
                                Les achats faits PENDANT cette session restent visibles.
   - v1.30 : la boutique VEND, elle n'équipe plus. Un item acheté affiche
             « Débloqué » + un renvoi vers Ma Collection (CollectionOverlay),
             seul écran d'équipement de l'app.
═══════════════════════════════════════════════════════ */

export function BoutiqueTab({ coins, cafes, unlocked, level, onUnlock, mode, setMode, activeTheme, userAvatar, setActiveTheme, setUserAvatar, spinsLeft = 0, slotPlaysLeft = 0, userCode = '', vipPurchasesToday = {}, onGrantUnlock, onGrantCafes, onOpenCollection, C }) {
  const { t, localizedField } = useTranslation();
  const [filter, setFilter] = useState('Tous');
  /* Filtre dédié au mode premium 'main' — sépare visuellement Avatars/Skins/
     Thèmes/Musiques/Packs/Spécial (Coup de Grâce + bannière). Mappé par
     applyAs (plus fiable que `type` qui est inconsistant en premium). */
  const [premiumFilter, setPremiumFilter] = useState('Tous');
  /* Sous-vue du premium : 'main' (catégories + items normaux),
     'jetons' (spin_pass + slot_pass uniquement), ou 'chests' (coffres
     mystères one-shot — Boîte Mystère + chests Bronze/Or/Légendaire).
     Chaque sous-vue a son entrée dédiée dans la vue main. */
  const [premiumView, setPremiumView] = useState('main');
  const [showBuyCafes, setShowBuyCafes] = useState(false);

  /* Onglet « Actions » SECRET : invisible tant que le solde d'actions
     $CKM < 500. On lit le portefeuille (Supabase) au mount + toutes
     les 20 s. null = pas encore chargé → onglet caché par défaut. */
  const [actionsShares, setActionsShares] = useState(null);
  const actionsUnlocked = (actionsShares ?? 0) >= ACTIONS_ACCESS_THRESHOLD;
  useEffect(() => {
    if(!isSupabaseEnabled() || !userCode) return;
    let alive = true;
    const load = async () => {
      const p = await getUserPortfolio(userCode);
      if(alive) setActionsShares(Number(p?.shares) || 0);
    };
    load();
    const id = setInterval(load, 20000);
    return () => { alive = false; clearInterval(id); };
  }, [userCode]);
  /* Pas de bascule auto hors de l'onglet Actions : le joueur reste
     dans la boutique TOUTE la session courante (pour voir/activer son
     achat). Elle redevient « secrète » au prochain accès — l'App
     remet boutiqueMode='shop' en quittant l'onglet Boutique, et le
     toggle est masqué tant que solde < 500. */
  /* Snapshot des items déjà achetés au mount : on les cache de la boutique
     (l'utilisateur les retrouve dans Profil ou Paramètres). Achats faits
     pendant cette session restent visibles jusqu'au prochain mount. */
  const [initialUnlocked] = useState(unlocked);
  const FILTERS = ['Tous','Badge','Thème','Avatar','Skin','Titre','Musique','Pack','Jeux'];
  /* Icône emoji par filtre — affichée avant le libellé pour rendre les
     pills plus reconnaissables au scan rapide (mobile-first). */
  const FILTER_ICONS = {
    'Tous':'🏆', 'Badge':'🎖️', 'Thème':'🎨', 'Avatar':'👤',
    'Skin':'🍪', 'Titre':'👑', 'Musique':'🎵', 'Pack':'📦', 'Jeux':'🎮',
  };
  /* Labels d'affichage des filtres — traduit via i18n. Les IDs restent
     en FR car utilisés en état interne (r.type === 'Badge'). */
  const FILTER_LABEL = {
    'Tous':    t('shop.filter_all'),
    'Badge':   t('shop.filter_badge'),
    'Thème':   t('shop.filter_theme'),
    'Avatar':  t('shop.filter_avatar'),
    'Skin':    t('shop.filter_skin'),
    'Titre':   t('shop.filter_title'),
    'Musique': t('shop.filter_music'),
    'Pack':    t('shop.filter_pack'),
  };
  /* Filtres premium — basés sur applyAs pour la robustesse. Ordre :
     Tous → cosmétiques (Avatar, Skin, Thème, Musique) → Packs → Spécial. */
  /* Filtres premium — basés sur applyAs pour la robustesse. Catégorie
     'Spécial' supprimée (unlock_all_shop retiré pour la dé-pay-to-win
     Play Store, banner remappée dans Thème par convention UX). */
  /* Filtres de la vue main premium — 'Coffre' retiré car les coffres
     ont maintenant leur sous-vue dédiée 'chests'. */
  const PREMIUM_FILTERS = ['Tous','Avatar','Skin','Thème','Musique','Pack','Jeux'];
  const matchPremiumFilter = (r, f) => {
    if(f === 'Tous')     return true;
    if(f === 'Avatar')   return r.applyAs === 'avatar';
    if(f === 'Skin')     return r.applyAs === 'skin';
    if(f === 'Thème')    return r.applyAs === 'theme' || r.applyAs === 'banner';
    if(f === 'Musique')  return r.applyAs === 'music';
    if(f === 'Pack')     return r.applyAs === 'pack_shares';
    if(f === 'Jeux')     return r.applyAs === 'game_theme';
    return true;
  };

  /* Items "coffres mystères" — Boîte Mystère + chests Bronze/Or/Légendaire.
     Tous one-shot, tous routés vers la sous-vue 'chests'. */
  const isChestLike = (r) => r.applyAs === 'open_box' || r.applyAs === 'open_chest';

  /* Révèle un niveau de plus uniquement quand tout celui en cours est acheté.
     Ignore les items premium (☕), les items 'limited' (thèmes événements
     qui peuvent ne jamais être gagnés — sinon on bloque la progression) et
     les items consommables (Pack actions $CKM, jamais ajoutés à unlocked). */
  const isCountable = (r) =>
    r.currency !== 'cafe' && !r.inPremium && !r.inActionsShop && !r.limited && r.applyAs !== 'pack_shares' && r.applyAs !== 'game_theme';
  let revealedLevel = 1;
  for(let n=1; n<=level; n++){
    const itemsAtN = REWARDS.filter(r => r.levelRequired === n && isCountable(r));
    revealedLevel = n;
    if(!itemsAtN.every(it => unlocked.includes(it.id))) break;
  }

  /* Stats du niveau boutique en cours pour la barre de progression */
  const itemsAtRevealed = REWARDS.filter(r =>
    r.levelRequired === revealedLevel && isCountable(r)
  );
  const earnedAtRevealed = itemsAtRevealed.filter(it => unlocked.includes(it.id)).length;
  const totalAtRevealed  = itemsAtRevealed.length;
  const remainingAtRevealed = totalAtRevealed - earnedAtRevealed;
  const shopProgressPct = totalAtRevealed > 0
    ? Math.round((earnedAtRevealed / totalAtRevealed) * 100)
    : 100;

  /* Helper : un item est-il un consommable "Bonus VIP" (jetons jeux +
     boosters café) ? Tous regroupés dans la sous-vue 'jetons' du Premium. */
  const CONSUMABLE_APPLY_AS = ['spin_pass', 'slot_pass', 'quiz_skip', 'next_game_doubler', 'boost_x2_1h', 'boost_x2_24h', 'free_recharges_24h', 'streak_save'];
  const isJeton = (r) => CONSUMABLE_APPLY_AS.includes(r.applyAs);

  let visible;
  if(mode === 'premium'){
    visible = REWARDS.filter(r => {
      /* Items premium = soit currency cafe, soit flag explicite inPremium
         (ex: Coffre payée en cookies mais affichée en premium). */
      if(r.currency !== 'cafe' && !r.inPremium) return false;
      /* Filtres par niveau (utilisés par les Jetons VIP) :
         - levelRequired : niveau minimum pour voir l'item (caché sinon,
           pas de cadenas affiché — l'user préfère cette approche pour
           garder la vue premium épurée vs la shop 🍪 qui montre les locks).
         - levelMax      : niveau maximum (au-dessus, l'item est caché) */
      if(r.levelRequired && level < r.levelRequired) return false;
      if(r.levelMax && level > r.levelMax) return false;
      /* Sous-vue jetons : uniquement les jetons consommables. */
      if(premiumView === 'jetons') return isJeton(r);
      /* Sous-vue chests : uniquement les coffres (Boîte Mystère + chests). */
      if(premiumView === 'chests') return isChestLike(r) && !initialUnlocked.includes(r.id);
      /* Sous-vue main : on cache les jetons ET les coffres (sous-vues dédiées). */
      if(isJeton(r)) return false;
      if(isChestLike(r)) return false;
      return !initialUnlocked.includes(r.id);
    });
  } else {
    /* Les items `limited` (édition limitée gagnés via événements) ne
       sont JAMAIS dans la boutique — l'utilisateur les retrouve dans
       Profil/Paramètres pour les équiper. Sortie boutique propre.
       Packs $CKM : si `consumable` → rachetables à volonté (jamais dans
       `unlocked`, toujours visibles). Sinon ONE-SHOT (anti-exploit, cf.
       App.unlockReward) → ils sont ajoutés à `unlocked` après achat et
       doivent disparaître comme un item normal (via initialUnlocked :
       restent visibles la session de l'achat avec le badge « Débloqué »,
       puis disparaissent au prochain montage de l'onglet). Avant ce fix
       ils restaient affichés en carte morte « Débloqué » à vie. */
    visible = REWARDS.filter(r => {
      if(r.currency === 'cafe') return false;
      /* Coffre payée en cookies mais affichée en premium → exclue de la
         boutique normale (visible uniquement dans le tab Premium). */
      if(r.inPremium) return false;
      /* Cosmétiques payés en actions $CKM → sous-vue dédiée only. */
      if(r.inActionsShop) return false;
      if(r.limited) return false;
      if(r.applyAs === 'pack_shares'){
        if(!r.consumable && initialUnlocked.includes(r.id)) return false;
        return r.levelRequired <= revealedLevel;
      }
      return !initialUnlocked.includes(r.id) && r.levelRequired <= revealedLevel;
    });
  }
  /* Filtre final : shop utilise FILTERS (par r.type), premium 'main' utilise
     PREMIUM_FILTERS (par applyAs). Vue 'jetons' n'a pas de filtre interne. */
  let filtered;
  if(mode === 'premium' && premiumView === 'main'){
    filtered = visible.filter(r => matchPremiumFilter(r, premiumFilter));
  } else if(mode === 'premium'){
    filtered = visible;
  } else {
    filtered = filter === 'Tous' ? visible : visible.filter(r => r.type === filter);
  }
  /* Tri : déjà unlocked en haut, puis ordre logique par famille (premium
     uniquement → Avatar/Skin/Thème/Musique/Pack/Spécial), puis level requis
     croissant, puis coût croissant. */
  const PREMIUM_FAMILY_ORDER = ['avatar', 'skin', 'theme', 'music', 'banner', 'pack_shares', 'open_box', 'open_chest'];
  const familyRank = (r) => {
    const i = PREMIUM_FAMILY_ORDER.indexOf(r.applyAs);
    return i === -1 ? 99 : i;
  };
  const shown = [...filtered].sort((a,b)=>{
    const ua = unlocked.includes(a.id), ub = unlocked.includes(b.id);
    if(ua !== ub) return ua ? -1 : 1;
    if(mode === 'premium'){
      const fa = familyRank(a), fb = familyRank(b);
      if(fa !== fb) return fa - fb;
    }
    if(a.levelRequired !== b.levelRequired) return a.levelRequired - b.levelRequired;
    return a.cost - b.cost;
  });

  return (
    <div className="su" style={{ position:'relative' }}>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, paddingTop:4 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2 }}>{t('shop.title')}</div>
        <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, fontWeight:700, color:C.text }}>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}><Coffee size={13} color="#F0C050" /> {cafes}</span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}><Cookie size={14} color="#D4A017" /> {coins}</span>
        </div>
      </div>

      {/* Toggle Boutique / Premium */}
      <div style={{ display:'flex', gap:6, padding:4, borderRadius:14, background:C.card2, marginBottom:14 }}>
        <button
          onClick={()=>{ if(mode!=='shop'){ playSound('tab'); setMode('shop'); setPremiumView('main'); } }}
          style={{
            flex:1, padding:'10px 0', borderRadius:10, fontSize:13, fontWeight:800, letterSpacing:.4,
            background: mode==='shop' ? GOLD : 'transparent',
            color: mode==='shop' ? '#fff' : C.text,
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            boxShadow: mode==='shop' ? '0 4px 12px rgba(212,160,23,.4)' : 'none', cursor:'pointer'
          }}
        >
          <Cookie size={14} color={mode==='shop' ? '#fff' : C.muted} />
          {t('shop.tab_shop')}
        </button>
        <button
          onClick={()=>{ if(mode!=='premium'){ playSound('tab'); setMode('premium'); setPremiumView('main'); } }}
          style={{
            flex:1, padding:'10px 0', borderRadius:10, fontSize:13, fontWeight:800, letterSpacing:.4,
            background: mode==='premium' ? ESPRESSO : 'transparent',
            color: mode==='premium' ? '#F0C050' : C.text,
            border: mode==='premium' ? '1.5px solid rgba(212,160,23,.55)' : '1.5px solid transparent',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            boxShadow: mode==='premium' ? '0 4px 14px rgba(74,44,23,.5)' : 'none', cursor:'pointer'
          }}
        >
          <Coffee size={14} color={mode==='premium' ? '#F0C050' : C.muted} />
          {t('shop.tab_premium')}
        </button>
        {/* Onglet SECRET — n'apparaît qu'avec ≥ 500 actions $CKM.
            Reste visible si on est déjà dedans (session en cours, ex.
            après un achat qui a fait passer le solde sous 500). */}
        {(actionsUnlocked || mode === 'actions') && (
        <button
          onClick={()=>{ if(mode!=='actions'){ playSound('tab'); setMode('actions'); setPremiumView('main'); } }}
          style={{
            flex:1, padding:'10px 0', borderRadius:10, fontSize:13, fontWeight:800, letterSpacing:.4,
            background: mode==='actions' ? 'linear-gradient(135deg,#C99A2E,#8B5A2B)' : 'transparent',
            color: mode==='actions' ? '#fff' : C.text,
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            boxShadow: mode==='actions' ? '0 4px 12px rgba(201,154,46,.4)' : 'none', cursor:'pointer'
          }}
        >
          <span style={{ fontSize:14 }}>🏦</span>
          {t('shop.tab_actions')}
        </button>
        )}
      </div>

      {mode === 'actions' && (
        <ActionsShopView
          userCode={userCode}
          unlocked={unlocked}
          onGrantUnlock={onGrantUnlock}
          onGrantCafes={onGrantCafes}
          activeTheme={activeTheme}
          setActiveTheme={setActiveTheme}
          userAvatar={userAvatar}
          setUserAvatar={setUserAvatar}
          C={C}
        />
      )}
      {mode !== 'actions' && (<>
      <div style={{ display:'none' }} aria-hidden />

      {/* Bouton retour — affiché dans les sous-vues 'jetons' et 'chests'. */}
      {mode === 'premium' && (premiumView === 'jetons' || premiumView === 'chests') && (
        <button
          onClick={()=>{ playSound('tab'); setPremiumView('main'); }}
          style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'10px 14px', borderRadius:12, marginBottom:14,
            background:'transparent', color:C.text,
            border:`1.5px solid ${C.border}`,
            fontSize:13, fontWeight:700, cursor:'pointer',
          }}
        >
          <ChevronLeft size={16} /> {t('shop.back_premium')}
        </button>
      )}

      {/* En-tête de la sous-vue 'chests' — pitch + rappel one-shot. */}
      {mode === 'premium' && premiumView === 'chests' && (
        <div style={{
          padding:'14px 16px', borderRadius:14, marginBottom:14,
          background:'linear-gradient(135deg, rgba(212,160,23,.12), rgba(193,127,60,.18))',
          border:'1.5px solid rgba(212,160,23,.45)',
        }}>
          <div style={{
            fontSize:13, fontWeight:900, color:'#D4A017',
            letterSpacing:.4, marginBottom:4,
          }}>
            {t('shop.chests_view_title')}
          </div>
          <div style={{ fontSize:11.5, color:C.muted, lineHeight:1.5 }}>
            {t('shop.chests_view_intro', { once: t('shop.chests_view_once') })}
          </div>
        </div>
      )}

      {/* Carte achat de cafés réels (Stripe) — affichée en 1er, version
         simple (style ESPRESSO discret, plus la grande carte glow).
         Gated par STRIPE_ENABLED — désactivé tant qu'on est en mode test. */}
      {STRIPE_ENABLED && mode === 'premium' && premiumView === 'main' && userCode && (
        <button
          onClick={()=>{ playSound('modal'); setShowBuyCafes(true); }}
          style={{
            width:'100%', display:'flex', alignItems:'center', gap:14,
            padding:'14px 16px', borderRadius:16, marginBottom:14,
            background:ESPRESSO,
            border:'1.5px solid rgba(212,160,23,.55)',
            boxShadow:'0 4px 16px rgba(74,44,23,.4)',
            cursor:'pointer', color:'#fff', textAlign:'left',
          }}
        >
          <div style={{ fontSize:32 }}>☕</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:900, color:'#F0C050', marginBottom:2, letterSpacing:.3 }}>Acheter des cafés</div>
            <div style={{ fontSize:11.5, color:'rgba(255,255,255,.75)', lineHeight:1.4 }}>
              15 / 50 / 200 ☕ — paiement sécurisé Stripe
            </div>
          </div>
          <ChevronRight size={18} color="#F0C050" />
        </button>
      )}

      {/* Cartes d'entrée vers les sous-vues — Boosts VIP + Coffres Mystères. */}
      {mode === 'premium' && premiumView === 'main' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
          <button
            onClick={()=>{ playSound('tab'); setPremiumView('jetons'); }}
            style={{
              width:'100%', display:'flex', alignItems:'center', gap:12,
              padding:'12px 14px', borderRadius:14,
              background:'linear-gradient(135deg, rgba(212,160,23,.14), rgba(193,127,60,.20))',
              border:'1.5px solid rgba(212,160,23,.55)',
              boxShadow:'0 3px 10px rgba(212,160,23,.18)',
              cursor:'pointer', color:C.text, textAlign:'left',
            }}
          >
            <div style={{ fontSize:26 }}>🎫</div>
            <div style={{ flex:1 }}>
              <div style={{
                fontSize:14, fontWeight:900, color:'#D4A017',
                letterSpacing:.5,
              }}>
                Boosts VIP
              </div>
            </div>
            <ChevronRight size={18} color="#D4A017" />
          </button>

          {/* Coffres Mystères — sous-vue dédiée. Glow plus marqué pour
              attirer l'œil sur la nouveauté. */}
          <button
            onClick={()=>{ playSound('tab'); setPremiumView('chests'); }}
            style={{
              width:'100%', display:'flex', alignItems:'center', gap:12,
              padding:'12px 14px', borderRadius:14,
              background:'linear-gradient(135deg, rgba(255,224,102,.18), rgba(212,160,23,.28))',
              border:'1.5px solid rgba(255,224,102,.65)',
              boxShadow:'0 4px 14px rgba(212,160,23,.28)',
              cursor:'pointer', color:C.text, textAlign:'left',
            }}
          >
            <div style={{ fontSize:26 }}>🎁</div>
            <div style={{ flex:1 }}>
              <div style={{
                fontSize:14, fontWeight:900, color:'#D4A017',
                letterSpacing:.5,
              }}>
                Coffres Mystères
              </div>
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                Découvre des cosmétiques cachés
              </div>
            </div>
            <ChevronRight size={18} color="#D4A017" />
          </button>
        </div>
      )}

      {STRIPE_ENABLED && showBuyCafes && (
        <BuyCafesModal userCode={userCode} onClose={()=>setShowBuyCafes(false)} C={C} />
      )}

      {/* Bandeau Niveau Boutique (mode='shop' uniquement) — montre la progression
          d'achat au palier en cours et incite à compléter pour débloquer le suivant */}
      {mode === 'shop' && (
        <div style={{
          padding:'12px 14px', borderRadius:14, marginBottom:14,
          background:ESPRESSO,
          border:'1.5px solid rgba(212,160,23,.4)',
          boxShadow:'0 4px 14px rgba(74,44,23,.35)',
        }}>
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            gap:8, marginBottom:8,
          }}>
            <div style={{
              fontSize:11, fontWeight:800, color:'rgba(255,255,255,.75)',
              textTransform:'uppercase', letterSpacing:1.5,
            }}>
              🏪 Boutique · Niveau {revealedLevel}
            </div>
            <div style={{
              fontSize:11, fontWeight:800, color:'#F0C050',
              fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
            }}>
              {totalAtRevealed > 0 ? `${earnedAtRevealed}/${totalAtRevealed}` : '—'}
            </div>
          </div>

          {/* Barre de progression */}
          <div style={{
            height:6, background:'rgba(0,0,0,.3)', borderRadius:3, overflow:'hidden',
          }}>
            <div style={{
              width:`${shopProgressPct}%`, height:'100%',
              background:'linear-gradient(90deg, #D4A017, #F0C050)',
              transition:'width .4s ease-out',
              boxShadow: shopProgressPct > 0 ? '0 0 8px rgba(240,192,80,.6)' : 'none',
            }} />
          </div>

          {/* Hint contextuel sous la barre */}
          <div style={{
            fontSize:10.5, color:'rgba(255,255,255,.6)',
            marginTop:7, lineHeight:1.4,
          }}>
            {totalAtRevealed === 0
              ? `Aucun item au niveau ${revealedLevel}.`
              : remainingAtRevealed === 0
                ? (revealedLevel >= level
                    ? `🎉 Tout pris au niv ${revealedLevel} ! Monte de niveau pour débloquer la suite.`
                    : `🎉 Niveau ${revealedLevel} complet — niveau ${revealedLevel + 1} débloqué.`)
                : `Encore ${remainingAtRevealed} item${remainingAtRevealed > 1 ? 's' : ''} à acheter pour passer au niveau ${revealedLevel + 1}.`}
          </div>
        </div>
      )}

      {/* Pills (uniquement en mode shop) — grille flex sur 2 lignes (wrap)
          pour tout voir d'un coup sans scroll. Icône emoji devant chaque
          libellé pour mieux les distinguer au scan rapide. */}
      {mode === 'shop' && (
        <div style={{
          display:'flex', flexWrap:'wrap', gap:8, marginBottom:16,
          paddingTop:2, paddingBottom:2,
        }}>
          {FILTERS.map(f=>(
            <button
              key={f}
              onClick={()=>{ if(filter!==f){ playSound('tab'); setFilter(f); } }}
              style={{
                padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:700,
                whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', gap:6,
                background: filter === f ? GOLD : C.card,
                color: filter === f ? '#fff' : C.muted,
                border:`1px solid ${filter === f ? 'transparent' : C.border}`,
                transition:'all .2s',
                boxShadow: filter === f ? '0 2px 8px rgba(212,160,23,.3)' : 'none',
              }}
            >
              <span style={{ fontSize:14, lineHeight:1 }}>{FILTER_ICONS[f] || '·'}</span>
              <span>{f}</span>
            </button>
          ))}
        </div>
      )}
      {/* Pills mode premium 'main' — filtre par catégorie pour aider l'user
          à trouver vite ce qu'il cherche (Avatar / Skin / Pack / Spécial...). */}
      {mode === 'premium' && premiumView === 'main' && (
        <div style={{
          display:'flex', flexWrap:'wrap', gap:8, marginBottom:16,
          paddingTop:2, paddingBottom:2,
        }}>
          {PREMIUM_FILTERS.map(f => (
            <button
              key={f}
              onClick={()=>{ if(premiumFilter !== f){ playSound('tab'); setPremiumFilter(f); } }}
              style={{
                padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:700,
                whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', gap:6,
                background: premiumFilter === f ? ESPRESSO : C.card,
                color: premiumFilter === f ? '#F0C050' : C.muted,
                border: `1px solid ${premiumFilter === f ? 'rgba(212,160,23,.6)' : C.border}`,
                transition:'all .2s',
                boxShadow: premiumFilter === f ? '0 2px 8px rgba(74,44,23,.3)' : 'none',
              }}
            >
              <span style={{ fontSize:14, lineHeight:1 }}>{FILTER_ICONS[f] || '·'}</span>
              <span>{f}</span>
            </button>
          ))}
        </div>
      )}
      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {shown.map((r,i)=>{
          const isPremium  = r.currency === 'cafe';
          const isUnlocked = unlocked.includes(r.id);
          const lvOK       = level >= r.levelRequired;
          const canAfford  = isPremium ? cafes >= r.cost : coins >= r.cost;
          const lvLocked   = !lvOK && !isUnlocked;
          /* Jetons VIP : achat uniquement si quota quotidien épuisé. */
          const isSpinPass = r.applyAs === 'spin_pass';
          const isSlotPass = r.applyAs === 'slot_pass';
          /* Cap quotidien Bonus VIP — 1 achat / jour / item. Synchro avec
             la liste VIP_DAILY_CAP_IDS côté App.jsx (source unique = back). */
          const vipBoughtToday = !!vipPurchasesToday && vipPurchasesToday[r.id] === new Date().toDateString();
          const passLockedReason =
              vipBoughtToday                     ? 'Revient demain'
            : (isSpinPass && spinsLeft > 0)     ? `Reste ${spinsLeft} tour${spinsLeft>1?'s':''}`
            : (isSlotPass && slotPlaysLeft > 0) ? `Reste ${slotPlaysLeft} partie${slotPlaysLeft>1?'s':''}`
            : null;
          const passLocked = !!passLockedReason;
          /* Un item « équipable » (thème, avatar, skin, titre, musique,
             bannière) renvoie vers Ma Collection une fois acheté. Les
             consommables (jetons, packs, coffres) n'ont rien à équiper. */
          const EQUIPPABLE = ['theme','avatar','skin','music','banner'];
          const isEquippable = EQUIPPABLE.includes(r.applyAs)
            || ['Thème','Avatar','Skin','Titre','Musique'].includes(r.type);

          return (
            <div key={r.id} className={`su stagger-${(i%4)+1}`} style={{
              borderRadius:18, padding:16,
              background: isPremium ? `linear-gradient(160deg, ${C.card}, ${C.card2})` : C.card,
              border:`2px solid ${isUnlocked?'#D4A017': isPremium ? 'rgba(212,160,23,.55)' : C.border}`,
              boxShadow: isUnlocked
                ? '0 0 20px rgba(212,160,23,.25)'
                : isPremium ? '0 0 18px rgba(74,44,23,.18)' : '0 2px 8px rgba(0,0,0,.04)',
              transition:'all .3s', position:'relative', overflow:'hidden',
              opacity:lvLocked ? .55 : 1
            }}>
              {isPremium && !isUnlocked && (
                <span style={{ position:'absolute', top:8, right:10, fontSize:9, fontWeight:800, padding:'3px 7px', borderRadius:8, background:ESPRESSO, color:'#F0C050', letterSpacing:.5 }}>PREMIUM</span>
              )}
              {/* PHASE 6E — badge "Édition limitée" (remplace le ✨ habituel) */}
              {r.limited && isUnlocked && (
                <span style={{ position:'absolute', top:8, right:10, fontSize:9, fontWeight:800, padding:'3px 7px', borderRadius:8, background:'linear-gradient(135deg,#D4A017,#C17F3C)', color:'#fff', letterSpacing:.5, boxShadow:'0 2px 6px rgba(212,160,23,.35)' }}>ÉDITION LIMITÉE</span>
              )}
              {isUnlocked && !r.limited && <span className="sparkle-anim" style={{ position:'absolute', top:8, right:10, fontSize:14, animationDelay:`${i*0.3}s` }}>✨</span>}
              <div className={isUnlocked ? 'float-anim' : ''} style={{ fontSize:30, marginBottom:8, display:'inline-block', filter:lvLocked?'grayscale(.7)':'none' }}>{lvLocked ? '🔒' : r.emoji}</div>
              <div style={{ fontWeight:700, fontSize:13, color:C.text, marginBottom:3 }}>{localizedField(r, 'name', 'REWARDS')}</div>
              <div style={{ fontSize:11, color:C.muted, marginBottom: (r.savingsLabel || r.applyAs === 'unlock_all_shop') ? 6 : 12 }}>{localizedField(r, 'desc', 'REWARDS')}</div>
              {/* Badge "économies" — sur les packs pour justifier le prix.
                  (Calcul dynamique unlock_all_shop retiré, item supprimé.) */}
              {(() => {
                const label = r.savingsLabel;
                if(!label || isUnlocked) return null;
                return (
                  <div style={{
                    display:'inline-block',
                    fontSize:9.5, fontWeight:800, color:'#3D2010',
                    background:'linear-gradient(135deg,#F5DC8A,#D4A017)',
                    padding:'2px 7px', borderRadius:8,
                    marginBottom:10, letterSpacing:.3,
                    boxShadow:'0 2px 6px rgba(212,160,23,.3)',
                  }}>
                    ✨ {label}
                  </div>
                );
              })()}

              {isUnlocked ? (
                isEquippable && onOpenCollection ? (
                  <button
                    onClick={onOpenCollection}
                    style={{
                      width:'100%', padding:'8px 0', borderRadius:12, fontSize:11.5, fontWeight:700,
                      background:'transparent', color:'#D4A017',
                      border:'1.5px solid #D4A017',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                      cursor:'pointer',
                    }}
                  >
                    <Check size={12} color="#D4A017" /> {t('shop.equip_in_collection')}
                  </button>
                ) : (
                  <div style={{ fontSize:12, fontWeight:700, color:'#D4A017', display:'flex', alignItems:'center', gap:4 }}><Check size={12} color="#D4A017" /> {t('common.unlocked')}</div>
                )
              ) : lvLocked ? (
                <div style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:700, background:C.card2, color:'#D4A017', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                  <Lock size={11} color="#D4A017" /> Niveau {r.levelRequired} requis
                </div>
              ) : isPremium ? (
                passLocked ? (
                  <div style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:11.5, fontWeight:700, background:C.card2, color:C.muted, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontStyle:'italic' }}>
                    <Lock size={11}/> {passLockedReason}
                  </div>
                ) : (
                  <button onClick={()=>onUnlock(r.id)} className={canAfford ? 'pulse-ring' : ''} style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:800, background:canAfford?ESPRESSO:C.card2, color:canAfford?'#F0C050':C.muted, border:`1.5px solid ${canAfford?'rgba(212,160,23,.5)':C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:5, cursor:canAfford?'pointer':'not-allowed' }}>
                    {canAfford?<Coffee size={11} color="#F0C050"/>:<Lock size={11}/>} {r.cost} cafés
                  </button>
                )
              ) : (
                <button onClick={()=>onUnlock(r.id)} className={canAfford ? 'pulse-ring' : ''} style={{ width:'100%', padding:'8px 0', borderRadius:12, fontSize:12, fontWeight:700, background:canAfford?GOLD:C.card2, color:canAfford?'#fff':C.muted, border:`1px solid ${canAfford?'transparent':C.border}`, display:'flex', alignItems:'center', justifyContent:'center', gap:4, cursor:canAfford?'pointer':'not-allowed' }}>
                  {canAfford?<Cookie size={11} color="#fff"/>:<Lock size={11}/>} {r.cost} cookies
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state quand tout est déjà acheté */}
      {shown.length === 0 && (
        <div style={{ textAlign:'center', padding:'30px 20px', borderRadius:16, background:C.card, border:`1px dashed ${C.border}`, color:C.muted }}>
          <div style={{ fontSize:36, marginBottom:8 }}>{mode==='premium' ? '☕' : '🛍️'}</div>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>
            {mode==='premium' ? 'Aucun item premium dispo' : 'Rien de nouveau ici'}
          </div>
          <div style={{ fontSize:11, lineHeight:1.5, maxWidth:260, margin:'0 auto' }}>
            {mode==='premium'
              ? 'Tu as déjà tout débloqué côté premium.'
              : 'Tu as déjà tout débloqué pour ton niveau. Monte de niveau pour de nouvelles récompenses !'}
            <br/>
            {t('shop.empty_find_items')}
          </div>
        </div>
      )}

      {mode === 'shop' && (
        <div style={{ textAlign:'center', marginTop:24, fontSize:12, color:C.muted, fontStyle:'italic', paddingBottom:8 }}>
          Monte de niveau pour débloquer plus de récompenses ! ☕
        </div>
      )}
      </>)}
    </div>
  );
}

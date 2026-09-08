import { useState } from "react";
import { ChevronLeft, ChevronDown, Check, Lock, ShoppingBag } from "lucide-react";
import { REWARDS, LEVEL_NAMES } from "../../data/constants.js";
import { THEMES, LT, ESPRESSO, COOKIE_SKINS } from "../../data/themes.js";
import { ONBOARDING_AVATARS, AVATAR_PREMIUM_LIST } from "../../data/avatars.js";
import { TITLE_STYLES, getTitleStyle } from "../../data/titles.js";
import { THEMABLE_GAMES, getThemesForGame, getActiveTheme, isThemeUnlocked } from "../../data/gameThemes.js";
import { PROMO_CODES } from "../../data/promoCodes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { SkinnedCookie } from "../cookies/SkinnedCookie.jsx";
import { getNameStyle } from "../../utils/legend.js";
import { useTranslation } from "../../i18n/index.js";
import {
  MUSICS,
  getAudioSettings,
  setMusicEnabled,
  playMusic,
  playSound,
  getCurrentMusicId,
} from "../../lib/audio.js";

/* ════════════════════════════════════════════════════
   Ma Collection — LE seul endroit où l'on ÉQUIPE ses cosmétiques (v1.30)
   ────────────────────────────────────────────────────
   Règle du glow-up : on ACHÈTE à la Boutique, on ÉQUIPE ici.
   Avant : thèmes + thèmes de jeu + musique dans Paramètres,
   avatars + skins + titres dans Profil, « Activer » dans la Boutique.

   C'est un ONGLET de la barre de nav (entre Jeux et Classement), pas un
   sous-écran : l'équipement est une destination à part entière. Il l'a été
   brièvement dans la Boutique — rejeté, ça mélangeait acheter et équiper.

   DEUX NIVEAUX, jamais tout à la fois (règle posée par Régis : « quand on
   ouvre on a plein de thèmes d'un coup ») :
     1. HUB — 6 cartes, une par catégorie, chacune montrant ce qui est
        ÉQUIPÉ en ce moment + le nombre possédé. Rien d'autre.
     2. CATÉGORIE — on entre, on voit la liste de cette seule famille,
        avec un retour vers le hub.

   Catégories : Thèmes (+ bannière) · Avatars · Skins · Titres · Musiques · Jeux

   Invariants :
   - On n'affiche QUE ce que le joueur possède. Les items verrouillés se
     résument à une ligne de pied « N à débloquer en boutique → »
     (sauf Jeux : l'accordéon montre le prix, c'est une aide au choix).
     Les items `inActionsShop` sont exclus de ce décompte — leur boutique
     n'existe plus, ils ne sont donc plus achetables (mais restent
     équipables pour qui les possédait déjà).
   - Option « Défaut » systématique là où la désactivation a un sens
     (thème, skin, titre, bannière). Avatar : pas de défaut, juste un switch.
   - Choisir une musique rallume la musique si elle était coupée
     (le toggle on/off reste dans Paramètres).
═══════════════════════════════════════════════════════ */

/* Items débloquables par code promo — dérivé de PROMO_CODES (champ
   `unlock`), donc toujours à jour si Régis ajoute un code. Sert à ranger
   ces cosmétiques dans leur propre groupe : on les retrouve par leur
   provenance, pas par leur couleur. */
const PROMO_UNLOCK_IDS = new Set(
  Object.values(PROMO_CODES).map(c => c && c.unlock).filter(Boolean)
);

export function CollectionContent({
  unlocked = [],
  activeTheme,  setActiveTheme,
  activeBanner, setActiveBanner,
  activeSkin,   setActiveSkin,
  activeTitle,  setActiveTitle,
  userAvatar,   setUserAvatar,
  gameThemes,   setGameThemes,
  /* Identité — sert uniquement au bandeau « toi » du hub. */
  userName = '', level = 1, prestigeLevel = 0, earnedAchievements = [],
  onOpenShop,
  C,
}) {
  const { t, localizedField, localizedLevelName } = useTranslation();
  /* null = hub (les 6 cartes). Sinon on est DANS une catégorie. */
  const [cat, setCat] = useState(null);
  /* Accordéon des thèmes de mini-jeu — un seul jeu déplié à la fois. */
  const [expandedGame, setExpandedGame] = useState(null);
  /* État audio local, resynchronisé à chaque choix de piste. */
  const [audio, setAudio] = useState(() => ({
    ...getAudioSettings(),
    currentMusicId: getCurrentMusicId(),
  }));

  /* ── Inventaires ─────────────────────────────────── */
  const owns = (id) => unlocked.includes(id);
  /* Un item est encore ACHETABLE s'il n'est pas en édition limitée et
     s'il n'appartient pas à l'ex-boutique $CKM (supprimée en v1.30) :
     compter ces items dans « N à débloquer » enverrait le joueur vers
     un rayon qui n'existe plus. */
  const buyable = (r) => !owns(r.id) && !r.limited && !r.inActionsShop;

  const ownedThemes  = REWARDS.filter(r => owns(r.id) && (r.type === 'Thème' || r.applyAs === 'theme'));
  const lockedThemes = REWARDS.filter(r => buyable(r) && (r.type === 'Thème' || r.applyAs === 'theme'));
  const ownedBanners = REWARDS.filter(r => owns(r.id) && r.applyAs === 'banner');

  const ownedSkins   = REWARDS.filter(r => owns(r.id) && (r.type === 'Skin' || r.applyAs === 'skin'));
  const lockedSkins  = REWARDS.filter(r => buyable(r) && (r.type === 'Skin' || r.applyAs === 'skin'));

  const ownedTitles  = REWARDS.filter(r => owns(r.id) && r.type === 'Titre');
  const lockedTitles = REWARDS.filter(r => buyable(r) && r.type === 'Titre');

  /* Avatars : les 12 de base sont toujours à toi, les premium se débloquent.
     `hidden` = retirés du shop mais gardés en data (compat vieux profils).
     `limited` = édition limitée : invisible tant qu'on ne l'a pas. */
  const myAvatars = [
    ...ONBOARDING_AVATARS.filter(a => !a.hidden).map(a => ({ value:a.id, name:a.name })),
    ...AVATAR_PREMIUM_LIST.filter(a => owns(a.id)).map(a => ({ value:a.id, name:a.name })),
  ];
  const lockedAvatarsCount = AVATAR_PREMIUM_LIST.filter(a => {
    const r = REWARDS.find(x => x.id === a.id);
    return !owns(a.id) && !a.limited && !(r && r.inActionsShop);
  }).length;

  const ownedMusics  = Object.values(MUSICS).filter(m => m.free || owns('music_' + m.id));
  const lockedMusics = REWARDS.filter(r => buyable(r) && r.applyAs === 'music');

  /* ── Actions ─────────────────────────────────────── */
  const pick = (fn, value) => { playSound('tap'); fn(value); };

  const chooseMusic = (id) => {
    playSound('tap');
    /* La musique était coupée → on la rallume, sinon choisir ne ferait rien. */
    if(!audio.musicEnabled){ setMusicEnabled(true); }
    playMusic(id);
    setAudio(a => ({ ...a, musicEnabled:true, currentMusicId:id }));
  };

  /* ── Briques d'UI communes ───────────────────────── */
  const sectionLabel = (txt) => (
    <div style={{ fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>
      {txt}
    </div>
  );

  /* Ligne équipable générique (thèmes, bannières, musiques). */
  const row = (key, visual, name, sub, isActive, onToggle) => (
    <button
      key={key}
      onClick={onToggle}
      style={{
        display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:12,
        background: isActive ? 'rgba(212,160,23,.12)' : 'transparent',
        border: `1.5px solid ${isActive ? '#D4A017' : C.border}`,
        cursor:'pointer', textAlign:'left', width:'100%',
      }}
    >
      {visual}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{name}</div>
        {sub && <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{sub}</div>}
      </div>
      {isActive && <Check size={16} color="#D4A017" />}
    </button>
  );

  const emojiSwatch = (emoji) => (
    <div style={{
      width:36, height:36, borderRadius:10, flexShrink:0,
      background:'rgba(212,160,23,.12)', border:'1px solid rgba(212,160,23,.3)',
      display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
    }}>{emoji}</div>
  );

  const dashSwatch = (
    <div style={{
      width:36, height:36, borderRadius:10, flexShrink:0,
      background:LT.bg, border:`1px solid ${LT.border}`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:14, color:C.muted,
    }}>—</div>
  );

  /* Carte-conteneur d'une liste (fond carte + bord, comme Paramètres). */
  const listCard = (children) => (
    <div style={{
      borderRadius:16, background:C.card, border:`1px solid ${C.border}`,
      padding:14, display:'flex', flexDirection:'column', gap:10,
    }}>{children}</div>
  );

  /* Pied de catégorie : combien reste-t-il à débloquer, avec raccourci
     boutique. Discret — on ne veut pas re-remplir l'écran d'appels à l'achat. */
  const lockedFooter = (n) => {
    if(!n) return null;
    return (
      <button
        onClick={() => { if(onOpenShop){ playSound('tab'); onOpenShop(); } }}
        disabled={!onOpenShop}
        style={{
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          width:'100%', marginTop:12, padding:'11px 14px', borderRadius:13,
          background:'transparent', border:`1px dashed ${C.border}`,
          color:C.muted, fontSize:12, fontWeight:700,
          cursor: onOpenShop ? 'pointer' : 'default',
        }}
      >
        <ShoppingBag size={14} color="#D4A017" />
        {t('collection.to_unlock_n', { n })}
      </button>
    );
  };

  const emptyHint = (txt) => (
    <div style={{
      textAlign:'center', padding:'26px 20px', borderRadius:16,
      background:C.card, border:`1px dashed ${C.border}`,
      color:C.muted, fontSize:12, lineHeight:1.5,
    }}>{txt}</div>
  );

  /* ── Rendu par catégorie ─────────────────────────── */

  /* Une tuile de thème : un aperçu PEINT avec la vraie palette (fond,
     carte, barre dorée) plutôt qu'un nom dans une liste. On choisit un
     thème avec les yeux — au-delà de ~8 thèmes possédés, une liste de
     rangées devient un mur de noms à faire défiler. */
  const themeTile = (id, label) => {
    const p       = THEMES[id];
    const bg      = p ? p.bg     : LT.bg;
    const card    = p ? p.card   : LT.card;
    const border  = p ? p.border : LT.border;
    const filter  = p && p.hueRotate ? `hue-rotate(${p.hueRotate}deg) saturate(${p.saturate || 1})` : 'none';
    const isActive = activeTheme === id;
    return (
      <button
        key={id || 'default'}
        onClick={() => pick(setActiveTheme, isActive ? '' : id)}
        style={{
          padding:6, borderRadius:15, textAlign:'left', cursor:'pointer',
          background: isActive ? 'rgba(212,160,23,.12)' : C.card,
          border: `2px solid ${isActive ? '#D4A017' : C.border}`,
          boxShadow: isActive ? '0 0 12px rgba(212,160,23,.28)' : 'none',
          transition:'all .2s',
        }}
      >
        <div style={{
          height:54, borderRadius:10, background:bg, filter,
          border:`1px solid ${border}`, overflow:'hidden',
          padding:'9px 10px', display:'flex', flexDirection:'column', gap:5, justifyContent:'center',
        }}>
          <div style={{ height:13, borderRadius:4, background:card, border:`1px solid ${border}` }} />
          <div style={{ height:5, width:'58%', borderRadius:3, background:'linear-gradient(90deg,#D4A017,#F0C050)' }} />
          <div style={{ height:5, width:'34%', borderRadius:3, background:card, border:`1px solid ${border}` }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4, padding:'7px 3px 2px' }}>
          <span style={{
            flex:1, minWidth:0, fontSize:11.5, fontWeight:800, color:C.text,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>{label}</span>
          {isActive && <Check size={13} color="#D4A017" />}
        </div>
      </button>
    );
  };

  /* Groupes de thèmes. Deux axes combinés, en PRIORITÉ décroissante :
     d'abord la provenance (code promo, puis édition limitée), parce que
     c'est ce qui rend un thème mémorable et introuvable autrement ; le
     reste retombe sur clair / sombre, l'axe utile quand on cherche un look.
     Un thème n'apparaît que dans UN groupe.
     Tout est dérivé des données — rien n'est écrit en dur ici :
       · promo   = son id est un `unlock` d'un code de PROMO_CODES
       · limitée = flag `limited` dans REWARDS
       · sombre  = flag `dark` dans THEMES */
  const themeLabel = (r) =>
    (localizedField(r, 'name', 'REWARDS') || '').replace(/^Th[èe]me\s+/i, '').replace(/\sTheme$/i, '');

  const promoThemes   = ownedThemes.filter(r => PROMO_UNLOCK_IDS.has(r.id));
  const limitedThemes = ownedThemes.filter(r => r.limited && !PROMO_UNLOCK_IDS.has(r.id));
  const isPlain       = (r) => !r.limited && !PROMO_UNLOCK_IDS.has(r.id);
  const lightThemes   = ownedThemes.filter(r => isPlain(r) && !THEMES[r.id]?.dark);
  const darkThemes    = ownedThemes.filter(r => isPlain(r) &&  THEMES[r.id]?.dark);

  /* Bloc « en-tête de groupe + grille ». Partagé par Thèmes, Avatars et
     Skins : même grammaire visuelle partout, un seul endroit à corriger.
     `cols` varie (2 pour les thèmes qui ont un aperçu large, 4 pour les
     avatars, 3 pour les skins). Groupe vide → rien du tout. */
  const group = (icon, label, tiles, cols = 2, extra = null) => {
    if(tiles.length === 0 && !extra) return null;
    return (
      <div key={label}>
        <div style={{ fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1.6, marginBottom:9 }}>
          {icon} {label} · {tiles.length + (extra ? 1 : 0)}
        </div>
        <div style={{
          display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`,
          gap: cols >= 4 ? 12 : 10, marginBottom:16,
          justifyItems: cols >= 4 ? 'center' : 'stretch',
        }}>
          {extra}
          {tiles}
        </div>
      </div>
    );
  };

  const themeGroup = (icon, label, items, extra = null) =>
    group(icon, label, items.map(r => themeTile(r.id, themeLabel(r))), 2, extra);

  /* Provenance d'un cosmétique — l'axe de rangement commun aux avatars et
     aux skins (les thèmes y ajoutent clair/sombre). Priorité décroissante :
     un item promo reste dans « Codes promo » même s'il est aussi `limited`. */
  const sourceOf = (r) => {
    if(!r) return 'shop';
    if(PROMO_UNLOCK_IDS.has(r.id)) return 'promo';
    if(r.limited)                  return 'limited';
    if(r.currency === 'cafe')      return 'premium';
    return 'shop';
  };
  const SOURCES = [
    { key:'shop',    icon:'🍪', label:t('collection.src_shop') },
    { key:'premium', icon:'☕', label:t('collection.src_premium') },
    { key:'limited', icon:'✨', label:t('collection.src_limited') },
    { key:'promo',   icon:'🎟️', label:t('collection.src_promo') },
  ];

  const renderThemes = () => (
    <>
      {themeGroup('☀️', t('collection.themes_light'), lightThemes, themeTile('', t('settings.theme_default')))}
      {themeGroup('🌙', t('collection.themes_dark'),  darkThemes)}
      {themeGroup('✨', t('collection.themes_limited'), limitedThemes)}
      {themeGroup('🎟️', t('collection.themes_promo'),   promoThemes)}

      {/* Bannière — décor de la carte niveau. Ne s'affiche que si possédée. */}
      {ownedBanners.length > 0 && setActiveBanner && (
        <div style={{ marginTop:18 }}>
          {sectionLabel(t('collection.section_banner'))}
          {listCard(<>
            {row('banner-none', dashSwatch, t('collection.none'), null,
              activeBanner === '', () => pick(setActiveBanner, ''))}
            {ownedBanners.map(r => row(
              r.id, emojiSwatch(r.emoji),
              localizedField(r, 'name', 'REWARDS'),
              null,
              activeBanner === r.id,
              () => pick(setActiveBanner, activeBanner === r.id ? '' : r.id),
            ))}
          </>)}
        </div>
      )}

      {lockedFooter(lockedThemes.length)}
    </>
  );

  /* ── Avatars ─────────────────────────────────────
     Les 12 de départ ont leur propre groupe : ils ne s'achètent pas, les
     ranger dans « Boutique » serait faux. Les premium possédés sont
     classés par provenance via leur entrée REWARDS. */
  const avatarTile = (value, name) => {
    const sel = userAvatar === value;
    return (
      <button
        key={String(value)}
        onClick={() => pick(setUserAvatar, value)}
        aria-label={name}
        title={name}
        style={{
          padding:0, borderRadius:'50%', lineHeight:0, display:'inline-flex',
          background:'transparent',
          border:`3px solid ${sel ? '#D4A017' : 'transparent'}`,
          boxShadow: sel ? '0 4px 16px rgba(212,160,23,.45)' : '0 2px 6px rgba(0,0,0,.15)',
          transition:'all .2s', cursor:'pointer',
        }}
      >
        <AvatarFigure value={value} size={58} />
      </button>
    );
  };

  const renderAvatars = () => {
    const baseIds  = new Set(ONBOARDING_AVATARS.filter(a => !a.hidden).map(a => a.id));
    const baseList = ONBOARDING_AVATARS.filter(a => !a.hidden);
    const premiumOwned = AVATAR_PREMIUM_LIST.filter(a => owns(a.id) && !baseIds.has(a.id));
    return (
      <>
        {group('👤', t('collection.src_starter'),
          baseList.map(a => avatarTile(a.id, a.name)), 4)}
        {SOURCES.map(src => group(
          src.icon, src.label,
          premiumOwned
            .filter(a => sourceOf(REWARDS.find(x => x.id === a.id)) === src.key)
            .map(a => avatarTile(a.id, a.name)),
          4,
        ))}
        {lockedFooter(lockedAvatarsCount)}
      </>
    );
  };

  /* ── Skins ───────────────────────────────────────── */
  const skinTile = (id, label) => {
    const sel = activeSkin === id;
    return (
      <button
        key={id || 'default'}
        onClick={() => pick(setActiveSkin, id)}
        style={{
          display:'flex', flexDirection:'column', alignItems:'center', gap:6,
          padding:'10px 6px', borderRadius:14, width:'100%',
          background: sel ? 'rgba(212,160,23,.16)' : C.card,
          border:`2px solid ${sel ? '#D4A017' : C.border}`,
          boxShadow: sel ? '0 0 12px rgba(212,160,23,.35)' : 'none',
          transition:'all .2s', cursor:'pointer',
        }}
      >
        <div style={{ width:46, height:46 }}>
          <SkinnedCookie skin={COOKIE_SKINS[id] || COOKIE_SKINS['']} />
        </div>
        <div style={{
          fontSize:9.5, fontWeight:700, color:C.text, lineHeight:1.2, textAlign:'center',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%',
        }}>
          {label}
        </div>
      </button>
    );
  };

  const renderSkins = () => {
    const skinLabel = (r) =>
      (localizedField(r, 'name', 'REWARDS') || '').replace(/^(Skin Cookie|Skin|Cookie)\s+/i, '');
    return (
      <>
        {SOURCES.map((src, i) => group(
          src.icon, src.label,
          ownedSkins.filter(r => sourceOf(r) === src.key).map(r => skinTile(r.id, skinLabel(r))),
          3,
          /* Le cookie par défaut n'a pas de provenance : il ouvre le
             premier groupe (Boutique), comme le thème par défaut. */
          i === 0 ? skinTile('', t('settings.theme_default')) : null,
        ))}
        {lockedFooter(lockedSkins.length)}
      </>
    );
  };

  const renderTitles = () => (
    <>
      {sectionLabel(t('collection.cat_titles'))}
      <div style={{
        borderRadius:16, background:C.card, border:`1px solid ${C.border}`, padding:14,
        display:'flex', flexWrap:'wrap', gap:8,
      }}>
        {[{ id:'', name:t('collection.none') }, ...ownedTitles].map(tt => {
          const sel = activeTitle === tt.id;
          const style = tt.id ? (getTitleStyle(tt.id) || {}) : { color:C.text, fontWeight:800 };
          return (
            <button
              key={tt.id || 'none'}
              onClick={() => pick(setActiveTitle, tt.id)}
              style={{
                padding:'9px 14px', borderRadius:14, fontSize:14,
                background: sel ? 'rgba(212,160,23,.16)' : 'transparent',
                border:`2px solid ${sel ? '#D4A017' : C.border}`,
                boxShadow: sel ? '0 0 12px rgba(212,160,23,.35)' : 'none',
                transition:'all .2s', cursor:'pointer',
              }}
            >
              {/* Span dédié : appliquer le style sur le <button> casse le
                  background-clip:text des titres dégradés (carré opaque).
                  Key liée à `sel` pour remonter le node et relancer le shimmer. */}
              <span
                key={`title-${tt.id || 'none'}-${sel ? 'sel' : 'idle'}`}
                style={{ ...style, display:'inline-block', lineHeight:1.2 }}
              >
                {TITLE_STYLES[tt.id]?.name
                  || (tt.id
                    ? (localizedField(tt, 'name', 'REWARDS') || '').replace(/^Titre\s+/i, '').replace(/\sTitle$/i, '')
                    : tt.name)}
              </span>
            </button>
          );
        })}
      </div>
      {lockedFooter(lockedTitles.length)}
    </>
  );

  const renderMusics = () => (
    <>
      {sectionLabel(t('collection.cat_musics'))}
      {listCard(
        ownedMusics.map(m => row(
          m.id, emojiSwatch(m.emoji), m.name,
          audio.currentMusicId === m.id && audio.musicEnabled ? t('settings.audio_now_playing') : null,
          audio.currentMusicId === m.id && audio.musicEnabled,
          () => chooseMusic(m.id),
        ))
      )}
      {!audio.musicEnabled && (
        <div style={{ fontSize:11, color:C.muted, marginTop:10, lineHeight:1.5, fontStyle:'italic' }}>
          {t('collection.music_off_hint')}
        </div>
      )}
      {lockedFooter(lockedMusics.length)}
    </>
  );

  const renderGames = () => (
    <>
      {sectionLabel(t('collection.cat_games'))}
      <div style={{ borderRadius:16, background:C.card, border:`1px solid ${C.border}`, padding:8 }}>
        {THEMABLE_GAMES.map((gameId, idx) => {
          const themes     = getThemesForGame(gameId);
          const activeTh   = getActiveTheme(gameId, gameThemes);
          const isExpanded = expandedGame === gameId;
          return (
            <div key={gameId}>
              <button
                onClick={() => { playSound('tap'); setExpandedGame(isExpanded ? null : gameId); }}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:12,
                  padding:'10px 8px', background:'transparent', border:'none',
                  cursor:'pointer', textAlign:'left',
                  borderTop: idx > 0 ? `1px solid ${C.border}` : 'none',
                }}
              >
                {emojiSwatch(activeTh?.preview || '🎮')}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text }}>
                    {t('games_list.' + gameId + '_title')}
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>
                    {localizedField(activeTh || {}, 'name') || '—'}
                  </div>
                </div>
                <ChevronDown
                  size={18} color={C.muted}
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}
                />
              </button>

              {isExpanded && (
                <div style={{ display:'flex', flexDirection:'column', gap:6, padding:'0 4px 10px' }}>
                  {themes.map(theme => {
                    const owned    = isThemeUnlocked(theme, unlocked);
                    const isActive = activeTh?.id === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => {
                          if(!owned) return;
                          playSound('tap');
                          setGameThemes({ ...gameThemes, [gameId]: theme.id });
                        }}
                        disabled={!owned}
                        style={{
                          display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:12,
                          background: isActive ? 'rgba(212,160,23,.12)' : 'transparent',
                          border:`1.5px solid ${isActive ? '#D4A017' : C.border}`,
                          cursor: owned ? 'pointer' : 'not-allowed',
                          opacity: owned ? 1 : .55,
                          textAlign:'left', width:'100%',
                        }}
                      >
                        <div style={{
                          width:32, height:32, borderRadius:9, flexShrink:0,
                          background:LT.bg, border:`1px solid ${LT.border}`,
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
                        }}>{theme.preview || '🎨'}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:800, color:C.text }}>
                            {localizedField(theme, 'name')}
                          </div>
                          <div style={{ fontSize:10, color:C.muted, marginTop:1 }}>
                            {localizedField(theme, 'description')}
                          </div>
                        </div>
                        {isActive ? (
                          <Check size={16} color="#D4A017" />
                        ) : !owned ? (
                          <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, fontWeight:800, color:C.muted }}>
                            <Lock size={11} />
                            <span>{theme.cost}{theme.currency === 'cafe' ? '☕' : '🍪'}</span>
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  const CONTENT = {
    themes:  renderThemes,
    avatars: renderAvatars,
    skins:   renderSkins,
    titles:  renderTitles,
    musics:  renderMusics,
    games:   renderGames,
  };

  /* ── HUB : ce qui est équipé, catégorie par catégorie ─────────────
     Le nom court de l'item porté + le nombre possédé. Chaque carte est
     une porte : on n'entre que dans la famille qu'on veut changer. */
  const shortName = (r, strip) =>
    (localizedField(r, 'name', 'REWARDS') || '').replace(strip, '').trim();

  const activeThemeItem = ownedThemes.find(r => r.id === activeTheme);
  const activeSkinItem  = ownedSkins.find(r => r.id === activeSkin);
  const activeAvatar    = myAvatars.find(a => a.value === userAvatar);
  const activeMusic     = ownedMusics.find(m => m.id === audio.currentMusicId);
  const gameThemesSet   = THEMABLE_GAMES.filter(g => {
    const th = getActiveTheme(g, gameThemes);
    return th && th.id !== getThemesForGame(g)[0]?.id;
  }).length;

  /* Scène d'aperçu — le haut de chaque carte du hub. Elle ne montre PAS
     une icône de catégorie mais l'ITEM RÉELLEMENT PORTÉ : le thème est
     peint avec sa vraie palette, l'avatar est dessiné, le cookie est
     skinné, le titre est rendu dans son style. C'est ce qui fait la
     différence entre six cartes blanches identiques et six cartes qui
     racontent ton personnage. */
  const stage = (children, background, extra = {}) => (
    <div style={{
      height:86, borderRadius:14, marginBottom:10,
      display:'flex', alignItems:'center', justifyContent:'center', gap:6,
      background, overflow:'hidden', position:'relative',
      border:`1px solid ${C.border}`,
      ...extra,
    }}>{children}</div>
  );

  /* Aperçu de thème : on repeint une mini-interface (fond + carte + barre
     dorée) avec la palette réelle du thème actif. */
  const themeStage = () => {
    const p = THEMES[activeTheme];
    const bg     = p ? p.bg     : LT.bg;
    const card   = p ? p.card   : LT.card;
    const border = p ? p.border : LT.border;
    const filter = p && p.hueRotate ? `hue-rotate(${p.hueRotate}deg) saturate(${p.saturate || 1})` : 'none';
    return stage(
      <div style={{ width:'100%', height:'100%', padding:'12px 14px', display:'flex', flexDirection:'column', gap:6, justifyContent:'center' }}>
        <div style={{ height:20, borderRadius:6, background:card, border:`1px solid ${border}` }} />
        <div style={{ height:8, width:'62%', borderRadius:4, background:'linear-gradient(90deg,#D4A017,#F0C050)' }} />
        <div style={{ height:8, width:'38%', borderRadius:4, background:card, border:`1px solid ${border}` }} />
      </div>,
      bg,
      { filter },
    );
  };

  const HUB = [
    { id:'themes',
      current: activeThemeItem ? shortName(activeThemeItem, /^Th[èe]me\s+/i) : t('settings.theme_default'),
      count: ownedThemes.length + 1,
      stage: themeStage() },

    { id:'avatars',
      current: activeAvatar?.name || '—',
      count: myAvatars.length,
      stage: stage(
        <AvatarFigure value={userAvatar} size={64} />,
        'radial-gradient(circle at 50% 30%, rgba(212,160,23,.18), rgba(193,127,60,.08))',
      ) },

    { id:'skins',
      current: activeSkinItem ? shortName(activeSkinItem, /^(Skin Cookie|Skin|Cookie)\s+/i) : t('settings.theme_default'),
      count: ownedSkins.length + 1,
      stage: stage(
        <div style={{ width:58, height:58 }}>
          <SkinnedCookie skin={COOKIE_SKINS[activeSkin] || COOKIE_SKINS['']} />
        </div>,
        'radial-gradient(circle at 50% 35%, rgba(255,232,154,.30), rgba(193,127,60,.10))',
      ) },

    { id:'titles',
      current: activeTitle ? (TITLE_STYLES[activeTitle]?.name || '—') : t('collection.none'),
      count: ownedTitles.length + 1,
      /* Fond espresso : les titres dorés / dégradés ne ressortent que sur
         sombre (background-clip:text sur du crème = illisible). */
      stage: stage(
        activeTitle ? (
          <span
            key={`hub-title-${activeTitle}`}
            style={{ ...(getTitleStyle(activeTitle) || {}), fontSize:17, display:'inline-block', lineHeight:1.2 }}
          >
            {TITLE_STYLES[activeTitle]?.name || '—'}
          </span>
        ) : (
          <span style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.45)', fontStyle:'italic' }}>
            {t('collection.none')}
          </span>
        ),
        ESPRESSO,
      ) },

    { id:'musics',
      current: audio.musicEnabled ? (activeMusic?.name || '—') : t('collection.music_off'),
      count: ownedMusics.length,
      stage: stage(
        <>
          <span style={{ fontSize:26, lineHeight:1, marginRight:4, opacity: audio.musicEnabled ? 1 : .4 }}>
            {audio.musicEnabled ? (activeMusic?.emoji || '🎵') : '🔇'}
          </span>
          {/* Égaliseur décoratif — hauteurs figées, pas d'animation
              (contrainte projet : rien qui tourne en fond sans raison). */}
          {[14, 26, 18, 30, 20].map((h, i) => (
            <span key={i} style={{
              width:4, height: audio.musicEnabled ? h : 6, borderRadius:2,
              background:'linear-gradient(180deg,#F0C050,#C17F3C)',
              opacity: audio.musicEnabled ? .9 : .3,
            }} />
          ))}
        </>,
        ESPRESSO,
      ) },

    { id:'games',
      current: gameThemesSet > 0
        ? t('collection.games_customised', { n: gameThemesSet })
        : t('collection.games_default'),
      count: THEMABLE_GAMES.length,
      /* Les 4 jeux personnalisables, chacun avec l'emoji de SON thème actif. */
      stage: stage(
        THEMABLE_GAMES.map(g => (
          <span key={g} style={{ fontSize:24, lineHeight:1 }}>
            {getActiveTheme(g, gameThemes)?.preview || '🎮'}
          </span>
        )),
        'radial-gradient(circle at 50% 35%, rgba(212,160,23,.16), rgba(74,44,23,.10))',
      ) },
  ];

  const renderHub = () => (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
      {HUB.map((h, i) => (
        <button
          key={h.id}
          onClick={() => { playSound('tab'); setCat(h.id); setExpandedGame(null); }}
          className={`su stagger-${(i % 4) + 1}`}
          style={{
            display:'block', width:'100%', textAlign:'left',
            padding:10, borderRadius:20,
            background:C.card, border:`1px solid ${C.border}`,
            boxShadow:'0 4px 14px rgba(0,0,0,.07)', cursor:'pointer',
          }}
        >
          {h.stage}
          <div style={{ padding:'0 4px 4px', minWidth:0 }}>
            <div style={{
              fontSize:10, fontWeight:800, color:C.muted,
              textTransform:'uppercase', letterSpacing:1.4, marginBottom:3,
            }}>
              {t('collection.cat_' + h.id)}
            </div>
            <div style={{
              fontSize:13, color:C.text, fontWeight:800,
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {h.current}
            </div>
            <div style={{ fontSize:10, color:'#D4A017', fontWeight:700, marginTop:3 }}>
              {t('collection.owned_n', { n: h.count, s: h.count > 1 ? 's' : '' })}
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  /* Catégories vides (hors avatars/jeux qui ont toujours du contenu) —
     on affiche l'invitation boutique plutôt qu'une carte vide. */
  const isEmpty =
      (cat === 'skins'  && ownedSkins.length  === 0)
   || (cat === 'titles' && ownedTitles.length === 0)
   || (cat === 'musics' && ownedMusics.length === 0);

  /* ── HUB ─────────────────────────────────────────── */
  if(!cat){
    return (
      <div className="su">
        {/* ── Bandeau « toi » ────────────────────────────────────────
            Le résultat de tout ce qu'on équipe, tel que les autres le
            voient : avatar porté + pseudo dans le style de son titre +
            cookie skinné. Fond espresso obligatoire — les titres dorés
            utilisent background-clip:text et disparaissent sur du crème.
            La bannière Cookies, si elle est équipée, décore le fond. */}
        <div style={{
          position:'relative', overflow:'hidden',
          display:'flex', alignItems:'center', gap:14,
          padding:'16px 18px', borderRadius:22, marginBottom:18, marginTop:4,
          background:ESPRESSO,
          border:'1.5px solid rgba(212,160,23,.4)',
          boxShadow:'0 8px 24px rgba(74,44,23,.35)',
        }}>
          {activeBanner === 'banner_cookies' && (
            <div aria-hidden style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
              {[
                { top:'10%', left:'16%', size:24, delay:0,   rot:-12 },
                { top:'62%', left:'8%',  size:20, delay:1.2, rot:8   },
                { top:'18%', left:'74%', size:22, delay:.6,  rot:16  },
                { top:'66%', left:'86%', size:18, delay:1.9, rot:-8  },
              ].map((c,i)=>(
                <span key={i} className="float-anim" style={{
                  position:'absolute', top:c.top, left:c.left,
                  fontSize:c.size, opacity:.18,
                  transform:`rotate(${c.rot}deg)`, animationDelay:`${c.delay}s`,
                }}>🍪</span>
              ))}
            </div>
          )}

          <div style={{
            flexShrink:0, borderRadius:'50%', lineHeight:0,
            border:'2.5px solid rgba(212,160,23,.65)',
            boxShadow:'0 4px 14px rgba(0,0,0,.3)',
          }}>
            <AvatarFigure value={userAvatar} size={62} />
          </div>

          <div style={{ flex:1, minWidth:0, position:'relative' }}>
            <div style={{
              fontSize:9.5, fontWeight:800, color:'rgba(255,255,255,.5)',
              textTransform:'uppercase', letterSpacing:1.8, marginBottom:3,
            }}>
              {t('collection.you')}
            </div>
            {/* Key liée au titre : sans remount, background-clip:text garde
                l'ancien rendu (carré de couleur) au changement de titre. */}
            <div
              key={`collec-pseudo-${activeTitle || 'none'}`}
              style={{
                fontSize:19, fontWeight:900, color:'#fff', lineHeight:1.15,
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                ...(getNameStyle(userName, earnedAchievements, activeTitle) || {}),
              }}
            >
              {userName || 'Joueur'}
            </div>
            <div style={{
              fontSize:11, color:'#F0C050', fontWeight:700, marginTop:3,
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {t('home.level_card', { n: level, label: localizedLevelName(level) || LEVEL_NAMES[level] })}
              {prestigeLevel > 0 && (
                <span style={{ marginLeft:6 }}>
                  {prestigeLevel <= 5 ? '👑'.repeat(prestigeLevel) : `👑×${prestigeLevel}`}
                </span>
              )}
            </div>
          </div>

          <div style={{ width:46, height:46, flexShrink:0, position:'relative' }}>
            <SkinnedCookie skin={COOKIE_SKINS[activeSkin] || COOKIE_SKINS['']} />
          </div>
        </div>

        <div style={{
          fontSize:10, fontWeight:800, color:C.muted,
          textTransform:'uppercase', letterSpacing:2, marginBottom:10,
        }}>
          {t('collection.title')}
        </div>

        {renderHub()}
      </div>
    );
  }

  /* ── UNE catégorie ───────────────────────────────── */
  return (
    <div key={cat} className="su">
      <button
        onClick={() => { playSound('tab'); setCat(null); setExpandedGame(null); }}
        style={{
          display:'flex', alignItems:'center', gap:8,
          padding:'9px 14px 9px 10px', borderRadius:12, marginBottom:14,
          background:'transparent', color:C.text,
          border:`1px solid ${C.border}`,
          fontSize:12.5, fontWeight:700, cursor:'pointer',
        }}
      >
        <ChevronLeft size={16} /> {t('collection.back_hub')}
      </button>

      {isEmpty ? (
        <>
          {sectionLabel(t('collection.cat_' + cat))}
          {emptyHint(t('collection.empty_hint'))}
          {lockedFooter(
            cat === 'skins'  ? lockedSkins.length
          : cat === 'titles' ? lockedTitles.length
          : lockedMusics.length
          )}
        </>
      ) : CONTENT[cat]()}
    </div>
  );
}

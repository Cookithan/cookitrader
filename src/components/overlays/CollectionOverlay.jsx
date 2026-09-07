import { useState } from "react";
import { ChevronLeft, ChevronDown, Check, Lock, ShoppingBag } from "lucide-react";
import { REWARDS } from "../../data/constants.js";
import { THEMES, LT, GOLD, COOKIE_SKINS } from "../../data/themes.js";
import { ONBOARDING_AVATARS, AVATAR_PREMIUM_LIST } from "../../data/avatars.js";
import { TITLE_STYLES, getTitleStyle } from "../../data/titles.js";
import { THEMABLE_GAMES, getThemesForGame, getActiveTheme, isThemeUnlocked } from "../../data/gameThemes.js";
import { AvatarFigure } from "../AvatarFigure.jsx";
import { SkinnedCookie } from "../cookies/SkinnedCookie.jsx";
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

   DEUX EXPORTS, un seul corps de rendu :
   - `CollectionContent` — les pills + le contenu, sans chrome. C'est ce
     que la BoutiqueTab embarque dans son 3e onglet « Collection » (la
     place libérée par la boutique secrète $CKM, supprimée en v1.30) :
     l'écran est ainsi à UN tap de la barre de nav, plus caché.
   - `CollectionOverlay` — le même contenu en plein écran z-index 62,
     pour les entrées Profil et Paramètres. 62 : se pose AU-DESSUS de
     Profil / Paramètres (60), donc on ferme et on retombe dessous.

   6 catégories (pills wrap, tout visible d'un coup) :
     Thèmes (+ bannière) · Avatars · Skins · Titres · Musiques · Jeux

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

const CATEGORIES = [
  { id:'themes',  icon:'🎨' },
  { id:'avatars', icon:'👤' },
  { id:'skins',   icon:'🍪' },
  { id:'titles',  icon:'👑' },
  { id:'musics',  icon:'🎵' },
  { id:'games',   icon:'🎮' },
];

export function CollectionContent({
  unlocked = [],
  activeTheme,  setActiveTheme,
  activeBanner, setActiveBanner,
  activeSkin,   setActiveSkin,
  activeTitle,  setActiveTitle,
  userAvatar,   setUserAvatar,
  gameThemes,   setGameThemes,
  onOpenShop,
  C,
}) {
  const { t, localizedField } = useTranslation();
  const [cat, setCat] = useState('themes');
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

  const themeSwatch = (id) => {
    const p = THEMES[id];
    return (
      <div style={{
        width:36, height:36, borderRadius:10, flexShrink:0,
        background: p ? p.bg : LT.bg,
        border:`1px solid ${p ? p.border : C.border}`,
        filter: p && p.hueRotate ? `hue-rotate(${p.hueRotate}deg) saturate(${p.saturate || 1})` : 'none',
      }} />
    );
  };

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
  const renderThemes = () => (
    <>
      {sectionLabel(t('collection.cat_themes'))}
      {listCard(<>
        {row('theme-default', dashSwatch, t('settings.theme_default'), t('settings.theme_default_desc'),
          activeTheme === '', () => pick(setActiveTheme, ''))}
        {ownedThemes.map(r => row(
          r.id, themeSwatch(r.id),
          (localizedField(r, 'name', 'REWARDS') || '').replace(/^Th[èe]me\s+/i, '').replace(/\sTheme$/i, ''),
          localizedField(r, 'desc', 'REWARDS'),
          activeTheme === r.id,
          () => pick(setActiveTheme, activeTheme === r.id ? '' : r.id),
        ))}
      </>)}

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
              localizedField(r, 'desc', 'REWARDS'),
              activeBanner === r.id,
              () => pick(setActiveBanner, activeBanner === r.id ? '' : r.id),
            ))}
          </>)}
        </div>
      )}

      {lockedFooter(lockedThemes.length)}
    </>
  );

  const renderAvatars = () => (
    <>
      {sectionLabel(t('collection.cat_avatars'))}
      <div style={{
        borderRadius:16, background:C.card, border:`1px solid ${C.border}`, padding:16,
        display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, justifyItems:'center',
      }}>
        {myAvatars.map(a => {
          const sel = userAvatar === a.value;
          return (
            <button
              key={String(a.value)}
              onClick={() => pick(setUserAvatar, a.value)}
              aria-label={a.name}
              style={{
                padding:0, borderRadius:'50%', lineHeight:0, display:'inline-flex',
                background:'transparent',
                border:`3px solid ${sel ? '#D4A017' : 'transparent'}`,
                boxShadow: sel ? '0 4px 16px rgba(212,160,23,.45)' : '0 2px 6px rgba(0,0,0,.15)',
                transition:'all .2s', cursor:'pointer',
              }}
            >
              <AvatarFigure value={a.value} size={62} />
            </button>
          );
        })}
      </div>
      {lockedFooter(lockedAvatarsCount)}
    </>
  );

  const renderSkins = () => (
    <>
      {sectionLabel(t('collection.cat_skins'))}
      <div style={{
        borderRadius:16, background:C.card, border:`1px solid ${C.border}`, padding:16,
        display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12,
      }}>
        {[{ id:'', name:t('settings.theme_default') }, ...ownedSkins].map(s => {
          const sel = activeSkin === s.id;
          return (
            <button
              key={s.id || 'default'}
              onClick={() => pick(setActiveSkin, s.id)}
              style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                padding:'10px 6px', borderRadius:14,
                background: sel ? 'rgba(212,160,23,.16)' : 'transparent',
                border:`2px solid ${sel ? '#D4A017' : C.border}`,
                boxShadow: sel ? '0 0 12px rgba(212,160,23,.35)' : 'none',
                transition:'all .2s', cursor:'pointer',
              }}
            >
              <div style={{ width:46, height:46 }}>
                <SkinnedCookie skin={COOKIE_SKINS[s.id] || COOKIE_SKINS['']} />
              </div>
              <div style={{
                fontSize:9.5, fontWeight:700, color:C.text, lineHeight:1.2, textAlign:'center',
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%',
              }}>
                {s.id
                  ? (localizedField(s, 'name', 'REWARDS') || '').replace(/^(Cookie|Skin Cookie|Skin)\s+/i, '')
                  : s.name}
              </div>
            </button>
          );
        })}
      </div>
      {lockedFooter(lockedSkins.length)}
    </>
  );

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

  /* Catégories vides (hors avatars/jeux qui ont toujours du contenu) —
     on affiche l'invitation boutique plutôt qu'une carte vide. */
  const isEmpty =
      (cat === 'skins'  && ownedSkins.length  === 0)
   || (cat === 'titles' && ownedTitles.length === 0)
   || (cat === 'musics' && ownedMusics.length === 0);

  return (
    <>
      {/* Pills de catégorie — flex-wrap : tout visible d'un coup, pas de scroll
          horizontal (cf. convention filtres du projet). */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
        {CATEGORIES.map(c => {
          const sel = cat === c.id;
          return (
            <button
              key={c.id}
              onClick={() => { if(!sel){ playSound('tab'); setCat(c.id); setExpandedGame(null); } }}
              style={{
                padding:'7px 13px', borderRadius:20, fontSize:12, fontWeight:700,
                display:'inline-flex', alignItems:'center', gap:6, whiteSpace:'nowrap',
                background: sel ? GOLD : C.card,
                color: sel ? '#fff' : C.muted,
                border:`1px solid ${sel ? 'transparent' : C.border}`,
                boxShadow: sel ? '0 2px 8px rgba(212,160,23,.3)' : 'none',
                transition:'all .2s', cursor:'pointer',
              }}
            >
              <span style={{ fontSize:14, lineHeight:1 }}>{c.icon}</span>
              <span>{t('collection.cat_' + c.id)}</span>
            </button>
          );
        })}
      </div>

      <div key={cat} className="su">
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
    </>
  );
}

/* Version plein écran (z-index 62) pour les entrées Profil / Paramètres.
   Même contenu que l'onglet Collection de la boutique. */
export function CollectionOverlay({ onClose, C, ...rest }){
  const { t } = useTranslation();
  return (
    <div style={{
      position:'fixed', top:0, left:'50%', transform:'translateX(-50%)',
      width:'100%', maxWidth:430, bottom:0,
      background:C.bg, zIndex:62, display:'flex', flexDirection:'column',
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
          <div style={{ fontSize:17, fontWeight:800, color:C.text }}>{t('collection.title')}</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{t('collection.subtitle')}</div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 18px 28px' }}>
        <CollectionContent C={C} {...rest} />
      </div>
    </div>
  );
}

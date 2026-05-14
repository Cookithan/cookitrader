import { useEffect, useRef, useState } from "react";
import { APP_INFO, CHANGELOG } from "../../lib/appInfo.js";
import { getGlobalCommunityStats } from "../../lib/supabaseSync.js";
import { ESPRESSO } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";

/* Code 4 chiffres pour ouvrir le code source. Pas une vraie sécurité
   (le bundle JS est public sur Vercel) — juste un petit gate UX. */
const SOURCE_CODE = '0968';

/* ════════════════════════════════════════════════════
   AboutModal — page "À propos" (BRIEF_A_PROPOS)
   ────────────────────────────────────────────────────
   Slide-up depuis le bas (réutilise les keyframes inbox-* déjà définis
   dans globalStyles.js pour cohérence avec InboxModal).

   Contenu :
     1. Header : 🍪 + nom app + version + description
     2. Stats globales communauté (chargées via getGlobalCommunityStats)
     3. Changelog : 5 dernières releases avec badge NOUVEAU sur la 1re
     4. Liens : code source GitHub
     5. Crédits : auteur + date de release

   Pas de rouge / vert. Bordures espresso ou or selon hiérarchie.
═══════════════════════════════════════════════════════ */

function fmt(n){
  if(n == null) return '—';
  return Number(n).toLocaleString('fr-FR');
}

export function AboutModal({ onClose, C }){
  const { t, localizedField, lang } = useTranslation();
  const [stats,   setStats]   = useState(null);
  const [closing, setClosing] = useState(false);

  /* Gate code source : input 4 chiffres → ouvre le lien si correct */
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeInput,     setCodeInput]     = useState('');
  const [codeFeedback,  setCodeFeedback]  = useState(null); // 'wrong' | 'ok' | null
  const codeInputRef = useRef(null);

  useEffect(() => {
    let alive = true;
    getGlobalCommunityStats().then(s => { if(alive) setStats(s); });
    return () => { alive = false; };
  }, []);

  /* Auto-focus quand on ouvre l'input + auto-validation à 4 chiffres */
  useEffect(() => {
    if(!showCodeInput) return;
    const t = setTimeout(() => codeInputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [showCodeInput]);

  const handleCodeChange = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    setCodeInput(digits);
    setCodeFeedback(null);
    if(digits.length === 4){
      if(digits === SOURCE_CODE){
        setCodeFeedback('ok');
        window.open(APP_INFO.github, '_blank', 'noopener,noreferrer');
        setTimeout(() => {
          setShowCodeInput(false);
          setCodeInput('');
          setCodeFeedback(null);
        }, 900);
      } else {
        setCodeFeedback('wrong');
        setTimeout(() => {
          setCodeInput('');
          setCodeFeedback(null);
          codeInputRef.current?.focus();
        }, 600);
      }
    }
  };

  const handleClose = () => {
    if(closing) return;
    setClosing(true);
    setTimeout(onClose, 280);
  };

  return (
    <div
      onClick={handleClose}
      className={closing ? 'inbox-overlay-out' : 'inbox-overlay-in'}
      style={{
        position:'fixed', inset:0, zIndex:90,
        display:'flex', alignItems:'flex-end', justifyContent:'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={closing ? 'inbox-slide-down' : 'inbox-slide-up'}
        style={{
          width:'100%', maxWidth:430,
          background:C.bg,
          borderTopLeftRadius:24, borderTopRightRadius:24,
          maxHeight:'90vh', display:'flex', flexDirection:'column',
          boxShadow:'0 -8px 32px rgba(15,8,4,.35)',
          position:'relative',
        }}
      >
        {/* Drag handle */}
        <div style={{ width:40, height:4, background:C.border, borderRadius:2, margin:'10px auto 0', flexShrink:0 }} />

        {/* Bouton fermer */}
        <button
          onClick={handleClose}
          aria-label={t('common.close')}
          style={{
            position:'absolute', top:14, right:14,
            width:32, height:32, borderRadius:10,
            background:C.card, border:`1px solid ${C.border}`,
            color:C.muted, fontSize:16, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', zIndex:1,
          }}
        >✕</button>

        {/* Contenu scrollable */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 18px 24px' }}>

          {/* 1. Header app */}
          <div style={{ textAlign:'center', marginBottom:18 }}>
            <div style={{ fontSize:54, lineHeight:1 }}>🍪</div>
            <div style={{ fontSize:22, fontWeight:900, color:C.text, marginTop:8 }}>
              CookiMiner
            </div>
            <div style={{
              fontSize:11, fontWeight:800, color:'#D4A017',
              letterSpacing:2, textTransform:'uppercase', marginTop:4,
            }}>
              v{APP_INFO.version}
            </div>
            <div style={{ fontSize:12, color:C.muted, marginTop:10, lineHeight:1.45, padding:'0 6px' }}>
              {APP_INFO.description}
            </div>
          </div>

          {/* 2. Stats globales communauté */}
          <div style={{
            background:ESPRESSO,
            borderRadius:16, padding:14,
            marginBottom:14,
            border:'1px solid rgba(212,160,23,.3)',
            boxShadow:'0 6px 18px rgba(74,44,23,.25)',
          }}>
            <div style={{
              fontSize:10, color:'rgba(255,255,255,.6)',
              textTransform:'uppercase', letterSpacing:2, fontWeight:700,
              textAlign:'center', marginBottom:12,
            }}>
              {t('about.community_title')}
            </div>

            {stats == null ? (
              <div style={{ textAlign:'center', color:'rgba(255,255,255,.55)', fontSize:12, fontStyle:'italic', padding:'10px 0' }}>
                {t('common.loading')}
              </div>
            ) : (
              <>
                {stats.onlineCount > 0 && (
                  <div style={{
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    padding:'8px 12px', marginBottom:10, borderRadius:11,
                    background:'linear-gradient(135deg, rgba(212,160,23,.16), rgba(193,127,60,.12))',
                    border:'1px solid rgba(212,160,23,.4)',
                  }}>
                    <span style={{
                      width:8, height:8, borderRadius:'50%',
                      background:'#D4A017',
                      boxShadow:'0 0 8px rgba(212,160,23,.8)',
                      animation:'pulse-dot 1.6s ease-in-out infinite',
                    }} />
                    <span style={{ fontSize:12.5, fontWeight:800, color:'#F0C050' }}>
                      {t('about.online_now', { n: fmt(stats.onlineCount) })}
                    </span>
                  </div>
                )}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <StatBlock icon="👥" value={fmt(stats.userCount)}           label={t('about.stat_players')} />
                  <StatBlock icon="🍪" value={fmt(stats.totalCookiesEarned)}  label={t('about.stat_cookies_earned')} />
                  <StatBlock icon="🤝" value={fmt(stats.friendshipsCount)}    label={t('about.stat_friendships')} />
                  <StatBlock icon="📈" value={fmt(stats.transactionsCount)}   label={t('about.stat_trades')} />
                </div>
              </>
            )}
          </div>

          {/* 3. Changelog */}
          <div style={{
            background:C.card, borderRadius:14, padding:'14px 14px 4px',
            marginBottom:14, border:`1.5px solid ${C.border}`,
          }}>
            <div style={{
              fontSize:11, color:C.muted,
              textTransform:'uppercase', letterSpacing:2, fontWeight:700,
              marginBottom:12,
            }}>
              📋 {t('about.changelog')}
            </div>

            {CHANGELOG.map((release, i) => {
              const isLast = i === CHANGELOG.length - 1;
              return (
                <div key={release.version} style={{
                  marginBottom: isLast ? 10 : 14,
                  paddingBottom: isLast ? 0 : 12,
                  borderBottom: isLast ? 'none' : `1px dashed ${C.border}`,
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8, marginBottom:4 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                      <span style={{ fontSize:14, fontWeight:900, color:'#D4A017' }}>
                        v{release.version}
                      </span>
                      {i === 0 && (
                        <span style={{
                          fontSize:9, fontWeight:800, letterSpacing:1,
                          background:'linear-gradient(135deg,#D4A017,#C17F3C)',
                          color:'#fff', padding:'2px 7px', borderRadius:8,
                          textTransform:'uppercase',
                        }}>{t('about.badge_new')}</span>
                      )}
                    </div>
                    <div style={{ fontSize:10, color:C.muted, flexShrink:0 }}>
                      {release.date}
                    </div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:6 }}>
                    {localizedField(release, 'title')}
                  </div>
                  <ul style={{ fontSize:11.5, color:C.muted, paddingLeft:18, lineHeight:1.6, margin:0 }}>
                    {(localizedField(release, 'changes') || release.changes).map((c, j) => (
                      <li key={j}>{c}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* 4. Liens — bouton GitHub gated derrière un code 4 chiffres */}
          <div style={{
            background:C.card, borderRadius:14, padding:14,
            marginBottom:12, border:`1.5px solid ${C.border}`,
          }}>
            <div style={{
              fontSize:11, color:C.muted,
              textTransform:'uppercase', letterSpacing:2, fontWeight:700,
              marginBottom:10,
            }}>
              🔗 {t('about.links')}
            </div>

            {/* Discord — accès libre, bug reports et suggestions */}
            <a
              href="https://discord.gg/EMDQXDBV39"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width:'100%',
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'11px 13px', borderRadius:11,
                background:'linear-gradient(135deg, rgba(212,160,23,.10), rgba(193,127,60,.15))',
                border:'1px solid rgba(212,160,23,.4)',
                fontSize:13, fontWeight:700, color:C.text,
                cursor:'pointer', textAlign:'left',
                textDecoration:'none', boxSizing:'border-box',
                marginBottom:8,
              }}
            >
              <span>💬 {t('settings.community_title')}</span>
              <span style={{ fontSize:12, color:'#D4A017', fontWeight:800 }}>↗</span>
            </a>

            {!showCodeInput ? (
              <button
                onClick={() => setShowCodeInput(true)}
                style={{
                  width:'100%',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'11px 13px', borderRadius:11,
                  background:C.bg, border:`1px solid ${C.border}`,
                  fontSize:13, fontWeight:700, color:C.text,
                  cursor:'pointer', textAlign:'left',
                }}
              >
                <span>💻 {t('about.source_code')}</span>
                <span style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:.5 }}>🔒 {t('about.code')}</span>
              </button>
            ) : (
              <div
                key={codeFeedback === 'wrong' ? 'wrong' : 'idle'}
                style={{
                  padding:'11px 13px', borderRadius:11,
                  background:C.bg,
                  border: codeFeedback === 'wrong'
                    ? '1.5px solid #7D4E1F'
                    : codeFeedback === 'ok'
                      ? '1.5px solid #D4A017'
                      : `1.5px solid ${C.border}`,
                  animation: codeFeedback === 'wrong' ? 'shake .4s ease-in-out' : undefined,
                  transition:'border-color .2s',
                }}
              >
                <div style={{
                  fontSize:11, color:C.muted, fontWeight:700,
                  marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center',
                }}>
                  <span>🔒 Entre le code (4 chiffres)</span>
                  <button
                    onClick={() => { setShowCodeInput(false); setCodeInput(''); setCodeFeedback(null); }}
                    style={{
                      background:'transparent', border:'none',
                      fontSize:11, color:C.muted, cursor:'pointer',
                      padding:0, textDecoration:'underline',
                    }}
                  >Annuler</button>
                </div>
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={codeInput}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  maxLength={4}
                  placeholder="••••"
                  style={{
                    width:'100%',
                    padding:'10px 12px', borderRadius:9,
                    background:C.card, color:C.text,
                    border:`1.5px solid ${C.border}`,
                    fontSize:18, fontWeight:800, letterSpacing:8,
                    textAlign:'center', outline:'none',
                    fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
                    boxSizing:'border-box',
                  }}
                />
                {codeFeedback === 'wrong' && (
                  <div style={{ fontSize:11, color:'#7D4E1F', fontWeight:700, marginTop:6, textAlign:'center' }}>
                    Code incorrect
                  </div>
                )}
                {codeFeedback === 'ok' && (
                  <div style={{ fontSize:11, color:'#C8960C', fontWeight:700, marginTop:6, textAlign:'center' }}>
                    ✓ Ouverture du code source…
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Crédits */}
          <div style={{
            textAlign:'center', fontSize:11, color:C.muted,
            fontStyle:'italic', marginTop:6, lineHeight:1.6,
          }}>
            Réalisé avec 🍪 par{' '}
            <strong style={{ color:'#C17F3C', fontStyle:'normal' }}>{APP_INFO.author}</strong>
            <br/>
            <span style={{ fontSize:10, opacity:.8 }}>Release {APP_INFO.releaseDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ icon, value, label }){
  return (
    <div style={{
      background:'rgba(255,255,255,.07)',
      border:'1px solid rgba(212,160,23,.18)',
      borderRadius:11, padding:'10px 8px',
      textAlign:'center',
    }}>
      <div style={{ fontSize:18, lineHeight:1 }}>{icon}</div>
      <div style={{
        fontSize:16, fontWeight:900, color:'#F0C050',
        marginTop:5, fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
      }}>{value}</div>
      <div style={{
        fontSize:9, color:'rgba(255,255,255,.55)',
        textTransform:'uppercase', letterSpacing:1, marginTop:3, fontWeight:700,
      }}>{label}</div>
    </div>
  );
}

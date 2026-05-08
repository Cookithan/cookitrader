import { useEffect, useState } from "react";
import { APP_INFO, CHANGELOG } from "../../lib/appInfo.js";
import { getGlobalCommunityStats } from "../../lib/supabaseSync.js";
import { ESPRESSO } from "../../data/themes.js";

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
  const [stats,   setStats]   = useState(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let alive = true;
    getGlobalCommunityStats().then(s => { if(alive) setStats(s); });
    return () => { alive = false; };
  }, []);

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
          aria-label="Fermer"
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
              🌍 La communauté CookiMiner
            </div>

            {stats == null ? (
              <div style={{ textAlign:'center', color:'rgba(255,255,255,.55)', fontSize:12, fontStyle:'italic', padding:'10px 0' }}>
                Chargement…
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <StatBlock icon="👥" value={fmt(stats.userCount)}           label="Joueurs" />
                <StatBlock icon="🍪" value={fmt(stats.totalCookiesEarned)}  label="Cookies gagnés" />
                <StatBlock icon="🤝" value={fmt(stats.friendshipsCount)}    label="Amitiés" />
                <StatBlock icon="📈" value={fmt(stats.transactionsCount)}   label="Trades $CKM" />
              </div>
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
              📋 Nouveautés
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
                        }}>Nouveau</span>
                      )}
                    </div>
                    <div style={{ fontSize:10, color:C.muted, flexShrink:0 }}>
                      {release.date}
                    </div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:6 }}>
                    {release.title}
                  </div>
                  <ul style={{ fontSize:11.5, color:C.muted, paddingLeft:18, lineHeight:1.6, margin:0 }}>
                    {release.changes.map((c, j) => (
                      <li key={j}>{c}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* 4. Liens */}
          <div style={{
            background:C.card, borderRadius:14, padding:14,
            marginBottom:12, border:`1.5px solid ${C.border}`,
          }}>
            <div style={{
              fontSize:11, color:C.muted,
              textTransform:'uppercase', letterSpacing:2, fontWeight:700,
              marginBottom:10,
            }}>
              🔗 Liens
            </div>
            <a
              href={APP_INFO.github}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'11px 13px', borderRadius:11,
                background:C.bg, border:`1px solid ${C.border}`,
                fontSize:13, fontWeight:700, color:C.text,
                textDecoration:'none',
              }}
            >
              <span>💻 Code source GitHub</span>
              <span style={{ fontSize:12, color:C.muted }}>↗</span>
            </a>
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

import { useMemo, useState } from "react";
import { ChevronLeft, Send } from "lucide-react";
import { ARBRE } from "../../data/signalements.js";
import { envoyerSignalement } from "../../lib/sentinelle.js";
import { SENTINELLE_THEME, SENTINELLE_BANNIERE, SENTINELLE_MARINE, SENTINELLE_ACIER } from "../../data/themes.js";
import { useTranslation, localizedField } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   SignalementOverlay — la Sentinelle en mode invité
   ────────────────────────────────────────────────────
   Ce que voit un joueur ordinaire quand il ouvre la bannière Sentinelle
   des Réglages. Il ne peut qu'une chose : signaler. Aucune lecture des
   constats, aucune action, aucun accès aux signalements des autres —
   ceux-ci sont nominatifs et restent derrière la phrase de passe.

   POURQUOI UN ENTONNOIR, ET PAS UN CHAMP LIBRE
   ────────────────────────────────────────────
   « Décris ton problème » donne « ça marche pas ». Chaque clic, lui,
   apporte une information exploitable AVANT que le joueur écrive : la
   catégorie, l'écran, le mini-jeu. Le texte libre ne sert plus qu'au
   détail — et c'est là qu'il vaut quelque chose.

   Le pseudo, le code du compte, le niveau et la version partent
   automatiquement. C'est la moitié du travail d'enquête, et c'est
   exactement ce qu'un joueur ne pense jamais à donner.

   L'ARBRE EST DANS data/signalements.js
   ─────────────────────────────────────
   Cet écran ne connaît aucune catégorie : il descend une structure.
   Ajouter une branche ne demande donc pas d'y toucher.

   ⚠️ Nécessite SIGNALEMENTS.sql. Sans lui, l'envoi échoue avec un
   message qui le dit — jamais un échec muet.
═══════════════════════════════════════════════════════ */

const C = SENTINELLE_THEME;

/* Le libellé d'un nœud : soit une clé i18n déjà existante (les
   mini-jeux, dont les noms vivent dans games_list.*), soit un couple
   label / label_en porté par le nœud lui-même. */
function libelle(noeud, t) {
  if (!noeud) return '';
  return noeud.tKey ? t(noeud.tKey) : localizedField(noeud, 'label');
}

export function SignalementOverlay({ onClose, userCode, userName, level }) {
  const { t } = useTranslation();

  /* Le fil des choix. Chaque élément est un nœud de l'arbre ; le
     dernier détermine ce qu'on affiche. */
  const [chemin, setChemin]   = useState([]);
  const [extras, setExtras]   = useState({});   /* les `demande` croisées en route */
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi]     = useState(false);
  const [retour, setRetour]   = useState(null); /* { ok, message } */

  const courant  = chemin[chemin.length - 1] || null;
  const options  = courant ? (courant.enfants || []) : ARBRE;
  const auBout   = chemin.length > 0 && !options.length;

  /* Tous les champs supplémentaires rencontrés sur le chemin, quel que
     soit le niveau où ils étaient posés. */
  const demandes = useMemo(
    () => chemin.map(n => n.demande).filter(Boolean),
    [chemin],
  );

  const exemple = useMemo(() => {
    for (let i = chemin.length - 1; i >= 0; i--) {
      if (chemin[i].exemple) return chemin[i].exemple;
    }
    return t('report.message_hint');
  }, [chemin, t]);

  const choisir = (noeud) => { setChemin(c => [...c, noeud]); setRetour(null); };
  const revenir = (n)     => { setChemin(c => c.slice(0, n)); setRetour(null); };
  const reprendre = () => {
    setChemin([]); setExtras({}); setMessage(''); setRetour(null);
  };

  const envoyer = async () => {
    if (envoi) return;
    if (message.trim().length < 5) {
      setRetour({ ok: false, message: t('report.too_short') });
      return;
    }
    setEnvoi(true);

    /* Le chemin lisible part dans la langue du joueur ; les identifiants
       partent en plus, dans le contexte. Un signalement écrit en anglais
       reste donc rattachable à sa branche sans deviner. */
    const res = await envoyerSignalement({
      userCode,
      userName,
      categorie: chemin[0]?.id || 'autre',
      chemin:    chemin.map(n => libelle(n, t)).join(' › '),
      message:   message.trim(),
      contexte: {
        ids:    chemin.map(n => n.id),
        niveau: level ?? null,
        extras,
        plateforme: (() => {
          try {
            const pwa = window.matchMedia?.('(display-mode: standalone)')?.matches
              || window.navigator?.standalone === true;
            const ua = navigator.userAgent || '';
            const os = /Android/i.test(ua) ? 'Android'
              : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : 'Bureau';
            return `${os} · ${pwa ? 'PWA' : 'navigateur'}`;
          } catch { return 'inconnu'; }
        })(),
      },
    });

    setEnvoi(false);
    setRetour(res);
    if (res?.ok) { setMessage(''); }
  };

  const envoye = retour?.ok;

  return (
    <div style={{
      position:'fixed', top:0, left:'50%', transform:'translateX(-50%)',
      width:'100%', maxWidth:430, bottom:0,
      background:C.bg, zIndex:62, display:'flex', flexDirection:'column',
    }}>
      {/* En-tête */}
      <div style={{
        display:'flex', alignItems:'center', gap:12, padding:'14px 18px',
        borderBottom:`1px solid ${C.border}`, flexShrink:0,
      }}>
        <button
          onPointerDown={onClose}
          aria-label={t('common.close')}
          style={{
            width:38, height:38, borderRadius:12, flexShrink:0,
            background:C.card, border:`1px solid ${C.border}`, color:C.text,
            display:'flex', alignItems:'center', justifyContent:'center',
            touchAction:'manipulation',
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:17, fontWeight:800, color:C.text }}>{t('report.title')}</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{t('report.guest')}</div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 18px 32px' }}>

        {/* La bannière, la même que celle de la console : c'est le même
            outil, vu depuis l'autre côté. */}
        <div style={{
          position:'relative', overflow:'hidden',
          background: SENTINELLE_BANNIERE,
          borderRadius:20, padding:'20px 20px 18px', color:C.text, marginBottom:18,
          border:'1px solid rgba(255,255,255,.7)',
          boxShadow:'0 8px 24px rgba(30,80,125,.22)',
        }}>
          <div className="card-cool" aria-hidden />
          <div className="card-sheen-cool" aria-hidden />
          <div aria-hidden style={{
            position:'absolute', right:-10, bottom:-26, fontSize:118, lineHeight:1,
            opacity:.16, pointerEvents:'none',
          }}>🛡️</div>

          <div style={{ position:'relative', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:34, lineHeight:1, flexShrink:0 }}>{envoye ? '✅' : '🛡️'}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:20, fontWeight:900, lineHeight:1.15, letterSpacing:-.3 }}>
                {envoye ? t('report.sent_title') : t('report.hero_title')}
              </div>
              <div style={{ fontSize:11.5, color:'rgba(14,51,85,.66)', marginTop:4, lineHeight:1.45 }}>
                {envoye ? t('report.sent_sub') : t('report.hero_sub')}
              </div>
            </div>
          </div>
        </div>

        {/* ── APRÈS L'ENVOI ─────────────────────────────── */}
        {envoye ? (
          <>
            <div style={{
              background:C.card, border:`1px solid ${C.border}`, borderRadius:16,
              padding:'15px 16px', marginBottom:14,
            }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:8 }}>
                {t('report.recap')}
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, lineHeight:1.5 }}>
                {chemin.map(n => libelle(n, t)).join(' › ')}
              </div>
            </div>
            <button
              onPointerDown={reprendre}
              style={{
                width:'100%', padding:'14px 0', borderRadius:14,
                background:C.card, border:`1.5px solid ${C.border}`,
                color:SENTINELLE_ACIER, fontSize:13, fontWeight:800,
                touchAction:'manipulation',
              }}
            >
              {t('report.again')}
            </button>
          </>
        ) : (
          <>
            {/* Le fil d'Ariane : chaque étape se reprend d'un doigt. Sans
                ça, se tromper au premier choix obligerait à tout refaire. */}
            {chemin.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
                <button
                  onPointerDown={() => revenir(0)}
                  style={{
                    padding:'7px 12px', borderRadius:20, background:C.card,
                    border:`1px solid ${C.border}`, color:C.muted,
                    fontSize:11.5, fontWeight:800, touchAction:'manipulation',
                  }}
                >↩︎ {t('report.restart')}</button>
                {chemin.map((n, i) => (
                  <button
                    key={i}
                    onPointerDown={() => revenir(i + 1)}
                    style={{
                      padding:'7px 12px', borderRadius:20,
                      background:'rgba(43,124,178,.12)',
                      border:'1.5px solid rgba(43,124,178,.35)',
                      color:SENTINELLE_ACIER, fontSize:11.5, fontWeight:800,
                      maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis',
                      whiteSpace:'nowrap', touchAction:'manipulation',
                    }}
                  >{libelle(n, t)}</button>
                ))}
              </div>
            )}

            {/* ── LA QUESTION EN COURS ──────────────────── */}
            {!auBout && (
              <>
                <div style={{
                  fontSize:11, fontWeight:800, color:C.muted,
                  textTransform:'uppercase', letterSpacing:2, margin:'4px 0 10px',
                }}>
                  {chemin.length === 0 ? t('report.question') : t('report.precise')}
                </div>

                {options.map(noeud => (
                  <button
                    key={noeud.id}
                    onPointerDown={() => choisir(noeud)}
                    style={{
                      width:'100%', textAlign:'left', marginBottom:8,
                      padding:'15px 16px', borderRadius:16,
                      background:C.card, border:`1.5px solid ${C.border}`,
                      display:'flex', alignItems:'center', gap:12,
                      touchAction:'manipulation', cursor:'pointer',
                    }}
                  >
                    {noeud.emoji && <span style={{ fontSize:22, flexShrink:0 }}>{noeud.emoji}</span>}
                    <span style={{ flex:1, minWidth:0, fontSize:13.5, fontWeight:700, color:C.text, lineHeight:1.4 }}>
                      {libelle(noeud, t)}
                    </span>
                    <span style={{ flexShrink:0, fontSize:15, fontWeight:800, color:'rgba(14,51,85,.35)' }}>›</span>
                  </button>
                ))}
              </>
            )}

            {/* ── LE BOUT DU CHEMIN : on écrit, puis on envoie ── */}
            {auBout && (
              <>
                {demandes.map(d => (
                  <div key={d.cle} style={{ marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:800, color:C.text, marginBottom:6 }}>
                      {localizedField(d, 'label')}
                    </div>
                    <input
                      value={extras[d.cle] || ''}
                      onChange={e => setExtras(x => ({ ...x, [d.cle]: e.target.value.slice(0, 60) }))}
                      style={{
                        width:'100%', boxSizing:'border-box',
                        background:C.card, border:`1.5px solid ${C.border}`,
                        borderRadius:13, padding:'13px 14px', fontSize:14, color:C.text,
                      }}
                    />
                  </div>
                ))}

                <div style={{ fontSize:12, fontWeight:800, color:C.text, marginBottom:6 }}>
                  {t('report.message_label')}
                </div>
                <textarea
                  value={message}
                  onChange={e => { setMessage(e.target.value.slice(0, 1200)); setRetour(null); }}
                  placeholder={exemple}
                  rows={5}
                  style={{
                    width:'100%', boxSizing:'border-box', resize:'vertical',
                    background:C.card, border:`1.5px solid ${C.border}`,
                    borderRadius:14, padding:'13px 14px', fontSize:14, color:C.text,
                    lineHeight:1.5, fontFamily:'inherit',
                  }}
                />
                <div style={{ fontSize:10.5, color:C.muted, textAlign:'right', marginTop:4 }}>
                  {message.length}/1200
                </div>

                {/* Ce qui part sans qu'il ait à y penser. Le dire évite
                    qu'il recopie son code à la main — et rassure sur ce
                    qui est transmis. */}
                <div style={{
                  marginTop:12, padding:'11px 13px', borderRadius:13,
                  background:'rgba(43,124,178,.09)', border:'1px solid rgba(43,124,178,.25)',
                  fontSize:11.5, color:C.muted, lineHeight:1.5,
                }}>
                  {t('report.attached')}
                </div>

                {retour && !retour.ok && (
                  <div style={{
                    marginTop:12, padding:'12px 14px', borderRadius:13,
                    background:'rgba(30,80,125,.12)', border:'1.5px solid rgba(14,51,85,.4)',
                    fontSize:12.5, fontWeight:700, color:SENTINELLE_MARINE, lineHeight:1.5,
                  }}>
                    ⛔ {retour.message}
                  </div>
                )}

                <button
                  onPointerDown={envoyer}
                  disabled={envoi}
                  style={{
                    width:'100%', marginTop:14, padding:'15px 0', borderRadius:14,
                    background:SENTINELLE_MARINE, border:'none', color:'#EAF4FB',
                    fontSize:14, fontWeight:900, letterSpacing:.3,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    opacity: envoi ? .5 : 1, touchAction:'manipulation',
                  }}
                >
                  <Send size={16} />
                  {envoi ? t('report.sending') : t('report.send')}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

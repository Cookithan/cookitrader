import { useMemo, useState } from "react";
import { ChevronLeft, Send } from "lucide-react";
import { ARBRE } from "../../data/signalements.js";
import { envoyerSignalement } from "../../lib/sentinelle.js";
import { THEME_SENTINELLE, BANNIERE, MARINE, ACIER, BLEU, FOND, DEGRADE, CHAMP } from "../../data/sentinelleTheme.js";
import { useTranslation, localizedField } from "../../i18n/index.js";
import { SentinelleBienvenue } from "../SentinelleBienvenue.jsx";

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

   ─── POURQUOI onClick ET PAS onPointerDown ──────────
   La convention du projet est `onPointerDown` sur les zones tactiles :
   il déclenche au contact du doigt, sans attendre. C'est le bon choix
   pour un bouton de mini-jeu, où cinquante millisecondes comptent.

   Ici, c'est un piège. Cet écran DÉFILE. Réagir au contact, c'est
   réagir avant que le navigateur ait pu distinguer un appui d'un
   glissement : Cookithan a signalé qu'en cherchant à faire défiler la liste
   des résultats, il ouvrait un résultat au lieu de descendre.

   `onClick` fait exactement ce qu'on veut — appui court, sans
   déplacement — et le fait mieux qu'une réimplémentation maison. Avec
   `touchAction: manipulation`, déjà posé partout ici, il n'y a aucun
   délai de 300 ms à craindre. C'est d'ailleurs ce que font tous les
   autres écrans à liste de l'app (Réglages, Collection, Boutique).

   L'ARBRE EST DANS data/signalements.js
   ─────────────────────────────────────
   Cet écran ne connaît aucune catégorie : il descend une structure.
   Ajouter une branche ne demande donc pas d'y toucher.

   ⚠️ Nécessite SIGNALEMENTS.sql. Sans lui, l'envoi échoue avec un
   message qui le dit — jamais un échec muet.
═══════════════════════════════════════════════════════ */

const C = THEME_SENTINELLE;
/* Assez d'ombre pour décoller du fond, pas assez pour peser sur une
   liste de dix-huit boutons. */
const OMBRE_DOUCE = '0 2px 8px rgba(14,51,85,.07)';

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
  /* Elle se réveille avant de montrer quoi que ce soit. Une seconde,
     escamotable d'un doigt — cf. SentinelleBienvenue. */
  const [accueil, setAccueil] = useState(true);

  const courant  = chemin[chemin.length - 1] || null;
  const options  = courant ? (courant.enfants || []) : ARBRE;
  const auBout   = chemin.length > 0 && !options.length;

  /* Tous les champs supplémentaires rencontrés sur le chemin, quel que
     soit le niveau où ils étaient posés. */
  const demandes = useMemo(
    () => chemin.map(n => n.demande).filter(Boolean),
    [chemin],
  );

  /* Le placeholder du champ de message, hérité du choix le plus précis.
     Il passe par localizedField comme les libellés : c'est lui qui
     montre ce qu'on attend, et le laisser en français dans une app en
     anglais le rendrait muet pour ceux qui en ont le plus besoin. */
  const exemple = useMemo(() => {
    for (let i = chemin.length - 1; i >= 0; i--) {
      const ex = localizedField(chemin[i], 'exemple');
      if (ex) return ex;
    }
    return t('report.message_hint');
  }, [chemin, t]);

  /* Le texte d'un refus. La base renvoie un CODE stable, jamais
     affiché ; l'app choisit la phrase, dans la langue du joueur. Le
     message français reste en secours : si un code n'était pas prévu
     ici, mieux vaut une phrase française qu'un écran muet. t() renvoie
     `[cle]` quand la clé manque — c'est ce qu'on teste. */
  const texteRefus = (res) => {
    if (res?.code) {
      const traduit = t(`report.err_${res.code}`);
      if (!traduit.startsWith('[')) return traduit;
    }
    return res?.message || t('report.err_reseau');
  };

  const choisir = (noeud) => { setChemin(c => [...c, noeud]); setRetour(null); };
  const revenir = (n)     => { setChemin(c => c.slice(0, n)); setRetour(null); };
  const reprendre = () => {
    setChemin([]); setExtras({}); setMessage(''); setRetour(null);
  };

  const envoyer = async () => {
    if (envoi) return;
    if (message.trim().length < 5) {
      setRetour({ ok: false, code: 'trop_court' });
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
      background:FOND, zIndex:62, display:'flex', flexDirection:'column',
    }}>
      <div aria-hidden style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
        <div className="s-souffle" style={{ position:'absolute', top:'-14%', left:'-24%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(46,134,191,.18), transparent 70%)' }} />
        <div className="s-souffle" style={{ position:'absolute', bottom:'-16%', right:'-22%', width:340, height:340, borderRadius:'50%', background:'radial-gradient(circle, rgba(110,88,190,.12), transparent 70%)', animationDelay:'3s' }} />
      </div>

      {accueil && (
        <SentinelleBienvenue nom={userName} onFini={() => setAccueil(false)} />
      )}

      {/* En-tête */}
      <div style={{
        position:'relative', display:'flex', alignItems:'center', gap:12,
        padding:'14px 16px', background:DEGRADE, flexShrink:0,
        boxShadow:'0 4px 18px rgba(20,73,109,.28)',
      }}>
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          style={{
            width:38, height:38, borderRadius:12, flexShrink:0,
            background:'rgba(255,255,255,.18)', border:'1.5px solid rgba(255,255,255,.28)', color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center',
            touchAction:'manipulation',
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:17, fontWeight:900, color:'#fff', letterSpacing:-.2 }}>{t('report.title')}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.75)', marginTop:1 }}>{t('report.guest')}</div>
        </div>
      </div>

      <div style={{ position:'relative', flex:1, overflowY:'auto', overscrollBehavior:'contain', WebkitOverflowScrolling:'touch', padding:'16px 18px 32px' }}>

        {/* La bannière, la même que celle de la console : c'est le même
            outil, vu depuis l'autre côté. */}
        <div style={{
          position:'relative', overflow:'hidden',
          background: BANNIERE,
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
              onClick={reprendre}
              style={{
                width:'100%', padding:'14px 0', borderRadius:14,
                background:C.card, border:`1.5px solid ${C.border}`,
                color:ACIER, fontSize:13, fontWeight:800,
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
                  onClick={() => revenir(0)}
                  style={{
                    padding:'7px 12px', borderRadius:20, background:C.card,
                    border:`1px solid ${C.border}`, color:C.muted,
                    fontSize:11.5, fontWeight:800, touchAction:'manipulation',
                  }}
                >↩︎ {t('report.restart')}</button>
                {chemin.map((n, i) => (
                  <button
                    key={i}
                    onClick={() => revenir(i + 1)}
                    style={{
                      padding:'7px 12px', borderRadius:20,
                      background:'rgba(43,124,178,.12)',
                      border:'1.5px solid rgba(43,124,178,.35)',
                      color:ACIER, fontSize:11.5, fontWeight:800,
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

                {/* Au-delà de huit choix — la liste des écrans en compte
                    dix-huit — une pile pleine largeur fait deux écrans de
                    défilement, et on ne voit plus que le début. Deux
                    colonnes ramènent tout à portée de pouce. */}
                <div style={{
                  display:'grid',
                  gridTemplateColumns: options.length > 8 ? '1fr 1fr' : '1fr',
                  gap:8,
                }}>
                  {options.map(noeud => {
                    const serre = options.length > 8;
                    return (
                      <button
                        key={noeud.id}
                        onClick={() => choisir(noeud)}
                        style={{
                          width:'100%', textAlign:'left',
                          padding: serre ? '13px 13px' : '15px 16px',
                          borderRadius:16, minHeight: serre ? 60 : 0,
                          background:C.card, border:`1.5px solid ${BLEU[200]}`,
                          borderLeft:`3px solid ${BLEU[400]}`, boxShadow:OMBRE_DOUCE,
                          display:'flex', alignItems:'center', gap:12,
                          touchAction:'manipulation', cursor:'pointer',
                        }}
                      >
                        {noeud.emoji && <span style={{ fontSize:22, flexShrink:0 }}>{noeud.emoji}</span>}
                        <span style={{
                          flex:1, minWidth:0, lineHeight:1.35, color:C.text,
                          fontSize: serre ? 12.5 : 13.5, fontWeight:700,
                        }}>
                          {libelle(noeud, t)}
                        </span>
                        {!serre && (
                          <span style={{ flexShrink:0, fontSize:15, fontWeight:800, color:'rgba(14,51,85,.35)' }}>›</span>
                        )}
                      </button>
                    );
                  })}
                </div>
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
                        borderRadius:13, padding:'13px 14px', fontSize:CHAMP, color:C.text,
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
                    borderRadius:14, padding:'13px 14px', fontSize:CHAMP, color:C.text,
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
                    fontSize:12.5, fontWeight:700, color:MARINE, lineHeight:1.5,
                  }}>
                    ⛔ {texteRefus(retour)}
                  </div>
                )}

                <button
                  onClick={envoyer}
                  disabled={envoi}
                  style={{
                    width:'100%', marginTop:14, padding:'15px 0', borderRadius:14,
                    background:MARINE, border:'none', color:'#EAF4FB',
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

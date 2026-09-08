import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, RefreshCw } from "lucide-react";
import {
  faireUneRonde, derniersRapports, grouperParRonde, anciennete, agir, journal, verifierPhrase,
  signatureConstat, listerIgnores, infosJoueur, prixMarche,
} from "../../lib/sentinelle.js";
import { ACTIONS_SENTINELLE, GROUPES, ACTIONS_PAR_CONSTAT } from "../../data/sentinelleActions.js";
import { APP_INFO } from "../../lib/appInfo.js";

/* ════════════════════════════════════════════════════
   SentinelleOverlay — la santé de l'app, et de quoi agir
   ────────────────────────────────────────────────────
   Réservé aux admins et aux codes de CODES_SENTINELLE (utils/admin.js).

   ─── CE QUI A CHANGÉ, ET POURQUOI ───────────────────
   Première version : tout en 10-11 px, des cartes plates les unes sur
   les autres, trois niveaux de repli imbriqués. Retour de Régis, juste :
   « je me perds » et « des écritures illisibles ». Deux défauts
   distincts, deux corrections distinctes.

   SE PERDRE → on ne descend plus jamais à plus de DEUX niveaux. Les
   trois familles d'actions sont des pastilles TOUJOURS VISIBLES en
   haut : on sait en permanence où on est, au lieu de déplier des
   accordéons dans des accordéons.

   ILLISIBLE → les tailles remontent (titres 15-16, corps 12,5-13,
   libellés 11), l'interligne s'ouvre, et le détail technique cesse
   d'être un pavé monospace de 11 px.

   ─── LE RELIEF ──────────────────────────────────────
   Même langage que le reste de la 1.30 : bandeau espresso qui accroche
   la lumière (card-warm + card-sheen, les animations de la carte de
   niveau), emoji géant en filigrane sur les cartes, ruban coloré à
   gauche des constats. C'est un écran d'outil, pas une facture.

   Palette café-only : une alerte est ESPRESSO, jamais rouge.
═══════════════════════════════════════════════════════ */

const ESPRESSO = '#5D3A1E';
const OR       = '#8A6A12';

/* Chaque gravité a sa teinte, son ruban et son mot. Le mot compte
   autant que la couleur : « à corriger » dit quoi faire, « alerte » ne
   dit que l'intensité. */
const TONS = {
  alerte: { fond:'rgba(74,44,23,.15)',   bord:'rgba(93,58,30,.5)',   ruban:'#5D3A1E', puce:'⛔', mot:'à corriger' },
  voir:   { fond:'rgba(193,127,60,.12)', bord:'rgba(193,127,60,.4)', ruban:'#C17F3C', puce:'⚠️', mot:'à regarder' },
  ok:     { fond:'rgba(212,160,23,.09)', bord:'rgba(212,160,23,.3)', ruban:'#D4A017', puce:'✅', mot:'rien à signaler' },
};
const RANG = { alerte: 0, voir: 1, ok: 2 };

function quand(iso) {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1)  return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

/* La date exacte, en plus du « il y a » — parce que « il y a 3 j » ne
   permet pas de recouper avec ce qu'on a fait ce jour-là, alors qu'une
   date le permet. Les deux ensemble : l'un pour l'urgence, l'autre pour
   l'enquête. */
const MOIS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
function dateCourte(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MOIS[d.getMonth()]} à ${hh}h${mm}`;
}

/* Cherche un code joueur dans le détail d'un constat, pour pré-remplir
   l'action proposée dessous. Format des codes : XXX-XXX. */
function codeDansDetail(detail = []) {
  for (const ligne of detail) {
    const m = String(ligne).match(/\b([A-Z0-9]{3}-[A-Z0-9]{3})\b/);
    if (m) return m[1];
  }
  return null;
}

/* Petit titre de section, comme partout ailleurs dans l'app. */
function Section({ children, C }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, color: C.muted,
      textTransform: 'uppercase', letterSpacing: 2,
      margin: '20px 0 10px',
    }}>{children}</div>
  );
}

/* ── UN CONSTAT ──────────────────────────────────────── */
function Constat({ r, age, onAgir, onClasser, C }) {
  const ton = TONS[r.verdict] || TONS.ok;
  const [ouvert, setOuvert] = useState(false);
  const detail = Array.isArray(r.detail) ? r.detail : [];
  const remedes = (ACTIONS_PAR_CONSTAT[r.categorie] || [])
    .map(id => ACTIONS_SENTINELLE.find(a => a.id === id))
    .filter(Boolean);
  const code = codeDansDetail(detail);
  const neuf = age && age.rondes <= 1 && r.verdict !== 'ok';

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: ton.fond,
      border: `1.5px solid ${ton.bord}`,
      borderRadius: 16,
      marginBottom: 10,
    }}>
      {/* Ruban de gravité — la même signature que les bannières de
          niveau : on lit la couleur avant même le texte. */}
      <div aria-hidden style={{ position:'absolute', left:0, top:0, bottom:0, width:5, background: ton.ruban }} />

      <button
        onPointerDown={() => setOuvert(o => !o)}
        style={{
          width:'100%', textAlign:'left', background:'none', border:'none',
          padding:'14px 15px 14px 19px', cursor:'pointer',
          display:'flex', alignItems:'flex-start', gap:12,
        }}
      >
        <span style={{ fontSize:20, lineHeight:1.1, flexShrink:0 }}>{ton.puce}</span>
        <span style={{ flex:1, minWidth:0 }}>
          <span style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
            <span style={{ fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1.4 }}>
              {r.categorie}
            </span>
            {neuf && (
              <span style={{
                fontSize:8.5, fontWeight:900, letterSpacing:.6, padding:'2px 6px',
                borderRadius:7, background:ton.ruban, color:'#fff',
              }}>NOUVEAU</span>
            )}
          </span>
          <span style={{ display:'block', fontSize:14, fontWeight:800, color:C.text, lineHeight:1.4 }}>
            {r.titre}
          </span>

          {/* QUAND, systématiquement. Sans date, un point apparu il y a
              dix minutes se retrouve enterré sous une alerte qui traîne
              depuis trois jours — et on traite dans le mauvais ordre. */}
          {age?.depuis && r.verdict !== 'ok' && (
            <span style={{ display:'block', fontSize:11.5, color:C.muted, marginTop:5, lineHeight:1.45 }}>
              <strong style={{ color:C.text, fontWeight:700 }}>Apparu {quand(age.depuis)}</strong>
              {` · ${dateCourte(age.depuis)}`}
              {age.rondes > 1 && ` · ${age.rondes} rondes de suite`}
            </span>
          )}

          {detail.length > 0 && !ouvert && (
            <span style={{ display:'block', fontSize:11.5, color:C.muted, marginTop:3 }}>
              {detail.length} détail{detail.length > 1 ? 's' : ''} — appuie pour voir
            </span>
          )}
        </span>
        <span style={{ fontSize:14, color:C.muted, flexShrink:0, transform: ouvert ? 'rotate(90deg)' : 'none', transition:'transform .2s' }}>›</span>
      </button>

      {ouvert && (
        <div style={{ padding:'0 15px 14px 19px' }}>
          {detail.length > 0 && (
            <div style={{
              background:'rgba(0,0,0,.05)', borderRadius:12, padding:'11px 13px',
              fontSize:12, color:C.text, lineHeight:1.75,
            }}>
              {detail.map((d, i) => (
                <div key={i} style={{ marginBottom: i === detail.length - 1 ? 0 : 4 }}>{d}</div>
              ))}
            </div>
          )}

          {/* Le geste qui répond au constat, ici même, déjà rempli. */}
          {r.verdict !== 'ok' && (remedes.length > 0 || onClasser) && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:10.5, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1.2, marginBottom:7 }}>
                Ce que tu peux faire
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {remedes.map(a => (
                  <button
                    key={a.id}
                    onPointerDown={() => onAgir(a.id, code)}
                    style={{
                      padding:'10px 14px', borderRadius:12,
                      background:'rgba(212,160,23,.16)', border:'1.5px solid rgba(212,160,23,.45)',
                      color:OR, fontSize:12.5, fontWeight:800, touchAction:'manipulation',
                    }}
                  >{a.titre} ›</button>
                ))}

                {/* Classer sans suite : dire « c'est normal » une fois,
                    au lieu de relire la même ligne chaque soir. Le
                    constat revient si la situation change. */}
                {onClasser && (
                  <button
                    onPointerDown={() => onClasser(r)}
                    style={{
                      padding:'10px 14px', borderRadius:12,
                      background:'transparent', border:`1.5px solid ${C.border}`,
                      color:C.muted, fontSize:12.5, fontWeight:800, touchAction:'manipulation',
                    }}
                  >C'est normal</button>
                )}
              </div>
              {onClasser && (
                <div style={{ fontSize:10.5, color:C.muted, marginTop:8, lineHeight:1.5 }}>
                  « C'est normal » range ce constat sans le supprimer. Il
                  reviendra de lui-même si les chiffres changent.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── UN FORMULAIRE D'ACTION ──────────────────────────── */
function Formulaire({ act, phrase, onFait, C }) {
  const [valeurs, setValeurs]   = useState(act.prefill || {});
  const [confirme, setConfirme] = useState(false);
  const [enCours, setEnCours]   = useState(false);
  const [retour, setRetour]     = useState(null);
  /* Ce que la base sait déjà du joueur visé — affiché en clair, et
     recopié dans les champs. */
  const [connu, setConnu]       = useState(null);
  const [charge, setCharge]     = useState(false);

  const manquant = act.champs.some(c => c.requis && !valeurs[c.nom]);
  const champ = (nom) => act.champs.some(c => c.nom === nom);

  /* ── PRÉ-REMPLISSAGE ────────────────────────────────
     Retour de Régis : « quand on veut le corriger, il faut tout remplir
     à la main ». La base connaît le niveau, le cumul, les cookies et
     les cafés du joueur — les redemander, c'est imposer une recopie et
     offrir une occasion de se tromper d'un chiffre sur un vrai compte.

     On ne remplit QUE les champs laissés vides : ce que l'humain a
     tapé n'est jamais écrasé. */
  useEffect(() => {
    const code = (valeurs.user_code || '').trim().toUpperCase();
    if (!champ('user_code') || !/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(code)) return;
    let annule = false;
    setCharge(true);
    infosJoueur(code).then(info => {
      if (annule) return;
      setCharge(false);
      setConnu(info);
      if (!info) return;
      setValeurs(v => ({
        ...v,
        level:        v.level        ?? info.level,
        total_earned: v.total_earned ?? info.total_earned,
        cookies:      v.cookies      ?? info.cookies,
        cafes:        v.cafes        ?? info.cafes,
      }));
    });
    return () => { annule = true; };
  }, [valeurs.user_code]);   // eslint-disable-line react-hooks/exhaustive-deps

  /* Le cours actuel, pour la correction de prix. Même principe : on
     part de la valeur réelle, on ne la retape pas. */
  useEffect(() => {
    if (!champ('prix')) return;
    prixMarche().then(p => {
      if (p != null) setValeurs(v => ({ ...v, prix: v.prix ?? String(p) }));
    });
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  /* La version en cours, pour forcer la mise à jour. */
  useEffect(() => {
    if (!champ('version')) return;
    setValeurs(v => ({ ...v, version: v.version ?? APP_INFO.version }));
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const executer = async () => {
    setEnCours(true); setRetour(null);
    const params = {};
    for (const c of act.champs) {
      const v = valeurs[c.nom];
      if (v === undefined || v === '') continue;
      params[c.nom] = c.type === 'nombre' ? Number(v) : c.type === 'oui_non' ? (v === 'oui') : v;
    }
    const r = await agir(phrase, act.id, params);
    setRetour(r); setEnCours(false); setConfirme(false);
    if (r?.ok) { setValeurs({}); onFait?.(); }
  };

  const champStyle = {
    width:'100%', boxSizing:'border-box',
    background:C.card2, border:`1.5px solid ${C.border}`, borderRadius:12,
    padding:'12px 13px', fontSize:14, color:C.text,
  };

  return (
    <div style={{ paddingTop:4 }}>
      {act.aide && (
        <div style={{
          fontSize:12, color:C.muted, lineHeight:1.65, marginBottom:14,
          background:'rgba(0,0,0,.04)', borderRadius:12, padding:'11px 13px',
        }}>{act.aide}</div>
      )}

      {/* Qui on est en train de toucher, en clair. Sur un écran qui
          réécrit de vrais comptes, voir le pseudo évite de sanctionner
          le mauvais code à une lettre près. */}
      {charge && (
        <div style={{ fontSize:12, color:C.muted, marginBottom:11 }}>Lecture du compte…</div>
      )}
      {connu && (
        <div style={{
          background:'rgba(212,160,23,.10)', border:'1.5px solid rgba(212,160,23,.35)',
          borderRadius:12, padding:'11px 13px', marginBottom:12,
        }}>
          <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{connu.user_name}</div>
          <div style={{ fontSize:11.5, color:C.muted, marginTop:3, lineHeight:1.5 }}>
            Niveau {connu.level} · {Number(connu.total_earned).toLocaleString('fr-FR')} 🍪 au cumul ·
            {' '}{Number(connu.cookies).toLocaleString('fr-FR')} 🍪 en poche · {connu.cafes} ☕
          </div>
          <div style={{ fontSize:10.5, color:C.muted, marginTop:5 }}>
            Valeurs actuelles, déjà recopiées ci-dessous — ne change que ce que tu veux corriger.
          </div>
        </div>
      )}

      {act.champs.map(c => (
        <div key={c.nom} style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:C.text, fontWeight:700, marginBottom:6 }}>
            {c.label}{c.requis && <span style={{ color:C.muted }}> — obligatoire</span>}
          </div>
          {c.type === 'oui_non' ? (
            <div style={{ display:'flex', gap:8 }}>
              {['oui', 'non'].map(v => (
                <button
                  key={v}
                  onPointerDown={() => setValeurs(x => ({ ...x, [c.nom]: v }))}
                  style={{
                    flex:1, padding:'12px 0', borderRadius:12, fontSize:13.5, fontWeight:800,
                    background: valeurs[c.nom] === v ? 'rgba(212,160,23,.2)' : C.card2,
                    border:`1.5px solid ${valeurs[c.nom] === v ? 'rgba(212,160,23,.55)' : C.border}`,
                    color: valeurs[c.nom] === v ? OR : C.muted,
                  }}
                >{v}</button>
              ))}
            </div>
          ) : (
            <input
              value={valeurs[c.nom] ?? ''}
              onChange={e => setValeurs(x => ({ ...x, [c.nom]: e.target.value }))}
              inputMode={c.type === 'nombre' ? 'numeric' : 'text'}
              placeholder={c.exemple ? `ex. ${c.exemple}` : ''}
              style={champStyle}
            />
          )}
        </div>
      ))}

      {/* Deux temps sur ce qui fait mal. Confirmation en ligne, jamais
          un window.confirm (convention du projet). */}
      {act.danger && !confirme ? (
        <button
          onPointerDown={() => !manquant && setConfirme(true)}
          disabled={manquant}
          style={{
            width:'100%', padding:'14px 0', borderRadius:13, marginTop:4,
            background:'transparent', border:`1.5px solid ${C.border}`,
            color:C.muted, fontSize:13.5, fontWeight:800, opacity: manquant ? .5 : 1,
          }}
        >
          {manquant ? 'Remplis les champs obligatoires' : 'Continuer'}
        </button>
      ) : (
        <>
          {act.danger && (
            <div style={{ fontSize:12, color:ESPRESSO, fontWeight:700, marginBottom:8, lineHeight:1.5 }}>
              Dernière étape — ça s'applique tout de suite, sur de vrais comptes.
            </div>
          )}
          <button
            onPointerDown={() => !enCours && !manquant && executer()}
            disabled={enCours || manquant}
            style={{
              width:'100%', padding:'14px 0', borderRadius:13, marginTop:2,
              background: act.danger
                ? 'linear-gradient(140deg, rgba(74,44,23,.22), rgba(93,58,30,.16))'
                : 'linear-gradient(140deg, rgba(212,160,23,.22), rgba(193,127,60,.14))',
              border:`1.5px solid ${act.danger ? 'rgba(93,58,30,.6)' : 'rgba(212,160,23,.5)'}`,
              color: act.danger ? ESPRESSO : OR,
              fontSize:13.5, fontWeight:900, letterSpacing:.3,
              opacity: (enCours || manquant) ? .5 : 1,
            }}
          >
            {enCours ? 'En cours…' : act.danger ? 'Confirmer' : 'Exécuter'}
          </button>
        </>
      )}

      {retour && (
        <div style={{
          marginTop:12, padding:'13px 14px', borderRadius:13, fontSize:13, fontWeight:700, lineHeight:1.5,
          background: retour.ok ? 'rgba(212,160,23,.13)' : 'rgba(74,44,23,.14)',
          border:`1.5px solid ${retour.ok ? 'rgba(212,160,23,.42)' : 'rgba(93,58,30,.5)'}`,
          color: retour.ok ? OR : ESPRESSO,
        }}>
          {retour.ok ? '✅ ' : '⛔ '}{retour.message}
        </div>
      )}
    </div>
  );
}

/* ── L'ONGLET AGIR ───────────────────────────────────── */
function PanneauActions({ ouvrir, prefill, onOuvrir, phrase, setPhrase, ouverte, setOuverte, C }) {
  const [verif, setVerif]   = useState(false);
  const [erreur, setErreur] = useState(null);
  /* La famille est TOUJOURS visible en haut : c'est ce qui évite de se
     perdre. On ne déplie plus une famille dans une liste, on choisit un
     rayon et on y reste. */
  const [famille, setFamille] = useState('joueur');
  const [registre, setRegistre] = useState([]);

  const chargerJournal = useCallback(async () => setRegistre(await journal(10)), []);
  useEffect(() => { if (ouverte) chargerJournal(); }, [ouverte, chargerJournal]);

  /* Arrivée depuis un constat : on se place sur le bon rayon. */
  useEffect(() => {
    if (!ouvrir) return;
    const act = ACTIONS_SENTINELLE.find(a => a.id === ouvrir);
    if (act) setFamille(act.groupe);
  }, [ouvrir]);

  const verifierMaintenant = async () => {
    if (!phrase || verif) return;
    setVerif(true); setErreur(null);
    const r = await verifierPhrase(phrase);
    setVerif(false);
    if (r.ok) setOuverte(true);
    else { setOuverte(false); setErreur(r.message); }
  };

  /* ── La serrure ─────────────────────────────────── */
  if (!ouverte) {
    return (
      <div style={{
        position:'relative', overflow:'hidden',
        background:'linear-gradient(140deg, #4A2C17, #7D4E1F)',
        borderRadius:20, padding:'26px 20px 22px', color:'#fff',
        boxShadow:'0 8px 24px rgba(74,44,23,.35)',
        textAlign:'center',
      }}>
        <div className="card-warm" aria-hidden />
        <div aria-hidden style={{
          position:'absolute', right:-14, bottom:-22, fontSize:110, lineHeight:1,
          opacity:.09, pointerEvents:'none',
        }}>🔒</div>

        <div style={{ position:'relative' }}>
          <div style={{ fontSize:38, lineHeight:1, marginBottom:12 }}>🔒</div>
          <div style={{ fontSize:17, fontWeight:900, marginBottom:6 }}>Console verrouillée</div>
          <div style={{ fontSize:12.5, color:'rgba(255,255,255,.72)', lineHeight:1.6, maxWidth:290, margin:'0 auto 18px' }}>
            Tape ta phrase de passe. Elle est vérifiée en base — elle n'est
            gardée ni ici, ni dans le téléphone.
          </div>

          <input
            type="password"
            value={phrase}
            onChange={e => { setPhrase(e.target.value); setErreur(null); }}
            onKeyDown={e => { if (e.key === 'Enter') verifierMaintenant(); }}
            placeholder="ta phrase"
            autoComplete="off"
            style={{
              width:'100%', boxSizing:'border-box', textAlign:'center',
              background:'rgba(0,0,0,.28)',
              border:`1.5px solid ${erreur ? 'rgba(255,180,140,.6)' : 'rgba(212,160,23,.5)'}`,
              borderRadius:13, padding:'14px 14px', fontSize:15, color:'#FFE066',
              letterSpacing:2,
            }}
          />

          <button
            onPointerDown={verifierMaintenant}
            disabled={!phrase || verif}
            style={{
              width:'100%', marginTop:11, padding:'14px 0', borderRadius:13,
              background:'rgba(212,160,23,.9)', border:'none',
              color:'#3D2010', fontSize:14, fontWeight:900, letterSpacing:.5,
              opacity:(!phrase || verif) ? .5 : 1, touchAction:'manipulation',
            }}
          >
            {verif ? 'Vérification…' : 'Vérifier'}
          </button>

          {erreur && (
            <div style={{ marginTop:12, fontSize:12.5, fontWeight:700, color:'#FFD4A8', lineHeight:1.5 }}>
              ⛔ {erreur}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── La console ouverte ─────────────────────────── */
  const actions = ACTIONS_SENTINELLE.filter(a => a.groupe === famille);
  const g = GROUPES.find(x => x.id === famille);

  return (
    <>
      <div style={{
        display:'flex', alignItems:'center', gap:10, marginBottom:16,
        background:'rgba(212,160,23,.11)', border:'1.5px solid rgba(212,160,23,.4)',
        borderRadius:14, padding:'11px 14px',
      }}>
        <span style={{ fontSize:18 }}>🔓</span>
        <span style={{ flex:1, fontSize:12.5, fontWeight:800, color:C.text }}>Console ouverte</span>
        <button
          onPointerDown={() => { setOuverte(false); setPhrase(''); onOuvrir(null); }}
          style={{
            padding:'8px 13px', borderRadius:11, background:C.card2,
            border:`1px solid ${C.border}`, color:C.muted, fontSize:11.5, fontWeight:800,
          }}
        >Verrouiller</button>
      </div>

      {/* Les trois rayons, toujours visibles : on sait où on est. */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {GROUPES.map(x => {
          const actif = famille === x.id;
          return (
            <button
              key={x.id}
              onPointerDown={() => { setFamille(x.id); onOuvrir(null); }}
              style={{
                flex:1, padding:'12px 4px', borderRadius:14,
                background: actif ? 'linear-gradient(140deg, rgba(212,160,23,.22), rgba(193,127,60,.12))' : C.card,
                border:`1.5px solid ${actif ? 'rgba(212,160,23,.5)' : C.border}`,
                display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                touchAction:'manipulation',
              }}
            >
              <span style={{ fontSize:20, lineHeight:1 }}>{x.emoji}</span>
              <span style={{ fontSize:10.5, fontWeight:800, color: actif ? OR : C.muted, textAlign:'center', lineHeight:1.25 }}>
                {x.titre}
              </span>
            </button>
          );
        })}
      </div>

      <Section C={C}>{g?.titre}</Section>

      {actions.map(a => {
        const actif = ouvrir === a.id;
        return (
          <div key={a.id} style={{
            position:'relative', overflow:'hidden',
            background:C.card,
            border:`1.5px solid ${actif ? 'rgba(212,160,23,.5)' : C.border}`,
            borderRadius:16, marginBottom:10,
          }}>
            {a.danger && <div aria-hidden style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:ESPRESSO, opacity:.6 }} />}
            <button
              onPointerDown={() => onOuvrir(actif ? null : a.id)}
              style={{
                width:'100%', textAlign:'left', background:'none', border:'none',
                padding:'14px 15px 14px 18px', cursor:'pointer',
                display:'flex', alignItems:'center', gap:11,
              }}
            >
              <span style={{ flex:1, minWidth:0 }}>
                <span style={{ display:'block', fontSize:14, fontWeight:800, color:C.text, lineHeight:1.35 }}>
                  {a.titre}
                </span>
                <span style={{ display:'block', fontSize:12, color:C.muted, marginTop:3, lineHeight:1.45 }}>
                  {a.resume}
                </span>
              </span>
              <span style={{ fontSize:14, color:C.muted, flexShrink:0, transform: actif ? 'rotate(90deg)' : 'none', transition:'transform .2s' }}>›</span>
            </button>
            {actif && (
              <div style={{ padding:'0 15px 15px 18px' }}>
                <Formulaire
                  act={{ ...a, prefill: prefill && a.champs.some(c => c.nom === 'user_code') ? { user_code: prefill } : {} }}
                  phrase={phrase}
                  onFait={chargerJournal}
                  C={C}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Le registre : c'est ce qui rend la console vérifiable. */}
      <Section C={C}>Ce qui a été fait</Section>
      {registre.length === 0 ? (
        <div style={{ fontSize:12.5, color:C.muted, padding:'4px 2px' }}>Rien pour l'instant.</div>
      ) : (
        <div style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:16, overflow:'hidden' }}>
          {registre.map((l, i) => (
            <div key={l.id} style={{
              display:'flex', gap:11, alignItems:'flex-start', padding:'12px 14px',
              borderBottom: i === registre.length - 1 ? 'none' : `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize:15, flexShrink:0, lineHeight:1.2 }}>
                {l.resultat === 'ok' ? '✅' : l.resultat === 'refus' ? '⛔' : '⚠️'}
              </span>
              <span style={{ flex:1, minWidth:0 }}>
                <span style={{ display:'block', fontSize:12.5, fontWeight:800, color:C.text }}>
                  {l.action}{l.cible ? ` · ${l.cible}` : ''}
                </span>
                <span style={{ display:'block', fontSize:11.5, color:C.muted, marginTop:2, lineHeight:1.45 }}>
                  {l.message}
                </span>
              </span>
              <span style={{ flexShrink:0, fontSize:10.5, color:C.muted }}>{quand(l.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════ */
export function SentinelleOverlay({ onClose, C }) {
  const [rapports, setRapports]     = useState([]);
  const [historique, setHistorique] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours]       = useState(false);
  const [horodatage, setHorodatage] = useState(null);
  const [immediat, setImmediat]     = useState(false);
  const [onglet, setOnglet]         = useState('etat');
  const [actionOuverte, setActionOuverte] = useState(null);
  const [prefill, setPrefill]       = useState(null);
  const [toutVoir, setToutVoir]     = useState(false);
  /* La phrase vit ici, pas dans l'onglet Agir : déverrouiller une fois
     doit suffire pour classer un constat sans suite depuis l'onglet
     État, sans avoir à retaper. Elle n'est toujours gardée nulle part
     ailleurs qu'en mémoire, le temps de l'écran. */
  const [phrase, setPhrase]         = useState('');
  const [deverrouille, setDeverr]   = useState(false);
  const [ignores, setIgnores]       = useState([]);
  const [message, setMessage]       = useState(null);
  const [resultatRonde, setResultatRonde] = useState(null);

  const charger = useCallback(async () => {
    setChargement(true);
    const [rap, ign] = await Promise.all([derniersRapports(200), listerIgnores()]);
    const rondes = grouperParRonde(rap);
    setIgnores(ign);
    setHistorique(rondes);
    setRapports(rondes.length ? rondes[0].verdicts : []);
    setHorodatage(rondes.length ? rondes[0].instant : null);
    setImmediat(false);
    setChargement(false);
  }, []);

  useEffect(() => { charger(); }, [charger]);

  /* Une ronde à la demande doit DIRE ce qu'elle a trouvé de neuf.
     Régis : « quand je relance le sentinel, il n'y a pas de vrai
     changement » — parce que rien ne le disait. Un contrôle qui rend le
     même écran sans un mot laisse croire qu'il n'a pas tourné. */
  const controler = async () => {
    setEnCours(true);
    setMessage(null);
    const avant = new Set(rapports.filter(r => r.verdict !== 'ok').map(signatureConstat));
    const frais = await faireUneRonde({ enregistrer: false });
    const nouveaux = frais.filter(r => r.verdict !== 'ok' && !avant.has(signatureConstat(r)));
    const partis   = [...avant].filter(sig => !frais.some(r => signatureConstat(r) === sig));

    setRapports(frais);
    setHorodatage(new Date().toISOString());
    setImmediat(true);
    setEnCours(false);

    const bouts = [];
    if (nouveaux.length) bouts.push(`${nouveaux.length} nouveau${nouveaux.length > 1 ? 'x' : ''} constat${nouveaux.length > 1 ? 's' : ''}`);
    if (partis.length)   bouts.push(`${partis.length} résolu${partis.length > 1 ? 's' : ''}`);
    setResultatRonde(bouts.length ? bouts.join(' · ') : 'Rien de neuf depuis la dernière ronde');
  };

  const allerAgir = (actionId, code) => {
    setPrefill(code || null);
    setActionOuverte(actionId);
    setOnglet('agir');
  };

  /* UN SEUL ORDRE : du plus récent au plus ancien (demande Régis, qui
     n'utilisait pas le tri par gravité). Deux boutons de tri pour cinq
     lignes, c'était un choix de plus à faire pour rien.

     Le récent d'abord se défend : sa cause est encore fraîche et
     trouvable, alors qu'un constat qui traîne depuis trois jours, on a
     déjà décidé de vivre avec. À date égale, le plus grave passe
     devant. */
  const dateApparition = (r) => {
    const a = anciennete(historique, r);
    return a?.depuis ? new Date(a.depuis).getTime() : 0;
  };

  const tries = [...rapports].sort((a, b) => {
    const d = dateApparition(b) - dateApparition(a);
    if (d !== 0) return d;
    return (RANG[a.verdict] ?? 9) - (RANG[b.verdict] ?? 9);
  });

  /* Les constats classés sans suite sortent de la liste principale.
     Ils ne sont pas supprimés : ils attendent dans leur propre section,
     et reviennent d'eux-mêmes dès que leur titre change. */
  const signaturesIgnorees = new Set(ignores.map(i => i.signature));
  const estIgnore = (r) => signaturesIgnorees.has(signatureConstat(r));

  const problemes = tries.filter(r => r.verdict !== 'ok' && !estIgnore(r));
  const ranges    = tries.filter(r => r.verdict !== 'ok' && estIgnore(r));
  const sains     = tries.filter(r => r.verdict === 'ok');
  const alertes   = problemes.filter(r => r.verdict === 'alerte').length;

  /* Classer / reprendre passent par la même porte que tout le reste :
     sans la phrase, un joueur signalé pourrait faire taire l'alerte qui
     le concerne. */
  const classer = async (r) => {
    const res = await agir(phrase, 'classer_sans_suite', {
      signature: signatureConstat(r), categorie: r.categorie, titre: r.titre,
    });
    if (res?.ok) setIgnores(await listerIgnores());
    else setMessage(res?.message || 'Échec');
  };

  const reprendre = async (signature) => {
    const res = await agir(phrase, 'reprendre_constat', { signature });
    if (res?.ok) setIgnores(await listerIgnores());
    else setMessage(res?.message || 'Échec');
  };

  const grave = alertes > 0;
  const titre = chargement ? 'Lecture…'
    : !rapports.length ? 'Pas encore de ronde'
    : grave ? `${alertes} alerte${alertes > 1 ? 's' : ''}`
    : problemes.length ? `${problemes.length} point${problemes.length > 1 ? 's' : ''} à regarder`
    : 'Tout va bien';
  const sousTitre = chargement ? ''
    : !rapports.length ? 'La première partira toute seule dès qu\'un joueur ouvrira l\'app'
    : `${rapports.length} contrôles · ${immediat ? 'à l\'instant' : quand(horodatage)}`;

  return (
    <div style={{
      position:'fixed', top:0, left:'50%', transform:'translateX(-50%)',
      width:'100%', maxWidth:430, bottom:0,
      background:C.bg, zIndex:62, display:'flex', flexDirection:'column',
    }}>
      {/* En-tête */}
      <div style={{
        display:'flex', alignItems:'center', gap:12, padding:'14px 18px',
        borderBottom:`1px solid ${C.border}`, background:C.card, flexShrink:0,
      }}>
        <button
          onClick={onClose} aria-label="Retour"
          style={{
            width:36, height:36, borderRadius:12, background:C.card2,
            display:'flex', alignItems:'center', justifyContent:'center', color:C.text,
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:17, fontWeight:800, color:C.text }}>Sentinelle</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>version {APP_INFO.version}</div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 18px 32px' }}>

        {/* LA RÉPONSE, en grand, avant tout le reste. Bandeau espresso
            qui accroche la lumière — même traitement que la bannière du
            marché et la carte de niveau. */}
        <div style={{
          position:'relative', overflow:'hidden',
          background: grave
            ? 'linear-gradient(140deg, #3A1D0C, #5D3A1E)'
            : 'linear-gradient(140deg, #4A2C17, #7D4E1F)',
          borderRadius:20, padding:'20px 20px 18px', color:'#fff', marginBottom:16,
          boxShadow:'0 8px 24px rgba(74,44,23,.35)',
        }}>
          <div className="card-warm" aria-hidden />
          <div className="card-sheen" aria-hidden />
          {/* Emoji géant en filigrane : la signature des cartes de la
              1.30, ce qui fait qu'un bloc n'est pas un rectangle vide. */}
          <div aria-hidden style={{
            position:'absolute', right:-10, bottom:-26, fontSize:118, lineHeight:1,
            opacity:.1, pointerEvents:'none',
          }}>🛡️</div>

          <div style={{ position:'relative', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:34, lineHeight:1, flexShrink:0 }}>
              {chargement ? '🛡️' : grave ? '⛔' : problemes.length ? '⚠️' : '✅'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:22, fontWeight:900, lineHeight:1.15, letterSpacing:-.3 }}>{titre}</div>
              <div style={{ fontSize:11.5, color:'rgba(255,255,255,.7)', marginTop:4, lineHeight:1.45 }}>
                {sousTitre}
              </div>
            </div>
            <button
              onPointerDown={() => !enCours && controler()}
              disabled={enCours}
              aria-label="Contrôler maintenant"
              style={{
                flexShrink:0, width:44, height:44, borderRadius:14,
                background:'rgba(212,160,23,.22)', border:'1.5px solid rgba(212,160,23,.5)',
                color:'#FFE066', display:'flex', alignItems:'center', justifyContent:'center',
                opacity: enCours ? .5 : 1, touchAction:'manipulation',
              }}
            >
              <RefreshCw size={18} style={enCours ? { animation:'premiumRay 1.1s linear infinite' } : undefined} />
            </button>
          </div>
        </div>

        {resultatRonde && (
          <div style={{
            marginBottom:14, padding:'11px 14px', borderRadius:13,
            background:'rgba(212,160,23,.11)', border:'1.5px solid rgba(212,160,23,.35)',
            fontSize:12.5, fontWeight:700, color:OR,
          }}>
            ↻ {resultatRonde}
          </div>
        )}

        {/* Deux onglets, gros et lisibles */}
        <div style={{ display:'flex', gap:8, marginBottom:6 }}>
          {[['etat', '🔍', 'État'], ['agir', '⚙️', 'Agir']].map(([id, emoji, label]) => {
            const actif = onglet === id;
            return (
              <button
                key={id}
                onPointerDown={() => setOnglet(id)}
                style={{
                  flex:1, padding:'13px 0', borderRadius:14,
                  background: actif ? 'linear-gradient(140deg, rgba(212,160,23,.22), rgba(193,127,60,.12))' : C.card,
                  border:`1.5px solid ${actif ? 'rgba(212,160,23,.5)' : C.border}`,
                  color: actif ? OR : C.muted, fontSize:13.5, fontWeight:800,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                  touchAction:'manipulation',
                }}
              >
                <span style={{ fontSize:15 }}>{emoji}</span>{label}
              </button>
            );
          })}
        </div>

        {onglet === 'agir' ? (
          <div style={{ marginTop:16 }}>
            <PanneauActions
              ouvrir={actionOuverte} prefill={prefill} onOuvrir={setActionOuverte}
              phrase={phrase} setPhrase={setPhrase}
              ouverte={deverrouille} setOuverte={setDeverr}
              C={C}
            />
          </div>
        ) : chargement ? (
          <div style={{ textAlign:'center', color:C.muted, fontSize:13, padding:'40px 0' }}>Lecture…</div>
        ) : !rapports.length ? (
          <div style={{
            marginTop:16, background:C.card, border:`1.5px solid ${C.border}`, borderRadius:18,
            padding:'26px 20px', textAlign:'center', color:C.muted, fontSize:13, lineHeight:1.7,
          }}>
            <div style={{ fontSize:34, marginBottom:10 }}>🛡️</div>
            <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:6 }}>
              Aucune ronde enregistrée
            </div>
            Elle partira toute seule dès qu'un joueur ouvrira l'app.<br />
            Tu peux aussi en lancer une avec le bouton ↻ ci-dessus.
          </div>
        ) : (
          <>
            {problemes.length > 0 && <Section C={C}>À traiter — du plus récent</Section>}
            {problemes.map((r, i) => (
              <Constat
                key={r.id ?? i} r={r}
                age={immediat ? null : anciennete(historique, r)}
                onAgir={allerAgir}
                onClasser={deverrouille ? classer : null}
                C={C}
              />
            ))}

            {/* Ce qui va bien tient en une ligne. Le détailler chaque
                soir, c'est apprendre à ne plus rien lire. */}
            {sains.length > 0 && (
              <>
                <Section C={C}>Le reste</Section>
                <button
                  onPointerDown={() => setToutVoir(v => !v)}
                  style={{
                    width:'100%', textAlign:'left',
                    background:'rgba(212,160,23,.08)', border:'1.5px solid rgba(212,160,23,.28)',
                    borderRadius:16, padding:'14px 15px', cursor:'pointer',
                    display:'flex', alignItems:'center', gap:12,
                  }}
                >
                  <span style={{ fontSize:20 }}>✅</span>
                  <span style={{ flex:1, fontSize:13.5, fontWeight:800, color:C.text }}>
                    {sains.length} contrôle{sains.length > 1 ? 's' : ''} sans rien à signaler
                  </span>
                  <span style={{ fontSize:14, color:C.muted, transform: toutVoir ? 'rotate(90deg)' : 'none', transition:'transform .2s' }}>›</span>
                </button>
                {toutVoir && (
                  <div style={{ marginTop:10 }}>
                    {sains.map((r, i) => (
                      <Constat key={r.id ?? `ok${i}`} r={r} age={null} onAgir={allerAgir} C={C} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Ce qui a été classé sans suite. Rangé, pas supprimé : on
                peut toujours le reprendre, et il revient tout seul si
                les chiffres bougent. */}
            {ranges.length > 0 && (
              <>
                <Section C={C}>Classés sans suite</Section>
                {ranges.map((r, i) => {
                  const sig = signatureConstat(r);
                  const info = ignores.find(x => x.signature === sig);
                  return (
                    <div key={r.id ?? `ig${i}`} style={{
                      background:C.card, border:`1.5px solid ${C.border}`, borderRadius:14,
                      padding:'12px 14px', marginBottom:8, opacity:.85,
                      display:'flex', alignItems:'center', gap:11,
                    }}>
                      <span style={{ fontSize:16, flexShrink:0, opacity:.6 }}>🗄️</span>
                      <span style={{ flex:1, minWidth:0 }}>
                        <span style={{ display:'block', fontSize:12.5, fontWeight:700, color:C.text, lineHeight:1.4 }}>
                          {r.titre}
                        </span>
                        <span style={{ display:'block', fontSize:10.5, color:C.muted, marginTop:2 }}>
                          {r.categorie}{info?.cree_le ? ` · classé ${quand(info.cree_le)}` : ''}
                        </span>
                      </span>
                      {deverrouille && (
                        <button
                          onPointerDown={() => reprendre(sig)}
                          style={{
                            flexShrink:0, padding:'8px 12px', borderRadius:11,
                            background:C.card2, border:`1px solid ${C.border}`,
                            color:C.muted, fontSize:11.5, fontWeight:800,
                          }}
                        >Reprendre</button>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {message && (
              <div style={{
                marginTop:12, padding:'11px 13px', borderRadius:12, fontSize:12, fontWeight:700,
                background:'rgba(74,44,23,.14)', border:'1.5px solid rgba(93,58,30,.5)', color:ESPRESSO,
              }}>⛔ {message}</div>
            )}

            <div style={{ marginTop:20, fontSize:11.5, color:C.muted, lineHeight:1.7 }}>
              Les rondes constatent, elles ne corrigent jamais rien d'elles-mêmes.
              Quand un constat a un remède, le bouton apparaît dessous, déjà rempli.
              {!deverrouille && ' Déverrouille la console dans l\'onglet Agir pour pouvoir classer un constat sans suite.'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

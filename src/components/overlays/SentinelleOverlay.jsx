import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, RefreshCw } from "lucide-react";
import {
  faireUneRonde, derniersRapports, grouperParRonde, anciennete, agir, journal, verifierPhrase,
  signatureConstat, listerIgnores, infosJoueur, prixMarche, enregistrerSiDifferent,
  listerSignalements, traiterSignalement,
} from "../../lib/sentinelle.js";
import { STATUTS } from "../../data/signalements.js";
import { ACTIONS_SENTINELLE, GROUPES, ACTIONS_PAR_CONSTAT } from "../../data/sentinelleActions.js";
import { APP_INFO } from "../../lib/appInfo.js";
import { tousLesJoueurs, demander, EXEMPLES, correspondQuestion } from "../../lib/sentinelleQuestions.js";

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
   Même construction que le reste de la 1.30 : bandeau qui accroche la
   lumière (card-cool + card-sheen-cool, mêmes keyframes que la carte de
   niveau), emoji géant en filigrane, ruban coloré à gauche des
   constats. C'est un écran d'outil, pas une facture.

   ─── POURQUOI DU BLEU ICI, ET NULLE PART AILLEURS ───
   Toute l'app est café-only. Cet écran est la seule exception, et c'est
   délibéré : quand ce bleu apparaît, on n'est plus dans le jeu, on est
   dans l'outil. Aucun risque de confondre une alerte avec une bannière
   de boutique ou une récompense.

   Fond CLAIR, encre marine — pas l'inverse. On ouvre cet écran quand
   quelque chose ne va pas, souvent dehors, sur un téléphone : du texte
   foncé sur fond clair y tient mieux que du blanc sur brun.

   L'interdiction du rouge tient toujours. La gravité se dit par la
   PROFONDEUR du bleu, jamais par une couleur d'alarme : marine pour ce
   qui est à corriger, bleu moyen pour ce qui est à regarder, bleu clair
   pour ce qui va bien. Trois bleus, trois niveaux, aucun rouge.
═══════════════════════════════════════════════════════ */

const MARINE = '#0B2E4D';   /* l'encre : titres graves, texte de danger */
const ACIER  = '#1B5E8C';   /* l'accent : ce sur quoi on peut appuyer   */

/* ── LE THÈME DE LA SENTINELLE ───────────────────────
   L'écran ne prend PAS le thème du joueur. Il a le sien, et un seul.

   Deux raisons. La première tient à ce que fait cet écran : on y lit des
   alertes et on y sanctionne des comptes. Le voir changer de peau selon
   que Régis a équipé Cosmos ou Forge Caféinée ajouterait une variable
   inutile à un moment où il vaut mieux n'en avoir aucune — et certains
   thèmes du jeu (dégradés violets, or saturé) rendraient une alerte
   illisible.

   La seconde est la même que pour la bannière : c'est le signal que
   l'on a quitté le jeu. Une seule surface bleue dans toute l'app, la
   même à chaque ouverture.

   Clair, toujours — y compris si le joueur est en thème sombre. On
   ouvre cet écran quand quelque chose ne va pas, souvent dehors, sur un
   téléphone : la lisibilité passe avant le confort nocturne. Même forme
   qu'un thème du jeu (bg/card/card2/text/muted/border), donc les
   sous-composants n'ont rien à savoir de tout ça. */
const THEME_SENTINELLE = {
  bg:     'linear-gradient(170deg,#F3F9FD 0%,#E4F0F9 55%,#DAECF7 100%)',
  card:   '#FFFFFF',
  card2:  '#EAF3FA',
  text:   '#0E3355',
  muted:  '#5A7E9B',
  border: '#CCE0EE',
};

/* Chaque gravité a sa teinte, son ruban et son mot. Le mot compte
   autant que la couleur : « à corriger » dit quoi faire, « alerte » ne
   dit que l'intensité. */
const TONS = {
  alerte: { fond:'rgba(30,80,125,.15)',   bord:'rgba(14,51,85,.5)',   ruban:'#0B2E4D', puce:'⛔', mot:'à corriger' },
  voir:   { fond:'rgba(104,164,205,.12)', bord:'rgba(104,164,205,.4)', ruban:'#5E9BC4', puce:'⚠️', mot:'à regarder' },
  ok:     { fond:'rgba(43,124,178,.09)', bord:'rgba(43,124,178,.3)', ruban:'#2B7CB2', puce:'✅', mot:'rien à signaler' },
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

/* ── Ce constat a-t-il déjà été traité ? ──────────────
   Retour de Régis : « j'ai forcé la mise à jour puis validé, et le
   message à traiter reste ».

   Ce n'était pas un bug d'affichage. Forcer la mise à jour ne met
   personne à jour : ça pose un drapeau que le joueur ne verra qu'en
   rouvrant son app, parfois des jours plus tard. Le constat reste donc
   VRAI. Ce qui manquait, c'est que l'écran sache que l'humain, lui, a
   fait sa part.

   On le déduit du registre — aucune table de plus : si une action
   capable de répondre à ce constat a réussi APRÈS son apparition,
   c'est traité. Le constat quitte « à traiter » pour « en attente
   d'effet », et disparaît tout seul le jour où la situation change.

   Le lien se lit dans ACTIONS_PAR_CONSTAT, le même qui propose les
   remèdes sous le constat : une seule table de correspondance pour les
   deux usages, donc pas de dérive possible entre ce qu'on propose et
   ce qu'on considère comme traité. */
function dejaTraite(constat, age, registre) {
  const remedes = ACTIONS_PAR_CONSTAT[constat.categorie] || [];
  if (!remedes.length || !registre?.length) return null;
  const depuis = age?.depuis ? new Date(age.depuis).getTime() : 0;
  return registre.find(l =>
    l.resultat === 'ok' &&
    remedes.includes(l.action) &&
    new Date(l.created_at).getTime() >= depuis
  ) || null;
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
function Constat({ r, age, traite, onAgir, onClasser, C }) {
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
            {neuf && !traite && (
              <span style={{
                fontSize:8.5, fontWeight:900, letterSpacing:.6, padding:'2px 6px',
                borderRadius:7, background:ton.ruban, color:'#fff',
              }}>NOUVEAU</span>
            )}
            {traite && (
              <span style={{
                fontSize:8.5, fontWeight:900, letterSpacing:.6, padding:'2px 6px',
                borderRadius:7, background:'rgba(43,124,178,.9)', color:'#EAF4FB',
              }}>TRAITÉ</span>
            )}
          </span>
          <span style={{ display:'block', fontSize:14, fontWeight:800, color:C.text, lineHeight:1.4 }}>
            {r.titre}
          </span>

          {/* QUAND, systématiquement. Sans date, un point apparu il y a
              dix minutes se retrouve enterré sous une alerte qui traîne
              depuis trois jours — et on traite dans le mauvais ordre. */}
          {traite && (
            <span style={{ display:'block', fontSize:11.5, color:C.text, marginTop:5, lineHeight:1.5 }}>
              Tu as lancé <strong>{traite.action}</strong> {quand(traite.created_at)}.
              <span style={{ color:C.muted }}> L'effet n'est pas immédiat : ce constat
              disparaîtra de lui-même quand la situation aura vraiment changé.</span>
            </span>
          )}

          {!traite && age?.depuis && r.verdict !== 'ok' && (
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
                      background:'rgba(43,124,178,.16)', border:'1.5px solid rgba(43,124,178,.45)',
                      color:ACIER, fontSize:12.5, fontWeight:800, touchAction:'manipulation',
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
          background:'rgba(43,124,178,.10)', border:'1.5px solid rgba(43,124,178,.35)',
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
                    background: valeurs[c.nom] === v ? 'rgba(43,124,178,.2)' : C.card2,
                    border:`1.5px solid ${valeurs[c.nom] === v ? 'rgba(43,124,178,.55)' : C.border}`,
                    color: valeurs[c.nom] === v ? ACIER : C.muted,
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
            <div style={{ fontSize:12, color:MARINE, fontWeight:700, marginBottom:8, lineHeight:1.5 }}>
              Dernière étape — ça s'applique tout de suite, sur de vrais comptes.
            </div>
          )}
          <button
            onPointerDown={() => !enCours && !manquant && executer()}
            disabled={enCours || manquant}
            style={{
              width:'100%', padding:'14px 0', borderRadius:13, marginTop:2,
              background: act.danger
                ? 'linear-gradient(140deg, rgba(30,80,125,.22), rgba(14,51,85,.16))'
                : 'linear-gradient(140deg, rgba(43,124,178,.22), rgba(104,164,205,.14))',
              border:`1.5px solid ${act.danger ? 'rgba(14,51,85,.6)' : 'rgba(43,124,178,.5)'}`,
              color: act.danger ? MARINE : ACIER,
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
          background: retour.ok ? 'rgba(43,124,178,.13)' : 'rgba(30,80,125,.14)',
          border:`1.5px solid ${retour.ok ? 'rgba(43,124,178,.42)' : 'rgba(14,51,85,.5)'}`,
          color: retour.ok ? ACIER : MARINE,
        }}>
          {retour.ok ? '✅ ' : '⛔ '}{retour.message}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PanneauDemander — un seul champ, deux usages
   ────────────────────────────────────────────────────
   Régis voulait deux choses qui n'en font qu'une : « pouvoir parler à
   la sentinelle » et « un tableau avec tous les pseudos et les codes,
   parce qu'on me les demande et que je ne peux pas les retenir ».

   Un seul champ répond aux deux. On tape un pseudo → sa fiche et son
   code, prêt à copier. On tape « cours », « triche », « versions » →
   la vigie répond. Et sous le champ, la liste complète des joueurs,
   filtrée au fur et à mesure de la frappe.

   Deux champs séparés auraient obligé à savoir, AVANT de taper, si on
   pose une question ou si on cherche quelqu'un. C'est une décision de
   plus, et elle ne sert à rien : le texte suffit à trancher.
═══════════════════════════════════════════════════════ */
function PanneauDemander({ onUtiliserCode, C }) {
  const [texte, setTexte]     = useState('');
  const [joueurs, setJoueurs] = useState([]);
  const [reponse, setReponse] = useState(null);
  const [copie, setCopie]     = useState(null);

  useEffect(() => { tousLesJoueurs().then(setJoueurs); }, []);

  const copier = async (code) => {
    try { await navigator.clipboard.writeText(code); setCopie(code); setTimeout(() => setCopie(null), 1500); }
    catch { /* pas de presse-papier : le code reste lisible à l'écran */ }
  };

  const repondre = async (q) => {
    setTexte(q);
    setReponse(await demander(q, joueurs));
  };

  /* Les propositions n'apparaissent QU'EN TAPANT. Un écran vide avec une
     seule barre ne demande rien à personne ; la même page couverte de
     listes force à lire avant de pouvoir chercher.

     Le mot « question » est un mot-clé : il déballe TOUT ce que la vigie
     sait répondre. C'est la porte pour qui ne sait pas quoi demander.
     Tout le reste sert à chercher une information — un joueur, un code,
     ou un sujet précis (« cours », « triche »). */
  const t = texte.trim().toLowerCase();
  const veutLaListe = /^questions?$/.test(t) || t.includes('question');

  const questions = !t ? []
    : veutLaListe ? EXEMPLES
    : EXEMPLES.filter(e => correspondQuestion(e, t));

  const trouves = (!t || veutLaListe) ? []
    : joueurs.filter(j => `${j.user_name} ${j.user_code}`.toLowerCase().includes(t)).slice(0, 8);

  return (
    <>
      <input
        value={texte}
        onChange={e => { setTexte(e.target.value); setReponse(null); }}
        onKeyDown={e => {
          if (e.key !== 'Enter') return;
          if (trouves.length) repondre(trouves[0].user_name);
          else if (questions.length) repondre(questions[0].texte);
          else repondre(texte);
        }}
        placeholder="chercher un joueur, ou poser une question…"
        style={{
          width:'100%', boxSizing:'border-box',
          background:C.card, border:`1.5px solid ${C.border}`, borderRadius:14,
          padding:'14px 15px', fontSize:14.5, color:C.text,
        }}
      />

      {/* La réponse, quand il y en a une */}
      {reponse && (
        <div style={{
          marginTop:12,
          background: reponse.type === 'inconnu' ? C.card : 'rgba(43,124,178,.10)',
          border:`1.5px solid ${reponse.type === 'inconnu' ? C.border : 'rgba(43,124,178,.4)'}`,
          borderRadius:16, padding:'14px 15px',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ flex:1, fontSize:15, fontWeight:900, color:C.text, lineHeight:1.3 }}>
              {reponse.titre}
            </div>
            {reponse.code && (
              <button
                onPointerDown={() => copier(reponse.code)}
                style={{
                  flexShrink:0, padding:'8px 12px', borderRadius:11,
                  background:'rgba(43,124,178,.18)', border:'1.5px solid rgba(43,124,178,.45)',
                  color:ACIER, fontSize:11.5, fontWeight:800,
                }}
              >{copie === reponse.code ? 'copié ✓' : 'copier'}</button>
            )}
          </div>
          <div style={{ fontSize:12.5, color:C.text, lineHeight:1.8 }}>
            {reponse.lignes.map((l, i) => <div key={i}>{l}</div>)}
          </div>
          {reponse.code && onUtiliserCode && (
            <button
              onPointerDown={() => onUtiliserCode(reponse.code)}
              style={{
                width:'100%', marginTop:11, padding:'11px 0', borderRadius:12,
                background:'transparent', border:`1.5px solid ${C.border}`,
                color:C.muted, fontSize:12.5, fontWeight:800,
              }}
            >Agir sur ce compte ›</button>
          )}
        </div>
      )}

      {/* Les propositions, tant qu'on n'a pas choisi */}
      {!reponse && t && (
        <div style={{ marginTop:10 }}>
          {questions.map(q => (
            <button
              key={q.id}
              onPointerDown={() => repondre(q.texte)}
              style={{
                width:'100%', textAlign:'left', marginBottom:7,
                background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
                padding:'12px 14px', cursor:'pointer',
                display:'flex', alignItems:'center', gap:10,
              }}
            >
              <span style={{ fontSize:14 }}>💬</span>
              <span style={{ flex:1, fontSize:13, fontWeight:700, color:C.text }}>{q.texte}</span>
              <span style={{ fontSize:13, color:C.muted }}>›</span>
            </button>
          ))}

          {trouves.map(j => (
            <button
              key={j.user_code}
              onPointerDown={() => repondre(j.user_name)}
              style={{
                width:'100%', textAlign:'left', marginBottom:7,
                background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
                padding:'11px 14px', cursor:'pointer',
                display:'flex', alignItems:'center', gap:10,
              }}
            >
              <span style={{ flex:1, minWidth:0 }}>
                <span style={{ display:'block', fontSize:13, fontWeight:800, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {j.user_name}
                </span>
                <span style={{ display:'block', fontSize:11, color:C.muted, marginTop:2 }}>
                  niveau {j.level} · {Number(j.total_earned).toLocaleString('fr-FR')} 🍪
                </span>
              </span>
              <span style={{
                flexShrink:0, fontSize:11.5, fontWeight:800, color:C.muted,
                fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}>{j.user_code}</span>
            </button>
          ))}

          {!questions.length && !trouves.length && (
            <div style={{ fontSize:12.5, color:C.muted, padding:'10px 2px', lineHeight:1.6 }}>
              Aucun joueur ni question ne correspond. Tape moins de lettres,
              ou appuie sur Entrée pour voir ce que je sais faire.
            </div>
          )}
        </div>
      )}

      {!t && (
        <div style={{ fontSize:11.5, color:C.muted, marginTop:12, lineHeight:1.6, padding:'0 2px' }}>
          Tape un pseudo ou un code pour trouver quelqu'un. Tape
          <strong style={{ color:C.text }}> question </strong>
          pour voir tout ce que je sais répondre.
        </div>
      )}
    </>
  );
}

/* ── L'ONGLET AGIR ───────────────────────────────────── */
function PanneauActions({ ouvrir, prefill, onOuvrir, phrase, setPhrase, ouverte, setOuverte, onActionReussie, C }) {
  const [verif, setVerif]   = useState(false);
  const [erreur, setErreur] = useState(null);
  /* La famille est TOUJOURS visible en haut : c'est ce qui évite de se
     perdre. On ne déplie plus une famille dans une liste, on choisit un
     rayon et on y reste. */
  const [famille, setFamille] = useState('joueur');
  const [registre, setRegistre] = useState([]);
  const [voirRegistre, setVoirRegistre] = useState(false);

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

  /* ── La serrure ───────────────────────────────────
     Même bleu que la bannière : la serrure s'affiche juste en dessous
     d'elle, et un bloc brun sous un bloc bleu se lirait comme un reste
     oublié. */
  if (!ouverte) {
    return (
      <div style={{
        position:'relative', overflow:'hidden',
        background:'linear-gradient(140deg, #E6F3FC, #B3D9F2)',
        borderRadius:20, padding:'26px 20px 22px', color:'#0E3355',
        border:'1px solid rgba(255,255,255,.7)',
        boxShadow:'0 8px 24px rgba(30,80,125,.22)',
        textAlign:'center',
      }}>
        <div className="card-cool" aria-hidden />
        <div aria-hidden style={{
          position:'absolute', right:-14, bottom:-22, fontSize:110, lineHeight:1,
          opacity:.09, pointerEvents:'none',
        }}>🔒</div>

        <div style={{ position:'relative' }}>
          <div style={{ fontSize:38, lineHeight:1, marginBottom:12 }}>🔒</div>
          <div style={{ fontSize:17, fontWeight:900, marginBottom:6 }}>Console verrouillée</div>
          <div style={{ fontSize:12.5, color:'rgba(14,51,85,.7)', lineHeight:1.6, maxWidth:290, margin:'0 auto 18px' }}>
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
              background:'rgba(255,255,255,.72)',
              border:`1.5px solid ${erreur ? 'rgba(14,51,85,.55)' : 'rgba(14,51,85,.22)'}`,
              borderRadius:13, padding:'14px 14px', fontSize:15, color:'#0E3355',
              letterSpacing:2,
            }}
          />

          <button
            onPointerDown={verifierMaintenant}
            disabled={!phrase || verif}
            style={{
              width:'100%', marginTop:11, padding:'14px 0', borderRadius:13,
              background:'#0E3355', border:'none',
              color:'#E6F3FC', fontSize:14, fontWeight:900, letterSpacing:.5,
              opacity:(!phrase || verif) ? .5 : 1, touchAction:'manipulation',
            }}
          >
            {verif ? 'Vérification…' : 'Vérifier'}
          </button>

          {erreur && (
            <div style={{ marginTop:12, fontSize:12.5, fontWeight:700, color:'#0E3355', lineHeight:1.5 }}>
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
        background:'rgba(43,124,178,.11)', border:'1.5px solid rgba(43,124,178,.4)',
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
                background: actif ? 'linear-gradient(140deg, rgba(43,124,178,.22), rgba(104,164,205,.12))' : C.card,
                border:`1.5px solid ${actif ? 'rgba(43,124,178,.5)' : C.border}`,
                display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                touchAction:'manipulation',
              }}
            >
              <span style={{ fontSize:20, lineHeight:1 }}>{x.emoji}</span>
              <span style={{ fontSize:10.5, fontWeight:800, color: actif ? ACIER : C.muted, textAlign:'center', lineHeight:1.25 }}>
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
            border:`1.5px solid ${actif ? 'rgba(43,124,178,.5)' : C.border}`,
            borderRadius:16, marginBottom:10,
          }}>
            {a.danger && <div aria-hidden style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:MARINE, opacity:.6 }} />}
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
                  onFait={() => { chargerJournal(); onActionReussie?.(); }}
                  C={C}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Le registre : c'est ce qui rend la console vérifiable. Replié
          par défaut — on vient ici pour AGIR, pas pour relire ce qu'on a
          déjà fait. Il reste à un appui quand on en a besoin. */}
      <button
        onPointerDown={() => setVoirRegistre(v => !v)}
        style={{
          width:'100%', textAlign:'left', marginTop:20,
          background:'none', border:'none', padding:'6px 2px', cursor:'pointer',
          display:'flex', alignItems:'center', gap:8,
          fontSize:11, fontWeight:800, color:C.muted,
          textTransform:'uppercase', letterSpacing:2,
        }}
      >
        <span>Ce qui a été fait{registre.length ? ` (${registre.length})` : ''}</span>
        <span style={{ letterSpacing:0, textTransform:'none', fontWeight:700, opacity:.8 }}>
          {voirRegistre ? '— masquer' : '— voir'}
        </span>
      </button>

      {!voirRegistre ? null : registre.length === 0 ? (
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
/* ── LA BOÎTE AUX LETTRES ─────────────────────────────
   Ce que les joueurs ont envoyé. C'est le seul endroit de la console où
   l'information ne vient pas d'un contrôle automatique mais d'un humain
   — et c'est précisément sa valeur : l'exploit du Memory a tenu neuf
   semaines et n'a été découvert que parce qu'un joueur l'a raconté.
   Aucune ronde ne l'aurait vu.

   Derrière la phrase de passe, comme le reste : un signalement est
   nominatif — celui qui écrit, et souvent celui qu'il accuse. Mais on
   ne la redemande pas : elle est déjà en mémoire si la console a été
   ouverte dans l'onglet Agir. */
function PanneauSignalements({ phrase, deverrouille, onAllerAgir, onUtiliserCode, C }) {
  const [filtre, setFiltre]   = useState(null);      /* null = ce qui reste à traiter */
  const [lignes, setLignes]   = useState([]);
  const [charge, setCharge]   = useState(false);
  const [message, setMessage] = useState(null);

  const charger = useCallback(async (statut) => {
    if (!phrase) return;
    setCharge(true);
    const res = await listerSignalements(phrase, statut);
    setCharge(false);
    if (!res.ok) { setMessage(res.message || 'Lecture refusée'); setLignes([]); return; }
    setMessage(null);
    setLignes(res.lignes || []);
  }, [phrase]);

  useEffect(() => { if (deverrouille) charger(filtre); }, [deverrouille, filtre, charger]);

  const classer = async (id, statut) => {
    const res = await traiterSignalement(phrase, id, statut);
    setMessage(res?.message || null);
    /* On relit plutôt que de retirer la ligne à la main : la liste et le
       compteur doivent venir de la même source, sinon ils divergent. */
    if (res?.ok) charger(filtre);
  };

  if (!deverrouille) {
    return (
      <div style={{
        background:C.card, border:`1.5px solid ${C.border}`, borderRadius:18,
        padding:'26px 20px', textAlign:'center',
      }}>
        <div style={{ fontSize:34, marginBottom:10 }}>🔒</div>
        <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:6 }}>La boîte est fermée</div>
        <div style={{ fontSize:12.5, color:C.muted, lineHeight:1.6, maxWidth:290, margin:'0 auto 16px' }}>
          Un signalement dit qui l&apos;a écrit, et souvent qui il accuse.
          Il ne se lit qu&apos;avec la phrase de passe.
        </div>
        <button
          onPointerDown={onAllerAgir}
          style={{
            padding:'12px 22px', borderRadius:13, background:MARINE,
            border:'none', color:'#EAF4FB', fontSize:13, fontWeight:900,
            touchAction:'manipulation',
          }}
        >Ouvrir la console</button>
      </div>
    );
  }

  const FILTRES = [
    [null,         '📮', 'À traiter'],
    ['traite',     '✅', 'Traités'],
    ['sans_suite', '🗄️', 'Sans suite'],
  ];

  return (
    <>
      <div style={{ display:'flex', gap:7, marginBottom:14 }}>
        {FILTRES.map(([id, emoji, label]) => {
          const actif = filtre === id;
          return (
            <button
              key={label}
              onPointerDown={() => setFiltre(id)}
              style={{
                flex:1, minWidth:0, padding:'10px 0', borderRadius:12,
                background: actif ? 'rgba(43,124,178,.18)' : C.card,
                border:`1.5px solid ${actif ? 'rgba(43,124,178,.45)' : C.border}`,
                color: actif ? ACIER : C.muted, fontSize:11.5, fontWeight:800,
                display:'flex', alignItems:'center', justifyContent:'center', gap:4,
                touchAction:'manipulation',
              }}
            >
              <span style={{ fontSize:13 }}>{emoji}</span>{label}
            </button>
          );
        })}
      </div>

      {message && (
        <div style={{
          marginBottom:12, padding:'11px 14px', borderRadius:13,
          background:'rgba(43,124,178,.11)', border:'1.5px solid rgba(43,124,178,.35)',
          fontSize:12.5, fontWeight:700, color:ACIER,
        }}>{message}</div>
      )}

      {charge && !lignes.length && (
        <div style={{ textAlign:'center', color:C.muted, fontSize:13, padding:'30px 0' }}>Lecture…</div>
      )}

      {!charge && !lignes.length && (
        <div style={{
          background:C.card, border:`1.5px solid ${C.border}`, borderRadius:18,
          padding:'26px 20px', textAlign:'center', color:C.muted, fontSize:13, lineHeight:1.7,
        }}>
          <div style={{ fontSize:30, marginBottom:8 }}>📭</div>
          {filtre === null
            ? "Rien à traiter. Personne n'a rien signalé."
            : 'Rien dans cette pile.'}
        </div>
      )}

      {lignes.map(sg => {
        const st     = STATUTS[sg.statut] || STATUTS.nouveau;
        const ctx    = sg.contexte || {};
        const extras = ctx.extras || {};
        return (
          <div key={sg.id} style={{
            background:C.card, border:`1.5px solid ${C.border}`, borderRadius:16,
            padding:'14px 15px', marginBottom:10,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:15 }}>{st.emoji}</span>
              <span style={{ fontSize:11, fontWeight:800, color:ACIER, textTransform:'uppercase', letterSpacing:1 }}>
                {st.label}
              </span>
              <span style={{ flex:1 }} />
              <span style={{ fontSize:11, color:C.muted }}>{dateCourte(sg.cree_le)}</span>
            </div>

            {/* Le chemin d'abord : il dit de quoi on parle avant même
                qu'on lise le message, et c'est lui qui trie l'urgence. */}
            <div style={{ fontSize:12.5, fontWeight:800, color:C.text, lineHeight:1.45, marginBottom:8 }}>
              {sg.chemin}
            </div>

            <div style={{
              fontSize:13, color:C.text, lineHeight:1.6, whiteSpace:'pre-wrap',
              background:C.card2, borderRadius:11, padding:'11px 12px', marginBottom:9,
            }}>{sg.message}</div>

            {!!Object.keys(extras).length && (
              <div style={{ fontSize:11.5, color:C.muted, lineHeight:1.6, marginBottom:8 }}>
                {Object.entries(extras).filter(([, v]) => v).map(([k, v]) => `${k} : ${v}`).join(' · ')}
              </div>
            )}

            {/* L'identité complète, sans avoir eu à la demander : c'est
                la moitié du travail d'enquête, et exactement ce qu'un
                joueur ne pense jamais à donner. */}
            <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}>
              {sg.user_name || '(sans pseudo)'}
              {sg.user_code ? ` · ${sg.user_code}` : ''}
              {ctx.niveau != null ? ` · niv ${ctx.niveau}` : ''}
              {sg.app_version ? ` · v${sg.app_version}` : ''}
              {ctx.plateforme ? ` · ${ctx.plateforme}` : ''}
            </div>

            <div style={{ display:'flex', gap:6, marginTop:11, flexWrap:'wrap' }}>
              {!['vu', 'traite', 'sans_suite'].includes(sg.statut) && (
                <button onPointerDown={() => classer(sg.id, 'vu')} style={boutonPetit(C, false)}>👁️ Lu</button>
              )}
              {sg.statut !== 'traite' && (
                <button onPointerDown={() => classer(sg.id, 'traite')} style={boutonPetit(C, true)}>✅ Traité</button>
              )}
              {sg.statut !== 'sans_suite' && (
                <button onPointerDown={() => classer(sg.id, 'sans_suite')} style={boutonPetit(C, false)}>🗄️ Sans suite</button>
              )}
              {(extras.joueur || sg.user_code) && (
                <button
                  onPointerDown={() => onUtiliserCode(String(extras.joueur || sg.user_code).trim().toUpperCase())}
                  style={boutonPetit(C, false)}
                >⚙️ Agir sur ce compte</button>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* Les boutons de classement : petits, nombreux, de la même famille.
   `plein` marque le seul qui range vraiment — Traité. */
function boutonPetit(C, plein) {
  return {
    padding:'8px 12px', borderRadius:11,
    background: plein ? 'rgba(43,124,178,.18)' : C.card2,
    border:`1.5px solid ${plein ? 'rgba(43,124,178,.45)' : C.border}`,
    color: plein ? ACIER : C.muted,
    fontSize:11.5, fontWeight:800, touchAction:'manipulation',
  };
}

/* Seul overlay de l'app qui ne reçoit PAS `C` : il a son thème à lui
   (cf. THEME_SENTINELLE), donc App.jsx n'a rien à lui passer. Le nom
   reste `C` en interne pour que les sous-composants, eux, gardent la
   signature de tous les autres. */
export function SentinelleOverlay({ onClose }) {
  const C = THEME_SENTINELLE;
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
  const [voirRanges, setVoirRanges]  = useState(false);
  const [registre, setRegistre]      = useState([]);

  const charger = useCallback(async () => {
    setChargement(true);
    const [rap, ign, reg] = await Promise.all([derniersRapports(200), listerIgnores(), journal(40)]);
    setRegistre(reg);
    const rondes = grouperParRonde(rap);
    setIgnores(ign);
    setHistorique(rondes);
    setRapports(rondes.length ? rondes[0].verdicts : []);
    setHorodatage(rondes.length ? rondes[0].instant : null);
    setImmediat(false);
    setChargement(false);
  }, []);

  useEffect(() => { charger(); }, [charger]);

  /* Revenir sur l'onglet État après avoir agi ailleurs doit montrer
     l'état d'APRÈS. On recharge si ce qui est affiché a plus d'une
     minute — assez pour ne pas marteler la base en passant d'un onglet
     à l'autre, assez peu pour ne jamais mentir. */
  useEffect(() => {
    if (onglet !== 'etat' || !horodatage) return;
    if (Date.now() - new Date(horodatage).getTime() > 60_000) charger();
  }, [onglet]);   // eslint-disable-line react-hooks/exhaustive-deps

  /* Une ronde à la demande doit DIRE ce qu'elle a trouvé de neuf.
     Régis : « quand je relance le sentinel, il n'y a pas de vrai
     changement » — parce que rien ne le disait. Un contrôle qui rend le
     même écran sans un mot laisse croire qu'il n'a pas tourné. */
  /* Une ronde à la demande CONSTATE et ENREGISTRE si la situation a
     changé. C'est ce qui manquait : sans écriture, l'écran montrait la
     réalité pendant qu'on le regardait, puis ressortait les vieux
     problèmes déjà réglés dès qu'on le rouvrait. */
  const controler = async () => {
    setEnCours(true);
    setMessage(null);
    const avant = new Set(rapports.filter(r => r.verdict !== 'ok').map(signatureConstat));
    const frais = await faireUneRonde({ enregistrer: false });
    const nouveaux = frais.filter(r => r.verdict !== 'ok' && !avant.has(signatureConstat(r)));
    const partis   = [...avant].filter(sig => !frais.some(r => signatureConstat(r) === sig));

    const ecrit = await enregistrerSiDifferent(frais);
    if (ecrit) {
      /* Rechargé depuis la base plutôt que posé de mémoire : les dates
         d'apparition et les constats classés sans suite doivent venir
         de la même source, sinon l'ancienneté affichée serait fausse. */
      await charger();
    } else {
      setRapports(frais);
      setHorodatage(new Date().toISOString());
      setImmediat(true);
    }
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

  const ouverts   = tries.filter(r => r.verdict !== 'ok' && !estIgnore(r));
  const traiteDe  = (r) => dejaTraite(r, anciennete(historique, r), registre);

  /* Ce sur quoi on a déjà agi sort de « à traiter » : sinon on relit
     chaque soir une ligne qu'on a réglée le matin, et on finit par ne
     plus distinguer ce qui attend de ce qui est fait. */
  const problemes = ouverts.filter(r => !traiteDe(r));
  const enAttente = ouverts.filter(r => traiteDe(r));
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

  /* ── Le bleu de la Sentinelle ──────────────────────────────────
     La seule surface de l'app qui sorte de la palette café, et c'est
     exactement le but : quand ce bleu apparaît, on n'est plus dans le
     jeu, on est dans l'outil. Aucune confusion possible avec une
     récompense ou une bannière de boutique.

     Fond clair, encre marine — et pas l'inverse. Sur un téléphone en
     plein soleil, du texte foncé sur fond clair se lit mieux que du
     blanc sur brun, ce qui compte pour un écran qu'on ouvre justement
     quand quelque chose ne va pas.

     La gravité se dit par la profondeur du bleu, jamais par du rouge :
     la règle café-only interdit le rouge partout, y compris ici. */
  const BLEU_FOND  = grave
    ? 'linear-gradient(140deg, #B7D6EE, #78AFD6)'
    : 'linear-gradient(140deg, #E6F3FC, #B3D9F2)';
  const ENCRE      = '#0E3355';
  const ENCRE_DOUX = 'rgba(14,51,85,.66)';

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

        {/* LA RÉPONSE, en grand, avant tout le reste. Bandeau bleu qui
            accroche la lumière — même construction que la bannière du
            marché et la carte de niveau, teinte à part (cf. BLEU_FOND). */}
        <div style={{
          position:'relative', overflow:'hidden',
          background: BLEU_FOND,
          borderRadius:20, padding:'20px 20px 18px', color:ENCRE, marginBottom:16,
          border:'1px solid rgba(255,255,255,.7)',
          boxShadow:'0 8px 24px rgba(30,80,125,.22)',
        }}>
          <div className="card-cool" aria-hidden />
          <div className="card-sheen-cool" aria-hidden />
          {/* Emoji géant en filigrane : la signature des cartes de la
              1.30, ce qui fait qu'un bloc n'est pas un rectangle vide.
              Un peu plus opaque qu'ailleurs — sur fond clair, .1 le
              rendrait invisible. */}
          <div aria-hidden style={{
            position:'absolute', right:-10, bottom:-26, fontSize:118, lineHeight:1,
            opacity:.16, pointerEvents:'none',
          }}>🛡️</div>

          <div style={{ position:'relative', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:34, lineHeight:1, flexShrink:0 }}>
              {chargement ? '🛡️' : grave ? '⛔' : problemes.length ? '⚠️' : '✅'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:22, fontWeight:900, lineHeight:1.15, letterSpacing:-.3 }}>{titre}</div>
              <div style={{ fontSize:11.5, color:ENCRE_DOUX, marginTop:4, lineHeight:1.45 }}>
                {sousTitre}
              </div>
            </div>
            <button
              onPointerDown={() => !enCours && controler()}
              disabled={enCours}
              aria-label="Contrôler maintenant"
              style={{
                flexShrink:0, width:44, height:44, borderRadius:14,
                background:'rgba(255,255,255,.55)', border:'1.5px solid rgba(14,51,85,.22)',
                color:ENCRE, display:'flex', alignItems:'center', justifyContent:'center',
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
            background:'rgba(43,124,178,.11)', border:'1.5px solid rgba(43,124,178,.35)',
            fontSize:12.5, fontWeight:700, color:ACIER,
          }}>
            ↻ {resultatRonde}
          </div>
        )}

        {/* Deux onglets, gros et lisibles */}
        <div style={{ display:'flex', gap:6, marginBottom:6 }}>
          {[['etat', '🔍', 'État'], ['demander', '💬', 'Demander'], ['boite', '📮', 'Boîte'], ['agir', '⚙️', 'Agir']].map(([id, emoji, label]) => {
            const actif = onglet === id;
            return (
              <button
                key={id}
                onPointerDown={() => setOnglet(id)}
                style={{
                  flex:1, minWidth:0, padding:'12px 0', borderRadius:14,
                  background: actif ? 'linear-gradient(140deg, rgba(43,124,178,.22), rgba(104,164,205,.12))' : C.card,
                  border:`1.5px solid ${actif ? 'rgba(43,124,178,.5)' : C.border}`,
                  color: actif ? ACIER : C.muted, fontSize:11.5, fontWeight:800,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:4,
                  touchAction:'manipulation',
                }}
              >
                <span style={{ fontSize:14 }}>{emoji}</span>{label}
              </button>
            );
          })}
        </div>

        {onglet === 'boite' ? (
          <div style={{ marginTop:16 }}>
            <PanneauSignalements
              phrase={phrase}
              deverrouille={deverrouille}
              onAllerAgir={() => setOnglet('agir')}
              onUtiliserCode={(code) => { setPrefill(code); setActionOuverte('sanctionner'); setOnglet('agir'); }}
              C={C}
            />
          </div>
        ) : onglet === 'demander' ? (
          <div style={{ marginTop:16 }}>
            <PanneauDemander
              onUtiliserCode={(code) => { setPrefill(code); setActionOuverte('sanctionner'); setOnglet('agir'); }}
              C={C}
            />
          </div>
        ) : onglet === 'agir' ? (
          <div style={{ marginTop:16 }}>
            <PanneauActions
              ouvrir={actionOuverte} prefill={prefill} onOuvrir={setActionOuverte}
              phrase={phrase} setPhrase={setPhrase}
              ouverte={deverrouille} setOuverte={setDeverr}
              onActionReussie={controler}
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
                traite={null}
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
                    background:'rgba(43,124,178,.08)', border:'1.5px solid rgba(43,124,178,.28)',
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
            {enAttente.length > 0 && (
              <>
                <Section C={C}>Traité — en attente d'effet</Section>
                {enAttente.map((r, i) => (
                  <Constat
                    key={r.id ?? `att${i}`}
                    r={r}
                    age={immediat ? null : anciennete(historique, r)}
                    traite={traiteDe(r)}
                    onAgir={allerAgir}
                    onClasser={deverrouille ? classer : null}
                    C={C}
                  />
                ))}
              </>
            )}

            {ranges.length > 0 && (
              <>
                {/* Replié par défaut : ce qu'on a déjà jugé normal n'a
                    pas à occuper la place de ce qui reste à traiter.
                    C'est justement pour ça qu'on l'a classé. */}
                <button
                  onPointerDown={() => setVoirRanges(v => !v)}
                  style={{
                    width:'100%', textAlign:'left', marginTop:18,
                    background:'none', border:'none', padding:'6px 2px', cursor:'pointer',
                    display:'flex', alignItems:'center', gap:8,
                    fontSize:11, fontWeight:800, color:C.muted,
                    textTransform:'uppercase', letterSpacing:2,
                  }}
                >
                  <span>{ranges.length} classé{ranges.length > 1 ? 's' : ''} sans suite</span>
                  <span style={{ letterSpacing:0, textTransform:'none', fontWeight:700, opacity:.8 }}>
                    {voirRanges ? '— masquer' : '— voir'}
                  </span>
                </button>
                {voirRanges && ranges.map((r, i) => {
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
                background:'rgba(30,80,125,.14)', border:'1.5px solid rgba(14,51,85,.5)', color:MARINE,
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

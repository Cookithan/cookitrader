import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, RefreshCw, Send, Lock } from "lucide-react";
import { verifierPhrase, faitsSentinelle } from "../../lib/sentinelle.js";
import { THEME_SENTINELLE, ACIER, MARINE, BLEU, FOND, VERRE, OMBRE, OMBRE_VIVE, DEGRADE, CHAMP } from "../../data/sentinelleTheme.js";
/* `parlerSentinelle` a déménagé dans SentinelleDialogue avec la feuille. */
import { tableauSentinelle, deciderDossier, demanderDossier } from "../../lib/sentinelleIA.js";
import { playSound } from "../../lib/audio.js";
import { haptic } from "../../lib/haptic.js";
import { useSwipe } from "../../hooks/useSwipe.js";
import { SentinelleBienvenue } from "../SentinelleBienvenue.jsx";
import { SentinelleCoupDoeil } from "./SentinelleCoupDoeil.jsx";
import { SentinelleDialogue, ElleEcrit } from "./SentinelleDialogue.jsx";

/* ════════════════════════════════════════════════════
   SentinelleTableau — trois pages, et elle qui te les présente
   ────────────────────────────────────────────────────
   Cookithan, le 09/09 : « l'entrée est top, mais le tap de story marche mal
   sur mobile, je veux qu'on me demande la phrase APRÈS l'animation, et
   fais une belle interface — trop fade sérieux ».

   L'ORDRE
     le bouclier se réveille (l'entrée, gardée telle quelle) → puis la
     phrase, sur son propre écran → puis les pages. Elle se présente
     avant de demander quelque chose : c'est elle qui vient à toi.

   LA NAVIGATION DES STORIES
     plus de zones tapables invisibles. Sur mobile, `offsetX` ment (il
     mesure depuis la cible réelle, pas depuis la carte) et le doigt
     tombait à côté une fois sur deux. Deux VRAIES flèches en pied de
     carte, 44 px, avec le compteur entre elles. Le swipe reste pour
     changer de page.

   LA PEAU
     fond en dégradé avec un halo qui respire, cartes en verre, bandeau
     dégradé en tête, chiffres qui prennent de la place, chaque genre de
     dossier avec sa teinte. Le bleu acier reste l'identité de la
     Sentinelle — mais avec de la profondeur, pas du papier blanc.
     L'échelle complète vit dans data/sentinelleTheme.js.

   LE CONTOUR DES CARTES EST BLEU, PAS BLANC
     Il était blanc. Sur un fond bleu très pâle, un trait blanc ne se
     voit pas : les cartes n'avaient plus de bord et l'écran passait
     pour plat, quel qu'en soit le contenu. Un trait bleu clair les
     redécoupe sans les alourdir.

   LE FLOU COÛTE, ON LE RÉSERVE
     `backdrop-filter` est ce qu'il y a de plus cher à composer sur
     mobile. Il y en avait sur les cinq bandes de la page 2 — donc cinq
     couches floutées empilées, dans un conteneur qui défile, par-dessus
     deux halos animés. Il ne reste que sur ce qui FLOTTE au-dessus du
     reste (la barre du bas, la carte de réponse) : là il se justifie,
     et il n'y en a jamais deux qui défilent en même temps.
     Jugé au raisonnement, pas au profileur — je n'ai pas mesuré sur son
     téléphone.

   Props : onClose, userName
═══════════════════════════════════════════════════════ */

const C = THEME_SENTINELLE;
const LOURDS = ['sanctionner', 'lever_sanction', 'modifier_joueur', 'corriger_cours', 'maintenance', 'forcer_maj', 'creer_code_promo', 'desactiver_code_promo'];
/* La PREMIÈRE page ne coûte rien. C'est délibéré : ouvrir la console
   appelait le modèle avant même qu'on ait regardé quoi que ce soit, donc
   venir vérifier une seule chose coûtait un tour complet. On atterrit
   maintenant sur ce qui se lit gratuitement, et son point se demande. */
const PAGES = ["Coup d'œil", "Ce qui t'attend", "L'app en vie", 'La journée'];
const N = PAGES.length;
const ELLE = 1;   /* l'index de sa page — les suivantes vivent de son point */

/* Le contour d'une carte posée sur le fond. */
const CONTOUR = `1.5px solid ${BLEU[200]}`;
const CONTOUR_VIF = `1.5px solid ${BLEU[300]}`;

/* Chaque genre a sa teinte : un écran d'une seule couleur est un écran
   fade, même bien dessiné. */
const GENRES = {
  triche:      { emoji: '🕵️', mot: 'Triche',       t: '#8A5A00', f: 'linear-gradient(135deg,#F2C879,#D99B2B)' },
  marche:      { emoji: '📈', mot: 'Marché',       t: '#0F5F6B', f: 'linear-gradient(135deg,#6FC6D6,#1E8FA3)' },
  signalement: { emoji: '📮', mot: 'Signalement',  t: '#1B5E8C', f: 'linear-gradient(135deg,#7EC0EA,#2E86BF)' },
  joueur:      { emoji: '👤', mot: 'Joueur',       t: '#3E4E8C', f: 'linear-gradient(135deg,#9FB0E8,#4A5FC1)' },
  app:         { emoji: '📱', mot: "L'app",        t: '#5B4A8C', f: 'linear-gradient(135deg,#B7A6E6,#6E58BE)' },
  info:        { emoji: '💬', mot: 'À savoir',     t: '#3E6B4E', f: 'linear-gradient(135deg,#9ED8B4,#3E8E63)' },
};
const genre = (g) => GENRES[g] || GENRES.info;

/* ── pastilles de gestes ───────────────────────────── */
function pastille(a) {
  const r = a?.resultat || {};
  const ok = r.ok !== false && !r.refus;
  const e = a?.entree || {};
  if (a.outil === 'lire_joueur')         return { texte: `a regardé ${e.code_ou_pseudo ?? '?'}`, ton: 'lecture' };
  if (a.outil === 'lire_signalements')   return { texte: 'a relu les signalements', ton: 'lecture' };
  if (a.outil === 'retenir')             return { texte: ok ? 'noté' : 'note refusée', ton: ok ? 'fait' : 'refus' };
  if (a.outil === 'ecrire_au_joueur')    return { texte: ok ? `✉ message déposé chez ${e.user_code}` : `✗ message — ${r.message ?? ''}`, ton: ok ? 'fait' : 'refus' };
  if (a.outil === 'traiter_signalement') return { texte: ok ? `#${e.id} → ${e.statut}` : `✗ #${e.id} — ${r.message ?? ''}`, ton: ok ? 'fait' : 'refus' };
  if (a.outil === 'agir') {
    const nom = e.action ?? '?';
    if (r.refus) return { texte: `${nom} — attend ton accord`, ton: 'attente' };
    return { texte: ok ? `✓ ${nom}${r.message ? ' · ' + r.message : ''}` : `✗ ${nom} — ${r.message ?? 'refusé'}`, ton: ok ? 'fait' : 'refus' };
  }
  return { texte: a.outil, ton: 'lecture' };
}
const TONS = {
  fait:    { background: 'linear-gradient(135deg,rgba(46,134,191,.16),rgba(27,94,140,.10))', color: ACIER, border: '1.5px solid rgba(46,134,191,.42)' },
  attente: { background: '#FFF', color: MARINE, border: `1.5px dashed ${ACIER}` },
  refus:   { background: BLEU[100], color: C.muted, border: `1.5px solid ${BLEU[200]}` },
  lecture: { background: 'rgba(255,255,255,.7)', color: C.muted, border: `1.5px solid ${BLEU[200]}` },
};
function Pastilles({ actions }) {
  if (!Array.isArray(actions) || !actions.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
      {actions.map((a, k) => { const p = pastille(a); return <span key={k} style={{ ...TONS[p.ton], padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{p.texte}</span>; })}
    </div>
  );
}

/* ── son mot, qui s'écrit ──────────────────────────── */
function MotQuiSecrit({ texte, vitesse = 55, onFini }) {
  const mots = String(texte || '').split(/\s+/).filter(Boolean);
  const [n, setN] = useState(0);
  const finiRef = useRef(onFini);
  useEffect(() => { finiRef.current = onFini; }, [onFini]);
  /* Pas de remise à zéro ici : le parent remonte le composant (key)
     quand le mot change, ce qui repart de zéro sans setState d'effet. */
  useEffect(() => {
    if (!mots.length) { finiRef.current?.(); return; }
    const pas = mots.length > 28 ? 2 : 1;
    const id = setInterval(() => {
      setN(k => {
        const s = Math.min(mots.length, k + pas);
        if (s >= mots.length) { clearInterval(id); finiRef.current?.(); }
        return s;
      });
    }, vitesse);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texte]);
  return <span>{mots.slice(0, n).join(' ')}{n < mots.length && <span className="s-curseur" />}</span>;
}

/* ── elle regarde ──────────────────────────────────
   Son point demande une dizaine de secondes. Il n'y avait qu'une ligne
   de texte qui pulsait pendant ce temps-là, ce qui ressemble beaucoup à
   une page plantée. Le bouclier balaye, et les étapes défilent.

   Les étapes ne sont PAS un décompte : on ne sait pas où elle en est,
   et prétendre le contraire (une barre de progression, un pourcentage)
   serait mentir. Elles disent ce qu'elle fait, dans l'ordre où elle le
   fait, et la dernière reste tant que ça dure. */
const ETAPES = [
  'elle lit la base…',
  'elle regarde les joueurs…',
  'elle relit les signalements…',
  'elle vérifie le marché…',
  'elle prépare ses dossiers…',
];
function ElleRegarde() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI(k => Math.min(ETAPES.length - 1, k + 1)), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {[0, 1, 2].map(k => (
          <div key={k} className="s-onde" aria-hidden
            style={{ '--onde': `${k * 0.73}s`, position: 'absolute', width: 66, height: 66, borderRadius: '50%', border: `2px solid ${BLEU[400]}` }} />
        ))}
        <div className="s-scrute" style={{ position: 'relative', width: 66, height: 66, borderRadius: 21, background: DEGRADE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 31, boxShadow: OMBRE_VIVE, border: '1.5px solid rgba(255,255,255,.5)' }}>🛡️</div>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: ACIER, textAlign: 'center', minHeight: 19 }}>{ETAPES[i]}</div>
      <div style={{ fontSize: 11.5, color: C.muted, textAlign: 'center', maxWidth: 230, lineHeight: 1.5 }}>
        Elle traverse tout avant de te parler. C'est ce qui fait qu'elle
        ne te remonte que ce qui compte.
      </div>
    </div>
  );
}

/* ── un dossier ────────────────────────────────────── */
function Dossier({ d, phrase, onFerme, story = false }) {
  const [ouvert, setOuvert]     = useState(story);
  const [question, setQuestion] = useState('');
  const [echanges, setEchanges] = useState(Array.isArray(d.echanges) ? d.echanges : []);
  const [attente, setAttente]   = useState(false);
  const [enCours, setEnCours]   = useState(null);
  const [resultat, setResultat] = useState(null);
  const [confirme, setConfirme] = useState(false);
  const lourd = Array.isArray(d.actions) && d.actions.some(a => a.outil === 'agir' && LOURDS.includes(a.entree?.action));

  const agir = async () => {
    if (enCours) return;
    if (lourd && !confirme) { setConfirme(true); haptic('light'); return; }
    setEnCours('agir');
    const r = await deciderDossier(phrase, d.id, 'agir');
    setEnCours(null);
    if (!r.ok) { setResultat({ erreur: r.message }); playSound('error'); return; }
    setResultat(r);
    playSound(r.tousOk ? 'success' : 'error'); haptic(r.tousOk ? 'success' : 'warning');
    setTimeout(() => onFerme(d.id), 1300);
  };
  const classer = async () => {
    if (enCours) return;
    setEnCours('classer');
    const r = await deciderDossier(phrase, d.id, 'classer');
    setEnCours(null);
    if (!r.ok) { playSound('error'); return; }
    playSound('toggle'); onFerme(d.id);
  };
  const demander = async () => {
    const q = question.trim();
    if (!q || attente) return;
    setQuestion(''); setEchanges(e => [...e, { qui: 'regis', texte: q }]); setAttente(true);
    const r = await demanderDossier(phrase, d.id, q);
    setAttente(false);
    if (!r.ok) { setEchanges(e => [...e, { qui: 'sentinelle', texte: r.message, erreur: true }]); playSound('error'); return; }
    setEchanges(r.echanges || []); playSound('bubble');
  };
  const g = genre(d.genre);

  return (
    <div style={{ marginTop: story ? 0 : 10, background: story ? 'transparent' : VERRE, border: story ? 'none' : `1.5px solid rgba(46,134,191,.34)`, borderRadius: 16, boxShadow: story ? 'none' : OMBRE, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: story ? 1 : 'none', minHeight: 0 }}>
      {!story && (
        <button onClick={() => setOuvert(o => !o)} style={{ width: '100%', textAlign: 'left', padding: '12px 13px 9px', background: 'transparent', border: 'none', color: C.text, touchAction: 'manipulation' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>
            <span className="live-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: g.f, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{d.titre}</span>
            <ChevronDown size={15} color={C.muted} style={{ transform: ouvert ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
          </div>
        </button>
      )}
      {ouvert && (
        <div style={{ padding: story ? 0 : '0 13px 11px', flex: story ? 1 : 'none', minHeight: 0, overflowY: story ? 'auto' : 'visible', overscrollBehavior: 'contain' }}>
          <div style={{ fontSize: story ? 14.5 : 13, lineHeight: 1.6, color: C.text, opacity: .92 }}>{d.explication}</div>
          {echanges.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12 }}>
              {echanges.map((e, k) => (
                <div key={k} style={{ display: 'flex', justifyContent: e.qui === 'regis' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '88%', padding: '8px 12px', borderRadius: 14, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', background: e.qui === 'regis' ? DEGRADE : '#fff', color: e.qui === 'regis' ? '#fff' : C.text, border: e.qui === 'regis' ? 'none' : `1px solid ${C.border}`, boxShadow: e.qui === 'regis' ? '0 3px 10px rgba(27,94,140,.24)' : 'none' }}>
                    {e.texte}{e.qui !== 'regis' && <Pastilles actions={e.actions} />}
                  </div>
                </div>
              ))}
            </div>
          )}
          {attente && <div style={{ marginTop: 9 }}><ElleEcrit taille={13} /></div>}
          <div style={{ display: 'flex', gap: 7, marginTop: 11 }}>
            <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') demander(); }} placeholder="pourquoi ? / fais plutôt…"
              style={{ flex: 1, padding: '10px 13px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: '#fff', color: C.text, fontSize: CHAMP, outline: 'none' }} />
            <button onClick={demander} disabled={!question.trim() || attente} style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: question.trim() && !attente ? DEGRADE : C.card2, color: question.trim() && !attente ? '#fff' : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation', flexShrink: 0 }}><Send size={15} /></button>
          </div>
        </div>
      )}
      {resultat ? (
        <div style={{ padding: story ? '13px 0 0' : '9px 13px 13px', borderTop: `1px solid ${C.trait}`, marginTop: story ? 13 : 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 900, color: resultat.erreur ? C.muted : ACIER }}>{resultat.erreur ? `✗ ${resultat.erreur}` : (resultat.tousOk ? '✓ fait' : '△ fait en partie')}</div>
          <Pastilles actions={resultat.resultats} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, padding: story ? '14px 0 0' : '2px 13px 13px' }}>
          {Array.isArray(d.actions) && d.actions.length > 0 && (
            <button onClick={agir} disabled={!!enCours} className={enCours ? undefined : 's-eclat'} style={{ position: 'relative', overflow: 'hidden', flex: 1, padding: story ? '16px 10px' : '12px 8px', borderRadius: 15, border: 'none', fontSize: story ? 14.5 : 13, fontWeight: 900, background: confirme ? `linear-gradient(135deg,${MARINE},#071E33)` : DEGRADE, color: '#fff', opacity: enCours ? .6 : 1, touchAction: 'manipulation', boxShadow: OMBRE_VIVE, letterSpacing: .2 }}>
              {enCours === 'agir' ? '…' : confirme ? 'Confirmer' : d.proposition}
            </button>
          )}
          <button onClick={classer} disabled={!!enCours} style={{ flex: Array.isArray(d.actions) && d.actions.length ? 0.48 : 1, padding: story ? '16px 10px' : '12px 8px', borderRadius: 15, border: `1.5px solid ${C.border}`, background: 'rgba(255,255,255,.9)', color: C.text, fontSize: story ? 14 : 13, fontWeight: 800, opacity: enCours ? .6 : 1, touchAction: 'manipulation' }}>
            {enCours === 'classer' ? '…' : 'Classer'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── une bande du tableau ──────────────────────────── */
function Bande({ emoji, titre, teinte, allumee, phrase, i, children }) {
  return (
    <section className={`s-monte stagger-${(i % 4) + 1}`} style={{ background: VERRE, border: allumee ? `1.5px solid ${BLEU[500]}` : CONTOUR, borderRadius: 20, padding: '13px 15px 15px', boxShadow: allumee ? OMBRE_VIVE : OMBRE }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <span style={{ width: 28, height: 28, borderRadius: 9, background: teinte, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, boxShadow: '0 3px 8px rgba(14,51,85,.18)' }}>{emoji}</span>
        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.4, textTransform: 'uppercase', color: MARINE }}>{titre}</span>
        {allumee && <span className="live-pulse" style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 900, color: '#fff', background: DEGRADE, padding: '3px 9px', borderRadius: 20 }}>À DÉCIDER</span>}
      </div>
      {children}
      {phrase && <div style={{ marginTop: 11, paddingTop: 10, borderTop: `1px solid ${C.trait}`, fontSize: 13, lineHeight: 1.5, color: MARINE, fontWeight: 600, fontStyle: 'italic' }}>« {phrase} »</div>}
    </section>
  );
}
function Courbe({ points }) {
  if (!Array.isArray(points) || points.length < 2) return <div style={{ height: 40 }} />;
  const min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const W = 300, H = 40;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * W, H - ((p - min) / span) * (H - 8) - 4]);
  const ligne = xy.map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, display: 'block' }}>
      <defs><linearGradient id="sCourbe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(46,134,191,.34)" /><stop offset="100%" stopColor="rgba(46,134,191,0)" /></linearGradient></defs>
      <polygon points={`0,${H} ${ligne} ${W},${H}`} fill="url(#sCourbe)" />
      <polyline points={ligne} fill="none" stroke={ACIER} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
const heure = (iso) => iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
const ACTEUR = { sentinelle: { e: '●', c: ACIER }, regis: { e: '◆', c: MARINE }, joueur: { e: '○', c: C.muted }, ronde: { e: '▲', c: C.muted }, app: { e: '□', c: C.muted } };

/* ── l'écran ───────────────────────────────────────── */
export function SentinelleTableau({ onClose, userName }) {
  const [phrase, setPhrase]   = useState('');
  /* L'entrée D'ABORD : elle se présente, ensuite elle demande. */
  const [etape, setEtape]     = useState('reveil');   // reveil | porte | pages
  const [verif, setVerif]     = useState(false);
  const [erreurPorte, setErreurPorte] = useState(null);
  const [t, setT]             = useState(null);
  const [faits, setFaits]     = useState(null);   /* les FAITS, lus sans elle */
  const [chargement, setChargement] = useState(false);
  const [fermes, setFermes]   = useState({});
  const [page, setPage]       = useState(0);
  const [story, setStory]     = useState(0);
  const [motEcrit, setMotEcrit] = useState(false);
  const [toutVoir, setToutVoir] = useState(false);
  /* La conversation vit ICI et pas dans la feuille : la refermer ne doit
     pas effacer ce qu'elle vient de dire. */
  const [dialogue, setDialogue] = useState(false);
  const [echangesLibres, setEchangesLibres] = useState([]);

  const charger = async (forcer = false) => {
    setChargement(true);
    const r = await tableauSentinelle(phrase, { forcer });
    setChargement(false);
    if (!r.ok) { setT({ erreur: r.message, dossiers: [], evenements: [] }); playSound('error'); return; }
    setT(r); setFermes({}); setStory(0); setMotEcrit(false);
    if (r.dossiers?.length) playSound('bubble');
  };
  /* Relire les faits ne coûte rien : c'est de la lecture de base. On le
     sépare volontairement de `charger`, qui appelle le modèle — deux
     gestes de coûts différents ne doivent pas partager un bouton. */
  const [relit, setRelit] = useState(false);
  const relireFaits = async () => {
    if (relit) return;
    setRelit(true);
    setFaits(await faitsSentinelle(phrase));
    setRelit(false);
  };

  const entrer = async () => {
    if (!phrase || verif) return;
    setVerif(true); setErreurPorte(null);
    const r = await verifierPhrase(phrase);
    setVerif(false);
    if (!r.ok) { setErreurPorte(r.message); playSound('error'); haptic('warning'); return; }
    playSound('modal'); haptic('success');
    setEtape('pages');
    /* On ne demande PAS son point : c'est tout l'objet du coup d'œil, la
       porte s'ouvre sur ce qui est gratuit et c'est un tap explicite qui
       dépense. Les FAITS, eux, se lisent sans elle — donc on les prend
       tout de suite, sans rien demander à personne. */
    faitsSentinelle(phrase).then(setFaits);
  };

  const { ref: swipeRef, handlers: swipeHandlers } = useSwipe({
    enabled: etape === 'pages',
    onLeft:  () => setPage(p => Math.min(N - 1, p + 1)),
    onRight: () => setPage(p => Math.max(0, p - 1)),
    threshold: 50,
  });


  const dossiers = (t?.dossiers || []).filter(d => !fermes[d.id]);
  const ferme = (id) => { setFermes(f => ({ ...f, [id]: true })); setStory(s => Math.max(0, Math.min(s, dossiers.length - 2))); };
  /* Sa lecture ÉCRASE les faits là où elle en a : son tableau porte les
     mêmes champs, plus frais s'il vient d'être rédigé. Là où elle n'a
     rien dit, les faits gratuits restent. L'écran n'a donc jamais à
     savoir laquelle des deux sources il affiche. */
  const vue = (faits || t) ? { ...(faits || {}), ...(t || {}) } : null;
  const b = t?.bandes || {};
  const evenements = vue?.evenements || [];
  const frise = Array.isArray(t?.frise) ? t.frise : [];
  const dJ = dossiers.filter(d => ['triche', 'joueur'].includes(d.genre));
  const iStory = Math.min(story, Math.max(0, dossiers.length - 1));
  const courant = dossiers[iStory];
  const g = courant ? genre(courant.genre) : null;

  return (
    <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, bottom: 0, background: FOND, zIndex: 62, display: 'flex', flexDirection: 'column', color: C.text, overflow: 'hidden' }}>

      {/* les halos qui respirent, derrière tout */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div className="s-souffle" style={{ position: 'absolute', top: '-14%', left: '-24%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(46,134,191,.20), transparent 70%)' }} />
        <div className="s-souffle" style={{ position: 'absolute', bottom: '-16%', right: '-22%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(110,88,190,.14), transparent 70%)', animationDelay: '3s' }} />
      </div>

      {etape === 'reveil' && <SentinelleBienvenue nom={userName} admin onFini={() => setEtape('porte')} />}

      {etape === 'pages' && dialogue && (
        <SentinelleDialogue phrase={phrase} onFermer={() => setDialogue(false)}
          echanges={echangesLibres} setEchanges={setEchangesLibres} />
      )}

      {/* en-tête */}
      {etape === 'pages' && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', background: DEGRADE, flexShrink: 0, boxShadow: '0 4px 18px rgba(20,73,109,.28)' }}>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,.18)', border: '1.5px solid rgba(255,255,255,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><ChevronLeft size={20} /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.1, color: '#fff', letterSpacing: -.2 }}>{PAGES[page]}</div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.72)', marginTop: 2 }}>{page === 0 ? 'lecture directe · rien de dépensé' : chargement ? 'elle regarde tout…' : t?.rediges_le ? `son point de ${heure(t.rediges_le)}` : page === ELLE ? 'pas encore de point' : 'les faits · rien de dépensé'}</div>
          </div>
          {/* Sur SA page, il refait son point — et ça se paye. Partout
              ailleurs il relit les faits, et ça ne coûte rien. Le même
              bouton pour deux prix différents serait un piège. */}
          {page !== 0 && (() => {
            const paye = page === ELLE;
            const occupe = paye ? chargement : relit;
            return (
              <button onClick={() => !occupe && (paye ? charger(true) : relireFaits())} disabled={occupe}
                aria-label={paye ? 'Refaire le point' : 'Relire les faits'}
                style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,.18)', border: '1.5px solid rgba(255,255,255,.28)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: occupe ? .5 : 1, touchAction: 'manipulation' }}>
                <RefreshCw size={16} style={occupe ? { animation: 'premiumRay 1.1s linear infinite' } : undefined} />
              </button>
            );
          })()}
        </div>
      )}

      {/* ── la phrase, APRÈS l'entrée ── */}
      {etape === 'porte' && (
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px', gap: 0 }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 14, left: 14, width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,.7)', border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}><ChevronLeft size={20} /></button>

          <div className="s-monte" style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <div style={{ width: 62, height: 62, borderRadius: 20, background: DEGRADE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, boxShadow: OMBRE_VIVE, border: '1.5px solid rgba(255,255,255,.5)' }}>🛡️</div>
          </div>
          <div className="s-monte stagger-1" style={{ fontSize: 25, fontWeight: 900, lineHeight: 1.2, letterSpacing: -.6, color: MARINE, textAlign: 'center' }}>On est entre nous.</div>
          <div className="s-monte stagger-2" style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.55, marginTop: 10, textAlign: 'center' }}>
            J'ai fait ma ronde. Ta phrase, et je te montre ce qui t'attend.
          </div>

          <div className="s-monte stagger-3" style={{ position: 'relative', marginTop: 26 }}>
            <Lock size={16} color={C.muted} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type="password" value={phrase} onChange={e => { setPhrase(e.target.value); setErreurPorte(null); }} onKeyDown={e => { if (e.key === 'Enter') entrer(); }} placeholder="ta phrase de passe" autoFocus
              style={{ width: '100%', boxSizing: 'border-box', padding: '15px 16px 15px 42px', borderRadius: 16, border: `1.5px solid ${erreurPorte ? MARINE : (phrase ? ACIER : C.border)}`, background: 'rgba(255,255,255,.92)', color: C.text, fontSize: CHAMP, outline: 'none', boxShadow: phrase ? '0 6px 22px rgba(27,94,140,.16)' : '0 2px 10px rgba(14,51,85,.06)', transition: 'border-color .2s, box-shadow .2s' }} />
          </div>
          {erreurPorte && <div className="s-monte" style={{ fontSize: 12.5, color: MARINE, fontWeight: 700, marginTop: 10, textAlign: 'center' }}>{erreurPorte}</div>}

          <button className={`s-monte stagger-4${(!phrase || verif) ? '' : ' s-eclat'}`} onClick={entrer} disabled={!phrase || verif}
            style={{ position: 'relative', overflow: 'hidden', marginTop: 14, padding: '16px', borderRadius: 17, border: 'none', fontSize: 15, fontWeight: 900, letterSpacing: .3, background: (!phrase || verif) ? 'rgba(255,255,255,.6)' : DEGRADE, color: (!phrase || verif) ? C.muted : '#fff', touchAction: 'manipulation', boxShadow: (!phrase || verif) ? 'none' : OMBRE_VIVE }}>
            {verif ? 'je vérifie…' : 'Entrer'}
          </button>
        </div>
      )}

      {/* ── les pages ── */}
      {etape === 'pages' && (
        <>
          <div ref={swipeRef} {...swipeHandlers} style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', width: `${N * 100}%`, height: '100%', transform: `translate3d(${-page * (100 / N)}%, 0, 0)`, transition: 'transform .34s cubic-bezier(.2,.8,.2,1)', willChange: 'transform' }}>

              {/* ⓪ COUP D'ŒIL — gratuit, et c'est ici qu'on atterrit */}
              <div style={{ width: `${100 / N}%`, height: '100%', boxSizing: 'border-box' }}>
                {page === 0 && <SentinelleCoupDoeil phrase={phrase} onVersElle={() => setPage(ELLE)} />}
              </div>

              {/* ① CE QUI T'ATTEND — la seule page qui dépense */}
              <div style={{ width: `${100 / N}%`, height: '100%', display: 'flex', flexDirection: 'column', padding: '12px 13px 8px', boxSizing: 'border-box' }}>
                {/* Tant qu'on n'a rien demandé, on ne montre pas un écran
                    vide : on montre CE QUE ça va coûter, et le bouton. */}
                {!t && !chargement ? (
                  <div className="s-monte" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: VERRE, border: CONTOUR, borderRadius: 22, boxShadow: OMBRE, padding: '0 24px' }}>
                    <div style={{ width: 58, height: 58, borderRadius: 19, background: DEGRADE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 27, boxShadow: OMBRE_VIVE }}>🛡️</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: MARINE, textAlign: 'center' }}>Elle n'a pas encore regardé.</div>
                    <div style={{ fontSize: 12.5, color: C.muted, textAlign: 'center', lineHeight: 1.55, maxWidth: 250 }}>
                      Lui demander son point, c'est un tour de modèle : elle lit
                      la base, les signalements, le journal, et prépare ses
                      dossiers. Tout ce qui se lit sans elle est resté sur le
                      coup d'œil.
                    </div>
                    <button onClick={() => charger(true)} className="s-eclat"
                      style={{ position: 'relative', overflow: 'hidden', marginTop: 4, padding: '15px 28px', borderRadius: 16, border: 'none', background: DEGRADE, color: '#fff', fontSize: 14.5, fontWeight: 900, letterSpacing: .2, boxShadow: OMBRE_VIVE, touchAction: 'manipulation' }}>
                      Fais le point
                    </button>
                  </div>
                ) : !t ? (
                  <ElleRegarde />
                ) : (
                <>
                <div className="s-monte" style={{ padding: '14px 16px', background: VERRE, border: CONTOUR, borderRadius: 20, flexShrink: 0, boxShadow: OMBRE }}>
                  <div style={{ fontSize: 15, lineHeight: 1.55, fontWeight: 700, color: MARINE, minHeight: 23 }}>
                    {motEcrit ? t.mot : <MotQuiSecrit key={t.rediges_le || 'mot'} texte={t.mot || (t.erreur ? "Je n'ai pas pu refaire le point." : 'Rien à te dire de nouveau.')} onFini={() => setMotEcrit(true)} />}
                  </div>
                  {t?.seule && motEcrit && <div className="s-monte" style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${C.trait}`, fontSize: 12.5, lineHeight: 1.5, color: ACIER }}><span style={{ fontWeight: 900 }}>Seule : </span>{t.seule}</div>}
                  {t?.erreur && <div style={{ marginTop: 7, fontSize: 12, color: C.muted }}>{t.erreur}</div>}
                  <Pastilles actions={t?.gestes} />
                </div>

                {t && motEcrit && (
                  dossiers.length ? (
                    <div key={courant?.id} className="s-story" style={{ flex: 1, minHeight: 0, marginTop: 12, background: VERRE, border: CONTOUR_VIF, borderRadius: 22, boxShadow: OMBRE_VIVE, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      {/* bandeau du genre */}
                      <div style={{ background: g.f, padding: '10px 15px 11px' }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 9 }}>
                          {dossiers.map((x, k) => <div key={x.id} style={{ flex: 1, height: 3, borderRadius: 2, background: k <= iStory ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.35)', transition: 'background .25s' }} />)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14 }}>{g.emoji}</span>
                          <span style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(255,255,255,.95)' }}>{g.mot}{courant.gravite === 'haute' ? ' · en premier' : ''}</span>
                        </div>
                      </div>
                      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '13px 15px 8px' }}>
                        <div style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.28, color: MARINE, marginBottom: 11, letterSpacing: -.3 }}>{courant.titre}</div>
                        <Dossier key={courant.id} d={courant} phrase={phrase} onFerme={ferme} story />
                      </div>
                      {/* ── les flèches : de vrais boutons, 44 px ── */}
                      {dossiers.length > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px 12px' }}>
                          <button onClick={() => { setStory(s => Math.max(0, s - 1)); haptic('light'); }} disabled={iStory === 0} aria-label="Dossier précédent"
                            style={{ width: 44, height: 44, borderRadius: 14, border: `1.5px solid ${C.border}`, background: iStory === 0 ? 'rgba(255,255,255,.4)' : '#fff', color: iStory === 0 ? C.border : ACIER, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}><ChevronLeft size={20} /></button>
                          <div style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 800, color: C.muted }}>{iStory + 1} / {dossiers.length}</div>
                          <button onClick={() => { setStory(s => Math.min(dossiers.length - 1, s + 1)); haptic('light'); }} disabled={iStory >= dossiers.length - 1} aria-label="Dossier suivant"
                            style={{ width: 44, height: 44, borderRadius: 14, border: `1.5px solid ${C.border}`, background: iStory >= dossiers.length - 1 ? 'rgba(255,255,255,.4)' : '#fff', color: iStory >= dossiers.length - 1 ? C.border : ACIER, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}><ChevronRight size={20} /></button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Rien à décider, c'est une BONNE nouvelle — pas une page
                       vide. Ce bloc faisait `flex: 1`, donc il gonflait pour
                       remplir tout l'écran : un grand vide pour annoncer
                       qu'il n'y a rien. Il tient maintenant en une bande, et
                       la place gagnée sert aux chiffres du jour, qui se
                       lisent gratuitement. */
                    <div className="s-story" style={{ marginTop: 12, background: VERRE, border: CONTOUR, borderRadius: 20, boxShadow: OMBRE, padding: '13px 15px 14px', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 14, background: DEGRADE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, boxShadow: OMBRE_VIVE }}>☕</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15.5, fontWeight: 900, color: MARINE, lineHeight: 1.2 }}>Rien à décider.</div>
                          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.45 }}>Elle n'a rien trouvé qui demande ton avis.</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 11, borderTop: `1px solid ${C.trait}` }}>
                        {[
                          { n: Math.round(Number(vue?.marche?.prix ?? 0)), l: 'le cours' },
                          { n: vue?.economie?.actifs24 ?? 0,               l: 'joueurs / 24 h' },
                          { n: vue?.boite?.nouveaux ?? 0,                  l: 'à traiter' },
                          { n: vue?.app?.crashs ?? 0,                      l: 'crash(s)' },
                        ].map((x, k) => (
                          <div key={k} style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -.5, color: MARINE, lineHeight: 1.1 }}>{x.n}</div>
                            <div style={{ fontSize: 10, color: C.muted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
                </>
                )}
              </div>

              {/* ② L'APP EN VIE */}
              <div style={{ width: `${100 / N}%`, height: '100%', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '12px 13px 10px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {vue && page === 2 && (
                  <>
                    <Bande i={0} emoji="📈" titre="Marché $CKM" teinte={GENRES.marche.f} allumee={dossiers.some(d => d.genre === 'marche')} phrase={b.marche}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                        <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1, color: MARINE }}>{Number(vue.marche?.prix ?? 0).toFixed(1)}</span>
                        <span style={{ fontSize: 11.5, color: C.muted }}>{vue.marche?.ferme ? `fermé jusqu'à ${heure(vue.marche.jusqu_a)}` : 'ouvert'} · {vue.marche?.actions ?? 0} actions · {vue.marche?.ordres24h ?? 0} ordre(s) / 24 h</span>
                      </div>
                      <div style={{ marginTop: 8 }}><Courbe points={vue.marche?.courbe} /></div>
                      {dossiers.filter(d => d.genre === 'marche').map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={ferme} />)}
                    </Bande>

                    <Bande i={1} emoji="👤" titre="Joueurs" teinte={GENRES.joueur.f} allumee={dJ.length > 0} phrase={b.joueurs}>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 9 }}>{vue.economie?.actifs24 ?? 0} aujourd'hui · {vue.economie?.actifs7 ?? 0} cette semaine</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {(vue.joueurs || []).slice(0, 12).map(j => {
                          const mien = dJ.filter(d => String(d.cle).includes(j.code));
                          return (
                            <div key={j.code}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 11, background: mien.length ? 'linear-gradient(135deg,rgba(46,134,191,.14),rgba(46,134,191,.05))' : 'transparent', border: mien.length ? '1px solid rgba(46,134,191,.28)' : '1px solid transparent' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: j.actif24 ? DEGRADE : C.border, flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: MARINE }}>{j.nom}{j.surveille ? <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', background: MARINE, padding: '2px 6px', borderRadius: 6, marginLeft: 7 }}>SURVEILLÉ</span> : null}</span>
                                <span style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>niv {j.niveau} · {j.semaine.toLocaleString('fr-FR')} 🍪 · {j.minutes} min</span>
                              </div>
                              {mien.map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={ferme} />)}
                            </div>
                          );
                        })}
                      </div>
                    </Bande>

                    <Bande i={2} emoji="🍪" titre="Économie" teinte={GENRES.info.f} allumee={dossiers.some(d => d.genre === 'info')} phrase={b.economie}>
                      <div style={{ display: 'flex', gap: 18 }}>
                        <div><div style={{ fontSize: 25, fontWeight: 900, letterSpacing: -.6, color: MARINE }}>{Number(vue.economie?.semaine ?? 0).toLocaleString('fr-FR')}</div><div style={{ fontSize: 10.5, color: C.muted }}>🍪 cette semaine</div></div>
                        <div><div style={{ fontSize: 25, fontWeight: 900, letterSpacing: -.6, color: MARINE }}>{vue.economie?.actifs7 ?? 0}</div><div style={{ fontSize: 10.5, color: C.muted }}>joueurs actifs / 7 j</div></div>
                      </div>
                      {dossiers.filter(d => d.genre === 'info').map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={ferme} />)}
                    </Bande>

                    <Bande i={3} emoji="📱" titre="L'app" teinte={GENRES.app.f} allumee={dossiers.some(d => d.genre === 'app')} phrase={b.app}>
                      <div style={{ fontSize: 12.5, color: MARINE, fontWeight: 600 }}>{vue.app?.ouvertures24 ?? 0} ouverture(s) / 24 h · {vue.app?.crashs ?? 0} crash{(vue.app?.crashs ?? 0) > 1 ? 's' : ''}{Array.isArray(vue.app?.versions) && vue.app.versions.length > 0 && <span style={{ color: C.muted, fontWeight: 500 }}> · {vue.app.versions.map(v => `${v.v} ×${v.n}`).join(', ')}</span>}</div>
                      {dossiers.filter(d => d.genre === 'app').map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={ferme} />)}
                    </Bande>

                    <Bande i={4} emoji="📮" titre="Boîte" teinte={GENRES.signalement.f} allumee={dossiers.some(d => d.genre === 'signalement')} phrase={b.boite}>
                      <div style={{ fontSize: 12.5, color: MARINE, fontWeight: 600 }}>{vue.boite?.nouveaux ?? 0} nouveau(x) · {vue.boite?.total24 ?? 0} sur 24 h</div>
                      {dossiers.filter(d => d.genre === 'signalement').map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={ferme} />)}
                    </Bande>
                  </>
                )}
              </div>

              {/* ③ LA JOURNÉE */}
              <div style={{ width: `${100 / N}%`, height: '100%', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '12px 13px 10px', boxSizing: 'border-box' }}>
                {vue && page === 3 && (
                  <section className="s-monte" style={{ background: VERRE, border: CONTOUR, borderRadius: 20, padding: '14px 15px 15px', boxShadow: OMBRE }}>
                    {frise.length > 0 && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.4, textTransform: 'uppercase', color: ACIER, marginBottom: 9 }}>Ce que j'en retiens</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
                          {frise.map((f, k) => (
                            <div key={k} className={`s-monte stagger-${(k % 4) + 1}`} style={{ display: 'flex', gap: 11, padding: '10px 12px', background: 'linear-gradient(135deg,rgba(46,134,191,.13),rgba(46,134,191,.05))', borderRadius: 13, borderLeft: `3px solid ${ACIER}` }}>
                              <span style={{ fontSize: 11, fontWeight: 900, color: ACIER, flexShrink: 0, minWidth: 38 }}>{f.quand}</span>
                              <span style={{ fontSize: 12.5, color: MARINE, fontWeight: 600, lineHeight: 1.45 }}>{f.texte}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.4, textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>Tout ce qui s'est passé</div>
                    <div style={{ position: 'relative', paddingLeft: 4 }}>
                      {/* le fil du temps */}
                      {evenements.length > 0 && <div aria-hidden style={{ position: 'absolute', left: 51, top: 6, bottom: 6, width: 1.5, background: `linear-gradient(180deg, ${C.border}, ${BLEU[100]})` }} />}
                      {(toutVoir ? evenements : evenements.slice(0, 14)).map((e, k) => {
                        const a = ACTEUR[e.acteur] || ACTEUR.app;
                        return (
                          <div key={k} className={k < 8 ? `s-monte stagger-${(k % 4) + 1}` : undefined} style={{ position: 'relative', display: 'flex', gap: 10, padding: '6px 0', fontSize: 12, lineHeight: 1.45 }}>
                            <span style={{ color: C.muted, flexShrink: 0, minWidth: 38, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{heure(e.quand)}</span>
                            <span style={{ color: a.c, flexShrink: 0, width: 12, textAlign: 'center', background: C.card, zIndex: 1, fontSize: 10 }}>{a.e}</span>
                            <span style={{ color: e.acteur === 'sentinelle' ? MARINE : C.text, fontWeight: e.acteur === 'sentinelle' ? 700 : 500 }}>{e.texte}</span>
                          </div>
                        );
                      })}
                      {!evenements.length && <div style={{ fontSize: 12.5, color: C.muted }}>Rien sur 24 h.</div>}
                    </div>
                    {evenements.length > 14 && <button onClick={() => setToutVoir(v => !v)} style={{ marginTop: 10, background: 'rgba(255,255,255,.7)', border: `1.5px solid ${C.border}`, borderRadius: 12, color: ACIER, fontSize: 12, fontWeight: 800, padding: '9px 14px', touchAction: 'manipulation' }}>{toutVoir ? 'moins' : `tout voir (${evenements.length})`}</button>}
                    <div style={{ marginTop: 10, fontSize: 10.5, color: C.muted }}>● elle · ◆ toi · ○ un joueur · ▲ une ronde · □ l'app</div>
                  </section>
                )}
              </div>
            </div>
          </div>


          {/* Les points ne font que 8 px de haut. Un point de 8 px n'est
              pas une cible : le doigt le rate. Le BOUTON fait donc 40 ×
              32, transparent, et ne contient qu'un point — on vise le
              même endroit, on l'atteint. */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0 4px', flexShrink: 0 }}>
            {PAGES.map((_, k) => (
              <button key={k} onClick={() => setPage(k)} aria-label={PAGES[k]}
                style={{ width: 40, height: 32, border: 'none', background: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}>
                <span aria-hidden style={{ width: k === page ? 24 : 8, height: 8, borderRadius: 4, background: k === page ? DEGRADE : BLEU[300], transition: 'width .25s, background .25s' }} />
              </button>
            ))}
          </div>

          {/* Un BOUTON, pas un champ. Lui parler ouvre une feuille pleine
              hauteur : deux champs de saisie pour la même chose (un ici,
              un dans la feuille) obligeaient à jongler avec le focus sur
              mobile. Absent du coup d'œil — une amorce payante sous une
              page annoncée gratuite est un piège. */}
          {page !== 0 && (
            <button onClick={() => setDialogue(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 12px 14px', padding: '13px 15px', borderRadius: 17, border: `1.5px solid ${BLEU[200]}`, background: 'rgba(255,255,255,.82)', backdropFilter: 'blur(10px)', flexShrink: 0, textAlign: 'left', touchAction: 'manipulation', boxShadow: OMBRE }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {echangesLibres.length
                  ? echangesLibres[echangesLibres.length - 1].qui === 'elle'
                    ? String(echangesLibres[echangesLibres.length - 1].texte).replace(/[*`#]/g, '').slice(0, 46) + '…'
                    : 'reprendre la conversation…'
                  : 'dis-lui quelque chose…'}
              </span>
              {echangesLibres.length > 0 && (
                <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 900, color: '#fff', background: DEGRADE, padding: '3px 8px', borderRadius: 20 }}>{echangesLibres.length}</span>
              )}
              <span style={{ width: 34, height: 34, borderRadius: 12, background: DEGRADE, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Send size={16} /></span>
            </button>
          )}
        </>
      )}
    </div>
  );
}

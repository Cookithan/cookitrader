import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronDown, RefreshCw, Send } from "lucide-react";
import { verifierPhrase } from "../../lib/sentinelle.js";
import { THEME_SENTINELLE, ACIER, MARINE } from "../../data/sentinelleTheme.js";
import { tableauSentinelle, deciderDossier, demanderDossier, parlerSentinelle } from "../../lib/sentinelleIA.js";
import { playSound } from "../../lib/audio.js";
import { haptic } from "../../lib/haptic.js";
import { useSwipe } from "../../hooks/useSwipe.js";
import { SentinelleBienvenue } from "../SentinelleBienvenue.jsx";

/* ════════════════════════════════════════════════════
   SentinelleTableau — trois pages, et elle qui te les présente
   ────────────────────────────────────────────────────
   Régis, le 09/09 : « c'est encore une liste, et il n'y a plus
   l'animation d'entrée ». Il a choisi : les pages, avec l'entrée du
   cinéma en version courte.

   L'ENTRÉE (≈ 2 s)
     ta phrase → le bouclier se réveille (SentinelleBienvenue, le même
     qu'avant) pendant que la base charge → son mot S'ÉCRIT sous tes
     yeux, mot à mot → tu es sur la page 1. Rien ne t'attend derrière un
     écran de chargement : elle parle dès qu'elle sait.

   TROIS PAGES, AU POUCE (useSwipe, le hook des onglets)
     ① CE QUI T'ATTEND — les dossiers UN PAR UN, plein écran, comme des
       stories : segments de progression en haut, gros titre, son
       analyse, un seul bouton. Tape à droite pour le suivant, à gauche
       pour revenir. Décidé → ça glisse au suivant. Pile vide → ce
       qu'elle a fait seule.
     ② L'APP EN VIE — le tableau : marché et sa courbe, joueurs ligne par
       ligne, économie, app, boîte. Les bandes arrivent en cascade. Un
       dossier concernant un joueur s'allume aussi sous sa ligne, ici.
     ③ LA JOURNÉE — ce qu'elle en retient, à la première personne, puis
       tout ce qui s'est passé, heure par heure.

   Rien ne défile en colonne infinie : chaque page tient à l'écran, et
   ce qui est long (les joueurs, la frise) défile DANS sa page.

   Props : onClose, userName
═══════════════════════════════════════════════════════ */

const C = THEME_SENTINELLE;
const LOURDS = ['sanctionner', 'lever_sanction', 'corriger_cours', 'maintenance', 'forcer_maj', 'creer_code_promo', 'desactiver_code_promo'];
const PAGES = ['Ce qui t\'attend', 'L\'app en vie', 'La journée'];

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
  fait:    { background: 'rgba(43,124,178,.11)', color: ACIER, border: '1.5px solid rgba(43,124,178,.35)' },
  attente: { background: '#FFFFFF', color: MARINE, border: `1.5px dashed ${ACIER}` },
  refus:   { background: '#EAF3FA', color: '#5A7E9B', border: '1.5px solid #CCE0EE' },
  lecture: { background: 'transparent', color: '#5A7E9B', border: '1.5px solid transparent' },
};
function Pastilles({ actions }) {
  if (!Array.isArray(actions) || !actions.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {actions.map((a, k) => { const p = pastille(a); return <span key={k} style={{ ...TONS[p.ton], padding: '4px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{p.texte}</span>; })}
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
    /* Un mot long ne doit pas prendre 4 s à s'écrire : au-delà de 28
       mots on en pose deux par pas. Total borné à ~1,6 s. */
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
  const fini = n >= mots.length;
  return <span>{mots.slice(0, n).join(' ')}{!fini && <span className="s-curseur" />}</span>;
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
    if (lourd && !confirme) { setConfirme(true); return; }
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

  return (
    <div style={{ marginTop: story ? 0 : 10, background: story ? 'transparent' : '#F7FBFE', border: story ? 'none' : '1.5px solid rgba(27,94,140,.45)', borderRadius: 14, boxShadow: story ? 'none' : '0 3px 12px rgba(27,94,140,.12)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: story ? 1 : 'none', minHeight: 0 }}>
      {!story && (
        <button onClick={() => setOuvert(o => !o)} style={{ width: '100%', textAlign: 'left', padding: '11px 12px 8px', background: 'transparent', border: 'none', color: C.text, touchAction: 'manipulation' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>
            <span className="live-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: ACIER, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{d.titre}</span>
            <ChevronDown size={14} color={C.muted} style={{ transform: ouvert ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
          </div>
        </button>
      )}
      {ouvert && (
        <div style={{ padding: story ? 0 : '0 12px 10px', flex: story ? 1 : 'none', minHeight: 0, overflowY: story ? 'auto' : 'visible' }}>
          <div style={{ fontSize: story ? 14 : 12.5, lineHeight: 1.55, color: C.text, opacity: .9 }}>{d.explication}</div>
          {echanges.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              {echanges.map((e, k) => (
                <div key={k} style={{ display: 'flex', justifyContent: e.qui === 'regis' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '88%', padding: '7px 10px', borderRadius: 12, fontSize: 12.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', background: e.qui === 'regis' ? ACIER : '#fff', color: e.qui === 'regis' ? '#fff' : C.text, border: e.qui === 'regis' ? 'none' : `1px solid ${C.border}` }}>
                    {e.texte}{e.qui !== 'regis' && <Pastilles actions={e.actions} />}
                  </div>
                </div>
              ))}
            </div>
          )}
          {attente && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}><span className="live-pulse">elle regarde…</span></div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') demander(); }} placeholder="pourquoi ? / fais plutôt…"
              style={{ flex: 1, padding: '9px 12px', borderRadius: 11, border: `1.5px solid ${C.border}`, background: '#fff', color: C.text, fontSize: 13, outline: 'none' }} />
            <button onClick={demander} disabled={!question.trim() || attente} style={{ width: 38, height: 38, borderRadius: 11, border: 'none', background: question.trim() && !attente ? ACIER : C.card2, color: question.trim() && !attente ? '#fff' : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}><Send size={14} /></button>
          </div>
        </div>
      )}
      {resultat ? (
        <div style={{ padding: story ? '12px 0 0' : '8px 12px 12px', borderTop: `1px solid ${C.border}`, marginTop: story ? 12 : 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: resultat.erreur ? C.muted : ACIER }}>{resultat.erreur ? `✗ ${resultat.erreur}` : (resultat.tousOk ? '✓ fait' : '△ fait en partie')}</div>
          <Pastilles actions={resultat.resultats} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, padding: story ? '14px 0 0' : '2px 12px 12px' }}>
          {Array.isArray(d.actions) && d.actions.length > 0 && (
            <button onClick={agir} disabled={!!enCours} style={{ flex: 1, padding: story ? '15px 10px' : '11px 8px', borderRadius: 14, border: 'none', fontSize: story ? 14 : 12.5, fontWeight: 900, background: confirme ? MARINE : ACIER, color: '#fff', opacity: enCours ? .6 : 1, touchAction: 'manipulation', boxShadow: '0 4px 14px rgba(27,94,140,.28)' }}>
              {enCours === 'agir' ? '…' : confirme ? 'Confirmer' : d.proposition}
            </button>
          )}
          <button onClick={classer} disabled={!!enCours} style={{ flex: Array.isArray(d.actions) && d.actions.length ? 0.5 : 1, padding: story ? '15px 10px' : '11px 8px', borderRadius: 14, border: `1.5px solid ${C.border}`, background: '#fff', color: C.text, fontSize: story ? 14 : 12.5, fontWeight: 800, opacity: enCours ? .6 : 1, touchAction: 'manipulation' }}>
            {enCours === 'classer' ? '…' : 'Classer'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── une bande du tableau ──────────────────────────── */
function Bande({ emoji, titre, allumee, phrase, i, children }) {
  return (
    <section className={`su stagger-${(i % 4) + 1}`} style={{ background: C.card, border: `1.5px solid ${allumee ? 'rgba(27,94,140,.55)' : C.border}`, borderRadius: 18, padding: '12px 14px 14px', boxShadow: allumee ? '0 4px 18px rgba(27,94,140,.14)' : '0 2px 8px rgba(14,51,85,.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 13 }}>{emoji}</span>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase', color: allumee ? ACIER : C.muted }}>{titre}</span>
        {allumee && <span className="live-pulse" style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: ACIER }}>● à décider</span>}
      </div>
      {children}
      {phrase && <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.45, color: MARINE, fontWeight: 600, fontStyle: 'italic' }}>« {phrase} »</div>}
    </section>
  );
}
function Courbe({ points }) {
  if (!Array.isArray(points) || points.length < 2) return <div style={{ height: 36 }} />;
  const min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const W = 300, H = 36;
  const d = points.map((p, i) => `${(i / (points.length - 1)) * W},${H - ((p - min) / span) * (H - 6) - 3}`).join(' ');
  return <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, display: 'block' }}><polyline points={d} fill="none" stroke={ACIER} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}
const heure = (iso) => iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
const ACTEUR = { sentinelle: { e: '●', c: ACIER }, regis: { e: '◆', c: MARINE }, joueur: { e: '○', c: '#5A7E9B' }, ronde: { e: '▲', c: '#5A7E9B' }, app: { e: '□', c: '#5A7E9B' } };
const GENRE = { triche: '🕵️', marche: '📈', signalement: '📮', joueur: '👤', app: '📱', info: '💬' };

/* ── l'écran ───────────────────────────────────────── */
export function SentinelleTableau({ onClose, userName }) {
  const [phrase, setPhrase]   = useState('');
  const [etape, setEtape]     = useState('porte');   // porte | reveil | pages
  const [verif, setVerif]     = useState(false);
  const [erreurPorte, setErreurPorte] = useState(null);
  const [t, setT]             = useState(null);
  const [chargement, setChargement] = useState(false);
  const [fermes, setFermes]   = useState({});
  const [page, setPage]       = useState(0);
  const [story, setStory]     = useState(0);
  const [motEcrit, setMotEcrit] = useState(false);
  const [toutVoir, setToutVoir] = useState(false);
  const [ligne, setLigne]     = useState('');
  const [reponse, setReponse] = useState(null);
  const [attente, setAttente] = useState(false);
  const reveilFini = useRef(false);

  const charger = async (forcer = false) => {
    setChargement(true);
    const r = await tableauSentinelle(phrase, { forcer });
    setChargement(false);
    if (!r.ok) { setT({ erreur: r.message, dossiers: [], evenements: [] }); playSound('error'); return; }
    setT(r); setFermes({}); setStory(0); setMotEcrit(false);
    if (r.dossiers?.length) playSound('bubble');
  };
  const entrer = async () => {
    if (!phrase || verif) return;
    setVerif(true); setErreurPorte(null);
    const r = await verifierPhrase(phrase);
    setVerif(false);
    if (!r.ok) { setErreurPorte(r.message); playSound('error'); return; }
    /* Le bouclier se réveille PENDANT que la base charge : les deux
       durent à peu près pareil, on ne fait pas attendre deux fois. */
    setEtape('reveil'); reveilFini.current = false;
    charger(false);
  };
  const finReveil = () => { reveilFini.current = true; setEtape('pages'); };

  const { ref: swipeRef, handlers: swipeHandlers } = useSwipe({
    enabled: etape === 'pages',
    onLeft:  () => setPage(p => Math.min(2, p + 1)),
    onRight: () => setPage(p => Math.max(0, p - 1)),
    threshold: 50,
  });

  const parler = async () => {
    const q = ligne.trim();
    if (!q || attente) return;
    setLigne(''); setAttente(true); setReponse({ question: q });
    const r = await parlerSentinelle({ phrase, message: q });
    setAttente(false);
    setReponse({ question: q, texte: r.ok ? r.reponse : r.message, actions: r.ok ? r.actions : null, erreur: !r.ok });
    playSound(r.ok ? 'bubble' : 'error');
  };

  const dossiers = (t?.dossiers || []).filter(d => !fermes[d.id]);
  const ferme = (id) => { setFermes(f => ({ ...f, [id]: true })); setStory(s => Math.max(0, Math.min(s, dossiers.length - 2))); };
  const b = t?.bandes || {};
  const evenements = t?.evenements || [];
  const frise = Array.isArray(t?.frise) ? t.frise : [];
  const dJ = dossiers.filter(d => ['triche', 'joueur'].includes(d.genre));
  const courant = dossiers[Math.min(story, Math.max(0, dossiers.length - 1))];

  /* Page 1 : tap à droite = suivant, à gauche = précédent — comme des
     stories. Le swipe, lui, change de page. */
  const tapStory = (e) => {
    if (!dossiers.length) return;
    const x = e.nativeEvent?.offsetX ?? 0, w = e.currentTarget?.clientWidth || 1;
    if (e.target.closest('button, input, textarea')) return;
    if (x > w * 0.6) setStory(s => Math.min(dossiers.length - 1, s + 1));
    else if (x < w * 0.25) setStory(s => Math.max(0, s - 1));
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, bottom: 0, background: C.bg, zIndex: 62, display: 'flex', flexDirection: 'column', color: C.text, overflow: 'hidden' }}>

      {etape === 'reveil' && <SentinelleBienvenue nom={userName} admin onFini={finReveil} />}

      {/* en-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: `1.5px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 12, background: C.card2, border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}><ChevronLeft size={20} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.1 }}>{etape === 'pages' ? PAGES[page] : 'Sentinelle'}</div>
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>{etape !== 'pages' ? 'ton associée' : chargement ? 'elle regarde tout…' : t?.rediges_le ? `son point de ${heure(t.rediges_le)}` : 'en ligne'}</div>
        </div>
        {etape === 'pages' && (
          <button onClick={() => !chargement && charger(true)} disabled={chargement} aria-label="Refaire le point" style={{ width: 38, height: 38, borderRadius: 12, background: C.card2, border: `1.5px solid ${C.border}`, color: ACIER, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: chargement ? .5 : 1, touchAction: 'manipulation' }}>
            <RefreshCw size={16} style={chargement ? { animation: 'premiumRay 1.1s linear infinite' } : undefined} />
          </button>
        )}
      </div>

      {/* la porte */}
      {etape === 'porte' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 26px', gap: 14 }}>
          <div className="su" style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>Salut {userName || ''}.</div>
          <div className="su stagger-1" style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5 }}>J'ai fait ma ronde. Ta phrase, et je te présente ce qui t'attend.</div>
          <input className="su stagger-2" type="password" value={phrase} onChange={e => setPhrase(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') entrer(); }} placeholder="ta phrase de passe" autoFocus
            style={{ padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.card, color: C.text, fontSize: 15, outline: 'none' }} />
          {erreurPorte && <div style={{ fontSize: 12.5, color: C.muted }}>{erreurPorte}</div>}
          <button className="su stagger-3" onClick={entrer} disabled={!phrase || verif} style={{ padding: 14, borderRadius: 16, border: 'none', fontSize: 14.5, fontWeight: 900, background: (!phrase || verif) ? C.card2 : ACIER, color: (!phrase || verif) ? C.muted : '#fff', touchAction: 'manipulation' }}>{verif ? 'je vérifie…' : 'Entrer'}</button>
        </div>
      )}

      {/* les pages */}
      {etape === 'pages' && (
        <>
          <div ref={swipeRef} {...swipeHandlers} style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
            <div style={{ display: 'flex', width: '300%', height: '100%', transform: `translate3d(${-page * (100 / 3)}%, 0, 0)`, transition: 'transform .34s cubic-bezier(.2,.8,.2,1)', willChange: 'transform' }}>

              {/* ① CE QUI T'ATTEND */}
              <div style={{ width: `${100 / 3}%`, height: '100%', display: 'flex', flexDirection: 'column', padding: '12px 14px 8px', boxSizing: 'border-box' }} onClick={tapStory}>
                {/* son mot */}
                <div style={{ padding: '13px 15px', background: 'linear-gradient(140deg, #E6F3FC, #D2E8F7)', border: '1.5px solid rgba(27,94,140,.28)', borderRadius: 18, flexShrink: 0 }}>
                  <div style={{ fontSize: 14.5, lineHeight: 1.5, fontWeight: 700, color: MARINE, minHeight: 22 }}>
                    {!t ? <span className="live-pulse">…</span> : motEcrit ? t.mot : <MotQuiSecrit key={t.rediges_le || 'mot'} texte={t.mot || (t.erreur ? "Je n'ai pas pu refaire le point." : 'Rien à te dire de nouveau.')} onFini={() => setMotEcrit(true)} />}
                  </div>
                  {t?.seule && motEcrit && <div className="su" style={{ marginTop: 7, fontSize: 12.5, lineHeight: 1.45, color: MARINE, opacity: .8 }}><span style={{ fontWeight: 800 }}>Seule : </span>{t.seule}</div>}
                  {t?.erreur && <div style={{ marginTop: 6, fontSize: 12, color: C.muted }}>{t.erreur}</div>}
                </div>

                {/* les stories */}
                {t && motEcrit && (
                  dossiers.length ? (
                    <div key={courant?.id} className="s-story" style={{ flex: 1, minHeight: 0, marginTop: 12, background: C.card, border: '1.5px solid rgba(27,94,140,.45)', borderRadius: 20, padding: '12px 16px 16px', boxShadow: '0 6px 22px rgba(27,94,140,.14)', display: 'flex', flexDirection: 'column' }}>
                      {/* segments */}
                      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                        {dossiers.map((d, k) => <div key={d.id} style={{ flex: 1, height: 3, borderRadius: 2, background: k <= story ? ACIER : C.border, transition: 'background .2s' }} />)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 13 }}>{GENRE[courant.genre] || '💬'}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase', color: courant.gravite === 'haute' ? ACIER : C.muted }}>{courant.genre}{courant.gravite === 'haute' ? ' · en premier' : ''}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: C.muted, fontWeight: 700 }}>{story + 1} / {dossiers.length}</span>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.3, color: MARINE, marginBottom: 10 }}>{courant.titre}</div>
                      <Dossier key={courant.id} d={courant} phrase={phrase} onFerme={ferme} story />
                    </div>
                  ) : (
                    <div className="s-story" style={{ flex: 1, marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 20 }}>
                      <div style={{ fontSize: 30 }}>☕</div>
                      <div style={{ fontSize: 16, fontWeight: 900 }}>Rien à décider.</div>
                      <div style={{ fontSize: 12.5, color: C.muted }}>Balaie vers la gauche pour voir l'app en vie.</div>
                    </div>
                  )
                )}
                <Pastilles actions={t?.gestes} />
              </div>

              {/* ② L'APP EN VIE */}
              <div style={{ width: `${100 / 3}%`, height: '100%', overflowY: 'auto', padding: '12px 14px 10px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {t && page === 1 && (
                  <>
                    <Bande i={0} emoji="📈" titre="Marché $CKM" allumee={dossiers.some(d => d.genre === 'marche')} phrase={b.marche}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                        <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: -.5 }}>{Number(t.marche?.prix ?? 0).toFixed(1)}</span>
                        <span style={{ fontSize: 11.5, color: C.muted }}>{t.marche?.ferme ? `fermé jusqu'à ${heure(t.marche.jusqu_a)}` : 'ouvert'} · {t.marche?.actions ?? 0} actions · {t.marche?.ordres24h ?? 0} ordre(s) / 24 h</span>
                      </div>
                      <div style={{ marginTop: 6 }}><Courbe points={t.marche?.courbe} /></div>
                      {dossiers.filter(d => d.genre === 'marche').map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={ferme} />)}
                    </Bande>
                    <Bande i={1} emoji="👤" titre="Joueurs" allumee={dJ.length > 0} phrase={b.joueurs}>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{t.economie?.actifs24 ?? 0} aujourd'hui · {t.economie?.actifs7 ?? 0} cette semaine</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(t.joueurs || []).slice(0, 12).map(j => {
                          const mien = dJ.filter(d => String(d.cle).includes(j.code));
                          return (
                            <div key={j.code}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 10, background: mien.length ? 'rgba(27,94,140,.08)' : 'transparent' }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: j.actif24 ? ACIER : C.border, flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.nom}{j.surveille ? <span style={{ fontSize: 9.5, fontWeight: 800, color: ACIER, marginLeft: 6 }}>SURVEILLÉ</span> : null}</span>
                                <span style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>niv {j.niveau} · {j.semaine.toLocaleString('fr-FR')} 🍪 · {j.minutes} min</span>
                              </div>
                              {mien.map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={ferme} />)}
                            </div>
                          );
                        })}
                      </div>
                    </Bande>
                    <Bande i={2} emoji="🍪" titre="Économie" allumee={dossiers.some(d => d.genre === 'info')} phrase={b.economie}>
                      <div style={{ display: 'flex', gap: 14 }}>
                        <div><div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -.5 }}>{Number(t.economie?.semaine ?? 0).toLocaleString('fr-FR')}</div><div style={{ fontSize: 10.5, color: C.muted }}>🍪 gagnés cette semaine</div></div>
                        <div><div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -.5 }}>{t.economie?.actifs7 ?? 0}</div><div style={{ fontSize: 10.5, color: C.muted }}>joueurs actifs / 7 j</div></div>
                      </div>
                      {dossiers.filter(d => d.genre === 'info').map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={ferme} />)}
                    </Bande>
                    <Bande i={3} emoji="📱" titre="L'app" allumee={dossiers.some(d => d.genre === 'app')} phrase={b.app}>
                      <div style={{ fontSize: 12.5 }}>{t.app?.ouvertures24 ?? 0} ouverture(s) / 24 h · {t.app?.crashs ?? 0} crash{(t.app?.crashs ?? 0) > 1 ? 's' : ''}{Array.isArray(t.app?.versions) && t.app.versions.length > 0 && <span style={{ color: C.muted }}> · {t.app.versions.map(v => `${v.v} ×${v.n}`).join(', ')}</span>}</div>
                      {dossiers.filter(d => d.genre === 'app').map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={ferme} />)}
                    </Bande>
                    <Bande i={4} emoji="📮" titre="Boîte" allumee={dossiers.some(d => d.genre === 'signalement')} phrase={b.boite}>
                      <div style={{ fontSize: 12.5 }}>{t.boite?.nouveaux ?? 0} nouveau(x) · {t.boite?.total24 ?? 0} sur 24 h</div>
                      {dossiers.filter(d => d.genre === 'signalement').map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={ferme} />)}
                    </Bande>
                  </>
                )}
              </div>

              {/* ③ LA JOURNÉE */}
              <div style={{ width: `${100 / 3}%`, height: '100%', overflowY: 'auto', padding: '12px 14px 10px', boxSizing: 'border-box' }}>
                {t && page === 2 && (
                  <section style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 18, padding: '12px 14px 14px' }}>
                    {frise.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase', color: ACIER, marginBottom: 2 }}>Ce que j'en retiens</div>
                        {frise.map((f, k) => (
                          <div key={k} className={`su stagger-${(k % 4) + 1}`} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: 'rgba(43,124,178,.08)', borderRadius: 12, borderLeft: `3px solid ${ACIER}` }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: ACIER, flexShrink: 0, minWidth: 38 }}>{f.quand}</span>
                            <span style={{ fontSize: 12.5, color: MARINE, fontWeight: 600, lineHeight: 1.4 }}>{f.texte}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>Tout ce qui s'est passé</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {(toutVoir ? evenements : evenements.slice(0, 14)).map((e, k) => {
                        const a = ACTEUR[e.acteur] || ACTEUR.app;
                        return (
                          <div key={k} className={k < 8 ? `su stagger-${(k % 4) + 1}` : undefined} style={{ display: 'flex', gap: 8, padding: '5px 4px', fontSize: 12, lineHeight: 1.4, borderBottom: `1px solid ${C.card2}` }}>
                            <span style={{ color: C.muted, flexShrink: 0, minWidth: 38, fontVariantNumeric: 'tabular-nums' }}>{heure(e.quand)}</span>
                            <span style={{ color: a.c, flexShrink: 0, width: 10 }}>{a.e}</span>
                            <span style={{ color: e.acteur === 'sentinelle' ? MARINE : C.text, fontWeight: e.acteur === 'sentinelle' ? 700 : 500 }}>{e.texte}</span>
                          </div>
                        );
                      })}
                      {!evenements.length && <div style={{ fontSize: 12.5, color: C.muted }}>Rien sur 24 h.</div>}
                    </div>
                    {evenements.length > 14 && <button onClick={() => setToutVoir(v => !v)} style={{ marginTop: 8, background: 'transparent', border: 'none', color: ACIER, fontSize: 12, fontWeight: 800, padding: '6px 4px', touchAction: 'manipulation' }}>{toutVoir ? 'moins' : `tout voir (${evenements.length})`}</button>}
                    <div style={{ marginTop: 8, fontSize: 10.5, color: C.muted }}>● elle · ◆ toi · ○ un joueur · ▲ une ronde · □ l'app</div>
                  </section>
                )}
              </div>
            </div>
          </div>

          {/* points + réponse à la ligne */}
          {reponse && (
            <div style={{ margin: '0 12px 8px', padding: '10px 12px', background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14, maxHeight: 160, overflowY: 'auto', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>tu : {reponse.question}</div>
              {attente ? <span className="live-pulse" style={{ fontSize: 13, color: C.muted }}>elle regarde…</span>
                : <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: reponse.erreur ? C.muted : C.text }}>{reponse.texte}<Pastilles actions={reponse.actions} /></div>}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 7, padding: '6px 0 4px', flexShrink: 0 }}>
            {PAGES.map((_, k) => <button key={k} onClick={() => setPage(k)} aria-label={PAGES[k]} style={{ width: k === page ? 22 : 7, height: 7, borderRadius: 4, border: 'none', padding: 0, background: k === page ? ACIER : C.border, transition: 'width .25s, background .25s', touchAction: 'manipulation' }} />)}
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '6px 12px 14px', borderTop: `1.5px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
            <input value={ligne} onChange={e => setLigne(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') parler(); }} placeholder="dis-lui quelque chose…"
              style={{ flex: 1, padding: '11px 14px', borderRadius: 16, border: `1.5px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14, outline: 'none' }} />
            <button onClick={parler} disabled={!ligne.trim() || attente} style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: ligne.trim() && !attente ? ACIER : C.card2, color: ligne.trim() && !attente ? '#fff' : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}><Send size={18} /></button>
          </div>
        </>
      )}
    </div>
  );
}

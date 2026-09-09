import { useRef, useState } from "react";
import { ChevronLeft, ChevronDown, RefreshCw, Send } from "lucide-react";
import { verifierPhrase } from "../../lib/sentinelle.js";
import { THEME_SENTINELLE, ACIER, MARINE } from "../../data/sentinelleTheme.js";
import { tableauSentinelle, deciderDossier, demanderDossier, parlerSentinelle } from "../../lib/sentinelleIA.js";
import { playSound } from "../../lib/audio.js";
import { haptic } from "../../lib/haptic.js";

/* ════════════════════════════════════════════════════
   SentinelleTableau — le tableau vivant, et elle par-dessus
   ────────────────────────────────────────────────────
   Régis, le 09/09 : « une toute nouvelle interface, pas une liste, et
   plus d'onglets à côté. Elle gère autant l'application que moi. »

   Un seul écran, et l'ancienne console n'existe plus.

     · son mot en haut — ce qui t'attend, ce qu'elle a fait seule
     · QUATRE BANDES + LA BOÎTE, l'une sous l'autre : marché, joueurs,
       économie, app, signalements. Dans chacune, LES CHIFFRES et SA
       PHRASE. Ce qui demande ta décision s'allume DANS SA BANDE, avec le
       geste déjà rempli — un dossier n'est plus une carte dans une
       liste, il est là où il se passe
     · LA FRISE de la journée : ce qu'elle en retient, en premier, à la
       première personne ; puis tout ce qui s'est passé, heure par heure
     · une ligne en bas pour lui dire quelque chose

   Le tableau ne coûte rien (des lectures) ; ses phrases viennent de la
   pile, réécrite au plus toutes les dix minutes — ou par l'horloge,
   toutes les heures, quand elle fait sa ronde sans toi.

   Props : onClose, userName
═══════════════════════════════════════════════════════ */

const C = THEME_SENTINELLE;
const LOURDS = ['sanctionner', 'lever_sanction', 'corriger_cours', 'maintenance', 'forcer_maj', 'creer_code_promo', 'desactiver_code_promo'];

/* ── pastilles de gestes ── */
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

/* ── un dossier, allumé dans sa bande ── */
function Dossier({ d, phrase, onFerme }) {
  const [ouvert, setOuvert]     = useState(false);
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
    setTimeout(() => onFerme(d.id), 1400);
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
    <div style={{ marginTop: 10, background: '#F7FBFE', border: `1.5px solid rgba(27,94,140,.45)`, borderRadius: 14, boxShadow: '0 3px 12px rgba(27,94,140,.12)', overflow: 'hidden' }}>
      <button onClick={() => setOuvert(o => !o)} style={{ width: '100%', textAlign: 'left', padding: '11px 12px 8px', background: 'transparent', border: 'none', color: C.text, touchAction: 'manipulation' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACIER, flexShrink: 0 }} className="live-pulse" />
          <span style={{ flex: 1 }}>{d.titre}</span>
          <ChevronDown size={14} color={C.muted} style={{ transform: ouvert ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
        </div>
      </button>
      {ouvert && (
        <div style={{ padding: '0 12px 10px' }}>
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: C.text, opacity: .88 }}>{d.explication}</div>
          {echanges.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
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
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') demander(); }} placeholder="pourquoi ? / fais plutôt…"
              style={{ flex: 1, padding: '8px 11px', borderRadius: 11, border: `1.5px solid ${C.border}`, background: '#fff', color: C.text, fontSize: 12.5, outline: 'none' }} />
            <button onClick={demander} disabled={!question.trim() || attente} style={{ width: 36, height: 36, borderRadius: 11, border: 'none', background: question.trim() && !attente ? ACIER : C.card2, color: question.trim() && !attente ? '#fff' : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}><Send size={14} /></button>
          </div>
        </div>
      )}
      {resultat ? (
        <div style={{ padding: '8px 12px 12px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: resultat.erreur ? C.muted : ACIER }}>{resultat.erreur ? `✗ ${resultat.erreur}` : (resultat.tousOk ? '✓ fait' : '△ fait en partie')}</div>
          <Pastilles actions={resultat.resultats} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, padding: '2px 12px 12px' }}>
          {Array.isArray(d.actions) && d.actions.length > 0 && (
            <button onClick={agir} disabled={!!enCours} style={{ flex: 1, padding: '11px 8px', borderRadius: 12, border: 'none', fontSize: 12.5, fontWeight: 900, background: confirme ? MARINE : ACIER, color: '#fff', opacity: enCours ? .6 : 1, touchAction: 'manipulation', boxShadow: '0 3px 10px rgba(27,94,140,.25)' }}>
              {enCours === 'agir' ? '…' : confirme ? 'Confirmer' : d.proposition}
            </button>
          )}
          <button onClick={classer} disabled={!!enCours} style={{ flex: Array.isArray(d.actions) && d.actions.length ? 0.5 : 1, padding: '11px 8px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: '#fff', color: C.text, fontSize: 12.5, fontWeight: 800, opacity: enCours ? .6 : 1, touchAction: 'manipulation' }}>
            {enCours === 'classer' ? '…' : 'Classer'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── une bande ── */
function Bande({ emoji, titre, allumee, phrase, children }) {
  return (
    <section style={{ background: C.card, border: `1.5px solid ${allumee ? 'rgba(27,94,140,.55)' : C.border}`, borderRadius: 18, padding: '12px 14px 14px', boxShadow: allumee ? '0 4px 18px rgba(27,94,140,.14)' : '0 2px 8px rgba(14,51,85,.05)' }}>
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
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, display: 'block' }}>
      <polyline points={d} fill="none" stroke={ACIER} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const heure = (iso) => iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
const ACTEUR = { sentinelle: { e: '●', c: ACIER }, regis: { e: '◆', c: MARINE }, joueur: { e: '○', c: '#5A7E9B' }, ronde: { e: '▲', c: '#5A7E9B' }, app: { e: '□', c: '#5A7E9B' } };

/* ── l'écran ── */
export function SentinelleTableau({ onClose, userName }) {
  const [phrase, setPhrase]   = useState('');
  const [ouverte, setOuverte] = useState(false);
  const [verif, setVerif]     = useState(false);
  const [erreurPorte, setErreurPorte] = useState(null);
  const [t, setT]             = useState(null);
  const [chargement, setChargement] = useState(false);
  const [fermes, setFermes]   = useState({});
  const [toutVoir, setToutVoir] = useState(false);
  const [ligne, setLigne]     = useState('');
  const [reponse, setReponse] = useState(null);
  const [attente, setAttente] = useState(false);
  const ligneRef = useRef(null);

  const charger = async (forcer = false) => {
    setChargement(true);
    const r = await tableauSentinelle(phrase, { forcer });
    setChargement(false);
    if (!r.ok) { setT({ erreur: r.message, dossiers: [], evenements: [] }); playSound('error'); return; }
    setT(r); setFermes({});
    if (r.dossiers?.length) playSound('bubble');
  };
  const entrer = async () => {
    if (!phrase || verif) return;
    setVerif(true); setErreurPorte(null);
    const r = await verifierPhrase(phrase);
    setVerif(false);
    if (!r.ok) { setErreurPorte(r.message); playSound('error'); return; }
    setOuverte(true); playSound('modal'); charger(false);
  };
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
  const par = (genres) => dossiers.filter(d => genres.includes(d.genre));
  const dJoueurs = par(['triche', 'joueur']), dMarche = par(['marche']), dBoite = par(['signalement']), dApp = par(['app']), dInfo = par(['info']);
  const ferme = (id) => setFermes(f => ({ ...f, [id]: true }));
  const b = t?.bandes || {};
  const quand = t?.rediges_le ? heure(t.rediges_le) : null;
  const evenements = t?.evenements || [];
  const frise = Array.isArray(t?.frise) ? t.frise : [];

  return (
    <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, bottom: 0, background: C.bg, zIndex: 62, display: 'flex', flexDirection: 'column', color: C.text }}>
      {/* en-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1.5px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 12, background: C.card2, border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}><ChevronLeft size={20} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.1 }}>Sentinelle</div>
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>{!ouverte ? 'ton associée' : chargement ? 'elle regarde tout…' : quand ? `son point de ${quand}` : 'en ligne'}</div>
        </div>
        {ouverte && (
          <button onClick={() => !chargement && charger(true)} disabled={chargement} aria-label="Refaire le point" style={{ width: 38, height: 38, borderRadius: 12, background: C.card2, border: `1.5px solid ${C.border}`, color: ACIER, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: chargement ? .5 : 1, touchAction: 'manipulation' }}>
            <RefreshCw size={16} style={chargement ? { animation: 'premiumRay 1.1s linear infinite' } : undefined} />
          </button>
        )}
      </div>

      {/* la porte */}
      {!ouverte && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 26px', gap: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>Salut {userName || ''}.</div>
          <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5 }}>J'ai fait ma ronde. Ta phrase, et je te montre l'app telle qu'elle est.</div>
          <input type="password" value={phrase} onChange={e => setPhrase(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') entrer(); }} placeholder="ta phrase de passe" autoFocus
            style={{ padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.card, color: C.text, fontSize: 15, outline: 'none' }} />
          {erreurPorte && <div style={{ fontSize: 12.5, color: C.muted }}>{erreurPorte}</div>}
          <button onClick={entrer} disabled={!phrase || verif} style={{ padding: 14, borderRadius: 16, border: 'none', fontSize: 14.5, fontWeight: 900, background: (!phrase || verif) ? C.card2 : ACIER, color: (!phrase || verif) ? C.muted : '#fff', touchAction: 'manipulation' }}>{verif ? 'je vérifie…' : 'Entrer'}</button>
        </div>
      )}

      {/* le tableau */}
      {ouverte && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px 10px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {chargement && !t && <div style={{ padding: '18px 16px', background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 18, fontSize: 13.5, color: C.muted }}><span className="live-pulse">Elle regarde tout, et fait d'abord ce qu'elle peut faire seule…</span></div>}

          {t && (
            <>
              {/* son mot */}
              {(t.mot || t.erreur) && (
                <div style={{ padding: '14px 16px', background: 'linear-gradient(140deg, #E6F3FC, #D2E8F7)', border: '1.5px solid rgba(27,94,140,.28)', borderRadius: 18 }}>
                  <div style={{ fontSize: 14.5, lineHeight: 1.5, fontWeight: 700, color: MARINE }}>{t.mot}</div>
                  {t.seule && <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.5, color: MARINE, opacity: .8 }}><span style={{ fontWeight: 800 }}>Seule : </span>{t.seule}</div>}
                  {t.erreur && <div style={{ marginTop: 6, fontSize: 12, color: C.muted }}>Je n'ai pas pu refaire le point : {t.erreur}</div>}
                  <Pastilles actions={t.gestes} />
                </div>
              )}

              {/* MARCHÉ */}
              <Bande emoji="📈" titre="Marché $CKM" allumee={dMarche.length > 0} phrase={b.marche}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: -.5 }}>{Number(t.marche?.prix ?? 0).toFixed(1)}</span>
                  <span style={{ fontSize: 11.5, color: C.muted }}>{t.marche?.ferme ? `fermé jusqu'à ${heure(t.marche.jusqu_a)}` : 'ouvert'} · {t.marche?.actions ?? 0} actions · {t.marche?.ordres24h ?? 0} ordre(s) / 24 h</span>
                </div>
                <div style={{ marginTop: 6 }}><Courbe points={t.marche?.courbe} /></div>
                {dMarche.map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={ferme} />)}
              </Bande>

              {/* JOUEURS */}
              <Bande emoji="👤" titre="Joueurs" allumee={dJoueurs.length > 0} phrase={b.joueurs}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{t.economie?.actifs24 ?? 0} aujourd'hui · {t.economie?.actifs7 ?? 0} cette semaine</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(t.joueurs || []).slice(0, 12).map(j => {
                    const mien = dJoueurs.filter(d => String(d.cle).includes(j.code));
                    return (
                      <div key={j.code}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 10, background: mien.length ? 'rgba(27,94,140,.08)' : 'transparent' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: j.actif24 ? ACIER : C.border, flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.nom}{j.surveille ? <span style={{ fontSize: 9.5, fontWeight: 800, color: ACIER, marginLeft: 6 }}>SURVEILLÉ</span> : null}</span>
                          <span style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>niv {j.niveau} · {j.semaine.toLocaleString('fr-FR')} 🍪 sem · {j.minutes} min</span>
                        </div>
                        {mien.map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={ferme} />)}
                      </div>
                    );
                  })}
                </div>
                {dJoueurs.filter(d => !(t.joueurs || []).some(j => String(d.cle).includes(j.code))).map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={ferme} />)}
              </Bande>

              {/* ÉCONOMIE */}
              <Bande emoji="🍪" titre="Économie" allumee={dInfo.length > 0} phrase={b.economie}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div><div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -.5 }}>{Number(t.economie?.semaine ?? 0).toLocaleString('fr-FR')}</div><div style={{ fontSize: 10.5, color: C.muted }}>🍪 gagnés cette semaine</div></div>
                  <div><div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -.5 }}>{t.economie?.actifs7 ?? 0}</div><div style={{ fontSize: 10.5, color: C.muted }}>joueurs actifs / 7 j</div></div>
                </div>
                {dInfo.map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={ferme} />)}
              </Bande>

              {/* L'APP */}
              <Bande emoji="📱" titre="L'app" allumee={dApp.length > 0} phrase={b.app}>
                <div style={{ fontSize: 12.5, color: C.text }}>
                  {t.app?.ouvertures24 ?? 0} ouverture(s) / 24 h · {t.app?.crashs ?? 0} crash{(t.app?.crashs ?? 0) > 1 ? 's' : ''}
                  {Array.isArray(t.app?.versions) && t.app.versions.length > 0 && <span style={{ color: C.muted }}> · {t.app.versions.map(v => `${v.v} ×${v.n}`).join(', ')}</span>}
                </div>
                {dApp.map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={ferme} />)}
              </Bande>

              {/* BOÎTE */}
              <Bande emoji="📮" titre="Boîte" allumee={dBoite.length > 0} phrase={b.boite}>
                <div style={{ fontSize: 12.5 }}>{t.boite?.nouveaux ?? 0} nouveau(x) · {t.boite?.total24 ?? 0} sur 24 h</div>
                {dBoite.map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={ferme} />)}
              </Bande>

              {/* LA FRISE */}
              <section style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 18, padding: '12px 14px 14px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase', color: C.muted, marginBottom: 10 }}>🕒 La journée</div>
                {frise.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {frise.map((f, k) => (
                      <div key={k} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: 'rgba(43,124,178,.08)', borderRadius: 12, borderLeft: `3px solid ${ACIER}` }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: ACIER, flexShrink: 0, minWidth: 38 }}>{f.quand}</span>
                        <span style={{ fontSize: 12.5, color: MARINE, fontWeight: 600, lineHeight: 1.4 }}>{f.texte}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(toutVoir ? evenements : evenements.slice(0, 10)).map((e, k) => {
                    const a = ACTEUR[e.acteur] || ACTEUR.app;
                    return (
                      <div key={k} style={{ display: 'flex', gap: 8, padding: '5px 4px', fontSize: 12, lineHeight: 1.4, borderBottom: `1px solid ${C.card2}` }}>
                        <span style={{ color: C.muted, flexShrink: 0, minWidth: 38, fontVariantNumeric: 'tabular-nums' }}>{heure(e.quand)}</span>
                        <span style={{ color: a.c, flexShrink: 0, width: 10 }}>{a.e}</span>
                        <span style={{ color: e.acteur === 'sentinelle' ? MARINE : C.text, fontWeight: e.acteur === 'sentinelle' ? 700 : 500 }}>{e.texte}</span>
                      </div>
                    );
                  })}
                  {!evenements.length && <div style={{ fontSize: 12.5, color: C.muted }}>Rien sur 24 h.</div>}
                </div>
                {evenements.length > 10 && (
                  <button onClick={() => setToutVoir(v => !v)} style={{ marginTop: 8, background: 'transparent', border: 'none', color: ACIER, fontSize: 12, fontWeight: 800, padding: '6px 4px', touchAction: 'manipulation' }}>
                    {toutVoir ? 'moins' : `tout voir (${evenements.length})`}
                  </button>
                )}
                <div style={{ marginTop: 8, fontSize: 10.5, color: C.muted }}>● elle · ◆ toi · ○ un joueur · ▲ une ronde · □ l'app</div>
              </section>

              {reponse && (
                <div style={{ padding: '12px 14px', background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 16 }}>
                  <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 6 }}>tu : {reponse.question}</div>
                  {attente ? <span className="live-pulse" style={{ fontSize: 13, color: C.muted }}>elle regarde…</span>
                    : <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: reponse.erreur ? C.muted : C.text }}>{reponse.texte}<Pastilles actions={reponse.actions} /></div>}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* la ligne du bas */}
      {ouverte && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 12px 14px', borderTop: `1.5px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
          <input ref={ligneRef} value={ligne} onChange={e => setLigne(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') parler(); }} placeholder="dis-lui quelque chose…"
            style={{ flex: 1, padding: '11px 14px', borderRadius: 16, border: `1.5px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14, outline: 'none' }} />
          <button onClick={parler} disabled={!ligne.trim() || attente} style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: ligne.trim() && !attente ? ACIER : C.card2, color: ligne.trim() && !attente ? '#fff' : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}><Send size={18} /></button>
        </div>
      )}
    </div>
  );
}

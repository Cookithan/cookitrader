import { useRef, useState } from "react";
import { ChevronLeft, ChevronDown, RefreshCw, Send, Table2 } from "lucide-react";
import { verifierPhrase } from "../../lib/sentinelle.js";
import { THEME_SENTINELLE, ACIER, MARINE } from "../../data/sentinelleTheme.js";
import { pileSentinelle, deciderDossier, demanderDossier, parlerSentinelle } from "../../lib/sentinelleIA.js";
import { playSound } from "../../lib/audio.js";
import { haptic } from "../../lib/haptic.js";

/* ════════════════════════════════════════════════════
   SentinelleDossiers — la pile de dossiers
   ────────────────────────────────────────────────────
   Régis, le 09/09 : « quand on va sur la Sentinelle, d'abord les choses
   à traiter — simplifié, avec la Sentinelle qui est là autrement, pas un
   chat à part. Tous les jours. Un ASSOCIÉ. »

   Un associé ne t'attend pas dans une fenêtre : il a déjà trié, et il te
   tend les dossiers. L'écran, c'est ça :

     · son mot en haut — ce qui t'attend, en une phrase
     · une carte par chose à décider, ÉCRITE PAR ELLE : sa phrase, et le
       geste qu'elle propose déjà rempli. Un tap = c'est fait. Ou tu
       ouvres la carte : son analyse, et une ligne pour lui demander
       « pourquoi ? » — elle répond LÀ, dans le dossier, pas ailleurs
     · pile vide = ce qu'elle a fait seule, en une ligne
     · tout en bas, une seule ligne — « dis-lui quelque chose » — pour
       le rare cas sans dossier. Ça remplace le chat sans le perdre

   Ce qu'elle a fait revient avec son résultat réel, sous la carte : on
   voit ce qu'elle a fait, pas ce qu'elle dit avoir fait.

   L'ancienne console reste derrière « Données ».
   Props : onClose, onVoirDonnees, userName
═══════════════════════════════════════════════════════ */

const C = THEME_SENTINELLE;

const GENRE = {
  triche:      { emoji: '🕵️', mot: 'triche' },
  marche:      { emoji: '📈', mot: 'marché' },
  signalement: { emoji: '📮', mot: 'signalement' },
  joueur:      { emoji: '👤', mot: 'joueur' },
  app:         { emoji: '📱', mot: 'app' },
  info:        { emoji: '💬', mot: 'à savoir' },
};

/* Pastilles de gestes : un geste → une ligne lisible. */
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

/* ── Une carte ─────────────────────────────────────── */
function Dossier({ d, phrase, onFerme }) {
  const [ouvert, setOuvert]     = useState(false);
  const [question, setQuestion] = useState('');
  const [echanges, setEchanges] = useState(Array.isArray(d.echanges) ? d.echanges : []);
  const [attente, setAttente]   = useState(false);
  const [enCours, setEnCours]   = useState(null);   // 'agir' | 'classer'
  const [resultat, setResultat] = useState(null);   // après « agir »
  const [confirme, setConfirme] = useState(false);  // 2e tap pour les gestes lourds
  const grave = d.gravite === 'haute';
  const g = GENRE[d.genre] || GENRE.info;
  const lourd = Array.isArray(d.actions) && d.actions.some(a => a.outil === 'agir' && ['sanctionner', 'lever_sanction', 'corriger_cours', 'maintenance', 'forcer_maj', 'creer_code_promo', 'desactiver_code_promo'].includes(a.entree?.action));

  const agir = async () => {
    if (enCours) return;
    /* Un geste lourd se confirme d'un second tap, inline — jamais un
       window.confirm, et jamais en couleur d'or (convention du projet). */
    if (lourd && !confirme) { setConfirme(true); return; }
    setEnCours('agir');
    const r = await deciderDossier(phrase, d.id, 'agir');
    setEnCours(null);
    if (!r.ok) { setResultat({ erreur: r.message }); playSound('error'); return; }
    setResultat(r);
    playSound(r.tousOk ? 'success' : 'error'); haptic(r.tousOk ? 'success' : 'warning');
    setTimeout(() => onFerme(d.id, 'fait'), 1400);
  };

  const classer = async () => {
    if (enCours) return;
    setEnCours('classer');
    const r = await deciderDossier(phrase, d.id, 'classer');
    setEnCours(null);
    if (!r.ok) { playSound('error'); return; }
    playSound('toggle');
    onFerme(d.id, 'classe');
  };

  const demander = async () => {
    const q = question.trim();
    if (!q || attente) return;
    setQuestion('');
    setEchanges(e => [...e, { qui: 'regis', texte: q }]);
    setAttente(true);
    const r = await demanderDossier(phrase, d.id, q);
    setAttente(false);
    if (!r.ok) { setEchanges(e => [...e, { qui: 'sentinelle', texte: r.message, erreur: true }]); playSound('error'); return; }
    setEchanges(r.echanges || []);
    playSound('bubble');
  };

  return (
    <div style={{
      background: C.card, border: `1.5px solid ${grave ? 'rgba(27,94,140,.55)' : C.border}`, borderRadius: 18,
      boxShadow: grave ? '0 4px 16px rgba(27,94,140,.14)' : '0 2px 8px rgba(14,51,85,.05)',
      overflow: 'hidden',
    }}>
      {/* Tête : sa phrase, tapable pour ouvrir */}
      <button onClick={() => setOuvert(o => !o)} style={{ width: '100%', textAlign: 'left', padding: '14px 14px 10px', background: 'transparent', border: 'none', color: C.text, touchAction: 'manipulation' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13 }}>{g.emoji}</span>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: grave ? ACIER : C.muted }}>{g.mot}{grave ? ' · à voir en premier' : ''}</span>
          <ChevronDown size={14} color={C.muted} style={{ marginLeft: 'auto', transform: ouvert ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.4 }}>{d.titre}</div>
      </button>

      {/* Corps : son analyse + l'échange dans le dossier */}
      {ouvert && (
        <div style={{ padding: '0 14px 12px' }}>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: C.text, opacity: .88, padding: '10px 12px', background: C.card2, borderRadius: 12 }}>
            {d.explication}
          </div>
          {echanges.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              {echanges.map((e, k) => (
                <div key={k} style={{ display: 'flex', justifyContent: e.qui === 'regis' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '88%', padding: '8px 11px', borderRadius: 14, fontSize: 13, lineHeight: 1.45, whiteSpace: 'pre-wrap',
                    background: e.qui === 'regis' ? ACIER : (e.erreur ? C.card2 : '#F3F9FD'),
                    color: e.qui === 'regis' ? '#fff' : C.text, border: e.qui === 'regis' ? 'none' : `1px solid ${C.border}` }}>
                    {e.texte}
                    {e.qui !== 'regis' && <Pastilles actions={e.actions} />}
                  </div>
                </div>
              ))}
            </div>
          )}
          {attente && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}><span className="live-pulse">elle regarde…</span></div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') demander(); }}
              placeholder="pourquoi ? / fais plutôt…"
              style={{ flex: 1, padding: '9px 12px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: '#fff', color: C.text, fontSize: 13, outline: 'none' }} />
            <button onClick={demander} disabled={!question.trim() || attente} style={{ width: 38, height: 38, borderRadius: 12, border: 'none', background: question.trim() && !attente ? ACIER : C.card2, color: question.trim() && !attente ? '#fff' : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}>
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Pied : les deux boutons, ou le résultat */}
      {resultat ? (
        <div style={{ padding: '10px 14px 14px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: resultat.erreur ? C.muted : ACIER }}>
            {resultat.erreur ? `✗ ${resultat.erreur}` : (resultat.tousOk ? '✓ fait' : '△ fait en partie')}
          </div>
          <Pastilles actions={resultat.resultats} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, padding: '4px 14px 14px' }}>
          {Array.isArray(d.actions) && d.actions.length > 0 && (
            <button onClick={agir} disabled={!!enCours} style={{
              flex: 1, padding: '12px 10px', borderRadius: 14, border: 'none', fontSize: 13, fontWeight: 900,
              background: confirme ? MARINE : ACIER, color: '#fff', opacity: enCours ? .6 : 1, touchAction: 'manipulation',
              boxShadow: '0 3px 10px rgba(27,94,140,.25)',
            }}>
              {enCours === 'agir' ? '…' : confirme ? 'Confirmer' : d.proposition}
            </button>
          )}
          <button onClick={classer} disabled={!!enCours} style={{
            flex: Array.isArray(d.actions) && d.actions.length ? 0.55 : 1, padding: '12px 10px', borderRadius: 14,
            border: `1.5px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 13, fontWeight: 800,
            opacity: enCours ? .6 : 1, touchAction: 'manipulation',
          }}>
            {enCours === 'classer' ? '…' : 'Classer'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── L'écran ───────────────────────────────────────── */
export function SentinelleDossiers({ onClose, onVoirDonnees, userName }) {
  const [phrase, setPhrase]   = useState('');
  const [ouverte, setOuverte] = useState(false);
  const [verif, setVerif]     = useState(false);
  const [erreurPorte, setErreurPorte] = useState(null);

  const [pile, setPile]         = useState(null);     // { mot, seule, dossiers, rediges_le, fraiche, erreur }
  const [chargement, setChargement] = useState(false);
  const [fermes, setFermes]     = useState({});       // id → 'fait' | 'classe'

  const [ligne, setLigne]       = useState('');
  const [reponse, setReponse]   = useState(null);     // { texte, actions }
  const [attente, setAttente]   = useState(false);
  const ligneRef = useRef(null);

  const charger = async (forcer = false) => {
    setChargement(true);
    const r = await pileSentinelle(phrase, { forcer });
    setChargement(false);
    if (!r.ok) { setPile({ mot: '', seule: '', dossiers: [], erreur: r.message }); playSound('error'); return; }
    setPile(r); setFermes({});
    if (r.dossiers?.length) playSound('bubble');
  };

  const entrer = async () => {
    if (!phrase || verif) return;
    setVerif(true); setErreurPorte(null);
    const r = await verifierPhrase(phrase);
    setVerif(false);
    if (!r.ok) { setErreurPorte(r.message); playSound('error'); return; }
    setOuverte(true); playSound('modal');
    charger(false);
  };

  const parler = async () => {
    const t = ligne.trim();
    if (!t || attente) return;
    setLigne(''); setAttente(true); setReponse({ question: t });
    const r = await parlerSentinelle({ phrase, message: t });
    setAttente(false);
    setReponse({ question: t, texte: r.ok ? r.reponse : r.message, actions: r.ok ? r.actions : null, erreur: !r.ok });
    playSound(r.ok ? 'bubble' : 'error');
  };

  const visibles = (pile?.dossiers || []).filter(d => !fermes[d.id]);
  const quand = pile?.rediges_le ? new Date(pile.rediges_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, bottom: 0, background: C.bg, zIndex: 62, display: 'flex', flexDirection: 'column', color: C.text }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1.5px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 12, background: C.card2, border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.1 }}>Sentinelle</div>
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>
            {!ouverte ? 'ton associée' : chargement ? 'elle trie…' : quand ? `pile de ${quand}${pile?.fraiche ? '' : ' · à jour'}` : 'en ligne'}
          </div>
        </div>
        {ouverte && (
          <>
            <button onClick={() => !chargement && charger(true)} disabled={chargement} aria-label="Refaire le tri" style={{ width: 38, height: 38, borderRadius: 12, background: C.card2, border: `1.5px solid ${C.border}`, color: ACIER, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: chargement ? .5 : 1, touchAction: 'manipulation' }}>
              <RefreshCw size={16} style={chargement ? { animation: 'premiumRay 1.1s linear infinite' } : undefined} />
            </button>
            <button onClick={onVoirDonnees} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 11px', borderRadius: 12, background: C.card2, border: `1.5px solid ${C.border}`, color: ACIER, fontSize: 11.5, fontWeight: 800, touchAction: 'manipulation' }}>
              <Table2 size={14} /> Données
            </button>
          </>
        )}
      </div>

      {/* La porte */}
      {!ouverte && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 26px', gap: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>Salut {userName || ''}.</div>
          <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5 }}>J'ai déjà trié. Ta phrase, et je te tends ce qui t'attend.</div>
          <input type="password" value={phrase} onChange={e => setPhrase(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') entrer(); }} placeholder="ta phrase de passe" autoFocus
            style={{ padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.card, color: C.text, fontSize: 15, outline: 'none' }} />
          {erreurPorte && <div style={{ fontSize: 12.5, color: C.muted }}>{erreurPorte}</div>}
          <button onClick={entrer} disabled={!phrase || verif} style={{ padding: 14, borderRadius: 16, border: 'none', fontSize: 14.5, fontWeight: 900, background: (!phrase || verif) ? C.card2 : ACIER, color: (!phrase || verif) ? C.muted : '#fff', touchAction: 'manipulation' }}>
            {verif ? 'je vérifie…' : 'Entrer'}
          </button>
        </div>
      )}

      {/* La pile */}
      {ouverte && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 10px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {chargement && !pile && (
            <div style={{ padding: '18px 16px', background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 18, fontSize: 13.5, color: C.muted }}>
              <span className="live-pulse">Elle regarde tout, et fait d'abord ce qu'elle peut faire seule…</span>
            </div>
          )}

          {pile && (
            <>
              {/* Son mot */}
              {(pile.mot || pile.erreur) && (
                <div style={{ padding: '14px 16px', background: 'linear-gradient(140deg, #E6F3FC, #D2E8F7)', border: '1.5px solid rgba(27,94,140,.28)', borderRadius: 18, fontSize: 14, lineHeight: 1.5, fontWeight: 600, color: MARINE }}>
                  {pile.mot}
                  {pile.erreur && <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: C.muted }}>Je n'ai pas pu refaire le tri : {pile.erreur}</div>}
                </div>
              )}

              {/* Les dossiers */}
              {visibles.map(d => <Dossier key={d.id} d={d} phrase={phrase} onFerme={(id, s) => setFermes(f => ({ ...f, [id]: s }))} />)}

              {/* Pile vide */}
              {!visibles.length && !chargement && (
                <div style={{ padding: '22px 16px', background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 18, textAlign: 'center' }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>☕</div>
                  <div style={{ fontSize: 14.5, fontWeight: 800 }}>Rien à décider.</div>
                  {pile.seule && <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>{pile.seule}</div>}
                </div>
              )}

              {/* Ce qu'elle a fait seule, quand il y a aussi des dossiers */}
              {visibles.length > 0 && pile.seule && (
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, padding: '4px 6px' }}>
                  <span style={{ fontWeight: 800, color: ACIER }}>Seule : </span>{pile.seule}
                </div>
              )}
              {Array.isArray(pile.gestes) && pile.gestes.length > 0 && <div style={{ padding: '0 6px' }}><Pastilles actions={pile.gestes} /></div>}
            </>
          )}

          {/* La réponse à la ligne du bas, si on s'en est servi */}
          {reponse && (
            <div style={{ padding: '12px 14px', background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 16 }}>
              <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 6 }}>tu : {reponse.question}</div>
              {attente ? <span className="live-pulse" style={{ fontSize: 13, color: C.muted }}>elle regarde…</span>
                : <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: reponse.erreur ? C.muted : C.text }}>{reponse.texte}<Pastilles actions={reponse.actions} /></div>}
            </div>
          )}
        </div>
      )}

      {/* La ligne du bas */}
      {ouverte && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 12px 14px', borderTop: `1.5px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
          <input ref={ligneRef} value={ligne} onChange={e => setLigne(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') parler(); }}
            placeholder="dis-lui quelque chose…"
            style={{ flex: 1, padding: '11px 14px', borderRadius: 16, border: `1.5px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14, outline: 'none' }} />
          <button onClick={parler} disabled={!ligne.trim() || attente} style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: ligne.trim() && !attente ? ACIER : C.card2, color: ligne.trim() && !attente ? '#fff' : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}>
            <Send size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

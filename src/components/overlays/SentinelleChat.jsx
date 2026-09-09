import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, Table2 } from "lucide-react";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { verifierPhrase } from "../../lib/sentinelle.js";
import { parlerSentinelle } from "../../lib/sentinelleIA.js";
import { playSound } from "../../lib/audio.js";

/* ════════════════════════════════════════════════════
   SentinelleChat — la Sentinelle comme une conversation
   ────────────────────────────────────────────────────
   Régis, le 09/09 : « ce n'est pas une page de données que je veux,
   c'est un associé ». Cet écran remplace la console à onglets comme
   porte d'entrée. On tape sa phrase, elle parle la première — ce qui
   demande une décision, ce qu'elle a fait seule, ce qui a changé — et
   on lui répond comme à quelqu'un.

   Ce qu'elle fait passe par le serveur (fonction `sentinelle`) : la clé
   du modèle n'est jamais ici, la phrase n'est gardée qu'en mémoire le
   temps de l'écran, et chaque geste revient avec son résultat, affiché
   sous sa bulle. On voit ce qu'elle a fait, pas seulement ce qu'elle
   dit avoir fait.

   L'ancienne console n'est pas supprimée : elle est derrière le bouton
   « Données », pour le jour où il faut un formulaire précis ou relire
   le registre brut. La conversation d'abord, les tableaux à portée.

   Props : onClose, onVoirDonnees, userName
═══════════════════════════════════════════════════════ */

const C = {
  bg: '#1B100A', card: '#2A1A11', card2: '#3A2418',
  text: '#F5E9D6', muted: 'rgba(245,233,214,.62)', border: 'rgba(255,255,255,.10)',
};

/* Un geste → une pastille lisible. Les lectures (lire_*) s'affichent en
   retrait : savoir qu'elle a regardé un joueur avant d'en parler compte,
   mais ce n'est pas un acte. */
function pastille(a) {
  const r = a.resultat || {};
  const ok = r.ok !== false && !r.refus;
  if (a.outil === 'lire_joueur')          return { texte: `a regardé ${a.entree?.code_ou_pseudo ?? '?'}`, ton: 'lecture' };
  if (a.outil === 'lire_signalements')    return { texte: 'a relu les signalements', ton: 'lecture' };
  if (a.outil === 'ecrire_au_joueur')     return { texte: ok ? `✉ message déposé chez ${a.entree?.user_code}` : `✗ message non envoyé — ${r.message ?? ''}`, ton: ok ? 'fait' : 'refus' };
  if (a.outil === 'traiter_signalement')  return { texte: ok ? `#${a.entree?.id} → ${a.entree?.statut}` : `✗ signalement — ${r.message ?? ''}`, ton: ok ? 'fait' : 'refus' };
  if (a.outil === 'agir') {
    const nom = a.entree?.action ?? '?';
    if (r.refus === 'confirmation_requise') return { texte: `${nom} — attend ton accord`, ton: 'attente' };
    if (r.refus === 'plafond')              return { texte: `${nom} — au-dessus du plafond, attend ton accord`, ton: 'attente' };
    return { texte: ok ? `✓ ${nom}${r.message ? ' · ' + r.message : ''}` : `✗ ${nom} — ${r.message ?? 'refusé'}`, ton: ok ? 'fait' : 'refus' };
  }
  return { texte: a.outil, ton: 'lecture' };
}

const TONS = {
  fait:    { background: 'rgba(212,160,23,.18)', color: '#F3CE8B', border: '1px solid rgba(212,160,23,.35)' },
  attente: { background: 'rgba(245,233,214,.08)', color: '#F5E9D6', border: '1px dashed rgba(245,233,214,.35)' },
  refus:   { background: 'rgba(0,0,0,.35)', color: 'rgba(245,233,214,.75)', border: `1px solid ${ESPRESSO}` },
  lecture: { background: 'transparent', color: 'rgba(245,233,214,.5)', border: '1px solid transparent' },
};

export function SentinelleChat({ onClose, onVoirDonnees, userName }) {
  const [phrase, setPhrase]       = useState('');
  const [ouverte, setOuverte]     = useState(false);
  const [verif, setVerif]         = useState(false);
  const [erreurPorte, setErreurPorte] = useState(null);

  const [fil, setFil]             = useState([]);      // [{ id, role, texte, actions, systeme }]
  const [saisie, setSaisie]       = useState('');
  const [attente, setAttente]     = useState(false);
  const finRef = useRef(null);
  const saisieRef = useRef(null);
  const idRef = useRef(0);
  const ajouter = (m) => setFil(f => [...f, { id: ++idRef.current, ...m }]);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [fil, attente]);

  /* ── La porte ── */
  const entrer = async () => {
    if (!phrase || verif) return;
    setVerif(true); setErreurPorte(null);
    const r = await verifierPhrase(phrase);
    setVerif(false);
    if (!r.ok) { setErreurPorte(r.message); playSound('error'); return; }
    setOuverte(true);
    playSound('modal');
    briefing();
  };

  /* ── Elle parle la première ── */
  const briefing = async () => {
    setAttente(true);
    const r = await parlerSentinelle({ phrase, mode: 'briefing' });
    setAttente(false);
    if (!r.ok) { ajouter({ role: 'assistant', systeme: true, texte: r.message }); return; }
    const anciens = (r.historique || []).map(h => ({
      role: h.role, texte: h.contenu, actions: h.actions || null, ancien: true,
    }));
    setFil(anciens.map(m => ({ id: ++idRef.current, ...m })));
    ajouter({ role: 'assistant', texte: r.reponse, actions: r.actions });
    playSound('bubble');
  };

  /* ── Un tour ── */
  const envoyer = async () => {
    const texte = saisie.trim();
    if (!texte || attente) return;
    setSaisie('');
    ajouter({ role: 'user', texte });
    setAttente(true);
    const r = await parlerSentinelle({ phrase, message: texte });
    setAttente(false);
    if (!r.ok) { ajouter({ role: 'assistant', systeme: true, texte: r.message }); playSound('error'); return; }
    ajouter({ role: 'assistant', texte: r.reponse, actions: r.actions });
    playSound(r.actions?.some(a => a.outil === 'agir' || a.outil === 'ecrire_au_joueur') ? 'success' : 'bubble');
    saisieRef.current?.focus();
  };

  const surTouche = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer(); }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430, bottom: 0, background: C.bg, zIndex: 60,
      display: 'flex', flexDirection: 'column', color: C.text,
    }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 12, background: C.card2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, border: 'none' }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.1 }}>Sentinelle</div>
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>
            {ouverte ? (attente ? 'elle regarde…' : 'en ligne · chaque geste est journalisé') : 'ton associée pour CookiTrader'}
          </div>
        </div>
        {ouverte && (
          <button onClick={onVoirDonnees} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 11px', borderRadius: 12,
            background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: 11.5, fontWeight: 700,
            touchAction: 'manipulation',
          }}>
            <Table2 size={14} /> Données
          </button>
        )}
      </div>

      {/* ── Avant la porte ── */}
      {!ouverte && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 26px', gap: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>Salut {userName || ''}.</div>
          <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5 }}>
            Je surveille l'app, j'agis quand ça protège, et je te dis ce qui compte. Ta phrase, et je te fais le point.
          </div>
          <input
            type="password" value={phrase} onChange={e => setPhrase(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') entrer(); }}
            placeholder="ta phrase de passe" autoFocus
            style={{ padding: '14px 16px', borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 15, outline: 'none' }}
          />
          {erreurPorte && <div style={{ fontSize: 12.5, color: C.muted }}>{erreurPorte}</div>}
          <button onClick={entrer} disabled={!phrase || verif} style={{
            padding: '14px', borderRadius: 16, border: 'none', fontSize: 14.5, fontWeight: 900,
            background: (!phrase || verif) ? C.card2 : GOLD, color: (!phrase || verif) ? C.muted : '#fff',
            touchAction: 'manipulation',
          }}>
            {verif ? 'je vérifie…' : 'Entrer'}
          </button>
        </div>
      )}

      {/* ── Le fil ── */}
      {ouverte && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fil.map((m, i) => {
            const elle = m.role === 'assistant';
            const separateur = m.ancien && (i === 0 || !fil[i - 1]?.ancien) ? null : (!m.ancien && fil[i - 1]?.ancien);
            return (
              <div key={m.id}>
                {separateur && (
                  <div style={{ textAlign: 'center', fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', margin: '6px 0 12px' }}>
                    — maintenant —
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: elle ? 'flex-start' : 'flex-end' }}>
                  <div style={{
                    maxWidth: '86%', padding: '11px 14px', borderRadius: 18,
                    borderBottomLeftRadius: elle ? 6 : 18, borderBottomRightRadius: elle ? 18 : 6,
                    background: m.systeme ? 'rgba(0,0,0,.35)' : elle ? C.card : GOLD,
                    color: elle ? C.text : '#fff',
                    border: m.systeme ? `1px solid ${ESPRESSO}` : 'none',
                    fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                    opacity: m.ancien ? .72 : 1,
                  }}>
                    {m.texte}
                  </div>
                </div>
                {elle && Array.isArray(m.actions) && m.actions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, paddingLeft: 4 }}>
                    {m.actions.map((a, k) => {
                      const p = pastille(a);
                      return (
                        <span key={k} style={{ ...TONS[p.ton], padding: '4px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                          {p.texte}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {attente && (
            <div style={{ display: 'flex' }}>
              <div style={{ padding: '11px 14px', borderRadius: 18, borderBottomLeftRadius: 6, background: C.card, color: C.muted, fontSize: 13 }}>
                <span className="live-pulse">…</span>
              </div>
            </div>
          )}
          <div ref={finRef} />
        </div>
      )}

      {/* ── La saisie ── */}
      {ouverte && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 12px 14px', borderTop: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
          <textarea
            ref={saisieRef} value={saisie} onChange={e => setSaisie(e.target.value)} onKeyDown={surTouche}
            placeholder="dis-lui quoi faire, ou demande-lui" rows={1}
            style={{
              flex: 1, resize: 'none', padding: '11px 14px', borderRadius: 16, maxHeight: 96,
              border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14, lineHeight: 1.4, outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button onClick={envoyer} disabled={!saisie.trim() || attente} style={{
            width: 44, height: 44, borderRadius: 14, border: 'none', flexShrink: 0, alignSelf: 'flex-end',
            background: (!saisie.trim() || attente) ? C.card2 : GOLD, color: (!saisie.trim() || attente) ? C.muted : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation',
          }}>
            <Send size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

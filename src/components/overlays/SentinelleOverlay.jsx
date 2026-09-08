import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, RefreshCw } from "lucide-react";
import {
  faireUneRonde, derniersRapports, grouperParRonde, anciennete, agir, journal, verifierPhrase,
} from "../../lib/sentinelle.js";
import { ACTIONS_SENTINELLE, GROUPES, ACTIONS_PAR_CONSTAT } from "../../data/sentinelleActions.js";
import { APP_INFO } from "../../lib/appInfo.js";

/* ════════════════════════════════════════════════════
   SentinelleOverlay — la santé de l'app, et de quoi agir
   ────────────────────────────────────────────────────
   Écran RÉSERVÉ AUX ADMINS (la porte n'apparaît que pour eux dans les
   Paramètres).

   ─── LE PRINCIPE DE L'ÉCRAN ─────────────────────────
   DU CONSTAT AU GESTE, SANS CHERCHER. Quand une ronde signale un
   portefeuille orphelin, le bouton qui le nettoie est proposé JUSTE
   SOUS le constat, déjà rempli avec le bon code. Sans ça il faudrait
   lire l'alerte, retenir un code, changer d'onglet, retrouver la bonne
   action dans une liste de neuf — quatre occasions d'abandonner.

   ─── LA HIÉRARCHIE ──────────────────────────────────
   1. Une phrase en haut : est-ce que ça va, oui ou non.
   2. Ce qui ne va pas, trié par gravité, le reste replié.
   3. Agir, rangé en trois familles au lieu de neuf lignes à plat.

   Les verdicts « tout va bien » sont regroupés en UNE ligne : les lire
   un par un chaque soir, c'est apprendre à ne plus rien lire.

   Palette café-only : une alerte est ESPRESSO, jamais rouge.
═══════════════════════════════════════════════════════ */

const TONS = {
  alerte: { fond: 'rgba(74,44,23,.16)',   bord: 'rgba(93,58,30,.55)',   puce: '⛔' },
  voir:   { fond: 'rgba(193,127,60,.13)', bord: 'rgba(193,127,60,.45)', puce: '⚠️' },
  ok:     { fond: 'rgba(212,160,23,.10)', bord: 'rgba(212,160,23,.32)', puce: '✅' },
};
const RANG = { alerte: 0, voir: 1, ok: 2 };

const ESPRESSO = '#5D3A1E';

function quand(iso) {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1)  return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

/* Cherche un code joueur dans le détail d'un constat, pour pré-remplir
   l'action qu'on propose dessous. Format des codes : XXX-XXX. */
function codeDansDetail(detail = []) {
  for (const ligne of detail) {
    const m = String(ligne).match(/\b([A-Z0-9]{3}-[A-Z0-9]{3})\b/);
    if (m) return m[1];
  }
  return null;
}

/* ── Un constat ──────────────────────────────────────
   Replié par défaut sauf s'il s'agit d'une alerte : ce qui va bien n'a
   pas à occuper de la place. */
function Constat({ r, age, onAgir, C }) {
  const ton = TONS[r.verdict] || TONS.ok;
  const [ouvert, setOuvert] = useState(r.verdict === 'alerte');
  const detail = Array.isArray(r.detail) ? r.detail : [];
  const remedes = (ACTIONS_PAR_CONSTAT[r.categorie] || [])
    .map(id => ACTIONS_SENTINELLE.find(a => a.id === id))
    .filter(Boolean);
  const code = codeDansDetail(detail);

  return (
    <div style={{
      background: ton.fond, border: `1.5px solid ${ton.bord}`,
      borderRadius: 14, padding: '11px 13px', marginBottom: 9,
    }}>
      <button
        onPointerDown={() => setOuvert(o => !o)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0,
          display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 15, lineHeight: 1.2, flexShrink: 0 }}>{ton.puce}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: C.text, lineHeight: 1.35 }}>
            {r.titre}
          </span>
          <span style={{ display: 'block', fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 }}>
            {r.categorie}
            {/* Depuis quand : une alerte qui vient d'apparaître et une
                qui dure depuis trois jours ne demandent pas la même
                chose. */}
            {age && r.verdict !== 'ok' && (
              <span style={{ opacity: .85 }}>{' · '}{age.rondes <= 1 ? 'NOUVEAU' : `depuis ${age.rondes} rondes`}</span>
            )}
          </span>
        </span>
        <span style={{ fontSize: 11, color: C.muted, transform: ouvert ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
      </button>

      {ouvert && (
        <>
          {detail.length > 0 && (
            <div style={{
              marginTop: 9, paddingTop: 9, borderTop: `1px solid ${ton.bord}`,
              fontSize: 11, color: C.text, lineHeight: 1.6,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {detail.map((d, i) => <div key={i}>{d}</div>)}
            </div>
          )}

          {/* Le geste qui répond au constat, proposé ici même. */}
          {r.verdict !== 'ok' && remedes.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {remedes.map(a => (
                <button
                  key={a.id}
                  onPointerDown={() => onAgir(a.id, code)}
                  style={{
                    padding: '7px 11px', borderRadius: 10,
                    background: 'rgba(212,160,23,.14)', border: '1px solid rgba(212,160,23,.42)',
                    color: '#8A6A12', fontSize: 11, fontWeight: 800, touchAction: 'manipulation',
                  }}
                >
                  {a.titre} ›
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Un formulaire d'action ──────────────────────────── */
function Formulaire({ act, phrase, onFait, C }) {
  const [valeurs, setValeurs]   = useState(act.prefill || {});
  const [confirme, setConfirme] = useState(false);
  const [enCours, setEnCours]   = useState(false);
  const [retour, setRetour]     = useState(null);

  const manquant = act.champs.some(c => c.requis && !valeurs[c.nom]);

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

  return (
    <div style={{ padding: '2px 0 4px' }}>
      {act.aide && (
        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55, marginBottom: 11 }}>{act.aide}</div>
      )}

      {act.champs.map(c => (
        <div key={c.nom} style={{ marginBottom: 9 }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 4 }}>
            {c.label}{c.requis ? ' *' : ''}
          </div>
          {c.type === 'oui_non' ? (
            <div style={{ display: 'flex', gap: 7 }}>
              {['oui', 'non'].map(v => (
                <button
                  key={v}
                  onPointerDown={() => setValeurs(x => ({ ...x, [c.nom]: v }))}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 12, fontWeight: 800,
                    background: valeurs[c.nom] === v ? 'rgba(212,160,23,.18)' : C.card2,
                    border: `1px solid ${valeurs[c.nom] === v ? 'rgba(212,160,23,.5)' : C.border}`,
                    color: valeurs[c.nom] === v ? '#8A6A12' : C.muted,
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
              style={{
                width: '100%', boxSizing: 'border-box',
                background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '9px 11px', fontSize: 13, color: C.text,
              }}
            />
          )}
        </div>
      ))}

      {/* Deux temps sur ce qui fait mal. Confirmation en ligne, jamais
          un window.confirm (convention du projet). */}
      {act.danger && !confirme ? (
        <button
          onPointerDown={() => setConfirme(true)}
          disabled={manquant}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 11, marginTop: 2,
            background: 'transparent', border: `1.5px solid ${C.border}`,
            color: C.muted, fontSize: 12.5, fontWeight: 800, opacity: manquant ? .5 : 1,
          }}
        >
          {manquant ? 'Champs obligatoires manquants' : 'Continuer'}
        </button>
      ) : (
        <button
          onPointerDown={() => !enCours && !manquant && executer()}
          disabled={enCours || manquant}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 11, marginTop: 2,
            background: act.danger ? 'rgba(74,44,23,.18)' : 'rgba(212,160,23,.16)',
            border: `1.5px solid ${act.danger ? 'rgba(93,58,30,.6)' : 'rgba(212,160,23,.5)'}`,
            color: act.danger ? ESPRESSO : '#8A6A12',
            fontSize: 12.5, fontWeight: 800, opacity: (enCours || manquant) ? .5 : 1,
          }}
        >
          {enCours ? 'En cours…' : act.danger ? 'Confirmer' : 'Exécuter'}
        </button>
      )}

      {retour && (
        <div style={{
          marginTop: 10, padding: '10px 12px', borderRadius: 11, fontSize: 12, fontWeight: 700,
          background: retour.ok ? 'rgba(212,160,23,.12)' : 'rgba(74,44,23,.14)',
          border: `1.5px solid ${retour.ok ? 'rgba(212,160,23,.4)' : 'rgba(93,58,30,.5)'}`,
          color: retour.ok ? '#8A6A12' : ESPRESSO,
        }}>
          {retour.ok ? '✅ ' : '⛔ '}{retour.message}
        </div>
      )}
    </div>
  );
}

/* ── L'onglet AGIR ───────────────────────────────────── */
function PanneauActions({ ouvrir, prefill, onOuvrir, C }) {
  const [phrase, setPhrase]     = useState('');
  const [groupe, setGroupe]     = useState(null);
  const [registre, setRegistre] = useState([]);
  /* La serrure est VÉRIFIÉE, pas devinée : tant que la base n'a pas
     confirmé la phrase, rien ne s'ouvre. La version précédente
     déverrouillait dès le premier caractère tapé — un rideau, pas une
     serrure. */
  const [ouverte, setOuverte]     = useState(false);
  const [verifEnCours, setVerif]  = useState(false);
  const [erreur, setErreur]       = useState(null);

  const verifier = async () => {
    if (!phrase || verifEnCours) return;
    setVerif(true); setErreur(null);
    const r = await verifierPhrase(phrase);
    setVerif(false);
    if (r.ok) setOuverte(true);
    else { setOuverte(false); setErreur(r.message); }
  };

  const chargerJournal = useCallback(async () => setRegistre(await journal(12)), []);
  useEffect(() => { chargerJournal(); }, [chargerJournal]);

  /* Arrivée depuis un constat : on déplie directement la bonne famille
     et la bonne action. */
  useEffect(() => {
    if (!ouvrir) return;
    const act = ACTIONS_SENTINELLE.find(a => a.id === ouvrir);
    if (act) setGroupe(act.groupe);
  }, [ouvrir]);

  const deverrouille = ouverte;

  return (
    <>
      {/* La serrure. Tant que la BASE n'a pas confirmé la phrase, les
          formulaires ne s'affichent pas : montrer des boutons qu'on ne
          peut pas utiliser, c'est promettre puis refuser. */}
      <div style={{
        background: deverrouille ? 'rgba(212,160,23,.10)' : C.card,
        border: `1.5px solid ${deverrouille ? 'rgba(212,160,23,.45)' : erreur ? 'rgba(93,58,30,.5)' : C.border}`,
        borderRadius: 14, padding: '12px 14px', marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 15 }}>{deverrouille ? '🔓' : '🔒'}</span>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.3 }}>
            {deverrouille ? 'Déverrouillé' : 'Phrase de passe'}
          </span>
        </div>

        {deverrouille ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 12, color: C.text, fontWeight: 700 }}>
              Phrase reconnue — la console est ouverte.
            </span>
            <button
              onPointerDown={() => { setOuverte(false); setPhrase(''); setGroupe(null); onOuvrir(null); }}
              style={{
                flexShrink: 0, padding: '7px 11px', borderRadius: 10,
                background: C.card2, border: `1px solid ${C.border}`,
                color: C.muted, fontSize: 11, fontWeight: 800,
              }}
            >Verrouiller</button>
          </div>
        ) : (
          <>
            <input
              type="password"
              value={phrase}
              onChange={e => { setPhrase(e.target.value); setErreur(null); }}
              onKeyDown={e => { if (e.key === 'Enter') verifier(); }}
              placeholder="celle que toi seul connais"
              autoComplete="off"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: C.card2, border: `1px solid ${erreur ? 'rgba(93,58,30,.5)' : C.border}`,
                borderRadius: 10, padding: '10px 12px', fontSize: 13, color: C.text,
              }}
            />
            <button
              onPointerDown={verifier}
              disabled={!phrase || verifEnCours}
              style={{
                width: '100%', marginTop: 8, padding: '10px 0', borderRadius: 10,
                background: 'rgba(212,160,23,.16)', border: '1.5px solid rgba(212,160,23,.5)',
                color: '#8A6A12', fontSize: 12.5, fontWeight: 800,
                opacity: (!phrase || verifEnCours) ? .5 : 1, touchAction: 'manipulation',
              }}
            >
              {verifEnCours ? 'Vérification…' : 'Vérifier'}
            </button>
            {erreur && (
              <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 700, color: ESPRESSO }}>
                ⛔ {erreur}
              </div>
            )}
          </>
        )}

        <div style={{ fontSize: 10, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
          Elle part vérifier en base et n'est gardée nulle part — ni ici, ni
          dans le téléphone. Dix essais ratés ferment la porte 15 minutes.
        </div>
      </div>

      {!deverrouille ? (
        <div style={{ fontSize: 11.5, color: C.muted, textAlign: 'center', padding: '18px 10px', lineHeight: 1.6 }}>
          Tape ta phrase et appuie sur <strong>Vérifier</strong> pour ouvrir la console.
        </div>
      ) : GROUPES.map(g => {
        const actions = ACTIONS_SENTINELLE.filter(a => a.groupe === g.id);
        const ouvertG = groupe === g.id;
        return (
          <div key={g.id} style={{ marginBottom: 9 }}>
            <button
              onPointerDown={() => { setGroupe(ouvertG ? null : g.id); onOuvrir(null); }}
              style={{
                width: '100%', textAlign: 'left',
                background: C.card, border: `1.5px solid ${ouvertG ? 'rgba(212,160,23,.45)' : C.border}`,
                borderRadius: 14, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 19, flexShrink: 0 }}>{g.emoji}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 800, color: C.text }}>{g.titre}</span>
                <span style={{ display: 'block', fontSize: 11, color: C.muted, marginTop: 1 }}>{g.resume}</span>
              </span>
              <span style={{ fontSize: 12, color: C.muted, transform: ouvertG ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
            </button>

            {ouvertG && (
              <div style={{ paddingLeft: 8, marginTop: 8 }}>
                {actions.map(a => {
                  const actif = ouvrir === a.id;
                  return (
                    <div key={a.id} style={{
                      background: C.card,
                      border: `1px solid ${actif ? 'rgba(212,160,23,.45)' : C.border}`,
                      borderRadius: 12, marginBottom: 7, overflow: 'hidden',
                    }}>
                      <button
                        onPointerDown={() => onOuvrir(actif ? null : a.id)}
                        style={{
                          width: '100%', textAlign: 'left', background: 'none', border: 'none',
                          padding: '10px 12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 9,
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: a.danger ? ESPRESSO : C.text }}>
                            {a.titre}
                          </span>
                          <span style={{ display: 'block', fontSize: 10.5, color: C.muted, marginTop: 1, lineHeight: 1.4 }}>
                            {a.resume}
                          </span>
                        </span>
                        <span style={{ fontSize: 11, color: C.muted, transform: actif ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
                      </button>
                      {actif && (
                        <div style={{ padding: '0 12px 10px' }}>
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
              </div>
            )}
          </div>
        );
      })}

      {/* Le registre : c'est ce qui rend la console vérifiable. */}
      {deverrouille && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8 }}>
            Ce qui a été fait
          </div>
          {registre.length === 0 ? (
            <div style={{ fontSize: 11.5, color: C.muted }}>Rien pour l'instant.</div>
          ) : registre.map(l => (
            <div key={l.id} style={{
              display: 'flex', gap: 9, alignItems: 'baseline',
              fontSize: 11, color: C.muted, padding: '6px 0', borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ flexShrink: 0 }}>{l.resultat === 'ok' ? '✅' : l.resultat === 'refus' ? '⛔' : '⚠️'}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ color: C.text }}>{l.action}</strong>{l.cible ? ` · ${l.cible}` : ''}
                <span style={{ display: 'block', opacity: .85 }}>{l.message}</span>
              </span>
              <span style={{ flexShrink: 0, fontSize: 10 }}>{quand(l.created_at)}</span>
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

  const charger = useCallback(async () => {
    setChargement(true);
    const rondes = grouperParRonde(await derniersRapports(200));
    setHistorique(rondes);
    setRapports(rondes.length ? rondes[0].verdicts : []);
    setHorodatage(rondes.length ? rondes[0].instant : null);
    setImmediat(false);
    setChargement(false);
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const controler = async () => {
    setEnCours(true);
    setRapports(await faireUneRonde({ enregistrer: false }));
    setHorodatage(new Date().toISOString());
    setImmediat(true);
    setEnCours(false);
  };

  /* Depuis un constat : on bascule sur Agir, la bonne action dépliée et
     le code du joueur déjà rempli. */
  const allerAgir = (actionId, code) => {
    setPrefill(code || null);
    setActionOuverte(actionId);
    setOnglet('agir');
  };

  const tries    = [...rapports].sort((a, b) => (RANG[a.verdict] ?? 9) - (RANG[b.verdict] ?? 9));
  const problemes = tries.filter(r => r.verdict !== 'ok');
  const sains     = tries.filter(r => r.verdict === 'ok');
  const alertes   = problemes.filter(r => r.verdict === 'alerte').length;

  const titre = chargement ? 'Lecture…'
    : !rapports.length ? 'Aucune ronde enregistrée'
    : alertes ? `${alertes} alerte${alertes > 1 ? 's' : ''}`
    : problemes.length ? `${problemes.length} point${problemes.length > 1 ? 's' : ''} à regarder`
    : 'Tout va bien';

  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430, bottom: 0,
      background: C.bg, zIndex: 62, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
        borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0,
      }}>
        <button
          onClick={onClose} aria-label="Retour"
          style={{
            width: 36, height: 36, borderRadius: 12, background: C.card2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text,
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>🛡️ Sentinelle</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
            {horodatage ? `${immediat ? 'contrôle immédiat' : 'dernière ronde'} ${quand(horodatage)}` : `version ${APP_INFO.version}`}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 28px' }}>

        {/* La réponse à « est-ce que ça va », en gros, avant tout le reste. */}
        <div style={{
          background: alertes ? 'rgba(74,44,23,.14)' : problemes.length ? 'rgba(193,127,60,.12)' : 'rgba(212,160,23,.10)',
          border: `1.5px solid ${alertes ? 'rgba(93,58,30,.5)' : problemes.length ? 'rgba(193,127,60,.4)' : 'rgba(212,160,23,.35)'}`,
          borderRadius: 16, padding: '14px 16px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 13,
        }}>
          <span style={{ fontSize: 26, lineHeight: 1 }}>{alertes ? '⛔' : problemes.length ? '⚠️' : '✅'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: alertes ? ESPRESSO : C.text }}>{titre}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              {rapports.length ? `${rapports.length} contrôles passés` : 'la première partira toute seule'}
            </div>
          </div>
          <button
            onPointerDown={() => !enCours && controler()}
            disabled={enCours}
            aria-label="Contrôler maintenant"
            style={{
              flexShrink: 0, width: 38, height: 38, borderRadius: 12,
              background: 'rgba(212,160,23,.16)', border: '1.5px solid rgba(212,160,23,.45)',
              color: '#8A6A12', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: enCours ? .5 : 1, touchAction: 'manipulation',
            }}
          >
            <RefreshCw size={16} style={enCours ? { animation: 'premiumRay 1.1s linear infinite' } : undefined} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
          {[['etat', 'État'], ['agir', 'Agir']].map(([id, label]) => {
            const actif = onglet === id;
            return (
              <button
                key={id}
                onPointerDown={() => setOnglet(id)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 11, fontSize: 12.5, fontWeight: 800,
                  background: actif ? 'rgba(212,160,23,.18)' : C.card2,
                  border: `1px solid ${actif ? 'rgba(212,160,23,.5)' : C.border}`,
                  color: actif ? '#8A6A12' : C.muted, touchAction: 'manipulation',
                }}
              >{label}</button>
            );
          })}
        </div>

        {onglet === 'agir' ? (
          <PanneauActions
            ouvrir={actionOuverte}
            prefill={prefill}
            onOuvrir={setActionOuverte}
            C={C}
          />
        ) : chargement ? (
          <div style={{ textAlign: 'center', color: C.muted, fontSize: 12, padding: '30px 0' }}>Lecture…</div>
        ) : !rapports.length ? (
          <div style={{
            background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14,
            padding: 18, textAlign: 'center', color: C.muted, fontSize: 12, lineHeight: 1.6,
          }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>🛡️</div>
            Aucune ronde enregistrée pour l'instant.<br />
            Elle partira toute seule dès qu'un joueur ouvrira l'app.
          </div>
        ) : (
          <>
            {problemes.map((r, i) => (
              <Constat key={r.id ?? i} r={r} age={immediat ? null : anciennete(historique, r)} onAgir={allerAgir} C={C} />
            ))}

            {/* Ce qui va bien tient en une ligne. Le détailler chaque
                soir, c'est apprendre à ne plus rien lire. */}
            {sains.length > 0 && (
              <>
                <button
                  onPointerDown={() => setToutVoir(v => !v)}
                  style={{
                    width: '100%', textAlign: 'left', marginTop: problemes.length ? 6 : 0,
                    background: 'rgba(212,160,23,.08)', border: `1px solid rgba(212,160,23,.28)`,
                    borderRadius: 12, padding: '10px 13px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 9,
                  }}
                >
                  <span style={{ fontSize: 14 }}>✅</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: C.text }}>
                    {sains.length} contrôle{sains.length > 1 ? 's' : ''} sans rien à signaler
                  </span>
                  <span style={{ fontSize: 11, color: C.muted, transform: toutVoir ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
                </button>
                {toutVoir && (
                  <div style={{ marginTop: 9 }}>
                    {sains.map((r, i) => (
                      <Constat key={r.id ?? `ok${i}`} r={r} age={null} onAgir={allerAgir} C={C} />
                    ))}
                  </div>
                )}
              </>
            )}

            <div style={{ marginTop: 16, fontSize: 10.5, color: C.muted, lineHeight: 1.65 }}>
              Les rondes constatent, elles ne corrigent jamais rien d'elles-mêmes.
              Quand un constat a un remède, le bouton est proposé dessous.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

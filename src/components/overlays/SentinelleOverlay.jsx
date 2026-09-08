import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { faireUneRonde, derniersRapports, grouperParRonde, anciennete, agir, journal } from "../../lib/sentinelle.js";
import { ACTIONS_SENTINELLE } from "../../data/sentinelleActions.js";
import { APP_INFO } from "../../lib/appInfo.js";

/* ════════════════════════════════════════════════════
   SentinelleOverlay — l'état de santé de l'app, depuis le téléphone
   ────────────────────────────────────────────────────
   Écran RÉSERVÉ AUX ADMINS (la porte est dans les Paramètres, elle
   n'apparaît que pour eux). Il montre ce que la vigie a constaté :
   rendements impossibles, cohérence du marché, versions en
   circulation, crashs, signaux de triche.

   DEUX ONGLETS, volontairement séparés :

   · CONSTATER — les verdicts des rondes. « Dernière ronde » est ce qui
     a été enregistré tout seul, sans personne ; le bouton « Contrôler »
     rejoue une ronde immédiate sans rien écrire dans l'historique (on
     regarde, on ne pollue pas).

   · AGIR — la console. Sanctionner, compenser, corriger le cours,
     forcer une mise à jour, basculer la maintenance. Chaque geste passe
     par la fonction Postgres `action_sentinelle`, qui exige la phrase
     de passe et journalise tout, refus compris.

   Pourquoi séparés : mettre un bouton qui réécrit un solde à côté d'une
   ligne d'information, c'est finir par cliquer sans lire.

   ⚠️ Les rondes, elles, ne corrigent JAMAIS rien d'elles-mêmes. Une
   correction automatique appliquée depuis un client est réécrasée par
   le joueur en cinq secondes (leçon de la 1.29) ou rejouée à chaque
   changement d'appareil (piège de mai 2026). Agir reste un geste
   humain, délibéré, avec une phrase à taper.

   Palette café-only : une alerte est ESPRESSO (sombre), jamais rouge.
═══════════════════════════════════════════════════════ */

const TONS = {
  alerte: { fond: 'rgba(74,44,23,.16)',   bord: 'rgba(93,58,30,.55)',   texte: '#5D3A1E', puce: '⛔' },
  voir:   { fond: 'rgba(193,127,60,.13)', bord: 'rgba(193,127,60,.45)', texte: '#8B5A2B', puce: '⚠️' },
  ok:     { fond: 'rgba(212,160,23,.10)', bord: 'rgba(212,160,23,.35)', texte: '#8A6A12', puce: '✅' },
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

function Verdict({ r, age, C }) {
  const ton = TONS[r.verdict] || TONS.ok;
  const [ouvert, setOuvert] = useState(r.verdict === 'alerte');
  const detail = Array.isArray(r.detail) ? r.detail : [];

  return (
    <div style={{
      background: ton.fond,
      border: `1.5px solid ${ton.bord}`,
      borderRadius: 14,
      padding: '11px 13px',
      marginBottom: 9,
    }}>
      <button
        onPointerDown={() => detail.length && setOuvert(o => !o)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0,
          display: 'flex', alignItems: 'flex-start', gap: 9,
          cursor: detail.length ? 'pointer' : 'default',
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
                chose. Sans ça, on relit chaque soir la même ligne sans
                savoir si elle est neuve. */}
            {age && r.verdict !== 'ok' && (
              <span style={{ opacity: .85 }}>
                {' · '}{age.rondes <= 1 ? 'NOUVEAU' : `depuis ${age.rondes} rondes`}
              </span>
            )}
            {detail.length ? ` · ${detail.length} détail${detail.length > 1 ? 's' : ''}` : ''}
          </span>
        </span>
        {detail.length > 0 && (
          <span style={{ fontSize: 11, color: C.muted, transform: ouvert ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
        )}
      </button>

      {ouvert && detail.length > 0 && (
        <div style={{
          marginTop: 9, paddingTop: 9, borderTop: `1px solid ${ton.bord}`,
          fontSize: 11, color: C.text, lineHeight: 1.65,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {detail.map((d, i) => <div key={i}>{d}</div>)}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   PanneauActions — la console, protégée par la phrase
   ────────────────────────────────────────────────────
   La phrase de passe vit dans un state React, le temps de l'écran, et
   nulle part ailleurs : ni localStorage, ni state persisté. La garder
   reviendrait à la remettre dans le téléphone — soit exactement ce
   qu'on cherchait à éviter en la sortant du code.

   Deux temps obligatoires sur les actions marquées `danger` : on
   remplit, puis on confirme. La confirmation est en ligne, jamais un
   window.confirm (convention du projet), et en teinte espresso.
═══════════════════════════════════════════════════════ */
function PanneauActions({ C }) {
  const [phrase, setPhrase]     = useState('');
  const [ouverte, setOuverte]   = useState(null);   /* id de l'action dépliée */
  const [valeurs, setValeurs]   = useState({});
  const [confirme, setConfirme] = useState(false);
  const [enCours, setEnCours]   = useState(false);
  const [retour, setRetour]     = useState(null);
  const [registre, setRegistre] = useState([]);

  const chargerJournal = useCallback(async () => setRegistre(await journal(15)), []);
  useEffect(() => { chargerJournal(); }, [chargerJournal]);

  const choisir = (id) => {
    setOuverte(o => (o === id ? null : id));
    setValeurs({});
    setConfirme(false);
    setRetour(null);
  };

  const executer = async (act) => {
    setEnCours(true);
    setRetour(null);
    const params = {};
    for (const c of act.champs) {
      const v = valeurs[c.nom];
      if (v === undefined || v === '') continue;
      params[c.nom] = c.type === 'nombre' ? Number(v)
                    : c.type === 'oui_non' ? (v === 'oui')
                    : v;
    }
    const r = await agir(phrase, act.id, params);
    setRetour(r);
    setEnCours(false);
    setConfirme(false);
    if (r?.ok) { setValeurs({}); setOuverte(null); }
    chargerJournal();
  };

  const champManquant = (act) => act.champs.some(c => c.requis && !valeurs[c.nom]);

  return (
    <>
      <div style={{
        background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14,
        padding: '12px 14px', marginBottom: 14,
      }}>
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 7 }}>
          Phrase de passe
        </div>
        <input
          type="password"
          value={phrase}
          onChange={e => setPhrase(e.target.value)}
          placeholder="celle que toi seul connais"
          autoComplete="off"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: '10px 12px', fontSize: 13, color: C.text,
          }}
        />
        <div style={{ fontSize: 10, color: C.muted, marginTop: 7, lineHeight: 1.5 }}>
          Elle ne quitte cet écran que pour être vérifiée en base, et n'est
          gardée nulle part. Dix essais ratés ferment la porte 15 minutes.
        </div>
      </div>

      {ACTIONS_SENTINELLE.map(act => {
        const ouvert = ouverte === act.id;
        return (
          <div key={act.id} style={{
            background: C.card,
            border: `1.5px solid ${ouvert ? (act.danger ? 'rgba(93,58,30,.55)' : 'rgba(212,160,23,.45)') : C.border}`,
            borderRadius: 14, marginBottom: 9, overflow: 'hidden',
          }}>
            <button
              onPointerDown={() => choisir(act.id)}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                padding: '12px 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 800, color: C.text }}>
                  {act.titre}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
                  {act.resume}
                </span>
              </span>
              <span style={{ fontSize: 12, color: C.muted, transform: ouvert ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
            </button>

            {ouvert && (
              <div style={{ padding: '0 14px 14px' }}>
                {act.aide && (
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55, marginBottom: 11 }}>
                    {act.aide}
                  </div>
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

                {act.danger && !confirme ? (
                  <button
                    onPointerDown={() => setConfirme(true)}
                    disabled={!phrase || champManquant(act)}
                    style={{
                      width: '100%', marginTop: 4, padding: '11px 0', borderRadius: 11,
                      background: 'transparent', border: `1.5px solid ${C.border}`,
                      color: C.muted, fontSize: 12.5, fontWeight: 800,
                      opacity: (!phrase || champManquant(act)) ? .5 : 1,
                    }}
                  >
                    {!phrase ? 'Phrase de passe requise' : champManquant(act) ? 'Champs obligatoires manquants' : 'Continuer'}
                  </button>
                ) : (
                  <button
                    onPointerDown={() => !enCours && executer(act)}
                    disabled={enCours || !phrase || champManquant(act)}
                    style={{
                      width: '100%', marginTop: 4, padding: '11px 0', borderRadius: 11,
                      background: act.danger ? 'rgba(74,44,23,.18)' : 'rgba(212,160,23,.16)',
                      border: `1.5px solid ${act.danger ? 'rgba(93,58,30,.6)' : 'rgba(212,160,23,.5)'}`,
                      color: act.danger ? '#5D3A1E' : '#8A6A12',
                      fontSize: 12.5, fontWeight: 800,
                      opacity: (enCours || !phrase || champManquant(act)) ? .5 : 1,
                    }}
                  >
                    {enCours ? 'En cours…' : act.danger ? 'Confirmer' : 'Exécuter'}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {retour && (
        <div style={{
          marginTop: 12, padding: '11px 13px', borderRadius: 12, fontSize: 12, fontWeight: 700,
          background: retour.ok ? 'rgba(212,160,23,.12)' : 'rgba(74,44,23,.14)',
          border: `1.5px solid ${retour.ok ? 'rgba(212,160,23,.4)' : 'rgba(93,58,30,.5)'}`,
          color: retour.ok ? '#8A6A12' : '#5D3A1E',
        }}>
          {retour.ok ? '✅ ' : '⛔ '}{retour.message}
        </div>
      )}

      {/* Le registre : c'est ce qui rend la console vérifiable. On peut
          toujours savoir ce qui a été fait, et ce qui a été refusé. */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8 }}>
          Registre
        </div>
        {registre.length === 0 ? (
          <div style={{ fontSize: 11.5, color: C.muted }}>Aucune action enregistrée.</div>
        ) : registre.map(l => (
          <div key={l.id} style={{
            display: 'flex', gap: 9, alignItems: 'baseline',
            fontSize: 11, color: C.muted, padding: '5px 0',
            borderBottom: `1px solid ${C.border}`,
          }}>
            <span style={{ flexShrink: 0 }}>{l.resultat === 'ok' ? '✅' : l.resultat === 'refus' ? '⛔' : '⚠️'}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ color: C.text }}>{l.action}</strong>
              {l.cible ? ` · ${l.cible}` : ''}
              <span style={{ display: 'block', opacity: .85 }}>{l.message}</span>
            </span>
            <span style={{ flexShrink: 0, fontSize: 10 }}>{quand(l.created_at)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function SentinelleOverlay({ onClose, C }) {
  const [rapports, setRapports]   = useState([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours]     = useState(false);
  const [horodatage, setHorodatage] = useState(null);
  const [immediat, setImmediat]   = useState(false);
  const [historique, setHistorique] = useState([]);
  const [onglet, setOnglet] = useState('constater');

  /* Historique : on ne garde que la ronde la plus récente. Empiler
     trois rondes de suite donnerait trois fois les mêmes verdicts. */
  const charger = useCallback(async () => {
    setChargement(true);
    /* On rapatrie plusieurs rondes, pas seulement la dernière : c'est
       ce qui permet de dire depuis quand chaque verdict dure. */
    const tous = await derniersRapports(200);
    const rondes = grouperParRonde(tous);
    setHistorique(rondes);
    if (rondes.length) {
      setRapports(rondes[0].verdicts);
      setHorodatage(rondes[0].instant);
    } else {
      setRapports([]);
      setHorodatage(null);
    }
    setImmediat(false);
    setChargement(false);
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const controlerMaintenant = async () => {
    setEnCours(true);
    const r = await faireUneRonde({ enregistrer: false });
    setRapports(r);
    setHorodatage(new Date().toISOString());
    setImmediat(true);
    setEnCours(false);
  };

  const tries = [...rapports].sort((a, b) => (RANG[a.verdict] ?? 9) - (RANG[b.verdict] ?? 9));
  const alertes = rapports.filter(r => r.verdict === 'alerte').length;
  const aVoir   = rapports.filter(r => r.verdict === 'voir').length;

  const resume = alertes
    ? `${alertes} alerte${alertes > 1 ? 's' : ''} — il y a quelque chose à corriger`
    : aVoir
      ? `${aVoir} point${aVoir > 1 ? 's' : ''} à regarder`
      : rapports.length ? 'Tout est en ordre' : 'Aucune ronde enregistrée';

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
          onClick={onClose}
          aria-label="Retour"
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
            {chargement ? 'Lecture…' : resume}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 28px' }}>

        {/* Deux temps bien séparés : CONSTATER puis AGIR. Les mélanger
            mettrait un bouton qui réécrit un solde à côté d'une ligne
            d'information — on finirait par cliquer sans lire. */}
        <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
          {[['constater', '🔍 Constater'], ['agir', '⚙️ Agir']].map(([id, label]) => {
            const actif = onglet === id;
            return (
              <button
                key={id}
                onPointerDown={() => setOnglet(id)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 11, fontSize: 12, fontWeight: 800,
                  background: actif ? 'rgba(212,160,23,.18)' : C.card2,
                  border: `1px solid ${actif ? 'rgba(212,160,23,.5)' : C.border}`,
                  color: actif ? '#8A6A12' : C.muted,
                  touchAction: 'manipulation',
                }}
              >{label}</button>
            );
          })}
        </div>

        {onglet === 'agir' ? <PanneauActions C={C} /> : (
        <>

        <div style={{
          background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14,
          padding: '12px 14px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4 }}>
              {immediat ? 'Contrôle immédiat' : 'Dernière ronde'}
            </div>
            <div style={{ fontSize: 12.5, color: C.text, fontWeight: 700, marginTop: 3 }}>
              {horodatage ? quand(horodatage) : 'jamais'}
              <span style={{ color: C.muted, fontWeight: 600 }}> · version {APP_INFO.version}</span>
            </div>
          </div>
          <button
            onPointerDown={controlerMaintenant}
            disabled={enCours}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 13px', borderRadius: 12,
              background: 'rgba(212,160,23,.16)', border: '1.5px solid rgba(212,160,23,.5)',
              color: '#8A6A12', fontSize: 12, fontWeight: 800,
              opacity: enCours ? .6 : 1, cursor: enCours ? 'default' : 'pointer',
              touchAction: 'manipulation',
            }}
          >
            <RefreshCw size={14} style={enCours ? { animation: 'premiumRay 1.1s linear infinite' } : undefined} />
            {enCours ? 'Ronde…' : 'Contrôler'}
          </button>
        </div>

        {chargement ? (
          <div style={{ textAlign: 'center', color: C.muted, fontSize: 12, padding: '30px 0' }}>
            Lecture des rapports…
          </div>
        ) : tries.length === 0 ? (
          <div style={{
            background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14,
            padding: 18, textAlign: 'center', color: C.muted, fontSize: 12, lineHeight: 1.6,
          }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>🛡️</div>
            Aucune ronde n'a encore été enregistrée.<br />
            Lance un contrôle, ou attends qu'un joueur ouvre l'app :
            la première ronde part toute seule.
            <div style={{ marginTop: 10, fontSize: 11, opacity: .8 }}>
              Si rien ne vient jamais, c'est que <strong>MIGRATION_SENTINELLE.sql</strong> n'est pas passé.
            </div>
          </div>
        ) : (
          tries.map((r, i) => (
            <Verdict
              key={r.id ?? i}
              r={r}
              age={immediat ? null : anciennete(historique, r)}
              C={C}
            />
          ))
        )}

        <div style={{ marginTop: 16, fontSize: 10.5, color: C.muted, lineHeight: 1.65 }}>
          Les rondes ne corrigent jamais rien d'elles-mêmes : elles constatent.
          Pour agir, c'est l'onglet à côté — et il demande la phrase de passe,
          parce qu'un pseudo ne protège rien.
        </div>

        </>
        )}
      </div>
    </div>
  );
}

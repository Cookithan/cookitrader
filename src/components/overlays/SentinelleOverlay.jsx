import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { faireUneRonde, derniersRapports, grouperParRonde, anciennete } from "../../lib/sentinelle.js";
import { APP_INFO } from "../../lib/appInfo.js";

/* ════════════════════════════════════════════════════
   SentinelleOverlay — l'état de santé de l'app, depuis le téléphone
   ────────────────────────────────────────────────────
   Écran RÉSERVÉ AUX ADMINS (la porte est dans les Paramètres, elle
   n'apparaît que pour eux). Il montre ce que la vigie a constaté :
   rendements impossibles, cohérence du marché, versions en
   circulation, crashs, signaux de triche.

   Deux sources, volontairement distinctes :
   · « Dernière ronde »  — ce qui a été enregistré tout seul, sans
                           personne, par le premier client venu.
   · bouton « Contrôler » — une ronde immédiate, à la demande, qui
                           n'écrit rien dans l'historique (on regarde,
                           on ne pollue pas).

   Elle ne propose AUCUN bouton de correction, et c'est délibéré :
   corriger un compte depuis un client, c'est le piège de mai 2026
   (débit rejoué à chaque changement d'appareil) et celui de la 1.29
   (correction écrasée par le joueur en cinq secondes). La vigie
   constate ; les corrections passent par du SQL, une fois, en
   conscience.

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

export function SentinelleOverlay({ onClose, C }) {
  const [rapports, setRapports]   = useState([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours]     = useState(false);
  const [horodatage, setHorodatage] = useState(null);
  const [immediat, setImmediat]   = useState(false);
  const [historique, setHistorique] = useState([]);

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
          La sentinelle constate, elle ne corrige jamais rien : une correction
          appliquée depuis un client est réécrasée par le joueur en quelques
          secondes. Les corrections passent par du SQL, une fois, en conscience.
        </div>
      </div>
    </div>
  );
}

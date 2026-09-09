import { useEffect, useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { THEME_SENTINELLE, ACIER, MARINE, BLEU, VERRE, OMBRE, OMBRE_VIVE, DEGRADE, CHAMP } from "../../data/sentinelleTheme.js";
import { GROUPES, ACTIONS_SENTINELLE } from "../../data/sentinelleActions.js";
import { agir, modifierJoueur, derniersRapports, journal, prixMarche, signalementsOuverts, listerSignalements, traiterSignalement, manquesConnus, lireMode, changerMode, gestesEnAttente, annulerGeste, garderGeste } from "../../lib/sentinelle.js";
import { playSound } from "../../lib/audio.js";
import { haptic } from "../../lib/haptic.js";

/* ════════════════════════════════════════════════════
   SentinelleCoupDoeil — la console SANS elle, donc sans un centime
   ────────────────────────────────────────────────────
   Cookithan, le 09/09 : « si jamais je ne veux pas dépenser des tokens,
   donne-moi la possibilité de faire des actions rapides sans la
   Sentinelle — pas qu'elle lance son script alors que je veux juste
   voir un truc ».

   LE PROBLÈME QU'ELLE RÉSOUT
   ──────────────────────────
   Ouvrir la console appelait `tableauSentinelle` dès que la phrase
   passait. Autrement dit : venir vérifier une seule chose — le cours,
   un signalement, ce qu'on a fait hier — coûtait un tour de modèle
   complet, avec ses outils et sa lecture. On finit par ne plus ouvrir
   la console, ce qui est exactement l'inverse du but.

   CE QUI EST GRATUIT, ET POURQUOI
   ───────────────────────────────
   Tout ce qui est ici lit ou écrit la base DIRECTEMENT, par la clé
   publique et les fonctions `security definer`. Aucun appel au modèle,
   donc aucun jeton :

     · les rapports de la dernière ronde   (sentinelle_rapports)
     · le journal des gestes                (sentinelle_journal)
     · le cours                             (market_state)
     · la boîte                             (fonctions de sql/SIGNALEMENTS.sql)
     · les onze gestes + modifier_joueur    (action_sentinelle & co)
     · ce sur quoi elle a bute              (sentinelle_journal, action manque)

   Ce sont les MÊMES gestes que ceux qu'elle propose dans ses dossiers.
   La différence n'est pas la puissance, c'est qui décide : ici c'est
   Cookithan qui choisit et remplit, là c'est elle qui prépare et lui
   qui valide d'un tap. Payer sert à ce qu'elle CHERCHE — pas à ce
   qu'elle exécute.

   LES RONDES CONTINUENT SANS ELLE
   ───────────────────────────────
   Les alertes affichées ici viennent de la vigie déterministe (pg_cron,
   toutes les 10 minutes, du SQL pur). Elles sont donc à jour même si on
   ne lui a rien demandé depuis des jours. C'est ce qui rend cette page
   utile et pas seulement économe.

   Props : phrase (déjà vérifiée par le parent), onVersElle
═══════════════════════════════════════════════════════ */

const C = THEME_SENTINELLE;
const CONTOUR = `1.5px solid ${BLEU[200]}`;

/* Les quatre lectures gratuites, en une passe. Hors du composant : rien
   ici ne dépend de son état, et l'effet de montage peut donc s'en servir
   sans la traîner en dépendance. */
const lire = (phrase) => Promise.all([
  derniersRapports(20), journal(40), prixMarche(), signalementsOuverts(), manquesConnus(), lireMode(),
  gestesEnAttente(phrase),
]);

/* Les libellés des champs, pour que l'avant/après se lise sans être
   développeur. Un champ absent d'ici s'affiche sous son nom brut : mieux
   vaut un nom technique qu'une ligne muette. */
const NOMS = {
  level: 'niveau', xp: 'XP', cookies: 'cookies', cafes: 'cafés',
  total_earned: 'cumul', weekly_earned: 'gains de la semaine',
  prestige_level: 'prestige', streak: 'série', active_theme: 'thème',
  active_title: 'titre', user_bio: 'bio', unlocked: 'objets',
  combien: 'actions retirées', shares: 'actions', motif: 'motif',
};
const GESTES_NOMS = {
  sanctionner: 'Sanction', lever_sanction: 'Sanction levée',
  modifier_joueur: 'Compte modifié', compenser: 'Compensation',
  retirer_actions: 'Actions retirées', nettoyer_portefeuille: 'Portefeuille vidé',
  fermer_marche: 'Marché fermé', ouvrir_marche: 'Marché rouvert',
  ecrire_au_joueur: 'Message envoyé', traiter_signalement: 'Signalement classé',
};

/* Les trois positions. L'ordre va du moins cher au plus cher : on lit un
   interrupteur de gauche a droite, et c'est la depense qui augmente. */
const MODES = [
  { id: 'non',  titre: 'non-autonome',  sous: "aucune ronde · zéro euro",  quoi: "Elle ne se réveille plus toute seule. La vigie SQL, le coup d'œil et les douze gestes continuent — tout ça est gratuit. Tu vérifies toi-même, et si tu lui parles c'est toi qui décides de payer." },
  { id: 'semi', titre: 'semi-autonome',  sous: 'elle prépare, tu décides',      quoi: "Elle ronde, répond aux joueurs, compense dans ses plafonds, et te laisse en dossier tout ce qui demande ta décision. Au plus une ronde toutes les 3 h, jamais la nuit, et seulement s'il s'est passé quelque chose." },
  { id: 'full', titre: 'full-autonome',  sous: 'elle agit seule',                quoi: "Elle exécute sans te demander : sanctions, comptes, compensations, réponses. Tout est annulable en un tap depuis l'écran de retour, et un budget quotidien l'arrête." },
];

const heure = (iso) => iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
const jour  = (iso) => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '';

/* flexShrink: 0 — SANS LUI, RIEN NE DEFILE.
   Le conteneur parent est un flex en colonne qui defile. Dans un flex,
   flex-shrink vaut 1 PAR DEFAUT : au lieu de deborder (et donc de creer
   du defilement), les enfants se font ecraser pour tenir dans la hauteur.
   Combine a l'overflow:hidden ci-dessous, le bas du bloc etait purement
   et simplement coupe — Cookithan voyait deux positions sur trois dans
   « Sentinelle autonomie » et n'avait rien a faire glisser.
   Regle generale : tout enfant direct d'un flex-column qui defile doit
   porter flexShrink: 0. */
/* ── Un bloc, replié par défaut ─────────────────────
   Sept sections dépliées font trois écrans de défilement pour trouver
   celle qu'on veut. Le titre porte le compte : on sait s'il y a quelque
   chose dedans sans l'ouvrir. */
function Bloc({ emoji, titre, compte, teinte, ouvertParDefaut = false, children }) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  return (
    <section style={{ background: VERRE, border: CONTOUR, borderRadius: 18, boxShadow: OMBRE, overflow: 'hidden', flexShrink: 0 }}>
      <button
        onClick={() => setOuvert(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', background: 'transparent', border: 'none', textAlign: 'left', touchAction: 'manipulation' }}
      >
        <span style={{ width: 28, height: 28, borderRadius: 9, background: teinte || DEGRADE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, boxShadow: '0 3px 8px rgba(14,51,85,.18)' }}>{emoji}</span>
        <span style={{ flex: 1, fontSize: 11.5, fontWeight: 900, letterSpacing: 1.3, textTransform: 'uppercase', color: MARINE }}>{titre}</span>
        {compte != null && compte !== 0 && (
          <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', background: DEGRADE, padding: '3px 9px', borderRadius: 20 }}>{compte}</span>
        )}
        <ChevronDown size={16} color={C.muted} style={{ transform: ouvert ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
      </button>
      {ouvert && <div style={{ padding: '0 14px 14px' }}>{children}</div>}
    </section>
  );
}

/* ── Un geste, avec son formulaire ──────────────────
   Les champs sont décrits dans data/sentinelleActions.js, pas ici :
   ajouter un geste ne demande donc pas de toucher à cet écran. */
function Geste({ a, phrase }) {
  const [ouvert, setOuvert]   = useState(false);
  const [vals, setVals]       = useState({});
  const [confirme, setConfirme] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [res, setRes]         = useState(null);

  const manque = (a.champs || []).filter(c => c.requis && !String(vals[c.nom] ?? '').trim());

  const lancer = async () => {
    if (enCours || manque.length) return;
    /* Deuxième tap sur les gestes lourds. Inline, pas de window.confirm :
       une boîte système n'a ni le ton ni la couleur de l'écran, et on la
       claque sans la lire. */
    if (a.danger && !confirme) { setConfirme(true); haptic('light'); return; }
    setEnCours(true);

    /* Les champs vides ne sont PAS envoyés : côté base, un champ absent
       garde sa valeur, alors qu'un champ à '' l'écraserait. */
    const params = {};
    for (const c of (a.champs || [])) {
      const v = String(vals[c.nom] ?? '').trim();
      if (!v) continue;
      params[c.nom] = c.type === 'nombre' ? Number(v) : v;
    }

    /* `modifier_joueur` prend le code à part (c'est la CIBLE, pas un
       champ à écrire) — les autres gestes le reçoivent dans params. */
    let r;
    if (a.rpc === 'sentinelle_modifier_joueur') {
      const cible = params.user_code;
      const champs = { ...params };
      delete champs.user_code;
      r = await modifierJoueur(phrase, cible, champs);
    } else {
      r = await agir(phrase, a.id, params);
    }

    setEnCours(false);
    setConfirme(false);
    setRes(r);
    playSound(r?.ok ? 'success' : 'error');
    haptic(r?.ok ? 'success' : 'warning');
  };

  return (
    <div style={{ background: C.card, border: CONTOUR, borderRadius: 14, marginTop: 8, overflow: 'hidden' }}>
      <button
        onClick={() => { setOuvert(o => !o); setConfirme(false); }}
        style={{ width: '100%', textAlign: 'left', padding: '11px 12px', background: 'transparent', border: 'none', touchAction: 'manipulation' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 800, color: a.danger ? MARINE : C.text }}>{a.titre}</span>
          <ChevronDown size={15} color={C.muted} style={{ transform: ouvert ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{a.resume}</div>
      </button>

      {ouvert && (
        <div style={{ padding: '0 12px 12px' }}>
          {a.aide && (
            <div style={{ fontSize: 11.5, lineHeight: 1.5, color: C.muted, background: BLEU[50], border: `1px solid ${BLEU[200]}`, borderRadius: 11, padding: '9px 11px', marginBottom: 10, whiteSpace: 'pre-line' }}>
              {a.aide}
            </div>
          )}

          {(a.champs || []).map(c => (
            <div key={c.nom} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                {c.label}{c.requis && <span style={{ color: ACIER }}> *</span>}
              </div>
              <input
                value={vals[c.nom] ?? ''}
                onChange={e => { setVals(v => ({ ...v, [c.nom]: e.target.value })); setRes(null); setConfirme(false); }}
                placeholder={c.exemple ? `ex. ${c.exemple}` : ''}
                inputMode={c.type === 'nombre' ? 'numeric' : 'text'}
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: '#fff', color: C.text, fontSize: CHAMP, outline: 'none' }}
              />
            </div>
          ))}

          {res && (
            <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 12, fontSize: 12.5, fontWeight: 700, lineHeight: 1.5,
              background: res.ok ? 'linear-gradient(135deg,rgba(46,134,191,.14),rgba(27,94,140,.08))' : BLEU[100],
              border: `1.5px solid ${res.ok ? BLEU[400] : BLEU[300]}`, color: res.ok ? ACIER : MARINE }}>
              {res.ok ? '✓ ' : '✗ '}{res.message || (res.ok ? 'Fait.' : 'Refusé.')}
            </div>
          )}

          <button
            onClick={lancer}
            disabled={enCours || manque.length > 0}
            style={{ width: '100%', marginTop: 10, padding: '13px 0', borderRadius: 13, border: 'none', fontSize: 13.5, fontWeight: 900, letterSpacing: .2, touchAction: 'manipulation',
              background: manque.length ? BLEU[100] : confirme ? `linear-gradient(135deg,${MARINE},#071E33)` : DEGRADE,
              color: manque.length ? C.muted : '#fff',
              boxShadow: manque.length ? 'none' : OMBRE_VIVE,
              opacity: enCours ? .6 : 1 }}
          >
            {enCours ? '…' : manque.length ? `${manque[0].label} manque` : confirme ? 'Confirmer' : a.titre}
          </button>
        </div>
      )}
    </div>
  );
}

export function SentinelleCoupDoeil({ phrase, onVersElle }) {
  const [chargement, setChargement] = useState(true);
  const [rapports, setRapports]     = useState([]);
  const [lignes, setLignes]         = useState([]);
  const [prix, setPrix]             = useState(null);
  const [boite, setBoite]           = useState(0);
  const [messages, setMessages]     = useState(null);   /* null = pas encore lus */
  const [manques, setManques]       = useState([]);
  const [etat, setEtat]             = useState(null);
  const [bascule, setBascule]       = useState(null);   /* le mode qu'on est en train de poser */
  const [gestes, setGestes]         = useState([]);
  const [enCoursGeste, setEnCoursGeste] = useState(null);
  const [voirLectures, setVoirLectures] = useState(false);

  const charger = async () => {
    setChargement(true);
    const [r, j, p, b, mq, md, gs] = await lire(phrase);
    setRapports(r); setLignes(j); setPrix(p); setBoite(b); setManques(mq); setEtat(md);
    setGestes(gs.lignes || []);
    setChargement(false);
  };

  /* Au montage on ne passe PAS par `charger` : il pose `chargement` de
     façon synchrone dans l'effet, ce que la règle react-hooks interdit
     à raison. `chargement` vaut déjà true à l'initialisation, il n'y a
     donc rien à poser avant l'attente. Le drapeau `vivant` évite d'écrire
     dans un composant démonté si on referme la console pendant la
     lecture. */
  useEffect(() => {
    let vivant = true;
    lire(phrase).then(([r, j, p, b, mq, md, gs]) => {
      if (!vivant) return;
      setRapports(r); setLignes(j); setPrix(p); setBoite(b); setManques(mq); setEtat(md);
      setGestes(gs.lignes || []); setChargement(false);
    });
    return () => { vivant = false; };
  }, [phrase]);

  /* Une ronde = tous les verdicts qui partagent le même instant. On ne
     montre que la dernière : l'historique complet est un autre écran. */
  const derniere = rapports[0]?.created_at;
  const ronde    = rapports.filter(x => x.created_at === derniere);
  const alertes  = ronde.filter(x => x.verdict === 'alerte');
  const aVoir    = ronde.filter(x => x.verdict === 'voir');

  /* `{ ok, message, lignes }` — et si ce n'est pas ok, on montre le
     refus. Une liste vide et un accès refusé ne se ressemblent pas, et
     les confondre ferait croire que la boîte est vide alors qu'on n'a
     simplement pas pu la lire. */
  const [refusBoite, setRefusBoite] = useState(null);
  const lireBoite = async () => {
    const r = await listerSignalements(phrase, null, 40);
    if (!r.ok) { setRefusBoite(r.message || 'Lecture refusée.'); playSound('error'); return; }
    setRefusBoite(null);
    setMessages(r.lignes);
  };
  const marquer = async (id, statut) => {
    const r = await traiterSignalement(phrase, id, statut);
    if (r?.ok === false) { playSound('error'); return; }
    playSound('toggle');
    setMessages(m => (m || []).filter(x => x.id !== id));
    setBoite(n => Math.max(0, n - 1));
  };

  const poser = async (id) => {
    if (bascule || etat?.mode === id) return;
    setBascule(id);
    const r = await changerMode(phrase, id);
    setBascule(null);
    if (!r?.ok) { playSound('error'); haptic('warning'); setEtat(e => ({ ...(e || {}), erreur: r?.message })); return; }
    playSound('toggle'); haptic('success');
    setEtat(e => ({ ...(e || {}), mode: id, erreur: null }));
  };

  /* Deux natures différentes dans la même table : ce qu'elle a FAIT, et
     ce qu'elle a REGARDÉ. Le résultat 'lecture' les sépare. */
  const gestesJournal = lignes.filter(l => l.resultat !== 'lecture');
  const lectures      = lignes.filter(l => l.resultat === 'lecture');

  const trancher = async (id, garder) => {
    if (enCoursGeste) return;
    setEnCoursGeste(id);
    const r = garder ? await garderGeste(phrase, id) : await annulerGeste(phrase, id);
    setEnCoursGeste(null);
    if (!r?.ok) {
      playSound('error'); haptic('warning');
      setGestes(g => g.map(x => (x.id === id ? { ...x, refus: r?.message } : x)));
      return;
    }
    playSound(garder ? 'toggle' : 'success'); haptic('success');
    setGestes(g => g.filter(x => x.id !== id));
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '12px 13px 16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 11 }}>

      {/* ── Ce que coûte cette page : rien, et on le dit ── */}
      <div className="s-monte" style={{ background: VERRE, border: CONTOUR, borderRadius: 18, padding: '13px 14px', boxShadow: OMBRE, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.4, textTransform: 'uppercase', color: ACIER, flex: 1 }}>Coup d'œil · gratuit</span>
          <button onClick={() => !chargement && charger()} disabled={chargement} aria-label="Recharger"
            style={{ width: 34, height: 34, borderRadius: 11, border: CONTOUR, background: '#fff', color: ACIER, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: chargement ? .5 : 1, touchAction: 'manipulation' }}>
            <RefreshCw size={15} style={chargement ? { animation: 'premiumRay 1.1s linear infinite' } : undefined} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {[
            { n: alertes.length, l: 'alerte(s)' },
            { n: boite,          l: 'à traiter' },
            { n: prix ?? '—',    l: 'le cours' },
          ].map((x, k) => (
            <div key={k} style={{ flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -.6, color: MARINE, lineHeight: 1.1 }}>{x.n}</div>
              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{x.l}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 11, paddingTop: 10, borderTop: `1px solid ${C.trait}`, fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
          Tout ici lit et écrit la base directement — aucun appel au modèle.
          Les alertes viennent de la ronde automatique, qui tourne toutes les
          10 minutes sans qu'on lui demande.
        </div>

        {onVersElle && (
          <button onClick={onVersElle}
            style={{ width: '100%', marginTop: 11, padding: '12px 0', borderRadius: 13, border: `1.5px solid ${BLEU[300]}`, background: '#fff', color: ACIER, fontSize: 13, fontWeight: 800, touchAction: 'manipulation' }}>
            Lui demander son point →
          </button>
        )}
      </div>

      {/* ── L'écran de retour ──
          En tête, et ouvert d'office : c'est la première chose à voir en
          rentrant. Elle a agi sans toi, tu dois pouvoir défaire avant
          d'aller regarder autre chose. */}
      {gestes.length > 0 && (
        <Bloc emoji="↩️" titre="Ce qu'elle a fait sans toi" compte={gestes.length} ouvertParDefaut
          teinte="linear-gradient(135deg,#9FB0E8,#4A5FC1)">
          <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginBottom: 9 }}>
            Chaque geste garde son état d'avant. Annuler remet le compte
            exactement comme il était. Sans réponse de ta part, un geste est
            réputé accepté au bout de sept jours.
          </div>
          {gestes.map(g => {
            const av = g.avant || {};
            const pr = g.params || {};
            const changes = Object.keys(pr).filter(k => k !== 'user_code' && k !== 'cible'
              && av[k] !== undefined && String(av[k]) !== String(pr[k]));
            return (
              <div key={g.id} style={{ background: C.card, border: CONTOUR, borderRadius: 13, padding: '11px 12px', marginTop: 8, borderLeft: `3px solid ${BLEU[500]}` }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: MARINE }}>
                    {GESTES_NOMS[g.action] || g.action}{g.cible ? ' · ' + g.cible : ''}
                  </span>
                  <span style={{ fontSize: 10.5, color: C.muted, flexShrink: 0 }}>{jour(g.cree_le)} {heure(g.cree_le)}</span>
                </div>
                {g.message && <div style={{ fontSize: 12, color: C.text, lineHeight: 1.45, marginTop: 4 }}>{g.message}</div>}

                {changes.length > 0 && (
                  <div style={{ marginTop: 7, padding: '7px 9px', borderRadius: 10, background: BLEU[50], border: `1px solid ${BLEU[200]}` }}>
                    {changes.map(k => (
                      <div key={k} style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6 }}>
                        {NOMS[k] || k} : <b style={{ color: C.text }}>{String(av[k])}</b> → <b style={{ color: ACIER }}>{String(pr[k])}</b>
                      </div>
                    ))}
                  </div>
                )}
                {!g.avant && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontStyle: 'italic' }}>
                    Pas d'état d'avant pour ce geste — il ne pourra pas être défait.
                  </div>
                )}
                {g.refus && <div style={{ fontSize: 11.5, fontWeight: 700, color: MARINE, marginTop: 6 }}>⛔ {g.refus}</div>}

                <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
                  <button onClick={() => trancher(g.id, false)} disabled={!!enCoursGeste || !g.avant}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 11, border: 'none', background: g.avant ? `linear-gradient(135deg,${MARINE},#071E33)` : BLEU[100], color: g.avant ? '#fff' : C.muted, fontSize: 12.5, fontWeight: 800, touchAction: 'manipulation', opacity: enCoursGeste === g.id ? .6 : 1 }}>
                    {enCoursGeste === g.id ? '…' : 'Annuler'}
                  </button>
                  <button onClick={() => trancher(g.id, true)} disabled={!!enCoursGeste}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 11, border: CONTOUR, background: '#fff', color: ACIER, fontSize: 12.5, fontWeight: 800, touchAction: 'manipulation' }}>
                    Garder
                  </button>
                </div>
              </div>
            );
          })}
        </Bloc>
      )}

      {/* ── L'interrupteur ──
          Il est ICI, sur la page gratuite, parce que c'est d'abord une
          question d'argent : c'est le robinet, pas un réglage de confort. */}
      <Bloc emoji="🎛️" titre="Sentinelle autonomie" compte={null} ouvertParDefaut={etat?.mode === 'non'}
        teinte={DEGRADE}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {MODES.map(m => {
            const actif = (etat?.mode || 'semi') === m.id;
            return (
              <button key={m.id} onClick={() => poser(m.id)} disabled={!!bascule}
                style={{ width: '100%', textAlign: 'left', padding: '11px 13px', borderRadius: 14, touchAction: 'manipulation',
                  border: actif ? `1.5px solid ${BLEU[500]}` : CONTOUR,
                  background: actif ? 'linear-gradient(135deg,rgba(46,134,191,.15),rgba(46,134,191,.05))' : C.card,
                  opacity: bascule && bascule !== m.id ? .5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, border: `2px solid ${actif ? ACIER : BLEU[300]}`, background: actif ? ACIER : 'transparent', boxShadow: actif ? `inset 0 0 0 2px #fff` : 'none' }} />
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 800, color: actif ? MARINE : C.text }}>{m.titre}</span>
                  <span style={{ fontSize: 10.5, color: C.muted, flexShrink: 0 }}>{bascule === m.id ? '…' : m.sous}</span>
                </div>
                {actif && <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginTop: 6 }}>{m.quoi}</div>}
              </button>
            );
          })}
        </div>

        {etat?.erreur && (
          <div style={{ marginTop: 9, padding: '9px 11px', borderRadius: 11, background: BLEU[100], border: `1.5px solid ${BLEU[300]}`, fontSize: 12, fontWeight: 700, color: MARINE }}>⛔ {etat.erreur}</div>
        )}

        {/* Ce qu'elle a réellement fait, et pourquoi elle dort. Une
            Sentinelle muette et une Sentinelle en panne se ressemblent
            trop pour qu'on laisse la question ouverte. */}
        <div style={{ marginTop: 11, paddingTop: 10, borderTop: `1px solid ${C.trait}`, fontSize: 11.5, color: C.muted, lineHeight: 1.55 }}>
          {etat ? (
            <>
              <b style={{ color: MARINE }}>{etat.rondes}</b> ronde(s) aujourd'hui sur 12 au maximum
              {etat.derniere && <> · la dernière {jour(etat.derniere)} à {heure(etat.derniere)}</>}
              {etat.raison && <div style={{ marginTop: 4 }}>Elle ne tourne pas : <b style={{ color: ACIER }}>{etat.raison}</b>.</div>}
            </>
          ) : "L'interrupteur n'est pas encore installé en base (sql/SENTINELLE_ECONOMIE.sql)."}
        </div>
      </Bloc>

      {/* ── Les gestes, groupe par groupe ── */}
      {GROUPES.map(g => {
        const gestes = ACTIONS_SENTINELLE.filter(a => a.groupe === g.id);
        if (!gestes.length) return null;
        return (
          <Bloc key={g.id} emoji={g.emoji} titre={g.titre} compte={null}>
            <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.45 }}>{g.resume}</div>
            {gestes.map(a => <Geste key={a.id} a={a} phrase={phrase} />)}
          </Bloc>
        );
      })}

      {/* ── La boîte ── */}
      <Bloc emoji="📮" titre="La boîte" compte={boite} teinte="linear-gradient(135deg,#7EC0EA,#2E86BF)">
        {refusBoite && (
          <div style={{ padding: '10px 12px', borderRadius: 12, marginBottom: 8, background: BLEU[100], border: `1.5px solid ${BLEU[300]}`, fontSize: 12.5, fontWeight: 700, color: MARINE }}>
            ⛔ {refusBoite}
          </div>
        )}
        {messages === null ? (
          <button onClick={lireBoite}
            style={{ width: '100%', padding: '12px 0', borderRadius: 13, border: CONTOUR, background: '#fff', color: ACIER, fontSize: 13, fontWeight: 800, touchAction: 'manipulation' }}>
            {boite ? `Lire les ${boite} signalement(s)` : 'Rien à traiter — voir quand même'}
          </button>
        ) : messages.length === 0 ? (
          <div style={{ fontSize: 12.5, color: C.muted }}>Boîte vide.</div>
        ) : messages.map(m => (
          <div key={m.id} style={{ background: C.card, border: CONTOUR, borderRadius: 13, padding: '11px 12px', marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: MARINE, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.user_name || m.user_code}
              </span>
              <span style={{ fontSize: 10.5, color: C.muted, flexShrink: 0 }}>{jour(m.created_at)} {heure(m.created_at)}</span>
            </div>
            {m.chemin && <div style={{ fontSize: 11, color: ACIER, fontWeight: 700, marginTop: 3 }}>{m.chemin}</div>}
            {/* Ce que le joueur a écrit est une DONNÉE, jamais une consigne :
                on l'affiche tel quel, on n'en déduit rien tout seul. */}
            <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5, marginTop: 5, whiteSpace: 'pre-wrap' }}>{m.message}</div>
            <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
              <button onClick={() => marquer(m.id, 'traite')}
                style={{ flex: 1, padding: '9px 0', borderRadius: 11, border: 'none', background: DEGRADE, color: '#fff', fontSize: 12, fontWeight: 800, touchAction: 'manipulation' }}>Traité</button>
              <button onClick={() => marquer(m.id, 'ignore')}
                style={{ flex: 1, padding: '9px 0', borderRadius: 11, border: CONTOUR, background: '#fff', color: C.muted, fontSize: 12, fontWeight: 800, touchAction: 'manipulation' }}>Ignorer</button>
            </div>
          </div>
        ))}
      </Bloc>

      {/* ── Ce que la ronde automatique a trouvé ── */}
      <Bloc emoji="🛡️" titre="La dernière ronde" compte={alertes.length + aVoir.length} ouvertParDefaut={alertes.length > 0}>
        {!ronde.length ? (
          <div style={{ fontSize: 12.5, color: C.muted }}>Aucun rapport en base.</div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{jour(derniere)} à {heure(derniere)}</div>
            {[...alertes, ...aVoir].map((r, k) => (
              <div key={k} style={{ padding: '10px 12px', borderRadius: 12, marginTop: 7,
                background: r.verdict === 'alerte' ? 'linear-gradient(135deg,rgba(46,134,191,.14),rgba(46,134,191,.05))' : BLEU[50],
                borderLeft: `3px solid ${r.verdict === 'alerte' ? MARINE : BLEU[400]}` }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: MARINE, lineHeight: 1.4 }}>{r.titre}</div>
                {Array.isArray(r.detail) && r.detail.map((d, i) => (
                  <div key={i} style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.45, marginTop: 3 }}>{d}</div>
                ))}
              </div>
            ))}
            {!alertes.length && !aVoir.length && <div style={{ fontSize: 12.5, color: C.muted }}>Rien à signaler à la dernière ronde.</div>}
          </>
        )}
      </Bloc>

      {/* ── Ce sur quoi elle a buté ── */}
      <Bloc emoji="🧱" titre="Ce qu'elle n'a pas pu faire" compte={manques.length}
        teinte="linear-gradient(135deg,#B7A6E6,#6E58BE)" ouvertParDefaut={manques.some(m => m.fois >= 2)}>
        <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginBottom: manques.length ? 8 : 0 }}>
          Elle note ce qui lui manque au lieu de répondre « je ne sais pas ».
          S'en souvenir ne le lui donne pas — c'est du code qu'il faut. Mais
          un manque qui revient trois fois mérite qu'on s'y arrête.
        </div>
        {!manques.length ? (
          <div style={{ fontSize: 12.5, color: C.muted }}>Elle n'a rien signalé pour l'instant.</div>
        ) : manques.map(m => (
          <div key={m.sujet} style={{ background: C.card, border: CONTOUR, borderRadius: 13, padding: '10px 12px', marginTop: 8,
            borderLeft: `3px solid ${m.fois >= 3 ? MARINE : BLEU[400]}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 800, color: MARINE, lineHeight: 1.35 }}>{m.sujet}</span>
              <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 900, color: '#fff', background: m.fois >= 3 ? MARINE : DEGRADE, padding: '2px 8px', borderRadius: 20 }}>{m.fois}×</span>
            </div>
            {m.quoi && <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.45, marginTop: 4 }}>{m.quoi}</div>}
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4 }}>
              depuis le {jour(m.depuis)} · dernière fois {jour(m.derniere)} à {heure(m.derniere)}
            </div>
          </div>
        ))}
      </Bloc>

      {/* ── Ce qui a été fait ── */}
      <Bloc emoji="📜" titre="Le journal" compte={gestesJournal.length}>
        {/* Les LECTURES sont à part, et repliées par défaut.
            Elle consulte beaucoup plus qu'elle n'agit : mélangées, quinze
            consultations noieraient les trois gestes qui comptent, et ce
            journal est la première chose qu'on lit en rentrant. Elles sont
            là pour VÉRIFIER un « j'ai regardé ton compte », pas pour être
            parcourues tous les jours. */}
        {lectures.length > 0 && (
          <button onClick={() => setVoirLectures(v => !v)}
            style={{ width: '100%', marginBottom: 9, padding: '9px 11px', borderRadius: 11, border: CONTOUR, background: BLEU[50], color: ACIER, fontSize: 12, fontWeight: 800, textAlign: 'left', touchAction: 'manipulation' }}>
            {voirLectures ? '▾' : '▸'} {lectures.length} consultation(s) — ce qu'elle a regardé sans rien changer
          </button>
        )}
        {voirLectures && lectures.map(l => (
          <div key={l.id} style={{ display: 'flex', gap: 9, padding: '5px 0', fontSize: 11.5, lineHeight: 1.4, color: C.muted }}>
            <span style={{ flexShrink: 0, minWidth: 68, fontVariantNumeric: 'tabular-nums' }}>{jour(l.created_at)} {heure(l.created_at)}</span>
            <span style={{ flex: 1, minWidth: 0 }}>{l.action === 'lire_joueur' ? '👁 ' : '📮 '}{l.message || l.action}</span>
          </div>
        ))}

        {!gestesJournal.length ? (
          <div style={{ fontSize: 12.5, color: C.muted }}>Aucun geste enregistré.</div>
        ) : gestesJournal.map(l => (
          <div key={l.id} style={{ display: 'flex', gap: 9, padding: '6px 0', fontSize: 12, lineHeight: 1.45, borderBottom: `1px solid ${C.trait}` }}>
            <span style={{ color: C.muted, flexShrink: 0, minWidth: 68, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{jour(l.created_at)} {heure(l.created_at)}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 800, color: l.resultat === 'ok' ? ACIER : C.muted }}>{l.action}</span>
              {l.cible ? <span style={{ color: C.muted }}> · {l.cible}</span> : null}
              {l.message ? <div style={{ color: C.text, marginTop: 1 }}>{l.message}</div> : null}
            </span>
          </div>
        ))}
      </Bloc>
    </div>
  );
}

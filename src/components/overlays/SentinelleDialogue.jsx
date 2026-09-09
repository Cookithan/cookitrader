import { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import { THEME_SENTINELLE, ACIER, MARINE, BLEU, OMBRE, OMBRE_VIVE, DEGRADE, CHAMP } from "../../data/sentinelleTheme.js";
import { parlerSentinelle } from "../../lib/sentinelleIA.js";
import { playSound } from "../../lib/audio.js";
import { haptic } from "../../lib/haptic.js";

/* ════════════════════════════════════════════════════
   SentinelleDialogue — lui parler pour de vrai
   ────────────────────────────────────────────────────
   Cookithan, le 09/09 : « le système de dialogue est mal foutu, on doit
   plisser les yeux pour voir ce qu'il y a et ça fait trop bureau ».

   TROIS DÉFAUTS, TROIS CAUSES
   ───────────────────────────
   1. ELLE ÉCRIT DU MARKDOWN, L'ÉCRAN L'AFFICHAIT BRUT.
      C'est un modèle : il met des **gras**, des listes, du `code`. Le
      texte partait dans un <div> nu, donc on lisait les astérisques. Ce
      n'est pas un détail de style — c'est la moitié de l'effort de
      lecture. D'où le petit rendu ci-dessous. Fait à la main, sans
      dépendance : on n'a besoin que du gras, de l'italique, du code et
      des puces, et une bibliothèque de markdown pèse plus lourd que
      tout le reste de cet écran.

   2. LA RÉPONSE TENAIT DANS 160 PIXELS.
      Un encart écrasé entre les pages et la barre de saisie, en 13 px,
      avec son propre ascenseur. On y lisait quatre lignes à la fois.
      C'est devenu une feuille pleine hauteur, en 15 px.

   3. IL N'Y AVAIT QU'UN SEUL ÉCHANGE.
      Chaque question écrasait la précédente. Une conversation qui
      oublie la ligne d'avant n'est pas une conversation.

   POURQUOI UNE FEUILLE, ET PAS UNE BARRE
   ──────────────────────────────────────
   Lui parler n'est pas un geste de coin d'écran : ça coûte un tour de
   modèle et ça produit du texte à lire. La barre du tableau n'est donc
   plus un champ mais un BOUTON qui ouvre ceci. Deux champs de saisie
   pour la même chose (un dans la barre, un dans la feuille) obligeaient
   à jongler avec le focus sur mobile.

   Props : phrase, onFermer, echanges, setEchanges
   L'historique vit chez le parent : refermer la feuille ne doit pas
   effacer ce qu'elle vient de dire.
═══════════════════════════════════════════════════════ */

const C = THEME_SENTINELLE;

/* ── Le rendu du texte ──────────────────────────────
   Pas de dangerouslySetInnerHTML : ce texte vient d'un modèle qui a lu
   des messages de joueurs. On construit des nœuds React, donc rien de
   ce qu'il écrit ne peut devenir du balisage. */
function inline(texte) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g;
  let i = 0, m, k = 0;
  while ((m = re.exec(texte)) !== null) {
    if (m.index > i) out.push(texte.slice(i, m.index));
    const t = m[0];
    if (t.startsWith('**')) {
      out.push(<strong key={k++} style={{ fontWeight: 900, color: MARINE }}>{t.slice(2, -2)}</strong>);
    } else if (t.startsWith('`')) {
      out.push(<code key={k++} style={{ background: BLEU[100], border: `1px solid ${BLEU[200]}`, borderRadius: 6, padding: '1px 5px', fontSize: '.92em', fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{t.slice(1, -1)}</code>);
    } else {
      out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    }
    i = m.index + t.length;
  }
  if (i < texte.length) out.push(texte.slice(i));
  return out;
}

function Riche({ texte, couleur }) {
  const lignes = String(texte || '').split('\n');
  return (
    <div style={{ fontSize: 15, lineHeight: 1.6, color: couleur }}>
      {lignes.map((l, k) => {
        if (!l.trim()) return <div key={k} style={{ height: 8 }} />;
        /* Les puces ne reconnaissent que « - » et « • ». Pas « * » : une
           ligne qui commence par **gras** serait prise pour une puce, et
           on perdrait le début de sa phrase. */
        const puce = /^\s*[-•]\s+/.test(l);
        const titre = /^\s*#{1,3}\s+/.test(l);
        if (titre) return <div key={k} style={{ fontWeight: 900, color: MARINE, margin: '9px 0 3px' }}>{inline(l.replace(/^\s*#{1,3}\s+/, ''))}</div>;
        if (puce) return (
          <div key={k} style={{ display: 'flex', gap: 9, margin: '4px 0' }}>
            <span style={{ color: ACIER, fontWeight: 900, flexShrink: 0 }}>•</span>
            <span style={{ flex: 1, minWidth: 0 }}>{inline(l.replace(/^\s*[-•]\s+/, ''))}</span>
          </div>
        );
        return <div key={k} style={{ margin: '4px 0' }}>{inline(l)}</div>;
      })}
    </div>
  );
}

/* ── Elle réfléchit ─────────────────────────────────
   Trois boucliers qui rebondissent. Les trois points d'une messagerie,
   mais qui disent QUI réfléchit : elle, pas un serveur qui rame. */
export function ElleEcrit({ taille = 15 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }} aria-label="elle réfléchit">
      {[0, 1, 2].map(k => (
        <span key={k} className="s-point" style={{ '--pt': `${k * 0.16}s`, fontSize: taille, lineHeight: 1 }}>🛡️</span>
      ))}
    </span>
  );
}

export function SentinelleDialogue({ phrase, onFermer, echanges, setEchanges }) {
  const [ligne, setLigne] = useState('');
  const [attente, setAttente] = useState(false);
  const basRef = useRef(null);

  /* On colle au dernier message, comme toute messagerie. Sans ça, sa
     réponse arrive hors champ et on croit qu'il ne s'est rien passé. */
  useEffect(() => {
    basRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [echanges, attente]);

  const envoyer = async () => {
    const q = ligne.trim();
    if (!q || attente) return;
    setLigne('');
    setEchanges(e => [...e, { qui: 'toi', texte: q }]);
    setAttente(true);
    const r = await parlerSentinelle({ phrase, message: q });
    setAttente(false);
    setEchanges(e => [...e, { qui: 'elle', texte: r.ok ? r.reponse : r.message, actions: r.ok ? r.actions : null, erreur: !r.ok }]);
    playSound(r.ok ? 'bubble' : 'error');
    haptic(r.ok ? 'light' : 'warning');
  };

  return (
    <div className="s-feuille" style={{ position: 'absolute', inset: 0, zIndex: 8, display: 'flex', flexDirection: 'column', background: 'rgba(244,250,254,.96)', backdropFilter: 'blur(12px)' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: `1.5px solid ${BLEU[200]}`, flexShrink: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: DEGRADE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0, boxShadow: OMBRE }}>🛡️</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 900, color: MARINE, lineHeight: 1.15 }}>Elle et toi</div>
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>chaque question est un tour de modèle</div>
        </div>
        <button onClick={onFermer} aria-label="Fermer"
          style={{ width: 38, height: 38, borderRadius: 12, border: `1.5px solid ${BLEU[200]}`, background: '#fff', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, touchAction: 'manipulation' }}>
          <X size={19} />
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {!echanges.length && !attente && (
          <div style={{ margin: 'auto', textAlign: 'center', padding: '0 22px' }}>
            <div style={{ fontSize: 15.5, fontWeight: 900, color: MARINE, marginBottom: 7 }}>Demande-lui quelque chose.</div>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>
              Elle voit les comptes, le marché, les signalements, le journal
              et ses rondes. Nomme un joueur et elle ira le regarder.
            </div>
          </div>
        )}

        {echanges.map((e, k) => e.qui === 'toi' ? (
          <div key={k} className="s-bulle" style={{ flexShrink: 0, alignSelf: 'flex-end', maxWidth: '86%', background: DEGRADE, color: '#fff', padding: '11px 14px', borderRadius: '18px 18px 5px 18px', fontSize: 15, lineHeight: 1.5, boxShadow: OMBRE_VIVE, whiteSpace: 'pre-wrap' }}>
            {e.texte}
          </div>
        ) : (
          <div key={k} className="s-bulle" style={{ flexShrink: 0, alignSelf: 'flex-start', maxWidth: '94%', background: '#fff', border: `1.5px solid ${BLEU[200]}`, padding: '12px 14px', borderRadius: '18px 18px 18px 5px', boxShadow: OMBRE }}>
            <Riche texte={e.texte} couleur={e.erreur ? C.muted : C.text} />
            {Array.isArray(e.actions) && e.actions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 9, borderTop: `1px solid ${C.trait}` }}>
                {e.actions.map((a, i) => (
                  <span key={i} style={{ fontSize: 11, fontWeight: 700, color: ACIER, background: BLEU[100], border: `1px solid ${BLEU[200]}`, padding: '4px 9px', borderRadius: 20 }}>
                    {a?.outil === 'lire_joueur' ? `a regardé ${a?.entree?.code_ou_pseudo ?? '?'}` : a?.outil ?? '—'}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {attente && (
          <div className="s-bulle" style={{ flexShrink: 0, alignSelf: 'flex-start', background: '#fff', border: `1.5px solid ${BLEU[200]}`, padding: '12px 16px', borderRadius: '18px 18px 18px 5px', boxShadow: OMBRE }}>
            <ElleEcrit />
          </div>
        )}
        <div ref={basRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '9px 12px 14px', borderTop: `1.5px solid ${BLEU[200]}`, background: '#fff', flexShrink: 0 }}>
        <input
          value={ligne}
          onChange={e => setLigne(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') envoyer(); }}
          placeholder="dis-lui quelque chose…"
          autoFocus
          style={{ flex: 1, minWidth: 0, padding: '13px 16px', borderRadius: 16, border: `1.5px solid ${C.border}`, background: BLEU[50], color: C.text, fontSize: CHAMP, outline: 'none' }}
        />
        <button onClick={envoyer} disabled={!ligne.trim() || attente} aria-label="Envoyer"
          style={{ width: 48, height: 48, borderRadius: 15, border: 'none', background: ligne.trim() && !attente ? DEGRADE : BLEU[100], color: ligne.trim() && !attente ? '#fff' : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: ligne.trim() && !attente ? OMBRE_VIVE : 'none', touchAction: 'manipulation' }}>
          <Send size={19} />
        </button>
      </div>
    </div>
  );
}

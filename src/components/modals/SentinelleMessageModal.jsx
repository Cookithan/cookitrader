import { useState } from 'react';
import { THEME_SENTINELLE, BLEU, OMBRE, OMBRE_VIVE, DEGRADE } from '../../data/sentinelleTheme.js';
import { markAsRead } from '../../lib/inbox.js';

/* ════════════════════════════════════════════════════
   SentinelleMessageModal — elle te répond, et ça se voit
   ────────────────────────────────────────────────────
   Cookithan, le 09/09 : « quand la Sentinelle répond à une demande ou un
   problème (…) que ça apparaisse comme un pop-up en thème Sentinelle,
   puis retrouvable dans la messagerie du joueur ».

   POURQUOI UN POP-UP ET PAS UNE PASTILLE
   ──────────────────────────────────────
   Ses réponses arrivaient dans la boîte comme n'importe quel cadeau, et
   y dormaient. Or un joueur qui a pris la peine de signaler un problème
   ATTEND une réponse : la déposer sans rien dire revient à la lui
   cacher. C'est le seul message de l'app qui répond à une question qu'il
   a lui-même posée — il mérite d'interrompre.

   CE QU'IL NE FAIT PAS
   ────────────────────
   Il ne consomme rien. Fermer la modale marque le message comme lu, et
   il RESTE dans la messagerie : on peut le relire, il ne s'évapore pas.
   C'est ce qui distingue un pop-up d'une notification qu'on perd en
   balayant trop vite.

   Un seul à la fois, le plus récent. Si elle a répondu trois fois, on ne
   claque pas trois modales à la figure : les deux autres attendent dans
   la boîte, et le compteur de non-lus les signale.

   ⚠️ C'est le SEUL écran bleu que voit un joueur ordinaire, avec
   l'entonnoir de signalement. C'est délibéré : le bleu, c'est elle.

   Props : message ({id, title, body, created_at}), onFerme
═══════════════════════════════════════════════════════ */

const C = THEME_SENTINELLE;

export function SentinelleMessageModal({ message, onFerme }) {
  const [sort, setSort] = useState(false);

  /* Pas de remise à zéro par effet quand le message change : le parent
     remonte le composant (key={message.id}), ce qui repart de zéro sans
     setState dans un effet. Même patron que MotQuiSecrit. */
  if (!message) return null;

  const fermer = async () => {
    if (sort) return;
    setSort(true);
    try { await markAsRead(message.id); } catch { /* le message reste non lu, il repassera */ }
    setTimeout(() => onFerme?.(), 180);
  };

  return (
    <div
      onPointerDown={fermer}
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        background: 'rgba(11,46,77,.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 22px', opacity: sort ? 0 : 1, transition: 'opacity .18s',
      }}
    >
      <div
        className="su"
        onPointerDown={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 390, boxSizing: 'border-box',
          background: '#FFFFFF', border: `1.5px solid ${BLEU[300]}`,
          borderRadius: 24, boxShadow: OMBRE_VIVE, overflow: 'hidden',
        }}
      >
        {/* Le bandeau : c'est lui qui dit tout de suite QUI parle. */}
        <div style={{ position: 'relative', background: DEGRADE, padding: '16px 18px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(255,255,255,.18)', border: '1.5px solid rgba(255,255,255,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, flexShrink: 0 }}>🛡️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(255,255,255,.75)' }}>La Sentinelle</div>
            <div style={{ fontSize: 16.5, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {message.title || 'Un mot pour toi'}
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 18px 6px', maxHeight: '46vh', overflowY: 'auto', overscrollBehavior: 'contain' }}>
          <div style={{ fontSize: 14.5, lineHeight: 1.6, color: C.text, whiteSpace: 'pre-wrap' }}>
            {message.body}
          </div>
        </div>

        <div style={{ padding: '12px 18px 18px' }}>
          <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginBottom: 10, lineHeight: 1.45 }}>
            Tu le retrouveras dans ta messagerie.
          </div>
          <button
            onClick={fermer}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 16, border: 'none',
              background: DEGRADE, color: '#fff', fontSize: 14.5, fontWeight: 900,
              letterSpacing: .2, boxShadow: OMBRE, touchAction: 'manipulation',
            }}
          >
            J'ai lu
          </button>
        </div>
      </div>
    </div>
  );
}

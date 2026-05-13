import { useEffect, useState } from 'react';
import { Megaphone, AlertTriangle, Sparkles } from 'lucide-react';

/* ════════════════════════════════════════════════════
   AnnouncementModal — popup piloté par Supabase
   ────────────────────────────────────────────────────
   Affichée au centre de l'écran quand
   system_status.banner_message != null. Couleur + icône selon
   banner_severity ('info' | 'warning' | 'success').

   Dismiss : bouton « J'ai compris » → flag LS qui stocke un hash
   du message. Si le texte SQL change, le hash change et la modale
   réapparaît → permet de pousser une nouvelle annonce sans attendre
   que chacun se reconnecte.

   Style café-only (CLAUDE.md) :
   - info    → bleu-cream sur espresso
   - warning → caramel / or sur espresso foncé
   - success → or vif

   Le `message` supporte les sauts de ligne (\n) — la 1re ligne sert
   de titre, le reste de corps. Si pas de \n, tout va dans le corps.
═══════════════════════════════════════════════════════ */

const VARIANTS = {
  info: {
    Icon: Megaphone,
    iconBg: 'linear-gradient(135deg, #7D4E1F, #5C3317)',
    accent: '#F0E6D3',
    accentSoft: 'rgba(240,230,211,.7)',
    btnBg: 'linear-gradient(135deg, #7D4E1F, #5C3317)',
    label: 'Info',
  },
  warning: {
    Icon: AlertTriangle,
    iconBg: 'linear-gradient(135deg, #D4A017, #C17F3C)',
    accent: '#FFE066',
    accentSoft: 'rgba(255,224,102,.75)',
    btnBg: 'linear-gradient(135deg, #D4A017, #C17F3C)',
    label: 'Important',
  },
  success: {
    Icon: Sparkles,
    iconBg: 'linear-gradient(135deg, #FFE066, #D4A017)',
    accent: '#FFE066',
    accentSoft: 'rgba(255,224,102,.85)',
    btnBg: 'linear-gradient(135deg, #FFE066, #D4A017)',
    label: 'Nouveau',
  },
};

function hashMessage(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h.toString(36);
}

export function AnnouncementModal({ message, severity = 'info' }) {
  const [dismissed, setDismissed] = useState(false);

  /* Recalcule dismiss à chaque changement de message — si l'admin met
     à jour le texte SQL, le hash change et la modale réapparaît. */
  useEffect(() => {
    if (!message) { setDismissed(false); return; }
    try {
      const h = hashMessage(message);
      const dismissedHash = window.localStorage.getItem('cookiminer:announcementDismissed');
      setDismissed(dismissedHash === h);
    } catch {
      setDismissed(false);
    }
  }, [message]);

  if (!message || dismissed) return null;

  const v = VARIANTS[severity] || VARIANTS.info;
  const { Icon } = v;

  /* Split sur 1er \n : 1re ligne = titre, reste = corps. */
  const lines = message.split('\n');
  const title = lines[0];
  const body  = lines.slice(1).join('\n').trim();

  const handleDismiss = () => {
    try {
      window.localStorage.setItem('cookiminer:announcementDismissed', hashMessage(message));
    } catch { /* mode privé, etc. */ }
    setDismissed(true);
  };

  return (
    <div
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,8,4,.78)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 1200,
        animation: 'inboxOverlayIn .25s ease-out both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bi"
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'linear-gradient(160deg, #3D2010, #5C3317)',
          borderRadius: 24,
          padding: '28px 22px 22px',
          boxShadow: '0 24px 60px rgba(0,0,0,.55)',
          border: `2px solid ${v.accent}`,
          textAlign: 'center',
          color: '#F0E6D3',
        }}
      >
        {/* Icône en bandeau */}
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: v.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
          boxShadow: `0 8px 22px ${v.accent}55`,
        }}>
          <Icon size={30} color="#fff" />
        </div>

        {/* Petit label catégorie */}
        <div style={{
          fontSize: 10, fontWeight: 900, color: v.accentSoft,
          textTransform: 'uppercase', letterSpacing: 3, marginBottom: 6,
        }}>
          {v.label}
        </div>

        {/* Titre (1re ligne du message) */}
        <div style={{
          fontSize: 18, fontWeight: 900, color: v.accent,
          marginBottom: body ? 12 : 18, lineHeight: 1.3,
          whiteSpace: 'pre-wrap',
        }}>
          {title}
        </div>

        {/* Corps (lignes suivantes — optionnel) */}
        {body && (
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,.85)',
            lineHeight: 1.5, marginBottom: 18,
            whiteSpace: 'pre-wrap',
            textAlign: 'left',
            padding: '0 4px',
          }}>
            {body}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleDismiss}
          style={{
            width: '100%',
            padding: '13px 0',
            borderRadius: 14,
            background: v.btnBg,
            color: '#fff',
            fontSize: 14, fontWeight: 900, letterSpacing: 0.4,
            border: 'none',
            boxShadow: `0 6px 20px ${v.accent}55`,
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          J'ai compris ✓
        </button>
      </div>
    </div>
  );
}

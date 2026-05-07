import { useState } from 'react';

/* ════════════════════════════════════════════════════
   MarketWelcomeModal — mini-tutoriel 3 étapes au PREMIER accès au marché
   Persiste son état "vu" via le flag passé par MarketTab (useLocalStorage).
   Bouton "Passer" sur les étapes intermédiaires, "C'est parti !" sur la dernière.
═══════════════════════════════════════════════════════ */

export function MarketWelcomeModal({ onClose }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      icon: '📊',
      title: 'Bienvenue sur le marché $CKM !',
      text: 'Ici tu peux acheter et vendre des actions Cookie. Le prix change selon ce que font les autres joueurs.',
    },
    {
      icon: '📈',
      title: 'Comment ça marche ?',
      text: 'Achète quand tu penses que le prix va monter. Vends quand tu penses qu\'il va descendre. Plus le marché bouge, plus c\'est rentable !',
    },
    {
      icon: '💎',
      title: 'Stock limité',
      text: 'Il n\'y a que 1 000 actions au total. Plus les gens achètent, plus c\'est rare et plus le prix monte. Bon trade !',
    },
  ];
  const cur = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(45, 22, 8, 0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 20,
    }}>
      <div style={{
        background: 'linear-gradient(140deg, #4A2C17, #7D4E1F)',
        borderRadius: 20, padding: 24, maxWidth: 340, width: '100%',
        color: '#fff', textAlign: 'center',
        border: '2px solid rgba(212,160,23,0.4)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{cur.icon}</div>
        <div style={{ fontSize: 11, color: '#D4A017', letterSpacing: 3, textTransform: 'uppercase' }}>
          Étape {step + 1} / {steps.length}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#D4A017', marginTop: 6 }}>
          {cur.title}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 12, lineHeight: 1.5 }}>
          {cur.text}
        </div>
        <button
          onClick={() => isLast ? onClose() : setStep(step + 1)}
          style={{
            marginTop: 20, padding: '12px 24px',
            background: 'linear-gradient(135deg, #D4A017, #C17F3C)',
            color: '#fff', border: 'none', borderRadius: 14,
            fontWeight: 800, fontSize: 14, cursor: 'pointer',
            width: '100%',
          }}
        >
          {isLast ? "C'est parti ! 🚀" : 'Suivant →'}
        </button>
        {!isLast && (
          <button
            onClick={onClose}
            style={{
              marginTop: 8, background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.5)', fontSize: 11,
              textDecoration: 'underline', cursor: 'pointer',
            }}
          >
            Passer
          </button>
        )}
      </div>
    </div>
  );
}

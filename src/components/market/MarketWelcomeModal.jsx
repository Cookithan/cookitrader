import { useState } from 'react';
import { useTranslation } from '../../i18n/index.js';

/* ════════════════════════════════════════════════════
   MarketWelcomeModal — mini-tutoriel 3 étapes au PREMIER accès au marché
   Persiste son état "vu" via le flag passé par MarketTab (useLocalStorage).
   Bouton "Passer" sur les étapes intermédiaires, "C'est parti !" sur la dernière.
═══════════════════════════════════════════════════════ */

export function MarketWelcomeModal({ onClose }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const steps = [
    { icon: '📊', title: t('market_welcome.step1_title'), text: t('market_welcome.step1_text') },
    { icon: '📈', title: t('market_welcome.step2_title'), text: t('market_welcome.step2_text') },
    { icon: '💎', title: t('market_welcome.step3_title'), text: t('market_welcome.step3_text') },
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
          {t('market_welcome.step_x_of_n', { x: step + 1, n: steps.length })}
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
          {isLast ? t('market_welcome.lets_go') : t('common.next') + ' →'}
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
            {t('common.skip')}
          </button>
        )}
      </div>
    </div>
  );
}

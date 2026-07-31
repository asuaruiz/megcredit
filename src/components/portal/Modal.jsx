import { useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function Modal({ title, onClose, children, maxWidth = 560 }) {
  const { t } = useLanguage();
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}
    >
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 28, maxWidth, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label={t('general.close')} style={{ background: 'none', border: 'none', fontSize: 22, lineHeight: 1, cursor: 'pointer', color: 'var(--text-2)' }}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

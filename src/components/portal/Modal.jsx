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
      className="app-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="app-modal" style={{ '--modal-max-width': `${maxWidth}px` }}>
        <div className="app-modal-header">
          <h2>{title}</h2>
          <button className="app-modal-close" type="button" onClick={onClose} aria-label={t('general.close')}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

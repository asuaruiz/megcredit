import { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext.jsx';

export default function ConfirmDialog({ title, message, confirmLabel, cancelLabel, danger, busy, onConfirm, onCancel }) {
  const { t } = useLanguage();

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(14,39,64,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 200 }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 12,
          padding: 26,
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 20px 60px rgba(14,39,64,0.35)',
          border: '1px solid var(--border-soft)',
        }}
      >
        {title && (
          <h2 id="confirm-dialog-title" style={{ fontSize: 17, margin: '0 0 10px', color: danger ? '#d97975' : 'var(--heading)' }}>
            {title}
          </h2>
        )}
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-2)', margin: 0 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button className="btn btn-outline" type="button" onClick={onCancel} disabled={busy}>
            {cancelLabel || t('general.cancel')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={onConfirm}
            disabled={busy}
            style={danger
              ? { background: '#b94a48', color: '#fff' }
              : { background: 'var(--btn-bg)', color: 'var(--btn-text)' }}
          >
            {confirmLabel || t('general.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

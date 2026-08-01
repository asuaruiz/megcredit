import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import PortalLayout from '../../components/portal/PortalLayout.jsx';
import { activateAccount } from '../../lib/portalApi.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function PortalActivate() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = data.get('password');
    const confirm = data.get('confirm');
    if (password !== confirm) {
      setError(t('portalActivate.passwordMismatch'));
      setStatus('error');
      return;
    }
    setStatus('sending');
    setError('');
    try {
      await activateAccount(token, password);
      navigate('/portal/inicio', { replace: true });
    } catch (submissionError) {
      setError(submissionError.message);
      setStatus('error');
    }
  };

  if (!token) {
    return (
      <PortalLayout>
        <div className="portal-card">
          <h1>{t('portalActivate.invalidTitle')}</h1>
          <p className="portal-sub">{t('portalActivate.invalidText')}</p>
          <Link className="btn btn-outline" to="/portal/login">{t('portalActivate.invalidButton')}</Link>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="portal-card">
        <h1>{t('portalActivate.title')}</h1>
        <p className="portal-sub">{t('portalActivate.subtitle')}</p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="password">{t('portalActivate.passwordLabel')}</label>
            <input id="password" name="password" type="password" required minLength="8" autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label htmlFor="confirm">{t('portalActivate.confirmLabel')}</label>
            <input id="confirm" name="confirm" type="password" required minLength="8" autoComplete="new-password" />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary submit-btn" type="submit" disabled={status === 'sending'} style={{ width: '100%' }}>
            {status === 'sending' ? t('portalActivate.sendingButton') : t('portalActivate.submitButton')}
          </button>
        </form>
      </div>
    </PortalLayout>
  );
}

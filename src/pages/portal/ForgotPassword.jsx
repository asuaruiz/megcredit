import { useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/portal/PortalLayout.jsx';
import { forgotPassword } from '../../lib/portalApi.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function PortalForgotPassword() {
  const { t } = useLanguage();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus('sending');
    setError('');
    try {
      await forgotPassword(data.get('email'));
      setStatus('done');
    } catch (submissionError) {
      setError(submissionError.message);
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <PortalLayout>
        <div className="portal-card">
          <h1>{t('portalForgotPassword.doneTitle')}</h1>
          <p className="portal-sub">{t('portalForgotPassword.doneText')}</p>
          <Link className="btn btn-outline" to="/portal/login">{t('portalForgotPassword.backButton')}</Link>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="portal-card">
        <h1>{t('portalForgotPassword.title')}</h1>
        <p className="portal-sub">{t('portalForgotPassword.subtitle')}</p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="email">{t('portalForgotPassword.emailLabel')}</label>
            <input id="email" name="email" type="email" required maxLength="254" autoComplete="email" />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary submit-btn" type="submit" disabled={status === 'sending'} style={{ width: '100%' }}>
            {status === 'sending' ? t('portalForgotPassword.sendingButton') : t('portalForgotPassword.submitButton')}
          </button>
        </form>
        <p className="portal-sub" style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link to="/portal/login">{t('portalForgotPassword.backButton')}</Link>
        </p>
      </div>
    </PortalLayout>
  );
}

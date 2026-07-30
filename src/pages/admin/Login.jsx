import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lockup } from '../../components/Logo.jsx';
import { staffLogin } from '../../lib/adminApi.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function AdminLogin() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus('sending');
    setError('');
    try {
      await staffLogin(data.get('email'), data.get('password'));
      navigate('/admin/clientes', { replace: true });
    } catch (submissionError) {
      setError(submissionError.message);
      setStatus('error');
    }
  };

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <Lockup onNavy markSize={34} />
      </header>
      <main className="portal-main">
        <div className="portal-card">
          <h1>{t('adminLogin.title')}</h1>
          <p className="portal-sub">{t('adminLogin.subtitle')}</p>
          <form onSubmit={submit}>
            <div className="form-group">
              <label htmlFor="email">{t('adminLogin.emailLabel')}</label>
              <input id="email" name="email" type="email" required maxLength="254" autoComplete="email" />
            </div>
            <div className="form-group">
              <label htmlFor="password">{t('adminLogin.passwordLabel')}</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn btn-primary submit-btn" type="submit" disabled={status === 'sending'} style={{ width: '100%' }}>
              {status === 'sending' ? t('adminLogin.sendingButton') : t('adminLogin.submitButton')}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/portal/PortalLayout.jsx';
import { login } from '../../lib/portalApi.js';

export default function PortalLogin() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus('sending');
    setError('');
    try {
      await login(data.get('email'), data.get('password'));
      navigate('/portal/dashboard', { replace: true });
    } catch (submissionError) {
      setError(submissionError.message);
      setStatus('error');
    }
  };

  return (
    <PortalLayout>
      <div className="portal-card">
        <h1>Portal de clientes</h1>
        <p className="portal-sub">Inicia sesión para continuar tu verificación de identidad.</p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" name="email" type="email" required maxLength="254" autoComplete="email" />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary submit-btn" type="submit" disabled={status === 'sending'} style={{ width: '100%' }}>
            {status === 'sending' ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </PortalLayout>
  );
}

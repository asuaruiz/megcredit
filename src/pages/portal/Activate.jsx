import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import PortalLayout from '../../components/portal/PortalLayout.jsx';
import { activateAccount } from '../../lib/portalApi.js';

export default function PortalActivate() {
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
      setError('Las contraseñas no coinciden.');
      setStatus('error');
      return;
    }
    setStatus('sending');
    setError('');
    try {
      await activateAccount(token, password);
      navigate('/portal/dashboard', { replace: true });
    } catch (submissionError) {
      setError(submissionError.message);
      setStatus('error');
    }
  };

  if (!token) {
    return (
      <PortalLayout>
        <div className="portal-card">
          <h1>Enlace inválido</h1>
          <p className="portal-sub">Este enlace de activación no es válido. Solicita uno nuevo a tu asesor.</p>
          <Link className="btn btn-outline" to="/portal/login">Ir a iniciar sesión</Link>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="portal-card">
        <h1>Crea tu contraseña</h1>
        <p className="portal-sub">Elige una contraseña segura de al menos 8 caracteres para tu cuenta del portal.</p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" required minLength="8" autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label htmlFor="confirm">Confirma tu contraseña</label>
            <input id="confirm" name="confirm" type="password" required minLength="8" autoComplete="new-password" />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary submit-btn" type="submit" disabled={status === 'sending'} style={{ width: '100%' }}>
            {status === 'sending' ? 'Creando cuenta…' : 'Crear mi cuenta'}
          </button>
        </form>
      </div>
    </PortalLayout>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { staffLogin } from '../../lib/adminApi.js';

export default function AdminLogin() {
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
    <AdminLayout>
      <div className="portal-card">
        <h1>Panel de administrador</h1>
        <p className="portal-sub">Acceso exclusivo para el equipo de MEG Credit.</p>
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
    </AdminLayout>
  );
}

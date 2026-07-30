import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { fetchClients, fetchStaffMe, inviteClient, staffLogout } from '../../lib/adminApi.js';

const STATUS_LABEL = { invited: 'Invitado', active: 'Activo', suspended: 'Suspendido' };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [inviteStatus, setInviteStatus] = useState('idle');
  const [inviteError, setInviteError] = useState('');

  const load = async () => {
    try {
      await fetchStaffMe();
      const data = await fetchClients();
      setClients(data.clients || []);
    } catch {
      navigate('/admin/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleInvite = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setInviteStatus('sending');
    setInviteError('');
    try {
      await inviteClient(data.get('email'), data.get('fullName'));
      event.currentTarget.reset();
      setInviteStatus('sent');
      load();
    } catch (error) {
      setInviteError(error.message);
      setInviteStatus('error');
    }
  };

  const handleLogout = async () => {
    await staffLogout();
    navigate('/admin/login', { replace: true });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="portal-card"><p className="portal-sub">Cargando…</p></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout onLogout={handleLogout}>
      <div className="portal-card wide">
        <h1>Invitar cliente</h1>
        <form onSubmit={handleInvite}>
          <div className="form-row" style={{ display: 'flex', gap: 16 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="fullName">Nombre completo</label>
              <input id="fullName" name="fullName" required minLength="2" maxLength="160" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" name="email" type="email" required maxLength="254" />
            </div>
          </div>
          {inviteError && <p className="form-error" role="alert">{inviteError}</p>}
          <button className="btn btn-primary" type="submit" disabled={inviteStatus === 'sending'}>
            {inviteStatus === 'sending' ? 'Enviando…' : 'Enviar invitación'}
          </button>
        </form>
      </div>

      <div className="portal-card wide" style={{ marginTop: 24 }}>
        <h1>Clientes</h1>
        {clients.length === 0 ? (
          <p className="portal-sub">Todavía no hay clientes registrados.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.1))' }}>
                <th style={{ padding: '8px 6px' }}>Nombre</th>
                <th style={{ padding: '8px 6px' }}>Correo</th>
                <th style={{ padding: '8px 6px' }}>Estado</th>
                <th style={{ padding: '8px 6px' }}>Documentos</th>
                <th style={{ padding: '8px 6px' }}>Plan</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} style={{ borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.06))' }}>
                  <td style={{ padding: '8px 6px' }}>
                    <Link to={`/admin/clientes/${client.id}`}>{client.full_name}</Link>
                  </td>
                  <td style={{ padding: '8px 6px' }}>{client.email}</td>
                  <td style={{ padding: '8px 6px' }}>{STATUS_LABEL[client.status] || client.status}</td>
                  <td style={{ padding: '8px 6px' }}>{client.documentCount}</td>
                  <td style={{ padding: '8px 6px' }}>{client.latestPlanStatus || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}

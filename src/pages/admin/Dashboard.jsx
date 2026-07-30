import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { fetchClients, fetchStaffMe, inviteClient, staffLogout } from '../../lib/adminApi.js';

const STATUS_LABEL = { invited: 'Invitado', active: 'Activo', suspended: 'Suspendido' };
const STATUS_BADGE = { invited: 'pending', active: 'approved', suspended: 'rejected' };

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
      <AdminLayout title="Clientes">
        <div className="portal-card"><p className="portal-sub">Cargando…</p></div>
      </AdminLayout>
    );
  }

  const activeCount = clients.filter((c) => c.status === 'active').length;
  const invitedCount = clients.filter((c) => c.status === 'invited').length;

  return (
    <AdminLayout title="Clientes" onLogout={handleLogout}>
      <div className="admin-stats">
        <div className="admin-stat-tile">
          <div className="stat-value">{clients.length}</div>
          <div className="stat-label">Total de clientes</div>
        </div>
        <div className="admin-stat-tile">
          <div className="stat-value">{activeCount}</div>
          <div className="stat-label">Activos</div>
        </div>
        <div className="admin-stat-tile">
          <div className="stat-value">{invitedCount}</div>
          <div className="stat-label">Invitados</div>
        </div>
      </div>

      <div className="portal-card wide admin-section">
        <h2>Invitar cliente</h2>
        <form onSubmit={handleInvite}>
          <div className="admin-form-row">
            <div className="form-group">
              <label htmlFor="fullName">Nombre completo</label>
              <input id="fullName" name="fullName" required minLength="2" maxLength="160" />
            </div>
            <div className="form-group">
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

      <div className="portal-card wide">
        <h2>Todos los clientes</h2>
        {clients.length === 0 ? (
          <p className="portal-sub">Todavía no hay clientes registrados.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Estado</th>
                  <th>Documentos</th>
                  <th>Plan</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <Link to={`/admin/clientes/${client.id}`}>{client.full_name}</Link>
                    </td>
                    <td>{client.email}</td>
                    <td>
                      <span className={`status-badge ${STATUS_BADGE[client.status] || 'missing'}`}>
                        {STATUS_LABEL[client.status] || client.status}
                      </span>
                    </td>
                    <td>{client.documentCount}</td>
                    <td>{client.latestPlanStatus || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

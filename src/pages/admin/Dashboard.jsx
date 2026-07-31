import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { fetchClients, fetchStaffMe, inviteClient, staffLogout } from '../../lib/adminApi.js';

const STATUS_BADGE = { invited: 'pending', active: 'approved', suspended: 'rejected' };

export default function AdminDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [inviteStatus, setInviteStatus] = useState('idle');
  const [inviteError, setInviteError] = useState('');

  const STATUS_LABEL = {
    invited: t('admin.invited'),
    active: t('admin.active'),
    suspended: t('admin.suspended'),
  };

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
    const form = event.currentTarget;
    const data = new FormData(form);
    setInviteStatus('sending');
    setInviteError('');
    try {
      await inviteClient(data.get('email'), data.get('fullName'));
      form.reset();
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
      <AdminLayout title={t('admin.clients')}>
        <div className="portal-card"><p className="portal-sub">{t('admin.loading')}</p></div>
      </AdminLayout>
    );
  }

  const activeCount = clients.filter((c) => c.status === 'active').length;
  const invitedCount = clients.filter((c) => c.status === 'invited').length;

  return (
    <AdminLayout title={t('admin.clients')} onLogout={handleLogout}>
      <div className="admin-stats">
        <div className="admin-stat-tile">
          <div className="stat-value">{clients.length}</div>
          <div className="stat-label">{t('admin.totalClients')}</div>
        </div>
        <div className="admin-stat-tile">
          <div className="stat-value">{activeCount}</div>
          <div className="stat-label">{t('admin.active')}</div>
        </div>
        <div className="admin-stat-tile">
          <div className="stat-value">{invitedCount}</div>
          <div className="stat-label">{t('admin.invited')}</div>
        </div>
      </div>

      <div className="workspace-split">
        <div className="col-main">
          <div className="portal-card wide">
            <h2>{t('admin.allClients')}</h2>
            {clients.length === 0 ? (
              <p className="portal-sub">{t('admin.noClientsRegistered')}</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('admin.name')}</th>
                      <th>{t('admin.email_header')}</th>
                      <th>{t('admin.status')}</th>
                      <th>{t('admin.documents')}</th>
                      <th>{t('admin.plan')}</th>
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
        </div>

        <div className="col-aside">
          <div className="portal-card wide">
            <h2>{t('admin.inviteClient')}</h2>
            <form onSubmit={handleInvite}>
              <div className="stack-4">
                <div className="form-group">
                  <label htmlFor="fullName">{t('admin.fullName')}</label>
                  <input id="fullName" name="fullName" required minLength="2" maxLength="160" />
                </div>
                <div className="form-group">
                  <label htmlFor="email">{t('admin.email')}</label>
                  <input id="email" name="email" type="email" required maxLength="254" />
                </div>
              </div>
              {inviteError && <p className="form-error" role="alert">{inviteError}</p>}
              <button className="btn btn-primary" type="submit" disabled={inviteStatus === 'sending'}>
                {inviteStatus === 'sending' ? t('admin.sending') : t('admin.sendInvitation')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

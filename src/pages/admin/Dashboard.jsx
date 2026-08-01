import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import Modal from '../../components/portal/Modal.jsx';
import { fetchClients, fetchStaffMe, inviteClient, staffLogout } from '../../lib/adminApi.js';

const STATUS_BADGE = { invited: 'pending', active: 'approved', suspended: 'rejected' };

function CommandPalette({ clients, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const activeClients = clients.filter((client) => !client.isInvite);
    const pool = needle
      ? activeClients.filter((client) => client.full_name.toLowerCase().includes(needle) || client.email.toLowerCase().includes(needle))
      : activeClients;
    return pool.slice(0, 8);
  }, [clients, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const go = (client) => {
    if (!client) return;
    onClose();
    navigate(`/admin/clientes/${client.id}`);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[activeIndex]);
    } else if (event.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="app-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="cmdk-panel">
        <input
          ref={inputRef}
          className="cmdk-input"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="⌘K"
        />
        <div className="cmdk-results">
          {results.length === 0 ? (
            <div className="cmdk-empty">No matches.</div>
          ) : (
            results.map((client, index) => (
              <div
                key={client.id}
                className="cmdk-result"
                data-active={index === activeIndex ? 'true' : 'false'}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => go(client)}
              >
                <span>{client.full_name}</span>
                <span>{client.email}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [inviteStatus, setInviteStatus] = useState('idle');
  const [inviteError, setInviteError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCmdk, setShowCmdk] = useState(false);

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

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowCmdk(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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
      setInviteStatus('idle');
      setShowInvite(false);
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
  const noPlanCount = clients.filter((c) => !c.isInvite && !c.latestPlanStatus).length;

  const filtered = clients
    .filter((client) => {
      if (filter === 'active') return client.status === 'active';
      if (filter === 'invited') return client.status === 'invited';
      if (filter === 'noplan') return !client.isInvite && !client.latestPlanStatus;
      return true;
    })
    .filter((client) => {
      const needle = search.trim().toLowerCase();
      if (!needle) return true;
      return client.full_name.toLowerCase().includes(needle) || client.email.toLowerCase().includes(needle);
    });

  return (
    <AdminLayout title={t('admin.clients')} onLogout={handleLogout}>
      <div className="admin-stats">
        <button type="button" className="admin-stat-tile queue-tile" data-active={filter === 'all' ? 'true' : 'false'} onClick={() => setFilter('all')}>
          <div className="stat-value">{clients.length}</div>
          <div className="stat-label">{t('admin.totalClients')}</div>
        </button>
        <button type="button" className="admin-stat-tile queue-tile" data-active={filter === 'active' ? 'true' : 'false'} onClick={() => setFilter('active')}>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-label">{t('admin.active')}</div>
        </button>
        <button type="button" className="admin-stat-tile queue-tile" data-active={filter === 'invited' ? 'true' : 'false'} onClick={() => setFilter('invited')}>
          <div className="stat-value">{invitedCount}</div>
          <div className="stat-label">{t('admin.invited')}</div>
        </button>
        <button type="button" className="admin-stat-tile queue-tile" data-active={filter === 'noplan' ? 'true' : 'false'} onClick={() => setFilter('noplan')}>
          <div className="stat-value">{noPlanCount}</div>
          <div className="stat-label">{t('admin.filterNoPlan')}</div>
        </button>
      </div>

      <div className="portal-card wide">
        <div className="dash-toolbar">
          <input
            className="search-field"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.searchPlaceholder')}
            aria-label={t('admin.searchPlaceholder')}
          />
          <button className="btn btn-primary" type="button" onClick={() => setShowInvite(true)}>
            {t('admin.inviteClientCta')}
          </button>
        </div>

        {filtered.length === 0 ? (
          <p className="portal-sub">{clients.length === 0 ? t('admin.noClientsRegistered') : t('admin.noResultsSearch')}</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.name')}</th>
                  <th>{t('admin.email_header')}</th>
                  <th>{t('admin.status')}</th>
                  <th className="numeric">{t('admin.documents')}</th>
                  <th>{t('admin.plan')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id} className={client.isInvite ? '' : 'row-clickable'} onClick={() => { if (!client.isInvite) navigate(`/admin/clientes/${client.id}`); }}>
                    <td>
                      {client.isInvite ? client.full_name : <Link to={`/admin/clientes/${client.id}`} onClick={(event) => event.stopPropagation()}>{client.full_name}</Link>}
                    </td>
                    <td>{client.email}</td>
                    <td>
                      <span className={`status-badge ${STATUS_BADGE[client.status] || 'missing'}`}>
                        {STATUS_LABEL[client.status] || client.status}
                      </span>
                    </td>
                    <td className="numeric">{client.documentCount}</td>
                    <td>{client.latestPlanStatus || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInvite && (
        <Modal title={t('admin.inviteClient')} onClose={() => setShowInvite(false)}>
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
            <button className="btn btn-primary submit-btn" type="submit" disabled={inviteStatus === 'sending'}>
              {inviteStatus === 'sending' ? t('admin.sending') : t('admin.sendInvitation')}
            </button>
          </form>
        </Modal>
      )}

      {showCmdk && <CommandPalette clients={clients} onClose={() => setShowCmdk(false)} />}
    </AdminLayout>
  );
}

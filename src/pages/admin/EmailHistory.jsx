import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { fetchEmailHistory, fetchStaffMe, staffLogout } from '../../lib/adminApi.js';

const TYPE_KEYS = {
  client_invitation: 'emailHistory.typeInvitation',
  agreement_ready: 'emailHistory.typeAgreement',
  payment_link: 'emailHistory.typePaymentLink',
  payment_reminder: 'emailHistory.typeReminder',
};

export default function EmailHistory() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    Promise.all([fetchStaffMe(), fetchEmailHistory()])
      .then(([, data]) => setEmails(data.emails || []))
      .catch((requestError) => requestError.status === 401 ? navigate('/admin/login', { replace: true }) : setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return emails.filter((email) => (status === 'all' || email.status === status)
      && (!needle || email.recipient_email.toLowerCase().includes(needle) || email.subject.toLowerCase().includes(needle)));
  }, [emails, search, status]);

  const handleLogout = async () => { await staffLogout(); navigate('/admin/login', { replace: true }); };

  return (
    <AdminLayout title={t('emailHistory.title')} onLogout={handleLogout}>
      <section className="email-history-intro">
        <p className="admin-overline">{t('emailHistory.overline')}</p>
        <h1>{t('emailHistory.heading')}</h1>
        <p>{t('emailHistory.description')}</p>
      </section>
      <div className="portal-card wide">
        <div className="dash-toolbar email-history-toolbar">
          <input className="search-field" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('emailHistory.search')} />
          <div className="email-status-filter" aria-label={t('emailHistory.filterLabel')}>
            {['all', 'sent', 'failed'].map((value) => <button key={value} type="button" data-active={status === value ? 'true' : 'false'} onClick={() => setStatus(value)}>{t(`emailHistory.filter_${value}`)}</button>)}
          </div>
        </div>
        {loading && <p className="portal-sub">{t('admin.loading')}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {!loading && !error && filtered.length === 0 && <p className="portal-sub">{t('emailHistory.empty')}</p>}
        {!loading && !error && filtered.length > 0 && (
          <div className="admin-table-wrap"><table className="admin-table email-history-table">
            <thead><tr><th>{t('emailHistory.recipient')}</th><th>{t('emailHistory.message')}</th><th>{t('emailHistory.status')}</th><th>{t('emailHistory.date')}</th></tr></thead>
            <tbody>{filtered.map((email) => <tr key={email.id}>
              <td>{email.recipient_email}</td>
              <td><strong>{email.subject}</strong><span className="email-history-meta">{t(TYPE_KEYS[email.email_type] || 'emailHistory.typeTransactional')}{email.provider_message_id ? ` · ${email.provider_message_id}` : ''}</span>{email.error_message && <span className="email-history-error">{email.error_message}</span>}</td>
              <td><span className={`status-badge ${email.status === 'sent' ? 'approved' : 'rejected'}`}>{t(`emailHistory.${email.status}`)}</span></td>
              <td><time dateTime={email.created_at}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(email.created_at))}</time></td>
            </tr>)}</tbody>
          </table></div>
        )}
      </div>
    </AdminLayout>
  );
}

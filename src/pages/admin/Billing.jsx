import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { fetchBilling, fetchStaffMe, staffLogout } from '../../lib/adminApi.js';

const STATUS_BADGE = { draft: 'missing', awaiting_payment: 'pending', active: 'approved', paid: 'achieved', past_due: 'rejected', canceled: 'missing' };
const money = (cents, currency = 'usd') => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format((cents || 0) / 100);

export default function Billing() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState({ summary: {}, plans: [], transactions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('open');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    Promise.all([fetchStaffMe(), fetchBilling()])
      .then(([, billing]) => setData(billing))
      .catch((requestError) => requestError.status === 401 ? navigate('/admin/login', { replace: true }) : setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const plans = useMemo(() => data.plans.filter((plan) => {
    const needle = query.trim().toLowerCase();
    if (filter === 'open' && ['paid', 'canceled'].includes(plan.status)) return false;
    if (filter !== 'all' && filter !== 'open' && plan.status !== filter) return false;
    return !needle || plan.client?.full_name.toLowerCase().includes(needle) || plan.client?.email.toLowerCase().includes(needle) || plan.services.join(' ').toLowerCase().includes(needle);
  }), [data.plans, query, filter]);

  const cadence = (plan) => {
    if (plan.billing_type === 'one_time') return t('billing.oneTime');
    if (plan.recurring_interval === 'week' && plan.recurring_interval_count === 2) return t('billing.fortnightly');
    return t(`billing.${plan.recurring_interval || 'month'}`);
  };
  const logout = async () => { await staffLogout(); navigate('/admin/login', { replace: true }); };
  const locale = language === 'es' ? 'es-US' : 'en-US';

  return <AdminLayout title={t('billing.title')} onLogout={logout}>
    <section className="billing-hero">
      <div><p className="admin-overline">{t('billing.overline')}</p><h1>{t('billing.heading')}</h1><p>{t('billing.description')}</p></div>
      <div className="billing-balance"><span>{t('billing.outstanding')}</span><strong>{money(data.summary.total_due_cents)}</strong></div>
    </section>

    <div className="billing-metrics">
      <div><span>{t('billing.agreed')}</span><strong>{money(data.summary.total_agreed_cents)}</strong></div>
      <div><span>{t('billing.collected')}</span><strong>{money(data.summary.total_paid_cents)}</strong></div>
      <div className="is-alert"><span>{t('billing.pastDue')}</span><strong>{money(data.summary.past_due_cents)}</strong></div>
      <div><span>{t('billing.activeSubscriptions')}</span><strong>{data.summary.active_subscriptions || 0}</strong></div>
    </div>

    <section className="portal-card wide">
      <div className="dash-toolbar billing-toolbar">
        <input className="search-field" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('billing.search')} />
        <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label={t('billing.filter')}>
          <option value="open">{t('billing.openBalances')}</option><option value="all">{t('billing.all')}</option><option value="awaiting_payment">{t('billing.awaiting_payment')}</option><option value="active">{t('billing.active')}</option><option value="past_due">{t('billing.past_due')}</option><option value="paid">{t('billing.paid')}</option><option value="canceled">{t('billing.canceled')}</option>
        </select>
      </div>
      {loading && <p className="portal-sub">{t('admin.loading')}</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && !error && plans.length === 0 && <p className="portal-sub">{t('billing.empty')}</p>}
      {!loading && !error && plans.length > 0 && <div className="admin-table-wrap"><table className="admin-table billing-table">
        <thead><tr><th>{t('billing.client')}</th><th>{t('billing.plan')}</th><th>{t('billing.collected')}</th><th>{t('billing.balance')}</th><th>{t('billing.nextCharge')}</th><th>{t('billing.status')}</th></tr></thead>
        <tbody>{plans.map((plan) => {
          const planTransactions = data.transactions.filter((entry) => entry.payment_plan_id === plan.id);
          return <tr key={plan.id} className="billing-plan-row">
            <td><Link to={`/admin/clientes/${plan.client_account_id}`}>{plan.client?.full_name || t('billing.unknownClient')}</Link><span>{plan.client?.email}</span></td>
            <td><strong>{plan.services.join(', ') || t('billing.noServices')}</strong><span>{cadence(plan)}{plan.recurring_amount_cents ? ` · ${money(plan.recurring_amount_cents, plan.currency)}` : ''}</span><button className="billing-history-toggle" type="button" onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}>{expanded === plan.id ? t('billing.hideHistory') : t('billing.viewHistory')}</button>{expanded === plan.id && <div className="billing-ledger">{planTransactions.length === 0 ? <em>{t('billing.noTransactions')}</em> : planTransactions.map((entry) => <div key={entry.id}><time>{new Date(entry.occurred_at).toLocaleDateString(locale)}</time><span>{t(`billing.tx_${entry.transaction_type}`)}</span><strong className={entry.amount_cents < 0 ? 'negative' : ''}>{money(entry.amount_cents, entry.currency)}</strong></div>)}</div>}</td>
            <td>{money(plan.amount_paid_cents, plan.currency)}</td><td><strong>{money(plan.balance_cents, plan.currency)}</strong></td>
            <td>{plan.next_charge_at ? new Date(plan.next_charge_at).toLocaleDateString(locale) : '—'}</td>
            <td><span className={`status-badge ${STATUS_BADGE[plan.status] || 'missing'}`}>{t(`billing.${plan.status}`)}</span></td>
          </tr>;
        })}</tbody>
      </table></div>}
    </section>
  </AdminLayout>;
}

import { useEffect, useState } from 'react';
import { fetchServices, payPlan } from '../../lib/portalApi.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

function formatCents(cents) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function PlanCard({ plan }) {
  const { t } = useLanguage();
  const total = plan.services.reduce((sum, service) => sum + service.price_cents, 0);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const PLAN_STATUS_LABEL = {
    draft: t('servicesPanel.statusDraft'),
    awaiting_payment: t('servicesPanel.statusAwaitingPayment'),
    active: t('servicesPanel.statusActive'),
    paid: t('servicesPanel.statusPaid'),
    past_due: t('servicesPanel.statusPastDue'),
    canceled: t('servicesPanel.statusCanceled'),
  };

  const BILLING_LABEL = { one_time: t('servicesPanel.billingOneTime'), recurring: t('servicesPanel.billingRecurring') };
  const INTERVAL_LABEL = { week: t('servicesPanel.intervalWeek'), month: t('servicesPanel.intervalMonth'), year: t('servicesPanel.intervalYear') };

  const handlePay = async () => {
    setPaying(true);
    setPayError('');
    try {
      await payPlan(plan.id);
    } catch (error) {
      setPayError(error.message);
      setPaying(false);
    }
  };

  return (
    <div className="doc-tile plan-card">
      <span className={`status-badge ${plan.status === 'paid' || plan.status === 'active' ? 'approved' : plan.status === 'past_due' ? 'rejected' : 'pending'}`}>
        {PLAN_STATUS_LABEL[plan.status] || plan.status}
      </span>
      <h3>{BILLING_LABEL[plan.billing_type]}{plan.recurring_interval ? ` · ${plan.recurring_interval === 'week' && plan.recurring_interval_count === 2 ? 'Every two weeks' : INTERVAL_LABEL[plan.recurring_interval]}` : ''}</h3>
      <ul className="plan-service-list">
        {plan.services.map((service) => (
          <li key={service.id}>{service.name} — {formatCents(service.price_cents)}</li>
        ))}
      </ul>
      <p className="plan-total">{t('servicesPanel.total')}: {formatCents(total)}</p>

      {plan.agreement?.status === 'signed' && plan.status === 'awaiting_payment' && (
        <>
          {payError && <p className="form-error" role="alert">{payError}</p>}
          <button className="btn btn-primary submit-btn" type="button" onClick={handlePay} disabled={paying}>
            {paying ? t('servicesPanel.redirecting') : t('servicesPanel.payWithStripe')}
          </button>
        </>
      )}
    </div>
  );
}

export default function ServicesPanel() {
  const { t } = useLanguage();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await fetchServices();
      setPlans(data.plans || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading || plans.length === 0) return null;

  return (
    <div className="services-panel">
      <h2 className="services-panel-title">{t('servicesPanel.sectionTitle')}</h2>
      <p className="portal-sub">{t('servicesPanel.sectionSubtitle')}</p>
      <div className="stack-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}

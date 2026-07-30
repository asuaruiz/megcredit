import { useEffect, useState } from 'react';
import { fetchServices, payPlan, signAgreement } from '../../lib/portalApi.js';

const PLAN_STATUS_LABEL = {
  draft: 'Preparando plan',
  awaiting_payment: 'Listo para pagar',
  active: 'Suscripción activa',
  paid: 'Pagado',
  past_due: 'Pago pendiente',
  canceled: 'Cancelado',
};

const BILLING_LABEL = { one_time: 'Pago único', recurring: 'Pago recurrente' };
const INTERVAL_LABEL = { week: 'semanal', month: 'mensual', year: 'anual' };

function formatCents(cents) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function SignAgreementForm({ agreement, onSigned }) {
  const [fullName, setFullName] = useState('');
  const [agree, setAgree] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setStatus('sending');
    setError('');
    try {
      await signAgreement(agreement.id, fullName);
      onSigned();
    } catch (signError) {
      setError(signError.message);
      setStatus('error');
    }
  };

  return (
    <form onSubmit={submit}>
      <h3>{agreement.title}</h3>
      <div className="doc-tile" style={{ maxHeight: 220, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: 13, marginBottom: 16 }}>
        {agreement.body_text}
      </div>
      <div className="form-group">
        <label htmlFor={`sign-${agreement.id}`}>Escribe tu nombre completo para firmar</label>
        <input id={`sign-${agreement.id}`} value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength="2" />
      </div>
      <label className="checkbox-item consent-checkbox">
        <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} required />
        <span>He leído y acepto los términos de este acuerdo de servicios.</span>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn btn-primary submit-btn" type="submit" disabled={status === 'sending' || !agree} style={{ width: '100%', marginTop: 12 }}>
        {status === 'sending' ? 'Firmando…' : 'Firmar y aceptar'}
      </button>
    </form>
  );
}

function PlanCard({ plan, onSigned }) {
  const total = plan.services.reduce((sum, service) => sum + service.price_cents, 0);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

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
    <div className="doc-tile" style={{ marginBottom: 20 }}>
      <span className={`status-badge ${plan.status === 'paid' || plan.status === 'active' ? 'approved' : plan.status === 'past_due' ? 'rejected' : 'pending'}`}>
        {PLAN_STATUS_LABEL[plan.status] || plan.status}
      </span>
      <h3>{BILLING_LABEL[plan.billing_type]}{plan.recurring_interval ? ` · ${INTERVAL_LABEL[plan.recurring_interval]}` : ''}</h3>
      <ul style={{ margin: '10px 0', paddingLeft: 18 }}>
        {plan.services.map((service) => (
          <li key={service.id} style={{ fontSize: 14, marginBottom: 4 }}>
            {service.name} — {formatCents(service.price_cents)}
          </li>
        ))}
      </ul>
      <p style={{ fontWeight: 600, marginBottom: 16 }}>Total: {formatCents(total)}</p>

      {plan.agreement?.status === 'pending' && <SignAgreementForm agreement={plan.agreement} onSigned={onSigned} />}

      {plan.agreement?.status === 'signed' && plan.status === 'awaiting_payment' && (
        <>
          {payError && <p className="form-error" role="alert">{payError}</p>}
          <button className="btn btn-primary" type="button" onClick={handlePay} disabled={paying} style={{ width: '100%' }}>
            {paying ? 'Redirigiendo a Stripe…' : 'Pagar con Stripe'}
          </button>
        </>
      )}
    </div>
  );
}

export default function ServicesPanel() {
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
    <div style={{ marginTop: 36 }}>
      <h2 style={{ fontSize: 20, marginBottom: 4 }}>Servicios y pagos</h2>
      <p className="portal-sub">Revisa los servicios que armó tu asesor, firma el acuerdo y completa tu pago.</p>
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} onSigned={load} />
      ))}
    </div>
  );
}

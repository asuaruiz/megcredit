import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { assignPlan, fetchCatalog, fetchClientCreditMonitoring, fetchClientDetail, fetchStaffMe, reviewDocument, staffLogout } from '../../lib/adminApi.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

function CreditMonitoringSection({ clientId }) {
  const { t } = useLanguage();
  const [state, setState] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const PROVIDER_LABEL = { identityiq: 'IdentityIQ', smartcredit: 'SmartCredit', myscoreiq: 'MyScoreIQ', other: t('portalDashboard.providerOther') };

  const reveal = async () => {
    setState('loading');
    setError('');
    try {
      const result = await fetchClientCreditMonitoring(clientId);
      setData(result);
      setState('loaded');
    } catch (fetchError) {
      setError(fetchError.message);
      setState('error');
    }
  };

  return (
    <>
      <h2 style={{ fontSize: 16, marginTop: 24 }}>{t('adminClientDetail.creditMonitoringTitle')}</h2>
      {state !== 'loaded' && (
        <button className="btn btn-outline" type="button" onClick={reveal} disabled={state === 'loading'}>
          {state === 'loading' ? t('adminClientDetail.loadingCredentials') : t('adminClientDetail.viewCredentials')}
        </button>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {state === 'loaded' && data && (
        <div className="doc-tile">
          <p style={{ fontSize: 14 }}><strong>{t('adminClientDetail.providerLabel')}:</strong> {PROVIDER_LABEL[data.provider] || data.provider}</p>
          <p style={{ fontSize: 14 }}><strong>{t('adminClientDetail.usernameLabel')}:</strong> {data.username}</p>
          <p style={{ fontSize: 14 }}><strong>{t('adminClientDetail.passwordLabel')}:</strong> {data.password}</p>
          {data.phone && <p style={{ fontSize: 14 }}><strong>{t('adminClientDetail.phoneLabel')}:</strong> {data.phone}</p>}
          {data.securityWord && <p style={{ fontSize: 14 }}><strong>{t('adminClientDetail.securityWordLabel')}:</strong> {data.securityWord}</p>}
        </div>
      )}
    </>
  );
}

function formatCents(cents) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function AdminClientDetail() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [billingType, setBillingType] = useState('one_time');
  const [recurringInterval, setRecurringInterval] = useState('month');
  const [firstPaymentCents, setFirstPaymentCents] = useState(0);
  const [agreementTitle, setAgreementTitle] = useState(t('adminClientDetail.agreementTitleDefault'));
  const [agreementText, setAgreementText] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewError, setReviewError] = useState('');

  const DOCUMENT_LABEL = {
    id_front: t('adminClientDetail.documentIdFront'),
    id_back: t('adminClientDetail.documentIdBack'),
    selfie_with_id: t('adminClientDetail.documentSelfie'),
    ssn_card: t('adminClientDetail.documentSsn'),
    proof_of_residency: t('adminClientDetail.documentProof'),
  };

  const defaultAgreementText = (services, billing, interval, firstPayment) => {
    const total = services.reduce((sum, service) => sum + (Number(service.priceCents) || 0), 0);
    const lines = services.map((service) => `- ${service.name || t('adminClientDetail.unnamed')}: ${formatCents(Number(service.priceCents) || 0)}`);
    const billingLine = billing === 'recurring'
      ? t('adminClientDetail').agreementRecurringLine(interval || t('adminClientDetail.intervalMonthly'), formatCents(total))
      : t('adminClientDetail').agreementOneTimeLine(formatCents(total));
    const firstPaymentLine = billing === 'recurring' && firstPayment > 0
      ? `\n${t('adminClientDetail').agreementFirstPaymentLine(formatCents(firstPayment))}\n`
      : '';
    return `${t('adminClientDetail.agreementIntro')}\n\n${lines.join('\n')}\n\n${billingLine}\n${firstPaymentLine}\n${t('adminClientDetail.agreementClosing')}`;
  };

  const load = async () => {
    try {
      await fetchStaffMe();
      const [detailData, catalogData] = await Promise.all([fetchClientDetail(id), fetchCatalog()]);
      setDetail(detailData);
      setCatalog(catalogData.catalog || []);
    } catch {
      navigate('/admin/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addCatalogItem = (catalogId) => {
    const item = catalog.find((entry) => entry.id === catalogId);
    if (!item) return;
    setLineItems((prev) => [...prev, { catalogId: item.id, name: item.name, description: item.description, priceCents: item.default_price_cents }]);
  };

  const addCustomItem = () => {
    setLineItems((prev) => [...prev, { catalogId: null, name: '', description: '', priceCents: 0 }]);
  };

  const updateLineItem = (index, patch) => {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeLineItem = (index) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const generateAgreementText = () => {
    setAgreementText(defaultAgreementText(lineItems, billingType, recurringInterval, firstPaymentCents));
  };

  const submitPlan = async (event) => {
    event.preventDefault();
    setStatus('sending');
    setError('');
    try {
      await assignPlan({
        clientId: id,
        services: lineItems.map((item) => ({ catalogId: item.catalogId, name: item.name, description: item.description, priceCents: Number(item.priceCents) })),
        billingType,
        recurringInterval: billingType === 'recurring' ? recurringInterval : undefined,
        firstPaymentCents: billingType === 'recurring' && firstPaymentCents > 0 ? firstPaymentCents : undefined,
        agreementTitle,
        agreementText,
      });
      setLineItems([]);
      setAgreementText('');
      setFirstPaymentCents(0);
      setStatus('idle');
      load();
    } catch (submissionError) {
      setError(submissionError.message);
      setStatus('error');
    }
  };

  const handleLogout = async () => {
    await staffLogout();
    navigate('/admin/login', { replace: true });
  };

  const handleReview = async (documentId, newStatus) => {
    setReviewingId(documentId);
    setReviewError('');
    try {
      await reviewDocument(documentId, newStatus);
      await load();
    } catch (reviewErr) {
      setReviewError(reviewErr.message);
    } finally {
      setReviewingId(null);
    }
  };

  if (loading || !detail) {
    return (
      <AdminLayout title={t('adminClientDetail.clientTitle')}>
        <div className="portal-card"><p className="portal-sub">{t('admin.loading')}</p></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={detail.account.full_name} onLogout={handleLogout}>
      <div className="portal-card wide admin-section">
        <p className="portal-sub">{detail.account.email} · {t('adminClientDetail.statusLabel')}: {detail.account.status}</p>

        <h2 style={{ fontSize: 16, marginTop: 24 }}>{t('adminClientDetail.documentsTitle')}</h2>
        {detail.documents.length === 0 ? (
          <p className="portal-sub">{t('adminClientDetail.noDocuments')}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {detail.documents.map((doc) => (
              <li key={doc.id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 14, marginBottom: 8 }}>
                <span>{DOCUMENT_LABEL[doc.document_type] || doc.document_type}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`status-badge ${doc.status}`}>{doc.status}</span>
                  {doc.status !== 'approved' && (
                    <button
                      className="btn btn-outline"
                      type="button"
                      disabled={reviewingId === doc.id}
                      onClick={() => handleReview(doc.id, 'approved')}
                    >
                      {t('adminClientDetail.approve')}
                    </button>
                  )}
                  {doc.status !== 'rejected' && (
                    <button
                      className="btn btn-outline"
                      type="button"
                      disabled={reviewingId === doc.id}
                      onClick={() => handleReview(doc.id, 'rejected')}
                    >
                      {t('adminClientDetail.reject')}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {reviewError && <p className="form-error" role="alert">{reviewError}</p>}

        <CreditMonitoringSection clientId={id} />

        <h2 style={{ fontSize: 16, marginTop: 24 }}>{t('adminClientDetail.existingPlansTitle')}</h2>
        {detail.plans.length === 0 ? (
          <p className="portal-sub">{t('adminClientDetail.noPlans')}</p>
        ) : (
          detail.plans.map((plan) => (
            <div className="doc-tile" key={plan.id} style={{ marginBottom: 12 }}>
              <span className="status-badge pending">{plan.status}</span>
              <p style={{ fontSize: 14 }}>{plan.billing_type === 'recurring' ? `${t('adminClientDetail.recurring')} (${plan.recurring_interval})` : t('adminClientDetail.oneTime')} — {t('adminClientDetail.contract')}: {plan.agreement?.status || t('adminClientDetail.noContract')}</p>
              {plan.billing_type === 'recurring' && plan.first_payment_cents > 0 && (
                <p style={{ fontSize: 13 }}>{t('adminClientDetail.firstPaymentLabel')}: {formatCents(plan.first_payment_cents)}</p>
              )}
              <ul>
                {plan.services.map((service) => (
                  <li key={service.id} style={{ fontSize: 13 }}>{service.name} — {formatCents(service.price_cents)}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <div className="portal-card wide">
        <h2>{t('adminClientDetail.buildPlanTitle')}</h2>
        <div className="form-group">
          <label htmlFor="catalogSelect">{t('adminClientDetail.addFromCatalog')}</label>
          <select id="catalogSelect" defaultValue="" onChange={(event) => { addCatalogItem(event.target.value); event.target.value = ''; }}>
            <option value="" disabled>{t('adminClientDetail.selectService')}</option>
            {catalog.map((item) => (
              <option key={item.id} value={item.id}>{item.name} — {formatCents(item.default_price_cents)}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-outline" type="button" onClick={addCustomItem} style={{ marginBottom: 16 }}>{t('adminClientDetail.customServiceButton')}</button>

        {lineItems.map((item, index) => (
          <div key={index} className="doc-tile" style={{ marginBottom: 12 }}>
            <div className="admin-form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>{t('adminClientDetail.nameLabel2')}</label>
                <input value={item.name} onChange={(event) => updateLineItem(index, { name: event.target.value })} required minLength="2" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>{t('adminClientDetail.priceLabel')}</label>
                <input type="number" min="0" step="0.01" value={item.priceCents / 100} onChange={(event) => updateLineItem(index, { priceCents: Math.round(Number(event.target.value) * 100) })} required />
              </div>
            </div>
            <div className="form-group">
              <label>{t('adminClientDetail.descriptionLabel')}</label>
              <textarea value={item.description} onChange={(event) => updateLineItem(index, { description: event.target.value })} maxLength="1000" />
            </div>
            <button className="btn btn-outline" type="button" onClick={() => removeLineItem(index)}>{t('adminClientDetail.removeButton')}</button>
          </div>
        ))}

        {lineItems.length > 0 && (
          <form onSubmit={submitPlan}>
            <div className="form-group">
              <label className="group-label">{t('adminClientDetail.billingTypeLabel')}</label>
              <label className="checkbox-item"><input type="radio" name="billingType" checked={billingType === 'one_time'} onChange={() => setBillingType('one_time')} /> {t('adminClientDetail.billingOneTime')}</label>
              <label className="checkbox-item"><input type="radio" name="billingType" checked={billingType === 'recurring'} onChange={() => setBillingType('recurring')} /> {t('adminClientDetail.billingRecurring')}</label>
            </div>
            {billingType === 'recurring' && (
              <div className="admin-form-row">
                <div className="form-group">
                  <label htmlFor="interval">{t('adminClientDetail.intervalLabel')}</label>
                  <select id="interval" value={recurringInterval} onChange={(event) => setRecurringInterval(event.target.value)}>
                    <option value="week">{t('adminClientDetail.intervalWeek')}</option>
                    <option value="month">{t('adminClientDetail.intervalMonth')}</option>
                    <option value="year">{t('adminClientDetail.intervalYear')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="firstPayment">{t('adminClientDetail.firstPaymentLabel')}</label>
                  <input
                    id="firstPayment"
                    type="number"
                    min="0"
                    step="0.01"
                    value={firstPaymentCents / 100}
                    onChange={(event) => setFirstPaymentCents(Math.round(Number(event.target.value) * 100))}
                  />
                </div>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="agreementTitle">{t('adminClientDetail.agreementTitleLabel')}</label>
              <input id="agreementTitle" value={agreementTitle} onChange={(event) => setAgreementTitle(event.target.value)} required minLength="2" />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="agreementText">{t('adminClientDetail.agreementTextLabel')}</label>
                <button className="btn btn-outline" type="button" onClick={generateAgreementText}>{t('adminClientDetail.generateSuggested')}</button>
              </div>
              <textarea id="agreementText" value={agreementText} onChange={(event) => setAgreementText(event.target.value)} required minLength="10" style={{ minHeight: 180 }} />
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn btn-primary submit-btn" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? t('adminClientDetail.sendingPlan') : t('adminClientDetail.submitPlan')}
            </button>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}

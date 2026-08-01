import { useState } from 'react';
import ConfirmDialog from '../ConfirmDialog.jsx';
import { assignPlan, uploadAgreementPdf } from '../../lib/adminApi.js';

function formatCents(cents) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function PlanBuilderTab({ clientId, account, catalog, contractTemplates, t, onSubmitted }) {
  const [lineItems, setLineItems] = useState([]);
  const [billingType, setBillingType] = useState('one_time');
  const [recurringInterval, setRecurringInterval] = useState('month');
  const [recurringAmountCents, setRecurringAmountCents] = useState(0);
  const [firstPaymentCents, setFirstPaymentCents] = useState(0);
  const [agreementTitle, setAgreementTitle] = useState(t('adminClientDetail.agreementTitleDefault'));
  const [agreementText, setAgreementText] = useState('');
  const [agreementSource, setAgreementSource] = useState('text');
  const [agreementPdf, setAgreementPdf] = useState(null);
  const [contractTemplateId, setContractTemplateId] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const defaultAgreementText = (services, billing, interval, firstPayment, recurringAmount) => {
    const total = services.reduce((sum, service) => sum + (Number(service.priceCents) || 0), 0);
    const lines = services.map((service) => `- ${service.name || t('adminClientDetail.unnamed')}: ${formatCents(Number(service.priceCents) || 0)}`);
    const billingLine = billing === 'recurring'
      ? t('adminClientDetail').agreementRecurringLine(interval || t('adminClientDetail.intervalMonthly'), formatCents(recurringAmount || 0))
      : t('adminClientDetail').agreementOneTimeLine(formatCents(total));
    const firstPaymentLine = billing === 'recurring' && firstPayment > 0
      ? `\n${t('adminClientDetail').agreementFirstPaymentLine(formatCents(firstPayment))}\n`
      : '';
    return `${t('adminClientDetail.agreementIntro')}\n\n${lines.join('\n')}\n\n${billingLine}\n${firstPaymentLine}\n${t('adminClientDetail.agreementClosing')}`;
  };

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
    setAgreementText(defaultAgreementText(lineItems, billingType, recurringInterval, firstPaymentCents, recurringAmountCents));
  };

  const totalCents = lineItems.reduce((sum, item) => sum + (Number(item.priceCents) || 0), 0);

  const performSubmit = async () => {
    setShowConfirm(false);
    setStatus('sending');
    setError('');
    try {
      const uploadedPdf = agreementSource === 'pdf' ? await uploadAgreementPdf(clientId, agreementPdf) : null;
      await assignPlan({
        clientId,
        services: lineItems.map((item) => ({ catalogId: item.catalogId, name: item.name, description: item.description, priceCents: Number(item.priceCents) })),
        billingType,
        recurringInterval: billingType === 'recurring' ? recurringInterval : undefined,
        recurringAmountCents: billingType === 'recurring' ? recurringAmountCents : undefined,
        firstPaymentCents: billingType === 'recurring' && firstPaymentCents > 0 ? firstPaymentCents : undefined,
        agreementTitle,
        agreementText: agreementSource === 'text' ? agreementText : '',
        agreementPdfPath: uploadedPdf?.path,
        agreementPdfFilename: uploadedPdf?.filename,
        agreementPdfSizeBytes: uploadedPdf?.sizeBytes,
        contractTemplateId: agreementSource === 'template' ? contractTemplateId : undefined,
      });
      setLineItems([]);
      setAgreementText('');
      setAgreementPdf(null);
      setContractTemplateId('');
      setFirstPaymentCents(0);
      setRecurringAmountCents(0);
      setStatus('idle');
      setSuccessMessage(t('adminClientDetail.planSentSuccess'));
      await onSubmitted();
    } catch (submissionError) {
      setError(submissionError.message);
      setStatus('error');
    }
  };

  const submitPlan = (event) => {
    event.preventDefault();
    setSuccessMessage('');
    setShowConfirm(true);
  };

  const billingSummary = billingType === 'recurring'
    ? `${t('adminClientDetail.billingRecurring')} — ${formatCents(recurringAmountCents)} / ${recurringInterval}`
    : `${t('adminClientDetail.billingOneTime')} — ${formatCents(totalCents)}`;

  return (
    <div className="portal-card wide">
      <h2>{t('adminClientDetail.buildPlanTitle')}</h2>
      {successMessage && <p className="form-success" role="status">{successMessage}</p>}
      <div className="stack-5">
        <div className="form-group">
          <label htmlFor="catalogSelect">{t('adminClientDetail.addFromCatalog')}</label>
          <select id="catalogSelect" defaultValue="" onChange={(event) => { addCatalogItem(event.target.value); event.target.value = ''; }}>
            <option value="" disabled>{t('adminClientDetail.selectService')}</option>
            {catalog.map((item) => (
              <option key={item.id} value={item.id}>{item.name} — {formatCents(item.default_price_cents)}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-outline" type="button" onClick={addCustomItem}>{t('adminClientDetail.customServiceButton')}</button>

        {lineItems.length > 0 && (
          <div className="tile-list">
            {lineItems.map((item, index) => (
              <div key={index} className="doc-tile stack-4">
                <div className="admin-form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>{t('adminClientDetail.nameLabel2')}</label>
                    <input value={item.name} onChange={(event) => updateLineItem(index, { name: event.target.value })} required minLength="2" />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>{t('adminClientDetail.priceLabel')}</label>
                    <input type="number" min="0" step="0.01" value={item.priceCents / 100} onChange={(event) => updateLineItem(index, { priceCents: Math.round(Number(event.target.value) * 100) })} required />
                    {billingType === 'recurring' && <p className="doc-hint">{t('adminClientDetail.serviceValueHint')}</p>}
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('adminClientDetail.descriptionLabel')}</label>
                  <textarea value={item.description} onChange={(event) => updateLineItem(index, { description: event.target.value })} maxLength="1000" />
                </div>
                <button className="btn btn-outline" type="button" onClick={() => removeLineItem(index)}>{t('adminClientDetail.removeButton')}</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {lineItems.length > 0 && (
        <div className="plan-builder-layout">
          <form onSubmit={submitPlan} className="stack-5 plan-builder-form">
            <div className="form-group">
              <label className="group-label">{t('adminClientDetail.billingTypeLabel')}</label>
              <label className="checkbox-item"><input type="radio" name="billingType" checked={billingType === 'one_time'} onChange={() => setBillingType('one_time')} /> {t('adminClientDetail.billingOneTime')}</label>
              <label className="checkbox-item"><input type="radio" name="billingType" checked={billingType === 'recurring'} onChange={() => setBillingType('recurring')} /> {t('adminClientDetail.billingRecurring')}</label>
            </div>
            {billingType === 'recurring' && (
              <>
                <div className="form-group">
                  <label htmlFor="interval">{t('adminClientDetail.intervalLabel')}</label>
                  <select id="interval" value={recurringInterval} onChange={(event) => setRecurringInterval(event.target.value)}>
                    <option value="week">{t('adminClientDetail.intervalWeek')}</option>
                    <option value="month">{t('adminClientDetail.intervalMonth')}</option>
                    <option value="year">{t('adminClientDetail.intervalYear')}</option>
                  </select>
                </div>
                <div className="admin-form-row">
                  <div className="form-group">
                    <label htmlFor="recurringAmount">{t('adminClientDetail.recurringAmountLabel')}</label>
                    <input
                      id="recurringAmount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={recurringAmountCents / 100}
                      onChange={(event) => setRecurringAmountCents(Math.round(Number(event.target.value) * 100))}
                    />
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
              </>
            )}
            <div className="form-group">
              <label htmlFor="agreementTitle">{t('adminClientDetail.agreementTitleLabel')}</label>
              <input id="agreementTitle" value={agreementTitle} onChange={(event) => setAgreementTitle(event.target.value)} required minLength="2" />
            </div>
            <div className="form-group">
              <label className="group-label">{t('adminClientDetail.agreementSourceLabel')}</label>
              <label className="checkbox-item"><input type="radio" name="agreementSource" checked={agreementSource === 'text'} onChange={() => setAgreementSource('text')} /> {t('adminClientDetail.agreementSourceText')}</label>
              <label className="checkbox-item"><input type="radio" name="agreementSource" checked={agreementSource === 'template'} onChange={() => setAgreementSource('template')} /> {t('adminClientDetail.agreementSourceTemplate')}</label>
              <label className="checkbox-item"><input type="radio" name="agreementSource" checked={agreementSource === 'pdf'} onChange={() => setAgreementSource('pdf')} /> {t('adminClientDetail.agreementSourcePdf')}</label>
            </div>
            {agreementSource === 'text' && <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="agreementText">{t('adminClientDetail.agreementTextLabel')}</label>
                <button className="btn btn-outline" type="button" onClick={generateAgreementText}>{t('adminClientDetail.generateSuggested')}</button>
              </div>
              <textarea id="agreementText" value={agreementText} onChange={(event) => setAgreementText(event.target.value)} required minLength="10" style={{ minHeight: 180 }} />
            </div>}
            {agreementSource === 'template' && (
              <div className="form-group">
                <label htmlFor="contractTemplate">{t('adminClientDetail.agreementTemplateLabel')}</label>
                {contractTemplates.length === 0 ? (
                  <p className="doc-hint">{t('adminClientDetail.noTemplatesAvailable')}</p>
                ) : (
                  <select id="contractTemplate" value={contractTemplateId} onChange={(event) => setContractTemplateId(event.target.value)} required>
                    <option value="" disabled>{t('adminClientDetail.selectTemplate')}</option>
                    {contractTemplates.map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
            {agreementSource === 'pdf' && <div className="form-group"><label htmlFor="agreementPdf">{t('adminClientDetail.agreementPdfLabel')}</label><input id="agreementPdf" type="file" accept="application/pdf" required onChange={(event) => setAgreementPdf(event.target.files?.[0] || null)} /></div>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn btn-primary submit-btn" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? t('adminClientDetail.sendingPlan') : t('adminClientDetail.submitPlan')}
            </button>
          </form>

          <aside className="plan-summary-rail">
            <h3>{t('adminClientDetail.summaryTitle')}</h3>
            {lineItems.map((item, index) => (
              <div className="plan-summary-line" key={index}>
                <span>{item.name || t('adminClientDetail.unnamed')}</span>
                <span>{formatCents(Number(item.priceCents) || 0)}</span>
              </div>
            ))}
            <div className="plan-summary-total">
              <span>{t('adminClientDetail.summaryTotal')}</span>
              <span>{formatCents(totalCents)}</span>
            </div>
            <p className="plan-summary-meta">{billingSummary}</p>
            <p className="plan-summary-meta">{t('adminClientDetail.summarySendingTo')}: {account.full_name} ({account.email})</p>
          </aside>
        </div>
      )}

      {showConfirm && (
        <ConfirmDialog
          title={t('adminClientDetail.confirmSubmitTitle')}
          message={`${t('adminClientDetail.confirmSubmitMessage')} ${t('adminClientDetail.summaryTotal')}: ${formatCents(totalCents)}. ${t('adminClientDetail.summarySendingTo')}: ${account.full_name}.`}
          confirmLabel={t('adminClientDetail.confirmSubmitButton')}
          busy={status === 'sending'}
          onConfirm={performSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

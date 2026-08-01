import { useState } from 'react';
import Modal from '../portal/Modal.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';
import {
  archiveAgreement,
  cancelPlan,
  fetchAgreementPdf,
  fetchAgreementSignature,
  fetchPaymentHistory,
  resendPaymentLink,
  sendPaymentReminder,
} from '../../lib/adminApi.js';

const PLAN_STATUS_BADGE = {
  draft: 'pending',
  awaiting_payment: 'pending',
  active: 'approved',
  paid: 'achieved',
  past_due: 'rejected',
  canceled: 'missing',
};

function formatCents(cents) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function ClientPlansTab({ plans, language, t, onReload }) {
  const [showArchived, setShowArchived] = useState(false);
  const [archivingId, setArchivingId] = useState(null);
  const [agreementPreview, setAgreementPreview] = useState(null);
  const [agreementError, setAgreementError] = useState('');
  const [openingAgreementId, setOpeningAgreementId] = useState(null);
  const [sendingPaymentId, setSendingPaymentId] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [planActionId, setPlanActionId] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState(null);
  const [cancelPlanTarget, setCancelPlanTarget] = useState(null);

  const activePlans = plans.filter((plan) => !plan.agreement?.archived);
  const archivedPlans = plans.filter((plan) => plan.agreement?.archived);

  const handleViewAgreement = async (agreement) => {
    setOpeningAgreementId(agreement.id);
    setAgreementError('');
    try {
      let signatureUrl = null;
      let pdfUrl = null;
      if (agreement.has_signature) {
        const signature = await fetchAgreementSignature(agreement.id);
        signatureUrl = URL.createObjectURL(signature);
      }
      if (agreement.has_pdf) {
        const pdf = await fetchAgreementPdf(agreement.id);
        pdfUrl = URL.createObjectURL(pdf);
      }
      setAgreementPreview({ ...agreement, signatureUrl, pdfUrl });
    } catch (agreementFetchError) {
      setAgreementError(agreementFetchError.message);
    } finally {
      setOpeningAgreementId(null);
    }
  };

  const closeAgreementPreview = () => {
    if (agreementPreview?.signatureUrl) URL.revokeObjectURL(agreementPreview.signatureUrl);
    if (agreementPreview?.pdfUrl) URL.revokeObjectURL(agreementPreview.pdfUrl);
    setAgreementPreview(null);
  };

  const handleResendPayment = async (paymentPlanId) => {
    setSendingPaymentId(paymentPlanId);
    setPaymentMessage('');
    setPaymentError('');
    try {
      await resendPaymentLink(paymentPlanId);
      setPaymentMessage(t('adminClientDetail.paymentLinkSent'));
    } catch (paymentErr) {
      setPaymentError(paymentErr.message);
    } finally {
      setSendingPaymentId(null);
    }
  };

  const confirmCancelPlan = async () => {
    const plan = cancelPlanTarget;
    if (!plan) return;
    setPlanActionId(plan.id);
    setPaymentError('');
    setPaymentMessage('');
    setCancelPlanTarget(null);
    try {
      await cancelPlan(plan.id);
      setPaymentMessage(t('adminClientDetail.planCanceled'));
      await onReload();
    } catch (cancelError) {
      setPaymentError(cancelError.message);
    } finally {
      setPlanActionId(null);
    }
  };

  const handlePaymentHistory = async (plan) => {
    setPlanActionId(plan.id);
    setPaymentError('');
    try {
      const history = await fetchPaymentHistory(plan.id);
      setPaymentHistory({ ...history, title: plan.services.map((service) => service.name).join(', ') || t('adminClientDetail.paymentHistory') });
    } catch (historyError) {
      setPaymentError(historyError.message);
    } finally {
      setPlanActionId(null);
    }
  };

  const handleArchiveAgreement = async (agreement, archived) => {
    setArchivingId(agreement.id);
    setAgreementError('');
    try {
      await archiveAgreement(agreement.id, archived);
      await onReload();
    } catch (archiveError) {
      setAgreementError(archiveError.message);
    } finally {
      setArchivingId(null);
    }
  };

  const handlePaymentReminder = async (plan) => {
    setPlanActionId(plan.id);
    setPaymentError('');
    setPaymentMessage('');
    try {
      await sendPaymentReminder(plan.id);
      setPaymentMessage(t('adminClientDetail.reminderSent'));
    } catch (reminderError) {
      setPaymentError(reminderError.message);
    } finally {
      setPlanActionId(null);
    }
  };

  const renderPlanCard = (plan) => {
    const agreement = plan.agreement;
    return (
      <div className="doc-tile plan-card" key={plan.id}>
        <span className={`status-badge ${PLAN_STATUS_BADGE[plan.status] || 'pending'}`}>{plan.status}</span>
        <p className="ws-body">
          {plan.billing_type === 'recurring' ? `${t('adminClientDetail.recurring')} (${plan.recurring_interval})` : t('adminClientDetail.oneTime')}
          {' — '}
          {t('adminClientDetail.contract')}: {agreement?.status || t('adminClientDetail.noContract')}
        </p>
        {plan.billing_type === 'recurring' && plan.recurring_amount_cents > 0 && (
          <p className="ws-meta">{t('adminClientDetail.recurringAmountLabel')}: {formatCents(plan.recurring_amount_cents)}</p>
        )}
        {plan.billing_type === 'recurring' && plan.first_payment_cents > 0 && (
          <p className="ws-meta">{t('adminClientDetail.firstPaymentLabel')}: {formatCents(plan.first_payment_cents)}</p>
        )}
        <ul className="plan-service-list">
          {plan.services.map((service) => (
            <li key={service.id}>{service.name} — {formatCents(service.price_cents)}</li>
          ))}
        </ul>
        {plan.billing_type === 'recurring' && (
          <p className="doc-hint">{t('adminClientDetail.serviceValueHint')}</p>
        )}
        {agreement && agreement.status === 'signed' && (
          <p className="doc-hint">
            {t('adminClientDetail.signedBy')} {agreement.signed_full_name} · {new Date(agreement.signed_at).toLocaleString(language === 'es' ? 'es-US' : 'en-US')}
          </p>
        )}
        {plan.status === 'awaiting_payment' && agreement?.status === 'signed' && (
          <button
            className="btn btn-outline"
            type="button"
            disabled={sendingPaymentId === plan.id}
            onClick={() => handleResendPayment(plan.id)}
          >
            {sendingPaymentId === plan.id ? t('adminClientDetail.sendingPaymentLink') : t('adminClientDetail.resendPaymentLink')}
          </button>
        )}
        <div className="cluster-2">
          {agreement && (
            <button
              className="btn-quiet"
              type="button"
              disabled={openingAgreementId === agreement.id}
              onClick={() => handleViewAgreement(agreement)}
            >
              {openingAgreementId === agreement.id ? t('adminClientDetail.openingDocument') : t('adminClientDetail.viewSignedContract')}
            </button>
          )}
          <button className="btn btn-outline" type="button" disabled={planActionId === plan.id} onClick={() => handlePaymentHistory(plan)}>
            {t('adminClientDetail.paymentHistory')}
          </button>
          {plan.billing_type === 'recurring' && ['active', 'past_due'].includes(plan.status) && (
            <button className="btn-quiet" type="button" disabled={planActionId === plan.id} onClick={() => handlePaymentReminder(plan)}>
              {t('adminClientDetail.sendReminder')}
            </button>
          )}
          {!['paid', 'canceled'].includes(plan.status) && (
            <button className="btn-quiet danger" type="button" disabled={planActionId === plan.id} onClick={() => setCancelPlanTarget(plan)}>
              {planActionId === plan.id ? t('adminClientDetail.cancelingPlan') : t('adminClientDetail.cancelPlan')}
            </button>
          )}
          {agreement?.status === 'signed' && plan.status === 'canceled' && (
            <button
              className="btn-quiet"
              type="button"
              disabled={archivingId === agreement.id}
              onClick={() => handleArchiveAgreement(agreement, !agreement.archived)}
            >
              {archivingId === agreement.id
                ? t('adminClientDetail.archiving')
                : (agreement.archived ? t('adminClientDetail.unarchive') : t('adminClientDetail.archive'))}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <section className="admin-block">
        <h2>{t('adminClientDetail.plansAndContractsTitle')}</h2>
        {activePlans.length === 0 ? (
          <p className="portal-sub">{t('adminClientDetail.noPlansAtAll')}</p>
        ) : (
          <div className="tile-list">
            {activePlans.map(renderPlanCard)}
          </div>
        )}

        {archivedPlans.length > 0 && (
          <>
            <button className="btn btn-outline list-toggle" type="button" onClick={() => setShowArchived((prev) => !prev)}>
              {showArchived ? t('adminClientDetail.hideArchived') : t('adminClientDetail.showArchived')}
            </button>
            {showArchived && (
              <div className="tile-list">
                {archivedPlans.map(renderPlanCard)}
              </div>
            )}
          </>
        )}

        {agreementError && <p className="form-error" role="alert">{agreementError}</p>}
        {paymentMessage && <p className="form-success" role="status">{paymentMessage}</p>}
        {paymentError && <p className="form-error" role="alert">{paymentError}</p>}
      </section>

      {agreementPreview && (
        <Modal title={agreementPreview.title} onClose={closeAgreementPreview} maxWidth={800}>
          {agreementPreview.pdfUrl ? (
            <iframe src={agreementPreview.pdfUrl} title={agreementPreview.title} style={{ width: '100%', height: '55vh', border: '1px solid var(--border)', borderRadius: 8 }} />
          ) : (
            <div className="doc-tile" style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7, maxHeight: '48vh', overflowY: 'auto' }}>{agreementPreview.body_text}</div>
          )}
          <div className="field-list">
            {agreementPreview.signed_full_name && <p><strong>{t('adminClientDetail.signedBy')}:</strong> {agreementPreview.signed_full_name}</p>}
            {agreementPreview.signed_at && <p><strong>{t('adminClientDetail.signedAt')}:</strong> {new Date(agreementPreview.signed_at).toLocaleString(language === 'es' ? 'es-US' : 'en-US')}</p>}
            {agreementPreview.signatureUrl && (
              <div>
                <strong className="ws-body">{t('adminClientDetail.signature')}</strong>
                <img src={agreementPreview.signatureUrl} alt={t('adminClientDetail.signature')} style={{ display: 'block', maxWidth: 420, width: '100%', maxHeight: 160, objectFit: 'contain', objectPosition: 'left center', marginTop: 8, padding: 8, borderRadius: 8, background: '#fff', border: '1px solid var(--border)' }} />
              </div>
            )}
          </div>
        </Modal>
      )}

      {cancelPlanTarget && (
        <ConfirmDialog
          title={t('adminClientDetail.cancelPlanTitle')}
          message={t('adminClientDetail.cancelPlanConfirm')}
          confirmLabel={t('adminClientDetail.cancelPlan')}
          danger
          busy={planActionId === cancelPlanTarget.id}
          onConfirm={confirmCancelPlan}
          onCancel={() => setCancelPlanTarget(null)}
        />
      )}

      {paymentHistory && (
        <Modal title={t('adminClientDetail.paymentHistory')} onClose={() => setPaymentHistory(null)} maxWidth={780}>
          <p className="portal-sub">{paymentHistory.title}</p>
          <p className="ws-body"><strong>{t('adminClientDetail.totalPaid')}:</strong> {formatCents(paymentHistory.amountPaidCents || 0)} / {formatCents(paymentHistory.totalAmountCents || 0)}</p>
          {paymentHistory.payments.length === 0 ? <p className="portal-sub">{t('adminClientDetail.noPayments')}</p> : (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t('adminClientDetail.paymentDate')}</th><th>{t('adminClientDetail.paymentStatus')}</th><th>{t('adminClientDetail.paymentAmount')}</th><th>{t('adminClientDetail.receipt')}</th></tr></thead><tbody>
              {paymentHistory.payments.map((payment) => <tr key={payment.id}><td>{new Date((payment.paidAt || payment.created) * 1000).toLocaleString(language === 'es' ? 'es-US' : 'en-US')}</td><td><span className={`status-badge ${payment.status}`}>{payment.status}</span></td><td>{formatCents(payment.amountPaid || payment.amountDue || 0)}</td><td>{payment.hostedInvoiceUrl ? <a href={payment.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">{t('adminClientDetail.viewReceipt')}</a> : '—'}</td></tr>)}
            </tbody></table></div>
          )}
        </Modal>
      )}
    </>
  );
}

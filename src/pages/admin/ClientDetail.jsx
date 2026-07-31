import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import Modal from '../../components/portal/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { archiveAgreement, assignPlan, cancelPlan, fetchAgreementPdf, fetchAgreementSignature, fetchCatalog, fetchClientCreditMonitoring, fetchClientDetail, fetchContractTemplates, fetchDocumentFile, fetchPaymentHistory, fetchStaffMe, resendPaymentLink, reviewDocument, sendPaymentReminder, staffLogout, uploadAgreementPdf } from '../../lib/adminApi.js';
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
  const { language, t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [contractTemplates, setContractTemplates] = useState([]);
  const [contractTemplateId, setContractTemplateId] = useState('');
  const [archivingId, setArchivingId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [lineItems, setLineItems] = useState([]);
  const [billingType, setBillingType] = useState('one_time');
  const [recurringInterval, setRecurringInterval] = useState('month');
  const [recurringAmountCents, setRecurringAmountCents] = useState(0);
  const [firstPaymentCents, setFirstPaymentCents] = useState(0);
  const [agreementTitle, setAgreementTitle] = useState(t('adminClientDetail.agreementTitleDefault'));
  const [agreementText, setAgreementText] = useState('');
  const [agreementSource, setAgreementSource] = useState('text');
  const [agreementPdf, setAgreementPdf] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewError, setReviewError] = useState('');
  const [viewingId, setViewingId] = useState(null);
  const [documentError, setDocumentError] = useState('');
  const [documentPreview, setDocumentPreview] = useState(null);
  const [agreementPreview, setAgreementPreview] = useState(null);
  const [agreementError, setAgreementError] = useState('');
  const [openingAgreementId, setOpeningAgreementId] = useState(null);
  const [sendingPaymentId, setSendingPaymentId] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [planActionId, setPlanActionId] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState(null);
  const [cancelPlanTarget, setCancelPlanTarget] = useState(null);

  const DOCUMENT_LABEL = {
    id_front: t('adminClientDetail.documentIdFront'),
    id_back: t('adminClientDetail.documentIdBack'),
    selfie_with_id: t('adminClientDetail.documentSelfie'),
    ssn_card: t('adminClientDetail.documentSsn'),
    proof_of_residency: t('adminClientDetail.documentProof'),
  };

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

  const load = async () => {
    try {
      await fetchStaffMe();
      const [detailData, catalogData, templatesData] = await Promise.all([fetchClientDetail(id), fetchCatalog(), fetchContractTemplates()]);
      setDetail(detailData);
      setCatalog(catalogData.catalog || []);
      setContractTemplates(templatesData.templates || []);
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
    setAgreementText(defaultAgreementText(lineItems, billingType, recurringInterval, firstPaymentCents, recurringAmountCents));
  };

  const submitPlan = async (event) => {
    event.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const uploadedPdf = agreementSource === 'pdf' ? await uploadAgreementPdf(id, agreementPdf) : null;
      await assignPlan({
        clientId: id,
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

  const handleViewDocument = async (doc) => {
    setViewingId(doc.id);
    setDocumentError('');
    try {
      const file = await fetchDocumentFile(doc.id);
      const url = URL.createObjectURL(file);
      setDocumentPreview({
        url,
        mimeType: file.type,
        title: DOCUMENT_LABEL[doc.document_type] || doc.original_filename || doc.document_type,
      });
    } catch (viewError) {
      setDocumentError(viewError.message);
    } finally {
      setViewingId(null);
    }
  };

  const closeDocumentPreview = () => {
    if (documentPreview?.url) URL.revokeObjectURL(documentPreview.url);
    setDocumentPreview(null);
  };

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
      await load();
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
      await load();
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
                  <button
                    className="btn btn-outline"
                    type="button"
                    disabled={viewingId === doc.id}
                    onClick={() => handleViewDocument(doc)}
                  >
                    {viewingId === doc.id ? t('adminClientDetail.openingDocument') : t('adminClientDetail.viewDocument')}
                  </button>
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
        {documentError && <p className="form-error" role="alert">{documentError}</p>}
        {reviewError && <p className="form-error" role="alert">{reviewError}</p>}

        <CreditMonitoringSection clientId={id} />

        <h2 style={{ fontSize: 16, marginTop: 24 }}>{t('adminClientDetail.signedContractsTitle')}</h2>
        {(detail.signedAgreements || []).filter((agreement) => !agreement.archived).length === 0 ? (
          <p className="portal-sub">{t('adminClientDetail.noSignedContracts')}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {detail.signedAgreements.filter((agreement) => !agreement.archived).map((agreement) => (
              <li key={agreement.id} className="doc-tile" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div>
                  <strong style={{ fontSize: 14 }}>{agreement.title}</strong>
                  <p className="doc-hint" style={{ margin: '4px 0 0' }}>
                    {t('adminClientDetail.signedBy')} {agreement.signed_full_name} · {new Date(agreement.signed_at).toLocaleString(language === 'es' ? 'es-US' : 'en-US')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-outline"
                    type="button"
                    disabled={openingAgreementId === agreement.id}
                    onClick={() => handleViewAgreement(agreement)}
                  >
                    {openingAgreementId === agreement.id ? t('adminClientDetail.openingDocument') : t('adminClientDetail.viewSignedContract')}
                  </button>
                  {agreement.plan_status === 'canceled' && (
                    <button
                      className="btn btn-outline"
                      type="button"
                      disabled={archivingId === agreement.id}
                      onClick={() => handleArchiveAgreement(agreement, true)}
                    >
                      {archivingId === agreement.id ? t('adminClientDetail.archiving') : t('adminClientDetail.archive')}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {(detail.signedAgreements || []).some((agreement) => agreement.archived) && (
          <>
            <button className="btn btn-outline" type="button" onClick={() => setShowArchived((prev) => !prev)} style={{ marginTop: 4 }}>
              {showArchived ? t('adminClientDetail.hideArchived') : t('adminClientDetail.showArchived')}
            </button>
            {showArchived && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
                {detail.signedAgreements.filter((agreement) => agreement.archived).map((agreement) => (
                  <li key={agreement.id} className="doc-tile" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8, opacity: 0.65 }}>
                    <div>
                      <strong style={{ fontSize: 14 }}>{agreement.title}</strong>
                      <p className="doc-hint" style={{ margin: '4px 0 0' }}>
                        {t('adminClientDetail.signedBy')} {agreement.signed_full_name} · {new Date(agreement.signed_at).toLocaleString(language === 'es' ? 'es-US' : 'en-US')}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-outline"
                        type="button"
                        disabled={openingAgreementId === agreement.id}
                        onClick={() => handleViewAgreement(agreement)}
                      >
                        {openingAgreementId === agreement.id ? t('adminClientDetail.openingDocument') : t('adminClientDetail.viewSignedContract')}
                      </button>
                      <button
                        className="btn btn-outline"
                        type="button"
                        disabled={archivingId === agreement.id}
                        onClick={() => handleArchiveAgreement(agreement, false)}
                      >
                        {archivingId === agreement.id ? t('adminClientDetail.archiving') : t('adminClientDetail.unarchive')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {agreementError && <p className="form-error" role="alert">{agreementError}</p>}

        <h2 style={{ fontSize: 16, marginTop: 24 }}>{t('adminClientDetail.existingPlansTitle')}</h2>
        {detail.plans.length === 0 ? (
          <p className="portal-sub">{t('adminClientDetail.noPlans')}</p>
        ) : (
          detail.plans.map((plan) => (
            <div className="doc-tile" key={plan.id} style={{ marginBottom: 12 }}>
              <span className="status-badge pending">{plan.status}</span>
              <p style={{ fontSize: 14 }}>{plan.billing_type === 'recurring' ? `${t('adminClientDetail.recurring')} (${plan.recurring_interval})` : t('adminClientDetail.oneTime')} — {t('adminClientDetail.contract')}: {plan.agreement?.status || t('adminClientDetail.noContract')}</p>
              {plan.billing_type === 'recurring' && plan.recurring_amount_cents > 0 && (
                <p style={{ fontSize: 13 }}>{t('adminClientDetail.recurringAmountLabel')}: {formatCents(plan.recurring_amount_cents)}</p>
              )}
              {plan.billing_type === 'recurring' && plan.first_payment_cents > 0 && (
                <p style={{ fontSize: 13 }}>{t('adminClientDetail.firstPaymentLabel')}: {formatCents(plan.first_payment_cents)}</p>
              )}
              <ul>
                {plan.services.map((service) => (
                  <li key={service.id} style={{ fontSize: 13 }}>{service.name} — {formatCents(service.price_cents)}</li>
                ))}
              </ul>
              {plan.billing_type === 'recurring' && (
                <p className="doc-hint" style={{ marginTop: 4 }}>{t('adminClientDetail.serviceValueHint')}</p>
              )}
              {plan.status === 'awaiting_payment' && plan.agreement?.status === 'signed' && (
                <button
                  className="btn btn-outline"
                  type="button"
                  disabled={sendingPaymentId === plan.id}
                  onClick={() => handleResendPayment(plan.id)}
                >
                  {sendingPaymentId === plan.id ? t('adminClientDetail.sendingPaymentLink') : t('adminClientDetail.resendPaymentLink')}
                </button>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                <button className="btn btn-outline" type="button" disabled={planActionId === plan.id} onClick={() => handlePaymentHistory(plan)}>
                  {t('adminClientDetail.paymentHistory')}
                </button>
                {plan.billing_type === 'recurring' && ['active', 'past_due'].includes(plan.status) && (
                  <button className="btn btn-outline" type="button" disabled={planActionId === plan.id} onClick={() => handlePaymentReminder(plan)}>
                    {t('adminClientDetail.sendReminder')}
                  </button>
                )}
                {!['paid', 'canceled'].includes(plan.status) && (
                  <button className="btn btn-outline" type="button" disabled={planActionId === plan.id} onClick={() => setCancelPlanTarget(plan)} style={{ borderColor: '#b94a48', color: '#d97975' }}>
                    {planActionId === plan.id ? t('adminClientDetail.cancelingPlan') : t('adminClientDetail.cancelPlan')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {paymentMessage && <p className="form-success" role="status">{paymentMessage}</p>}
        {paymentError && <p className="form-error" role="alert">{paymentError}</p>}
      </div>

      {documentPreview && (
        <Modal title={documentPreview.title} onClose={closeDocumentPreview} maxWidth={documentPreview.mimeType === 'application/pdf' ? 850 : 720}>
          {documentPreview.mimeType?.startsWith('image/') ? (
            <img
              src={documentPreview.url}
              alt={documentPreview.title}
              style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '65vh', objectFit: 'contain', borderRadius: 8, background: '#fff' }}
            />
          ) : (
            <iframe
              src={documentPreview.url}
              title={documentPreview.title}
              style={{ display: 'block', width: '100%', height: '68vh', border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }}
            />
          )}
        </Modal>
      )}

      {agreementPreview && (
        <Modal title={agreementPreview.title} onClose={closeAgreementPreview} maxWidth={800}>
          {agreementPreview.pdfUrl ? <iframe src={agreementPreview.pdfUrl} title={agreementPreview.title} style={{ width: '100%', height: '55vh', border: '1px solid var(--border)', borderRadius: 8 }} /> : <div className="doc-tile" style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7, maxHeight: '48vh', overflowY: 'auto' }}>{agreementPreview.body_text}</div>}
          <div style={{ marginTop: 20 }}>
            <p style={{ margin: '0 0 6px', fontSize: 14 }}><strong>{t('adminClientDetail.signedBy')}:</strong> {agreementPreview.signed_full_name}</p>
            <p style={{ margin: '0 0 12px', fontSize: 14 }}><strong>{t('adminClientDetail.signedAt')}:</strong> {new Date(agreementPreview.signed_at).toLocaleString(language === 'es' ? 'es-US' : 'en-US')}</p>
            {agreementPreview.signatureUrl && (
              <div>
                <strong style={{ fontSize: 14 }}>{t('adminClientDetail.signature')}</strong>
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
          <p style={{ fontSize: 14 }}><strong>{t('adminClientDetail.totalPaid')}:</strong> {formatCents(paymentHistory.amountPaidCents || 0)} / {formatCents(paymentHistory.totalAmountCents || 0)}</p>
          {paymentHistory.payments.length === 0 ? <p className="portal-sub">{t('adminClientDetail.noPayments')}</p> : (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t('adminClientDetail.paymentDate')}</th><th>{t('adminClientDetail.paymentStatus')}</th><th>{t('adminClientDetail.paymentAmount')}</th><th>{t('adminClientDetail.receipt')}</th></tr></thead><tbody>
              {paymentHistory.payments.map((payment) => <tr key={payment.id}><td>{new Date((payment.paidAt || payment.created) * 1000).toLocaleString(language === 'es' ? 'es-US' : 'en-US')}</td><td><span className={`status-badge ${payment.status}`}>{payment.status}</span></td><td>{formatCents(payment.amountPaid || payment.amountDue || 0)}</td><td>{payment.hostedInvoiceUrl ? <a href={payment.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">{t('adminClientDetail.viewReceipt')}</a> : '—'}</td></tr>)}
            </tbody></table></div>
          )}
        </Modal>
      )}

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
                {billingType === 'recurring' && <p className="doc-hint" style={{ margin: '4px 0 0' }}>{t('adminClientDetail.serviceValueHint')}</p>}
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
        )}
      </div>
    </AdminLayout>
  );
}

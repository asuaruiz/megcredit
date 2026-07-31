import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import Modal from '../../components/portal/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { archiveAgreement, assignPlan, cancelPlan, confirmBureauReport, deleteBureauReport, fetchAgreementPdf, fetchAgreementSignature, fetchBureauLink, fetchBureauReports, fetchCatalog, fetchClientCreditMonitoring, fetchClientDetail, fetchContractTemplates, fetchDocumentFile, fetchPaymentHistory, fetchStaffMe, lookupBureauCustomer, parseBureauReport, resendPaymentLink, reviewDocument, saveBureauLink, sendPaymentReminder, staffLogout, syncBureauReport, unlinkBureauAccount, uploadAgreementPdf, uploadBureauReportPdf } from '../../lib/adminApi.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

const STATUS_BADGE = { invited: 'pending', active: 'approved', suspended: 'rejected' };

const BUREAUS_ADMIN = [
  { label: 'Equifax', key: 'equifax' },
  { label: 'Experian', key: 'experian' },
  { label: 'TransUnion', key: 'transunion' },
];

const CASE_STATUS_ROWS_ADMIN = [
  { i18nKey: 'rowUnspecified', category: 'unspecified' },
  { i18nKey: 'rowPositive', category: 'positive' },
  { i18nKey: 'rowDeleted', category: 'deleted' },
  { i18nKey: 'rowRepaired', category: 'repaired' },
  { i18nKey: 'rowUpdated', category: 'updated' },
  { i18nKey: 'rowInDispute', category: 'in_dispute' },
  { i18nKey: 'rowVerified', category: 'verified' },
  { i18nKey: 'rowNegative', category: 'negative' },
];

function emptyReviewDraft(report) {
  const scores = {};
  BUREAUS_ADMIN.forEach(({ key }) => {
    const existing = report.scores.find((row) => row.bureau === key)?.score;
    scores[key] = existing ?? '';
  });
  const caseStatus = {};
  CASE_STATUS_ROWS_ADMIN.forEach(({ category }) => {
    caseStatus[category] = {};
    BUREAUS_ADMIN.forEach(({ key }) => {
      const existing = report.caseStatus.find((row) => row.bureau === key && row.status_category === category)?.count;
      caseStatus[category][key] = existing ?? 0;
    });
  });
  return { scores, caseStatus };
}

function BureauReportsSection({ clientId, clientEmail }) {
  const { t } = useLanguage();
  const [reports, setReports] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [file, setFile] = useState(null);
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [parsingId, setParsingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [reviewingReport, setReviewingReport] = useState(null);
  const [reviewDraft, setReviewDraft] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [link, setLink] = useState(null);
  const [linkError, setLinkError] = useState('');
  const [customerTokenInput, setCustomerTokenInput] = useState('');
  const [pidInput, setPidInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const loadReports = async () => {
    try {
      const result = await fetchBureauReports(clientId);
      setReports(result.reports || []);
    } catch (fetchError) {
      setLoadError(fetchError.message);
    }
  };

  const loadLink = async () => {
    try {
      const result = await fetchBureauLink(clientId);
      setLink(result.link || null);
    } catch (fetchError) {
      setLinkError(fetchError.message);
    }
  };

  useEffect(() => {
    loadReports();
    loadLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleLink = async (event) => {
    event.preventDefault();
    if (!customerTokenInput.trim()) return;
    setLinking(true);
    setLinkError('');
    try {
      await saveBureauLink(clientId, customerTokenInput.trim(), pidInput.trim());
      setCustomerTokenInput('');
      setPidInput('');
      await loadLink();
    } catch (submissionError) {
      setLinkError(submissionError.message);
    } finally {
      setLinking(false);
    }
  };

  const handleLookup = async () => {
    if (!clientEmail) return;
    setLookingUp(true);
    setLinkError('');
    try {
      const result = await lookupBureauCustomer(clientEmail);
      setCustomerTokenInput(result.customerToken || '');
      setPidInput(result.pid || '');
    } catch (lookupErr) {
      setLinkError(lookupErr.message);
    } finally {
      setLookingUp(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    setLinkError('');
    try {
      await unlinkBureauAccount(clientId);
      await loadLink();
    } catch (unlinkErr) {
      setLinkError(unlinkErr.message);
    } finally {
      setUnlinking(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setLinkError('');
    try {
      await syncBureauReport(clientId);
      await Promise.all([loadLink(), loadReports()]);
    } catch (syncErr) {
      setLinkError(syncErr.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      await uploadBureauReportPdf(clientId, file, asOfDate);
      setFile(null);
      await loadReports();
    } catch (submissionError) {
      setUploadError(submissionError.message);
    } finally {
      setUploading(false);
    }
  };

  const handleParse = async (reportId) => {
    setParsingId(reportId);
    setActionError('');
    try {
      await parseBureauReport(reportId);
      await loadReports();
    } catch (parseError) {
      setActionError(parseError.message);
    } finally {
      setParsingId(null);
    }
  };

  const openReview = (report) => {
    setReviewDraft(emptyReviewDraft(report));
    setReviewingReport(report);
  };

  const confirmDelete = async () => {
    const report = deleteTarget;
    if (!report) return;
    setDeletingId(report.id);
    setActionError('');
    setDeleteTarget(null);
    try {
      await deleteBureauReport(report.id);
      await loadReports();
    } catch (deleteError) {
      setActionError(deleteError.message);
    } finally {
      setDeletingId(null);
    }
  };

  const submitConfirm = async (event) => {
    event.preventDefault();
    setConfirming(true);
    setActionError('');
    try {
      const scoresPayload = BUREAUS_ADMIN.filter(({ key }) => reviewDraft.scores[key] !== '').map(({ key }) => ({
        bureau: key,
        score: Number(reviewDraft.scores[key]),
      }));
      const caseStatusPayload = [];
      CASE_STATUS_ROWS_ADMIN.forEach(({ category }) => {
        BUREAUS_ADMIN.forEach(({ key }) => {
          caseStatusPayload.push({ bureau: key, statusCategory: category, count: Number(reviewDraft.caseStatus[category][key]) || 0 });
        });
      });
      await confirmBureauReport(reviewingReport.id, scoresPayload, caseStatusPayload);
      setReviewingReport(null);
      await loadReports();
    } catch (confirmError) {
      setActionError(confirmError.message);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <section className="admin-block">
      <h2>{t('adminClientDetail.bureauReportsTitle')}</h2>

      <div className="doc-tile">
        <h3>{t('adminClientDetail.bureauLinkTitle')}</h3>
        {link ? (
          <div className="cluster-3">
            <span className={`status-badge ${link.sync_status}`}>{t(`adminClientDetail.bureauSyncStatus_${link.sync_status}`)}</span>
            <span className="ws-meta">
              {t('adminClientDetail.bureauLastSynced')}: {link.last_synced_at || t('adminClientDetail.bureauNeverSynced')}
            </span>
            <button className="btn btn-outline" type="button" disabled={syncing} onClick={handleSync}>
              {syncing ? t('adminClientDetail.bureauSyncing') : t('adminClientDetail.bureauSyncButton')}
            </button>
            <button
              className="btn-quiet danger"
              type="button"
              disabled={unlinking}
              onClick={handleUnlink}
            >
              {unlinking ? t('adminClientDetail.bureauUnlinking') : t('adminClientDetail.bureauUnlinkButton')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleLink} className="admin-form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="bureauCustomerToken">{t('adminClientDetail.bureauCustomerTokenLabel')}</label>
              <input
                id="bureauCustomerToken"
                type="text"
                value={customerTokenInput}
                onChange={(event) => setCustomerTokenInput(event.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: '0 0 140px' }}>
              <label htmlFor="bureauPid">{t('adminClientDetail.bureauPidLabel')}</label>
              <input id="bureauPid" type="text" value={pidInput} onChange={(event) => setPidInput(event.target.value)} />
            </div>
            <button className="btn-quiet" type="button" disabled={!clientEmail || lookingUp} onClick={handleLookup}>
              {lookingUp ? t('adminClientDetail.bureauLookingUp') : t('adminClientDetail.bureauLookupButton')}
            </button>
            <button className="btn btn-primary" type="submit" disabled={!customerTokenInput.trim() || linking}>
              {linking ? t('adminClientDetail.bureauLinking') : t('adminClientDetail.bureauLinkButton')}
            </button>
          </form>
        )}
        {linkError && <p className="form-error" role="alert">{linkError}</p>}
      </div>

      <form onSubmit={handleUpload} className="admin-form-row" style={{ alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: '0 0 170px' }}>
          <label htmlFor="bureauAsOfDate">{t('adminClientDetail.bureauAsOfDateLabel')}</label>
          <input id="bureauAsOfDate" type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="bureauPdf">{t('adminClientDetail.bureauUploadLabel')}</label>
          <input id="bureauPdf" type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={!file || uploading}>
          {uploading ? t('adminClientDetail.bureauUploading') : t('adminClientDetail.bureauUploadButton')}
        </button>
      </form>
      {uploadError && <p className="form-error" role="alert">{uploadError}</p>}
      {loadError && <p className="form-error" role="alert">{loadError}</p>}

      {reports.length === 0 ? (
        <p className="portal-sub">{t('adminClientDetail.bureauNoReports')}</p>
      ) : (
        <ul className="tile-list">
          {reports.map((report) => (
            <li key={report.id} className="doc-tile admin-row-tile tile-row">
              <span className="ws-body">
                {report.source === 'api' ? t('adminClientDetail.bureauSourceApi') : t('adminClientDetail.bureauSourcePdf')} · {report.as_of_date}
              </span>
              <div className="cluster-2">
                <span className={`status-badge ${report.parse_status}`}>{report.parse_status}</span>
                {report.parse_status === 'pending' && (
                  <button className="btn btn-outline" type="button" disabled={parsingId === report.id} onClick={() => handleParse(report.id)}>
                    {parsingId === report.id ? t('adminClientDetail.bureauParsing') : t('adminClientDetail.bureauParseButton')}
                  </button>
                )}
                {report.parse_status !== 'pending' && (
                  <button className="btn btn-outline" type="button" onClick={() => openReview(report)}>
                    {report.parse_status === 'confirmed' ? t('adminClientDetail.bureauEditButton') : t('adminClientDetail.bureauReviewButton')}
                  </button>
                )}
                <button
                  className="btn-quiet danger"
                  type="button"
                  disabled={deletingId === report.id}
                  onClick={() => setDeleteTarget(report)}
                >
                  {deletingId === report.id ? t('adminClientDetail.bureauDeleting') : t('adminClientDetail.bureauDeleteButton')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {actionError && <p className="form-error" role="alert">{actionError}</p>}

      {deleteTarget && (
        <ConfirmDialog
          title={t('adminClientDetail.bureauDeleteTitle')}
          message={t('adminClientDetail.bureauDeleteConfirm')}
          confirmLabel={t('adminClientDetail.bureauDeleteButton')}
          danger
          busy={deletingId === deleteTarget.id}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {reviewingReport && reviewDraft && (
        <Modal title={t('adminClientDetail.bureauReviewTitle')} onClose={() => setReviewingReport(null)} maxWidth={720}>
          <form onSubmit={submitConfirm}>
            <p className="portal-sub">{t('adminClientDetail.bureauReviewHint')}</p>
            {reviewingReport.source === 'api' && reviewingReport.raw_payload && (
              <details>
                <summary className="ws-meta" style={{ cursor: 'pointer' }}>{t('adminClientDetail.bureauRawDataLabel')}</summary>
                <pre className="raw-payload">
                  {JSON.stringify(reviewingReport.raw_payload, null, 2)}
                </pre>
              </details>
            )}
            <div className="admin-form-row">
              {BUREAUS_ADMIN.map(({ key, label }) => (
                <div className="form-group" key={key}>
                  <label htmlFor={`score-${key}`}>{label} {t('adminClientDetail.bureauScoreLabel')}</label>
                  <input
                    id={`score-${key}`}
                    type="number"
                    min="300"
                    max="850"
                    value={reviewDraft.scores[key]}
                    onChange={(event) => setReviewDraft((prev) => ({ ...prev, scores: { ...prev.scores, [key]: event.target.value } }))}
                  />
                </div>
              ))}
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th />
                    {BUREAUS_ADMIN.map(({ key, label }) => <th key={key}>{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {CASE_STATUS_ROWS_ADMIN.map(({ category, i18nKey }) => (
                    <tr key={category}>
                      <td>{t(`portalHome.${i18nKey}`)}</td>
                      {BUREAUS_ADMIN.map(({ key }) => (
                        <td key={key}>
                          <input
                            type="number"
                            min="0"
                            value={reviewDraft.caseStatus[category][key]}
                            onChange={(event) => setReviewDraft((prev) => ({
                              ...prev,
                              caseStatus: {
                                ...prev.caseStatus,
                                [category]: { ...prev.caseStatus[category], [key]: event.target.value },
                              },
                            }))}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-primary submit-btn" type="submit" disabled={confirming}>
              {confirming ? t('adminClientDetail.bureauConfirming') : t('adminClientDetail.bureauConfirmButton')}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}

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
    <section className="admin-block">
      <h2>{t('adminClientDetail.creditMonitoringTitle')}</h2>
      {state !== 'loaded' && (
        <button className="btn btn-outline" type="button" onClick={reveal} disabled={state === 'loading'}>
          {state === 'loading' ? t('adminClientDetail.loadingCredentials') : t('adminClientDetail.viewCredentials')}
        </button>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {state === 'loaded' && data && (
        <div className="doc-tile field-grid">
          <p className="ws-body"><strong>{t('adminClientDetail.providerLabel')}:</strong> {PROVIDER_LABEL[data.provider] || data.provider}</p>
          <p className="ws-body"><strong>{t('adminClientDetail.usernameLabel')}:</strong> {data.username}</p>
          <p className="ws-body"><strong>{t('adminClientDetail.passwordLabel')}:</strong> {data.password}</p>
          {data.phone && <p className="ws-body"><strong>{t('adminClientDetail.phoneLabel')}:</strong> {data.phone}</p>}
          {data.securityWord && <p className="ws-body"><strong>{t('adminClientDetail.securityWordLabel')}:</strong> {data.securityWord}</p>}
        </div>
      )}
    </section>
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
      <div className="portal-card wide">
        <div className="cluster-3">
          <span className={`status-badge ${STATUS_BADGE[detail.account.status] || 'missing'}`}>{detail.account.status}</span>
          <p className="portal-sub">{detail.account.email}</p>
        </div>

        <section className="admin-block">
          <h2>{t('adminClientDetail.documentsTitle')}</h2>
          {detail.documents.length === 0 ? (
            <p className="portal-sub">{t('adminClientDetail.noDocuments')}</p>
          ) : (
            <ul className="tile-list">
              {detail.documents.map((doc) => (
                <li key={doc.id} className="tile-row">
                  <span>{DOCUMENT_LABEL[doc.document_type] || doc.document_type}</span>
                  <div className="cluster-2">
                    <button
                      className="btn-quiet"
                      type="button"
                      disabled={viewingId === doc.id}
                      onClick={() => handleViewDocument(doc)}
                    >
                      {viewingId === doc.id ? t('adminClientDetail.openingDocument') : t('adminClientDetail.viewDocument')}
                    </button>
                    <span className={`status-badge ${doc.status}`}>{doc.status}</span>
                    {doc.status !== 'approved' && (
                      <button
                        className="btn btn-primary"
                        type="button"
                        disabled={reviewingId === doc.id}
                        onClick={() => handleReview(doc.id, 'approved')}
                      >
                        {t('adminClientDetail.approve')}
                      </button>
                    )}
                    {doc.status !== 'rejected' && (
                      <button
                        className="btn-quiet danger"
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
        </section>

        <CreditMonitoringSection clientId={id} />
        <BureauReportsSection clientId={id} clientEmail={detail.account.email} />

        <section className="admin-block">
          <h2>{t('adminClientDetail.signedContractsTitle')}</h2>
          {(detail.signedAgreements || []).filter((agreement) => !agreement.archived).length === 0 ? (
            <p className="portal-sub">{t('adminClientDetail.noSignedContracts')}</p>
          ) : (
            <ul className="tile-list">
              {detail.signedAgreements.filter((agreement) => !agreement.archived).map((agreement) => (
                <li key={agreement.id} className="doc-tile admin-row-tile tile-row">
                  <div>
                    <strong>{agreement.title}</strong>
                    <p className="doc-hint">
                      {t('adminClientDetail.signedBy')} {agreement.signed_full_name} · {new Date(agreement.signed_at).toLocaleString(language === 'es' ? 'es-US' : 'en-US')}
                    </p>
                  </div>
                  <div className="cluster-2">
                    <button
                      className="btn-quiet"
                      type="button"
                      disabled={openingAgreementId === agreement.id}
                      onClick={() => handleViewAgreement(agreement)}
                    >
                      {openingAgreementId === agreement.id ? t('adminClientDetail.openingDocument') : t('adminClientDetail.viewSignedContract')}
                    </button>
                    {agreement.plan_status === 'canceled' && (
                      <button
                        className="btn-quiet"
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
              <button className="btn btn-outline list-toggle" type="button" onClick={() => setShowArchived((prev) => !prev)}>
                {showArchived ? t('adminClientDetail.hideArchived') : t('adminClientDetail.showArchived')}
              </button>
              {showArchived && (
                <ul className="tile-list">
                  {detail.signedAgreements.filter((agreement) => agreement.archived).map((agreement) => (
                    <li key={agreement.id} className="doc-tile admin-row-tile tile-row archived">
                      <div>
                        <strong>{agreement.title}</strong>
                        <p className="doc-hint">
                          {t('adminClientDetail.signedBy')} {agreement.signed_full_name} · {new Date(agreement.signed_at).toLocaleString(language === 'es' ? 'es-US' : 'en-US')}
                        </p>
                      </div>
                      <div className="cluster-2">
                        <button
                          className="btn-quiet"
                          type="button"
                          disabled={openingAgreementId === agreement.id}
                          onClick={() => handleViewAgreement(agreement)}
                        >
                          {openingAgreementId === agreement.id ? t('adminClientDetail.openingDocument') : t('adminClientDetail.viewSignedContract')}
                        </button>
                        <button
                          className="btn-quiet"
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
        </section>

        <section className="admin-block">
          <h2>{t('adminClientDetail.existingPlansTitle')}</h2>
          {detail.plans.length === 0 ? (
            <p className="portal-sub">{t('adminClientDetail.noPlans')}</p>
          ) : (
            <div className="tile-list">
              {detail.plans.map((plan) => (
                <div className="doc-tile plan-card" key={plan.id}>
                  <span className="status-badge pending">{plan.status}</span>
                  <p className="ws-body">{plan.billing_type === 'recurring' ? `${t('adminClientDetail.recurring')} (${plan.recurring_interval})` : t('adminClientDetail.oneTime')} — {t('adminClientDetail.contract')}: {plan.agreement?.status || t('adminClientDetail.noContract')}</p>
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
                  <div className="cluster-2">
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
                  </div>
                </div>
              ))}
            </div>
          )}
          {paymentMessage && <p className="form-success" role="status">{paymentMessage}</p>}
          {paymentError && <p className="form-error" role="alert">{paymentError}</p>}
        </section>
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
          <div className="field-list">
            <p><strong>{t('adminClientDetail.signedBy')}:</strong> {agreementPreview.signed_full_name}</p>
            <p><strong>{t('adminClientDetail.signedAt')}:</strong> {new Date(agreementPreview.signed_at).toLocaleString(language === 'es' ? 'es-US' : 'en-US')}</p>
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

      <div className="portal-card wide">
        <h2>{t('adminClientDetail.buildPlanTitle')}</h2>
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
        )}
      </div>
    </AdminLayout>
  );
}

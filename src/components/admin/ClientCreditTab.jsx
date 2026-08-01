import { useEffect, useRef, useState } from 'react';
import Modal from '../portal/Modal.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';
import {
  confirmBureauReport,
  deleteBureauReport,
  fetchBureauLink,
  fetchBureauReports,
  fetchClientCreditMonitoring,
  lookupBureauCustomer,
  parseBureauReport,
  saveBureauLink,
  syncBureauReport,
  unlinkBureauAccount,
  uploadBureauReportPdf,
} from '../../lib/adminApi.js';

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

const REVEAL_MS = 60000;

function CredentialField({ label, value, t, masked }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const toggleReveal = () => {
    if (revealed) {
      setRevealed(false);
      clearTimeout(timerRef.current);
      return;
    }
    setRevealed(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRevealed(false), REVEAL_MS);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — silently ignore, the value is still visible via "show"
    }
  };

  if (!masked) {
    return <p className="ws-body"><strong>{label}:</strong> {value}</p>;
  }

  return (
    <p className="ws-body credential-row">
      <strong>{label}:</strong>
      <span className="credential-value">{revealed ? value : '••••••••'}</span>
      <button className="btn-quiet" type="button" onClick={toggleReveal}>
        {revealed ? t('adminClientDetail.hideButton') : t('adminClientDetail.showButton')}
      </button>
      <button className="btn-quiet" type="button" onClick={copy}>
        {copied ? t('adminClientDetail.copiedLabel') : t('adminClientDetail.copyButton')}
      </button>
    </p>
  );
}

function CreditMonitoringBlock({ clientId, t }) {
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
    <div>
      <h3 className="block-subhead">{t('adminClientDetail.creditMonitoringTitle')}</h3>
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
          <CredentialField label={t('adminClientDetail.passwordLabel')} value={data.password} t={t} masked />
          {data.phone && <p className="ws-body"><strong>{t('adminClientDetail.phoneLabel')}:</strong> {data.phone}</p>}
          {data.securityWord && <CredentialField label={t('adminClientDetail.securityWordLabel')} value={data.securityWord} t={t} masked />}
        </div>
      )}
    </div>
  );
}

export default function ClientCreditTab({ clientId, clientEmail, t }) {
  const [reports, setReports] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [file, setFile] = useState(null);
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [parsingId, setParsingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [reviewingReport, setReviewingReport] = useState(null);
  const [reviewDraft, setReviewDraft] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [link, setLink] = useState(null);
  const [linkError, setLinkError] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
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
      setShowLinkForm(false);
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
      setShowUploadForm(false);
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
    <>
      <section className="admin-block">
        <CreditMonitoringBlock clientId={clientId} t={t} />

        <div>
          <h3 className="block-subhead">{t('adminClientDetail.bureauLinkTitle')}</h3>
          {link ? (
            <div className="cluster-3">
              <span className={`status-badge ${link.sync_status}`}>{t(`adminClientDetail.bureauSyncStatus_${link.sync_status}`)}</span>
              <span className="ws-meta">
                {t('adminClientDetail.bureauLastSynced')}: {link.last_synced_at || t('adminClientDetail.bureauNeverSynced')}
              </span>
              <button className="btn btn-outline" type="button" disabled={syncing} onClick={handleSync}>
                {syncing ? t('adminClientDetail.bureauSyncing') : t('adminClientDetail.bureauSyncButton')}
              </button>
              <button className="btn-quiet danger" type="button" disabled={unlinking} onClick={handleUnlink}>
                {unlinking ? t('adminClientDetail.bureauUnlinking') : t('adminClientDetail.bureauUnlinkButton')}
              </button>
            </div>
          ) : (
            <>
              {!showLinkForm ? (
                <button className="btn btn-outline" type="button" onClick={() => setShowLinkForm(true)}>
                  {t('adminClientDetail.bureauLinkToggle')}
                </button>
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
                  <button className="btn-quiet" type="button" onClick={() => setShowLinkForm(false)}>
                    {t('adminClientDetail.bureauCloseForm')}
                  </button>
                </form>
              )}
            </>
          )}
          {linkError && <p className="form-error" role="alert">{linkError}</p>}
        </div>

        <div>
          <h3 className="block-subhead">{t('adminClientDetail.bureauReportsTitle')}</h3>

          {!showUploadForm ? (
            <button className="btn btn-outline" type="button" onClick={() => setShowUploadForm(true)}>
              {t('adminClientDetail.bureauUploadToggle')}
            </button>
          ) : (
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
              <button className="btn-quiet" type="button" onClick={() => setShowUploadForm(false)}>
                {t('adminClientDetail.bureauCloseForm')}
              </button>
            </form>
          )}
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
        </div>
      </section>

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
    </>
  );
}

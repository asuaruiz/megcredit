import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/portal/PortalLayout.jsx';
import PortalSidebarLayout from '../../components/portal/PortalSidebarLayout.jsx';
import Modal from '../../components/portal/Modal.jsx';
import SignaturePad from '../../components/portal/SignaturePad.jsx';
import ServicesPanel from '../../components/portal/ServicesPanel.jsx';
import { fetchAgreementPdf, fetchBureauSummary, fetchMe, fetchOnboardingStatus, logout, saveCreditMonitoring, signAgreement, uploadDocument } from '../../lib/portalApi.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

const BUREAUS = [
  { label: 'Equifax', key: 'equifax' },
  { label: 'Experian', key: 'experian' },
  { label: 'TransUnion', key: 'transunion' },
];

const CASE_STATUS_ROWS = [
  { i18nKey: 'rowUnspecified', category: 'unspecified' },
  { i18nKey: 'rowPositive', category: 'positive' },
  { i18nKey: 'rowDeleted', category: 'deleted' },
  { i18nKey: 'rowRepaired', category: 'repaired' },
  { i18nKey: 'rowUpdated', category: 'updated' },
  { i18nKey: 'rowInDispute', category: 'in_dispute' },
  { i18nKey: 'rowVerified', category: 'verified' },
  { i18nKey: 'rowNegative', category: 'negative' },
];

function useBureauSummary() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    fetchBureauSummary()
      .then((result) => { if (active) setData(result); })
      .catch(() => { if (active) setData({ report: null, scores: [], caseStatus: [] }); });
    return () => { active = false; };
  }, []);

  return data;
}

const TAB_BY_PATH = {
  '/portal/dashboard': 'home',
  '/portal/disputas': 'disputes',
  '/portal/mensajes': 'messages',
  '/portal/finanzas': 'finances',
  '/portal/facturas': 'invoices',
  '/portal/credito': 'credit',
  '/portal/recursos': 'resources',
  '/portal/configuracion': 'settings',
};

function ComingSoonCard({ title }) {
  const { t } = useLanguage();
  return (
    <div className="portal-card wide">
      <h2>{title}</h2>
      <p className="portal-sub">{t('portalHome.comingSoon')}</p>
    </div>
  );
}

function CaseStatusTable({ bureauData }) {
  const { t } = useLanguage();
  const countFor = (bureauKey, category) =>
    bureauData?.caseStatus.find((row) => row.bureau === bureauKey && row.status_category === category)?.count;

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th />
            {BUREAUS.map(({ label, key }) => <th key={key}>{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {CASE_STATUS_ROWS.map(({ i18nKey, category }) => (
            <tr key={category}>
              <td>{t(`portalHome.${i18nKey}`)}</td>
              {BUREAUS.map(({ key }) => <td key={key}>{countFor(key, category) ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HomeTab({ account }) {
  const { t } = useLanguage();
  const bureauData = useBureauSummary();
  const hasData = Boolean(bureauData?.report);
  const scoreFor = (bureauKey) => bureauData?.scores.find((row) => row.bureau === bureauKey)?.score;

  return (
    <div className="workspace-split">
      <div className="col-main">
        <div className="portal-card wide surface-raised is-metric">
          <h2>{t('portalHome.scoresTitle')}</h2>
          <div className="admin-stats">
            {BUREAUS.map(({ label, key }) => (
              <div className="admin-stat-tile" key={key}>
                <div className="stat-value">{scoreFor(key) ?? '—'}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
          <p className="portal-sub">
            {hasData ? `${t('portalHome.asOf')} ${bureauData.report.asOfDate}` : t('portalHome.scoresEmpty')}
          </p>
        </div>

        <div className="portal-card wide">
          <h2>{t('portalHome.caseStatusTitle')}</h2>
          <CaseStatusTable bureauData={bureauData} />
          {!hasData && <p className="portal-sub">{t('portalHome.caseStatusEmpty')}</p>}
        </div>
      </div>

      <div className="col-aside">
        <div className="portal-card wide">
          <h2>{t('portalHome.clientCardTitle')}</h2>
          <div className="field-list">
            <p>{account.full_name}</p>
            <p>{account.email}</p>
            {account.phone && <p>{account.phone}</p>}
            <p>{t('portalHome.statusLabel')}: {account.status}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DisputesTab() {
  const { t } = useLanguage();
  const bureauData = useBureauSummary();
  const hasData = Boolean(bureauData?.report);

  return (
    <div className="portal-card wide">
      <h2>{t('portalSidebar.disputes')}</h2>
      <CaseStatusTable bureauData={bureauData} />
      {!hasData && <p className="portal-sub">{t('portalHome.caseStatusEmpty')}</p>}
    </div>
  );
}

function CreditInfoTab({ onUpdateCredentials }) {
  const { t } = useLanguage();
  return (
    <div className="portal-card wide">
      <h2>{t('portalSidebar.creditInfo')}</h2>
      <p className="portal-sub">{t('portalDashboard.creditMonitoringText')}</p>
      <button className="btn btn-outline" type="button" onClick={onUpdateCredentials}>
        {t('portalHome.updateCredentials')}
      </button>
    </div>
  );
}

const PHONE_PATTERN = /^\+?[0-9](?:[0-9\s().-]{5,18})[0-9]$/;

function AgreementModal({ agreement, onClose, onDone }) {
  const { t } = useLanguage();
  const signatureRef = useRef(null);
  const [fullName, setFullName] = useState('');
  const [agree, setAgree] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    if (!agreement.has_pdf) return undefined;
    let active = true;
    let objectUrl;
    fetchAgreementPdf(agreement.id).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      if (active) setPdfUrl(objectUrl);
    }).catch((pdfError) => { if (active) setError(pdfError.message); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [agreement.has_pdf, agreement.id]);

  const submit = async (event) => {
    event.preventDefault();
    if (signatureRef.current.isEmpty()) {
      setError(t('portalDashboard.agreementSignatureRequired'));
      return;
    }
    setStatus('sending');
    setError('');
    try {
      await signAgreement(agreement.id, fullName, signatureRef.current.getDataUrl());
      onDone();
    } catch (submissionError) {
      setError(submissionError.message);
      setStatus('error');
    }
  };

  return (
    <Modal title={agreement.title} onClose={onClose}>
      <form onSubmit={submit}>
        {agreement.has_pdf ? (pdfUrl ? <iframe src={pdfUrl} title={agreement.title} style={{ width: '100%', height: 360, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }} /> : <p className="portal-sub">{t('general.loading')}</p>) : <div className="doc-tile" style={{ maxHeight: 220, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: 13, marginBottom: 16 }}>{agreement.body_text}</div>}
        <div className="form-group">
          <label htmlFor="agreementFullName">{t('portalDashboard.agreementNameLabel')}</label>
          <input id="agreementFullName" value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength="2" />
        </div>
        <div className="form-group">
          <label className="group-label">{t('portalDashboard.agreementSignLabel')}</label>
          <SignaturePad ref={signatureRef} />
        </div>
        <label className="checkbox-item consent-checkbox">
          <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} required />
          <span>{t('portalDashboard.agreementConsent')}</span>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary submit-btn" type="submit" disabled={status === 'sending' || !agree}>
          {status === 'sending' ? t('portalDashboard.agreementSigning') : t('portalDashboard.agreementSubmit')}
        </button>
      </form>
    </Modal>
  );
}

function CreditMonitoringModal({ onClose, onDone }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const PROVIDER_OPTIONS = [
    { value: 'identityiq', label: 'IdentityIQ' },
    { value: 'smartcredit', label: 'SmartCredit' },
    { value: 'myscoreiq', label: 'MyScoreIQ' },
    { value: 'other', label: t('portalDashboard.providerOther') },
  ];

  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const provider = (data.get('provider') || '').trim();
    const username = (data.get('username') || '').trim();
    const password = data.get('password') || '';
    const phone = (data.get('phone') || '').trim();
    const securityWord = (data.get('securityWord') || '').trim();

    if (!provider) {
      setError(t('portalDashboard.providerRequired'));
      return;
    }
    if (username.length < 3) {
      setError(t('portalDashboard.usernameTooShort'));
      return;
    }
    if (password.length < 4) {
      setError(t('portalDashboard.passwordTooShort'));
      return;
    }
    if (phone && !PHONE_PATTERN.test(phone)) {
      setError(t('portalDashboard.invalidPhone'));
      return;
    }

    setStatus('sending');
    setError('');
    try {
      await saveCreditMonitoring({ provider, username, password, phone, securityWord });
      onDone();
    } catch (submissionError) {
      setError(submissionError.message);
      setStatus('error');
    }
  };

  return (
    <Modal title={t('portalDashboard.creditMonitoringTitle')} onClose={onClose}>
      <p className="portal-sub">{t('portalDashboard.creditMonitoringText')}</p>
      <form onSubmit={submit}>
        <div className="form-group">
          <label htmlFor="provider">{t('portalDashboard.providerLabel')}</label>
          <div className="select-wrapper">
            <select id="provider" name="provider" required defaultValue="">
              <option value="" disabled>{t('portalDashboard.providerPlaceholder')}</option>
              {PROVIDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="username">{t('portalDashboard.usernameLabel')}</label>
          <input id="username" name="username" required minLength="3" maxLength="254" autoComplete="off" />
        </div>
        <div className="form-group">
          <label htmlFor="password">{t('portalDashboard.passwordLabel')}</label>
          <input id="password" name="password" type="password" required minLength="4" autoComplete="off" />
        </div>
        <div className="form-group">
          <label htmlFor="phone">{t('portalDashboard.phoneLabel')}</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            maxLength="40"
            placeholder="+1 407 848 2593"
            pattern="^\+?[0-9](?:[0-9\s().-]{5,18})[0-9]$"
            title={t('portalDashboard.invalidPhone')}
          />
        </div>
        <div className="form-group">
          <label htmlFor="securityWord">{t('portalDashboard.securityWordLabel')}</label>
          <input id="securityWord" name="securityWord" maxLength="120" autoComplete="off" />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary submit-btn" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? t('portalDashboard.savingCredentials') : t('portalDashboard.saveCredentials')}
        </button>
      </form>
    </Modal>
  );
}

function DocumentModal({ tile, onClose, onDone }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus('sending');
    setError('');
    try {
      await uploadDocument(tile.type, file);
      onDone();
    } catch (uploadError) {
      setError(uploadError.message);
      setStatus('error');
    }
  };

  return (
    <Modal title={tile.title} onClose={onClose}>
      <p className="portal-sub">{tile.hint}</p>
      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={status === 'sending'} onChange={handleChange} />
      {status === 'sending' && <p className="doc-hint">{t('portalDashboard.uploading')}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}

export default function PortalDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState(null);
  const [activeModal, setActiveModal] = useState(null);

  const DOCUMENT_TILES = [
    { type: 'id_front', title: t('portalDashboard.docIdFrontTitle'), hint: t('portalDashboard.docIdFrontHint') },
    { type: 'selfie_with_id', title: t('portalDashboard.docSelfieTitle'), hint: t('portalDashboard.docSelfieHint') },
    { type: 'ssn_card', title: t('portalDashboard.docSsnTitle'), hint: t('portalDashboard.docSsnHint') },
    { type: 'proof_of_residency', title: t('portalDashboard.docProofTitle'), hint: t('portalDashboard.docProofHint') },
  ];

  const load = useCallback(async () => {
    try {
      const [me, onboarding] = await Promise.all([fetchMe(), fetchOnboardingStatus()]);
      setAccount(me.account);
      setStatus(onboarding);
    } catch {
      navigate('/portal/login', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!status || location.pathname === '/portal/dashboard' || !TAB_BY_PATH[location.pathname]) return;
    const documentsComplete = DOCUMENT_TILES.every((tile) => status.documentsStatus[tile.type]);
    const ready = documentsComplete && status.creditMonitoringSaved && Boolean(status.agreement) && status.agreement.status === 'signed';
    if (!ready) navigate('/portal/dashboard', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, location.pathname, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login', { replace: true });
  };

  if (loading || !account || !status) {
    return (
      <PortalLayout>
        <div className="portal-card">
          <p className="portal-sub">{t('portalDashboard.loading')}</p>
        </div>
      </PortalLayout>
    );
  }

  const items = [];
  if (status.agreement) {
    items.push({ key: 'agreement', label: t('portalDashboard.agreementLabel'), done: status.agreement.status === 'signed' });
  }
  items.push({ key: 'creditMonitoring', label: t('portalDashboard.creditMonitoringLabel'), done: status.creditMonitoringSaved });
  DOCUMENT_TILES.forEach((tile) => items.push({ key: tile.type, label: tile.title, done: status.documentsStatus[tile.type] }));

  const doneCount = items.filter((item) => item.done).length;
  const nextIncompleteKey = items.find((item) => !item.done)?.key;
  const activeDocumentTile = DOCUMENT_TILES.find((tile) => tile.type === activeModal);

  const documentsComplete = DOCUMENT_TILES.every((tile) => status.documentsStatus[tile.type]);
  const checklistComplete = documentsComplete && status.creditMonitoringSaved;
  const readyForHome = checklistComplete && Boolean(status.agreement) && status.agreement.status === 'signed';

  const modals = (
    <>
      {activeModal === 'agreement' && status.agreement && (
        <AgreementModal agreement={status.agreement} onClose={() => setActiveModal(null)} onDone={() => { setActiveModal(null); load(); }} />
      )}
      {activeModal === 'creditMonitoring' && (
        <CreditMonitoringModal onClose={() => setActiveModal(null)} onDone={() => { setActiveModal(null); load(); }} />
      )}
      {activeDocumentTile && (
        <DocumentModal tile={activeDocumentTile} onClose={() => setActiveModal(null)} onDone={() => { setActiveModal(null); load(); }} />
      )}
    </>
  );

  if (readyForHome) {
    const activeTab = TAB_BY_PATH[location.pathname] || 'home';
    const tabTitle = {
      home: t('portalSidebar.home'),
      disputes: t('portalSidebar.disputes'),
      messages: t('portalSidebar.messages'),
      finances: t('portalSidebar.finances'),
      invoices: t('portalSidebar.invoices'),
      credit: t('portalSidebar.creditInfo'),
      resources: t('portalSidebar.resources'),
      settings: t('portalSidebar.settings'),
    }[activeTab];

    return (
      <PortalSidebarLayout title={tabTitle} onLogout={handleLogout}>
        {activeTab === 'home' && <HomeTab account={account} />}
        {activeTab === 'disputes' && <DisputesTab />}
        {activeTab === 'messages' && <ComingSoonCard title={t('portalSidebar.messages')} />}
        {activeTab === 'finances' && <ServicesPanel />}
        {activeTab === 'invoices' && <ComingSoonCard title={t('portalSidebar.invoices')} />}
        {activeTab === 'credit' && <CreditInfoTab onUpdateCredentials={() => setActiveModal('creditMonitoring')} />}
        {activeTab === 'resources' && <ComingSoonCard title={t('portalSidebar.resources')} />}
        {activeTab === 'settings' && <ComingSoonCard title={t('portalSidebar.settings')} />}
        {modals}
      </PortalSidebarLayout>
    );
  }

  return (
    <PortalLayout onLogout={handleLogout}>
      <div className="portal-card wide">
        <h1>{t('portalDashboard.greeting')}, {account.full_name.split(' ')[0]}</h1>
        <p className="portal-sub">{t('portalDashboard.subtitle')}</p>

        <div className="progress-rule">
          {items.map((item) => (
            <div key={item.key} className={`progress-seg${item.done ? ' is-done' : ''}`} />
          ))}
        </div>
        <p className="doc-hint progress-caption">{doneCount} {t('portalDashboard.progressText')} {items.length} {t('portalDashboard.completed')}</p>

        <div className="tile-list">
          {items.map((item) => (
            <div key={item.key} className="doc-tile tile-row">
              <div className="tile-row-label">
                <span className={`checklist-item-mark${item.done ? ' done' : ''}`}>{item.done ? '✓' : '○'}</span>
                <span>{item.label}</span>
              </div>
              {item.key === 'agreement' && item.done ? (
                <span className="status-badge approved">{t('portalDashboard.signed')}</span>
              ) : item.done ? (
                <button className="btn-quiet" type="button" onClick={() => setActiveModal(item.key)}>
                  {t('portalDashboard.update')}
                </button>
              ) : (
                <button
                  className={`btn ${item.key === nextIncompleteKey ? 'btn-primary' : 'btn-outline'}`}
                  type="button"
                  onClick={() => setActiveModal(item.key)}
                >
                  {t('portalDashboard.completeNow')}
                </button>
              )}
            </div>
          ))}

          {checklistComplete && !status.agreement && (
            <div className="doc-tile">
              <h3>{t('portalDashboard.agreementWaitingTitle')}</h3>
              <p className="doc-hint">{t('portalDashboard.agreementWaitingText')}</p>
            </div>
          )}
        </div>

        <ServicesPanel />
      </div>

      {modals}
    </PortalLayout>
  );
}

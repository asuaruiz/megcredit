import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import PortalLayout from '../../components/portal/PortalLayout.jsx';
import PortalTopbar from '../../components/portal/PortalTopbar.jsx';
import Modal from '../../components/portal/Modal.jsx';
import SignaturePad from '../../components/portal/SignaturePad.jsx';
import ServicesPanel from '../../components/portal/ServicesPanel.jsx';
import {
  fetchAgreementPdf,
  fetchBureauSummary,
  fetchMe,
  fetchOnboardingStatus,
  fetchServices,
  logout,
  payPlan,
  saveCreditMonitoring,
  signAgreement,
  uploadDocument,
} from '../../lib/portalApi.js';
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

const TAB_BY_PATH = {
  '/portal/inicio': 'home',
  '/portal/mi-caso': 'mi-caso',
  '/portal/servicios': 'servicios',
};

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

function formatShortDate(dateStr, language) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
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

/* ---------- Home ---------- */

function HomeTab({ bureauData, documents, plans }) {
  const { t, language } = useLanguage();
  const hasData = Boolean(bureauData?.report);
  const scoreFor = (bureauKey) => bureauData?.scores.find((row) => row.bureau === bureauKey)?.score;

  const DOC_LABELS = {
    id_front: t('portalDashboard.docIdFrontTitle'),
    selfie_with_id: t('portalDashboard.docSelfieTitle'),
    ssn_card: t('portalDashboard.docSsnTitle'),
    proof_of_residency: t('portalDashboard.docProofTitle'),
  };

  const hasCategory = (category) => (bureauData?.caseStatus || []).some((row) => row.status_category === category && row.count > 0);
  let bandState = 'preparing';
  if (hasData) {
    if (hasCategory('in_dispute')) bandState = 'inProgress';
    else if (hasCategory('deleted') || hasCategory('repaired')) bandState = 'advancing';
    else bandState = 'upToDate';
  }
  const BAND_COPY = {
    preparing: { headline: t('portalHome.bandStatePreparing'), sub: t('portalHome.bandSubPreparing') },
    inProgress: { headline: t('portalHome.bandStateInProgress'), sub: t('portalHome.bandSubInProgress') },
    advancing: { headline: t('portalHome.bandStateAdvancing'), sub: t('portalHome.bandSubAdvancing') },
    upToDate: { headline: t('portalHome.bandStateUpToDate'), sub: t('portalHome.bandSubUpToDate') },
  };

  const activity = [];
  (documents || []).forEach((doc) => {
    if (!doc.created_at) return;
    activity.push({ date: doc.created_at, desc: `${t('portalHome.activityUploaded')} ${DOC_LABELS[doc.document_type] || doc.document_type}` });
  });
  (plans || []).forEach((plan) => {
    if (plan.agreement?.status === 'signed' && plan.agreement.signed_at) {
      activity.push({ date: plan.agreement.signed_at, desc: t('portalHome.activityAgreementSigned') });
    }
  });
  if (bureauData?.report?.asOfDate) {
    activity.push({ date: bureauData.report.asOfDate, desc: t('portalHome.activityReportUpdated') });
  }
  activity.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recentActivity = activity.slice(0, 5);

  return (
    <>
      <div className="portal-band on-navy">
        <div className="portal-band-inner">
          <div className="portal-band-hairline" />
          <p className="portal-band-overline">
            {t('portalHome.bandOverline')}{hasData ? ` ${bureauData.report.asOfDate}` : ''}
          </p>
          <h1 className="portal-band-headline">{BAND_COPY[bandState].headline}</h1>
          <p className="portal-band-sub">{BAND_COPY[bandState].sub}</p>
        </div>
      </div>

      <div className="portal-content">
        <section className="surface-raised is-metric score-row">
          <h2 className="portal-section-title">{t('portalHome.scoresTitle')}</h2>
          <div className="admin-stats">
            {BUREAUS.map(({ label, key }) => (
              <div className="admin-stat-tile" key={key}>
                <div className="stat-value">{scoreFor(key) ?? '—'}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
          <p className="portal-sub">{hasData ? `${t('portalHome.asOf')} ${bureauData.report.asOfDate}` : t('portalHome.scoresEmpty')}</p>
        </section>

        <section>
          <h2 className="portal-section-title">{t('portalHome.caseStatusTitle')}</h2>
          <CaseStatusTable bureauData={bureauData} />
          {!hasData && <p className="portal-sub">{t('portalHome.caseStatusEmpty')}</p>}
        </section>

        {recentActivity.length > 0 && (
          <section>
            <h2 className="portal-section-title">{t('portalHome.recentActivityTitle')}</h2>
            <div className="activity-list">
              {recentActivity.map((row, index) => (
                <div className="activity-row" key={index}>
                  <span className="activity-date">{formatShortDate(row.date, language)}</span>
                  <span className="activity-desc">{row.desc}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function MiCasoTab({ bureauData }) {
  const { t } = useLanguage();
  const hasData = Boolean(bureauData?.report);

  return (
    <div className="portal-content">
      <h1 className="portal-page-title">{t('portalTopbar.myCase')}</h1>
      <section>
        <h2 className="portal-section-title">{t('portalHome.caseStatusTitle')}</h2>
        <CaseStatusTable bureauData={bureauData} />
        {!hasData && <p className="portal-sub">{t('portalHome.caseStatusEmpty')}</p>}
      </section>
    </div>
  );
}

/* ---------- Action banner (unsigned agreement / plan awaiting payment) ---------- */

function ActionBanner({ type, collapsed, onToggle, onAction }) {
  const { t } = useLanguage();
  const title = type === 'agreement' ? t('portalBanner.newAgreementTitle') : t('portalBanner.planReadyTitle');
  const actionLabel = type === 'agreement' ? t('portalBanner.reviewAndSign') : t('portalBanner.payNow');

  if (collapsed) {
    return (
      <button type="button" className="action-banner is-collapsed" onClick={onToggle}>
        <p>{title}</p>
      </button>
    );
  }

  return (
    <div className="action-banner">
      <p>{title}</p>
      <div className="cluster-2">
        <button className="btn btn-primary" type="button" onClick={onAction}>{actionLabel}</button>
        <button className="action-banner-dismiss" type="button" onClick={onToggle} aria-label={t('general.close')}>×</button>
      </div>
    </div>
  );
}

function PaymentBanner({ result, onDismiss }) {
  const { t } = useLanguage();
  const isSuccess = result === 'success';
  return (
    <div className={`action-banner${isSuccess ? '' : ' is-neutral'}`}>
      <p>
        {isSuccess ? t('portalBanner.paymentSuccessTitle') : t('portalBanner.paymentCancelledTitle')}
        {' — '}
        {isSuccess ? t('portalBanner.paymentSuccessText') : t('portalBanner.paymentCancelledText')}
      </p>
      <button className="action-banner-dismiss" type="button" onClick={onDismiss} aria-label={t('general.close')}>×</button>
    </div>
  );
}

const PHONE_PATTERN = /^\+?[0-9](?:[0-9\s().-]{5,18})[0-9]$/;

function AgreementModal({ agreement, awaitingPayment, onClose, onDone }) {
  const { t } = useLanguage();
  const signatureRef = useRef(null);
  const [fullName, setFullName] = useState('');
  const [agree, setAgree] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [signedAt, setSignedAt] = useState(null);

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
      setSignedAt(new Date());
      setStatus('done');
    } catch (submissionError) {
      setError(submissionError.message);
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <Modal title={agreement.title} onClose={onDone}>
        <div className="success-state">
          <div className="success-icon">✓</div>
          <h3>{t('portalDashboard.agreementConfirmTitle')}</h3>
          <p>{t('portalDashboard.agreementConfirmSignedBy')} {fullName}</p>
          <p className="portal-sub">{signedAt?.toLocaleString()}</p>
          {awaitingPayment && <p className="portal-sub">{t('portalDashboard.agreementConfirmNextStepPayment')}</p>}
          <button className="btn btn-primary" type="button" onClick={onDone}>{t('portalDashboard.continueButton')}</button>
        </div>
      </Modal>
    );
  }

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
      setStatus('done');
    } catch (uploadError) {
      setError(uploadError.message);
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <Modal title={tile.title} onClose={onDone}>
        <div className="success-state">
          <div className="success-icon">✓</div>
          <h3>{t('portalDashboard.uploadConfirmTitle')}</h3>
          <p>{t('portalDashboard.uploadConfirmText')}</p>
          <button className="btn btn-primary" type="button" onClick={onDone}>{t('portalDashboard.continueButton')}</button>
        </div>
      </Modal>
    );
  }

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState(null);
  const [plans, setPlans] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [bannerCollapsed, setBannerCollapsed] = useState(false);
  const bureauData = useBureauSummary();

  const DOCUMENT_TILES = [
    { type: 'id_front', title: t('portalDashboard.docIdFrontTitle'), hint: t('portalDashboard.docIdFrontHint') },
    { type: 'selfie_with_id', title: t('portalDashboard.docSelfieTitle'), hint: t('portalDashboard.docSelfieHint') },
    { type: 'ssn_card', title: t('portalDashboard.docSsnTitle'), hint: t('portalDashboard.docSsnHint') },
    { type: 'proof_of_residency', title: t('portalDashboard.docProofTitle'), hint: t('portalDashboard.docProofHint') },
  ];

  const STEP_META = {
    id_front: { title: t('portalDashboard.docIdFrontTitle'), heroHeadline: t('portalOnboarding.idFrontHeadline'), heroSentence: t('portalOnboarding.idFrontSentence'), cta: t('portalOnboarding.ctaUpload') },
    selfie_with_id: { title: t('portalDashboard.docSelfieTitle'), heroHeadline: t('portalOnboarding.selfieHeadline'), heroSentence: t('portalOnboarding.selfieSentence'), cta: t('portalOnboarding.ctaUpload') },
    ssn_card: { title: t('portalDashboard.docSsnTitle'), heroHeadline: t('portalOnboarding.ssnHeadline'), heroSentence: t('portalOnboarding.ssnSentence'), cta: t('portalOnboarding.ctaUpload') },
    proof_of_residency: { title: t('portalDashboard.docProofTitle'), heroHeadline: t('portalOnboarding.proofHeadline'), heroSentence: t('portalOnboarding.proofSentence'), cta: t('portalOnboarding.ctaUpload') },
    creditMonitoring: { title: t('portalDashboard.creditMonitoringLabel'), heroHeadline: t('portalOnboarding.creditMonitoringHeadline'), heroSentence: t('portalOnboarding.creditMonitoringSentence'), cta: t('portalOnboarding.ctaShareCredentials') },
    agreement: { title: t('portalDashboard.agreementLabel'), heroHeadline: t('portalOnboarding.agreementHeadline'), heroSentence: t('portalOnboarding.agreementSentence'), cta: t('portalOnboarding.ctaReviewAndSign') },
  };

  const load = useCallback(async () => {
    try {
      const [me, onboarding, services] = await Promise.all([fetchMe(), fetchOnboardingStatus(), fetchServices()]);
      setAccount(me.account);
      setDocuments(me.documents || []);
      setStatus(onboarding);
      setPlans(services.plans || []);
    } catch {
      navigate('/portal/login', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login', { replace: true });
  };

  if (loading || !account || !status || !plans) {
    return (
      <PortalLayout>
        <div className="portal-card">
          <p className="portal-sub">{t('portalDashboard.loading')}</p>
        </div>
      </PortalLayout>
    );
  }

  const documentsComplete = DOCUMENT_TILES.every((tile) => status.documentsStatus[tile.type]);
  const checklistComplete = documentsComplete && status.creditMonitoringSaved;

  // The API only returns the newest agreement, so gating on "newest signed"
  // alone locks a returning client back into onboarding the moment their
  // advisor assigns a second plan (new, unsigned agreement). `plans` (from
  // /api/portal/services) carries the client's *full* agreement history —
  // one per plan — so "has ever signed any agreement" is a real signal we
  // already have, not an approximation.
  const everSignedAgreement = plans.some((plan) => plan.agreement?.status === 'signed');
  const readyForHome = everSignedAgreement || (checklistComplete && status.agreement?.status === 'signed');

  const items = [
    ...DOCUMENT_TILES.map((tile) => ({ key: tile.type, done: Boolean(status.documentsStatus[tile.type]), locked: false })),
    { key: 'creditMonitoring', done: status.creditMonitoringSaved, locked: false },
    { key: 'agreement', done: status.agreement?.status === 'signed', locked: !status.agreement },
  ];
  const doneCount = items.filter((item) => item.done).length;
  const nextItem = items.find((item) => !item.done && !item.locked);
  const activeDocumentTile = DOCUMENT_TILES.find((tile) => tile.type === activeModal);

  const linkedPlan = plans.find((plan) => plan.agreement?.id === status.agreement?.id);
  const awaitingPaymentForAgreement = linkedPlan?.status === 'awaiting_payment';

  const modals = (
    <>
      {activeModal === 'agreement' && status.agreement && (
        <AgreementModal
          agreement={status.agreement}
          awaitingPayment={awaitingPaymentForAgreement}
          onClose={() => setActiveModal(null)}
          onDone={() => { setActiveModal(null); load(); }}
        />
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
    const paymentParam = searchParams.get('payment');
    const clearPaymentParam = () => {
      const next = new URLSearchParams(searchParams);
      next.delete('payment');
      setSearchParams(next, { replace: true });
    };

    const unsignedAgreement = Boolean(status.agreement) && status.agreement.status !== 'signed';
    const awaitingPaymentPlan = plans.find((plan) => plan.status === 'awaiting_payment' && plan.agreement?.status === 'signed');
    const bannerType = unsignedAgreement ? 'agreement' : awaitingPaymentPlan ? 'payment' : null;

    return (
      <div className="portal-workspace">
        <PortalTopbar
          account={account}
          onLogout={handleLogout}
          onOpenCreditMonitoring={() => setActiveModal('creditMonitoring')}
        />

        {paymentParam === 'success' && <PaymentBanner result="success" onDismiss={clearPaymentParam} />}
        {paymentParam === 'cancelled' && <PaymentBanner result="cancelled" onDismiss={clearPaymentParam} />}
        {!paymentParam && bannerType && (
          <ActionBanner
            type={bannerType}
            collapsed={bannerCollapsed}
            onToggle={() => setBannerCollapsed((collapsed) => !collapsed)}
            onAction={() => {
              if (bannerType === 'agreement') setActiveModal('agreement');
              else if (awaitingPaymentPlan) payPlan(awaitingPaymentPlan.id);
            }}
          />
        )}

        <div className="portal-main-flex">
          {activeTab === 'home' && <HomeTab bureauData={bureauData} documents={documents} plans={plans} />}
          {activeTab === 'mi-caso' && <MiCasoTab bureauData={bureauData} />}
          {activeTab === 'servicios' && (
            <div className="portal-content">
              <ServicesPanel />
            </div>
          )}
        </div>

        {modals}
      </div>
    );
  }

  const heroContent = nextItem
    ? {
      headline: STEP_META[nextItem.key].heroHeadline,
      sentence: STEP_META[nextItem.key].heroSentence,
      cta: STEP_META[nextItem.key].cta,
      modalKey: nextItem.key,
    }
    : {
      headline: t('portalDashboard.agreementWaitingTitle'),
      sentence: t('portalDashboard.agreementWaitingText'),
      cta: null,
      modalKey: null,
    };
  const heroStepNumber = nextItem ? items.indexOf(nextItem) + 1 : items.length;
  const heroOverline = t(`portalOnboarding.step${heroStepNumber}Overline`);
  const heroKey = nextItem?.key ?? 'agreement';
  const remainingRows = items.filter((item) => !item.done && item.key !== heroKey);

  return (
    <PortalLayout onLogout={handleLogout}>
      <div className="portal-main-flex">
        <div className="portal-band on-navy">
          <div className="portal-band-inner">
            <div className="portal-band-hairline" />
            <p className="portal-band-overline">{heroOverline}</p>
            <h1 className="portal-band-headline">{heroContent.headline}</h1>
            <p className="portal-band-sub">{heroContent.sentence}</p>
            {heroContent.cta && (
              <button className="btn btn-primary" type="button" onClick={() => setActiveModal(heroContent.modalKey)}>
                {heroContent.cta}
              </button>
            )}
          </div>
        </div>

        <div className="portal-content">
          <div className="progress-rule">
            {items.map((item) => (
              <div key={item.key} className={`progress-seg${item.done ? ' is-done' : ''}`} />
            ))}
          </div>
          <p className="doc-hint progress-caption">{doneCount} {t('portalOnboarding.of6Completed')}</p>

          {doneCount > 0 && (
            <p className="onboarding-summary-line">✓ {doneCount} {t('portalOnboarding.stepsCompletedSuffix')}</p>
          )}

          {remainingRows.length > 0 && (
            <div className="tile-list">
              {remainingRows.map((item) => (
                <div key={item.key} className="onboarding-row">
                  <span className="onboarding-row-icon">{item.locked ? '🔒' : '○'}</span>
                  <div>
                    <div className="onboarding-row-label">{STEP_META[item.key].title}</div>
                    {item.locked && <div className="onboarding-row-hint">{t('portalOnboarding.agreementLockedRow')}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modals}
    </PortalLayout>
  );
}

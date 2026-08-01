const BUREAU_LABEL = { equifax: 'Equifax', experian: 'Experian', transunion: 'TransUnion' };

const DOCUMENT_LABEL_KEY = {
  id_front: 'documentIdFront',
  id_back: 'documentIdBack',
  selfie_with_id: 'documentSelfie',
  ssn_card: 'documentSsn',
  proof_of_residency: 'documentProof',
};

export default function ClientSummaryTab({ detail, bureauReports, language, t }) {
  const locale = language === 'es' ? 'es-US' : 'en-US';
  const account = detail.account;
  const documents = detail.documents || [];
  const plans = detail.plans || [];
  const reports = bureauReports || [];

  const events = [];

  documents.forEach((doc) => {
    if (!doc.created_at) return;
    const label = t(`adminClientDetail.${DOCUMENT_LABEL_KEY[doc.document_type] || 'documentIdFront'}`);
    events.push({ date: doc.created_at, text: t('adminClientDetail.activityDocumentUploaded')(label) });
  });

  plans.forEach((plan) => {
    if (plan.created_at) {
      events.push({ date: plan.created_at, text: t('adminClientDetail.activityPlanCreated') });
    }
    if (plan.agreement?.status === 'signed' && plan.agreement.signed_at) {
      events.push({ date: plan.agreement.signed_at, text: t('adminClientDetail.activityAgreementSigned')(plan.agreement.title) });
    }
  });

  reports.forEach((report) => {
    if (report.parse_status === 'confirmed' && report.as_of_date) {
      events.push({ date: report.as_of_date, text: t('adminClientDetail.activityBureauReport') });
    }
  });

  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  const latestConfirmed = reports
    .filter((report) => report.parse_status === 'confirmed')
    .sort((a, b) => new Date(b.as_of_date) - new Date(a.as_of_date))[0];

  const createdLabel = account.created_at ? new Date(account.created_at).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }) : null;
  const lastLoginLabel = account.last_login_at ? new Date(account.last_login_at).toLocaleString(locale) : null;

  return (
    <div className="workspace-split">
      <div className="col-main">
        <div className="portal-card wide">
          <h2>{t('adminClientDetail.activityTitle')}</h2>
          {events.length === 0 ? (
            <p className="portal-sub">{t('adminClientDetail.noActivity')}</p>
          ) : (
            <div className="activity-list">
              {events.map((event, index) => (
                <div className="activity-row" key={index}>
                  <span className="activity-date">{new Date(event.date).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className="activity-desc">{event.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="col-aside">
        <div className="portal-card wide">
          <h2>{t('adminClientDetail.scoresTitle')}</h2>
          {latestConfirmed ? (
            <div className="admin-stats">
              {latestConfirmed.scores.map((row) => (
                <div className="admin-stat-tile" key={row.bureau}>
                  <div className="stat-value">{row.score}</div>
                  <div className="stat-label">{BUREAU_LABEL[row.bureau] || row.bureau}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="portal-sub">{t('adminClientDetail.noScores')}</p>
          )}
        </div>

        <div className="portal-card wide">
          <h2>{t('adminClientDetail.contactTitle')}</h2>
          <div className="field-list">
            <p>{account.email}</p>
            {account.phone && <p>{account.phone}</p>}
            <p><span className={`status-badge ${account.status === 'active' ? 'approved' : account.status === 'invited' ? 'pending' : 'rejected'}`}>{account.status}</span></p>
            {createdLabel && <p>{t('adminClientDetail.clientSince')(createdLabel)}</p>}
            {lastLoginLabel && <p>{t('adminClientDetail.lastLoginLabel')(lastLoginLabel)}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

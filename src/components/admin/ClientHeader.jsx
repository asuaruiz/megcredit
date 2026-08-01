import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STATUS_BADGE = { invited: 'pending', active: 'approved', suspended: 'rejected' };

function toneFromStatuses({ hasPending, hasGood, hasAny }) {
  if (hasPending) return 'gold';
  if (hasGood) return 'navy';
  if (hasAny) return 'navy';
  return 'grey';
}

/**
 * Sticky decision header for the client detail page. Everything it renders
 * is computed from data already loaded by the page (client-detail response
 * + the bureau reports/link fetched once alongside it) — no extra requests.
 */
export default function ClientHeader({ detail, bureauReports, bureauLink, language, t, activeTab, onChangeTab }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 96);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const account = detail.account;
  const documents = detail.documents || [];
  const plans = detail.plans || [];
  const reports = bureauReports || [];

  const pendingDocs = documents.filter((doc) => doc.status === 'pending');
  const agreements = plans.map((plan) => plan.agreement).filter(Boolean);
  const unsignedAgreement = agreements.find((agreement) => agreement.status !== 'signed');
  const hasAnyAgreement = agreements.length > 0;
  const hasSignedAgreement = agreements.some((agreement) => agreement.status === 'signed');

  const planNeedsAttention = plans.some((plan) => ['awaiting_payment', 'past_due'].includes(plan.status));
  const planHealthy = plans.some((plan) => ['active', 'paid'].includes(plan.status));

  const bureauNeedsAttention = reports.some((report) => report.parse_status === 'pending') || bureauLink?.sync_status === 'error';
  const bureauHealthy = reports.some((report) => report.parse_status === 'confirmed');

  const chips = [
    {
      id: 'documentos',
      label: t('adminClientDetail.chipDocuments'),
      tone: toneFromStatuses({ hasPending: pendingDocs.length > 0, hasGood: documents.length > 0, hasAny: documents.length > 0 }),
      target: 'documentos',
    },
    {
      id: 'monitoreo',
      label: t('adminClientDetail.chipCredit'),
      tone: 'grey',
      target: 'credito',
    },
    {
      id: 'buro',
      label: t('adminClientDetail.chipBureau'),
      tone: toneFromStatuses({ hasPending: bureauNeedsAttention, hasGood: bureauHealthy, hasAny: reports.length > 0 || Boolean(bureauLink) }),
      target: 'credito',
    },
    {
      id: 'contrato',
      label: t('adminClientDetail.chipContract'),
      tone: toneFromStatuses({ hasPending: Boolean(unsignedAgreement), hasGood: hasSignedAgreement, hasAny: hasAnyAgreement }),
      target: 'plan',
    },
    {
      id: 'plan',
      label: t('adminClientDetail.chipPlan'),
      tone: toneFromStatuses({ hasPending: planNeedsAttention, hasGood: planHealthy, hasAny: plans.length > 0 }),
      target: 'plan',
    },
  ];

  let nextAction = null;
  if (pendingDocs.length > 0) {
    nextAction = { text: t('adminClientDetail.nextActionDocuments')(pendingDocs.length), cta: t('adminClientDetail.reviewDocumentsCta'), target: 'documentos' };
  } else if (unsignedAgreement) {
    nextAction = { text: t('adminClientDetail.nextActionContract'), cta: t('adminClientDetail.viewContractCta'), target: 'plan' };
  } else if (plans.length === 0) {
    nextAction = { text: t('adminClientDetail.nextActionNoPlan'), cta: t('adminClientDetail.buildPlanCta'), target: 'nuevo-plan' };
  }

  const locale = language === 'es' ? 'es-US' : 'en-US';
  const createdLabel = account.created_at ? new Date(account.created_at).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : null;
  const lastLoginLabel = account.last_login_at ? new Date(account.last_login_at).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : null;

  if (collapsed) {
    return (
      <div className="client-header is-collapsed">
        <h1 className="client-header-name">{account.full_name}</h1>
        <span className={`status-badge ${STATUS_BADGE[account.status] || 'missing'}`}>{account.status}</span>
        <div style={{ flex: 1 }} />
        {nextAction ? (
          <button className="btn btn-primary" type="button" onClick={() => onChangeTab(nextAction.target)}>
            {nextAction.cta}
          </button>
        ) : (
          <button className="btn btn-outline" type="button" onClick={() => onChangeTab('nuevo-plan')}>
            {t('adminClientDetail.newPlanCta')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="client-header">
      <div className="client-header-row1">
        <Link to="/admin/clientes" className="client-header-back">← {t('adminClientDetail.backToClients')}</Link>
      </div>
      <div className="client-header-row1">
        <h1 className="client-header-name">{account.full_name}</h1>
        <span className={`status-badge ${STATUS_BADGE[account.status] || 'missing'}`}>{account.status}</span>
        <button className="btn btn-primary" type="button" onClick={() => onChangeTab('nuevo-plan')}>
          {t('adminClientDetail.newPlanCta')}
        </button>
      </div>
      <div className="client-header-row2">
        <span>{account.email}</span>
        {account.phone && <span>{account.phone}</span>}
        {createdLabel && <span>{t('adminClientDetail.clientSince')(createdLabel)}</span>}
        {lastLoginLabel && <span>{t('adminClientDetail.lastLoginLabel')(lastLoginLabel)}</span>}
      </div>
      <div className="chip-rail">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className="state-chip"
            data-tone={chip.tone}
            aria-current={activeTab === chip.target ? 'true' : undefined}
            onClick={() => onChangeTab(chip.target)}
          >
            {chip.label}
          </button>
        ))}
      </div>
      {nextAction ? (
        <div className="next-action">
          <p>{nextAction.text}</p>
          <button className="btn btn-primary" type="button" onClick={() => onChangeTab(nextAction.target)}>
            {nextAction.cta}
          </button>
        </div>
      ) : (
        <div className="next-action is-quiet">
          <p>{t('adminClientDetail.nextActionNone')}</p>
        </div>
      )}
    </div>
  );
}

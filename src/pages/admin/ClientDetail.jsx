import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import ClientHeader from '../../components/admin/ClientHeader.jsx';
import ClientSummaryTab from '../../components/admin/ClientSummaryTab.jsx';
import ClientDocumentsTab from '../../components/admin/ClientDocumentsTab.jsx';
import ClientCreditTab from '../../components/admin/ClientCreditTab.jsx';
import ClientPlansTab from '../../components/admin/ClientPlansTab.jsx';
import PlanBuilderTab from '../../components/admin/PlanBuilderTab.jsx';
import {
  fetchBureauLink,
  fetchBureauReports,
  fetchCatalog,
  fetchClientDetail,
  fetchContractTemplates,
  fetchStaffMe,
  staffLogout,
} from '../../lib/adminApi.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

const TABS = ['resumen', 'documentos', 'credito', 'plan', 'nuevo-plan'];

export default function AdminClientDetail() {
  const { language, t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [contractTemplates, setContractTemplates] = useState([]);
  const [bureauReports, setBureauReports] = useState([]);
  const [bureauLink, setBureauLink] = useState(null);

  const rawTab = searchParams.get('seccion');
  const activeTab = TABS.includes(rawTab) ? rawTab : 'resumen';

  const setActiveTab = (tab) => {
    const next = TABS.includes(tab) ? tab : 'resumen';
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('seccion', next);
      return params;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const load = async () => {
    try {
      await fetchStaffMe();
      const [detailData, catalogData, templatesData] = await Promise.all([fetchClientDetail(id), fetchCatalog(), fetchContractTemplates()]);
      setDetail(detailData);
      setCatalog(catalogData.catalog || []);
      setContractTemplates(templatesData.templates || []);
      // Bureau reports/link power the sticky decision header and the Resumen
      // tab. They're fetched via the same existing endpoints the Crédito tab
      // uses on its own — no new API surface, just an extra call to already
      // existing GETs so the header doesn't need to guess client state.
      try {
        const reportsData = await fetchBureauReports(id);
        setBureauReports(reportsData.reports || []);
      } catch {
        setBureauReports([]);
      }
      try {
        const linkData = await fetchBureauLink(id);
        setBureauLink(linkData.link || null);
      } catch {
        setBureauLink(null);
      }
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

  const handleLogout = async () => {
    await staffLogout();
    navigate('/admin/login', { replace: true });
  };

  if (loading || !detail) {
    return (
      <AdminLayout title={t('adminClientDetail.clientTitle')}>
        <div className="portal-card"><p className="portal-sub">{t('admin.loading')}</p></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout onLogout={handleLogout}>
      <ClientHeader
        detail={detail}
        bureauReports={bureauReports}
        bureauLink={bureauLink}
        language={language}
        t={t}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />

      <nav className="admin-tabs" aria-label={t('adminClientDetail.clientTitle')}>
        <button type="button" className="admin-tab" aria-current={activeTab === 'resumen' ? 'true' : undefined} onClick={() => setActiveTab('resumen')}>
          {t('adminClientDetail.tabSummary')}
        </button>
        <button type="button" className="admin-tab" aria-current={activeTab === 'documentos' ? 'true' : undefined} onClick={() => setActiveTab('documentos')}>
          {t('adminClientDetail.tabDocuments')}
        </button>
        <button type="button" className="admin-tab" aria-current={activeTab === 'credito' ? 'true' : undefined} onClick={() => setActiveTab('credito')}>
          {t('adminClientDetail.tabCredit')}
        </button>
        <button type="button" className="admin-tab" aria-current={activeTab === 'plan' ? 'true' : undefined} onClick={() => setActiveTab('plan')}>
          {t('adminClientDetail.tabPlan')}
        </button>
        <button type="button" className="admin-tab" aria-current={activeTab === 'nuevo-plan' ? 'true' : undefined} onClick={() => setActiveTab('nuevo-plan')}>
          {t('adminClientDetail.tabNewPlan')}
        </button>
      </nav>

      {activeTab === 'resumen' && (
        <ClientSummaryTab detail={detail} bureauReports={bureauReports} language={language} t={t} />
      )}

      {activeTab === 'documentos' && (
        <ClientDocumentsTab documents={detail.documents} onReload={load} t={t} />
      )}

      {activeTab === 'credito' && (
        <ClientCreditTab clientId={id} clientEmail={detail.account.email} t={t} />
      )}

      {activeTab === 'plan' && (
        <ClientPlansTab plans={detail.plans} language={language} t={t} onReload={load} />
      )}

      {activeTab === 'nuevo-plan' && (
        <PlanBuilderTab
          clientId={id}
          account={detail.account}
          catalog={catalog}
          contractTemplates={contractTemplates}
          t={t}
          onSubmitted={load}
        />
      )}
    </AdminLayout>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import Modal from '../../components/portal/Modal.jsx';
import { attachAgreementPdf, fetchAgreementPdf, fetchContracts, fetchStaffMe, staffLogout, uploadAgreementPdf } from '../../lib/adminApi.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function AdminContracts() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const load = async () => {
    try {
      await fetchStaffMe();
      const result = await fetchContracts();
      setContracts(result.contracts || []);
    } catch { navigate('/admin/login', { replace: true }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const upload = async (contract, file) => {
    if (!file) return;
    setBusyId(contract.id); setError('');
    try {
      const uploaded = await uploadAgreementPdf(contract.client_account_id, file);
      await attachAgreementPdf(contract.id, uploaded);
      await load();
    } catch (uploadError) { setError(uploadError.message); }
    finally { setBusyId(null); }
  };
  const open = async (contract) => {
    setBusyId(contract.id); setError('');
    try {
      const blob = await fetchAgreementPdf(contract.id);
      setPreview({ title: contract.title, url: URL.createObjectURL(blob) });
    } catch (openError) { setError(openError.message); }
    finally { setBusyId(null); }
  };
  const close = () => { if (preview?.url) URL.revokeObjectURL(preview.url); setPreview(null); };
  const logout = async () => { await staffLogout(); navigate('/admin/login', { replace: true }); };
  return (
    <AdminLayout title={t('adminContracts.title')} onLogout={logout}>
      <div className="portal-card wide">
        <h2>{t('adminContracts.allContracts')}</h2>
        <p className="portal-sub">{t('adminContracts.description')}</p>
        {loading ? <p>{t('admin.loading')}</p> : contracts.length === 0 ? <p className="portal-sub">{t('adminContracts.empty')}</p> : (
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t('adminContracts.contract')}</th><th>{t('adminContracts.client')}</th><th>{t('adminContracts.status')}</th><th>PDF</th><th>{t('adminContracts.actions')}</th></tr></thead><tbody>
            {contracts.map((contract) => <tr key={contract.id}><td>{contract.title}</td><td>{contract.client?.full_name || contract.client?.email || '—'}</td><td><span className={`status-badge ${contract.status}`}>{contract.status}</span></td><td>{contract.pdf_original_filename || t('adminContracts.noPdf')}</td><td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {contract.has_pdf && <button className="btn btn-outline" type="button" disabled={busyId === contract.id} onClick={() => open(contract)}>{t('adminContracts.viewPdf')}</button>}
              <label className="btn btn-outline" style={{ cursor: busyId === contract.id ? 'wait' : 'pointer' }}>{busyId === contract.id ? t('adminContracts.uploading') : contract.has_pdf ? t('adminContracts.replacePdf') : t('adminContracts.uploadPdf')}<input type="file" accept="application/pdf" hidden disabled={busyId === contract.id} onChange={(event) => upload(contract, event.target.files?.[0])} /></label>
            </td></tr>)}
          </tbody></table></div>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      {preview && <Modal title={preview.title} onClose={close} maxWidth={1000}><iframe src={preview.url} title={preview.title} style={{ width: '100%', height: '72vh', border: 0 }} /></Modal>}
    </AdminLayout>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import Modal from '../../components/portal/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import {
  deleteContractTemplate,
  fetchContractTemplatePdf,
  fetchContractTemplates,
  fetchStaffMe,
  renameContractTemplate,
  staffLogout,
  uploadContractTemplate,
} from '../../lib/adminApi.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

function formatSize(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function AdminContracts() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setError('');
    try {
      await fetchStaffMe();
    } catch (sessionError) {
      if (sessionError.status === 401) navigate('/admin/login', { replace: true });
      else setError(sessionError.message);
      setLoading(false);
      return;
    }
    try {
      const result = await fetchContractTemplates();
      setTemplates(result.templates || []);
    } catch (templatesError) {
      setError(templatesError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (event) => {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await uploadContractTemplate(name, file);
      setName('');
      setFile(null);
      event.target.reset();
      await load();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  };

  const open = async (template) => {
    setBusyId(template.id);
    setError('');
    try {
      const blob = await fetchContractTemplatePdf(template.id);
      setPreview({ title: template.name, url: URL.createObjectURL(blob) });
    } catch (openError) {
      setError(openError.message);
    } finally {
      setBusyId(null);
    }
  };

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const startRename = (template) => {
    setRenamingId(template.id);
    setRenameValue(template.name);
  };

  const submitRename = async (event, templateId) => {
    event.preventDefault();
    setBusyId(templateId);
    setError('');
    try {
      await renameContractTemplate(templateId, renameValue);
      setRenamingId(null);
      await load();
    } catch (renameError) {
      setError(renameError.message);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    const target = deleteTarget;
    if (!target) return;
    setBusyId(target.id);
    setDeleteTarget(null);
    setError('');
    try {
      await deleteContractTemplate(target.id);
      await load();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusyId(null);
    }
  };

  const logout = async () => {
    await staffLogout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <AdminLayout title={t('adminContracts.title')} onLogout={logout}>
      <div className="portal-card wide admin-section">
        <h2>{t('adminContracts.uploadTitle')}</h2>
        <p className="portal-sub">{t('adminContracts.uploadDescription')}</p>
        <form onSubmit={submit}>
          <div className="admin-form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="templateName">{t('adminContracts.nameLabel')}</label>
              <input id="templateName" value={name} onChange={(event) => setName(event.target.value)} required minLength="2" maxLength="160" placeholder={t('adminContracts.namePlaceholder')} />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="templateFile">PDF</label>
              <input id="templateFile" type="file" accept="application/pdf" required onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </div>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={uploading}>
            {uploading ? t('adminContracts.uploading') : t('adminContracts.addTemplate')}
          </button>
        </form>
      </div>

      <div className="portal-card wide">
        <h2>{t('adminContracts.libraryTitle')}</h2>
        <p className="portal-sub">{t('adminContracts.libraryDescription')}</p>
        {loading ? <p>{t('admin.loading')}</p> : templates.length === 0 ? <p className="portal-sub">{t('adminContracts.empty')}</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('adminContracts.name')}</th>
                  <th>{t('adminContracts.file')}</th>
                  <th>{t('adminContracts.size')}</th>
                  <th>{t('adminContracts.uploaded')}</th>
                  <th>{t('adminContracts.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td>
                      {renamingId === template.id ? (
                        <form onSubmit={(event) => submitRename(event, template.id)} style={{ display: 'flex', gap: 6 }}>
                          <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} required minLength="2" maxLength="160" style={{ minWidth: 160 }} />
                          <button className="btn btn-outline" type="submit" disabled={busyId === template.id}>{t('general.save')}</button>
                          <button className="btn btn-outline" type="button" onClick={() => setRenamingId(null)}>{t('general.cancel')}</button>
                        </form>
                      ) : template.name}
                    </td>
                    <td>{template.original_filename}</td>
                    <td>{formatSize(template.size_bytes)}</td>
                    <td>{new Date(template.created_at).toLocaleDateString(language === 'es' ? 'es-US' : 'en-US')}</td>
                    <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-outline" type="button" disabled={busyId === template.id} onClick={() => open(template)}>
                        {t('adminContracts.viewPdf')}
                      </button>
                      {renamingId !== template.id && (
                        <button className="btn btn-outline" type="button" disabled={busyId === template.id} onClick={() => startRename(template)}>
                          {t('adminContracts.rename')}
                        </button>
                      )}
                      <button className="btn btn-outline" type="button" disabled={busyId === template.id} onClick={() => setDeleteTarget(template)} style={{ borderColor: '#b94a48', color: '#d97975' }}>
                        {t('general.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && error && <p className="form-error" role="alert">{error}</p>}
      </div>

      {preview && <Modal title={preview.title} onClose={closePreview} maxWidth={1000}><iframe src={preview.url} title={preview.title} style={{ width: '100%', height: '72vh', border: 0 }} /></Modal>}

      {deleteTarget && (
        <ConfirmDialog
          title={t('adminContracts.deleteTitle')}
          message={t('adminContracts.deleteConfirm')}
          confirmLabel={t('general.delete')}
          danger
          busy={busyId === deleteTarget.id}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AdminLayout>
  );
}

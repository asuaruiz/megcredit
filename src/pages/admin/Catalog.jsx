import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { createCatalogItem, deleteCatalogItem, fetchCatalog, fetchStaffMe, staffLogout, updateCatalogItem } from '../../lib/adminApi.js';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

function EditForm({ item, onCancel, onSaved }) {
  const { t } = useLanguage();
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description || '');
  const [price, setPrice] = useState(item.default_price_cents / 100);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateCatalogItem({ id: item.id, name, description, defaultPriceCents: Math.round(Number(price) * 100) });
      onSaved();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="doc-tile">
      <div className="form-group">
        <label>{t('adminCatalog.nameLabel')}</label>
        <input value={name} onChange={(event) => setName(event.target.value)} required minLength="2" maxLength="160" />
      </div>
      <div className="form-group">
        <label>{t('adminCatalog.descriptionLabel')}</label>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength="1000" />
      </div>
      <div className="form-group">
        <label>{t('adminCatalog.priceLabel')}</label>
        <input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="cluster-2">
        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? t('adminCatalog.savingButton') : t('adminCatalog.save')}</button>
        <button className="btn btn-outline" type="button" onClick={onCancel} disabled={saving}>{t('adminCatalog.cancel')}</button>
      </div>
    </form>
  );
}

export default function AdminCatalog() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    try {
      await fetchStaffMe();
      const data = await fetchCatalog(true);
      setCatalog(data.catalog || []);
    } catch {
      navigate('/admin/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus('sending');
    setError('');
    try {
      const priceDollars = Number(data.get('price'));
      await createCatalogItem({
        name: data.get('name'),
        description: data.get('description'),
        defaultPriceCents: Math.round(priceDollars * 100),
      });
      form.reset();
      setStatus('idle');
      load();
    } catch (submissionError) {
      setError(submissionError.message);
      setStatus('error');
    }
  };

  const toggleActive = async (item) => {
    setBusyId(item.id);
    setError('');
    try {
      await updateCatalogItem({ id: item.id, isActive: !item.is_active });
      await load();
    } catch (toggleError) {
      setError(toggleError.message);
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
      await deleteCatalogItem(target.id);
      await load();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleLogout = async () => {
    await staffLogout();
    navigate('/admin/login', { replace: true });
  };

  if (loading) {
    return (
      <AdminLayout title={t('adminCatalog.catalogTitle')}>
        <div className="portal-card"><p className="portal-sub">{t('admin.loading')}</p></div>
      </AdminLayout>
    );
  }

  const visibleCatalog = catalog.filter((item) => (showArchived ? true : item.is_active));

  return (
    <AdminLayout title={t('adminCatalog.catalogTitle')} onLogout={handleLogout}>
      <div className="portal-card wide">
        <h2>{t('adminCatalog.newServiceTitle')}</h2>
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="name">{t('adminCatalog.nameLabel')}</label>
            <input id="name" name="name" required minLength="2" maxLength="160" />
          </div>
          <div className="form-group">
            <label htmlFor="description">{t('adminCatalog.descriptionLabel')}</label>
            <textarea id="description" name="description" maxLength="1000" />
          </div>
          <div className="form-group">
            <label htmlFor="price">{t('adminCatalog.priceLabel')}</label>
            <input id="price" name="price" type="number" min="0" step="0.01" required />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? t('adminCatalog.savingButton') : t('adminCatalog.addButton')}
          </button>
        </form>
      </div>

      <div className="portal-card wide">
        <div className="block-header">
          <h2>{t('adminCatalog.catalogListTitle')}</h2>
          <button className="btn btn-outline" type="button" onClick={() => setShowArchived((prev) => !prev)}>
            {showArchived ? t('adminCatalog.hideArchived') : t('adminCatalog.showArchived')}
          </button>
        </div>
        {visibleCatalog.length === 0 ? (
          <p className="portal-sub">{t('adminCatalog.noServices')}</p>
        ) : (
          <div className="doc-grid">
            {visibleCatalog.map((item) => (
              editingId === item.id ? (
                <EditForm key={item.id} item={item} onCancel={() => setEditingId(null)} onSaved={() => { setEditingId(null); load(); }} />
              ) : (
                <div className={`doc-tile${item.is_active ? '' : ' dimmed'}`} key={item.id}>
                  <div className="tile-header">
                    <h3>{item.name}</h3>
                    <span className={`status-badge ${item.is_active ? 'approved' : 'missing'}`}>
                      {item.is_active ? t('adminCatalog.active') : t('adminCatalog.archived')}
                    </span>
                  </div>
                  <p className="doc-hint">{item.description || t('adminCatalog.noDescription')}</p>
                  <p className="plan-total">{(item.default_price_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                  <div className="cluster-2">
                    <button className="btn btn-outline" type="button" disabled={busyId === item.id} onClick={() => setEditingId(item.id)}>{t('adminCatalog.edit')}</button>
                    <button className="btn btn-outline" type="button" disabled={busyId === item.id} onClick={() => toggleActive(item)}>
                      {item.is_active ? t('adminCatalog.archive') : t('adminCatalog.activate')}
                    </button>
                    <button className="btn btn-outline danger" type="button" disabled={busyId === item.id} onClick={() => setDeleteTarget(item)}>
                      {t('adminCatalog.delete')}
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title={t('adminCatalog.deleteTitle')}
          message={t('adminCatalog.deleteConfirm')}
          confirmLabel={t('adminCatalog.delete')}
          danger
          busy={busyId === deleteTarget.id}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AdminLayout>
  );
}

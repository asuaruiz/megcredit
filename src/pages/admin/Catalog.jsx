import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { createCatalogItem, fetchCatalog, fetchStaffMe, staffLogout } from '../../lib/adminApi.js';

export default function AdminCatalog() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      await fetchStaffMe();
      const data = await fetchCatalog();
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
    const data = new FormData(event.currentTarget);
    setStatus('sending');
    setError('');
    try {
      const priceDollars = Number(data.get('price'));
      await createCatalogItem({
        name: data.get('name'),
        description: data.get('description'),
        defaultPriceCents: Math.round(priceDollars * 100),
      });
      event.currentTarget.reset();
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="portal-card"><p className="portal-sub">Cargando…</p></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout onLogout={handleLogout}>
      <div className="portal-card wide">
        <h1>Nuevo servicio</h1>
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="name">Nombre</label>
            <input id="name" name="name" required minLength="2" maxLength="160" />
          </div>
          <div className="form-group">
            <label htmlFor="description">Descripción</label>
            <textarea id="description" name="description" maxLength="1000" />
          </div>
          <div className="form-group">
            <label htmlFor="price">Precio por defecto (USD)</label>
            <input id="price" name="price" type="number" min="0" step="0.01" required />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? 'Guardando…' : 'Agregar al catálogo'}
          </button>
        </form>
      </div>

      <div className="portal-card wide" style={{ marginTop: 24 }}>
        <h1>Catálogo de servicios</h1>
        {catalog.length === 0 ? (
          <p className="portal-sub">Todavía no hay servicios en el catálogo.</p>
        ) : (
          <div className="doc-grid">
            {catalog.map((item) => (
              <div className="doc-tile" key={item.id}>
                <h3>{item.name}</h3>
                <p className="doc-hint">{item.description || 'Sin descripción.'}</p>
                <p style={{ fontWeight: 600 }}>{(item.default_price_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

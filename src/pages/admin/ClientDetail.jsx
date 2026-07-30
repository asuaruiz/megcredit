import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import { assignPlan, fetchCatalog, fetchClientCreditMonitoring, fetchClientDetail, fetchStaffMe, staffLogout } from '../../lib/adminApi.js';

const PROVIDER_LABEL = { identityiq: 'IdentityIQ', smartcredit: 'SmartCredit', myscoreiq: 'MyScoreIQ', other: 'Otro' };

function CreditMonitoringSection({ clientId }) {
  const [state, setState] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

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
    <>
      <h2 style={{ fontSize: 16, marginTop: 24 }}>Credenciales de monitoreo de crédito</h2>
      {state !== 'loaded' && (
        <button className="btn btn-outline" type="button" onClick={reveal} disabled={state === 'loading'}>
          {state === 'loading' ? 'Cargando…' : 'Ver credenciales'}
        </button>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {state === 'loaded' && data && (
        <div className="doc-tile">
          <p style={{ fontSize: 14 }}><strong>Proveedor:</strong> {PROVIDER_LABEL[data.provider] || data.provider}</p>
          <p style={{ fontSize: 14 }}><strong>Usuario:</strong> {data.username}</p>
          <p style={{ fontSize: 14 }}><strong>Contraseña:</strong> {data.password}</p>
          {data.phone && <p style={{ fontSize: 14 }}><strong>Teléfono:</strong> {data.phone}</p>}
          {data.securityWord && <p style={{ fontSize: 14 }}><strong>Palabra de seguridad:</strong> {data.securityWord}</p>}
        </div>
      )}
    </>
  );
}

const DOCUMENT_LABEL = {
  id_front: 'Identificación',
  id_back: 'Identificación (reverso)',
  selfie_with_id: 'Selfie con identificación',
  ssn_card: 'Tarjeta de Seguro Social',
  proof_of_residency: 'Comprobante de domicilio',
};

function formatCents(cents) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function defaultAgreementText(services, billingType, recurringInterval) {
  const total = services.reduce((sum, service) => sum + (Number(service.priceCents) || 0), 0);
  const lines = services.map((service) => `- ${service.name || '(sin nombre)'}: ${formatCents(Number(service.priceCents) || 0)}`);
  const billingLine = billingType === 'recurring'
    ? `Este acuerdo se factura de forma recurrente (${recurringInterval || 'mensual'}) por un total de ${formatCents(total)} por período.`
    : `Este acuerdo se factura como pago único por un total de ${formatCents(total)}.`;
  return `MEG Credit se compromete a realizar los siguientes servicios para el cliente:\n\n${lines.join('\n')}\n\n${billingLine}\n\nAl firmar este acuerdo, el cliente autoriza a MEG Credit a proceder con los servicios descritos y acepta los términos de pago indicados.`;
}

export default function AdminClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [billingType, setBillingType] = useState('one_time');
  const [recurringInterval, setRecurringInterval] = useState('month');
  const [agreementTitle, setAgreementTitle] = useState('Acuerdo de servicios MEG Credit');
  const [agreementText, setAgreementText] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      await fetchStaffMe();
      const [detailData, catalogData] = await Promise.all([fetchClientDetail(id), fetchCatalog()]);
      setDetail(detailData);
      setCatalog(catalogData.catalog || []);
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

  const addCatalogItem = (catalogId) => {
    const item = catalog.find((entry) => entry.id === catalogId);
    if (!item) return;
    setLineItems((prev) => [...prev, { catalogId: item.id, name: item.name, description: item.description, priceCents: item.default_price_cents }]);
  };

  const addCustomItem = () => {
    setLineItems((prev) => [...prev, { catalogId: null, name: '', description: '', priceCents: 0 }]);
  };

  const updateLineItem = (index, patch) => {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeLineItem = (index) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const generateAgreementText = () => {
    setAgreementText(defaultAgreementText(lineItems, billingType, recurringInterval));
  };

  const submitPlan = async (event) => {
    event.preventDefault();
    setStatus('sending');
    setError('');
    try {
      await assignPlan({
        clientId: id,
        services: lineItems.map((item) => ({ catalogId: item.catalogId, name: item.name, description: item.description, priceCents: Number(item.priceCents) })),
        billingType,
        recurringInterval: billingType === 'recurring' ? recurringInterval : undefined,
        agreementTitle,
        agreementText,
      });
      setLineItems([]);
      setAgreementText('');
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

  if (loading || !detail) {
    return (
      <AdminLayout title="Cliente">
        <div className="portal-card"><p className="portal-sub">Cargando…</p></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={detail.account.full_name} onLogout={handleLogout}>
      <div className="portal-card wide admin-section">
        <p className="portal-sub">{detail.account.email} · Estado: {detail.account.status}</p>

        <h2 style={{ fontSize: 16, marginTop: 24 }}>Documentos</h2>
        {detail.documents.length === 0 ? (
          <p className="portal-sub">Sin documentos subidos todavía.</p>
        ) : (
          <ul>
            {detail.documents.map((doc) => (
              <li key={doc.id} style={{ fontSize: 14, marginBottom: 4 }}>
                {DOCUMENT_LABEL[doc.document_type] || doc.document_type} — {doc.status}
              </li>
            ))}
          </ul>
        )}

        <CreditMonitoringSection clientId={id} />

        <h2 style={{ fontSize: 16, marginTop: 24 }}>Planes existentes</h2>
        {detail.plans.length === 0 ? (
          <p className="portal-sub">Todavía no se le ha armado un plan de servicios.</p>
        ) : (
          detail.plans.map((plan) => (
            <div className="doc-tile" key={plan.id} style={{ marginBottom: 12 }}>
              <span className="status-badge pending">{plan.status}</span>
              <p style={{ fontSize: 14 }}>{plan.billing_type === 'recurring' ? `Recurrente (${plan.recurring_interval})` : 'Pago único'} — Contrato: {plan.agreement?.status || 'sin contrato'}</p>
              <ul>
                {plan.services.map((service) => (
                  <li key={service.id} style={{ fontSize: 13 }}>{service.name} — {formatCents(service.price_cents)}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <div className="portal-card wide">
        <h2>Armar plan de servicios</h2>
        <div className="form-group">
          <label htmlFor="catalogSelect">Agregar desde catálogo</label>
          <select id="catalogSelect" defaultValue="" onChange={(event) => { addCatalogItem(event.target.value); event.target.value = ''; }}>
            <option value="" disabled>Selecciona un servicio</option>
            {catalog.map((item) => (
              <option key={item.id} value={item.id}>{item.name} — {formatCents(item.default_price_cents)}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-outline" type="button" onClick={addCustomItem} style={{ marginBottom: 16 }}>+ Servicio personalizado</button>

        {lineItems.map((item, index) => (
          <div key={index} className="doc-tile" style={{ marginBottom: 12 }}>
            <div className="admin-form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>Nombre</label>
                <input value={item.name} onChange={(event) => updateLineItem(index, { name: event.target.value })} required minLength="2" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Precio (USD)</label>
                <input type="number" min="0" step="0.01" value={item.priceCents / 100} onChange={(event) => updateLineItem(index, { priceCents: Math.round(Number(event.target.value) * 100) })} required />
              </div>
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea value={item.description} onChange={(event) => updateLineItem(index, { description: event.target.value })} maxLength="1000" />
            </div>
            <button className="btn btn-outline" type="button" onClick={() => removeLineItem(index)}>Quitar</button>
          </div>
        ))}

        {lineItems.length > 0 && (
          <form onSubmit={submitPlan}>
            <div className="form-group">
              <label className="group-label">Tipo de facturación</label>
              <label className="checkbox-item"><input type="radio" name="billingType" checked={billingType === 'one_time'} onChange={() => setBillingType('one_time')} /> Pago único</label>
              <label className="checkbox-item"><input type="radio" name="billingType" checked={billingType === 'recurring'} onChange={() => setBillingType('recurring')} /> Recurrente</label>
            </div>
            {billingType === 'recurring' && (
              <div className="form-group">
                <label htmlFor="interval">Intervalo</label>
                <select id="interval" value={recurringInterval} onChange={(event) => setRecurringInterval(event.target.value)}>
                  <option value="week">Semanal</option>
                  <option value="month">Mensual</option>
                  <option value="year">Anual</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="agreementTitle">Título del contrato</label>
              <input id="agreementTitle" value={agreementTitle} onChange={(event) => setAgreementTitle(event.target.value)} required minLength="2" />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="agreementText">Texto del contrato</label>
                <button className="btn btn-outline" type="button" onClick={generateAgreementText}>Generar sugerido</button>
              </div>
              <textarea id="agreementText" value={agreementText} onChange={(event) => setAgreementText(event.target.value)} required minLength="10" style={{ minHeight: 180 }} />
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn btn-primary submit-btn" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Enviando…' : 'Enviar plan y contrato al cliente'}
            </button>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}

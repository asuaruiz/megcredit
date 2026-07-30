import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/portal/PortalLayout.jsx';
import Modal from '../../components/portal/Modal.jsx';
import SignaturePad from '../../components/portal/SignaturePad.jsx';
import ServicesPanel from '../../components/portal/ServicesPanel.jsx';
import { fetchMe, fetchOnboardingStatus, logout, saveCreditMonitoring, signAgreement, uploadDocument } from '../../lib/portalApi.js';

const DOCUMENT_TILES = [
  { type: 'id_front', title: 'Identificación con foto', hint: 'Licencia de conducir o ID estatal vigente, legible.' },
  { type: 'selfie_with_id', title: 'Selfie con tu identificación', hint: 'Sostén tu identificación junto a tu rostro.' },
  { type: 'ssn_card', title: 'Tarjeta de Seguro Social', hint: 'Foto de tu tarjeta de Seguro Social.' },
  { type: 'proof_of_residency', title: 'Comprobante de domicilio', hint: 'Factura de servicio reciente con tu nombre y dirección.' },
];

const PROVIDER_OPTIONS = [
  { value: 'identityiq', label: 'IdentityIQ' },
  { value: 'smartcredit', label: 'SmartCredit' },
  { value: 'myscoreiq', label: 'MyScoreIQ' },
  { value: 'other', label: 'Otro' },
];

function AgreementModal({ agreement, onClose, onDone }) {
  const signatureRef = useRef(null);
  const [fullName, setFullName] = useState('');
  const [agree, setAgree] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (signatureRef.current.isEmpty()) {
      setError('Dibuja tu firma antes de continuar.');
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
        <div className="doc-tile" style={{ maxHeight: 220, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: 13, marginBottom: 16 }}>
          {agreement.body_text}
        </div>
        <div className="form-group">
          <label htmlFor="agreementFullName">Escribe tu nombre completo</label>
          <input id="agreementFullName" value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength="2" />
        </div>
        <div className="form-group">
          <label className="group-label">Dibuja tu firma</label>
          <SignaturePad ref={signatureRef} />
        </div>
        <label className="checkbox-item consent-checkbox">
          <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} required />
          <span>He leído y acepto los términos de este acuerdo de servicios.</span>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary submit-btn" type="submit" disabled={status === 'sending' || !agree} style={{ width: '100%', marginTop: 12 }}>
          {status === 'sending' ? 'Firmando…' : 'Firmar y aceptar'}
        </button>
      </form>
    </Modal>
  );
}

function CreditMonitoringModal({ onClose, onDone }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus('sending');
    setError('');
    try {
      await saveCreditMonitoring({
        provider: data.get('provider'),
        username: data.get('username'),
        password: data.get('password'),
        phone: data.get('phone'),
        securityWord: data.get('securityWord'),
      });
      onDone();
    } catch (submissionError) {
      setError(submissionError.message);
      setStatus('error');
    }
  };

  return (
    <Modal title="Credenciales de monitoreo de crédito" onClose={onClose}>
      <p className="portal-sub">Comparte el acceso a tu cuenta de monitoreo de crédito para que nuestro equipo pueda revisar tus reportes.</p>
      <form onSubmit={submit}>
        <div className="form-group">
          <label htmlFor="provider">Proveedor</label>
          <div className="select-wrapper">
            <select id="provider" name="provider" required defaultValue="">
              <option value="" disabled>Selecciona un proveedor</option>
              {PROVIDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="username">Usuario</label>
          <input id="username" name="username" required maxLength="254" autoComplete="off" />
        </div>
        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" required autoComplete="off" />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Teléfono (opcional)</label>
          <input id="phone" name="phone" type="tel" maxLength="40" />
        </div>
        <div className="form-group">
          <label htmlFor="securityWord">Palabra de seguridad (si creaste una)</label>
          <input id="securityWord" name="securityWord" maxLength="120" autoComplete="off" />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary submit-btn" type="submit" disabled={status === 'sending'} style={{ width: '100%' }}>
          {status === 'sending' ? 'Guardando…' : 'Guardar credenciales'}
        </button>
      </form>
    </Modal>
  );
}

function DocumentModal({ tile, onClose, onDone }) {
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
      {status === 'sending' && <p className="doc-hint">Subiendo…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}

export default function PortalDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState(null);
  const [activeModal, setActiveModal] = useState(null);

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

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login', { replace: true });
  };

  if (loading || !account || !status) {
    return (
      <PortalLayout>
        <div className="portal-card">
          <p className="portal-sub">Cargando tu cuenta…</p>
        </div>
      </PortalLayout>
    );
  }

  const items = [];
  if (status.agreement) {
    items.push({ key: 'agreement', label: 'Firmar contrato de servicios', done: status.agreement.status === 'signed' });
  }
  items.push({ key: 'creditMonitoring', label: 'Compartir acceso a tu cuenta de monitoreo de crédito', done: status.creditMonitoringSaved });
  DOCUMENT_TILES.forEach((tile) => items.push({ key: tile.type, label: tile.title, done: status.documentsStatus[tile.type] }));

  const doneCount = items.filter((item) => item.done).length;
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const activeDocumentTile = DOCUMENT_TILES.find((tile) => tile.type === activeModal);

  return (
    <PortalLayout onLogout={handleLogout}>
      <div className="portal-card wide">
        <h1>Hola, {account.full_name.split(' ')[0]}</h1>
        <p className="portal-sub">Completa estos pasos para avanzar con tu evaluación.</p>

        <div style={{ background: 'var(--bg-inset)', borderRadius: 999, height: 10, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }} />
        </div>
        <p className="doc-hint" style={{ marginBottom: 20 }}>{doneCount} de {items.length} completados ({progress}%)</p>

        {items.map((item) => (
          <div key={item.key} className="doc-tile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: item.done ? '#2E8555' : 'var(--text-3)', fontSize: 18 }}>{item.done ? '✓' : '○'}</span>
              <span>{item.label}</span>
            </div>
            {item.key === 'agreement' && item.done ? (
              <span className="status-badge approved">Firmado</span>
            ) : (
              <button className="btn btn-outline" type="button" onClick={() => setActiveModal(item.key)}>
                {item.done ? 'Actualizar' : 'Completar ahora'}
              </button>
            )}
          </div>
        ))}

        <ServicesPanel />
      </div>

      {activeModal === 'agreement' && status.agreement && (
        <AgreementModal agreement={status.agreement} onClose={() => setActiveModal(null)} onDone={() => { setActiveModal(null); load(); }} />
      )}
      {activeModal === 'creditMonitoring' && (
        <CreditMonitoringModal onClose={() => setActiveModal(null)} onDone={() => { setActiveModal(null); load(); }} />
      )}
      {activeDocumentTile && (
        <DocumentModal tile={activeDocumentTile} onClose={() => setActiveModal(null)} onDone={() => { setActiveModal(null); load(); }} />
      )}
    </PortalLayout>
  );
}

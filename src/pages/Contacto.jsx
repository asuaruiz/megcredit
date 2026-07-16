import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Contacto() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus('sending');
    setError('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          phone: data.get('phone'),
          email: data.get('email'),
          goal: data.get('goal'),
          message: data.get('message'),
          website: data.get('website'),
          consent: data.get('consent') === 'on',
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No pudimos enviar tu solicitud.');
      form.reset();
      setStatus('sent');
    } catch (submissionError) {
      setError(submissionError.message);
      setStatus('error');
    }
  };

  return (
    <>
      <section className="hero compact on-navy">
        <div className="hero-inner">
          <span className="eyebrow centered">Contacto</span>
          <h1>Cuéntanos qué quieres <em>lograr</em></h1>
          <p className="lead">Comparte tus datos y coordinaremos el primer paso de tu evaluación.</p>
        </div>
      </section>
      <div className="contact-main">
        <section className="info-panel">
          <h2>Hablemos con claridad</h2>
          <p>La consulta inicial nos permite conocer tu objetivo y explicarte qué información necesitamos para evaluar tu caso.</p>
          <div className="contact-method">
            <span className="contact-icon">@</span>
            <div className="contact-method-text">
              <strong>Correo electrónico</strong>
              <a href="mailto:info@magicenterprisegroup.com">info@magicenterprisegroup.com</a><br />
              <span>No envíes reportes, contraseñas ni credenciales por correo.</span>
            </div>
          </div>
          <hr className="divider" />
          <div className="hours-block">
            <h3>Ubicación</h3>
            <div className="hours-row"><span>Atención</span><span>Orlando, Florida</span></div>
            <div className="hours-row"><span>Idioma</span><span>Español</span></div>
          </div>
        </section>
        <section className="form-panel">
          {status === 'sent' ? (
            <div className="success-state" role="status">
              <span className="success-icon">✓</span>
              <h2>Recibimos tu solicitud</h2>
              <p>Nuestro equipo revisará tus datos de contacto y se comunicará contigo para explicarte el siguiente paso.</p>
              <button className="btn btn-outline" type="button" onClick={() => setStatus('idle')}>Enviar otra solicitud</button>
            </div>
          ) : (
            <>
              <h2>Solicita tu evaluación</h2>
              <p>Completa los campos obligatorios. No incluyas tu Seguro Social, información bancaria ni reportes crediticios.</p>
              <form onSubmit={submit}>
                <div className="form-row">
                  <div className="form-group"><label htmlFor="name">Nombre completo <span className="req">*</span></label><input id="name" name="name" required minLength="2" maxLength="120" autoComplete="name" /></div>
                  <div className="form-group"><label htmlFor="phone">Teléfono <span className="req">*</span></label><input id="phone" name="phone" required minLength="7" maxLength="40" type="tel" autoComplete="tel" /></div>
                </div>
                <div className="form-group"><label htmlFor="email">Correo electrónico <span className="req">*</span></label><input id="email" name="email" required maxLength="254" type="email" autoComplete="email" /></div>
                <div className="form-group"><label htmlFor="goal">¿Cuál es tu meta principal?</label><div className="select-wrapper"><select id="goal" name="goal" defaultValue=""><option value="" disabled>Selecciona una opción</option><option>Comprar una vivienda</option><option>Financiar un vehículo</option><option>Preparar mi negocio</option><option>Mejorar mi salud crediticia</option><option>Otra meta</option></select></div></div>
                <div className="form-group"><label htmlFor="message">Cuéntanos brevemente tu situación</label><textarea id="message" name="message" maxLength="2000" placeholder="¿Qué te gustaría entender o resolver?" /></div>
                <div className="honeypot" aria-hidden="true"><label htmlFor="website">Sitio web</label><input id="website" name="website" tabIndex="-1" autoComplete="off" /></div>
                <label className="checkbox-item consent-checkbox"><input type="checkbox" name="consent" required /> <span>Acepto que Magic Enterprise Group use mis datos para responder esta solicitud, según la <Link to="/privacidad">política de privacidad</Link>.</span></label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="btn btn-primary submit-btn" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Enviando…' : 'Solicitar mi evaluación'}</button>
                <p className="form-note">Tus datos se envían mediante una conexión cifrada. No se prometen resultados específicos.</p>
              </form>
            </>
          )}
        </section>
      </div>
    </>
  );
}

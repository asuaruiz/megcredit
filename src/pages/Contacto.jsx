import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';

export default function Contacto() {
  const { t } = useLanguage();
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
      if (!response.ok) throw new Error(result.error || t('contacto.errorGeneric'));
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
          <span className="eyebrow centered">{t('contacto.eyebrow')}</span>
          <h1>{t('contacto.titlePart1')} <em>{t('contacto.titleEm')}</em></h1>
          <p className="lead">{t('contacto.lead')}</p>
        </div>
      </section>
      <div className="contact-main">
        <section className="info-panel">
          <h2>{t('contacto.infoTitle')}</h2>
          <p>{t('contacto.infoText')}</p>
          <div className="contact-method">
            <span className="contact-icon">@</span>
            <div className="contact-method-text">
              <strong>{t('contacto.emailLabel')}</strong>
              <a href="mailto:info@magicenterprisegroup.com">info@magicenterprisegroup.com</a><br />
              <span>{t('contacto.emailWarning')}</span>
            </div>
          </div>
          <hr className="divider" />
          <div className="hours-block">
            <h3>{t('contacto.locationTitle')}</h3>
            <div className="hours-row"><span>{t('contacto.attentionLabel')}</span><span>{t('contacto.attentionValue')}</span></div>
            <div className="hours-row"><span>{t('contacto.languageLabel')}</span><span>{t('contacto.languageValue')}</span></div>
          </div>
        </section>
        <section className="form-panel">
          {status === 'sent' ? (
            <div className="success-state" role="status">
              <span className="success-icon">✓</span>
              <h2>{t('contacto.successTitle')}</h2>
              <p>{t('contacto.successText')}</p>
              <button className="btn btn-outline" type="button" onClick={() => setStatus('idle')}>{t('contacto.successButton')}</button>
            </div>
          ) : (
            <>
              <h2>{t('contacto.formTitle')}</h2>
              <p>{t('contacto.formLead')}</p>
              <form onSubmit={submit}>
                <div className="form-row">
                  <div className="form-group"><label htmlFor="name">{t('contacto.nameLabel')} <span className="req">*</span></label><input id="name" name="name" required minLength="2" maxLength="120" autoComplete="name" /></div>
                  <div className="form-group"><label htmlFor="phone">{t('contacto.phoneLabel')} <span className="req">*</span></label><input id="phone" name="phone" required minLength="7" maxLength="40" type="tel" autoComplete="tel" /></div>
                </div>
                <div className="form-group"><label htmlFor="email">{t('contacto.emailFieldLabel')} <span className="req">*</span></label><input id="email" name="email" required maxLength="254" type="email" autoComplete="email" /></div>
                <div className="form-group"><label htmlFor="goal">{t('contacto.goalLabel')}</label><div className="select-wrapper"><select id="goal" name="goal" defaultValue=""><option value="" disabled>{t('contacto.goalPlaceholder')}</option><option>{t('contacto.goalOption1')}</option><option>{t('contacto.goalOption2')}</option><option>{t('contacto.goalOption3')}</option><option>{t('contacto.goalOption4')}</option><option>{t('contacto.goalOption5')}</option></select></div></div>
                <div className="form-group"><label htmlFor="message">{t('contacto.messageLabel')}</label><textarea id="message" name="message" maxLength="2000" placeholder={t('contacto.messagePlaceholder')} /></div>
                <div className="honeypot" aria-hidden="true"><label htmlFor="website">{t('contacto.websiteLabel')}</label><input id="website" name="website" tabIndex="-1" autoComplete="off" /></div>
                <label className="checkbox-item consent-checkbox"><input type="checkbox" name="consent" required /> <span>{t('contacto.consentText')} <Link to="/privacidad">{t('contacto.consentLink')}</Link>.</span></label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="btn btn-primary submit-btn" type="submit" disabled={status === 'sending'}>{status === 'sending' ? t('contacto.sendingButton') : t('contacto.submitButton')}</button>
                <p className="form-note">{t('contacto.formNote')}</p>
              </form>
            </>
          )}
        </section>
      </div>
    </>
  );
}

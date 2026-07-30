import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';

export default function Legal({ tab }) {
  const { t } = useLanguage();
  const privacy = tab === 'privacidad';
  return <><section className="hero compact on-navy"><div className="hero-inner"><span className="eyebrow centered">{t('legal.eyebrow')}</span><h1>{privacy ? t('legal.privacyTitle') : t('legal.termsTitle')}</h1></div></section><nav className="tab-nav"><Link className={`tab-btn ${!privacy ? 'active' : ''}`} to="/terminos">{t('legal.tabTerms')}</Link><Link className={`tab-btn ${privacy ? 'active' : ''}`} to="/privacidad">{t('legal.tabPrivacy')}</Link></nav><div className="legal-content"><span className="date-badge">{t('legal.lastUpdated')}</span>{privacy ? <><section><h2>{t('legal.privacySection1Title')}</h2><p>{t('legal.privacySection1Text')}</p></section><section><h2>{t('legal.privacySection2Title')}</h2><p>{t('legal.privacySection2Text')}</p></section><section><h2>{t('legal.privacySection3Title')}</h2><p>{t('legal.privacySection3Text')}</p></section><div className="warning-box"><p>{t('legal.privacyWarning')}</p></div></> : <><section><h2>{t('legal.termsSection1Title')}</h2><p>{t('legal.termsSection1Text')}</p></section><section><h2>{t('legal.termsSection2Title')}</h2><p>{t('legal.termsSection2Text')}</p></section><section><h2>{t('legal.termsSection3Title')}</h2><p>{t('legal.termsSection3Text')}</p></section><div className="warning-box"><p>{t('legal.termsWarning')}</p></div></>}</div></>;
}

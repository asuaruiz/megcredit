import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';

export default function Nosotros() {
  const { t } = useLanguage();
  return <><section className="hero compact on-navy"><div className="hero-inner"><span className="eyebrow centered">{t('nosotros.eyebrow')}</span><h1>{t('nosotros.titlePart1')} <em>{t('nosotros.titleEm')}</em></h1><p className="lead">{t('nosotros.lead')}</p></div></section><section className="section"><div className="container-narrow"><span className="eyebrow">{t('nosotros.eyebrow2')}</span><h2>{t('nosotros.title2')}</h2><div className="signature"><p>{t('nosotros.quote')}</p><cite>{t('nosotros.quoteCite')}</cite></div><p>{t('nosotros.bodyText')}</p><div className="steps about-steps"><article className="step"><h3>{t('nosotros.step1Title')}</h3><p>{t('nosotros.step1Text')}</p></article><article className="step"><h3>{t('nosotros.step2Title')}</h3><p>{t('nosotros.step2Text')}</p></article><article className="step"><h3>{t('nosotros.step3Title')}</h3><p>{t('nosotros.step3Text')}</p></article><article className="step"><h3>{t('nosotros.step4Title')}</h3><p>{t('nosotros.step4Text')}</p></article></div><div className="hero-actions"><Link className="btn btn-primary" to="/contacto">{t('nosotros.ctaButton')}</Link></div></div></section></>;
}

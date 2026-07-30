import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';

export default function Servicios() {
  const { t } = useLanguage();
  return <><section className="hero compact on-navy"><div className="hero-inner"><span className="eyebrow centered">{t('servicios.eyebrow')}</span><h1>{t('servicios.titlePart1')} <em>{t('servicios.titleEm')}</em></h1><p className="lead">{t('servicios.lead')}</p></div></section><section className="section"><div className="container"><div className="card-grid"><article className="card service-card"><h2>{t('servicios.card1Title')}</h2><p>{t('servicios.card1Text')}</p></article><article className="card service-card"><h2>{t('servicios.card2Title')}</h2><p>{t('servicios.card2Text')}</p></article><article className="card service-card"><h2>{t('servicios.card3Title')}</h2><p>{t('servicios.card3Text')}</p></article><article className="card service-card"><h2>{t('servicios.card4Title')}</h2><p>{t('servicios.card4Text')}</p></article></div></div></section><section className="section"><div className="container"><div className="cta-banner on-navy"><h2>{t('servicios.ctaTitlePart1')} <em>{t('servicios.ctaTitleEm')}</em></h2><p>{t('servicios.ctaText')}</p><Link className="btn btn-primary" to="/#evaluacion">{t('servicios.ctaButton')}</Link></div></div></section></>;
}

import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { Lockup } from './Logo.jsx';

export default function Footer() {
  const { t, language } = useLanguage();

  return (
    <footer className="site-footer">
      <div className="footer-lockup">
        <Lockup vertical onNavy markSize={64} />
      </div>
      <p className="footer-tagline">&ldquo;Credit is more than a three-digit number.&rdquo;</p>

      <div className="footer-links">
        <Link to="/servicios">{t('footer.services')}</Link>
        <Link to="/nosotros">{t('footer.about')}</Link>
        <Link to={language === 'en' ? '/en/blog' : '/blog'}>{t('footer.blog')}</Link>
        <Link to="/contacto">{t('footer.contact')}</Link>
        <Link to="/terminos">{t('footer.terms')}</Link>
        <Link to="/privacidad">{t('footer.privacy')}</Link>
      </div>

      <p className="footer-legal">
        {t('footer.copyright')} ·{' '}
        <a href="mailto:info@magicenterprisegroup.com">{t('footer.email')}</a>
        {' · '}<a href="tel:+14077358696">{t('footer.phone')}</a>
        <br />
        {t('footer.fcraDisclaimer')}
        <br />
        {t('footer.creditDisclaimer')}
      </p>

      <p className="footer-credit">
        {t('footer.madeBy')}
      </p>
    </footer>
  );
}

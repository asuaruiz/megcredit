import { Link } from 'react-router-dom';
import { Lockup } from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-lockup">
        <Lockup vertical onNavy markSize={64} />
      </div>
      <p className="footer-tagline">“Credit is more than a three-digit number.”</p>

      <div className="footer-links">
        <Link to="/servicios">Servicios</Link>
        <Link to="/nosotros">Nosotros</Link>
        <Link to="/blog">Blog</Link>
        <Link to="/contacto">Contacto</Link>
        <Link to="/terminos">Términos de servicio</Link>
        <Link to="/privacidad">Política de privacidad</Link>
      </div>

      <p className="footer-legal">
        © 2026 Magic Enterprise Group · Orlando, Florida ·{' '}
        <a href="mailto:info@magicenterprisegroup.com">info@magicenterprisegroup.com</a>
        {' · '}<a href="tel:+14077358696">+1 407-735-8696</a>
        <br />
        Operamos bajo la Fair Credit Reporting Act (FCRA) y la Credit Repair Organizations Act (CROA).
        <br />
        Ninguna empresa puede garantizar legalmente la eliminación de información correcta y verificable de un reporte de crédito.
      </p>
    </footer>
  );
}

import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { Lockup } from './Logo.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import LanguageSelector from './LanguageSelector.jsx';

export default function Nav() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const LINKS = [
    { to: '/', labelKey: 'nav.home', end: true },
    { to: '/servicios', labelKey: 'nav.services' },
    { to: '/nosotros', labelKey: 'nav.about' },
    { to: '/blog', labelKey: 'nav.blog' },
    { to: '/contacto', labelKey: 'nav.contact' },
  ];

  return (
    <nav className="site-nav">
      <Link to="/" className="nav-logo" title={t('nav.logoTitle')} onClick={close}>
        <Lockup markSize={42} />
      </Link>

      <div className="nav-links" role="navigation" aria-label={t('nav.mainNav')}>
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
            {t(l.labelKey)}
          </NavLink>
        ))}
      </div>

      <div className="nav-right">
        <LanguageSelector />
        <ThemeToggle />
        <Link to="/contacto" className="btn btn-primary btn-nav">
          {t('nav.freeConsultation')}
        </Link>
        <button
          type="button"
          className="nav-burger"
          aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="7" x2="21" y2="7" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="17" x2="21" y2="17" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="nav-mobile">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="nav-link" onClick={close}>
              {t(l.labelKey)}
            </NavLink>
          ))}
          <Link to="/contacto" className="btn btn-primary" onClick={close}>
            {t('nav.freeConsultation')}
          </Link>
        </div>
      )}
    </nav>
  );
}

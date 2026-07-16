import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Lockup } from './Logo.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const LINKS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/servicios', label: 'Servicios' },
  { to: '/nosotros', label: 'Nosotros' },
  { to: '/blog', label: 'Blog' },
  { to: '/contacto', label: 'Contacto' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav className="site-nav">
      <Link to="/" className="nav-logo" title="Magic Enterprise Group — inicio" onClick={close}>
        <Lockup markSize={42} />
      </Link>

      <div className="nav-links" role="navigation" aria-label="Principal">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
            {l.label}
          </NavLink>
        ))}
      </div>

      <div className="nav-right">
        <ThemeToggle />
        <Link to="/contacto" className="btn btn-primary btn-nav">
          Consulta gratuita
        </Link>
        <button
          type="button"
          className="nav-burger"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
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
              {l.label}
            </NavLink>
          ))}
          <Link to="/contacto" className="btn btn-primary" onClick={close}>
            Consulta gratuita
          </Link>
        </div>
      )}
    </nav>
  );
}

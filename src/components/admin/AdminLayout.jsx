import { NavLink } from 'react-router-dom';
import { Lockup } from '../Logo.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import '../../styles/admin.css';

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 20a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4" />
      <circle cx="10" cy="7" r="3.4" />
      <path d="M16 4.2a3.4 3.4 0 0 1 0 6.4M20 20a3.6 3.6 0 0 0-3.2-3.9" />
    </svg>
  );
}

function IconCatalog() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function IconContracts() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></svg>;
}

export default function AdminLayout({ children, onLogout, title }) {
  const { t } = useLanguage();
  const NAV_ITEMS = [
    { to: '/admin/clientes', label: t('adminLayout.navClients'), Icon: IconUsers },
    { to: '/admin/catalogo', label: t('adminLayout.navCatalog'), Icon: IconCatalog },
    { to: '/admin/contratos', label: t('adminLayout.navContracts'), Icon: IconContracts },
  ];
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <Lockup vertical onNavy markSize={30} />
        </div>
        <nav className="admin-nav">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
        {onLogout && (
          <button className="admin-logout" type="button" onClick={onLogout}>
            <IconLogout />
            {t('adminLayout.logout')}
          </button>
        )}
      </aside>
      <div className="admin-content">
        {title && (
          <header className="admin-topbar">
            <h2>{title}</h2>
          </header>
        )}
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}

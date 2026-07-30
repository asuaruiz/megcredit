import { NavLink } from 'react-router-dom';
import { Lockup } from '../Logo.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import '../../styles/admin.css';

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9h12v-9" />
    </svg>
  );
}

function IconDispute() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 20 6.5v5c0 4.5-3.2 7.7-8 9.5-4.8-1.8-8-5-8-9.5v-5Z" />
      <path d="M12 8.5v4.2M12 15.5h.01" />
    </svg>
  );
}

function IconMessages() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h16v10H8l-4 4Z" />
    </svg>
  );
}

function IconFinances() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20V10M11 20V4M18 20v-7" />
    </svg>
  );
}

function IconInvoices() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

function IconCredit() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9.5h18M7 14.5h4" />
    </svg>
  );
}

function IconResources() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3Z" />
      <path d="M17 4h-1" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H11a1.7 1.7 0 0 0 1-1.5V5a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V11c.1.7.6 1.3 1.5 1.5H19a2 2 0 1 1 0 4Z" />
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

export default function PortalSidebarLayout({ children, onLogout, title }) {
  const { t } = useLanguage();

  const NAV_ITEMS = [
    { to: '/portal/dashboard', label: t('portalSidebar.home'), Icon: IconHome },
    { to: '/portal/disputas', label: t('portalSidebar.disputes'), Icon: IconDispute },
    { to: '/portal/mensajes', label: t('portalSidebar.messages'), Icon: IconMessages },
    { to: '/portal/finanzas', label: t('portalSidebar.finances'), Icon: IconFinances },
    { to: '/portal/facturas', label: t('portalSidebar.invoices'), Icon: IconInvoices },
    { to: '/portal/credito', label: t('portalSidebar.creditInfo'), Icon: IconCredit },
    { to: '/portal/recursos', label: t('portalSidebar.resources'), Icon: IconResources },
    { to: '/portal/configuracion', label: t('portalSidebar.settings'), Icon: IconSettings },
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
            {t('portalSidebar.logout')}
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

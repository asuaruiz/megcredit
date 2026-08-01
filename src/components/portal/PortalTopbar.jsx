import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Lockup } from '../Logo.jsx';
import ThemeToggle from '../ThemeToggle.jsx';
import LanguageSelector from '../LanguageSelector.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import '../../styles/admin.css';

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9h12v-9" />
    </svg>
  );
}

function IconCase() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3Z" />
      <path d="M17 4h-1" />
    </svg>
  );
}

function IconServices() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20V10M11 20V4M18 20v-7" />
    </svg>
  );
}

function initialsFor(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export default function PortalTopbar({ account, onLogout, onOpenCreditMonitoring }) {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const menuRef = useRef(null);

  const TABS = [
    { to: '/portal/inicio', label: t('portalTopbar.home'), Icon: IconHome },
    { to: '/portal/mi-caso', label: t('portalTopbar.myCase'), Icon: IconCase },
    { to: '/portal/servicios', label: t('portalTopbar.services'), Icon: IconServices },
  ];

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
        setShowProfile(false);
      }
    };
    const onKey = (event) => {
      if (event.key === 'Escape') { setMenuOpen(false); setShowProfile(false); }
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="portal-topbar on-navy">
        <Lockup onNavy markSize={30} />

        <nav className="portal-tabs" aria-label={t('portalTopbar.mainNav')}>
          {TABS.map(({ to, label }) => (
            <NavLink key={to} to={to} className="portal-tab">
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="account-menu" ref={menuRef}>
          <button
            type="button"
            className="account-menu-trigger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label={t('portalTopbar.accountMenu')}
          >
            {initialsFor(account?.full_name) || '·'}
          </button>

          {menuOpen && (
            <div className="account-menu-panel" role="menu">
              {!showProfile ? (
                <>
                  <button type="button" className="account-menu-item" role="menuitem" onClick={() => setShowProfile(true)}>
                    {t('portalTopbar.myProfile')}
                  </button>
                  <button
                    type="button"
                    className="account-menu-item"
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); onOpenCreditMonitoring(); }}
                  >
                    {t('portalTopbar.creditMonitoring')}
                  </button>
                  <div className="account-menu-controls">
                    <LanguageSelector />
                    <ThemeToggle />
                  </div>
                  <button type="button" className="account-menu-item danger" role="menuitem" onClick={onLogout}>
                    {t('portalTopbar.logout')}
                  </button>
                </>
              ) : (
                <div className="account-menu-profile">
                  <button type="button" className="account-menu-back" onClick={() => setShowProfile(false)}>
                    ← {t('portalTopbar.back')}
                  </button>
                  <div className="field-list">
                    <p className="ws-value">{account?.full_name}</p>
                    <p>{account?.email}</p>
                    {account?.phone && <p>{account.phone}</p>}
                    <p>{t('portalHome.statusLabel')}: {account?.status}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <nav className="portal-tabs-mobile" aria-label={t('portalTopbar.mainNav')}>
        {TABS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className="portal-tab-mobile">
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

import { Lockup } from '../Logo.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function PortalLayout({ children, onLogout }) {
  const { t } = useLanguage();
  return (
    <div className="portal-shell">
      <header className="portal-header on-navy">
        <Lockup onNavy markSize={34} />
        {onLogout && (
          <button className="btn btn-outline btn-nav" type="button" onClick={onLogout}>
            {t('portalLayout.logout')}
          </button>
        )}
      </header>
      <main className="portal-main">{children}</main>
    </div>
  );
}

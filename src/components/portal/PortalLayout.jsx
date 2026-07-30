import { Lockup } from '../Logo.jsx';

export default function PortalLayout({ children, onLogout }) {
  return (
    <div className="portal-shell">
      <header className="portal-header">
        <Lockup onNavy markSize={34} />
        {onLogout && (
          <button className="btn btn-outline btn-nav" type="button" onClick={onLogout} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
            Cerrar sesión
          </button>
        )}
      </header>
      <main className="portal-main">{children}</main>
    </div>
  );
}

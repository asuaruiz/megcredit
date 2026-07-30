import { Link } from 'react-router-dom';
import { Lockup } from '../Logo.jsx';

export default function AdminLayout({ children, onLogout }) {
  return (
    <div className="portal-shell">
      <header className="portal-header">
        <Lockup onNavy markSize={34} />
        <nav style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link to="/admin/clientes" style={{ color: '#fff', fontSize: 14 }}>Clientes</Link>
          <Link to="/admin/catalogo" style={{ color: '#fff', fontSize: 14 }}>Catálogo</Link>
          {onLogout && (
            <button className="btn btn-outline btn-nav" type="button" onClick={onLogout} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
              Cerrar sesión
            </button>
          )}
        </nav>
      </header>
      <main className="portal-main" style={{ alignItems: 'flex-start' }}>
        {children}
      </main>
    </div>
  );
}

import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import PortalLogin from './pages/portal/Login.jsx';
import PortalActivate from './pages/portal/Activate.jsx';
import PortalForgotPassword from './pages/portal/ForgotPassword.jsx';
import PortalResetPassword from './pages/portal/ResetPassword.jsx';
import PortalDashboard from './pages/portal/Dashboard.jsx';
import './styles/portal.css';

// Old portal URLs (pre-redesign) redirect here so bookmarks/emailed links
// still land somewhere useful, instead of 404ing. Preserves the query
// string — Stripe's checkout redirect still points at /portal/dashboard.
function PortalRedirect({ to }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}

export default function PortalApp() {
  return (
    <Routes>
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal/activar" element={<PortalActivate />} />
      <Route path="/portal/olvide-contrasena" element={<PortalForgotPassword />} />
      <Route path="/portal/restablecer" element={<PortalResetPassword />} />
      <Route path="/portal/inicio" element={<PortalDashboard />} />
      <Route path="/portal/mi-caso" element={<PortalDashboard />} />
      <Route path="/portal/servicios" element={<PortalDashboard />} />
      {/* Retired routes from the pre-redesign sidebar — redirect rather than 404 */}
      <Route path="/portal/dashboard" element={<PortalRedirect to="/portal/inicio" />} />
      <Route path="/portal/disputas" element={<PortalRedirect to="/portal/mi-caso" />} />
      <Route path="/portal/mensajes" element={<PortalRedirect to="/portal/inicio" />} />
      <Route path="/portal/finanzas" element={<PortalRedirect to="/portal/servicios" />} />
      <Route path="/portal/facturas" element={<PortalRedirect to="/portal/servicios" />} />
      <Route path="/portal/credito" element={<PortalRedirect to="/portal/inicio" />} />
      <Route path="/portal/recursos" element={<PortalRedirect to="/portal/inicio" />} />
      <Route path="/portal/configuracion" element={<PortalRedirect to="/portal/inicio" />} />
      <Route path="*" element={<PortalLogin />} />
    </Routes>
  );
}

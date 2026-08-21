import { Routes, Route } from 'react-router-dom';
import AdminLogin from './pages/admin/Login.jsx';
import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminClientDetail from './pages/admin/ClientDetail.jsx';
import AdminCatalog from './pages/admin/Catalog.jsx';
import AdminContracts from './pages/admin/Contracts.jsx';
import AdminEmailHistory from './pages/admin/EmailHistory.jsx';
import AdminBilling from './pages/admin/Billing.jsx';
import './styles/portal.css';

export default function AdminApp() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/clientes" element={<AdminDashboard />} />
      <Route path="/admin/clientes/:id" element={<AdminClientDetail />} />
      <Route path="/admin/emails" element={<AdminEmailHistory />} />
      <Route path="/admin/cobros" element={<AdminBilling />} />
      <Route path="/admin/catalogo" element={<AdminCatalog />} />
      <Route path="/admin/contratos" element={<AdminContracts />} />
      <Route path="*" element={<AdminDashboard />} />
    </Routes>
  );
}

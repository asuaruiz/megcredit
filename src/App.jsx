import { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext.jsx';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Servicios from './pages/Servicios.jsx';
import Nosotros from './pages/Nosotros.jsx';
import Blog from './pages/Blog.jsx';
import BlogPost from './pages/BlogPost.jsx';
import EnBlog from './pages/EnBlog.jsx';
import EnBlogPost from './pages/EnBlogPost.jsx';
import Contacto from './pages/Contacto.jsx';
import Legal from './pages/Legal.jsx';
import NotFound from './pages/NotFound.jsx';
import SEO from './components/SEO.jsx';
import PortalLogin from './pages/portal/Login.jsx';
import PortalActivate from './pages/portal/Activate.jsx';
import PortalForgotPassword from './pages/portal/ForgotPassword.jsx';
import PortalResetPassword from './pages/portal/ResetPassword.jsx';
import PortalDashboard from './pages/portal/Dashboard.jsx';
import AdminLogin from './pages/admin/Login.jsx';
import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminClientDetail from './pages/admin/ClientDetail.jsx';
import AdminCatalog from './pages/admin/Catalog.jsx';
import AdminContracts from './pages/admin/Contracts.jsx';
import AdminEmailHistory from './pages/admin/EmailHistory.jsx';
import AdminBilling from './pages/admin/Billing.jsx';
import './styles/portal.css';

// Old portal URLs (pre-redesign) redirect here so bookmarks/emailed links
// still land somewhere useful, instead of 404ing. Preserves the query
// string — Stripe's checkout redirect still points at /portal/dashboard.
function PortalRedirect({ to }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() => document.querySelector(hash)?.scrollIntoView());
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function AppContent() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const isPortal = pathname.startsWith('/portal');
  const isAdmin = pathname.startsWith('/admin');

  if (isPortal) {
    return (
      <>
        <ScrollToTop />
        <SEO />
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
      </>
    );
  }

  if (isAdmin) {
    return (
      <>
        <ScrollToTop />
        <SEO />
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
      </>
    );
  }

  return (
    <>
      <ScrollToTop />
      <SEO />
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/servicios" element={<Servicios />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/en/blog" element={<EnBlog />} />
          <Route path="/en/blog/:slug" element={<EnBlogPost />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/terminos" element={<Legal tab="terminos" />} />
          <Route path="/privacidad" element={<Legal tab="privacidad" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <a
        className="whatsapp-float"
        href="https://wa.me/14077358696?text=Necesito%20ayuda%20para%20la%20reparaci%C3%B3n%20de%20mi%20cr%C3%A9dito"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('whatsapp.ariaLabel')}
        title={t('whatsapp.title')}
      >
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16.04 3.2A12.67 12.67 0 0 0 5.33 22.64L3.2 28.8l6.34-2.08a12.65 12.65 0 1 0 6.5-23.52Zm0 22.96c-2.03 0-4.01-.6-5.69-1.72l-.41-.25-3.76 1.23 1.25-3.65-.27-.42a10.29 10.29 0 1 1 8.88 4.81Zm5.64-7.71c-.31-.16-1.83-.91-2.12-1.01-.28-.1-.49-.16-.7.16-.2.31-.8 1.01-.98 1.22-.18.21-.36.23-.67.08-.31-.16-1.31-.48-2.49-1.54a9.35 9.35 0 0 1-1.73-2.15c-.18-.31-.02-.48.14-.63.14-.14.31-.36.46-.54.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.15-.7-1.68-.95-2.3-.25-.6-.51-.52-.7-.53h-.59c-.2 0-.54.08-.82.39-.28.31-1.08 1.06-1.08 2.58s1.11 2.99 1.26 3.2c.16.21 2.18 3.33 5.28 4.67.74.32 1.31.51 1.76.65.74.23 1.41.2 1.94.12.59-.09 1.83-.75 2.09-1.47.26-.72.26-1.34.18-1.47-.08-.13-.28-.21-.59-.36Z" />
        </svg>
        <span>{t('whatsapp.text')}</span>
      </a>
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

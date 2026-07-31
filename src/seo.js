import { posts } from './data/posts.jsx';

export const SITE_URL = 'https://www.megcredit.com';
export const SITE_NAME = 'Magic Enterprise Group';
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

const staticPages = {
  '/': {
    title: 'Reparación de crédito en español en Orlando | MEG Credit',
    description: 'Evaluación de Equifax, Experian y TransUnion, educación y estrategia responsable de reparación de crédito en español en Orlando, Florida.',
  },
  '/servicios': {
    title: 'Servicios de reparación de crédito | MEG Credit',
    description: 'Conoce nuestro proceso de evaluación, estrategia de disputas, educación crediticia y acompañamiento personalizado en español.',
  },
  '/nosotros': {
    title: 'Sobre Magic Enterprise Group | Crédito con claridad',
    description: 'Conoce el enfoque educativo, transparente y responsable de Magic Enterprise Group para orientar a familias y emprendedores.',
  },
  '/blog': {
    title: 'Blog de crédito y reportes crediticios | MEG Credit',
    description: 'Guías en español para entender tus reportes, puntajes, disputas y los pasos de una evaluación de crédito responsable.',
  },
  '/contacto': {
    title: 'Solicita una evaluación de crédito | MEG Credit',
    description: 'Cuéntanos tu meta y solicita una evaluación inicial de tus reportes de crédito con atención en español desde Orlando, Florida.',
  },
  '/terminos': {
    title: 'Términos de servicio | Magic Enterprise Group',
    description: 'Consulta los términos aplicables al sitio y los servicios informativos de Magic Enterprise Group.',
  },
  '/privacidad': {
    title: 'Política de privacidad | Magic Enterprise Group',
    description: 'Conoce cómo Magic Enterprise Group recopila, utiliza y protege la información que compartes con nosotros.',
  },
};

// Portal/admin routes are private (behind auth) and excluded from the sitemap,
// but SEO still owns document.title for them — without an entry here they fall
// through to the 404 title below, which is what the browser tab shows while
// logged into the dashboard.
const internalPages = {
  '/portal/login': { title: 'Iniciar sesión | Portal de clientes MEG Credit', description: 'Accede a tu portal de clientes de MEG Credit.' },
  '/portal/activar': { title: 'Activar tu cuenta | Portal de clientes MEG Credit', description: 'Activa tu cuenta para comenzar a usar tu portal de clientes.' },
  '/portal/dashboard': { title: 'Tu portal | MEG Credit', description: 'Revisa el estado de tu caso y tus puntajes de crédito.' },
  '/portal/disputas': { title: 'Disputas | Portal MEG Credit', description: 'Estado de tus disputas por buró de crédito.' },
  '/portal/mensajes': { title: 'Mensajes | Portal MEG Credit', description: 'Tus mensajes con el equipo de MEG Credit.' },
  '/portal/finanzas': { title: 'Finanzas | Portal MEG Credit', description: 'Tus planes de servicio y facturación.' },
  '/portal/facturas': { title: 'Facturas | Portal MEG Credit', description: 'Tu historial de facturas y pagos.' },
  '/portal/credito': { title: 'Información de crédito | Portal MEG Credit', description: 'Tus credenciales de monitoreo de crédito.' },
  '/portal/recursos': { title: 'Recursos | Portal MEG Credit', description: 'Recursos educativos sobre crédito.' },
  '/portal/configuracion': { title: 'Configuración | Portal MEG Credit', description: 'Ajustes de tu cuenta.' },
  '/admin/login': { title: 'Iniciar sesión | Panel de administración MEG Credit', description: 'Acceso para el equipo de MEG Credit.' },
  '/admin/clientes': { title: 'Clientes | Panel de administración MEG Credit', description: 'Administra las cuentas de clientes de MEG Credit.' },
  '/admin/catalogo': { title: 'Catálogo de servicios | Panel de administración MEG Credit', description: 'Administra el catálogo de servicios.' },
  '/admin/contratos': { title: 'Plantillas de contrato | Panel de administración MEG Credit', description: 'Administra las plantillas de contrato.' },
};

export const ROUTES = [
  ...Object.keys(staticPages),
  ...posts.map((post) => `/blog/${post.slug}`),
];

export function getPageMeta(pathname) {
  const cleanPath = pathname !== '/' ? pathname.replace(/\/$/, '') : pathname;
  const post = posts.find((item) => `/blog/${item.slug}` === cleanPath);

  if (post) {
    return {
      title: `${post.title} | MEG Credit`,
      description: post.excerpt,
      canonical: `${SITE_URL}${cleanPath}`,
      type: 'article',
      post,
    };
  }

  if (cleanPath.startsWith('/admin/clientes/')) {
    return {
      title: 'Detalle de cliente | Panel de administración MEG Credit',
      description: 'Detalle de cuenta, documentos y planes del cliente.',
      noindex: true,
      canonical: `${SITE_URL}${cleanPath}`,
      type: 'website',
    };
  }

  const internalPage = internalPages[cleanPath];
  if (internalPage) {
    return {
      ...internalPage,
      noindex: true,
      canonical: `${SITE_URL}${cleanPath}`,
      type: 'website',
    };
  }

  const page = staticPages[cleanPath] || {
    title: 'Página no encontrada | MEG Credit',
    description: 'La página solicitada no está disponible.',
    noindex: true,
  };

  return {
    ...page,
    canonical: `${SITE_URL}${cleanPath === '/' ? '' : cleanPath}`,
    type: 'website',
  };
}

export function getStructuredData(pathname) {
  const meta = getPageMeta(pathname);
  const organization = {
    '@type': ['Organization', 'ProfessionalService'],
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: 'MEG Credit',
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    email: 'info@magicenterprisegroup.com',
    telephone: '+1-407-735-8696',
    areaServed: { '@type': 'City', name: 'Orlando, Florida' },
    knowsLanguage: ['es', 'en'],
  };

  if (pathname === '/') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        organization,
        {
          '@type': 'WebSite',
          '@id': `${SITE_URL}/#website`,
          url: SITE_URL,
          name: SITE_NAME,
          inLanguage: 'es-US',
          publisher: { '@id': `${SITE_URL}/#organization` },
        },
        {
          '@type': 'Service',
          name: 'Evaluación y estrategia de crédito',
          provider: { '@id': `${SITE_URL}/#organization` },
          areaServed: 'Orlando, Florida',
          serviceType: 'Educación, evaluación y estrategia de crédito',
        },
      ],
    };
  }

  if (meta.post) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: meta.post.title,
      description: meta.post.excerpt,
      datePublished: meta.post.datePublished,
      dateModified: meta.post.dateModified,
      inLanguage: 'es-US',
      mainEntityOfPage: meta.canonical,
      author: { '@id': `${SITE_URL}/#organization`, name: SITE_NAME },
      publisher: { '@id': `${SITE_URL}/#organization`, name: SITE_NAME },
      image: DEFAULT_IMAGE,
    };
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: meta.title,
    description: meta.description,
    url: meta.canonical,
    inLanguage: 'es-US',
    isPartOf: { '@id': `${SITE_URL}/#website` },
  };
}

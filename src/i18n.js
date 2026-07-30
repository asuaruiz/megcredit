export const translations = {
  en: {
    // Navigation
    nav: {
      home: 'Home',
      services: 'Services',
      about: 'About',
      blog: 'Blog',
      contact: 'Contact',
      freeConsultation: 'Free consultation',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
    },
    // Footer
    footer: {
      services: 'Services',
      about: 'About',
      blog: 'Blog',
      contact: 'Contact',
      terms: 'Terms & Conditions',
      privacy: 'Privacy Policy',
      copyright: '© 2026 Magic Enterprise Group · Orlando, Florida',
      email: 'info@magicenterprisegroup.com',
      phone: '+1 407-735-8696',
      fcraDisclaimer: 'We operate under the Fair Credit Reporting Act (FCRA) and Credit Repair Organizations Act (CROA).',
      creditDisclaimer: 'No company can legally guarantee the removal of accurate and verifiable information from a credit report.',
      madeBy: 'Made with love by andflow.cl',
    },
    // Home
    home: {
      title: 'Credit Repair Services',
      subtitle: 'Rebuild your credit score',
    },
    // Contact
    contact: {
      title: 'Contact us',
      email: 'Email',
      message: 'Message',
      send: 'Send',
      placeholderEmail: 'your@email.com',
      placeholderMessage: 'Your message here...',
    },
    // Portal
    portal: {
      login: 'Login',
      email: 'Email',
      password: 'Password',
      signIn: 'Sign in',
      logout: 'Logout',
      dashboard: 'Dashboard',
      activate: 'Activate account',
    },
    // Admin
    admin: {
      login: 'Admin Login',
      clients: 'Clients',
      catalog: 'Catalog',
      inviteClient: 'Invite client',
      fullName: 'Full name',
      email: 'Email',
      sendInvitation: 'Send invitation',
      sending: 'Sending...',
      couldNotCreateInvitation: 'We couldn\'t create the invitation.',
      totalClients: 'Total clients',
      active: 'Active',
      invited: 'Invited',
      suspended: 'Suspended',
      allClients: 'All clients',
      noClientsRegistered: 'No clients registered yet.',
      loading: 'Loading...',
      name: 'Name',
      email_header: 'Email',
      status: 'Status',
      documents: 'Documents',
      plan: 'Plan',
    },
    // General
    general: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      backToHome: 'Back to Home',
    },
  },
  es: {
    // Navigation
    nav: {
      home: 'Inicio',
      services: 'Servicios',
      about: 'Nosotros',
      blog: 'Blog',
      contact: 'Contacto',
      freeConsultation: 'Consulta gratuita',
      openMenu: 'Abrir menú',
      closeMenu: 'Cerrar menú',
    },
    // Footer
    footer: {
      services: 'Servicios',
      about: 'Nosotros',
      blog: 'Blog',
      contact: 'Contacto',
      terms: 'Términos de servicio',
      privacy: 'Política de privacidad',
      copyright: '© 2026 Magic Enterprise Group · Orlando, Florida',
      email: 'info@magicenterprisegroup.com',
      phone: '+1 407-735-8696',
      fcraDisclaimer: 'Operamos bajo la Fair Credit Reporting Act (FCRA) y la Credit Repair Organizations Act (CROA).',
      creditDisclaimer: 'Ninguna empresa puede garantizar legalmente la eliminación de información correcta y verificable de un reporte de crédito.',
      madeBy: 'Hecho con ♥ por andflow.cl',
    },
    // Home
    home: {
      title: 'Servicios de Reparación de Crédito',
      subtitle: 'Reconstruye tu puntuación de crédito',
    },
    // Contact
    contact: {
      title: 'Contacto',
      email: 'Correo electrónico',
      message: 'Mensaje',
      send: 'Enviar',
      placeholderEmail: 'tu@email.com',
      placeholderMessage: 'Tu mensaje aquí...',
    },
    // Portal
    portal: {
      login: 'Iniciar sesión',
      email: 'Correo electrónico',
      password: 'Contraseña',
      signIn: 'Iniciar sesión',
      logout: 'Cerrar sesión',
      dashboard: 'Panel de control',
      activate: 'Activar cuenta',
    },
    // Admin
    admin: {
      login: 'Acceso de administrador',
      clients: 'Clientes',
      catalog: 'Catálogo',
      inviteClient: 'Invitar cliente',
      fullName: 'Nombre completo',
      email: 'Correo electrónico',
      sendInvitation: 'Enviar invitación',
      sending: 'Enviando...',
      couldNotCreateInvitation: 'No pudimos crear la invitación.',
      totalClients: 'Total de clientes',
      active: 'Activos',
      invited: 'Invitados',
      suspended: 'Suspendido',
      allClients: 'Todos los clientes',
      noClientsRegistered: 'Todavía no hay clientes registrados.',
      loading: 'Cargando...',
      name: 'Nombre',
      email_header: 'Correo',
      status: 'Estado',
      documents: 'Documentos',
      plan: 'Plan',
    },
    // General
    general: {
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      cancel: 'Cancelar',
      save: 'Guardar',
      delete: 'Eliminar',
      edit: 'Editar',
      backToHome: 'Volver a inicio',
    },
  },
};

export const getTranslation = (lang, path) => {
  const keys = path.split('.');
  let value = translations[lang];
  for (const key of keys) {
    value = value?.[key];
  }
  return value || `[${path}]`;
};

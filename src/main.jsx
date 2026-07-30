import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/fonts.css';
import './styles/global.css';

const root = document.getElementById('root');
const app = (
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

const isAppRoute = window.location.pathname.startsWith('/portal') || window.location.pathname.startsWith('/admin');

if (root.hasChildNodes() && !isAppRoute) hydrateRoot(root, app);
else createRoot(root).render(app);

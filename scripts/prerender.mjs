import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const root = process.cwd();
const dist = path.join(root, 'dist');
const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
const vite = await createServer({ root, appType: 'custom', server: { middlewareMode: true } });

try {
  const { render } = await vite.ssrLoadModule('/src/entry-server.jsx');
  const { ROUTES, getPageMeta, getStructuredData, DEFAULT_IMAGE, SITE_NAME } = await vite.ssrLoadModule('/src/seo.js');

  const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const safeJson = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');

  for (const route of ROUTES) {
    const meta = getPageMeta(route);
    const appHtml = render(route);
    const alternateLinks = (meta.alternates || [])
      .map(({ hreflang, href }) => `\n    <link rel="alternate" hreflang="${hreflang}" href="${escape(href)}">`)
      .join('');
    const head = `
    <title>${escape(meta.title)}</title>
    <meta name="description" content="${escape(meta.description)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${escape(meta.canonical)}">${alternateLinks}
    <meta property="og:title" content="${escape(meta.title)}">
    <meta property="og:description" content="${escape(meta.description)}">
    <meta property="og:type" content="${meta.type}">
    <meta property="og:url" content="${escape(meta.canonical)}">
    <meta property="og:image" content="${DEFAULT_IMAGE}">
    <meta property="og:site_name" content="${SITE_NAME}">
    <meta property="og:locale" content="${meta.lang === 'en' ? 'en_US' : 'es_US'}">
    <meta name="twitter:card" content="summary_large_image">
    <script id="page-schema" type="application/ld+json">${safeJson(getStructuredData(route))}</script>`;

    const html = template
      .replace(/<html lang="[^"]*"/, `<html lang="${meta.lang || 'es'}"`)
      .replace(/<title>[\s\S]*?<\/title>/, '')
      .replace(/<meta\s+name="description"[\s\S]*?>/, '')
      .replace('</head>', `${head}\n  </head>`)
      .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

    if (route === '/') {
      await fs.writeFile(path.join(dist, 'index.html'), html);
    } else {
      const outputFile = path.join(dist, `${route.slice(1)}.html`);
      await fs.mkdir(path.dirname(outputFile), { recursive: true });
      await fs.writeFile(outputFile, html);
    }
  }
} finally {
  await vite.close();
}

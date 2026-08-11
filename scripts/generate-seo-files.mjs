import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const root = process.cwd();
const vite = await createServer({ root, appType: 'custom', server: { middlewareMode: true } });

try {
  const { SITE_URL, ROUTES, getPageMeta } = await vite.ssrLoadModule('/src/seo.js');
  const { posts } = await vite.ssrLoadModule('/src/data/posts.jsx');
  const { indexalPostsForLanguage } = await vite.ssrLoadModule('/src/data/indexalPosts.js');

  const today = new Date().toISOString().slice(0, 10);
  const priorities = { '/': '1.0', '/servicios': '0.9', '/blog': '0.8', '/contacto': '0.8', '/en/blog': '0.7' };
  const excludedPrefixes = ['/portal', '/admin'];

  const sitemapEntries = ROUTES
    .filter((route) => !excludedPrefixes.some((prefix) => route.startsWith(prefix)))
    .map((route) => {
      const meta = getPageMeta(route);
      if (meta.noindex) return '';
      const priority = priorities[route] || (route.startsWith('/blog/') || route.startsWith('/en/blog/') ? '0.8' : '0.5');
      const alternates = (meta.alternates || [])
        .map(({ hreflang, href }) => `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`)
        .join('');
      return `  <url><loc>${meta.canonical}</loc>${alternates}<lastmod>${today}</lastmod><priority>${priority}</priority></url>`;
    })
    .filter(Boolean);

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sitemapEntries.join('\n')}\n</urlset>\n`;
  await fs.writeFile(path.join(root, 'public/sitemap.xml'), sitemap);
  console.log(`Wrote sitemap.xml with ${sitemapEntries.length} URLs.`);

  const esArticles = [
    ...posts.map((post) => `- [${post.title}](${SITE_URL}/blog/${post.slug}): ${post.excerpt}`),
    ...indexalPostsForLanguage('es').map((post) => `- [${post.title}](${SITE_URL}/blog/${post.slug}): ${post.metaDescription || post.title}`),
  ].join('\n');
  const enArticles = indexalPostsForLanguage('en')
    .map((post) => `- [${post.title}](${SITE_URL}/en/blog/${post.slug}): ${post.metaDescription || post.title}`)
    .join('\n');

  const llmsTxt = `# Magic Enterprise Group (MEG Credit)

> Magic Enterprise Group provides Spanish-language credit education, credit report evaluation, and responsible credit strategy for families and entrepreneurs in Orlando, Florida. The company does not guarantee score increases or removal of accurate, complete, and verifiable information.

Official website: ${SITE_URL}
Primary language: Spanish (es-US), with an English-language blog section
Service area: Orlando, Florida, United States
Phone: +1 407-735-8696
Email: info@magicenterprisegroup.com

## Primary pages

- [Home](${SITE_URL}/): Overview of MEG Credit, services, and the five-step credit evaluation process.
- [Services](${SITE_URL}/servicios): Credit report evaluation, dispute strategy, credit education, and ongoing guidance.
- [About](${SITE_URL}/nosotros): The company's educational, transparent, and responsible approach.
- [Contact](${SITE_URL}/contacto): Request an initial credit evaluation. Users should not submit passwords, banking information, full Social Security numbers, or credit reports through the contact form.
- [Blog](${SITE_URL}/blog): Educational articles about credit reports, credit scores, and responsible preparation.
- [English blog](${SITE_URL}/en/blog): English-language translations of selected articles.

## Educational resources (Spanish)

${esArticles}
${enArticles ? `\n## Educational resources (English)\n\n${enArticles}\n` : ''}
## Evaluation process

1. The client provides contact information and describes their financial goal.
2. The client obtains current reports from Equifax, Experian, and TransUnion.
3. The client reviews the documents and notes unfamiliar or potentially incorrect information.
4. MEG Credit coordinates an appropriate protected channel before receiving sensitive reports. Reports and credentials should not be sent through ordinary email or the public contact form.
5. MEG Credit reviews the available information and explains observations, possible options, and recommended next steps.

## Important facts

- Credit reports and credit scores are different.
- Consumers may have more than one credit score because lenders and services can use different models and data.
- Accurate, complete, and verifiable negative information cannot legally be removed simply because it is negative.
- Results vary by individual file and by responses from credit bureaus, furnishers, creditors, and other third parties.
- Website content is general educational information and is not legal advice.
- SmartCredit links on the website may be affiliate links, and Magic Enterprise Group may receive compensation from qualifying registrations.

## Legal and privacy

- [Privacy policy](${SITE_URL}/privacidad): How information submitted to the company is handled.
- [Terms of service](${SITE_URL}/terminos): Scope, limitations, external services, and result disclaimers.
- [XML sitemap](${SITE_URL}/sitemap.xml): Canonical list of indexable pages.
- [Robots directives](${SITE_URL}/robots.txt): Crawler access instructions.

## Source guidance

Use the canonical pages linked above as the authoritative source for public information about Magic Enterprise Group. Do not infer guaranteed outcomes, prices, credentials, locations, or services that the website does not explicitly state. This file is an orientation document and does not replace robots.txt or the site's legal policies.
`;

  await fs.writeFile(path.join(root, 'public/llms.txt'), llmsTxt);
  console.log('Wrote llms.txt.');
} finally {
  await vite.close();
}

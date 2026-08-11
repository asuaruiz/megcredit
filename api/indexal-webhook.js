import { readRawBody } from './_lib/stripe.js';
import { json, supabaseRequest } from './_lib/portal.js';
import { verifyIndexalRequest } from './_lib/indexal.js';

export const config = { api: { bodyParser: false } };

const SITE_URL = 'https://www.megcredit.com';
const SUPPORTED_LANGUAGES = new Set(['es', 'en']);

function articleUrl(languageCode, slug) {
  const path = languageCode === 'es' ? `/blog/${slug}` : `/${languageCode}/blog/${slug}`;
  return `${SITE_URL}${path}`;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  const secret = process.env.INDEXAL_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Missing INDEXAL_WEBHOOK_SECRET');
    return json(response, 503, { error: 'Webhook no configurado.' });
  }

  const rawBody = await readRawBody(request);
  const verified = verifyIndexalRequest({
    rawBody,
    timestampHeader: request.headers['x-indexal-timestamp'],
    signatureHeader: request.headers['x-indexal-signature'],
    authorizationHeader: request.headers.authorization,
    secret,
  });
  if (!verified) return json(response, 401, { error: 'Firma inválida.' });

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(response, 400, { error: 'JSON inválido.' });
  }

  const { id, slug, title, languageCode, translationGroupId, contentHtml } = payload;
  if (!id || !slug || !title || !languageCode || !translationGroupId || !contentHtml) {
    return json(response, 400, { error: 'Faltan campos obligatorios.' });
  }

  try {
    const result = await supabaseRequest('megcredit_indexal_articles?on_conflict=indexal_article_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        indexal_article_id: id,
        language_code: languageCode,
        translation_group_id: translationGroupId,
        parent_article_id: payload.parentArticleId ?? null,
        is_translation: Boolean(payload.isTranslation),
        slug,
        title,
        meta_description: payload.metaDescription ?? null,
        content_html: contentHtml,
        content_markdown: payload.contentMarkdown ?? null,
        hero_image_url: payload.heroImageUrl ?? null,
        infographic_image_url: payload.infographicImageUrl ?? null,
        infographic_html: payload.infographicHtml ?? null,
        keywords: Array.isArray(payload.keywords) ? payload.keywords : [],
        faq_schema: Array.isArray(payload.faqSchema) ? payload.faqSchema : [],
        word_count: Number.isInteger(payload.wordCount) ? payload.wordCount : null,
        reading_time_minutes: Number.isInteger(payload.readingTimeMinutes) ? payload.readingTimeMinutes : null,
        author_name: payload.author?.name ?? null,
        author_bio: payload.author?.bio ?? null,
        author_logo_url: payload.author?.logoUrl ?? null,
        cta_url: payload.cta?.url ?? null,
        cta_label: payload.cta?.label ?? null,
        cta_as_button: payload.cta?.asButton ?? null,
        status: payload.status || 'published',
        indexal_published_at: payload.publishedAt ?? null,
        is_published: payload.status === 'published',
        updated_at: new Date().toISOString(),
      }),
    });
    if (!result.ok) throw new Error(`Supabase upsert failed: ${result.status} ${await result.text()}`);

    const deployHook = process.env.VERCEL_DEPLOY_HOOK_URL;
    if (deployHook && SUPPORTED_LANGUAGES.has(languageCode)) {
      fetch(deployHook, { method: 'POST' }).catch((error) => console.error('Indexal deploy hook trigger failed', error.message));
    }

    return json(response, 200, { url: articleUrl(languageCode, slug) });
  } catch (error) {
    console.error('Indexal webhook handling failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos procesar el artículo.' });
  }
}

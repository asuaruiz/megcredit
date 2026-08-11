import rawIndexalPosts from './indexal-posts.json';

function formatDate(dateString, languageCode) {
  if (!dateString) return '';
  const locale = languageCode === 'en' ? 'en-US' : 'es-US';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(dateString));
}

export function normalizeIndexalPost(row) {
  return {
    id: row.indexal_article_id,
    languageCode: row.language_code,
    translationGroupId: row.translation_group_id,
    parentArticleId: row.parent_article_id,
    isTranslation: row.is_translation,
    slug: row.slug,
    title: row.title,
    metaDescription: row.meta_description || '',
    contentHtml: row.content_html,
    heroImageUrl: row.hero_image_url || null,
    keywords: row.keywords || [],
    wordCount: row.word_count,
    readingTimeMinutes: row.reading_time_minutes,
    authorName: row.author_name,
    authorBio: row.author_bio,
    authorLogoUrl: row.author_logo_url,
    ctaUrl: row.cta_url,
    ctaLabel: row.cta_label,
    ctaAsButton: row.cta_as_button,
    publishedAt: row.indexal_published_at,
    updatedAt: row.updated_at || row.indexal_published_at,
    date: formatDate(row.indexal_published_at, row.language_code),
  };
}

export const indexalPosts = rawIndexalPosts.map(normalizeIndexalPost);

export function indexalPostsForLanguage(languageCode) {
  return indexalPosts.filter((post) => post.languageCode === languageCode);
}

export function findIndexalPost(languageCode, slug) {
  return indexalPosts.find((post) => post.languageCode === languageCode && post.slug === slug) || null;
}

export function translationFor(post, languageCode) {
  if (!post) return null;
  return indexalPosts.find((item) => item.translationGroupId === post.translationGroupId && item.languageCode === languageCode) || null;
}

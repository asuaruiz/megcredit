import { indexalPostsForLanguage } from './indexalPosts.js';

export function mergeSpanishBlogCards(posts) {
  const authored = posts.map((post) => ({
    key: `authored-${post.slug}`,
    href: `/blog/${post.slug}`,
    category: post.category,
    date: post.date,
    sortDate: post.datePublished,
    readTime: post.readTime,
    title: post.title,
    excerpt: post.excerpt,
    imageUrl: null,
  }));
  const indexal = indexalPostsForLanguage('es').map((post) => ({
    key: `indexal-${post.slug}`,
    href: `/blog/${post.slug}`,
    category: null,
    date: post.date,
    sortDate: post.publishedAt,
    readTime: post.readingTimeMinutes ? `${post.readingTimeMinutes} min` : '',
    title: post.title,
    excerpt: post.metaDescription,
    imageUrl: post.heroImageUrl,
  }));
  return [...authored, ...indexal].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));
}

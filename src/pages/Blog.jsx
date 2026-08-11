import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizePost, posts as fallbackPosts } from '../data/posts.jsx';
import { indexalPostsForLanguage } from '../data/indexalPosts.js';
import { useLanguage } from '../contexts/LanguageContext.jsx';

const AUTHORED_COVER_IMAGES = {
  'como-leer-reporte-credito': '/blog/como-leer-reporte-credito.svg',
  'factores-que-influyen-puntaje': '/blog/factores-que-influyen-puntaje.svg',
  'prepararte-evaluacion-credito': '/blog/prepararte-evaluacion-credito.svg',
};

function mergeCards(posts) {
  const authored = posts.map((post) => ({
    key: `authored-${post.slug}`,
    href: `/blog/${post.slug}`,
    category: post.category,
    date: post.date,
    sortDate: post.datePublished,
    readTime: post.readTime,
    title: post.title,
    excerpt: post.excerpt,
    imageUrl: AUTHORED_COVER_IMAGES[post.slug] || null,
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

export default function Blog() {
  const { t } = useLanguage();
  const [posts, setPosts] = useState(fallbackPosts);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/blog', { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Blog unavailable')))
      .then((rows) => setPosts(rows.map(normalizePost)))
      .catch((error) => { if (error.name !== 'AbortError') console.warn('Using prerendered blog snapshot'); });
    return () => controller.abort();
  }, []);

  const cards = mergeCards(posts);

  return <><section className="hero compact on-navy"><div className="hero-inner"><span className="eyebrow centered">{t('blog.eyebrow')}</span><h1>{t('blog.titlePart1')} <em>{t('blog.titleEm')}</em></h1><p className="lead">{t('blog.lead')}</p></div></section><section className="section"><div className="container"><div className="post-grid">{cards.map((card) => <Link className="card post-card" to={card.href} key={card.key}>{card.imageUrl ? <img className="post-card-image" src={card.imageUrl} alt="" loading="lazy" /> : null}<div className="post-meta">{card.category ? <><span className="category">{card.category}</span><span className="dot"/></> : null}<span>{card.date}</span>{card.readTime ? <><span className="dot"/><span>{card.readTime}</span></> : null}</div><h2>{card.title}</h2><p className="excerpt">{card.excerpt}</p><span className="read-more">{t('blog.readArticle')}</span></Link>)}</div></div></section></>;
}

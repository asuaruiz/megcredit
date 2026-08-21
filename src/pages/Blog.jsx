import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizePost, posts as fallbackPosts } from '../data/posts.jsx';
import { mergeSpanishBlogCards } from '../data/blogCards.js';
import { indexalPostsForLanguage } from '../data/indexalPosts.js';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { cardImageProps } from '../lib/imageUrl.js';

const hasEnglishBlog = indexalPostsForLanguage('en').length > 0;

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

  const cards = mergeSpanishBlogCards(posts);

  return <><section className="hero compact blog-hero on-navy"><div className="hero-inner"><span className="eyebrow centered">{t('blog.eyebrow')}</span><h1>{t('blog.titlePart1')} <em>{t('blog.titleEm')}</em></h1><p className="lead">{t('blog.lead')}</p>{hasEnglishBlog ? <p><Link className="btn-quiet" to="/en/blog" style={{ color: 'inherit' }}>Read this blog in English →</Link></p> : null}</div></section><section className="section blog-listing"><div className="container"><div className="post-grid">{cards.map((card, index) => <Link className="card post-card" to={card.href} key={card.key}>{card.imageUrl ? <div className="post-card-media"><img className="post-card-image" alt="" {...cardImageProps(card.imageUrl, { eager: index === 0 })} /></div> : null}<div className="post-card-content"><div className="post-meta">{card.category ? <><span className="category">{card.category}</span><span className="dot"/></> : null}<span>{card.date}</span>{card.readTime ? <><span className="dot"/><span>{card.readTime}</span></> : null}</div><h2>{card.title}</h2><p className="excerpt">{card.excerpt}</p><span className="read-more">{t('blog.readArticle')}</span></div></Link>)}</div></div></section></>;
}

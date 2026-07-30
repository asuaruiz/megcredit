import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizePost, posts as fallbackPosts } from '../data/posts.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';

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

  return <><section className="hero compact on-navy"><div className="hero-inner"><span className="eyebrow centered">{t('blog.eyebrow')}</span><h1>{t('blog.titlePart1')} <em>{t('blog.titleEm')}</em></h1><p className="lead">{t('blog.lead')}</p></div></section><section className="section"><div className="container"><div className="post-grid">{posts.map((post) => <Link className="card post-card" to={`/blog/${post.slug}`} key={post.slug}><div className="post-meta"><span className="category">{post.category}</span><span className="dot"/><span>{post.date}</span><span className="dot"/><span>{post.readTime}</span></div><h2>{post.title}</h2><p className="excerpt">{post.excerpt}</p><span className="read-more">{t('blog.readArticle')}</span></Link>)}</div></div></section></>;
}

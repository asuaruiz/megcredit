import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { normalizePost, posts, renderPostContent } from '../data/posts.jsx';
import NotFound from './NotFound.jsx';

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(() => posts.find((item) => item.slug === slug));

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/blog?slug=${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Post unavailable')))
      .then((row) => setPost(normalizePost(row)))
      .catch((error) => { if (error.name !== 'AbortError') console.warn('Using prerendered article snapshot'); });
    return () => controller.abort();
  }, [slug]);

  if (!post) return <NotFound />;
  return <article className="article"><header className="article-header"><div className="post-meta"><span className="category">{post.category}</span><span className="dot"/><time dateTime={post.datePublished}>{post.date}</time><span className="dot"/><span>{post.readTime}</span></div><h1>{post.title}</h1><p>{post.excerpt}</p><p className="byline">Por {post.authorName} · Revisado el 15 de julio de 2026</p></header><div className="article-body">{renderPostContent(post.content)}<aside className="article-sources"><h2>Fuentes oficiales y lectura adicional</h2><ul>{post.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></li>)}</ul><p>Contenido educativo general. No sustituye asesoría legal ni garantiza resultados crediticios.</p></aside></div><footer className="article-footer"><Link className="btn btn-outline" to="/blog">← Volver al blog</Link></footer></article>;
}

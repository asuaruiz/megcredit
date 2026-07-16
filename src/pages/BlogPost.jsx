import { Link, useParams } from 'react-router-dom';
import { posts } from '../data/posts.jsx';
import NotFound from './NotFound.jsx';

export default function BlogPost() {
  const { slug } = useParams();
  const post = posts.find((item) => item.slug === slug);
  if (!post) return <NotFound />;
  return <article className="article"><header className="article-header"><div className="post-meta"><span className="category">{post.category}</span><span className="dot"/><time dateTime={post.datePublished}>{post.date}</time><span className="dot"/><span>{post.readTime}</span></div><h1>{post.title}</h1><p>{post.excerpt}</p><p className="byline">Por el equipo educativo de Magic Enterprise Group · Revisado el 15 de julio de 2026</p></header><div className="article-body">{post.content}<aside className="article-sources"><h2>Fuentes oficiales y lectura adicional</h2><ul>{post.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></li>)}</ul><p>Contenido educativo general. No sustituye asesoría legal ni garantiza resultados crediticios.</p></aside></div><footer className="article-footer"><Link className="btn btn-outline" to="/blog">← Volver al blog</Link></footer></article>;
}

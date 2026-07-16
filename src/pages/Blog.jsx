import { Link } from 'react-router-dom';
import { posts } from '../data/posts.jsx';

export default function Blog() {
  return <><section className="hero compact on-navy"><div className="hero-inner"><span className="eyebrow centered">Centro educativo</span><h1>Crédito explicado <em>con claridad</em></h1><p className="lead">Guías prácticas de nivel básico e intermedio para comprender tus reportes y tomar decisiones informadas.</p></div></section><section className="section"><div className="container"><div className="post-grid">{posts.map((post) => <Link className="card post-card" to={`/blog/${post.slug}`} key={post.slug}><div className="post-meta"><span className="category">{post.category}</span><span className="dot"/><span>{post.date}</span><span className="dot"/><span>{post.readTime}</span></div><h2>{post.title}</h2><p className="excerpt">{post.excerpt}</p><span className="read-more">Leer artículo →</span></Link>)}</div></div></section></>;
}

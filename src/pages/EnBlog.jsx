import { Link } from 'react-router-dom';
import { indexalPostsForLanguage } from '../data/indexalPosts.js';

export default function EnBlog() {
  const posts = indexalPostsForLanguage('en');

  return (
    <section className="section">
      <div className="container">
        <div className="hero compact on-navy">
          <div className="hero-inner">
            <span className="eyebrow centered">Learning center</span>
            <h1>Credit explained <em>clearly</em></h1>
            <p className="lead">Practical guides to understand your credit reports and make informed decisions.</p>
            <p><Link className="btn-quiet" to="/blog" style={{ color: 'inherit' }}>Leer este blog en español →</Link></p>
          </div>
        </div>
        <div className="post-grid">
          {posts.map((post) => (
            <Link className="card post-card" to={`/en/blog/${post.slug}`} key={post.slug}>
              {post.heroImageUrl ? <img className="post-card-image" src={post.heroImageUrl} alt="" loading="eager" /> : null}
              <div className="post-meta">
                <span>{post.date}</span>
                {post.readingTimeMinutes ? <><span className="dot" />{post.readingTimeMinutes} min</> : null}
              </div>
              <h2>{post.title}</h2>
              <p className="excerpt">{post.metaDescription}</p>
              <span className="read-more">Read article →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

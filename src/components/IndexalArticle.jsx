import DOMPurify from 'isomorphic-dompurify';
import { Link } from 'react-router-dom';

const STRINGS = {
  es: { by: 'Por', backToBlog: '← Volver al blog', readTranslation: 'Read in English →' },
  en: { by: 'By', backToBlog: '← Back to blog', readTranslation: 'Leer en español →' },
};

export default function IndexalArticle({ post, translationHref, blogHref }) {
  const strings = STRINGS[post.languageCode] || STRINGS.es;
  const sanitizedHtml = DOMPurify.sanitize(post.contentHtml);

  return (
    <article className="article">
      <header className="article-header">
        <div className="post-meta">
          {post.readingTimeMinutes ? <span>{post.readingTimeMinutes} min</span> : null}
        </div>
        <h1>{post.title}</h1>
        {post.metaDescription ? <p>{post.metaDescription}</p> : null}
        {post.authorName ? <p className="byline">{strings.by} {post.authorName}</p> : null}
      </header>
      {post.heroImageUrl ? (
        <div className="article-body"><img className="article-hero-image" src={post.heroImageUrl} alt={post.title} loading="eager" /></div>
      ) : null}
      <div className="article-body">
        <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
        {post.ctaUrl ? (
          <p className="article-cta">
            <a className={post.ctaAsButton ? 'btn btn-primary' : undefined} href={post.ctaUrl} target="_blank" rel="noopener noreferrer">
              {post.ctaLabel || post.ctaUrl}
            </a>
          </p>
        ) : null}
      </div>
      <footer className="article-footer">
        <Link className="btn btn-outline" to={blogHref}>{strings.backToBlog}</Link>
        {translationHref ? <Link className="btn btn-quiet" to={translationHref}>{strings.readTranslation}</Link> : null}
      </footer>
    </article>
  );
}

import { useParams } from 'react-router-dom';
import { findIndexalPost, translationFor } from '../data/indexalPosts.js';
import IndexalArticle from '../components/IndexalArticle.jsx';
import NotFound from './NotFound.jsx';

export default function EnBlogPost() {
  const { slug } = useParams();
  const post = findIndexalPost('en', slug);
  if (!post) return <NotFound />;
  const translation = translationFor(post, 'es');
  return <IndexalArticle post={post} blogHref="/en/blog" translationHref={translation ? `/blog/${translation.slug}` : null} />;
}

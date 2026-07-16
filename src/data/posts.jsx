import blogPosts from './blog-posts.json';

export function normalizePost(post) {
  const published = post.published_at || post.datePublished;
  const updated = post.updated_at || post.dateModified || published;
  return {
    ...post,
    readTime: post.read_time || post.readTime,
    datePublished: published?.slice(0, 10),
    dateModified: updated?.slice(0, 10),
    date: published
      ? new Intl.DateTimeFormat('es-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(published))
      : '',
    authorName: post.author_name || post.authorName || 'Equipo educativo de Magic Enterprise Group',
  };
}

export function renderPostContent(blocks = []) {
  return blocks.map((block, index) => {
    const key = `${block.type}-${index}`;
    if (block.type === 'h2') return <h2 key={key}>{block.text}</h2>;
    if (block.type === 'ul') return <ul key={key}>{block.items?.map((item) => <li key={item}>{item}</li>)}</ul>;
    if (block.type === 'quote') return <blockquote key={key}>{block.text}</blockquote>;
    if (block.type === 'note') return <p className="note" key={key}>{block.text}</p>;
    return <p key={key}>{block.text}</p>;
  });
}

export const posts = blogPosts.filter((post) => post.is_published !== false).map(normalizePost);

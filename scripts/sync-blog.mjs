import fs from 'node:fs/promises';
import path from 'node:path';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const destination = path.join(process.cwd(), 'src/data/blog-posts.json');
const indexalDestination = path.join(process.cwd(), 'src/data/indexal-posts.json');

if (!url || !key) {
  console.log('Blog sync skipped: using the checked-in Supabase snapshot.');
  process.exit(0);
}

const response = await fetch(`${url}/rest/v1/megcredit_blog_posts?select=slug,title,excerpt,category,read_time,content,sources,author_name,published_at,updated_at,is_published&is_published=eq.true&order=published_at.desc`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});

if (!response.ok) throw new Error(`Supabase blog sync failed with status ${response.status}`);
const posts = await response.json();
if (!posts.length) throw new Error('Supabase blog sync returned no published posts; refusing to erase the snapshot.');
await fs.writeFile(destination, `${JSON.stringify(posts, null, 2)}\n`);
console.log(`Synced ${posts.length} published posts from Supabase.`);

const indexalResponse = await fetch(`${url}/rest/v1/megcredit_indexal_articles?select=indexal_article_id,language_code,translation_group_id,parent_article_id,is_translation,slug,title,meta_description,content_html,hero_image_url,infographic_image_url,keywords,word_count,reading_time_minutes,author_name,author_bio,author_logo_url,cta_url,cta_label,cta_as_button,indexal_published_at,updated_at&is_published=eq.true&order=indexal_published_at.desc`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});

if (indexalResponse.status === 404) {
  // megcredit_indexal_articles doesn't exist yet (migration not applied). Don't fail
  // the whole site build over an integration that hasn't been provisioned yet.
  console.log('Indexal sync skipped: megcredit_indexal_articles table not found yet.');
  await fs.writeFile(indexalDestination, '[]\n');
} else if (!indexalResponse.ok) {
  throw new Error(`Supabase Indexal sync failed with status ${indexalResponse.status}`);
} else {
  const indexalPosts = await indexalResponse.json();
  await fs.writeFile(indexalDestination, `${JSON.stringify(indexalPosts, null, 2)}\n`);
  console.log(`Synced ${indexalPosts.length} published Indexal articles from Supabase.`);
}

import fs from 'node:fs/promises';
import path from 'node:path';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const destination = path.join(process.cwd(), 'src/data/blog-posts.json');

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

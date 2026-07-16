function json(response, status, body, cache = false) {
  response.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', cache ? 'public, s-maxage=300, stale-while-revalidate=3600' : 'no-store');
  return response.json(body);
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(response, 503, { error: 'Blog no disponible temporalmente.' });

  const slug = typeof request.query?.slug === 'string' ? request.query.slug : '';
  const filter = slug ? `&slug=eq.${encodeURIComponent(slug)}` : '';

  try {
    const result = await fetch(`${url}/rest/v1/megcredit_blog_posts?select=slug,title,excerpt,category,read_time,content,sources,author_name,published_at,updated_at,is_published&is_published=eq.true${filter}&order=published_at.desc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!result.ok) throw new Error(`Supabase blog query failed: ${result.status}`);
    const rows = await result.json();
    if (slug && !rows.length) return json(response, 404, { error: 'Artículo no encontrado.' });
    return json(response, 200, slug ? rows[0] : rows, true);
  } catch (error) {
    console.error('Blog query failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos cargar el blog.' });
  }
}

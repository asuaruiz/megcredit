import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, clean, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

export default async function handler(request, response) {
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  if (request.method === 'GET') {
    const result = await supabaseRequest(
      'megcredit_service_catalog?is_active=eq.true&select=id,name,description,default_price_cents&order=name.asc',
      { method: 'GET' },
    );
    const catalog = result.ok ? await result.json() : [];
    return json(response, 200, { catalog });
  }

  if (request.method === 'POST') {
    const body = request.body || {};
    const name = clean(body.name, 160);
    const description = clean(body.description, 1000);
    const defaultPriceCents = Number(body.defaultPriceCents);

    if (name.length < 2 || !Number.isInteger(defaultPriceCents) || defaultPriceCents < 0) {
      return json(response, 400, { error: 'Nombre o precio inválido.' });
    }

    try {
      const item = await supabaseOne('megcredit_service_catalog', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ name, description, default_price_cents: defaultPriceCents }),
      });
      return json(response, 201, { item });
    } catch (error) {
      console.error('Create catalog item failed', error instanceof Error ? error.message : 'unknown error');
      return json(response, 500, { error: 'No pudimos crear el servicio.' });
    }
  }

  response.setHeader('Allow', 'GET, POST');
  return json(response, 405, { error: 'Método no permitido.' });
}

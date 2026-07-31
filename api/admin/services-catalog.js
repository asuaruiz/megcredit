import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, clean, isUuid, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

export default async function handler(request, response) {
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  if (request.method === 'GET') {
    const includeInactive = request.query?.all === '1' || request.query?.all === 'true';
    const path = includeInactive
      ? 'megcredit_service_catalog?select=id,name,description,default_price_cents,is_active&order=name.asc'
      : 'megcredit_service_catalog?is_active=eq.true&select=id,name,description,default_price_cents,is_active&order=name.asc';
    const result = await supabaseRequest(path, { method: 'GET' });
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

  if (request.method === 'PATCH') {
    const body = request.body || {};
    const id = body.id;
    if (!isUuid(id)) return json(response, 400, { error: 'Servicio inválido.' });

    const patch = {};
    if (body.name !== undefined) {
      const name = clean(body.name, 160);
      if (name.length < 2) return json(response, 400, { error: 'Nombre inválido.' });
      patch.name = name;
    }
    if (body.description !== undefined) {
      patch.description = clean(body.description, 1000);
    }
    if (body.defaultPriceCents !== undefined) {
      const defaultPriceCents = Number(body.defaultPriceCents);
      if (!Number.isInteger(defaultPriceCents) || defaultPriceCents < 0) return json(response, 400, { error: 'Precio inválido.' });
      patch.default_price_cents = defaultPriceCents;
    }
    if (body.isActive !== undefined) {
      patch.is_active = Boolean(body.isActive);
    }
    if (Object.keys(patch).length === 0) return json(response, 400, { error: 'Nada que actualizar.' });

    try {
      const existing = await supabaseOne(`megcredit_service_catalog?id=eq.${id}&select=id`, { method: 'GET' });
      if (!existing) return json(response, 404, { error: 'Servicio no encontrado.' });
      const result = await supabaseRequest(`megcredit_service_catalog?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      });
      if (!result.ok) throw new Error(`Catalog update failed: ${result.status}`);
      return json(response, 200, { ok: true });
    } catch (error) {
      console.error('Update catalog item failed', error instanceof Error ? error.message : 'unknown error');
      return json(response, 500, { error: 'No pudimos actualizar el servicio.' });
    }
  }

  if (request.method === 'DELETE') {
    const id = request.query?.id || request.body?.id;
    if (!isUuid(id)) return json(response, 400, { error: 'Servicio inválido.' });
    try {
      const existing = await supabaseOne(`megcredit_service_catalog?id=eq.${id}&select=id`, { method: 'GET' });
      if (!existing) return json(response, 404, { error: 'Servicio no encontrado.' });
      const result = await supabaseRequest(`megcredit_service_catalog?id=eq.${id}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
      if (result.status === 409) {
        return json(response, 409, { error: 'This service was already used in a client plan. Archive it instead of deleting it.' });
      }
      if (!result.ok) throw new Error(`Catalog delete failed: ${result.status}`);
      return json(response, 200, { ok: true });
    } catch (error) {
      console.error('Delete catalog item failed', error instanceof Error ? error.message : 'unknown error');
      return json(response, 500, { error: 'No pudimos eliminar el servicio.' });
    }
  }

  response.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return json(response, 405, { error: 'Método no permitido.' });
}

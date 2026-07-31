import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, clean, isUuid, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

export default async function handler(request, response) {
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  if (request.method === 'GET') {
    const clientAccountId = request.query?.clientAccountId;
    if (!isUuid(clientAccountId)) return json(response, 400, { error: 'Falta el id del cliente.' });

    try {
      const link = await supabaseOne(
        `megcredit_client_bureau_links?client_account_id=eq.${clientAccountId}&select=*`,
        { method: 'GET' },
      );
      return json(response, 200, { link });
    } catch (error) {
      console.error('Get bureau link failed', error instanceof Error ? error.message : 'unknown error');
      return json(response, 500, { error: 'No pudimos cargar el vínculo.' });
    }
  }

  if (request.method === 'POST') {
    const body = request.body || {};
    const clientAccountId = body.clientAccountId;
    const customerToken = clean(body.customerToken, 100);
    const pid = clean(body.pid, 50);

    if (!isUuid(clientAccountId)) return json(response, 400, { error: 'Falta el id del cliente.' });
    if (!customerToken) return json(response, 400, { error: 'Falta el customerToken de ConsumerDirect.' });

    try {
      const clientAccount = await supabaseOne(`megcredit_client_accounts?id=eq.${clientAccountId}&select=id`, { method: 'GET' });
      if (!clientAccount) return json(response, 404, { error: 'Cliente no encontrado.' });

      const link = await supabaseOne('megcredit_client_bureau_links?on_conflict=client_account_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          client_account_id: clientAccountId,
          provider: 'consumerdirect',
          customer_token: customerToken,
          pid: pid || null,
          sync_status: 'linked',
          last_sync_error: null,
        }),
      });

      return json(response, 201, { link });
    } catch (error) {
      console.error('Create bureau link failed', error instanceof Error ? error.message : 'unknown error');
      return json(response, 500, { error: 'No pudimos vincular al cliente. Verificá que el customerToken no esté ya en uso.' });
    }
  }

  if (request.method === 'DELETE') {
    const clientAccountId = request.query?.clientAccountId || request.body?.clientAccountId;
    if (!isUuid(clientAccountId)) return json(response, 400, { error: 'Falta el id del cliente.' });

    try {
      const result = await supabaseRequest(`megcredit_client_bureau_links?client_account_id=eq.${clientAccountId}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
      if (!result.ok) throw new Error(`Link delete failed: ${result.status}`);
      return json(response, 200, { ok: true });
    } catch (error) {
      console.error('Delete bureau link failed', error instanceof Error ? error.message : 'unknown error');
      return json(response, 500, { error: 'No pudimos desvincular al cliente.' });
    }
  }

  response.setHeader('Allow', 'GET, POST, DELETE');
  return json(response, 405, { error: 'Método no permitido.' });
}

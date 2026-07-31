import { fetchCurrentBureauReport } from '../_lib/consumerdirect.js';
import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, isUuid, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  const body = request.body || {};
  const clientAccountId = body.clientAccountId;
  if (!isUuid(clientAccountId)) return json(response, 400, { error: 'Falta el id del cliente.' });

  try {
    const link = await supabaseOne(
      `megcredit_client_bureau_links?client_account_id=eq.${clientAccountId}&select=id,customer_token`,
      { method: 'GET' },
    );
    if (!link) return json(response, 404, { error: 'Este cliente todavía no está vinculado a ConsumerDirect.' });

    await supabaseRequest(`megcredit_client_bureau_links?id=eq.${link.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ sync_status: 'syncing' }),
    });

    let rawPayload;
    try {
      rawPayload = await fetchCurrentBureauReport(link.customer_token);
    } catch (syncError) {
      const message = syncError instanceof Error ? syncError.message : 'Sync desconocido falló';
      await supabaseRequest(`megcredit_client_bureau_links?id=eq.${link.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ sync_status: 'error', last_sync_error: message.slice(0, 500) }),
      });
      console.error('ConsumerDirect sync failed', message);
      return json(response, 502, { error: 'No pudimos traer los datos de ConsumerDirect. Revisá el estado del vínculo.' });
    }

    // Field mapping for scores/case status is not implemented yet: the exact JSON shape of
    // /v1/credit/3bs/current hasn't been observed against a real response (blocked on the
    // whitelist). Staff reviews raw_payload and fills in scores/case status by hand, same as
    // the pdf_upload flow -- see bureau-report-confirm.js.
    const report = await supabaseOne('megcredit_client_bureau_reports', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        client_account_id: clientAccountId,
        source: 'api',
        as_of_date: new Date().toISOString().slice(0, 10),
        raw_payload: rawPayload,
        parse_status: 'needs_review',
      }),
    });

    await supabaseRequest(`megcredit_client_bureau_links?id=eq.${link.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ sync_status: 'linked', last_synced_at: new Date().toISOString(), last_sync_error: null }),
    });

    return json(response, 201, { report });
  } catch (error) {
    console.error('Bureau sync failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos sincronizar los datos de buró.' });
  }
}

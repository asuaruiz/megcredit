import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, isUuid, json, supabaseRequest } from '../_lib/portal.js';

const STATUSES = new Set(['approved', 'rejected']);

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  const body = request.body || {};
  const documentId = body.documentId;
  const status = body.status;

  if (!isUuid(documentId)) return json(response, 400, { error: 'Documento inválido.' });
  if (!STATUSES.has(status)) return json(response, 400, { error: 'Estado inválido.' });

  try {
    const result = await supabaseRequest(`megcredit_client_documents?id=eq.${documentId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status, reviewed_by: active.staff.email, reviewed_at: new Date().toISOString() }),
    });
    if (!result.ok) throw new Error(`Supabase update failed: ${result.status}`);

    return json(response, 200, { ok: true });
  } catch (error) {
    console.error('Review document failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos actualizar el documento.' });
  }
}

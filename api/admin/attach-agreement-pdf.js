import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, clean, isUuid, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';
export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Método no permitido.' });
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });
  if (!await getActiveStaffSession(request)) return json(response, 401, { error: 'Sesión no válida.' });
  const { agreementId } = request.body || {};
  const path = clean(request.body?.path, 500);
  const filename = clean(request.body?.filename, 255);
  if (!isUuid(agreementId)) return json(response, 400, { error: 'Contrato inválido.' });
  try {
    const agreement = await supabaseOne(`megcredit_service_agreements?id=eq.${agreementId}&select=id,client_account_id`, { method: 'GET' });
    if (!agreement) return json(response, 404, { error: 'Contrato no encontrado.' });
    if (!path.startsWith(`${agreement.client_account_id}/contracts/`) || !filename.toLowerCase().endsWith('.pdf')) return json(response, 400, { error: 'PDF inválido.' });
    const result = await supabaseRequest(`megcredit_service_agreements?id=eq.${agreement.id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ pdf_storage_path: path, pdf_original_filename: filename, pdf_size_bytes: Number(request.body.sizeBytes) || null }),
    });
    if (!result.ok) throw new Error(`Agreement update failed: ${result.status}`);
    return json(response, 200, { ok: true });
  } catch (error) {
    console.error('Attach agreement PDF failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos guardar el PDF.' });
  }
}

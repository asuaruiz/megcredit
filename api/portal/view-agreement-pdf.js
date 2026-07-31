import { allowedOrigin, downloadStorageObject, getActiveSession, isUuid, json, supabaseOne } from '../_lib/portal.js';
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'megcredit-client-documents';
export default async function handler(request, response) {
  if (request.method !== 'GET') return json(response, 405, { error: 'Método no permitido.' });
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });
  const active = await getActiveSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });
  if (!isUuid(request.query?.id)) return json(response, 400, { error: 'Contrato inválido.' });
  try {
    const agreement = await supabaseOne(`megcredit_service_agreements?id=eq.${request.query.id}&client_account_id=eq.${active.account.id}&select=pdf_storage_path,pdf_original_filename`, { method: 'GET' });
    if (!agreement?.pdf_storage_path) return json(response, 404, { error: 'Este contrato no tiene PDF.' });
    const stored = await downloadStorageObject(BUCKET, agreement.pdf_storage_path);
    response.status(200).setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `inline; filename="${(agreement.pdf_original_filename || 'contrato.pdf').replace(/["\r\n]/g, '_')}"`);
    return response.send(Buffer.from(await stored.arrayBuffer()));
  } catch (error) {
    console.error('Portal agreement PDF failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos abrir el PDF.' });
  }
}

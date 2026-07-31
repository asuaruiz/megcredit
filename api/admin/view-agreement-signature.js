import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, downloadStorageObject, isUuid, json, supabaseOne } from '../_lib/portal.js';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'megcredit-client-documents';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return json(response, 405, { error: 'Método no permitido.' });
  }
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });
  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  const agreementId = request.query?.id;
  if (!isUuid(agreementId)) return json(response, 400, { error: 'Contrato inválido.' });

  try {
    const agreement = await supabaseOne(
      `megcredit_service_agreements?id=eq.${agreementId}&status=eq.signed&select=id,signature_image_path`,
      { method: 'GET' },
    );
    if (!agreement?.signature_image_path) return json(response, 404, { error: 'Este contrato no tiene una firma disponible.' });
    const storageResponse = await downloadStorageObject(BUCKET, agreement.signature_image_path);
    const file = Buffer.from(await storageResponse.arrayBuffer());
    response.status(200);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Type', 'image/png');
    response.setHeader('Content-Disposition', 'inline; filename="firma.png"');
    return response.send(file);
  } catch (error) {
    console.error('View agreement signature failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos cargar la firma del contrato.' });
  }
}

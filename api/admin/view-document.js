import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, createSignedStorageUrl, isUuid, json, supabaseOne } from '../_lib/portal.js';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'megcredit-client-documents';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return json(response, 405, { error: 'Método no permitido.' });
  }
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });
  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  const documentId = request.query?.id;
  if (!isUuid(documentId)) return json(response, 400, { error: 'Documento inválido.' });

  try {
    const document = await supabaseOne(
      `megcredit_client_documents?id=eq.${documentId}&select=id,storage_path`,
      { method: 'GET' },
    );
    if (!document) return json(response, 404, { error: 'Documento no encontrado.' });
    const url = await createSignedStorageUrl(BUCKET, document.storage_path, 300);
    return json(response, 200, { url });
  } catch (error) {
    console.error('View document failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos abrir el documento.' });
  }
}

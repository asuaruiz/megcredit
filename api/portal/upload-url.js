import { randomUUID } from 'node:crypto';
import { allowedOrigin, clean, getActiveSession, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

const DOCUMENT_TYPES = new Set(['id_front', 'id_back', 'selfie_with_id', 'ssn_card', 'proof_of_residency']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'megcredit-client-documents';

function sanitizeFilename(name) {
  const trimmed = clean(name, 150) || 'documento';
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function createSignedUploadUrl(path) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const result = await fetch(`${supabaseUrl}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!result.ok) throw new Error(`Storage sign failed: ${result.status} ${await result.text()}`);
  const data = await result.json();
  const signedUrl = new URL(`${supabaseUrl}/storage/v1${data.url}`);
  const token = signedUrl.searchParams.get('token');
  if (!token) throw new Error('Storage sign response missing token');
  return { signedUrl: signedUrl.toString(), token };
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  try {
    const active = await getActiveSession(request);
    if (!active) return json(response, 401, { error: 'Sesión no válida.' });

    const body = request.body || {};
    const documentType = clean(body.documentType, 40);
    const mimeType = clean(body.mimeType, 100);
    const filename = sanitizeFilename(body.filename);
    const sizeBytes = Number(body.sizeBytes) || null;

    if (!DOCUMENT_TYPES.has(documentType)) return json(response, 400, { error: 'Tipo de documento inválido.' });
    if (!ALLOWED_MIME_TYPES.has(mimeType)) return json(response, 400, { error: 'Formato de archivo no permitido. Usa JPG, PNG, WEBP o PDF.' });
    if (sizeBytes && sizeBytes > 15 * 1024 * 1024) return json(response, 400, { error: 'El archivo supera el límite de 15 MB.' });

    const path = `${active.account.id}/${documentType}/${randomUUID()}-${filename}`;
    const { signedUrl, token } = await createSignedUploadUrl(path);

    const documentRow = await supabaseOne('megcredit_client_documents', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        client_account_id: active.account.id,
        document_type: documentType,
        storage_path: path,
        original_filename: filename,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        status: 'pending',
      }),
    });

    return json(response, 201, { uploadUrl: signedUrl, token, documentId: documentRow.id, path });
  } catch (error) {
    console.error('Portal upload-url failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos preparar la subida del documento.' });
  }
}

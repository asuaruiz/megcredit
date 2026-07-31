import { randomUUID } from 'node:crypto';
import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, clean, isUuid, json, supabaseOne } from '../_lib/portal.js';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'megcredit-client-documents';
const MAX_SIZE = 15 * 1024 * 1024;

function filename(value) {
  return (clean(value, 150) || 'contrato.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Método no permitido.' });
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });
  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });
  const { clientId, sizeBytes } = request.body || {};
  if (!isUuid(clientId)) return json(response, 400, { error: 'Cliente inválido.' });
  if (!Number.isFinite(Number(sizeBytes)) || Number(sizeBytes) <= 0 || Number(sizeBytes) > MAX_SIZE) return json(response, 400, { error: 'El PDF debe pesar menos de 15 MB.' });
  try {
    const client = await supabaseOne(`megcredit_client_accounts?id=eq.${clientId}&select=id`, { method: 'GET' });
    if (!client) return json(response, 404, { error: 'Cliente no encontrado.' });
    const safeName = filename(request.body.filename);
    const path = `${clientId}/contracts/${randomUUID()}-${safeName}`;
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const result = await fetch(`${supabaseUrl}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!result.ok) throw new Error(`Storage sign failed: ${result.status} ${await result.text()}`);
    const data = await result.json();
    const uploadUrl = new URL(`${supabaseUrl}/storage/v1${data.url}`).toString();
    return json(response, 200, { uploadUrl, path, filename: safeName });
  } catch (error) {
    console.error('Agreement upload URL failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos preparar la carga del contrato.' });
  }
}

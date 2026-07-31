import { randomUUID } from 'node:crypto';
import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, clean, json } from '../_lib/portal.js';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'megcredit-client-documents';
const MAX_SIZE = 15 * 1024 * 1024;

function filename(value) {
  return (clean(value, 150) || 'template.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' });
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origin not allowed.' });
  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Invalid session.' });
  const { sizeBytes } = request.body || {};
  if (!Number.isFinite(Number(sizeBytes)) || Number(sizeBytes) <= 0 || Number(sizeBytes) > MAX_SIZE) {
    return json(response, 400, { error: 'The PDF must be under 15 MB.' });
  }
  try {
    const safeName = filename(request.body.filename);
    const path = `contract-templates/${randomUUID()}-${safeName}`;
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
    console.error('Contract template upload URL failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: "We couldn't prepare the template upload." });
  }
}

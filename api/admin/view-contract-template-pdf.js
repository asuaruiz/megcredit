import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, downloadStorageObject, isUuid, json, supabaseOne } from '../_lib/portal.js';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'megcredit-client-documents';

export default async function handler(request, response) {
  if (request.method !== 'GET') return json(response, 405, { error: 'Method not allowed.' });
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origin not allowed.' });
  if (!await getActiveStaffSession(request)) return json(response, 401, { error: 'Invalid session.' });
  if (!isUuid(request.query?.id)) return json(response, 400, { error: 'Invalid template.' });
  try {
    const template = await supabaseOne(`megcredit_contract_templates?id=eq.${request.query.id}&select=storage_path,original_filename`, { method: 'GET' });
    if (!template) return json(response, 404, { error: 'Template not found.' });
    const stored = await downloadStorageObject(BUCKET, template.storage_path);
    response.status(200).setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `inline; filename="${(template.original_filename || 'template.pdf').replace(/["\r\n]/g, '_')}"`);
    return response.send(Buffer.from(await stored.arrayBuffer()));
  } catch (error) {
    console.error('View contract template PDF failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: "We couldn't open the PDF." });
  }
}

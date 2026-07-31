import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, clean, deleteStorageObject, isUuid, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'megcredit-client-documents';

export default async function handler(request, response) {
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origin not allowed.' });
  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Invalid session.' });

  const id = request.method === 'GET' || request.method === 'DELETE' ? request.query?.id : request.body?.id;
  if (!isUuid(id)) return json(response, 400, { error: 'Invalid template.' });

  if (request.method === 'PATCH') {
    const name = clean(request.body?.name, 160);
    if (name.length < 2) return json(response, 400, { error: 'Give the template a name.' });
    try {
      const result = await supabaseRequest(`megcredit_contract_templates?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ name, updated_at: new Date().toISOString() }),
      });
      if (!result.ok) throw new Error(`Template update failed: ${result.status}`);
      return json(response, 200, { ok: true });
    } catch (error) {
      console.error('Rename contract template failed', error instanceof Error ? error.message : 'unknown error');
      return json(response, 500, { error: "We couldn't rename the contract template." });
    }
  }

  if (request.method === 'DELETE') {
    try {
      const template = await supabaseOne(`megcredit_contract_templates?id=eq.${id}&select=storage_path`, { method: 'GET' });
      if (!template) return json(response, 404, { error: 'Template not found.' });
      const result = await supabaseRequest(`megcredit_contract_templates?id=eq.${id}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
      if (!result.ok) throw new Error(`Template delete failed: ${result.status}`);
      try {
        await deleteStorageObject(BUCKET, template.storage_path);
      } catch (storageError) {
        console.error('Contract template storage cleanup failed', storageError instanceof Error ? storageError.message : 'unknown error');
      }
      return json(response, 200, { ok: true });
    } catch (error) {
      console.error('Delete contract template failed', error instanceof Error ? error.message : 'unknown error');
      return json(response, 500, { error: "We couldn't delete the contract template." });
    }
  }

  response.setHeader('Allow', 'PATCH, DELETE');
  return json(response, 405, { error: 'Method not allowed.' });
}

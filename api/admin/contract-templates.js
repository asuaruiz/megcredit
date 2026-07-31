import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, clean, json, supabaseRequest } from '../_lib/portal.js';

export default async function handler(request, response) {
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origin not allowed.' });
  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Invalid session.' });

  if (request.method === 'GET') {
    try {
      const result = await supabaseRequest(
        'megcredit_contract_templates?select=id,name,original_filename,size_bytes,created_at&order=name.asc',
        { method: 'GET' },
      );
      if (!result.ok) throw new Error(`Templates query failed: ${result.status}`);
      const templates = await result.json();
      return json(response, 200, { templates });
    } catch (error) {
      console.error('List contract templates failed', error instanceof Error ? error.message : 'unknown error');
      return json(response, 500, { error: "We couldn't load the contract templates." });
    }
  }

  if (request.method === 'POST') {
    const name = clean(request.body?.name, 160);
    const path = clean(request.body?.path, 500);
    const filename = clean(request.body?.filename, 255);
    const sizeBytes = Number(request.body?.sizeBytes) || null;
    if (name.length < 2) return json(response, 400, { error: 'Give the template a name.' });
    if (!path.startsWith('contract-templates/') || !filename.toLowerCase().endsWith('.pdf')) {
      return json(response, 400, { error: 'Invalid PDF.' });
    }
    try {
      const result = await supabaseRequest('megcredit_contract_templates', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          name,
          storage_path: path,
          original_filename: filename,
          size_bytes: sizeBytes,
          created_by_staff_id: active.staff.id,
        }),
      });
      if (!result.ok) throw new Error(`Template insert failed: ${result.status}`);
      const [template] = await result.json();
      return json(response, 201, { template });
    } catch (error) {
      console.error('Create contract template failed', error instanceof Error ? error.message : 'unknown error');
      return json(response, 500, { error: "We couldn't save the contract template." });
    }
  }

  response.setHeader('Allow', 'GET, POST');
  return json(response, 405, { error: 'Method not allowed.' });
}

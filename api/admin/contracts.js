import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, json, supabaseRequest } from '../_lib/portal.js';
export default async function handler(request, response) {
  if (request.method !== 'GET') return json(response, 405, { error: 'Método no permitido.' });
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });
  if (!await getActiveStaffSession(request)) return json(response, 401, { error: 'Sesión no válida.' });
  try {
    let [agreementsResponse, accountsResponse] = await Promise.all([
      supabaseRequest('megcredit_service_agreements?select=id,client_account_id,title,status,signed_full_name,signed_at,pdf_original_filename,pdf_storage_path,created_at&order=created_at.desc', { method: 'GET' }),
      supabaseRequest('megcredit_client_accounts?select=id,full_name,email', { method: 'GET' }),
    ]);
    let pdfColumnsAvailable = agreementsResponse.ok;
    if (!agreementsResponse.ok) {
      agreementsResponse = await supabaseRequest('megcredit_service_agreements?select=id,client_account_id,title,status,signed_full_name,signed_at,created_at&order=created_at.desc', { method: 'GET' });
      pdfColumnsAvailable = false;
    }
    if (!agreementsResponse.ok || !accountsResponse.ok) throw new Error(`Contract query failed: agreements=${agreementsResponse.status} accounts=${accountsResponse.status}`);
    const agreements = await agreementsResponse.json();
    const accounts = await accountsResponse.json();
    return json(response, 200, { pdfColumnsAvailable, contracts: agreements.map(({ pdf_storage_path: path, ...agreement }) => ({
      ...agreement,
      has_pdf: Boolean(path),
      client: accounts.find((account) => account.id === agreement.client_account_id) || null,
    })) });
  } catch (error) {
    console.error('Admin contracts failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos cargar los contratos.' });
  }
}

import { allowedOrigin, getActiveSession, json, supabaseRequest } from '../_lib/portal.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  try {
    const active = await getActiveSession(request);
    if (!active) return json(response, 401, { error: 'Sesión no válida.' });

    const documentsResult = await supabaseRequest(
      `megcredit_client_documents?client_account_id=eq.${active.account.id}&select=id,document_type,status,original_filename,created_at&order=created_at.desc`,
      { method: 'GET' },
    );
    const documents = documentsResult.ok ? await documentsResult.json() : [];

    return json(response, 200, { account: active.account, documents });
  } catch (error) {
    console.error('Portal me failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos cargar tu cuenta.' });
  }
}

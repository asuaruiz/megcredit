import { allowedOrigin, getActiveSession, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

const REQUIRED_DOCUMENT_TYPES = ['id_front', 'selfie_with_id', 'ssn_card', 'proof_of_residency'];

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const active = await getActiveSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  try {
    const clientId = active.account.id;
    const [agreement, creditMonitoring, documentsResult] = await Promise.all([
      supabaseOne(
        `megcredit_service_agreements?client_account_id=eq.${clientId}&status=neq.void&select=id,title,body_text,status&order=created_at.desc&limit=1`,
        { method: 'GET' },
      ),
      supabaseOne(
        `megcredit_client_credit_monitoring?client_account_id=eq.${clientId}&select=id`,
        { method: 'GET' },
      ),
      supabaseRequest(`megcredit_client_documents?client_account_id=eq.${clientId}&select=document_type`, { method: 'GET' }),
    ]);

    const documents = documentsResult.ok ? await documentsResult.json() : [];
    const documentsStatus = Object.fromEntries(
      REQUIRED_DOCUMENT_TYPES.map((type) => [type, documents.some((doc) => doc.document_type === type)]),
    );

    return json(response, 200, {
      agreement,
      creditMonitoringSaved: Boolean(creditMonitoring),
      documentsStatus,
    });
  } catch (error) {
    console.error('Onboarding status failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos cargar tu progreso.' });
  }
}

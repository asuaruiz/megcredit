import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, json, supabaseRequest } from '../_lib/portal.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return json(response, 405, { error: 'Método no permitido.' });
  }
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });
  if (!(await getActiveStaffSession(request))) return json(response, 401, { error: 'Sesión no válida.' });

  try {
    const result = await supabaseRequest(
      'megcredit_email_history?select=id,recipient_email,subject,email_type,status,provider,provider_message_id,error_message,created_at&order=created_at.desc&limit=250',
      { method: 'GET' },
    );
    if (!result.ok) throw new Error(`Supabase email history query failed: ${result.status}`);
    return json(response, 200, { emails: await result.json() });
  } catch (error) {
    console.error('Admin email history failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos cargar el historial de emails.' });
  }
}

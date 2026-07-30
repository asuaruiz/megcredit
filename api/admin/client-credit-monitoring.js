import { getActiveStaffSession } from '../_lib/admin.js';
import { decryptSecret } from '../_lib/crypto.js';
import { allowedOrigin, isUuid, json, supabaseOne } from '../_lib/portal.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  const clientId = request.query?.id;
  if (!isUuid(clientId)) return json(response, 400, { error: 'Cliente inválido.' });

  try {
    const record = await supabaseOne(
      `megcredit_client_credit_monitoring?client_account_id=eq.${clientId}&select=provider,username,phone,password_encrypted,security_word_encrypted,updated_at`,
      { method: 'GET' },
    );
    if (!record) return json(response, 404, { error: 'Este cliente no ha compartido sus credenciales todavía.' });

    return json(response, 200, {
      provider: record.provider,
      username: record.username,
      phone: record.phone,
      password: decryptSecret(record.password_encrypted),
      securityWord: record.security_word_encrypted ? decryptSecret(record.security_word_encrypted) : null,
      updatedAt: record.updated_at,
    });
  } catch (error) {
    console.error('Admin credit monitoring lookup failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos cargar las credenciales.' });
  }
}

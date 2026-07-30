import { clearStaffSessionCookie, staffSessionToken } from '../_lib/admin.js';
import { allowedOrigin, json, sha256Hex, supabaseRequest } from '../_lib/portal.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const token = staffSessionToken(request);
  if (token) {
    await supabaseRequest(`megcredit_staff_sessions?token_hash=eq.${sha256Hex(token)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ revoked_at: new Date().toISOString() }),
    });
  }

  clearStaffSessionCookie(response);
  return json(response, 200, { ok: true });
}

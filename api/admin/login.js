import { STAFF_SESSION_TTL_MS, setStaffSessionCookie } from '../_lib/admin.js';
import {
  allowedOrigin,
  clean,
  clientIpHash,
  isRateLimited,
  json,
  newToken,
  recordLoginAttempt,
  sha256Hex,
  supabaseOne,
  supabaseRequest,
  verifyPassword,
} from '../_lib/portal.js';

function ipSecret() {
  return process.env.PORTAL_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const body = request.body || {};
  const email = clean(body.email, 254).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const ipHash = clientIpHash(request, ipSecret());

  if (!/^\S+@\S+\.\S+$/.test(email) || !password) {
    return json(response, 400, { error: 'Correo o contraseña inválidos.' });
  }

  try {
    if (await isRateLimited(`staff:${email}`, ipHash)) {
      return json(response, 429, { error: 'Demasiados intentos. Intenta nuevamente más tarde.' });
    }

    const staff = await supabaseOne(
      `megcredit_staff_accounts?email=eq.${encodeURIComponent(email)}&status=eq.active&select=id,password_hash`,
      { method: 'GET' },
    );

    if (!staff || !verifyPassword(password, staff.password_hash)) {
      await recordLoginAttempt(`staff:${email}`, ipHash, false);
      return json(response, 401, { error: 'Correo o contraseña incorrectos.' });
    }

    const sessionRawToken = newToken();
    const expiresAt = new Date(Date.now() + STAFF_SESSION_TTL_MS).toISOString();
    await supabaseRequest('megcredit_staff_sessions', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        staff_account_id: staff.id,
        token_hash: sha256Hex(sessionRawToken),
        user_agent: clean(request.headers['user-agent'], 500),
        ip_hash: ipHash,
        expires_at: expiresAt,
      }),
    });

    await supabaseRequest(`megcredit_staff_accounts?id=eq.${staff.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ last_login_at: new Date().toISOString() }),
    });

    await recordLoginAttempt(`staff:${email}`, ipHash, true);
    setStaffSessionCookie(response, sessionRawToken, Math.floor(STAFF_SESSION_TTL_MS / 1000));
    return json(response, 200, { ok: true });
  } catch (error) {
    console.error('Staff login failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos iniciar sesión. Intenta nuevamente.' });
  }
}

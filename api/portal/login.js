import {
  SESSION_TTL_MS,
  allowedOrigin,
  clean,
  clientIpHash,
  isRateLimited,
  json,
  newToken,
  recordLoginAttempt,
  setSessionCookie,
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
    if (await isRateLimited(email, ipHash)) {
      return json(response, 429, { error: 'Demasiados intentos. Intenta nuevamente más tarde.' });
    }

    const account = await supabaseOne(
      `megcredit_client_accounts?email=eq.${encodeURIComponent(email)}&status=eq.active&select=id,password_hash`,
      { method: 'GET' },
    );

    if (!account || !verifyPassword(password, account.password_hash)) {
      await recordLoginAttempt(email, ipHash, false);
      return json(response, 401, { error: 'Correo o contraseña incorrectos.' });
    }

    const sessionRawToken = newToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    await supabaseRequest('megcredit_client_sessions', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        client_account_id: account.id,
        token_hash: sha256Hex(sessionRawToken),
        user_agent: clean(request.headers['user-agent'], 500),
        ip_hash: ipHash,
        expires_at: expiresAt,
      }),
    });

    await supabaseRequest(`megcredit_client_accounts?id=eq.${account.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ last_login_at: new Date().toISOString() }),
    });

    await recordLoginAttempt(email, ipHash, true);
    setSessionCookie(response, sessionRawToken, Math.floor(SESSION_TTL_MS / 1000));
    return json(response, 200, { ok: true, sessionToken: sessionRawToken });
  } catch (error) {
    console.error('Portal login failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos iniciar sesión. Intenta nuevamente.' });
  }
}

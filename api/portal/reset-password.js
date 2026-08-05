import {
  SESSION_TTL_MS,
  allowedOrigin,
  clean,
  clientIpHash,
  hashPassword,
  isRateLimited,
  json,
  newToken,
  recordLoginAttempt,
  setSessionCookie,
  sha256Hex,
  supabaseOne,
  supabaseRequest,
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
  const token = clean(body.token, 128);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!token || password.length < 8) {
    return json(response, 400, { error: 'Enlace inválido o contraseña demasiado corta (mínimo 8 caracteres).' });
  }

  const ipHash = clientIpHash(request, ipSecret());

  try {
    if (await isRateLimited('reset-password', ipHash)) {
      return json(response, 429, { error: 'Demasiados intentos. Intenta nuevamente más tarde.' });
    }

    const tokenHash = sha256Hex(token);
    const nowIso = new Date().toISOString();
    const reset = await supabaseOne(
      `megcredit_client_password_resets?token_hash=eq.${tokenHash}&used_at=is.null&expires_at=gt.${encodeURIComponent(nowIso)}&select=id,client_account_id`,
      { method: 'GET' },
    );

    if (!reset) {
      await recordLoginAttempt('reset-password', ipHash, false);
      return json(response, 400, { error: 'Este enlace ya no es válido. Solicita uno nuevo.' });
    }

    const passwordHash = hashPassword(password);
    const updateResult = await supabaseRequest(`megcredit_client_accounts?id=eq.${reset.client_account_id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ password_hash: passwordHash, updated_at: nowIso }),
    });
    if (!updateResult.ok) throw new Error(`Supabase update failed: ${updateResult.status}`);

    await supabaseRequest(`megcredit_client_password_resets?id=eq.${reset.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ used_at: nowIso }),
    });

    // Resetting the password revokes every existing session -- if the password leaked, old sessions shouldn't survive.
    await supabaseRequest(`megcredit_client_sessions?client_account_id=eq.${reset.client_account_id}&revoked_at=is.null`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ revoked_at: nowIso }),
    });

    const sessionRawToken = newToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    await supabaseRequest('megcredit_client_sessions', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        client_account_id: reset.client_account_id,
        token_hash: sha256Hex(sessionRawToken),
        user_agent: clean(request.headers['user-agent'], 500),
        ip_hash: ipHash,
        expires_at: expiresAt,
      }),
    });

    await recordLoginAttempt('reset-password', ipHash, true);
    setSessionCookie(response, sessionRawToken, Math.floor(SESSION_TTL_MS / 1000));
    return json(response, 200, { ok: true, sessionToken: sessionRawToken });
  } catch (error) {
    console.error('Portal reset-password failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos restablecer tu contraseña. Intenta nuevamente.' });
  }
}

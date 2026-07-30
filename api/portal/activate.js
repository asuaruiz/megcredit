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
    if (await isRateLimited('activate', ipHash)) {
      return json(response, 429, { error: 'Demasiados intentos. Intenta nuevamente más tarde.' });
    }

    const tokenHash = sha256Hex(token);
    const nowIso = new Date().toISOString();
    const invite = await supabaseOne(
      `megcredit_client_invites?token_hash=eq.${tokenHash}&used_at=is.null&expires_at=gt.${encodeURIComponent(nowIso)}&select=id,email,full_name`,
      { method: 'GET' },
    );

    if (!invite) {
      await recordLoginAttempt('activate', ipHash, false);
      return json(response, 400, { error: 'Este enlace ya no es válido. Solicita una nueva invitación.' });
    }

    const passwordHash = hashPassword(password);
    const existingAccount = await supabaseOne(
      `megcredit_client_accounts?email=eq.${encodeURIComponent(invite.email)}&select=id,status`,
      { method: 'GET' },
    );

    let accountId;
    if (existingAccount) {
      if (existingAccount.status === 'active') {
        return json(response, 409, { error: 'Ya existe una cuenta activa con ese correo. Inicia sesión.' });
      }
      const updateResult = await supabaseRequest(`megcredit_client_accounts?id=eq.${existingAccount.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ password_hash: passwordHash, status: 'active', full_name: invite.full_name, updated_at: nowIso }),
      });
      if (!updateResult.ok) throw new Error(`Supabase update failed: ${updateResult.status}`);
      accountId = existingAccount.id;
    } else {
      const account = await supabaseOne('megcredit_client_accounts', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ email: invite.email, full_name: invite.full_name, password_hash: passwordHash, status: 'active' }),
      });
      accountId = account.id;
    }

    await supabaseRequest(`megcredit_client_invites?id=eq.${invite.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ used_at: nowIso }),
    });

    const sessionRawToken = newToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    await supabaseRequest('megcredit_client_sessions', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        client_account_id: accountId,
        token_hash: sha256Hex(sessionRawToken),
        user_agent: clean(request.headers['user-agent'], 500),
        ip_hash: ipHash,
        expires_at: expiresAt,
      }),
    });

    await recordLoginAttempt('activate', ipHash, true);
    setSessionCookie(response, sessionRawToken, Math.floor(SESSION_TTL_MS / 1000));
    return json(response, 201, { ok: true, sessionToken: sessionRawToken });
  } catch (error) {
    console.error('Portal activation failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos activar tu cuenta. Intenta nuevamente.' });
  }
}

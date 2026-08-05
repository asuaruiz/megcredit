import {
  PASSWORD_RESET_TTL_MS,
  allowedOrigin,
  clean,
  clientIpHash,
  isRateLimited,
  json,
  newToken,
  recordLoginAttempt,
  resetPasswordEmailHtml,
  sendPortalEmail,
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
  const email = clean(body.email, 254).toLowerCase();
  const ipHash = clientIpHash(request, ipSecret());

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return json(response, 400, { error: 'Ingresa un correo válido.' });
  }

  // Generic response either way, so we never reveal whether an account exists for this email.
  const genericResponse = () =>
    json(response, 200, { ok: true, message: 'Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña.' });

  try {
    if (await isRateLimited(email, ipHash)) {
      return json(response, 429, { error: 'Demasiados intentos. Intenta nuevamente más tarde.' });
    }

    const account = await supabaseOne(
      `megcredit_client_accounts?email=eq.${encodeURIComponent(email)}&status=eq.active&select=id,full_name`,
      { method: 'GET' },
    );

    if (!account) {
      await recordLoginAttempt(email, ipHash, false);
      return genericResponse();
    }

    const token = newToken();
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString();

    const insertResult = await supabaseRequest('megcredit_client_password_resets', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ client_account_id: account.id, token_hash: tokenHash, expires_at: expiresAt }),
    });
    if (!insertResult.ok) throw new Error(`Supabase insert failed: ${insertResult.status}`);

    const siteUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : 'https://www.megcredit.com';
    const resetUrl = `${siteUrl}/portal/restablecer?token=${token}`;

    await sendPortalEmail({
      to: email,
      subject: 'Reset your MEG Credit portal password',
      html: resetPasswordEmailHtml({ fullName: account.full_name, resetUrl }),
      emailType: 'password_reset',
    });

    await recordLoginAttempt(email, ipHash, true);
    return genericResponse();
  } catch (error) {
    console.error('Portal forgot-password failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos procesar tu solicitud. Intenta nuevamente.' });
  }
}

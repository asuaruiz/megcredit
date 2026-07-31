import { timingSafeEqual } from 'node:crypto';
import { getActiveStaffSession } from '../_lib/admin.js';
import {
  INVITE_TTL_MS,
  allowedOrigin,
  clean,
  inviteEmailHtml,
  json,
  newToken,
  sendPortalEmail,
  sha256Hex,
  supabaseOne,
  supabaseRequest,
} from '../_lib/portal.js';

function hasValidBearerToken(request) {
  const expected = process.env.PORTAL_ADMIN_TOKEN;
  if (!expected) return false;
  const header = request.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return false;
  const provided = header.slice(7).trim();
  const a = Buffer.from(sha256Hex(provided));
  const b = Buffer.from(sha256Hex(expected));
  return timingSafeEqual(a, b);
}

async function isAuthorized(request) {
  if (hasValidBearerToken(request)) return true;
  return Boolean(await getActiveStaffSession(request));
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });
  if (!(await isAuthorized(request))) return json(response, 401, { error: 'No autorizado.' });

  const body = request.body || {};
  const email = clean(body.email, 254).toLowerCase();
  const fullName = clean(body.fullName, 160);

  if (!/^\S+@\S+\.\S+$/.test(email) || fullName.length < 2) {
    return json(response, 400, { error: 'Correo o nombre inválido.' });
  }

  try {
    const existingAccount = await supabaseOne(
      `megcredit_client_accounts?email=eq.${encodeURIComponent(email)}&status=eq.active&select=id`,
      { method: 'GET' },
    );
    if (existingAccount) return json(response, 409, { error: 'Ya existe una cuenta activa con ese correo.' });

    const token = newToken();
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

    const insertResult = await supabaseRequest('megcredit_client_invites', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ email, full_name: fullName, token_hash: tokenHash, expires_at: expiresAt }),
    });
    if (!insertResult.ok) throw new Error(`Supabase insert failed: ${insertResult.status}`);

    const siteUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : 'https://www.megcredit.com';
    const activationUrl = `${siteUrl}/portal/activar?token=${token}`;

    await sendPortalEmail({
      to: email,
      subject: 'Create your account on the MEG Credit portal',
      html: inviteEmailHtml({ fullName, activationUrl }),
    });

    return json(response, 201, { ok: true });
  } catch (error) {
    console.error('Portal invite failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos crear la invitación.' });
  }
}

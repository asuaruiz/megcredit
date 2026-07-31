import { timingSafeEqual } from 'node:crypto';
import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, clean, createClientInvite, json, sha256Hex } from '../_lib/portal.js';

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
    const result = await createClientInvite({ email, fullName });
    if (result.status === 'already_active') {
      return json(response, 409, { error: 'Ya existe una cuenta activa con ese correo.' });
    }
    if (result.status === 'already_invited') {
      return json(response, 409, { error: 'Ya existe una invitación pendiente para ese correo.' });
    }
    return json(response, 201, { ok: true });
  } catch (error) {
    console.error('Portal invite failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos crear la invitación.' });
  }
}

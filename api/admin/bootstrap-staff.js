import { timingSafeEqual } from 'node:crypto';
import { allowedOrigin, clean, hashPassword, json, sha256Hex, supabaseOne, supabaseRequest } from '../_lib/portal.js';

function isAuthorized(request) {
  const expected = process.env.PORTAL_ADMIN_TOKEN;
  if (!expected) return false;
  const header = request.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return false;
  const provided = header.slice(7).trim();
  const a = Buffer.from(sha256Hex(provided));
  const b = Buffer.from(sha256Hex(expected));
  return timingSafeEqual(a, b);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });
  if (!isAuthorized(request)) return json(response, 401, { error: 'No autorizado.' });

  const body = request.body || {};
  const email = clean(body.email, 254).toLowerCase();
  const fullName = clean(body.fullName, 160);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!/^\S+@\S+\.\S+$/.test(email) || fullName.length < 2 || password.length < 8) {
    return json(response, 400, { error: 'Datos inválidos. La contraseña debe tener al menos 8 caracteres.' });
  }

  try {
    const existing = await supabaseOne(`megcredit_staff_accounts?email=eq.${encodeURIComponent(email)}&select=id`, { method: 'GET' });
    if (existing) return json(response, 409, { error: 'Ya existe una cuenta de staff con ese correo.' });

    const insertResult = await supabaseRequest('megcredit_staff_accounts', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ email, full_name: fullName, password_hash: hashPassword(password) }),
    });
    if (!insertResult.ok) throw new Error(`Supabase insert failed: ${insertResult.status}`);

    return json(response, 201, { ok: true });
  } catch (error) {
    console.error('Staff bootstrap failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos crear la cuenta de staff.' });
  }
}

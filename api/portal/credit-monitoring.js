import { encryptSecret } from '../_lib/crypto.js';
import { allowedOrigin, clean, getActiveSession, json, supabaseRequest } from '../_lib/portal.js';

const PROVIDERS = new Set(['identityiq', 'smartcredit', 'myscoreiq', 'other']);
const PHONE_PATTERN = /^\+?[0-9](?:[0-9\s().-]{5,18})[0-9]$/;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const active = await getActiveSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  const body = request.body || {};
  const provider = clean(body.provider, 20);
  const username = clean(body.username, 254);
  const password = typeof body.password === 'string' ? body.password : '';
  const phone = clean(body.phone, 40);
  const securityWord = typeof body.securityWord === 'string' ? body.securityWord : '';

  if (!PROVIDERS.has(provider)) return json(response, 400, { error: 'Selecciona un proveedor válido.' });
  if (username.length < 3) return json(response, 400, { error: 'El usuario debe tener al menos 3 caracteres.' });
  if (password.length < 4) return json(response, 400, { error: 'La contraseña debe tener al menos 4 caracteres.' });
  if (phone && !PHONE_PATTERN.test(phone)) return json(response, 400, { error: 'El teléfono no tiene un formato válido.' });

  try {
    const payload = {
      client_account_id: active.account.id,
      provider,
      username,
      password_encrypted: encryptSecret(password),
      phone,
      security_word_encrypted: securityWord ? encryptSecret(securityWord) : null,
      updated_at: new Date().toISOString(),
    };

    const result = await supabaseRequest('megcredit_client_credit_monitoring?on_conflict=client_account_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(payload),
    });
    if (!result.ok) throw new Error(`Supabase upsert failed: ${result.status}`);

    return json(response, 200, { ok: true });
  } catch (error) {
    console.error('Save credit monitoring failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos guardar tus datos. Intenta nuevamente.' });
  }
}

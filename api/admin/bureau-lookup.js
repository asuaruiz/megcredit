import { findCustomerByEmail } from '../_lib/consumerdirect.js';
import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, clean, json } from '../_lib/portal.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  const email = clean(request.body?.email, 255);
  if (!email) return json(response, 400, { error: 'Falta el email del cliente.' });

  try {
    const match = await findCustomerByEmail(email);
    if (!match) return json(response, 404, { error: 'No encontramos a este cliente en ConsumerDirect por ese email.' });
    return json(response, 200, match);
  } catch (error) {
    console.error('Bureau customer lookup failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 502, { error: 'No pudimos consultar ConsumerDirect.' });
  }
}

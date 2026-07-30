import {
  allowedOrigin,
  clean,
  clientIpHash,
  getActiveSession,
  isUuid,
  json,
  supabaseOne,
  supabaseRequest,
  uploadBufferToStorage,
} from '../_lib/portal.js';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'megcredit-client-documents';
const SIGNATURE_DATA_URL_RE = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/;
const MAX_SIGNATURE_BASE64_LENGTH = 2_000_000; // ~1.5MB decoded, plenty for a signature drawing

function ipSecret() {
  return process.env.PORTAL_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const active = await getActiveSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  const body = request.body || {};
  const agreementId = body.agreementId;
  const fullName = clean(body.fullName, 160);

  if (!isUuid(agreementId)) return json(response, 400, { error: 'Contrato inválido.' });
  if (fullName.length < 2) return json(response, 400, { error: 'Escribe tu nombre completo para firmar.' });

  try {
    const agreement = await supabaseOne(
      `megcredit_service_agreements?id=eq.${agreementId}&client_account_id=eq.${active.account.id}&status=eq.pending&select=id,payment_plan_id`,
      { method: 'GET' },
    );
    if (!agreement) return json(response, 404, { error: 'Este contrato ya no está pendiente de firma.' });

    let signatureImagePath = null;
    const signatureDataUrl = body.signatureDataUrl;
    if (typeof signatureDataUrl === 'string' && signatureDataUrl.length > 0) {
      if (signatureDataUrl.length > MAX_SIGNATURE_BASE64_LENGTH || !SIGNATURE_DATA_URL_RE.test(signatureDataUrl)) {
        return json(response, 400, { error: 'La imagen de la firma no es válida.' });
      }
      const base64 = signatureDataUrl.match(SIGNATURE_DATA_URL_RE)[1];
      signatureImagePath = `${active.account.id}/signatures/${agreement.id}.png`;
      await uploadBufferToStorage(BUCKET, signatureImagePath, Buffer.from(base64, 'base64'), 'image/png');
    }

    const nowIso = new Date().toISOString();
    const updateAgreement = await supabaseRequest(`megcredit_service_agreements?id=eq.${agreement.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        status: 'signed',
        signed_full_name: fullName,
        signed_at: nowIso,
        signature_ip_hash: clientIpHash(request, ipSecret()),
        signature_user_agent: clean(request.headers['user-agent'], 500),
        ...(signatureImagePath ? { signature_image_path: signatureImagePath } : {}),
      }),
    });
    if (!updateAgreement.ok) throw new Error(`Supabase agreement update failed: ${updateAgreement.status}`);

    await supabaseRequest(`megcredit_payment_plans?id=eq.${agreement.payment_plan_id}&status=eq.draft`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'awaiting_payment', updated_at: nowIso }),
    });

    return json(response, 200, { ok: true });
  } catch (error) {
    console.error('Sign agreement failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos registrar tu firma. Intenta nuevamente.' });
  }
}

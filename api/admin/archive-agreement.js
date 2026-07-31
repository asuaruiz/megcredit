import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, isUuid, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' });
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origin not allowed.' });
  if (!await getActiveStaffSession(request)) return json(response, 401, { error: 'Invalid session.' });

  const { agreementId } = request.body || {};
  const archived = Boolean(request.body?.archived);
  if (!isUuid(agreementId)) return json(response, 400, { error: 'Invalid agreement.' });

  try {
    const agreement = await supabaseOne(
      `megcredit_service_agreements?id=eq.${agreementId}&select=id,status,payment_plan_id`,
      { method: 'GET' },
    );
    if (!agreement) return json(response, 404, { error: 'Agreement not found.' });
    if (agreement.status !== 'signed') return json(response, 409, { error: 'Only signed agreements can be archived.' });

    if (archived) {
      const plan = await supabaseOne(
        `megcredit_payment_plans?id=eq.${agreement.payment_plan_id}&select=status`,
        { method: 'GET' },
      );
      if (plan?.status !== 'canceled') return json(response, 409, { error: 'Only agreements for a canceled service can be archived.' });
    }

    const result = await supabaseRequest(`megcredit_service_agreements?id=eq.${agreementId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ archived }),
    });
    if (!result.ok) throw new Error(`Agreement archive update failed: ${result.status}`);
    return json(response, 200, { ok: true });
  } catch (error) {
    console.error('Archive agreement failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: "We couldn't update the agreement." });
  }
}

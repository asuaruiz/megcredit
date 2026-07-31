import { getActiveStaffSession } from '../_lib/admin.js';
import { cancelStripeSubscription } from '../_lib/stripe.js';
import { allowedOrigin, isUuid, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Método no permitido.' });
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });
  if (!await getActiveStaffSession(request)) return json(response, 401, { error: 'Sesión no válida.' });
  const planId = request.body?.paymentPlanId;
  if (!isUuid(planId)) return json(response, 400, { error: 'Plan inválido.' });
  try {
    const plan = await supabaseOne(`megcredit_payment_plans?id=eq.${planId}&select=id,status,stripe_subscription_id`, { method: 'GET' });
    if (!plan) return json(response, 404, { error: 'Plan no encontrado.' });
    if (['paid', 'canceled'].includes(plan.status)) return json(response, 409, { error: 'Este plan ya está finalizado.' });
    if (plan.stripe_subscription_id) await cancelStripeSubscription(plan.stripe_subscription_id);
    const result = await supabaseRequest(`megcredit_payment_plans?id=eq.${plan.id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'canceled', updated_at: new Date().toISOString() }),
    });
    if (!result.ok) throw new Error(`Plan cancellation update failed: ${result.status}`);
    return json(response, 200, { ok: true });
  } catch (error) {
    console.error('Cancel plan failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos cancelar el servicio y sus pagos.' });
  }
}

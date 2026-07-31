import { getActiveStaffSession } from '../_lib/admin.js';
import { listStripeInvoices } from '../_lib/stripe.js';
import { allowedOrigin, isUuid, json, supabaseOne } from '../_lib/portal.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return json(response, 405, { error: 'Método no permitido.' });
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });
  if (!await getActiveStaffSession(request)) return json(response, 401, { error: 'Sesión no válida.' });
  const planId = request.query?.id;
  if (!isUuid(planId)) return json(response, 400, { error: 'Plan inválido.' });
  try {
    const plan = await supabaseOne(`megcredit_payment_plans?id=eq.${planId}&select=id,stripe_subscription_id,stripe_customer_id,currency,amount_paid_cents,total_amount_cents`, { method: 'GET' });
    if (!plan) return json(response, 404, { error: 'Plan no encontrado.' });
    if (!plan.stripe_subscription_id) return json(response, 200, { payments: [], amountPaidCents: plan.amount_paid_cents || 0, totalAmountCents: plan.total_amount_cents || 0 });
    const invoices = await listStripeInvoices({ subscriptionId: plan.stripe_subscription_id });
    const payments = (invoices.data || []).map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      amountRemaining: invoice.amount_remaining,
      currency: invoice.currency,
      created: invoice.created,
      paidAt: invoice.status_transitions?.paid_at || null,
      hostedInvoiceUrl: invoice.hosted_invoice_url || null,
    }));
    return json(response, 200, { payments, amountPaidCents: plan.amount_paid_cents || 0, totalAmountCents: plan.total_amount_cents || 0 });
  } catch (error) {
    console.error('Payment history failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos cargar el historial de pagos.' });
  }
}

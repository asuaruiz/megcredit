import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, isUuid, json, recurringPaymentReminderEmailHtml, sendPortalEmail, supabaseOne } from '../_lib/portal.js';

const INTERVAL_LABEL = { week: 'weekly', month: 'monthly', year: 'yearly' };

export default async function handler(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Método no permitido.' });
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });
  if (!await getActiveStaffSession(request)) return json(response, 401, { error: 'Sesión no válida.' });
  const planId = request.body?.paymentPlanId;
  if (!isUuid(planId)) return json(response, 400, { error: 'Plan inválido.' });
  try {
    const plan = await supabaseOne(`megcredit_payment_plans?id=eq.${planId}&billing_type=eq.recurring&status=in.(active,past_due)&select=id,client_account_id,recurring_interval,recurring_amount_cents,currency`, { method: 'GET' });
    if (!plan) return json(response, 409, { error: 'Solo puedes recordar pagos de planes recurrentes activos o atrasados.' });
    const client = await supabaseOne(`megcredit_client_accounts?id=eq.${plan.client_account_id}&status=eq.active&select=email,full_name`, { method: 'GET' });
    if (!client) return json(response, 404, { error: 'Cliente no encontrado o inactivo.' });
    const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: (plan.currency || 'usd').toUpperCase() }).format(plan.recurring_amount_cents / 100);
    const loginUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:5173/portal/dashboard' : 'https://www.megcredit.com/portal/dashboard';
    await sendPortalEmail({
      to: client.email,
      subject: 'Reminder: your MEG Credit recurring payment',
      html: recurringPaymentReminderEmailHtml({ fullName: client.full_name, amount, interval: INTERVAL_LABEL[plan.recurring_interval] || plan.recurring_interval, loginUrl }),
    });
    return json(response, 200, { ok: true });
  } catch (error) {
    console.error('Payment reminder failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos enviar el recordatorio.' });
  }
}

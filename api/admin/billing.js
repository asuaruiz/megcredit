import { getActiveStaffSession } from '../_lib/admin.js';
import { allowedOrigin, json, supabaseRequest } from '../_lib/portal.js';

function nextChargeDate(plan, transactions) {
  if (plan.billing_type !== 'recurring' || !['active', 'past_due'].includes(plan.status)) return null;
  const last = transactions.find((entry) => entry.payment_plan_id === plan.id && entry.status === 'succeeded' && entry.amount_cents > 0);
  const date = new Date(last?.occurred_at || plan.created_at);
  const count = plan.recurring_interval_count || 1;
  if (plan.recurring_interval === 'week') date.setUTCDate(date.getUTCDate() + (7 * count));
  else if (plan.recurring_interval === 'month') date.setUTCMonth(date.getUTCMonth() + count);
  else date.setUTCFullYear(date.getUTCFullYear() + count);
  return date.toISOString();
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return json(response, 405, { error: 'Método no permitido.' });
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });
  if (!(await getActiveStaffSession(request))) return json(response, 401, { error: 'Sesión no válida.' });

  try {
    const [plansResult, accountsResult, servicesResult, transactionsResult] = await Promise.all([
      supabaseRequest('megcredit_payment_plans?select=id,client_account_id,billing_type,recurring_interval,recurring_interval_count,recurring_amount_cents,first_payment_cents,total_amount_cents,amount_paid_cents,currency,status,stripe_subscription_id,stripe_checkout_session_id,created_at,updated_at&order=created_at.desc', { method: 'GET' }),
      supabaseRequest('megcredit_client_accounts?select=id,email,full_name', { method: 'GET' }),
      supabaseRequest('megcredit_client_services?select=payment_plan_id,name', { method: 'GET' }),
      supabaseRequest('megcredit_payment_transactions?select=id,payment_plan_id,client_account_id,transaction_type,status,amount_cents,currency,stripe_invoice_id,description,occurred_at&order=occurred_at.desc&limit=1000', { method: 'GET' }),
    ]);
    if (!plansResult.ok || !accountsResult.ok || !transactionsResult.ok) throw new Error('Billing query failed');
    const [plans, accounts, services, transactions] = await Promise.all([
      plansResult.json(), accountsResult.json(), servicesResult.ok ? servicesResult.json() : [], transactionsResult.json(),
    ]);
    const accountMap = new Map(accounts.map((account) => [account.id, account]));
    const rows = plans.map((plan) => {
      const total = plan.total_amount_cents || 0;
      const paid = Math.min(plan.amount_paid_cents || 0, total || Number.MAX_SAFE_INTEGER);
      return {
        ...plan,
        client: accountMap.get(plan.client_account_id) || null,
        services: services.filter((service) => service.payment_plan_id === plan.id).map((service) => service.name),
        balance_cents: Math.max(total - paid, 0),
        next_charge_at: nextChargeDate(plan, transactions),
      };
    });
    const collectible = rows.filter((plan) => !['draft', 'canceled'].includes(plan.status));
    const summary = {
      total_agreed_cents: collectible.reduce((sum, plan) => sum + (plan.total_amount_cents || 0), 0),
      total_paid_cents: collectible.reduce((sum, plan) => sum + (plan.amount_paid_cents || 0), 0),
      total_due_cents: collectible.reduce((sum, plan) => sum + plan.balance_cents, 0),
      past_due_cents: collectible.filter((plan) => plan.status === 'past_due').reduce((sum, plan) => sum + plan.balance_cents, 0),
      active_subscriptions: collectible.filter((plan) => plan.status === 'active' && plan.billing_type === 'recurring').length,
      failed_payments: transactions.filter((entry) => entry.transaction_type === 'payment_failed').length,
    };
    return json(response, 200, { summary, plans: rows, transactions });
  } catch (error) {
    console.error('Admin billing failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos cargar la contabilidad.' });
  }
}

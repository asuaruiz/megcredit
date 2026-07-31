import { getActiveStaffSession } from '../_lib/admin.js';
import { createCheckoutSession, createStripeCustomer } from '../_lib/stripe.js';
import { allowedOrigin, isUuid, json, paymentLinkEmailHtml, sendPortalEmail, supabaseOne, supabaseRequest } from '../_lib/portal.js';

function siteUrl() {
  return process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : 'https://www.megcredit.com';
}

function nextBillingTimestamp(interval) {
  const date = new Date();
  if (interval === 'week') date.setUTCDate(date.getUTCDate() + 7);
  else if (interval === 'month') date.setUTCMonth(date.getUTCMonth() + 1);
  else date.setUTCFullYear(date.getUTCFullYear() + 1);
  return Math.floor(date.getTime() / 1000);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Método no permitido.' });
  }
  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });
  const active = await getActiveStaffSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  const paymentPlanId = (request.body || {}).paymentPlanId;
  if (!isUuid(paymentPlanId)) return json(response, 400, { error: 'Plan inválido.' });

  try {
    const plan = await supabaseOne(
      `megcredit_payment_plans?id=eq.${paymentPlanId}&status=eq.awaiting_payment&select=id,client_account_id,billing_type,recurring_interval,currency,first_payment_cents,recurring_amount_cents,total_amount_cents`,
      { method: 'GET' },
    );
    if (!plan) return json(response, 404, { error: 'Este plan no está pendiente de pago.' });

    const agreement = await supabaseOne(
      `megcredit_service_agreements?payment_plan_id=eq.${plan.id}&status=eq.signed&select=id`,
      { method: 'GET' },
    );
    if (!agreement) return json(response, 409, { error: 'El cliente debe firmar el contrato antes de recibir el enlace de pago.' });

    const account = await supabaseOne(
      `megcredit_client_accounts?id=eq.${plan.client_account_id}&status=eq.active&select=id,email,full_name,stripe_customer_id`,
      { method: 'GET' },
    );
    if (!account) return json(response, 404, { error: 'Cliente no encontrado o inactivo.' });

    const servicesResult = await supabaseRequest(
      `megcredit_client_services?payment_plan_id=eq.${plan.id}&select=name,description,price_cents`,
      { method: 'GET' },
    );
    if (!servicesResult.ok) throw new Error(`Supabase services query failed: ${servicesResult.status}`);
    const services = await servicesResult.json();
    if (services.length === 0) return json(response, 409, { error: 'Este plan no tiene servicios asociados.' });

    let customerId = account.stripe_customer_id;
    if (!customerId) {
      const customer = await createStripeCustomer({ email: account.email, name: account.full_name });
      customerId = customer.id;
      const customerUpdate = await supabaseRequest(`megcredit_client_accounts?id=eq.${account.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ stripe_customer_id: customerId }),
      });
      if (!customerUpdate.ok) throw new Error(`Supabase customer update failed: ${customerUpdate.status}`);
    }

    const isRecurring = plan.billing_type === 'recurring';
    let lineItems;
    if (isRecurring) {
      if (!Number.isInteger(plan.recurring_amount_cents) || plan.recurring_amount_cents <= 0) {
        return json(response, 409, { error: 'El plan no tiene un monto recurrente válido.' });
      }
      lineItems = [{
        quantity: 1,
        price_data: {
          currency: plan.currency,
          unit_amount: plan.recurring_amount_cents,
          recurring: { interval: plan.recurring_interval },
          product_data: { name: 'Pago recurrente', description: services.map((service) => service.name).join(', ') },
        },
      }];
      if (Number.isInteger(plan.first_payment_cents) && plan.first_payment_cents > 0 && plan.first_payment_cents !== plan.recurring_amount_cents) {
        lineItems.push({ quantity: 1, price_data: { currency: plan.currency, unit_amount: plan.first_payment_cents, product_data: { name: 'Primer pago' } } });
      }
    } else {
      lineItems = services.map((service) => ({
        quantity: 1,
        price_data: {
          currency: plan.currency,
          unit_amount: service.price_cents,
          product_data: { name: service.name, ...(service.description ? { description: service.description } : {}) },
        },
      }));
    }

    const session = await createCheckoutSession({
      customerId,
      mode: isRecurring ? 'subscription' : 'payment',
      lineItems,
      metadata: { payment_plan_id: plan.id },
      subscriptionData: isRecurring ? {
        metadata: { payment_plan_id: plan.id, total_amount_cents: plan.total_amount_cents },
        ...(plan.first_payment_cents > 0 && plan.first_payment_cents !== plan.recurring_amount_cents
          ? { trial_end: nextBillingTimestamp(plan.recurring_interval) }
          : {}),
      } : undefined,
      clientReferenceId: plan.id,
      successUrl: `${siteUrl()}/portal/dashboard?payment=success`,
      cancelUrl: `${siteUrl()}/portal/dashboard?payment=cancelled`,
    });

    const planUpdate = await supabaseRequest(`megcredit_payment_plans?id=eq.${plan.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ stripe_checkout_session_id: session.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() }),
    });
    if (!planUpdate.ok) throw new Error(`Supabase plan update failed: ${planUpdate.status}`);

    await sendPortalEmail({
      to: account.email,
      subject: 'Tu enlace de pago de MEG Credit',
      html: paymentLinkEmailHtml({ fullName: account.full_name, paymentUrl: session.url }),
    });

    return json(response, 200, { ok: true });
  } catch (error) {
    console.error('Resend payment link failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos generar y enviar el enlace de pago.' });
  }
}

import { createCheckoutSession, createStripeCustomer } from '../_lib/stripe.js';
import { allowedOrigin, getActiveSession, isUuid, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

function siteUrl() {
  return process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : 'https://www.megcredit.com';
}

function nextBillingTimestamp(interval, count = 1) {
  const date = new Date();
  if (interval === 'week') date.setUTCDate(date.getUTCDate() + (7 * count));
  else if (interval === 'month') date.setUTCMonth(date.getUTCMonth() + count);
  else date.setUTCFullYear(date.getUTCFullYear() + count);
  return Math.floor(date.getTime() / 1000);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  if (!allowedOrigin(request)) return json(response, 403, { error: 'Origen no autorizado.' });

  const active = await getActiveSession(request);
  if (!active) return json(response, 401, { error: 'Sesión no válida.' });

  const paymentPlanId = (request.body || {}).paymentPlanId;
  if (!isUuid(paymentPlanId)) return json(response, 400, { error: 'Plan inválido.' });

  try {
    const plan = await supabaseOne(
      `megcredit_payment_plans?id=eq.${paymentPlanId}&client_account_id=eq.${active.account.id}&status=eq.awaiting_payment&select=id,billing_type,recurring_interval,recurring_interval_count,currency,first_payment_cents,recurring_amount_cents,total_amount_cents`,
      { method: 'GET' },
    );
    if (!plan) return json(response, 404, { error: 'Este plan no está listo para pagarse.' });

    const signedAgreement = await supabaseOne(
      `megcredit_service_agreements?payment_plan_id=eq.${plan.id}&status=eq.signed&select=id`,
      { method: 'GET' },
    );
    if (!signedAgreement) return json(response, 409, { error: 'Debes firmar el contrato antes de pagar.' });

    const servicesResult = await supabaseRequest(
      `megcredit_client_services?payment_plan_id=eq.${plan.id}&select=name,description,price_cents`,
      { method: 'GET' },
    );
    if (!servicesResult.ok) throw new Error(`Supabase services query failed: ${servicesResult.status}`);
    const services = await servicesResult.json();
    if (services.length === 0) return json(response, 409, { error: 'Este plan no tiene servicios asociados.' });

    const account = await supabaseOne(
      `megcredit_client_accounts?id=eq.${active.account.id}&select=id,email,full_name,stripe_customer_id`,
      { method: 'GET' },
    );

    let customerId = account.stripe_customer_id;
    if (!customerId) {
      const customer = await createStripeCustomer({ email: account.email, name: account.full_name });
      customerId = customer.id;
      await supabaseRequest(`megcredit_client_accounts?id=eq.${account.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ stripe_customer_id: customerId }),
      });
    }

    const isRecurring = plan.billing_type === 'recurring';
    let lineItems;

    if (isRecurring) {
      if (!Number.isInteger(plan.recurring_amount_cents) || plan.recurring_amount_cents <= 0) {
        throw new Error(`Recurring plan ${plan.id} is missing a valid recurring_amount_cents`);
      }
      lineItems = [{
        quantity: 1,
        price_data: {
          currency: plan.currency,
          unit_amount: plan.recurring_amount_cents,
          recurring: { interval: plan.recurring_interval, interval_count: plan.recurring_interval_count || 1 },
          product_data: { name: 'Pago recurrente', description: services.map((service) => service.name).join(', ') },
        },
      }];
      if (Number.isInteger(plan.first_payment_cents) && plan.first_payment_cents > 0 && plan.first_payment_cents !== plan.recurring_amount_cents) {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: plan.currency,
            unit_amount: plan.first_payment_cents,
            product_data: { name: 'Primer pago' },
          },
        });
      }
    } else {
      lineItems = services.map((service) => ({
        quantity: 1,
        price_data: {
          currency: plan.currency,
          unit_amount: service.price_cents,
          ...(service.description ? { product_data: { name: service.name, description: service.description } } : { product_data: { name: service.name } }),
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
          ? { trial_end: nextBillingTimestamp(plan.recurring_interval, plan.recurring_interval_count || 1) }
          : {}),
      } : undefined,
      clientReferenceId: plan.id,
      successUrl: `${siteUrl()}/portal/dashboard?payment=success`,
      cancelUrl: `${siteUrl()}/portal/dashboard?payment=cancelled`,
    });

    await supabaseRequest(`megcredit_payment_plans?id=eq.${plan.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ stripe_checkout_session_id: session.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() }),
    });

    return json(response, 200, { url: session.url });
  } catch (error) {
    console.error('Create checkout session failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos iniciar el pago. Intenta nuevamente.' });
  }
}

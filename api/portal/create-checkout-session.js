import { createCheckoutSession, createStripeCustomer } from '../_lib/stripe.js';
import { allowedOrigin, getActiveSession, isUuid, json, supabaseOne, supabaseRequest } from '../_lib/portal.js';

function siteUrl() {
  return process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : 'https://www.megcredit.com';
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
      `megcredit_payment_plans?id=eq.${paymentPlanId}&client_account_id=eq.${active.account.id}&status=eq.awaiting_payment&select=id,billing_type,recurring_interval,currency,first_payment_cents,recurring_amount_cents`,
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
      // The recurring charge is the plan's own recurring_amount_cents, set by staff -- independent
      // of each service's price_cents (those are reference/total value shown in the contract, not
      // per-period charges). First payment (if any) bills once on the first invoice alongside it --
      // Stripe Checkout supports mixing one-time and recurring line items in subscription mode.
      lineItems = [{
        quantity: 1,
        price_data: {
          currency: plan.currency,
          unit_amount: plan.recurring_amount_cents,
          recurring: { interval: plan.recurring_interval },
          product_data: { name: 'Pago recurrente', description: services.map((service) => service.name).join(', ') },
        },
      }];
      if (Number.isInteger(plan.first_payment_cents) && plan.first_payment_cents > 0) {
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

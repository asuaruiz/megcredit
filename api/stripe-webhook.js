import { cancelStripeSubscription, readRawBody, verifyStripeSignature } from './_lib/stripe.js';
import { json, supabaseOne, supabaseRequest } from './_lib/portal.js';

export const config = { api: { bodyParser: false } };

async function markPlan(filter, patch) {
  await supabaseRequest(`megcredit_payment_plans?${filter}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

async function recordTransaction({ plan, event, type, status, amountCents, object, description }) {
  if (!plan) return;
  const result = await supabaseRequest('megcredit_payment_transactions', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      payment_plan_id: plan.id,
      client_account_id: plan.client_account_id,
      transaction_type: type,
      status,
      amount_cents: amountCents,
      currency: object.currency || plan.currency || 'usd',
      stripe_event_id: event.id,
      stripe_invoice_id: object.object === 'invoice' ? object.id : object.invoice || null,
      stripe_payment_intent_id: typeof object.payment_intent === 'string' ? object.payment_intent : object.id?.startsWith('pi_') ? object.id : null,
      description,
      occurred_at: new Date((event.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    }),
  });
  if (!result.ok && result.status !== 409) throw new Error(`Accounting transaction insert failed: ${result.status}`);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Método no permitido.' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return json(response, 503, { error: 'Webhook no configurado.' });
  }

  const rawBody = await readRawBody(request);
  const signature = request.headers['stripe-signature'];

  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return json(response, 400, { error: 'Firma inválida.' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json(response, 400, { error: 'JSON inválido.' });
  }

  try {
    const insertResult = await supabaseRequest('megcredit_stripe_webhook_events', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ id: event.id, type: event.type }),
    });

    if (insertResult.status === 409) {
      return json(response, 200, { received: true, duplicate: true });
    }
    if (!insertResult.ok) throw new Error(`Supabase webhook event insert failed: ${insertResult.status}`);

    const object = event.data?.object || {};

    if (event.type === 'checkout.session.completed') {
      const paymentPlanId = object.metadata?.payment_plan_id || object.client_reference_id;
      if (paymentPlanId) {
        const isSubscription = object.mode === 'subscription';
        const plan = await supabaseOne(`megcredit_payment_plans?id=eq.${paymentPlanId}&select=id,client_account_id,currency,amount_paid_cents,total_amount_cents`, { method: 'GET' });
        await markPlan(`id=eq.${paymentPlanId}&status=eq.awaiting_payment`, {
          status: isSubscription ? 'active' : 'paid',
          stripe_subscription_id: isSubscription ? object.subscription : null,
          ...(!isSubscription && Number.isInteger(object.amount_total) ? { amount_paid_cents: object.amount_total } : {}),
        });
        if (!isSubscription && Number.isInteger(object.amount_total) && object.amount_total > 0) {
          await recordTransaction({ plan, event, type: 'payment', status: 'succeeded', amountCents: object.amount_total, object, description: 'Pago único mediante Stripe Checkout' });
        }
      }
    } else if (event.type === 'customer.subscription.deleted') {
      await markPlan(`stripe_subscription_id=eq.${object.id}&status=in.(active,past_due)`, { status: 'canceled' });
    } else if (event.type === 'invoice.payment_failed') {
      if (object.subscription) {
        const plan = await supabaseOne(`megcredit_payment_plans?stripe_subscription_id=eq.${object.subscription}&select=id,client_account_id,currency`, { method: 'GET' });
        await markPlan(`stripe_subscription_id=eq.${object.subscription}`, { status: 'past_due' });
        await recordTransaction({ plan, event, type: 'payment_failed', status: 'failed', amountCents: object.amount_due || 0, object, description: 'Cobro recurrente fallido' });
      }
    } else if (event.type === 'invoice.paid') {
      const subscriptionId = typeof object.subscription === 'string'
        ? object.subscription
        : object.parent?.subscription_details?.subscription;
      const metadataPlanId = object.parent?.subscription_details?.metadata?.payment_plan_id
        || object.subscription_details?.metadata?.payment_plan_id;
      const plan = metadataPlanId
        ? await supabaseOne(`megcredit_payment_plans?id=eq.${metadataPlanId}&select=id,client_account_id,currency,status,stripe_subscription_id,total_amount_cents,amount_paid_cents`, { method: 'GET' })
        : subscriptionId
          ? await supabaseOne(`megcredit_payment_plans?stripe_subscription_id=eq.${subscriptionId}&select=id,client_account_id,currency,status,stripe_subscription_id,total_amount_cents,amount_paid_cents`, { method: 'GET' })
          : null;
      if (plan && Number.isInteger(object.amount_paid) && object.amount_paid > 0) {
        const amountPaid = (plan.amount_paid_cents || 0) + object.amount_paid;
        const completed = plan.total_amount_cents > 0 && amountPaid >= plan.total_amount_cents;
        await markPlan(`id=eq.${plan.id}`, { amount_paid_cents: amountPaid, ...(completed ? { status: 'paid' } : {}) });
        const stripeSubscriptionId = subscriptionId || plan.stripe_subscription_id;
        if (completed && stripeSubscriptionId) await cancelStripeSubscription(stripeSubscriptionId);
        await recordTransaction({ plan, event, type: 'payment', status: 'succeeded', amountCents: object.amount_paid, object, description: 'Factura de Stripe pagada' });
      }
    }

    return json(response, 200, { received: true });
  } catch (error) {
    console.error('Stripe webhook handling failed', error instanceof Error ? error.message : 'unknown error');
    return json(response, 500, { error: 'No pudimos procesar el evento.' });
  }
}

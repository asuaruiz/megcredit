import { createHmac, timingSafeEqual } from 'node:crypto';

const WEBHOOK_TOLERANCE_SECONDS = 300;

function flattenFormValue(value, path, out) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenFormValue(item, `${path}[${index}]`, out));
  } else if (typeof value === 'object') {
    Object.entries(value).forEach(([key, nested]) => flattenFormValue(nested, `${path}[${key}]`, out));
  } else {
    out.push(`${encodeURIComponent(path)}=${encodeURIComponent(value)}`);
  }
}

function toFormBody(fields) {
  const out = [];
  Object.entries(fields).forEach(([key, value]) => flattenFormValue(value, key, out));
  return out.join('&');
}

async function stripeRequest(path, fields, method = 'POST') {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY');
  const formBody = toFormBody(fields);
  const requestUrl = method === 'GET' && formBody ? `https://api.stripe.com/v1/${path}?${formBody}` : `https://api.stripe.com/v1/${path}`;
  const result = await fetch(requestUrl, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    ...(method === 'POST' ? { body: formBody } : {}),
  });
  if (!result.ok) throw new Error(`Stripe request failed: ${result.status} ${await result.text()}`);
  return result.json();
}

export function createStripeCustomer({ email, name }) {
  return stripeRequest('customers', { email, name });
}

export function createCheckoutSession({ customerId, mode, lineItems, metadata, subscriptionData, successUrl, cancelUrl, clientReferenceId }) {
  return stripeRequest('checkout/sessions', {
    mode,
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: clientReferenceId,
    metadata,
    ...(subscriptionData ? { subscription_data: subscriptionData } : {}),
    line_items: lineItems,
  });
}

export function cancelStripeSubscription(subscriptionId) {
  return stripeRequest(`subscriptions/${encodeURIComponent(subscriptionId)}`, {}, 'DELETE');
}

export function listStripeInvoices({ subscriptionId, customerId, limit = 25 }) {
  return stripeRequest('invoices', {
    ...(subscriptionId ? { subscription: subscriptionId } : {}),
    ...(!subscriptionId && customerId ? { customer: customerId } : {}),
    limit,
  }, 'GET');
}

export function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((pair) => {
      const [key, value] = pair.split('=');
      return [key, value];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > WEBHOOK_TOLERANCE_SECONDS) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function readRawBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

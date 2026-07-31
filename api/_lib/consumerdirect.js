import { ProxyAgent } from 'undici';

// ConsumerDirect requires calls to originate from a static, dedicated, US IP -- Vercel
// serverless functions don't have one, so every outbound request here is routed through a
// self-hosted forward proxy (see CONSUMERDIRECT_PROXY_URL) instead of going out directly.
const AUTH_HOST = 'https://auth.consumerdirect.io';
const PAPI_HOST = 'https://papi.consumerdirect.io';
const SMARTCREDIT_HOST = 'https://api.smartcredit.com';

let cachedDispatcher = null;
function proxyDispatcher() {
  if (cachedDispatcher) return cachedDispatcher;
  const proxyUrl = process.env.CONSUMERDIRECT_PROXY_URL;
  if (!proxyUrl) throw new Error('Missing CONSUMERDIRECT_PROXY_URL');
  cachedDispatcher = new ProxyAgent(proxyUrl);
  return cachedDispatcher;
}

async function proxyJson(url, options = {}) {
  const result = await fetch(url, { ...options, dispatcher: proxyDispatcher() });
  if (!result.ok) throw new Error(`ConsumerDirect request failed: ${result.status} ${await result.text()}`);
  return result.json();
}

// Step 1: partner token (PAPI JWT). expires_in is ~59s -- callers must fetch a fresh one for
// every operation, never cache this across requests.
export async function getPartnerToken() {
  const clientId = process.env.CONSUMERDIRECT_CLIENT_KEY;
  const clientSecret = process.env.CONSUMERDIRECT_CLIENT_SECRET;
  const entityId = process.env.CONSUMERDIRECT_ENTITY_ID;
  if (!clientId || !clientSecret || !entityId) {
    throw new Error('Missing CONSUMERDIRECT_CLIENT_KEY / CONSUMERDIRECT_CLIENT_SECRET / CONSUMERDIRECT_ENTITY_ID');
  }
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({ grant_type: 'client_credentials', scope: `target-entity:${entityId}` });
  const data = await proxyJson(`${AUTH_HOST}/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!data.access_token) throw new Error('ConsumerDirect token response missing access_token');
  return data.access_token;
}

// Looks up a customer already enrolled under MEG Credit's sponsor code, by email, so staff
// doesn't have to copy the customerToken by hand from PartnerHub. Unlike the rest of this
// file, this endpoint's exact response shape was NOT part of ConsumerDirect support's
// confirmed guide (it comes from the public developer docs) -- treat it as best-effort and
// verify once the proxy IP is whitelisted. Falls back to null so callers can offer manual entry.
export async function findCustomerByEmail(email) {
  const partnerToken = await getPartnerToken();
  const data = await proxyJson(`${PAPI_HOST}/v1/customers?email=${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${partnerToken}` },
  });
  const candidates = Array.isArray(data) ? data : data.customers || data.data || data.results || [];
  const match = candidates[0];
  if (!match) return null;
  const customerToken = match.customerToken || match.customer_token || match.token;
  if (!customerToken) return null;
  return { customerToken, pid: match.pid || match.pidn || null };
}

// Step 2: one-time login code for a specific customer, using the partner token.
export async function requestLoginOtc(customerToken, partnerToken) {
  const agentId = process.env.CONSUMERDIRECT_AGENT_ID || 'megcredit-portal';
  const data = await proxyJson(`${PAPI_HOST}/v1/customers/${encodeURIComponent(customerToken)}/otcs/login-as`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${partnerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ agentId }),
  });
  const code = data.code || data.otc || data.token;
  if (!code) throw new Error('ConsumerDirect login-as response missing an OTC code');
  return code;
}

// Step 3: exchange the OTC for a short-lived (5-15 min) customer bearer token.
export async function exchangeOtcForCustomerToken(code) {
  const data = await proxyJson(`${SMARTCREDIT_HOST}/v1/login?code=${encodeURIComponent(code)}`, { method: 'GET' });
  const bearer = data.access_token || data.token;
  if (!bearer) throw new Error('SmartCredit login response missing an access token');
  return bearer;
}

// Full login-as-customer flow (steps 1-3), returning a bearer ready to call the customer's
// own SmartCredit endpoints.
export async function getCustomerBearerToken(customerToken) {
  const partnerToken = await getPartnerToken();
  const otc = await requestLoginOtc(customerToken, partnerToken);
  return exchangeOtcForCustomerToken(otc);
}

function customerGet(path, bearer) {
  return proxyJson(`${SMARTCREDIT_HOST}${path}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${bearer}` },
  });
}

export const getCustomerProfile = (bearer) => customerGet('/v1/customer', bearer);
export const getMemberPlan = (bearer) => customerGet('/v1/customer/member-plan', bearer);
export const getCustomerStatement = (bearer) => customerGet('/v1/customer/statement', bearer);
export const getThreeBureauMetadata = (bearer) => customerGet('/v1/credit/3bs/metadata', bearer);
export const getCurrentThreeBureauReport = (bearer) => customerGet('/v1/credit/3bs/current', bearer);
export const getThreeBureauReportById = (bearer, orderId) => customerGet(`/v1/credit/3bs/${encodeURIComponent(orderId)}`, bearer);

// Orders a new 3-bureau report. Never pass isNonPaid: true for a real customer -- that flag
// exists only so ConsumerDirect's own test-customer cards don't get charged during testing.
export function orderThreeBureauReport(bearer) {
  return proxyJson(`${SMARTCREDIT_HOST}/v1/credit/3bs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

// High-level helper used by api/admin/bureau-sync.js: full login-as-customer flow + current
// 3B report in one call.
export async function fetchCurrentBureauReport(customerToken) {
  const bearer = await getCustomerBearerToken(customerToken);
  return getCurrentThreeBureauReport(bearer);
}

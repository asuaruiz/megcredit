// Fase 0 spike: NOT production code. Run manually to discover the real shape of the
// ConsumerDirect Partner API before building api/_lib/consumerdirect.js for real.
//
// Usage:
//   1. Put these in .env.local (gitignored) or export them in your shell:
//        CONSUMERDIRECT_CLIENT_KEY=...
//        CONSUMERDIRECT_CLIENT_SECRET=...
//        CONSUMERDIRECT_TEST_EMAIL=alguien@tu-cliente-de-prueba.com
//   2. node scripts/consumerdirect-spike.mjs
//
// Prints the raw response of each call so we can see field-by-field what's actually
// returned, instead of trusting the public docs (which don't show a bureau
// score/tradeline endpoint).

import { readFileSync } from 'node:fs';

function loadEnvLocal() {
  try {
    const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // no .env.local, rely on already-exported shell vars
  }
}

loadEnvLocal();

const PWS_BASE = 'https://pws.consumerdirect.app';
const PAPI_BASE = 'https://papi.consumerdirect.io';

function section(title) {
  console.log(`\n=== ${title} ===`);
}

async function login() {
  const clientKey = process.env.CONSUMERDIRECT_CLIENT_KEY;
  const clientSecret = process.env.CONSUMERDIRECT_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    throw new Error('Falta CONSUMERDIRECT_CLIENT_KEY / CONSUMERDIRECT_CLIENT_SECRET en el entorno.');
  }

  const res = await fetch(`${PWS_BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
    body: new URLSearchParams({ clientKey, clientSecret }).toString(),
  });

  const bodyText = await res.text();
  section('POST /login');
  console.log('status:', res.status);
  console.log('authorization header:', res.headers.get('authorization'));
  console.log('body:', bodyText);

  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const jwt = res.headers.get('authorization');
  if (!jwt) throw new Error('Login succeeded but no Authorization header came back.');
  return jwt.replace(/^Bearer\s+/i, '');
}

async function callPws(jwt, path, { method = 'GET' } = {}) {
  const res = await fetch(`${PWS_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const bodyText = await res.text();
  section(`${method} ${path} (pws)`);
  console.log('status:', res.status);
  console.log('body:', bodyText);
  return { status: res.status, body: bodyText };
}

async function callPapi(jwt, path) {
  // Auth scheme for papi.consumerdirect.io is unconfirmed by the public docs —
  // trying Bearer JWT first, then falling back to the PartnerHub-generated API key
  // if CONSUMERDIRECT_API_KEY is set.
  const headers = { Authorization: `Bearer ${jwt}` };
  const apiKey = process.env.CONSUMERDIRECT_API_KEY;
  if (apiKey) headers['x-api-key'] = apiKey;

  const res = await fetch(`${PAPI_BASE}${path}`, { headers });
  const bodyText = await res.text();
  section(`GET ${path} (papi)`);
  console.log('status:', res.status);
  console.log('body:', bodyText);
  return { status: res.status, body: bodyText };
}

async function main() {
  const jwt = await login();

  const testEmail = process.env.CONSUMERDIRECT_TEST_EMAIL;

  // 1. Customer list via papi — does it come pre-scoped to the partner, and does
  //    the pws JWT even work here, or does papi need a different key?
  await callPapi(jwt, `/v1/customers${testEmail ? `?email=${encodeURIComponent(testEmail)}` : ''}`);

  if (!testEmail) {
    console.log('\nCONSUMERDIRECT_TEST_EMAIL no seteado — se salta el resto de las pruebas por-cliente.');
    console.log('Volvé a correr con ese valor seteado a un cliente de prueba real para seguir el spike.');
    return;
  }

  // We need a customerToken to go further. If /v1/customers didn't give us one,
  // stop here and report it — that itself is a finding.
  let customerToken;
  try {
    const listResult = await callPapi(jwt, `/v1/customers?email=${encodeURIComponent(testEmail)}`);
    const parsed = JSON.parse(listResult.body);
    customerToken =
      parsed?.content?.[0]?.customerToken || parsed?.data?.[0]?.customerToken || parsed?.[0]?.customerToken;
  } catch {
    // ignore, handled below
  }

  if (!customerToken) {
    console.log('\nNo se pudo extraer un customerToken de la respuesta de /v1/customers.');
    console.log('Si tenés un customerToken de otra fuente (ej. el dashboard de PartnerHub),');
    console.log('seteá CONSUMERDIRECT_TEST_CUSTOMER_TOKEN y volvé a correr el script.');
    customerToken = process.env.CONSUMERDIRECT_TEST_CUSTOMER_TOKEN;
    if (!customerToken) return;
  }

  console.log(`\nUsando customerToken: ${customerToken}`);

  await callPws(jwt, `/customer/account/details?customerToken=${encodeURIComponent(customerToken)}`);
  await callPws(jwt, `/customer/credit/3bs/details?customerToken=${encodeURIComponent(customerToken)}`);

  // Ordering a new 3B report has side effects (consumes the client's 3B allowance),
  // so it's commented out on purpose — uncomment deliberately once you're ready to
  // spend one of the test client's 3B credits to see what the order response/flow
  // actually returns.
  // await callPws(jwt, `/customer/credit/3bs?customerToken=${encodeURIComponent(customerToken)}`, { method: 'POST' });

  section('Resumen');
  console.log('Revisá arriba: 1) si /v1/customers ya viene filtrado a tu sponsor code,');
  console.log('2) si algún body trae scores/tradelines/disputas per-buró en JSON,');
  console.log('3) si 3bs/details sugiere que el reporte real es un documento descargable aparte.');
}

main().catch((error) => {
  console.error('\nSpike falló:', error.message);
  process.exitCode = 1;
});

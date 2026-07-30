import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE_NAME = 'megcredit_portal_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
export const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const MAX_ATTEMPTS_PER_HOUR = 8;

export function json(response, status, body) {
  response.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  return response.json(body);
}

export function clean(value, maxLength) {
  return typeof value === 'string' ? value.trim().replace(/\0/g, '').slice(0, maxLength) : '';
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function allowedOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  const allowed = new Set([
    'https://megcredit.com',
    'https://www.megcredit.com',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:5173', 'http://127.0.0.1:5173'] : []),
  ]);
  return allowed.has(origin);
}

export function clientIpHash(request, secret) {
  const forwarded = request.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded || request.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
  return createHmac('sha256', secret).update(ip).digest('hex');
}

export function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function newToken() {
  return randomBytes(32).toString('hex');
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, hashHex] = stored.split(':');
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function parseCookies(request) {
  const header = request.headers.cookie;
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((pair) => {
      const index = pair.indexOf('=');
      if (index === -1) return [pair.trim(), ''];
      return [pair.slice(0, index).trim(), decodeURIComponent(pair.slice(index + 1).trim())];
    }),
  );
}

export function setSessionCookie(response, token, maxAgeSeconds) {
  const secure = process.env.NODE_ENV !== 'development';
  const attributes = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secure) attributes.push('Secure');
  response.setHeader('Set-Cookie', attributes.join('; '));
}

export function clearSessionCookie(response) {
  const secure = process.env.NODE_ENV !== 'development';
  const attributes = [`${SESSION_COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) attributes.push('Secure');
  response.setHeader('Set-Cookie', attributes.join('; '));
}

export function bearerToken(request) {
  const header = request.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export function sessionToken(request) {
  return bearerToken(request) || parseCookies(request)[SESSION_COOKIE_NAME] || '';
}

function supabaseEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing server-side Supabase environment variables');
  return { url, key };
}

export async function supabaseRequest(path, options = {}) {
  const { url, key } = supabaseEnv();
  return fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export async function supabaseOne(path, options = {}) {
  const result = await supabaseRequest(path, options);
  if (!result.ok) throw new Error(`Supabase request failed: ${result.status} ${await result.text()}`);
  const rows = await result.json();
  return Array.isArray(rows) ? rows[0] || null : rows;
}

export async function uploadBufferToStorage(bucket, path, buffer, contentType) {
  const { url, key } = supabaseEnv();
  const result = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!result.ok) throw new Error(`Storage upload failed: ${result.status} ${await result.text()}`);
}

export async function getActiveSession(request) {
  const token = sessionToken(request);
  if (!token) return null;
  const tokenHash = sha256Hex(token);
  const nowIso = new Date().toISOString();
  const session = await supabaseOne(
    `megcredit_client_sessions?token_hash=eq.${tokenHash}&revoked_at=is.null&expires_at=gt.${encodeURIComponent(nowIso)}&select=id,client_account_id,expires_at`,
    { method: 'GET' },
  );
  if (!session) return null;
  const account = await supabaseOne(
    `megcredit_client_accounts?id=eq.${session.client_account_id}&status=eq.active&select=id,email,full_name,phone,status,created_at`,
    { method: 'GET' },
  );
  if (!account) return null;
  return { session, account };
}

export async function recordLoginAttempt(email, ipHash, success) {
  await supabaseRequest('megcredit_portal_login_attempts', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ email, ip_hash: ipHash, success }),
  });
}

export async function isRateLimited(email, ipHash) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const result = await supabaseRequest(
    `megcredit_portal_login_attempts?ip_hash=eq.${ipHash}&created_at=gte.${encodeURIComponent(since)}&success=eq.false&select=id`,
    { method: 'GET', headers: { Prefer: 'count=exact', Range: '0-49' } },
  );
  if (!result.ok) throw new Error(`Supabase rate check failed: ${result.status}`);
  const range = result.headers.get('content-range') || '';
  const count = Number(range.split('/')[1] || 0);
  return count >= MAX_ATTEMPTS_PER_HOUR;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function portalEmailLayout(content, previewText) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(previewText)}</title></head><body style="margin:0;background:#F1EDE4;font-family:Arial,sans-serif;color:#1A1A1A"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(previewText)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F1EDE4;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E9E5DC"><tr><td style="background:#163A5F;padding:30px 36px"><div style="font-family:Georgia,serif;color:#D2AE5C;font-size:24px;font-weight:bold;letter-spacing:6px">MAGIC</div><div style="color:#F8F6F2;font-size:10px;font-weight:bold;letter-spacing:4px;margin-top:5px">ENTERPRISE GROUP</div></td></tr><tr><td style="padding:38px 36px">${content}</td></tr><tr><td style="background:#0E2740;padding:24px 36px;color:#BCC7D4;font-size:12px;line-height:1.7">Magic Enterprise Group · Orlando, Florida<br><a href="https://www.megcredit.com" style="color:#D2AE5C">megcredit.com</a></td></tr></table></td></tr></table></body></html>`;
}

export function inviteEmailHtml({ fullName, activationUrl }) {
  return portalEmailLayout(
    `<p style="margin:0 0 8px;color:#A67C1B;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">Portal de clientes</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;color:#163A5F;font-size:28px;line-height:1.2">Hola, ${escapeHtml(fullName)}.</h1><p style="margin:0 0 22px;color:#4A4A4A;font-size:16px;line-height:1.7">Crea tu cuenta en el portal seguro de MEG Credit para completar tu verificación de identidad.</p><p style="margin:0 0 26px"><a href="${activationUrl}" style="display:inline-block;background:#163A5F;color:#FFFFFF;text-decoration:none;padding:14px 22px;border-radius:6px;font-size:15px;font-weight:bold">Crear mi cuenta</a></p><p style="margin:0;color:#8A8A8A;font-size:13px;line-height:1.6">Este enlace es personal, expira en 7 días y solo puede usarse una vez. Si no solicitaste esto, ignora este correo.</p>`,
    'Crea tu cuenta en el portal de MEG Credit',
  );
}

export function agreementReadyEmailHtml({ fullName, loginUrl }) {
  return portalEmailLayout(
    `<p style="margin:0 0 8px;color:#A67C1B;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">Portal de clientes</p><h1 style="margin:0 0 18px;font-family:Georgia,serif;color:#163A5F;font-size:28px;line-height:1.2">Hola, ${escapeHtml(fullName)}.</h1><p style="margin:0 0 22px;color:#4A4A4A;font-size:16px;line-height:1.7">Tu asesor preparó tu plan de servicios y contrato en el portal de MEG Credit. Inicia sesión para revisarlo y firmarlo.</p><p style="margin:0 0 26px"><a href="${loginUrl}" style="display:inline-block;background:#163A5F;color:#FFFFFF;text-decoration:none;padding:14px 22px;border-radius:6px;font-size:15px;font-weight:bold">Revisar mi contrato</a></p><p style="margin:0;color:#8A8A8A;font-size:13px;line-height:1.6">Si no esperabas este correo, contacta a tu asesor de MEG Credit.</p>`,
    'Tu contrato de servicios está listo para firmar',
  );
}

export async function sendPortalEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL || 'MEG Credit <notificaciones@megcredit.com>';
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!result.ok) throw new Error(`Resend send failed: ${result.status}`);
}

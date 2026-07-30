import { bearerToken, parseCookies, sha256Hex, supabaseOne } from './portal.js';

export const STAFF_SESSION_COOKIE_NAME = 'megcredit_admin_session';
export const STAFF_SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export function staffSessionToken(request) {
  return bearerToken(request) || parseCookies(request)[STAFF_SESSION_COOKIE_NAME] || '';
}

export function setStaffSessionCookie(response, token, maxAgeSeconds) {
  const secure = process.env.NODE_ENV !== 'development';
  const attributes = [
    `${STAFF_SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secure) attributes.push('Secure');
  response.setHeader('Set-Cookie', attributes.join('; '));
}

export function clearStaffSessionCookie(response) {
  const secure = process.env.NODE_ENV !== 'development';
  const attributes = [`${STAFF_SESSION_COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) attributes.push('Secure');
  response.setHeader('Set-Cookie', attributes.join('; '));
}

export async function getActiveStaffSession(request) {
  const token = staffSessionToken(request);
  if (!token) return null;
  const tokenHash = sha256Hex(token);
  const nowIso = new Date().toISOString();
  const session = await supabaseOne(
    `megcredit_staff_sessions?token_hash=eq.${tokenHash}&revoked_at=is.null&expires_at=gt.${encodeURIComponent(nowIso)}&select=id,staff_account_id`,
    { method: 'GET' },
  );
  if (!session) return null;
  const staff = await supabaseOne(
    `megcredit_staff_accounts?id=eq.${session.staff_account_id}&status=eq.active&select=id,email,full_name,role`,
    { method: 'GET' },
  );
  if (!staff) return null;
  return { session, staff };
}

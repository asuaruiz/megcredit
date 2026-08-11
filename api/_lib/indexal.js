import { createHmac, timingSafeEqual } from 'node:crypto';

const TIMESTAMP_TOLERANCE_SECONDS = 300;

function safeEqual(a, b) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function verifyIndexalRequest({ rawBody, timestampHeader, signatureHeader, authorizationHeader, secret }) {
  if (!timestampHeader || !signatureHeader) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestampHeader));
  if (!Number.isFinite(age) || age > TIMESTAMP_TOLERANCE_SECONDS) return false;

  const expectedSignature = `sha256=${createHmac('sha256', secret).update(`${timestampHeader}.${rawBody}`).digest('hex')}`;
  if (!safeEqual(signatureHeader, expectedSignature)) return false;

  if (authorizationHeader && !safeEqual(authorizationHeader, `Bearer ${secret}`)) return false;

  return true;
}

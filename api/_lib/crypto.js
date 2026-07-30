import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function getKey() {
  const keyBase64 = process.env.PORTAL_CREDENTIAL_ENCRYPTION_KEY;
  if (!keyBase64) throw new Error('Missing PORTAL_CREDENTIAL_ENCRYPTION_KEY');
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) throw new Error('PORTAL_CREDENTIAL_ENCRYPTION_KEY must decode to 32 bytes');
  return key;
}

export function encryptSecret(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(payload) {
  if (typeof payload !== 'string') return null;
  const [ivB64, authTagB64, cipherB64] = payload.split(':');
  if (!ivB64 || !authTagB64 || !cipherB64) return null;
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherB64, 'base64')), decipher.final()]);
  return decrypted.toString('utf8');
}

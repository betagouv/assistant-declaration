import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt plaintext with AES-256-GCM using the provided key.
 * Returns a JSON object containing the ciphertext, iv, and auth tag.
 */
export function encrypt(plaintext: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return JSON.stringify({
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    authTag,
  });
}

/**
 * Decrypt ciphertext encrypted by encrypt() using the provided key.
 */
export function decrypt(encryptedData: string, key: string): string {
  const { ciphertext, iv, authTag } = JSON.parse(encryptedData);

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a 256-bit (32 byte) key for AES-256-GCM.
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

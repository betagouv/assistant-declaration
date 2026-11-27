import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const KEY_VERSION = 'v1';
const IV_LENGTH = 16;

/**
 * Get the encryption key from environment.
 * Expects a base64-encoded 32-byte key.
 */
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.MFA_ENCRYPTION_KEY;
  if (!keyEnv) {
    throw new Error('MFA_ENCRYPTION_KEY environment variable is not set');
  }
  const key = Buffer.from(keyEnv, 'base64');
  if (key.length !== 32) {
    throw new Error('MFA_ENCRYPTION_KEY must be a 32-byte (256-bit) key');
  }
  return key;
}

/**
 * Validate that the encryption key is properly configured.
 */
export function validateEncryptionKey(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Encrypt a plaintext secret using AES-256-GCM.
 * Returns a string: v1:<iv>:<ciphertext>:<tag> (all base64).
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  const tag = cipher.getAuthTag().toString('base64');

  return `${KEY_VERSION}:${iv.toString('base64')}:${ciphertext}:${tag}`;
}

/**
 * Decrypt a secret encrypted by encrypt().
 * Expects format: v1:<iv>:<ciphertext>:<tag> (all base64).
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted format');
  }

  const [version, ivB64, ciphertextB64, tagB64] = parts;
  if (version !== KEY_VERSION) {
    throw new Error(`Unsupported key version: ${version}`);
  }

  const iv = Buffer.from(ivB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(ciphertext, undefined, 'utf8');
  plaintext += decipher.final('utf8');
  return plaintext;
}

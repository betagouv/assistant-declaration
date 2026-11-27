import { decrypt, encrypt, validateEncryptionKey } from '../secret-crypto';

describe('Secret Crypto Service', () => {
  const TEST_KEY = Buffer.alloc(32, 42);

  beforeEach(() => {
    process.env.MFA_ENCRYPTION_KEY = TEST_KEY.toString('base64');
  });

  afterEach(() => {
    delete process.env.MFA_ENCRYPTION_KEY;
  });

  describe('validateEncryptionKey', () => {
    it('returns true for a valid 32-byte key', () => {
      expect(validateEncryptionKey()).toBe(true);
    });

    it('returns false for a missing key', () => {
      delete process.env.MFA_ENCRYPTION_KEY;
      expect(validateEncryptionKey()).toBe(false);
    });

    it('returns false for a too-short key', () => {
      process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(16, 42).toString('base64');
      expect(validateEncryptionKey()).toBe(false);
    });

    it('returns false for an invalid base64 key', () => {
      process.env.MFA_ENCRYPTION_KEY = 'not-valid-base64!!!';
      expect(validateEncryptionKey()).toBe(false);
    });
  });

  describe('encrypt / decrypt', () => {
    it('decrypts to the original value', () => {
      const plaintext = 'my-totp-secret-ABC123';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('produces different ciphertexts for the same input', () => {
      const plaintext = 'same-secret';
      const enc1 = encrypt(plaintext);
      const enc2 = encrypt(plaintext);
      expect(enc1).not.toBe(enc2);
    });

    it('includes a v1: prefix for key rotation', () => {
      const encrypted = encrypt('test');
      expect(encrypted).toMatch(/^v1:/);
    });

    it('rejects tampered ciphertext', () => {
      const encrypted = encrypt('test');
      // Corrupt the ciphertext by changing a character
      const parts = encrypted.split(':');
      const corrupted = 'v1:' + parts[1].slice(0, -1) + 'X';
      expect(() => decrypt(corrupted)).toThrow();
    });

    it('throws if encryption key is missing', () => {
      delete process.env.MFA_ENCRYPTION_KEY;
      expect(() => encrypt('test')).toThrow();
    });
  });
});

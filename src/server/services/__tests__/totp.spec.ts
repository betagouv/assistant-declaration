import { authenticator } from '@otplib/preset-default';

import { generateQrCode, generateTotpSecret, getTotpUri, verifyTotp } from '../totp';

describe('TOTP Service', () => {
  describe('generateTotpSecret', () => {
    it('returns a Base32 string', () => {
      const secret = generateTotpSecret();
      expect(typeof secret).toBe('string');
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });

    it('returns a 26-character secret (160 bits, standard)', () => {
      const secret = generateTotpSecret();
      expect(secret.length).toBe(26);
    });

    it('generates unique secrets', () => {
      const s1 = generateTotpSecret();
      const s2 = generateTotpSecret();
      expect(s1).not.toBe(s2);
    });
  });

  describe('getTotpUri', () => {
    it('builds an otpauth URI with the secret', () => {
      const uri = getTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com');
      expect(uri).toMatch(/^otpauth:\/\/totp\//);
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
    });

    it('includes the account name', () => {
      const uri = getTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com');
      expect(uri).toContain('user%40example.com');
    });

    it('includes a default issuer when not provided', () => {
      const uri = getTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com');
      expect(uri).toContain('issuer=');
    });

    it('uses a custom issuer when provided', () => {
      const uri = getTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com', 'My App');
      expect(uri).toContain('issuer=My%20App');
    });

    it('specifies 6 digits and 30 second period', () => {
      const uri = getTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com');
      expect(uri).toContain('digits=6');
      expect(uri).toContain('period=30');
    });
  });

  describe('verifyTotp', () => {
    it('verifies a valid code', () => {
      const secret = generateTotpSecret();
      const code = generateCodeForSecret(secret);
      expect(verifyTotp(secret, code)).toBe(true);
    });

    it('rejects an invalid code', () => {
      const secret = generateTotpSecret();
      expect(verifyTotp(secret, '000000')).toBe(false);
    });

    it('rejects a code from a different secret', () => {
      const s1 = generateTotpSecret();
      const s2 = generateTotpSecret();
      const code = generateCodeForSecret(s1);
      expect(verifyTotp(s2, code)).toBe(false);
    });

    it('rejects a code from the previous time window (window is 0)', () => {
      const secret = generateTotpSecret();
      const prevCode = generateCodeForSecret(secret, -1);
      expect(verifyTotp(secret, prevCode)).toBe(false);
    });

    it('rejects a code from the next time window (window is 0)', () => {
      const secret = generateTotpSecret();
      const nextCode = generateCodeForSecret(secret, 1);
      expect(verifyTotp(secret, nextCode)).toBe(false);
    });
  });

  describe('generateQrCode', () => {
    it('returns a data URI SVG string', () => {
      const uri = getTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com');
      const svg = generateQrCode(uri);
      expect(typeof svg).toBe('string');
      expect(svg).toMatch(/^data:image\/svg\+xml,/);
      expect(decodeURIComponent(svg)).toContain('<svg');
      expect(decodeURIComponent(svg)).toContain('</svg>');
    });

    it('generates different QR codes for different URIs', () => {
      const uri1 = getTotpUri('JBSWY3DPEHPK3PXP', 'user@example.com');
      const uri2 = getTotpUri('ABCDEF1234567890', 'other@example.com');
      const svg1 = generateQrCode(uri1);
      const svg2 = generateQrCode(uri2);
      expect(svg1).not.toBe(svg2);
    });
  });
});

function generateCodeForSecret(secret: string, windowOffset = 0): string {
  // Mirror production: the secret is Base32 and codes are generated with the
  // preset-default authenticator (keyDecoder = base32). `clone()` keeps the
  // plugin options while shifting the epoch by `windowOffset` 30s steps to
  // simulate a code from another time window.
  return authenticator.clone({ epoch: Date.now() + windowOffset * 30000 }).generate(secret);
}

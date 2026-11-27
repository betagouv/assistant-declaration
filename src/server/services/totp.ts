import { authenticator } from '@otplib/preset-default';
import QRCode from 'qrcode-svg';

const TOTP_OPTIONS = {
  digits: 6,
  period: 30,
};

/**
 * Generate a new TOTP secret (Base32, 32 chars = 256 bits).
 */
export function generateTotpSecret(): string {
  return authenticator.generateSecret(16);
}

/**
 * Generate the otpauth:// URI for a TOTP secret.
 */
export function getTotpUri(secret: string, email: string, issuer: string = 'Assistant Déclaration'): string {
  return authenticator.keyuri(email, issuer, secret);
}

/**
 * Verify a TOTP code against a secret.
 * Checks only the current 30s window (window: 0).
 *
 * NOTE: we can't use `authenticator.create({...})` here: `create()` builds
 * options from scratch and drops the module-level `keyDecoder`/`createDigest`
 * plugins, so `.check()`/`.generate()` throw "Expecting options.keyDecoder
 * to be a function." (otplib v12). We therefore use the module-level
 * `authenticator` (preset-default) which has the keyDecoder/createDigest
 * plugins wired in.
 */
export function verifyTotp(secret: string, code: string): boolean {
  return authenticator.check(code, secret);
}

/**
 * Generate a QR code SVG for the TOTP URI, as a data URI usable in an <img> src.
 */
export function generateQrCode(uri: string): string {
  const qr = new QRCode({
    content: uri,
    width: 200,
    height: 200,
    padding: 2,
    ecl: 'M',
  });
  return `data:image/svg+xml,${encodeURIComponent(qr.svg())}`;
}

import { PrismaClient } from '@prisma/client';

import { decrypt } from '@ad/src/server/services/secret-crypto';
import { verifyTotp } from '@ad/src/server/services/totp';

// Default thresholds - configurable via environment
const LOCKOUT_THRESHOLD = parseInt(process.env.MFA_LOCKOUT_THRESHOLD || '5', 10);
const LOCKOUT_DURATION_MS = parseInt(process.env.MFA_LOCKOUT_DURATION_MS || String(15 * 60 * 1000), 10);

export interface MfaLockoutConfig {
  threshold?: number;
  durationMs?: number;
}

export async function recordMfaFailure(prisma: PrismaClient, userId: string): Promise<{ locked: boolean; availableAttempts: number }> {
  const secrets = await prisma.userSecrets.findUnique({
    where: { userId },
  });

  if (!secrets) {
    throw new Error('UserSecrets not found for user');
  }

  const newAttempts = secrets.mfaFailedAttempts + 1;
  let locked = false;

  if (newAttempts >= LOCKOUT_THRESHOLD) {
    const lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    await prisma.userSecrets.update({
      where: { userId },
      data: {
        mfaFailedAttempts: newAttempts,
        mfaLockedUntil: lockoutUntil,
      },
    });
    locked = true;
    console.warn(`[mfa-lockout] User locked after ${newAttempts} failed attempts`, { userId, lockoutUntil });
  } else {
    await prisma.userSecrets.update({
      where: { userId },
      data: { mfaFailedAttempts: newAttempts },
    });
    console.warn(`[mfa-lockout] Failed attempt ${newAttempts}`, { userId });
  }

  return { locked, availableAttempts: Math.max(0, LOCKOUT_THRESHOLD - newAttempts) };
}

export async function recordMfaSuccess(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.userSecrets.update({
    where: { userId },
    data: { mfaFailedAttempts: 0, mfaLockedUntil: null },
  });
  console.info('[mfa-lockout] MFA success, lockout state reset', { userId });
}

export async function isUserLockedOut(prisma: PrismaClient, userId: string): Promise<boolean> {
  const secrets = await prisma.userSecrets.findUnique({
    where: { userId },
  });

  if (!secrets) {
    console.log('[mfa-lockout] isUserLockedOut: no secrets found', { userId });
    return false;
  }

  if (!secrets.mfaLockedUntil) {
    console.log('[mfa-lockout] isUserLockedOut: not locked (no mfaLockedUntil)', { userId });
    return false;
  }

  const lockedUntilMs = secrets.mfaLockedUntil.getTime();
  const nowMs = Date.now();
  const locked = lockedUntilMs > nowMs;
  const timeUntilUnlock = lockedUntilMs - nowMs;

  console.log('[mfa-lockout] isUserLockedOut: checking lockout', {
    userId,
    lockedUntil: secrets.mfaLockedUntil.toISOString(),
    lockedUntilMs,
    now: new Date().toISOString(),
    nowMs,
    locked,
    timeUntilUnlockMs: timeUntilUnlock,
    timeUntilUnlockMin: Math.round(timeUntilUnlock / 60000),
  });

  // If lockout has expired, clear the lockout state
  if (!locked) {
    await prisma.userSecrets.update({
      where: { userId },
      data: { mfaLockedUntil: null, mfaFailedAttempts: 0 },
    });
    console.log('[mfa-lockout] Expired lockout cleared and reset attempts', { userId });
  }

  return locked;
}

export async function verifyMfaWithLockout(
  prisma: PrismaClient,
  userId: string,
  code: string
): Promise<{ success: boolean; locked: boolean; availableAttempts?: number }> {
  // Check if user is locked out first
  if (await isUserLockedOut(prisma, userId)) {
    console.warn('[mfa-lockout] Verification rejected - user locked', { userId });
    return { success: false, locked: true };
  }

  // Get TOTP secret
  const secrets = await prisma.userSecrets.findUnique({
    where: { userId },
  });

  if (!secrets || !secrets.totpSecret) {
    throw new Error('TOTP secret not found for user');
  }

  // Decrypt and verify
  const plainSecret = decrypt(secrets.totpSecret);
  const isValid = verifyTotp(plainSecret, code);

  if (isValid) {
    await recordMfaSuccess(prisma, userId);
    return { success: true, locked: false };
  } else {
    return { success: false, ...(await recordMfaFailure(prisma, userId)) };
  }
}

/**
 * @jest-environment node
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { authenticator } from '@otplib/preset-default';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

import { isUserLockedOut, recordMfaFailure, recordMfaSuccess, verifyMfaWithLockout } from '@ad/src/server/services/mfa-lockout';
import { encrypt } from '@ad/src/server/services/secret-crypto';

// Separate Prisma instance for this test suite
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

const TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

describe('MFA lockout', () => {
  let testUser: any;
  let encryptedSecret: string;

  beforeAll(async () => {
    // Set a test encryption key
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 0x42).toString('base64');

    const email = `mfa-lockout-${Date.now()}@test.fr`;
    testUser = await prisma.user.create({
      data: {
        email,
        firstname: 'Lockout',
        lastname: 'Test',
        mfaEnabled: true,
      },
    });

    encryptedSecret = encrypt(TOTP_SECRET);
    await prisma.userSecrets.create({
      data: {
        userId: testUser.id,
        passwordHash: 'test-hash',
        totpSecret: encryptedSecret,
      },
    });
  });

  afterAll(async () => {
    await prisma.userSecrets.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
    await pool.end();
  });

  it('accepts correct code and resets failed attempts', async () => {
    // Set some failed attempts
    await prisma.userSecrets.update({
      where: { userId: testUser.id },
      data: { mfaFailedAttempts: 3 },
    });

    const validCode = authenticator.generate(TOTP_SECRET);
    const result = await verifyMfaWithLockout(prisma, testUser.id, validCode);

    expect(result.success).toBe(true);
    expect(result.locked).toBe(false);

    const secrets = await prisma.userSecrets.findUnique({
      where: { userId: testUser.id },
    });
    expect(secrets?.mfaFailedAttempts).toBe(0);
  });

  it('increments failed attempts on wrong code', async () => {
    await prisma.userSecrets.update({
      where: { userId: testUser.id },
      data: { mfaFailedAttempts: 0 },
    });

    const result1 = await verifyMfaWithLockout(prisma, testUser.id, '111111');
    expect(result1.success).toBe(false);

    const result2 = await verifyMfaWithLockout(prisma, testUser.id, '222222');
    expect(result2.success).toBe(false);

    const result3 = await verifyMfaWithLockout(prisma, testUser.id, '333333');
    expect(result3.success).toBe(false);

    const secrets = await prisma.userSecrets.findUnique({
      where: { userId: testUser.id },
    });
    expect(secrets?.mfaFailedAttempts).toBe(3);
  });

  it('locks user after reaching threshold', async () => {
    // Set to threshold - 1
    await prisma.userSecrets.update({
      where: { userId: testUser.id },
      data: {
        mfaFailedAttempts: 4,
        mfaLockedUntil: null,
      },
    });

    // One more failure should lock
    const result = await verifyMfaWithLockout(prisma, testUser.id, '444444');
    expect(result.success).toBe(false);
    expect(result.locked).toBe(true);

    const secrets = await prisma.userSecrets.findUnique({
      where: { userId: testUser.id },
    });
    expect(secrets?.mfaLockedUntil).not.toBeNull();
    expect(secrets?.mfaLockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects verification while locked, even with correct code', async () => {
    const validCode = authenticator.generate(TOTP_SECRET);
    const result = await verifyMfaWithLockout(prisma, testUser.id, validCode);

    expect(result.success).toBe(false);
    expect(result.locked).toBe(true);
  });

  it('allows verification after lockout expires', async () => {
    // Set lockout to past
    await prisma.userSecrets.update({
      where: { userId: testUser.id },
      data: {
        mfaLockedUntil: new Date(Date.now() - 60000),
        mfaFailedAttempts: 0,
      },
    });

    const validCode = authenticator.generate(TOTP_SECRET);
    const result = await verifyMfaWithLockout(prisma, testUser.id, validCode);

    expect(result.success).toBe(true);
    expect(result.locked).toBe(false);
  });

  it('recordMfaFailure increments and locks at threshold', async () => {
    await prisma.userSecrets.update({
      where: { userId: testUser.id },
      data: { mfaFailedAttempts: 4, mfaLockedUntil: null },
    });

    const result = await recordMfaFailure(prisma, testUser.id);
    expect(result.locked).toBe(true);

    const secrets = await prisma.userSecrets.findUnique({
      where: { userId: testUser.id },
    });
    expect(secrets?.mfaFailedAttempts).toBe(5);
    expect(secrets?.mfaLockedUntil).not.toBeNull();
  });

  it('recordMfaSuccess resets lockout state', async () => {
    await prisma.userSecrets.update({
      where: { userId: testUser.id },
      data: { mfaFailedAttempts: 3, mfaLockedUntil: new Date(Date.now() + 60000) },
    });

    await recordMfaSuccess(prisma, testUser.id);

    const secrets = await prisma.userSecrets.findUnique({
      where: { userId: testUser.id },
    });
    expect(secrets?.mfaFailedAttempts).toBe(0);
    expect(secrets?.mfaLockedUntil).toBeNull();
  });

  it('isUserLockedOut returns correct state', async () => {
    // Not locked
    await prisma.userSecrets.update({
      where: { userId: testUser.id },
      data: { mfaLockedUntil: null },
    });
    expect(await isUserLockedOut(prisma, testUser.id)).toBe(false);

    // Locked
    await prisma.userSecrets.update({
      where: { userId: testUser.id },
      data: { mfaLockedUntil: new Date(Date.now() + 60000) },
    });
    expect(await isUserLockedOut(prisma, testUser.id)).toBe(true);

    // Expired
    await prisma.userSecrets.update({
      where: { userId: testUser.id },
      data: { mfaLockedUntil: new Date(Date.now() - 60000) },
    });
    expect(await isUserLockedOut(prisma, testUser.id)).toBe(false);
  });
});

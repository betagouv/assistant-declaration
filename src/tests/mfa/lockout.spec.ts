/**
 * @jest-environment node
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

// Separate Prisma instance for this test suite
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

describe('MFA lockout', () => {
  let testUser: any;

  beforeAll(async () => {
    const email = `mfa-lockout-${Date.now()}@test.fr`;
    testUser = await prisma.user.create({
      data: {
        email,
        firstname: 'Lockout',
        lastname: 'Test',
        mfaEnabled: true,
      },
    });

    await prisma.userSecrets.create({
      data: {
        userId: testUser.id,
        passwordHash: 'test-hash',
        totpSecret: 'JBSWY3DPEHPK3PXP',
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

  it('has mfaFailedAttempts field defaulting to 0', async () => {
    const secrets = await prisma.userSecrets.findUnique({
      where: { userId: testUser.id },
    });
    expect(secrets).toHaveProperty('mfaFailedAttempts');
    expect(secrets?.mfaFailedAttempts).toBe(0);
  });

  it('has mfaLockedUntil field defaulting to null', async () => {
    const secrets = await prisma.userSecrets.findUnique({
      where: { userId: testUser.id },
    });
    expect(secrets).toHaveProperty('mfaLockedUntil');
    expect(secrets?.mfaLockedUntil).toBeNull();
  });

  it('can increment failed attempts', async () => {
    await prisma.userSecrets.update({
      where: { userId: testUser.id },
      data: { mfaFailedAttempts: { increment: 1 } },
    });

    const secrets = await prisma.userSecrets.findUnique({
      where: { userId: testUser.id },
    });
    expect(secrets?.mfaFailedAttempts).toBe(1);
  });

  it('can set lockout expiry', async () => {
    const lockoutTime = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.userSecrets.update({
      where: { userId: testUser.id },
      data: {
        mfaFailedAttempts: 5,
        mfaLockedUntil: lockoutTime,
      },
    });

    const secrets = await prisma.userSecrets.findUnique({
      where: { userId: testUser.id },
    });
    expect(secrets?.mfaLockedUntil).toEqual(lockoutTime);
  });

  it('can reset failed attempts after success', async () => {
    await prisma.userSecrets.update({
      where: { userId: testUser.id },
      data: {
        mfaFailedAttempts: 0,
        mfaLockedUntil: null,
      },
    });

    const secrets = await prisma.userSecrets.findUnique({
      where: { userId: testUser.id },
    });
    expect(secrets?.mfaFailedAttempts).toBe(0);
    expect(secrets?.mfaLockedUntil).toBeNull();
  });
});

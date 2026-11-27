/**
 * @jest-environment node
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

// Create a separate Prisma instance with its own connection pool
// to avoid interfering with other tests that use the singleton
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

describe('MFA model changes', () => {
  let testUser: any;

  beforeAll(async () => {
    const email = `mfa-model-${Date.now()}@test.fr`;
    testUser = await prisma.user.create({
      data: {
        email,
        firstname: 'MFA',
        lastname: 'Model',
      },
    });

    await prisma.userSecrets.create({
      data: {
        userId: testUser.id,
        passwordHash: 'test-hash',
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

  it('User has mfaEnabled field defaulting to false', async () => {
    const user = await prisma.user.findUnique({
      where: { id: testUser.id },
    });
    expect(user).toHaveProperty('mfaEnabled');
    expect(user?.mfaEnabled).toBe(false);
  });

  it('UserSecrets has nullable totpSecret field', async () => {
    const secrets = await prisma.userSecrets.findUnique({
      where: { userId: testUser.id },
    });
    expect(secrets).toHaveProperty('totpSecret');
    expect(secrets?.totpSecret).toBeNull();
  });

  it('totpSecret can be set and read back', async () => {
    const fakeSecret = 'JBSWY3DPEHPK3PXP';
    await prisma.userSecrets.update({
      where: { userId: testUser.id },
      data: { totpSecret: fakeSecret },
    });

    const secrets = await prisma.userSecrets.findUnique({
      where: { userId: testUser.id },
    });
    expect(secrets?.totpSecret).toBe(fakeSecret);
  });

  it('mfaEnabled can be toggled', async () => {
    await prisma.user.update({
      where: { id: testUser.id },
      data: { mfaEnabled: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: testUser.id },
    });
    expect(user?.mfaEnabled).toBe(true);
  });
});

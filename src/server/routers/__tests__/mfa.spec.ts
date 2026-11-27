/**
 * @jest-environment node
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { authenticator } from '@otplib/preset-default';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

import { mfaRouter } from '@ad/src/server/routers/mfa';
import { encrypt } from '@ad/src/server/services/secret-crypto';
import { createCallerFactory } from '@ad/src/server/trpc';

// Separate Prisma instance for isolation
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const createCaller = createCallerFactory(mfaRouter);

describe('MFA API', () => {
  let testUser: any;
  let caller: any;

  beforeAll(async () => {
    const email = `mfa-api-${Date.now()}@test.fr`;
    testUser = await prisma.user.create({
      data: {
        email,
        firstname: 'MFA',
        lastname: 'API',
        status: 'CONFIRMED',
        Secrets: {
          create: { passwordHash: 'test-hash' },
        },
      },
    });
    // TokenUserSchema only allows 4 fields (strict)
    caller = createCaller({
      prisma,
      user: { id: testUser.id, firstname: testUser.firstname, lastname: testUser.lastname, email: testUser.email },
    });
  });

  afterAll(async () => {
    await prisma.userSecrets.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
    await pool.end();
  });

  beforeEach(async () => {
    // Reset MFA state before each test
    await prisma.user.update({
      where: { id: testUser.id },
      data: { mfaEnabled: false },
    });
    await prisma.userSecrets.update({
      where: { userId: testUser.id },
      data: {
        totpSecret: null,
        mfaFailedAttempts: 0,
        mfaLockedUntil: null,
        totpLastUsedStep: null,
      },
    });
    // Refresh caller with updated user
    const freshUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    caller = createCaller({
      prisma,
      user: { id: freshUser!.id, firstname: freshUser!.firstname, lastname: freshUser!.lastname, email: freshUser!.email },
    });
  });

  describe('setupMfaSecret', () => {
    it('should generate and store encrypted TOTP secret', async () => {
      const result = await caller.setupMfaSecret();

      expect(result).toHaveProperty('qrCode');
      expect(typeof result.qrCode).toBe('string');

      const secrets = await prisma.userSecrets.findUnique({
        where: { userId: testUser.id },
      });
      expect(secrets?.totpSecret).not.toBeNull();
    });

    it('should not return the raw secret', async () => {
      const result = await caller.setupMfaSecret();
      expect(result).not.toHaveProperty('secret');
      expect(result).not.toHaveProperty('totpSecret');
    });

    it('should fail if MFA already enabled', async () => {
      // Enable MFA directly in DB
      const plainSecret = authenticator.generateSecret(16);
      await prisma.userSecrets.update({
        where: { userId: testUser.id },
        data: { totpSecret: encrypt(plainSecret) },
      });
      await prisma.user.update({
        where: { id: testUser.id },
        data: { mfaEnabled: true },
      });

      // Call setup - should fail because DB user has mfaEnabled=true
      await expect(caller.setupMfaSecret()).rejects.toThrow();
    });
  });

  describe('verifyMfaSetup', () => {
    let plainSecret: string;

    beforeEach(async () => {
      plainSecret = authenticator.generateSecret(16);
      await prisma.userSecrets.update({
        where: { userId: testUser.id },
        data: { totpSecret: encrypt(plainSecret) },
      });
    });

    it('should enable MFA with valid code', async () => {
      const code = authenticator.generate(plainSecret);
      const result = await caller.verifyMfaSetup({ code });

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);

      const user = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(user?.mfaEnabled).toBe(true);
    });

    it('should fail with invalid code', async () => {
      await expect(caller.verifyMfaSetup({ code: '000000' })).rejects.toThrow();

      const user = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(user?.mfaEnabled).toBe(false);
    });

    it('should fail if no secret configured', async () => {
      await prisma.userSecrets.update({
        where: { userId: testUser.id },
        data: { totpSecret: null },
      });

      await expect(caller.verifyMfaSetup({ code: '123456' })).rejects.toThrow();
    });

    it('should validate code format (6 digits)', async () => {
      await expect(caller.verifyMfaSetup({ code: '12345' })).rejects.toThrow();
      await expect(caller.verifyMfaSetup({ code: '1234567' })).rejects.toThrow();
      await expect(caller.verifyMfaSetup({ code: 'abc123' })).rejects.toThrow();
    });
  });

  describe('disableMfa', () => {
    let plainSecret: string;

    beforeEach(async () => {
      plainSecret = authenticator.generateSecret(16);
      await prisma.userSecrets.update({
        where: { userId: testUser.id },
        data: { totpSecret: encrypt(plainSecret) },
      });
      await prisma.user.update({
        where: { id: testUser.id },
        data: { mfaEnabled: true },
      });
    });

    it('should disable MFA with valid code', async () => {
      const code = authenticator.generate(plainSecret);
      const result = await caller.disableMfa({ code });

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);

      const user = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(user?.mfaEnabled).toBe(false);

      const secrets = await prisma.userSecrets.findUnique({
        where: { userId: testUser.id },
      });
      expect(secrets?.totpSecret).toBeNull();
    });

    it('should fail with invalid code', async () => {
      await expect(caller.disableMfa({ code: '000000' })).rejects.toThrow();

      const user = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(user?.mfaEnabled).toBe(true);
    });
  });

  describe('verifyMfaLogin', () => {
    let plainSecret: string;

    beforeEach(async () => {
      plainSecret = authenticator.generateSecret(16);
      await prisma.userSecrets.update({
        where: { userId: testUser.id },
        data: { totpSecret: encrypt(plainSecret) },
      });
      await prisma.user.update({
        where: { id: testUser.id },
        data: { mfaEnabled: true },
      });
    });

    it('should verify code without changing mfaEnabled', async () => {
      const code = authenticator.generate(plainSecret);
      const result = await caller.verifyMfaLogin({ code });

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);

      const user = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(user?.mfaEnabled).toBe(true);
    });

    it('should update totpLastUsedStep', async () => {
      const code = authenticator.generate(plainSecret);
      await caller.verifyMfaLogin({ code });

      const secrets = await prisma.userSecrets.findUnique({
        where: { userId: testUser.id },
      });
      expect(secrets?.totpLastUsedStep).not.toBeNull();
    });

    it('should trigger lockout after multiple failures', async () => {
      for (let i = 0; i < 5; i++) {
        try {
          await caller.verifyMfaLogin({ code: '000000' });
        } catch (e) {
          // Expected
        }
      }

      const secrets = await prisma.userSecrets.findUnique({
        where: { userId: testUser.id },
      });
      expect(secrets?.mfaLockedUntil).not.toBeNull();
    });
  });
});

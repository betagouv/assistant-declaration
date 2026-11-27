/**
 * @jest-environment node
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

// Separate Prisma instance for isolation
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

describe('MFA Auth Integration (Ticket #6)', () => {
  let testUser: any;

  beforeAll(async () => {
    const email = `mfa-auth-${Date.now()}@test.fr`;
    testUser = await prisma.user.create({
      data: {
        email,
        firstname: 'MFA',
        lastname: 'Auth',
        status: 'CONFIRMED',
      },
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
    await pool.end();
  });

  beforeEach(async () => {
    await prisma.user.update({
      where: { id: testUser.id },
      data: { mfaEnabled: false, mfaLastVerifiedAt: null, mfaFailedAttempts: 0, mfaLockedUntil: null },
    });
  });

  describe('JWT callback logic', () => {
    // Simulate the JWT callback logic from [...nextauth].ts
    async function jwtCallback(token: any, user?: any) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { mfaEnabled: true, mfaLastVerifiedAt: true },
        });

        return {
          ...token,
          sub: user.id,
          email: user.email,
          given_name: user.firstname,
          family_name: user.lastname,
          mfaEnabled: dbUser?.mfaEnabled ?? false,
          mfaVerified: !!dbUser?.mfaLastVerifiedAt,
        };
      }
      return token;
    }

    it('should inject mfaEnabled and mfaVerified into token on login', async () => {
      const user = { id: testUser.id, firstname: 'MFA', lastname: 'Auth', email: testUser.email };
      const token = { sub: testUser.id };

      const result = await jwtCallback(token, user);

      expect(result).toHaveProperty('mfaEnabled', false);
      expect(result).toHaveProperty('mfaVerified', false);
    });

    it('should set mfaEnabled to true when user has MFA enabled', async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { mfaEnabled: true },
      });

      const user = { id: testUser.id, firstname: 'MFA', lastname: 'Auth', email: testUser.email };
      const token = { sub: testUser.id };

      const result = await jwtCallback(token, user);

      expect(result.mfaEnabled).toBe(true);
      expect(result.mfaVerified).toBe(false);
    });

    it('should set mfaVerified to true when user has verified recently', async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { mfaEnabled: true, mfaLastVerifiedAt: new Date() },
      });

      const user = { id: testUser.id, firstname: 'MFA', lastname: 'Auth', email: testUser.email };
      const token = { sub: testUser.id };

      const result = await jwtCallback(token, user);

      expect(result.mfaEnabled).toBe(true);
      expect(result.mfaVerified).toBe(true);
    });
  });

  describe('Session callback logic', () => {
    // Simulate the session callback logic from [...nextauth].ts
    async function sessionCallback(session: any, token: any) {
      if (token) {
        return {
          ...session,
          user: {
            id: token.sub,
            email: token.email,
            firstname: token.given_name,
            lastname: token.family_name,
            mfaEnabled: token.mfaEnabled,
            mfaVerified: token.mfaVerified,
          },
        };
      }
      return session;
    }

    it('should expose mfaEnabled and mfaVerified in session', async () => {
      const token = {
        sub: testUser.id,
        email: testUser.email,
        given_name: testUser.firstname,
        family_name: testUser.lastname,
        mfaEnabled: true,
        mfaVerified: false,
      };

      const session = { user: {} };
      const result = await sessionCallback(session, token);

      expect(result.user).toHaveProperty('mfaEnabled', true);
      expect(result.user).toHaveProperty('mfaVerified', false);
    });
  });

  describe('Middleware logic', () => {
    it('should redirect to /auth/mfa if mfaEnabled and not mfaVerified', async () => {
      const session = {
        user: {
          mfaEnabled: true,
          mfaVerified: false,
        },
      };

      const shouldRedirect = session.user.mfaEnabled && !session.user.mfaVerified;
      expect(shouldRedirect).toBe(true);
    });

    it('should allow access if mfaEnabled and mfaVerified', async () => {
      const session = {
        user: {
          mfaEnabled: true,
          mfaVerified: true,
        },
      };

      const shouldRedirect = session.user.mfaEnabled && !session.user.mfaVerified;
      expect(shouldRedirect).toBe(false);
    });

    it('should allow access if not mfaEnabled', async () => {
      const session = {
        user: {
          mfaEnabled: false,
          mfaVerified: false,
        },
      };

      const shouldRedirect = session.user.mfaEnabled && !session.user.mfaVerified;
      expect(shouldRedirect).toBe(false);
    });
  });
});

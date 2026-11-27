import { z } from 'zod';

import { isUserLockedOut, verifyMfaWithLockout } from '@ad/src/server/services/mfa-lockout';
import { decrypt, encrypt } from '@ad/src/server/services/secret-crypto';
import { generateQrCode, generateTotpSecret, getTotpUri } from '@ad/src/server/services/totp';
import { privateProcedure, protectedMfaProcedure, router } from '@ad/src/server/trpc';

const MfaCodeSchema = z.object({
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
});

export const mfaRouter = router({
  /**
   * Generate a new TOTP secret and return QR code for setup.
   * Fails if MFA is already enabled (prevents overwriting active secret).
   */
  setupMfaSecret: protectedMfaProcedure.mutation(async ({ ctx }) => {
    const { prisma, user } = ctx;
    try {
      // Check if MFA is already enabled (from DB, not ctx.user)
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { mfaEnabled: true },
      });

      if (dbUser?.mfaEnabled) {
        throw new Error('MFA is already enabled for this account');
      }

      // Check if a secret is already stored
      const existingSecret = await prisma.userSecrets.findUnique({
        where: { userId: user.id },
      });

      let secret;
      if (existingSecret?.totpSecret) {
        // Reuse existing secret
        try {
          secret = decrypt(existingSecret.totpSecret);
        } catch (e) {
          throw new Error('Failed to decrypt existing secret');
        }
      } else {
        // Generate new secret
        secret = generateTotpSecret();
        const encryptedSecret = encrypt(secret);
        await prisma.userSecrets.update({
          where: { userId: user.id },
          data: { totpSecret: encryptedSecret },
        });
      }

      const uri = getTotpUri(secret, user.email);
      const qrCode = generateQrCode(uri);

      return { qrCode };
    } catch (e) {
      throw e;
    }
  }),

  /**
   * Verify a TOTP code and enable MFA if valid.
   * Requires a secret to be configured first.
   */
  verifyMfaSetup: protectedMfaProcedure.input(MfaCodeSchema).mutation(async ({ ctx, input }) => {
    const { prisma, user } = ctx;

    const secrets = await prisma.userSecrets.findUnique({
      where: { userId: user.id },
    });

    if (!secrets?.totpSecret) {
      throw new Error('No TOTP secret configured. Please setup MFA first.');
    }

    // Verify code (service handles lockout)
    const { success, locked, availableAttempts } = await verifyMfaWithLockout(prisma, user.id, input.code);

    if (!success) {
      if (locked) {
        throw new Error('Compte temporairement verrouillé après trop de tentatives échouées');
      }
      throw new Error(`Code de vérification invalide (${availableAttempts} tentatives restantes)`);
    }

    // Enable MFA and mark as verified (the code was just validated)
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true, mfaLastVerifiedAt: new Date() },
    });

    return { success: true };
  }),

  /**
   * Disable MFA after verifying a valid TOTP code.
   * Clears the stored secret.
   */
  disableMfa: protectedMfaProcedure.input(MfaCodeSchema).mutation(async ({ ctx, input }) => {
    const { prisma, user } = ctx;

    // Verify code first
    const { success, locked } = await verifyMfaWithLockout(prisma, user.id, input.code);

    if (!success) {
      if (locked) {
        throw new Error('Compte temporairement verrouillé après trop de tentatives échouées');
      }
      throw new Error('Invalid verification code');
    }

    // Disable MFA and clear secret
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { mfaEnabled: false },
      }),
      prisma.userSecrets.update({
        where: { userId: user.id },
        data: {
          totpSecret: null,
          mfaFailedAttempts: 0,
          mfaLockedUntil: null,
          totpLastUsedStep: null,
        },
      }),
    ]);

    console.info('[mfa] Disabled', { userId: user.id });

    return { success: true };
  }),

  /**
   * Verify TOTP code during login.
   * Does not change mfaEnabled state.
   * Updates totpLastUsedStep for anti-replay.
   */
  verifyMfaLogin: privateProcedure.input(MfaCodeSchema).mutation(async ({ ctx, input }) => {
    const { prisma, user } = ctx;

    // Verify code (service handles lockout and recording)
    const { success, locked, availableAttempts } = await verifyMfaWithLockout(prisma, user.id, input.code);

    if (!success) {
      if (locked) {
        throw new Error('Compte temporairement verrouillé après trop de tentatives échouées');
      }
      throw new Error(`Code de vérification invalide (${availableAttempts} tentatives restantes)`);
    }

    // Update last used step for anti-replay and mark MFA as verified
    const currentStep = Math.floor(Date.now() / 30000);
    await prisma.$transaction([
      prisma.userSecrets.update({
        where: { userId: user.id },
        data: { totpLastUsedStep: currentStep },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { mfaLastVerifiedAt: new Date() },
      }),
    ]);

    return { success: true };
  }),
});

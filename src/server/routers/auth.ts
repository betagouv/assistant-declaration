import bcrypt from 'bcrypt';
import { addDays, addMinutes } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import { mailer } from '@ad/src/emails/mailer';
import { ChangePasswordSchema, ConfirmSignUpSchema, RequestNewPasswordSchema, ResetPasswordSchema, SignUpSchema } from '@ad/src/models/actions/auth';
import {
  accountAlreadyWithThisEmailError,
  expiredConfirmationTokenError,
  expiredVerificationTokenError,
  invalidCurrentPasswordError,
  invalidVerificationTokenError,
  noAccountWithThisEmailError,
  userAlreadyConfirmedError,
  userNotFoundError,
  wrongConfirmationTokenError,
} from '@ad/src/models/entities/errors';
import { UserStatusSchema, VerificationTokenActionSchema } from '@ad/src/models/entities/user';
import { prisma } from '@ad/src/prisma/client';
import { userPrismaToModel } from '@ad/src/server/routers/mappers';
import { privateProcedure, publicProcedure, router } from '@ad/src/server/trpc';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export const authRouter = router({
  // Note: `signIn` is managed directly by `next-auth` inside the `authorize()` handler
  signUp: publicProcedure.input(SignUpSchema).mutation(async ({ ctx, input }) => {
    let existingUser = await prisma.user.findFirst({
      where: {
        email: input.email,
      },
    });

    if (existingUser) {
      throw accountAlreadyWithThisEmailError;
    }
    const passwordHash = await hashPassword(input.password);

    const newUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          firstname: input.firstname,
          lastname: input.lastname,
          email: input.email,
          status: UserStatusSchema.Values.REGISTERED,
          Secrets: {
            create: {
              passwordHash: passwordHash,
            },
          },
        },
      });

      // We set a large timeframe since people may have other things to do and also because for now we have no logic to resend the verification token
      const expiresAt = addDays(new Date(), 14);

      const verificationToken = await tx.verificationToken.create({
        data: {
          action: VerificationTokenActionSchema.Values.SIGN_UP,
          token: uuidv4(),
          identifier: createdUser.id,
          expires: expiresAt,
        },
      });

      await mailer.sendSignUpConfirmation({
        recipient: createdUser.email,
        firstname: createdUser.firstname,
        confirmationUrl: linkRegistry.get('signIn', { token: verificationToken.token }, { absolute: true }),
      });

      return createdUser;
    });

    return { user: userPrismaToModel(newUser) };
  }),
  confirmSignUp: publicProcedure.input(ConfirmSignUpSchema).mutation(async ({ ctx, input }) => {
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        action: VerificationTokenActionSchema.Values.SIGN_UP,
        token: input.token,
      },
    });

    const currentTime = new Date();

    if (!verificationToken) {
      throw wrongConfirmationTokenError;
    } else if (verificationToken.expires < currentTime) {
      throw expiredConfirmationTokenError;
    }

    let existingUser = await prisma.user.findUnique({
      where: {
        id: verificationToken.identifier,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingUser) {
      throw userNotFoundError;
    } else if (existingUser.status === 'CONFIRMED') {
      throw userAlreadyConfirmedError;
    }

    // Disabled account should not try confirming again its account
    assert(existingUser.status === 'REGISTERED');

    await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        status: 'CONFIRMED',
      },
    });

    await prisma.verificationToken.delete({
      where: {
        token: input.token,
      },
    });

    return;
  }),
  requestNewPassword: publicProcedure.input(RequestNewPasswordSchema).mutation(async ({ ctx, input }) => {
    const user = await prisma.user.findUnique({
      where: {
        email: input.email,
      },
    });

    if (!user) {
      throw noAccountWithThisEmailError;
    }

    const durationMinutesToValidateTheToken = 60;
    const expiresAt = addMinutes(new Date(), durationMinutesToValidateTheToken);

    const verificationToken = await prisma.verificationToken.create({
      data: {
        action: VerificationTokenActionSchema.Values.RESET_PASSWORD,
        token: uuidv4(),
        identifier: user.id,
        expires: expiresAt,
      },
    });

    await mailer.sendNewPasswordRequest({
      recipient: user.email,
      firstname: user.firstname,
      resetPasswordUrlWithToken: linkRegistry.get(
        'resetPassword',
        {
          token: verificationToken.token,
        },
        { absolute: true }
      ),
    });

    return;
  }),
  resetPassword: publicProcedure.input(ResetPasswordSchema).mutation(async ({ ctx, input }) => {
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        action: VerificationTokenActionSchema.Values.RESET_PASSWORD,
        token: input.token,
      },
    });

    const currentTime = new Date();

    if (!verificationToken) {
      throw invalidVerificationTokenError;
    } else if (verificationToken.expires < currentTime) {
      throw expiredVerificationTokenError;
    }

    const hashedPassword = await hashPassword(input.password);

    const user = await prisma.user.update({
      where: {
        id: verificationToken.identifier,
      },
      data: {
        Secrets: {
          update: {
            passwordHash: hashedPassword,
          },
        },
      },
    });

    // TODO: we could use a status instead of deleting... but we sticked to this table schema coming from Prisma for account management (+ `action` column)
    await prisma.verificationToken.delete({
      where: {
        token: input.token,
      },
    });

    await mailer.sendPasswordReset({
      recipient: user.email,
      firstname: user.firstname,
      signInUrl: linkRegistry.get(
        'signIn',
        {
          token: verificationToken.token,
        },
        { absolute: true }
      ),
    });

    return;
  }),
  changePassword: privateProcedure.input(ChangePasswordSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.user.id;

    const user = await prisma.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
      include: {
        Secrets: {
          select: {
            passwordHash: true,
          },
        },
      },
    });

    const matchPassword = await bcrypt.compare(input.currentPassword, user.Secrets?.passwordHash || '');
    if (!matchPassword) {
      throw invalidCurrentPasswordError;
    }

    const newHashedPassword = await hashPassword(input.newPassword);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        Secrets: {
          update: {
            passwordHash: newHashedPassword,
          },
        },
      },
    });

    await mailer.sendPasswordChanged({
      recipient: user.email,
      firstname: user.firstname,
    });

    return;
  }),
});

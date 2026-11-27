import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcrypt';
import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { cache } from 'react';

import { authCredentialsRequiredError, authFatalError, authNoCredentialsMatchError, userNotConfirmedError } from '@ad/src/models/entities/errors';
import { TokenUserSchema, TokenUserSchemaType } from '@ad/src/models/entities/user';
import { prisma } from '@ad/src/prisma/client';
import { apiHandlerWrapper } from '@ad/src/utils/api';
import { getBaseUrl } from '@ad/src/utils/url';

// It requires an environment variable always equal to the base URL
process.env.NEXTAUTH_URL = getBaseUrl();

export const nextAuthOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV !== 'production',
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXT_AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: '/auth/sign-in',
    signOut: '/auth/sign-in',
    error: '/auth/sign-in',
    // verifyRequest: '/auth/sign-in',
    newUser: '/auth/sign-up',
  },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Connexion',
      async authorize(credentials: any): Promise<TokenUserSchemaType> {
        // Below the thrown object must be a basic `Error` otherwise it won't be passed on the frontend

        // TODO: parse with zod SignInSchema
        if (!credentials.email || !credentials.password) {
          throw new Error(authCredentialsRequiredError.code);
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
          include: {
            Secrets: {
              select: {
                passwordHash: true,
              },
            },
          },
        });

        if (!user || !user.Secrets) {
          throw new Error(authNoCredentialsMatchError.code);
        }

        const matchPassword = await bcrypt.compare(credentials.password, user.Secrets.passwordHash);
        if (!matchPassword) {
          throw new Error(authNoCredentialsMatchError.code);
        } else if (user.status !== 'CONFIRMED') {
          throw new Error(userNotConfirmedError.code);
        }

        const tokenUserParse = TokenUserSchema.safeParse({
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
        });

        if (!tokenUserParse.success) {
          throw new Error(authFatalError.code);
        }

        // Reset MFA verification timestamp on each login
        // This ensures MFA is required again after logout/login
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { mfaLastVerifiedAt: null },
          });
        } catch (err) {}

        return tokenUserParse.data;
      },
      credentials: {
        name: { type: 'test' },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const userId = user?.id || token.sub;

      // Always fetch fresh MFA state from database
      let dbUser = null;
      if (userId) {
        dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { mfaEnabled: true, mfaLastVerifiedAt: true },
        });
      }

      // Calculate if MFA is verified (within timeout)
      let mfaVerified = false;
      if (dbUser?.mfaLastVerifiedAt) {
        const timeSinceVerification = Date.now() - dbUser.mfaLastVerifiedAt.getTime();
        mfaVerified = timeSinceVerification < Number(process.env.MFA_VERIFICATION_TIMEOUT_MINUTES || 180) * 60 * 1000;
      }

      if (user) {
        return {
          ...token,
          sub: user.id,
          email: user.email,
          given_name: user.firstname,
          family_name: user.lastname,
          mfaEnabled: dbUser?.mfaEnabled ?? false,
          mfaVerified,
        };
      }

      return {
        ...token,
        mfaEnabled: dbUser?.mfaEnabled ?? false,
        mfaVerified,
      };
    },
    async session({ session, token }) {
      // Each time a token is forged (login/refreshToken) we update the "lastActivityAt" property (async to not slow the main purpose)
      prisma.user
        .update({
          where: {
            id: token.sub,
          },
          data: {
            lastActivityAt: new Date(),
          },
        })
        .catch((err) => {
          console.warn(`Impossible to update "lastActivityAt" for the user ${token.sub}: ${err.toString()}`);
        });

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
    },
    async redirect({ url }) {
      const baseUrl = getBaseUrl();

      if (url.startsWith('/')) {
        // Allows relative callback URLs
        return `${baseUrl}${url}`;
      } else if (new URL(url).origin === baseUrl) {
        // Allows callback URLs on the same origin
        return url;
      } else {
        // For security reason the default case is to redirect to home
        return baseUrl;
      }
    },
    // @ts-ignore - signout callback exists in NextAuth v4 but types may differ
    async signout({ user }: { user: any }) {
      // Revoke MFA verification on signout
      if (user?.id) {
        try {
          const result = await prisma.user.update({
            where: { id: user.id },
            data: { mfaLastVerifiedAt: null },
          });
        } catch (err) {}
      } else {
      }
    },
  },
};

export const handler = NextAuth(nextAuthOptions);

export default apiHandlerWrapper(handler);

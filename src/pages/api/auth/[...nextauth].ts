import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcrypt';
import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import { authCredentialsRequiredError, authFatalError, authNoCredentialsMatchError } from '@ad/src/models/entities/errors';
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
        // TODO: parse with zod SignInSchema
        if (!credentials.email || !credentials.password) {
          throw authCredentialsRequiredError.code;
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
          throw authNoCredentialsMatchError.code;
        }

        const matchPassword = await bcrypt.compare(credentials.password, user.Secrets.passwordHash);
        if (!matchPassword) {
          throw authNoCredentialsMatchError.code;
        }

        const tokenUserParse = TokenUserSchema.safeParse({
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          profilePicture: user.profilePicture,
        });

        if (!tokenUserParse.success) {
          throw authFatalError.code;
        }

        return tokenUserParse.data;
      },
      credentials: {
        name: { type: 'test' },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          sub: user.id,
          email: user.email,
          given_name: user.firstname,
          family_name: user.lastname,
        };
      }

      return token;
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
  },
};

export const handler = NextAuth(nextAuthOptions);

export default apiHandlerWrapper(handler);

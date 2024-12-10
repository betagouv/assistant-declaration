import * as trpc from '@trpc/server';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import type { CreateWSSContextFnOptions } from '@trpc/server/adapters/ws';
import { IncomingMessage } from 'http';
import { NextApiRequest } from 'next';
import { getServerSession } from 'next-auth';

import { nextAuthOptions } from '@ad/src/pages/api/auth/[...nextauth]';
import { User, getUser } from '@ad/src/server-rsc/getUser';

interface CreateContextOptions {
  user: User | null;
  rsc: boolean;
}

export async function createContextInner(opts: CreateContextOptions) {
  return {
    user: opts.user,
  };
}

export async function createContext(
  opts:
    | {
        type: 'rsc';
        getUser: typeof getUser;
      }
    | (CreateNextContextOptions & { type: 'api' })
    | (CreateWSSContextFnOptions & { type: 'api' })
) {
  if (opts.type === 'rsc') {
    // RSC
    return {
      type: opts.type,
      user: await opts.getUser(),
    };
  }

  // [WORKAROUND] Since we upgraded to Next.js v14 it expects cookies property (not available onto IncomingMessage)
  if (!('cookies' in opts.req)) {
    (opts.req as any).cookies = {};
  }

  // Not RSC
  const session = await getServerSession(
    opts.req as NextApiRequest | (IncomingMessage & { cookies: Partial<Record<string, string>> }),
    opts.res,
    nextAuthOptions
  );

  return {
    type: opts.type,
    user: session?.user,
  };
}

export type Context = trpc.inferAsyncReturnType<typeof createContext>;

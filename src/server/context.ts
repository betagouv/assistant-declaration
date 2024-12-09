import * as trpc from '@trpc/server';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import type { CreateWSSContextFnOptions } from '@trpc/server/adapters/ws';
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

  // Not RSC
  const session = await getServerSession(opts.req, opts.res, nextAuthOptions);
  return {
    type: opts.type,
    user: session?.user,
  };
}

export type Context = trpc.inferAsyncReturnType<typeof createContext>;

import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import type { CreateWSSContextFnOptions } from '@trpc/server/adapters/ws';
import { IncomingMessage } from 'http';
import { NextApiRequest } from 'next';
import { getServerSession } from 'next-auth';

import { nextAuthOptions } from '@ad/src/pages/api/auth/[...nextauth]';

export interface User {
  id: string;
  email: string;
  name: string;
}

export async function createContext(opts: CreateNextContextOptions | CreateWSSContextFnOptions) {
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
    user: session?.user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

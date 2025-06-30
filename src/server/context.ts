import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

import { auth } from '@ad/src/pages/api/auth/[...nextauth]';

export interface User {
  id: string;
  email: string;
  name: string;
}

export async function createContext(opts?: FetchCreateContextFnOptions) {
  const session = await auth();

  // TODO: user...

  return {
    session,
    headers: opts && Object.fromEntries(opts.req.headers),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as trpcNext from '@trpc/server/adapters/next';
import { Session } from 'next-auth';

import { auth } from '@ad/src/pages/api/auth/[...nextauth]';

export interface User {
  id: string;
  email: string;
  name: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CreateContextOptions {
  session: Session | null;
  user: User | null;
}

/**
 * Inner function for `createContext` where we create the context.
 * This is useful for testing when we don't want to mock Next.js' request/response
 */
export async function createContextInner(_opts: CreateContextOptions) {
  console.log(55555555);
  console.log(_opts);

  return {
    session: _opts.session,
    user: _opts.user,
  };
}

export async function createContext(opts: trpcNext.CreateNextContextOptions) {
  const session = await auth();

  console.log(44444);
  console.log(session);

  // for API-response caching see https://trpc.io/docs/v11/caching

  return await createContextInner({
    session: session,
    user: session.user, // TODO: ...
  });
}

export type Context = Awaited<ReturnType<typeof createContext>>;

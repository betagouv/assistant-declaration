import superjson from 'superjson';

import { getUser } from '@ad/src/server-rsc/getUser';
import { appRouter } from '@ad/src/server/app-router';
import { createContext } from '@ad/src/server/context';
import { createTRPCNextLayout } from '@ad/src/server/trpc-next-layout';

export const rsc = createTRPCNextLayout({
  router: appRouter,
  transformer: superjson,
  createContext() {
    return createContext({
      type: 'rsc',
      getUser,
    });
  },
});

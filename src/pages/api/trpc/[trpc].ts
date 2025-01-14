import * as Sentry from '@sentry/nextjs';
import { createNextApiHandler } from '@trpc/server/adapters/next';

import { BusinessError } from '@ad/src/models/entities/errors';
import { appRouter } from '@ad/src/server/app-router';
import { createContext } from '@ad/src/server/context';
import { apiHandlerWrapper } from '@ad/src/utils/api';

export const handler = createNextApiHandler({
  router: appRouter,
  createContext(opts) {
    return createContext({
      type: 'api',
      ...opts,
    });
  },
  onError({ error, input, ctx }) {
    // This is called before the tRPC `errorFormatter` middleware
    // ---
    // Note about `error.code`:
    // - `BAD_REQUEST` is used if there is a failure inside input validation (zod in our case), they can be considered as business errors and don't need to be reported
    // - `INTERNAL_SERVER_ERROR` from within routes

    if (error.code === 'INTERNAL_SERVER_ERROR' && !(error.cause instanceof BusinessError)) {
      // Notify Sentry of this unexpected error (since handler wrapper will not see it)
      Sentry.withScope(function (scope) {
        scope.setUser(ctx?.user ? { id: ctx.user.id } : null);

        Sentry.captureException(error);
      });
    }
  },
  batching: {
    enabled: true,
  },
});

export default apiHandlerWrapper(handler);

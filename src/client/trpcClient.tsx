import { createTRPCReact } from '@trpc/react-query';

import type { AppRouter } from '@ad/src/server/app-router';

export const trpc = createTRPCReact<AppRouter>({
  overrides: {
    useMutation: {
      async onSuccess(opts) {
        await opts.originalFn();
        await opts.queryClient.invalidateQueries();
      },
    },
  },
});

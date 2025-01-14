import { publicProcedure, router } from '@ad/src/server/trpc';

export const systemRouter = router({
  healthcheck: publicProcedure.query(() => 'OK'),
});

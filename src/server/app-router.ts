import { systemRouter } from '@ad/src/server/routers/system';
import { mergeRouters } from '@ad/src/server/trpc';

export const appRouter = mergeRouters(systemRouter);
export type AppRouter = typeof appRouter;

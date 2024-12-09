import { authRouter } from '@ad/src/server/routers/auth';
import { systemRouter } from '@ad/src/server/routers/system';
import { userRouter } from '@ad/src/server/routers/user';
import { mergeRouters } from '@ad/src/server/trpc';

export const appRouter = mergeRouters(systemRouter, authRouter, userRouter);
export type AppRouter = typeof appRouter;

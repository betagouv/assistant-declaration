import { authRouter } from '@ad/src/server/routers/auth';
import { declarationRouter } from '@ad/src/server/routers/declaration';
import { eventRouter } from '@ad/src/server/routers/event';
import { organizationRouter } from '@ad/src/server/routers/organization';
import { systemRouter } from '@ad/src/server/routers/system';
import { ticketingRouter } from '@ad/src/server/routers/ticketing';
import { userRouter } from '@ad/src/server/routers/user';
import { mergeRouters } from '@ad/src/server/trpc';

export const appRouter = mergeRouters(systemRouter, authRouter, userRouter, organizationRouter, ticketingRouter, eventRouter, declarationRouter);
export type AppRouter = typeof appRouter;

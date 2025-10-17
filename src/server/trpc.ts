import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { OpenApiMeta } from 'trpc-to-openapi';
import { ZodError } from 'zod';

import { CustomError, internalServerErrorError, unauthorizedError } from '@ad/src/models/entities/errors';
import { TokenUserSchema } from '@ad/src/models/entities/user';
import { Context } from '@ad/src/server/context';

const t = initTRPC
  .meta<OpenApiMeta>()
  .context<Context>()
  .create({
    transformer: superjson,
    errorFormatter(opts) {
      const { shape, error } = opts;

      // Only forward zod errors from input validation (others should be internal issues)
      // If for any reason you need to forward a zod error on the frontend (in case of multiple steps for a form validation)
      // you can still wrap the error wirh `BusinessZodError` for transporting zod information
      let acceptableZodError = error.cause instanceof ZodError && error.code === 'BAD_REQUEST' ? error.cause : null;

      let customError = error.cause instanceof CustomError ? error.cause : null;

      let errorData: Record<string, any>;
      if (acceptableZodError || customError) {
        errorData = {
          zodError: !!acceptableZodError ? acceptableZodError.issues : null,
          customError: !!customError ? customError.json() : null,
        };
      } else {
        // We hide the entire information to hide any sensitive technical information
        errorData = {
          message: internalServerErrorError.message,
          customError: internalServerErrorError.json(),
        };
      }

      // We only forward original error details aside our custom error while developing to ease the debugging
      // Note: by default it may leak error stack that's why we hide that once deployed
      if (process.env.NODE_ENV === 'development') {
        return {
          ...shape,
          data: {
            ...shape.data,
            ...errorData,
          },
        };
      } else {
        return {
          message: 'an error has occured',
          code: -50100,
          data: errorData,
        };
      }
    },
  });

/**
 * Create a server-side caller
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

export const router = t.router;

export const publicProcedure = t.procedure;

export const middleware = t.middleware;

export const mergeRouters = t.mergeRouters;

export const isAuthed = t.middleware(({ next, ctx }) => {
  // TODO: make sure it checks before entering the mdw, the expiration date of the JWT
  if (!ctx.user || !TokenUserSchema.parse(ctx.user)) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: unauthorizedError.message,
      cause: unauthorizedError,
    });
  }

  return next({
    ctx: {
      // Infers the `user` as non-nullable
      user: ctx.user,
    },
  });
});

export const privateProcedure = t.procedure.use(isAuthed);

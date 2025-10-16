import { TRPCClientErrorLike } from '@trpc/client';
import { z } from 'zod';

import { BusinessError, BusinessZodError, CustomError } from '@ad/src/models/entities/errors';
import { AppRouter } from '@ad/src/server/app-router';

// `instanceof` should be used to know what is returned
type ParsedError = CustomError | z.core.$ZodError | BusinessZodError;

export function parseError<T extends TRPCClientErrorLike<AppRouter> | Error>(error: T): ParsedError | T {
  if (error instanceof Error && error.name === 'TRPCClientError') {
    const trpcError = error as unknown as TRPCClientErrorLike<AppRouter>;

    if (trpcError.data && 'zodError' in trpcError.data && Array.isArray(trpcError.data.zodError)) {
      return new z.ZodError(trpcError.data.zodError as z.core.$ZodIssue[]);
    } else if (trpcError.data && 'customError' in trpcError.data && trpcError.data.customError !== null) {
      const customErrorPayload = trpcError.data.customError as CustomError;

      if ('zodError' in customErrorPayload && Array.isArray(customErrorPayload.zodError)) {
        return new BusinessZodError(new BusinessError(customErrorPayload.code, customErrorPayload.message), customErrorPayload.zodError);
      } else {
        return new CustomError(customErrorPayload.code, customErrorPayload.message);
      }
    }
  }

  // If unparsable, just return the error
  return error;
}

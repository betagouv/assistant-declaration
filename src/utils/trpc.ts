import type { UseQueryResult } from '@tanstack/react-query';
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

import type { AppRouter } from '@ad/src/server/app-router';

// [WORKAROUND] Before the `UseTRPCQueryResult` was exported but since v11 it's considered as internal and there is no way
// despite trying direct node_modules files like the following or `.../shared/hooks/types` and even inside `.../dist/...`
// So as a fallback we use the `react-query` one that is a bit more abstract but works
//
// import type { UseTRPCQueryResult } from '@trpc/react-query/src/shared/hooks';
export type UseTRPCQueryResult<TData, TError> = UseQueryResult<TData, TError>;

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export class AggregatedQueries {
  queries: UseTRPCQueryResult<any, any>[] = [];

  constructor(...queries: UseTRPCQueryResult<any, any>[]) {
    this.queries = queries;
  }

  public get hasError(): boolean {
    return this.errors.length > 0;
  }

  public get errors() {
    return this.queries.filter((query) => !!query.error).map((query) => query.error);
  }

  public get refetchs() {
    return this.queries.map((query) => query.refetch);
  }

  public get isPending(): boolean {
    return this.queries.filter((query) => query.isPending).length > 0;
  }
}

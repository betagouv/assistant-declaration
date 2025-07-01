'use client';

import { DehydratedState, HydrationBoundary } from '@tanstack/react-query';
// import { DataTransformer } from "@trpc/server/unstable-core-do-not-import";
import { useMemo } from 'react';

export function createHydrateClient(opts: { transformer?: any }) {
  return function HydrateClient(props: { children: React.ReactNode; state: DehydratedState }) {
    const { state, children } = props;

    const transformedState: DehydratedState = useMemo(() => {
      if (opts.transformer) {
        return opts.transformer.deserialize(state);
      }
      return state;
    }, [state]);
    return <HydrationBoundary state={transformedState}>{children}</HydrationBoundary>;
  };
}

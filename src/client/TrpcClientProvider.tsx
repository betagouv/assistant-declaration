'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, httpLink, loggerLink } from '@trpc/client';
import { useState } from 'react';
import superjson from 'superjson';

import { trpc } from '@ad/src/client/trpcClient';
import { mockBaseUrl, shouldTargetMock } from '@ad/src/server/mock/environment';
import { getBaseUrl } from '@ad/src/utils/url';

export function TrpcClientProvider(props: { children: React.ReactNode }) {
  const baseUrl = shouldTargetMock ? mockBaseUrl : getBaseUrl();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      })
  );

  // When using the `msw` mock server it's hard to handle request batching
  // because it uses concatenated GET endpoints. To not complexify we avoid it when mocking
  const appropriateHttpLink = shouldTargetMock
    ? httpLink({
        url: `${baseUrl}/api/trpc`,
        transformer: superjson,
      })
    : httpBatchLink({
        url: `${baseUrl}/api/trpc`,
        transformer: superjson,
      });

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: (opts) => process.env.NODE_ENV === 'development' || (opts.direction === 'down' && opts.result instanceof Error),
        }),
        appropriateHttpLink,
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
    </trpc.Provider>
  );
}
